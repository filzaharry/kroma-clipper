<script lang="ts">
  import { workspace } from '#lib/state/workspace.svelte';
  import { goto } from '$app/navigation';
  import { formatTimecode } from '#lib/utils/clippingRules';
  import type { ClipCandidate } from '#lib/types';
  import EditorPlayer from '../editor/EditorPlayer.svelte';
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
    Play,
    Eye,
    Loader2,
  } from 'lucide-svelte';

  let filterRatio = $state<string>('all');
  let minScoreFilter = $state<number>(0);
  let searchQuery = $state<string>('');

  // State untuk modal preview instan
  let previewModalClip = $state<ClipCandidate | null>(null);
  let modalCurrentTime = $state(0);
  let modalIsPlaying = $state(false);

  // State tracking download
  let downloadingClipId = $state<string | null>(null);
  let downloadedClipIds = $state<Record<string, boolean>>({});
  let isDownloadingAll = $state(false);

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

  function handleOpenPreviewModal(clip: ClipCandidate) {
    workspace.selectClip(clip);
    previewModalClip = clip;
    modalCurrentTime = clip.startTime;
    modalIsPlaying = true;
  }

  function handleClosePreviewModal() {
    previewModalClip = null;
    modalIsPlaying = false;
  }

  function handleDirectDownload(clip: ClipCandidate) {
    if (downloadingClipId === clip.id) return;
    downloadingClipId = clip.id;

    workspace.quickDownloadClip(clip);

    setTimeout(() => {
      downloadingClipId = null;
      downloadedClipIds = { ...downloadedClipIds, [clip.id]: true };
      setTimeout(() => {
        downloadedClipIds = { ...downloadedClipIds, [clip.id]: false };
      }, 4000);
    }, 1800);
  }

  function handleDownloadAllClips() {
    if (isDownloadingAll) return;
    isDownloadingAll = true;
    const targetClips = filteredCandidates.length > 0 ? filteredCandidates : workspace.candidates;

    targetClips.forEach((clip, idx) => {
      setTimeout(() => {
        workspace.quickDownloadClip(clip);
        downloadedClipIds = { ...downloadedClipIds, [clip.id]: true };
      }, idx * 700);
    });

    setTimeout(() => {
      isDownloadingAll = false;
    }, targetClips.length * 700 + 1000);
  }
</script>

