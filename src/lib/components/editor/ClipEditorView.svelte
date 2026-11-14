<script lang="ts">
  import { workspace } from '#lib/state/workspace.svelte';
  import { goto } from '$app/navigation';
  import { formatTimecode } from '#lib/utils/clippingRules';
  import type {
    ClipCandidate,
    CaptionStylePreset,
    CaptionPosition,
    CaptionMaxLines,
    FramingMode,
    FramingLayout,
    BackgroundStyle,
    WatermarkPosition,
  } from '#lib/types';
  import EditorPlayer from './EditorPlayer.svelte';
  import EditorTimeline from './EditorTimeline.svelte';
  import {
    Smartphone,
    Square,
    Maximize2,
    Sliders,
    Type,
    AlignLeft,
    Download,
    Calendar,
    Grid,
    Sparkles,
    Check,
    Loader2,
    ShieldCheck,
    Image as ImageIcon,
    Music,
    UploadCloud,
    Trash2,
    Volume2,
    AlertCircle,
  } from 'lucide-svelte';

  let { clip }: { clip: ClipCandidate } = $props();

  let showSafeZones = $state(true);
  let showGrid = $state(false);
  let activeTab = $state<'captions' | 'framing' | 'audio_brand' | 'transcript'>('captions');
  let highlightColor = $derived(
    clip.captionHighlightColor || workspace.rules.captionHighlightColor || '#B6F36B'
  );
  let currentTime = $state(0);
  let isPlaying = $state(false);
  let isDownloading = $state(false);
  let downloadSuccess = $state(false);

  // Watermark state
  let isUploadingWatermark = $state(false);
  let watermarkUploadError = $state<string | null>(null);

  // BGM YouTube state
  let bgmInputUrl = $state(clip.bgm?.youtubeUrl || '');
  let isLoadingBgm = $state(false);
  let bgmError = $state<string | null>(null);
  let bgmSuccessMsg = $state<string | null>(null);

  $effect(() => {
    currentTime = clip.startTime;
    isPlaying = false;
  });

  function updateSegmentText(segIndex: number, newText: string) {
    const updatedCaptions = [...clip.captions];
    const seg = updatedCaptions[segIndex];
    const rawWords = newText.trim().split(/\s+/).filter(Boolean);
    const duration = Math.max(0.5, seg.end - seg.start);
    const wordDuration = rawWords.length > 0 ? duration / rawWords.length : 0.4;

    const newWords = rawWords.map((w, i) => ({
      word: w,
      start: Math.round((seg.start + i * wordDuration) * 10) / 10,
      end: Math.round((seg.start + (i + 1) * wordDuration) * 10) / 10,
    }));

    updatedCaptions[segIndex] = {
      ...seg,
      text: newText,
      words: newWords,
    };

    workspace.updateClip({
      ...clip,
      captions: updatedCaptions,
    });
  }

  function snapSegmentToPlayhead(segIndex: number) {
    const updatedCaptions = [...clip.captions];
    const seg = updatedCaptions[segIndex];
    const oldDuration = Math.max(0.5, seg.end - seg.start);
    const newStart = Math.round(currentTime * 10) / 10;
    const newEnd = Math.round((newStart + oldDuration) * 10) / 10;

    const rawWords = (seg.words || []).map((w) => w.word);
    const wordDuration = rawWords.length > 0 ? oldDuration / rawWords.length : 0.4;
    const newWords = rawWords.map((w, i) => ({
      word: w,
      start: Math.round((newStart + i * wordDuration) * 10) / 10,
      end: Math.round((newStart + (i + 1) * wordDuration) * 10) / 10,
    }));

    updatedCaptions[segIndex] = {
      ...seg,
      start: newStart,
      end: newEnd,
      words: newWords,
    };

    workspace.updateClip({
      ...clip,
      captions: updatedCaptions,
    });
  }

  function handleSchedule() {
    workspace.selectClip(clip);
    goto('/publish');
  }

  function handleExport() {
    workspace.startRender({
      clipId: clip.id,
      clipTitle: clip.title,
      aspectRatio: clip.aspectRatio,
    });
    goto('/export');
  }

  async function handleQuickDownload() {
    if (isDownloading) return;
    isDownloading = true;
    downloadSuccess = false;

    try {
      await workspace.quickDownloadClip(clip);
      downloadSuccess = true;
      setTimeout(() => {
        downloadSuccess = false;
      }, 5000);
    } catch (e) {
      console.error('Editor quick download error:', e);
    } finally {
      isDownloading = false;
    }
  }

  // --- Watermark Functions ---
  async function handleWatermarkUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];

    isUploadingWatermark = true;
    watermarkUploadError = null;

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/watermark', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal mengunggah logo watermark');
      }

      const currentWm = clip.watermark || {
        position: 'top_right' as WatermarkPosition,
        sizePercent: 16,
        opacity: 0.85,
      };

      workspace.updateClip({
        ...clip,
        watermark: {
          enabled: true,
          imageUrl: data.url,
          position: currentWm.position || 'top_right',
          sizePercent: currentWm.sizePercent || 16,
          opacity: currentWm.opacity || 0.85,
        },
      });
    } catch (err: any) {
      console.error('Watermark upload error:', err);
      watermarkUploadError = err.message || 'Gagal mengunggah watermark';
    } finally {
      isUploadingWatermark = false;
      input.value = '';
    }
  }

  function removeWatermark() {
    workspace.updateClip({
      ...clip,
      watermark: {
        enabled: false,
        imageUrl: '',
        position: clip.watermark?.position || 'top_right',
        sizePercent: clip.watermark?.sizePercent || 16,
        opacity: clip.watermark?.opacity ?? 0.85,
      },
    });
  }

  function toggleWatermark(enabled: boolean) {
    if (!clip.watermark?.imageUrl) return;
    workspace.updateClip({
      ...clip,
      watermark: {
        ...clip.watermark,
        enabled,
      },
    });
  }

  function updateWatermarkPosition(position: WatermarkPosition) {
    workspace.updateClip({
      ...clip,
      watermark: {
        enabled: clip.watermark?.enabled ?? true,
        imageUrl: clip.watermark?.imageUrl || '',
        position,
        sizePercent: clip.watermark?.sizePercent || 16,
        opacity: clip.watermark?.opacity ?? 0.85,
      },
    });
  }

  function updateWatermarkSize(sizePercent: number) {
    workspace.updateClip({
      ...clip,
      watermark: {
        enabled: clip.watermark?.enabled ?? true,
        imageUrl: clip.watermark?.imageUrl || '',
        position: clip.watermark?.position || 'top_right',
        sizePercent,
        opacity: clip.watermark?.opacity ?? 0.85,
      },
    });
  }

  function updateWatermarkOpacity(opacity: number) {
    workspace.updateClip({
      ...clip,
      watermark: {
        enabled: clip.watermark?.enabled ?? true,
        imageUrl: clip.watermark?.imageUrl || '',
        position: clip.watermark?.position || 'top_right',
        sizePercent: clip.watermark?.sizePercent || 16,
        opacity,
      },
    });
  }

  // --- BGM YouTube Functions ---
  async function handleLoadBgm() {
    if (!bgmInputUrl || !bgmInputUrl.trim()) return;
    isLoadingBgm = true;
    bgmError = null;
    bgmSuccessMsg = null;

    try {
      const res = await fetch('/api/bgm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ youtubeUrl: bgmInputUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal memproses audio dari YouTube');
      }

      const currentBgm = clip.bgm || { volume: 15 };
      workspace.updateClip({
        ...clip,
        bgm: {
          enabled: true,
          youtubeUrl: bgmInputUrl.trim(),
          title: data.title || 'Musik YouTube',
          audioUrl: data.audioUrl,
          volume: currentBgm.volume || 15,
        },
      });
      bgmSuccessMsg = `Audio "${data.title || 'Musik YouTube'}" siap diputar!`;
      setTimeout(() => {
        bgmSuccessMsg = null;
      }, 4000);
    } catch (err: any) {
      console.error('BGM load error:', err);
      bgmError = err.message || 'Gagal mengunduh musik dari link YouTube';
    } finally {
      isLoadingBgm = false;
    }
  }

  function removeBgm() {
    workspace.updateClip({
      ...clip,
      bgm: {
        enabled: false,
        youtubeUrl: '',
        title: '',
        audioUrl: '',
        volume: clip.bgm?.volume || 15,
      },
    });
    bgmInputUrl = '';
  }

  function toggleBgm(enabled: boolean) {
    if (!clip.bgm?.audioUrl) return;
    workspace.updateClip({
      ...clip,
      bgm: {
        ...clip.bgm,
        enabled,
      },
    });
  }

  function updateBgmVolume(volume: number) {
    workspace.updateClip({
      ...clip,
      bgm: {
        enabled: clip.bgm?.enabled ?? true,
        youtubeUrl: clip.bgm?.youtubeUrl || '',
        title: clip.bgm?.title || '',
        audioUrl: clip.bgm?.audioUrl || '',
        volume,
      },
    });
  }
