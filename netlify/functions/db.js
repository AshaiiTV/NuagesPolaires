
const { neon } = require("@neondatabase/serverless");
const crypto = require("crypto");

let _npSqlClient = null;
function _getDatabaseUrl() {
  return process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL_UNPOOLED || "";
}
function _isDbConfigured() {
  return !!_getDatabaseUrl();
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
    "Referrer-Policy": "same-origin"
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

const COOKIE_NAME = "np_session";
// Only these stores may be read without a session. New/internal keys stay private.
const PUBLIC_KEYS = new Set([
  "beasts", "serments_custom", "events", "lieux", "event_themes",
  "theme_visibility", "theme_catalog", "serment_catalog", "page_content"
]);
const CRITICAL_COLLECTION_KEYS = new Set(["accounts", "players", ...PUBLIC_KEYS, "spawn_lab_staff", "np_syslog", "np_syslog_archive"]);
const AUDIT_KEY = "np_audit_log";
const MAX_REQUEST_BODY = 1024 * 1024;
const MAX_VALUE_SIZE = 4 * 1024 * 1024;
const MAX_ARRAY_ITEMS = 5000;
const MAX_OBJECT_KEYS = 5000;
const MAX_STRING_LENGTH = 25000;
const MAX_IMAGE_DATA_URL_LENGTH = 350000;
const MAX_DEPTH = 24;

const EXACT_WRITE_RULES = {
  admin: new Set([
    "players", "beasts", "serments_custom", "events", "np_syslog", "np_syslog_archive",
    "lieux", "event_themes", "theme_visibility", "theme_catalog",
    "serment_catalog", "page_content", "spawn_lab_staff"
  ]),
  mj: new Set(["players", "events", "beasts", "np_syslog", "spawn_lab_staff"]),
  designer: new Set(["beasts", "serments_custom", "events", "event_themes", "theme_catalog", "serment_catalog", "page_content", "spawn_lab_staff"])
};
const PREFIX_WRITE_RULES = {
  admin: ["combat_arc_"],
  mj: ["combat_arc_"],
  designer: []
};
const BLOCKED_CLIENT_KEYS = new Set(["np_audit_log", "np_rate_auth", "themes_admin_store"]);

function isPlainObject(value) {
  return !!value && Object.prototype.toString.call(value) === "[object Object]";
}
function normalizeRole(role) {
  const r = String(role || "joueur").toLowerCase();
  return ["joueur", "mj", "designer", "admin"].includes(r) ? r : "joueur";
}
function normalizeKey(key) {
  return typeof key === "string" ? key.trim() : "";
}
function isValidKey(key) {
  const k = normalizeKey(key);
  if (!k || k.length > 180) return false;
  if (BLOCKED_CLIENT_KEYS.has(k)) return false;
  if (k.startsWith("combat_arc_") || k.startsWith("combat_arc_idx_") || k.startsWith("combat_arc_rec_")) return true;
  return ["accounts", "players", "beasts", "events", "np_syslog_archive", "serments_custom", "np_syslog", "lieux", "event_themes", "theme_visibility", "theme_catalog", "serment_catalog", "page_content", "spawn_lab_staff"].includes(k);
}
function isPublicKey(key) {
  return PUBLIC_KEYS.has(normalizeKey(key));
}
function listAllowedCombatArchiveOwners(caller) {
  const out = [];
  function push(v) {
    const owner = normalizeKey(v);
    if (!owner || out.includes(owner)) return;
    out.push(owner);
  }
  if (!caller) return out;
  push(caller.sub);
  push(caller.pseudo);
  push(caller.name);
  return out;
}
function combatArchiveOwner(key) {
  const k = normalizeKey(key);
  let owner = "";
  if (k.startsWith("combat_arc_rec_")) {
    owner = k.slice("combat_arc_rec_".length).split("__")[0];
  } else if (k.startsWith("combat_arc_idx_")) {
    owner = k.slice("combat_arc_idx_".length);
  } else if (k.startsWith("combat_arc_")) {
    owner = k.slice("combat_arc_".length);
  } else {
    return "";
  }
  return owner;
}
function isOwnCombatArchiveKey(caller, key) {
  const owner = combatArchiveOwner(key);
  return !!owner && listAllowedCombatArchiveOwners(caller).includes(owner);
}
function canRead(caller, key) {
  const role = String((caller && caller.role) || "").toLowerCase();
  if (key === "accounts") return !!caller && (role === "admin" || !!caller.sub);
  if (key === "players") return !!caller && (role === "admin" || role === "mj" || !!caller.pid);
  if (key === "np_audit_log") return role === "admin";
  if (key === "spawn_lab_staff") return role === "admin" || role === "mj" || role === "designer";
  if (key === "np_syslog_archive") return role === "admin";
  if (key === "np_syslog") return role === "admin" || role === "mj";
  if (String(key || "").startsWith("combat_arc_") || String(key || "").startsWith("combat_arc_idx_") || String(key || "").startsWith("combat_arc_rec_")) return role === "admin" || role === "mj" || isOwnCombatArchiveKey(caller, key);
  return isPublicKey(key);
}
function canWrite(caller, key) {
  const role = normalizeRole(caller && caller.role);
  const k = normalizeKey(key);
  if (!caller || k === "accounts" || !isValidKey(k)) return false;
  if ((k.startsWith("combat_arc_") || k.startsWith("combat_arc_idx_") || k.startsWith("combat_arc_rec_")) && role === "joueur") return isOwnCombatArchiveKey(caller, k);
  const exact = EXACT_WRITE_RULES[role];
  const prefixes = PREFIX_WRITE_RULES[role] || [];
  if (exact && exact.has(k)) return true;
  return prefixes.some(prefix => k.startsWith(prefix));
}
async function getLinkedPlayerName(caller) {
  const pid = normalizeKey(caller && caller.pid);
  if (!pid) return "";
  try {
    const players = await readStore("players", []);
    const match = Array.isArray(players) ? players.find(p => normalizeKey(p && p.id) === pid) : null;
    return normalizeKey(match && match.name);
  } catch {
    return "";
  }
}
async function canReadResolved(caller, key) {
  if (canRead(caller, key)) return true;
  const role = normalizeRole(caller && caller.role);
  const k = normalizeKey(key);
  if (!caller || role !== "joueur" || !k.startsWith("combat_arc_")) return false;
  const owner = combatArchiveOwner(k);
  if (!owner) return false;
  const linkedPlayerName = await getLinkedPlayerName(caller);
  return !!linkedPlayerName && owner === linkedPlayerName;
}
async function canWriteResolved(caller, key) {
  if (canWrite(caller, key)) return true;
  const role = normalizeRole(caller && caller.role);
  const k = normalizeKey(key);
  if (!caller || role !== "joueur" || !k.startsWith("combat_arc_")) return false;
  const owner = combatArchiveOwner(k);
  if (!owner) return false;
  const linkedPlayerName = await getLinkedPlayerName(caller);
  return !!linkedPlayerName && owner === linkedPlayerName;
}
function validateSize(value) {
  if (value === null || value === undefined) return false;
  try {
    return JSON.stringify(value).length <= MAX_VALUE_SIZE;
  } catch {
    return false;
  }
}
function stripControlChars(str) {
  return str.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
}
function isSafeDataImageUrl(str) {
  return /^data:image\/(?:png|jpe?g|webp|gif);base64,[a-z0-9+/=]+$/i.test(String(str || "").trim());
}
function sanitizeText(str) {
  let out = stripControlChars(String(str));
  const trimmed = out.trim();
  if (isSafeDataImageUrl(trimmed)) {
    if (trimmed.length > MAX_IMAGE_DATA_URL_LENGTH) throw new Error("Image trop volumineuse.");
    return trimmed;
  }
  out = out.replace(/<\s*script\b[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, "");
  out = out.replace(/\bjavascript\s*:/gi, "");
  if (out.length > MAX_STRING_LENGTH) out = out.slice(0, MAX_STRING_LENGTH);
  return out;
}
function sanitizeDeep(value, depth = 0) {
  if (depth > MAX_DEPTH) throw new Error("Structure trop profonde");
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return sanitizeText(value);
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "boolean") return value;
  if (Array.isArray(value)) {
    if (value.length > MAX_ARRAY_ITEMS) throw new Error("Tableau trop volumineux");
    return value.map(v => sanitizeDeep(v, depth + 1));
  }
  if (isPlainObject(value)) {
    const keys = Object.keys(value);
    if (keys.length > MAX_OBJECT_KEYS) throw new Error("Objet trop volumineux");
    const out = {};
    for (const key of keys) {
      if (key === "__proto__" || key === "prototype" || key === "constructor") continue;
      out[key] = sanitizeDeep(value[key], depth + 1);
    }
    return out;
  }
  return null;
}
function enforceShape(key, value) {
  if (key === "accounts" || key === "players" || key === "beasts" || key === "np_syslog_archive") {
    if (!Array.isArray(value)) throw new Error("La valeur doit être une liste.");
    return value;
  }
  if (key === "theme_visibility" || key === "page_content" || key === "spawn_lab_staff") {
    if (!isPlainObject(value)) throw new Error("La valeur doit être un objet.");
    return value;
  }
  if (key === "theme_catalog" || key === "serment_catalog" || key === "event_themes" || key === "serments_custom" || key === "events" || key === "lieux" || key === "np_syslog") {
    if (!Array.isArray(value) && !isPlainObject(value)) throw new Error("La valeur doit être un objet ou une liste.");
    return value;
  }
  if (key.startsWith("combat_arc_rec_")) {
    if (!isPlainObject(value)) throw new Error("Une archive de combat doit être un objet.");
    return value;
  }
  if (key.startsWith("combat_arc_")) {
    if (!Array.isArray(value)) throw new Error("Les archives de combat doivent être une liste.");
    return value;
  }
  return value;
}
function normalizeStoreValue(key, value) {
  if (key === "accounts") {
    const seen = new Set();
    return (Array.isArray(value) ? value : []).map((entry, idx) => {
      const out = entry && typeof entry === "object" && !Array.isArray(entry) ? { ...entry } : {};
      out.id = String(out.id || ("a_" + idx));
      out.pseudo = sanitizeText(out.pseudo || out.name || ("Joueur " + (idx + 1))).slice(0, 32);
      out.role = normalizeRole(out.role);
      out.pid = out.pid ? sanitizeText(out.pid).slice(0, 128) : null;
      out.createdAt = Number.isFinite(Number(out.createdAt)) ? Number(out.createdAt) : Date.now();
      out.lastSeen = Number.isFinite(Number(out.lastSeen)) ? Number(out.lastSeen) : out.createdAt;
      return out;
    }).filter(item => { if (seen.has(item.id)) return false; seen.add(item.id); return true; });
  }
  if (key === "players") {
    const seen = new Set();
    return (Array.isArray(value) ? value : []).map((entry, idx) => {
      const out = entry && typeof entry === "object" && !Array.isArray(entry) ? { ...entry } : {};
      out.id = String(out.id || ("p_" + idx));
      out.name = sanitizeText(out.name || ("Joueur " + (idx + 1))).slice(0, 80);
      out.classe = sanitizeText(out.classe || out.class || "").slice(0, 80);
      out.level = Math.max(1, Math.floor(Number.isFinite(Number(out.level)) ? Number(out.level) : 1));
      out.inventory = Array.isArray(out.inventory) ? out.inventory.slice(0, 500) : [];
      out.history = Array.isArray(out.history) ? out.history.slice(-200) : [];
      out.statuts = Array.isArray(out.statuts) ? out.statuts.slice(0, 64) : [];
      out.equipment = out.equipment && typeof out.equipment === "object" && !Array.isArray(out.equipment) ? { helmet: out.equipment.helmet || null, chest: out.equipment.chest || null, legs: out.equipment.legs || null } : { helmet: null, chest: null, legs: null };
      return out;
    }).filter(item => { if (seen.has(item.id)) return false; seen.add(item.id); return true; });
  }
  if (key === "beasts") {
    const seen = new Set();
    return (Array.isArray(value) ? value : []).map((entry, idx) => {
      const out = entry && typeof entry === "object" && !Array.isArray(entry) ? { ...entry } : {};
      out.id = String(out.id || ("b_" + idx));
      out.name = sanitizeText(out.name || ("Créature " + (idx + 1))).slice(0, 80);
      out.level = Math.max(1, Math.floor(Number.isFinite(Number(out.level)) ? Number(out.level) : 1));
      out.statuts = Array.isArray(out.statuts) ? out.statuts.slice(0, 64) : [];
      return out;
    }).filter(item => { if (seen.has(item.id)) return false; seen.add(item.id); return true; });
  }
  if (key === "rpg_characters") {
    const seen = new Set();
    return (Array.isArray(value) ? value : []).map((entry, idx) => normalizeRpgCharacter(entry, idx))
      .filter(item => {
        if (!item || seen.has(item.ownerId)) return false;
        seen.add(item.ownerId);
        return true;
      });
  }
  if (key === "spawn_lab_staff") {
    const out = value && typeof value === "object" && !Array.isArray(value) ? { ...value } : {};
    out.schemaVersion = 2;
    out.lastDbSyncAt = Number.isFinite(Number(out.lastDbSyncAt)) ? Number(out.lastDbSyncAt) : Date.now();
    return out;
  }
  if (key === "theme_visibility") {
    const raw = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const map = {};
    Object.keys(raw).forEach(themeId => { map[String(themeId).trim().toLowerCase().replace(/^theme-/, "")] = !!raw[themeId]; });
    return map;
  }
  if (key === "np_syslog") return (Array.isArray(value) ? value : []).slice(0, 500);
  if (key === "np_syslog_archive") return (Array.isArray(value) ? value : []).slice(0, 50);
  if (String(key || "").startsWith("combat_arc_rec_")) return isPlainObject(value) ? value : {};
  if (String(key || "").startsWith("combat_arc_idx_")) return (Array.isArray(value) ? value : []).slice(0, 5000);
  if (String(key || "").startsWith("combat_arc_")) return (Array.isArray(value) ? value : []).slice(0, 500);
  return value;
}
function normalizeRpgCharacter(entry, idx = 0) {
  const raw = entry && typeof entry === "object" && !Array.isArray(entry) ? entry : {};
  const out = {};
  out.id = sanitizeText(raw.id || ("rpg_" + idx)).slice(0, 128);
  out.ownerId = sanitizeText(raw.ownerId || "").slice(0, 128);
  out.ownerPid = sanitizeText(raw.ownerPid || "").slice(0, 128);
  out.ownerPseudo = sanitizeText(raw.ownerPseudo || "").slice(0, 64);
  out.schemaVersion = Math.max(1, Math.floor(Number(raw.schemaVersion) || 1));
  out.created = !!raw.created;
  out.name = sanitizeText(raw.name || "Voyageur").slice(0, 32);
  out.oath = sanitizeText(raw.oath || "Duelliste").slice(0, 80);
  out.level = Math.max(1, Math.min(100, Math.floor(Number(raw.level) || 1)));
  out.xp = Math.max(0, Math.floor(Number(raw.xp) || 0));
  out.gold = Math.max(0, Math.min(999999, Math.floor(Number(raw.gold) || 0)));
  out.loc = sanitizeText(raw.loc || "camp").slice(0, 80);
  out.spawn = sanitizeText(raw.spawn || out.loc || "camp").slice(0, 80);
  out.hp = Math.max(0, Math.floor(Number(raw.hp) || 0));
  out.maxHp = Math.max(1, Math.floor(Number(raw.maxHp) || 1));
  out.energy = Math.max(0, Math.floor(Number(raw.energy) || 0));
  out.maxEnergy = Math.max(1, Math.floor(Number(raw.maxEnergy) || 1));
  out.mana = Math.max(0, Math.floor(Number(raw.mana) || 0));
  out.maxMana = Math.max(1, Math.floor(Number(raw.maxMana) || 1));
  out.reputation = Math.max(0, Math.floor(Number(raw.reputation) || 0));
  out.inv = raw.inv && typeof raw.inv === "object" && !Array.isArray(raw.inv) ? raw.inv : {};
  out.equip = raw.equip && typeof raw.equip === "object" && !Array.isArray(raw.equip) ? raw.equip : { weapon: null, armor: null, trinket: null };
  out.combat = raw.combat && typeof raw.combat === "object" && !Array.isArray(raw.combat) ? raw.combat : null;
  out.visited = raw.visited && typeof raw.visited === "object" && !Array.isArray(raw.visited) ? raw.visited : {};
  out.flags = raw.flags && typeof raw.flags === "object" && !Array.isArray(raw.flags) ? raw.flags : {};
  out.log = Array.isArray(raw.log) ? raw.log.slice(0, 12).map(line => sanitizeText(line).slice(0, 240)) : [];
  out.updatedAt = Number.isFinite(Number(raw.updatedAt)) ? Number(raw.updatedAt) : Date.now();
  return out;
}
function sanitizeForKey(key, value) {
  if (key.startsWith("combat_arc_") && !key.startsWith("combat_arc_rec_") && Array.isArray(value)) {
    value = value.slice(0, key.startsWith("combat_arc_idx_") ? 5000 : 500);
  }
  if (key === "players" && Array.isArray(value)) {
    value.forEach(player => {
      if (player && Object.prototype.hasOwnProperty.call(player, "avatar")) validateAvatar(player.avatar);
    });
  }
  const cleaned = sanitizeDeep(value, 0);
  const shaped = enforceShape(key, cleaned);
  const normalized = normalizeStoreValue(key, shaped);
  if (!validateSize(normalized)) throw new Error("Valeur trop volumineuse.");
  return normalized;
}
function isStaff(caller) {
  return !!caller && ["admin", "mj", "designer"].includes(caller.role);
}
function stripInternalNotes(value) {
  if (Array.isArray(value)) return value.map(stripInternalNotes);
  if (!isPlainObject(value)) return value;
  const out = {};
  for (const [key, child] of Object.entries(value)) {
    if (/^(?:adminNotes?|noteAdmin|staffNotes?|mjNotes?)$/i.test(key)) continue;
    if (["__proto__", "prototype", "constructor"].includes(key)) continue;
    out[key] = stripInternalNotes(child);
  }
  return out;
}
function validateAvatar(value) {
  if (typeof value !== "string") throw new Error("L'avatar doit être une URL d'image.");
  const url = value.trim();
  if (!url) return "";
  if (url.length > MAX_IMAGE_DATA_URL_LENGTH || /[<>"'`\\\x00-\x20\x7f]/.test(url)) {
    throw new Error("URL d'avatar invalide.");
  }
  if (isSafeDataImageUrl(url)) return url;
  if (/^https?:\/\//i.test(url)) {
    try {
      const parsed = new URL(url);
      if (parsed.hostname && !parsed.username && !parsed.password) return url;
    } catch {}
  } else if (!/^[a-z][a-z0-9+.-]*:/i.test(url) && !url.startsWith("//") && !url.includes("&")) {
    return url;
  }
  throw new Error("URL d'avatar invalide : image HTTPS, HTTP, locale ou raster intégrée attendue.");
}
const MJ_PLAYER_FIELDS = new Set([
  "xp", "xpMax", "level", "sXp", "sXpMax", "sLevel",
  "pvCur", "pvMax", "epCur", "epMax", "emCur", "emMax",
  "inventory", "history", "equipment", "statuts"
]);
function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!isPlainObject(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, stableValue(value[key])]));
}
function playerPermissionValue(player, field) {
  const value = player[field];
  if (["avatar", "journal", "arme"].includes(field)) return value || "";
  if (field === "branch") return value || "Aucune";
  if (["unlockedThemes", "blockedThemes"].includes(field)) return value || [];
  return value;
}
function validatePlayerWrite(caller, previous, next) {
  if (caller.role !== "mj") return;
  const incoming = new Map(next.map(player => [player.id, player]));
  for (const oldPlayer of previous) {
    const newPlayer = incoming.get(oldPlayer.id);
    if (!newPlayer) throw new Error("La suppression d'un personnage est réservée à l'admin.");
    for (const field of new Set([...Object.keys(oldPlayer), ...Object.keys(newPlayer)])) {
      if (MJ_PLAYER_FIELDS.has(field)) continue;
      if (oldPlayer.id === caller.pid && ["avatar", "journal"].includes(field)) continue;
      if (JSON.stringify(stableValue(playerPermissionValue(oldPlayer, field))) !== JSON.stringify(stableValue(playerPermissionValue(newPlayer, field)))) {
        throw new Error("Modification réservée à l'admin : " + field + ".");
      }
    }
  }
  // New characters remain available to MJ. Progression and combat currently share
  // the fields above; their server-side business actions are a separate migration.
}
function hasExpectedVersion(body) {
  return Object.prototype.hasOwnProperty.call(body, "expectedVersion") &&
    (body.expectedVersion === null || (typeof body.expectedVersion === "string" && /^[a-f0-9]{32}$/.test(body.expectedVersion)));
}
function versionRequiredResponse(headers) {
  return { statusCode: 428, headers, body: JSON.stringify({ ok: false, code: "VERSION_REQUIRED", error: "Recharge les données avant de les modifier (version attendue requise)." }) };
}
function conflictResponse(headers, key) {
  return { statusCode: 409, headers, body: JSON.stringify({ ok: false, code: "VERSION_CONFLICT", key, error: "Ces données ont été modifiées par une autre session. Recharge-les avant de réessayer." }) };
}
function summarizeValue(value) {
  if (Array.isArray(value)) {
    return {
      kind: "array",
      length: value.length,
      sampleIds: value.slice(0, 5).map(item => {
        if (!item || typeof item !== "object") return null;
        return item.id || item.key || item.name || item.title || null;
      }).filter(Boolean)
    };
  }
  if (isPlainObject(value)) {
    const keys = Object.keys(value);
    return {
      kind: "object",
      keys: keys.slice(0, 20),
      keyCount: keys.length
    };
  }
  return { kind: typeof value };
}
function getRequestMeta(event) {
  const headers = event && event.headers ? event.headers : {};
  return {
    ip: String(headers["x-forwarded-for"] || headers["client-ip"] || "unknown").split(",")[0].trim(),
    origin: String(headers.origin || headers.Origin || ""),
    ua: String(headers["user-agent"] || headers["User-Agent"] || "").slice(0, 240)
  };
}
function b64url(buf) {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function verifyToken(token) {
  if (!SECRET || SECRET.length < 32) return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [header, body, sig] = parts;
    if (!header || !body || !sig) return null;
    const expected = b64url(crypto.createHmac("sha256", SECRET).update(header + "." + body).digest());
    const sigBuf = Buffer.from(sig, "utf8");
    const expectedBuf = Buffer.from(expected, "utf8");
    if (sigBuf.length !== expectedBuf.length) return null;
    if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;
    const payload = JSON.parse(Buffer.from(body, "base64").toString());
    if (!Number.isFinite(payload.exp) || Date.now() >= payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}
function getTokenFromCookie(event) {
  const cookieHeader = (event.headers && (event.headers.cookie || event.headers.Cookie)) || "";
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  return match ? match[1] : null;
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
  return rows.length ? normalizeStoreValue(key, rows[0].value) : fallback;
}
async function readVersionedStore(key, fallback) {
  const rows = await sql`SELECT value, md5(value::text) AS version FROM np_store WHERE key = ${key}`;
  return { value: rows.length ? normalizeStoreValue(key, rows[0].value) : fallback, rawValue: rows.length ? rows[0].value : fallback, version: rows.length ? rows[0].version : null };
}
async function compareAndSetStore(key, value, expectedVersion) {
  // The predicate lives in the write statement: a read/check/write sequence alone
  // would still allow two clients to overwrite each other's changes.
  if (expectedVersion === null) {
    return sql`
      INSERT INTO np_store (key, value, updated_at)
      VALUES (${key}, ${JSON.stringify(value)}::jsonb, now())
      ON CONFLICT (key) DO NOTHING
      RETURNING updated_at, md5(value::text) AS version
    `;
  }
  return sql`
    UPDATE np_store SET value = ${JSON.stringify(value)}::jsonb, updated_at = now()
    WHERE key = ${key} AND md5(value::text) = ${expectedVersion}
    RETURNING updated_at, md5(value::text) AS version
  `;
}
async function appendAuditLog(entry) {
  await sql`
    INSERT INTO np_store (key, value, updated_at)
    VALUES (${AUDIT_KEY}, jsonb_build_array(${JSON.stringify(entry)}::jsonb), now())
    ON CONFLICT (key) DO UPDATE SET value = (
      SELECT COALESCE(jsonb_agg(item.entry ORDER BY item.position), '[]'::jsonb)
      FROM (
        SELECT entry, position
        FROM jsonb_array_elements(EXCLUDED.value ||
          CASE WHEN jsonb_typeof(np_store.value) = 'array' THEN np_store.value ELSE '[]'::jsonb END
        ) WITH ORDINALITY AS entries(entry, position)
        ORDER BY position LIMIT 1000
      ) AS item
    ), updated_at = now()
  `;
}
async function auditDb(event, caller, action, details = {}) {
  const req = getRequestMeta(event);
  await appendAuditLog({
    ts: Date.now(),
    source: "db",
    action,
    actorId: caller && caller.sub ? caller.sub : null,
    actorPseudo: caller && caller.pseudo ? caller.pseudo : null,
    actorRole: caller && caller.role ? normalizeRole(caller.role) : null,
    ip: req.ip,
    origin: req.origin,
    ua: req.ua,
    details
  });
}
async function resolveCaller(event) {
  const token = getTokenFromCookie(event);
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload || !payload.sub) return null;

  const accounts = await readStore("accounts", []);
  if (!Array.isArray(accounts)) return null;
  const account = accounts.find(a => a && a.id === payload.sub);
  if (!account) return null;
  const accountVersion = Number.isSafeInteger(account.sessionVersion) ? account.sessionVersion : 0;
  const tokenVersion = Number.isSafeInteger(payload.sessionVersion) ? payload.sessionVersion : 0;
  if (accountVersion !== tokenVersion || account.forcePasswordReset || payload.forcePasswordReset) return null;

  return {
    sub: account.id,
    pid: account.pid || null,
    role: normalizeRole(account.role),
    pseudo: account.pseudo || payload.name || "Joueur",
    name: payload.name || account.pseudo || "Joueur"
  };
}
function stripAccountSensitive(account) {
  if (!account || typeof account !== "object") return account;
  const copy = { ...account };
  delete copy.pass;
  delete copy.sessionVersion;
  delete copy.resetExpiresAt;
  return copy;
}
function filterValueForCaller(caller, key, value) {
  if (value === null || value === undefined) return value;
  if (isPublicKey(key) && !isStaff(caller)) {
    const publicValue = key === "beasts"
      ? (Array.isArray(value) ? value : []).filter(beast => beast && !beast.hidden && !beast.archived)
      : value;
    return stripInternalNotes(publicValue);
  }
  if (key === "accounts") {
    if (!caller) return undefined;
    const accounts = Array.isArray(value) ? value : [];
    const own = accounts.filter(a => a && a.id === caller.sub).map(stripAccountSensitive);
    const role = String(caller.role || "").toLowerCase();
    if (role === "admin") return accounts.map(stripAccountSensitive);
    return own;
  }
  if (key === "players") {
    if (!caller) return undefined;
    const players = Array.isArray(value) ? value : [];
    const role = String(caller.role || "").toLowerCase();
    if (role === "admin" || role === "mj") return players;
    if (caller.pid) return players.filter(p => p && p.id === caller.pid);
    return [];
  }
  return value;
}

function countKilledCreaturesFromArchive(arc) {
  if (!arc || typeof arc !== "object") return 0;
  if (arc._draft || arc._inProgress || arc.active) return 0;
  if (String(arc.phase || "idle") !== "idle") return 0;
  const fighters = Array.isArray(arc.fighters) ? arc.fighters : [];
  return fighters.filter(f => f && f.type === "beast" && (Number(f.pvCur) || 0) <= 0).length;
}
function countKilledCreaturesFromArchives(archives) {
  return (Array.isArray(archives) ? archives : []).reduce((total, arc) => total + countKilledCreaturesFromArchive(arc), 0);
}

exports.handler = async (event) => {
  const headers = getCorsHeaders(event);
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };
  if (!SECRET || SECRET.length < 32) return { statusCode: 503, headers, body: JSON.stringify({ ok: false, error: "Service non configuré" }) };
  if (!_isDbConfigured()) return _dbUnavailableResponse(headers);
  if (!isTrustedOrigin(event)) return { statusCode: 403, headers, body: JSON.stringify({ error: "Origine non autorisée" }) };

  try {
    await ensureTable();
    if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: JSON.stringify({ error: "Méthode non autorisée" }) };
    const contentType = String((event.headers && (event.headers["content-type"] || event.headers["Content-Type"])) || "");
    if (!contentType.includes("application/json")) return { statusCode: 415, headers, body: JSON.stringify({ error: "Content-Type invalide" }) };
    if (event.body && event.body.length > MAX_REQUEST_BODY) return { statusCode: 413, headers, body: JSON.stringify({ error: "Requête trop volumineuse" }) };

    let body;
    try { body = event.body ? JSON.parse(event.body) : {}; }
    catch { return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: "JSON invalide" }) }; }
    if (!isPlainObject(body)) return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: "Objet JSON attendu" }) };
    const action = typeof body.action === "string" ? body.action.trim() : "";
    const key = normalizeKey(body.key);
    const caller = await resolveCaller(event);

    if (action === "ping") {
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, source: "db", now: Date.now() }) };
    }

    if (action === "rpg_get_character") {
      if (!caller) return { statusCode: 401, headers, body: JSON.stringify({ ok: false, error: "Authentification requise" }) };
      const chars = await readStore("rpg_characters", []);
      const own = (Array.isArray(chars) ? chars : []).find(ch => ch && ch.ownerId === caller.sub) || null;
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, character: own }) };
    }

    if (action === "rpg_save_character") {
      if (!caller) return { statusCode: 401, headers, body: JSON.stringify({ ok: false, error: "Authentification requise" }) };
      const input = body.character && typeof body.character === "object" && !Array.isArray(body.character) ? body.character : {};
      const normalized = normalizeRpgCharacter(sanitizeDeep(input, 0), 0);
      normalized.id = normalized.id || ("rpg_" + caller.sub);
      normalized.ownerId = caller.sub;
      normalized.ownerPid = caller.pid || "";
      normalized.ownerPseudo = caller.pseudo || caller.name || "Joueur";
      normalized.updatedAt = Date.now();
      const chars = await readStore("rpg_characters", []);
      const list = Array.isArray(chars) ? chars : [];
      const idx = list.findIndex(ch => ch && ch.ownerId === caller.sub);
      if (idx >= 0) list[idx] = normalized;
      else list.push(normalized);
      await writeStore("rpg_characters", list);
      try { await auditDb(event, caller, "rpg_save_character", { character: normalized.name, level: normalized.level, loc: normalized.loc }); } catch (_) {}
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, character: normalized }) };
    }

    if (action === "get") {
      if (!key) return { statusCode: 400, headers, body: JSON.stringify({ error: "key requis" }) };
      if (!(await canReadResolved(caller, key))) return { statusCode: 401, headers, body: JSON.stringify({ error: "Authentification requise" }) };
      const snapshot = await readVersionedStore(key, null);
      const filtered = filterValueForCaller(caller, key, snapshot.value);
      return { statusCode: 200, headers, body: JSON.stringify({ value: filtered === undefined ? null : filtered, key, version: snapshot.version }) };
    }

    if (action === "get_public_bundle") {
      const rows = await sql`SELECT key, value, md5(value::text) AS version FROM np_store`;
      const result = {};
      const versions = {};
      const rowMap = {};
      const warnings = [];
      rows.forEach(r => {
        try {
          rowMap[r.key] = r.value;
          if (!isPublicKey(r.key)) return;
          result[r.key] = filterValueForCaller(caller, r.key, r.value);
          versions[r.key] = r.version;
        } catch (err) {
          warnings.push({ key: String((r && r.key) || "unknown"), error: String((err && err.message) || err) });
        }
      });

      const accounts = Array.isArray(rowMap.accounts) ? rowMap.accounts : [];
      const players = Array.isArray(rowMap.players) ? rowMap.players : [];
      let linkedPlayers = 0;
      let activeWeek = 0;
      let gemmesStock = 0;
      let gemmesFusionnees = 0;
      let creatureKills = 0;
      try {
        linkedPlayers = accounts.filter(a => a && a.pid).length;
        activeWeek = accounts.filter(a => a && a.lastSeen && a.lastSeen > (Date.now() - 7 * 24 * 60 * 60 * 1000)).length;
        gemmesStock = players.reduce((acc, p) => {
          const inv = Array.isArray(p && p.inventory) ? p.inventory : [];
          return acc + inv
            .filter(i => i && i.category === "Gemme")
            .reduce((s, i) => s + (Number(i.qty) || 1), 0);
        }, 0);
        gemmesFusionnees = players.reduce((acc, p) => {
          const hist = Array.isArray(p && p.history) ? p.history : [];
          return acc + hist.filter(h => h && h.type === "gemme").length;
        }, 0);
      } catch (err) {
        warnings.push({ key: "public_stats", error: String((err && err.message) || err) });
      }
      try {
        const permanentOwners = new Set();
        rows.forEach(row => {
          const rowKey = String((row && row.key) || "");
          if (rowKey.startsWith("combat_arc_idx_")) permanentOwners.add(rowKey.slice("combat_arc_idx_".length));
          else if (rowKey.startsWith("combat_arc_rec_")) permanentOwners.add(rowKey.slice("combat_arc_rec_".length).split("__")[0]);
        });
        creatureKills = rows.reduce((acc, row) => {
          try {
            const rowKey = String((row && row.key) || "");
            if (rowKey.startsWith("combat_arc_rec_")) return acc + countKilledCreaturesFromArchive(row.value);
            if (rowKey.startsWith("combat_arc_idx_")) return acc;
            if (rowKey.startsWith("combat_arc_")) {
              const owner = rowKey.slice("combat_arc_".length);
              if (permanentOwners.has(owner)) return acc;
              return acc + countKilledCreaturesFromArchives(row.value);
            }
          } catch (err) {
            warnings.push({ key: String((row && row.key) || "combat_archive"), error: String((err && err.message) || err) });
          }
          return acc;
        }, 0);
      } catch (err) {
        warnings.push({ key: "combat_archives", error: String((err && err.message) || err) });
      }

      result.public_stats = {
        players: players.length,
        linkedPlayers: Math.max(linkedPlayers, players.length, 0),
        activeWeek: Math.max(activeWeek, 0),
        totalGemmes: Math.max(gemmesStock, gemmesFusionnees, 0),
        creatureKills: Math.max(creatureKills, 0)
      };

      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, data: result, versions, source: "db", warnings }) };
    }

    if (action === "get_audit_log") {
      const role = String((caller && caller.role) || "").toLowerCase();
      if (role !== "admin") return { statusCode: 403, headers, body: JSON.stringify({ error: "Admin uniquement" }) };
      const logs = await readStore(AUDIT_KEY, []);
      return { statusCode: 200, headers, body: JSON.stringify({ logs: Array.isArray(logs) ? logs : [] }) };
    }

    if (action === "get_all") {
      const role = String((caller && caller.role) || "").toLowerCase();
      if (!caller || !["admin", "mj", "designer"].includes(role)) {
        return { statusCode: 403, headers, body: JSON.stringify({ error: "Action non autorisée" }) };
      }
      const rows = await sql`SELECT key, value, md5(value::text) AS version FROM np_store`;
      const result = {};
      const versions = {};
      rows.forEach(r => {
        if (!canRead(caller, r.key)) return;
        const filtered = filterValueForCaller(caller, r.key, r.value);
        if (filtered !== undefined) {
          result[r.key] = filtered;
          versions[r.key] = r.version;
        }
      });
      return { statusCode: 200, headers, body: JSON.stringify({ data: result, versions, source: "db" }) };
    }

    if (!caller) return { statusCode: 401, headers, body: JSON.stringify({ error: "Non authentifié" }) };

    if (action === "set") {
      if (!key || !Object.prototype.hasOwnProperty.call(body, "value")) return { statusCode: 400, headers, body: JSON.stringify({ error: "key et value requis" }) };
      if (!(await canWriteResolved(caller, key))) {
        await auditDb(event, caller, "db_set_denied", { key });
        return { statusCode: 403, headers, body: JSON.stringify({ error: "Permission refusée" }) };
      }
      let sanitized;
      try {
        sanitized = sanitizeForKey(key, body.value);
      } catch (e) {
        await auditDb(event, caller, "db_set_rejected", { key, reason: e.message || "validation_error" });
        return { statusCode: 400, headers, body: JSON.stringify({ error: e.message || "Valeur invalide" }) };
      }

      if (!hasExpectedVersion(body)) return versionRequiredResponse(headers);
      if (key === "players" && caller.role === "mj") {
        const snapshot = await readVersionedStore(key, []);
        if (snapshot.version !== body.expectedVersion) return conflictResponse(headers, key);
        try { validatePlayerWrite(caller, snapshot.value, sanitized); }
        catch (err) {
          await auditDb(event, caller, "db_set_denied", { key, reason: err.message });
          return { statusCode: 403, headers, body: JSON.stringify({ ok: false, error: err.message }) };
        }
      }
      const savedRows = await compareAndSetStore(key, sanitized, body.expectedVersion);
      if (!savedRows.length) return conflictResponse(headers, key);
      await auditDb(event, caller, "db_set", { key, summary: summarizeValue(sanitized) });
      const filtered = filterValueForCaller(caller, key, sanitized);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: true,
          key,
          value: filtered === undefined ? null : filtered,
          version: savedRows[0].version,
          updatedAt: savedRows[0] && savedRows[0].updated_at ? savedRows[0].updated_at : null
        })
      };
    }

    if (action === "patch_own_player") {
      if (!caller.pid) return { statusCode: 403, headers, body: JSON.stringify({ error: "Aucun personnage lié." }) };
      if (!isPlainObject(body.patch) || !Object.keys(body.patch).length || Object.keys(body.patch).some(field => !["journal", "avatar"].includes(field))) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Seuls le journal et l'avatar peuvent être modifiés." }) };
      }
      if (!hasExpectedVersion(body)) return versionRequiredResponse(headers);
      const patch = {};
      try {
        if (Object.prototype.hasOwnProperty.call(body.patch, "journal")) {
          if (typeof body.patch.journal !== "string" || body.patch.journal.length > MAX_STRING_LENGTH) throw new Error("Journal invalide ou trop long.");
          patch.journal = sanitizeText(body.patch.journal);
        }
        if (Object.prototype.hasOwnProperty.call(body.patch, "avatar")) patch.avatar = validateAvatar(body.patch.avatar);
      } catch (err) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: err.message }) };
      }
      const snapshot = await readVersionedStore("players", []);
      if (snapshot.version !== body.expectedVersion) return conflictResponse(headers, "players");
      const players = Array.isArray(snapshot.rawValue) ? snapshot.rawValue : [];
      const playerIndex = players.findIndex(player => player && player.id === caller.pid);
      if (playerIndex < 0) return { statusCode: 404, headers, body: JSON.stringify({ error: "Personnage introuvable." }) };
      players[playerIndex] = { ...players[playerIndex], ...patch };
      if (!validateSize(players)) return { statusCode: 400, headers, body: JSON.stringify({ error: "Valeur trop volumineuse." }) };
      const savedRows = await compareAndSetStore("players", players, body.expectedVersion);
      if (!savedRows.length) return conflictResponse(headers, "players");
      await auditDb(event, caller, "db_patch_own_player", { pid: caller.pid, fields: Object.keys(patch) });
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, key: "players", value: [players[playerIndex]], version: savedRows[0].version, updatedAt: savedRows[0].updated_at }) };
    }

    if (action === "delete") {
      if (!key) return { statusCode: 400, headers, body: JSON.stringify({ error: "key requis" }) };
      if (CRITICAL_COLLECTION_KEYS.has(key) || !(await canWriteResolved(caller, key))) {
        await auditDb(event, caller, "db_delete_denied", { key });
        return { statusCode: 403, headers, body: JSON.stringify({ error: "Permission refusée" }) };
      }
      if (!hasExpectedVersion(body)) return versionRequiredResponse(headers);
      const deletedRows = await sql`
        DELETE FROM np_store WHERE key = ${key} AND md5(value::text) = ${body.expectedVersion}
        RETURNING key
      `;
      if (!deletedRows.length) return conflictResponse(headers, key);
      await auditDb(event, caller, "db_delete", { key });
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, key, value: null, version: null }) };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: "action inconnue" }) };
  } catch (err) {
    if (_isDbUnavailableError(err)) return _dbUnavailableResponse(headers);
    console.error("DB error:", err);
    return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: "Erreur interne" }) };
  }
};
