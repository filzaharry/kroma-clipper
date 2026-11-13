<script lang="ts">
  import { workspace } from '#lib/state/workspace.svelte';
  import { goto } from '$app/navigation';
  import { formatDuration, generateMockWaveform } from '#lib/utils/clippingRules';
  import type { VideoSource } from '#lib/types';
  import {
    UploadCloud,
    CheckCircle2,
    Film,
    Clock,
    MonitorPlay,
    AudioWaveform,
    ArrowRight,
    FilePlus,
  } from 'lucide-svelte';
  import { onDestroy } from 'svelte';

  let isDragging = $state(false);
  let uploadProgress = $state<number | null>(null);
  let uploadTimer: ReturnType<typeof setInterval> | null = null;

  function handleSimulatedUpload(fileTitle: string) {
    if (uploadTimer) {
      clearInterval(uploadTimer);
      uploadTimer = null;
    }

    uploadProgress = 15;
    let current = 15;

    uploadTimer = setInterval(() => {
      current += 25;
      if (current >= 100) {
        if (uploadTimer) {
          clearInterval(uploadTimer);
          uploadTimer = null;
        }
        uploadProgress = 100;

        const newVid: VideoSource = {
          id: `vid-custom-${Date.now()}`,
          title: fileTitle,
          fileName: fileTitle.toLowerCase().replace(/\s+/g, '_') + '.mp4',
          fileSizeBytes: 2840000000,
          durationSeconds: 1980,
          resolution: { width: 3840, height: 2160 },
          fps: 60,
          audioChannels: 2,
          sampleRate: 48000,
          uploadDate: new Date().toISOString().split('T')[0],
          thumbnailUrl: '',
          status: 'ready',
          waveformPoints: generateMockWaveform(120, Math.floor(Math.random() * 500)),
          transcripts: [
            {
              id: 'seg-u1',
              start: 45,
              end: 78,
              speaker: 'Host',
              text: 'Why do startup founders burn through millions on compute without profiling their latency graphs?',
            },
            {
              id: 'seg-u2',
              start: 78,
              end: 115,
              speaker: 'Guest',
              text: 'The secret is that hardware optimization requires understanding hardware constraints rather than throwing more GPUs at the cluster.',
            },
          ],
        };

        setTimeout(() => {
          workspace.addVideo(newVid);
          uploadProgress = null;
        }, 300);
      } else {
        uploadProgress = current;
      }
    }, 250);
  }

  function onFileChange(e: Event) {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
      handleSimulatedUpload(file.name.replace(/\.[^/.]+$/, ''));
    }
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    isDragging = false;
    const file = e.dataTransfer?.files[0];
    handleSimulatedUpload(file ? file.name.replace(/\.[^/.]+$/, '') : 'Imported_Master_Recording');
  }

  onDestroy(() => {
    if (uploadTimer) {
      clearInterval(uploadTimer);
      uploadTimer = null;
    }
  });
</script>

<div class="flex-1 flex flex-col overflow-y-auto bg-[#111315] p-6 lg:p-8">
  <!-- Page Title & Context -->
  <div class="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
    <div>
      <h1 class="text-xl font-semibold text-[#E7E9EC] tracking-tight">
        1. Master Video Ingest
      </h1>
      <p class="text-xs text-[#9299A3] mt-1">
        Ingest 4K, 1080p long-form interviews, podcasts, or keynotes. The rule engine will parse audio channels, speech energy, and hook heuristics.
      </p>
    </div>

    {#if workspace.activeVideo}
      <button
        type="button"
        onclick={() => goto('/rules')}
        class="h-9 px-4 text-xs font-semibold text-[#111315] bg-[#B6F36B] hover:bg-[#A5E456] active:bg-[#94D445] rounded transition-colors flex items-center gap-2 self-start md:self-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B6F36B]/50 shrink-0 cursor-pointer"
      >
        <span>Configure Clipping Rules</span>
        <ArrowRight class="w-3.5 h-3.5" />
      </button>
    {/if}
  </div>

  <!-- Drag & Drop Zone -->
  <div
    role="region"
    aria-label="Video File Drop Zone"
    ondragover={(e) => {
      e.preventDefault();
      isDragging = true;
    }}
    ondragleave={() => (isDragging = false)}
    ondrop={handleDrop}
    class="border-2 border-dashed rounded-lg p-8 text-center transition-colors mb-8 {isDragging
      ? 'border-[#B6F36B] bg-[#20242A]'
      : 'border-[#292E34] bg-[#191C20] hover:border-[#383F47]'}"
  >
    <div class="max-w-md mx-auto flex flex-col items-center">
      <div
        class="w-12 h-12 rounded-full bg-[#20242A] border border-[#292E34] flex items-center justify-center text-[#B6F36B] mb-3"
      >
        <UploadCloud class="w-6 h-6" />
      </div>
      <div class="text-sm font-medium text-[#E7E9EC] mb-1">
        Drag & drop master video file here
      </div>
      <p class="text-xs text-[#9299A3] mb-4">
        Supports MP4, MOV, ProRes, MKV up to 10GB. Automatically extracts waveform & audio stems.
      </p>

      {#if uploadProgress !== null}
        <div class="w-full space-y-2">
          <div class="flex justify-between text-xs text-[#9299A3]">
            <span>Ingesting media & extracting audio stems...</span>
            <span class="font-mono tabular-nums text-[#B6F36B]">{uploadProgress}%</span>
          </div>
          <div class="w-full h-1.5 bg-[#20242A] rounded-full overflow-hidden">
            <div
              class="h-full bg-[#B6F36B] transition-all duration-300"
              style="width: {uploadProgress}%"
            ></div>
          </div>
        </div>
      {:else}
        <div class="flex items-center gap-3">
          <label
            class="h-8 px-4 text-xs font-medium text-[#E7E9EC] bg-[#20242A] hover:bg-[#262B32] border border-[#292E34] rounded cursor-pointer transition-colors inline-flex items-center gap-1.5 focus-within:ring-2 focus-within:ring-[#B6F36B]"
          >
            <FilePlus class="w-3.5 h-3.5" />
            <span>Select Local File</span>
            <input
              type="file"
              accept="video/*"
              class="sr-only"
              onchange={onFileChange}
            />
          </label>
          <button
            type="button"
            onclick={() => handleSimulatedUpload('Podcast_Interview_Take_03')}
            class="h-8 px-3 text-xs text-[#9299A3] hover:text-[#E7E9EC] transition-colors cursor-pointer"
          >
            Ingest Demo Recording
          </button>
        </div>
      {/if}
    </div>
  </div>

  <!-- Library of Uploaded Masters -->
  <div class="space-y-3">
    <div class="flex items-center justify-between text-xs font-medium text-[#9299A3] px-1">
      <span>Project Master Files ({workspace.videos.length})</span>
      <span>Click to select active master file</span>
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
            <div class="flex items-start gap-3.5">
              <div
                class="w-12 h-12 rounded bg-[#111315] border border-[#292E34] flex items-center justify-center text-[#B6F36B] shrink-0"
              >
                <Film class="w-6 h-6 stroke-[1.8]" />
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <span class="text-sm font-semibold text-[#E7E9EC] tracking-tight">
                    {vid.title}
                  </span>
                  {#if isSelected}
                    <span
                      class="text-[10px] text-[#B6F36B] font-mono px-1.5 py-0.5 rounded bg-[#111315] border border-[#B6F36B]/30 flex items-center gap-1"
                    >
                      <CheckCircle2 class="w-3 h-3" />
                      ACTIVE MASTER
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
              Audio Stem
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
