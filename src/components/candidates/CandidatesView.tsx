import React, { useState } from 'react';
import { ClipCandidate, AspectRatio } from '../../types';
import { formatTimecode } from '../../utils/clippingRules';
import {
  Scissors,
  Download,
  Check,
  X,
  Play,
  Volume2,
  Sparkles,
  Smartphone,
  Square,
  Search,
  Filter,
} from 'lucide-react';

interface CandidatesViewProps {
  candidates: ClipCandidate[];
  onOpenEditor: (clip: ClipCandidate) => void;
  onApproveClip: (clipId: string) => void;
  onRejectClip: (clipId: string) => void;
  onQueueRender: (clip: ClipCandidate) => void;
}

export const CandidatesView: React.FC<CandidatesViewProps> = ({
  candidates,
  onOpenEditor,
  onApproveClip,
  onRejectClip,
  onQueueRender,
}) => {
  const [filterRatio, setFilterRatio] = useState<string>('all');
  const [minScoreFilter, setMinScoreFilter] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [previewClip, setPreviewClip] = useState<ClipCandidate | null>(null);

  const filteredCandidates = candidates.filter((clip) => {
    if (filterRatio !== 'all' && clip.aspectRatio !== filterRatio) return false;
    if (clip.score < minScoreFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = clip.title.toLowerCase().includes(q);
      const matchQuote = clip.excerptQuote.toLowerCase().includes(q);
      const matchSpeaker = clip.speaker.toLowerCase().includes(q);
      if (!matchTitle && !matchQuote && !matchSpeaker) return false;
    }
    return true;
  });

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-[#111315] p-6 lg:p-8">
      {/* Title & Filter Bar */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[#E7E9EC] tracking-tight">
            4. Review Clip Candidates ({candidates.length})
          </h1>
          <p className="text-xs text-[#9299A3] mt-1">
            Algorithmically scored clips based on opening hook potency, vocal dynamics, and thematic pacing.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#626871] absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search quotes, topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 pr-3 text-xs bg-[#191C20] border border-[#292E34] rounded text-[#E7E9EC] placeholder-[#626871] focus:border-[#B6F36B] focus:outline-none w-48"
            />
          </div>

          {/* Aspect Ratio Filter Tabs */}
          <div className="flex items-center p-0.5 bg-[#191C20] rounded border border-[#292E34]">
            <button
              onClick={() => setFilterRatio('all')}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                filterRatio === 'all'
                  ? 'bg-[#20242A] text-[#B6F36B]'
                  : 'text-[#9299A3] hover:text-[#E7E9EC]'
              }`}
            >
              All Ratios
            </button>
            <button
              onClick={() => setFilterRatio('9:16')}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                filterRatio === '9:16'
                  ? 'bg-[#20242A] text-[#B6F36B]'
                  : 'text-[#9299A3] hover:text-[#E7E9EC]'
              }`}
            >
              9:16 Shorts
            </button>
            <button
              onClick={() => setFilterRatio('1:1')}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                filterRatio === '1:1'
                  ? 'bg-[#20242A] text-[#B6F36B]'
                  : 'text-[#9299A3] hover:text-[#E7E9EC]'
              }`}
            >
              1:1 Feed
            </button>
          </div>

          {/* High Score Toggle */}
          <button
            onClick={() => setMinScoreFilter(minScoreFilter === 90 ? 0 : 90)}
            className={`h-8 px-2.5 text-xs font-medium rounded border transition-colors flex items-center gap-1.5 ${
              minScoreFilter === 90
                ? 'bg-[#20242A] border-[#B6F36B] text-[#B6F36B]'
                : 'bg-[#191C20] border-[#292E34] text-[#9299A3] hover:border-[#383F47]'
            }`}
          >
            <Filter className="w-3 h-3" />
            <span>Score 90+ Only</span>
          </button>
        </div>
      </div>

      {/* Candidate Grid */}
      {filteredCandidates.length === 0 ? (
        <div className="p-12 text-center bg-[#191C20] border border-[#292E34] rounded-lg">
          <p className="text-sm text-[#E7E9EC] font-medium">No clip candidates match this filter.</p>
          <p className="text-xs text-[#9299A3] mt-1">Try lowering the score cutoff or resetting search criteria.</p>
          <button
            onClick={() => {
              setFilterRatio('all');
              setMinScoreFilter(0);
              setSearchQuery('');
            }}
            className="mt-4 px-3 py-1.5 text-xs font-medium text-[#111315] bg-[#B6F36B] rounded"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {filteredCandidates.map((clip) => {
            const isApproved = clip.status === 'approved';
            const isRejected = clip.status === 'rejected';

            return (
              <div
                key={clip.id}
                className={`p-5 rounded-lg border transition-all ${
                  isApproved
                    ? 'bg-[#191C20] border-[#B6F36B]/50'
                    : isRejected
                    ? 'bg-[#191C20] border-[#292E34] opacity-50'
                    : 'bg-[#191C20] border-[#292E34] hover:border-[#383F47]'
                }`}
              >
                {/* Header: Title & Viral Score */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[#E7E9EC] tracking-tight">
                        {clip.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-[#9299A3] mt-1">
                      <span>{clip.speaker}</span>
                      <span>·</span>
                      <span className="font-mono tabular-nums text-[#E7E9EC]">
                        {formatTimecode(clip.startTime, false)} – {formatTimecode(clip.endTime, false)}
                      </span>
                      <span>·</span>
                      <span className="font-mono tabular-nums text-[#B6F36B]">
                        {clip.duration}s duration
                      </span>
                    </div>
                  </div>

                  {/* Viral Score Badge */}
                  <div className="flex flex-col items-end shrink-0">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#20242A] border border-[#292E34]">
                      <span className="text-[10px] text-[#626871] uppercase font-mono">Score</span>
                      <span className="text-sm font-mono tabular-nums font-bold text-[#B6F36B]">
                        {clip.score}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Excerpt Quote */}
                <div className="p-3 rounded bg-[#111315] border border-[#292E34] text-xs text-[#E7E9EC] leading-relaxed mb-4 italic">
                  {clip.excerptQuote}
                </div>

                {/* Heuristic Metrics Bar */}
                <div className="grid grid-cols-3 gap-2 mb-4 text-[11px]">
                  <div className="p-2 rounded bg-[#14171A] border border-[#292E34] flex items-center justify-between">
                    <span className="text-[#626871] flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-[#B6F36B]" />
                      Hook
                    </span>
                    <span className="font-mono tabular-nums text-[#E7E9EC] font-medium">
                      {clip.hookScore}%
                    </span>
                  </div>

                  <div className="p-2 rounded bg-[#14171A] border border-[#292E34] flex items-center justify-between">
                    <span className="text-[#626871] flex items-center gap-1">
                      <Volume2 className="w-3 h-3 text-[#B6F36B]" />
                      Energy
                    </span>
                    <span className="font-mono tabular-nums text-[#E7E9EC] font-medium">
                      {clip.energyScore}%
                    </span>
                  </div>

                  <div className="p-2 rounded bg-[#14171A] border border-[#292E34] flex items-center justify-between">
                    <span className="text-[#626871] flex items-center gap-1">
                      {clip.aspectRatio === '9:16' ? (
                        <Smartphone className="w-3 h-3 text-[#B6F36B]" />
                      ) : (
                        <Square className="w-3 h-3 text-[#B6F36B]" />
                      )}
                      Aspect
                    </span>
                    <span className="font-mono tabular-nums text-[#E7E9EC] font-medium">
                      {clip.aspectRatio}
                    </span>
                  </div>
                </div>

                {/* Tags and Action Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[#292E34]">
                  {/* Clean unboxed tags */}
                  <div className="flex items-center gap-2 text-xs text-[#626871]">
                    {clip.tags.map((tag, idx) => (
                      <React.Fragment key={tag}>
                        <span>{tag}</span>
                        {idx < clip.tags.length - 1 && <span>·</span>}
                      </React.Fragment>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onApproveClip(clip.id)}
                      title="Approve clip"
                      className={`h-8 px-2.5 rounded border transition-colors flex items-center gap-1 text-xs ${
                        isApproved
                          ? 'bg-[#B6F36B]/10 text-[#B6F36B] border-[#B6F36B]/40'
                          : 'bg-[#20242A] text-[#9299A3] border-[#292E34] hover:text-[#E7E9EC]'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{isApproved ? 'Approved' : 'Approve'}</span>
                    </button>

                    <button
                      onClick={() => onQueueRender(clip)}
                      title="Queue export render"
                      className="h-8 px-2.5 rounded bg-[#20242A] hover:bg-[#262B32] text-[#9299A3] hover:text-[#E7E9EC] border border-[#292E34] text-xs flex items-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Render</span>
                    </button>

                    <button
                      onClick={() => onOpenEditor(clip)}
                      className="h-8 px-3.5 rounded bg-[#B6F36B] hover:bg-[#A5E456] text-[#111315] font-semibold text-xs flex items-center gap-1.5 transition-colors focus-visible:outline-none"
                    >
                      <Scissors className="w-3.5 h-3.5 stroke-[2.2]" />
                      <span>Open in Editor</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
