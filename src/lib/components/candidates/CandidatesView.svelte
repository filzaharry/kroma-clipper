<script lang="ts">
  import { workspace } from '#lib/state/workspace.svelte';
  import { goto } from '$app/navigation';
  import { formatTimecode } from '#lib/utils/clippingRules';
  import type { ClipCandidate } from '#lib/types';
  import {
    Scissors,
    Download,
    Check,
    X,
    Sparkles,
    Volume2,
    Smartphone,
    Square,
    Maximize2,
    Search,
    Filter,
    ArrowRight,
    SquarePlay,
  } from 'lucide-svelte';

  let filterRatio = $state<string>('all');
  let minScoreFilter = $state<number>(0);
  let searchQuery = $state<string>('');

  const filteredCandidates = $derived(
    workspace.candidates.filter((clip) => {
      if (filterRatio !== 'all' && clip.aspectRatio !== filterRatio) return false;
      if (clip.score < minScoreFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = clip.title.toLowerCase().includes(q);
        const matchQuote = clip.excerptQuote.toLowerCase().includes(q);
        const matchSpeaker = clip.speaker.toLowerCase().includes(q);
        const matchTags = clip.tags.some((t) => t.toLowerCase().includes(q));
        if (!matchTitle && !matchQuote && !matchSpeaker && !matchTags) return false;
      }
      return true;
    })
  );

  function handleOpenEditor(clip: ClipCandidate) {
    workspace.selectClip(clip);
    goto(`/editor?clipId=${clip.id}`);
  }

  function handleQueueRender(clip: ClipCandidate) {
    workspace.selectClip(clip);
    workspace.startRender({
      clipId: clip.id,
      clipTitle: clip.title,
      aspectRatio: clip.aspectRatio,
    });
    goto('/export');
  }
</script>

