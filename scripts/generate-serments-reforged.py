#!/usr/bin/env python3
"""Merge authored serment copy with the combat contract; emit the browser adapter.

The published text and the engine use the same mechanics JSON. This generator
does not alter the archived v299 catalogue, the original thirteen serments,
character records, or their growth tables.
"""
import argparse
import copy
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'docs/serments-reforged-source.json'
MECHANICS = ROOT / 'docs/serments-reforged-mechanics.json'
LEGACY = ROOT / 'docs/serments-70-source.json'
OUTPUT = ROOT / 'assets/js/serments-reforged-data.js'


def clean_rule(text):
    """Use player vocabulary without widening the scope of implemented effects."""
    return str(text or '').replace('corrosion reforgée', 'corrosion alchimique').replace('protection reforgée', 'protection de serment').replace('empoisonnement natif', 'empoisonnement')


def build(allow_draft=False):
    source = json.loads(SOURCE.read_text())
    mechanics = json.loads(MECHANICS.read_text())
    legacy = json.loads(LEGACY.read_text())['rules']['entries']
    old_by_name = {e['name']: e for e in legacy}
    rules_by_name = {e['name']: e for e in mechanics['entries']}
    assert len(source['entries']) == len(rules_by_name) == 24
    assert len({e['name'] for e in source['entries']}) == 24
    entries = []
    for authored in source['entries']:
        entry = copy.deepcopy(authored)
        name = entry['name']
        contract = rules_by_name[name]
        old = old_by_name[name]
        assert entry['growthResolved'] == old['growthResolved'], name
        assert entry['parent'] == contract['parent'], name
        assert entry['kind'] == contract['kind'], name
        assert len(entry['branches']) == len(contract['branches']) == 2
        entry['identity'] = entry['playstyle']
        entry['number'] = old['number']
        entry['growth'] = old['growth']
        entry['branches'] = []
        for authored_branch, spec, old_branch in zip(authored['branches'], contract['branches'], old['branches']):
            assert authored_branch['key'] == spec['key'] == old_branch['key']
            branch = copy.deepcopy(spec)
            for key in ('summary', 'visual', 'example', 'roleplay', 'tierNames', 'tierNarratives', 'gameplay'):
                branch[key] = authored_branch[key]
            assert len(branch['tierNames']) == len(branch['tierNarratives']) == 4, name
            assert len(set(branch['tierNames'])) == 4, f'{name}: repeated tier title'
            branch['rule'] = clean_rule(branch.get('rule'))
            branch['legacyNames'] = [old_branch['name']]
            branch['distinction'] = branch['summary']
            branch['scenario'] = branch['example']
            branch['cycle'] = clean_rule(branch.get('cycle') or branch['rule'])
            branch['limits'] = clean_rule(branch.get('limits') or branch.get('limit'))
            if not branch.get('tiers'):
                if not allow_draft:
                    raise ValueError(f'{name} {branch["key"]}: the combat contract must provide four final tier descriptions')
                branch['tiers'] = [{'level': level, 'effect': branch['rule']} for level in branch['levels']]
            assert [t['level'] for t in branch['tiers']] == ([10, 13, 16, 20] if entry['parent'] else [2, 5, 7, 10]), name
            assert len(branch['tiers']) == 4
            if not allow_draft:
                assert branch.get('operations'), f'{name}: missing operation contract'
                assert branch.get('cost'), f'{name}: missing activation cost'
                assert len({t['effect'] for t in branch['tiers']}) == 4, f'{name}: repeated progression'
            for index, tier in enumerate(branch['tiers']):
                tier['title'] = branch['tierNames'][index]
                tier['narrative'] = branch['tierNarratives'][index]
                # A palier remains selected between thresholds; damage must use
                # N rather than freezing the preview at the threshold's level.
                tier['effect'] = clean_rule(tier.get('effectFormula') or tier['effect'])
                for operation in tier.get('operations', []):
                    operation['rule'] = clean_rule(operation.get('ruleFormula') or operation.get('rule'))
            for operation in branch.get('operations', []):
                operation['rule'] = clean_rule(operation.get('ruleFormula') or operation.get('rule'))
            if not allow_draft:
                assert len({t['effect'] for t in branch['tiers']}) == 4, f'{name}: repeated progression after formula normalization'
            entry['branches'].append(branch)
        entries.append(entry)
    source['entries'] = entries
    source['mechanicsStatus'] = mechanics.get('status', 'ready')
    source['commonRules'] = (
        '# Lire les serments\n\n'
        'Chaque serment offre deux branches exclusives. Les bases développent leurs capacités aux niveaux 2, 5, 7 et 10 ; '
        'les évolutions aux niveaux 10, 13, 16 et 20. Seul le palier atteint s\'applique : les quatre descriptions ne se cumulent pas.\n\n'
        'N désigne le niveau du personnage. Les coûts et les effets de chaque opération figurent dans le combat. '
        'Une préparation ne donne jamais une attaque ni une action gratuite ; les réactions du Guetteur ont été payées à l\'avance. '
        'Un tir, une frappe ou un contact suit les défenses indiquées par sa capacité.\n\n'
        'Les charges, protections, corrosions, prises et dispositifs de cette sélection sont suivis par le moteur. '
        'Les mises, les délais, les ruptures et les choix adverses décrits sur les fiches font partie de leur fonctionnement. '
        'Une réserve partagée n\'est pas dupliquée par le nombre de bénéficiaires ; une extraction retire l\'effet de sa première cible.\n\n'
        'La mise en scène de l\'arme ne crée pas de pouvoir supplémentaire : une lentille ne révèle pas les intentions cachées, '
        'une piste ne permet pas de voir à travers un obstacle, et une idole n\'agit jamais seule. '
        'Les évolutions sont accessibles à partir du niveau 10 depuis le parent indiqué, après attribution par le staff.\n'
    )
    SOURCE.write_text(json.dumps(source, ensure_ascii=False, indent=2) + '\n')
    encoded = json.dumps(source, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
    adapter = r'''
  var previous = root.NPSermentsExpansion;
  if (typeof module !== "undefined" && module.exports) previous = require("./serments-expansion-data.js");
  if (!previous || !previous.definitions) throw new Error("Le catalogue des serments doit précéder la refonte.");
  // Never mutate the archived CommonJS export or its nested definitions.
  var data = JSON.parse(JSON.stringify(previous));
  data.legacyVersion = data.version;
  data.legacySource = data.source;
  data.legacyEntries = data.entries;
  data.legacyDefinitions = JSON.parse(JSON.stringify(data.definitions));
  data.version = authored.version;
  data.source = "docs/serments-reforged-source.json";
  data.mechanicsSource = authored.mechanicsSource;
  data.entries = authored.entries;
  data.activeNames = authored.entries.map(function(entry) { return entry.name; });
  data.retiredNames = Object.keys(data.definitions).filter(function(name) { return data.activeNames.indexOf(name) === -1; });
  data.commonRules = authored.commonRules;
  data.reforged = true;
  function costText(cost) {
    if (!cost) return "";
    var parts = [cost.actions + (cost.actions > 1 ? " actions" : " action")];
    if (cost.ep) parts.push(cost.ep + " EP");
    if (cost.em) parts.push(cost.em + " EM");
    if (cost.pv) parts.push(cost.pv + " PV");
    return parts.join(" / ");
  }
  data.retiredNames.forEach(function(name) {
    data.definitions[name].hidden = true;
    data.definitions[name].retired = true;
    data.definitions[name].reforged = false;
  });
  authored.entries.forEach(function(entry) {
    var former = data.definitions[entry.name];
    var aliases = {};
    var branches = entry.branches.map(function(branch) {
      (branch.legacyNames || []).forEach(function(name) { aliases[name] = branch.name; });
      return {
        key:branch.key, nom:branch.name, summary:branch.summary,
        legacyNames:branch.legacyNames || [],
        style:branch.style || (former.cat === "melee" ? "Contrôle" : former.cat === "distance" ? "Distance" : "Concentration"),
        descPhys:branch.visual, flavor:branch.example, desc:branch.summary, roleplay:branch.roleplay, gameplay:branch.gameplay,
        combatRules:branch,
        paliers:branch.tiers.map(function(tier) {
          return {niv:tier.level, nom:tier.title || branch.name, manifestation:tier.narrative || "", cout:costText(tier.cost || branch.cost), desc:tier.effect,
            combatRules:{key:branch.key, name:branch.name, model:branch.model, level:tier.level,
              effect:tier.effect, cost:tier.cost || branch.cost, unlocks:tier.unlocks || [],
              operations:tier.operations.map(function(op) { return Object.assign({}, op, {rule:op.ruleFormula || op.rule}); })}};
        })
      };
    });
    var art = "assets/serments/painted/" + entry.artSlug + ".jpg";
    data.definitions[entry.name] = Object.assign({}, former, {
      dataVersion:authored.version, reforged:true, retired:false, hidden:false,
      arme:entry.weapon, weaponDescription:entry.weaponDescription,
      tagline:entry.tagline, fantasy:entry.tagline, lore:entry.lore,
      vow:entry.vow, awakening:entry.awakening, worldRole:entry.worldRole, evolutionMeaning:entry.evolutionMeaning,
      playstyle:entry.playstyle, decision:entry.decision, counterplay:entry.counterplay,
      distinction:entry.distinction, artSlug:entry.artSlug,
      icon:"", emblem:art, logo:art,
      evolvesFrom:entry.parent || "", minLevel:entry.parent ? 10 : 1,
      sermLevel:entry.parent ? "seasoned" : "basic",
      pvN:entry.growthResolved[0], epN:entry.growthResolved[1], emN:entry.growthResolved[2],
      dmg:entry.damage, type:entry.damageType, entry:entry,
      branches:branches, branchAliases:aliases,
      combatRules:{version:authored.version, identity:entry.identity, kind:entry.kind,
        parent:entry.parent, branches:entry.branches}
    });
    data.emblems[entry.name] = art;
  });
  root.NPSermentsExpansion = data;
  root.NPSermentsReforgedData = data;
  if (typeof module !== "undefined" && module.exports) module.exports = data;
'''
    OUTPUT.write_text('/* Generated by scripts/generate-serments-reforged.py from authored copy and the combat contract. */\n(function (root) {\n  "use strict";\n  var authored = ' + encoded + ';\n' + adapter + '})(typeof window !== "undefined" ? window : globalThis);\n')
    print(f'Generated {len(entries)} serments, 48 branches, 192 tiers; retained 46 archived definitions.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--allow-draft', action='store_true', help='Allow incomplete mechanics only for local layout work.')
    build(parser.parse_args().allow_draft)
