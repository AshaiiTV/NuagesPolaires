/** Migration archives v1 → schemaVersion 2 (audit 03 §9 ; audit 06 §2.7).
 * pid→characterId, bid→beastId, classe/class→oathName, statuts→statuses,
 * frappe/comp/beh/img→strike/skill/behavior/imageUrl, _cid→id (sinon cf séquentiel).
 * initiative/order/decl : indices de fighters → ids stables ; target/healTarget idem.
 * log : chaînes ou {text,round,type} → {n,round,kind,text}, privés par défaut car libres.
 * pendingDrops→drops ; marqueurs summon du journal→usedSummons. Notes conservées côté MJ.
 * _owner est une étiquette héritée, jamais un accountId ; le domaine résout le propriétaire.
 * _iv, animations, métadonnées de stockage, horloges UI et données inconnues sont omises.
 * Un stub n'est pas un détail et ne peut pas être migré comme un combat complet.
 */
export * from './types';
export {
	createCombat,
	addFighter,
	removeFighter,
	setInitiative,
	startCombat,
	adjustResource,
	restoreEnergy,
	setNotes,
	renameCombat,
	moveFighterPosition,
	currentDeclarantId,
	undoLastGesture
} from './state';
export type { CreateCombatOptions } from './state';
export {
	declareAction,
	buildDeclaration,
	emptyAction,
	passTurn,
	actionsMax,
	actionsLeft,
	undoLastDeclaration,
	editDeclaration
} from './actions';
export { STATUS_EFFECTS, STATUS_IDS, describeStatus, addStatus, removeStatus } from './statuses';
export { resolveRound, undoRound, isFinished, addSummon, disableShieldCall } from './resolve';
export * from './outcomes';
export * from './projection';
export { addStatus as applyStatus } from './statuses';
export { editDeclaration as clearDeclaration } from './actions';
export { fromLegacyArchive } from './legacy';
export { getAbilityOptions, buildTierAbilityOptions, parseBeastAbility } from './abilities';
