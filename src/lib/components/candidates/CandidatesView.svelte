<script lang="ts">
  import { workspace } from '#lib/state/workspace.svelte';
  import { goto } from '$app/navigation';
  import { formatTimecode } from '#lib/utils/clippingRules';
  import type { ClipCandidate } from '#lib/types';
  import {
    Scissors,
    Download,
    Check,
    X,
    Sparkles,
    Volume2,
    Smartphone,
    Square,
    Maximize2,
    Search,
    Filter,
  } from 'lucide-svelte';

  let filterRatio = $state<string>('all');
  let minScoreFilter = $state<number>(0);
  let searchQuery = $state<string>('');

  const filteredCandidates = $derived(
    workspace.candidates.filter((clip) => {
      if (filterRatio !== 'all' && clip.aspectRatio !== filterRatio) return false;
      if (clip.score < minScoreFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = clip.title.toLowerCase().includes(q);
        const matchQuote = clip.excerptQuote.toLowerCase().includes(q);
        const matchSpeaker = clip.speaker.toLowerCase().includes(q);
        const matchTags = clip.tags.some((t) => t.toLowerCase().includes(q));
        if (!matchTitle && !matchQuote && !matchSpeaker && !matchTags) return false;
      }
      return true;
    })
  );

  function handleOpenEditor(clip: ClipCandidate) {
    workspace.selectClip(clip);
    goto(`/editor?clipId=${clip.id}`);
  }

  function handleQueueRender(clip: ClipCandidate) {
    workspace.selectClip(clip);
    workspace.startRender({
      clipId: clip.id,
      clipTitle: clip.title,
      aspectRatio: clip.aspectRatio,
    });
    goto('/export');
  }
</script>

