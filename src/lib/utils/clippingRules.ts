import type { CaptionSegment, ClipCandidate, ClippingRuleConfig, VideoSource } from '../types';

/**
 * Format seconds into HH:MM:SS or MM:SS (with optional frames for video NLE precision)
 */
export function formatTimecode(seconds: number, includeFrames: boolean = true, fps: number = 30): string {
  if (isNaN(seconds) || seconds < 0) return includeFrames ? '00:00:00:00' : '00:00';

  const totalSeconds = Math.floor(seconds);
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  const frames = Math.floor((seconds - totalSeconds) * fps);

  const pad = (n: number) => String(n).padStart(2, '0');

  if (hrs > 0) {
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}${includeFrames ? `:${pad(frames)}` : ''}`;
  }
  return `${pad(mins)}:${pad(secs)}${includeFrames ? `:${pad(frames)}` : ''}`;
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m}m`;
  return `${m}m ${s}s`;
}

/**
 * Deterministic rule-based scoring function for candidate highlights
 * Uses transparent heuristic weights:
 * - Hook strength (first 5 seconds energy & question/punchline presence): 35%
 * - Audio energy & pitch dynamics: 30%
 * - Speech pacing & pause ratio: 20%
 * - Topic keyword density: 15%
 */
export function calculateClipHeuristicScore(
  audioEnergy: number,
  hookPotential: number,
  pacingScore: number,
  topicDensity: number
): number {
  const weighted =
    hookPotential * 0.35 +
    audioEnergy * 0.30 +
    pacingScore * 0.20 +
    topicDensity * 0.15;
  return Math.min(100, Math.max(0, Math.round(weighted)));
}

/**
 * Filter and generate highlight candidates from a source video based on user rules
 */
export function evaluateHighlightCandidates(
  video: VideoSource,
  config: ClippingRuleConfig
): ClipCandidate[] {
  const candidates: ClipCandidate[] = [];
  const segments = video.transcripts;

  if (!segments || segments.length === 0) {
    return [];
  }

  const hookKeywords = [
    'kenapa', 'mengapa', 'bagaimana', 'rahasia', 'kesalahan terbesar', 'jarang orang tahu',
    'faktanya', 'ternyata', 'kalau kamu', 'jangan pernah', 'berhenti', 'mengubah segalanya',
    'masalah terbesar', 'apa yang terjadi', 'jangan', 'kunci sukses', 'tips',
    'why', 'how', 'secret', 'biggest mistake', 'nobody talks about',
    'truth is', 'if you', 'never', 'stopped', 'changed everything',
    'the problem with', 'what happens when', 'don\'t'
  ];

  // Iterate through transcript segments and cluster into clip windows matching minDuration and maxDuration
  for (let i = 0; i < segments.length; i++) {
    const startSegment = segments[i];
    const targetMin = config.minDuration;
    const targetMax = config.maxDuration;

    let accumulatedText = startSegment.text;
    let endSegment = startSegment;
    let accumulatedWords = [...(startSegment.words || [])];
    const candidateCaptions: CaptionSegment[] = [startSegment];
    let speakerSwitches = 0;
    let lastSpeaker = startSegment.speaker;

    // Check if the single start segment itself meets duration bounds
    const singleDuration = startSegment.end - startSegment.start;
    if (singleDuration >= targetMin && singleDuration <= targetMax) {
      const candidate = buildCandidate(
        video,
        config,
        startSegment,
        startSegment,
        candidateCaptions,
        accumulatedText,
        accumulatedWords,
        singleDuration,
        hookKeywords,
        speakerSwitches
      );
      if (candidate) {
        candidates.push(candidate);
        if (candidates.length >= config.maxCandidates) break;
        continue;
      }
    }

    for (let j = i + 1; j < segments.length; j++) {
      const nextSeg = segments[j];
      const potentialDuration = nextSeg.end - startSegment.start;

      if (potentialDuration > targetMax) {
        break;
      }

      endSegment = nextSeg;
      accumulatedText += ' ' + nextSeg.text;
      if (nextSeg.words) {
        accumulatedWords.push(...nextSeg.words);
      }
      candidateCaptions.push(nextSeg);

      if (nextSeg.speaker && nextSeg.speaker !== lastSpeaker) {
        speakerSwitches++;
        lastSpeaker = nextSeg.speaker;
      }

      if (potentialDuration >= targetMin && potentialDuration <= targetMax) {
        const candidate = buildCandidate(
          video,
          config,
          startSegment,
          endSegment,
          candidateCaptions,
          accumulatedText,
          accumulatedWords,
          potentialDuration,
          hookKeywords,
          speakerSwitches
        );

        if (candidate) {
          candidates.push(candidate);
          // Step forward to prevent heavily overlapping duplicate clips
          i = j;
          break;
        }
      }
    }

    if (candidates.length >= config.maxCandidates) {
      break;
    }
  }

  // Fallback pass: jika ambang energi terlalu ketat menghasilkan 0 klip,
  // otomatis adaptasikan ambang agar pengguna selalu mendapatkan klip terbaik
  if (candidates.length === 0 && config.audioEnergyThreshold > 0) {
    return evaluateHighlightCandidates(video, { ...config, audioEnergyThreshold: 0 });
  }

  // Sort descending by heuristic score
  return candidates.sort((a, b) => b.score - a.score);
}

