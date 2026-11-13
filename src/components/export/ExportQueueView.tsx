import React, { useState } from 'react';
import { RenderTask, ClipCandidate } from '../../types';
import {
  Download,
  CheckCircle2,
  Clock,
  HardDrive,
  MonitorPlay,
  Play,
  FileCheck,
  RefreshCw,
} from 'lucide-react';

interface ExportQueueViewProps {
  tasks: RenderTask[];
  onStartRender: (config: Partial<RenderTask>) => void;
  activeClip: ClipCandidate | null;
}

export const ExportQueueView: React.FC<ExportQueueViewProps> = ({
  tasks,
  onStartRender,
  activeClip,
}) => {
  const [resolution, setResolution] = useState<'1080x1920' | '2160x3840' | '1080x1080'>('1080x1920');
  const [format, setFormat] = useState<'mp4' | 'mov' | 'prores'>('mp4');
  const [fps, setFps] = useState<number>(60);
  const [bitrate, setBitrate] = useState<number>(18);
  const [subtitles, setSubtitles] = useState<'burned' | 'separate_srt' | 'none'>('burned');
  const [isSimulatingRender, setIsSimulatingRender] = useState<boolean>(false);

  const handleQueueRender = () => {
    if (!activeClip) return;
    setIsSimulatingRender(true);
    const newTask: Partial<RenderTask> = {
      clipId: activeClip.id,
      clipTitle: activeClip.title,
      aspectRatio: activeClip.aspectRatio,
      resolution,
      framerate: fps,
      bitrateMbps: bitrate,
      format,
      includeSubtitles: subtitles,
      progress: 0,
      status: 'queued',
      fileSizeBytes: Math.round(activeClip.duration * bitrate * 125000), // approx bytes
      createdAt: new Date().toISOString(),
    };
    onStartRender(newTask);

    setTimeout(() => {
      setIsSimulatingRender(false);
    }, 600);
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-[#111315] p-6 lg:p-8">
      {/* Title */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[#E7E9EC] tracking-tight">
            6. Export & Render Engine Queue
          </h1>
          <p className="text-xs text-[#9299A3] mt-1">
            Encode highlight clips with hardware-accelerated H.264 / ProRes, burned kinetic typography, and audio leveling.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Render Preset Settings Form */}
        <div className="lg:col-span-1 p-5 rounded-lg bg-[#191C20] border border-[#292E34] space-y-4">
          <div className="flex items-center justify-between border-b border-[#292E34] pb-3">
            <span className="text-sm font-semibold text-[#E7E9EC]">Render Settings</span>
            <span className="text-xs text-[#B6F36B] font-mono">
              {activeClip ? activeClip.title.slice(0, 22) + '...' : 'Select a clip'}
            </span>
          </div>

          {/* Resolution */}
          <div>
            <label className="text-[11px] font-semibold text-[#626871] uppercase tracking-wider block mb-1.5">
              Export Resolution
            </label>
            <div className="grid grid-cols-1 gap-1.5 text-xs">
              {[
                { id: '1080x1920', label: '1080 x 1920 (FHD Vertical)', desc: 'TikTok & Shorts standard' },
                { id: '2160x3840', label: '2160 x 3840 (4K UHD Vertical)', desc: 'Maximum fidelity master' },
                { id: '1080x1080', label: '1080 x 1080 (Square 1:1)', desc: 'Feed & LinkedIn square' },
              ].map((res) => (
                <button
                  key={res.id}
                  onClick={() => setResolution(res.id as any)}
                  className={`p-2 rounded border text-left transition-colors ${
                    resolution === res.id
                      ? 'bg-[#20242A] border-[#B6F36B] text-[#E7E9EC]'
                      : 'bg-[#14171A] border-[#292E34] text-[#9299A3] hover:border-[#383F47]'
                  }`}
                >
                  <div className="font-medium">{res.label}</div>
                  <div className="text-[10px] text-[#626871]">{res.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Codec / Container */}
          <div>
            <label className="text-[11px] font-semibold text-[#626871] uppercase tracking-wider block mb-1.5">
              Codec Container
            </label>
            <div className="grid grid-cols-3 gap-2 text-xs font-mono">
              {[
                { id: 'mp4', label: 'H.264 MP4' },
                { id: 'mov', label: 'H.265 MOV' },
                { id: 'prores', label: 'ProRes 422' },
              ].map((fmt) => (
                <button
                  key={fmt.id}
                  onClick={() => setFormat(fmt.id as any)}
                  className={`py-2 rounded border text-center transition-colors ${
                    format === fmt.id
                      ? 'bg-[#20242A] border-[#B6F36B] text-[#B6F36B]'
                      : 'bg-[#14171A] border-[#292E34] text-[#9299A3] hover:border-[#383F47]'
                  }`}
                >
                  {fmt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Subtitle Delivery */}
          <div>
            <label className="text-[11px] font-semibold text-[#626871] uppercase tracking-wider block mb-1.5">
              Subtitle Delivery
            </label>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {[
                { id: 'burned', label: 'Burned-In' },
                { id: 'separate_srt', label: 'SRT Sidecar' },
                { id: 'none', label: 'No Subs' },
              ].map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => setSubtitles(sub.id as any)}
                  className={`py-1.5 rounded border text-center transition-colors ${
                    subtitles === sub.id
                      ? 'bg-[#20242A] border-[#B6F36B] text-[#E7E9EC]'
                      : 'bg-[#14171A] border-[#292E34] text-[#9299A3] hover:border-[#383F47]'
                  }`}
                >
                  {sub.label}
                </button>
              ))}
            </div>
          </div>

          {/* Framerate & Bitrate */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-[10px] text-[#626871] block mb-1">Framerate</label>
              <select
                value={fps}
                onChange={(e) => setFps(parseInt(e.target.value))}
                className="w-full h-8 px-2 bg-[#14171A] border border-[#292E34] rounded text-[#E7E9EC] font-mono focus:outline-none"
              >
                <option value={60}>60 FPS (Smooth)</option>
                <option value={30}>30 FPS (Standard)</option>
                <option value={24}>24 FPS (Cinematic)</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] text-[#626871] block mb-1">Target Bitrate</label>
              <select
                value={bitrate}
                onChange={(e) => setBitrate(parseInt(e.target.value))}
                className="w-full h-8 px-2 bg-[#14171A] border border-[#292E34] rounded text-[#E7E9EC] font-mono focus:outline-none"
              >
                <option value={14}>14 Mbps (Balanced)</option>
                <option value={18}>18 Mbps (High)</option>
                <option value={30}>30 Mbps (Master)</option>
              </select>
            </div>
          </div>

          {/* Render CTA */}
          <button
            onClick={handleQueueRender}
            disabled={!activeClip || isSimulatingRender}
            className={`w-full h-9 rounded text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
              !activeClip
                ? 'bg-[#20242A] text-[#626871] cursor-not-allowed'
                : 'bg-[#B6F36B] hover:bg-[#A5E456] text-[#111315]'
            }`}
          >
            <Download className="w-3.5 h-3.5 stroke-[2.2]" />
            <span>{isSimulatingRender ? 'Submitting to GPU cluster...' : 'Add Clip to Render Queue'}</span>
          </button>
        </div>

        {/* Render Queue Table */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between text-xs font-medium text-[#9299A3] px-1">
            <span>Render Jobs ({tasks.length})</span>
            <span className="font-mono text-[#626871]">Engine: Local WebGPU / FFmpeg WASM</span>
          </div>

          <div className="space-y-3">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="p-4 rounded-lg bg-[#191C20] border border-[#292E34] space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-[#E7E9EC]">
                      {task.clipTitle}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[#9299A3] mt-1 font-mono">
                      <span>{task.resolution}</span>
                      <span>·</span>
                      <span>{task.framerate}fps</span>
                      <span>·</span>
                      <span className="uppercase">{task.format}</span>
                      <span>·</span>
                      <span>{(task.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    {task.status === 'completed' ? (
                      <button
                        onClick={() => alert(`Downloading ${task.clipTitle}.${task.format}`)}
                        className="h-8 px-3 text-xs font-semibold text-[#111315] bg-[#B6F36B] hover:bg-[#A5E456] rounded transition-colors flex items-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download MP4</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs text-[#B6F36B] font-mono">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Rendering {task.progress}%</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1.5 bg-[#20242A] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#B6F36B] transition-all duration-300"
                    style={{ width: `${task.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