<div class="flex-1 flex flex-col overflow-y-auto bg-[#111315] p-6 lg:p-8">
  <!-- Title & Action Bar -->
  <div class="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
    <div>
      <div class="flex items-center gap-2">
        <h1 class="text-xl font-semibold text-[#E7E9EC] tracking-tight">
          4. Pilihan Klip Viral ({workspace.candidates.length})
        </h1>
        {#if workspace.candidates.length > 0}
          <span class="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#B6F36B]/20 text-[#B6F36B] border border-[#B6F36B]/30">
            Tinggal Download
          </span>
        {/if}
      </div>
      <p class="text-xs text-[#9299A3] mt-1">
        Tonton preview klip di bawah ini dan unduh langsung potongan video 9:16 lengkap dengan subtitle dan watermark.
      </p>
    </div>

    <!-- Top Action Buttons: Download All & Filters -->
    {#if workspace.candidates.length > 0}
      <div class="flex flex-wrap items-center gap-2.5">
        <!-- TOMBOL UNDUH SEMUA SEKALIGUS -->
        <button
          type="button"
          onclick={handleDownloadAllClips}
          disabled={isDownloadingAll}
          class="h-9 px-4 rounded-lg bg-[#B6F36B] hover:bg-[#A5E456] active:bg-[#94D445] text-[#111315] font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-70"
          title="Download semua klip yang ada di daftar ini sekaligus"
        >
          {#if isDownloadingAll}
            <Loader2 class="w-3.5 h-3.5 animate-spin" />
            <span>Sedang Mengunduh Semua...</span>
          {:else}
            <Download class="w-4 h-4 stroke-[2.4]" />
            <span>⬇️ Unduh Semua Klip ({workspace.candidates.length} Video)</span>
          {/if}
        </button>

        <!-- Search -->
        <div class="relative">
          <Search class="w-3.5 h-3.5 text-[#626871] absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Cari kutipan, kata kunci..."
            bind:value={searchQuery}
            class="h-9 pl-8 pr-3 text-xs bg-[#191C20] border border-[#292E34] rounded-lg text-[#E7E9EC] placeholder-[#626871] focus:border-[#B6F36B] focus:outline-none w-44"
          />
        </div>

        <!-- Aspect Ratio Filter Tabs -->
        <div class="flex items-center p-0.5 bg-[#191C20] rounded-lg border border-[#292E34]">
          <button
            type="button"
            onclick={() => (filterRatio = 'all')}
            class="px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer {filterRatio === 'all'
              ? 'bg-[#20242A] text-[#B6F36B] font-semibold'
              : 'text-[#9299A3] hover:text-[#E7E9EC]'}"
          >
            Semua
          </button>
          <button
            type="button"
            onclick={() => (filterRatio = '9:16')}
            class="px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer {filterRatio === '9:16'
              ? 'bg-[#20242A] text-[#B6F36B] font-semibold'
              : 'text-[#9299A3] hover:text-[#E7E9EC]'}"
          >
            9:16
          </button>
          <button
            type="button"
            onclick={() => (filterRatio = '1:1')}
            class="px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer {filterRatio === '1:1'
              ? 'bg-[#20242A] text-[#B6F36B] font-semibold'
              : 'text-[#9299A3] hover:text-[#E7E9EC]'}"
          >
            1:1
          </button>
        </div>
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
      <p class="text-xs text-[#9299A3] mt-1">Coba reset filter pencarian untuk melihat semua klip.</p>
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
    <div class="grid grid-cols-1 xl:grid-cols-2 gap-5">
      {#each filteredCandidates as clip (clip.id)}
        {@const isApproved = clip.status === 'approved'}
        {@const isRejected = clip.status === 'rejected'}
        {@const isDownloadingThis = downloadingClipId === clip.id}
        {@const isDownloadedThis = downloadedClipIds[clip.id]}

        <div
          class="p-5 rounded-xl border transition-all {isApproved
            ? 'bg-[#191C20] border-[#B6F36B]/60 shadow-md'
            : isRejected
              ? 'bg-[#191C20] border-[#292E34] opacity-50'
              : 'bg-[#191C20] border-[#292E34] hover:border-[#383F47] shadow-sm'}"
        >
          <!-- Header: Title & Viral Score -->
          <div class="flex items-start justify-between gap-3 mb-3">
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <span class="text-sm font-bold text-[#E7E9EC] tracking-tight">
                  {clip.title}
                </span>
                {#if isRejected}
                  <span class="text-[10px] font-mono text-[#EF4444] px-1.5 py-0.5 rounded bg-[#111315] border border-[#EF4444]/30">
                    DITOLAK
                  </span>
                {/if}
              </div>

              <div class="flex items-center gap-2 text-xs text-[#9299A3] mt-1">
                <span class="text-[#E7E9EC] font-medium">{clip.speaker}</span>
                <span>·</span>
                <span class="font-mono tabular-nums text-[#B6F36B]">
                  {formatTimecode(clip.startTime, false)} – {formatTimecode(clip.endTime, false)}
                </span>
                <span>·</span>
                <span class="font-mono tabular-nums text-[#E7E9EC] font-medium">
                  {clip.duration} detik
                </span>
              </div>
            </div>

            <!-- Viral Score Badge -->
            <div class="flex flex-col items-end shrink-0">
              <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#20242A] border border-[#292E34]">
                <span class="text-[10px] text-[#9299A3] uppercase font-mono">Skor</span>
                <span class="text-sm font-mono tabular-nums font-bold text-[#B6F36B]">
                  {clip.score}
                </span>
              </div>
            </div>
          </div>

          <!-- Clickable Excerpt Quote with Preview Play Trigger -->
          <div
            role="button"
            tabindex="0"
            onclick={() => handleOpenPreviewModal(clip)}
            onkeydown={(e) => { if (e.key === 'Enter') handleOpenPreviewModal(clip); }}
            class="group p-3.5 rounded-lg bg-[#111315] hover:bg-[#15181C] border border-[#292E34] hover:border-[#B6F36B]/40 text-xs text-[#E7E9EC] leading-relaxed mb-4 transition-all cursor-pointer relative"
            title="Klik untuk menonton preview 9:16 klip ini"
          >
            <div class="italic">"{clip.excerptQuote}"</div>
            <div class="mt-2 flex items-center gap-1.5 text-[11px] text-[#B6F36B] font-medium opacity-80 group-hover:opacity-100">
              <Play class="w-3 h-3 fill-current" />
              <span>Klik di sini untuk tonton preview hasil 9:16</span>
            </div>
          </div>

          <!-- Heuristic Metrics Bar -->
          <div class="grid grid-cols-3 gap-2 mb-4 text-[11px]">
            <div class="p-2 rounded-lg bg-[#14171A] border border-[#292E34] flex items-center justify-between">
              <span class="text-[#9299A3] flex items-center gap-1">
                <Sparkles class="w-3 h-3 text-[#B6F36B]" />
                Hook
              </span>
              <span class="font-mono tabular-nums text-[#E7E9EC] font-bold">
                {clip.hookScore}%
              </span>
            </div>

            <div class="p-2 rounded-lg bg-[#14171A] border border-[#292E34] flex items-center justify-between">
              <span class="text-[#9299A3] flex items-center gap-1">
                <Volume2 class="w-3 h-3 text-[#B6F36B]" />
                Energi
              </span>
              <span class="font-mono tabular-nums text-[#E7E9EC] font-bold">
                {clip.energyScore}%
              </span>
            </div>

            <div class="p-2 rounded-lg bg-[#14171A] border border-[#292E34] flex items-center justify-between">
              <span class="text-[#9299A3] flex items-center gap-1">
                <Smartphone class="w-3 h-3 text-[#B6F36B]" />
                Rasio
              </span>
              <span class="font-mono tabular-nums text-[#E7E9EC] font-bold">
                {clip.aspectRatio}
              </span>
            </div>
          </div>

          <!-- Action Bar: Direct Download, Preview, Edit -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3.5 border-t border-[#292E34]">
            <!-- Status Setuju/Tolak -->
            <div class="flex items-center gap-2">
              <button
                type="button"
                onclick={() => workspace.approveClip(clip.id)}
                class="h-8 px-2.5 rounded-md border transition-colors flex items-center gap-1 text-xs cursor-pointer {isApproved
                  ? 'bg-[#B6F36B]/15 text-[#B6F36B] border-[#B6F36B]/40 font-semibold'
                  : 'bg-[#20242A] text-[#9299A3] border-[#292E34] hover:text-[#E7E9EC]'}"
              >
                <Check class="w-3.5 h-3.5" />
                <span>{isApproved ? 'Disetujui' : 'Setujui'}</span>
              </button>

              <button
                type="button"
                onclick={() => workspace.rejectClip(clip.id)}
                class="h-8 px-2 rounded-md border transition-colors flex items-center gap-1 text-xs cursor-pointer {isRejected
                  ? 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/40'
                  : 'bg-[#20242A] text-[#626871] border-[#292E34] hover:text-[#EF4444]'}"
                title="Tolak Klip"
              >
                <X class="w-3.5 h-3.5" />
              </button>
            </div>

            <!-- Main Actions: Preview, Edit, and Direct Download -->
            <div class="flex items-center gap-2">
              <!-- Tombol Preview Modal -->
              <button
                type="button"
                onclick={() => handleOpenPreviewModal(clip)}
                class="h-8 px-3 rounded-lg bg-[#20242A] hover:bg-[#282E36] text-[#E7E9EC] border border-[#292E34] text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Tonton preview hasil editan klip ini"
              >
                <Eye class="w-3.5 h-3.5 text-[#B6F36B]" />
                <span>Preview</span>
              </button>

              <!-- Tombol Buka di Editor -->
              <button
                type="button"
                onclick={() => handleOpenEditor(clip)}
                class="h-8 px-3 rounded-lg bg-[#20242A] hover:bg-[#282E36] text-[#E7E9EC] border border-[#292E34] text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Buka pengeditan subtitle dan framing"
              >
                <Scissors class="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>

              <!-- TOMBOL UNDUH LANGSUNG (MP4) -->
              <button
                type="button"
                onclick={() => handleDirectDownload(clip)}
                disabled={isDownloadingThis}
                class="h-8 px-3.5 rounded-lg bg-[#B6F36B] hover:bg-[#A5E456] active:bg-[#94D445] text-[#111315] font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md disabled:opacity-75"
                title="Unduh langsung file video MP4 klip ini"
              >
                {#if isDownloadingThis}
                  <Loader2 class="w-3.5 h-3.5 animate-spin" />
                  <span>Mengunduh...</span>
                {:else if isDownloadedThis}
                  <Check class="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Terunduh!</span>
                {:else}
                  <Download class="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Unduh MP4</span>
                {/if}
              </button>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<!-- MODAL PREVIEW HASIL KLIP (Interaktif 9:16 + Subtitle + Watermark) -->
{#if previewModalClip}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
    <div class="bg-[#14171A] border border-[#292E34] rounded-2xl w-full max-w-2xl max-h-[95vh] flex flex-col overflow-hidden shadow-2xl">
      <!-- Modal Header -->
      <div class="h-12 border-b border-[#292E34] px-4 flex items-center justify-between bg-[#191C20] shrink-0">
        <div class="flex items-center gap-2.5 overflow-hidden">
          <span class="w-2 h-2 rounded-full bg-[#B6F36B] animate-pulse"></span>
          <span class="text-xs font-bold text-[#E7E9EC] truncate max-w-[340px]">
            Preview Video 9:16: {previewModalClip.title}
          </span>
          <span class="text-[10px] font-mono text-[#B6F36B] px-1.5 py-0.5 rounded bg-[#111315] border border-[#292E34]">
            {previewModalClip.duration}s
          </span>
        </div>

        <button
          type="button"
          onclick={handleClosePreviewModal}
          class="w-7 h-7 rounded-lg bg-[#20242A] text-[#9299A3] hover:text-[#E7E9EC] hover:bg-[#292E34] flex items-center justify-center transition-colors cursor-pointer"
          aria-label="Tutup Preview"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Modal Body: Player Interaktif -->
      <div class="flex-1 flex overflow-hidden min-h-[560px]">
        <EditorPlayer
          clip={previewModalClip}
          bind:currentTime={modalCurrentTime}
          bind:isPlaying={modalIsPlaying}
        />
      </div>

      <!-- Modal Footer Action Bar -->
      <div class="p-3.5 border-t border-[#292E34] bg-[#191C20] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
        <div class="text-xs text-[#9299A3] truncate max-w-sm">
          "{previewModalClip.excerptQuote}"
        </div>

        <div class="flex items-center gap-2.5 w-full sm:w-auto shrink-0">
          <button
            type="button"
            onclick={() => {
              if (previewModalClip) {
                handleOpenEditor(previewModalClip);
                handleClosePreviewModal();
              }
            }}
            class="h-9 px-3.5 rounded-lg bg-[#20242A] hover:bg-[#282E36] text-[#E7E9EC] border border-[#292E34] text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer flex-1 sm:flex-none"
          >
            <Scissors class="w-3.5 h-3.5 text-[#B6F36B]" />
            <span>Buka di Editor Lengkap</span>
          </button>

          <button
            type="button"
            onclick={() => {
              if (previewModalClip) {
                handleDirectDownload(previewModalClip);
              }
            }}
            class="h-9 px-4 rounded-lg bg-[#B6F36B] hover:bg-[#A5E456] active:bg-[#94D445] text-[#111315] font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md flex-1 sm:flex-none"
          >
            <Download class="w-4 h-4 stroke-[2.4]" />
            <span>⬇️ Unduh Klip Ini (MP4)</span>
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
