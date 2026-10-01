// Écritures propres au Registre : dates en voix du carnet, rôles, lecture humaine du journal d'audit.
import { dateLongue, heure } from '$lib/ui/dates';
import type { RoleView } from '$lib/schemas/accounts';

/** « 1er octobre », « 26 septembre » (le premier du mois s'écrit en ordinal). */
export function le(iso: string | null | undefined, now?: number): string {
	if (!iso) return '';
	return dateLongue(iso, now).replace(/^1 /, '1er ');
}

/** « 1er octobre, 21:14 ». */
export function leA(iso: string | null | undefined, now?: number): string {
	if (!iso) return '';
	return `${le(iso, now)}, ${heure(iso)}`;
}

export const ROLES: { id: RoleView; libelle: string; pluriel: string }[] = [
	{ id: 'joueur', libelle: 'joueur', pluriel: 'Joueurs' },
	{ id: 'mj', libelle: 'MJ', pluriel: 'MJ' },
	{ id: 'designer', libelle: 'designer', pluriel: 'Designers' },
	{ id: 'admin', libelle: 'administrateur', pluriel: 'Administrateurs' }
];
export const LIBELLE_ROLE: Record<string, string> = Object.fromEntries(ROLES.map((r) => [r.id, r.libelle]));

/** Libellés lisibles des actions du journal d'audit ; une action absente se lit « Action non décrite ». */
export const ACTIONS_AUDIT: Record<string, string> = {
	login_success: 'Entrée dans le carnet',
	login_failed: 'Entrée refusée',
	login_rate_limited: 'Entrées suspendues (trop de tentatives)',
	register_success: 'Inscription',
	register_rate_limited: 'Inscriptions suspendues (trop de tentatives)',
	logout: 'Carnet refermé',
	self_change_password: 'Mot de passe changé par son titulaire',
	complete_forced_reset: 'Nouveau mot de passe choisi après réinitialisation',
	self_set_theme: 'Thème choisi',
	self_set_portrait: 'Portrait changé',
	self_delete_account: 'Compte fermé par son titulaire',
	discord_link: 'Discord relié',
	discord_unlink: 'Discord délié',
	admin_reset_password: 'Mot de passe réinitialisé',
	admin_set_password: 'Mot de passe défini par un administrateur',
	admin_delete_account: 'Compte rayé',
	admin_link_account: 'Liaison',
	admin_unlink_account: 'Liaison défaite',
	admin_set_role: 'Rôle changé',
	admin_grant_theme: 'Thème donné',
	admin_grant_theme_all: 'Thème donné à tous',
	admin_revoke_theme: 'Thème retiré',
	admin_block_theme: 'Thème bloqué',
	admin_unblock_theme: 'Thème débloqué',
	admin_set_theme_visibility: 'Visibilité d’un thème',
	admin_set_theme_autogrant: 'Distribution d’un thème',
	admin_create_theme: 'Thème créé',
	set_setting: 'Réglage',
	export_data: 'Export des données',
	staff_log_archive: 'Décisions des MJ archivées',
	consume_own_item: 'Objet consommé',
	set_event_participation: 'Inscription à un rendez-vous',
	character_create: 'Personnage créé',
	character_update_identity: 'Identité d’un personnage',
	character_strike: 'Personnage rayé',
	character_correct_resource: 'Ressource corrigée',
	character_grant_xp: 'XP tamponnée',
	character_fuse_gems: 'Gemmes fusionnées',
	character_add_item: 'Objet ajouté',
	character_remove_item: 'Objet retiré',
	character_set_status: 'Statut posé',
	character_remove_status: 'Statut retiré',
	character_set_equipment: 'Équipement changé',
	journal_write: 'Note de journal',
	journal_amend: 'Note de journal corrigée',
	journal_strike: 'Note de journal rayée',
	fact_propose: 'Fait proposé',
	declaration_report: 'Déclaration reportée',
	declaration_strike: 'Déclaration rayée',
	event_create: 'Rendez-vous créé',
	event_update: 'Rendez-vous modifié',
	event_visibility: 'Visibilité d’un rendez-vous',
	event_strike: 'Rendez-vous rayé',
	event_notify: 'Joueurs prévenus d’un rendez-vous',
	scene_open: 'Scène ouverte',
	scene_close: 'Scène refermée',
	scene_auto_close: 'Scène refermée d’elle-même',
	table_ouverte: 'Table ouverte',
	table_sauvee: 'Table sauvegardée',
	table_chiffres: 'Chiffres des adversaires montrés',
	table_visibilite: 'Visibilité d’une Table',
	table_close: 'Table refermée',
	beast_created: 'Créature ajoutée au bestiaire',
	beast_updated: 'Créature modifiée',
	beast_duplicated: 'Créature dupliquée',
	observation_proposed: 'Observation proposée',
	observation_validated: 'Observation tamponnée',
	observation_rejected: 'Observation écartée',
	oath_created: 'Serment écrit',
	oath_updated: 'Serment modifié',
	oath_visibility: 'Visibilité d’un Serment',
	extrait_publie: 'Extrait publié',
	publication_rayee: 'Publication rayée',
	apparition_tiree: 'Apparition tirée',
	apparition_transferee: 'Apparition transférée',
	zone_created: 'Zone créée',
	zone_renamed: 'Zone renommée',
	migration_legacy: 'Reprise de l’ancien carnet'
};