<div class="flex-1 flex flex-col overflow-y-auto bg-[#111315] p-6 lg:p-8">
  <!-- Title & Filter Bar -->
  <div class="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
    <div>
      <h1 class="text-xl font-semibold text-[#E7E9EC] tracking-tight">
        4. Pilihan Klip Viral ({workspace.candidates.length})
      </h1>
      <p class="text-xs text-[#9299A3] mt-1">
        Potongan video yang dipotong otomatis berdasarkan kekuatan kalimat pembuka (hook), intonasi suara, dan potensi retensi penonton.
      </p>
    </div>

    <!-- Filters (Hanya muncul jika sudah ada klip) -->
    {#if workspace.candidates.length > 0}
      <div class="flex flex-wrap items-center gap-2">
        <!-- Search -->
        <div class="relative">
          <Search class="w-3.5 h-3.5 text-[#626871] absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Cari kutipan, topik..."
            bind:value={searchQuery}
            class="h-8 pl-8 pr-3 text-xs bg-[#191C20] border border-[#292E34] rounded text-[#E7E9EC] placeholder-[#626871] focus:border-[#B6F36B] focus:outline-none w-48"
          />
        </div>

        <!-- Aspect Ratio Filter Tabs -->
        <div class="flex items-center p-0.5 bg-[#191C20] rounded border border-[#292E34]">
          <button
            type="button"
            onclick={() => (filterRatio = 'all')}
            class="px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer {filterRatio === 'all'
              ? 'bg-[#20242A] text-[#B6F36B]'
              : 'text-[#9299A3] hover:text-[#E7E9EC]'}"
          >
            Semua Rasio
          </button>
          <button
            type="button"
            onclick={() => (filterRatio = '9:16')}
            class="px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer {filterRatio === '9:16'
              ? 'bg-[#20242A] text-[#B6F36B]'
              : 'text-[#9299A3] hover:text-[#E7E9EC]'}"
          >
            9:16 Vertikal
          </button>
          <button
            type="button"
            onclick={() => (filterRatio = '1:1')}
            class="px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer {filterRatio === '1:1'
              ? 'bg-[#20242A] text-[#B6F36B]'
              : 'text-[#9299A3] hover:text-[#E7E9EC]'}"
          >
            1:1 Kotak
          </button>
          <button
            type="button"
            onclick={() => (filterRatio = '16:9')}
            class="px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer {filterRatio === '16:9'
              ? 'bg-[#20242A] text-[#B6F36B]'
              : 'text-[#9299A3] hover:text-[#E7E9EC]'}"
          >
            16:9 Landscape
          </button>
        </div>

        <!-- High Score Toggle -->
        <button
          type="button"
          onclick={() => (minScoreFilter = minScoreFilter === 90 ? 0 : 90)}
          class="h-8 px-2.5 text-xs font-medium rounded border transition-colors flex items-center gap-1.5 cursor-pointer {minScoreFilter === 90
            ? 'bg-[#20242A] border-[#B6F36B] text-[#B6F36B]'
            : 'bg-[#191C20] border-[#292E34] text-[#9299A3] hover:border-[#383F47]'}"
        >
          <Filter class="w-3 h-3" />
          <span>Skor 90+ Saja</span>
        </button>
      </div>
    {/if}
  </div>

  <!-- Candidate Grid or Empty State -->
  {#if workspace.candidates.length === 0}
    <!-- Empty State Bersih Tanpa Dummy List -->
    <div class="rounded-xl border border-dashed border-[#292E34] p-12 text-center bg-[#14171A] max-w-2xl">
      <div class="w-14 h-14 rounded-full bg-[#191C20] border border-[#292E34] flex items-center justify-center mx-auto mb-4 text-[#B6F36B]">
        <Scissors class="w-7 h-7" />
      </div>
      <h3 class="text-sm font-semibold text-[#E7E9EC]">Belum Ada Klip yang Dihasilkan</h3>
      <p class="text-xs text-[#9299A3] mt-1.5 max-w-md mx-auto leading-relaxed">
        {#if !workspace.activeVideo}
          Anda belum memasukkan video YouTube. Silakan masukkan link video YouTube terlebih dahulu untuk mulai mendeteksi klip.
        {:else}
          Video YouTube sudah dimasukkan. Jalankan <strong>Analisis AI</strong> untuk memotong klip dan mendeteksi segmen terbaik secara otomatis.
        {/if}
      </p>
      <div class="mt-5 flex items-center justify-center gap-3">
        {#if !workspace.activeVideo}
          <button
            type="button"
            onclick={() => goto('/library')}
            class="h-9 px-4 text-xs font-semibold text-[#111315] bg-[#B6F36B] hover:bg-[#A5E456] rounded transition-colors inline-flex items-center gap-2 cursor-pointer"
          >
            <SquarePlay class="w-4 h-4" />
            <span>Masukkan Link YouTube</span>
            <ArrowRight class="w-3.5 h-3.5" />
          </button>
        {:else}
          <button
            type="button"
            onclick={() => { workspace.runAnalysis(); goto('/analysis'); }}
            class="h-9 px-4 text-xs font-semibold text-[#111315] bg-[#B6F36B] hover:bg-[#A5E456] rounded transition-colors inline-flex items-center gap-2 cursor-pointer"
          >
            <Sparkles class="w-3.5 h-3.5 fill-current" />
            <span>⚡ Jalankan Analisis AI Sekarang</span>
          </button>
        {/if}
      </div>
    </div>
  {:else if filteredCandidates.length === 0}
    <div class="p-12 text-center bg-[#191C20] border border-[#292E34] rounded-lg">
      <p class="text-sm text-[#E7E9EC] font-medium">Tidak ada klip yang cocok dengan filter ini.</p>
      <p class="text-xs text-[#9299A3] mt-1">Coba turunkan batas skor atau hapus kata kunci pencarian.</p>
      <button
        type="button"
        onclick={() => {
          filterRatio = 'all';
          minScoreFilter = 0;
          searchQuery = '';
        }}
        class="mt-4 px-3 py-1.5 text-xs font-medium text-[#111315] bg-[#B6F36B] rounded cursor-pointer"
      >
        Reset Filter
      </button>
    </div>
  {:else}
    <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
      {#each filteredCandidates as clip (clip.id)}
        {@const isApproved = clip.status === 'approved'}
        {@const isRejected = clip.status === 'rejected'}

        <div
          class="p-5 rounded-lg border transition-all {isApproved
            ? 'bg-[#191C20] border-[#B6F36B]/50'
            : isRejected
              ? 'bg-[#191C20] border-[#292E34] opacity-50'
              : 'bg-[#191C20] border-[#292E34] hover:border-[#383F47]'}"
        >
          <!-- Header: Title & Viral Score -->
          <div class="flex items-start justify-between gap-3 mb-3">
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <span class="text-sm font-semibold text-[#E7E9EC] tracking-tight">
                  {clip.title}
                </span>
                {#if isRejected}
                  <span class="text-[10px] font-mono text-[#EF4444] px-1.5 py-0.5 rounded bg-[#111315] border border-[#EF4444]/30">
                    DITOLAK
                  </span>
                {/if}
              </div>

              <div class="flex items-center gap-2 text-xs text-[#9299A3] mt-1">
                <span>{clip.speaker}</span>
                <span>·</span>
                <span class="font-mono tabular-nums text-[#E7E9EC]">
                  {formatTimecode(clip.startTime, false)} – {formatTimecode(clip.endTime, false)}
                </span>
                <span>·</span>
                <span class="font-mono tabular-nums text-[#B6F36B]">
                  {clip.duration} detik
                </span>
              </div>
            </div>

            <!-- Viral Score Badge -->
            <div class="flex flex-col items-end shrink-0">
              <div class="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#20242A] border border-[#292E34]">
                <span class="text-[10px] text-[#626871] uppercase font-mono">Skor</span>
                <span class="text-sm font-mono tabular-nums font-bold text-[#B6F36B]">
                  {clip.score}
                </span>
              </div>
            </div>
          </div>

          <!-- Excerpt Quote -->
          <div class="p-3 rounded bg-[#111315] border border-[#292E34] text-xs text-[#E7E9EC] leading-relaxed mb-4 italic">
            "{clip.excerptQuote}"
          </div>

          <!-- Heuristic Metrics Bar -->
          <div class="grid grid-cols-3 gap-2 mb-4 text-[11px]">
            <div class="p-2 rounded bg-[#14171A] border border-[#292E34] flex items-center justify-between">
              <span class="text-[#626871] flex items-center gap-1">
                <Sparkles class="w-3 h-3 text-[#B6F36B]" />
                Hook
              </span>
              <span class="font-mono tabular-nums text-[#E7E9EC] font-medium">
                {clip.hookScore}%
              </span>
            </div>

            <div class="p-2 rounded bg-[#14171A] border border-[#292E34] flex items-center justify-between">
              <span class="text-[#626871] flex items-center gap-1">
                <Volume2 class="w-3 h-3 text-[#B6F36B]" />
                Energi
              </span>
              <span class="font-mono tabular-nums text-[#E7E9EC] font-medium">
                {clip.energyScore}%
              </span>
            </div>

            <div class="p-2 rounded bg-[#14171A] border border-[#292E34] flex items-center justify-between">
              <span class="text-[#626871] flex items-center gap-1">
                {#if clip.aspectRatio === '9:16'}
                  <Smartphone class="w-3 h-3 text-[#B6F36B]" />
                {:else if clip.aspectRatio === '1:1'}
                  <Square class="w-3 h-3 text-[#B6F36B]" />
                {:else}
                  <Maximize2 class="w-3 h-3 text-[#B6F36B]" />
                {/if}
                Rasio
              </span>
              <span class="font-mono tabular-nums text-[#E7E9EC] font-medium">
                {clip.aspectRatio}
              </span>
            </div>
          </div>

          <!-- Tags and Action Bar -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[#292E34]">
            <!-- Clean unboxed tags -->
            <div class="flex items-center gap-2 text-xs text-[#626871]">
              {#each clip.tags as tag, idx (tag)}
                <span>{tag}</span>
                {#if idx < clip.tags.length - 1}
                  <span>·</span>
                {/if}
              {/each}
            </div>

            <!-- Actions -->
            <div class="flex items-center gap-2">
              <button
                type="button"
                onclick={() => workspace.approveClip(clip.id)}
                title="Tandai Disetujui"
                class="h-8 px-2.5 rounded border transition-colors flex items-center gap-1 text-xs cursor-pointer {isApproved
                  ? 'bg-[#B6F36B]/10 text-[#B6F36B] border-[#B6F36B]/40'
                  : 'bg-[#20242A] text-[#9299A3] border-[#292E34] hover:text-[#E7E9EC]'}"
              >
                <Check class="w-3.5 h-3.5" />
                <span>{isApproved ? 'Disetujui' : 'Setujui'}</span>
              </button>

              <button
                type="button"
                onclick={() => workspace.rejectClip(clip.id)}
                title="Tolak Klip"
                class="h-8 px-2 rounded border transition-colors flex items-center gap-1 text-xs cursor-pointer {isRejected
                  ? 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/40'
                  : 'bg-[#20242A] text-[#626871] border-[#292E34] hover:text-[#EF4444]'}"
              >
                <X class="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onclick={() => handleQueueRender(clip)}
                title="Kirim ke Antrean Render"
                class="h-8 px-2.5 rounded bg-[#20242A] hover:bg-[#262B32] text-[#9299A3] hover:text-[#E7E9EC] border border-[#292E34] text-xs flex items-center gap-1 cursor-pointer"
              >
                <Download class="w-3.5 h-3.5" />
                <span>Render</span>
              </button>

              <button
                type="button"
                onclick={() => handleOpenEditor(clip)}
                class="h-8 px-3.5 rounded bg-[#B6F36B] hover:bg-[#A5E456] text-[#111315] font-semibold text-xs flex items-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B6F36B]/50 cursor-pointer"
              >
                <Scissors class="w-3.5 h-3.5 stroke-[2.2]" />
                <span>Buka di Editor</span>
              </button>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
