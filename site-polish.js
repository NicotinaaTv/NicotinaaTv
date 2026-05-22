(function () {
  const OFFICIAL_SITE_URL = "https://nicotinaatv.github.io/NicotinaaTv/";
  const AUTH_SYNC_KEY = "nicotinaatv_auth_sync_v1";
  const AUTH_CHANNEL_NAME = "nicotinaatv-auth";
  const AUTH_TAB_KEY = "nicotinaatv_auth_tab_id";
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

    if (hasAuthError) {
      cleanAuthUrl();
      return;
    }

    if (code) {
      await client.auth.exchangeCodeForSession(code);
      cleanAuthUrl();
      notifyAuthSync("email-confirmed");
      return;
    }

    if (accessToken && refreshToken) {
      await client.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      cleanAuthUrl();
      notifyAuthSync("email-confirmed");
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
