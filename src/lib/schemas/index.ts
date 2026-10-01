// Point d'entrée unique des schémas Zod et des vues (06-contrats §A : « `src/lib/schemas/index.ts`
// ré-exporte tout »). Module pur, importable côté client.
//
// Collisions de noms entre modules, résolues par des exports nommés explicites (décision INT-1) :
//   - `TierView` : forme identique dans characters.ts et oaths.ts ; celle de characters.ts est
//     exportée sous son nom, celle de oaths.ts sous `OathTierView` ;
//   - `idSchema` : la brique commune de reading.ts (≤ 180, sans blanc) garde le nom ; celle de
//     accounts.ts (`[A-Za-z0-9_:-]{1,128}`) devient `accountIdSchema` ;
//   - `revisionSchema` : celle de accounts.ts (obligatoire) garde le nom ; celle de beasts.ts
//     (facultative, le domaine renvoie 428) devient `beastRevisionSchema`.
// Pour tout autre besoin, importer directement le module du domaine (`$lib/schemas/<domaine>`).

export * from './accounts';
export * from './admin';
export * from './auth';
export * from './beasts';
export * from './characters';
export * from './combats';
export * from './declarations';
export * from './events';
export * from './facts';
export * from './journal';
export * from './oaths';
export * from './observations';
export * from './publications';
export * from './reading';
export * from './scenes';
export * from './spawn';

export type { TierView } from './characters';
export type { TierView as OathTierView } from './oaths';
export { idSchema } from './reading';
export { idSchema as accountIdSchema, revisionSchema } from './accounts';
export { revisionSchema as beastRevisionSchema } from './beasts';
