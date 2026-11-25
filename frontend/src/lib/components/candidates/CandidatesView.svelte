<script lang="ts">
  import { workspace } from '#lib/state/workspace.svelte';
  import { goto } from '$app/navigation';
  import { formatTimecode } from '#lib/utils/clippingRules';
  import type { ClipCandidate } from '#lib/types';
  import {
    Scissors,
    Sparkles,
    Volume2,
    VolumeX,
    Smartphone,
    ArrowRight,
    SquarePlay,
    Play,
    Pause,
    Loader2,
    Flame,
    RotateCcw,
  } from 'lucide-svelte';

  let filterRatio = $state<string>('all');
  let minScoreFilter = $state<number>(0);

  // In-card Preview Playback state
  let playingClipId = $state<string | null>(null);
  let loadingClipId = $state<string | null>(null);
  let previewUrls = $state<Record<string, string>>({});
  let isMuted = $state<boolean>(false);
  let videoElements: Record<string, HTMLVideoElement> = {};

  const filteredCandidates = $derived(
    workspace.candidates.filter((clip) => {
      if (filterRatio !== 'all' && clip.aspectRatio !== filterRatio) return false;
      if (clip.score < minScoreFilter) return false;
      return true;
    })
  );

  function handleOpenEditor(clip: ClipCandidate) {
    if (playingClipId && videoElements[playingClipId]) {
      videoElements[playingClipId].pause();
    }
    workspace.selectClip(clip);
    goto(`/editor?clipId=${clip.id}`);
  }

  function getYoutubeId(clip: ClipCandidate) {
    const rawId = clip.sourceVideoId || workspace.activeVideo?.id || 'wsCBMCa_DBA';
    const cleanId = rawId.replace(/^yt-/, '').replace(/[^a-zA-Z0-9_-]/g, '');
    return cleanId.length === 11 ? cleanId : 'wsCBMCa_DBA';
  }

  function getThumbnailUrl(clip: ClipCandidate) {
    if (workspace.activeVideo?.thumbnailUrl) {
      return workspace.activeVideo.thumbnailUrl;
    }
    const ytId = getYoutubeId(clip);
    return `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`;
  }

  async function handleTogglePlay(clip: ClipCandidate) {
    // Jika klip ini sedang berputar, jeda pemutaran
    if (playingClipId === clip.id) {
      const el = videoElements[clip.id];
      if (el) {
        el.pause();
      }
      playingClipId = null;
      return;
    }

    // Hentikan video lain yang mungkin sedang berputar
    if (playingClipId && videoElements[playingClipId]) {
      videoElements[playingClipId].pause();
    }

    // Jika video preview sudah pernah diunduh/tersedia di cache, langsung putar
    if (previewUrls[clip.id]) {
      playingClipId = clip.id;
      setTimeout(() => {
        const el = videoElements[clip.id];
        if (el) {
          el.muted = isMuted;
          el.currentTime = 0;
          el.play().catch((err) => console.warn('Play error:', err));
        }
      }, 50);
      return;
    }

    // Ambil file preview bersih dari server
    loadingClipId = clip.id;
    try {
      const vId = getYoutubeId(clip);
      const res = await fetch('/api/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: vId,
          startTime: clip.startTime,
          endTime: clip.endTime,
        }),
      });
      const data = await res.json();
      if (data.success && data.url) {
        previewUrls[clip.id] = data.url;
        playingClipId = clip.id;
        setTimeout(() => {
          const el = videoElements[clip.id];
          if (el) {
            el.muted = isMuted;
            el.currentTime = 0;
            el.play().catch((err) => console.warn('Play error:', err));
          }
        }, 50);
      } else {
        alert(data.error || 'Gagal memuat video preview');
      }
    } catch (e: any) {
      console.error('Preview error:', e);
      alert('Gagal memproses video preview: ' + (e.message || 'Koneksi terputus'));
    } finally {
      loadingClipId = null;
    }
  }

  function toggleMute(e: MouseEvent) {
    e.stopPropagation();
    isMuted = !isMuted;
    if (playingClipId && videoElements[playingClipId]) {
      videoElements[playingClipId].muted = isMuted;
    }
  }
</script>

