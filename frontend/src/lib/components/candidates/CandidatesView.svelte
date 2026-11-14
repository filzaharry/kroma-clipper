<script lang="ts">
  import { workspace } from '#lib/state/workspace.svelte';
  import { goto } from '$app/navigation';
  import { formatTimecode } from '#lib/utils/clippingRules';
  import type { ClipCandidate } from '#lib/types';
  import {
    Scissors,
    Sparkles,
    Volume2,
    Smartphone,
    ArrowRight,
    SquarePlay,
  } from 'lucide-svelte';

  let filterRatio = $state<string>('all');
  let minScoreFilter = $state<number>(0);

  const filteredCandidates = $derived(
    workspace.candidates.filter((clip) => {
      if (filterRatio !== 'all' && clip.aspectRatio !== filterRatio) return false;
      if (clip.score < minScoreFilter) return false;
      return true;
    })
  );

  function handleOpenEditor(clip: ClipCandidate) {
    workspace.selectClip(clip);
    goto(`/editor?clipId=${clip.id}`);
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
        Pilih klip di bawah ini untuk membuka dan menyesuaikan subtitle, framing, logo, serta musik di Editor.
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
    <div class="grid grid-cols-1 xl:grid-cols-2 gap-5">
      {#each filteredCandidates as clip (clip.id)}
        <div
          class="p-5 rounded-xl border border-[#292E34] hover:border-[#383F47] bg-[#191C20] shadow-sm transition-all"
        >
          <!-- Header: Title & Viral Score -->
          <div class="flex items-start justify-between gap-3 mb-3">
            <div class="flex-1 min-w-0">
              <span class="text-sm font-bold text-[#E7E9EC] tracking-tight block truncate">
                {clip.title}
              </span>

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

          <!-- Clickable Excerpt Quote with Editor Trigger -->
          <div
            role="button"
            tabindex="0"
            onclick={() => handleOpenEditor(clip)}
            onkeydown={(e) => { if (e.key === 'Enter') handleOpenEditor(clip); }}
            class="group p-3.5 rounded-lg bg-[#111315] hover:bg-[#15181C] border border-[#292E34] hover:border-[#B6F36B]/40 text-xs text-[#E7E9EC] leading-relaxed mb-4 transition-all cursor-pointer relative"
            title="Klik untuk membuka dan mengedit klip ini di Editor"
          >
            <div class="italic">"{clip.excerptQuote}"</div>
            <div class="mt-2 flex items-center gap-1.5 text-[11px] text-[#B6F36B] font-medium opacity-80 group-hover:opacity-100">
              <Scissors class="w-3 h-3 stroke-[2]" />
              <span>Klik di sini untuk mengedit klip ini</span>
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

          <!-- Action Bar: Buka di Editor -->
          <div class="flex items-center justify-end pt-3 border-t border-[#292E34]">
            <button
              type="button"
              onclick={() => handleOpenEditor(clip)}
              class="h-8 px-4 rounded-lg bg-[#B6F36B] hover:bg-[#A5E456] active:bg-[#94D445] text-[#111315] font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              title="Buka pengeditan subtitle, framing, watermark & musik di Editor"
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
