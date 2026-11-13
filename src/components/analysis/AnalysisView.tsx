import React from 'react';
import { VideoSource, ClippingRuleConfig } from '../../types';
import { formatTimecode } from '../../utils/clippingRules';
import { Cpu, CheckCircle2, ArrowRight, Activity, Volume2, Sparkles, UserCheck, Layers } from 'lucide-react';

interface AnalysisViewProps {
  activeVideo: VideoSource | null;
  rules: ClippingRuleConfig;
  isAnalyzing: boolean;
  analysisProgress: number;
  onReviewCandidates: () => void;
  detectedClipsCount: number;
}

export const AnalysisView: React.FC<AnalysisViewProps> = ({
  activeVideo,
  rules,
  isAnalyzing,
  analysisProgress,
  onReviewCandidates,
  detectedClipsCount,
}) => {
  const steps = [
    {
      title: 'Speech & Audio Stem Extraction',
      desc: 'Filtering 48kHz audio track for vocal frequencies and amplitude dynamics',
      icon: Volume2,
      doneThreshold: 20,
    },
    {
      title: 'Speaker Diarization & Turn Cadence',
      desc: rules.detectSpeakerSwitches ? 'Separating speakers and calculating pause intervals' : 'Single speaker cadence pass',
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
  ];

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-[#111315] p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[#E7E9EC] tracking-tight">
            3. Rule-Based Heuristic Analysis Engine
          </h1>
          <p className="text-xs text-[#9299A3] mt-1">
            Analyzing video stems against configured duration bounds ({rules.minDuration}s – {rules.maxDuration}s) and vocal energy thresholds.
          </p>
        </div>

        {detectedClipsCount > 0 && !isAnalyzing && (
          <button
            onClick={onReviewCandidates}
            className="h-9 px-4 text-xs font-medium text-[#111315] bg-[#B6F36B] hover:bg-[#A5E456] rounded transition-colors flex items-center gap-2 self-start md:self-auto focus-visible:outline-none shrink-0"
          >
            <span>Review {detectedClipsCount} Candidates</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Main Analysis Container */}
      <div className="max-w-4xl space-y-6">
        {/* Progress Card */}
        <div className="p-6 rounded-lg bg-[#191C20] border border-[#292E34] space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded bg-[#20242A] border border-[#292E34] flex items-center justify-center text-[#B6F36B]">
                <Cpu className={`w-5 h-5 ${isAnalyzing ? 'animate-spin' : ''}`} />
              </div>
              <div>
                <div className="text-sm font-semibold text-[#E7E9EC]">
                  {isAnalyzing ? 'Processing Heuristic Rules' : 'Analysis Pass Completed'}
                </div>
                <div className="text-xs text-[#9299A3]">
                  {activeVideo?.title || 'No file selected'}
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-lg font-mono tabular-nums font-semibold text-[#B6F36B]">
                {analysisProgress}%
              </div>
              <div className="text-[10px] text-[#626871] font-mono">
                {isAnalyzing ? 'STATUS: ACTIVE' : 'PASS COMPLETED'}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2 bg-[#20242A] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#B6F36B] transition-all duration-300"
              style={{ width: `${analysisProgress}%` }}
            />
          </div>

          {/* Pipeline Steps */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            {steps.map((st, i) => {
              const isDone = analysisProgress >= st.doneThreshold;
              const isCurrent = analysisProgress < st.doneThreshold && (i === 0 || analysisProgress >= steps[i - 1].doneThreshold);
              const StepIcon = st.icon;

              return (
                <div
                  key={st.title}
                  className={`p-3.5 rounded border transition-colors ${
                    isDone
                      ? 'bg-[#20242A]/60 border-[#292E34]'
                      : isCurrent
                      ? 'bg-[#191C20] border-[#B6F36B]/50'
                      : 'bg-[#14171A] border-[#292E34]/50 opacity-60'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-7 h-7 rounded flex items-center justify-center shrink-0 mt-0.5 ${
                        isDone
                          ? 'bg-[#B6F36B]/10 text-[#B6F36B]'
                          : isCurrent
                          ? 'bg-[#20242A] text-[#B6F36B]'
                          : 'bg-[#20242A] text-[#626871]'
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <StepIcon className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-[#E7E9EC]">{st.title}</div>
                      <div className="text-[11px] text-[#9299A3] mt-0.5 leading-relaxed">{st.desc}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Real-time Discovery Log / Inspection */}
        <div className="p-5 rounded-lg bg-[#191C20] border border-[#292E34] space-y-3">
          <div className="flex items-center justify-between text-xs font-medium text-[#9299A3]">
            <div className="flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-[#B6F36B]" />
              <span>Engine Event Log</span>
            </div>
            <span className="font-mono text-[#626871]">{detectedClipsCount} candidates identified</span>
          </div>

          <div className="bg-[#111315] p-3 rounded border border-[#292E34] font-mono text-[11px] text-[#9299A3] space-y-1.5 h-44 overflow-y-auto">
            <div className="text-[#626871]">[00:00:00] Ingesting master PCM audio channel 1 & 2...</div>
            <div className="text-[#626871]">[00:00:02] Audio RMS power peak detected @ 02:22 - 03:09 (+14.2dB)</div>
            <div className="text-[#E7E9EC]">
              [00:00:04] Hook Trigger: &quot;Why do most modern architectures fail...&quot; (HookScore: 98)
            </div>
            <div className="text-[#B6F36B]">
              [00:00:05] Highlight Candidate 01 Registered: 47.0s [142.0s - 189.0s] - Score: 96/100
            </div>
            <div className="text-[#E7E9EC]">
              [00:00:06] Hook Trigger: &quot;Physics does not have a stack trace...&quot; (HookScore: 95)
            </div>
            <div className="text-[#B6F36B]">
              [00:00:07] Highlight Candidate 02 Registered: 38.0s [310.0s - 348.0s] - Score: 93/100
            </div>
            <div className="text-[#626871]">[00:00:08] Applying 9:16 safe area boundaries & subtitle word timestamps...</div>
            <div className="text-[#B6F36B]">[00:00:09] Engine execution complete. Candidates ready for editorial review.</div>
          </div>
        </div>
      </div>
    </div>
  );
};
