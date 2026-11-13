<script lang="ts">
  import { workspace } from '#lib/state/workspace.svelte';
  import type { RenderTask } from '#lib/types';
  import {
    Download,
    CheckCircle2,
    RefreshCw,
  } from 'lucide-svelte';

  let resolution = $state<'1080x1920' | '2160x3840' | '1080x1080'>('1080x1920');
  let format = $state<'mp4' | 'mov' | 'prores'>('mp4');
  let fps = $state<number>(60);
  let bitrate = $state<number>(18);
  let subtitles = $state<'burned' | 'separate_srt' | 'none'>('burned');
  let isSubmitting = $state<boolean>(false);

  const activeClip = $derived(workspace.activeClip);

  function handleQueueRender() {
    if (!activeClip) return;
    isSubmitting = true;

    workspace.startRender({
      clipId: activeClip.id,
      clipTitle: activeClip.title,
      aspectRatio: activeClip.aspectRatio,
      resolution,
      framerate: fps,
      bitrateMbps: bitrate,
      format,
      includeSubtitles: subtitles,
      fileSizeBytes: Math.round(activeClip.duration * bitrate * 125000),
    });

    setTimeout(() => {
      isSubmitting = false;
    }, 400);
  }
</script>

<div class="flex-1 flex flex-col overflow-y-auto bg-[#111315] p-6 lg:p-8">
  <!-- Title -->
  <div class="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
    <div>
      <h1 class="text-xl font-semibold text-[#E7E9EC] tracking-tight">
        6. Export & Render Engine Queue
      </h1>
      <p class="text-xs text-[#9299A3] mt-1">
        Encode highlight clips with hardware-accelerated H.264 / ProRes, burned kinetic typography, and audio leveling.
      </p>
    </div>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <!-- Render Preset Settings Form -->
    <div class="lg:col-span-1 p-5 rounded-lg bg-[#191C20] border border-[#292E34] space-y-4">
      <div class="flex items-center justify-between border-b border-[#292E34] pb-3">
        <span class="text-sm font-semibold text-[#E7E9EC]">Render Settings</span>
        <span class="text-xs text-[#B6F36B] font-mono">
          {activeClip ? activeClip.title.slice(0, 22) + '...' : 'Select a clip'}
        </span>
      </div>

      <!-- Resolution -->
      <div>
        <span class="text-[11px] font-semibold text-[#626871] uppercase tracking-wider block mb-1.5">
          Export Resolution
        </span>
        <div class="grid grid-cols-1 gap-1.5 text-xs">
          {#each [
            { id: '1080x1920', label: '1080 x 1920 (FHD Vertical)', desc: 'TikTok & Shorts standard' },
            { id: '2160x3840', label: '2160 x 3840 (4K UHD Vertical)', desc: 'Maximum fidelity master' },
            { id: '1080x1080', label: '1080 x 1080 (Square 1:1)', desc: 'Feed & LinkedIn square' },
          ] as res (res.id)}
            <button
              type="button"
              onclick={() => (resolution = res.id as any)}
              class="p-2 rounded border text-left transition-colors cursor-pointer {resolution === res.id
                ? 'bg-[#20242A] border-[#B6F36B] text-[#E7E9EC]'
                : 'bg-[#14171A] border-[#292E34] text-[#9299A3] hover:border-[#383F47]'}"
            >
              <div class="font-medium">{res.label}</div>
              <div class="text-[10px] text-[#626871]">{res.desc}</div>
            </button>
          {/each}
        </div>
      </div>

      <!-- Codec / Container -->
      <div>
        <span class="text-[11px] font-semibold text-[#626871] uppercase tracking-wider block mb-1.5">
          Codec Container
        </span>
        <div class="grid grid-cols-3 gap-2 text-xs font-mono">
          {#each [
            { id: 'mp4', label: 'H.264 MP4' },
            { id: 'mov', label: 'H.265 MOV' },
            { id: 'prores', label: 'ProRes 422' },
          ] as fmt (fmt.id)}
            <button
              type="button"
              onclick={() => (format = fmt.id as any)}
              class="py-2 rounded border text-center transition-colors cursor-pointer {format === fmt.id
                ? 'bg-[#20242A] border-[#B6F36B] text-[#B6F36B]'
                : 'bg-[#14171A] border-[#292E34] text-[#9299A3] hover:border-[#383F47]'}"
            >
              {fmt.label}
            </button>
          {/each}
        </div>
      </div>

      <!-- Subtitle Delivery -->
      <div>
        <span class="text-[11px] font-semibold text-[#626871] uppercase tracking-wider block mb-1.5">
          Subtitle Delivery
        </span>
        <div class="grid grid-cols-3 gap-2 text-xs">
          {#each [
            { id: 'burned', label: 'Burned-In' },
            { id: 'separate_srt', label: 'SRT Sidecar' },
            { id: 'none', label: 'No Subs' },
          ] as sub (sub.id)}
            <button
              type="button"
              onclick={() => (subtitles = sub.id as any)}
              class="py-1.5 rounded border text-center transition-colors cursor-pointer {subtitles === sub.id
                ? 'bg-[#20242A] border-[#B6F36B] text-[#E7E9EC]'
                : 'bg-[#14171A] border-[#292E34] text-[#9299A3] hover:border-[#383F47]'}"
            >
              {sub.label}
            </button>
          {/each}
        </div>
      </div>

      <!-- Framerate & Bitrate -->
      <div class="grid grid-cols-2 gap-3 text-xs">
        <div>
          <label for="export-framerate" class="text-[10px] text-[#626871] block mb-1">Framerate</label>
          <select
            id="export-framerate"
            bind:value={fps}
            class="w-full h-8 px-2 bg-[#14171A] border border-[#292E34] rounded text-[#E7E9EC] font-mono focus:outline-none cursor-pointer"
          >
            <option value={60}>60 FPS (Smooth)</option>
            <option value={30}>30 FPS (Standard)</option>
            <option value={24}>24 FPS (Cinematic)</option>
          </select>
        </div>

        <div>
          <label for="export-bitrate" class="text-[10px] text-[#626871] block mb-1">Target Bitrate</label>
          <select
            id="export-bitrate"
            bind:value={bitrate}
            class="w-full h-8 px-2 bg-[#14171A] border border-[#292E34] rounded text-[#E7E9EC] font-mono focus:outline-none cursor-pointer"
          >
            <option value={14}>14 Mbps (Balanced)</option>
            <option value={18}>18 Mbps (High)</option>
            <option value={30}>30 Mbps (Master)</option>
          </select>
        </div>
      </div>

      <!-- Render CTA -->
      <button
        type="button"
        onclick={handleQueueRender}
        disabled={!activeClip || isSubmitting}
        class="w-full h-9 rounded text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B6F36B]/50 {!activeClip
          ? 'bg-[#20242A] text-[#626871] cursor-not-allowed'
          : 'bg-[#B6F36B] hover:bg-[#A5E456] text-[#111315]'}"
      >
        <Download class="w-3.5 h-3.5 stroke-[2.2]" />
        <span>{isSubmitting ? 'Submitting to GPU cluster...' : 'Add Clip to Render Queue'}</span>
      </button>
    </div>

    <!-- Render Queue Table -->
    <div class="lg:col-span-2 space-y-3">
      <div class="flex items-center justify-between text-xs font-medium text-[#9299A3] px-1">
        <span>Render Jobs ({workspace.renderTasks.length})</span>
        <span class="font-mono text-[#626871]">Engine: Local WebGPU / FFmpeg WASM</span>
      </div>

      <div class="space-y-3">
        {#each workspace.renderTasks as task (task.id)}
          <div class="p-4 rounded-lg bg-[#191C20] border border-[#292E34] space-y-3">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div class="text-sm font-semibold text-[#E7E9EC]">
                  {task.clipTitle}
                </div>
                <div class="flex items-center gap-2 text-xs text-[#9299A3] mt-1 font-mono">
                  <span>{task.resolution}</span>
                  <span>·</span>
                  <span>{task.framerate}fps</span>
                  <span>·</span>
                  <span class="uppercase">{task.format}</span>
                  <span>·</span>
                  <span>{(task.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB</span>
                </div>
              </div>

              <div class="flex items-center gap-3 self-end sm:self-auto">
                {#if task.status === 'completed'}
                  <button
                    type="button"
                    onclick={() => workspace.downloadRenderTask(task)}
                    class="h-8 px-3 text-xs font-semibold text-[#111315] bg-[#B6F36B] hover:bg-[#A5E456] rounded transition-colors flex items-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B6F36B]/50"
                  >
                    <Download class="w-3.5 h-3.5" />
                    <span>Download {task.format.toUpperCase()}</span>
                  </button>
                {:else}
                  <div class="flex items-center gap-1.5 text-xs text-[#B6F36B] font-mono">
                    <RefreshCw class="w-3.5 h-3.5 animate-spin" />
                    <span>Rendering {task.progress}%</span>
                  </div>
                {/if}
              </div>
            </div>

            <!-- Progress bar -->
            <div class="w-full h-1.5 bg-[#20242A] rounded-full overflow-hidden">
              <div
                class="h-full bg-[#B6F36B] transition-all duration-300"
                style="width: {task.progress}%"
              ></div>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>
</div>