/** Le libellé d'une action du journal d'audit, jamais son nom technique. */
export function actionAudit(action: string): string {
	return ACTIONS_AUDIT[action] ?? 'Action non décrite';
}

/** Sources du journal d'audit, dites dans le lexique du carnet. */
export const SOURCES_AUDIT: Record<string, string> = {
	auth: 'entrée',
	accounts: 'comptes',
	settings: 'réglages',
	admin: 'données',
	characters: 'personnages',
	pv: 'PV',
	ep: 'EP',
	em: 'EM',
	xp: 'XP',
	events: 'agenda',
	journal: 'journal',
	declarations: 'déclarations',
	facts: 'faits',
	scenes: 'scènes',
	combats: 'la Table',
	publications: 'publications',
	observations: 'observations',
	beasts: 'bestiaire',
	oaths: 'Serments',
	zones: 'zones',
	spawn: 'apparitions',
	staff_log: 'décisions des MJ',
	legacy: 'reprise'
};

/** Libellés lisibles des décisions des MJ et des administrateurs (déjà en français côté serveur). */
export const ACTIONS_STAFF: Record<string, string> = {
	liaison: 'Liaison',
	deliaison: 'Liaison défaite',
	role: 'Rôle changé',
	reglage: 'Réglage',
	mdp_reset: 'Mot de passe réinitialisé',
	mdp_defini: 'Mot de passe défini',
	compte_supprime: 'Compte rayé',
	personnage_cree: 'Personnage créé',
	personnage_supprime: 'Personnage rayé',
	identite_modifiee: 'Identité modifiée',
	ressource_corrigee: 'Ressource corrigée',
	xp_combat: 'XP de combat',
	objet_ajoute: 'Objet ajouté',
	objet_retire: 'Objet retiré',
	statut_pose: 'Statut posé',
	statut_retire: 'Statut retiré',
	equipement_modifie: 'Équipement modifié',
	gemmes_fusionnees: 'Gemmes fusionnées',
	event_cree: 'Rendez-vous créé',
	event_modif: 'Rendez-vous modifié',
	event_supprime: 'Rendez-vous rayé',
	event_visibilite: 'Visibilité d’un rendez-vous',
	event_notif: 'Joueurs prévenus',
	declaration_reportee: 'Déclaration reportée',
	declaration_rayee: 'Déclaration rayée',
	fait_valide: 'Fait tamponné',
	extrait_publie: 'Extrait publié',
	publication_rayee: 'Publication rayée',
	scene_ouverte: 'Scène ouverte',
	journal_archive: 'Journal archivé',
	apparition_tiree: 'Apparition tirée',
	apparition_transferee: 'Apparition transférée',
	zone_created: 'Zone créée',
	zone_renamed: 'Zone renommée',
	frappe: 'Frappe',
	connexion: 'Entrée',
	table_ouverte: 'Table ouverte',
	table_sauvee: 'Table sauvegardée',
	table_chiffres: 'Chiffres des adversaires montrés',
	table_visibilite: 'Visibilité d’une Table',
	table_close: 'Table refermée',
	beast_created: 'Créature ajoutée au bestiaire',
	beast_updated: 'Créature modifiée',
	beast_duplicated: 'Créature dupliquée',
	observation_proposed: 'Observation proposée',
	observation_validated: 'Observation tamponnée',
	observation_rejected: 'Observation écartée',
	oath_created: 'Serment écrit',
	oath_updated: 'Serment modifié',
	oath_visibility: 'Visibilité d’un Serment'
};

