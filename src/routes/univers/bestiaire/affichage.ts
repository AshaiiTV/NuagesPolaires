// Les zones gardent leurs identifiants de salon ; leur libellé se lit sans le glyphe hérité.
export const nomZone = (name: string): string =>
	name
		.replace(/^\[[^\]]*\]-?\s*/u, '')
		.replace(/-/g, ' ')
		.replace(/^\p{Ll}/u, (c) => c.toLocaleUpperCase('fr'));
