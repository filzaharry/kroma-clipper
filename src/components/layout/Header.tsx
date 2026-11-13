import React from 'react';
import { VideoSource } from '../../types';
import { WorkspaceViewId } from '../../design-system/tokens';
import { Scissors, Play, Download, Film } from 'lucide-react';

interface HeaderProps {
  currentView: WorkspaceViewId;
  onSelectView: (view: WorkspaceViewId) => void;
  activeVideo: VideoSource | null;
  candidatesCount: number;
  onRunAnalysis: () => void;
  isAnalyzing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onSelectView,
  activeVideo,
  candidatesCount,
  onRunAnalysis,
  isAnalyzing,
}) => {
  return (
    <header className="h-14 border-b border-[#292E34] bg-[#111315] px-5 flex items-center justify-between gap-8 select-none shrink-0 z-20">
      {/* Zone 1: Single-element Brand Wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={() => onSelectView('library')}
          className="flex items-center gap-2.5 text-left group focus-visible:outline-none"
        >
          <div className="w-7 h-7 rounded bg-[#20242A] border border-[#292E34] flex items-center justify-center text-[#B6F36B] group-hover:border-[#B6F36B]/50 transition-colors">
            <Scissors className="w-4 h-4 stroke-[2.2]" />
          </div>
          <span className="text-sm font-semibold tracking-tight text-[#E7E9EC] whitespace-nowrap">
            Kroma Clip
          </span>
        </button>

        {activeVideo && (
          <div className="hidden lg:flex items-center gap-2 text-xs text-[#9299A3] pl-3 border-l border-[#292E34]">
            <Film className="w-3.5 h-3.5 text-[#626871]" />
            <span className="truncate max-w-[220px] text-[#E7E9EC] font-medium">
              {activeVideo.title}
            </span>
          </div>
        )}
      </div>

      {/* Center Zone: Active Workspace Stage Breadcrumb */}
      <div className="hidden md:flex items-center gap-2 text-xs text-[#9299A3]">
        <span className="text-[#626871]">Workspace</span>
        <span className="text-[#626871]">/</span>
        <span className="text-[#E7E9EC] font-medium">
          {currentView === 'library' && '1. Media Ingest'}
          {currentView === 'rules' && '2. Clipping Rules'}
          {currentView === 'analysis' && '3. Heuristic Engine'}
          {currentView === 'candidates' && `4. Clip Candidates (${candidatesCount})`}
          {currentView === 'editor' && '5. Clip Editor (NLE)'}
          {currentView === 'export' && '6. Render Queue'}
          {currentView === 'publish' && '7. Social Schedule'}
        </span>
      </div>

      {/* Zone 3: Single Primary Action */}
      <div className="flex items-center gap-3 shrink-0">
        {currentView === 'editor' ? (
          <button
            onClick={() => onSelectView('export')}
            className="h-8 px-3.5 text-xs font-medium text-[#111315] bg-[#B6F36B] hover:bg-[#A5E456] rounded transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 focus-visible:outline-none"
          >
            <Download className="w-3.5 h-3.5 stroke-[2.2]" />
            Queue Render
          </button>
        ) : (
          <button
            onClick={onRunAnalysis}
            disabled={isAnalyzing || !activeVideo}
            className={`h-8 px-3.5 text-xs font-medium rounded transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 focus-visible:outline-none ${
              isAnalyzing
                ? 'bg-[#20242A] text-[#9299A3] cursor-not-allowed border border-[#292E34]'
                : 'text-[#111315] bg-[#B6F36B] hover:bg-[#A5E456]'
            }`}
          >
            <Play className={`w-3.5 h-3.5 fill-current ${isAnalyzing ? 'animate-pulse' : ''}`} />
            {isAnalyzing ? 'Analyzing Audio & Hooks...' : 'Process Video Rules'}
          </button>
        )}
      </div>
    </header>
  );
};
