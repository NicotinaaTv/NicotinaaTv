const STORAGE_KEY = "nicotinaatv_static_site_v1";
const BOSS_NICKNAME = "NicotinaaTv";
const LOCAL_CEO_ENABLED = false;
const NICKNAME_CHANGE_DAYS = 14;
const REMOTE_VISITOR_KEY = "nicotinaatv_remote_visitor_key";
const CEO_TOKEN_KEY = "nicotinaatv_ceo_token";
const PUBLIC_SITE_URL = "https://nicotinaatv.github.io/NicotinaaTv/";
const SUPABASE_SETTINGS = window.NICOTINAATV_SUPABASE || {};
const supabaseClient =
  window.supabase &&
  SUPABASE_SETTINGS.url &&
  SUPABASE_SETTINGS.publishableKey &&
  !SUPABASE_SETTINGS.publishableKey.includes("INCOLLA_QUI")
    ? window.supabase.createClient(SUPABASE_SETTINGS.url, SUPABASE_SETTINGS.publishableKey)
    : null;
let remoteUser = null;

const reservedNicknameParts = [
  "admin", "administrator", "amministratore", "mod", "moderator", "moderatore", "owner",
  "boss", "staff", "support", "assistenza", "security", "sicurezza", "root", "system",
  "sistema", "official", "ufficiale", "verified", "verificato", "webmaster", "server",
  "api", "localhost", "account", "login", "register", "registrati", "password", "token",
  "session", "cookie", "delete", "deleted", "null", "undefined", "anonymous", "anon",
  "guest", "ospite", "user", "utente", "username", "nickname", "nicotinaatv", "nicotinaa",
  "nicotinaatvextractor", "extractor", "kra", "fivem", "rockstar", "discord", "telegram",
  "tiktok", "instagram", "youtube", "paypal", "steam", "epic", "github", "microsoft",
  "google", "apple", "amazon", "meta", "facebook", "spam", "scam", "truffa", "phishing",
  "malware", "virus", "trojan", "stealer", "grabber", "keylogger", "logger", "rat",
  "backdoor", "botnet", "ddos", "dox", "doxx", "doxing", "leak", "leaker", "crack",
  "cracker", "pirata", "warez", "serial", "keygen", "license", "licenza", "cheat",
  "cheater", "exploit", "injector", "bypass", "freeadmin", "giveaway", "download",
  "release", "update", "aggiornamento", "beta", "alpha", "dev", "developer", "tester",
  "fake", "clone", "copy", "copia", "mirror", "database", "dbadmin", "sql", "mail",
  "email", "postmaster", "abuse", "privacy", "legal", "terms", "policy", "moderazione",
  "approva", "rifiuta", "commenti", "comment", "reply", "risposta"
];

const blockedTextParts = [
  "razzista", "razzismo", "discriminazione", "suprematismo", "supremazia", "nazismo",
  "nazista", "fascismo", "fascista", "terrorismo", "terrorista", "odio", "minaccia",
  "ammazza", "uccidi", "mortea", "violenza", "molestia", "dox", "doxx", "doxing",
  "password", "token", "cookie", "sessione", "iplogger", "grabber", "stealer",
  "keylogger", "malware", "virus", "trojan", "rat", "backdoor", "phishing", "scam",
  "truffa", "crack", "keygen", "serial", "warez", "pirata", "exploit", "injector",
  "bypass", "cheat", "discordgg", "telegram", "freeadmin", "nitrofree", "spam",
  "cliccaqui", "linkgratis", "guadagnafacile", "casino", "scommesse", "privatekey"
];

const protectedBrandParts = [
  "nicotinaatv", "nicotinatv", "nicotinaa", "nicotina", "nikotina", "nikotinaa",
  "nicotin", "nicotinah", "nicotinaofficial", "nicotinaadmin", "nicotinaboss",
  "nicotinaaceo", "nicotinaextractor", "nicotinaatvextractor", "nicotinaakra",
  "kra", "kraadm", "kradmin", "kramod", "krasupport", "krasicurezza",
  "nicotina_staff", "nicotina_support", "nicotina_mod", "nicotina_ceo"
];

