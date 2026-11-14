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
    if (pathname.startsWith('/export')) return '5. Antrean Render';
    if (pathname.startsWith('/publish')) return '6. Jadwal Medsos';
    return `3. Pilihan Klip (${workspace.candidates.length})`;
  });

  function handleAction() {
    if (pathname.startsWith('/editor')) {
      if (workspace.activeClip) {
        workspace.startRender({
          clipId: workspace.activeClip.id,
          clipTitle: workspace.activeClip.title,
          aspectRatio: workspace.activeClip.aspectRatio,
        });
        goto('/export');
      }
    } else {
      workspace.runAnalysis(() => {
        // Callback after completion
      });
      goto('/analysis');
    }
  }
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

  <!-- Zone 3: Single Primary Action -->
  <div class="flex items-center gap-3 shrink-0">
    {#if pathname.startsWith('/editor')}
      <button
        type="button"
        onclick={handleAction}
        class="h-8 px-3.5 text-xs font-semibold text-[#111315] bg-[#B6F36B] hover:bg-[#A5E456] active:bg-[#94D445] rounded transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B6F36B]/50 cursor-pointer"
      >
        <Download class="w-3.5 h-3.5 stroke-[2.2]" />
        <span>Kirim ke Render</span>
      </button>
    {:else}
      <button
        type="button"
        onclick={handleAction}
        disabled={workspace.isAnalyzing || !workspace.activeVideo}
        class="h-8 px-3.5 text-xs font-semibold rounded transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B6F36B]/50 cursor-pointer {workspace.isAnalyzing
          ? 'bg-[#20242A] text-[#9299A3] cursor-not-allowed border border-[#292E34]'
          : !workspace.activeVideo
            ? 'bg-[#191C20] text-[#626871] border border-[#292E34] cursor-not-allowed'
            : 'text-[#111315] bg-[#B6F36B] hover:bg-[#A5E456] active:bg-[#94D445]'}"
      >
        <Play class="w-3.5 h-3.5 fill-current {workspace.isAnalyzing ? 'animate-pulse' : ''}" />
        <span>{workspace.isAnalyzing ? 'Menganalisis Klip...' : !workspace.activeVideo ? 'Masukkan Link Video Dulu' : '⚡ Mulai Analisis AI'}</span>
      </button>
    {/if}
  </div>
</header>
