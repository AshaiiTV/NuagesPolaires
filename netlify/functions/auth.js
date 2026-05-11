const { neon } = require("@neondatabase/serverless");
const crypto = require("crypto");

let _npSqlClient = null;
function _getDatabaseUrl() {
  return process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL_UNPOOLED || "";
}
function _isDbConfigured() {
  return !!_getDatabaseUrl();
}
function _safeEnvStatus() {
  const siteUrl = process.env.NP_SITE_URL || "";
  return {
    databaseConfigured: _isDbConfigured(),
    jwtConfigured: !!SECRET && SECRET.length >= 32,
    siteUrlConfigured: !!siteUrl,
    siteOrigin: normalizeOrigin(siteUrl) || null,
    adminBootstrapConfigured: !!getBootstrapAdminConfig(),
    adminRecoveryEnabled: String(process.env.NP_ADMIN_RECOVERY || "").toLowerCase() === "true",
    netlifyContext: process.env.CONTEXT || null,
    deployId: process.env.DEPLOY_ID || null,
  };
}
function _getSqlClient() {
  const url = _getDatabaseUrl();
  if (!url) {
    const err = new Error("DATABASE_URL_MISSING");
    err.statusCode = 503;
    throw err;
  }
  if (!_npSqlClient) _npSqlClient = neon(url);
  return _npSqlClient;
}
function sql(strings, ...values) {
  return _getSqlClient()(strings, ...values);
}
function _dbUnavailableResponse(headers) {
  return {
    statusCode: 503,
    headers,
    body: JSON.stringify({ ok: false, error: "Base de données non configurée ou indisponible", offline: true })
  };
}
function _isDbUnavailableError(err) {
  return !!err && (err.statusCode === 503 || err.message === "DATABASE_URL_MISSING" || /database connection string/i.test(String(err.message || "")));
}

const SECRET = process.env.NP_JWT_SECRET;
if (!SECRET || SECRET.length < 32) {
  console.error("FATAL: NP_JWT_SECRET manquant ou trop court (32 chars min).");
}

const ALLOWED_ORIGIN = process.env.NP_SITE_URL || null;
function normalizeOrigin(url) {
  try { return url ? new URL(url).origin : null; } catch { return null; }
}
const SITE_ORIGIN = normalizeOrigin(ALLOWED_ORIGIN);
function getCorsHeaders(event) {
  const origin = (event.headers && (event.headers.origin || event.headers.Origin)) || "";
  const allowOrigin = SITE_ORIGIN && origin === SITE_ORIGIN ? SITE_ORIGIN : "";
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
    "Vary": "Origin",
    "Cache-Control": "no-store, no-cache, must-revalidate",
    "Pragma": "no-cache",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "same-origin",
  };
  if (allowOrigin) headers["Access-Control-Allow-Origin"] = allowOrigin;
  return headers;
}
function isTrustedOrigin(event) {
  if (!SITE_ORIGIN) return true;
  const origin = (event.headers && (event.headers.origin || event.headers.Origin)) || "";
  const referer = (event.headers && (event.headers.referer || event.headers.Referer)) || "";
  if (origin) return origin === SITE_ORIGIN;
  if (referer) return referer.startsWith(SITE_ORIGIN + "/") || referer === SITE_ORIGIN;
  return false;
}

const _loginAttempts = new Map();
const MAX_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000;
function checkRateLimit(ip) {
  const now = Date.now();
  const entry = _loginAttempts.get(ip) || { count: 0, first: now };
  if (now - entry.first > WINDOW_MS) {
    _loginAttempts.set(ip, { count: 1, first: now });
    return true;
  }
  if (entry.count >= MAX_ATTEMPTS) return false;
  entry.count++;
  _loginAttempts.set(ip, entry);
  return true;
}
function resetRateLimit(ip) { _loginAttempts.delete(ip); }

