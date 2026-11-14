<script lang="ts">
  import type { ClipCandidate } from '#lib/types';
  import { workspace } from '#lib/state/workspace.svelte';
  import { formatTimecode } from '#lib/utils/clippingRules';
  import { onDestroy, onMount } from 'svelte';
  import {
    Play,
    Pause,
    RotateCcw,
    Smartphone,
    Maximize2,
    Volume2,
    VolumeX,
    Sparkles,
    RotateCw,
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

  // Mode framing: 'vertical' (Crop 9:16 Vertikal) vs 'landscape' (16:9 Layar Penuh)
  let viewLayout = $state<'vertical' | 'landscape'>('vertical');

  // Suara & Volume
  let isMuted = $state(false);
  let volume = $state(100);

  // Offset manual untuk kalibrasi sinkronisasi subtitle (-3.0s s/d +3.0s)
  let subtitleOffset = $state(0);

  let iframeRef: HTMLIFrameElement | null = $state(null);
  let isYtBuffering = $state(false);
  let lastServerTime = 0;
  let lastSyncTimestamp = performance.now();
  let animFrameId: number | null = null;

  // Extract pure YouTube video ID
  const youtubeVideoId = $derived(
    workspace.activeVideo?.id?.replace(/^yt-/, '') || 'wsCBMCa_DBA'
  );

  // Waktu efektif subtitle setelah ditambahkan offset kalibrasi
  const effectiveTime = $derived(currentTime + subtitleOffset);

  // Active caption segment based on effectiveTime
  const currentSegment = $derived(
    clip.captions.find((c) => effectiveTime >= c.start && effectiveTime <= c.end) || clip.captions[0]
  );

  // Source URL untuk video YouTube embed
  const embedUrl = $derived(
    `https://www.youtube-nocookie.com/embed/${youtubeVideoId}?start=${Math.floor(clip.startTime)}&end=${Math.ceil(clip.endTime)}&autoplay=1&mute=${isMuted ? 1 : 0}&controls=1&loop=1&playlist=${youtubeVideoId}&playsinline=1&enablejsapi=1&rel=0`
  );

  function sendIframeCommand(func: string, args: any = '') {
    if (iframeRef && iframeRef.contentWindow) {
      iframeRef.contentWindow.postMessage(
        JSON.stringify({
          event: 'command',
          func,
          args: args === undefined ? '' : args,
        }),
        '*'
      );
    }
  }

  export function enableSound() {
    isMuted = false;
    volume = 100;
    sendIframeCommand('unMute', '');
    sendIframeCommand('setVolume', [100]);
    sendIframeCommand('playVideo', '');
  }

  function setVolumeLevel(val: number) {
    volume = val;
    if (val === 0) {
      isMuted = true;
      sendIframeCommand('mute', '');
    } else {
      isMuted = false;
      sendIframeCommand('unMute', '');
      sendIframeCommand('setVolume', [val]);
    }
  }

  function toggleMute() {
    if (isMuted) {
      enableSound();
    } else {
      isMuted = true;
      sendIframeCommand('mute', '');
    }
  }

  // Sinkronisasi Real-Time dengan YouTube Iframe API via PostMessage
  onMount(() => {
    const handleMessage = (e: MessageEvent) => {
      if (!e.origin.includes('youtube')) return;
      try {
        const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if (data && data.event === 'infoDelivery' && data.info) {
          // Detik video langsung dari pemutar YouTube internal
          if (typeof data.info.currentTime === 'number') {
            const ytTime = data.info.currentTime;
            lastServerTime = ytTime;
            lastSyncTimestamp = performance.now();
            currentTime = ytTime;
          }

          // Player state: 1 = Playing, 2 = Paused, 3 = Buffering, 0 = Ended
          if (typeof data.info.playerState === 'number') {
            if (data.info.playerState === 1) {
              isPlaying = true;
              isYtBuffering = false;
            } else if (data.info.playerState === 3) {
              isYtBuffering = true;
            } else if (data.info.playerState === 2) {
              isPlaying = false;
              isYtBuffering = false;
            } else if (data.info.playerState === 0) {
              restartClip();
            }
          }
        }
      } catch (err) {
        // Non-JSON message from external extensions, ignore safely
      }
    };

    window.addEventListener('message', handleMessage);

    // Initial handshake ke YouTube iframe agar mulai mengirim timecode infoDelivery
    const initInterval = setInterval(() => {
      if (iframeRef && iframeRef.contentWindow) {
        iframeRef.contentWindow.postMessage(
          JSON.stringify({
            event: 'listening',
            id: 1,
            channel: 'widget',
          }),
          '*'
        );
      }
    }, 800);

    return () => {
      window.removeEventListener('message', handleMessage);
      clearInterval(initInterval);
    };
  });

  $effect(() => {
    // When clip changes, reset playhead
    currentTime = clip.startTime;
    lastServerTime = clip.startTime;
    lastSyncTimestamp = performance.now();
    isPlaying = true;
  });

  $effect(() => {
    if (isPlaying && !isYtBuffering) {
      sendIframeCommand('playVideo', '');
      const tick = () => {
        // Smooth interpolation between YouTube 250ms pings
        if (lastServerTime > 0) {
          const delta = (performance.now() - lastSyncTimestamp) / 1000;
          const estimated = lastServerTime + delta;
          if (estimated >= clip.endTime) {
            restartClip();
            return;
          } else {
            currentTime = estimated;
          }
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
    sendIframeCommand(isPlaying ? 'playVideo' : 'pauseVideo', '');
    if (isPlaying && !isMuted) {
      sendIframeCommand('unMute', '');
      sendIframeCommand('setVolume', [volume]);
    }
  }

  function restartClip() {
    currentTime = clip.startTime;
    lastServerTime = clip.startTime;
    lastSyncTimestamp = performance.now();
    isPlaying = true;
    sendIframeCommand('seekTo', [clip.startTime, true]);
    sendIframeCommand('playVideo', '');
    if (!isMuted) {
      sendIframeCommand('unMute', '');
      sendIframeCommand('setVolume', [volume]);
    }
  }

  function handleIframeLoad() {
    if (!isMuted) {
      setTimeout(() => {
        sendIframeCommand('unMute', '');
        sendIframeCommand('setVolume', [volume]);
      }, 400);
    }
  }
</script>

<div class="flex-1 bg-[#0D0F11] flex flex-col items-center justify-between p-4 relative overflow-hidden select-none">
  <!-- Top Bar: Layout Switcher, Audio Controls & Subtitle Calibration Tool -->
  <div class="flex flex-wrap items-center justify-center gap-2 mb-2 z-20">
    <!-- Layout Switcher -->
    <div class="flex items-center p-0.5 bg-[#191C20] rounded-lg border border-[#292E34]">
      <button
        type="button"
        onclick={() => (viewLayout = 'vertical')}
        class="h-7 px-3 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer {viewLayout === 'vertical'
          ? 'bg-[#20242A] text-[#B6F36B] shadow-sm'
          : 'text-[#9299A3] hover:text-[#E7E9EC]'}"
      >
        <Smartphone class="w-3.5 h-3.5" />
        <span>📱 Crop 9:16 Vertikal</span>
      </button>

      <button
        type="button"
        onclick={() => (viewLayout = 'landscape')}
        class="h-7 px-3 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer {viewLayout === 'landscape'
          ? 'bg-[#20242A] text-[#B6F36B] shadow-sm'
          : 'text-[#9299A3] hover:text-[#E7E9EC]'}"
      >
        <Maximize2 class="w-3.5 h-3.5" />
        <span>🎬 Format Asli 16:9</span>
      </button>
    </div>

    <!-- Kalibrasi Sinkronisasi Subtitle Manual -->
    <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#191C20] border border-[#292E34] text-xs">
      <span class="text-[#9299A3] flex items-center gap-1 font-medium">
        <Sparkles class="w-3.5 h-3.5 text-[#B6F36B]" />
        <span>Sinkronisasi:</span>
      </span>
      <button
        type="button"
        onclick={() => (subtitleOffset = Math.round((subtitleOffset - 0.5) * 10) / 10)}
        class="px-1.5 py-0.5 rounded bg-[#20242A] hover:bg-[#282E36] text-[#E7E9EC] font-mono text-[11px] cursor-pointer"
        title="Teks muncul 0.5 detik lebih cepat"
      >
        -0.5s
      </button>
      <span class="font-mono text-[#B6F36B] font-bold min-w-[32px] text-center">
        {subtitleOffset > 0 ? `+${subtitleOffset.toFixed(1)}` : subtitleOffset.toFixed(1)}s
      </span>
      <button
        type="button"
        onclick={() => (subtitleOffset = Math.round((subtitleOffset + 0.5) * 10) / 10)}
        class="px-1.5 py-0.5 rounded bg-[#20242A] hover:bg-[#282E36] text-[#E7E9EC] font-mono text-[11px] cursor-pointer"
        title="Teks muncul 0.5 detik lebih lambat"
      >
        +0.5s
      </button>
      {#if subtitleOffset !== 0}
        <button
          type="button"
          onclick={() => (subtitleOffset = 0)}
          class="text-[10px] text-[#9299A3] hover:text-[#E7E9EC] underline ml-1 cursor-pointer"
        >
          Reset
        </button>
      {/if}
    </div>

    <!-- Kontrol Suara & Volume Slider -->
    <div class="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#191C20] border border-[#292E34]">
      <button
        type="button"
        onclick={toggleMute}
        class="text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer {isMuted
          ? 'text-[#F59E0B] hover:text-[#FBBF24]'
          : 'text-[#B6F36B]'}"
        title={isMuted ? 'Suara mati. Klik untuk menyalakan audio' : 'Suara aktif. Klik untuk mematikan audio'}
      >
        {#if isMuted}
          <VolumeX class="w-4 h-4" />
          <span>Bisu</span>
        {:else}
          <Volume2 class="w-4 h-4" />
          <span>Suara ({volume}%)</span>
        {/if}
      </button>

      <input
        type="range"
        min="0"
        max="100"
        step="5"
        value={isMuted ? 0 : volume}
        oninput={(e) => {
          const val = parseInt((e.target as HTMLInputElement).value);
          setVolumeLevel(val);
        }}
        class="w-14 sm:w-16 accent-[#B6F36B] bg-[#292E34] h-1.5 rounded-lg cursor-pointer"
        title="Atur Volume Suara"
      />
    </div>
  </div>

  <!-- Stage Canvas Wrapper -->
  <div class="flex-1 flex items-center justify-center w-full min-h-0 relative">
    <!-- PONSLE CONTAINER DENGAN VIDEO BERGERAK AKTIF -->
    <div
      class="relative rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.85)] border-2 border-[#292E34] bg-black transition-all flex items-center justify-center {viewLayout ===
      'vertical'
        ? clip.aspectRatio === '9:16'
          ? 'h-[470px] w-[264px]'
          : clip.aspectRatio === '1:1'
            ? 'h-[420px] w-[420px]'
            : 'h-[320px] w-[568px]'
        : 'h-[350px] w-[622px]'}"
    >
      <!-- BANNER BANTUAN AKTIFKAN SUARA JIKA BROWSER MEMBLOKIR AUTOPLAY AUDIO -->
      {#if isMuted}
        <button
          type="button"
          onclick={enableSound}
          class="absolute top-14 inset-x-4 z-40 py-2.5 px-3 rounded-xl bg-[#B6F36B] hover:bg-[#A5E456] text-[#111315] font-black text-xs flex items-center justify-center gap-2 shadow-2xl transition-all cursor-pointer ring-4 ring-[#B6F36B]/30 animate-pulse"
        >
          <Volume2 class="w-4 h-4 stroke-[2.5]" />
          <span>🔊 KLIK DI SINI UNTUK NYALAKAN SUARA</span>
        </button>
      {/if}

      <!-- LAYER 1: VIDEO YOUTUBE BERGERAK ASLI DI DALAM CROP CONTAINER -->
      <div class="absolute inset-0 overflow-hidden flex items-center justify-center bg-black">
        <iframe
          bind:this={iframeRef}
          src={embedUrl}
          onload={handleIframeLoad}
          title="Video Klip: {clip.title}"
          class="absolute {viewLayout === 'landscape' ? 'pointer-events-auto' : 'pointer-events-none'} transition-transform duration-100"
          style="
            height: 100%;
            width: {viewLayout === 'vertical' && clip.aspectRatio === '9:16' ? '325%' : viewLayout === 'vertical' && clip.aspectRatio === '1:1' ? '180%' : '100%'};
            min-width: {viewLayout === 'vertical' && clip.aspectRatio === '9:16' ? '325%' : viewLayout === 'vertical' && clip.aspectRatio === '1:1' ? '180%' : '100%'};
            max-width: none;
            left: calc(50% + {clip.panOffset}%);
            top: 50%;
            transform: translate(-50%, -50%) scale({clip.zoomLevel});
          "
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        ></iframe>

        <!-- Fallback Poster jika iframe lambat termuat -->
        {#if workspace.activeVideo?.thumbnailUrl}
          <img
            src={workspace.activeVideo.thumbnailUrl}
            alt="Preview Thumbnail"
            class="absolute inset-0 w-full h-full object-cover filter brightness-90 -z-10"
          />
        {/if}

        <!-- Gradient Ambient Vignette agar teks subtitle selalu kontras & terbaca -->
        <div class="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/40 pointer-events-none z-10"></div>
      </div>

      <!-- LAYER 2: WATERMARK HASIL EDITAN DI POJOK ATAS -->
      <div class="absolute top-3.5 left-3.5 z-20 pointer-events-none">
        <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-[10px] font-semibold text-white shadow-lg">
          <span class="w-1.5 h-1.5 rounded-full bg-[#B6F36B] animate-pulse"></span>
          <span>@{workspace.activeVideo?.title?.slice(0, 16) || 'kroma_clip'}</span>
        </div>
      </div>

      <div class="absolute top-3.5 right-3.5 z-20 pointer-events-none">
        <span class="text-[9px] font-mono font-bold text-[#B6F36B] bg-black/80 px-2 py-0.5 rounded-md border border-[#B6F36B]/40 tracking-wider shadow-md">
          KROMA CLIP
        </span>
      </div>

      <!-- LAYER 3: GRID (RULE OF THIRDS) -->
      {#if showGrid}
        <div class="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 border border-[#B6F36B]/20 z-15">
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

      <!-- LAYER 4: SAFE ZONES OVERLAY (TIKTOK/REELS/SHORTS) -->
      {#if showSafeZones && clip.aspectRatio === '9:16' && viewLayout === 'vertical'}
        <div class="absolute inset-0 pointer-events-none flex flex-col justify-between p-3.5 z-15">
          <div class="text-[9px] text-white/60 font-mono border-b border-dashed border-white/25 pb-1">
            Batas Atas Aman (Reels / TikTok / Shorts)
          </div>

          <div class="absolute right-2.5 bottom-16 flex flex-col gap-2.5 items-center opacity-40">
            <div class="w-6 h-6 rounded-full bg-white/20 border border-white/30"></div>
            <div class="w-6 h-6 rounded-full bg-white/20 border border-white/30"></div>
            <div class="w-6 h-6 rounded-full bg-white/20 border border-white/30"></div>
            <div class="w-5 h-5 rounded-full bg-[#B6F36B]/50"></div>
          </div>

          <div class="text-[9px] text-white/60 font-mono border-t border-dashed border-white/25 pt-1">
            Batas Bawah Judul & Audio Asli
          </div>
        </div>
      {/if}

      <!-- LAYER 5: 10 PILIHAN GAYA SUBTITLE DINAMIS (KINETIC CAPTIONS) -->
      <div class="absolute bottom-14 inset-x-3 pointer-events-none text-center z-25">
        {#if clip.captionPreset === 'hormozi'}
          <!-- 1. HORMOZI POP: Extra Bold, Uppercase, Scale & Pop per kata -->
          <div class="inline-block px-3 py-1.5 font-black tracking-tight text-xs sm:text-sm uppercase drop-shadow-[0_4px_8px_rgba(0,0,0,0.95)] max-w-full break-words leading-tight">
            {#if currentSegment?.words}
              {#each currentSegment.words as w, idx (idx)}
                {@const isActive = effectiveTime >= w.start && effectiveTime <= w.end}
                <span
                  style="color: {isActive ? highlightColor : '#FFFFFF'}; -webkit-text-stroke: {isActive ? '1px black' : '0.5px rgba(0,0,0,0.8)'};"
                  class="mr-1 inline-block transition-transform duration-75 {isActive ? 'scale-120 font-black' : 'text-white font-extrabold'}"
                >
                  {w.word}
                </span>
              {/each}
            {:else}
              <span style="color: {highlightColor}">{currentSegment?.text}</span>
            {/if}
          </div>

        {:else if clip.captionPreset === 'mrbeast'}
          <!-- 2. MRBEAST ENERGY: Italic Black, kata aktif dibungkus badge warna -->
          <div class="inline-flex flex-wrap items-center justify-center gap-1 px-3 py-1.5 font-black italic uppercase text-xs sm:text-sm tracking-wide drop-shadow-[0_4px_8px_rgba(0,0,0,0.95)] max-w-full">
            {#if currentSegment?.words}
              {#each currentSegment.words as w, idx (idx)}
                {@const isActive = effectiveTime >= w.start && effectiveTime <= w.end}
                {#if isActive}
                  <span
                    style="background-color: {highlightColor};"
                    class="text-black px-2 py-0.5 rounded-md shadow-xl scale-115 -rotate-2 font-black inline-block"
                  >
                    {w.word}
                  </span>
                {:else}
                  <span class="text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                    {w.word}
                  </span>
                {/if}
              {/each}
            {:else}
              <span class="bg-yellow-400 text-black px-2 py-0.5 rounded -rotate-2">{currentSegment?.text}</span>
            {/if}
          </div>

        {:else if clip.captionPreset === 'ali_abdaal' || clip.captionPreset === 'minimal'}
          <!-- 3. ALI ABDAAL: Frosted-glass pill badge, elegan modern -->
          <div class="inline-block px-4 py-2 bg-black/80 backdrop-blur-md rounded-full border border-white/20 shadow-xl max-w-[92%]">
            <div class="text-xs sm:text-[13px] font-semibold text-white/95 tracking-normal leading-relaxed">
              {#if currentSegment?.words}
                {#each currentSegment.words as w, idx (idx)}
                  {@const isActive = effectiveTime >= w.start && effectiveTime <= w.end}
                  <span
                    style="color: {isActive ? highlightColor : 'rgba(255,255,255,0.85)'};"
                    class="mr-1 transition-colors {isActive ? 'font-bold underline underline-offset-4 decoration-2' : ''}"
                  >
                    {w.word}
                  </span>
                {/each}
              {:else}
                {currentSegment?.text}
              {/if}
            </div>
          </div>

        {:else if clip.captionPreset === 'karaoke'}
          <!-- 4. KARAOKE GLOW: Mengalir dengan teks bercahaya -->
          <div class="inline-block px-3 py-1 text-xs sm:text-sm font-bold tracking-wide max-w-full break-words drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]">
            {#if currentSegment?.words}
              {#each currentSegment.words as w, idx (idx)}
                {@const isPast = effectiveTime >= w.end}
                {@const isCurrent = effectiveTime >= w.start && effectiveTime <= w.end}
                <span
                  style="color: {isCurrent ? highlightColor : isPast ? '#FFFFFF' : 'rgba(255,255,255,0.4)'}; text-shadow: {isCurrent ? `0 0 12px ${highlightColor}` : 'none'};"
                  class="mr-1 inline-block transition-all {isCurrent ? 'scale-115 underline font-black' : ''}"
                >
                  {w.word}
                </span>
              {/each}
            {:else}
              <span class="text-white">{currentSegment?.text}</span>
            {/if}
          </div>

        {:else if clip.captionPreset === 'neon_glow'}
          <!-- 5. NEON CYBER: Pendar tabung neon elektrik -->
          <div class="inline-block px-3 py-1 font-extrabold uppercase tracking-wider text-xs sm:text-sm max-w-full">
            {#if currentSegment?.words}
              {#each currentSegment.words as w, idx (idx)}
                {@const isActive = effectiveTime >= w.start && effectiveTime <= w.end}
                <span
                  style="
                    color: {isActive ? '#FFFFFF' : 'rgba(255,255,255,0.6)'};
                    text-shadow: {isActive ? `0 0 8px ${highlightColor}, 0 0 18px ${highlightColor}, 0 0 32px ${highlightColor}` : '0 1px 3px rgba(0,0,0,0.9)'};
                  "
                  class="mr-1 inline-block transition-all {isActive ? 'scale-120 font-black' : ''}"
                >
                  {w.word}
                </span>
              {/each}
            {:else}
              <span style="text-shadow: 0 0 14px {highlightColor};">{currentSegment?.text}</span>
            {/if}
          </div>

        {:else if clip.captionPreset === 'vox_box'}
          <!-- 6. VOX / MEDIA BOX: Blok kontras solid hitam-kuning/hijau -->
          <div class="inline-flex flex-wrap items-center justify-center gap-1 max-w-full">
            {#if currentSegment?.words}
              {#each currentSegment.words as w, idx (idx)}
                {@const isActive = effectiveTime >= w.start && effectiveTime <= w.end}
                <span
                  style="
                    background-color: {isActive ? highlightColor : '#000000'};
                    color: {isActive ? '#000000' : '#FFFFFF'};
                  "
                  class="px-2 py-0.5 text-xs font-black uppercase tracking-tight shadow-md border border-black/40 {isActive ? 'scale-110 shadow-lg' : ''}"
                >
                  {w.word}
                </span>
              {/each}
            {:else}
              <span class="bg-black text-white px-2 py-1 text-xs font-bold">{currentSegment?.text}</span>
            {/if}
          </div>

        {:else if clip.captionPreset === 'cinematic'}
          <!-- 7. CINEMATIC MINIMAL: Huruf tipis berjarak lebar, elegan -->
          <div class="inline-block px-3 py-1 max-w-[90%] text-center">
            <div class="text-[11px] sm:text-xs font-medium tracking-widest uppercase text-white/95 drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] leading-relaxed">
              {#if currentSegment?.words}
                {#each currentSegment.words as w, idx (idx)}
                  {@const isActive = effectiveTime >= w.start && effectiveTime <= w.end}
                  <span
                    style="color: {isActive ? highlightColor : '#FFFFFF'};"
                    class="mr-1 transition-all {isActive ? 'font-bold' : ''}"
                  >
                    {w.word}
                  </span>
                {/each}
              {:else}
                {currentSegment?.text}
              {/if}
            </div>
          </div>

        {:else if clip.captionPreset === 'typewriter'}
          <!-- 8. TYPEWRITER / TERMINAL: Monospace dengan kursor kedip -->
          <div class="inline-flex items-center gap-1 px-3.5 py-1.5 bg-[#0D0F11]/90 border border-[#292E34] rounded-md font-mono text-xs shadow-xl max-w-[92%]">
            <span class="text-[#B6F36B] font-bold">&gt;</span>
            <span class="text-white font-semibold">
              {#if currentSegment?.words}
                {#each currentSegment.words as w, idx (idx)}
                  {@const isActive = effectiveTime >= w.start && effectiveTime <= w.end}
                  <span style="color: {isActive ? highlightColor : '#E7E9EC'};" class="mr-1 {isActive ? 'font-bold underline' : ''}">
                    {w.word}
                  </span>
                {/each}
              {:else}
                {currentSegment?.text}
              {/if}
            </span>
            <span class="w-1.5 h-3 bg-[#B6F36B] inline-block animate-pulse ml-0.5"></span>
          </div>

        {:else if clip.captionPreset === 'fire_gradient'}
          <!-- 9. FIRE HYPE: Gradasi api menyala saat kata ditekankan -->
          <div class="inline-block px-3 py-1.5 font-black uppercase text-xs sm:text-sm drop-shadow-[0_3px_6px_rgba(0,0,0,0.95)] max-w-full">
            {#if currentSegment?.words}
              {#each currentSegment.words as w, idx (idx)}
                {@const isActive = effectiveTime >= w.start && effectiveTime <= w.end}
                {#if isActive}
                  <span class="mr-1 inline-block bg-gradient-to-r from-yellow-300 via-amber-400 to-red-500 bg-clip-text text-transparent font-black scale-120 drop-shadow-md">
                    🔥 {w.word}
                  </span>
                {:else}
                  <span class="mr-1 inline-block text-white font-extrabold">
                    {w.word}
                  </span>
                {/if}
              {/each}
            {:else}
              <span class="text-amber-400 font-black">{currentSegment?.text}</span>
            {/if}
          </div>

        {:else}
          <!-- 10. SUBTLE BOX: Kotak gelap kontras standar -->
          <div class="inline-block px-3 py-1.5 text-xs font-semibold text-white bg-[#111315]/90 border border-[#292E34] rounded-lg max-w-[90%] break-words shadow-lg">
            {currentSegment?.text}
          </div>
        {/if}
      </div>

      <!-- LAYER 6: INTERAKSI KLIK PLAY / PAUSE PADA LAYAR -->
      {#if viewLayout === 'vertical'}
        <button
          type="button"
          onclick={() => {
            if (isMuted) {
              enableSound();
            } else {
              togglePlay();
            }
          }}
          class="absolute inset-0 w-full h-full flex items-center justify-center bg-black/10 hover:bg-black/20 transition-colors z-30 cursor-pointer group"
          aria-label={isPlaying ? 'Jeda Video' : 'Putar Video'}
        >
          {#if !isPlaying}
            <div class="w-14 h-14 rounded-full bg-[#B6F36B] text-[#111315] flex items-center justify-center shadow-2xl transition-transform group-hover:scale-110">
              <Play class="w-7 h-7 fill-current ml-0.5" />
            </div>
          {/if}
        </button>
      {/if}
    </div>
  </div>

  <!-- Bottom Floating Transport Controls -->
  <div class="flex items-center gap-3 mt-3 px-4 py-2 rounded-xl bg-[#191C20] border border-[#292E34] shadow-lg z-20">
    <button
      type="button"
      onclick={togglePlay}
      class="h-8 px-3.5 rounded-lg bg-[#B6F36B] hover:bg-[#A5E456] active:bg-[#94D445] text-[#111315] font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
    >
      {#if isPlaying}
        <Pause class="w-3.5 h-3.5 fill-current" />
        <span>Jeda</span>
      {:else}
        <Play class="w-3.5 h-3.5 fill-current" />
        <span>Putar</span>
      {/if}
    </button>

    <button
      type="button"
      onclick={restartClip}
      class="h-8 px-2.5 rounded-lg bg-[#20242A] hover:bg-[#282E36] text-[#9299A3] hover:text-[#E7E9EC] border border-[#292E34] text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
      title="Ulangi dari detik awal klip"
    >
      <RotateCcw class="w-3 h-3" />
      <span>Ulangi</span>
    </button>

    <div class="h-4 w-px bg-[#292E34]"></div>

    <!-- Timecode Display -->
    <div class="text-xs font-mono tabular-nums text-[#E7E9EC] flex items-center gap-1.5">
      <span class="text-[#B6F36B] font-bold">{formatTimecode(currentTime, false)}</span>
      <span class="text-[#626871]">/</span>
      <span class="text-[#9299A3]">{formatTimecode(clip.endTime, false)}</span>
    </div>
  </div>
</div>
