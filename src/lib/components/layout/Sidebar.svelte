<script lang="ts">
  import { workspace } from '#lib/state/workspace.svelte';
  import { page } from '$app/state';
  import { formatDuration } from '#lib/utils/clippingRules';
  import {
    SquarePlay,
    SlidersHorizontal,
    Cpu,
    Layers,
    Scissors,
    Download,
    Calendar,
    Activity,
    HardDrive,
    FileVideo,
  } from 'lucide-svelte';

  const pathname = $derived(page.url.pathname);

  const navItems = $derived([
    { path: '/library', label: '1. YouTube Ingest', icon: SquarePlay, count: null },
    { path: '/rules', label: '2. Rule Config', icon: SlidersHorizontal, count: null },
    { path: '/analysis', label: '3. Heuristic Engine', icon: Cpu, count: null },
    { path: '/candidates', label: '4. Clip Candidates', icon: Layers, count: workspace.candidates.length || null },
    { path: '/editor', label: '5. Clip Editor (NLE)', icon: Scissors, count: null },
    { path: '/export', label: '6. Render Queue', icon: Download, count: workspace.completedRenderCount || null },
    { path: '/publish', label: '7. Social Schedule', icon: Calendar, count: null },
  ]);

  function isItemActive(itemPath: string) {
    if (itemPath === '/candidates' && (pathname === '/' || pathname === '/candidates')) return true;
    return pathname.startsWith(itemPath);
  }
</script>

<aside
  class="w-64 border-r border-[#292E34] bg-[#14171A] flex flex-col justify-between shrink-0 select-none"
>
  <!-- Navigation Workflow List -->
  <div class="p-3 space-y-1">
    <div class="px-3 pt-2 pb-2 text-[11px] font-semibold text-[#626871] uppercase tracking-wider">
      Production Pipeline
    </div>
    {#each navItems as item (item.path)}
      {@const isActive = isItemActive(item.path)}
      {@const Icon = item.icon}
      <a
        href={item.path}
        class="w-full flex items-center justify-between px-3 py-2 rounded text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#B6F36B] {isActive
          ? 'bg-[#20242A] text-[#B6F36B] border border-[#292E34]'
          : 'text-[#9299A3] hover:text-[#E7E9EC] hover:bg-[#191C20] border border-transparent'}"
      >
        <div class="flex items-center gap-2.5 truncate">
          <Icon class="w-4 h-4 shrink-0 {isActive ? 'text-[#B6F36B]' : 'text-[#626871]'}" />
          <span class="truncate">{item.label}</span>
        </div>
        {#if item.count !== null}
          <span
            class="text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded {isActive
              ? 'bg-[#111315] text-[#B6F36B]'
              : 'bg-[#20242A] text-[#9299A3]'}"
          >
            {item.count}
          </span>
        {/if}
      </a>
    {/each}
  </div>

  <!-- Active Source Inspector Card -->
  <div class="p-3 border-t border-[#292E34] bg-[#111315]">
    <div class="text-[11px] font-semibold text-[#626871] uppercase tracking-wider mb-2 flex items-center justify-between">
      <span>Active Master File</span>
      <FileVideo class="w-3.5 h-3.5 text-[#626871]" />
    </div>

    {#if workspace.activeVideo}
      {@const video = workspace.activeVideo}
      <div class="space-y-2">
        <div class="text-xs font-medium text-[#E7E9EC] truncate" title={video.title}>
          {video.title}
        </div>

        <div class="grid grid-cols-2 gap-1.5 text-[11px] text-[#9299A3]">
          <div class="bg-[#191C20] px-2 py-1.5 rounded border border-[#292E34]">
            <div class="text-[10px] text-[#626871]">Duration</div>
            <div class="font-mono tabular-nums text-[#E7E9EC] font-medium">
              {formatDuration(video.durationSeconds)}
            </div>
          </div>

          <div class="bg-[#191C20] px-2 py-1.5 rounded border border-[#292E34]">
            <div class="text-[10px] text-[#626871]">Resolution</div>
            <div class="font-mono tabular-nums text-[#E7E9EC] font-medium">
              {video.resolution.width}x{video.resolution.height}
            </div>
          </div>

          <div class="bg-[#191C20] px-2 py-1.5 rounded border border-[#292E34]">
            <div class="text-[10px] text-[#626871]">Framerate</div>
            <div class="font-mono tabular-nums text-[#E7E9EC] font-medium">
              {video.fps} fps
            </div>
          </div>

          <div class="bg-[#191C20] px-2 py-1.5 rounded border border-[#292E34]">
            <div class="text-[10px] text-[#626871]">Audio Ch.</div>
            <div class="font-mono tabular-nums text-[#E7E9EC] font-medium">
              {video.audioChannels} ch ({video.sampleRate / 1000}kHz)
            </div>
          </div>
        </div>

        <div class="flex items-center justify-between pt-1 text-[11px] text-[#626871]">
          <div class="flex items-center gap-1">
            <HardDrive class="w-3 h-3" />
            <span>{(video.fileSizeBytes / (1024 * 1024 * 1024)).toFixed(1)} GB</span>
          </div>
          <div class="flex items-center gap-1 text-[#B6F36B]">
            <Activity class="w-3 h-3" />
            <span>{video.status === 'ready' ? 'Analyzed' : 'Processing'}</span>
          </div>
        </div>
      </div>
    {:else}
      <div class="text-xs text-[#626871] py-3 text-center">
        No master video selected
      </div>
    {/if}
  </div>
</aside>
