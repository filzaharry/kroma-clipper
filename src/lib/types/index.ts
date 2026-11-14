export type AspectRatio = '9:16' | '1:1' | '16:9';
export type FramingMode = 'face_track' | 'split_screen' | 'manual_pan' | 'centered';
export type CaptionStylePreset =
  | 'hormozi'
  | 'mrbeast'
  | 'ali_abdaal'
  | 'minimal'
  | 'karaoke'
  | 'neon_glow'
  | 'vox_box'
  | 'cinematic'
  | 'typewriter'
  | 'fire_gradient'
  | 'subtle_box';

export type CaptionPosition = 'bottom' | 'middle' | 'top';
export type CaptionMaxLines = 1 | 2 | 3;

export interface CaptionWord {
  word: string;
  start: number; // in seconds
  end: number;
}

export interface CaptionSegment {
  id: string;
  start: number;
  end: number;
  text: string;
  speaker?: string;
  words?: CaptionWord[];
}

export interface VideoSource {
  id: string;
  title: string;
  fileName: string;
  fileSizeBytes: number;
  durationSeconds: number;
  resolution: { width: number; height: number };
  fps: number;
  audioChannels: number;
  sampleRate: number;
  uploadDate: string;
  thumbnailUrl: string;
  status: 'ready' | 'processing' | 'failed';
  waveformPoints: number[]; // normalized 0 to 1
  transcripts: CaptionSegment[];
}

export interface ClippingRuleConfig {
  minDuration: number; // e.g. 20
  maxDuration: number; // e.g. 60
  targetAspectRatios: AspectRatio[];
  framingMode: FramingMode;
  audioEnergyThreshold: number; // 0 to 100
  hookSensitivity: number; // 0 to 100
  speechPacingPenalty: boolean;
  detectSpeakerSwitches: boolean;
  captionPreset: CaptionStylePreset;
  captionHighlightColor: string;
  captionPosition?: CaptionPosition;
  captionMaxLines?: CaptionMaxLines;
  maxCandidates: number;
}

export interface ClipCandidate {
  id: string;
  sourceVideoId: string;
  title: string;
  startTime: number;
  endTime: number;
  duration: number;
  aspectRatio: AspectRatio;
  score: number; // 0 to 100
  hookScore: number;
  energyScore: number;
  topicDensity: number;
  excerptQuote: string;
  speaker: string;
  tags: string[];
  status: 'candidate' | 'approved' | 'rejected' | 'in_editor';
  framingMode: FramingMode;
  panOffset: number; // -50 to 50 percent
  zoomLevel: number; // 1.0 to 2.0
  captionPreset: CaptionStylePreset;
  captionPosition?: CaptionPosition;
  captionMaxLines?: CaptionMaxLines;
  captions: CaptionSegment[];
  bRollCuts?: Array<{ timestamp: number; type: 'zoom_in' | 'speaker_switch' | 'graphic' }>;
}

export interface RenderTask {
  id: string;
  clipId: string;
  clipTitle: string;
  aspectRatio: AspectRatio;
  resolution: string; // e.g. "1080x1920"
  framerate: number;
  bitrateMbps: number;
  format: 'mp4' | 'mov' | 'prores';
  includeSubtitles: 'burned' | 'separate_srt' | 'none';
  progress: number; // 0 to 100
  status: 'queued' | 'rendering' | 'completed' | 'failed';
  fileSizeBytes: number;
  createdAt: string;
  completedAt?: string;
}

export type SocialPlatform = 'tiktok' | 'youtube_shorts' | 'instagram_reels' | 'linkedin';

export interface ScheduledPost {
  id: string;
  clipId: string;
  clipTitle: string;
  thumbnailUrl: string;
  platform: SocialPlatform;
  caption: string;
  hashtags: string[];
  scheduledTime: string; // ISO string
  status: 'draft' | 'scheduled' | 'published';
  aspectRatio: AspectRatio;
  durationSeconds: number;
}