const els = {
  totalVisits: document.querySelector("[data-total-visits]"),
  dailyVisits: document.querySelector("[data-daily-visits]"),
  downloads: document.querySelector("[data-downloads]"),
  status: document.querySelector("[data-status]"),
  sessionBar: document.querySelector("[data-session-bar]"),
  sessionText: document.querySelector("[data-session-text]"),
  commentForm: document.querySelector("[data-comment-form]"),
  publicComments: document.querySelector("[data-public-comments]"),
  pendingComments: document.querySelector("[data-pending-comments]"),
  bossPanel: document.querySelector("[data-boss-panel]"),
  ceoLoginPanel: document.querySelector("[data-ceo-login-panel]"),
  ceoLoginForm: document.querySelector("[data-ceo-login-form]"),
  ceoTools: document.querySelector("[data-ceo-tools]"),
  ceoUsers: document.querySelector("[data-ceo-users]"),
  ceoRefreshUsers: document.querySelector("[data-ceo-refresh-users]"),
  authForms: document.querySelectorAll("[data-auth-form]"),
  registerForm: document.querySelector('[data-auth-form="register"]'),
  loginForm: document.querySelector('[data-auth-form="login"]'),
  nicknameForm: document.querySelector("[data-nickname-form]"),
  downloadLink: document.querySelector("[data-download-link]"),
  profileChip: document.querySelector("[data-profile-chip]"),
  profileName: document.querySelector("[data-profile-name]"),
  previewFrame: document.querySelector("[data-preview-frame]"),
  previewToggle: document.querySelector("[data-preview-toggle]"),
  previewRestart: document.querySelector("[data-preview-restart]"),
  previewSeek: document.querySelector("[data-preview-seek]"),
  previewTime: document.querySelector("[data-preview-time]"),
  topbar: document.querySelector(".topbar"),
  menuToggle: document.querySelector("[data-menu-toggle]"),
};

function defaultState() {
  return {
    users: [
      ...(LOCAL_CEO_ENABLED
        ? [{
            nickname: BOSS_NICKNAME,
            nicknameKey: normalize(BOSS_NICKNAME),
            password: "",
            role: "boss",
          }]
        : []),
    ],
    sessionNickname: "",
    deviceAccountKey: "",
    deviceCreatedAt: "",
    lastNicknameChangeAt: "",
    comments: [],
    stats: {
      totalVisits: 0,
      dailyVisits: 0,
      downloads: 0,
      lastDailyDate: "",
      lastCountedVisitDate: "",
    },
  };
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    const base = defaultState();
    return {
      ...base,
      ...saved,
      users: mergeBoss(saved?.users || base.users),
      stats: { ...base.stats, ...(saved?.stats || {}) },
      deviceAccountKey: saved?.deviceAccountKey || "",
      deviceCreatedAt: saved?.deviceCreatedAt || "",
      lastNicknameChangeAt: saved?.lastNicknameChangeAt || "",
    };
  } catch {
    return defaultState();
  }
}

function mergeBoss(users) {
  const withoutBoss = users.filter((user) => user.role !== "boss" && !isProtectedBrandNickname(user.nickname));
  return LOCAL_CEO_ENABLED ? [...withoutBoss, defaultState().users[0]] : withoutBoss;
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function isRemoteMode() {
  return Boolean(supabaseClient);
}

function todayRome() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type) => parts.find((part) => part.type === type).value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function registerVisit() {
  if (isRemoteMode()) return;
  const today = todayRome();
  if (state.stats.lastDailyDate !== today) {
    state.stats.dailyVisits = 0;
    state.stats.lastDailyDate = today;
  }
  if (state.stats.lastCountedVisitDate !== today) {
    state.stats.totalVisits += 1;
    state.stats.dailyVisits += 1;
    state.stats.lastCountedVisitDate = today;
  }
  saveState();
}

function normalize(value) {
  const replacements = new Map([
    ["@", "a"], ["4", "a"], ["0", "o"], ["1", "i"], ["!", "i"], ["3", "e"],
    ["5", "s"], ["$", "s"], ["7", "t"], ["+", "t"], ["8", "b"], ["9", "g"]
  ]);
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .split("")
    .map((char) => replacements.get(char) || char)
    .join("")
    .replace(/[^a-z0-9]/g, "");
}

function hasBlockedPart(value, list) {
  const normalized = normalize(value);
  return list.some((item) => normalized.includes(normalize(item)));
}

function compactNickname(value) {
  return normalize(value).replace(/(.)\1+/g, "$1");
}

function isProtectedBrandNickname(value) {
  const normalized = normalize(value);
  const compact = compactNickname(value);
  return protectedBrandParts.some((part) => {
    const protectedName = normalize(part);
    const compactProtected = compactNickname(part);
    return (
      normalized.includes(protectedName) ||
      protectedName.includes(normalized) ||
      compact.includes(compactProtected) ||
      compactProtected.includes(compact)
    );
  });
}

function validateNickname(nickname) {
  const clean = String(nickname || "").trim();
  if (clean.length < 3 || clean.length > 24) return "Il nickname deve avere tra 3 e 24 caratteri.";
  if (!/^[a-zA-Z0-9_.-]+$/.test(clean)) return "Il nickname puo usare solo lettere, numeri, punto, trattino e underscore.";
  if (/([a-zA-Z0-9])\1{4,}/.test(clean)) return "Il nickname contiene troppe lettere ripetute.";
  if (isProtectedBrandNickname(clean)) return "Questo nickname e riservato al CEO NicotinaaTv.";
  if (hasBlockedPart(clean, reservedNicknameParts) || hasBlockedPart(clean, blockedTextParts)) return "Questo nickname non e permesso.";
  return "";
}

