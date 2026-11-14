import type {
  VideoSource,
  ClippingRuleConfig,
  ClipCandidate,
  RenderTask,
  ScheduledPost,
} from '#lib/types';
import { INITIAL_CLIPPING_RULES } from '#lib/data/mockData';
import { evaluateHighlightCandidates, formatTimecode } from '#lib/utils/clippingRules';

export class WorkspaceStore {
  // Primary collections — Bersih tanpa dummy data awal
  videos = $state<VideoSource[]>([]);
  activeVideoId = $state<string | null>(null);
  rules = $state<ClippingRuleConfig>({ ...INITIAL_CLIPPING_RULES });
  candidates = $state<ClipCandidate[]>([]);
  activeClipId = $state<string | null>(null);
  renderTasks = $state<RenderTask[]>([]);
  scheduledPosts = $state<ScheduledPost[]>([]);

  // Analysis state
  isAnalyzing = $state<boolean>(false);
  analysisProgress = $state<number>(0);
  analysisLogs = $state<string[]>([]);

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
    // Otomatis siapkan kandidat klip awal agar editor & pilihan klip langsung siap digunakan
    const initialCandidates = evaluateHighlightCandidates(video, this.rules);
    this.candidates = initialCandidates;
    this.activeClipId = initialCandidates[0]?.id || null;
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
      `[00:00:00] Mengekstrak frekuensi audio & vokal dari "${video.title}"...`,
      `[00:00:01] Parameter audio: ${video.sampleRate}Hz, ${video.audioChannels} channel stereo.`,
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

        // Evaluasi klip dengan heuristic rules engine
        const newCandidates = evaluateHighlightCandidates(video, this.rules);
        if (newCandidates.length > 0) {
          this.candidates = newCandidates;
          this.activeClipId = newCandidates[0].id;
          this.analysisLogs.push(
            `[00:00:07] Berhasil menemukan ${newCandidates.length} klip kandidat terbaik berdurasi ${this.rules.minDuration}s - ${this.rules.maxDuration}s.`,
            `[00:00:08] Klip dengan retensi & hook tertinggi: "${newCandidates[0].title}" (Skor: ${newCandidates[0].score}/100).`,
            `[00:00:09] Analisis AI selesai! Klip siap untuk diedit atau diekspor ke video vertikal 9:16.`
          );
        } else {
          this.analysisLogs.push(
            `[00:00:07] Catatan: Tidak ada bagian yang memenuhi durasi (${this.rules.minDuration}s - ${this.rules.maxDuration}s) atau ambang energi (${this.rules.audioEnergyThreshold}%).`,
            `[00:00:08] Saran: Longgarkan durasi minimal/maksimal di menu Aturan Klip.`
          );
        }

        if (onComplete) onComplete();
      } else {
        this.analysisProgress = current;
        if (current >= 28 && this.analysisLogs.length === 2) {
          this.analysisLogs.push(
            `[00:00:03] Menyaring dinamika energi suara: ambang batas diset ke ${this.rules.audioEnergyThreshold}%.`
          );
        } else if (current >= 64 && this.analysisLogs.length === 3) {
          this.analysisLogs.push(
            `[00:00:05] Memindai hook 3-5 detik pembuka: sensitivitas ${this.rules.hookSensitivity}% pada kalimat tanya & kata kunci emosional.`
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

  async startRender(config: Partial<RenderTask>, targetClip?: ClipCandidate): Promise<string> {
    const clip = targetClip || this.activeClip;
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
      progress: 10,
      status: 'rendering',
      fileSizeBytes: config.fileSizeBytes || 3500000,
      createdAt: new Date().toISOString(),
    };

    this.renderTasks = [newTask, ...this.renderTasks];

    // Animasi progress awal sambil menunggu backend merender video riil
    let progress = 15;
    const progressInterval = setInterval(() => {
      if (progress < 85) {
        progress += Math.floor(Math.random() * 8) + 5;
        this.renderTasks = this.renderTasks.map((t) =>
          t.id === taskId ? { ...t, progress: Math.min(85, progress) } : t
        );
      }
    }, 450);

    // Kirim request ke backend SvelteKit /api/render untuk pemotongan YouTube riil & burning subtitle
    const video = this.activeVideo;
    const rawVideoId =
      video?.id?.replace(/^yt-/, '') ||
      clip?.sourceVideoId?.replace(/^yt-/, '') ||
      'wsCBMCa_DBA';
    const youtubeUrl = `https://www.youtube.com/watch?v=${rawVideoId}`;

    try {
      const res = await fetch('/api/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          youtubeUrl,
          videoId: rawVideoId,
          startTime: clip?.startTime || 0,
          endTime: clip?.endTime || 30,
          clipTitle: clip?.title || newTask.clipTitle,
          aspectRatio: newTask.aspectRatio,
          framingLayout: config.framingLayout || clip?.framingLayout || this.rules.framingLayout || 'crop',
          backgroundStyle: config.backgroundStyle || clip?.backgroundStyle || this.rules.backgroundStyle || 'dark_blur',
          captionPreset: clip?.captionPreset || this.rules.captionPreset || 'hormozi',
          captionPosition: clip?.captionPosition || this.rules.captionPosition || 'bottom',
          captionMaxLines: clip?.captionMaxLines || this.rules.captionMaxLines || 2,
          captionHighlightColor: clip?.captionHighlightColor || this.rules.captionHighlightColor || '#B6F36B',
          panOffset: clip?.panOffset || 0,
          zoomLevel: clip?.zoomLevel || 1.0,
          watermark: clip?.watermark,
          bgm: clip?.bgm,
          captions: clip?.captions || [],
        }),
      });

      clearInterval(progressInterval);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal memproses render video');
      }

      this.renderTasks = this.renderTasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              progress: 100,
              status: 'completed',
              downloadUrl: data.downloadUrl,
              fileSizeBytes: data.fileSizeBytes || t.fileSizeBytes,
              completedAt: new Date().toISOString(),
            }
          : t
      );

      const finishedTask = this.renderTasks.find((t) => t.id === taskId);
      if (finishedTask) {
        this.downloadRenderTask(finishedTask);
      }
      return taskId;
    } catch (err: any) {
      clearInterval(progressInterval);
      console.error('Render failure:', err);
      this.renderTasks = this.renderTasks.map((t) =>
        t.id === taskId ? { ...t, progress: 100, status: 'failed' } : t
      );
      throw err;
    }
  }

  downloadRenderTask(task: RenderTask) {
    if (typeof window === 'undefined') return;

    if (task.downloadUrl) {
      // Download file video MP4 riil yang telah selesai dirender
      const a = document.createElement('a');
      a.href = task.downloadUrl;
      a.download = `${task.clipTitle.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${task.aspectRatio.replace(':', 'x')}.${task.format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      console.warn('File video belum siap diunduh.');
    }
  }

  async quickDownloadClip(clip: ClipCandidate) {
    this.selectClip(clip);
    return await this.startRender(
      {
        clipId: clip.id,
        clipTitle: clip.title,
        aspectRatio: clip.aspectRatio,
      },
      clip
    );
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
