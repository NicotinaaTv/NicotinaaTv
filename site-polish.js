(function () {
  const OFFICIAL_SITE_URL = "https://nicotinaatv.github.io/NicotinaaTv/";
  const AUTH_SYNC_KEY = "nicotinaatv_auth_sync_v1";
  const AUTH_CHANNEL_NAME = "nicotinaatv-auth";
  const AUTH_TAB_KEY = "nicotinaatv_auth_tab_id";
  const AUTH_BRIDGE_ID = "nicotinaatv-auth-bridge";
  const DISCORD_OAUTH_KEY = "nicotinaatv_discord_oauth";
  const AUTH_TAB_ID = (() => {
    try {
      const saved = sessionStorage.getItem(AUTH_TAB_KEY);
      if (saved) return saved;
      const created = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
      sessionStorage.setItem(AUTH_TAB_KEY, created);
      return created;
    } catch {
      return `${Date.now()}-${Math.random()}`;
    }
  })();

  function showAuthBridgeScreen(type = "loading") {
    let bridge = document.getElementById(AUTH_BRIDGE_ID);
    if (!bridge) {
      bridge = document.createElement("div");
      bridge.id = AUTH_BRIDGE_ID;
      bridge.setAttribute("role", "status");
      bridge.setAttribute("aria-live", "polite");
      bridge.style.cssText = [
        "position:fixed",
        "inset:0",
        "z-index:999999",
        "display:grid",
        "place-items:center",
        "padding:24px",
        "background:radial-gradient(circle at 50% 25%, rgba(255,79,176,.18), transparent 34%), #050007",
        "color:#fff4fb",
        "font-family:Arial,sans-serif",
        "text-align:center",
      ].join(";");
      document.documentElement.style.background = "#050007";
      document.body?.appendChild(bridge);
    }

    const copy = {
      loading: {
        title: "Collego il tuo account...",
        text: "Resta un attimo qui: sto collegando il login alla pagina NicotinaaTv.",
        action: "",
      },
      done: {
        title: "Account collegato",
        text: "Ti sto riportando alla pagina NicotinaaTv gia loggata.",
        action: "",
      },
      blocked: {
        title: "Account confermato",
        text: "Chrome non mi ha permesso di chiudere questa scheda. Torna alla pagina NicotinaaTv gia aperta: ora si ricarica gia loggata.",
        action: `<a href="${OFFICIAL_SITE_URL}#commenti" style="display:inline-block;margin-top:18px;padding:13px 22px;border-radius:999px;background:linear-gradient(135deg,#ff4fb0,#d9a4ff,#a36bff);color:#17001c;text-decoration:none;font-weight:900;">Torna al sito</a>`,
      },
      error: {
        title: "Link non valido o scaduto",
        text: "Rifai la registrazione per ricevere una nuova email di conferma.",
        action: `<a href="${OFFICIAL_SITE_URL}#commenti" style="display:inline-block;margin-top:18px;padding:13px 22px;border-radius:999px;background:linear-gradient(135deg,#ff4fb0,#d9a4ff,#a36bff);color:#17001c;text-decoration:none;font-weight:900;">Torna al sito</a>`,
      },
    }[type] || {};

    bridge.innerHTML = `
      <div style="max-width:520px;width:min(100%,520px);border:1px solid rgba(255,79,176,.72);border-radius:18px;padding:32px 24px;background:rgba(20,0,25,.86);box-shadow:0 0 26px rgba(255,79,176,.35), inset 0 0 22px rgba(217,164,255,.16);">
        <div style="width:74px;height:74px;margin:0 auto 18px;border-radius:50%;background:radial-gradient(circle,#ff4fb0,#8b2cff 62%,#17001c);box-shadow:0 0 24px #ff4fb0;"></div>
        <h1 style="margin:0 0 12px;font-size:30px;line-height:1.1;color:#fff4fb;text-shadow:0 0 18px #ff4fb0;">${copy.title}</h1>
        <p style="margin:0;color:#d9a4ff;font-size:16px;line-height:1.55;">${copy.text}</p>
        ${copy.action}
      </div>
    `;
  }

  function hideAuthBridgeScreen() {
    const bridge = document.getElementById(AUTH_BRIDGE_ID);
    if (bridge) bridge.remove();
  }

  function returnToOfficialSite() {
    window.setTimeout(() => {
      hideAuthBridgeScreen();
      const target = `${OFFICIAL_SITE_URL}#commenti`;
      if (window.location.href !== target) {
        window.location.replace(target);
        return;
      }
      notifyAuthSync("discord-login");
      window.dispatchEvent(new Event("nicotinaatv-auth-returned"));
    }, 650);
  }

  function closeAuthBridgeTab() {
    window.setTimeout(() => {
      try {
        window.open("", "_self");
      } catch {}
      window.close();
      window.setTimeout(() => {
        if (!document.hidden) {
          showAuthBridgeScreen("blocked");
          returnToOfficialSite();
        }
      }, 700);
    }, 700);
  }

  function notifyAuthSync(reason) {
    const payload = JSON.stringify({
      reason,
      sourceId: AUTH_TAB_ID,
      at: Date.now(),
    });
    try {
      localStorage.setItem(AUTH_SYNC_KEY, payload);
    } catch {}
    try {
      const channel = new BroadcastChannel(AUTH_CHANNEL_NAME);
      channel.postMessage(JSON.parse(payload));
      channel.close();
    } catch {}
  }

  function cleanAuthUrl() {
    const url = new URL(window.location.href);
    ["code", "error", "error_code", "error_description"].forEach((key) => url.searchParams.delete(key));
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const authHashKeys = ["access_token", "refresh_token", "expires_in", "token_type", "type", "error", "error_code", "error_description"];
    const hasAuthHash = authHashKeys.some((key) => hashParams.has(key));
    const keepHash = hasAuthHash ? "#commenti" : window.location.hash || "#commenti";
    window.history.replaceState({}, document.title, `${url.origin}${url.pathname}${url.search}${keepHash}`);
  }

  async function completeEmailRedirectLogin(client) {
    const url = new URL(window.location.href);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const code = url.searchParams.get("code");
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");
    const hasAuthError = url.searchParams.has("error") || hashParams.has("error");
    const isAuthRedirect = hasAuthError || code || (accessToken && refreshToken);
    const isDiscordSameTab = sessionStorage.getItem(DISCORD_OAUTH_KEY) === "1";

    if (!isAuthRedirect) {
      hideAuthBridgeScreen();
      return;
    }

    showAuthBridgeScreen("loading");

    if (hasAuthError) {
      cleanAuthUrl();
      showAuthBridgeScreen("error");
      return;
    }

    if (code) {
      await client.auth.exchangeCodeForSession(code);
      cleanAuthUrl();
      notifyAuthSync(isDiscordSameTab ? "discord-login" : "email-confirmed");
      showAuthBridgeScreen("done");
      if (isDiscordSameTab) {
        sessionStorage.removeItem(DISCORD_OAUTH_KEY);
        returnToOfficialSite();
        return;
      }
      closeAuthBridgeTab();
      return;
    }

    if (accessToken && refreshToken) {
      await client.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      cleanAuthUrl();
      notifyAuthSync(isDiscordSameTab ? "discord-login" : "email-confirmed");
      showAuthBridgeScreen("done");
      if (isDiscordSameTab) {
        sessionStorage.removeItem(DISCORD_OAUTH_KEY);
        returnToOfficialSite();
        return;
      }
      closeAuthBridgeTab();
    }
  }

  if (window.supabase?.createClient) {
    const originalCreateClient = window.supabase.createClient.bind(window.supabase);
    window.supabase.createClient = function createClientWithOfficialRedirect(...args) {
      const client = originalCreateClient(...args);
      if (client?.auth?.signUp) {
        const originalSignUp = client.auth.signUp.bind(client.auth);
        client.auth.signUp = function signUpWithOfficialRedirect(credentials) {
          const patchedCredentials = {
            ...credentials,
            options: {
              ...(credentials?.options || {}),
              emailRedirectTo: OFFICIAL_SITE_URL,
            },
          };
          return originalSignUp(patchedCredentials);
        };
      }
      window.NICOTINAATV_AUTH_READY = completeEmailRedirectLogin(client);
      return client;
    };
  }

  function cleanStatusLine() {
    const status = document.querySelector("[data-status]");
    if (!status) return;
    const text = status.textContent.trim();
    if (!text || text.toLowerCase().includes("supabase")) {
      status.textContent = "";
      status.hidden = true;
      return;
    }
    status.hidden = false;
  }

  window.addEventListener("DOMContentLoaded", () => {
    const registerButton = document.querySelector('[data-auth-form="register"] button[type="submit"]');
    if (registerButton) registerButton.textContent = "Crea account";

    const status = document.querySelector("[data-status]");
    if (status) {
      cleanStatusLine();
      new MutationObserver(cleanStatusLine).observe(status, {
        childList: true,
        characterData: true,
        subtree: true,
      });
    }
  });
})();
