<script lang="ts">
  import { workspace } from '#lib/state/workspace.svelte';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { formatTimecode } from '#lib/utils/clippingRules';
  import type { SocialPlatform, ScheduledPost, ClipCandidate } from '#lib/types';
  import {
    Calendar,
    Clock,
    Share2,
    Trash2,
    Download,
    Sparkles,
    Copy,
    Check,
    ExternalLink,
    Image as ImageIcon,
    Sliders,
    Layers,
    ArrowRight,
    Loader2,
    CheckCircle2,
    AlertCircle,
    Flame,
    Tag,
    FileText,
    Send,
  } from 'lucide-svelte';

  const queryClipId = $derived(page.url.searchParams.get('clipId'));

  let selectedClipId = $state<string>('');
  let publishMode = $state<'publish_now' | 'schedule'>('publish_now');
  let privacyStatus = $state<'public' | 'unlisted' | 'private'>('public');
  let scheduledDate = $state<string>(new Date(Date.now() + 86400000).toISOString().slice(0, 16));

  // AI-generated metadata states
  let titleInput = $state<string>('');
  let descriptionInput = $state<string>('');
  let tagsInput = $state<string>('');
  let selectedThumbnailIndex = $state<number>(0);

  // Copy feedback states
  let copiedTitle = $state(false);
  let copiedDesc = $state(false);
  let copiedTags = $state(false);
  let copiedAll = $state(false);

  // Publish submission feedback
  let isPublishing = $state(false);
  let publishSuccessMsg = $state<string | null>(null);

  // Export & Download Modal states (dipindahkan dari Editor ke halaman ini)
  let showExportModal = $state(false);
  let selectedResolution = $state<'1080p' | '720p' | '4k'>('1080p');
  let selectedFps = $state<30 | 60>(30);
  let selectedBitrate = $state<14 | 18 | 30>(14);
  let isExportRendering = $state(false);
  let exportSuccess = $state(false);
  let exportError = $state<string | null>(null);

  // Connected YouTube Account State (Focus on YouTube Shorts)
  let youtubeAccount = $state({
    connected: true,
    email: 'ngobroldikit@gmail.com',
    channelName: 'Ngobrol Dikit',
    handle: '@ngobroldikit',
    verified: true,
  });

  const selectedClip = $derived.by(() => {
    if (selectedClipId) {
      const found = workspace.candidates.find((c) => c.id === selectedClipId);
      if (found) return found;
    }
    if (queryClipId) {
      const found = workspace.candidates.find((c) => c.id === queryClipId);
      if (found) return found;
    }
    return workspace.activeClip || workspace.candidates[0] || null;
  });

  function getCleanYoutubeId(clip: ClipCandidate | null) {
    if (!clip) return 'wsCBMCa_DBA';
    const rawId = clip.sourceVideoId || workspace.activeVideo?.id || 'wsCBMCa_DBA';
    const cleanId = rawId.replace(/^yt-/, '').replace(/[^a-zA-Z0-9_-]/g, '');
    return cleanId.length === 11 ? cleanId : 'wsCBMCa_DBA';
  }

  function getThumbnailUrl(clip: ClipCandidate | null) {
    if (!clip) return '';
    if (workspace.activeVideo?.thumbnailUrl) {
      return workspace.activeVideo.thumbnailUrl;
    }
    const ytId = getCleanYoutubeId(clip);
    return `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`;
  }

  // Rekomendasi 3 variasi Thumbnail berdasarkan hook
  const thumbnailRecommendations = $derived.by(() => {
    if (!selectedClip) return [];
    const baseImg = getThumbnailUrl(selectedClip);
    return [
      {
        id: 0,
        title: 'Frame Hook Utama (Rasa Penasaran)',
        tag: 'Paling Disarankan',
        badgeColor: 'bg-[#B6F36B] text-[#111315]',
        imgUrl: baseImg,
        overlayText: selectedClip.title.toUpperCase(),
      },
      {
        id: 1,
        title: 'Frame Puncak Energi & Reaksi',
        tag: 'Dinamis',
        badgeColor: 'bg-[#F59E0B] text-[#111315]',
        imgUrl: baseImg,
        overlayText: '“' + (selectedClip.excerptQuote || selectedClip.title).slice(0, 32) + '...”',
      },
      {
        id: 2,
        title: 'Frame Punchline Vertikal 9:16',
        tag: 'Skor ' + selectedClip.score,
        badgeColor: 'bg-[#3B82F6] text-white',
        imgUrl: baseImg,
        overlayText: 'JANGAN SAMPAI LEWAT! 🔥',
      },
    ];
  });

  // Rekomendasi 3 variasi Judul Hook Viral
  const titleRecommendations = $derived.by(() => {
    if (!selectedClip) return [];
    const speakerClean = selectedClip.speaker || 'Podcast';
    const rawTitle = selectedClip.title;
    const rawQuote = (selectedClip.excerptQuote || rawTitle).replace(/^["']|["']$/g, '');

    return [
      {
        type: 'Curiosity Hook (Rasa Penasaran)',
        text: `${rawTitle}... Ternyata Gini Ceritanya! 😱 #shorts`,
      },
      {
        type: 'Punchline Hook (Emosional / Lucu)',
        text: `Momen Tak Terduga Pas ${rawTitle}! 🔥 #shorts`,
      },
      {
        type: 'Direct Quote (Kutipan Asli Pembicara)',
        text: `"${rawQuote.slice(0, 48)}..." 🎙️ #shorts`,
      },
    ];
  });

  // Rekomendasi Deskripsi Singkat Otomatis
  function generateDefaultDescription(clip: ClipCandidate): string {
    const rawQuote = (clip.excerptQuote || clip.title).replace(/^["']|["']$/g, '');
    const videoTitle = workspace.activeVideo?.title || 'Obrolan Seru';
    const speaker = clip.speaker || 'Narasumber';

    return `Cuplikan seru dari "${videoTitle}"!
"${rawQuote}"

🎙️ Pembicara: ${speaker}
⏱️ Durasi: ${clip.duration} detik | Skor Hook: ${clip.hookScore}% | Energi: ${clip.energyScore}%

Dipotong dan disinkronkan secara presisi menggunakan Kroma Clipper AI.
Jangan lupa Like, Comment, dan Subscribe @ngobroldikit untuk update klip viral berikutnya!

#shorts #youtubeshorts #podcast #${speaker.toLowerCase().replace(/[^a-z0-9]+/g, '')} #viral #fyp #indonesia`;
  }

  // Rekomendasi Tags Otomatis
  function generateDefaultTags(clip: ClipCandidate): string {
    const speaker = (clip.speaker || 'podcast').toLowerCase().replace(/[^a-z0-9]+/g, '');
    return `#shorts #youtubeshorts #podcast #${speaker} #viral #fyp #trending #ngobroldikit #shortsfeed`;
  }

  // Sinkronisasi saat clip berubah
  $effect(() => {
    if (selectedClip) {
      selectedClipId = selectedClip.id;
      // Gunakan rekomendasi pertama sebagai default jika belum diisi
      if (!titleInput || !titleRecommendations.some((t) => t.text === titleInput)) {
        titleInput = titleRecommendations[0]?.text || selectedClip.title;
      }
      descriptionInput = generateDefaultDescription(selectedClip);
      tagsInput = generateDefaultTags(selectedClip);
      selectedThumbnailIndex = 0;
    }
  });

  // Copy helper with feedback
  async function copyToClipboard(text: string, type: 'title' | 'desc' | 'tags' | 'all') {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'title') {
        copiedTitle = true;
        setTimeout(() => (copiedTitle = false), 2000);
      } else if (type === 'desc') {
        copiedDesc = true;
        setTimeout(() => (copiedDesc = false), 2000);
      } else if (type === 'tags') {
        copiedTags = true;
        setTimeout(() => (copiedTags = false), 2000);
      } else if (type === 'all') {
        copiedAll = true;
        setTimeout(() => (copiedAll = false), 2500);
      }
    } catch {
      console.warn('Gagal menyalin ke clipboard');
    }
  }

  function copyAllMetadata() {
    const bundle = `=== JUDUL YOUTUBE SHORTS ===\n${titleInput}\n\n=== DESKRIPSI SINGKAT ===\n${descriptionInput}\n\n=== TAGS & HASHTAGS ===\n${tagsInput}`;
    copyToClipboard(bundle, 'all');
  }

  function downloadThumbnailFile() {
    if (!selectedClip) return;
    const url = getThumbnailUrl(selectedClip);
    if (!url) return;

    const a = document.createElement('a');
    a.href = url;
    a.download = `thumbnail_${selectedClip.title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.jpg`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function openExportModal() {
    showExportModal = true;
    exportSuccess = false;
    exportError = null;
  }

  function closeExportModal() {
    if (isExportRendering) return;
    showExportModal = false;
  }

  async function handleExecuteExport() {
    if (!selectedClip || isExportRendering) return;
    isExportRendering = true;
    exportError = null;
    exportSuccess = false;

    try {
      await workspace.quickDownloadClip(selectedClip, {
        resolution: selectedResolution,
        fps: selectedFps,
        bitrate: selectedBitrate,
      });
      exportSuccess = true;
      setTimeout(() => {
        showExportModal = false;
        exportSuccess = false;
      }, 2500);
    } catch (e: any) {
      console.error('Export error:', e);
      exportError = e.message || 'Gagal merender video. Silakan coba lagi.';
    } finally {
      isExportRendering = false;
    }
  }

  async function handlePublishOrSchedule() {
    if (!selectedClip) return;
    isPublishing = true;
    publishSuccessMsg = null;

    try {
      const isNow = publishMode === 'publish_now';
      const scheduledTime = isNow ? new Date().toISOString() : new Date(scheduledDate).toISOString();

      const newPost: ScheduledPost = {
        id: `post-${Date.now()}`,
        clipId: selectedClip.id,
        clipTitle: titleInput || selectedClip.title,
        thumbnailUrl: getThumbnailUrl(selectedClip),
        platform: 'youtube_shorts',
        caption: descriptionInput,
        hashtags: tagsInput ? tagsInput.split(' ').filter(Boolean) : [],
        scheduledTime,
        status: isNow ? 'published' : 'scheduled',
        aspectRatio: selectedClip.aspectRatio,
        durationSeconds: selectedClip.duration,
      };

      // Panggil endpoint backend YouTube publish
      const res = await fetch('/api/youtube/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clipId: selectedClip.id,
          title: titleInput || selectedClip.title,
          description: descriptionInput,
          tags: tagsInput ? tagsInput.split(' ').filter(Boolean) : [],
          privacy: privacyStatus,
          scheduledTime,
          email: youtubeAccount.email,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal memproses publikasi YouTube');
      }

      workspace.addScheduledPost(newPost);

      if (isNow) {
        publishSuccessMsg = `🎉 Klip berhasil dipublish ke YouTube Shorts akun ${youtubeAccount.email} (${privacyStatus.toUpperCase()})!`;
      } else {
        publishSuccessMsg = `📅 Klip berhasil dijadwalkan untuk diposting pada ${new Date(scheduledDate).toLocaleString('id-ID')} ke akun ${youtubeAccount.email}!`;
      }
    } catch (err: any) {
      console.error('Publish error:', err);
      alert('Gagal memproses publikasi: ' + err.message);
    } finally {
      isPublishing = false;
    }
  }
</script>

<div class="flex-1 flex flex-col overflow-y-auto bg-[#111315] p-6 lg:p-8">
  <!-- Top Header & Global Actions -->
  <div class="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#292E34] pb-5">
    <div>
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-lg bg-[#FF0000]/15 border border-[#FF0000]/30 flex items-center justify-center text-[#FF0000]">
          <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
          </svg>
        </div>
        <h1 class="text-xl font-bold text-[#E7E9EC] tracking-tight">
          5. Siap Publikasi & Rekomendasi YouTube Shorts
        </h1>
      </div>
      <p class="text-xs text-[#9299A3] mt-1.5 max-w-2xl leading-relaxed">
        Rekomendasi thumbnail viral, judul hook memikat, deskripsi singkat, unduh video MP4, dan publikasi langsung ke channel YouTube Shorts Anda.
      </p>
    </div>

    <!-- Tombol Utama: Unduh MP4 & Copy Bundle -->
    <div class="flex items-center gap-2.5 self-start md:self-auto shrink-0">
      <!-- SALIN SEMUA INFO BUTTON -->
      <button
        type="button"
        onclick={copyAllMetadata}
        class="h-9 px-3.5 rounded-lg bg-[#191C20] hover:bg-[#20242A] text-[#E7E9EC] border border-[#292E34] hover:border-[#383F47] transition-all flex items-center gap-2 cursor-pointer text-xs font-semibold shadow-sm"
        title="Salin judul, deskripsi, dan hashtag sekaligus ke clipboard"
      >
        {#if copiedAll}
          <Check class="w-4 h-4 text-[#B6F36B]" />
          <span class="text-[#B6F36B]">Semua Info Tersalin!</span>
        {:else}
          <Copy class="w-4 h-4 text-[#9299A3]" />
          <span>Salin Semua Info</span>
        {/if}
      </button>

      <!-- TOMBOL UNDUH VIDEO INI (MP4) - DIPINDAHKAN KE HALAMAN INI -->
      <button
        type="button"
        onclick={openExportModal}
        class="h-9 px-4 rounded-lg bg-[#B6F36B] hover:bg-[#A5E456] active:bg-[#94D445] text-[#111315] font-bold text-xs transition-all flex items-center gap-2 cursor-pointer shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B6F36B]/50 shrink-0"
        title="Render & download video MP4 dengan subtitle, watermark, BGM & framing vertikal 9:16"
      >
        <Download class="w-4 h-4 stroke-[2.5]" />
        <span>⬇️ Unduh Video Ini (MP4)</span>
      </button>
    </div>
  </div>

  {#if workspace.candidates.length === 0}
    <!-- Empty State -->
    <div class="rounded-xl border border-dashed border-[#292E34] p-12 text-center bg-[#14171A] max-w-2xl mx-auto my-8">
      <div class="w-14 h-14 rounded-full bg-[#191C20] border border-[#292E34] flex items-center justify-center mx-auto mb-4 text-[#B6F36B]">
        <Layers class="w-7 h-7" />
      </div>
      <h3 class="text-sm font-semibold text-[#E7E9EC]">Belum Ada Klip yang Dipilih</h3>
      <p class="text-xs text-[#9299A3] mt-1.5 max-w-md mx-auto leading-relaxed">
        Silakan selesaikan pemotongan klip di menu <strong>2. Analisis AI</strong> atau pilih klip di <strong>3. Pilihan Klip</strong> untuk melihat rekomendasi judul, thumbnail, dan publikasi YouTube Shorts.
      </p>
      <div class="mt-5">
        <button
          type="button"
          onclick={() => goto('/candidates')}
          class="h-9 px-4 text-xs font-semibold text-[#111315] bg-[#B6F36B] hover:bg-[#A5E456] rounded transition-colors inline-flex items-center gap-2 cursor-pointer shadow-sm"
        >
          <span>Buka Pilihan Klip</span>
          <ArrowRight class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  {:else}
    <!-- SUCCESS / PUBLISH FEEDBACK BANNER -->
    {#if publishSuccessMsg}
      <div class="mb-6 p-4 rounded-xl bg-gradient-to-r from-[#172214] to-[#191C20] border border-[#B6F36B] shadow-lg flex items-center justify-between gap-4 animate-fadeIn">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-lg bg-[#B6F36B]/20 border border-[#B6F36B] flex items-center justify-center text-[#B6F36B] shrink-0">
            <CheckCircle2 class="w-5 h-5" />
          </div>
          <div>
            <div class="text-xs font-bold text-[#E7E9EC]">{publishSuccessMsg}</div>
            <div class="text-[11px] text-[#9299A3] mt-0.5">
              Video siap ditonton oleh audiens Anda di platform YouTube Shorts.
            </div>
          </div>
        </div>

        <button
          type="button"
          onclick={() => (publishSuccessMsg = null)}
          class="text-xs text-[#9299A3] hover:text-[#E7E9EC] px-2 py-1 rounded bg-[#20242A] cursor-pointer"
        >
          Tutup
        </button>
      </div>
    {/if}

    <!-- Main Two-Column Layout -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <!-- LEFT / CENTER COLUMN: AI RECOMMENDATIONS (8 Cols) -->
      <div class="lg:col-span-7 xl:col-span-8 space-y-6">
        <!-- 1. KLIP SELECTOR & DETAIL CARD -->
        <div class="p-5 rounded-xl bg-[#191C20] border border-[#292E34] space-y-3">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span class="text-[11px] font-semibold text-[#626871] uppercase tracking-wider">
              Klip yang Sedang Diproses
            </span>

            {#if selectedClip}
              <div class="flex items-center gap-2 text-xs font-mono text-[#9299A3]">
                <span class="text-[#E7E9EC] font-semibold">{selectedClip.speaker}</span>
                <span>·</span>
                <span class="text-[#B6F36B]">{formatTimecode(selectedClip.startTime, false)} – {formatTimecode(selectedClip.endTime, false)}</span>
                <span>·</span>
                <span>{selectedClip.duration}s</span>
              </div>
            {/if}
          </div>

          <select
            value={selectedClipId}
            onchange={(e) => {
              selectedClipId = (e.target as HTMLSelectElement).value;
            }}
            class="w-full h-10 px-3 bg-[#14171A] border border-[#292E34] hover:border-[#383F47] rounded-lg text-xs text-[#E7E9EC] focus:outline-none focus:border-[#B6F36B] cursor-pointer font-medium"
          >
            {#each workspace.candidates as c (c.id)}
              <option value={c.id}>
                {c.title} — {c.speaker} ({c.duration}s · Skor Viral {c.score}/100)
              </option>
            {/each}
          </select>
        </div>

        <!-- 2. REKOMENDASI THUMBNAIL (VISUAL 9:16) -->
        <div class="p-5 rounded-xl bg-[#191C20] border border-[#292E34] space-y-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <ImageIcon class="w-4 h-4 text-[#B6F36B]" />
              <span class="text-sm font-bold text-[#E7E9EC]">
                Rekomendasi Thumbnail YouTube Shorts (Format 9:16)
              </span>
            </div>

            <button
              type="button"
              onclick={downloadThumbnailFile}
              class="h-7 px-2.5 rounded-md bg-[#20242A] hover:bg-[#282E36] text-[#B6F36B] hover:text-[#A5E456] text-[11px] font-semibold border border-[#292E34] flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Unduh file gambar thumbnail resolusi tinggi"
            >
              <Download class="w-3.5 h-3.5" />
              <span>Unduh Thumbnail (JPG)</span>
            </button>
          </div>

          <p class="text-xs text-[#9299A3]">
            Pilih visual frame dengan ekspresi pembicara terbaik dan kontras tinggi untuk menarik klik penonton (CTR) di feed Shorts:
          </p>

          <!-- Thumbnail Options Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
            {#each thumbnailRecommendations as thumb (thumb.id)}
              {@const isSelected = selectedThumbnailIndex === thumb.id}
              <button
                type="button"
                onclick={() => (selectedThumbnailIndex = thumb.id)}
                class="group flex flex-col rounded-xl overflow-hidden border-2 transition-all cursor-pointer text-left {isSelected
                  ? 'border-[#B6F36B] ring-2 ring-[#B6F36B]/30 shadow-lg'
                  : 'border-[#292E34] hover:border-[#383F47] bg-[#14171A]'}"
              >
                <!-- 9:16 Aspect Thumbnail Container -->
                <div class="relative aspect-[9/14] w-full bg-black overflow-hidden flex items-center justify-center">
                  <img
                    src={thumb.imgUrl}
                    alt={thumb.title}
                    class="w-full h-full object-cover filter brightness-90 group-hover:brightness-95 transition-all"
                  />
                  <!-- Vignette & text overlay -->
                  <div class="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/40"></div>

                  <!-- Tag Pill -->
                  <div class="absolute top-2 left-2 z-10 px-2 py-0.5 rounded text-[10px] font-bold font-mono {thumb.badgeColor}">
                    {thumb.tag}
                  </div>

                  <!-- Dynamic Teaser Text Overlay -->
                  <div class="absolute bottom-3 inset-x-2.5 z-10 text-center">
                    <span class="inline-block px-2 py-1 rounded bg-black/80 backdrop-blur-sm border border-white/10 text-[11px] font-black text-[#B6F36B] uppercase leading-tight shadow-md">
                      {thumb.overlayText}
                    </span>
                  </div>

                  {#if isSelected}
                    <div class="absolute top-2 right-2 z-10 w-5 h-5 rounded-full bg-[#B6F36B] text-[#111315] flex items-center justify-center shadow">
                      <Check class="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  {/if}
                </div>

                <!-- Label -->
                <div class="p-2.5 bg-[#14171A] flex-1 flex flex-col justify-between">
                  <div class="text-[11px] font-semibold text-[#E7E9EC] line-clamp-1">
                    {thumb.title}
                  </div>
                  <span class="text-[10px] text-[#626871] mt-0.5">
                    {isSelected ? '✓ Terpilih untuk upload' : 'Klik untuk memilih'}
                  </span>
                </div>
              </button>
            {/each}
          </div>
        </div>

        <!-- 3. REKOMENDASI JUDUL (SESUAI HOOK VIRAL) -->
        <div class="p-5 rounded-xl bg-[#191C20] border border-[#292E34] space-y-3.5">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <Sparkles class="w-4 h-4 text-[#B6F36B]" />
              <span class="text-sm font-bold text-[#E7E9EC]">
                Rekomendasi Judul YouTube Shorts (Sesuai Hook)
              </span>
            </div>

            <button
              type="button"
              onclick={() => copyToClipboard(titleInput, 'title')}
              class="h-7 px-2.5 rounded-md bg-[#20242A] hover:bg-[#282E36] text-[#9299A3] hover:text-[#E7E9EC] text-[11px] font-medium border border-[#292E34] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {#if copiedTitle}
                <Check class="w-3.5 h-3.5 text-[#B6F36B]" />
                <span class="text-[#B6F36B]">Tersalin!</span>
              {:else}
                <Copy class="w-3.5 h-3.5" />
                <span>Salin Judul</span>
              {/if}
            </button>
          </div>

          <p class="text-xs text-[#9299A3]">
            Klik salah satu formula hook di bawah ini untuk langsung menerapkannya ke judul:
          </p>

          <!-- 3 Clickable Title Hook Variations -->
          <div class="space-y-2">
            {#each titleRecommendations as rec (rec.type)}
              {@const isCurrent = titleInput === rec.text}
              <button
                type="button"
                onclick={() => (titleInput = rec.text)}
                class="w-full p-2.5 rounded-lg border text-left transition-all cursor-pointer flex items-start justify-between gap-3 {isCurrent
                  ? 'bg-[#20242A] border-[#B6F36B] text-[#B6F36B] shadow-sm'
                  : 'bg-[#14171A] border-[#292E34] text-[#E7E9EC] hover:border-[#383F47]'}"
              >
                <div>
                  <span class="text-[10px] uppercase font-mono block {isCurrent ? 'text-[#B6F36B]' : 'text-[#626871]'} font-semibold">
                    {rec.type}
                  </span>
                  <div class="text-xs font-semibold mt-0.5 leading-snug">
                    {rec.text}
                  </div>
                </div>

                <div class="shrink-0 mt-1">
                  {#if isCurrent}
                    <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#B6F36B]/20 text-[#B6F36B] font-bold">
                      AKTIF
                    </span>
                  {:else}
                    <span class="text-[10px] text-[#626871] hover:text-[#E7E9EC]">
                      Gunakan ↵
                    </span>
                  {/if}
                </div>
              </button>
            {/each}
          </div>

          <!-- Input Box Judul Editable -->
          <div class="pt-2">
            <div class="flex justify-between items-center mb-1">
              <label for="yt-title-input" class="text-[11px] font-semibold text-[#626871] uppercase tracking-wider">
                Judul Aktif (Bisa Diedit Manual)
              </label>
              <span class="text-[10px] font-mono {titleInput.length > 95 ? 'text-[#EF4444]' : 'text-[#626871]'}">
                {titleInput.length}/100 karakter
              </span>
            </div>
            <input
              id="yt-title-input"
              type="text"
              bind:value={titleInput}
              maxlength="100"
              class="w-full h-10 px-3 bg-[#14171A] border border-[#292E34] rounded-lg text-xs text-[#E7E9EC] font-semibold focus:outline-none focus:border-[#B6F36B]"
              placeholder="Tulis judul YouTube Shorts yang memikat..."
            />
          </div>
        </div>

        <!-- 4. REKOMENDASI DESKRIPSI SINGKAT & TAGS -->
        <div class="p-5 rounded-xl bg-[#191C20] border border-[#292E34] space-y-4">
          <!-- Deskripsi Header & Copy -->
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <div class="flex items-center gap-2">
                <FileText class="w-4 h-4 text-[#B6F36B]" />
                <span class="text-sm font-bold text-[#E7E9EC]">
                  Deskripsi Singkat (Ringkasan Pembahasan)
                </span>
              </div>

              <button
                type="button"
                onclick={() => copyToClipboard(descriptionInput, 'desc')}
                class="h-7 px-2.5 rounded-md bg-[#20242A] hover:bg-[#282E36] text-[#9299A3] hover:text-[#E7E9EC] text-[11px] font-medium border border-[#292E34] flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {#if copiedDesc}
                  <Check class="w-3.5 h-3.5 text-[#B6F36B]" />
                  <span class="text-[#B6F36B]">Tersalin!</span>
                {:else}
                  <Copy class="w-3.5 h-3.5" />
                  <span>Salin Deskripsi</span>
                {/if}
              </button>
            </div>

            <p class="text-xs text-[#9299A3] mb-2.5">
              Deskripsi telah dirangkum otomatis dari inti percakapan di klip video ini:
            </p>

            <textarea
              rows="5"
              bind:value={descriptionInput}
              class="w-full p-3 bg-[#14171A] border border-[#292E34] rounded-lg text-xs text-[#E7E9EC] leading-relaxed focus:outline-none focus:border-[#B6F36B] font-sans"
            ></textarea>
          </div>

          <!-- Tags & Hashtags -->
          <div class="pt-2 border-t border-[#292E34]">
            <div class="flex items-center justify-between mb-1.5">
              <div class="flex items-center gap-1.5 text-xs font-bold text-[#E7E9EC]">
                <Tag class="w-3.5 h-3.5 text-[#B6F36B]" />
                <span>Rekomendasi Hashtag Shorts</span>
              </div>

              <button
                type="button"
                onclick={() => copyToClipboard(tagsInput, 'tags')}
                class="h-6 px-2 rounded bg-[#20242A] hover:bg-[#282E36] text-[#9299A3] hover:text-[#E7E9EC] text-[10px] font-medium border border-[#292E34] flex items-center gap-1 transition-colors cursor-pointer"
              >
                {#if copiedTags}
                  <Check class="w-3 h-3 text-[#B6F36B]" />
                  <span class="text-[#B6F36B]">Tersalin!</span>
                {:else}
                  <Copy class="w-3 h-3" />
                  <span>Salin Tags</span>
                {/if}
              </button>
            </div>

            <input
              type="text"
              bind:value={tagsInput}
              class="w-full h-9 px-3 bg-[#14171A] border border-[#292E34] rounded-lg text-xs font-mono text-[#B6F36B] focus:outline-none focus:border-[#B6F36B]"
            />
          </div>
        </div>
      </div>

      <!-- RIGHT COLUMN: YOUTUBE ACCOUNT & PUBLISH ACTIONS (4 Cols) -->
      <div class="lg:col-span-5 xl:col-span-4 space-y-6">
        <!-- 1. KARTU AKUN YOUTUBE SHORTS TERHUBUNG -->
        <div class="p-5 rounded-xl bg-gradient-to-b from-[#1C1818] to-[#191C20] border-2 border-[#FF0000]/40 shadow-lg space-y-4">
          <div class="flex items-center justify-between border-b border-[#292E34] pb-3">
            <div class="flex items-center gap-2 text-[#FF0000]">
              <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
              <span class="text-xs font-bold text-[#E7E9EC]">Koneksi Akun YouTube</span>
            </div>

            <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40 font-bold">
              TERHUBUNG
            </span>
          </div>

          <!-- Detail Akun YouTube -->
          <div class="flex items-start gap-3 p-3 rounded-lg bg-[#14171A] border border-[#292E34]">
            <div class="w-10 h-10 rounded-full bg-[#FF0000] text-white font-bold flex items-center justify-center shrink-0 shadow-md">
              ND
            </div>
            <div class="min-w-0 flex-1">
              <div class="text-xs font-bold text-[#E7E9EC] truncate">
                {youtubeAccount.channelName}
              </div>
              <div class="text-[11px] text-[#B6F36B] font-mono truncate">
                {youtubeAccount.email}
              </div>
              <div class="text-[10px] text-[#626871] mt-0.5">
                Channel Utama · YouTube Shorts Ready
              </div>
            </div>
          </div>

          <!-- Edukasi Keamanan Google / YouTube OAuth -->
          <div class="p-3 rounded-lg bg-[#201815] border border-[#F59E0B]/30 text-[11px] text-[#E7E9EC] leading-relaxed space-y-1">
            <div class="font-bold text-[#F59E0B] flex items-center gap-1.5">
              <AlertCircle class="w-3.5 h-3.5" />
              <span>Otentikasi Aman Google OAuth 2.0</span>
            </div>
            <p class="text-[10px] text-[#9299A3]">
              Google YouTube API mewajibkan otentikasi standar OAuth 2.0 (bukan password teks biasa demi privasi akun). Akun <strong>{youtubeAccount.email}</strong> telah terdaftar sebagai channel tujuan.
            </p>
          </div>

          <!-- Shortcut Direct Upload ke YouTube Studio -->
          <a
            href="https://studio.youtube.com/channel/upload"
            target="_blank"
            rel="noopener noreferrer"
            class="h-9 w-full px-3 rounded-lg bg-[#20242A] hover:bg-[#282E36] text-[#E7E9EC] text-xs font-semibold border border-[#292E34] hover:border-[#383F47] flex items-center justify-center gap-2 transition-all shadow-sm"
          >
            <span>Buka YouTube Studio Upload</span>
            <ExternalLink class="w-3.5 h-3.5 text-[#9299A3]" />
          </a>
        </div>

        <!-- 2. PILIHAN PUBLIKASI: SEKARANG ATAU JADWALKAN -->
        <div class="p-5 rounded-xl bg-[#191C20] border border-[#292E34] space-y-4">
          <div class="flex items-center gap-2 border-b border-[#292E34] pb-3">
            <Send class="w-4 h-4 text-[#B6F36B]" />
            <span class="text-xs font-bold text-[#E7E9EC]">
              Pilih Waktu Publikasi
            </span>
          </div>

          <!-- Switcher: Publish Sekarang vs Jadwalkan -->
          <div class="grid grid-cols-2 p-1 bg-[#14171A] rounded-lg border border-[#292E34]">
            <button
              type="button"
              onclick={() => (publishMode = 'publish_now')}
              class="py-2 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5 {publishMode === 'publish_now'
                ? 'bg-[#20242A] text-[#B6F36B] shadow-sm'
                : 'text-[#9299A3] hover:text-[#E7E9EC]'}"
            >
              <Send class="w-3.5 h-3.5" />
              <span>Publish Sekarang</span>
            </button>

            <button
              type="button"
              onclick={() => (publishMode = 'schedule')}
              class="py-2 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5 {publishMode === 'schedule'
                ? 'bg-[#20242A] text-[#B6F36B] shadow-sm'
                : 'text-[#9299A3] hover:text-[#E7E9EC]'}"
            >
              <Clock class="w-3.5 h-3.5" />
              <span>Jadwalkan</span>
            </button>
          </div>

          {#if publishMode === 'publish_now'}
            <!-- Pengaturan Publish Sekarang -->
            <div class="space-y-3 pt-1">
              <div>
                <label for="yt-privacy-select" class="text-[11px] font-semibold text-[#626871] uppercase tracking-wider block mb-1">
                  Visibilitas YouTube Shorts
                </label>
                <select
                  id="yt-privacy-select"
                  bind:value={privacyStatus}
                  class="w-full h-9 px-2.5 bg-[#14171A] border border-[#292E34] rounded-lg text-xs text-[#E7E9EC] focus:outline-none cursor-pointer"
                >
                  <option value="public">Publik (Langsung Tayang di Feed Shorts)</option>
                  <option value="unlisted">Tidak Publik (Hanya yang Punya Link)</option>
                  <option value="private">Pribadi (Hanya Pemilik Akun)</option>
                </select>
              </div>

              <!-- Tombol Eksekusi Publish Sekarang -->
              <button
                type="button"
                onclick={handlePublishOrSchedule}
                disabled={isPublishing}
                class="w-full h-11 rounded-xl bg-[#B6F36B] hover:bg-[#A5E456] active:bg-[#94D445] text-[#111315] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg hover:shadow-[#B6F36B]/20 disabled:opacity-50"
              >
                {#if isPublishing}
                  <Loader2 class="w-4 h-4 animate-spin" />
                  <span>Memproses Upload ke Shorts...</span>
                {:else}
                  <Send class="w-4 h-4 stroke-[2.5]" />
                  <span>🚀 Upload & Publish ke YouTube Shorts</span>
                {/if}
              </button>
            </div>
          {:else}
            <!-- Pengaturan Jadwalkan Postingan -->
            <div class="space-y-3 pt-1">
              <div>
                <label for="yt-schedule-time" class="text-[11px] font-semibold text-[#626871] uppercase tracking-wider block mb-1">
                  Waktu & Tanggal Tayang
                </label>
                <input
                  id="yt-schedule-time"
                  type="datetime-local"
                  bind:value={scheduledDate}
                  class="w-full h-9 px-3 bg-[#14171A] border border-[#292E34] rounded-lg text-xs text-[#E7E9EC] font-mono focus:outline-none focus:border-[#B6F36B]"
                />
              </div>

              <!-- Tombol Eksekusi Jadwalkan -->
              <button
                type="button"
                onclick={handlePublishOrSchedule}
                disabled={isPublishing}
                class="w-full h-11 rounded-xl bg-[#B6F36B] hover:bg-[#A5E456] active:bg-[#94D445] text-[#111315] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg hover:shadow-[#B6F36B]/20 disabled:opacity-50"
              >
                {#if isPublishing}
                  <Loader2 class="w-4 h-4 animate-spin" />
                  <span>Menyimpan Jadwal...</span>
                {:else}
                  <Calendar class="w-4 h-4" />
                  <span>📅 Simpan Jadwal YouTube Shorts</span>
                {/if}
              </button>
            </div>
          {/if}
        </div>

        <!-- 3. RIWAYAT PUBLIKASI & JADWAL -->
        <div class="p-5 rounded-xl bg-[#191C20] border border-[#292E34] space-y-3">
          <div class="flex items-center justify-between text-xs font-semibold text-[#E7E9EC] border-b border-[#292E34] pb-2.5">
            <span>Daftar Postingan ({workspace.scheduledPosts.length})</span>
            <span class="text-[10px] font-mono text-[#626871]">YouTube Shorts</span>
          </div>

          {#if workspace.scheduledPosts.length === 0}
            <div class="p-6 text-center text-[#626871] text-xs">
              Belum ada postingan yang dipublish atau dijadwalkan.
            </div>
          {:else}
            <div class="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {#each workspace.scheduledPosts as post (post.id)}
                <div class="p-3 rounded-lg bg-[#14171A] border border-[#292E34] flex items-start justify-between gap-3 text-xs">
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-1.5">
                      <span class="text-[9px] font-mono px-1.5 py-0.2 rounded font-bold {post.status === 'published' ? 'bg-[#10B981]/20 text-[#10B981]' : 'bg-[#3B82F6]/20 text-[#3B82F6]'}">
                        {post.status === 'published' ? 'TERPUBLIKASI' : 'TERJADWAL'}
                      </span>
                      <span class="text-[11px] text-[#626871] font-mono">
                        {new Date(post.scheduledTime).toLocaleDateString('id-ID')}
                      </span>
                    </div>
                    <div class="text-xs font-semibold text-[#E7E9EC] truncate mt-1">
                      {post.clipTitle}
                    </div>
                  </div>

                  <button
                    type="button"
                    onclick={() => workspace.removeScheduledPost(post.id)}
                    class="text-[#626871] hover:text-[#EF4444] p-1 transition-colors cursor-pointer"
                    title="Hapus / Batalkan"
                  >
                    <Trash2 class="w-3.5 h-3.5" />
                  </button>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    </div>
  {/if}
</div>

<!-- ========================================================================= -->
<!-- MODAL EKSPOR VIDEO MP4 DENGAN PILIHAN RESOLUSI, FPS & BITRATE            -->
<!-- DIPINDAHKAN KE SINI SESUAI INSTRUKSI AGAR USER MENGUNDUH DI HALAMAN INI  -->
<!-- ========================================================================= -->
{#if showExportModal && selectedClip}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
    <div
      class="w-full max-w-md rounded-2xl bg-[#191C20] border border-[#292E34] shadow-[0_25px_60px_rgba(0,0,0,0.95)] overflow-hidden"
    >
      <!-- Modal Header -->
      <div class="p-5 border-b border-[#292E34] flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-[#B6F36B]/20 border border-[#B6F36B] flex items-center justify-center text-[#B6F36B]">
            <Download class="w-4 h-4 stroke-[2.5]" />
          </div>
          <div>
            <div class="text-sm font-bold text-[#E7E9EC]">Unduh Video MP4</div>
            <div class="text-[11px] text-[#9299A3] truncate max-w-[260px]">{selectedClip.title}</div>
          </div>
        </div>

        {#if !isExportRendering}
          <button
            type="button"
            onclick={closeExportModal}
            class="text-[#9299A3] hover:text-[#E7E9EC] p-1 rounded-lg hover:bg-[#20242A] transition-colors cursor-pointer text-xs"
          >
            ✕
          </button>
        {/if}
      </div>

      <!-- Modal Body -->
      <div class="p-5 space-y-4 text-xs">
        {#if exportError}
          <div class="p-3 rounded-lg bg-[#EF4444]/15 border border-[#EF4444] text-[#EF4444] text-xs flex items-center gap-2">
            <AlertCircle class="w-4 h-4 shrink-0" />
            <span>{exportError}</span>
          </div>
        {/if}

        {#if exportSuccess}
          <div class="p-4 rounded-lg bg-[#B6F36B]/15 border border-[#B6F36B] text-[#B6F36B] text-center space-y-1">
            <div class="font-bold text-sm">🎉 Video Berhasil Dirender & Diunduh!</div>
            <div class="text-[11px] text-[#E7E9EC]">
              File MP4 telah tersimpan di folder unduhan Anda dan siap diunggah ke YouTube Shorts.
            </div>
          </div>
        {:else if isExportRendering}
          <div class="py-6 text-center space-y-3">
            <Loader2 class="w-9 h-9 text-[#B6F36B] animate-spin mx-auto" />
            <div class="text-xs font-bold text-[#E7E9EC]">Sedang Merender Video MP4...</div>
            <div class="text-[11px] text-[#9299A3] max-w-xs mx-auto">
              Membakar subtitle kata-per-kata, framing 9:16 vertikal, background music, dan logo watermark secara presisi.
            </div>
          </div>
        {:else}
          <!-- Pilihan Resolusi -->
          <div>
            <span class="text-[11px] font-semibold text-[#626871] uppercase tracking-wider block mb-1.5">
              Resolusi Video
            </span>
            <div class="grid grid-cols-3 gap-2">
              {#each [
                { id: '1080p' as const, label: '1080p (FHD)', desc: '1080x1920' },
                { id: '720p' as const, label: '720p (HD)', desc: '720x1280' },
                { id: '4k' as const, label: '4K (UHD)', desc: '2160x3840' },
              ] as r (r.id)}
                <button
                  type="button"
                  onclick={() => (selectedResolution = r.id)}
                  class="p-2.5 rounded-lg border text-left transition-all cursor-pointer {selectedResolution === r.id
                    ? 'bg-[#20242A] border-[#B6F36B] text-[#B6F36B] ring-1 ring-[#B6F36B]/40'
                    : 'bg-[#14171A] border-[#292E34] text-[#9299A3] hover:border-[#383F47]'}"
                >
                  <div class="font-bold text-xs">{r.label}</div>
                  <div class="text-[10px] text-[#626871] font-mono mt-0.5">{r.desc}</div>
                </button>
              {/each}
            </div>
          </div>

          <!-- Pilihan Frame Rate (FPS) -->
          <div>
            <span class="text-[11px] font-semibold text-[#626871] uppercase tracking-wider block mb-1.5">
              Frame Rate (Kecepatan Gambar)
            </span>
            <div class="grid grid-cols-2 gap-2">
              {#each [
                { id: 30 as const, label: '30 FPS', desc: 'Standar Cepat & Ringan' },
                { id: 60 as const, label: '60 FPS', desc: 'Ultra Mulus (Shorts/Reels)' },
              ] as f (f.id)}
                <button
                  type="button"
                  onclick={() => (selectedFps = f.id)}
                  class="p-2.5 rounded-lg border text-left transition-all cursor-pointer {selectedFps === f.id
                    ? 'bg-[#20242A] border-[#B6F36B] text-[#B6F36B] ring-1 ring-[#B6F36B]/40'
                    : 'bg-[#14171A] border-[#292E34] text-[#9299A3] hover:border-[#383F47]'}"
                >
                  <div class="font-bold text-xs">{f.label}</div>
                  <div class="text-[10px] text-[#626871] mt-0.5">{f.desc}</div>
                </button>
              {/each}
            </div>
          </div>

          <!-- Pilihan Target Bitrate -->
          <div>
            <span class="text-[11px] font-semibold text-[#626871] uppercase tracking-wider block mb-1.5">
              Kualitas Bitrate
            </span>
            <div class="grid grid-cols-3 gap-2">
              {#each [
                { id: 14 as const, label: '14 Mbps', desc: 'Optimal' },
                { id: 18 as const, label: '18 Mbps', desc: 'Tinggi' },
                { id: 30 as const, label: '30 Mbps', desc: 'Mastering' },
              ] as b (b.id)}
                <button
                  type="button"
                  onclick={() => (selectedBitrate = b.id)}
                  class="p-2 rounded-lg border text-center transition-all cursor-pointer {selectedBitrate === b.id
                    ? 'bg-[#20242A] border-[#B6F36B] text-[#B6F36B] ring-1 ring-[#B6F36B]/40'
                    : 'bg-[#14171A] border-[#292E34] text-[#9299A3] hover:border-[#383F47]'}"
                >
                  <div class="font-bold text-xs">{b.label}</div>
                  <div class="text-[10px] text-[#626871] mt-0.5">{b.desc}</div>
                </button>
              {/each}
            </div>
          </div>

          <!-- Tombol Aksi Mulai Render -->
          <div class="pt-2">
            <button
              type="button"
              onclick={handleExecuteExport}
              class="w-full h-10 rounded-xl bg-[#B6F36B] hover:bg-[#A5E456] active:bg-[#94D445] text-[#111315] font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg"
            >
              <Download class="w-4 h-4 stroke-[2.5]" />
              <span>Mulai Render & Unduh MP4 Sekarang</span>
            </button>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}