/** Le libellé d'une décision, jamais son nom technique. */
export function actionDecision(action: string): string {
	return ACTIONS_STAFF[action] ?? ACTIONS_AUDIT[action] ?? 'Action non décrite';
}

/** Noms lisibles des clés de détail les plus courantes. */
const CLES: Record<string, string> = {
	pseudo: 'compte',
	accountId: 'compte n°',
	characterId: 'personnage n°',
	previousCharacterId: 'ancien personnage n°',
	characterName: 'personnage',
	name: 'nom',
	from: 'avant',
	to: 'après',
	role: 'rôle',
	themeId: 'thème',
	visible: 'visible',
	autoGrantAll: 'distribué à tous',
	changed: 'comptes touchés',
	expiresAt: 'échéance',
	key: 'réglage',
	value: 'valeur',
	reason: 'raison',
	scope: 'session',
	method: 'par',
	rehashed: 'empreinte renouvelée',
	ip: 'adresse',
	motif: 'motif',
	eventId: 'rendez-vous n°',
	title: 'titre',
	accounts: 'comptes',
	characters: 'personnages',
	beasts: 'créatures',
	events: 'rendez-vous',
	detail: 'détail',
	beastId: 'créature n°',
	zoneId: 'zone n°',
	count: 'nombre',
	revision: 'version',
	consequences: 'conséquences',
	recit: 'récit'
};

/** Clés techniques qui ne disent rien à qui lit : on les tait. */
const CLES_TUES = new Set(['id', 'runId', 'combatId', 'publishedExtractId', 'packs']);

const VALEURS: Record<string, string> = {
	full: 'pleine',
	reset: 'de réinitialisation',
	password: 'mot de passe',
	discord: 'Discord',
	auto: 'automatique',
	true: 'oui',
	false: 'non'
};

function valeur(v: unknown): string {
	if (v === true) return 'oui';
	if (v === false) return 'non';
	if (v === null || v === undefined || v === '') return 'rien';
	if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)) return leA(v);
	if (typeof v === 'string' && VALEURS[v]) return VALEURS[v];
	if (typeof v === 'string' || typeof v === 'number') return String(v);
	if (Array.isArray(v)) return v.length === 0 ? 'aucune' : String(v.length);
	if (typeof v === 'object') {
		const o = v as Record<string, unknown>;
		const nom = o.title ?? o.name;
		if (typeof nom === 'string' && nom) return nom;
	}
	return 'détaillé';
}

/** « compte : nova · personnage n° : p_seren » — les détails d'une ligne, lisibles et dans l'ordre. */
export function detailsLisibles(details: Record<string, unknown>): string {
	const lignes: string[] = [];
	for (const [k, v] of Object.entries(details)) {
		if (k === 'accountId' && 'pseudo' in details) continue;
		if (CLES_TUES.has(k)) continue;
		lignes.push(`${CLES[k] ?? k} : ${valeur(v)}`);
	}
	return lignes.join(' · ');
}
