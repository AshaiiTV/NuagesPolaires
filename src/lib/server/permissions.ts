// Matrice des droits — source unique (04-architecture §5, 03-vision §12).
// Les domaines appellent `assertCan(actor, capacité)` ; les routes n'affichent que ce que `can` autorise.
import { NpError } from './http';

export type Role = 'joueur' | 'mj' | 'designer' | 'admin';

/** L'auteur d'une requête, construit par `hooks.server.ts` à partir de la session. */
export interface Actor {
	accountId: string;
	role: Role;
	/** Personnage relié au compte, ou `null` (compte en attente de liaison, staff sans personnage). */
	characterId: string | null;
	pseudo: string;
}

export type Capability =
	/** Lire tous les personnages (fiches, conséquences). */
	| 'characters.read_all'
	/** Tamponner une fiche : ressources, XP, gemmes, objets, statuts, équipement, report de déclaration. */
	| 'characters.stamp'
	/** Créer un personnage. */
	| 'characters.create'
	/** Identité, Serment, branche, arme, niveau, rature d'un personnage. */
	| 'characters.identity'
	/** Lire le journal de n'importe quel personnage. */
	| 'journal.read_all'
	/** Valider, refuser ou régler un fait. */
	| 'facts.validate'
	/** Conduire une Table : ouvrir, sauvegarder, clore, lire tous les récits, publier un extrait. */
	| 'combat.run'
	/** Tirer des apparitions. */
	| 'spawn.run'
	/** Créer, modifier, masquer, rayer un rendez-vous. */
	| 'events.manage'
	/** Prévenir les joueurs à la création d'un rendez-vous. */
	| 'events.notify'
	/** Atelier bestiaire et zones ; calque réservé du bestiaire. */
	| 'beasts.manage'
	/** Lire les données réservées du bestiaire (masqué, archivé, notes) sans les modifier. */
	| 'beasts.read_reserved'
	/** Valider ou refuser une observation de créature. */
	| 'observations.validate'
	/** Atelier serments ; Serments hors vitrine. */
	| 'oaths.manage'
	/** Ouvrir une scène pour plusieurs personnages, la résumer, la clore. */
	| 'scenes.manage'
	/** Lire le journal du staff. */
	| 'staff_log.read'
	/** Comptes, rôles, liaisons, mots de passe. */
	| 'admin.accounts'
	/** Thèmes : dons, visibilité, création. */
	| 'admin.themes'
	/** Journal d'audit. */
	| 'admin.audit'
	/** Données, réglages, migration, diagnostics. */
	| 'admin.data';

const MJ: readonly Capability[] = [
	'characters.read_all',
	'characters.stamp',
	'characters.create',
	'journal.read_all',
	'facts.validate',
	'combat.run',
	'spawn.run',
	'events.manage',
	'events.notify',
	'beasts.read_reserved',
	'observations.validate',
	'scenes.manage',
	'staff_log.read'
];

const DESIGNER: readonly Capability[] = ['events.manage', 'beasts.manage', 'beasts.read_reserved', 'observations.validate'];

const ADMIN: readonly Capability[] = [
	...MJ,
	'characters.identity',
	'beasts.manage',
	'oaths.manage',
	'admin.accounts',
	'admin.themes',
	'admin.audit',
	'admin.data'
];

const MATRIX: Readonly<Record<Role, ReadonlySet<Capability>>> = {
	joueur: new Set<Capability>(),
	mj: new Set(MJ),
	designer: new Set(DESIGNER),
	admin: new Set(ADMIN)
};

export const ROLES: readonly Role[] = ['joueur', 'mj', 'designer', 'admin'];

export function isRole(value: unknown): value is Role {
	return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

/** Le rôle dispose-t-il de cette capacité ? Un visiteur (`null`) n'en a aucune. */
export function can(role: Role | null | undefined, capability: Capability): boolean {
	return !!role && MATRIX[role].has(capability);
}

/** Exige un compte connecté ; renvoie l'acteur. */
export function requireActor(actor: Actor | null | undefined): Actor {
	if (!actor) throw NpError.unauthenticated('Le carnet s’est refermé. Rouvre-le en te reconnectant.');
	return actor;
}

/** Exige la capacité ; 401 sans session, 403 sans le droit. Renvoie l'acteur. */
export function assertCan(actor: Actor | null | undefined, capability: Capability): Actor {
	const present = requireActor(actor);
	if (!can(present.role, capability)) throw NpError.forbidden();
	return present;
}

/** Exige un personnage relié (actions du joueur sur sa propre fiche) ; renvoie son identifiant. */
export function requireOwnCharacter(actor: Actor | null | undefined): { actor: Actor; characterId: string } {
	const present = requireActor(actor);
	if (!present.characterId) throw new NpError('NOT_LINKED', 'Ton compte attend sa liaison à un personnage.', 403);
	return { actor: present, characterId: present.characterId };
}

/** Le staff qui tamponne : libellé du rôle écrit sur le tampon (« MJ », « Admin »). */
export function stampRoleLabel(role: Role): string {
	return role === 'admin' ? 'Admin' : role === 'mj' ? 'MJ' : role === 'designer' ? 'Designer' : '';
}
