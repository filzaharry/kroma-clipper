<script lang="ts">
  import type { ClipCandidate } from '#lib/types';
  import { formatTimecode } from '#lib/utils/clippingRules';
  import {
    Play,
    Pause,
    SkipBack,
    SkipForward,
    Volume2,
    VolumeX,
  } from 'lucide-svelte';
  import { onMount } from 'svelte';

  let {
    clip,
    currentTime = $bindable(0),
    isPlaying = $bindable(false),
  }: {
    clip: ClipCandidate;
    currentTime: number;
    isPlaying: boolean;
  } = $props();

  let isMuted = $state(false);

  const relativeSeconds = $derived(Math.max(0, currentTime - clip.startTime));
  const progressPercent = $derived(Math.min(100, (relativeSeconds / clip.duration) * 100));

  // Compute 5 dynamic timecode ticks based on clip duration
  const timeTicks = $derived.by(() => {
    const ticks: string[] = ['0s'];
    const step = clip.duration / 4;
    for (let i = 1; i < 4; i++) {
      ticks.push(`${Math.round(step * i)}s`);
    }
    ticks.push(`${Math.round(clip.duration)}s`);
    return ticks;
  });

  // Pre-calculated static audio waveform amplitudes for the timeline track
  const TIMELINE_WAVEFORM = [
    0.2, 0.4, 0.7, 0.9, 0.6, 0.4, 0.3, 0.6, 0.8, 0.95, 0.7, 0.5, 0.3, 0.2,
    0.5, 0.8, 0.85, 0.9, 0.75, 0.6, 0.4, 0.3, 0.5, 0.7, 0.8, 0.65, 0.4, 0.2,
    0.3, 0.6, 0.85, 0.9, 0.7, 0.5, 0.4, 0.7, 0.9, 0.85, 0.6, 0.4, 0.2, 0.1,
  ];

  function handleScrubberClick(e: MouseEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const clickFraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    currentTime = clip.startTime + clickFraction * clip.duration;
  }

  onMount(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space') {
        e.preventDefault();
        isPlaying = !isPlaying;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });
</script>

