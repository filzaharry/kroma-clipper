<script lang="ts">
  import type { ClipCandidate } from '#lib/types';
  import { workspace } from '#lib/state/workspace.svelte';
  import { formatTimecode } from '#lib/utils/clippingRules';
  import { onDestroy } from 'svelte';
  import {
    Play,
    Pause,
    RotateCcw,
    Sparkles,
    Smartphone,
    Video,
    ShieldAlert,
    Grid,
    Volume2,
    Check,
  } from 'lucide-svelte';

  let {
    clip,
    showSafeZones = true,
    showGrid = false,
    highlightColor = '#B6F36B',
    currentTime = $bindable(0),
    isPlaying = $bindable(false),
  }: {
    clip: ClipCandidate;
    showSafeZones?: boolean;
    showGrid?: boolean;
    highlightColor?: string;
    currentTime?: number;
    isPlaying?: boolean;
  } = $props();

  // Mode preview: 'rendered' (Simulasi 9:16 Vertikal + Subtitle + Watermark) vs 'youtube' (Player YouTube Asli)
  let previewMode = $state<'rendered' | 'youtube'>('rendered');

  let animFrameId: number | null = null;
  let lastTime = performance.now();

  // Pre-calculated static audio visualizer heights to eliminate runtime Math.random() in 60fps renders
  const VISUALIZER_BARS = [24, 45, 68, 85, 92, 70, 54, 38, 72, 88, 64, 35, 52, 78, 60, 40];

  // Active caption segment based on currentTime
  const currentSegment = $derived(
    clip.captions.find((c) => currentTime >= c.start && currentTime <= c.end) || clip.captions[0]
  );

  // Extract pure YouTube video ID
  const youtubeVideoId = $derived(
    workspace.activeVideo?.id?.replace(/^yt-/, '') || 'wsCBMCa_DBA'
  );

  $effect(() => {
    // When clip changes, reset playhead
    currentTime = clip.startTime;
    isPlaying = false;
  });

  $effect(() => {
    if (isPlaying && previewMode === 'rendered') {
      lastTime = performance.now();
      const tick = (now: number) => {
        const delta = (now - lastTime) / 1000;
        lastTime = now;

        const next = currentTime + delta;
        if (next >= clip.endTime) {
          currentTime = clip.startTime; // loop back to in-point
        } else {
          currentTime = next;
        }

        animFrameId = requestAnimationFrame(tick);
      };
      animFrameId = requestAnimationFrame(tick);
    } else {
      if (animFrameId) {
        cancelAnimationFrame(animFrameId);
        animFrameId = null;
      }
    }

    return () => {
      if (animFrameId) {
        cancelAnimationFrame(animFrameId);
        animFrameId = null;
      }
    };
  });

  onDestroy(() => {
    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
  });

  function togglePlay() {
    isPlaying = !isPlaying;
  }

  function restartClip() {
    currentTime = clip.startTime;
    isPlaying = true;
  }
</script>

