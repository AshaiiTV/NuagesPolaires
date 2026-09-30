// Accès à la base Neon (Postgres) via le pilote HTTP serverless, adapté aux fonctions Netlify.
// Sur Netlify, l'intégration Neon expose NETLIFY_DATABASE_URL ; en local, DATABASE_URL.
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { env } from '$env/dynamic/private';
import * as schema from './schema';

const url = env.DATABASE_URL || env.NETLIFY_DATABASE_URL;
if (!url) throw new Error('DATABASE_URL ou NETLIFY_DATABASE_URL doit être définie.');

export const sql = neon(url);
export const db = drizzle({ client: sql, schema, casing: 'snake_case' });

export type Db = typeof db;
