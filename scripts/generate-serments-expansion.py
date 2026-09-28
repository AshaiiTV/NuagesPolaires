#!/usr/bin/env python3
"""Compile the reviewed 70-serment source into browser data and local emblems.

The committed source is sufficient to regenerate every output. No network, live
database, existing serment definition or creative source document is modified.
"""
import argparse
import hashlib
import html
import json
from pathlib import Path
import re
import unicodedata
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'docs/serments-70-source.json'
OUT = ROOT / 'assets/serments'
JS = ROOT / 'assets/js'


def slug(name):
    return re.sub(r'[^a-z0-9]+', '-', unicodedata.normalize('NFKD', name).encode('ascii', 'ignore').decode().lower()).strip('-')


def path(d, **attrs):
    return '<path d="' + d + '"' + ''.join(' ' + k.replace('_', '-') + '="' + str(v) + '"' for k, v in attrs.items()) + '/>'


def line(x1, y1, x2, y2):
    return '<path d="M%d %dL%d %d"/>' % (x1, y1, x2, y2)


def circle(x, y, r):
    return '<circle cx="%s" cy="%s" r="%s"/>' % (x, y, r)


def rect(x, y, w, h, r=2):
    return '<rect x="%s" y="%s" width="%s" height="%s" rx="%s"/>' % (x, y, w, h, r)


def group(shape, transform):
    return '<g transform="' + transform + '">' + shape + '</g>'


# Broad, individually drawn silhouettes remain identifiable at 24px. Evolutions
# share a visual vocabulary with their parent, but change the object/geometry.
MACE = path('M29 50V30M35 50V30M27 50H37M26 15L23 23L27 31H37L41 23L38 15ZM32 15V31')
SLING = path('M20 16Q16 36 30 40Q45 39 45 18M30 40L26 50M33 40L37 50') + path('M27 29Q32 23 37 29L38 34Q32 39 26 34Z')
CROSSBOW = path('M32 13V51M28 39L32 34L36 39M15 27Q32 10 49 27M15 27L32 34L49 27M28 17L32 12L36 17')
FIST = path('M22 34V22Q22 18 27 19V16Q29 12 33 16Q37 12 39 17Q44 15 45 21V35L40 47H27L19 37L17 30Q17 25 22 28L28 34M28 21V28M34 19V27M40 22V28')
STAFF = path('M21 49L42 15M18 46L24 50M39 14L45 18M24 40L30 44M33 25L39 29')
HALBERD = path('M23 51L41 13M36 22Q23 17 22 30L34 32M38 20L46 20L40 28M39 17L42 12L44 19')
PIKE = path('M28 51L34 24M29 25L37 12L40 28ZM27 41L34 43')
JAVELIN = path('M15 49L43 20M36 18L50 13L45 27ZM20 38L27 44')
DAGGER = path('M22 49L28 41M21 39L30 47M27 39L43 15L44 29L32 43ZM24 46L27 49')
FLAIL = path('M19 49L28 28M25 28Q25 15 38 17Q48 18 45 29') + circle(44, 37, 8) + path('M44 25V29M44 45V49M32 37H36M52 37H56')
FIRE = path('M33 12Q38 27 45 26Q52 44 37 50Q19 53 17 38Q16 28 27 22Q24 35 30 34Q38 28 33 12Z') + path('M32 36Q23 46 32 49Q42 46 32 36Z')
ICE = path('M32 12V52M15 22L49 42M15 42L49 22M26 15L32 21L38 15M26 49L32 43L38 49M16 29L24 27L22 19M48 35L40 37L42 45M16 35L24 37L22 45M48 29L40 27L42 19')
WIND = path('M13 25H38Q50 25 47 17Q44 11 39 17M17 33H46M13 41H35Q46 41 42 49Q39 54 34 48')
STONE = path('M15 43L22 24L35 16L48 30L45 47L27 50ZM22 24L32 34L48 30M32 34L27 50M35 16L32 34')
WAND = path('M19 49L38 28M34 16L39 13L43 18L40 26L33 25ZM20 17V25M16 21H24M45 37V45M41 41H49')
PRIEST = path('M29 13H35V25H46V31H35V50H29V31H18V25H29Z')
DRUID = path('M18 49Q30 32 43 17M25 39Q12 40 17 25Q31 24 28 34M32 31Q28 15 45 14Q49 31 36 31M32 31Q48 28 48 40Q34 45 32 36')
LYRE = path('M19 16L17 29Q16 44 32 47Q48 44 47 29L45 16M19 16L23 20H41L45 16M23 21V38M29 21V42M35 21V42M41 21V38M23 49H41')
MASK = path('M16 18Q32 12 48 18V32Q45 45 32 51Q19 45 16 32ZM22 26Q25 22 29 27M35 27Q39 22 43 26M25 38Q32 43 39 38')
FLASK = path('M25 13H39M27 13V27L16 45Q13 51 21 51H43Q51 51 48 45L37 27V13M22 37H42') + circle(29, 43, 2) + circle(37, 34, 1)
AXE = path('M24 51L39 14M36 20Q26 13 17 22L22 36Q33 35 35 28M38 20L47 17L48 28L35 30')
SHIELD = path('M17 16L32 12L47 16V31Q45 45 32 52Q19 45 17 31ZM32 18V44M23 30H41')
SPEAR = path('M25 51L36 25M29 23L40 12L42 28ZM23 40L32 44')
TOTEM = path('M29 49V14H35V49M19 19L32 25L45 19M19 31L32 37L45 31M22 48H42') + circle(25, 17, 3) + circle(39, 17, 3)
ORB = circle(32, 31, 15) + path('M18 42Q30 53 46 43M26 52H39M32 10V16M51 29H47M13 29H17')

