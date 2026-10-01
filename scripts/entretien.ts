import { closeSharedDb, openDb } from '../src/lib/server/db/index';
import { maintainDatabase } from '../src/lib/server/domain/maintenance';

const handle = await openDb();
try {
	console.log('Entretien :', JSON.stringify(await maintainDatabase(handle.db), null, 2));
} finally {
	await handle.close();
	await closeSharedDb();
}
