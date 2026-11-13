import React from 'react';
import { WorkspaceViewId } from '../../design-system/tokens';
import { VideoSource } from '../../types';
import { formatDuration } from '../../utils/clippingRules';
import {
  Film,
  SlidersHorizontal,
  Cpu,
  Layers,
  Scissors,
  Download,
  Calendar,
  Activity,
  HardDrive,
  FileVideo,
} from 'lucide-react';

interface SidebarProps {
  currentView: WorkspaceViewId;
  onSelectView: (view: WorkspaceViewId) => void;
  activeVideo: VideoSource | null;
  candidatesCount: number;
  renderQueueCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  activeVideo,
  candidatesCount,
  renderQueueCount,
}) => {
  const navItems = [
    { id: 'library' as WorkspaceViewId, label: '1. Media Ingest', icon: Film, count: null },
    { id: 'rules' as WorkspaceViewId, label: '2. Rule Config', icon: SlidersHorizontal, count: null },
    { id: 'analysis' as WorkspaceViewId, label: '3. Heuristic Engine', icon: Cpu, count: null },
    { id: 'candidates' as WorkspaceViewId, label: '4. Clip Candidates', icon: Layers, count: candidatesCount || null },
    { id: 'editor' as WorkspaceViewId, label: '5. Clip Editor (NLE)', icon: Scissors, count: null },
    { id: 'export' as WorkspaceViewId, label: '6. Render Queue', icon: Download, count: renderQueueCount || null },
    { id: 'publish' as WorkspaceViewId, label: '7. Social Schedule', icon: Calendar, count: null },
  ];

  return (
    <aside className="w-64 border-r border-[#292E34] bg-[#14171A] flex flex-col justify-between shrink-0 select-none">
      {/* Navigation Workflow List */}
      <div className="p-3 space-y-1">
        <div className="px-3 pt-2 pb-2 text-[11px] font-semibold text-[#626871] uppercase tracking-wider">
          Production Pipeline
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectView(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded text-xs font-medium transition-colors focus-visible:outline-none ${
                isActive
                  ? 'bg-[#20242A] text-[#B6F36B] border border-[#292E34]'
                  : 'text-[#9299A3] hover:text-[#E7E9EC] hover:bg-[#191C20] border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#B6F36B]' : 'text-[#626871]'}`} />
                <span className="truncate">{item.label}</span>
              </div>
              {item.count !== null && (
                <span
                  className={`text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded ${
                    isActive ? 'bg-[#111315] text-[#B6F36B]' : 'bg-[#20242A] text-[#9299A3]'
                  }`}
                >
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active Source Inspector Card */}
      <div className="p-3 border-t border-[#292E34] bg-[#111315]">
        <div className="text-[11px] font-semibold text-[#626871] uppercase tracking-wider mb-2 flex items-center justify-between">
          <span>Active Master File</span>
          <FileVideo className="w-3.5 h-3.5 text-[#626871]" />
        </div>
        {activeVideo ? (
          <div className="space-y-2">
            <div className="text-xs font-medium text-[#E7E9EC] truncate" title={activeVideo.title}>
              {activeVideo.title}
            </div>

            <div className="grid grid-cols-2 gap-1.5 text-[11px] text-[#9299A3]">
              <div className="bg-[#191C20] px-2 py-1.5 rounded border border-[#292E34]">
                <div className="text-[10px] text-[#626871]">Duration</div>
                <div className="font-mono tabular-nums text-[#E7E9EC] font-medium">
                  {formatDuration(activeVideo.durationSeconds)}
                </div>
              </div>

              <div className="bg-[#191C20] px-2 py-1.5 rounded border border-[#292E34]">
                <div className="text-[10px] text-[#626871]">Resolution</div>
                <div className="font-mono tabular-nums text-[#E7E9EC] font-medium">
                  {activeVideo.resolution.width}x{activeVideo.resolution.height}
                </div>
              </div>

              <div className="bg-[#191C20] px-2 py-1.5 rounded border border-[#292E34]">
                <div className="text-[10px] text-[#626871]">Framerate</div>
                <div className="font-mono tabular-nums text-[#E7E9EC] font-medium">
                  {activeVideo.fps} fps
                </div>
              </div>

              <div className="bg-[#191C20] px-2 py-1.5 rounded border border-[#292E34]">
                <div className="text-[10px] text-[#626871]">Audio Ch.</div>
                <div className="font-mono tabular-nums text-[#E7E9EC] font-medium">
                  {activeVideo.audioChannels} ch (48kHz)
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 text-[11px] text-[#626871]">
              <div className="flex items-center gap-1">
                <HardDrive className="w-3 h-3" />
                <span>{(activeVideo.fileSizeBytes / (1024 * 1024 * 1024)).toFixed(1)} GB</span>
              </div>
              <div className="flex items-center gap-1 text-[#B6F36B]">
                <Activity className="w-3 h-3" />
                <span>Analyzed</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-xs text-[#626871] py-3 text-center">
            No master video selected
          </div>
        )}
      </div>
    </aside>
  );
};