GLYPHS = {
    'Massier': MACE,
    'Frondeur': SLING,
    'Arbalétrier': CROSSBOW,
    'Pugiliste': FIST,
    'Moine': STAFF,
    'Hallebardier': HALBERD,
    'Piquier': PIKE,
    'Javelinier': JAVELIN,
    'Voleur': DAGGER,
    'Porte-Fléau': FLAIL,
    'Pyromancien': FIRE,
    'Cryomancien': ICE,
    'Aéromancien': WIND,
    'Géomancien': STONE,
    'Enchanteur': WAND,
    'Prêtre': PRIEST,
    'Druide': DRUID,
    'Barde': LYRE,
    'Illusionniste': MASK,
    'Alchimiste': FLASK,
    'Porte-Enclume': path('M15 25H49L43 34H36V42H42V49H22V42H28V34H21ZM23 16L36 19L34 25L21 22ZM28 21L24 37'),
    'Ébranleur': group(MACE, 'translate(0 -4) scale(1 .85)') + path('M12 45H27L23 51H34L30 56M37 45H51M17 39L12 34M47 39L52 34'),
    'Ricocheteur': path('M13 17L37 32L24 45M34 27L39 33L31 35M24 45L23 38M24 45L31 43M47 17V47') + circle(13, 17, 3),
    'Sondeur': path('M19 15L28 29M45 15L36 29M25 29Q32 24 39 29L38 37H26Z') + circle(32, 45, 4) + path('M22 42Q17 46 22 50M42 42Q47 46 42 50'),
    'Guetteur': group(CROSSBOW, 'translate(6 7) scale(.78)') + path('M14 17Q26 4 38 17Q26 30 14 17Z') + circle(26, 17, 3),
    'Pavoisier': path('M15 24L25 18H41L49 24V45L40 51H23L15 45ZM23 29H41M32 19V44M20 31L32 38L44 31M28 40L32 35L36 40'),
    'Lutteur': path('M14 19L25 26L32 25L41 33L36 40L29 43L14 33M50 20L41 26L34 24L27 29L31 33L36 30M50 35L41 41L36 40M20 17L13 29M45 18L51 30'),
    'Cestuaire': group(FIST, 'translate(1 -2) scale(.90)') + path('M19 42H44V51H19ZM25 45V48M32 45V48M39 45V48'),
    'Ascète': path('M32 52V31M22 13V23Q22 33 32 33Q42 33 42 23V13M27 15V24Q32 30 37 24V15M18 42H25M39 42H46') + circle(32, 42, 4),
    'Voltigeur': path('M16 49L41 14L47 18L22 53M18 39L24 44M30 22L36 27M12 34Q8 18 24 14M19 11L25 14L22 21M38 38Q49 40 51 29M45 31L51 26L54 34'),
    'Faucheur': path('M21 52L35 20M28 18Q48 12 49 34Q38 27 32 30M34 19L32 13M22 43L28 46'),
    'Rabatteur': path('M21 52L36 16M31 24L46 21L45 35L38 40L32 34M32 34L40 27M12 29H25M20 24L26 29L20 34'),
    'Verrouilleur': path('M30 52V29M23 13V27H41V13M23 19H41M15 30L23 37M49 30L41 37M20 43H43') + rect(26, 35, 10, 10),
    'Empaleur': path('M29 53V42M29 36V28M25 26L29 14L33 26ZM25 42H33M25 36H33M40 46V31M36 28L40 16L44 28Z'),
    'Harponneur': path('M16 48L43 18M34 19L46 13L44 28M37 23L29 24M40 21L41 31M20 44Q43 54 48 42Q54 29 40 35Q27 38 35 45'),
    'Relieur': path('M15 47L43 17M37 16L48 12L45 24M21 39L27 44M18 18L44 47') + circle(18, 18, 5) + circle(44, 47, 5),
    'Faussaire': path('M13 39L21 47L37 31L33 26ZM32 23L42 12L47 22L38 31') + rect(35, 37, 15, 15) + path('M39 48L44 41L47 48'),
    'Escamoteur': path('M17 34H39V51H17ZM21 34V29M35 34V29M26 36L33 22L35 29L31 40M41 14L45 18M48 25H53M39 25L41 30M26 19V13'),
    'Entraveur': path('M15 15L30 49M11 20L22 16M49 15L36 49M44 18L54 22') + path('M22 28L29 25Q33 24 35 28Q36 32 31 34L26 36Q22 37 20 33QM19 30 22 28'.replace('QM', 'Q')) + path('M34 29L40 26Q44 25 46 29Q47 33 43 35L37 38Q32 39 30 35'),
    'Pendulier': circle(32, 17, 6) + path('M32 23V40M18 23L13 15M46 23L51 15M15 44Q32 55 49 44') + circle(32, 45, 7),
    'Forgeron de Braise': path('M22 50L37 21M26 13L44 20L40 31L22 24ZM13 40Q19 31 18 26Q28 40 23 45Q17 50 13 40'),
    'Semeur de Cendres': path('M19 20L23 39H41L45 20ZM16 20H48M23 16Q21 11 28 9M33 16Q30 11 37 8M25 42L21 50M39 42L43 50') + circle(28, 48, 1.5) + circle(36, 54, 1.5) + circle(47, 45, 1.5),
    'Sculpteur de Givre': path('M14 45L20 36H44L50 45ZM18 45V50H46V45M24 34L36 17L42 21L29 38M35 17L38 12L45 17L42 21M17 17H25M21 13V21M45 30H53M49 26V34'),
    'Patineur': path('M18 15V35L34 40H45Q51 40 50 45H15V17M20 45V50M42 45V50M12 51H50M25 25L37 13M33 12L40 16'),
    'Danseur des Vents': path('M31 48L13 27Q18 14 31 13Q44 14 51 27L31 48ZM31 17V48M19 24L31 48M44 24L31 48M14 40Q17 47 22 46M41 47Q50 46 50 38'),
    'Siffleur': path('M13 36L47 20L51 30L17 46ZM21 36L24 42M29 32L32 38M37 28L40 34M41 14Q46 9 52 15M44 9Q52 2 58 13'),
    'Fossoyeur': path('M28 13H38V22H28ZM33 22V36M22 36H43L41 45L33 53L25 46ZM16 49H9M47 49H54'),
    'Fendeur': path('M16 51L37 19M27 20Q38 13 51 19L41 23L37 34L31 28M22 44L29 48M13 24L18 29L13 35L19 39'),
    'Tisserand': path('M19 48L40 15L44 18L23 51ZM39 18L37 23M24 43Q44 51 47 35Q50 23 41 30Q34 36 45 39') + path('M12 18H24M12 29H24M15 18V29M21 18V29M12 21L24 25'),
    'Orfèvre': path('M18 51L34 30L43 13L49 19L34 32L26 52M34 30L19 15L14 21L28 35') + path('M37 41L45 37L52 41L49 50H40ZM37 41H52M45 37V50'),
    'Porte-Lanterne': path('M20 23H44V48H20ZM24 23V16Q32 7 40 16V23M17 48H47M17 23H47M26 29L32 38L38 29M26 42L32 36L38 42') + path('M11 30L6 27M53 30L58 27'),
    'Exorciste': path('M32 12V25M20 26H44L41 44H23ZM26 26L21 13M38 26L43 13M24 49H40M28 32L36 40M36 32L28 40M15 32L11 38M49 32L53 38'),
    'Roncier': path('M20 52Q13 36 29 29Q43 22 40 13M25 32L19 24M30 28L30 19M38 24L47 24M20 41L12 43M21 49L30 45M40 18L46 13') + path('M29 29Q48 34 49 43Q35 43 29 29Z'),
    'Greffeur': path('M23 51L38 17M34 23Q41 9 49 16Q45 28 34 29M29 36L22 23Q12 28 22 38ZM25 40L33 43M24 44L31 47') + rect(12, 42, 9, 12) + path('M15 47L18 51'),
    'Carillonneur': path('M17 39Q22 36 22 24Q22 15 32 15Q42 15 42 24Q42 36 47 39ZM29 11H35M28 44Q32 51 36 44M13 18L8 24M51 18L56 24') + path('M18 48L14 54'),
    'Chef de Chœur': path('M16 49L38 15M33 12L41 17M37 29L47 47M43 27L49 25V18M46 15V22M20 16V28M14 16V23Q14 30 20 30Q26 30 26 23V16'),
    'Verrier': path('M21 12H42V42H21ZM25 16L38 38M27 33L38 19M26 42V51H37M15 25H9M11 22L8 25L11 28M48 25H55M51 22L55 25L51 28'),
    'Masquier': path('M13 18Q26 11 39 18V31Q35 42 26 47Q17 42 13 31ZM19 25L24 27M30 27L35 25M21 37Q26 33 31 37M39 28L49 22V37Q45 45 38 48M43 32L47 31M42 40L45 39M26 47V55'),
    'Distillateur': path('M20 12H30M23 12V28L14 41Q11 47 18 47H34Q39 46 36 40L27 27V12M29 20H42L49 37M43 37H55L54 50H44ZM16 37H34M46 45H52'),
    'Essayeur': path('M13 19L27 33M11 18L16 13L20 17L15 22M37 14L45 22L31 36M34 35L30 39M12 42H29L26 51H16ZM36 42H53L49 51H39M23 24L26 21'),
    'Ravageur': path('M24 52L39 15M33 19Q17 11 13 28Q23 37 33 31M38 18Q51 24 47 36L35 31M12 43Q17 53 34 55M30 50L35 55L29 58'),
    'Déchaîné': group(AXE, 'translate(7 -3) scale(.85)') + path('M31 42Q13 51 12 38Q10 28 19 30M19 30L13 24M19 30L12 34'),
    'Bastion': path('M23 13H41V49L32 54L23 49ZM13 21H23V46L13 40ZM41 21H51V40L41 46ZM28 20H36M28 29H36M28 38H36'),
    'Porte-Étendard': path('M23 54V12M23 14H48L42 24L48 34H23M13 39H23M13 39V48M39 40V48M33 48H46M17 49H29M30 20H37M30 27H39'),
    'Cartographe': path('M18 49L33 15L45 49M24 35H39M29 15H37M15 49L21 51M42 49L48 47M14 27L20 24M43 23L50 26') + circle(33, 20, 3) + path('M27 46Q32 42 38 45'),
    'Veneur': path('M30 51V28M23 13L24 27H39L40 13M30 25V17L34 11L36 20') + path('M14 41Q14 33 18 34Q22 37 18 44ZM42 47Q41 39 45 39Q50 40 48 48Z'),
    'Totémiste': TOTEM + path('M18 25L15 30M46 25L49 30M15 48L11 52M49 48L53 52'),
    'Chimériste': path('M31 51V35M21 17L32 13L43 18L46 30L32 39L18 30ZM21 17L27 26L18 30M43 18L37 26L46 30M27 26H37L32 39M22 47L31 43L42 48') + circle(32, 21, 3),
    'Astronome': circle(32, 30, 17) + '<ellipse cx="32" cy="30" rx="8" ry="20" transform="rotate(35 32 30)"/>' + path('M12 30H51M27 51H38M24 23L32 35L43 27') + circle(24, 23, 2) + circle(32, 35, 2) + circle(43, 27, 2),
    'Prismancien': path('M22 38L32 15L43 38ZM22 38H43M32 15V38M11 23L27 30L50 17M44 17H51V24M27 43V49H38M20 50H45'),
}

