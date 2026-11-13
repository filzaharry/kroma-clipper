# Kroma Clip — Professional Video Highlight SaaS

Professional web-based video highlight detection and clipping platform inspired by DaVinci Resolve, Linear, and Frame.io.

Built with **Svelte 5**, **SvelteKit**, **TypeScript**, and **Tailwind CSS v4**.

---

## 🚀 Getting Started

### Prerequisites
- [Bun](https://bun.sh/) (or Node.js v20+)

### 1. Install Dependencies
```bash
bun install
```

### 2. Run Development Server
```bash
bun run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

### 3. Typecheck & Diagnostics
```bash
bun run check
```

### 4. Run Unit Tests
```bash
bun test
```

### 5. Production Build
```bash
bun run build
bun run preview
```

---

## 🎬 Production Pipeline Stages

1. **Media Ingest (`/library`)**: Master file ingest supporting 4K/1080p footage, automatic audio stem waveform visualization, and transcript cues extraction.
2. **Rule Config (`/rules`)**: Heuristic tuning engine with presets (Viral Shorts, Deep Insights, Podcast Stems), duration bounds validation, canvas aspect ratios, active speaker face tracking, and audio energy thresholds.
3. **Heuristic Engine (`/analysis`)**: Transparent 4-phase highlight evaluation engine with live terminal diagnostic event logging.
4. **Clip Candidates (`/candidates`)**: Scored highlights (0–100) ranked by opening hook potential, vocal dynamics, and thematic pacing with instant approval/rejection and one-click render queueing.
5. **Clip Editor NLE (`/editor`)**: Isolated 60fps high-performance playback canvas with rule-of-thirds grid, TikTok/Reels safe zones, dynamic kinetic typography overlays, multi-track timeline scrubber, and pan/zoom framing controls.
6. **Render Queue (`/export`)**: Multi-format export queue (MP4 H.264, MOV H.265, ProRes 422) with burned kinetic captions or sidecar SRT delivery and instant browser downloads.
7. **Social Schedule (`/publish`)**: Multi-platform publishing coordinator for TikTok, YouTube Shorts, Instagram Reels, and LinkedIn with synchronized publishing time slots.

---

## 🛠️ Architecture & Performance Optimizations

- **Svelte 5 Runes**: Unified reactive state with `$state`, `$derived`, and `$effect` for explicit, fine-grained reactivity.
- **Isolate 60fps Playhead Render Path**: Separated `EditorPlayer` and `EditorTimeline` from inspector panels, eliminating wasteful re-rendering of tabs and menus during playback.
- **Zero Unused Dependencies**: Pruned bloated libraries (`@google/genai`, `express`, `motion`, `tsx`, `autoprefixer`) down to lean native packages.
- **Deterministic Heuristic Engine**: Transparent, test-covered highlight scoring in pure TypeScript with zero black-box flakiness.
