(function () {
  const OFFICIAL_SITE_URL = "https://nicotinaatv.github.io/NicotinaaTv/";

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
