// Qui a tamponné une conséquence, écrit une seule fois : « MJ Maitre », jamais « MJ MJ » ni « MJ mj »
// quand le nom du signataire n'est que son rôle. Partagé par la fiche et la fiche à imprimer.

export function signataire(stamp: { role: string; name: string }): string {
	const role = stamp.role.trim();
	const nom = stamp.name.trim();
	if (!nom || nom.toLocaleLowerCase('fr') === role.toLocaleLowerCase('fr')) return role;
	return `${role} ${nom}`;
}
