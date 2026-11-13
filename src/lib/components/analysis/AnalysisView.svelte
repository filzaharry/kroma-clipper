<script lang="ts">
  import { workspace } from '#lib/state/workspace.svelte';
  import { goto } from '$app/navigation';
  import {
    Cpu,
    CheckCircle2,
    ArrowRight,
    Activity,
    Volume2,
    Sparkles,
    UserCheck,
    Layers,
  } from 'lucide-svelte';

  const rules = $derived(workspace.rules);
  const detectedClipsCount = $derived(workspace.candidates.length);

  const steps = $derived([
    {
      title: 'Speech & Audio Stem Extraction',
      desc: 'Filtering 48kHz audio track for vocal frequencies and amplitude dynamics',
      icon: Volume2,
      doneThreshold: 20,
    },
    {
      title: 'Speaker Diarization & Turn Cadence',
      desc: rules.detectSpeakerSwitches
        ? 'Separating speakers and calculating pause intervals'
        : 'Single speaker cadence pass',
      icon: UserCheck,
      doneThreshold: 45,
    },
    {
      title: 'Opening Hook Heuristic Scoring',
      desc: `Evaluating rhetorical question triggers with ${rules.hookSensitivity}% threshold`,
      icon: Sparkles,
      doneThreshold: 75,
    },
    {
      title: 'Aspect Framing & Subtitle Generation',
      desc: `Building ${rules.targetAspectRatios.join(', ')} crops and word-level timing offsets`,
      icon: Layers,
      doneThreshold: 98,
    },
  ]);
</script>

<div class="flex-1 flex flex-col overflow-y-auto bg-[#111315] p-6 lg:p-8">
  <!-- Header -->
  <div class="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
    <div>
      <h1 class="text-xl font-semibold text-[#E7E9EC] tracking-tight">
        3. Rule-Based Heuristic Analysis Engine
      </h1>
      <p class="text-xs text-[#9299A3] mt-1">
        Analyzing video stems against configured duration bounds ({rules.minDuration}s – {rules.maxDuration}s) and vocal energy thresholds.
      </p>
    </div>

    {#if detectedClipsCount > 0 && !workspace.isAnalyzing}
      <button
        type="button"
        onclick={() => goto('/candidates')}
        class="h-9 px-4 text-xs font-semibold text-[#111315] bg-[#B6F36B] hover:bg-[#A5E456] active:bg-[#94D445] rounded transition-colors flex items-center gap-2 self-start md:self-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B6F36B]/50 shrink-0 cursor-pointer"
      >
        <span>Review {detectedClipsCount} Candidates</span>
        <ArrowRight class="w-3.5 h-3.5" />
      </button>
    {/if}
  </div>

  <!-- Main Analysis Container -->
  <div class="max-w-4xl space-y-6">
    <!-- Progress Card -->
    <div class="p-6 rounded-lg bg-[#191C20] border border-[#292E34] space-y-5">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div
            class="w-9 h-9 rounded bg-[#20242A] border border-[#292E34] flex items-center justify-center text-[#B6F36B]"
          >
            <Cpu class="w-5 h-5 {workspace.isAnalyzing ? 'animate-spin' : ''}" />
          </div>
          <div>
            <div class="text-sm font-semibold text-[#E7E9EC]">
              {workspace.isAnalyzing ? 'Processing Heuristic Rules' : 'Analysis Pass Completed'}
            </div>
            <div class="text-xs text-[#9299A3]">
              {workspace.activeVideo?.title || 'No file selected'}
            </div>
          </div>
        </div>

        <div class="text-right">
          <div class="text-lg font-mono tabular-nums font-semibold text-[#B6F36B]">
            {workspace.analysisProgress}%
          </div>
          <div class="text-[10px] text-[#626871] font-mono">
            {workspace.isAnalyzing ? 'STATUS: ACTIVE' : 'PASS COMPLETED'}
          </div>
        </div>
      </div>

      <!-- Progress Bar -->
      <div class="w-full h-2 bg-[#20242A] rounded-full overflow-hidden">
        <div
          class="h-full bg-[#B6F36B] transition-all duration-300"
          style="width: {workspace.analysisProgress}%"
        ></div>
      </div>

      <!-- Pipeline Steps -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
        {#each steps as st, i (st.title)}
          {@const isDone = workspace.analysisProgress >= st.doneThreshold}
          {@const isCurrent =
            workspace.analysisProgress < st.doneThreshold &&
            (i === 0 || workspace.analysisProgress >= steps[i - 1].doneThreshold)}
          {@const StepIcon = st.icon}
          <div
            class="p-3.5 rounded border transition-colors {isDone
              ? 'bg-[#20242A]/60 border-[#292E34]'
              : isCurrent
                ? 'bg-[#191C20] border-[#B6F36B]/50 ring-1 ring-[#B6F36B]/30'
                : 'bg-[#14171A] border-[#292E34]/50 opacity-60'}"
          >
            <div class="flex items-start gap-3">
              <div
                class="w-7 h-7 rounded flex items-center justify-center shrink-0 mt-0.5 {isDone
                  ? 'bg-[#B6F36B]/10 text-[#B6F36B]'
                  : isCurrent
                    ? 'bg-[#20242A] text-[#B6F36B]'
                    : 'bg-[#20242A] text-[#626871]'}"
              >
                {#if isDone}
                  <CheckCircle2 class="w-4 h-4" />
                {:else}
                  <StepIcon class="w-4 h-4" />
                {/if}
              </div>
              <div>
                <div class="text-xs font-semibold text-[#E7E9EC]">{st.title}</div>
                <div class="text-[11px] text-[#9299A3] mt-0.5 leading-relaxed">{st.desc}</div>
              </div>
            </div>
          </div>
        {/each}
      </div>
    </div>

    <!-- Real-time Discovery Log / Inspection -->
    <div class="p-5 rounded-lg bg-[#191C20] border border-[#292E34] space-y-3">
      <div class="flex items-center justify-between text-xs font-medium text-[#9299A3]">
        <div class="flex items-center gap-2">
          <Activity class="w-3.5 h-3.5 text-[#B6F36B]" />
          <span>Engine Event Log</span>
        </div>
        <span class="font-mono text-[#626871]">{detectedClipsCount} candidates identified</span>
      </div>

      <div
        class="bg-[#111315] p-3 rounded border border-[#292E34] font-mono text-[11px] text-[#9299A3] space-y-1.5 h-48 overflow-y-auto"
      >
        {#each workspace.analysisLogs as log, idx (idx)}
          <div
            class={log.includes('Registered') || log.includes('complete') || log.includes('Successfully')
              ? 'text-[#B6F36B]'
              : log.includes('Trigger')
                ? 'text-[#E7E9EC]'
                : log.includes('Notice')
                  ? 'text-[#F59E0B]'
                  : 'text-[#626871]'}
          >
            {log}
          </div>
        {/each}
      </div>
    </div>
  </div>
</div>
