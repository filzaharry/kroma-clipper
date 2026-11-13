<script lang="ts">
  import { workspace } from '#lib/state/workspace.svelte';
  import { goto } from '$app/navigation';
  import type { AspectRatio, FramingMode, CaptionStylePreset } from '#lib/types';
  import {
    SlidersHorizontal,
    Play,
    Volume2,
    Sparkles,
    Smartphone,
    Square,
    Maximize2,
    Type,
    Gauge,
    UserCheck,
    Palette,
    Layers,
  } from 'lucide-svelte';

  const rules = $derived(workspace.rules);

  function toggleAspectRatio(ratio: AspectRatio) {
    let next: AspectRatio[];
    if (rules.targetAspectRatios.includes(ratio)) {
      if (rules.targetAspectRatios.length === 1) return; // Keep at least one
      next = rules.targetAspectRatios.filter((r) => r !== ratio);
    } else {
      next = [...rules.targetAspectRatios, ratio];
    }
    workspace.updateRules({ ...rules, targetAspectRatios: next });
  }

  function applyRulePreset(presetName: 'viral' | 'insights' | 'podcast') {
    if (presetName === 'viral') {
      workspace.updateRules({
        ...rules,
        minDuration: 20,
        maxDuration: 45,
        audioEnergyThreshold: 65,
        hookSensitivity: 90,
        captionPreset: 'hormozi',
        framingMode: 'face_track',
        detectSpeakerSwitches: true,
      });
    } else if (presetName === 'insights') {
      workspace.updateRules({
        ...rules,
        minDuration: 35,
        maxDuration: 75,
        audioEnergyThreshold: 50,
        hookSensitivity: 75,
        captionPreset: 'minimal',
        framingMode: 'centered',
        detectSpeakerSwitches: false,
      });
    } else if (presetName === 'podcast') {
      workspace.updateRules({
        ...rules,
        minDuration: 25,
        maxDuration: 60,
        audioEnergyThreshold: 60,
        hookSensitivity: 85,
        captionPreset: 'karaoke',
        framingMode: 'face_track',
        detectSpeakerSwitches: true,
      });
    }
  }

  function handleRun() {
    workspace.runAnalysis();
    goto('/analysis');
  }
</script>

