<script lang="ts">
 import { goto } from '$app/navigation';
 let { previous, next, serments = false }: { previous?: { href: string; title: string } | null; next?: { href: string; title: string } | null; serments?: boolean } = $props();
 function turn(event: KeyboardEvent) {
  if (!serments || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  const target = event.target;
  if (target instanceof HTMLElement && target.closest('input, textarea, select, button, a, summary, [contenteditable="true"]')) return;
  const destination = event.key === 'ArrowLeft' ? previous : event.key === 'ArrowRight' ? next : null;
  if (destination) { event.preventDefault(); void goto(destination.href); }
 }
</script>
<svelte:window onkeydown={turn} />
<nav aria-label="Tourner la page">
 {#if previous}<a href={previous.href}><span>← {serments ? 'Serment précédent' : 'Page précédente'}</span><span class="voix">{previous.title}</span></a>{/if}
 {#if next}<a class="suivante" href={next.href}><span>{serments ? 'Serment suivant' : 'Page suivante'} →</span><span class="voix">{next.title}</span></a>{/if}
</nav>
<style>nav { display: flex; flex-wrap: wrap; gap: 28px; justify-content: space-between; } a { display: flex; flex-direction: column; min-height: 44px; padding: 8px 0; font: var(--t-libelle); } .suivante { margin-left: auto; text-align: right; }</style>
