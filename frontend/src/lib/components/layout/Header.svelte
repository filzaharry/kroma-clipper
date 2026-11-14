<script lang="ts">
  import { workspace } from '#lib/state/workspace.svelte';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { Scissors, Play, Download, Film } from 'lucide-svelte';

  const pathname = $derived(page.url.pathname);

  const stageLabel = $derived.by(() => {
    if (pathname.startsWith('/library')) return '1. Input Link YouTube';
    if (pathname.startsWith('/analysis')) return '2. Analisis AI';
    if (pathname.startsWith('/editor')) return '4. Editor Klip (NLE)';
    if (pathname.startsWith('/publish')) return '5. Jadwal Medsos';
    return `3. Pilihan Klip (${workspace.candidates.length})`;
  });
</script>

<header
  class="h-14 border-b border-[#292E34] bg-[#111315] px-5 flex items-center justify-between gap-8 select-none shrink-0 z-20"
>
  <!-- Zone 1: Single-element Brand Wordmark -->
  <div class="flex items-center gap-3 shrink-0">
    <a
      href="/library"
      class="flex items-center gap-2.5 text-left group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#B6F36B] rounded p-0.5"
    >
      <div
        class="w-7 h-7 rounded bg-[#20242A] border border-[#292E34] flex items-center justify-center text-[#B6F36B] group-hover:border-[#B6F36B]/50 transition-colors"
      >
        <Scissors class="w-4 h-4 stroke-[2.2]" />
      </div>
      <span class="text-sm font-semibold tracking-tight text-[#E7E9EC] whitespace-nowrap">
        Kroma Clip
      </span>
    </a>

    {#if workspace.activeVideo}
      <div class="hidden lg:flex items-center gap-2 text-xs text-[#9299A3] pl-3 border-l border-[#292E34]">
        <Film class="w-3.5 h-3.5 text-[#626871]" />
        <span class="truncate max-w-[220px] text-[#E7E9EC] font-medium" title={workspace.activeVideo.title}>
          {workspace.activeVideo.title}
        </span>
      </div>
    {/if}
  </div>

  <!-- Center Zone: Active Workspace Stage Breadcrumb -->
  <div class="hidden md:flex items-center gap-2 text-xs text-[#9299A3]">
    <span class="text-[#626871]">Area Kerja</span>
    <span class="text-[#626871]">/</span>
    <span class="text-[#E7E9EC] font-medium">
      {stageLabel}
    </span>
  </div>
</header>