<div class="flex-1 flex flex-col overflow-y-auto bg-[#111315] p-6 lg:p-8">
  <!-- Title & Filter Bar -->
  <div class="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
    <div>
      <h1 class="text-xl font-semibold text-[#E7E9EC] tracking-tight">
        4. Review Clip Candidates ({workspace.candidates.length})
      </h1>
      <p class="text-xs text-[#9299A3] mt-1">
        Algorithmically scored clips based on opening hook potency, vocal dynamics, and thematic pacing.
      </p>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap items-center gap-2">
      <!-- Search -->
      <div class="relative">
        <Search class="w-3.5 h-3.5 text-[#626871] absolute left-2.5 top-2.5" />
        <input
          type="text"
          placeholder="Search quotes, topics..."
          bind:value={searchQuery}
          class="h-8 pl-8 pr-3 text-xs bg-[#191C20] border border-[#292E34] rounded text-[#E7E9EC] placeholder-[#626871] focus:border-[#B6F36B] focus:outline-none w-48"
        />
      </div>

      <!-- Aspect Ratio Filter Tabs -->
      <div class="flex items-center p-0.5 bg-[#191C20] rounded border border-[#292E34]">
        <button
          type="button"
          onclick={() => (filterRatio = 'all')}
          class="px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer {filterRatio === 'all'
            ? 'bg-[#20242A] text-[#B6F36B]'
            : 'text-[#9299A3] hover:text-[#E7E9EC]'}"
        >
          All Ratios
        </button>
        <button
          type="button"
          onclick={() => (filterRatio = '9:16')}
          class="px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer {filterRatio === '9:16'
            ? 'bg-[#20242A] text-[#B6F36B]'
            : 'text-[#9299A3] hover:text-[#E7E9EC]'}"
        >
          9:16 Shorts
        </button>
        <button
          type="button"
          onclick={() => (filterRatio = '1:1')}
          class="px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer {filterRatio === '1:1'
            ? 'bg-[#20242A] text-[#B6F36B]'
            : 'text-[#9299A3] hover:text-[#E7E9EC]'}"
        >
          1:1 Feed
        </button>
        <button
          type="button"
          onclick={() => (filterRatio = '16:9')}
          class="px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer {filterRatio === '16:9'
            ? 'bg-[#20242A] text-[#B6F36B]'
            : 'text-[#9299A3] hover:text-[#E7E9EC]'}"
        >
          16:9
        </button>
      </div>

      <!-- High Score Toggle -->
      <button
        type="button"
        onclick={() => (minScoreFilter = minScoreFilter === 90 ? 0 : 90)}
        class="h-8 px-2.5 text-xs font-medium rounded border transition-colors flex items-center gap-1.5 cursor-pointer {minScoreFilter === 90
          ? 'bg-[#20242A] border-[#B6F36B] text-[#B6F36B]'
          : 'bg-[#191C20] border-[#292E34] text-[#9299A3] hover:border-[#383F47]'}"
      >
        <Filter class="w-3 h-3" />
        <span>Score 90+ Only</span>
      </button>
    </div>
  </div>

  <!-- Candidate Grid -->
  {#if filteredCandidates.length === 0}
    <div class="p-12 text-center bg-[#191C20] border border-[#292E34] rounded-lg">
      <p class="text-sm text-[#E7E9EC] font-medium">No clip candidates match this filter.</p>
      <p class="text-xs text-[#9299A3] mt-1">Try lowering the score cutoff or resetting search criteria.</p>
      <button
        type="button"
        onclick={() => {
          filterRatio = 'all';
          minScoreFilter = 0;
          searchQuery = '';
        }}
        class="mt-4 px-3 py-1.5 text-xs font-medium text-[#111315] bg-[#B6F36B] rounded cursor-pointer"
      >
        Reset Filters
      </button>
    </div>
  {:else}
    <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
      {#each filteredCandidates as clip (clip.id)}
        {@const isApproved = clip.status === 'approved'}
        {@const isRejected = clip.status === 'rejected'}

        <div
          class="p-5 rounded-lg border transition-all {isApproved
            ? 'bg-[#191C20] border-[#B6F36B]/50'
            : isRejected
              ? 'bg-[#191C20] border-[#292E34] opacity-50'
              : 'bg-[#191C20] border-[#292E34] hover:border-[#383F47]'}"
        >
          <!-- Header: Title & Viral Score -->
          <div class="flex items-start justify-between gap-3 mb-3">
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <span class="text-sm font-semibold text-[#E7E9EC] tracking-tight">
                  {clip.title}
                </span>
                {#if isRejected}
                  <span class="text-[10px] font-mono text-[#EF4444] px-1.5 py-0.5 rounded bg-[#111315] border border-[#EF4444]/30">
                    REJECTED
                  </span>
                {/if}
              </div>

              <div class="flex items-center gap-2 text-xs text-[#9299A3] mt-1">
                <span>{clip.speaker}</span>
                <span>·</span>
                <span class="font-mono tabular-nums text-[#E7E9EC]">
                  {formatTimecode(clip.startTime, false)} – {formatTimecode(clip.endTime, false)}
                </span>
                <span>·</span>
                <span class="font-mono tabular-nums text-[#B6F36B]">
                  {clip.duration}s duration
                </span>
              </div>
            </div>

            <!-- Viral Score Badge -->
            <div class="flex flex-col items-end shrink-0">
              <div class="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#20242A] border border-[#292E34]">
                <span class="text-[10px] text-[#626871] uppercase font-mono">Score</span>
                <span class="text-sm font-mono tabular-nums font-bold text-[#B6F36B]">
                  {clip.score}
                </span>
              </div>
            </div>
          </div>

          <!-- Excerpt Quote -->
          <div class="p-3 rounded bg-[#111315] border border-[#292E34] text-xs text-[#E7E9EC] leading-relaxed mb-4 italic">
            {clip.excerptQuote}
          </div>

          <!-- Heuristic Metrics Bar -->
          <div class="grid grid-cols-3 gap-2 mb-4 text-[11px]">
            <div class="p-2 rounded bg-[#14171A] border border-[#292E34] flex items-center justify-between">
              <span class="text-[#626871] flex items-center gap-1">
                <Sparkles class="w-3 h-3 text-[#B6F36B]" />
                Hook
              </span>
              <span class="font-mono tabular-nums text-[#E7E9EC] font-medium">
                {clip.hookScore}%
              </span>
            </div>

            <div class="p-2 rounded bg-[#14171A] border border-[#292E34] flex items-center justify-between">
              <span class="text-[#626871] flex items-center gap-1">
                <Volume2 class="w-3 h-3 text-[#B6F36B]" />
                Energy
              </span>
              <span class="font-mono tabular-nums text-[#E7E9EC] font-medium">
                {clip.energyScore}%
              </span>
            </div>

            <div class="p-2 rounded bg-[#14171A] border border-[#292E34] flex items-center justify-between">
              <span class="text-[#626871] flex items-center gap-1">
                {#if clip.aspectRatio === '9:16'}
                  <Smartphone class="w-3 h-3 text-[#B6F36B]" />
                {:else if clip.aspectRatio === '1:1'}
                  <Square class="w-3 h-3 text-[#B6F36B]" />
                {:else}
                  <Maximize2 class="w-3 h-3 text-[#B6F36B]" />
                {/if}
                Aspect
              </span>
              <span class="font-mono tabular-nums text-[#E7E9EC] font-medium">
                {clip.aspectRatio}
              </span>
            </div>
          </div>

          <!-- Tags and Action Bar -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[#292E34]">
            <!-- Clean unboxed tags -->
            <div class="flex items-center gap-2 text-xs text-[#626871]">
              {#each clip.tags as tag, idx (tag)}
                <span>{tag}</span>
                {#if idx < clip.tags.length - 1}
                  <span>·</span>
                {/if}
              {/each}
            </div>

            <!-- Actions -->
            <div class="flex items-center gap-2">
              <button
                type="button"
                onclick={() => workspace.approveClip(clip.id)}
                title="Approve clip"
                class="h-8 px-2.5 rounded border transition-colors flex items-center gap-1 text-xs cursor-pointer {isApproved
                  ? 'bg-[#B6F36B]/10 text-[#B6F36B] border-[#B6F36B]/40'
                  : 'bg-[#20242A] text-[#9299A3] border-[#292E34] hover:text-[#E7E9EC]'}"
              >
                <Check class="w-3.5 h-3.5" />
                <span>{isApproved ? 'Approved' : 'Approve'}</span>
              </button>

              <button
                type="button"
                onclick={() => workspace.rejectClip(clip.id)}
                title="Reject clip"
                class="h-8 px-2 rounded border transition-colors flex items-center gap-1 text-xs cursor-pointer {isRejected
                  ? 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/40'
                  : 'bg-[#20242A] text-[#626871] border-[#292E34] hover:text-[#EF4444]'}"
              >
                <X class="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onclick={() => handleQueueRender(clip)}
                title="Queue export render"
                class="h-8 px-2.5 rounded bg-[#20242A] hover:bg-[#262B32] text-[#9299A3] hover:text-[#E7E9EC] border border-[#292E34] text-xs flex items-center gap-1 cursor-pointer"
              >
                <Download class="w-3.5 h-3.5" />
                <span>Render</span>
              </button>

              <button
                type="button"
                onclick={() => handleOpenEditor(clip)}
                class="h-8 px-3.5 rounded bg-[#B6F36B] hover:bg-[#A5E456] text-[#111315] font-semibold text-xs flex items-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B6F36B]/50 cursor-pointer"
              >
                <Scissors class="w-3.5 h-3.5 stroke-[2.2]" />
                <span>Open in Editor</span>
              </button>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