function validateComment(body) {
  const clean = String(body || "").trim();
  if (clean.length < 3 || clean.length > 600) return "Il commento deve avere tra 3 e 600 caratteri.";
  if (/https?:\/\//i.test(clean) || /\bwww\./i.test(clean)) return "I link nei commenti non sono permessi.";
  if (hasBlockedPart(clean, blockedTextParts)) return "Il commento contiene parole non permesse.";
  return "";
}

function currentUser() {
  if (isRemoteMode()) return remoteUser;
  return state.users.find((user) => user.nickname === state.sessionNickname) || null;
}

function ceoApiBase() {
  return String(SUPABASE_SETTINGS.ceoApiUrl || "").replace(/\/+$/, "");
}

function getCeoToken() {
  return sessionStorage.getItem(CEO_TOKEN_KEY) || "";
}

function setCeoToken(token) {
  sessionStorage.setItem(CEO_TOKEN_KEY, token);
}

function permanentUser() {
  if (isRemoteMode()) return null;
  return state.users.find((user) => user.nicknameKey === state.deviceAccountKey && user.role !== "boss") || null;
}

function ensurePermanentSession() {
  if (isRemoteMode()) return;
  if (!state.sessionNickname && state.deviceAccountKey) {
    const lockedUser = permanentUser();
    if (lockedUser) state.sessionNickname = lockedUser.nickname;
  }
}

function daysUntilNicknameChange() {
  if (!state.lastNicknameChangeAt) return 0;
  const elapsed = Date.now() - new Date(state.lastNicknameChangeAt).getTime();
  const waitMs = NICKNAME_CHANGE_DAYS * 24 * 60 * 60 * 1000;
  return Math.max(0, Math.ceil((waitMs - elapsed) / (24 * 60 * 60 * 1000)));
}

function setStatus(message, type = "") {
  els.status.textContent = message;
  els.status.className = `status-line ${type}`.trim();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Rome",
  }).format(new Date(value));
}

function commentMarkup(comment, mode, user) {
  const reply = comment.bossReply
    ? `<div class="boss-reply"><strong>Risposta ufficiale NicotinaaTv</strong><p>${escapeHtml(comment.bossReply)}</p></div>`
    : "";
  const approveActions =
    mode === "pending"
      ? `<div class="boss-actions">
          <button type="button" data-approve="${comment.id}">Approva</button>
          <button type="button" data-reject="${comment.id}">Rifiuta</button>
        </div>`
      : "";
  const deleteAction =
    user?.role === "boss"
      ? `<div class="boss-actions">
          <button class="danger-action" type="button" data-delete="${comment.id}">Elimina per sempre</button>
        </div>`
      : "";
  const replyBox =
    mode === "public" && user?.role === "boss"
      ? `<form class="reply-box" data-reply-form="${comment.id}">
          <textarea name="reply" maxlength="500" placeholder="Risposta ufficiale del CEO">${escapeHtml(comment.bossReply || "")}</textarea>
          <button type="submit">Pubblica risposta</button>
        </form>`
      : "";

  return `<article class="comment">
    <header>
      <span>${escapeHtml(comment.nickname)}</span>
      <time datetime="${escapeHtml(comment.createdAt)}">${formatDate(comment.createdAt)}</time>
    </header>
    <p>${escapeHtml(comment.body)}</p>
    ${reply}
    ${approveActions}
    ${replyBox}
    ${deleteAction}
  </article>`;
}

function formatMaybeDate(value) {
  return value ? formatDate(value) : "Mai";
}

function renderCeoUsers(users = []) {
  if (!els.ceoUsers) return;
  els.ceoUsers.innerHTML = users.length
    ? users.map((item) => `<article class="ceo-user-card">
        <div>
          <strong>${escapeHtml(item.nickname || "Senza nickname")}</strong>
          <span>${escapeHtml(item.email || "Email non trovata")}</span>
        </div>
        <dl>
          <dt>Ruolo</dt><dd>${escapeHtml(item.role || "member")}</dd>
          <dt>Email confermata</dt><dd>${item.emailConfirmedAt ? "Si" : "No"}</dd>
          <dt>Ultimo login</dt><dd>${escapeHtml(formatMaybeDate(item.lastSignInAt))}</dd>
        </dl>
      </article>`).join("")
    : `<p class="status-line">Nessun utente registrato trovato.</p>`;
}