CATEGORIES = {
    **dict.fromkeys(['Massier', 'Pugiliste', 'Moine', 'Hallebardier', 'Piquier', 'Voleur', 'Porte-Fléau', 'Sauvageon', 'Croisé', 'Traqueur'], 'melee'),
    **dict.fromkeys(['Frondeur', 'Arbalétrier', 'Javelinier'], 'distance'),
    **dict.fromkeys(['Pyromancien', 'Cryomancien', 'Aéromancien', 'Géomancien', 'Illusionniste', 'Alchimiste', 'Evocateur', 'Arcaniste'], 'magie'),
    **dict.fromkeys(['Enchanteur', 'Prêtre', 'Druide', 'Barde'], 'soutien'),
}
ICONS = dict(zip(['Massier', 'Frondeur', 'Arbalétrier', 'Pugiliste', 'Moine', 'Hallebardier', 'Piquier', 'Javelinier', 'Voleur', 'Porte-Fléau', 'Pyromancien', 'Cryomancien', 'Aéromancien', 'Géomancien', 'Enchanteur', 'Prêtre', 'Druide', 'Barde', 'Illusionniste', 'Alchimiste', 'Sauvageon', 'Croisé', 'Traqueur', 'Evocateur', 'Arcaniste'], ['🔨', '◉', '🏹', '👊', '🪄', '⚔', '⚔', '➶', '🗡', '⛓', '🔥', '❄', '≋', '◆', '✧', '✝', '❧', '♫', '◈', '⚗', '🪓', '🛡', '🏹', '🪄', '🔮']))
PALETTES = {'melee': ('#efc897', '#d98662'), 'distance': ('#aae0f0', '#589bad'), 'magie': ('#d4c0ff', '#9c83dd'), 'soutien': ('#b6e6c1', '#75b799')}


