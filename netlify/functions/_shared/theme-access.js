"use strict";

const STAFF_ROLES = new Set(["admin", "mj", "designer"]);
const BASE_IDS = new Set(["dark", "light"]);

function normalizedList(value, normalizeId) {
  return Array.isArray(value) ? value.filter(id => typeof id === "string" && id.trim()).map(normalizeId) : [];
}

function isEarlyCloudsPlayer(player) {
  return !!player && ["earlyClouds", "isEarlyClouds", "early_clouds", "foundingClouds"].some(key => player[key] === true);
}

function isAutoGrantWindowOpen(theme, now = Date.now()) {
  if (!theme || theme.autoGrantAll !== true || theme.acquisitionInvalid === true) return false;
  // Missing boundaries mean no limit. An invalid configured date never opens
  // a distribution window by accident.
  const boundary = value => value === undefined ? 0
    : (typeof value === "number" || (typeof value === "string" && value.trim())) ? Number(value) : NaN;
  const from = boundary(theme.availableFrom);
  const until = boundary(theme.availableUntil);
  return Number.isFinite(from) && from >= 0 && Number.isFinite(until) && until >= 0
    && (!from || from <= now) && (!until || until > now);
}

function themeAccess({ account, player, theme, normalizeId, now = Date.now() }) {
  if (!theme || !theme.id) return { allowed: false, unknown: true, grant: false };
  const id = normalizeId(theme.id);
  if (BASE_IDS.has(id) || STAFF_ROLES.has(String(account && account.role || "").toLowerCase())) {
    return { allowed: true, grant: false };
  }
  if (!account) return { allowed: false, grant: false };
  if (normalizedList(account.blockedThemes, normalizeId).includes(id)
      || normalizedList(player && player.blockedThemes, normalizeId).includes(id)) {
    return { allowed: false, grant: false };
  }
  const earlyOnly = ["earlyCloudsOnly", "onlyEarlyClouds", "early_clouds_only"].some(key => theme[key] === true);
  if (earlyOnly && !isEarlyCloudsPlayer(player)) return { allowed: false, grant: false };
  if (normalizedList(account.unlockedThemes, normalizeId).includes(id)
      || normalizedList(player && player.unlockedThemes, normalizeId).includes(id)) {
    return { allowed: true, grant: false };
  }
  // Visibility controls the collection listing, not a configured distribution.
  // Persist the reward only after an authorized selection, never on a read.
  const grant = isAutoGrantWindowOpen(theme, now);
  return { allowed: grant, grant };
}

module.exports = { themeAccess, isAutoGrantWindowOpen };