<div class="flex-1 flex flex-col overflow-y-auto bg-[#111315] p-6 lg:p-8">
  <!-- Title & Preset Bar -->
  <div class="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
    <div>
      <h1 class="text-xl font-semibold text-[#E7E9EC] tracking-tight">
        2. Clipping Preferences & Rule Engine
      </h1>
      <p class="text-xs text-[#9299A3] mt-1">
        Define rule-based heuristics for highlight identification. Transparent thresholds for energy, cadence, and hooks.
      </p>
    </div>

    <!-- Quick Heuristic Presets -->
    <div class="flex items-center gap-1.5 p-1 bg-[#191C20] rounded border border-[#292E34]">
      <span class="text-[11px] text-[#626871] px-2 font-medium">Presets:</span>
      <button
        type="button"
        onclick={() => applyRulePreset('viral')}
        class="px-2.5 py-1 text-xs font-medium rounded text-[#E7E9EC] hover:bg-[#20242A] transition-colors cursor-pointer"
      >
        Viral Shorts
      </button>
      <button
        type="button"
        onclick={() => applyRulePreset('insights')}
        class="px-2.5 py-1 text-xs font-medium rounded text-[#E7E9EC] hover:bg-[#20242A] transition-colors cursor-pointer"
      >
        Deep Insights
      </button>
      <button
        type="button"
        onclick={() => applyRulePreset('podcast')}
        class="px-2.5 py-1 text-xs font-medium rounded text-[#E7E9EC] hover:bg-[#20242A] transition-colors cursor-pointer"
      >
        Podcast Stems
      </button>
    </div>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <!-- Left Column: Target Durations & Framing -->
    <div class="space-y-6">
      <!-- Duration Bounds Card -->
      <div class="p-5 rounded-lg bg-[#191C20] border border-[#292E34] space-y-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <Gauge class="w-4 h-4 text-[#B6F36B]" />
            <h3 class="text-sm font-semibold text-[#E7E9EC]">
              Clip Duration Bounds
            </h3>
          </div>
          <span class="text-xs font-mono tabular-nums text-[#B6F36B]">
            {rules.minDuration}s – {rules.maxDuration}s
          </span>
        </div>

        <div class="space-y-3">
          <div>
            <div class="flex justify-between text-xs text-[#9299A3] mb-1.5">
              <span>Minimum Duration</span>
              <span class="font-mono tabular-nums">{rules.minDuration} seconds</span>
            </div>
            <input
              type="range"
              min="15"
              max="45"
              step="5"
              value={rules.minDuration}
              oninput={(e) => {
                const val = parseInt((e.target as HTMLInputElement).value);
                workspace.updateRules({ ...rules, minDuration: val });
              }}
              class="w-full accent-[#B6F36B] bg-[#292E34] h-1.5 rounded-lg cursor-pointer"
            />
          </div>

          <div>
            <div class="flex justify-between text-xs text-[#9299A3] mb-1.5">
              <span>Maximum Duration</span>
              <span class="font-mono tabular-nums">{rules.maxDuration} seconds</span>
            </div>
            <input
              type="range"
              min="40"
              max="90"
              step="5"
              value={rules.maxDuration}
              oninput={(e) => {
                const val = parseInt((e.target as HTMLInputElement).value);
                workspace.updateRules({ ...rules, maxDuration: val });
              }}
              class="w-full accent-[#B6F36B] bg-[#292E34] h-1.5 rounded-lg cursor-pointer"
            />
          </div>
        </div>
      </div>

      <!-- Target Canvas Aspect Ratios -->
      <div class="p-5 rounded-lg bg-[#191C20] border border-[#292E34] space-y-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <Smartphone class="w-4 h-4 text-[#B6F36B]" />
            <h3 class="text-sm font-semibold text-[#E7E9EC]">
              Target Canvas Geometry
            </h3>
          </div>
          <span class="text-xs text-[#9299A3]">Multi-selection enabled</span>
        </div>

        <div class="grid grid-cols-3 gap-3">
          <button
            type="button"
            onclick={() => toggleAspectRatio('9:16')}
            class="p-3 rounded border text-left transition-colors flex flex-col justify-between h-24 cursor-pointer {rules.targetAspectRatios.includes(
              '9:16'
            )
              ? 'bg-[#20242A] border-[#B6F36B] text-[#E7E9EC]'
              : 'bg-[#14171A] border-[#292E34] text-[#9299A3] hover:border-[#383F47]'}"
          >
            <div class="flex items-center justify-between w-full">
              <Smartphone class="w-4 h-4 text-[#B6F36B]" />
              <span class="text-[10px] font-mono">9:16</span>
            </div>
            <div>
              <div class="text-xs font-semibold">Vertical</div>
              <div class="text-[10px] text-[#626871]">Shorts / TikTok / Reels</div>
            </div>
          </button>

          <button
            type="button"
            onclick={() => toggleAspectRatio('1:1')}
            class="p-3 rounded border text-left transition-colors flex flex-col justify-between h-24 cursor-pointer {rules.targetAspectRatios.includes(
              '1:1'
            )
              ? 'bg-[#20242A] border-[#B6F36B] text-[#E7E9EC]'
              : 'bg-[#14171A] border-[#292E34] text-[#9299A3] hover:border-[#383F47]'}"
          >
            <div class="flex items-center justify-between w-full">
              <Square class="w-4 h-4 text-[#B6F36B]" />
              <span class="text-[10px] font-mono">1:1</span>
            </div>
            <div>
              <div class="text-xs font-semibold">Square</div>
              <div class="text-[10px] text-[#626871]">LinkedIn / Feed</div>
            </div>
          </button>

          <button
            type="button"
            onclick={() => toggleAspectRatio('16:9')}
            class="p-3 rounded border text-left transition-colors flex flex-col justify-between h-24 cursor-pointer {rules.targetAspectRatios.includes(
              '16:9'
            )
              ? 'bg-[#20242A] border-[#B6F36B] text-[#E7E9EC]'
              : 'bg-[#14171A] border-[#292E34] text-[#9299A3] hover:border-[#383F47]'}"
          >
            <div class="flex items-center justify-between w-full">
              <Maximize2 class="w-4 h-4 text-[#B6F36B]" />
              <span class="text-[10px] font-mono">16:9</span>
            </div>
            <div>
              <div class="text-xs font-semibold">Landscape</div>
              <div class="text-[10px] text-[#626871]">YouTube / Web</div>
            </div>
          </button>
        </div>
      </div>

      <!-- Framing & Speaker Tracking Mode -->
      <div class="p-5 rounded-lg bg-[#191C20] border border-[#292E34] space-y-4">
        <div class="flex items-center gap-2">
          <UserCheck class="w-4 h-4 text-[#B6F36B]" />
          <h3 class="text-sm font-semibold text-[#E7E9EC]">
            Speaker Framing & Tracking
          </h3>
        </div>

        <div class="grid grid-cols-2 gap-2 text-xs">
          {#each [
            { id: 'face_track' as FramingMode, label: 'Active Face Follow', desc: 'Auto-centers speaking person' },
            { id: 'centered' as FramingMode, label: 'Center Crop', desc: 'Fixed center framing' },
            { id: 'split_screen' as FramingMode, label: 'Split Screen (2-Up)', desc: 'Stacks host & guest vertically' },
            { id: 'manual_pan' as FramingMode, label: 'Manual Keyframe', desc: 'Adjust crop in Clip Editor' },
          ] as mode (mode.id)}
            <button
              type="button"
              onclick={() => workspace.updateRules({ ...rules, framingMode: mode.id })}
              class="p-2.5 rounded border text-left transition-colors cursor-pointer {rules.framingMode === mode.id
                ? 'bg-[#20242A] border-[#B6F36B] text-[#E7E9EC]'
                : 'bg-[#14171A] border-[#292E34] text-[#9299A3] hover:border-[#383F47]'}"
            >
              <div class="font-medium">{mode.label}</div>
              <div class="text-[10px] text-[#626871] mt-0.5">{mode.desc}</div>
            </button>
          {/each}
        </div>
      </div>
    </div>

    <!-- Right Column: Audio Energy, Hook Heuristics & Captions -->
    <div class="space-y-6">
      <!-- Audio Energy Threshold -->
      <div class="p-5 rounded-lg bg-[#191C20] border border-[#292E34] space-y-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <Volume2 class="w-4 h-4 text-[#B6F36B]" />
            <h3 class="text-sm font-semibold text-[#E7E9EC]">
              Audio Energy Cutoff Threshold
            </h3>
          </div>
          <span class="text-xs font-mono tabular-nums text-[#B6F36B]">
            {rules.audioEnergyThreshold}%
          </span>
        </div>

        <p class="text-xs text-[#9299A3]">
          Ignores segments where vocal volume or pitch variance drops below this threshold. Filters low-energy conversational banter.
        </p>

        <input
          type="range"
          min="20"
          max="90"
          step="5"
          value={rules.audioEnergyThreshold}
          oninput={(e) => {
            const val = parseInt((e.target as HTMLInputElement).value);
            workspace.updateRules({ ...rules, audioEnergyThreshold: val });
          }}
          class="w-full accent-[#B6F36B] bg-[#292E34] h-1.5 rounded-lg cursor-pointer"
        />
      </div>

      <!-- Hook Detection Sensitivity -->
      <div class="p-5 rounded-lg bg-[#191C20] border border-[#292E34] space-y-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <Sparkles class="w-4 h-4 text-[#B6F36B]" />
            <h3 class="text-sm font-semibold text-[#E7E9EC]">
              Opening Hook Sensitivity
            </h3>
          </div>
          <span class="text-xs font-mono tabular-nums text-[#B6F36B]">
            {rules.hookSensitivity}%
          </span>
        </div>

        <p class="text-xs text-[#9299A3]">
          Heuristic weighting for opening sentence punch: questions, counter-intuitive assertions, numbers, and high speech velocity.
        </p>

        <input
          type="range"
          min="50"
          max="95"
          step="5"
          value={rules.hookSensitivity}
          oninput={(e) => {
            const val = parseInt((e.target as HTMLInputElement).value);
            workspace.updateRules({ ...rules, hookSensitivity: val });
          }}
          class="w-full accent-[#B6F36B] bg-[#292E34] h-1.5 rounded-lg cursor-pointer"
        />

        <div class="pt-2 border-t border-[#292E34] space-y-2.5">
          <div class="flex items-center justify-between text-xs text-[#9299A3]">
            <span>Silence Pacing Penalty</span>
            <label class="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={rules.speechPacingPenalty}
                onchange={(e) =>
                  workspace.updateRules({
                    ...rules,
                    speechPacingPenalty: (e.target as HTMLInputElement).checked,
                  })
                }
                class="sr-only peer"
              />
              <div
                class="w-9 h-5 bg-[#292E34] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#B6F36B]"
              ></div>
            </label>
          </div>

          <div class="flex items-center justify-between text-xs text-[#9299A3]">
            <span>Detect Speaker Turn Cadence</span>
            <label class="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={rules.detectSpeakerSwitches}
                onchange={(e) =>
                  workspace.updateRules({
                    ...rules,
                    detectSpeakerSwitches: (e.target as HTMLInputElement).checked,
                  })
                }
                class="sr-only peer"
              />
              <div
                class="w-9 h-5 bg-[#292E34] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#B6F36B]"
              ></div>
            </label>
          </div>

          <div class="flex items-center justify-between text-xs text-[#9299A3]">
            <span class="flex items-center gap-1.5">
              <Layers class="w-3.5 h-3.5 text-[#626871]" />
              Max Candidate Highlights
            </span>
            <select
              value={rules.maxCandidates}
              onchange={(e) =>
                workspace.updateRules({
                  ...rules,
                  maxCandidates: parseInt((e.target as HTMLSelectElement).value),
                })
              }
              class="h-7 px-2 bg-[#14171A] border border-[#292E34] rounded text-[#E7E9EC] font-mono text-xs focus:outline-none cursor-pointer"
            >
              <option value="4">4 clips</option>
              <option value="8">8 clips (Default)</option>
              <option value="12">12 clips</option>
              <option value="16">16 clips</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Caption Style Preset -->
      <div class="p-5 rounded-lg bg-[#191C20] border border-[#292E34] space-y-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <Type class="w-4 h-4 text-[#B6F36B]" />
            <h3 class="text-sm font-semibold text-[#E7E9EC]">
              Caption Engine Preset
            </h3>
          </div>
          <div class="flex items-center gap-1.5">
            <Palette class="w-3.5 h-3.5 text-[#626871]" />
            <div class="flex items-center gap-1">
              {#each ['#B6F36B', '#FACC15', '#38BDF8', '#F43F5E'] as c}
                <button
                  type="button"
                  aria-label="Caption color {c}"
                  onclick={() => workspace.updateRules({ ...rules, captionHighlightColor: c })}
                  class="w-4 h-4 rounded-full border border-black/40 cursor-pointer {rules.captionHighlightColor === c
                    ? 'ring-2 ring-white scale-110'
                    : ''}"
                  style="background-color: {c}"
                ></button>
              {/each}
            </div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2 text-xs">
          {#each [
            { id: 'hormozi' as CaptionStylePreset, label: 'Hormozi Kinetic', desc: 'Bold sans, punch color pop' },
            { id: 'minimal' as CaptionStylePreset, label: 'Clean Editorial', desc: 'Restrained, subtitle grade' },
            { id: 'karaoke' as CaptionStylePreset, label: 'Karaoke Word Highlighting', desc: 'Progressive word fill' },
            { id: 'subtle_box' as CaptionStylePreset, label: 'High-Contrast Box', desc: 'Dark solid backdrop' },
          ] as preset (preset.id)}
            <button
              type="button"
              onclick={() => workspace.updateRules({ ...rules, captionPreset: preset.id })}
              class="p-2.5 rounded border text-left transition-colors cursor-pointer {rules.captionPreset === preset.id
                ? 'bg-[#20242A] border-[#B6F36B] text-[#E7E9EC]'
                : 'bg-[#14171A] border-[#292E34] text-[#9299A3] hover:border-[#383F47]'}"
            >
              <div class="font-medium">{preset.label}</div>
              <div class="text-[10px] text-[#626871] mt-0.5">{preset.desc}</div>
            </button>
          {/each}
        </div>
      </div>
    </div>
  </div>

  <!-- Action Footer -->
  <div
    class="mt-8 pt-5 border-t border-[#292E34] flex flex-col sm:flex-row items-center justify-between gap-4"
  >
    <div class="text-xs text-[#9299A3]">
      Active Master: <span class="text-[#E7E9EC] font-medium"
        >{workspace.activeVideo?.title || 'None'}</span
      >
    </div>

    <button
      type="button"
      onclick={handleRun}
      disabled={workspace.isAnalyzing || !workspace.activeVideo}
      class="h-9 px-5 text-xs font-semibold rounded transition-colors flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B6F36B]/50 {workspace.isAnalyzing
        ? 'bg-[#20242A] text-[#9299A3] cursor-not-allowed border border-[#292E34]'
        : 'text-[#111315] bg-[#B6F36B] hover:bg-[#A5E456] active:bg-[#94D445]'}"
    >
      <Play class="w-3.5 h-3.5 fill-current" />
      <span>{workspace.isAnalyzing ? 'Executing Heuristic Engine...' : 'Run Highlight Detection'}</span>
    </button>
  </div>
</div>
