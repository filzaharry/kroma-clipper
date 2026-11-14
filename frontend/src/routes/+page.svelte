<script lang="ts">
  import { workspace } from '#lib/state/workspace.svelte';
  import MediaLibraryView from '#lib/components/upload/MediaLibraryView.svelte';
  import CandidatesView from '#lib/components/candidates/CandidatesView.svelte';
</script>

{#if workspace.videos.length === 0}
  <MediaLibraryView />
{:else}
  <CandidatesView />
{/if}
