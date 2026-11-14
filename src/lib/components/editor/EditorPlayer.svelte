<script lang="ts">
  import type { ClipCandidate } from '#lib/types';
  import { workspace } from '#lib/state/workspace.svelte';
  import { formatTimecode } from '#lib/utils/clippingRules';
  import { onDestroy, onMount } from 'svelte';

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

  let animFrameId: number | null = null;
  let lastTime = performance.now();

  // Pre-calculated static audio visualizer heights to eliminate runtime Math.random() in 60fps renders
  const VISUALIZER_BARS = [24, 45, 68, 85, 92, 70, 54, 38, 72, 88, 64, 35];

  // Active caption segment based on currentTime
  const currentSegment = $derived(
    clip.captions.find((c) => currentTime >= c.start && currentTime <= c.end) || clip.captions[0]
  );

  $effect(() => {
    // When clip changes, reset playhead
    currentTime = clip.startTime;
    isPlaying = false;
  });

  $effect(() => {
    if (isPlaying) {
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
</script>

<div class="flex-1 bg-[#0D0F11] flex flex-col items-center justify-center p-4 relative overflow-hidden select-none">
  <!-- Canvas Wrapper -->
  <div
    class="relative rounded-lg overflow-hidden shadow-2xl border border-[#292E34] bg-[#16181B] transition-all flex items-center justify-center {clip.aspectRatio ===
    '9:16'
      ? 'h-[460px] w-[258px]'
      : clip.aspectRatio === '1:1'
        ? 'h-[420px] w-[420px]'
        : 'h-[320px] w-[568px]'}"
  >
    <!-- Simulated Video Frame with Dynamic Pan & Zoom -->
    <div
      class="absolute inset-0 bg-gradient-to-b from-[#1C2026] via-[#16191E] to-[#121418] flex items-center justify-center transition-transform duration-75 overflow-hidden"
      style="transform: translateX({clip.panOffset}%) scale({clip.zoomLevel});"
    >
      <!-- Speaker Silhouette / Studio Light Backdrop -->
      <div class="relative w-full h-full flex flex-col items-center justify-center">
        {#if workspace.activeVideo?.thumbnailUrl}
          <img
            src={workspace.activeVideo.thumbnailUrl}
            alt="YouTube Video Frame"
            class="absolute inset-0 w-full h-full object-cover opacity-70 filter brightness-90"
          />
          <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/60"></div>
        {/if}

        <div
          class="w-20 h-20 rounded-full bg-[#20242A]/90 border border-[#292E34] flex items-center justify-center text-[#B6F36B]/60 shadow-xl relative z-10 backdrop-blur-xs"
        >
          <div class="w-12 h-12 rounded-full bg-[#292E34]/80 flex items-center justify-center">
            <span class="text-xs font-mono text-[#E7E9EC] font-semibold">
              {clip.speaker
                .split(' ')
                .map((n) => n[0])
                .join('')}
            </span>
          </div>
        </div>

        <div class="mt-2 text-center relative z-10">
          <div class="text-xs font-semibold text-[#E7E9EC] drop-shadow-md">{clip.speaker}</div>
          <div class="text-[10px] text-[#9299A3] font-mono drop-shadow-md">
            PCM STEREO · {formatTimecode(currentTime, true)}
          </div>
        </div>

        <!-- Simulated Audio Visualizer Arc -->
        <div class="absolute bottom-6 flex items-end gap-1 opacity-70 z-10">
          {#each VISUALIZER_BARS as bar, i (i)}
            {@const heightFactor = isPlaying ? ((i * 17 + Math.floor(currentTime * 10)) % 10) / 10 : 0.2}
            <div
              class="w-1 bg-[#B6F36B] rounded-t transition-all duration-75"
              style="height: {Math.max(4, Math.round(bar * heightFactor))}px"
            ></div>
          {/each}
        </div>
      </div>
    </div>

    <!-- Rule of Thirds Grid Overlay -->
    {#if showGrid}
      <div
        class="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 border border-[#B6F36B]/20"
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

    <!-- Social Platform Safe Zone Guides (TikTok / Reels UI Overlay) -->
    {#if showSafeZones && clip.aspectRatio === '9:16'}
      <div class="absolute inset-0 pointer-events-none flex flex-col justify-between p-3">
        <!-- Top header safe zone -->
        <div
          class="text-[9px] text-[#626871] font-mono border-b border-dashed border-[#626871]/40 pb-1"
        >
          Top Header Safe Zone (Reels / TikTok)
        </div>

        <!-- Right side engagement buttons simulator -->
        <div class="absolute right-2.5 bottom-16 flex flex-col gap-3 items-center opacity-40">
          <div class="w-6 h-6 rounded-full bg-white/20 border border-white/30"></div>
          <div class="w-6 h-6 rounded-full bg-white/20 border border-white/30"></div>
          <div class="w-6 h-6 rounded-full bg-white/20 border border-white/30"></div>
          <div class="w-5 h-5 rounded-full bg-[#B6F36B]/40"></div>
        </div>

        <!-- Bottom title & sound safe zone -->
        <div
          class="text-[9px] text-[#626871] font-mono border-t border-dashed border-[#626871]/40 pt-1"
        >
          Bottom Title & Audio Track Margin
        </div>
      </div>
    {/if}

    <!-- Dynamic Real-Time Captions Overlay -->
    <div class="absolute bottom-16 inset-x-3 pointer-events-none text-center">
      {#if clip.captionPreset === 'hormozi'}
        <div
          class="inline-block px-2.5 py-1.5 font-bold tracking-tight text-xs sm:text-sm uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] max-w-full break-words"
        >
          {#if currentSegment?.words}
            {#each currentSegment.words as w, idx (idx)}
              {@const isActive = currentTime >= w.start && currentTime <= w.end}
              <span
                style="color: {isActive ? highlightColor : '#FFFFFF'}"
                class="mr-1 transition-all {isActive
                  ? 'scale-110 inline-block font-extrabold'
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
          class="inline-block px-2.5 py-1 text-xs font-medium text-[#E7E9EC] bg-black/60 rounded backdrop-blur-sm max-w-[90%] break-words"
        >
          {currentSegment?.text}
        </div>
      {:else if clip.captionPreset === 'karaoke'}
        <div
          class="inline-block px-3 py-1 text-xs sm:text-sm font-semibold tracking-wide max-w-full break-words"
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
                    : 'rgba(255,255,255,0.4)'}"
                class="mr-1 {isCurrent ? 'underline' : ''}"
              >
                {w.word}{' '}
              </span>
            {/each}
          {:else}
            <span class="text-white">{currentSegment?.text}</span>
          {/if}
        </div>
      {:else}
        <!-- Subtle Dark Box -->
        <div
          class="inline-block px-3 py-1.5 text-xs font-semibold text-white bg-[#111315] border border-[#292E34] rounded max-w-[90%] break-words"
        >
          {currentSegment?.text}
        </div>
      {/if}
    </div>
  </div>
</div>