<div class="h-56 border-t border-[#292E34] bg-[#14171A] flex flex-col shrink-0 select-none">
  <!-- Transport Toolbar -->
  <div class="h-10 border-b border-[#292E34] px-4 flex items-center justify-between bg-[#111315]">
    <div class="flex items-center gap-2">
      <button
        type="button"
        onclick={() => (currentTime = clip.startTime)}
        class="w-7 h-7 rounded hover:bg-[#20242A] text-[#9299A3] hover:text-[#E7E9EC] flex items-center justify-center transition-colors cursor-pointer"
        title="Return to In Point"
      >
        <SkipBack class="w-3.5 h-3.5" />
      </button>

      <button
        type="button"
        onclick={() => (currentTime = Math.max(clip.startTime, currentTime - 1 / 30))}
        class="px-1.5 h-7 rounded hover:bg-[#20242A] text-[10px] font-mono text-[#9299A3] hover:text-[#E7E9EC] flex items-center justify-center transition-colors cursor-pointer"
        title="Step Backward 1 Frame"
      >
        -1f
      </button>

      <button
        type="button"
        onclick={() => (isPlaying = !isPlaying)}
        class="w-8 h-8 rounded bg-[#B6F36B] hover:bg-[#A5E456] text-[#111315] flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B6F36B]/50 cursor-pointer"
        title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
      >
        {#if isPlaying}
          <Pause class="w-4 h-4 fill-current" />
        {:else}
          <Play class="w-4 h-4 fill-current ml-0.5" />
        {/if}
      </button>

      <button
        type="button"
        onclick={() => (currentTime = Math.min(clip.endTime, currentTime + 1 / 30))}
        class="px-1.5 h-7 rounded hover:bg-[#20242A] text-[10px] font-mono text-[#9299A3] hover:text-[#E7E9EC] flex items-center justify-center transition-colors cursor-pointer"
        title="Step Forward 1 Frame"
      >
        +1f
      </button>

      <button
        type="button"
        onclick={() => (currentTime = clip.endTime)}
        class="w-7 h-7 rounded hover:bg-[#20242A] text-[#9299A3] hover:text-[#E7E9EC] flex items-center justify-center transition-colors cursor-pointer"
        title="Jump to Out Point"
      >
        <SkipForward class="w-3.5 h-3.5" />
      </button>

      <!-- Timecode Readout -->
      <div class="ml-3 pl-3 border-l border-[#292E34] font-mono tabular-nums text-xs font-semibold text-[#B6F36B]">
        {formatTimecode(currentTime, true)}
        <span class="text-[#626871] font-normal ml-2">
          / {formatTimecode(clip.endTime, true)}
        </span>
      </div>
    </div>

    <div class="flex items-center gap-3 text-xs text-[#9299A3]">
      <button
        type="button"
        onclick={() => (isMuted = !isMuted)}
        class="hover:text-[#E7E9EC] transition-colors cursor-pointer"
        title={isMuted ? 'Unmute' : 'Mute'}
      >
        {#if isMuted}
          <VolumeX class="w-4 h-4" />
        {:else}
          <Volume2 class="w-4 h-4" />
        {/if}
      </button>
      <span class="font-mono tabular-nums text-[11px] text-[#626871]">
        In: {formatTimecode(clip.startTime, false)} · Out: {formatTimecode(clip.endTime, false)}
      </span>
    </div>
  </div>

  <!-- Timeline Tracks Canvas -->
  <div class="flex-1 overflow-x-auto overflow-y-hidden p-3 flex flex-col justify-between relative bg-[#14171A]">
    <!-- Timecode Scrubber Bar -->
    <div
      role="slider"
      aria-label="Timeline Scrubber"
      aria-valuemin={clip.startTime}
      aria-valuemax={clip.endTime}
      aria-valuenow={currentTime}
      tabindex="0"
      class="w-full h-4 relative cursor-pointer"
      onclick={handleScrubberClick}
      onkeydown={(e) => {
        if (e.key === 'ArrowLeft') currentTime = Math.max(clip.startTime, currentTime - 1);
        if (e.key === 'ArrowRight') currentTime = Math.min(clip.endTime, currentTime + 1);
      }}
    >
      <!-- Tick marks -->
      <div class="absolute inset-0 flex justify-between items-center text-[9px] font-mono text-[#626871] border-b border-[#292E34]">
        {#each timeTicks as tick, idx (idx)}
          <span>{tick}</span>
        {/each}
      </div>

      <!-- Playhead Indicator Needle -->
      <div
        class="absolute top-0 bottom-0 w-[2px] bg-[#B6F36B] z-30 pointer-events-none transition-none"
        style="left: {progressPercent}%;"
      >
        <div class="w-2.5 h-2.5 bg-[#B6F36B] -translate-x-[4px] -translate-y-1 rotate-45"></div>
      </div>
    </div>

    <!-- Track 1: Subtitle Cues Track -->
    <div class="h-9 bg-[#191C20] rounded border border-[#292E34] p-1 flex items-center relative overflow-hidden">
      <span class="text-[9px] font-mono uppercase text-[#626871] px-2 shrink-0 border-r border-[#292E34] mr-2">
        Subs
      </span>
      <div class="flex-1 h-full flex gap-1 relative">
        {#each clip.captions as seg (seg.id)}
          {@const segWidth = (Math.min(seg.end, clip.endTime) - Math.max(seg.start, clip.startTime)) / clip.duration}
          {@const isActive = currentTime >= seg.start && currentTime <= seg.end}

          <button
            type="button"
            onclick={() => (currentTime = seg.start)}
            class="h-full rounded px-2 text-[10px] font-medium flex items-center truncate cursor-pointer transition-colors border text-left {isActive
              ? 'bg-[#B6F36B]/20 text-[#B6F36B] border-[#B6F36B]/50'
              : 'bg-[#20242A] text-[#9299A3] border-[#292E34] hover:text-[#E7E9EC]'}"
            style="flex: {Math.max(1, segWidth * 100)};"
            title="{seg.text} ({seg.start}s - {seg.end}s)"
          >
            {seg.text}
          </button>
        {/each}
      </div>
    </div>

    <!-- Track 2: Video Filmstrip Track -->
    <div class="h-10 bg-[#191C20] rounded border border-[#292E34] flex items-center px-1 relative overflow-hidden">
      <span class="text-[9px] font-mono uppercase text-[#626871] px-2 shrink-0 border-r border-[#292E34] mr-2">
        Video
      </span>
      <div class="flex-1 h-full flex items-center gap-1.5 opacity-80">
        {#each Array(12) as _, i (i)}
          <div
            class="flex-1 h-7 bg-[#20242A] rounded border border-[#292E34] flex items-center justify-center text-[9px] font-mono text-[#626871]"
          >
            f_{i * 30}
          </div>
        {/each}
      </div>
    </div>

    <!-- Track 3: Audio Waveform Track -->
    <div class="h-10 bg-[#191C20] rounded border border-[#292E34] flex items-center px-1 relative overflow-hidden">
      <span class="text-[9px] font-mono uppercase text-[#626871] px-2 shrink-0 border-r border-[#292E34] mr-2">
        Audio
      </span>
      <div class="flex-1 h-full flex items-end gap-[1px]">
        {#each TIMELINE_WAVEFORM as val, idx (idx)}
          <div
            class="flex-1 bg-[#292E34] hover:bg-[#B6F36B] transition-colors rounded-t-[1px]"
            style="height: {val * 100}%"
          ></div>
        {/each}
      </div>
    </div>
  </div>
</div>