function render() {
  const user = currentUser();
  const lockedUser = permanentUser();
  const canModerate = user?.role === "boss" && (!isRemoteMode() || Boolean(SUPABASE_SETTINGS.ceoApiUrl));
  const ceoUnlocked = canModerate && Boolean(getCeoToken());
  const publicComments = state.comments
    .filter((comment) => comment.status === "approved")
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const pendingComments = state.comments
    .filter((comment) => comment.status === "pending")
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  els.totalVisits.textContent = state.stats.totalVisits;
  els.dailyVisits.textContent = state.stats.dailyVisits;
  els.downloads.textContent = state.stats.downloads;
  els.sessionBar.hidden = !user;
  els.commentForm.hidden = !user;
  els.bossPanel.hidden = !canModerate;
  if (els.ceoLoginPanel) els.ceoLoginPanel.hidden = !canModerate || ceoUnlocked;
  if (els.ceoTools) els.ceoTools.hidden = !ceoUnlocked;
  els.profileChip.hidden = !user;
  els.profileName.textContent = user?.nickname || "";
  els.registerForm.hidden = Boolean(lockedUser || user);
  els.loginForm.hidden = Boolean(user);
  els.nicknameForm.hidden = !user || user.role === "boss";
  els.sessionText.textContent = user
    ? `${isRemoteMode() ? "Account online" : "Account permanente"}: ${user.nickname}${user.role === "boss" ? " - CEO" : ""}`
    : lockedUser
      ? `Account gia creato su questo browser: ${lockedUser.nickname}`
      : "";

  els.publicComments.innerHTML = publicComments.length
    ? publicComments.map((comment) => commentMarkup(comment, "public", user)).join("")
    : `<p class="status-line">Nessun commento pubblico approvato.</p>`;

  if (canModerate) {
    els.pendingComments.innerHTML = pendingComments.length
      ? pendingComments.map((comment) => commentMarkup(comment, "pending", user)).join("")
      : `<p class="status-line success">Nessun commento in attesa.</p>`;
  }
}

function applyDeviceMode() {
  const width = window.innerWidth;
  const mode = width <= 720 ? "mobile" : width <= 1024 ? "tablet" : "desktop";
  document.body.dataset.device = mode;
  document.body.classList.toggle("device-mobile", mode === "mobile");
  document.body.classList.toggle("device-tablet", mode === "tablet");
  document.body.classList.toggle("device-desktop", mode === "desktop");
  document.body.classList.toggle("device-touch", window.matchMedia("(pointer: coarse)").matches);
  if (els.topbar) {
    const height = Math.ceil(els.topbar.getBoundingClientRect().height);
    document.documentElement.style.setProperty("--topbar-offset", `${height}px`);
  }
}

function setMenuOpen(open) {
  document.body.classList.toggle("menu-open", open);
  els.menuToggle?.setAttribute("aria-expanded", String(open));
  requestAnimationFrame(applyDeviceMode);
}

function mapRemoteStats(stats) {
  if (!stats) return;
  state.stats.totalVisits = Number(stats.total_visits || 0);
  state.stats.dailyVisits = Number(stats.daily_visits || 0);
  state.stats.downloads = Number(stats.total_downloads || 0);
  state.stats.lastDailyDate = stats.last_daily_date || state.stats.lastDailyDate;
}

function mapRemoteComment(comment) {
  return {
    id: comment.id,
    nickname: comment.nickname || "Utente",
    body: comment.body,
    status: comment.status,
    bossReply: comment.ceo_reply || "",
    createdAt: comment.created_at,
  };
}

function getRemoteVisitorKey() {
  let key = localStorage.getItem(REMOTE_VISITOR_KEY);
  if (!key) {
    key = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    localStorage.setItem(REMOTE_VISITOR_KEY, key);
  }
  return key;
}

function authRedirectUrl() {
  return PUBLIC_SITE_URL;
}

function cleanAuthUrl() {
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const authHashKeys = ["access_token", "refresh_token", "expires_in", "token_type", "type", "error", "error_code", "error_description"];
  const hasAuthHash = authHashKeys.some((key) => hashParams.has(key));
  const keepHash = hasAuthHash ? "" : window.location.hash;
  window.history.replaceState({}, document.title, `${window.location.origin}${window.location.pathname}${keepHash}`);
}

async function completeEmailRedirectLogin() {
  const url = new URL(window.location.href);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const errorDescription = url.searchParams.get("error_description") || hashParams.get("error_description");
  const code = url.searchParams.get("code");
  const accessToken = hashParams.get("access_token");
  const refreshToken = hashParams.get("refresh_token");

  if (errorDescription) {
    cleanAuthUrl();
    setStatus("Link email non valido o scaduto. Rifai la registrazione per ricevere una nuova email.", "error");
    return;
  }

  if (code) {
    const { error } = await supabaseClient.auth.exchangeCodeForSession(code);
    cleanAuthUrl();
    if (error) throw error;
    setStatus("Email confermata: login effettuato automaticamente.", "success");
    return;
  }

  if (accessToken && refreshToken) {
    const { error } = await supabaseClient.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    cleanAuthUrl();
    if (error) throw error;
    setStatus("Email confermata: login effettuato automaticamente.", "success");
  }
}

async function loadRemoteSession() {
  const { data, error } = await supabaseClient.auth.getSession();
  if (error) throw error;
  const session = data.session;
  if (!session) {
    remoteUser = null;
    state.sessionNickname = "";
    return;
  }

  const { data: profile, error: profileError } = await supabaseClient
    .from("profiles")
    .select("id,nickname,nickname_key,role,nickname_changed_at")
    .eq("id", session.user.id)
    .single();
  if (profileError) throw profileError;

  remoteUser = {
    id: profile.id,
    email: session.user.email,
    nickname: profile.nickname,
    nicknameKey: profile.nickname_key,
    role: profile.role === "ceo" ? "boss" : "member",
    nicknameChangedAt: profile.nickname_changed_at,
  };
  state.sessionNickname = remoteUser.nickname;
}

