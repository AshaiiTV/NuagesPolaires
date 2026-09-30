/* Shared progression rules: browser and Netlify functions use the same migration. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.NPProgression = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  var VERSION = 1;
  var DEFAULT_GROWTH = {
    "Duelliste": [6, 6, 2], "Sauvageon": [5, 8, 1], "Croisé": [8, 3, 2],
    "Rôdeur": [2, 5, 3], "Traqueur": [2, 7, 2], "Archer": [3, 5, 4],
    "Elementaliste": [4, 4, 4], "Evocateur": [2, 3, 6], "Conjurateur": [2, 2, 7],
    "Arcaniste": [1, 1, 8], "Bretteur": [5, 7, 3], "Claymore": [7, 4, 2],
    "Lame d'Honneur": [7, 5, 3],
    "Massier": [6, 6, 1],
    "Frondeur": [4, 7, 2],
    "Arbalétrier": [4, 7, 2],
    "Pugiliste": [6, 6, 1],
    "Moine": [5, 6, 2],
    "Hallebardier": [6, 6, 1],
    "Piquier": [6, 6, 1],
    "Javelinier": [5, 7, 1],
    "Voleur": [4, 7, 2],
    "Porte-Fléau": [6, 6, 1],
    "Pyromancien": [3, 3, 5],
    "Cryomancien": [3, 3, 5],
    "Aéromancien": [3, 3, 5],
    "Géomancien": [4, 2, 5],
    "Enchanteur": [3, 3, 5],
    "Prêtre": [4, 2, 5],
    "Druide": [3, 3, 5],
    "Barde": [3, 3, 5],
    "Illusionniste": [3, 2, 6],
    "Alchimiste": [3, 3, 5],
    "Porte-Enclume": [6, 6, 1],
    "Ébranleur": [6, 6, 1],
    "Ricocheteur": [4, 7, 2],
    "Sondeur": [4, 7, 2],
    "Guetteur": [4, 7, 2],
    "Pavoisier": [4, 7, 2],
    "Lutteur": [6, 6, 1],
    "Cestuaire": [6, 6, 1],
    "Ascète": [5, 6, 2],
    "Voltigeur": [5, 6, 2],
    "Faucheur": [6, 6, 1],
    "Rabatteur": [6, 6, 1],
    "Verrouilleur": [6, 6, 1],
    "Empaleur": [6, 6, 1],
    "Harponneur": [5, 7, 1],
    "Relieur": [5, 7, 1],
    "Faussaire": [4, 7, 2],
    "Escamoteur": [4, 7, 2],
    "Entraveur": [6, 6, 1],
    "Pendulier": [6, 6, 1],
    "Forgeron de Braise": [3, 3, 5],
    "Semeur de Cendres": [3, 3, 5],
    "Sculpteur de Givre": [3, 3, 5],
    "Patineur": [3, 3, 5],
    "Danseur des Vents": [3, 3, 5],
    "Siffleur": [3, 3, 5],
    "Fossoyeur": [4, 2, 5],
    "Fendeur": [4, 2, 5],
    "Tisserand": [3, 3, 5],
    "Orfèvre": [3, 3, 5],
    "Porte-Lanterne": [4, 2, 5],
    "Exorciste": [4, 2, 5],
    "Roncier": [3, 3, 5],
    "Greffeur": [3, 3, 5],
    "Carillonneur": [3, 3, 5],
    "Chef de Chœur": [3, 3, 5],
    "Verrier": [3, 2, 6],
    "Masquier": [3, 2, 6],
    "Distillateur": [3, 3, 5],
    "Essayeur": [3, 3, 5],
    "Ravageur": [5, 8, 1],
    "Déchaîné": [5, 8, 1],
    "Bastion": [8, 3, 2],
    "Porte-Étendard": [8, 3, 2],
    "Cartographe": [2, 7, 2],
    "Veneur": [2, 7, 2],
    "Totémiste": [2, 3, 6],
    "Chimériste": [2, 3, 6],
    "Astronome": [1, 1, 8],
    "Prismancien": [1, 1, 8]
  };
  function finite(value, fallback) {
    if (value === null || value === undefined || value === "") return fallback;
    var number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }
  function levelNumber(value) { return Math.max(1, Math.floor(finite(value, 1))); }
  function xpRequired(level) { return levelNumber(level) * 30; }
  function normalizeSermentName(name) {
    if (typeof name !== "string") return name;
    var key = name.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    return key === "flecheur" || key === "archer" ? "Archer" : name;
  }
  function normalizeSermentDefinitions(definitions) {
    if (!definitions || typeof definitions !== "object" || Array.isArray(definitions)) return {};
    var out = {};
    // Import old keys first. Explicit Archer fields take precedence while fields
    // present only on an older staff definition remain available.
    Object.keys(definitions).sort(function (a, b) {
      return (a === "Archer" ? 1 : 0) - (b === "Archer" ? 1 : 0);
    }).forEach(function (name) {
      var key = normalizeSermentName(name), definition = definitions[name];
      var isDefinition = definition && typeof definition === "object" && !Array.isArray(definition);
      if (isDefinition && definition.evolvesFrom !== undefined) {
        definition = Object.assign({}, definition, { evolvesFrom: normalizeSermentName(definition.evolvesFrom) });
      }
      var previous = Object.prototype.hasOwnProperty.call(out, key) ? out[key] : null;
      if (isDefinition && previous && typeof previous === "object" && !Array.isArray(previous)) {
        definition = Object.assign({}, previous, definition);
      }
      Object.defineProperty(out, key, { value: definition, enumerable: true, configurable: true, writable: true });
    });
    return out;
  }
  function effectiveDefinition(classe, customDefinitions) {
    classe = normalizeSermentName(classe);
    var growth = DEFAULT_GROWTH[classe] || [0, 0, 0];
    var definitions = normalizeSermentDefinitions(customDefinitions);
    var custom = Object.prototype.hasOwnProperty.call(definitions, classe) ? definitions[classe] : null;
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
    if (out.classe || out.class) out.classe = normalizeSermentName(out.classe || out.class);
    if (Object.prototype.hasOwnProperty.call(out, "class")) out.class = normalizeSermentName(out.class);
    if (out.sermentBranches && typeof out.sermentBranches === "object" && !Array.isArray(out.sermentBranches)) {
      out.sermentBranches = normalizeSermentDefinitions(out.sermentBranches);
    }
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
  return { VERSION: VERSION, xpRequired: xpRequired, normalizeSermentName: normalizeSermentName, normalizeSermentDefinitions: normalizeSermentDefinitions, effectiveDefinition: effectiveDefinition, normalizePlayer: normalizePlayer };
});
