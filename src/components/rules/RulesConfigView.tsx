import React from 'react';
import { ClippingRuleConfig, AspectRatio, FramingMode, CaptionStylePreset, VideoSource } from '../../types';
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
} from 'lucide-react';

interface RulesConfigViewProps {
  rules: ClippingRuleConfig;
  onChangeRules: (updated: ClippingRuleConfig) => void;
  activeVideo: VideoSource | null;
  onRunAnalysis: () => void;
  isAnalyzing: boolean;
}

export const RulesConfigView: React.FC<RulesConfigViewProps> = ({
  rules,
  onChangeRules,
  activeVideo,
  onRunAnalysis,
  isAnalyzing,
}) => {
  const toggleAspectRatio = (ratio: AspectRatio) => {
    let next: AspectRatio[];
    if (rules.targetAspectRatios.includes(ratio)) {
      if (rules.targetAspectRatios.length === 1) return; // Keep at least one
      next = rules.targetAspectRatios.filter((r) => r !== ratio);
    } else {
      next = [...rules.targetAspectRatios, ratio];
    }
    onChangeRules({ ...rules, targetAspectRatios: next });
  };

  const applyRulePreset = (presetName: 'viral' | 'insights' | 'podcast') => {
    if (presetName === 'viral') {
      onChangeRules({
        ...rules,
        minDuration: 20,
        maxDuration: 45,
        audioEnergyThreshold: 65,
        hookSensitivity: 90,
        captionPreset: 'hormozi',
        framingMode: 'face_track',
      });
    } else if (presetName === 'insights') {
      onChangeRules({
        ...rules,
        minDuration: 35,
        maxDuration: 75,
        audioEnergyThreshold: 50,
        hookSensitivity: 75,
        captionPreset: 'minimal',
        framingMode: 'centered',
      });
    } else if (presetName === 'podcast') {
      onChangeRules({
        ...rules,
        minDuration: 25,
        maxDuration: 60,
        audioEnergyThreshold: 60,
        hookSensitivity: 85,
        captionPreset: 'karaoke',
        framingMode: 'face_track',
      });
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-[#111315] p-6 lg:p-8">
      {/* Title & Preset Bar */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[#E7E9EC] tracking-tight">
            2. Clipping Preferences & Rule Engine
          </h1>
          <p className="text-xs text-[#9299A3] mt-1">
            Define rule-based heuristics for highlight identification. No black-box AI: transparent thresholds for energy, cadence, and hooks.
          </p>
        </div>

        {/* Quick Heuristic Presets */}
        <div className="flex items-center gap-1.5 p-1 bg-[#191C20] rounded border border-[#292E34]">
          <span className="text-[11px] text-[#626871] px-2 font-medium">Presets:</span>
          <button
            type="button"
            onClick={() => applyRulePreset('viral')}
            className="px-2.5 py-1 text-xs font-medium rounded text-[#E7E9EC] hover:bg-[#20242A] transition-colors"
          >
            Viral Shorts
          </button>
          <button
            type="button"
            onClick={() => applyRulePreset('insights')}
            className="px-2.5 py-1 text-xs font-medium rounded text-[#E7E9EC] hover:bg-[#20242A] transition-colors"
          >
            Deep Insights
          </button>
          <button
            type="button"
            onClick={() => applyRulePreset('podcast')}
            className="px-2.5 py-1 text-xs font-medium rounded text-[#E7E9EC] hover:bg-[#20242A] transition-colors"
          >
            Podcast Stems
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Target Durations & Framing */}
        <div className="space-y-6">
          {/* Duration Bounds Card */}
          <div className="p-5 rounded-lg bg-[#191C20] border border-[#292E34] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-[#B6F36B]" />
                <h3 className="text-sm font-semibold text-[#E7E9EC]">
                  Clip Duration Bounds
                </h3>
              </div>
              <span className="text-xs font-mono tabular-nums text-[#B6F36B]">
                {rules.minDuration}s – {rules.maxDuration}s
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs text-[#9299A3] mb-1.5">
                  <span>Minimum Duration</span>
                  <span className="font-mono tabular-nums">{rules.minDuration} seconds</span>
                </div>
                <input
                  type="range"
                  min="15"
                  max="45"
                  step="5"
                  value={rules.minDuration}
                  onChange={(e) =>
                    onChangeRules({ ...rules, minDuration: parseInt(e.target.value) })
                  }
                  className="w-full accent-[#B6F36B] bg-[#292E34] h-1.5 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-[#9299A3] mb-1.5">
                  <span>Maximum Duration</span>
                  <span className="font-mono tabular-nums">{rules.maxDuration} seconds</span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="90"
                  step="5"
                  value={rules.maxDuration}
                  onChange={(e) =>
                    onChangeRules({ ...rules, maxDuration: parseInt(e.target.value) })
                  }
                  className="w-full accent-[#B6F36B] bg-[#292E34] h-1.5 rounded-lg cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Target Canvas Aspect Ratios */}
          <div className="p-5 rounded-lg bg-[#191C20] border border-[#292E34] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-[#B6F36B]" />
                <h3 className="text-sm font-semibold text-[#E7E9EC]">
                  Target Canvas Geometry
                </h3>
              </div>
              <span className="text-xs text-[#9299A3]">Multi-selection enabled</span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => toggleAspectRatio('9:16')}
                className={`p-3 rounded border text-left transition-colors flex flex-col justify-between h-24 ${
                  rules.targetAspectRatios.includes('9:16')
                    ? 'bg-[#20242A] border-[#B6F36B] text-[#E7E9EC]'
                    : 'bg-[#14171A] border-[#292E34] text-[#9299A3] hover:border-[#383F47]'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <Smartphone className="w-4 h-4 text-[#B6F36B]" />
                  <span className="text-[10px] font-mono">9:16</span>
                </div>
                <div>
                  <div className="text-xs font-semibold">Vertical</div>
                  <div className="text-[10px] text-[#626871]">Shorts / TikTok / Reels</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => toggleAspectRatio('1:1')}
                className={`p-3 rounded border text-left transition-colors flex flex-col justify-between h-24 ${
                  rules.targetAspectRatios.includes('1:1')
                    ? 'bg-[#20242A] border-[#B6F36B] text-[#E7E9EC]'
                    : 'bg-[#14171A] border-[#292E34] text-[#9299A3] hover:border-[#383F47]'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <Square className="w-4 h-4 text-[#B6F36B]" />
                  <span className="text-[10px] font-mono">1:1</span>
                </div>
                <div>
                  <div className="text-xs font-semibold">Square</div>
                  <div className="text-[10px] text-[#626871]">LinkedIn / Feed</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => toggleAspectRatio('16:9')}
                className={`p-3 rounded border text-left transition-colors flex flex-col justify-between h-24 ${
                  rules.targetAspectRatios.includes('16:9')
                    ? 'bg-[#20242A] border-[#B6F36B] text-[#E7E9EC]'
                    : 'bg-[#14171A] border-[#292E34] text-[#9299A3] hover:border-[#383F47]'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <Maximize2 className="w-4 h-4 text-[#B6F36B]" />
                  <span className="text-[10px] font-mono">16:9</span>
                </div>
                <div>
                  <div className="text-xs font-semibold">Landscape</div>
                  <div className="text-[10px] text-[#626871]">YouTube / Web</div>
                </div>
              </button>
            </div>
          </div>

          {/* Framing & Speaker Tracking Mode */}
          <div className="p-5 rounded-lg bg-[#191C20] border border-[#292E34] space-y-4">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-[#B6F36B]" />
              <h3 className="text-sm font-semibold text-[#E7E9EC]">
                Speaker Framing & Tracking
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {(
                [
                  { id: 'face_track' as FramingMode, label: 'Active Face Follow', desc: 'Auto-centers speaking person' },
                  { id: 'centered' as FramingMode, label: 'Center Crop', desc: 'Fixed center framing' },
                  { id: 'split_screen' as FramingMode, label: 'Split Screen (2-Up)', desc: 'Stacks host & guest vertically' },
                  { id: 'manual_pan' as FramingMode, label: 'Manual Keyframe', desc: 'Adjust crop in Clip Editor' },
                ] as const
              ).map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => onChangeRules({ ...rules, framingMode: mode.id })}
                  className={`p-2.5 rounded border text-left transition-colors ${
                    rules.framingMode === mode.id
                      ? 'bg-[#20242A] border-[#B6F36B] text-[#E7E9EC]'
                      : 'bg-[#14171A] border-[#292E34] text-[#9299A3] hover:border-[#383F47]'
                  }`}
                >
                  <div className="font-medium">{mode.label}</div>
                  <div className="text-[10px] text-[#626871] mt-0.5">{mode.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Audio Energy, Hook Heuristics & Captions */}
        <div className="space-y-6">
          {/* Audio Energy Threshold */}
          <div className="p-5 rounded-lg bg-[#191C20] border border-[#292E34] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-[#B6F36B]" />
                <h3 className="text-sm font-semibold text-[#E7E9EC]">
                  Audio Energy Cutoff Threshold
                </h3>
              </div>
              <span className="text-xs font-mono tabular-nums text-[#B6F36B]">
                {rules.audioEnergyThreshold}%
              </span>
            </div>

            <p className="text-xs text-[#9299A3]">
              Ignores segments where vocal volume or pitch variance drops below this threshold. Filters low-energy conversational banter.
            </p>

            <input
              type="range"
              min="20"
              max="90"
              step="5"
              value={rules.audioEnergyThreshold}
              onChange={(e) =>
                onChangeRules({ ...rules, audioEnergyThreshold: parseInt(e.target.value) })
              }
              className="w-full accent-[#B6F36B] bg-[#292E34] h-1.5 rounded-lg cursor-pointer"
            />
          </div>

          {/* Hook Detection Sensitivity */}
          <div className="p-5 rounded-lg bg-[#191C20] border border-[#292E34] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#B6F36B]" />
                <h3 className="text-sm font-semibold text-[#E7E9EC]">
                  Opening Hook Sensitivity
                </h3>
              </div>
              <span className="text-xs font-mono tabular-nums text-[#B6F36B]">
                {rules.hookSensitivity}%
              </span>
            </div>

            <p className="text-xs text-[#9299A3]">
              Heuristic weighting for opening sentence punch: questions, counter-intuitive assertions, numbers, and high speech velocity in the first 3 seconds.
            </p>

            <input
              type="range"
              min="50"
              max="95"
              step="5"
              value={rules.hookSensitivity}
              onChange={(e) =>
                onChangeRules({ ...rules, hookSensitivity: parseInt(e.target.value) })
              }
              className="w-full accent-[#B6F36B] bg-[#292E34] h-1.5 rounded-lg cursor-pointer"
            />

            <div className="pt-2 border-t border-[#292E34] flex items-center justify-between text-xs text-[#9299A3]">
              <span>Silence Pacing Penalty</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={rules.speechPacingPenalty}
                  onChange={(e) =>
                    onChangeRules({ ...rules, speechPacingPenalty: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-[#292E34] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#B6F36B]"></div>
              </label>
            </div>
          </div>

          {/* Caption Style Preset */}
          <div className="p-5 rounded-lg bg-[#191C20] border border-[#292E34] space-y-4">
            <div className="flex items-center gap-2">
              <Type className="w-4 h-4 text-[#B6F36B]" />
              <h3 className="text-sm font-semibold text-[#E7E9EC]">
                Caption Engine Preset
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {(
                [
                  { id: 'hormozi' as CaptionStylePreset, label: 'Hormozi Kinetic', desc: 'Bold sans, punch color pop' },
                  { id: 'minimal' as CaptionStylePreset, label: 'Clean Editorial', desc: 'Restrained, subtitle grade' },
                  { id: 'karaoke' as CaptionStylePreset, label: 'Karaoke Word Highlighting', desc: 'Progressive word fill' },
                  { id: 'subtle_box' as CaptionStylePreset, label: 'High-Contrast Box', desc: 'Dark solid backdrop' },
                ] as const
              ).map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onChangeRules({ ...rules, captionPreset: preset.id })}
                  className={`p-2.5 rounded border text-left transition-colors ${
                    rules.captionPreset === preset.id
                      ? 'bg-[#20242A] border-[#B6F36B] text-[#E7E9EC]'
                      : 'bg-[#14171A] border-[#292E34] text-[#9299A3] hover:border-[#383F47]'
                  }`}
                >
                  <div className="font-medium">{preset.label}</div>
                  <div className="text-[10px] text-[#626871] mt-0.5">{preset.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="mt-8 pt-5 border-t border-[#292E34] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-xs text-[#9299A3]">
          Active Master: <span className="text-[#E7E9EC] font-medium">{activeVideo?.title || 'None'}</span>
        </div>

        <button
          onClick={onRunAnalysis}
          disabled={isAnalyzing || !activeVideo}
          className={`h-9 px-5 text-xs font-semibold rounded transition-colors flex items-center gap-2 ${
            isAnalyzing
              ? 'bg-[#20242A] text-[#9299A3] cursor-not-allowed border border-[#292E34]'
              : 'text-[#111315] bg-[#B6F36B] hover:bg-[#A5E456]'
          }`}
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>{isAnalyzing ? 'Executing Heuristic Engine...' : 'Run Highlight Detection'}</span>
        </button>
      </div>
    </div>
  );
};
