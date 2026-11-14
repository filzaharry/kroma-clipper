<script lang="ts">
  import type { ClipCandidate, FramingLayout, BackgroundStyle } from '#lib/types';
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
    ShieldCheck,
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

  // Mode Framing: 'crop' (Crop 9:16 Vertikal) vs 'fit_blur' (Format Asli 16:9 Latar Gelap Blur - Gambar 2)
  const isFitBlur = $derived((clip.framingLayout || 'crop') === 'fit_blur');
  const activeBackgroundStyle = $derived(clip.backgroundStyle || 'dark_blur');

  // Toggle panduan visual batas Safe Zone Reels 9:16 (Gambar 3)
  let showSafeZoneOverlay = $state(false);

  // Suara & Volume
  let isMuted = $state(false);
  let volume = $state(100);

  // Offset manual untuk kalibrasi sinkronisasi subtitle (-3.0s s/d +3.0s)
  let subtitleOffset = $state(0);

  let iframeRef: HTMLIFrameElement | null = $state(null);
  let animFrameId: number | null = null;
  let lastFrameTime = 0;
  let lastSentSeek = -1;
  let originHost = $state('http://localhost:3001');

  // Extract pure YouTube video ID
  const youtubeVideoId = $derived(
    clip.sourceVideoId?.replace(/^yt-/, '') ||
      workspace.activeVideo?.id?.replace(/^yt-/, '') ||
      'wsCBMCa_DBA'
  );

  // Waktu efektif subtitle setelah ditambahkan offset kalibrasi
  const effectiveTime = $derived(Math.max(clip.startTime, currentTime + subtitleOffset));

  // Active caption segment based on effectiveTime (dengan proteksi jeda bicara antar kalimat)
  const currentSegment = $derived.by(() => {
    if (!clip.captions || clip.captions.length === 0) return null;
    // 1. Cek kecocokan waktu langsung
    const exact = clip.captions.find((c) => effectiveTime >= c.start && effectiveTime <= c.end);
    if (exact) return exact;

    // 2. Jika di jeda singkat sebelum kalimat berikutnya, pertahankan kalimat sebelumnya
    for (let i = 0; i < clip.captions.length; i++) {
      const c = clip.captions[i];
      if (effectiveTime < c.start) {
        return i > 0 ? clip.captions[i - 1] : c;
      }
    }
    return clip.captions[clip.captions.length - 1];
  });

  // Posisi vertikal caption strictly mematuhi batas Safe Zone Reels 9:16 Gambar 3:
  // - Top: di bawah batas 220px (top: 13%)
  // - Bottom: di atas batas 450px (bottom: 25%) bebas dari tombol interaksi & teks caption akun
  // - Middle: di bawah video 16:9 (top: 68%) pada mode fit_blur agar tidak menutupi wajah pembicara
  const captionPosClass = $derived.by(() => {
    const pos = clip.captionPosition || 'bottom';
    if (pos === 'top') return 'top-[13%] inset-x-4';
    if (pos === 'middle') {
      return isFitBlur ? 'top-[68%] -translate-y-1/2 inset-x-4' : 'top-1/2 -translate-y-1/2 inset-x-4';
    }
    return 'bottom-[25%] inset-x-4';
  });

  // Jendela kata dinamis sesuai batasan baris (1, 2, atau 3 baris)
  const visibleWords = $derived.by(() => {
    if (!currentSegment?.words || currentSegment.words.length === 0) return null;
    const allWords = currentSegment.words;
    const maxLines = clip.captionMaxLines || 2;
    // 1 Baris: ~3 kata
    // 2 Baris: ~6 kata
    // 3 Baris: ~9 kata
    const targetWordCount = maxLines === 1 ? 3 : maxLines === 3 ? 9 : 6;

    if (allWords.length <= targetWordCount) return allWords;

    // Cari kata yang sedang aktif dibicarakan
    let activeIdx = allWords.findIndex((w) => effectiveTime >= w.start && effectiveTime <= w.end);
    if (activeIdx === -1) {
      activeIdx = allWords.findIndex((w) => effectiveTime < w.start);
      activeIdx = activeIdx > 0 ? activeIdx - 1 : 0;
    }

    const leadWords = Math.floor(targetWordCount / 2);
    const startIdx = Math.max(0, Math.min(activeIdx - leadWords, allWords.length - targetWordCount));
    return allWords.slice(startIdx, startIdx + targetWordCount);
  });

  // Kata yang sedang tepat aktif bersuara saat ini
  const activeWord = $derived(
    currentSegment?.words?.find((w) => effectiveTime >= w.start && effectiveTime <= w.end) || null
  );

  // Source URL untuk video YouTube embed 100% bersih tanpa komponen antarmuka YouTube (tanpa scrubber bar merah, tombol play/skip, judul, logo, dsb)
  const embedUrl = $derived.by(() => {
    const originParam = originHost
      ? `&origin=${encodeURIComponent(originHost)}&widget_referrer=${encodeURIComponent(originHost)}`
      : '';
    // controls=0: Menghilangkan total kontrol bar bawah, seekbar merah, logo YouTube, durasi, volume, CC, & settings
    // modestbranding=1: Menghilangkan watermark logo YouTube besar
    // rel=0: Tidak menampilkan video rekomendasi channel lain
    // iv_load_policy=3: Mematikan pop-up anotasi / video card
    // fs=0: Mematikan tombol fullscreen bawaan
    // disablekb=1: Mematikan shortcut keyboard bawaan YouTube
    // playsinline=1: Memastikan video diputar inline
    // Tanpa playlist: Menghilangkan tombol next/prev video di tengah
    return `https://www.youtube.com/embed/${youtubeVideoId}?start=${Math.floor(clip.startTime)}&end=${Math.ceil(clip.endTime)}&autoplay=1&mute=${isMuted ? 1 : 0}&controls=0&modestbranding=1&rel=0&iv_load_policy=3&fs=0&disablekb=1&playsinline=1&enablejsapi=1${originParam}`;
  });

  // Cek apakah video MP4 hasil render final sudah tersedia untuk klip ini
  const renderedTask = $derived(
    workspace.renderTasks.find(
      (t) => t.clipId === clip.id && t.status === 'completed' && t.downloadUrl
    )
  );
  let showRenderedVideo = $state(false);

  function setFramingLayout(layout: FramingLayout) {
    workspace.updateClip({
      ...clip,
      framingLayout: layout,
    });
  }

  function setBackgroundStyle(style: BackgroundStyle) {
    workspace.updateClip({
      ...clip,
      backgroundStyle: style,
    });
  }

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

  function enableSound() {
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

  // Sinkronisasi Real-Time dengan Mesin Playback 60fps & YouTube PostMessage Handshake
  onMount(() => {
    if (typeof window !== 'undefined') {
      originHost = window.location.origin;
    }

    const handleMessage = (e: MessageEvent) => {
      if (!e.origin.includes('youtube')) return;
      try {
        const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if (data && data.event === 'infoDelivery' && data.info) {
          // Detik video langsung dari pemutar YouTube internal
          if (typeof data.info.currentTime === 'number') {
            const ytTime = data.info.currentTime;
            // Kalibrasi playhead jika perbedaan dengan jam internal > 0.25 detik
            if (Math.abs(currentTime - ytTime) > 0.25) {
              currentTime = ytTime;
              lastSentSeek = ytTime;
            }
            if (ytTime >= clip.endTime) {
              restartClip();
            }
          }

          // Player state: 1 = Playing, 2 = Paused, 3 = Buffering, 0 = Ended
          if (typeof data.info.playerState === 'number') {
            if (data.info.playerState === 1 && !isPlaying) {
              isPlaying = true;
            } else if (data.info.playerState === 2 && isPlaying) {
              isPlaying = false;
            } else if (data.info.playerState === 0) {
              restartClip();
            }
          }
        }
      } catch {
        // Abaikan pesan non-JSON dari ekstensi browser
      }
    };

    window.addEventListener('message', handleMessage);

    // Kirim sinyal listening secara berkala agar YouTube iframe selalu mengirim timecode infoDelivery
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
    }, 500);

    // Loop 60fps clock internal untuk memastikan playhead dan teks bergerak 100% mulus sinkron
    lastFrameTime = performance.now();
    const tick = () => {
      const now = performance.now();
      const dt = (now - lastFrameTime) / 1000;
      lastFrameTime = now;

      if (isPlaying) {
        const nextTime = currentTime + dt;
        currentTime = nextTime;
        lastSentSeek = nextTime;

        if (currentTime >= clip.endTime) {
          restartClip();
        }
      }

      animFrameId = requestAnimationFrame(tick);
    };

    animFrameId = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('message', handleMessage);
      clearInterval(initInterval);
      if (animFrameId) {
        cancelAnimationFrame(animFrameId);
        animFrameId = null;
      }
    };
  });

  // Saat klip berganti, reset playhead ke detik mulai
  $effect(() => {
    const start = clip.startTime;
    currentTime = start;
    lastSentSeek = start;
    isPlaying = true;
    sendIframeCommand('seekTo', [start, true]);
    sendIframeCommand('playVideo', '');
  });

  // Saat user men-scrub timeline atau melompat ke kalimat di transkrip, sinkronkan video YouTube langsung
  $effect(() => {
    const target = currentTime;
    if (Math.abs(target - lastSentSeek) > 0.35) {
      lastSentSeek = target;
      sendIframeCommand('seekTo', [target, true]);
    }
  });

  $effect(() => {
    if (isPlaying) {
      sendIframeCommand('playVideo', '');
    } else {
      sendIframeCommand('pauseVideo', '');
    }
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
    lastSentSeek = clip.startTime;
    isPlaying = true;
    sendIframeCommand('seekTo', [clip.startTime, true]);
    sendIframeCommand('playVideo', '');
    if (!isMuted) {
      sendIframeCommand('unMute', '');
      sendIframeCommand('setVolume', [volume]);
    }
  }

  function handleIframeLoad() {
    setTimeout(() => {
      sendIframeCommand('seekTo', [clip.startTime, true]);
      if (!isMuted) {
        sendIframeCommand('unMute', '');
        sendIframeCommand('setVolume', [volume]);
      }
      sendIframeCommand('playVideo', '');
    }, 400);
  }
</script>

<div class="flex-1 bg-[#0D0F11] flex flex-col items-center justify-between p-4 relative overflow-hidden select-none">
  <!-- Top Bar: Layout Switcher (Crop vs Fit Blur Gambar 2), Background Selector, Safe Zone Toggle & Audio Controls -->
  <div class="flex flex-wrap items-center justify-center gap-2 mb-2 z-20">
    <!-- Layout Switcher: Tetap dalam Frame Portrait 9:16 -->
    <div class="flex items-center p-0.5 bg-[#191C20] rounded-lg border border-[#292E34]">
      <button
        type="button"
        onclick={() => setFramingLayout('crop')}
        class="h-7 px-3 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer {!isFitBlur
          ? 'bg-[#20242A] text-[#B6F36B] shadow-sm'
          : 'text-[#9299A3] hover:text-[#E7E9EC]'}"
      >
        <Smartphone class="w-3.5 h-3.5" />
        <span>📱 Crop 9:16 Vertikal</span>
      </button>

      <button
        type="button"
        onclick={() => setFramingLayout('fit_blur')}
        class="h-7 px-3 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer {isFitBlur
          ? 'bg-[#20242A] text-[#B6F36B] shadow-sm'
          : 'text-[#9299A3] hover:text-[#E7E9EC]'}"
        title="Format asli 16:9 di tengah dengan latar belakang gelap & blur dalam frame portrait (Sesuai Gambar 2)"
      >
        <Maximize2 class="w-3.5 h-3.5" />
        <span>🎬 Format Asli 16:9 (Gambar 2)</span>
      </button>
    </div>

    <!-- Pilihan Latar Belakang (Muncul saat Format Asli Fit Blur Aktif) -->
    {#if isFitBlur}
      <div class="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#191C20] border border-[#292E34] text-xs">
        <span class="text-[#9299A3] font-medium hidden sm:inline">Latar:</span>
        <select
          value={activeBackgroundStyle}
          onchange={(e) => setBackgroundStyle((e.target as HTMLSelectElement).value as BackgroundStyle)}
          class="bg-[#20242A] text-[#E7E9EC] text-xs font-semibold rounded px-2 py-1 border border-[#292E34] focus:outline-none focus:border-[#B6F36B] cursor-pointer"
        >
          <option value="dark_blur">🌌 Blur Gelap (Gambar 2)</option>
          <option value="extra_dark_blur">🌑 Blur Ekstra Gelap</option>
          <option value="pure_black">⬛ Hitam Polos</option>
          <option value="dark_gradient">🎨 Gradien Gelap</option>
        </select>
      </div>
    {/if}

    <!-- Toggle Panduan Standar Safe Zone Reels 9:16 (Gambar 3) -->
    <button
      type="button"
      onclick={() => (showSafeZoneOverlay = !showSafeZoneOverlay)}
      class="h-7 px-2.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer {showSafeZoneOverlay
        ? 'bg-[#F06A42]/20 border-[#F06A42] text-[#FFA07A] ring-1 ring-[#F06A42]/40 shadow-sm'
        : 'bg-[#191C20] border-[#292E34] text-[#9299A3] hover:text-[#E7E9EC]'}"
      title="Tampilkan / sembunyikan garis panduan Safe Zone 9:16 sesuai standar Gambar 3"
    >
      <ShieldCheck class="w-3.5 h-3.5 text-[#FFA07A]" />
      <span>🛡️ Safe Zone (Gambar 3)</span>
    </button>

    <!-- Tombol Khusus: Putar Video MP4 Final (Muncul otomatis setelah video selesai dirender) -->
    {#if renderedTask}
      <button
        type="button"
        onclick={() => (showRenderedVideo = !showRenderedVideo)}
        class="h-7 px-2.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer {showRenderedVideo
          ? 'bg-[#B6F36B]/20 border-[#B6F36B] text-[#B6F36B] shadow-sm ring-1 ring-[#B6F36B]/40'
          : 'bg-[#191C20] border-[#292E34] text-[#9299A3] hover:text-[#E7E9EC]'}"
        title="Tampilkan video MP4 final hasil render (100% native video tanpa iframe)"
      >
        <span>{showRenderedVideo ? '🟢 Video MP4 Final' : '▶️ Lihat Hasil MP4'}</span>
      </button>
    {/if}

    <!-- Kalibrasi Sinkronisasi Subtitle Manual Presisi -->
    <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#191C20] border border-[#292E34] text-xs">
      <span class="text-[#9299A3] flex items-center gap-1 font-medium">
        <Sparkles class="w-3.5 h-3.5 text-[#B6F36B]" />
        <span>Sinkron:</span>
      </span>
      <button
        type="button"
        onclick={() => (subtitleOffset = Math.round((subtitleOffset - 0.5) * 10) / 10)}
        class="px-1.5 py-0.5 rounded bg-[#20242A] hover:bg-[#282E36] text-[#9299A3] hover:text-[#E7E9EC] font-mono text-[10px] cursor-pointer"
        title="Mundurkan teks 0.5s"
      >
        -0.5s
      </button>
      <button
        type="button"
        onclick={() => (subtitleOffset = Math.round((subtitleOffset - 0.2) * 10) / 10)}
        class="px-1.5 py-0.5 rounded bg-[#20242A] hover:bg-[#282E36] text-[#E7E9EC] font-mono text-[11px] font-semibold cursor-pointer"
        title="Mundurkan teks 0.2s (sedikit lebih cepat)"
      >
        -0.2s
      </button>
      <span class="font-mono text-[#B6F36B] font-bold min-w-[34px] text-center bg-[#111315] px-1.5 py-0.5 rounded border border-[#292E34]">
        {subtitleOffset > 0 ? `+${subtitleOffset.toFixed(1)}` : subtitleOffset.toFixed(1)}s
      </span>
      <button
        type="button"
        onclick={() => (subtitleOffset = Math.round((subtitleOffset + 0.2) * 10) / 10)}
        class="px-1.5 py-0.5 rounded bg-[#20242A] hover:bg-[#282E36] text-[#E7E9EC] font-mono text-[11px] font-semibold cursor-pointer"
        title="Majukan teks 0.2s (sedikit lebih lambat)"
      >
        +0.2s
      </button>
      <button
        type="button"
        onclick={() => (subtitleOffset = Math.round((subtitleOffset + 0.5) * 10) / 10)}
        class="px-1.5 py-0.5 rounded bg-[#20242A] hover:bg-[#282E36] text-[#9299A3] hover:text-[#E7E9EC] font-mono text-[10px] cursor-pointer"
        title="Majukan teks 0.5s"
      >
        +0.5s
      </button>
      {#if subtitleOffset !== 0}
        <button
          type="button"
          onclick={() => (subtitleOffset = 0)}
          class="text-[10px] text-[#9299A3] hover:text-[#E7E9EC] underline ml-0.5 cursor-pointer"
        >
          Reset
        </button>
      {/if}
      {#if activeWord}
        <span class="ml-1 px-1.5 py-0.5 rounded bg-[#B6F36B]/15 text-[#B6F36B] text-[10px] font-bold border border-[#B6F36B]/30 hidden sm:inline-block">
          "{activeWord.word}"
        </span>
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
    <!-- PONSLE CONTAINER: SELALU DALAM FRAME PORTRAIT 9:16 (SESUAI GAMBAR 2) -->
    <div
      class="relative rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.85)] border-2 border-[#292E34] bg-black transition-all flex items-center justify-center {clip.aspectRatio ===
      '9:16'
        ? 'h-[490px] w-[276px]'
        : clip.aspectRatio === '1:1'
          ? 'h-[420px] w-[420px]'
          : 'h-[320px] w-[568px]'}"
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

      <!-- LAYER 1: VIDEO BERGERAK ASLI + LATAR BELAKANG (GAMBAR 2 FIT BLUR ATAU 9:16 CROP) -->
      <div class="absolute inset-0 overflow-hidden flex items-center justify-center bg-black">
        <!-- Latar Belakang Blur & Gelap (Aktif pada mode Fit Blur Gambar 2) -->
        {#if isFitBlur}
          <div class="absolute inset-0 overflow-hidden pointer-events-none z-0">
            {#if activeBackgroundStyle === 'pure_black'}
              <div class="absolute inset-0 bg-black"></div>
            {:else if activeBackgroundStyle === 'dark_gradient'}
              <div class="absolute inset-0 bg-gradient-to-b from-[#181C22] via-[#0B0D0F] to-[#14171A]"></div>
            {:else}
              {#if workspace.activeVideo?.thumbnailUrl}
                <img
                  src={workspace.activeVideo.thumbnailUrl}
                  alt="Latar Belakang Blur"
                  class="absolute inset-0 w-full h-full object-cover scale-150 filter blur-xl {activeBackgroundStyle === 'extra_dark_blur'
                    ? 'brightness-20 contrast-125'
                    : 'brightness-40 contrast-110'} transition-all"
                />
              {/if}
              <div class="absolute inset-0 {activeBackgroundStyle === 'extra_dark_blur' ? 'bg-black/80' : 'bg-black/60'} backdrop-blur-md"></div>
            {/if}
          </div>
        {/if}

        <!-- Wadah Video: Mendukung Mode Bersih 100% Bebas YouTube UI & Hasil Render MP4 Final -->
        <div
          class="relative overflow-hidden transition-all duration-300 flex items-center justify-center {isFitBlur
            ? 'w-full aspect-video z-15 shadow-[0_10px_35px_rgba(0,0,0,0.9)] border-y border-white/10 bg-black'
            : 'w-full h-full z-10'}"
        >
          {#if showRenderedVideo && renderedTask?.downloadUrl}
            <!-- Mode Video MP4 Riil Hasil Render Final: 100% Native HTML5 Video -->
            <video
              src={renderedTask.downloadUrl}
              autoplay
              loop
              playsinline
              class="w-full h-full object-cover"
            ></video>
          {:else}
            <!-- Iframe Player Bebas Komponen YouTube (Controls=0 + Edge Cropping Presisi) -->
            <iframe
              bind:this={iframeRef}
              src={embedUrl}
              onload={handleIframeLoad}
              title="Video Klip: {clip.title}"
              class="absolute pointer-events-none transition-all duration-200"
              style={isFitBlur
                ? `width: 130%; height: 130%; min-width: 130%; max-width: none; left: calc(50% + ${clip.panOffset || 0}%); top: 50%; transform: translate(-50%, -50%) scale(${clip.zoomLevel || 1.0});`
                : `height: 100%; width: ${clip.aspectRatio === '9:16' ? '325%' : clip.aspectRatio === '1:1' ? '180%' : '100%'}; min-width: ${clip.aspectRatio === '9:16' ? '325%' : clip.aspectRatio === '1:1' ? '180%' : '100%'}; max-width: none; left: calc(50% + ${clip.panOffset}%); top: 50%; transform: translate(-50%, -50%) scale(${clip.zoomLevel});`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            ></iframe>

            <!-- Vignette halus di tepi frame 16:9 agar batas benar-benar bersih tanpa celah UI YouTube -->
            {#if isFitBlur}
              <div class="absolute inset-0 pointer-events-none z-16 shadow-[inset_0_0_12px_rgba(0,0,0,0.8)] border border-white/5"></div>
            {/if}

            <!-- Fallback Poster jika iframe lambat termuat -->
            {#if workspace.activeVideo?.thumbnailUrl}
              <img
                src={workspace.activeVideo.thumbnailUrl}
                alt="Preview Thumbnail"
                class="absolute inset-0 w-full h-full object-cover filter brightness-90 -z-10"
              />
            {/if}
          {/if}
        </div>

        <!-- Gradient Ambient Vignette (Mode Crop) -->
        {#if !isFitBlur}
          <div class="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/40 pointer-events-none z-10"></div>
        {/if}
      </div>

      <!-- LAYER 2: GRID (RULE OF THIRDS) JIKA DIAKTIFKAN USER -->
      {#if showGrid}
        <div class="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 border border-[#B6F36B]/20 z-20">
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

      <!-- LAYER 3: OVERLAY PANDUAN STANDAR SAFE ZONE 9:16 (SESUAI GAMBAR 3) -->
      {#if showSafeZoneOverlay}
        <div class="absolute inset-0 pointer-events-none z-35 flex flex-col justify-between overflow-hidden">
          <!-- Batas Atas 220px (11.46%) -->
          <div class="h-[11.46%] w-full bg-[#E57A58]/30 border-b-2 border-[#E57A58] flex items-center justify-between px-2 text-[9px] font-mono font-bold text-white shadow-sm">
            <span class="flex items-center gap-1 text-[#FFA07A]">
              <span>⬆️ 220 px</span>
              <span class="text-[8px] font-normal text-white/80 hidden sm:inline">(Header & Search)</span>
            </span>
            <span class="text-[8px] px-1 py-0.2 rounded bg-black/70 text-[#FFA07A]">Unsafe</span>
          </div>

          <!-- Safe Zone Tengah (Gambar 3: Area Aman 1080x1920) -->
          <div class="flex-1 w-full relative flex flex-col items-center justify-between px-[3.24%] py-1.5">
            <div class="w-full flex-1 border-2 border-dashed border-[#F06A42]/90 bg-[#F06A42]/15 rounded-lg flex flex-col items-center justify-center p-2 relative shadow-inner">
              <div class="px-2.5 py-1 rounded bg-[#F06A42] text-white font-black text-[11px] tracking-wider uppercase shadow-md text-center">
                SAFE ZONE
              </div>
              <div class="text-[8px] font-mono text-white/95 mt-0.5 font-bold text-center">
                1080 x 1920 px (Gambar 3)
              </div>
              <div class="text-[7.5px] text-white/80 text-center">
                Area aman bebas halangan
              </div>

              <!-- Ikon Halangan Sisi Kanan (100px) Gambar 3 -->
              <div class="absolute bottom-2 right-1 w-[24px] flex flex-col items-center gap-1.5 py-1 px-0.5 bg-black/50 rounded border border-[#E57A58]/70">
                <div class="w-3.5 h-3.5 rounded-full bg-white/50 border border-white flex items-center justify-center text-[7px] text-white font-bold">♥</div>
                <div class="w-3.5 h-3.5 rounded-full bg-white/50 border border-white flex items-center justify-center text-[7px] text-white font-bold">💬</div>
                <div class="w-3.5 h-3.5 rounded-full bg-white/50 border border-white flex items-center justify-center text-[7px] text-white font-bold">↗</div>
                <span class="text-[6.5px] text-[#FFA07A] font-mono">100px</span>
              </div>
            </div>
          </div>

          <!-- Batas Bawah 450px (23.44%) -->
          <div class="h-[23.44%] w-full bg-[#E57A58]/30 border-t-2 border-[#E57A58] p-2 flex flex-col justify-between text-[9px] font-mono font-bold text-white shadow-sm">
            <div class="flex items-center justify-between">
              <span class="flex items-center gap-1 text-[#FFA07A]">
                <span>⬇️ 450 px</span>
                <span class="text-[8px] font-normal text-white/80 hidden sm:inline">(Navigasi, Caption & Audio)</span>
              </span>
              <span class="text-[8px] px-1 py-0.2 rounded bg-black/70 text-[#FFA07A]">Unsafe</span>
            </div>
            <!-- Mock garis navigasi sesuai Gambar 3 -->
            <div class="space-y-1 opacity-70">
              <div class="flex items-center gap-1">
                <div class="w-3 h-3 rounded-full bg-white/60"></div>
                <div class="h-1 w-16 bg-white/60 rounded"></div>
              </div>
              <div class="h-1 w-28 bg-white/40 rounded"></div>
              <div class="h-1 w-20 bg-white/30 rounded"></div>
            </div>
          </div>
        </div>
      {/if}

      <!-- LAYER 4: 10 PILIHAN GAYA SUBTITLE DINAMIS (KINETIC CAPTIONS DI DALAM SAFE ZONE) -->
      <div class="absolute {captionPosClass} pointer-events-none text-center z-25 transition-all duration-200">
        {#if clip.captionPreset === 'hormozi'}
          <!-- 1. HORMOZI POP: Extra Bold, Uppercase, Scale & Pop per kata -->
          <div class="inline-block px-3 py-1.5 font-black tracking-tight text-xs sm:text-sm uppercase drop-shadow-[0_4px_8px_rgba(0,0,0,0.95)] max-w-full break-words leading-tight">
            {#if visibleWords}
              {#each visibleWords as w, idx (idx)}
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
            {#if visibleWords}
              {#each visibleWords as w, idx (idx)}
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
              {#if visibleWords}
                {#each visibleWords as w, idx (idx)}
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
            {#if visibleWords}
              {#each visibleWords as w, idx (idx)}
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
            {#if visibleWords}
              {#each visibleWords as w, idx (idx)}
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
            {#if visibleWords}
              {#each visibleWords as w, idx (idx)}
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
              {#if visibleWords}
                {#each visibleWords as w, idx (idx)}
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
              {#if visibleWords}
                {#each visibleWords as w, idx (idx)}
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
            {#if visibleWords}
              {#each visibleWords as w, idx (idx)}
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

      <!-- LAYER 5: INTERAKSI KLIK PLAY / PAUSE PADA LAYAR -->
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