<div class="flex-1 bg-[#0D0F11] flex flex-col items-center justify-between p-4 relative overflow-hidden select-none">
  <!-- Top Preview Mode Selector -->
  <div class="flex items-center gap-2 mb-3 z-20">
    <div class="flex items-center p-0.5 bg-[#191C20] rounded-lg border border-[#292E34]">
      <button
        type="button"
        onclick={() => { previewMode = 'rendered'; isPlaying = true; }}
        class="h-7 px-3 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer {previewMode === 'rendered'
          ? 'bg-[#20242A] text-[#B6F36B] shadow-sm'
          : 'text-[#9299A3] hover:text-[#E7E9EC]'}"
      >
        <Smartphone class="w-3.5 h-3.5" />
        <span>📱 Preview Hasil 9:16 (Subtitle & Watermark)</span>
      </button>

      <button
        type="button"
        onclick={() => { previewMode = 'youtube'; isPlaying = false; }}
        class="h-7 px-3 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer {previewMode === 'youtube'
          ? 'bg-[#20242A] text-[#EF4444] shadow-sm'
          : 'text-[#9299A3] hover:text-[#E7E9EC]'}"
      >
        <Video class="w-3.5 h-3.5" />
        <span>🎬 Player Video YouTube Asli</span>
      </button>
    </div>
  </div>

  <!-- Stage Canvas Wrapper -->
  <div class="flex-1 flex items-center justify-center w-full min-h-0 relative">
    {#if previewMode === 'youtube'}
      <!-- MODE: Player YouTube Asli -->
      <div class="relative w-full max-w-2xl aspect-video rounded-xl overflow-hidden shadow-2xl border border-[#292E34] bg-black">
        <iframe
          src="https://www.youtube-nocookie.com/embed/{youtubeVideoId}?start={Math.floor(clip.startTime)}&end={Math.ceil(clip.endTime)}&autoplay=1&controls=1&rel=0&modestbranding=1"
          title="Pemutar YouTube Asli: {clip.title}"
          class="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen
        ></iframe>

        <div class="absolute top-3 left-3 px-2 py-1 rounded bg-black/80 backdrop-blur-xs border border-white/10 text-[11px] font-mono text-[#E7E9EC] flex items-center gap-1.5 pointer-events-none">
          <span class="w-2 h-2 rounded-full bg-[#EF4444] animate-pulse"></span>
          <span>Potongan: {formatTimecode(clip.startTime, false)} - {formatTimecode(clip.endTime, false)} ({clip.duration}s)</span>
        </div>
      </div>
    {:else}
      <!-- MODE: Preview Hasil 9:16 (Mockup Ponsel + Subtitle + Watermark) -->
      <div
        class="relative rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8)] border-2 border-[#292E34] bg-[#16181B] transition-all flex items-center justify-center {clip.aspectRatio ===
        '9:16'
          ? 'h-[470px] w-[264px]'
          : clip.aspectRatio === '1:1'
            ? 'h-[420px] w-[420px]'
            : 'h-[320px] w-[568px]'}"
      >
        <!-- Background Frame dengan Pan & Zoom -->
        <div
          class="absolute inset-0 bg-[#121418] flex items-center justify-center transition-transform duration-75 overflow-hidden"
          style="transform: translateX({clip.panOffset}%) scale({clip.zoomLevel});"
        >
          {#if workspace.activeVideo?.thumbnailUrl}
            <img
              src={workspace.activeVideo.thumbnailUrl}
              alt="YouTube Video Frame"
              class="absolute inset-0 w-full h-full object-cover filter brightness-90 contrast-105"
            />
            <div class="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/60"></div>
          {/if}

          <!-- Avatar Pembicara Utama -->
          <div class="relative z-10 flex flex-col items-center">
            <div
              class="w-16 h-16 rounded-full bg-[#20242A]/80 border-2 border-[#B6F36B]/60 flex items-center justify-center text-[#B6F36B] shadow-2xl backdrop-blur-md"
            >
              <span class="text-sm font-mono text-[#E7E9EC] font-bold">
                {clip.speaker
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)}
              </span>
            </div>

            <div class="mt-2 text-center">
              <div class="text-xs font-semibold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                {clip.speaker}
              </div>
              <div class="text-[10px] text-[#B6F36B] font-mono drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                {formatTimecode(currentTime, true)}
              </div>
            </div>
          </div>

          <!-- Animated Audio Visualizer Arc -->
          <div class="absolute bottom-6 flex items-end gap-0.5 opacity-80 z-10">
            {#each VISUALIZER_BARS as bar, i (i)}
              {@const heightFactor = isPlaying ? ((i * 13 + Math.floor(currentTime * 12)) % 10) / 10 : 0.25}
              <div
                class="w-1 bg-[#B6F36B] rounded-t transition-all duration-75"
                style="height: {Math.max(4, Math.round(bar * heightFactor * 0.7))}px"
              ></div>
            {/each}
          </div>
        </div>

        <!-- WATERMARK HASIL EDITAN (Branding di Pojok Atas) -->
        <div class="absolute top-3.5 left-3.5 z-20 pointer-events-none">
          <div class="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-[10px] font-semibold text-white shadow-sm">
            <span class="w-1.5 h-1.5 rounded-full bg-[#B6F36B]"></span>
            <span>@{workspace.activeVideo?.title?.slice(0, 15) || 'kroma_clip'}</span>
          </div>
        </div>

        <!-- WATERMARK LOGO DI POJOK KANAN ATAS -->
        <div class="absolute top-3.5 right-3.5 z-20 pointer-events-none">
          <span class="text-[9px] font-mono font-bold text-[#B6F36B] bg-[#111315]/80 px-1.5 py-0.5 rounded border border-[#B6F36B]/30 tracking-wider">
            KROMA
          </span>
        </div>

        <!-- Rule of Thirds Grid Overlay -->
        {#if showGrid}
          <div
            class="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 border border-[#B6F36B]/20 z-15"
          >
            <div class="border-r border-b border-[#B6F36B]/20"></div>
            <div class="border-r border-b border-[#B6F36B]/20"></div>
            <div class="border-b border-[#B6F36B]/20"></div>
            <div class="border-r border-b border-[#B6F36B]/20"></div>
            <div class="border-r border-b border-[#B6F36B]/20"></div>
            <div class="border-b border-[#B6F36B]/20"></div>
            <div class="border-r border-b border-[#B6F36B]/20"></div>
            <div class="border-r border-b border-[#B6F36B]/20"></div>
            <div></div>
          </div>
        {/if}

        <!-- Social Platform Safe Zone Guides (TikTok / Reels / Shorts Overlay) -->
        {#if showSafeZones && clip.aspectRatio === '9:16'}
          <div class="absolute inset-0 pointer-events-none flex flex-col justify-between p-3.5 z-15">
            <!-- Top header safe zone -->
            <div
              class="text-[9px] text-[#9299A3]/80 font-mono border-b border-dashed border-white/20 pb-1"
            >
              Batas Atas (Reels / TikTok / Shorts)
            </div>

            <!-- Right side engagement buttons simulator -->
            <div class="absolute right-2.5 bottom-16 flex flex-col gap-2.5 items-center opacity-40">
              <div class="w-6 h-6 rounded-full bg-white/20 border border-white/30"></div>
              <div class="w-6 h-6 rounded-full bg-white/20 border border-white/30"></div>
              <div class="w-6 h-6 rounded-full bg-white/20 border border-white/30"></div>
              <div class="w-5 h-5 rounded-full bg-[#B6F36B]/50"></div>
            </div>

            <!-- Bottom title safe zone -->
            <div
              class="text-[9px] text-[#9299A3]/80 font-mono border-t border-dashed border-white/20 pt-1"
            >
              Batas Teks Judul & Audio Asli
            </div>
          </div>
        {/if}

        <!-- DYNAMIC REAL-TIME ANIMATED CAPTIONS (SUBTITLE BERGERAK SESUAI DETIK) -->
        <div class="absolute bottom-14 inset-x-3 pointer-events-none text-center z-20">
          {#if clip.captionPreset === 'hormozi'}
            <div
              class="inline-block px-3 py-1.5 font-black tracking-tight text-xs sm:text-sm uppercase drop-shadow-[0_3px_6px_rgba(0,0,0,0.95)] max-w-full break-words leading-snug"
            >
              {#if currentSegment?.words}
                {#each currentSegment.words as w, idx (idx)}
                  {@const isActive = currentTime >= w.start && currentTime <= w.end}
                  <span
                    style="color: {isActive ? highlightColor : '#FFFFFF'}"
                    class="mr-1 transition-transform {isActive
                      ? 'scale-115 inline-block font-extrabold text-stroke'
                      : 'text-white'}"
                  >
                    {w.word}{' '}
                  </span>
                {/each}
              {:else}
                <span style="color: {highlightColor}">{currentSegment?.text}</span>
              {/if}
            </div>
          {:else if clip.captionPreset === 'minimal'}
            <div
              class="inline-block px-3 py-1 text-xs font-semibold text-[#E7E9EC] bg-black/75 rounded-md backdrop-blur-md max-w-[90%] break-words border border-white/10"
            >
              {currentSegment?.text}
            </div>
          {:else if clip.captionPreset === 'karaoke'}
            <div
              class="inline-block px-3 py-1 text-xs sm:text-sm font-bold tracking-wide max-w-full break-words drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]"
            >
              {#if currentSegment?.words}
                {#each currentSegment.words as w, idx (idx)}
                  {@const isPast = currentTime >= w.end}
                  {@const isCurrent = currentTime >= w.start && currentTime <= w.end}
                  <span
                    style="color: {isCurrent
                      ? highlightColor
                      : isPast
                        ? '#FFFFFF'
                        : 'rgba(255,255,255,0.45)'}"
                    class="mr-1 {isCurrent ? 'underline font-extrabold' : ''}"
                  >
                    {w.word}{' '}
                  </span>
                {/each}
              {:else}
                <span class="text-white">{currentSegment?.text}</span>
              {/if}
            </div>
          {:else}
            <!-- Subtle Box -->
            <div
              class="inline-block px-3 py-1.5 text-xs font-semibold text-white bg-[#111315]/90 border border-[#292E34] rounded max-w-[90%] break-words shadow-lg"
            >
              {currentSegment?.text}
            </div>
          {/if}
        </div>

        <!-- Play / Pause Overlay Icon when user clicks on phone -->
        <button
          type="button"
          onclick={togglePlay}
          class="absolute inset-0 w-full h-full flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors z-30 cursor-pointer group"
          aria-label={isPlaying ? 'Jeda Video' : 'Putar Video'}
        >
          {#if !isPlaying}
            <div class="w-12 h-12 rounded-full bg-[#B6F36B] text-[#111315] flex items-center justify-center shadow-2xl transition-transform group-hover:scale-110">
              <Play class="w-6 h-6 fill-current ml-0.5" />
            </div>
          {/if}
        </button>
      </div>
    {/if}
  </div>

  <!-- Bottom Player Floating Transport Controls (Untuk Mode Rendered) -->
  {#if previewMode === 'rendered'}
    <div class="flex items-center gap-3 mt-3 px-4 py-2 rounded-xl bg-[#191C20] border border-[#292E34] shadow-md z-20">
      <button
        type="button"
        onclick={togglePlay}
        class="h-8 px-3 rounded-md bg-[#B6F36B] hover:bg-[#A5E456] text-[#111315] font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
      >
        {#if isPlaying}
          <Pause class="w-3.5 h-3.5 fill-current" />
          <span>Jeda Preview</span>
        {:else}
          <Play class="w-3.5 h-3.5 fill-current" />
          <span>Putar Preview</span>
        {/if}
      </button>

      <button
        type="button"
        onclick={restartClip}
        class="h-8 px-2.5 rounded-md bg-[#20242A] hover:bg-[#282E36] text-[#9299A3] hover:text-[#E7E9EC] border border-[#292E34] text-xs flex items-center gap-1 transition-colors cursor-pointer"
        title="Ulangi dari detik awal klip"
      >
        <RotateCcw class="w-3 h-3" />
        <span>Ulangi</span>
      </button>

      <div class="h-4 w-px bg-[#292E34]"></div>

      <div class="text-xs font-mono tabular-nums text-[#E7E9EC] flex items-center gap-1.5">
        <span class="text-[#B6F36B] font-bold">{formatTimecode(currentTime, false)}</span>
        <span class="text-[#626871]">/</span>
        <span class="text-[#9299A3]">{formatTimecode(clip.endTime, false)}</span>
      </div>
    </div>
  {/if}
</div>
