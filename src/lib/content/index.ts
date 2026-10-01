import { Lexer, Marked, type Tokens } from 'marked';

export type ContentSection = { id: string; title: string; level: number };
export type Content = {
	title: string;
	slug: string;
	resume: string;
	body: string;
	sections: ContentSection[];
};
const sources = import.meta.glob<string>('/src/content/*.md', {
	query: '?raw',
	import: 'default',
	eager: true
});
const escapeHtml = (text: string) =>
	text.replace(
		/[&<>"']/g,
		(c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!
	);
const slugify = (text: string) =>
	text
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '') || 'section';
function headings() {
	const used = new Set<string>();
	return (text: string, level: number): ContentSection => {
		const explicit = /\s+\{#([a-zA-Z][\w-]*)\}\s*$/.exec(text);
		const title = explicit ? text.slice(0, explicit.index) : text;
		const base = explicit?.[1] ?? slugify(title.replace(/[*`~]/g, ''));
		let id = base,
			suffix = 2;
		while (used.has(id)) id = `${base}-${suffix++}`;
		used.add(id);
		return { id, title, level };
	};
}
/** Flat YAML only: the four editorial metadata fields, quoted or plain scalars. */
function parseSource(source: string): Content & { ordre: number } {
	const match = /^\uFEFF?---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(source);
	if (!match) throw new Error('En-tête YAML absent');
	const metadata: Record<string, string> = {};
	for (const line of match[1].split(/\r?\n/)) {
		if (!line.trim() || line.trim().startsWith('#')) continue;
		const field = /^(title|slug|ordre|resume):\s*(.*?)\s*$/.exec(line);
		if (!field) throw new Error(`Champ YAML invalide : ${line}`);
		let value = field[2];
		if (value.startsWith('"')) value = JSON.parse(value);
		else if (value.startsWith("'") && value.endsWith("'"))
			value = value.slice(1, -1).replace(/''/g, "'");
		metadata[field[1]] = value;
	}
	for (const key of ['title', 'slug', 'resume', 'ordre'])
		if (!metadata[key]) throw new Error(`Champ YAML absent : ${key}`);
	if (!/^\d+$/.test(metadata.ordre)) throw new Error('Ordre YAML invalide');
	const body = source.slice(match[0].length).trim();
	const heading = headings();
	const sections: ContentSection[] = [];
	const parser = new Marked();
	parser.walkTokens(parser.lexer(body), (token) => {
		if (token.type === 'heading') sections.push(heading(token.text, token.depth));
	});
	return {
		title: metadata.title,
		slug: metadata.slug,
		resume: metadata.resume,
		ordre: Number(metadata.ordre),
		body,
		sections
	};
}
export const CONTENTS: Content[] = Object.values(sources)
	.map(parseSource)
	.sort((a, b) => a.ordre - b.ordre)
	.map(({ ordre: _ordre, ...content }) => content);
export function getContent(slug: string): Content {
	const content = CONTENTS.find((content) => content.slug === slug);
	if (!content) throw new Error(`Contenu introuvable : ${slug}`);
	return content;
}
export function renderMarkdown(body: string): string {
	const heading = headings();
	const parser = new Marked({
		async: false,
		renderer: {
			html({ text }: Tokens.HTML | Tokens.Tag) {
				return escapeHtml(text);
			},
			heading(token: Tokens.Heading) {
				const section = heading(token.text, token.depth);
				const tokens = Lexer.lexInline(section.title);
				return `<h${token.depth} id="${escapeHtml(section.id)}">${this.parser.parseInline(tokens)}</h${token.depth}>\n`;
			},
			link({ href, title, tokens }: Tokens.Link) {
				// Refuse executable URLs as well as escaping raw HTML tokens.
				if (!/^(?:https?:|mailto:|\/|#|\.\.?\/)/i.test(href) && /^[\s\S]*?:/.test(href))
					return this.parser.parseInline(tokens);
				return `<a href="${escapeHtml(href)}"${title ? ` title="${escapeHtml(title)}"` : ''}>${this.parser.parseInline(tokens)}</a>`;
			}
		}
	});
	return parser.parse(body) as string;
}
