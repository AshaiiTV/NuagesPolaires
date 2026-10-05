// Qui a tamponné une conséquence, écrit une seule fois : « MJ Maitre », jamais « MJ MJ » ni « MJ mj »
// quand le nom du signataire n'est que son rôle. Partagé par la fiche et la fiche à imprimer.

import { signataire as nomDuTampon } from '$lib/ui/tampons';

export function signataire(stamp: { role: string; name: string }): string {
	return nomDuTampon(stamp.role, stamp.name);
}
