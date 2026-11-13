import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatTimecode,
  formatDuration,
  calculateClipHeuristicScore,
  evaluateHighlightCandidates,
  generateMockWaveform,
} from './clippingRules';
import type { VideoSource, ClippingRuleConfig } from '../types';

test('formatTimecode formats standard seconds correctly with frames', () => {
  assert.equal(formatTimecode(0, true, 30), '00:00:00');
  assert.equal(formatTimecode(65.5, true, 30), '01:05:15');
  assert.equal(formatTimecode(3661, true, 30), '01:01:01:00');
});

test('formatTimecode formats without frames', () => {
  assert.equal(formatTimecode(45, false), '00:45');
  assert.equal(formatTimecode(3665, false), '01:01:05');
});

test('formatDuration formats concise human duration without trailing spaces', () => {
  assert.equal(formatDuration(24), '24s');
  assert.equal(formatDuration(90), '1m 30s');
  assert.equal(formatDuration(120), '2m');
});

test('calculateClipHeuristicScore computes weighted formula strictly within 0-100', () => {
  const perfect = calculateClipHeuristicScore(100, 100, 100, 100);
  assert.equal(perfect, 100);

  const baseline = calculateClipHeuristicScore(80, 90, 70, 85);
  // 90 * 0.35 + 80 * 0.30 + 70 * 0.20 + 85 * 0.15 = 31.5 + 24 + 14 + 12.75 = 82.25 -> 82
  assert.equal(baseline, 82);
});

test('generateMockWaveform produces normalized points within bounds', () => {
  const points = generateMockWaveform(20);
  assert.equal(points.length, 20);
  for (const pt of points) {
    assert.ok(pt >= 0.05 && pt <= 1.0, `Waveform point ${pt} out of bounds`);
  }
});

test('evaluateHighlightCandidates identifies clips matching duration bounds and rules', () => {
  const mockVideo: VideoSource = {
    id: 'vid-01',
    title: 'Silicon Architecture Deep Dive',
    fileName: 'podcast_ep42_4k.mp4',
    fileSizeBytes: 2400000000,
    durationSeconds: 180,
    resolution: { width: 3840, height: 2160 },
    fps: 30,
    audioChannels: 2,
    sampleRate: 48000,
    uploadDate: '2026-03-24',
    thumbnailUrl: '',
    status: 'ready',
    waveformPoints: generateMockWaveform(100),
    transcripts: [
      { id: 'seg-1', start: 0, end: 12, text: 'Welcome back everyone. Today we are looking at next gen chips.', speaker: 'Alex' },
      { id: 'seg-2', start: 12, end: 28, text: 'Why did everyone get the memory bandwidth scaling wrong?', speaker: 'Alex' },
      { id: 'seg-3', start: 28, end: 45, text: 'The secret is that HBM costs four times more than traditional memory.', speaker: 'Elena' },
      { id: 'seg-4', start: 45, end: 62, text: 'If you look at the economics, it changed everything for data centers.', speaker: 'Elena' },
      { id: 'seg-5', start: 62, end: 85, text: 'Let us take a brief commercial break before diving deeper.', speaker: 'Alex' },
    ],
  };

  const config: ClippingRuleConfig = {
    minDuration: 20,
    maxDuration: 55,
    targetAspectRatios: ['9:16'],
    framingMode: 'face_track',
    audioEnergyThreshold: 20,
    hookSensitivity: 80,
    speechPacingPenalty: true,
    detectSpeakerSwitches: true,
    captionPreset: 'hormozi',
    captionHighlightColor: '#B6F36B',
    maxCandidates: 5,
  };

  const results = evaluateHighlightCandidates(mockVideo, config);
  assert.ok(results.length > 0, 'Should find at least 1 candidate');
  assert.ok(results[0].duration >= 20 && results[0].duration <= 55, 'Duration must match rule range');
  assert.ok(results[0].score > 50, 'Highlight should have a strong score');
});

