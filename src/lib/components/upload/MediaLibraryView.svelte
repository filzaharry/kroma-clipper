<script lang="ts">
  import { workspace } from '#lib/state/workspace.svelte';
  import { goto } from '$app/navigation';
  import { formatDuration } from '#lib/utils/clippingRules';
  import type { VideoSource } from '#lib/types';
  import {
    SquarePlay,
    CheckCircle2,
    Clock,
    MonitorPlay,
    AudioWaveform,
    ArrowRight,
    Sparkles,
    Loader2,
    Link2,
    AlertCircle,
  } from 'lucide-svelte';

  let youtubeUrl = $state('https://youtu.be/wsCBMCa_DBA?si=HnWp9ZtoFkhwOnjq');
  let isLoading = $state(false);
  let errorMessage = $state<string | null>(null);

  async function handleImportYoutube() {
    if (!youtubeUrl.trim()) return;

    isLoading = true;
    errorMessage = null;

    try {
      const res = await fetch('/api/youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: youtubeUrl.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Gagal mengambil metadata YouTube');
      }

      workspace.addVideo(data.video);
      errorMessage = null;
    } catch (err: any) {
      errorMessage = err?.message || 'Terjadi kesalahan saat memproses link YouTube';
    } finally {
      isLoading = false;
    }
  }

  function handleQuickDemo(url: string) {
    youtubeUrl = url;
    handleImportYoutube();
  }
</script>

