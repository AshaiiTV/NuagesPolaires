"use strict";

// Keep the stored array format, but merge only fields changed by this request.
// The final compare-and-swap prevents a second writer from replacing our read.
const clone = value => JSON.parse(JSON.stringify(value));
const SECURITY_FIELDS = ["pass", "role", "pid", "sessionVersion", "forcePasswordReset", "resetExpiresAt"];
function isDeepStrictEqual(left, right) {
  if (left === right) return true;
  if (!left || !right || typeof left !== "object" || typeof right !== "object") return false;
  if (Array.isArray(left) !== Array.isArray(right)) return false;
  const keys = Object.keys(left);
  return keys.length === Object.keys(right).length && keys.every(key => Object.prototype.hasOwnProperty.call(right, key) && isDeepStrictEqual(left[key], right[key]));
}

function conflict(message = "Les données ont changé. Recharge la page puis réessaie.") {
  const error = new Error(message);
  error.statusCode = 409;
  return error;
}

async function mutateJsonStore(sql, key, fallback, mutate) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const rows = await sql`SELECT value FROM np_store WHERE key = ${key}`;
    const raw = rows.length ? rows[0].value : fallback;
    const change = mutate(clone(raw));
    const result = rows.length
      ? await sql`UPDATE np_store SET value = ${JSON.stringify(change.value)}::jsonb, updated_at = now() WHERE key = ${key} AND value = ${JSON.stringify(raw)}::jsonb RETURNING key`
      : await sql`INSERT INTO np_store (key, value, updated_at) VALUES (${key}, ${JSON.stringify(change.value)}::jsonb, now()) ON CONFLICT (key) DO NOTHING RETURNING key`;
    if (result.length) return change.result;
  }
  throw conflict();
}

function createRecordStore({ sql, key, normalize, protectAccounts = false }) {
  const snapshots = new WeakMap();
  const rawSnapshots = new WeakMap();
  const guards = new WeakMap();

  async function load(versions) {
    const rows = await sql`SELECT value, md5(value::text) AS version FROM np_store WHERE key = ${key}`;
    if (versions) versions[key] = rows.length ? rows[0].version : null;
    const records = normalize(rows.length ? rows[0].value : []);
    snapshots.set(records, clone(records));
    rawSnapshots.set(records, rows.length ? clone(rows[0].value) : null);
    return records;
  }

  async function save(records, source = records) {
    const original = snapshots.get(source);
    if (!original) throw new Error("Cannot write records without their original snapshot");
    const proposed = normalize(records);
    const beforeById = new Map(original.map(record => [record.id, record]));
    const afterById = new Map(proposed.map(record => [record.id, record]));
    const guardedIds = guards.get(source) || new Set();
    for (let attempt = 0; attempt < 5; attempt++) {
      const rows = await sql`SELECT value FROM np_store WHERE key = ${key}`;
      const raw = rows.length ? rows[0].value : [];
      const latest = normalize(raw);
      const latestById = new Map(latest.map(record => [record.id, record]));
      // An authorization or password checked before a concurrent reset, role
      // change or deletion must never authorize a later write or fresh session.
      if (protectAccounts) {
        for (const before of original) {
          if (!guardedIds.has(before.id) && isDeepStrictEqual(afterById.get(before.id), before)) continue;
          const current = latestById.get(before.id);
          if (!current || SECURITY_FIELDS.some(field => !isDeepStrictEqual(current[field], before[field]))) {
            throw conflict("Les accès ont changé. Reconnecte-toi puis réessaie.");
          }
        }
      }
      const merged = [];
      for (const current of latest) {
        const before = beforeById.get(current.id);
        const after = afterById.get(current.id);
        if (!before) { merged.push(current); continue; }
        if (!after) {
          if (!isDeepStrictEqual(current, before)) throw conflict();
          continue;
        }
        const next = { ...current };
        for (const field of new Set([...Object.keys(before), ...Object.keys(after)])) {
          if (isDeepStrictEqual(before[field], after[field])) continue;
          if (field === "lastSeen") {
            next[field] = Math.max(Number(current[field]) || 0, Number(after[field]) || 0);
            continue;
          }
          if (!isDeepStrictEqual(current[field], before[field]) && !isDeepStrictEqual(current[field], after[field])) throw conflict();
          if (Object.prototype.hasOwnProperty.call(after, field)) next[field] = after[field];
          else delete next[field];
        }
        merged.push(next);
      }
      for (const after of proposed) {
        if (beforeById.has(after.id)) {
          if (!latestById.has(after.id) && (guardedIds.has(after.id) || !isDeepStrictEqual(after, beforeById.get(after.id)))) throw conflict();
        } else {
          if (latestById.has(after.id)) throw conflict();
          merged.push(after);
        }
      }
      if (protectAccounts) {
        const pseudos = merged.map(record => String(record.pseudo || "").toLowerCase());
        if (new Set(pseudos).size !== pseudos.length) throw conflict("Ce pseudo est déjà pris.");
        if (original.some(record => record.role === "admin") && !merged.some(record => record.role === "admin")) {
          throw conflict("Impossible de supprimer le dernier compte Admin.");
        }
      }
      const result = rows.length
        ? await sql`UPDATE np_store SET value = ${JSON.stringify(merged)}::jsonb, updated_at = now() WHERE key = ${key} AND value = ${JSON.stringify(raw)}::jsonb RETURNING key`
        : await sql`INSERT INTO np_store (key, value, updated_at) VALUES (${key}, ${JSON.stringify(merged)}::jsonb, now()) ON CONFLICT (key) DO NOTHING RETURNING key`;
      if (!result.length) continue;
      // Preserve references to caller/target records while refreshing the base.
      const refs = new Map(records.map(record => [record.id, record]));
      const updated = merged.map(record => {
        const ref = refs.get(record.id) || {};
        for (const field of Object.keys(ref)) if (!(field in record)) delete ref[field];
        return Object.assign(ref, clone(record));
      });
      records.splice(0, records.length, ...updated);
      snapshots.set(records, clone(merged));
      rawSnapshots.set(records, clone(merged));
      guards.set(records, guardedIds);
      return records;
    }
    throw conflict();
  }

  return { load, save, snapshot(records) {
    if (!rawSnapshots.has(records)) throw new Error("Missing original store snapshot");
    return clone(rawSnapshots.get(records));
  }, guard(records, id) {
    const ids = guards.get(records) || new Set();
    ids.add(id);
    guards.set(records, ids);
  } };
}

module.exports = { createRecordStore, mutateJsonStore };
