<script lang="ts">
  import { workspace } from '#lib/state/workspace.svelte';
  import { page } from '$app/state';
  import ClipEditorView from '#lib/components/editor/ClipEditorView.svelte';

  $effect(() => {
    const clipId = page.url.searchParams.get('clipId');
    if (clipId) {
      const found = workspace.candidates.find((c) => c.id === clipId);
      if (found) {
        workspace.selectClip(found);
      }
    }
  });

  const clip = $derived(workspace.activeClip);
</script>

{#if clip}
  <ClipEditorView {clip} />
{:else}
  <div class="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#111315]">
    <div class="text-sm font-semibold text-[#E7E9EC] mb-1">No Clip Selected for Editorial</div>
    <p class="text-xs text-[#9299A3] mb-4">Select a clip candidate from Stage 4 to begin precision NLE editing.</p>
    <a
      href="/candidates"
      class="h-8 px-4 text-xs font-semibold text-[#111315] bg-[#B6F36B] hover:bg-[#A5E456] rounded transition-colors inline-flex items-center"
    >
      Browse Candidates
    </a>
  </div>
{/if}