function b64url(buf) {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function signToken(payload) {
  if (!SECRET || SECRET.length < 32) throw new Error("Secret JWT non configuré");
  const header = b64url(Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const body = b64url(Buffer.from(JSON.stringify(payload)));
  const sig = b64url(crypto.createHmac("sha256", SECRET).update(header + "." + body).digest());
  return header + "." + body + "." + sig;
}
function verifyToken(token) {
  if (!SECRET || SECRET.length < 32) return null;
  try {
    const [header, body, sig] = token.split(".");
    if (!header || !body || !sig) return null;
    const expected = b64url(crypto.createHmac("sha256", SECRET).update(header + "." + body).digest());
    const sigBuf = Buffer.from(sig, "utf8");
    const expectedBuf = Buffer.from(expected, "utf8");
    if (sigBuf.length !== expectedBuf.length) return null;
    if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;
    const payload = JSON.parse(Buffer.from(body, "base64").toString());
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

const COOKIE_NAME = "np_session";
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60;
function makeCookie(token) {
  return `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Strict; Max-Age=${COOKIE_MAX_AGE}; Path=/`;
}
function clearCookie() {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/`;
}
function getTokenFromCookie(event) {
  const cookieHeader = (event.headers && (event.headers.cookie || event.headers.Cookie)) || "";
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  return match ? match[1] : null;
}

const PBKDF2_ITERATIONS = 100000;
const PBKDF2_KEYLEN = 64;
const PBKDF2_DIGEST = "sha512";
async function pbkdf2Hash(sha256hex, salt) {
  const input = sha256hex.replace(/^sha256:/, "");
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(input, salt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST, (err, key) => {
      if (err) reject(err);
      else resolve("pbkdf2:" + salt + ":" + key.toString("hex"));
    });
  });
}
async function verifyPassword(sha256hex, stored) {
  if (!stored) return false;
  if (stored.startsWith("pbkdf2:")) {
    const parts = stored.split(":");
    if (parts.length !== 3) return false;
    const [, salt, storedHash] = parts;
    const computed = await pbkdf2Hash(sha256hex, salt);
    const computedHash = computed.split(":")[2];
    const a = Buffer.from(storedHash, "hex");
    const b = Buffer.from(computedHash, "hex");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  }
  if (stored.startsWith("sha256:")) return stored === sha256hex;
  return stored === sha256hex.replace(/^sha256:/, "");
}
async function upgradePassword(sha256hex) {
  const salt = crypto.randomBytes(32).toString("hex");
  return pbkdf2Hash(sha256hex, salt);
}

function sanitizeStr(s, maxLen = 64) {
  if (typeof s !== "string") return "";
  return s
    .replace(/\r\n/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/<\s*script\b[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, "")
    .replace(/\bjavascript\s*:/gi, "")
    .trim()
    .slice(0, maxLen);
}
function sanitizeAction(s) { return sanitizeStr(s, 48); }

function isValidSha256ClientHash(v) { return /^sha256:[a-f0-9]{64}$/i.test(String(v || "")); }
function isValidPseudo(v) { return /^[A-Za-z0-9_\-À-ÿ ]{2,32}$/.test(String(v || "")); }
function isValidGenericId(v) { return /^[A-Za-z0-9_:\-]{1,128}$/.test(String(v || "")); }
function isValidThemeId(v) {
  return typeof v === 'string' && sanitizeStr(v, 128).length > 0;
}
const THEME_ID_ALIASES = {
  dark:'dark', default:'dark', themedefault:'dark', nuagespolaires:'dark', original:'dark', base:'dark',
  light:'light', brumeclaire:'light', modeclair:'light', clair:'light',
  violet:'violet', abyssal:'violet', themeviolet:'violet',
  red:'red', ecarlate:'red', scarlet:'red', themered:'red',
  green:'green', sylvan:'green', themegreen:'green',
  easter:'easter', themeeaster:'easter', printempseveille:'easter', paques:'easter', paque:'easter', springawakened:'easter',
  halloween:'halloween', themehalloween:'halloween',
  noel:'noel', themenoel:'noel', christmas:'noel',
  bloodmoon:'bloodmoon', themebloodmoon:'bloodmoon', lunedesang:'bloodmoon', bloodmoonlegacy:'bloodmoon', lunebloodmoon:'bloodmoon',
  aquaris:'aquaris', themeaquaris:'aquaris'
};
function themeLooseKey(v) {
  let id = sanitizeStr(v, 128).toLowerCase();
  try { id = id.normalize('NFD').replace(/[̀-ͯ]/g, ''); } catch (_) {}
  return id.replace(/[^a-z0-9]+/g, '');
}
function normalizeThemeId(v) {
  let id = sanitizeStr(v, 128).toLowerCase();
  if (!id) return 'dark';
  if (id.startsWith('theme-')) id = id.slice(6);
  if (id === 'theme-default' || id === 'default') return 'dark';
  const loose = themeLooseKey(id);
  return THEME_ID_ALIASES[loose] || loose || 'dark';
}
function dedupeById(list, prefix, normalizer) {
  const out = [];
  const seen = new Set();
  (Array.isArray(list) ? list : []).forEach((entry, idx) => {
    const item = normalizer ? normalizer(entry, idx) : entry;
    if (!item || typeof item !== "object") return;
    item.id = String(item.id || (prefix + idx));
    if (seen.has(item.id)) return;
    seen.add(item.id);
    out.push(item);
  });
  return out;
}
function normalizeAccountRecord(record, idx = 0) {
  const out = record && typeof record === "object" && !Array.isArray(record) ? { ...record } : {};
  out.id = String(out.id || ("a_" + idx));
  out.pseudo = sanitizeStr(out.pseudo || out.name || ("Joueur " + (idx + 1)), 32);
  out.role = normalizeRole(out.role);
  out.pid = out.pid ? sanitizeStr(out.pid, 128) : null;
  out.createdAt = Number.isFinite(Number(out.createdAt)) ? Number(out.createdAt) : Date.now();
  out.lastSeen = Number.isFinite(Number(out.lastSeen)) ? Number(out.lastSeen) : out.createdAt;
  out.unlockedThemes = Array.isArray(out.unlockedThemes)
    ? out.unlockedThemes.map(normalizeThemeId).filter(Boolean).filter((v, i, arr) => arr.indexOf(v) === i)
    : [];
  out.blockedThemes = Array.isArray(out.blockedThemes)
    ? out.blockedThemes.map(normalizeThemeId).filter(Boolean).filter((v, i, arr) => arr.indexOf(v) === i)
    : [];
  out.selectedTheme = normalizeThemeId(out.selectedTheme || "dark") || "dark";
  return out;
}
function normalizePlayerRecord(record, idx = 0) {
  const out = record && typeof record === "object" && !Array.isArray(record) ? { ...record } : {};
  out.id = String(out.id || ("p_" + idx));
  out.name = sanitizeStr(out.name || ("Joueur " + (idx + 1)), 80);
  out.classe = sanitizeStr(out.classe || out.class || "", 80);
  out.level = Math.max(1, Math.floor(Number.isFinite(Number(out.level)) ? Number(out.level) : 1));
  out.inventory = Array.isArray(out.inventory) ? out.inventory.slice(0, 500) : [];
  out.history = Array.isArray(out.history) ? out.history.slice(-200) : [];
  out.statuts = Array.isArray(out.statuts) ? out.statuts.slice(0, 64) : [];
  out.equipment = out.equipment && typeof out.equipment === "object" && !Array.isArray(out.equipment) ? { helmet: out.equipment.helmet || null, chest: out.equipment.chest || null, legs: out.equipment.legs || null } : { helmet: null, chest: null, legs: null };
  return out;
}
function normalizeAccounts(list) { return dedupeById(list, "a_", normalizeAccountRecord); }
function normalizePlayers(list) { return dedupeById(list, "p_", normalizePlayerRecord); }
async function appendAuditLog(entry) {
  const logs = await readStore("np_audit_log", []);
  const arr = Array.isArray(logs) ? logs : [];
  arr.unshift(entry);
  if (arr.length > 500) arr.length = 500;
  await writeStore("np_audit_log", arr);
}
async function audit(event, actor, action, details = {}) {
  try {
    const ip = String((event.headers && (event.headers["x-forwarded-for"] || event.headers["client-ip"])) || "unknown").split(',')[0].trim();
    await appendAuditLog({
      ts: Date.now(),
      actorId: actor && actor.id ? actor.id : null,
      actorPseudo: actor && actor.pseudo ? actor.pseudo : null,
      actorRole: actor && actor.role ? normalizeRole(actor.role) : null,
      action,
      ip,
      details,
    });
  } catch (e) {
    console.error('audit log error:', e);
  }
}

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS np_store (
      key        TEXT PRIMARY KEY,
      value      JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT now()
    )
  `;
}
async function readStore(key, fallback) {
  const rows = await sql`SELECT value FROM np_store WHERE key = ${key}`;
  return rows.length ? rows[0].value : fallback;
}
async function writeStore(key, value) {
  await sql`
    INSERT INTO np_store (key, value, updated_at)
    VALUES (${key}, ${JSON.stringify(value)}, now())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
  `;
}

async function loadThemeAdminStore(){
  const rows = await sql`SELECT value FROM np_store WHERE key = ${'themes_admin_store'}`;
  return rows.length && rows[0].value && typeof rows[0].value === 'object' ? rows[0].value : { visibleThemes: [], meta: {} };
}
async function saveThemeAdminStore(store){
  await sql`
    INSERT INTO np_store (key, value)
    VALUES (${'themes_admin_store'}, ${store})
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
  `;
}

async function loadAccounts() {
  const accounts = await readStore("accounts", []);
  return normalizeAccounts(accounts);
}
async function saveAccounts(accounts) { await writeStore("accounts", normalizeAccounts(accounts)); }
function getBootstrapAdminConfig() {
  const pseudo = sanitizeStr(process.env.NP_ADMIN_PSEUDO || process.env.ADMIN_PSEUDO || "", 32);
  const password = sanitizeStr(process.env.NP_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || "", 256);
  if (!pseudo || !password) return null;
  if (!isValidPseudo(pseudo) || password.length < 8) return null;
  const recovery = String(process.env.NP_ADMIN_RECOVERY || "").toLowerCase() === "true";
  return { pseudo, password, recovery };
}
function hashPlainPasswordForStorage(password) {
  return "sha256:" + crypto.createHash("sha256").update(password).digest("hex");
}
async function ensureBootstrapAdmin(accounts) {
  if (!Array.isArray(accounts)) return accounts;
  const cfg = getBootstrapAdminConfig();
  if (!cfg) return accounts;
  const hasAdmin = accounts.some(a => normalizeRole(a && a.role) === "admin");
  if (hasAdmin && !cfg.recovery) return accounts;

  const pass = await upgradePassword(hashPlainPasswordForStorage(cfg.password));
  const existing = accounts.find(a => String(a.pseudo || "").toLowerCase() === cfg.pseudo.toLowerCase());
  if (existing) {
    existing.role = "admin";
    existing.pass = pass;
    existing.forcePasswordReset = true;
    existing.updatedAt = Date.now();
  } else {
    accounts.push({
      id: "admin_" + Date.now() + "_" + crypto.randomBytes(4).toString("hex"),
      pseudo: cfg.pseudo,
      pass,
      role: "admin",
      pid: null,
      createdAt: Date.now(),
      lastSeen: Date.now(),
      forcePasswordReset: true,
    });
  }
  await saveAccounts(accounts);
  return accounts;
}
async function loadPlayers() {
  const players = await readStore("players", []);
  return normalizePlayers(players);
}
async function savePlayers(players) { await writeStore("players", normalizePlayers(players)); }

async function readRateLimits() {
  const value = await readStore("np_rate_auth", {});
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
async function writeRateLimits(map) {
  await writeStore("np_rate_auth", map);
}
function cleanupRateBucket(bucket, now) {
  for (const k of Object.keys(bucket)) {
    const e = bucket[k];
    if (!e || typeof e !== "object" || !e.first || now - e.first > WINDOW_MS) delete bucket[k];
  }
}
async function checkRateLimitPersistent(key) {
  const now = Date.now();
  const bucket = await readRateLimits();
  cleanupRateBucket(bucket, now);
  const entry = bucket[key] || { count: 0, first: now };
  if (now - entry.first > WINDOW_MS) {
    bucket[key] = { count: 1, first: now };
    await writeRateLimits(bucket);
    return true;
  }
  if (entry.count >= MAX_ATTEMPTS) {
    await writeRateLimits(bucket);
    return false;
  }
  entry.count++;
  bucket[key] = entry;
  await writeRateLimits(bucket);
  return true;
}
async function resetRateLimitPersistent(key) {
  const bucket = await readRateLimits();
  if (key in bucket) {
    delete bucket[key];
    await writeRateLimits(bucket);
  }
}

function makeSessionPayload(account) {
  return {
    sub: account.id,
    name: account.pseudo,
    role: account.role || "joueur",
    pid: account.pid || null,
    iat: Date.now(),
    exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
  };
}
function sessionResponse(headers, account, statusCode = 200, extra = {}) {
  const payload = makeSessionPayload(account);
  const jwt = signToken(payload);
  return {
    statusCode,
    headers: { ...headers, "Set-Cookie": makeCookie(jwt) },
    body: JSON.stringify({ ok: true, role: payload.role, pid: payload.pid, name: payload.name, forcePasswordReset: !!account.forcePasswordReset, ...extra }),
  };
}
async function getCallerAccount(event) {
  const token = getTokenFromCookie(event);
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload || !payload.sub) return null;
  const accounts = await loadAccounts();
  const account = accounts.find(a => a.id === payload.sub);
  if (!account) return null;
  return { payload, account, accounts };
}
function isAdmin(account) { return !!account && String(account.role || "").toLowerCase() === "admin"; }
function normalizeRole(role) {
  const r = String(role || "joueur").toLowerCase();
  return ["joueur", "mj", "designer", "admin"].includes(r) ? r : "joueur";
}
function buildCombatArchiveMeta(arc, owner) {
  const src = arc && typeof arc === "object" && !Array.isArray(arc) ? arc : {};
  return {
    id: String(src.id || ("arc_" + Date.now())),
    name: String(src.name || src.label || "Combat"),
    label: String(src.label || src.name || ""),
    savedAt: Number.isFinite(Number(src.savedAt)) ? Number(src.savedAt) : Date.now(),
    round: Math.max(1, Math.floor(Number.isFinite(Number(src.round)) ? Number(src.round) : 1)),
    phase: String(src.phase || "idle"),
    active: !!src.active,
    fighters: Array.isArray(src.fighters) ? src.fighters.slice(0, 80) : [],
    _owner: String(owner || src._owner || ""),
    _manualSaved: !!src._manualSaved,
    _autosaveAt: Number.isFinite(Number(src._autosaveAt)) ? Number(src._autosaveAt) : 0,
    _autosaveReason: String(src._autosaveReason || ""),
    _inProgress: !!src._inProgress,
    _draft: !!src._draft,
    _new: !!src._new,
    _stub: true
  };
}
async function persistAccountsAndSession(headers, accounts, account, statusCode = 200, extra = {}) {
  await saveAccounts(accounts);
  return sessionResponse(headers, account, statusCode, extra);
}

async function buildSessionBundle(account) {
  const role = normalizeRole(account && account.role);
  const accounts = await loadAccounts();
  const players = await loadPlayers();
  const themeVisibility = await readStore("theme_visibility", {});
  let filteredAccounts = [];
  let filteredPlayers = [];
  const combatArchivesByOwner = {};
  const combatArchiveIndexByOwner = {};
  if (role === "admin") {
    filteredAccounts = accounts.map(a => {
      const copy = { ...a };
      delete copy.pass;
      return copy;
    });
    filteredPlayers = players;
  } else if (role === "mj") {
    filteredPlayers = players;
  } else if (role === "designer") {
    filteredPlayers = [];
  } else if (account) {
    const own = accounts.find(a => a.id === account.id);
    if (own) {
      const copy = { ...own };
      delete copy.pass;
      filteredAccounts = [copy];
    }
    filteredPlayers = account.pid ? players.filter(p => p && p.id === account.pid) : [];
  }

  const canReadCombatArchives = role === "admin" || role === "mj" || role === "joueur";
  if (canReadCombatArchives) {
    const owners = new Set();
    if (role === "admin") {
      accounts.forEach(a => {
        const r = normalizeRole(a && a.role);
        const pseudo = String((a && a.pseudo) || "").trim();
        if (pseudo && (r === "admin" || r === "mj")) owners.add(pseudo);
      });
    } else {
      const pseudo = String((account && account.pseudo) || "").trim();
      const id = String((account && account.id) || "").trim();
      const linkedPlayer = Array.isArray(players) ? players.find(p => String((p && p.id) || "") === String((account && account.pid) || "")) : null;
      const linkedPlayerName = String((linkedPlayer && linkedPlayer.name) || "").trim();
      if (pseudo) owners.add(pseudo);
      if (id) owners.add(id);
      if (linkedPlayerName) owners.add(linkedPlayerName);
    }
    for (const owner of owners) {
      const idxKey = `combat_arc_idx_${owner}`;
      const idxValue = await readStore(idxKey, []);
      if (Array.isArray(idxValue) && idxValue.length) {
        combatArchiveIndexByOwner[owner] = idxValue.map(arc => buildCombatArchiveMeta(arc, owner));
      }
      const key = `combat_arc_${owner}`;
      const value = await readStore(key, []);
      const legacyList = Array.isArray(value) ? value : [];
      combatArchivesByOwner[owner] = legacyList;
      if (!combatArchiveIndexByOwner[owner] || !combatArchiveIndexByOwner[owner].length) {
        combatArchiveIndexByOwner[owner] = legacyList.map(arc => buildCombatArchiveMeta(arc, owner));
      }
    }
  }
  return {
    accounts: filteredAccounts,
    players: filteredPlayers,
    themeVisibility: (themeVisibility && typeof themeVisibility==='object' && !Array.isArray(themeVisibility)) ? themeVisibility : {},
    combatArchivesByOwner,
    combatArchiveIndexByOwner
  };
}

exports.handler = async (event) => {
  const headers = getCorsHeaders(event);
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: JSON.stringify({ error: "Méthode non autorisée" }) };
  if (!SECRET || SECRET.length < 32) return { statusCode: 503, headers, body: JSON.stringify({ ok: false, error: "Service non configuré" }) };
  if (!_isDbConfigured()) return _dbUnavailableResponse(headers);
  if (!isTrustedOrigin(event)) return { statusCode: 403, headers, body: JSON.stringify({ error: "Origine non autorisée" }) };
  const contentType = String((event.headers && (event.headers["content-type"] || event.headers["Content-Type"])) || "");
  if (!contentType.includes("application/json")) return { statusCode: 415, headers, body: JSON.stringify({ error: "Content-Type invalide" }) };
  if (event.body && event.body.length > 32 * 1024) return { statusCode: 413, headers, body: JSON.stringify({ error: "Requête trop volumineuse" }) };

  const ip = String((event.headers && (event.headers["x-forwarded-for"] || event.headers["client-ip"])) || "unknown").split(',')[0].trim();

  try {
    await ensureTable();
    const body = JSON.parse(event.body || "{}");
    const action = sanitizeAction(body.action);

    if (action === "login") {
      const pseudo = sanitizeStr(body.pseudo, 64);
      const passHash = sanitizeStr(body.passHash, 200);
      if (!pseudo || !passHash) return { statusCode: 400, headers, body: JSON.stringify({ error: "Champs manquants" }) };
      if (!isValidPseudo(pseudo) || !isValidSha256ClientHash(passHash)) return { statusCode: 400, headers, body: JSON.stringify({ error: "Format invalide" }) };
      const accounts = await ensureBootstrapAdmin(await loadAccounts());
      const account = accounts.find(a => String(a.pseudo || "").toLowerCase() === pseudo.toLowerCase());
      const ERR_AUTH = { error: "Identifiant ou mot de passe incorrect" };
      if (!checkRateLimit(ip) || !(await checkRateLimitPersistent(`ip:${ip}`)) || !(await checkRateLimitPersistent(`login:${pseudo.toLowerCase()}`))) {
        if (account && isAdmin(account) && (await verifyPassword(passHash, account.pass))) {
          resetRateLimit(ip);
          await resetRateLimitPersistent(`ip:${ip}`);
          await resetRateLimitPersistent(`login:${pseudo.toLowerCase()}`);
        } else {
          await audit(event, { id: null, pseudo, role: "joueur" }, "login_rate_limited", { pseudo });
          return { statusCode: 429, headers, body: JSON.stringify({ error: "Trop de tentatives. Réessaie dans 15 minutes." }) };
        }
      }

      if (!account) {
        await audit(event, { id: null, pseudo, role: "joueur" }, "login_failed", { pseudo });
        await new Promise(r => setTimeout(r, 200));
        return { statusCode: 401, headers, body: JSON.stringify(ERR_AUTH) };
      }
      const ok = await verifyPassword(passHash, account.pass);
      if (!ok) {
        await audit(event, account, "login_failed", { pseudo: account.pseudo || pseudo });
        return { statusCode: 401, headers, body: JSON.stringify(ERR_AUTH) };
      }
      resetRateLimit(ip);
      await resetRateLimitPersistent(`ip:${ip}`);
      await resetRateLimitPersistent(`login:${pseudo.toLowerCase()}`);

      if (!String(account.pass || "").startsWith("pbkdf2:")) {
        try {
          account.pass = await upgradePassword(passHash);
          await saveAccounts(accounts);
        } catch (e) {
          console.error("Password upgrade error:", e);
        }
      }
      account.lastSeen = Date.now();
      await audit(event, account, "login_success", {});
      return persistAccountsAndSession(headers, accounts, account, 200);
    }

    if (action === "verify") {
      const caller = await getCallerAccount(event);
      if (!caller) {
        return { statusCode: 401, headers: { ...headers, "Set-Cookie": clearCookie() }, body: JSON.stringify({ error: "Non authentifié" }) };
      }
      const account = caller.account;
      account.lastSeen = Date.now();
      return persistAccountsAndSession(headers, caller.accounts, account, 200);
    }

    if (action === "session_bundle") {
      const caller = await getCallerAccount(event);
      if (!caller) {
        return { statusCode: 401, headers: { ...headers, "Set-Cookie": clearCookie() }, body: JSON.stringify({ error: "Non authentifié" }) };
      }
      const account = caller.account;
      account.lastSeen = Date.now();
      await saveAccounts(caller.accounts);
      const bundle = await buildSessionBundle(account);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: true,
          role: normalizeRole(account.role),
          pid: account.pid || null,
          name: account.pseudo || "Joueur",
          forcePasswordReset: !!account.forcePasswordReset,
          source: 'db',
          data: bundle
        })
      };
    }

    if (action === "logout") {
      return { statusCode: 200, headers: { ...headers, "Set-Cookie": clearCookie() }, body: JSON.stringify({ ok: true }) };
    }

    if (action === "register") {
      const pseudo = sanitizeStr(body.pseudo, 64);
      const passHash = sanitizeStr(body.passHash, 200);
      if (!pseudo || !passHash) return { statusCode: 400, headers, body: JSON.stringify({ error: "Champs manquants" }) };
      if (!isValidPseudo(pseudo)) return { statusCode: 400, headers, body: JSON.stringify({ error: "Pseudo invalide" }) };
      if (!isValidSha256ClientHash(passHash)) return { statusCode: 400, headers, body: JSON.stringify({ error: "Format de mot de passe invalide" }) };
      if (!checkRateLimit(ip) || !(await checkRateLimitPersistent(`ip:${ip}`)) || !(await checkRateLimitPersistent(`register:${pseudo.toLowerCase()}`))) {
        await audit(event, { id: null, pseudo, role: "joueur" }, "register_rate_limited", { pseudo });
        return { statusCode: 429, headers, body: JSON.stringify({ error: "Trop de tentatives. Réessaie dans 15 minutes." }) };
      }

      const accounts = await ensureBootstrapAdmin(await loadAccounts());
      if (accounts.find(a => String(a.pseudo || "").toLowerCase() === pseudo.toLowerCase())) {
        return { statusCode: 409, headers, body: JSON.stringify({ error: "Ce pseudo est déjà pris." }) };
      }
      const hashedPass = await upgradePassword(passHash);
      const newAccount = {
        id: "a" + Date.now() + "_" + crypto.randomBytes(4).toString("hex"),
        pseudo,
        pass: hashedPass,
        role: "joueur",
        pid: null,
        createdAt: Date.now(),
        lastSeen: Date.now(),
      };
      accounts.push(newAccount);
      resetRateLimit(ip);
      await resetRateLimitPersistent(`ip:${ip}`);
      await resetRateLimitPersistent(`register:${pseudo.toLowerCase()}`);
      await audit(event, newAccount, "register_success", {});
      return persistAccountsAndSession(headers, accounts, newAccount, 201);
    }

    if (action === "touch_last_seen") {
      const caller = await getCallerAccount(event);
      if (!caller) return { statusCode: 401, headers, body: JSON.stringify({ error: "Non authentifié" }) };
      caller.account.lastSeen = Date.now();
      await saveAccounts(caller.accounts);
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    if (action === "self_change_password") {
      const caller = await getCallerAccount(event);
      if (!caller) return { statusCode: 401, headers, body: JSON.stringify({ error: "Non authentifié" }) };
      const currentPassHash = sanitizeStr(body.currentPassHash, 200);
      const newPassHash = sanitizeStr(body.newPassHash, 200);
      if (!currentPassHash || !newPassHash || !isValidSha256ClientHash(currentPassHash) || !isValidSha256ClientHash(newPassHash)) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Paramètres invalides" }) };
      }
      const ok = await verifyPassword(currentPassHash, caller.account.pass);
      if (!ok) return { statusCode: 403, headers, body: JSON.stringify({ error: "Mot de passe actuel incorrect" }) };
      caller.account.pass = await upgradePassword(newPassHash);
      caller.account.forcePasswordReset = false;
      await audit(event, caller.account, "self_change_password", {});
      return persistAccountsAndSession(headers, caller.accounts, caller.account, 200);
    }

    if (action === "complete_forced_reset") {
      const caller = await getCallerAccount(event);
      if (!caller) return { statusCode: 401, headers: { ...headers, "Set-Cookie": clearCookie() }, body: JSON.stringify({ error: "Session expirée" }) };
      const newPassHash = sanitizeStr(body.newPassHash, 200);
      if (!isValidSha256ClientHash(newPassHash)) return { statusCode: 400, headers, body: JSON.stringify({ error: "Mot de passe invalide" }) };
      caller.account.pass = await upgradePassword(newPassHash);
      caller.account.forcePasswordReset = false;
      await audit(event, caller.account, "complete_forced_reset", {});
      return persistAccountsAndSession(headers, caller.accounts, caller.account, 200);
    }

    if (action === "self_delete_account") {
      const caller = await getCallerAccount(event);
      if (!caller) return { statusCode: 401, headers, body: JSON.stringify({ error: "Non authentifié" }) };
      const currentPassHash = sanitizeStr(body.currentPassHash, 200);
      if (!isValidSha256ClientHash(currentPassHash)) return { statusCode: 400, headers, body: JSON.stringify({ error: "Mot de passe requis" }) };
      if (normalizeRole(caller.account.role) === "admin") return { statusCode: 403, headers, body: JSON.stringify({ error: "Le compte administrateur ne peut pas être supprimé." }) };
      const ok = await verifyPassword(currentPassHash, caller.account.pass);
      if (!ok) return { statusCode: 403, headers, body: JSON.stringify({ error: "Mot de passe incorrect" }) };
      const nextAccounts = caller.accounts.filter(a => a.id !== caller.account.id);
      if (caller.account.pid && normalizeRole(caller.account.role) === "joueur") {
        const players = await loadPlayers();
        await savePlayers(players.filter(p => p.id !== caller.account.pid));
      }
      await saveAccounts(nextAccounts);
      return { statusCode: 200, headers: { ...headers, "Set-Cookie": clearCookie() }, body: JSON.stringify({ ok: true }) };
    }

    if (action === "admin_reset_password") {
      const caller = await getCallerAccount(event);
      if (!caller || !isAdmin(caller.account)) return { statusCode: 403, headers, body: JSON.stringify({ error: "Admin uniquement" }) };
      const accountId = sanitizeStr(body.accountId, 128);
      if (!isValidGenericId(accountId)) return { statusCode: 400, headers, body: JSON.stringify({ error: "Compte invalide" }) };
      const target = caller.accounts.find(a => a.id === accountId);
      if (!target) return { statusCode: 404, headers, body: JSON.stringify({ error: "Compte introuvable" }) };
      target.pass = await upgradePassword("sha256:" + crypto.createHash("sha256").update("reset").digest("hex"));
      target.forcePasswordReset = true;
      await saveAccounts(caller.accounts);
      await audit(event, caller.account, "admin_reset_password", { accountId });
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    if (action === "admin_set_password") {
      const caller = await getCallerAccount(event);
      if (!caller || !isAdmin(caller.account)) return { statusCode: 403, headers, body: JSON.stringify({ error: "Admin uniquement" }) };
      const accountId = sanitizeStr(body.accountId, 128);
      if (!isValidGenericId(accountId)) return { statusCode: 400, headers, body: JSON.stringify({ error: "Compte invalide" }) };
      const newPassHash = sanitizeStr(body.newPassHash, 200);
      if (!isValidSha256ClientHash(newPassHash)) return { statusCode: 400, headers, body: JSON.stringify({ error: "Mot de passe invalide" }) };
      const target = caller.accounts.find(a => a.id === accountId);
      if (!target) return { statusCode: 404, headers, body: JSON.stringify({ error: "Compte introuvable" }) };
      target.pass = await upgradePassword(newPassHash);
      target.forcePasswordReset = false;
      await saveAccounts(caller.accounts);
      await audit(event, caller.account, "admin_set_password", { accountId });
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    if (action === "admin_delete_account") {
      const caller = await getCallerAccount(event);
      if (!caller || !isAdmin(caller.account)) return { statusCode: 403, headers, body: JSON.stringify({ error: "Admin uniquement" }) };
      const accountId = sanitizeStr(body.accountId, 128);
      if (!isValidGenericId(accountId)) return { statusCode: 400, headers, body: JSON.stringify({ error: "Compte invalide" }) };
      const target = caller.accounts.find(a => a.id === accountId);
      if (!target) return { statusCode: 404, headers, body: JSON.stringify({ error: "Compte introuvable" }) };
      const admins = caller.accounts.filter(a => normalizeRole(a.role) === "admin");
      if (normalizeRole(target.role) === "admin" && admins.length <= 1) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Impossible de supprimer le dernier compte Admin." }) };
      }
      await saveAccounts(caller.accounts.filter(a => a.id !== accountId));
      await audit(event, caller.account, "admin_delete_account", { accountId });
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    if (action === "admin_link_account" || action === "admin_set_pid") {
      const caller = await getCallerAccount(event);
      if (!caller || !isAdmin(caller.account)) return { statusCode: 403, headers, body: JSON.stringify({ error: "Admin uniquement" }) };
      const accountId = sanitizeStr(body.accountId, 128);
      if (!isValidGenericId(accountId)) return { statusCode: 400, headers, body: JSON.stringify({ error: "Compte invalide" }) };
      const pid = sanitizeStr(body.pid, 128);
      if (pid && !isValidGenericId(pid)) return { statusCode: 400, headers, body: JSON.stringify({ error: "PID invalide" }) };
      const target = caller.accounts.find(a => a.id === accountId);
      if (!target) return { statusCode: 404, headers, body: JSON.stringify({ error: "Compte introuvable" }) };
      if (pid) {
        const players = await loadPlayers();
        if (!players.some(p => p && p.id === pid)) {
          return { statusCode: 404, headers, body: JSON.stringify({ error: "Personnage introuvable" }) };
        }
      }
      target.pid = pid || null;
      await saveAccounts(caller.accounts);
      await audit(event, caller.account, "admin_link_account", { accountId, pid: target.pid || null });
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, pid: target.pid || null }) };
    }

    if (action === "admin_unlink_account") {
      const caller = await getCallerAccount(event);
      if (!caller || !isAdmin(caller.account)) return { statusCode: 403, headers, body: JSON.stringify({ error: "Admin uniquement" }) };
      const accountId = sanitizeStr(body.accountId, 128);
      if (!isValidGenericId(accountId)) return { statusCode: 400, headers, body: JSON.stringify({ error: "Compte invalide" }) };
      const target = caller.accounts.find(a => a.id === accountId);
      if (!target) return { statusCode: 404, headers, body: JSON.stringify({ error: "Compte introuvable" }) };
      target.pid = null;
      await saveAccounts(caller.accounts);
      await audit(event, caller.account, "admin_unlink_account", { accountId });
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    if (action === "admin_set_role") {
      const caller = await getCallerAccount(event);
      if (!caller || !isAdmin(caller.account)) return { statusCode: 403, headers, body: JSON.stringify({ error: "Admin uniquement" }) };
      const accountId = sanitizeStr(body.accountId, 128);
      if (!isValidGenericId(accountId)) return { statusCode: 400, headers, body: JSON.stringify({ error: "Compte invalide" }) };
      const role = normalizeRole(body.role);
      const target = caller.accounts.find(a => a.id === accountId);
      if (!target) return { statusCode: 404, headers, body: JSON.stringify({ error: "Compte introuvable" }) };
      const admins = caller.accounts.filter(a => normalizeRole(a.role) === "admin");
      if (normalizeRole(target.role) === "admin" && admins.length <= 1 && role !== "admin") {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Impossible de changer le rôle du dernier Admin." }) };
      }
      target.role = role;
      await saveAccounts(caller.accounts);
      await audit(event, caller.account, "admin_set_role", { accountId, role });
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, role }) };
    }


