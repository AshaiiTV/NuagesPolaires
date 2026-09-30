import { defineConfig } from 'drizzle-kit';

// `drizzle-kit generate` n'a pas besoin de base ; `push`/`migrate`/`studio` exigent DATABASE_URL.
export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	out: './drizzle',
	dialect: 'postgresql',
	casing: 'snake_case',
	dbCredentials: { url: process.env.DATABASE_URL ?? process.env.NETLIFY_DATABASE_URL ?? '' },
	verbose: true,
	strict: true
});