async function registerRemoteVisit() {
  const { data, error } = await supabaseClient.rpc("register_site_visit", {
    p_visitor_key: getRemoteVisitorKey(),
  });
  if (error) throw error;
  mapRemoteStats(data);
}

async function loadRemoteStats() {
  const { data, error } = await supabaseClient
    .from("site_stats")
    .select("total_visits,daily_visits,total_downloads,last_daily_date")
    .eq("id", "global")
    .single();
  if (error) throw error;
  mapRemoteStats(data);
}

async function loadRemoteComments() {
  const { data, error } = await supabaseClient
    .from("comments")
    .select("id,nickname,body,status,ceo_reply,created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  state.comments = (data || []).map(mapRemoteComment);
}

async function refreshRemoteData() {
  await Promise.all([loadRemoteStats(), loadRemoteComments()]);
  render();
}

async function registerRemoteDownload() {
  const { data, error } = await supabaseClient.rpc("register_site_download");
  if (error) throw error;
  mapRemoteStats(data);
  render();
}

async function ceoFetch(path, options = {}) {
  const base = ceoApiBase();
  if (!base) throw new Error("Backend CEO non configurato.");
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      "x-ceo-token": getCeoToken(),
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) sessionStorage.removeItem(CEO_TOKEN_KEY);
    throw new Error(data.error || "Azione CEO non riuscita.");
  }
  return data;
}

async function loadCeoUsers() {
  if (!els.ceoUsers || !getCeoToken()) return;
  els.ceoUsers.innerHTML = `<p class="status-line">Carico utenti registrati...</p>`;
  const data = await ceoFetch("/ceo/users");
  renderCeoUsers(data.users || []);
}

async function handleRemoteAuth(form, mode) {
  const formData = new FormData(form);
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  if (!email || !email.includes("@")) return setStatus("Inserisci una email valida.", "error");
  if (password.length < 8) return setStatus("La password deve avere almeno 8 caratteri.", "error");

  if (mode === "register") {
    const nickname = String(formData.get("nickname") || "").trim();
    const nickError = validateNickname(nickname);
    if (nickError) return setStatus(nickError, "error");
    setStatus("Creo l'account online...", "");
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: { nickname },
        emailRedirectTo: authRedirectUrl(),
      },
    });
    if (error) return setStatus(error.message || "Registrazione non riuscita.", "error");
    form.reset();
    if (!data.session) {
      return setStatus("Account creato. Controlla la tua email per confermare la registrazione.", "success");
    }
  } else {
    setStatus("Accesso in corso...", "");
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) return setStatus("Email o password non corrette.", "error");
    form.reset();
  }

  await loadRemoteSession();
  await refreshRemoteData();
  setStatus("Login online attivo: il tuo account resta collegato automaticamente.", "success");
}

async function updateRemoteNickname(nickname) {
  const user = currentUser();
  if (!user || user.role === "boss") return setStatus("Il nickname CEO e fisso e protetto.", "error");

  const previousLocalChange = state.lastNicknameChangeAt;
  state.lastNicknameChangeAt = user.nicknameChangedAt || "";
  const remainingDays = daysUntilNicknameChange();
  state.lastNicknameChangeAt = previousLocalChange;
  if (remainingDays > 0) return setStatus(`Puoi cambiare nickname tra ${remainingDays} giorni.`, "error");

  const nicknameKey = normalize(nickname);
  const nickError = validateNickname(nickname);
  if (nickError) return setStatus(nickError, "error");

  const { error } = await supabaseClient
    .from("profiles")
    .update({
      nickname,
      nickname_key: nicknameKey,
      nickname_changed_at: new Date().toISOString(),
    })
    .eq("id", user.id);
  if (error) return setStatus("Nickname non disponibile o non permesso.", "error");

  await loadRemoteSession();
  await refreshRemoteData();
  els.nicknameForm.reset();
  setStatus("Nickname aggiornato online. Potrai cambiarlo di nuovo tra 14 giorni.", "success");
}

async function submitRemoteComment(body) {
  const user = currentUser();
  if (!user) return setStatus("Devi effettuare il login.", "error");
  const { error } = await supabaseClient.from("comments").insert({
    user_id: user.id,
    body,
    status: "pending",
  });
  if (error) return setStatus(error.message || "Commento non inviato.", "error");
  await refreshRemoteData();
  els.commentForm.reset();
  setStatus("Commento inviato: il CEO potra approvarlo.", "success");
}

async function initializeRemote() {
  try {
    await (window.NICOTINAATV_AUTH_READY || completeEmailRedirectLogin());
    await loadRemoteSession();
    await registerRemoteVisit();
    await refreshRemoteData();
    supabaseClient.auth.onAuthStateChange(async () => {
      await loadRemoteSession();
      await refreshRemoteData();
    });
    setStatus("", "");
  } catch (error) {
    setStatus(`Accesso online non disponibile: ${error.message || "controlla la configurazione."}`, "error");
    render();
  }
}

