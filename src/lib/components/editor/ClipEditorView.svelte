<script lang="ts">
  import { workspace } from '#lib/state/workspace.svelte';
  import { goto } from '$app/navigation';
  import { formatTimecode } from '#lib/utils/clippingRules';
  import type { ClipCandidate, CaptionStylePreset, FramingMode } from '#lib/types';
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
    ShieldAlert,
    Sparkles,
  } from 'lucide-svelte';

  let { clip }: { clip: ClipCandidate } = $props();

  let showSafeZones = $state(true);
  let showGrid = $state(false);
  let activeTab = $state<'framing' | 'captions' | 'transcript'>('captions');
  let highlightColor = $state('#B6F36B');
  let currentTime = $state(0);
  let isPlaying = $state(false);

  $effect(() => {
    currentTime = clip.startTime;
    isPlaying = false;
  });

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
</script>

<div class="flex-1 flex flex-col h-full bg-[#111315] select-none overflow-hidden">
  <!-- Editor Top Navigation Bar -->
  <div class="h-11 border-b border-[#292E34] bg-[#14171A] px-4 flex items-center justify-between text-xs shrink-0">
    <div class="flex items-center gap-3">
      <a
        href="/candidates"
        class="text-[#9299A3] hover:text-[#E7E9EC] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#B6F36B] rounded px-1"
      >
        ← Pilihan Klip
      </a>
      <span class="text-[#626871]">/</span>
      <span class="font-semibold text-[#E7E9EC] truncate max-w-[280px]">
        {clip.title}
      </span>
      <span
        class="text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded bg-[#191C20] border border-[#292E34] text-[#B6F36B]"
      >
        {clip.duration} detik
      </span>
    </div>

    <!-- Aspect Ratio & Safe Zone Controls -->
    <div class="flex items-center gap-2">
      <div class="flex items-center p-0.5 bg-[#191C20] rounded border border-[#292E34]">
        <button
          type="button"
          onclick={() => workspace.updateClip({ ...clip, aspectRatio: '9:16' })}
          title="Rasio 9:16 Vertikal"
          class="px-2 py-1 rounded transition-colors flex items-center gap-1 cursor-pointer {clip.aspectRatio ===
          '9:16'
            ? 'bg-[#20242A] text-[#B6F36B]'
            : 'text-[#9299A3] hover:text-[#E7E9EC]'}"
        >
          <Smartphone class="w-3.5 h-3.5" />
          <span>9:16</span>
        </button>
        <button
          type="button"
          onclick={() => workspace.updateClip({ ...clip, aspectRatio: '1:1' })}
          title="Rasio 1:1 Kotak"
          class="px-2 py-1 rounded transition-colors flex items-center gap-1 cursor-pointer {clip.aspectRatio ===
          '1:1'
            ? 'bg-[#20242A] text-[#B6F36B]'
            : 'text-[#9299A3] hover:text-[#E7E9EC]'}"
        >
          <Square class="w-3.5 h-3.5" />
          <span>1:1</span>
        </button>
        <button
          type="button"
          onclick={() => workspace.updateClip({ ...clip, aspectRatio: '16:9' })}
          title="Rasio 16:9 Landscape"
          class="px-2 py-1 rounded transition-colors flex items-center gap-1 cursor-pointer {clip.aspectRatio ===
          '16:9'
            ? 'bg-[#20242A] text-[#B6F36B]'
            : 'text-[#9299A3] hover:text-[#E7E9EC]'}"
        >
          <Maximize2 class="w-3.5 h-3.5" />
          <span>16:9</span>
        </button>
      </div>

      <button
        type="button"
        onclick={() => (showSafeZones = !showSafeZones)}
        class="h-7 px-2 rounded border text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer {showSafeZones
          ? 'bg-[#20242A] border-[#B6F36B]/50 text-[#B6F36B]'
          : 'bg-[#191C20] border-[#292E34] text-[#9299A3] hover:border-[#383F47]'}"
        title="Tampilkan / Sembunyikan batasan safe area TikTok & Reels"
      >
        <ShieldAlert class="w-3 h-3" />
        <span>Zona Aman</span>
      </button>

      <button
        type="button"
        onclick={() => (showGrid = !showGrid)}
        class="h-7 px-2 rounded border text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer {showGrid
          ? 'bg-[#20242A] border-[#B6F36B]/50 text-[#B6F36B]'
          : 'bg-[#191C20] border-[#292E34] text-[#9299A3] hover:border-[#383F47]'}"
        title="Garis bantu pembagian layar (Rule of Thirds)"
      >
        <Grid class="w-3 h-3" />
      </button>
    </div>

    <!-- Direct Action Buttons -->
    <div class="flex items-center gap-2">
      <button
        type="button"
        onclick={handleSchedule}
        class="h-7 px-2.5 rounded bg-[#191C20] hover:bg-[#20242A] text-[#9299A3] hover:text-[#E7E9EC] border border-[#292E34] transition-colors flex items-center gap-1.5 cursor-pointer"
      >
        <Calendar class="w-3 h-3" />
        <span>Jadwalkan</span>
      </button>

      <button
        type="button"
        onclick={handleExport}
        class="h-7 px-3 rounded bg-[#B6F36B] hover:bg-[#A5E456] text-[#111315] font-semibold transition-colors flex items-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B6F36B]/50"
      >
        <Download class="w-3.5 h-3.5 stroke-[2.2]" />
        <span>Ekspor Klip</span>
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
          class="flex-1 py-2.5 border-b-2 transition-colors flex items-center justify-center gap-1.5 cursor-pointer {activeTab ===
          'captions'
            ? 'border-[#B6F36B] text-[#B6F36B] bg-[#191C20]'
            : 'border-transparent text-[#9299A3] hover:text-[#E7E9EC]'}"
        >
          <Type class="w-3.5 h-3.5" />
          <span>Subtitle Teks</span>
        </button>

        <button
          type="button"
          onclick={() => (activeTab = 'framing')}
          class="flex-1 py-2.5 border-b-2 transition-colors flex items-center justify-center gap-1.5 cursor-pointer {activeTab ===
          'framing'
            ? 'border-[#B6F36B] text-[#B6F36B] bg-[#191C20]'
            : 'border-transparent text-[#9299A3] hover:text-[#E7E9EC]'}"
        >
          <Sliders class="w-3.5 h-3.5" />
          <span>Framing & Zoom</span>
        </button>

        <button
          type="button"
          onclick={() => (activeTab = 'transcript')}
          class="flex-1 py-2.5 border-b-2 transition-colors flex items-center justify-center gap-1.5 cursor-pointer {activeTab ===
          'transcript'
            ? 'border-[#B6F36B] text-[#B6F36B] bg-[#191C20]'
            : 'border-transparent text-[#9299A3] hover:text-[#E7E9EC]'}"
        >
          <AlignLeft class="w-3.5 h-3.5" />
          <span>Transkrip</span>
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
                  { id: 'hormozi' as CaptionStylePreset, label: 'Hormozi Pop' },
                  { id: 'minimal' as CaptionStylePreset, label: 'Minimal Bersih' },
                  { id: 'karaoke' as CaptionStylePreset, label: 'Karaoke Glow' },
                  { id: 'subtle_box' as CaptionStylePreset, label: 'Kotak Kontras' },
                ] as preset (preset.id)}
                  <button
                    type="button"
                    onclick={() => workspace.updateClip({ ...clip, captionPreset: preset.id })}
                    class="p-2 rounded border text-left transition-colors cursor-pointer {clip.captionPreset ===
                    preset.id
                      ? 'bg-[#20242A] border-[#B6F36B] text-[#E7E9EC]'
                      : 'bg-[#191C20] border-[#292E34] text-[#9299A3] hover:border-[#383F47]'}"
                  >
                    {preset.label}
                  </button>
                {/each}
              </div>
            </div>

            <!-- Subtitle Accent Color -->
            <div class="p-3 bg-[#191C20] border border-[#292E34] rounded space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-[#9299A3]">Warna Sorotan Kata</span>
                <span class="font-mono" style="color: {highlightColor};">{highlightColor}</span>
              </div>
              <div class="flex items-center gap-2">
                {#each ['#B6F36B', '#FACC15', '#38BDF8', '#F43F5E', '#FFFFFF'] as color (color)}
                  <button
                    type="button"
                    class="w-6 h-6 rounded-full border shadow-sm transition-transform cursor-pointer {highlightColor ===
                    color
                      ? 'scale-125 ring-2 ring-[#E7E9EC] border-transparent'
                      : 'border-black/40 hover:scale-110'}"
                    style="background-color: {color};"
                    onclick={() => (highlightColor = color)}
                    aria-label="Pilih warna sorotan {color}"
                  ></button>
                {/each}
              </div>
            </div>

            <!-- Hook Punch-in Zoom Keyframes -->
            <div class="p-3 bg-[#191C20] border border-[#292E34] rounded space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-[#9299A3] flex items-center gap-1.5">
                  <Sparkles class="w-3.5 h-3.5 text-[#B6F36B]" />
                  Efek Zoom Otomatis (Punch-In)
                </span>
                <span class="font-mono text-xs text-[#B6F36B]">
                  {clip.bRollCuts?.length || 2} titik aktif
                </span>
              </div>
              <p class="text-[11px] text-[#626871] leading-relaxed">
                Otomatis zoom 1.25x pada kalimat penting dan punchline untuk meningkatkan retensi penonton.
              </p>
            </div>
          </div>
        {:else if activeTab === 'framing'}
          <div class="space-y-4">
            <div>
              <span class="text-[11px] font-semibold text-[#626871] uppercase tracking-wider block mb-2">
                Geser Posisi Kamera (Pan X)
              </span>
              <div class="flex items-center justify-between text-[#9299A3] mb-1">
                <span>Offset Tengah</span>
                <span class="font-mono tabular-nums text-[#B6F36B]">{clip.panOffset}%</span>
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
                <span class="font-mono tabular-nums text-[#B6F36B]">
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
                    class="w-full p-2 rounded border text-left transition-colors text-xs cursor-pointer {clip.framingMode ===
                    m.id
                      ? 'bg-[#20242A] border-[#B6F36B] text-[#E7E9EC]'
                      : 'bg-[#191C20] border-[#292E34] text-[#9299A3] hover:border-[#383F47]'}"
                  >
                    {m.label}
                  </button>
                {/each}
              </div>
            </div>
          </div>
        {:else}
          <!-- Transcript Tab -->
          <div class="space-y-3">
            <div class="text-[11px] text-[#626871]">
              Klik bagian teks mana pun untuk melompat ke detik tersebut:
            </div>
            {#each clip.captions as seg (seg.id)}
              {@const isActiveSeg = currentTime >= seg.start && currentTime <= seg.end}
              <button
                type="button"
                onclick={() => (currentTime = seg.start)}
                class="w-full text-left p-2.5 rounded border transition-colors cursor-pointer {isActiveSeg
                  ? 'bg-[#20242A] border-[#B6F36B]/60 text-[#E7E9EC]'
                  : 'bg-[#191C20] border-[#292E34] text-[#9299A3] hover:text-[#E7E9EC]'}"
              >
                <div class="flex items-center justify-between text-[10px] font-mono mb-1 text-[#626871]">
                  <span>{seg.speaker || 'Pembicara'}</span>
                  <span class="tabular-nums">
                    {formatTimecode(seg.start, false)} - {formatTimecode(seg.end, false)}
                  </span>
                </div>
                <div class="text-xs leading-relaxed">{seg.text}</div>
              </button>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </div>

  <!-- Bottom Stage: Dedicated Timeline Component -->
  <EditorTimeline {clip} bind:currentTime bind:isPlaying />
</div>