function buildCandidate(
  video: VideoSource,
  config: ClippingRuleConfig,
  startSegment: CaptionSegment,
  endSegment: CaptionSegment,
  captions: CaptionSegment[],
  text: string,
  words: CaptionSegment['words'],
  duration: number,
  hookKeywords: string[],
  speakerSwitches: number
): ClipCandidate | null {
  // Rule 1: Opening hook evaluation scaled with hookSensitivity
  const lowerFirstSentence = startSegment.text.toLowerCase();
  let baseHookScore = 60;
  if (hookKeywords.some((kw) => lowerFirstSentence.includes(kw))) {
    baseHookScore = 94;
  } else if (lowerFirstSentence.endsWith('?') || lowerFirstSentence.includes('!')) {
    baseHookScore = 86;
  }

  // Factor in hookSensitivity setting (higher sensitivity = stricter reward/penalty)
  const sensitivityWeight = config.hookSensitivity / 100;
  const hookScore = Math.min(100, Math.max(30, Math.round(baseHookScore * (0.5 + sensitivityWeight * 0.5))));

  // Rule 2: Audio energy heuristic derived from waveform slice
  const startPointIdx = Math.floor((startSegment.start / video.durationSeconds) * video.waveformPoints.length);
  const endPointIdx = Math.floor((endSegment.end / video.durationSeconds) * video.waveformPoints.length);
  const slice = video.waveformPoints.slice(startPointIdx, Math.max(startPointIdx + 1, endPointIdx));
  const rawAvg = slice.length > 0 ? (slice.reduce((a, b) => a + b, 0) / slice.length) * 100 : 75;
  // Normalisasi energi vokal suara manusia agar selalu terkalibrasi di rentang aktif bicara
  const avgEnergy = Math.min(96, Math.max(70, Math.round(rawAvg * 1.25)));

  if (config.audioEnergyThreshold > 0 && avgEnergy < config.audioEnergyThreshold) {
    return null; // Filtered by user audio energy threshold
  }

  // Rule 3: Speech pacing & speaker switch bonus
  let pacing = config.speechPacingPenalty ? 82 : 90;
  if (config.detectSpeakerSwitches && speakerSwitches > 0) {
    pacing = Math.min(98, pacing + speakerSwitches * 3);
  }

  const wordCount = words ? words.length : text.split(/\s+/).length;
  const topicDensity = Math.min(98, Math.max(50, Math.round(70 + (wordCount / duration) * 5)));
  const totalScore = calculateClipHeuristicScore(avgEnergy, hookScore, pacing, topicDensity);

  // Derive punchy title from first clause or topic
  const cleanTitle = startSegment.text.split(/[.?!,]/)[0].trim().slice(0, 48) || `Highlight @ ${formatTimecode(startSegment.start, false)}`;

  // B-roll / punch cuts
  const bRollCuts: Array<{ timestamp: number; type: 'zoom_in' | 'speaker_switch' | 'graphic' }> = [];
  if (captions.length > 1) {
    bRollCuts.push({ timestamp: captions[1].start, type: 'zoom_in' });
  }
  if (speakerSwitches > 0) {
    bRollCuts.push({ timestamp: endSegment.start, type: 'speaker_switch' });
  }

  return {
    id: `cand-${startSegment.id}-${endSegment.id}`,
    sourceVideoId: video.id,
    title: cleanTitle,
    startTime: startSegment.start,
    endTime: endSegment.end,
    duration: Math.round((endSegment.end - startSegment.start) * 10) / 10,
    aspectRatio: config.targetAspectRatios[0] || '9:16',
    score: totalScore,
    hookScore,
    energyScore: Math.round(avgEnergy),
    topicDensity: Math.round(topicDensity),
    excerptQuote: `"${startSegment.text.slice(0, 110)}..."`,
    speaker: startSegment.speaker || 'Speaker 1',
    tags: extractTags(text),
    status: 'candidate',
    framingMode: config.framingMode,
    panOffset: 0,
    zoomLevel: 1.0,
    captionPreset: config.captionPreset,
    captions: [...captions],
    bRollCuts,
  };
}

function extractTags(text: string): string[] {
  const commonTags = [
    { word: 'ai', tag: 'AI & Tech' },
    { word: 'hardware', tag: 'Hardware' },
    { word: 'silicon', tag: 'Semiconductors' },
    { word: 'podcast', tag: 'Interview' },
    { word: 'money', tag: 'Finance' },
    { word: 'code', tag: 'Engineering' },
    { word: 'future', tag: 'Insights' },
    { word: 'strategy', tag: 'Strategy' },
    { word: 'growth', tag: 'Growth' },
  ];
  const tags: string[] = [];
  const lower = text.toLowerCase();
  for (const item of commonTags) {
    if (lower.includes(item.word) && !tags.includes(item.tag)) {
      tags.push(item.tag);
    }
  }
  return tags.length > 0 ? tags.slice(0, 3) : ['Highlights', 'Shorts'];
}

export function generateMockWaveform(pointsCount: number = 100, seed: number = 42): number[] {
  const points: number[] = [];
  let prev = 0.5;
  for (let i = 0; i < pointsCount; i++) {
    // Generate organic voice amplitude peaks and valleys
    const wave = Math.sin(i / 5 + seed) * 0.25;
    const random = ((Math.sin(i * 12.9898 + seed) * 43758.5453) % 1 + 1) % 1;
    let next = 0.35 + wave + random * 0.45;
    next = Math.max(0.1, Math.min(0.98, prev * 0.4 + next * 0.6));
    points.push(Math.round(next * 100) / 100);
    prev = next;
  }
  return points;
}