if (action === "self_unlock_theme") {
  return { statusCode: 403, headers, body: JSON.stringify({ error: "Déblocage direct désactivé. Utilise un thème auto-distribué ou un don admin." }) };
}

if (action === "self_set_theme") {
  const caller = await getCallerAccount(event);
  if (!caller || !caller.account) return { statusCode: 401, headers, body: JSON.stringify({ error: "Connexion requise" }) };
  const rawThemeId = sanitizeStr(body.themeId, 128);
  const themeId = normalizeThemeId(rawThemeId || 'dark') || 'dark';
  if (!themeId) return { statusCode: 400, headers, body: JSON.stringify({ error: "Thème invalide" }) };
  const target = caller.accounts.find(a => a.id === caller.account.id);
  if (!target) return { statusCode: 404, headers, body: JSON.stringify({ error: "Compte introuvable" }) };
  target.selectedTheme = themeId;
  await saveAccounts(caller.accounts);
  await audit(event, target, "self_set_theme", { themeId });
  return sessionResponse(headers, target, 200, { ok: true, selectedTheme: themeId });
}

    if (action === "admin_grant_theme") {
      const caller = await getCallerAccount(event);
      if (!caller || !isAdmin(caller.account)) return { statusCode: 403, headers, body: JSON.stringify({ error: "Admin uniquement" }) };
      const accountId = sanitizeStr(body.accountId, 128);
      if (!isValidGenericId(accountId)) return { statusCode: 400, headers, body: JSON.stringify({ error: "Compte invalide" }) };
      const rawThemeId = sanitizeStr(body.themeId, 128);
      const themeId = normalizeThemeId(rawThemeId);
      if (themeId && !isValidThemeId(themeId)) return { statusCode: 400, headers, body: JSON.stringify({ error: "Thème invalide" }) };
      if (!accountId || !themeId) return { statusCode: 400, headers, body: JSON.stringify({ error: "Paramètres invalides" }) };
      const target = caller.accounts.find(a => a.id === accountId);
      if (!target) return { statusCode: 404, headers, body: JSON.stringify({ error: "Compte introuvable" }) };
      if (normalizeRole(target.role) !== "joueur") return { statusCode: 400, headers, body: JSON.stringify({ error: "Ce don est réservé aux joueurs." }) };
      target.unlockedThemes = Array.isArray(target.unlockedThemes) ? target.unlockedThemes : [];
      if (!target.unlockedThemes.includes(themeId)) target.unlockedThemes.push(themeId);
      await saveAccounts(caller.accounts);
      await audit(event, caller.account, "admin_grant_theme", { accountId, themeId });
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    if (action === "admin_grant_theme_all") {
      const caller = await getCallerAccount(event);
      if (!caller || !isAdmin(caller.account)) return { statusCode: 403, headers, body: JSON.stringify({ error: "Admin uniquement" }) };
      const rawThemeId = sanitizeStr(body.themeId, 128);
      const themeId = normalizeThemeId(rawThemeId);
      if (themeId && !isValidThemeId(themeId)) return { statusCode: 400, headers, body: JSON.stringify({ error: "Thème invalide" }) };
      if (!themeId) return { statusCode: 400, headers, body: JSON.stringify({ error: "Thème invalide" }) };
      let changed = 0;
      caller.accounts.forEach(acc => {
        if (normalizeRole(acc.role) !== "joueur") return;
        acc.unlockedThemes = Array.isArray(acc.unlockedThemes) ? acc.unlockedThemes : [];
        if (!acc.unlockedThemes.includes(themeId)) {
          acc.unlockedThemes.push(themeId);
          changed++;
        }
      });
      await saveAccounts(caller.accounts);
      await audit(event, caller.account, "admin_grant_theme_all", { themeId, changed });
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, changed }) };
    }

    if (action === "admin_set_theme_autogrant") {
      const caller = await getCallerAccount(event);
      if (!caller || !isAdmin(caller.account)) return { statusCode: 403, headers, body: JSON.stringify({ error: "Admin uniquement" }) };
      const rawThemeId = sanitizeStr(body.themeId, 128);
      const themeId = normalizeThemeId(rawThemeId);
      if (themeId && !isValidThemeId(themeId)) return { statusCode: 400, headers, body: JSON.stringify({ error: "Thème invalide" }) };
      const enabled = !!body.enabled;
      if (!themeId) return { statusCode: 400, headers, body: JSON.stringify({ error: "Thème invalide" }) };
      const eventThemes = await readStore("event_themes", {});
      const nextThemes = eventThemes && typeof eventThemes === "object" && !Array.isArray(eventThemes) ? eventThemes : {};
      nextThemes[themeId] = { ...(nextThemes[themeId] || {}), autoGrantAll: enabled };
      await writeStore("event_themes", nextThemes);
      await audit(event, caller.account, "admin_set_theme_autogrant", { themeId, enabled });
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, themeId, autoGrantAll: enabled }) };
    }

    if (action === "admin_revoke_theme") {
      const caller = await getCallerAccount(event);
      if (!caller || !isAdmin(caller.account)) return { statusCode: 403, headers, body: JSON.stringify({ error: "Admin uniquement" }) };
      const accountId = sanitizeStr(body.accountId, 128);
      if (!isValidGenericId(accountId)) return { statusCode: 400, headers, body: JSON.stringify({ error: "Compte invalide" }) };
      const themeId = sanitizeStr(body.themeId, 128);
      if (themeId && !isValidThemeId(themeId)) return { statusCode: 400, headers, body: JSON.stringify({ error: "Thème invalide" }) };
      if (!accountId || !themeId) return { statusCode: 400, headers, body: JSON.stringify({ error: "Paramètres invalides" }) };
      const target = caller.accounts.find(a => a.id === accountId);
      if (!target) return { statusCode: 404, headers, body: JSON.stringify({ error: "Compte introuvable" }) };
      target.unlockedThemes = Array.isArray(target.unlockedThemes) ? target.unlockedThemes.filter(t => t !== themeId) : [];
      if (normalizeThemeId(target.selectedTheme) === themeId) target.selectedTheme = "dark";
      await saveAccounts(caller.accounts);
      await audit(event, caller.account, "admin_revoke_theme", { accountId, themeId });
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }



    if (action === "admin_block_theme" || action === "admin_unblock_theme") {
      const caller = await getCallerAccount(event);
      if (!caller || !isAdmin(caller.account)) return { statusCode: 403, headers, body: JSON.stringify({ error: "Admin uniquement" }) };
      const accountId = sanitizeStr(body.accountId, 128);
      if (!isValidGenericId(accountId)) return { statusCode: 400, headers, body: JSON.stringify({ error: "Compte invalide" }) };
      const rawThemeId = sanitizeStr(body.themeId, 128);
      const themeId = normalizeThemeId(rawThemeId);
      if (themeId && !isValidThemeId(themeId)) return { statusCode: 400, headers, body: JSON.stringify({ error: "Thème invalide" }) };
      if (!accountId || !themeId) return { statusCode: 400, headers, body: JSON.stringify({ error: "Paramètres invalides" }) };
      const target = caller.accounts.find(a => a.id === accountId);
      if (!target) return { statusCode: 404, headers, body: JSON.stringify({ error: "Compte introuvable" }) };
      target.blockedThemes = Array.isArray(target.blockedThemes) ? target.blockedThemes.map(normalizeThemeId).filter(Boolean) : [];
      if (action === "admin_block_theme") {
        if (!target.blockedThemes.includes(themeId)) target.blockedThemes.push(themeId);
        if (normalizeThemeId(target.selectedTheme) === themeId) target.selectedTheme = "dark";
        await saveAccounts(caller.accounts);
        await audit(event, caller.account, "admin_block_theme", { accountId, themeId });
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true, blocked: true }) };
      }
      target.blockedThemes = target.blockedThemes.filter(t => normalizeThemeId(t) !== themeId);
      await saveAccounts(caller.accounts);
      await audit(event, caller.account, "admin_unblock_theme", { accountId, themeId });
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, blocked: false }) };
    }

    if (action === "admin_set_theme_visibility") {
      const caller = await getCallerAccount(event);
      if (!caller || !isAdmin(caller.account)) return { statusCode: 403, headers, body: JSON.stringify({ error: "Admin uniquement" }) };
      const themeIdRaw = sanitizeStr(body.themeId, 128);
      const themeId = normalizeThemeId(themeIdRaw);
      const visible = !!body.visible;
      if (!themeId) return { statusCode: 400, headers, body: JSON.stringify({ error: "Thème invalide" }) };
      const vis = await readStore("theme_visibility", {});
      const nextVis = {};
      if (vis && typeof vis === "object" && !Array.isArray(vis)) {
        for (const [key, val] of Object.entries(vis)) {
          const normalized = normalizeThemeId(key);
          if (!normalized) continue;
          nextVis[normalized] = !!val;
        }
      }
      nextVis[themeId] = visible;
      await writeStore("theme_visibility", nextVis);

      const currentEventThemes = await readStore("event_themes", []);
      let nextEventThemes = currentEventThemes;
      if (Array.isArray(currentEventThemes)) {
        const normalizedList = currentEventThemes
          .filter(t => t && typeof t === "object" && !Array.isArray(t))
          .map(t => ({ ...t, id: normalizeThemeId(t.id) }))
          .filter(t => !!t.id);
        const idx = normalizedList.findIndex(t => t && t.id === themeId);
        if (idx >= 0) {
          nextEventThemes = normalizedList.slice();
          nextEventThemes[idx] = { ...(normalizedList[idx] || {}), id: themeId, visible, event: true };
        } else {
          nextEventThemes = normalizedList.concat([{ id: themeId, visible, event: true }]);
        }
      } else if (currentEventThemes && typeof currentEventThemes === "object") {
        const normalizedObj = {};
        for (const [key, value] of Object.entries(currentEventThemes)) {
          const normalized = normalizeThemeId((value && value.id) || key);
          if (!normalized) continue;
          normalizedObj[normalized] = { ...((value && typeof value === "object" && !Array.isArray(value)) ? value : {}), id: normalized };
        }
        nextEventThemes = {
          ...normalizedObj,
          [themeId]: { ...((normalizedObj && normalizedObj[themeId]) || {}), id: themeId, visible, event: true }
        };
      } else {
        nextEventThemes = [{ id: themeId, visible, event: true }];
      }
      await writeStore("event_themes", nextEventThemes);

      await audit(event, caller.account, "admin_set_theme_visibility", { themeId, visible });
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, themeId, visible, themeVisibility: nextVis, eventThemes: nextEventThemes }) };
    }

    if (action === "admin_get_audit_log") {
      const caller = await getCallerAccount(event);
      if (!caller || !isAdmin(caller.account)) return { statusCode: 403, headers, body: JSON.stringify({ error: "Admin uniquement" }) };
      const logs = await readStore("np_audit_log", []);
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, logs: Array.isArray(logs) ? logs : [] }) };
    }

    if (action === "admin_health") {
      const caller = await getCallerAccount(event);
      if (!caller || !isAdmin(caller.account)) return { statusCode: 403, headers, body: JSON.stringify({ error: "Admin uniquement" }) };
      const accounts = await loadAccounts();
      const admins = accounts.filter(a => normalizeRole(a && a.role) === "admin");
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: true,
          at: Date.now(),
          env: _safeEnvStatus(),
          db: {
            configured: true,
            table: "np_store",
            reachable: true
          },
          auth: {
            session: true,
            accountId: caller.account.id || null,
            role: normalizeRole(caller.account.role),
            admins: admins.length
          }
        })
      };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: "Action inconnue" }) };
  } catch (err) {
    if (_isDbUnavailableError(err)) return _dbUnavailableResponse(headers);
    console.error("Auth error:", err);
    return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: "Erreur interne" }) };
  }
};

exports.verifyToken = verifyToken;
exports.getTokenFromCookie = getTokenFromCookie;
