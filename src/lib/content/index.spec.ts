import { expect, it } from 'vitest';
import { CONTENTS, getContent, renderMarkdown } from './index';
it('charge les cinq contenus et conserve leurs ancres', () => {
	expect(CONTENTS).toHaveLength(5);
	const content = getContent('systeme-de-jeu');
	expect(content.sections.find((s) => s.title === 'I. Philosophie du Combat')?.id).toBe(
		'i-philosophie-du-combat'
	);
	expect(renderMarkdown(content.body)).toContain('id="i-philosophie-du-combat"');
});
it('échappe le HTML brut et les attributs, même dans un titre', () => {
	const html = renderMarkdown(
		'## <img src=x onerror=alert(1)> {#test}\n\n<script>alert(1)</script>\n\nTexte <b>brut</b>'
	);
	expect(html).not.toContain('<img');
	expect(html).not.toContain('<script');
	expect(html).not.toContain('<b>');
	expect(html).toContain('&lt;script&gt;');
	expect(html).toContain('id="test"');
});
it('synchronise les ancres dupliquées et ignore les titres dans le code', () => {
	expect(renderMarkdown('## Même\n\n## Même')).toContain('id="meme-2"');
});