<div class="flex-1 flex flex-col overflow-y-auto bg-[#111315] p-6 lg:p-8">
  <!-- Title & Action Bar -->
  <div class="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
    <div>
      <div class="flex items-center gap-2">
        <h1 class="text-xl font-semibold text-[#E7E9EC] tracking-tight">
          3. Pilihan Klip Viral ({workspace.candidates.length})
        </h1>
        {#if workspace.candidates.length > 0}
          <span class="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#B6F36B]/20 text-[#B6F36B] border border-[#B6F36B]/30">
            {workspace.candidates.length} Klip Siap Diedit
          </span>
        {/if}
      </div>
      <p class="text-xs text-[#9299A3] mt-1">
        Tinjau preview vertikal 9:16 di setiap card, klik play untuk memutar klip langsung, atau buka di Editor untuk menyesuaikan subtitle & framing.
      </p>
    </div>

    <!-- Top Action Bar: Aspect Ratio Filters -->
    {#if workspace.candidates.length > 0}
      <div class="flex items-center p-0.5 bg-[#191C20] rounded-lg border border-[#292E34] self-start md:self-auto">
        <button
          type="button"
          onclick={() => (filterRatio = 'all')}
          class="px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer {filterRatio === 'all'
            ? 'bg-[#20242A] text-[#B6F36B] font-semibold'
            : 'text-[#9299A3] hover:text-[#E7E9EC]'}"
        >
          Semua
        </button>
        <button
          type="button"
          onclick={() => (filterRatio = '9:16')}
          class="px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer {filterRatio === '9:16'
            ? 'bg-[#20242A] text-[#B6F36B] font-semibold'
            : 'text-[#9299A3] hover:text-[#E7E9EC]'}"
        >
          9:16
        </button>
        <button
          type="button"
          onclick={() => (filterRatio = '1:1')}
          class="px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer {filterRatio === '1:1'
            ? 'bg-[#20242A] text-[#B6F36B] font-semibold'
            : 'text-[#9299A3] hover:text-[#E7E9EC]'}"
        >
          1:1
        </button>
      </div>
    {/if}
  </div>

  <!-- Candidate Grid or Empty State -->
  {#if workspace.candidates.length === 0}
    <!-- Empty State -->
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
            class="h-9 px-4 text-xs font-semibold text-[#111315] bg-[#B6F36B] hover:bg-[#A5E456] rounded transition-colors inline-flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <SquarePlay class="w-4 h-4" />
            <span>Masukkan Link YouTube</span>
            <ArrowRight class="w-3.5 h-3.5" />
          </button>
        {:else}
          <button
            type="button"
            onclick={() => {
              workspace.runAnalysis();
              goto('/analysis');
            }}
            class="h-9 px-4 text-xs font-semibold text-[#111315] bg-[#B6F36B] hover:bg-[#A5E456] rounded transition-colors inline-flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <Sparkles class="w-4 h-4 fill-current" />
            <span>Mulai Analisis AI Sekarang</span>
            <ArrowRight class="w-3.5 h-3.5" />
          </button>
        {/if}
      </div>
    </div>
  {:else if filteredCandidates.length === 0}
    <div class="p-8 text-center text-[#9299A3] text-xs bg-[#191C20] rounded-lg border border-[#292E34]">
      Tidak ada klip yang sesuai dengan filter rasio "{filterRatio}".
      <button
        type="button"
        onclick={() => {
          filterRatio = 'all';
          minScoreFilter = 0;
        }}
        class="mt-4 px-3 py-1.5 text-xs font-medium text-[#111315] bg-[#B6F36B] rounded cursor-pointer"
      >
        Reset Filter
      </button>
    </div>
  {:else}
    <!-- VERTICAL PREVIEW VIDEO CARDS GRID (9:16 FORMAT) -->
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5">
      {#each filteredCandidates as clip (clip.id)}
        <div
          class="flex flex-col rounded-2xl bg-[#191C20] border border-[#292E34] hover:border-[#383F47] transition-all overflow-hidden shadow-lg group"
        >
          <!-- 1. Vertical Screen Video Container (Aspect 9:16) -->
          <div class="relative aspect-[9/16] w-full bg-black overflow-hidden rounded-t-2xl flex items-center justify-center select-none">
            <!-- Video Player atau Poster -->
            {#if previewUrls[clip.id]}
              <video
                bind:this={videoElements[clip.id]}
                src={previewUrls[clip.id]}
                playsinline
                loop
                muted={isMuted}
                onended={() => { playingClipId = null; }}
                class="w-full h-full object-cover"
              ></video>
            {:else}
              <img
                src={getThumbnailUrl(clip)}
                alt={clip.title}
                class="w-full h-full object-cover filter brightness-90 group-hover:brightness-95 transition-all"
                loading="lazy"
              />
            {/if}

            <!-- Ambient Gradient Vignette -->
            <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/60 pointer-events-none"></div>

            <!-- Floating Badges: Skor Viral & Durasi -->
            <div class="absolute top-2.5 inset-x-2.5 flex items-center justify-between z-20 pointer-events-none">
              <div class="flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/75 backdrop-blur-md border border-[#B6F36B]/40 text-[11px] font-bold text-[#B6F36B] shadow-sm">
                <Flame class="w-3.5 h-3.5 fill-[#B6F36B]" />
                <span>Skor {clip.score}</span>
              </div>

              <div class="px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-[10px] font-mono font-medium text-[#E7E9EC] border border-white/10 shadow-sm">
                {clip.duration}s
              </div>
            </div>

            <!-- Subtitle Excerpt Box (Gaya Reels/Shorts) -->
            <div class="absolute bottom-12 inset-x-2.5 z-15 pointer-events-none">
              <div class="p-2 rounded-lg bg-black/70 backdrop-blur-sm border border-white/10 text-[11px] text-[#E7E9EC] line-clamp-2 italic text-center shadow-md">
                "{clip.excerptQuote}"
              </div>
            </div>

            <!-- Play / Pause Overlay Button -->
            {#if loadingClipId === clip.id}
              <div class="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/75 backdrop-blur-sm z-30 text-[#E7E9EC]">
                <Loader2 class="w-9 h-9 text-[#B6F36B] animate-spin" />
                <span class="text-xs font-semibold">Memuat preview...</span>
                <span class="text-[10px] text-[#9299A3]">Memotong segmen MP4</span>
              </div>
            {:else}
              <button
                type="button"
                onclick={() => handleTogglePlay(clip)}
                class="absolute inset-0 flex items-center justify-center z-20 cursor-pointer group/btn"
                title={playingClipId === clip.id ? 'Jeda preview' : 'Putar preview video langsung'}
              >
                <div
                  class="w-13 h-13 rounded-full flex items-center justify-center transition-all shadow-xl {playingClipId === clip.id
                    ? 'bg-black/60 text-white opacity-0 group-hover:opacity-100 ring-2 ring-white/20'
                    : 'bg-[#B6F36B] text-[#111315] hover:scale-105 active:scale-95 group-hover/btn:bg-[#A5E456] shadow-[#B6F36B]/20'}"
                >
                  {#if playingClipId === clip.id}
                    <Pause class="w-6 h-6 fill-current" />
                  {:else}
                    <Play class="w-6 h-6 fill-current ml-0.5" />
                  {/if}
                </div>
              </button>
            {/if}

            <!-- Bottom Video Control Bar Saat Playing -->
            {#if playingClipId === clip.id}
              <div class="absolute bottom-2.5 inset-x-2.5 z-30 flex items-center justify-between px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-md border border-[#292E34] text-xs">
                <div class="flex items-center gap-1.5 text-[10px] text-[#B6F36B] font-mono font-semibold">
                  <span class="w-1.5 h-1.5 rounded-full bg-[#B6F36B] animate-ping"></span>
                  <span>MEMUTAR PREVIEW</span>
                </div>

                <button
                  type="button"
                  onclick={toggleMute}
                  class="text-[#E7E9EC] hover:text-[#B6F36B] transition-colors cursor-pointer p-0.5"
                  title={isMuted ? 'Nyalakan suara' : 'Bisukan suara'}
                >
                  {#if isMuted}
                    <VolumeX class="w-3.5 h-3.5 text-[#F59E0B]" />
                  {:else}
                    <Volume2 class="w-3.5 h-3.5 text-[#B6F36B]" />
                  {/if}
                </button>
              </div>
            {/if}
          </div>

          <!-- 2. Bottom Details & Editor Action Button -->
          <div class="p-3.5 flex flex-col gap-2.5 bg-[#191C20] flex-1 justify-between border-t border-[#292E34]">
            <div class="min-w-0">
              <div class="text-xs font-bold text-[#E7E9EC] truncate" title={clip.title}>
                {clip.title}
              </div>

              <div class="flex items-center gap-1.5 text-[11px] text-[#9299A3] mt-1 font-mono">
                <span class="truncate max-w-[100px]">{clip.speaker}</span>
                <span>·</span>
                <span class="text-[#B6F36B]">
                  {formatTimecode(clip.startTime, false)} – {formatTimecode(clip.endTime, false)}
                </span>
              </div>
            </div>

            <!-- Mini Heuristics Bar -->
            <div class="grid grid-cols-3 gap-1.5 text-[10px] font-mono">
              <div class="px-1.5 py-1 rounded bg-[#14171A] border border-[#292E34] text-center flex flex-col items-center">
                <span class="text-[#9299A3]">Hook</span>
                <span class="text-[#E7E9EC] font-bold">{clip.hookScore}%</span>
              </div>
              <div class="px-1.5 py-1 rounded bg-[#14171A] border border-[#292E34] text-center flex flex-col items-center">
                <span class="text-[#9299A3]">Energi</span>
                <span class="text-[#E7E9EC] font-bold">{clip.energyScore}%</span>
              </div>
              <div class="px-1.5 py-1 rounded bg-[#14171A] border border-[#292E34] text-center flex flex-col items-center">
                <span class="text-[#9299A3]">Rasio</span>
                <span class="text-[#B6F36B] font-bold">{clip.aspectRatio}</span>
              </div>
            </div>

            <!-- Action Button: Buka di Editor -->
            <button
              type="button"
              onclick={() => handleOpenEditor(clip)}
              class="w-full h-8.5 rounded-lg bg-[#B6F36B] hover:bg-[#A5E456] active:bg-[#94D445] text-[#111315] font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
              title="Buka pengeditan subtitle, framing, logo & audio di Editor"
            >
              <Scissors class="w-3.5 h-3.5 stroke-[2.2]" />
              <span>Buka di Editor</span>
              <ArrowRight class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