const state = loadState();
ensurePermanentSession();
applyDeviceMode();

if (isRemoteMode()) {
  render();
  initializeRemote();
} else {
  registerVisit();
  render();
}

els.menuToggle?.addEventListener("click", () => {
  setMenuOpen(!document.body.classList.contains("menu-open"));
});

els.topbar?.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", () => {
    setMenuOpen(false);
  });
});

for (const form of els.authForms) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const mode = form.dataset.authForm;
    if (isRemoteMode()) {
      await handleRemoteAuth(form, mode);
      return;
    }
    const nickname = String(formData.get("nickname") || "").trim();
    const password = String(formData.get("password") || "");
    const nicknameKey = normalize(nickname);

    if (mode === "register") {
      if (permanentUser()) {
        return setStatus("Questo browser ha gia un account permanente. Per sicurezza non puoi crearne un altro.", "error");
      }
      const nickError = validateNickname(nickname);
      if (nickError) return setStatus(nickError, "error");
      if (password.length < 8) return setStatus("La password deve avere almeno 8 caratteri.", "error");
      if (state.users.some((user) => user.nicknameKey === nicknameKey)) return setStatus("Questo nickname e gia registrato su questo browser.", "error");
      state.users.push({ nickname, nicknameKey, password, role: "member" });
      state.sessionNickname = nickname;
      state.deviceAccountKey = nicknameKey;
      state.deviceCreatedAt = new Date().toISOString();
      state.lastNicknameChangeAt = new Date().toISOString();
      saveState();
      form.reset();
      setStatus("Account permanente creato su questo browser. Rimarra collegato automaticamente.", "success");
      render();
      return;
    }

    const user = state.users.find((item) => item.nicknameKey === nicknameKey && item.password === password);
    if (!user) return setStatus("Nickname o password non corretti.", "error");
    if (permanentUser() && user.role !== "boss" && user.nicknameKey !== state.deviceAccountKey) {
      return setStatus("Questo browser e gia associato a un altro account permanente.", "error");
    }
    state.sessionNickname = user.nickname;
    if (user.role !== "boss" && !state.deviceAccountKey) {
      state.deviceAccountKey = user.nicknameKey;
      state.deviceCreatedAt = new Date().toISOString();
      state.lastNicknameChangeAt = state.lastNicknameChangeAt || new Date().toISOString();
    }
    saveState();
    form.reset();
    setStatus("Login automatico attivato: questo account resta permanente sul browser.", "success");
    render();
  });
}

els.nicknameForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const user = currentUser();
  if (!user || user.role === "boss") return setStatus("Il nickname CEO e fisso e protetto.", "error");
  const nickname = String(new FormData(els.nicknameForm).get("nickname") || "").trim();

  if (isRemoteMode()) {
    await updateRemoteNickname(nickname);
    return;
  }

  const remainingDays = daysUntilNicknameChange();
  if (remainingDays > 0) {
    return setStatus(`Puoi cambiare nickname tra ${remainingDays} giorni.`, "error");
  }

  const nicknameKey = normalize(nickname);
  const nickError = validateNickname(nickname);
  if (nickError) return setStatus(nickError, "error");
  if (state.users.some((item) => item.nicknameKey === nicknameKey && item.nickname !== user.nickname)) {
    return setStatus("Questo nickname e gia registrato su questo browser.", "error");
  }

  const oldNickname = user.nickname;
  user.nickname = nickname;
  user.nicknameKey = nicknameKey;
  state.sessionNickname = nickname;
  state.deviceAccountKey = nicknameKey;
  state.lastNicknameChangeAt = new Date().toISOString();
  state.comments.forEach((comment) => {
    if (comment.nickname === oldNickname) comment.nickname = nickname;
  });
  saveState();
  els.nicknameForm.reset();
  setStatus("Nickname aggiornato. Potrai cambiarlo di nuovo tra 14 giorni.", "success");
  render();
});

els.commentForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const user = currentUser();
  if (!user) return setStatus("Devi effettuare il login.", "error");
  const body = String(new FormData(els.commentForm).get("body") || "").trim();
  const error = validateComment(body);
  if (error) return setStatus(error, "error");
  if (isRemoteMode()) {
    await submitRemoteComment(body);
    return;
  }
  state.comments.push({
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    nickname: user.nickname,
    body,
    status: user.role === "boss" ? "approved" : "pending",
    bossReply: "",
    createdAt: new Date().toISOString(),
  });
  saveState();
  els.commentForm.reset();
  setStatus(user.role === "boss" ? "Commento pubblicato." : "Commento inviato: il CEO puo approvarlo.", "success");
  render();
});

