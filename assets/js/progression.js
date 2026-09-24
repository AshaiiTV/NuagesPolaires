/* Shared progression rules: browser and Netlify functions use the same migration. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.NPProgression = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  var VERSION = 1;
  var DEFAULT_GROWTH = {
    "Duelliste": [6, 6, 2], "Sauvageon": [5, 8, 1], "Croisé": [8, 3, 2],
    "Rôdeur": [2, 5, 3], "Traqueur": [2, 7, 2], "Flécheur": [3, 5, 4],
    "Elementaliste": [4, 4, 4], "Evocateur": [2, 3, 6], "Conjurateur": [2, 2, 7],
    "Arcaniste": [1, 1, 8], "Bretteur": [5, 7, 3], "Claymore": [7, 4, 2],
    "Lame d'Honneur": [7, 5, 3]
  };
  function finite(value, fallback) {
    if (value === null || value === undefined || value === "") return fallback;
    var number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }
  function levelNumber(value) { return Math.max(1, Math.floor(finite(value, 1))); }
  function xpRequired(level) { return levelNumber(level) * 30; }
  function effectiveDefinition(classe, customDefinitions) {
    var growth = DEFAULT_GROWTH[classe] || [0, 0, 0];
    var custom = customDefinitions && Object.prototype.hasOwnProperty.call(customDefinitions, classe) ? customDefinitions[classe] : null;
    return Object.assign({ pvN: growth[0], epN: growth[1], emN: growth[2] }, custom && typeof custom === "object" ? custom : {});
  }
  function legacyTrack(level, xp, threshold, scale) {
    level = levelNumber(level);
    xp = Math.max(0, Math.floor(finite(xp, 0)));
    threshold = Math.max(1, Math.floor(finite(threshold, level * scale)));
    if (xp >= threshold) {
      xp -= threshold;
      level++;
      // Skip a whole arithmetic series instead of looping once per level on imports.
      var skipped = Math.max(0, Math.floor((Math.sqrt(Math.pow(2 * level - 1, 2) + 8 * xp / scale) - (2 * level - 1)) / 2));
      xp -= scale * skipped * (2 * level + skipped - 1) / 2;
      level += skipped;
      threshold = level * scale;
      // Correct floating-point rounding at an exact boundary.
      if (xp < 0) { level--; xp += level * scale; threshold = level * scale; }
      if (xp >= threshold) { xp -= threshold; level++; threshold = level * scale; }
    }
    return { level: level, fraction: xp / threshold };
  }
  function normalizePlayer(player, definition) {
    var out = Object.assign({}, player && typeof player === "object" && !Array.isArray(player) ? player : {});
    var oldLevel = levelNumber(out.level);
    var alreadyUnified = finite(out.progressionVersion, 0) >= VERSION;
    var chosen = { level: oldLevel, fraction: 0 };
    if (!alreadyUnified) {
      var character = legacyTrack(oldLevel, out.xp, out.xpMax, 30);
      var oath = legacyTrack(out.sLevel, out.sXp, out.sXpMax, 10);
      chosen = oath.level > character.level || (oath.level === character.level && oath.fraction > character.fraction) ? oath : character;
      out.level = chosen.level;
      out.xpMax = xpRequired(out.level);
      out.xp = Math.min(out.xpMax - 1, Math.max(0, Math.ceil(chosen.fraction * out.xpMax - 1e-10)));
    } else {
      out.level = oldLevel;
      out.xpMax = xpRequired(out.level);
      out.xp = Math.max(0, Math.floor(finite(out.xp, 0)));
    }
    var delta = out.level - oldLevel;
    if (delta > 0) {
      var growth = Object.assign(effectiveDefinition(out.classe || out.class || ""), definition || {});
      [["pv", 30, "pvN"], ["ep", 50, "epN"], ["em", 20, "emN"]].forEach(function (resource) {
        var stat = resource[0], gain = Math.max(0, finite(growth[resource[2]], 0));
        var oldMaximum = Math.max(stat === "pv" ? 1 : 0, finite(out[stat + "Max"], finite(out[stat + "Cur"], resource[1] + gain * (oldLevel - 1))));
        var current = Math.max(0, finite(out[stat + "Cur"], oldMaximum));
        var nextMaximum = oldMaximum + delta * gain;
        out[stat + "Max"] = nextMaximum;
        // Preserve spent resources, and never revive a knocked-out character.
        out[stat + "Cur"] = stat === "pv" && current === 0 ? 0 : Math.max(0, nextMaximum - (oldMaximum - current));
      });
    }
    out.progressionVersion = Math.max(VERSION, Math.floor(finite(out.progressionVersion, VERSION)));
    delete out.sLevel;
    delete out.sXp;
    delete out.sXpMax;
    return out;
  }
  return { VERSION: VERSION, xpRequired: xpRequired, effectiveDefinition: effectiveDefinition, normalizePlayer: normalizePlayer };
});