</script>

<div class="flex-1 flex flex-col h-full bg-[#111315] select-none overflow-hidden">
  <!-- Editor Top Navigation Bar -->
  <div class="h-12 border-b border-[#292E34] bg-[#14171A] px-4 flex items-center justify-between text-xs shrink-0">
    <div class="flex items-center gap-3">
      <a
        href="/candidates"
        class="text-[#9299A3] hover:text-[#E7E9EC] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#B6F36B] rounded px-1.5 py-1 bg-[#191C20] border border-[#292E34]"
      >
        ← Kembali ke Pilihan Klip
      </a>
      <span class="text-[#626871]">/</span>
      <span class="font-semibold text-[#E7E9EC] truncate max-w-[240px] md:max-w-[340px]">
        {clip.title}
      </span>
      <span
        class="text-[10px] font-mono tabular-nums px-2 py-0.5 rounded bg-[#191C20] border border-[#292E34] text-[#B6F36B]"
      >
        {clip.duration} detik
      </span>
    </div>

    <!-- Aspect Ratio & Safe Zone Controls -->
    <div class="hidden sm:flex items-center gap-2">
      <div class="flex items-center p-0.5 bg-[#191C20] rounded-lg border border-[#292E34]">
        <button
          type="button"
          onclick={() => workspace.updateClip({ ...clip, aspectRatio: '9:16' })}
          title="Rasio 9:16 Vertikal (TikTok / Shorts)"
          class="px-2.5 py-1 rounded transition-colors flex items-center gap-1 cursor-pointer {clip.aspectRatio ===
          '9:16'
            ? 'bg-[#20242A] text-[#B6F36B] font-semibold'
            : 'text-[#9299A3] hover:text-[#E7E9EC]'}"
        >
          <Smartphone class="w-3.5 h-3.5" />
          <span>9:16</span>
        </button>
        <button
          type="button"
          onclick={() => workspace.updateClip({ ...clip, aspectRatio: '1:1' })}
          title="Rasio 1:1 Kotak (Feed Instagram)"
          class="px-2.5 py-1 rounded transition-colors flex items-center gap-1 cursor-pointer {clip.aspectRatio ===
          '1:1'
            ? 'bg-[#20242A] text-[#B6F36B] font-semibold'
            : 'text-[#9299A3] hover:text-[#E7E9EC]'}"
        >
          <Square class="w-3.5 h-3.5" />
          <span>1:1</span>
        </button>
        <button
          type="button"
          onclick={() => workspace.updateClip({ ...clip, aspectRatio: '16:9' })}
          title="Rasio 16:9 Landscape (YouTube Standar)"
          class="px-2.5 py-1 rounded transition-colors flex items-center gap-1 cursor-pointer {clip.aspectRatio ===
          '16:9'
            ? 'bg-[#20242A] text-[#B6F36B] font-semibold'
            : 'text-[#9299A3] hover:text-[#E7E9EC]'}"
        >
          <Maximize2 class="w-3.5 h-3.5" />
          <span>16:9</span>
        </button>
      </div>

      <button
        type="button"
        onclick={() => (showGrid = !showGrid)}
        class="h-8 px-2 rounded-lg border text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer {showGrid
          ? 'bg-[#20242A] border-[#B6F36B]/50 text-[#B6F36B]'
          : 'bg-[#191C20] border-[#292E34] text-[#9299A3] hover:border-[#383F47]'}"
        title="Garis bantu pembagian layar (Rule of Thirds)"
      >
        <Grid class="w-3.5 h-3.5" />
      </button>
    </div>

    <!-- Direct Action Buttons: Unduh Klip Langsung (MP4) -->
    <div class="flex items-center gap-2">
      <button
        type="button"
        onclick={handleSchedule}
        class="h-8 px-2.5 rounded-lg bg-[#191C20] hover:bg-[#20242A] text-[#9299A3] hover:text-[#E7E9EC] border border-[#292E34] transition-colors flex items-center gap-1.5 cursor-pointer text-xs"
      >
        <Calendar class="w-3.5 h-3.5" />
        <span class="hidden md:inline">Jadwalkan</span>
      </button>

      <!-- TOMBOL UNDUH LANGSUNG (MP4) -->
      <button
        type="button"
        onclick={handleQuickDownload}
        disabled={isDownloading}
        class="h-8 px-4 rounded-lg bg-[#B6F36B] hover:bg-[#A5E456] active:bg-[#94D445] text-[#111315] font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B6F36B]/50 disabled:opacity-75 shrink-0"
        title="Langsung unduh klip ini sebagai video MP4 siap posting"
      >
        {#if isDownloading}
          <Loader2 class="w-3.5 h-3.5 animate-spin" />
          <span>Sedang Mengunduh...</span>
        {:else if downloadSuccess}
          <Check class="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Berhasil Diunduh!</span>
        {:else}
          <Download class="w-3.5 h-3.5 stroke-[2.5]" />
          <span>⬇️ Unduh Video Ini (MP4)</span>
        {/if}
      </button>
    </div>
  </div>

  <!-- Main Split: Stage (Center) + Inspector (Right) -->
  <div class="flex-1 flex overflow-hidden">
    <!-- Center Stage: Dedicated Player Component -->
    <EditorPlayer
      {clip}
      {showSafeZones}
      {showGrid}
      {highlightColor}
      bind:currentTime
      bind:isPlaying
    />

    <!-- Right Inspector Sidebar -->
    <div class="w-80 border-l border-[#292E34] bg-[#14171A] flex flex-col shrink-0">
      <!-- Inspector Tabs -->
      <div class="flex border-b border-[#292E34] text-xs font-medium bg-[#111315]">
        <button
          type="button"
          onclick={() => (activeTab = 'captions')}
          class="flex-1 py-3 border-b-2 transition-colors flex items-center justify-center gap-1 cursor-pointer {activeTab ===
          'captions'
            ? 'border-[#B6F36B] text-[#B6F36B] bg-[#191C20] font-semibold'
            : 'border-transparent text-[#9299A3] hover:text-[#E7E9EC]'}"
          title="Gaya Animasi & Warna Subtitle"
        >
          <Type class="w-3.5 h-3.5" />
          <span class="text-[11px]">Teks</span>
        </button>

        <button
          type="button"
          onclick={() => (activeTab = 'framing')}
          class="flex-1 py-3 border-b-2 transition-colors flex items-center justify-center gap-1 cursor-pointer {activeTab ===
          'framing'
            ? 'border-[#B6F36B] text-[#B6F36B] bg-[#191C20] font-semibold'
            : 'border-transparent text-[#9299A3] hover:text-[#E7E9EC]'}"
          title="Format 16:9, Latar Blur, Pan & Zoom"
        >
          <Sliders class="w-3.5 h-3.5" />
          <span class="text-[11px]">Framing</span>
        </button>

        <button
          type="button"
          onclick={() => (activeTab = 'audio_brand')}
          class="flex-1 py-3 border-b-2 transition-colors flex items-center justify-center gap-1 cursor-pointer {activeTab ===
          'audio_brand'
            ? 'border-[#B6F36B] text-[#B6F36B] bg-[#191C20] font-semibold'
            : 'border-transparent text-[#9299A3] hover:text-[#E7E9EC]'}"
          title="Watermark Logo & Musik Latar (BGM)"
        >
          <Music class="w-3.5 h-3.5" />
          <span class="text-[11px]">Logo/BGM</span>
        </button>

        <button
          type="button"
          onclick={() => (activeTab = 'transcript')}
          class="flex-1 py-3 border-b-2 transition-colors flex items-center justify-center gap-1 cursor-pointer {activeTab ===
          'transcript'
            ? 'border-[#B6F36B] text-[#B6F36B] bg-[#191C20] font-semibold'
            : 'border-transparent text-[#9299A3] hover:text-[#E7E9EC]'}"
          title="Edit Kata & Sinkronisasi Detik"
        >
          <AlignLeft class="w-3.5 h-3.5" />
          <span class="text-[11px]">Transkrip</span>
        </button>
      </div>

      <!-- Inspector Content Body -->
      <div class="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
        {#if activeTab === 'captions'}
          <div class="space-y-4">
            <div>
              <span class="text-[11px] font-semibold text-[#626871] uppercase tracking-wider block mb-2">
                Gaya Animasi Subtitle
              </span>
              <div class="grid grid-cols-2 gap-2">
                {#each [
                  { id: 'hormozi' as CaptionStylePreset, label: 'Hormozi Pop', tag: 'Populer' },
                  { id: 'mrbeast' as CaptionStylePreset, label: 'MrBeast Energy', tag: 'Viral' },
                  { id: 'ali_abdaal' as CaptionStylePreset, label: 'Ali Abdaal', tag: 'Elegan' },
                  { id: 'karaoke' as CaptionStylePreset, label: 'Karaoke Glow', tag: 'Mengalir' },
                  { id: 'neon_glow' as CaptionStylePreset, label: 'Neon Cyber', tag: 'Glow' },
                  { id: 'vox_box' as CaptionStylePreset, label: 'Vox Media Box', tag: 'Kontras' },
                  { id: 'cinematic' as CaptionStylePreset, label: 'Sinematik Minimal', tag: 'Clean' },
                  { id: 'typewriter' as CaptionStylePreset, label: 'Mesin Ketik', tag: 'Terminal' },
                  { id: 'fire_gradient' as CaptionStylePreset, label: 'Api Hype (Gradient)', tag: 'Hype' },
                  { id: 'subtle_box' as CaptionStylePreset, label: 'Kotak Gelap Klasik', tag: 'Standar' },
                ] as preset (preset.id)}
                  <button
                    type="button"
                    onclick={() => workspace.updateClip({ ...clip, captionPreset: preset.id })}
                    class="p-2.5 rounded-lg border text-left transition-all cursor-pointer {clip.captionPreset ===
                    preset.id
                      ? 'bg-[#20242A] border-[#B6F36B] text-[#E7E9EC] font-semibold ring-1 ring-[#B6F36B]/40 shadow-sm'
                      : 'bg-[#191C20] border-[#292E34] text-[#9299A3] hover:border-[#383F47] hover:text-[#E7E9EC]'}"
                  >
                    <div class="flex items-center justify-between">
                      <span class="text-xs font-semibold">{preset.label}</span>
                      <span class="text-[9px] font-mono px-1 py-0.2 rounded bg-[#111315] text-[#B6F36B] border border-[#292E34]">{preset.tag}</span>
                    </div>
                  </button>
                {/each}
              </div>
            </div>

            <!-- Subtitle Accent Color -->
            <div class="p-3 bg-[#191C20] border border-[#292E34] rounded-lg space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-[#9299A3]">Warna Sorotan Kata</span>
                <span class="font-mono font-bold" style="color: {highlightColor};">{highlightColor}</span>
              </div>
              <div class="flex items-center gap-2.5">
                {#each ['#B6F36B', '#FACC15', '#38BDF8', '#F43F5E', '#FFFFFF'] as color (color)}
                  <button
                    type="button"
                    class="w-7 h-7 rounded-full border shadow-sm transition-transform cursor-pointer {highlightColor ===
                    color
                      ? 'scale-125 ring-2 ring-[#E7E9EC] border-transparent'
                      : 'border-black/40 hover:scale-110'}"
                    style="background-color: {color};"
                    onclick={() => {
                      workspace.updateClip({ ...clip, captionHighlightColor: color });
                      workspace.rules.captionHighlightColor = color;
                    }}
                    aria-label="Pilih warna sorotan {color}"
                  ></button>
                {/each}
              </div>
            </div>

            <!-- Posisi Vertikal Caption (Safe Zone Gambar 3) -->
            <div class="p-3 bg-[#191C20] border border-[#292E34] rounded-lg space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-[#9299A3] font-medium flex items-center gap-1.5">
                  <ShieldCheck class="w-3.5 h-3.5 text-[#FFA07A]" />
                  <span>Posisi Teks (Safe Zone Gambar 3)</span>
                </span>
                <span class="font-mono text-[10px] text-[#B6F36B] uppercase font-bold">
                  {clip.captionPosition === 'top' ? 'Atas (>220px)' : clip.captionPosition === 'middle' ? 'Tengah' : 'Bawah (>450px)'}
                </span>
              </div>
              <div class="grid grid-cols-3 gap-1.5">
                {#each [
                  { id: 'top' as CaptionPosition, label: '⬆️ Atas', desc: 'Bawah 220px' },
                  { id: 'middle' as CaptionPosition, label: '⏺️ Tengah', desc: 'Tengah / Bawah Video' },
                  { id: 'bottom' as CaptionPosition, label: '⬇️ Bawah', desc: 'Atas 450px (Aman)' },
                ] as pos (pos.id)}
                  <button
                    type="button"
                    onclick={() => workspace.updateClip({ ...clip, captionPosition: pos.id })}
                    class="py-2 px-1.5 rounded-lg border text-center transition-all cursor-pointer {(clip.captionPosition || 'bottom') === pos.id
                      ? 'bg-[#20242A] border-[#B6F36B] text-[#B6F36B] font-bold shadow-sm ring-1 ring-[#B6F36B]/40'
                      : 'bg-[#14171A] border-[#292E34] text-[#9299A3] hover:text-[#E7E9EC] hover:border-[#383F47]'}"
                  >
                    <div class="text-xs">{pos.label}</div>
                    <div class="text-[9px] text-[#626871] font-mono mt-0.5">{pos.desc}</div>
                  </button>
                {/each}
              </div>
            </div>

            <!-- Batas Maksimal Baris Caption (1, 2, atau 3 Baris) -->
            <div class="p-3 bg-[#191C20] border border-[#292E34] rounded-lg space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-[#9299A3] font-medium">Maksimal Jumlah Baris</span>
                <span class="font-mono text-[10px] text-[#B6F36B] font-bold">
                  {clip.captionMaxLines || 2} Baris
                </span>
              </div>
              <div class="grid grid-cols-3 gap-1.5">
                {#each [
                  { count: 1 as CaptionMaxLines, label: '1 Baris', desc: '3-4 kata' },
                  { count: 2 as CaptionMaxLines, label: '2 Baris', desc: '6-7 kata' },
                  { count: 3 as CaptionMaxLines, label: '3 Baris', desc: '9-10 kata' },
                ] as item (item.count)}
                  <button
                    type="button"
                    onclick={() => workspace.updateClip({ ...clip, captionMaxLines: item.count })}
                    class="py-2 px-1.5 rounded-lg border text-center transition-all cursor-pointer {(clip.captionMaxLines || 2) === item.count
                      ? 'bg-[#20242A] border-[#B6F36B] text-[#B6F36B] font-bold shadow-sm ring-1 ring-[#B6F36B]/40'
                      : 'bg-[#14171A] border-[#292E34] text-[#9299A3] hover:text-[#E7E9EC] hover:border-[#383F47]'}"
                  >
                    <div class="text-xs font-semibold">{item.label}</div>
                    <div class="text-[9px] text-[#626871] font-mono mt-0.5">{item.desc}</div>
                  </button>
                {/each}
              </div>
            </div>

            <!-- Hook Punch-in Zoom Keyframes -->
            <div class="p-3 bg-[#191C20] border border-[#292E34] rounded-lg space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-[#9299A3] flex items-center gap-1.5 font-medium">
                  <Sparkles class="w-3.5 h-3.5 text-[#B6F36B]" />
                  Efek Zoom Otomatis (Punch-In)
                </span>
                <span class="font-mono text-xs text-[#B6F36B] font-bold">
                  {clip.bRollCuts?.length || 2} titik aktif
                </span>
              </div>
              <p class="text-[11px] text-[#626871] leading-relaxed">
                Otomatis zoom 1.25x pada kalimat penting dan punchline untuk meningkatkan retensi penonton secara psikologis.
              </p>
            </div>
          </div>
        {:else if activeTab === 'framing'}
          <div class="space-y-4">
            <!-- Mode Layout Video 9:16: Crop Vertikal vs Format Asli (Gambar 2) -->
            <div class="p-3 bg-[#191C20] border border-[#292E34] rounded-lg space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-[#E7E9EC] font-semibold text-xs">Mode Layout Video 9:16</span>
                <span class="font-mono text-[10px] text-[#B6F36B] font-bold">
                  {clip.framingLayout === 'fit_blur' ? 'Format Asli (Gambar 2)' : 'Crop 9:16 Vertikal'}
                </span>
              </div>
              <div class="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onclick={() => workspace.updateClip({ ...clip, framingLayout: 'crop' })}
                  class="p-2.5 rounded-lg border text-left transition-all cursor-pointer {clip.framingLayout !== 'fit_blur'
                    ? 'bg-[#20242A] border-[#B6F36B] text-[#B6F36B] font-bold ring-1 ring-[#B6F36B]/40 shadow-sm'
                    : 'bg-[#14171A] border-[#292E34] text-[#9299A3] hover:text-[#E7E9EC]'}"
                >
                  <div class="text-xs font-semibold">📱 Crop Vertikal</div>
                  <div class="text-[9px] text-[#626871] mt-0.5">Isi penuh layar 9:16</div>
                </button>
                <button
                  type="button"
                  onclick={() => workspace.updateClip({ ...clip, framingLayout: 'fit_blur' })}
                  class="p-2.5 rounded-lg border text-left transition-all cursor-pointer {clip.framingLayout === 'fit_blur'
                    ? 'bg-[#20242A] border-[#B6F36B] text-[#B6F36B] font-bold ring-1 ring-[#B6F36B]/40 shadow-sm'
                    : 'bg-[#14171A] border-[#292E34] text-[#9299A3] hover:text-[#E7E9EC]'}"
                >
                  <div class="text-xs font-semibold">🎬 Format Asli (Gambar 2)</div>
                  <div class="text-[9px] text-[#626871] mt-0.5">16:9 di tengah + blur</div>
                </button>
              </div>
            </div>

            <!-- Kustomisasi Gaya Latar Belakang (Muncul saat Format Asli Fit Blur Aktif) -->
            {#if clip.framingLayout === 'fit_blur'}
              <div class="p-3 bg-[#191C20] border border-[#292E34] rounded-lg space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-[#E7E9EC] font-semibold text-xs">Kustomisasi Latar Belakang</span>
                  <span class="font-mono text-[10px] text-[#B6F36B] font-bold">
                    {clip.backgroundStyle || 'dark_blur'}
                  </span>
                </div>
                <div class="grid grid-cols-2 gap-2">
                  {#each [
                    { id: 'dark_blur' as BackgroundStyle, label: 'Blur Gelap (Gambar 2)', desc: 'Rekomendasi' },
                    { id: 'extra_dark_blur' as BackgroundStyle, label: 'Blur Ekstra Gelap', desc: 'Kontras Tinggi' },
                    { id: 'pure_black' as BackgroundStyle, label: 'Hitam Polos', desc: 'Letterbox Klasik' },
                    { id: 'dark_gradient' as BackgroundStyle, label: 'Gradien Gelap', desc: 'Modern Elegan' },
                  ] as bg (bg.id)}
                    <button
                      type="button"
                      onclick={() => workspace.updateClip({ ...clip, backgroundStyle: bg.id })}
                      class="p-2 rounded-lg border text-left transition-all cursor-pointer {(clip.backgroundStyle || 'dark_blur') === bg.id
                        ? 'bg-[#20242A] border-[#B6F36B] text-[#B6F36B] font-bold ring-1 ring-[#B6F36B]/40 shadow-sm'
                        : 'bg-[#14171A] border-[#292E34] text-[#9299A3] hover:text-[#E7E9EC]'}"
                    >
                      <div class="text-xs font-semibold">{bg.label}</div>
                      <div class="text-[9px] text-[#626871] mt-0.5">{bg.desc}</div>
                    </button>
                  {/each}
                </div>
              </div>
            {/if}

            <div>
              <span class="text-[11px] font-semibold text-[#626871] uppercase tracking-wider block mb-2">
                Geser Posisi Kamera (Pan X)
              </span>
              <div class="flex items-center justify-between text-[#9299A3] mb-1">
                <span>Offset Tengah</span>
                <span class="font-mono tabular-nums text-[#B6F36B] font-bold">{clip.panOffset}%</span>
              </div>
              <input
                type="range"
                min="-40"
                max="40"
                step="2"
                value={clip.panOffset}
                oninput={(e) => {
                  const val = parseInt((e.target as HTMLInputElement).value);
                  workspace.updateClip({ ...clip, panOffset: val });
                }}
                class="w-full accent-[#B6F36B] bg-[#292E34] h-1.5 rounded-lg cursor-pointer"
              />
            </div>

            <div>
              <span class="text-[11px] font-semibold text-[#626871] uppercase tracking-wider block mb-2">
                Tingkat Pembesaran (Zoom)
              </span>
              <div class="flex items-center justify-between text-[#9299A3] mb-1">
                <span>Skala Zoom</span>
                <span class="font-mono tabular-nums text-[#B6F36B] font-bold">
                  {clip.zoomLevel.toFixed(2)}x
                </span>
              </div>
              <input
                type="range"
                min="1.0"
                max="2.0"
                step="0.05"
                value={clip.zoomLevel}
                oninput={(e) => {
                  const val = parseFloat((e.target as HTMLInputElement).value);
                  workspace.updateClip({ ...clip, zoomLevel: val });
                }}
                class="w-full accent-[#B6F36B] bg-[#292E34] h-1.5 rounded-lg cursor-pointer"
              />
            </div>

            <div>
              <span class="text-[11px] font-semibold text-[#626871] uppercase tracking-wider block mb-2">
                Mode Pelacakan
              </span>
              <div class="space-y-1.5">
                {#each [
                  { id: 'face_track' as FramingMode, label: 'Ikuti Wajah Otomatis (Auto Face-Track)' },
                  { id: 'centered' as FramingMode, label: 'Tengah Statis' },
                  { id: 'manual_pan' as FramingMode, label: 'Kunci Posisi Manual' },
                ] as m (m.id)}
                  <button
                    type="button"
                    onclick={() => workspace.updateClip({ ...clip, framingMode: m.id })}
                    class="w-full p-2.5 rounded-lg border text-left transition-colors text-xs cursor-pointer {clip.framingMode ===
                    m.id
                      ? 'bg-[#20242A] border-[#B6F36B] text-[#E7E9EC] font-semibold'
                      : 'bg-[#191C20] border-[#292E34] text-[#9299A3] hover:border-[#383F47]'}"
                  >
                    {m.label}
                  </button>
                {/each}
              </div>
            </div>
          </div>
        {:else if activeTab === 'audio_brand'}
          <!-- Tab Logo & BGM YouTube -->
          <div class="space-y-4">
            <!-- 1. WATERMARK / LOGO KUSTOM -->
            <div class="p-3 bg-[#191C20] border border-[#292E34] rounded-lg space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-[#E7E9EC] font-semibold text-xs flex items-center gap-1.5">
                  <ImageIcon class="w-3.5 h-3.5 text-[#B6F36B]" />
                  <span>Watermark / Logo Kustom</span>
                </span>
                {#if clip.watermark?.imageUrl}
                  <label class="flex items-center gap-1.5 text-[10px] text-[#9299A3] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={clip.watermark?.enabled ?? true}
                      onchange={(e) => toggleWatermark((e.target as HTMLInputElement).checked)}
                      class="accent-[#B6F36B] rounded cursor-pointer"
                    />
                    <span>{clip.watermark?.enabled ? 'Aktif' : 'Nonaktif'}</span>
                  </label>
                {/if}
              </div>

              <!-- Upload Area atau Preview Logo Terpasang -->
              {#if !clip.watermark?.imageUrl}
                <label
                  class="border-2 border-dashed border-[#292E34] hover:border-[#B6F36B]/60 bg-[#14171A] hover:bg-[#1A1E23] rounded-lg p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all group text-center"
                >
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    onchange={handleWatermarkUpload}
                    disabled={isUploadingWatermark}
                    class="hidden"
                  />
                  {#if isUploadingWatermark}
                    <Loader2 class="w-6 h-6 text-[#B6F36B] animate-spin" />
                    <span class="text-xs text-[#E7E9EC] font-medium">Mengunggah logo...</span>
                  {:else}
                    <div class="w-9 h-9 rounded-full bg-[#20242A] group-hover:bg-[#282E36] flex items-center justify-center text-[#B6F36B] transition-colors">
                      <UploadCloud class="w-5 h-5" />
                    </div>
                    <div>
                      <span class="text-xs font-semibold text-[#E7E9EC] block">Pilih Gambar Watermark / Logo</span>
                      <span class="text-[10px] text-[#626871] mt-0.5 block">Format PNG transparan, JPG, WebP, SVG</span>
                    </div>
                  {/if}
                </label>
                {#if watermarkUploadError}
                  <div class="p-2 rounded bg-red-950/40 border border-red-500/30 text-red-300 text-[10px] flex items-center gap-1.5">
                    <AlertCircle class="w-3.5 h-3.5 shrink-0 text-red-400" />
                    <span>{watermarkUploadError}</span>
                  </div>
                {/if}
              {:else}
                <!-- Tampilan Logo Aktif -->
                <div class="p-2.5 bg-[#14171A] border border-[#292E34] rounded-lg flex items-center justify-between gap-3">
                  <div class="flex items-center gap-2.5 min-w-0">
                    <div class="w-12 h-12 rounded bg-[#0D0F11] border border-[#292E34] p-1 flex items-center justify-center shrink-0 overflow-hidden">
                      <img src={clip.watermark.imageUrl} alt="Thumbnail Watermark" class="max-w-full max-h-full object-contain" />
                    </div>
                    <div class="min-w-0">
                      <span class="text-xs font-semibold text-[#E7E9EC] block truncate">Watermark Terpasang</span>
                      <span class="text-[10px] text-[#B6F36B] font-mono">1:1 Sinkron Preview & Render</span>
                    </div>
                  </div>

                  <div class="flex items-center gap-1.5 shrink-0">
                    <label class="h-7 px-2 bg-[#20242A] hover:bg-[#282E36] text-[#E7E9EC] text-[10px] font-medium rounded border border-[#292E34] flex items-center gap-1 cursor-pointer transition-colors" title="Ganti Logo">
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        onchange={handleWatermarkUpload}
                        disabled={isUploadingWatermark}
                        class="hidden"
                      />
                      <span>Ganti</span>
                    </label>
                    <button
                      type="button"
                      onclick={removeWatermark}
                      class="h-7 w-7 rounded bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 text-red-400 flex items-center justify-center cursor-pointer transition-colors"
                      title="Hapus Watermark"
                    >
                      <Trash2 class="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <!-- Posisi Watermark Safe Zone Gambar 3 -->
                <div class="space-y-1.5 pt-1">
                  <div class="flex items-center justify-between text-[#9299A3] text-[11px]">
                    <span class="flex items-center gap-1">
                      <ShieldCheck class="w-3 h-3 text-[#FFA07A]" />
                      <span>Posisi Watermark (Safe Zone)</span>
                    </span>
                    <span class="font-mono text-[10px] text-[#B6F36B] font-bold">
                      {clip.watermark.position === 'top_left' ? 'Kiri Atas' :
                       clip.watermark.position === 'top_right' ? 'Kanan Atas' :
                       clip.watermark.position === 'bottom_left' ? 'Kiri Bawah' :
                       clip.watermark.position === 'bottom_right' ? 'Kanan Bawah' : 'Tengah'}
                    </span>
                  </div>
                  <div class="grid grid-cols-3 gap-1.5">
                    {#each [
                      { id: 'top_left' as WatermarkPosition, label: '↖ Kiri Atas' },
                      { id: 'top_right' as WatermarkPosition, label: '↗ Kanan Atas' },
                      { id: 'center' as WatermarkPosition, label: '⏺ Tengah' },
                      { id: 'bottom_left' as WatermarkPosition, label: '↙ Kiri Bawah' },
                      { id: 'bottom_right' as WatermarkPosition, label: '↘ Kanan Bawah' },
                    ] as p (p.id)}
                      <button
                        type="button"
                        onclick={() => updateWatermarkPosition(p.id)}
                        class="py-1.5 px-1 rounded border text-center transition-all cursor-pointer {(clip.watermark?.position || 'top_right') === p.id
                          ? 'bg-[#20242A] border-[#B6F36B] text-[#B6F36B] font-bold shadow-sm ring-1 ring-[#B6F36B]/40'
                          : 'bg-[#14171A] border-[#292E34] text-[#9299A3] hover:text-[#E7E9EC]'}"
                      >
                        <span class="text-[10px]">{p.label}</span>
                      </button>
                    {/each}
                  </div>
                </div>

                <!-- Slider Ukuran Watermark -->
                <div class="space-y-1 pt-1">
                  <div class="flex items-center justify-between text-[#9299A3] text-[11px]">
                    <span>Ukuran Skala Watermark</span>
                    <span class="font-mono text-[#B6F36B] font-bold">{clip.watermark?.sizePercent || 16}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="35"
                    step="1"
                    value={clip.watermark?.sizePercent || 16}
                    oninput={(e) => updateWatermarkSize(parseInt((e.target as HTMLInputElement).value))}
                    class="w-full accent-[#B6F36B] bg-[#292E34] h-1.5 rounded-lg cursor-pointer"
                  />
                  <div class="flex justify-between text-[9px] text-[#626871] font-mono">
                    <span>10% (Kecil)</span>
                    <span>16% (Ideal)</span>
                    <span>35% (Besar)</span>
                  </div>
                </div>

                <!-- Slider Transparansi (Opacity) -->
                <div class="space-y-1 pt-1">
                  <div class="flex items-center justify-between text-[#9299A3] text-[11px]">
                    <span>Transparansi / Opasitas</span>
                    <span class="font-mono text-[#B6F36B] font-bold">{Math.round((clip.watermark?.opacity ?? 0.85) * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="1.0"
                    step="0.05"
                    value={clip.watermark?.opacity ?? 0.85}
                    oninput={(e) => updateWatermarkOpacity(parseFloat((e.target as HTMLInputElement).value))}
                    class="w-full accent-[#B6F36B] bg-[#292E34] h-1.5 rounded-lg cursor-pointer"
                  />
                  <div class="flex justify-between text-[9px] text-[#626871] font-mono">
                    <span>20% (Samar)</span>
                    <span>85% (Standar)</span>
                    <span>100% (Solid)</span>
                  </div>
                </div>
              {/if}
            </div>

            <!-- 2. BACKGROUND MUSIC (BGM) YOUTUBE LINK -->
            <div class="p-3 bg-[#191C20] border border-[#292E34] rounded-lg space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-[#E7E9EC] font-semibold text-xs flex items-center gap-1.5">
                  <Music class="w-3.5 h-3.5 text-[#B6F36B]" />
                  <span>Musik Latar (YouTube Link)</span>
                </span>
                {#if clip.bgm?.audioUrl}
                  <label class="flex items-center gap-1.5 text-[10px] text-[#9299A3] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={clip.bgm?.enabled ?? true}
                      onchange={(e) => toggleBgm((e.target as HTMLInputElement).checked)}
                      class="accent-[#B6F36B] rounded cursor-pointer"
                    />
                    <span>{clip.bgm?.enabled ? 'Aktif' : 'Mute'}</span>
                  </label>
                {/if}
              </div>

              <!-- Input URL YouTube & Download Button -->
              {#if !clip.bgm?.audioUrl}
                <div class="space-y-2">
                  <p class="text-[11px] text-[#9299A3] leading-relaxed">
                    Tempelkan link YouTube musik/lagu yang ingin Anda gunakan sebagai background sound klip:
                  </p>
                  <div class="flex gap-2">
                    <input
                      type="url"
                      bind:value={bgmInputUrl}
                      placeholder="https://www.youtube.com/watch?v=..."
                      disabled={isLoadingBgm}
                      class="flex-1 bg-[#111315] border border-[#292E34] focus:border-[#B6F36B] rounded-lg px-2.5 py-1.5 text-xs text-[#E7E9EC] focus:outline-none placeholder-[#626871]"
                    />
                    <button
                      type="button"
                      onclick={handleLoadBgm}
                      disabled={isLoadingBgm || !bgmInputUrl.trim()}
                      class="h-8 px-3 rounded-lg bg-[#B6F36B] hover:bg-[#A5E456] disabled:opacity-50 text-[#111315] font-bold text-xs flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors shadow-sm"
                    >
                      {#if isLoadingBgm}
                        <Loader2 class="w-3.5 h-3.5 animate-spin" />
                        <span>Mengunduh...</span>
                      {:else}
                        <Music class="w-3.5 h-3.5" />
                        <span>Muat Musik</span>
                      {/if}
                    </button>
                  </div>

                  {#if bgmError}
                    <div class="p-2 rounded bg-red-950/40 border border-red-500/30 text-red-300 text-[10px] flex items-center gap-1.5">
                      <AlertCircle class="w-3.5 h-3.5 shrink-0 text-red-400" />
                      <span>{bgmError}</span>
                    </div>
                  {/if}
                </div>
              {:else}
                <!-- Status Musik Terpasang -->
                <div class="p-2.5 bg-[#14171A] border border-[#292E34] rounded-lg space-y-2">
                  <div class="flex items-center justify-between gap-2">
                    <div class="flex items-center gap-2 min-w-0">
                      <div class="w-8 h-8 rounded-full bg-[#B6F36B]/20 text-[#B6F36B] flex items-center justify-center shrink-0">
                        <Music class="w-4 h-4" />
                      </div>
                      <div class="min-w-0">
                        <span class="text-xs font-semibold text-[#E7E9EC] block truncate" title={clip.bgm?.title}>
                          {clip.bgm?.title || 'Audio YouTube'}
                        </span>
                        <span class="text-[9px] text-[#B6F36B] font-mono">Loop otomatis sinkron video</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onclick={removeBgm}
                      class="h-7 w-7 rounded bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 text-red-400 flex items-center justify-center cursor-pointer transition-colors shrink-0"
                      title="Hapus Musik BGM"
                    >
                      <Trash2 class="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {#if bgmSuccessMsg}
                    <div class="p-1.5 rounded bg-[#B6F36B]/15 border border-[#B6F36B]/30 text-[#B6F36B] text-[10px] flex items-center gap-1.5">
                      <Check class="w-3 h-3 text-[#B6F36B]" />
                      <span>{bgmSuccessMsg}</span>
                    </div>
                  {/if}

                  <!-- Volume BGM Slider (5% - 50%) -->
                  <div class="space-y-1 pt-1.5 border-t border-[#292E34]">
                    <div class="flex items-center justify-between text-[#9299A3] text-[11px]">
                      <span class="flex items-center gap-1">
                        <Volume2 class="w-3 h-3 text-[#B6F36B]" />
                        <span>Volume Musik Latar (BGM)</span>
                      </span>
                      <span class="font-mono text-[#B6F36B] font-bold">{clip.bgm?.volume || 15}%</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="50"
                      step="1"
                      value={clip.bgm?.volume || 15}
                      oninput={(e) => updateBgmVolume(parseInt((e.target as HTMLInputElement).value))}
                      class="w-full accent-[#B6F36B] bg-[#292E34] h-1.5 rounded-lg cursor-pointer"
                    />
                    <div class="flex justify-between text-[9px] text-[#626871] font-mono">
                      <span>5% (Pelan)</span>
                      <span>15% (Rekomendasi Vokal Jelas)</span>
                      <span>50% (Kencang)</span>
                    </div>
                  </div>
                </div>
              {/if}
            </div>
          </div>
        {:else}
          <!-- Transcript Tab: Edit Teks & Kalibrasi Waktu Kalimat -->
          <div class="space-y-4">
            <div class="p-3 bg-[#191C20] border border-[#292E34] rounded-lg">
              <div class="text-xs font-semibold text-[#E7E9EC] flex items-center justify-between">
                <span>Edit & Sinkronkan Teks</span>
                <span class="text-[10px] text-[#B6F36B] font-mono">Detik: {formatTimecode(currentTime, false)}</span>
              </div>
              <p class="text-[11px] text-[#9299A3] mt-1 leading-relaxed">
                Anda bisa mengubah kata atau klik tombol <strong>Kunci Detik</strong> untuk menyesuaikan waktu mulai kalimat tepat saat pembicara bersuara.
              </p>
            </div>

            {#each clip.captions as seg, segIdx (seg.id)}
              {@const isActiveSeg = currentTime >= seg.start && currentTime <= seg.end}
              <div
                class="p-3 rounded-lg border transition-all {isActiveSeg
                  ? 'bg-[#191C20] border-[#B6F36B]/60 ring-1 ring-[#B6F36B]/30 shadow-md'
                  : 'bg-[#14171A] border-[#292E34]'}"
              >
                <div class="flex items-center justify-between text-[11px] font-mono mb-2 text-[#9299A3]">
                  <span class="font-semibold text-[#E7E9EC]">{seg.speaker || 'Pembicara'}</span>
                  <div class="flex items-center gap-1.5">
                    <span class="text-[#B6F36B] font-bold">{formatTimecode(seg.start, false)} - {formatTimecode(seg.end, false)}</span>
                    <button
                      type="button"
                      onclick={() => (currentTime = seg.start)}
                      class="px-1.5 py-0.5 rounded bg-[#20242A] hover:bg-[#282E36] text-[#E7E9EC] text-[10px] cursor-pointer"
                      title="Putar video mulai kalimat ini"
                    >
                      ▶ Putar
                    </button>
                  </div>
                </div>

                <!-- Input Teks Subtitle yang bisa diedit langsung -->
                <textarea
                  rows="2"
                  value={seg.text}
                  oninput={(e) => updateSegmentText(segIdx, (e.target as HTMLTextAreaElement).value)}
                  class="w-full bg-[#111315] border border-[#292E34] focus:border-[#B6F36B] rounded p-2 text-xs text-[#E7E9EC] focus:outline-none resize-none leading-relaxed"
                  placeholder="Ketik teks subtitle di sini..."
                ></textarea>

                <div class="mt-2 flex items-center justify-between">
                  <button
                    type="button"
                    onclick={() => snapSegmentToPlayhead(segIdx)}
                    class="h-6 px-2 text-[10px] font-semibold text-[#111315] bg-[#B6F36B] hover:bg-[#A5E456] rounded transition-colors flex items-center gap-1 cursor-pointer"
                    title="Jadikan detik video saat ini ({formatTimecode(currentTime, false)}) sebagai awal kalimat ini"
                  >
                    <span>⏱️ Kunci Mulai di {formatTimecode(currentTime, false)}</span>
                  </button>

                  <span class="text-[10px] text-[#626871] font-mono">
                    {seg.words?.length || 0} kata terpetakan
                  </span>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </div>

  <!-- Bottom Stage: Dedicated Timeline Component -->
  <EditorTimeline {clip} bind:currentTime bind:isPlaying />
</div>
