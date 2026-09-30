#!/usr/bin/env node
"use strict";

// Offline behavior tests: no deployment, database credentials or real accounts.
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const { createRecordStore } = require("../netlify/functions/_shared/auth-store");
const clone = value => JSON.parse(JSON.stringify(value));
const hash = value => "sha256:" + crypto.createHash("sha256").update(value).digest("hex");
const SECRET = "offline-test-secret-only-at-least-32-characters";

function createMemorySql(seed = {}) {
  const data = new Map(Object.entries(clone(seed)));
  let beforeWrite = null;
  const version = value => crypto.createHash("md5").update(JSON.stringify(value)).digest("hex");
  const sql = async (strings, ...values) => {
    const query = strings.join("?").replace(/\s+/g, " ").trim();
    if (query.startsWith("CREATE TABLE")) return [];
    if (query.startsWith("SELECT value")) {
      const key = values[0];
      return data.has(key) ? [{ value: clone(data.get(key)), version: version(data.get(key)) }] : [];
    }
    if (query.startsWith("UPDATE np_store")) {
      const [encoded, key, expected] = values;
      if (beforeWrite) { const hook = beforeWrite; beforeWrite = null; hook(data); }
      if (!data.has(key) || !assertEqual(data.get(key), JSON.parse(expected))) return [];
      data.set(key, JSON.parse(encoded));
      return [{ key }];
    }
    if (query.startsWith("INSERT INTO np_store")) {
      const [key, encoded] = values;
      if (beforeWrite) { const hook = beforeWrite; beforeWrite = null; hook(data); }
      if (query.includes("DO NOTHING") && data.has(key)) return [];
      data.set(key, typeof encoded === "string" ? JSON.parse(encoded) : clone(encoded));
      return [{ key }];
    }
    throw new Error("Unhandled offline SQL: " + query);
  };
  return { sql, data, raceOnce: hook => { beforeWrite = hook; } };
}
function assertEqual(a, b) {
  try { assert.deepEqual(a, b); return true; } catch (_) { return false; }
}
function sign(payload) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify({ exp: Date.now() + 60000, ...payload })).toString("base64url");
  return header + "." + body + "." + crypto.createHmac("sha256", SECRET).update(header + "." + body).digest("base64url");
}
function createAuthHarness(seed, env = {}) {
  const memory = createMemorySql(seed);
  const filename = path.resolve(__dirname, "../netlify/functions/auth.js");
  const instance = new Module(filename, module);
  instance.filename = filename;
  instance.paths = Module._nodeModulePaths(path.dirname(filename));
  const normalRequire = instance.require.bind(instance);
  instance.require = name => name === "@neondatabase/serverless" ? { neon: () => memory.sql } : normalRequire(name);
  const previous = { ...process.env };
  process.env.NP_JWT_SECRET = SECRET;
  process.env.NETLIFY_DATABASE_URL = "postgresql://offline/no-real-database";
  process.env.NP_SITE_URL = "https://offline.example";
  delete process.env.NP_ADMIN_PSEUDO;
  delete process.env.NP_ADMIN_PASSWORD;
  delete process.env.NP_ADMIN_RECOVERY;
  delete process.env.ADMIN_PSEUDO;
  delete process.env.ADMIN_PASSWORD;
  Object.assign(process.env, env);
  instance._compile(fs.readFileSync(filename, "utf8"), filename);
  let request = 0;
  return {
    ...memory,
    auth: instance.exports,
    token: payload => "np_session=" + sign(payload),
    async post(action, body = {}, cookie = "") {
      const result = await instance.exports.handler({
        httpMethod: "POST",
        headers: { "content-type": "application/json", origin: "https://offline.example", cookie, "x-forwarded-for": "offline-" + (++request) },
        body: JSON.stringify({ action, ...body })
      });
      return { status: result.statusCode, data: JSON.parse(result.body), cookie: result.headers["Set-Cookie"] || "", headers: result.headers };
    },
    close() { process.env = previous; }
  };
}