def emblem(name, category, evolved):
    fg, accent = PALETTES[category]
    rim = '<path d="M9 17V9H17M47 9H55V17M9 47V55H17M47 55H55V47" fill="none" stroke="' + accent + '" stroke-width="2.5"/>' if evolved else ''
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64" role="img" aria-labelledby="title"><title id="title">' + html.escape(name) + '</title><rect x="2" y="2" width="60" height="60" rx="15" fill="#111d2a" stroke="' + accent + '" stroke-width="1.5"/>' + rim + '<g fill="none" stroke="' + fg + '" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">' + GLYPHS[name] + '</g></svg>\n'


def cost_text(cost):
    return ' / '.join([str(cost['actions']) + (' actions' if cost['actions'] > 1 else ' action'), str(cost['ep']) + ' EP', str(cost['em']) + ' EM'])


def branch_description(branch):
    labels = [('timing', 'Déclenchement'), ('range', 'Portée'), ('targets', 'Cibles'), ('duration', 'Durée'), ('cycle', 'Déroulement'), ('defense', 'Défenses'), ('limits', 'Limites')]
    return '\n\n'.join(label + ' : ' + branch[key] for key, label in labels)


def public_rules(markdown):
    """Publish play rules only; preserve the archived design document verbatim."""
    rules = markdown.split('## Adaptations entre les concepts', 1)[0]
    # The original preamble describes the former unpublished design dossier.
    rules = '# Règles communes des nouveaux serments\n\n' + rules.split('## Lire une fiche', 1)[1]
    rules = rules.replace('\n\n**L**', '## Lire une fiche\n\n**L**', 1)
    substitutions = {
        'Les 50 évolutions sont proposées au rang **Aguerri**': 'Les 50 évolutions sont au rang **Aguerri**',
        'attribution RP/staff à définir': 'l’attribution est effectuée par le staff',
        'Les techniques du parent réellement acquises peuvent être conservées pour l’essai.': 'Les techniques du parent réellement acquises restent soumises aux conditions de leur fiche.',
        '## Socle repris du système écrit': '## Actions et ressources',
        'Les nouvelles croissances sont des propositions ; les cinq parents publiés concernés restent inchangés.': '',
        ' ; les exemples de ce dossier utilisent des niveaux égaux pour rendre les comparaisons lisibles': '',
        'Effet retenu pour la V1': 'Effet',
        'Le coût de 4 EP vient du tir à l’arc écrit sur le site ; son application aux autres tirs matériels est une **extension proposée**, pas une règle déjà publiée.': 'Le tir matériel ordinaire coûte 4 EP et nécessite une munition disponible.',
        '## Conventions nouvelles pour les essais': '## Repères de placement',
        'Les mètres, masses, empreintes et durées précises des fiches sont des conventions de conception. Le système écrit décrit surtout le contact et la distance ; ce dossier ajoute un repère commun pour rendre les placements vérifiables.': 'Les mètres, masses, empreintes et durées précises des fiches permettent de vérifier les placements et les conditions de chaque technique.',
        'Cette conversion est une convention de test, pas une mesure du lore.': 'Cette conversion sert à suivre les usages paisibles hors combat.',
    }
    for old, new in substitutions.items():
        rules = rules.replace(old, new)
    assert '/Users/' not in rules and 'LIRE-ICI' not in rules and 'Sources locales' not in rules
    return rules.strip() + '\n'