<div class="flex-1 flex flex-col overflow-y-auto bg-[#111315] p-6 lg:p-8">
  <!-- Page Title & Context -->
  <div class="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
    <div>
      <h1 class="text-xl font-semibold text-[#E7E9EC] tracking-tight flex items-center gap-2.5">
        <SquarePlay class="w-6 h-6 text-[#EF4444]" />
        <span>1. YouTube Video Ingest</span>
      </h1>
      <p class="text-xs text-[#9299A3] mt-1">
        Cukup masukkan link video atau podcast YouTube. Sistem otomatis mengekstrak thumbnail, audio waveform, dan transkrip untuk deteksi klip viral.
      </p>
    </div>

    {#if workspace.activeVideo}
      <button
        type="button"
        onclick={() => goto('/rules')}
        class="h-9 px-4 text-xs font-semibold text-[#111315] bg-[#B6F36B] hover:bg-[#A5E456] active:bg-[#94D445] rounded transition-colors flex items-center gap-2 self-start md:self-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B6F36B]/50 shrink-0 cursor-pointer"
      >
        <span>Lanjut ke Clipping Rules</span>
        <ArrowRight class="w-3.5 h-3.5" />
      </button>
    {/if}
  </div>

  <!-- Dedicated YouTube Ingest Form -->
  <div class="rounded-xl border border-[#292E34] bg-[#191C20] p-6 mb-8 shadow-xl">
    <form onsubmit={(e) => { e.preventDefault(); handleImportYoutube(); }} class="space-y-4">
      <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div class="relative flex-1">
          <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#626871]">
            <Link2 class="w-4 h-4" />
          </div>
          <input
            type="url"
            bind:value={youtubeUrl}
            placeholder="Paste YouTube Link (e.g. https://youtu.be/wsCBMCa_DBA...)"
            required
            class="w-full h-11 pl-10 pr-4 bg-[#111315] border border-[#292E34] focus:border-[#B6F36B] rounded-lg text-sm text-[#E7E9EC] placeholder-[#626871] focus:outline-none transition-colors"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || !youtubeUrl.trim()}
          class="h-11 px-6 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer shrink-0 {isLoading || !youtubeUrl.trim()
            ? 'bg-[#20242A] text-[#626871] cursor-not-allowed border border-[#292E34]'
            : 'bg-[#B6F36B] hover:bg-[#A5E456] text-[#111315]'}"
        >
          {#if isLoading}
            <Loader2 class="w-4 h-4 animate-spin" />
            <span>Memproses Video...</span>
          {:else}
            <Sparkles class="w-4 h-4 fill-current" />
            <span>Ekstrak Video YouTube</span>
          {/if}
        </button>
      </div>

      <!-- Quick sample suggestions -->
      <div class="flex flex-wrap items-center gap-2 pt-1">
        <span class="text-[11px] text-[#626871]">Contoh Cepat:</span>
        <button
          type="button"
          onclick={() => handleQuickDemo('https://youtu.be/wsCBMCa_DBA?si=HnWp9ZtoFkhwOnjq')}
          class="text-[11px] text-[#9299A3] hover:text-[#B6F36B] bg-[#111315] hover:bg-[#20242A] px-2.5 py-1 rounded border border-[#292E34] transition-colors cursor-pointer font-mono truncate max-w-xs"
        >
          wsCBMCa_DBA (Raditya Dika Podcast)
        </button>
      </div>

      {#if errorMessage}
        <div class="p-3 bg-[#EF4444]/10 border border-[#EF4444]/30 rounded text-xs text-[#EF4444] flex items-center gap-2">
          <AlertCircle class="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      {/if}
    </form>
  </div>

  <!-- Library of Ingested YouTube Videos -->
  <div class="space-y-3">
    <div class="flex items-center justify-between text-xs font-medium text-[#9299A3] px-1">
      <span>Daftar Video Aktif ({workspace.videos.length})</span>
      <span>Klik video untuk memilih master aktif</span>
    </div>

    <div class="grid grid-cols-1 gap-3">
      {#each workspace.videos as vid (vid.id)}
        {@const isSelected = workspace.activeVideo?.id === vid.id}
        <div
          role="button"
          tabindex="0"
          onclick={() => workspace.selectVideo(vid)}
          onkeydown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              workspace.selectVideo(vid);
            }
          }}
          class="p-4 rounded-lg border transition-all text-left w-full cursor-pointer {isSelected
            ? 'bg-[#20242A] border-[#B6F36B]/60 ring-1 ring-[#B6F36B]/40'
            : 'bg-[#191C20] border-[#292E34] hover:border-[#383F47] hover:bg-[#1E2228]'}"
        >
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div class="flex items-start gap-4">
              <!-- Real YouTube Thumbnail or Icon -->
              <div
                class="w-24 h-16 rounded-md bg-[#111315] border border-[#292E34] overflow-hidden flex items-center justify-center shrink-0 relative group"
              >
                {#if vid.thumbnailUrl}
                  <img
                    src={vid.thumbnailUrl}
                    alt={vid.title}
                    class="w-full h-full object-cover"
                  />
                {:else}
                  <SquarePlay class="w-8 h-8 text-[#EF4444]" />
                {/if}
                <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <SquarePlay class="w-6 h-6 text-white" />
                </div>
              </div>

              <div>
                <div class="flex items-center gap-2">
                  <span class="text-sm font-semibold text-[#E7E9EC] tracking-tight line-clamp-1">
                    {vid.title}
                  </span>
                  {#if isSelected}
                    <span
                      class="text-[10px] text-[#B6F36B] font-mono px-1.5 py-0.5 rounded bg-[#111315] border border-[#B6F36B]/30 flex items-center gap-1 shrink-0"
                    >
                      <CheckCircle2 class="w-3 h-3" />
                      ACTIVE
                    </span>
                  {/if}
                </div>
                <div class="flex flex-wrap items-center gap-3 text-xs text-[#9299A3] mt-1.5">
                  <span class="font-mono text-[#626871]">{vid.fileName}</span>
                  <span>·</span>
                  <span class="flex items-center gap-1 font-mono tabular-nums">
                    <Clock class="w-3.5 h-3.5 text-[#626871]" />
                    {formatDuration(vid.durationSeconds)}
                  </span>
                  <span>·</span>
                  <span class="flex items-center gap-1 font-mono tabular-nums">
                    <MonitorPlay class="w-3.5 h-3.5 text-[#626871]" />
                    {vid.resolution.width}x{vid.resolution.height} @ {vid.fps}fps
                  </span>
                  <span>·</span>
                  <span class="flex items-center gap-1 font-mono tabular-nums">
                    <AudioWaveform class="w-3.5 h-3.5 text-[#626871]" />
                    {vid.audioChannels} ch ({vid.sampleRate / 1000}kHz)
                  </span>
                </div>
              </div>
            </div>

            <div class="flex items-center gap-3 self-end md:self-auto">
              <button
                type="button"
                onclick={(e) => {
                  e.stopPropagation();
                  workspace.selectVideo(vid);
                  goto('/rules');
                }}
                class="h-8 px-3 text-xs font-medium text-[#E7E9EC] bg-[#111315] hover:bg-[#20242A] border border-[#292E34] hover:border-[#383F47] rounded transition-colors flex items-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#B6F36B]"
              >
                <span>Set Rules</span>
                <ArrowRight class="w-3 h-3 text-[#B6F36B]" />
              </button>
            </div>
          </div>

          <!-- Waveform Micro-Display -->
          <div class="mt-3 pt-3 border-t border-[#292E34]/50 flex items-center gap-3">
            <span class="text-[10px] uppercase font-mono text-[#626871] tracking-wider shrink-0">
              Audio Waveform
            </span>
            <div class="flex-1 h-5 flex items-end gap-[2px] overflow-hidden opacity-75">
              {#each vid.waveformPoints.slice(0, 80) as pt, idx (idx)}
                <div
                  class="flex-1 bg-[#292E34] hover:bg-[#B6F36B] transition-colors rounded-t-[1px]"
                  style="height: {Math.max(15, pt * 100)}%"
                ></div>
              {/each}
            </div>
            <span class="text-[10px] font-mono tabular-nums text-[#9299A3]">
              {vid.transcripts.length} transcript cues
            </span>
          </div>
        </div>
      {/each}
    </div>
  </div>
</div>
