// Le bloc à coller : copie vers le presse-papiers pour Discord (03-vision §5.3, micro-texte 12).
// `navigator.clipboard` d'abord ; à défaut (contexte non sécurisé, refus), une zone de texte
// temporaire et `execCommand('copy')`. Renvoie `false` si rien n'a pu être copié : l'interface le dit.
export async function copierTexte(texte: string): Promise<boolean> {
	try {
		if (navigator.clipboard?.writeText) {
			await navigator.clipboard.writeText(texte);
			return true;
		}
	} catch {
		// on tente la voie ancienne
	}
	try {
		const zone = document.createElement('textarea');
		zone.value = texte;
		zone.setAttribute('readonly', '');
		zone.style.position = 'fixed';
		zone.style.opacity = '0';
		document.body.appendChild(zone);
		zone.select();
		const ok = document.execCommand('copy');
		zone.remove();
		return ok;
	} catch {
		return false;
	}
}
