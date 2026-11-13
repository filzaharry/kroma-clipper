import React, { useState } from 'react';
import { VideoSource } from '../../types';
import { formatDuration, generateMockWaveform } from '../../utils/clippingRules';
import { UploadCloud, CheckCircle2, Film, Clock, MonitorPlay, AudioWaveform, ArrowRight, FilePlus } from 'lucide-react';

interface MediaLibraryViewProps {
  videos: VideoSource[];
  activeVideo: VideoSource | null;
  onSelectVideo: (video: VideoSource) => void;
  onUploadNew: (video: VideoSource) => void;
  onProceedToRules: () => void;
}

export const MediaLibraryView: React.FC<MediaLibraryViewProps> = ({
  videos,
  activeVideo,
  onSelectVideo,
  onUploadNew,
  onProceedToRules,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const handleSimulatedUpload = (fileTitle: string) => {
    setUploadProgress(15);
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev === null || prev >= 100) {
          clearInterval(interval);
          const newVid: VideoSource = {
            id: `vid-custom-${Date.now()}`,
            title: fileTitle,
            fileName: fileTitle.toLowerCase().replace(/\s+/g, '_') + '.mp4',
            fileSizeBytes: 2840000000,
            durationSeconds: 1980,
            resolution: { width: 3840, height: 2160 },
            fps: 60,
            audioChannels: 2,
            sampleRate: 48000,
            uploadDate: '2026-03-24',
            thumbnailUrl: '',
            status: 'ready',
            waveformPoints: generateMockWaveform(120, Math.floor(Math.random() * 500)),
            transcripts: [
              {
                id: 'seg-u1',
                start: 45,
                end: 78,
                speaker: 'Host',
                text: 'Why do startup founders burn through millions on compute without profiling their latency graphs?',
              },
              {
                id: 'seg-u2',
                start: 78,
                end: 115,
                speaker: 'Guest',
                text: 'The secret is that hardware optimization requires understanding hardware constraints rather than throwing more GPUs at the cluster.',
              },
            ],
          };
          onUploadNew(newVid);
          return null;
        }
        return prev + 25;
      });
    }, 250);
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-[#111315] p-6 lg:p-8">
      {/* Page Title & Context */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[#E7E9EC] tracking-tight">
            1. Master Video Ingest
          </h1>
          <p className="text-xs text-[#9299A3] mt-1">
            Ingest 4K, 1080p long-form interviews, podcasts, or keynotes. The rule engine will parse audio channels, speech energy, and hook heuristics.
          </p>
        </div>

        {activeVideo && (
          <button
            onClick={onProceedToRules}
            className="h-9 px-4 text-xs font-medium text-[#111315] bg-[#B6F36B] hover:bg-[#A5E456] rounded transition-colors flex items-center gap-2 self-start md:self-auto focus-visible:outline-none shrink-0"
          >
            <span>Configure Clipping Rules</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Drag & Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const file = e.dataTransfer.files[0];
          handleSimulatedUpload(file ? file.name.replace(/\.[^/.]+$/, '') : 'Imported_Master_Recording');
        }}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors mb-8 ${
          isDragging
            ? 'border-[#B6F36B] bg-[#20242A]'
            : 'border-[#292E34] bg-[#191C20] hover:border-[#383F47]'
        }`}
      >
        <div className="max-w-md mx-auto flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-[#20242A] border border-[#292E34] flex items-center justify-center text-[#B6F36B] mb-3">
            <UploadCloud className="w-6 h-6" />
          </div>
          <div className="text-sm font-medium text-[#E7E9EC] mb-1">
            Drag & drop master video file here
          </div>
          <p className="text-xs text-[#9299A3] mb-4">
            Supports MP4, MOV, ProRes, MKV up to 10GB. Automatically extracts waveform & audio stems.
          </p>

          {uploadProgress !== null ? (
            <div className="w-full space-y-2">
              <div className="flex justify-between text-xs text-[#9299A3]">
                <span>Ingesting media & extracting audio stems...</span>
                <span className="font-mono tabular-nums text-[#B6F36B]">{uploadProgress}%</span>
              </div>
              <div className="w-full h-1.5 bg-[#20242A] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#B6F36B] transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <label className="h-8 px-4 text-xs font-medium text-[#E7E9EC] bg-[#20242A] hover:bg-[#262B32] border border-[#292E34] rounded cursor-pointer transition-colors inline-flex items-center gap-1.5">
                <FilePlus className="w-3.5 h-3.5" />
                <span>Select Local File</span>
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleSimulatedUpload(f.name.replace(/\.[^/.]+$/, ''));
                  }}
                />
              </label>
              <button
                type="button"
                onClick={() => handleSimulatedUpload('Podcast_Interview_Take_03')}
                className="h-8 px-3 text-xs text-[#9299A3] hover:text-[#E7E9EC] transition-colors"
              >
                Ingest Demo Recording
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Library of Uploaded Masters */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-medium text-[#9299A3] px-1">
          <span>Project Master Files ({videos.length})</span>
          <span>Click to select active master file</span>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {videos.map((vid) => {
            const isSelected = activeVideo?.id === vid.id;
            return (
              <div
                key={vid.id}
                onClick={() => onSelectVideo(vid)}
                className={`p-4 rounded-lg border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#20242A] border-[#B6F36B]/60 ring-1 ring-[#B6F36B]/40'
                    : 'bg-[#191C20] border-[#292E34] hover:border-[#383F47] hover:bg-[#1E2228]'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 rounded bg-[#111315] border border-[#292E34] flex items-center justify-center text-[#B6F36B] shrink-0">
                      <Film className="w-6 h-6 stroke-[1.8]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[#E7E9EC] tracking-tight">
                          {vid.title}
                        </span>
                        {isSelected && (
                          <span className="text-[10px] text-[#B6F36B] font-mono px-1.5 py-0.5 rounded bg-[#111315] border border-[#B6F36B]/30 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            ACTIVE MASTER
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-[#9299A3] mt-1.5">
                        <span className="font-mono text-[#626871]">{vid.fileName}</span>
                        <span>·</span>
                        <span className="flex items-center gap-1 font-mono tabular-nums">
                          <Clock className="w-3.5 h-3.5 text-[#626871]" />
                          {formatDuration(vid.durationSeconds)}
                        </span>
                        <span>·</span>
                        <span className="flex items-center gap-1 font-mono tabular-nums">
                          <MonitorPlay className="w-3.5 h-3.5 text-[#626871]" />
                          {vid.resolution.width}x{vid.resolution.height} @ {vid.fps}fps
                        </span>
                        <span>·</span>
                        <span className="flex items-center gap-1 font-mono tabular-nums">
                          <AudioWaveform className="w-3.5 h-3.5 text-[#626871]" />
                          {vid.audioChannels} ch (48kHz)
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end md:self-auto">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectVideo(vid);
                        onProceedToRules();
                      }}
                      className="h-8 px-3 text-xs font-medium text-[#E7E9EC] bg-[#111315] hover:bg-[#20242A] border border-[#292E34] hover:border-[#383F47] rounded transition-colors flex items-center gap-1.5"
                    >
                      <span>Set Rules</span>
                      <ArrowRight className="w-3 h-3 text-[#B6F36B]" />
                    </button>
                  </div>
                </div>

                {/* Waveform Micro-Display */}
                <div className="mt-3 pt-3 border-t border-[#292E34]/50 flex items-center gap-3">
                  <span className="text-[10px] uppercase font-mono text-[#626871] tracking-wider shrink-0">
                    Audio Stem
                  </span>
                  <div className="flex-1 h-5 flex items-end gap-[2px] overflow-hidden opacity-75">
                    {vid.waveformPoints.slice(0, 80).map((pt, idx) => (
                      <div
                        key={idx}
                        className="flex-1 bg-[#292E34] hover:bg-[#B6F36B] transition-colors rounded-t-[1px]"
                        style={{ height: `${Math.max(15, pt * 100)}%` }}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] font-mono tabular-nums text-[#9299A3]">
                    {vid.transcripts.length} transcript cues
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
