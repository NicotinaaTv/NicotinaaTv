const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
};

function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...JSON_HEADERS, ...extraHeaders },
  });
}

function cors(origin, env) {
  const allowedOrigin = env.ALLOWED_ORIGIN || origin || "*";
  return {
    "access-control-allow-origin": allowedOrigin,
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type,authorization,x-ceo-token",
    "access-control-max-age": "86400",
  };
}

function getClientIp(request) {
  return (
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    ""
  );
}

async function sha256(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function makeToken(env) {
  const now = Math.floor(Date.now() / 1000);
  const payload = `${now}.${crypto.randomUUID()}`;
  const sig = await sha256(`${payload}.${env.CEO_TOKEN_SECRET}`);
  return `${payload}.${sig}`;
}

async function verifyToken(token, env) {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [issuedAtText, id, sig] = parts;
  const issuedAt = Number(issuedAtText);
  if (!Number.isFinite(issuedAt)) return false;
  const age = Math.floor(Date.now() / 1000) - issuedAt;
  if (age < 0 || age > 60 * 60 * 6) return false;
  const expected = await sha256(`${issuedAtText}.${id}.${env.CEO_TOKEN_SECRET}`);
  return sig === expected;
}

async function supabaseFetch(env, path, options = {}) {
  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      "content-type": "application/json",
      prefer: "return=representation",
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(data?.message || data?.hint || "Supabase request failed");
  }
  return data;
}

async function requireCeo(request, env) {
  const ip = getClientIp(request);
  if (ip !== env.ALLOWED_CEO_IP) {
    return { ok: false, response: json({ error: "IP non autorizzato." }, 403) };
  }
  const token = request.headers.get("x-ceo-token") || request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!(await verifyToken(token, env))) {
    return { ok: false, response: json({ error: "Sessione CEO non valida." }, 401) };
  }
  return { ok: true };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("origin");
    const corsHeaders = cors(origin, env);
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      const url = new URL(request.url);
      const ip = getClientIp(request);

      if (url.pathname === "/ceo/status") {
        return json({ ipAllowed: ip === env.ALLOWED_CEO_IP }, 200, corsHeaders);
      }

      if (url.pathname === "/ceo/login" && request.method === "POST") {
        if (ip !== env.ALLOWED_CEO_IP) {
          return json({ error: "IP non autorizzato." }, 403, corsHeaders);
        }
        const body = await request.json();
        if (body.password !== env.CEO_PASSWORD) {
          return json({ error: "Password CEO errata." }, 401, corsHeaders);
        }
        return json({ token: await makeToken(env) }, 200, corsHeaders);
      }

      if (url.pathname === "/ceo/comments" && request.method === "GET") {
        const guard = await requireCeo(request, env);
        if (!guard.ok) return new Response(guard.response.body, { status: guard.response.status, headers: corsHeaders });
        const status = url.searchParams.get("status") || "pending";
        const data = await supabaseFetch(env, `comments?status=eq.${encodeURIComponent(status)}&select=*,profiles(nickname)&order=created_at.asc`);
        return json({ comments: data }, 200, corsHeaders);
      }

      const match = url.pathname.match(/^\/ceo\/comments\/([0-9a-f-]+)\/(approve|reject|reply|delete)$/i);
      if (match && request.method === "POST") {
        const guard = await requireCeo(request, env);
        if (!guard.ok) return new Response(guard.response.body, { status: guard.response.status, headers: corsHeaders });
        const [, id, action] = match;
        if (action === "delete") {
          await supabaseFetch(env, `comments?id=eq.${id}`, {
            method: "DELETE",
          });
          return json({ deleted: true }, 200, corsHeaders);
        }
        const body = action === "reply" ? await request.json() : {};
        const patch =
          action === "approve"
            ? { status: "approved", updated_at: new Date().toISOString() }
            : action === "reject"
              ? { status: "rejected", updated_at: new Date().toISOString() }
              : { ceo_reply: String(body.reply || "").slice(0, 500), updated_at: new Date().toISOString() };
        const data = await supabaseFetch(env, `comments?id=eq.${id}`, {
          method: "PATCH",
          body: JSON.stringify(patch),
        });
        return json({ comment: data?.[0] || null }, 200, corsHeaders);
      }

      return json({ error: "Endpoint non trovato." }, 404, corsHeaders);
    } catch (error) {
      return json({ error: error.message || "Errore server." }, 500, corsHeaders);
    }
  },
};
