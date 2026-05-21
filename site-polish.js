(function () {
  const OFFICIAL_SITE_URL = "https://nicotinaatv.github.io/NicotinaaTv/";

  function cleanAuthUrl() {
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const authHashKeys = ["access_token", "refresh_token", "expires_in", "token_type", "type", "error", "error_code", "error_description"];
    const hasAuthHash = authHashKeys.some((key) => hashParams.has(key));
    const keepHash = hasAuthHash ? "" : window.location.hash;
    window.history.replaceState({}, document.title, `${window.location.origin}${window.location.pathname}${keepHash}`);
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
      return;
    }

    if (accessToken && refreshToken) {
      await client.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      cleanAuthUrl();
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
