#!/usr/bin/env node
"use strict";

const crypto = require("crypto");

const baseUrl = String(process.env.NP_TEST_BASE_URL || process.env.URL || "").replace(/\/+$/, "");
const adminPseudo = process.env.NP_TEST_ADMIN_PSEUDO || "";
const adminPassword = process.env.NP_TEST_ADMIN_PASSWORD || "";

function fail(message) {
  console.error("FAIL", message);
  process.exitCode = 1;
}

function pass(message) {
  console.log("OK  ", message);
}

function sha256Password(password) {
  return "sha256:" + crypto.createHash("sha256").update(password).digest("hex");
}

async function post(path, body, cookie) {
  const res = await fetch(baseUrl + path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: baseUrl,
      Referer: baseUrl + "/",
      ...(cookie ? { Cookie: cookie } : {})
    },
    body: JSON.stringify(body || {})
  });
  const text = await res.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch (_) { data = { parseError: text.slice(0, 300) }; }
  return {
    ok: res.ok && data.ok !== false,
    status: res.status,
    data,
    cookie: res.headers.get("set-cookie") || ""
  };
}

async function expect(label, fn) {
  try {
    await fn();
    pass(label);
  } catch (err) {
    fail(label + " — " + (err && err.message ? err.message : String(err)));
  }
}

async function main() {
  if (!baseUrl) {
    console.error("Usage: NP_TEST_BASE_URL=https://your-site.netlify.app node scripts/test-auth-flows.js");
    process.exit(2);
  }

  const pseudo = "test_" + Date.now().toString(36);
  const password = "Tmp!" + crypto.randomBytes(6).toString("hex");
  let userCookie = "";
  let adminCookie = "";

  await expect("DB ping", async () => {
    const r = await post("/.netlify/functions/db", { action: "ping" });
    if (!r.ok) throw new Error("HTTP " + r.status + " " + JSON.stringify(r.data));
  });

  await expect("Register fresh account", async () => {
    const r = await post("/.netlify/functions/auth", { action: "register", pseudo, passHash: sha256Password(password) });
    if (!r.ok || r.status !== 201) throw new Error("HTTP " + r.status + " " + JSON.stringify(r.data));
    userCookie = r.cookie;
  });

  await expect("Reject duplicate registration", async () => {
    const r = await post("/.netlify/functions/auth", { action: "register", pseudo, passHash: sha256Password(password) });
    if (r.status !== 409) throw new Error("expected HTTP 409, got " + r.status + " " + JSON.stringify(r.data));
  });

  await expect("Reject wrong password", async () => {
    const r = await post("/.netlify/functions/auth", { action: "login", pseudo, passHash: sha256Password("wrong-password") });
    if (r.status !== 401) throw new Error("expected HTTP 401, got " + r.status + " " + JSON.stringify(r.data));
  });

  await expect("Login fresh account", async () => {
    const r = await post("/.netlify/functions/auth", { action: "login", pseudo, passHash: sha256Password(password) });
    if (!r.ok) throw new Error("HTTP " + r.status + " " + JSON.stringify(r.data));
    userCookie = r.cookie || userCookie;
  });

  await expect("Verify user session", async () => {
    const r = await post("/.netlify/functions/auth", { action: "verify" }, userCookie);
    if (!r.ok) throw new Error("HTTP " + r.status + " " + JSON.stringify(r.data));
  });

  if (adminPseudo && adminPassword) {
    await expect("Login admin", async () => {
      const r = await post("/.netlify/functions/auth", { action: "login", pseudo: adminPseudo, passHash: sha256Password(adminPassword) });
      if (!r.ok) throw new Error("HTTP " + r.status + " " + JSON.stringify(r.data));
      adminCookie = r.cookie;
    });

    await expect("Admin health", async () => {
      const r = await post("/.netlify/functions/auth", { action: "admin_health" }, adminCookie);
      if (!r.ok) throw new Error("HTTP " + r.status + " " + JSON.stringify(r.data));
    });
  } else {
    console.log("SKIP Admin checks: set NP_TEST_ADMIN_PSEUDO and NP_TEST_ADMIN_PASSWORD to enable them.");
  }
}

main().catch(err => {
  fail(err && err.stack ? err.stack : String(err));
});
