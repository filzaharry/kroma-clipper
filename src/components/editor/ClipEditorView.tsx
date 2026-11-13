import React, { useState, useEffect, useRef } from 'react';
import { ClipCandidate, AspectRatio, FramingMode, CaptionStylePreset } from '../../types';
import { formatTimecode } from '../../utils/clippingRules';
import {
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  Smartphone,
  Square,
  Maximize2,
  Sliders,
  Type,
  AlignLeft,
  Download,
  Calendar,
  Grid,
  ShieldAlert,
  Volume2,
  VolumeX,
  Maximize,
  Sparkles,
  Scissors,
} from 'lucide-react';

interface ClipEditorViewProps {
  clip: ClipCandidate;
  onUpdateClip: (updated: ClipCandidate) => void;
  onExportClip: (clip: ClipCandidate) => void;
  onScheduleClip: (clip: ClipCandidate) => void;
  onBackToCandidates: () => void;
}

export const ClipEditorView: React.FC<ClipEditorViewProps> = ({
  clip,
  onUpdateClip,
  onExportClip,
  onScheduleClip,
  onBackToCandidates,
}) => {
  // Timeline playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(clip.startTime);
  const [showSafeZones, setShowSafeZones] = useState<boolean>(true);
  const [showGrid, setShowGrid] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'framing' | 'captions' | 'transcript'>('captions');
  const [highlightColor, setHighlightColor] = useState<string>('#B6F36B');

  // Animation frame loop for simulated video playback
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());

  useEffect(() => {
    // Reset playhead when clip changes
    setCurrentTime(clip.startTime);
    setIsPlaying(false);
  }, [clip.id]);

  useEffect(() => {
    if (isPlaying) {
      lastTimeRef.current = performance.now();
      const tick = (now: number) => {
        const delta = (now - lastTimeRef.current) / 1000;
        lastTimeRef.current = now;

        setCurrentTime((prev) => {
          const next = prev + delta;
          if (next >= clip.endTime) {
            // Loop back to start
            return clip.startTime;
          }
          return next;
        });

        animationFrameRef.current = requestAnimationFrame(tick);
      };
      animationFrameRef.current = requestAnimationFrame(tick);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, clip.startTime, clip.endTime]);

  // Keyboard shortcut for Spacebar play/pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const relativeSeconds = Math.max(0, currentTime - clip.startTime);
  const progressPercent = Math.min(100, (relativeSeconds / clip.duration) * 100);

  // Active caption segment based on currentTime
  const currentSegment = clip.captions.find(
    (c) => currentTime >= c.start && currentTime <= c.end
  ) || clip.captions[0];

  // Active word based on currentTime
  const currentWord = currentSegment?.words?.find(
    (w) => currentTime >= w.start && currentTime <= w.end
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-[#111315] select-none overflow-hidden">
      {/* Editor Top Navigation Bar */}
      <div className="h-11 border-b border-[#292E34] bg-[#14171A] px-4 flex items-center justify-between text-xs shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToCandidates}
            className="text-[#9299A3] hover:text-[#E7E9EC] transition-colors"
          >
            ← Candidates
          </button>
          <span className="text-[#626871]">/</span>
          <span className="font-semibold text-[#E7E9EC] truncate max-w-[280px]">
            {clip.title}
          </span>
          <span className="text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded bg-[#191C20] border border-[#292E34] text-[#B6F36B]">
            {clip.duration}s
          </span>
        </div>

        {/* Aspect Ratio & Safe Zone Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center p-0.5 bg-[#191C20] rounded border border-[#292E34]">
            <button
              onClick={() => onUpdateClip({ ...clip, aspectRatio: '9:16' })}
              title="9:16 Vertical"
              className={`px-2 py-1 rounded transition-colors flex items-center gap-1 ${
                clip.aspectRatio === '9:16'
                  ? 'bg-[#20242A] text-[#B6F36B]'
                  : 'text-[#9299A3] hover:text-[#E7E9EC]'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>9:16</span>
            </button>
            <button
              onClick={() => onUpdateClip({ ...clip, aspectRatio: '1:1' })}
              title="1:1 Square"
              className={`px-2 py-1 rounded transition-colors flex items-center gap-1 ${
                clip.aspectRatio === '1:1'
                  ? 'bg-[#20242A] text-[#B6F36B]'
                  : 'text-[#9299A3] hover:text-[#E7E9EC]'
              }`}
            >
              <Square className="w-3.5 h-3.5" />
              <span>1:1</span>
            </button>
            <button
              onClick={() => onUpdateClip({ ...clip, aspectRatio: '16:9' })}
              title="16:9 Landscape"
              className={`px-2 py-1 rounded transition-colors flex items-center gap-1 ${
                clip.aspectRatio === '16:9'
                  ? 'bg-[#20242A] text-[#B6F36B]'
                  : 'text-[#9299A3] hover:text-[#E7E9EC]'
              }`}
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>16:9</span>
            </button>
          </div>

          <button
            onClick={() => setShowSafeZones((s) => !s)}
            className={`h-7 px-2 rounded border text-[11px] font-medium flex items-center gap-1 transition-colors ${
              showSafeZones
                ? 'bg-[#20242A] border-[#B6F36B]/50 text-[#B6F36B]'
                : 'bg-[#191C20] border-[#292E34] text-[#9299A3] hover:border-[#383F47]'
            }`}
            title="Toggle TikTok / Reels UI overlays"
          >
            <ShieldAlert className="w-3 h-3" />
            <span>Safe Zones</span>
          </button>

          <button
            onClick={() => setShowGrid((g) => !g)}
            className={`h-7 px-2 rounded border text-[11px] font-medium flex items-center gap-1 transition-colors ${
              showGrid
                ? 'bg-[#20242A] border-[#B6F36B]/50 text-[#B6F36B]'
                : 'bg-[#191C20] border-[#292E34] text-[#9299A3] hover:border-[#383F47]'
            }`}
            title="Rule of thirds alignment grid"
          >
            <Grid className="w-3 h-3" />
          </button>
        </div>

        {/* Direct Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onScheduleClip(clip)}
            className="h-7 px-2.5 rounded bg-[#191C20] hover:bg-[#20242A] text-[#9299A3] hover:text-[#E7E9EC] border border-[#292E34] transition-colors flex items-center gap-1.5"
          >
            <Calendar className="w-3 h-3" />
            <span>Schedule</span>
          </button>

          <button
            onClick={() => onExportClip(clip)}
            className="h-7 px-3 rounded bg-[#B6F36B] hover:bg-[#A5E456] text-[#111315] font-semibold transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3 h-3 stroke-[2.2]" />
            <span>Export Clip</span>
          </button>
        </div>
      </div>

      {/* Main Split: Stage (Center) + Inspector (Right) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Center Stage: Video Canvas */}
        <div className="flex-1 bg-[#0D0F11] flex flex-col items-center justify-center p-4 relative overflow-hidden">
          {/* Canvas Wrapper */}
          <div
            className={`relative rounded-lg overflow-hidden shadow-2xl border border-[#292E34] bg-[#16181B] transition-all flex items-center justify-center ${
              clip.aspectRatio === '9:16'
                ? 'h-[460px] w-[258px]'
                : clip.aspectRatio === '1:1'
                ? 'h-[420px] w-[420px]'
                : 'h-[320px] w-[568px]'
            }`}
          >
            {/* Simulated Video Frame with Dynamic Pan & Zoom */}
            <div
              className="absolute inset-0 bg-gradient-to-b from-[#1C2026] via-[#16191E] to-[#121418] flex items-center justify-center transition-transform duration-75 overflow-hidden"
              style={{
                transform: `translateX(${clip.panOffset}%) scale(${clip.zoomLevel})`,
              }}
            >
              {/* Speaker Silhouette / Studio Light Backdrop */}
              <div className="relative w-full h-full flex flex-col items-center justify-center">
                <div className="w-24 h-24 rounded-full bg-[#20242A] border border-[#292E34] flex items-center justify-center text-[#B6F36B]/60 shadow-inner">
                  <div className="w-14 h-14 rounded-full bg-[#292E34]/80 flex items-center justify-center">
                    <span className="text-xs font-mono text-[#E7E9EC] font-semibold">
                      {clip.speaker.split(' ').map((n) => n[0]).join('')}
                    </span>
                  </div>
                </div>

                <div className="mt-3 text-center">
                  <div className="text-xs font-semibold text-[#E7E9EC]">{clip.speaker}</div>
                  <div className="text-[10px] text-[#626871] font-mono">
                    PCM STEREO · {formatTimecode(currentTime, true)}
                  </div>
                </div>

                {/* Simulated Audio Visualizer Arc */}
                <div className="absolute bottom-6 flex items-end gap-1 opacity-60">
                  {[24, 45, 68, 85, 92, 70, 54, 38, 72, 88, 64, 35].map((h, i) => (
                    <div
                      key={i}
                      className="w-1 bg-[#B6F36B] rounded-t transition-all duration-75"
                      style={{
                        height: isPlaying ? `${Math.max(4, Math.round(h * Math.random()))}px` : '6px',
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Rule of Thirds Grid Overlay */}
            {showGrid && (
              <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 border border-[#B6F36B]/20">
                <div className="border-r border-b border-[#B6F36B]/20" />
                <div className="border-r border-b border-[#B6F36B]/20" />
                <div className="border-b border-[#B6F36B]/20" />
                <div className="border-r border-b border-[#B6F36B]/20" />
                <div className="border-r border-b border-[#B6F36B]/20" />
                <div className="border-b border-[#B6F36B]/20" />
                <div className="border-r border-[#B6F36B]/20" />
                <div className="border-r border-[#B6F36B]/20" />
                <div />
              </div>
            )}

            {/* Social Platform Safe Zone Guides (TikTok / Reels UI Overlay) */}
            {showSafeZones && clip.aspectRatio === '9:16' && (
              <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3">
                {/* Top header safe zone */}
                <div className="text-[9px] text-[#626871] font-mono border-b border-dashed border-[#626871]/40 pb-1">
                  Top Header Safe Zone (Reels / TikTok)
                </div>

                {/* Right side engagement buttons simulator */}
                <div className="absolute right-2.5 bottom-16 flex flex-col gap-3 items-center opacity-40">
                  <div className="w-6 h-6 rounded-full bg-white/20 border border-white/30" />
                  <div className="w-6 h-6 rounded-full bg-white/20 border border-white/30" />
                  <div className="w-6 h-6 rounded-full bg-white/20 border border-white/30" />
                  <div className="w-5 h-5 rounded-full bg-[#B6F36B]/40" />
                </div>

                {/* Bottom title & sound safe zone */}
                <div className="text-[9px] text-[#626871] font-mono border-t border-dashed border-[#626871]/40 pt-1">
                  Bottom Title & Audio Track Margin
                </div>
              </div>
            )}

            {/* Dynamic Real-Time Captions Overlay */}
            <div className="absolute bottom-16 inset-x-3 pointer-events-none text-center">
              {clip.captionPreset === 'hormozi' ? (
                <div className="inline-block px-2.5 py-1.5 font-bold tracking-tight text-xs sm:text-sm uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] max-w-full break-words">
                  {currentSegment?.words ? (
                    currentSegment.words.map((w, idx) => {
                      const isActive = currentTime >= w.start && currentTime <= w.end;
                      return (
                        <span
                          key={idx}
                          style={{ color: isActive ? highlightColor : '#FFFFFF' }}
                          className={`mr-1 transition-all ${
                            isActive
                              ? 'scale-110 inline-block font-extrabold'
                              : 'text-white'
                          }`}
                        >
                          {w.word}{' '}
                        </span>
                      );
                    })
                  ) : (
                    <span style={{ color: highlightColor }}>{currentSegment?.text}</span>
                  )}
                </div>
              ) : clip.captionPreset === 'minimal' ? (
                <div className="inline-block px-2.5 py-1 text-xs font-medium text-[#E7E9EC] bg-black/60 rounded backdrop-blur-sm max-w-[90%] break-words">
                  {currentSegment?.text}
                </div>
              ) : clip.captionPreset === 'karaoke' ? (
                <div className="inline-block px-3 py-1 text-xs sm:text-sm font-semibold tracking-wide max-w-full break-words">
                  {currentSegment?.words ? (
                    currentSegment.words.map((w, idx) => {
                      const isPast = currentTime >= w.end;
                      const isCurrent = currentTime >= w.start && currentTime <= w.end;
                      return (
                        <span
                          key={idx}
                          style={{ color: isCurrent ? highlightColor : isPast ? '#FFFFFF' : 'rgba(255,255,255,0.4)' }}
                          className={`mr-1 ${isCurrent ? 'underline' : ''}`}
                        >
                          {w.word}{' '}
                        </span>
                      );
                    })
                  ) : (
                    <span className="text-white">{currentSegment?.text}</span>
                  )}
                </div>
              ) : (
                /* Subtle Dark Box */
                <div className="inline-block px-3 py-1.5 text-xs font-semibold text-white bg-[#111315] border border-[#292E34] rounded max-w-[90%] break-words">
                  {currentSegment?.text}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Inspector Sidebar */}
        <div className="w-80 border-l border-[#292E34] bg-[#14171A] flex flex-col shrink-0">
          {/* Inspector Tabs */}
          <div className="flex border-b border-[#292E34] text-xs font-medium bg-[#111315]">
            <button
              onClick={() => setActiveTab('captions')}
              className={`flex-1 py-2.5 border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === 'captions'
                  ? 'border-[#B6F36B] text-[#B6F36B] bg-[#191C20]'
                  : 'border-transparent text-[#9299A3] hover:text-[#E7E9EC]'
              }`}
            >
              <Type className="w-3.5 h-3.5" />
              <span>Captions</span>
            </button>

            <button
              onClick={() => setActiveTab('framing')}
              className={`flex-1 py-2.5 border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === 'framing'
                  ? 'border-[#B6F36B] text-[#B6F36B] bg-[#191C20]'
                  : 'border-transparent text-[#9299A3] hover:text-[#E7E9EC]'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Framing</span>
            </button>

            <button
              onClick={() => setActiveTab('transcript')}
              className={`flex-1 py-2.5 border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === 'transcript'
                  ? 'border-[#B6F36B] text-[#B6F36B] bg-[#191C20]'
                  : 'border-transparent text-[#9299A3] hover:text-[#E7E9EC]'
              }`}
            >
              <AlignLeft className="w-3.5 h-3.5" />
              <span>Transcript</span>
            </button>
          </div>

          {/* Inspector Content Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
            {activeTab === 'captions' && (
              <div className="space-y-4">
                <div>
                  <label className="text-[11px] font-semibold text-[#626871] uppercase tracking-wider block mb-2">
                    Caption Style Preset
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        { id: 'hormozi' as CaptionStylePreset, label: 'Hormozi Pop' },
                        { id: 'minimal' as CaptionStylePreset, label: 'Minimal Clean' },
                        { id: 'karaoke' as CaptionStylePreset, label: 'Karaoke Active' },
                        { id: 'subtle_box' as CaptionStylePreset, label: 'Solid Box' },
                      ] as const
                    ).map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => onUpdateClip({ ...clip, captionPreset: preset.id })}
                        className={`p-2 rounded border text-left transition-colors ${
                          clip.captionPreset === preset.id
                            ? 'bg-[#20242A] border-[#B6F36B] text-[#E7E9EC]'
                            : 'bg-[#191C20] border-[#292E34] text-[#9299A3] hover:border-[#383F47]'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Subtitle Accent Color */}
                <div className="p-3 bg-[#191C20] border border-[#292E34] rounded space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[#9299A3]">Keyword Highlight Accent</span>
                    <span className="font-mono" style={{ color: highlightColor }}>{highlightColor}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {['#B6F36B', '#FACC15', '#38BDF8', '#F43F5E', '#FFFFFF'].map((color) => (
                      <button
                        key={color}
                        className={`w-6 h-6 rounded-full border shadow-sm transition-transform ${
                          highlightColor === color ? 'scale-125 ring-2 ring-[#E7E9EC] border-transparent' : 'border-black/40 hover:scale-110'
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => setHighlightColor(color)}
                        aria-label={`Select highlight color ${color}`}
                      />
                    ))}
                  </div>
                </div>

                {/* Hook Punch-in Zoom Keyframes */}
                <div className="p-3 bg-[#191C20] border border-[#292E34] rounded space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[#9299A3] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#B6F36B]" />
                      Dynamic Punch-in Zooms
                    </span>
                    <span className="font-mono text-xs text-[#B6F36B]">2 cuts active</span>
                  </div>
                  <p className="text-[11px] text-[#626871] leading-relaxed">
                    Auto-zooms 1.25x on speaker turns and punchlines for higher visual retention.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'framing' && (
              <div className="space-y-4">
                <div>
                  <label className="text-[11px] font-semibold text-[#626871] uppercase tracking-wider block mb-2">
                    Camera Pan Position (X-Axis)
                  </label>
                  <div className="flex items-center justify-between text-[#9299A3] mb-1">
                    <span>Center Offset</span>
                    <span className="font-mono tabular-nums text-[#B6F36B]">
                      {clip.panOffset}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-40"
                    max="40"
                    step="2"
                    value={clip.panOffset}
                    onChange={(e) =>
                      onUpdateClip({ ...clip, panOffset: parseInt(e.target.value) })
                    }
                    className="w-full accent-[#B6F36B] bg-[#292E34] h-1.5 rounded-lg cursor-pointer"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[#626871] uppercase tracking-wider block mb-2">
                    Crop Zoom Scale
                  </label>
                  <div className="flex items-center justify-between text-[#9299A3] mb-1">
                    <span>Scale Factor</span>
                    <span className="font-mono tabular-nums text-[#B6F36B]">
                      {clip.zoomLevel.toFixed(2)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="2.0"
                    step="0.05"
                    value={clip.zoomLevel}
                    onChange={(e) =>
                      onUpdateClip({ ...clip, zoomLevel: parseFloat(e.target.value) })
                    }
                    className="w-full accent-[#B6F36B] bg-[#292E34] h-1.5 rounded-lg cursor-pointer"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[#626871] uppercase tracking-wider block mb-2">
                    Tracking Algorithm
                  </label>
                  <div className="space-y-1.5">
                    {(
                      [
                        { id: 'face_track' as FramingMode, label: 'Face Tracking Follow (Auto)' },
                        { id: 'centered' as FramingMode, label: 'Fixed Geometric Center' },
                        { id: 'manual_pan' as FramingMode, label: 'Manual Keyframe Lock' },
                      ] as const
                    ).map((m) => (
                      <button
                        key={m.id}
                        onClick={() => onUpdateClip({ ...clip, framingMode: m.id })}
                        className={`w-full p-2 rounded border text-left transition-colors text-xs ${
                          clip.framingMode === m.id
                            ? 'bg-[#20242A] border-[#B6F36B] text-[#E7E9EC]'
                            : 'bg-[#191C20] border-[#292E34] text-[#9299A3] hover:border-[#383F47]'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'transcript' && (
              <div className="space-y-3">
                <div className="text-[11px] text-[#626871]">
                  Click any segment or word to seek playhead to that exact timestamp:
                </div>
                {clip.captions.map((seg) => {
                  const isActiveSeg = currentTime >= seg.start && currentTime <= seg.end;
                  return (
                    <div
                      key={seg.id}
                      onClick={() => setCurrentTime(seg.start)}
                      className={`p-2.5 rounded border transition-colors cursor-pointer ${
                        isActiveSeg
                          ? 'bg-[#20242A] border-[#B6F36B]/60 text-[#E7E9EC]'
                          : 'bg-[#191C20] border-[#292E34] text-[#9299A3] hover:text-[#E7E9EC]'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] font-mono mb-1 text-[#626871]">
                        <span>{seg.speaker || 'Speaker'}</span>
                        <span className="tabular-nums">
                          {formatTimecode(seg.start, false)} - {formatTimecode(seg.end, false)}
                        </span>
                      </div>
                      <div className="text-xs leading-relaxed">{seg.text}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Stage: Multi-Track Timeline & Transport Bar */}
      <div className="h-56 border-t border-[#292E34] bg-[#14171A] flex flex-col shrink-0 select-none">
        {/* Transport Toolbar */}
        <div className="h-10 border-b border-[#292E34] px-4 flex items-center justify-between bg-[#111315]">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentTime(clip.startTime)}
              className="w-7 h-7 rounded hover:bg-[#20242A] text-[#9299A3] hover:text-[#E7E9EC] flex items-center justify-center transition-colors"
              title="Return to In Point"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setCurrentTime((t) => Math.max(clip.startTime, t - 1 / 30))}
              className="px-1.5 h-7 rounded hover:bg-[#20242A] text-[10px] font-mono text-[#9299A3] hover:text-[#E7E9EC] flex items-center justify-center transition-colors"
              title="Step Backward 1 Frame"
            >
              -1f
            </button>

            <button
              onClick={() => setIsPlaying((p) => !p)}
              className="w-8 h-8 rounded bg-[#B6F36B] hover:bg-[#A5E456] text-[#111315] flex items-center justify-center transition-colors focus-visible:outline-none"
              title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>

            <button
              onClick={() => setCurrentTime((t) => Math.min(clip.endTime, t + 1 / 30))}
              className="px-1.5 h-7 rounded hover:bg-[#20242A] text-[10px] font-mono text-[#9299A3] hover:text-[#E7E9EC] flex items-center justify-center transition-colors"
              title="Step Forward 1 Frame"
            >
              +1f
            </button>

            <button
              onClick={() => setCurrentTime(clip.endTime)}
              className="w-7 h-7 rounded hover:bg-[#20242A] text-[#9299A3] hover:text-[#E7E9EC] flex items-center justify-center transition-colors"
              title="Jump to Out Point"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>

            {/* Timecode Readout */}
            <div className="ml-3 pl-3 border-l border-[#292E34] font-mono tabular-nums text-xs font-semibold text-[#B6F36B]">
              {formatTimecode(currentTime, true)}
              <span className="text-[#626871] font-normal ml-2">
                / {formatTimecode(clip.endTime, true)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-[#9299A3]">
            <button
              onClick={() => setIsMuted((m) => !m)}
              className="hover:text-[#E7E9EC] transition-colors"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <span className="font-mono tabular-nums text-[11px] text-[#626871]">
              In: {formatTimecode(clip.startTime, false)} · Out: {formatTimecode(clip.endTime, false)}
            </span>
          </div>
        </div>

        {/* Timeline Tracks Canvas */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden p-3 flex flex-col justify-between relative bg-[#14171A]">
          {/* Timecode Scrubber Bar */}
          <div
            className="w-full h-4 relative cursor-pointer"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const clickFraction = (e.clientX - rect.left) / rect.width;
              setCurrentTime(clip.startTime + clickFraction * clip.duration);
            }}
          >
            {/* Tick marks */}
            <div className="absolute inset-0 flex justify-between items-center text-[9px] font-mono text-[#626871] border-b border-[#292E34]">
              <span>0s</span>
              <span>10s</span>
              <span>20s</span>
              <span>30s</span>
              <span>40s</span>
              <span>{clip.duration}s</span>
            </div>

            {/* Playhead Indicator Needle */}
            <div
              className="absolute top-0 bottom-0 w-[2px] bg-[#B6F36B] z-30 pointer-events-none"
              style={{ left: `${progressPercent}%` }}
            >
              <div className="w-2.5 h-2.5 bg-[#B6F36B] -translate-x-[4px] -translate-y-1 rotate-45" />
            </div>
          </div>

          {/* Track 1: Subtitle Cues Track */}
          <div className="h-9 bg-[#191C20] rounded border border-[#292E34] p-1 flex items-center relative overflow-hidden">
            <span className="text-[9px] font-mono uppercase text-[#626871] px-2 shrink-0 border-r border-[#292E34] mr-2">
              Subs
            </span>
            <div className="flex-1 h-full flex gap-1 relative">
              {clip.captions.map((seg) => {
                const segStartOffset = Math.max(0, seg.start - clip.startTime);
                const segWidth = (Math.min(seg.end, clip.endTime) - Math.max(seg.start, clip.startTime)) / clip.duration;
                const isActive = currentTime >= seg.start && currentTime <= seg.end;

                return (
                  <div
                    key={seg.id}
                    onClick={() => setCurrentTime(seg.start)}
                    className={`h-full rounded px-2 text-[10px] font-medium flex items-center truncate cursor-pointer transition-colors border ${
                      isActive
                        ? 'bg-[#B6F36B]/20 text-[#B6F36B] border-[#B6F36B]/50'
                        : 'bg-[#20242A] text-[#9299A3] border-[#292E34] hover:text-[#E7E9EC]'
                    }`}
                    style={{ flex: Math.max(1, segWidth * 100) }}
                  >
                    {seg.text}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Track 2: Video Filmstrip Track */}
          <div className="h-10 bg-[#191C20] rounded border border-[#292E34] flex items-center px-1 relative overflow-hidden">
            <span className="text-[9px] font-mono uppercase text-[#626871] px-2 shrink-0 border-r border-[#292E34] mr-2">
              Video
            </span>
            <div className="flex-1 h-full flex items-center gap-1.5 opacity-80">
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className="flex-1 h-7 bg-[#20242A] rounded border border-[#292E34] flex items-center justify-center text-[9px] font-mono text-[#626871]"
                >
                  f_{i * 30}
                </div>
              ))}
            </div>
          </div>

          {/* Track 3: Audio Waveform Track */}
          <div className="h-10 bg-[#191C20] rounded border border-[#292E34] flex items-center px-1 relative overflow-hidden">
            <span className="text-[9px] font-mono uppercase text-[#626871] px-2 shrink-0 border-r border-[#292E34] mr-2">
              Audio
            </span>
            <div className="flex-1 h-full flex items-end gap-[1px]">
              {[
                0.2, 0.4, 0.7, 0.9, 0.6, 0.4, 0.3, 0.6, 0.8, 0.95, 0.7, 0.5, 0.3, 0.2,
                0.5, 0.8, 0.85, 0.9, 0.75, 0.6, 0.4, 0.3, 0.5, 0.7, 0.8, 0.65, 0.4, 0.2,
                0.3, 0.6, 0.85, 0.9, 0.7, 0.5, 0.4, 0.7, 0.9, 0.85, 0.6, 0.4, 0.2, 0.1
              ].map((val, idx) => (
                <div
                  key={idx}
                  className="flex-1 bg-[#292E34] hover:bg-[#B6F36B] transition-colors rounded-t-[1px]"
                  style={{ height: `${val * 100}%` }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