def build():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--rules', type=Path, help='Import the audited rules JSON once into the committed source.')
    parser.add_argument('--catalogue', type=Path)
    args = parser.parse_args()
    if args.rules:
        if not args.catalogue:
            parser.error('--catalogue is required with --rules')
        original = json.loads(args.rules.read_text())
        concepts = json.loads(args.catalogue.read_text())
        source = {'schemaVersion': 1, 'version': '2026-09-28.1', 'rules': original, 'concepts': concepts, 'commonRulesMarkdown': args.rules.with_name('regles-communes.md').read_text()}
        SOURCE.parent.mkdir(parents=True, exist_ok=True)
        SOURCE.write_text(json.dumps(source, ensure_ascii=False, indent=2) + '\n')
    source = json.loads(SOURCE.read_text())
    entries = source['rules']['entries']
    concepts = {e['name']: e for e in source['concepts']['entries']}
    assert len(entries) == len(GLYPHS) == 70
    assert {e['name'] for e in entries} == set(GLYPHS)
    by_name = {e['name']: e for e in entries}
    categories, emblems, definitions = {}, {}, {}
    svg_hashes = set()
    OUT.mkdir(parents=True, exist_ok=True)
    for e in entries:
        name = e['name']
        parent = e['parent']
        root = parent or name
        assert e['kind'] == ('evolution' if parent else 'base')
        assert root in CATEGORIES
        expected_levels = [10, 13, 16, 20] if parent else [2, 5, 7, 10]
        assert len(e['branches']) == 2
        cat = CATEGORIES[root]
        categories[name] = cat
        filename = slug(name) + '.svg'
        emblems[name] = 'assets/serments/' + filename
        svg = emblem(name, cat, bool(parent))
        parsed = ET.fromstring(svg)
        assert parsed.attrib['viewBox'] == '0 0 64 64'
        glyph_hash = hashlib.sha256(GLYPHS[name].encode()).hexdigest()
        assert glyph_hash not in svg_hashes, name
        svg_hashes.add(glyph_hash)
        assert not any(token in svg for token in ('<script', '<image', 'onload', '<text', 'href='))
        assert svg.count('http://') == 1  # Namespace only; no external dependencies.
        OUT.joinpath(filename).write_text(svg)
        growth = e['growthResolved']
        assert len(growth) == 3 and all(isinstance(n, int) and n >= 0 for n in growth)
        if parent in by_name:
            assert growth == by_name[parent]['growthResolved']
        branches = []
        for branch in e['branches']:
            assert [t['level'] for t in branch['tiers']] == expected_levels
            assert set(branch['cost']) == {'actions', 'ep', 'em'}
            assert all(isinstance(v, int) and v >= 0 for v in branch['cost'].values())
            assert branch['cost']['actions'] >= 1
            branches.append({
                'nom': branch['name'], 'style': 'Contrôle' if cat == 'melee' else ('Distance' if cat == 'distance' else ('Soutien' if cat == 'soutien' else 'Magie')),
                'descPhys': branch['distinction'], 'flavor': branch['scenario'], 'desc': branch_description(branch),
                'combatRules': branch,
                'paliers': [{
                    'niv': tier['level'], 'nom': branch['name'], 'cout': cost_text(branch['cost']), 'desc': tier['effect'],
                    'combatRules': {'key': branch['key'], 'name': branch['name'], 'level': tier['level'], 'effect': tier['effect'], 'cost': branch['cost']},
                } for tier in branch['tiers']],
            })
        definition = {
            'id': e['id'].replace('proposal-', 'expansion-'), 'extension': True, 'dataVersion': source['version'],
            'arme': e['weapon'], 'pvN': growth[0], 'epN': growth[1], 'emN': growth[2],
            'dmg': e['damage'], 'type': e['damageType'], 'lore': concepts[name]['role'],
            'cat': cat, 'icon': ICONS[root], 'emblem': emblems[name], 'logo': emblems[name], 'sermLevel': 'seasoned' if parent else 'basic',
            'minLevel': 10 if parent else 1, 'hidden': False, 'evolvesFrom': parent or '',
            'branches': branches, 'combatRules': {'identity': e['identity'], 'kind': e['kind'], 'parent': parent, 'branches': e['branches']},
            'entry': e,
        }
        definitions[name] = definition
    data = {'version': source['version'], 'source': 'docs/serments-70-source.json', 'entries': entries, 'definitions': definitions, 'categories': categories, 'emblems': emblems, 'commonRules': public_rules(source['commonRulesMarkdown'])}
    # Keep one copy of the rules on the wire. The SD adapter below attaches
    # references and display strings at load time, with exactly the same API.
    for definition in definitions.values():
        del definition['branches']
        del definition['combatRules']
        del definition['entry']
    adapter = '''
  function costText(cost) {
    return cost.actions + (cost.actions > 1 ? " actions" : " action") + " / " + cost.ep + " EP / " + cost.em + " EM";
  }
  function describe(branch) {
    return [["timing","Déclenchement"],["range","Portée"],["targets","Cibles"],["duration","Durée"],["cycle","Déroulement"],["defense","Défenses"],["limits","Limites"]].map(function (field) {
      return field[1] + " : " + branch[field[0]];
    }).join("\\n\\n");
  }
  data.entries.forEach(function (entry) {
    var definition = data.definitions[entry.name];
    definition.entry = entry;
    definition.combatRules = {identity:entry.identity,kind:entry.kind,parent:entry.parent,branches:entry.branches};
    definition.branches = entry.branches.map(function (branch) {
      return {
        nom:branch.name,
        style:definition.cat === "melee" ? "Contrôle" : (definition.cat === "distance" ? "Distance" : (definition.cat === "soutien" ? "Soutien" : "Magie")),
        descPhys:branch.distinction,flavor:branch.scenario,desc:describe(branch),combatRules:branch,
        paliers:branch.tiers.map(function (tier) {
          return {niv:tier.level,nom:branch.name,cout:costText(branch.cost),desc:tier.effect,
            combatRules:{key:branch.key,name:branch.name,level:tier.level,effect:tier.effect,cost:branch.cost}};
        })
      };
    });
  });
'''
    JS.mkdir(parents=True, exist_ok=True)
    JS.joinpath('serments-expansion-data.js').write_text('/* Generated by scripts/generate-serments-expansion.py; edit the committed source. */\n(function (root) {\n  "use strict";\n  var data = ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/') + ';\n' + adapter + '  root.NPSermentsExpansion = data;\n  if (typeof module !== "undefined" && module.exports) module.exports = data;\n})(typeof window !== "undefined" ? window : globalThis);\n')
    helper = '''/* Local, deterministic emblems. No HTML is stored in serment icon fields. */
(function (root) {
  "use strict";
  var legacy = {"Duelliste":"⚔","Bretteur":"⚔","Claymore":"⚔","Lame d'Honneur":"⚔","Sauvageon":"🪓","Croisé":"🛡","Rôdeur":"🗡","Rodeur":"🗡","Traqueur":"🏹","Flécheur":"🏹","Flecheur":"🏹","Elementaliste":"👊","Élémentaliste":"👊","Evocateur":"🪄","Évocateur":"🪄","Conjurateur":"⛓","Arcaniste":"🔮"};
  function attr(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (character) {
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[character];
    });
  }
  root.npSermentEmblem = function (name, size, cssClass) {
    var data = root.NPSermentsExpansion;
    var file = data && data.emblems && Object.prototype.hasOwnProperty.call(data.emblems, name) ? data.emblems[name] : "";
    var dimension = Math.max(16, Math.min(256, Math.round(Number(size) || 32)));
    var className = "np-serment-emblem" + (cssClass ? " " + String(cssClass) : "");
    // Only the generated asset directory is accepted, even if a caller mutates the registry.
    if (file && /^assets\\/serments\\/[a-z0-9-]+\\.svg$/.test(file)) {
      return '<img class="' + attr(className) + '" src="' + attr(file) + '" width="' + dimension + '" height="' + dimension + '" alt="' + attr(name) + '" loading="lazy" decoding="async" style="display:inline-block;vertical-align:middle;flex-shrink:0;object-fit:contain">';
    }
    var icon = (root.WEAPON_ICONS && root.WEAPON_ICONS[name]) || legacy[name] || "✦";
    return '<span class="' + attr(className) + '" role="img" aria-label="' + attr(name) + '" style="display:inline-flex;align-items:center;justify-content:center;width:' + dimension + 'px;height:' + dimension + 'px;font-size:' + Math.round(dimension * 0.66) + 'px;line-height:1;vertical-align:middle;flex-shrink:0">' + attr(icon) + '</span>';
  };
})(typeof window !== "undefined" ? window : globalThis);
'''
    # v300 uses the hand-painted renderer in serments-emblems.js. Regenerating
    # compatibility data must not replace that renderer with the v299 fallback.
    print('Validated and generated: 70 definitions, 20 bases, 50 evolutions, 140 branches, 560 tiers, 70 unique SVG silhouettes.')


if __name__ == '__main__':
    build()
