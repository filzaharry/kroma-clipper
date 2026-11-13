import type {
  VideoSource,
  ClippingRuleConfig,
  ClipCandidate,
  RenderTask,
  ScheduledPost,
} from '#lib/types';
import {
  MOCK_VIDEOS,
  INITIAL_CLIPPING_RULES,
  MOCK_CLIPS,
  MOCK_RENDER_TASKS,
  MOCK_SCHEDULED_POSTS,
} from '#lib/data/mockData';
import { evaluateHighlightCandidates, formatTimecode } from '#lib/utils/clippingRules';

export class WorkspaceStore {
  // Primary collections
  videos = $state<VideoSource[]>(MOCK_VIDEOS);
  activeVideoId = $state<string | null>(MOCK_VIDEOS[0]?.id || null);
  rules = $state<ClippingRuleConfig>({ ...INITIAL_CLIPPING_RULES });
  candidates = $state<ClipCandidate[]>([...MOCK_CLIPS]);
  activeClipId = $state<string | null>(MOCK_CLIPS[0]?.id || null);
  renderTasks = $state<RenderTask[]>([...MOCK_RENDER_TASKS]);
  scheduledPosts = $state<ScheduledPost[]>([...MOCK_SCHEDULED_POSTS]);

  // Analysis state
  isAnalyzing = $state<boolean>(false);
  analysisProgress = $state<number>(100);
  analysisLogs = $state<string[]>([
    '[00:00:00] Ingesting master PCM audio channel 1 & 2...',
    '[00:00:02] Audio RMS power peak detected @ 02:22 - 03:09 (+14.2dB)',
    '[00:00:04] Hook Trigger: "Why do most modern architectures fail..." (HookScore: 98)',
    '[00:00:05] Highlight Candidate 01 Registered: 47.0s [142.0s - 189.0s] - Score: 96/100',
    '[00:00:06] Hook Trigger: "Physics does not have a stack trace..." (HookScore: 95)',
    '[00:00:07] Highlight Candidate 02 Registered: 38.0s [310.0s - 348.0s] - Score: 93/100',
    '[00:00:08] Applying 9:16 safe area boundaries & subtitle word timestamps...',
    '[00:00:09] Engine execution complete. Candidates ready for editorial review.',
  ]);

  // Active timers tracking for memory leak prevention
  private analysisTimer: ReturnType<typeof setInterval> | null = null;
  private renderTimers = new Map<string, ReturnType<typeof setInterval>>();

  // Derived selectors
  activeVideo = $derived<VideoSource | null>(
    this.videos.find((v) => v.id === this.activeVideoId) || this.videos[0] || null
  );

  activeClip = $derived<ClipCandidate | null>(
    this.candidates.find((c) => c.id === this.activeClipId) || this.candidates[0] || null
  );

  completedRenderCount = $derived<number>(
    this.renderTasks.filter((t) => t.status === 'completed').length
  );

  selectVideo(video: VideoSource) {
    this.activeVideoId = video.id;
  }

  addVideo(video: VideoSource) {
    this.videos = [video, ...this.videos];
    this.activeVideoId = video.id;
  }

  updateRules(updated: ClippingRuleConfig) {
    // Ensure minDuration never exceeds maxDuration
    let minDuration = updated.minDuration;
    let maxDuration = updated.maxDuration;
    if (minDuration > maxDuration) {
      minDuration = maxDuration;
    }
    this.rules = {
      ...updated,
      minDuration,
      maxDuration,
    };
  }

