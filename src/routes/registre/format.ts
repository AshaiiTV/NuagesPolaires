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

/** Libellés lisibles des actions du journal d'audit ; une action inconnue garde son nom technique. */
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
	staff_log_archive: 'Journal du staff archivé',
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
	scene_auto_close: 'Scène refermée d’elle-même'
};

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
	motif: 'motif',
	eventId: 'rendez-vous n°',
	title: 'titre',
	accounts: 'comptes',
	characters: 'personnages',
	beasts: 'créatures',
	events: 'rendez-vous'
};

function valeur(v: unknown): string {
	if (v === true) return 'oui';
	if (v === false) return 'non';
	if (v === null || v === undefined || v === '') return 'rien';
	if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)) return leA(v);
	if (typeof v === 'string' || typeof v === 'number') return String(v);
	return JSON.stringify(v);
}

/** « compte : nova · personnage n° : p_seren » — les détails d'une ligne, lisibles et dans l'ordre. */
export function detailsLisibles(details: Record<string, unknown>): string {
	const lignes: string[] = [];
	for (const [k, v] of Object.entries(details)) {
		if (k === 'accountId' && 'pseudo' in details) continue;
		lignes.push(`${CLES[k] ?? k} : ${valeur(v)}`);
	}
	return lignes.join(' · ');
}