async function main() {
  let checks = 0;
  async function test(label, run) { await run(); checks++; console.log("OK  " + label); }
  const seed = { accounts: [
    { id: "admin", pseudo: "Admin", role: "admin", pass: hash("admin-secret"), createdAt: 1 },
    { id: "user", pseudo: "Joueur", role: "joueur", pass: hash("user-secret"), createdAt: 1 }
  ], players: [] };
  const h = createAuthHarness(seed);
  try {
    let adminCookie = h.token({ sub: "admin" });
    let userCookie = h.token({ sub: "user" });
    await test("Historic normal sessions work with implicit sessionVersion zero", async () => {
      assert.equal((await h.post("verify", {}, userCookie)).status, 200);
    });
    await test("Normal session cannot use complete_forced_reset", async () => {
      const result = await h.post("complete_forced_reset", { newPassHash: hash("stolen-change") }, userCookie);
      assert.equal(result.status, 403);
      assert.equal(h.data.get("accounts").find(a => a.id === "user").pass, seed.accounts[1].pass);
    });
    await test("Password change requires the current password", async () => {
      assert.equal((await h.post("self_change_password", { currentPassHash: hash("wrong"), newPassHash: hash("next-secret") }, userCookie)).status, 403);
    });
    await test("Password change revokes old tokens and issues a valid replacement", async () => {
      const result = await h.post("self_change_password", { currentPassHash: hash("user-secret"), newPassHash: hash("next-secret") }, userCookie);
      assert.equal(result.status, 200);
      assert.equal((await h.post("verify", {}, userCookie)).status, 401);
      userCookie = result.cookie;
      assert.equal((await h.post("verify", {}, userCookie)).status, 200);
    });
    let temporaryPassword;
    let forcedCookie;
    await test("Admin reset generates an expiring random secret and revokes sessions", async () => {
      const result = await h.post("admin_reset_password", { accountId: "user" }, adminCookie);
      assert.equal(result.status, 200);
      temporaryPassword = result.data.temporaryPassword;
      assert.match(temporaryPassword, /^[A-Za-z0-9_-]{32}$/);
      assert(result.data.expiresAt > Date.now() && result.data.expiresAt <= Date.now() + 3600000);
      assert.equal((await h.post("verify", {}, userCookie)).status, 401);
      assert(!JSON.stringify([...h.data.values()]).includes(temporaryPassword), "temporary secret must never be stored or logged in plaintext");
      assert.equal((await h.post("login", { pseudo: "Joueur", passHash: hash("reset") })).status, 401);
      const login = await h.post("login", { pseudo: "Joueur", passHash: hash(temporaryPassword) });
      assert.equal(login.status, 200);
      assert.equal(login.data.forcePasswordReset, true);
      forcedCookie = login.cookie;
    });
    await test("Reset session can verify but cannot access account data or other actions", async () => {
      assert.equal((await h.post("verify", {}, forcedCookie)).status, 200);
      for (const action of ["session_bundle", "touch_last_seen", "self_set_theme", "admin_health", "self_change_password", "self_delete_account"]) {
        const result = await h.post(action, { newPassHash: hash("blocked"), currentPassHash: hash(temporaryPassword) }, forcedCookie);
        assert([401, 403].includes(result.status), action + " must be blocked");
      }
    });
    await test("Complete reset is single-use and grants a fresh full session", async () => {
      const result = await h.post("complete_forced_reset", { newPassHash: hash("final-secret") }, forcedCookie);
      assert.equal(result.status, 200);
      assert.equal(result.data.forcePasswordReset, false);
      assert.equal((await h.post("complete_forced_reset", { newPassHash: hash("replay") }, forcedCookie)).status, 401);
      assert.equal((await h.post("login", { pseudo: "Joueur", passHash: hash(temporaryPassword) })).status, 401);
      userCookie = result.cookie;
      const bundle = await h.post("session_bundle", {}, userCookie);
      assert.equal(bundle.status, 200);
      assert.match(bundle.data.versions.accounts, /^[a-f0-9]{32}$/);
      assert(!("pass" in bundle.data.data.accounts[0]));
      assert.equal(h.data.get("accounts").find(a => a.id === "user").resetExpiresAt, undefined);
    });
    await test("Logout revokes the JWT server-side", async () => {
      assert.equal((await h.post("logout", {}, userCookie)).status, 200);
      assert.equal((await h.post("verify", {}, userCookie)).status, 401);
      assert.equal((await h.post("logout", {}, userCookie)).status, 200);
    });
    await test("Admin password replacement revokes sessions", async () => {
      const login = await h.post("login", { pseudo: "Joueur", passHash: hash("final-secret") });
      assert.equal(login.status, 200);
      assert.equal((await h.post("admin_set_password", { accountId: "user", newPassHash: hash("admin-replaced") }, adminCookie)).status, 200);
      assert.equal((await h.post("verify", {}, login.cookie)).status, 401);
      assert.equal((await h.post("login", { pseudo: "Joueur", passHash: hash("admin-replaced") })).status, 200);
    });
    await test("Legacy or expired forced resets cannot authenticate", async () => {
      const accounts = h.data.get("accounts");
      const user = accounts.find(a => a.id === "user");
      user.forcePasswordReset = true;
      user.pass = hash("reset");
      assert.equal((await h.post("login", { pseudo: "Joueur", passHash: hash("reset") })).status, 401);
      assert.equal((await h.post("verify", {}, h.token({ sub: user.id, sessionVersion: user.sessionVersion }))).status, 401);
      user.resetExpiresAt = Date.now() - 1;
      assert.equal((await h.post("login", { pseudo: "Joueur", passHash: hash("reset") })).status, 401);
      assert.equal((await h.post("complete_forced_reset", { newPassHash: hash("bad") }, h.token({ sub: user.id, sessionVersion: user.sessionVersion, forcePasswordReset: true }))).status, 401);
    });
    await test("Concurrent registration preserves both distinct users", async () => {
      const results = await Promise.all(["Concurrent A", "Concurrent B"].map(pseudo => h.post("register", { pseudo, passHash: hash("password") })));
      assert.deepEqual(results.map(r => r.status), [201, 201]);
      assert(h.data.get("accounts").some(a => a.pseudo === "Concurrent A"));
      assert(h.data.get("accounts").some(a => a.pseudo === "Concurrent B"));
    });
    await test("Concurrent duplicate registration cannot create duplicate pseudos", async () => {
      const results = await Promise.all([1, 2].map(() => h.post("register", { pseudo: "Duplicate", passHash: hash("password") })));
      assert.deepEqual(results.map(r => r.status).sort(), [201, 409]);
      assert.equal(h.data.get("accounts").filter(a => a.pseudo === "Duplicate").length, 1);
    });
  } finally { h.close(); }

  await test("Bootstrap recovery revokes historic admin sessions", async () => {
    const b = createAuthHarness(seed, { NP_ADMIN_PSEUDO: "Admin", NP_ADMIN_PASSWORD: "recovery-password", NP_ADMIN_RECOVERY: "true" });
    try {
      const login = await b.post("login", { pseudo: "Admin", passHash: hash("recovery-password") });
      assert.equal(login.status, 200);
      assert.equal(login.data.forcePasswordReset, true);
      assert.equal((await b.post("verify", {}, b.token({ sub: "admin" }))).status, 401);
      assert.equal((await b.post("admin_health", {}, login.cookie)).status, 403);
    } finally { b.close(); }
  });

  const normalize = list => clone(list).map(a => ({ ...a, role: a.role || "joueur", sessionVersion: a.sessionVersion || 0 }));
  await test("Account merge preserves concurrent profile edits without overwriting secrets", async () => {
    const mem = createMemorySql(seed);
    const store = createRecordStore({ sql: mem.sql, key: "accounts", normalize, protectAccounts: true });
    const first = await store.load();
    const second = await store.load();
    first[1].selectedTheme = "violet";
    second[1].lastSeen = 50;
    await store.save(first);
    await store.save(second);
    assert.equal(mem.data.get("accounts")[1].selectedTheme, "violet");
    assert.equal(mem.data.get("accounts")[1].lastSeen, 50);
    assert.equal(mem.data.get("accounts")[1].pass, seed.accounts[1].pass);
  });
  await test("Account compare-and-swap retries retain edits arriving during the SQL write", async () => {
    const mem = createMemorySql(seed);
    const store = createRecordStore({ sql: mem.sql, key: "accounts", normalize, protectAccounts: true });
    const accounts = await store.load();
    accounts[1].lastSeen = 100;
    mem.raceOnce(data => { data.get("accounts")[1].selectedTheme = "green"; });
    await store.save(accounts);
    assert.equal(mem.data.get("accounts")[1].selectedTheme, "green");
    assert.equal(mem.data.get("accounts")[1].lastSeen, 100);
  });
  await test("Stale authentication cannot survive a concurrent password reset", async () => {
    const mem = createMemorySql(seed);
    const store = createRecordStore({ sql: mem.sql, key: "accounts", normalize, protectAccounts: true });
    const accounts = await store.load();
    accounts[1].lastSeen = 100;
    mem.raceOnce(data => { data.get("accounts")[1].sessionVersion = 1; data.get("accounts")[1].pass = "replaced"; });
    await assert.rejects(store.save(accounts), error => error.statusCode === 409);
    assert.equal(mem.data.get("accounts")[1].pass, "replaced");
  });
  await test("Concurrent edits to the same field are rejected instead of silently replaced", async () => {
    const mem = createMemorySql(seed);
    const store = createRecordStore({ sql: mem.sql, key: "accounts", normalize, protectAccounts: true });
    const first = await store.load();
    const second = await store.load();
    first[1].selectedTheme = "violet";
    second[1].selectedTheme = "green";
    await store.save(first);
    await assert.rejects(store.save(second), error => error.statusCode === 409);
    assert.equal(mem.data.get("accounts")[1].selectedTheme, "violet");
  });
  await test("A reset and a theme update on different accounts both survive", async () => {
    const mem = createMemorySql(seed);
    const store = createRecordStore({ sql: mem.sql, key: "accounts", normalize, protectAccounts: true });
    const reset = await store.load();
    const theme = await store.load();
    store.guard(reset, "admin");
    store.guard(theme, "admin");
    reset[1].pass = "new-password";
    reset[1].sessionVersion = 1;
    theme[0].selectedTheme = "violet";
    await store.save(reset);
    await store.save(theme);
    assert.equal(mem.data.get("accounts")[1].pass, "new-password");
    assert.equal(mem.data.get("accounts")[1].sessionVersion, 1);
    assert.equal(mem.data.get("accounts")[0].selectedTheme, "violet");
  });
  await test("An admin whose access changes during another account edit cannot persist it", async () => {
    const mem = createMemorySql(seed);
    const store = createRecordStore({ sql: mem.sql, key: "accounts", normalize, protectAccounts: true });
    const edit = await store.load();
    store.guard(edit, "admin");
    edit[1].selectedTheme = "violet";
    mem.data.get("accounts")[0].sessionVersion = 1;
    await assert.rejects(store.save(edit), error => error.statusCode === 409);
    assert.equal(mem.data.get("accounts")[1].selectedTheme, undefined);
  });
  await test("Concurrent deletion of an unrelated record is preserved", async () => {
    const mem = createMemorySql(seed);
    const store = createRecordStore({ sql: mem.sql, key: "accounts", normalize, protectAccounts: true });
    const edit = await store.load();
    const removal = await store.load();
    edit[0].selectedTheme = "violet";
    await store.save(removal.filter(a => a.id !== "user"), removal);
    await store.save(edit);
    assert.deepEqual(mem.data.get("accounts").map(a => a.id), ["admin"]);
    assert.equal(mem.data.get("accounts")[0].selectedTheme, "violet");
  });
  const { createLocalApp, hashPassword } = require("./helpers/local-app");
  const app = await createLocalApp();
  try {
    await test("Non-object JSON requests receive HTTP 400", async () => {
      for (const input of [null, [], "login", 42]) assert.equal((await app.call("auth", input)).status, 400);
    });
    await test("Self deletion removes account and linked character in one SQL statement", async () => {
      const before = (await app.read("players")).value;
      before.find(player => player.id === "p_bob").history = Array.from({ length: 250 }, (_, index) => "Historical entry " + index);
      await app.seed("players", before);
      const cookie = await app.cookie("alice");
      const result = await app.call("auth", { action: "self_delete_account", currentPassHash: hashPassword("Alice-audit-123!") }, cookie);
      assert.equal(result.status, 200);
      assert(!(await app.read("accounts")).value.some(account => account.id === "alice"));
      assert(!(await app.read("players")).value.some(player => player.id === "p_alice"));
      assert((await app.read("players")).value.some(player => player.id === "p_bob"));
      assert.deepEqual((await app.read("players")).value.find(player => player.id === "p_bob"), before.find(player => player.id === "p_bob"));
      assert.equal((await app.call("auth", { action: "verify" }, cookie)).status, 401);
    });
    await test("A concurrent reset cancels deletion without removing the character", async () => {
      await app.seed("accounts", app.accounts);
      await app.seed("players", app.players);
      const originalSql = app.auth.sql;
      const cookie = await app.cookie("alice");
      let injected = false;
      app.auth.sql = async (strings, ...values) => {
        if (strings.join("").includes("WITH locked") && !injected) {
          injected = true;
          const current = (await app.read("accounts")).value;
          current.find(account => account.id === "alice").sessionVersion++;
          await app.seed("accounts", current);
        }
        return originalSql(strings, ...values);
      };
      try {
        const result = await app.call("auth", { action: "self_delete_account", currentPassHash: hashPassword("Alice-audit-123!") }, cookie);
        assert(injected);
        assert.equal(result.status, 409);
        assert((await app.read("accounts")).value.some(account => account.id === "alice"));
        assert((await app.read("players")).value.some(player => player.id === "p_alice"));
      } finally { app.auth.sql = originalSql; }
    });
    await test("A concurrent character edit cancels both parts of account deletion", async () => {
      await app.seed("accounts", app.accounts);
      await app.seed("players", app.players);
      const originalSql = app.auth.sql;
      const cookie = await app.cookie("alice");
      let injected = false;
      app.auth.sql = async (strings, ...values) => {
        if (strings.join("").includes("WITH locked") && !injected) {
          injected = true;
          const current = (await app.read("players")).value;
          current.find(player => player.id === "p_alice").journal = "Concurrent journal";
          await app.seed("players", current);
        }
        return originalSql(strings, ...values);
      };
      try {
        const result = await app.call("auth", { action: "self_delete_account", currentPassHash: hashPassword("Alice-audit-123!") }, cookie);
        assert(injected);
        assert.equal(result.status, 409);
        assert((await app.read("accounts")).value.some(account => account.id === "alice"));
        assert.equal((await app.read("players")).value.find(player => player.id === "p_alice").journal, "Concurrent journal");
      } finally { app.auth.sql = originalSql; }
    });
    await test("Concurrent theme visibility edits retain both themes and existing metadata", async () => {
      const admin = await app.cookie("admin");
      await app.seed("theme_visibility", {});
      await app.seed("event_themes", [{ id: "violet", label: "Original label" }]);
      const results = await Promise.all(["violet", "green"].map(themeId => app.call("auth", { action: "admin_set_theme_visibility", themeId, visible: true }, admin)));
      assert.deepEqual(results.map(result => result.status), [200, 200]);
      assert.deepEqual((await app.read("theme_visibility")).value, { violet: true, green: true });
      const themes = (await app.read("event_themes")).value;
      assert.equal(themes.find(theme => theme.id === "violet").label, "Original label");
      assert(themes.find(theme => theme.id === "green").visible);
    });
    await test("Autogrant changes preserve event theme array structure and parallel edits", async () => {
      const admin = await app.cookie("admin");
      const results = await Promise.all([
        app.call("auth", { action: "admin_set_theme_autogrant", themeId: "violet", enabled: true }, admin),
        app.call("auth", { action: "admin_set_theme_visibility", themeId: "green", visible: false }, admin)
      ]);
      assert.deepEqual(results.map(result => result.status), [200, 200]);
      const themes = (await app.read("event_themes")).value;
      assert(Array.isArray(themes));
      assert.equal(themes.find(theme => theme.id === "violet").label, "Original label");
      assert.equal(themes.find(theme => theme.id === "violet").autoGrantAll, true);
      assert.equal(themes.find(theme => theme.id === "green").visible, false);
    });
    assert.equal(app.errors.length, 0, app.errors.join("\n"));
  } finally { await app.close(); }
  console.log(`\n${checks} offline authentication/security checks passed.`);
}

module.exports = { createAuthHarness, createMemorySql, hash, sign, SECRET };
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