els.ceoLoginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const password = String(new FormData(els.ceoLoginForm).get("password") || "");
  try {
    const base = ceoApiBase();
    if (!base) return setStatus("Backend CEO non ancora collegato.", "error");
    const response = await fetch(`${base}/ceo/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return setStatus(data.error || "Accesso CEO non riuscito.", "error");
    setCeoToken(data.token);
    els.ceoLoginForm.reset();
    render();
    await loadCeoUsers();
    setStatus("Pannello CEO sbloccato.", "success");
  } catch (error) {
    setStatus(error.message || "Accesso CEO non riuscito.", "error");
  }
});

els.ceoRefreshUsers?.addEventListener("click", async () => {
  try {
    await loadCeoUsers();
    setStatus("Lista utenti aggiornata.", "success");
  } catch (error) {
    setStatus(error.message || "Impossibile caricare gli utenti.", "error");
  }
});

document.addEventListener("click", (event) => {
  const approveId = event.target?.dataset?.approve;
  const rejectId = event.target?.dataset?.reject;
  const deleteId = event.target?.dataset?.delete;
  if (!approveId && !rejectId && !deleteId) return;
  const user = currentUser();
  if (user?.role !== "boss") return setStatus("Solo il CEO puo fare questa azione.", "error");
  if (isRemoteMode()) return setStatus("La moderazione CEO online si attiva nel prossimo passo con Cloudflare Worker.", "error");
  const comment = state.comments.find((item) => item.id === (approveId || rejectId || deleteId));
  if (!comment) return setStatus("Commento non trovato.", "error");
  if (deleteId) {
    if (!window.confirm("Vuoi eliminare definitivamente questo commento? Non potrai recuperarlo.")) return;
    state.comments = state.comments.filter((item) => item.id !== deleteId);
    saveState();
    setStatus("Commento eliminato definitivamente.", "success");
    render();
    return;
  }
  comment.status = approveId ? "approved" : "rejected";
  saveState();
  setStatus(approveId ? "Commento approvato." : "Commento rifiutato.", "success");
  render();
});

document.addEventListener("submit", (event) => {
  const form = event.target.closest("[data-reply-form]");
  if (!form) return;
  event.preventDefault();
  const user = currentUser();
  if (user?.role !== "boss") return setStatus("Solo il CEO puo rispondere.", "error");
  if (isRemoteMode()) return setStatus("Le risposte CEO online si attivano nel prossimo passo con Cloudflare Worker.", "error");
  const comment = state.comments.find((item) => item.id === form.dataset.replyForm);
  if (!comment) return setStatus("Commento non trovato.", "error");
  const reply = String(new FormData(form).get("reply") || "").trim();
  const error = validateComment(reply);
  if (error) return setStatus(error, "error");
  comment.bossReply = reply;
  saveState();
  setStatus("Risposta ufficiale pubblicata.", "success");
  render();
});

els.downloadLink.addEventListener("click", async (event) => {
  if (isRemoteMode()) {
    event.preventDefault();
    const href = els.downloadLink.href;
    try {
      await registerRemoteDownload();
    } finally {
      window.location.href = href;
    }
    return;
  }
  state.stats.downloads += 1;
  saveState();
  render();
});

const preview = {
  fps: 8,
  duration: 40.703991,
  frameCount: 325,
  frameWidth: 480,
  frameHeight: 270,
  sheetColumns: 5,
  sheetRows: 5,
  framesPerSheet: 25,
  sheetCount: 13,
  playing: true,
  currentTime: 0,
  lastTick: performance.now(),
  currentFrame: 0,
  sheets: new Map(),
};

const previewContext = els.previewFrame.getContext("2d");
previewContext.imageSmoothingEnabled = true;
previewContext.imageSmoothingQuality = "high";

function sheetPath(index) {
  return `assets/video-preview/sheet-${String(index).padStart(3, "0")}.jpg`;
}

function formatVideoTime(seconds) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const rest = String(safeSeconds % 60).padStart(2, "0");
  return `${minutes}:${rest}`;
}

function setPreviewTime(seconds) {
  preview.currentTime = Math.max(0, Math.min(preview.duration, seconds));
  const frameIndex = Math.min(preview.frameCount - 1, Math.floor(preview.currentTime * preview.fps));
  preview.currentFrame = frameIndex;
  drawPreviewFrame(frameIndex);
  els.previewSeek.value = String(preview.currentTime);
  els.previewTime.textContent = `${formatVideoTime(preview.currentTime)} / ${formatVideoTime(preview.duration)}`;
}

function loadPreviewSheet(sheetIndex) {
  if (preview.sheets.has(sheetIndex)) return preview.sheets.get(sheetIndex);
  const image = new Image();
  const promise = new Promise((resolve) => {
    image.onload = () => resolve(image);
    image.src = sheetPath(sheetIndex);
  });
  preview.sheets.set(sheetIndex, promise);
  return promise;
}

async function drawPreviewFrame(frameIndex) {
  const sheetIndex = Math.floor(frameIndex / preview.framesPerSheet);
  const localIndex = frameIndex % preview.framesPerSheet;
  const column = localIndex % preview.sheetColumns;
  const row = Math.floor(localIndex / preview.sheetColumns);
  const image = await loadPreviewSheet(sheetIndex);
  if (frameIndex !== preview.currentFrame) return;
  previewContext.clearRect(0, 0, preview.frameWidth, preview.frameHeight);
  previewContext.drawImage(
    image,
    column * preview.frameWidth,
    row * preview.frameHeight,
    preview.frameWidth,
    preview.frameHeight,
    0,
    0,
    preview.frameWidth,
    preview.frameHeight
  );
}

function previewLoop(now) {
  const delta = (now - preview.lastTick) / 1000;
  preview.lastTick = now;

  if (preview.playing) {
    const nextTime = preview.currentTime + delta;
    setPreviewTime(nextTime >= preview.duration ? 0 : nextTime);
  }

  requestAnimationFrame(previewLoop);
}

function warmPreviewFrames(startIndex) {
  const currentSheet = Math.floor(startIndex / preview.framesPerSheet);
  for (let offset = 0; offset <= 2; offset += 1) {
    loadPreviewSheet((currentSheet + offset) % preview.sheetCount);
  }
}

els.previewToggle.addEventListener("click", () => {
  preview.playing = !preview.playing;
  els.previewToggle.textContent = preview.playing ? "Pausa" : "Play";
  preview.lastTick = performance.now();
});

els.previewRestart.addEventListener("click", () => {
  setPreviewTime(0);
  preview.playing = true;
  els.previewToggle.textContent = "Pausa";
  preview.lastTick = performance.now();
});

els.previewSeek.addEventListener("input", () => {
  preview.playing = false;
  els.previewToggle.textContent = "Play";
  setPreviewTime(Number(els.previewSeek.value));
  warmPreviewFrames(Math.floor(preview.currentTime * preview.fps));
});

els.previewSeek.max = String(preview.duration);
els.previewToggle.textContent = "Pausa";
setPreviewTime(0);
warmPreviewFrames(0);
requestAnimationFrame(previewLoop);

document.addEventListener("contextmenu", (event) => event.preventDefault());
document.addEventListener("dragstart", (event) => {
  if (event.target instanceof HTMLImageElement) event.preventDefault();
});
document.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  const blocked =
    key === "f12" ||
    (event.ctrlKey && event.shiftKey && ["i", "j", "c"].includes(key)) ||
    (event.ctrlKey && ["s", "u"].includes(key));
  if (blocked) event.preventDefault();
});

const canvas = document.querySelector("#fx");
const ctx = canvas.getContext("2d");
const particles = [];
const pointer = { x: 0, y: 0 };

function resizeCanvas() {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(window.innerWidth * ratio);
  canvas.height = Math.floor(window.innerHeight * ratio);
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function makeParticle() {
  return {
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    radius: Math.random() * 2.2 + 0.7,
    speed: Math.random() * 0.5 + 0.18,
    drift: Math.random() * 0.35 - 0.17,
    alpha: Math.random() * 0.55 + 0.2,
  };
}

function seedParticles() {
  particles.length = 0;
  const count = Math.min(120, Math.max(55, Math.floor(window.innerWidth / 13)));
  for (let index = 0; index < count; index += 1) particles.push(makeParticle());
}

function drawParticles() {
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  for (const particle of particles) {
    particle.x += particle.drift + (pointer.x - window.innerWidth / 2) * 0.0006;
    particle.y -= particle.speed + (pointer.y - window.innerHeight / 2) * 0.00035;

    if (particle.y < -10 || particle.x < -10 || particle.x > window.innerWidth + 10) {
      Object.assign(particle, makeParticle(), { y: window.innerHeight + 10 });
    }

    const glow = ctx.createRadialGradient(particle.x, particle.y, 0, particle.x, particle.y, particle.radius * 8);
    glow.addColorStop(0, `rgba(255, 122, 202, ${particle.alpha})`);
    glow.addColorStop(0.45, `rgba(217, 164, 255, ${particle.alpha * 0.36})`);
    glow.addColorStop(1, "rgba(255, 122, 202, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.radius * 8, 0, Math.PI * 2);
    ctx.fill();
  }
  requestAnimationFrame(drawParticles);
}

const revealObserver = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        entry.target.classList.remove("exit-up");
      } else if (entry.boundingClientRect.top < 0) {
        entry.target.classList.remove("visible");
        entry.target.classList.add("exit-up");
      } else {
        entry.target.classList.remove("visible", "exit-up");
      }
    }
  },
  { rootMargin: "-12% 0px -14% 0px", threshold: 0.12 }
);

document.querySelectorAll(".reveal").forEach((item) => revealObserver.observe(item));
window.addEventListener("resize", () => {
  applyDeviceMode();
  resizeCanvas();
  seedParticles();
});
window.addEventListener("pointermove", (event) => {
  pointer.x = event.clientX;
  pointer.y = event.clientY;
});

resizeCanvas();
seedParticles();
drawParticles();