  runAnalysis(onComplete?: () => void) {
    const video = this.activeVideo;
    if (!video || this.isAnalyzing) return;

    if (this.analysisTimer) {
      clearInterval(this.analysisTimer);
      this.analysisTimer = null;
    }

    this.isAnalyzing = true;
    this.analysisProgress = 10;
    this.analysisLogs = [
      `[00:00:00] Ingesting master PCM audio track for "${video.title}"...`,
      `[00:00:01] Audio sampling rate: ${video.sampleRate}Hz, ${video.audioChannels} channels.`,
    ];

    let current = 10;
    this.analysisTimer = setInterval(() => {
      current += 18;
      if (current >= 100) {
        if (this.analysisTimer) {
          clearInterval(this.analysisTimer);
          this.analysisTimer = null;
        }
        this.analysisProgress = 100;
        this.isAnalyzing = false;

        // Evaluate highlights using the pure rules utility
        const newCandidates = evaluateHighlightCandidates(video, this.rules);
        if (newCandidates.length > 0) {
          this.candidates = newCandidates;
          this.activeClipId = newCandidates[0].id;
          this.analysisLogs.push(
            `[00:00:07] Successfully generated ${newCandidates.length} highlight candidates from transcripts.`,
            `[00:00:08] Top scored clip: "${newCandidates[0].title}" (Score: ${newCandidates[0].score}/100).`,
            `[00:00:09] Engine execution complete. Ready for editorial review.`
          );
        } else {
          this.analysisLogs.push(
            `[00:00:07] Notice: No segments matched duration bounds (${this.rules.minDuration}s - ${this.rules.maxDuration}s) or energy threshold (${this.rules.audioEnergyThreshold}%).`,
            `[00:00:08] Try adjusting your clipping rule bounds.`
          );
        }

        if (onComplete) onComplete();
      } else {
        this.analysisProgress = current;
        if (current >= 28 && this.analysisLogs.length === 2) {
          this.analysisLogs.push(
            `[00:00:03] Speech energy filtering: cutoff set to ${this.rules.audioEnergyThreshold}%.`
          );
        } else if (current >= 64 && this.analysisLogs.length === 3) {
          this.analysisLogs.push(
            `[00:00:05] Hook detection pass: sensitivity ${this.rules.hookSensitivity}% across opening cues.`
          );
        }
      }
    }, 250);
  }

  cancelAnalysis() {
    if (this.analysisTimer) {
      clearInterval(this.analysisTimer);
      this.analysisTimer = null;
    }
    this.isAnalyzing = false;
  }

  selectClip(clip: ClipCandidate) {
    this.activeClipId = clip.id;
  }

  updateClip(updated: ClipCandidate) {
    this.candidates = this.candidates.map((c) => (c.id === updated.id ? updated : c));
    if (this.activeClipId === updated.id) {
      this.activeClipId = updated.id;
    }
  }

  approveClip(clipId: string) {
    this.candidates = this.candidates.map((c) =>
      c.id === clipId ? { ...c, status: c.status === 'approved' ? 'candidate' : 'approved' } : c
    );
  }

  rejectClip(clipId: string) {
    this.candidates = this.candidates.map((c) =>
      c.id === clipId ? { ...c, status: c.status === 'rejected' ? 'candidate' : 'rejected' } : c
    );
  }

  startRender(config: Partial<RenderTask>) {
    const clip = this.activeClip;
    const taskId = `render-${Date.now()}`;
    const newTask: RenderTask = {
      id: taskId,
      clipId: config.clipId || clip?.id || 'clip-unknown',
      clipTitle: config.clipTitle || clip?.title || 'Highlight Clip',
      aspectRatio: config.aspectRatio || clip?.aspectRatio || '9:16',
      resolution: config.resolution || '1080x1920',
      framerate: config.framerate || 60,
      bitrateMbps: config.bitrateMbps || 18,
      format: config.format || 'mp4',
      includeSubtitles: config.includeSubtitles || 'burned',
      progress: 0,
      status: 'rendering',
      fileSizeBytes: config.fileSizeBytes || 85000000,
      createdAt: new Date().toISOString(),
    };

    this.renderTasks = [newTask, ...this.renderTasks];

    // Simulate encoding progress with tracked cleanup
    let renderPct = 0;
    const timer = setInterval(() => {
      renderPct += 25;
      if (renderPct >= 100) {
        clearInterval(timer);
        this.renderTimers.delete(taskId);
        this.renderTasks = this.renderTasks.map((t) =>
          t.id === taskId
            ? { ...t, progress: 100, status: 'completed', completedAt: new Date().toISOString() }
            : t
        );
      } else {
        this.renderTasks = this.renderTasks.map((t) =>
          t.id === taskId ? { ...t, progress: renderPct } : t
        );
      }
    }, 350);

    this.renderTimers.set(taskId, timer);
    return taskId;
  }

  downloadRenderTask(task: RenderTask) {
    // Generate a downloadable dummy media file matching format
    const content = `Kroma Clip Render Export\nTitle: ${task.clipTitle}\nFormat: ${task.format}\nResolution: ${task.resolution}\nFPS: ${task.framerate}\nSubtitles: ${task.includeSubtitles}\nTimestamp: ${new Date().toISOString()}`;
    const blob = new Blob([content], { type: task.format === 'mp4' ? 'video/mp4' : 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${task.clipTitle.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${task.aspectRatio.replace(':', 'x')}.${task.format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  addScheduledPost(post: ScheduledPost) {
    this.scheduledPosts = [post, ...this.scheduledPosts];
  }

  removeScheduledPost(id: string) {
    this.scheduledPosts = this.scheduledPosts.filter((p) => p.id !== id);
  }
}

// Single instance for client workspace
export const workspace = new WorkspaceStore();
