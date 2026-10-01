<script lang="ts">
 import type { ContentSection } from '$lib/content';
 let { sections }: { sections: ContentSection[] } = $props();
 let active = $state('');
 $effect(() => {
  active = sections[0]?.id ?? '';
  const visible = new Set<string>();
  const observer = new IntersectionObserver(entries => {
   for (const entry of entries) { if (entry.isIntersecting) visible.add(entry.target.id); else visible.delete(entry.target.id); }
   const first = sections.find(section => visible.has(section.id));
   if (first) active = first.id;
  }, { rootMargin: '-10% 0px -55% 0px', threshold: 0 });
  for (const section of sections) { const heading = document.getElementById(section.id); if (heading) { heading.tabIndex = -1; observer.observe(heading); } }
  return () => observer.disconnect();
 });
 function follow(event: MouseEvent, id: string) {
  if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  const heading = document.getElementById(id);
  if (heading) { active = id; heading.focus({ preventScroll: true }); }
 }
</script>
<nav aria-label="Sommaire des sections"><ul>{#each sections as section}<li><a class:active={active === section.id} aria-current={active === section.id ? 'location' : undefined} href={'#' + section.id} onclick={(event) => follow(event, section.id)}>{section.title}</a></li>{/each}</ul></nav>
<style>
 nav { max-height: 65svh; overflow-y: auto; } a { display: flex; align-items: center; gap: 12px; min-height: 44px; padding: 8px 4px; font: var(--t-libelle); text-decoration: none; }
 a::before { content: ''; width: 4px; height: 4px; rotate: 45deg; flex: none; background: var(--reglure); } a.active::before { background: var(--encre-humide); } a.active { color: var(--encre-humide); }
</style>
