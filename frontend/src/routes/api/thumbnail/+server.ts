import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const data = await request.json();
    const {
      videoId,
      startTime = 0,
      endTime = 30,
      title = 'Viral Moment',
      quote = '',
      speaker = 'Podcast',
      score = 85,
    } = data;

    if (!videoId) {
      return json({ error: 'videoId wajib disertakan' }, { status: 400 });
    }

    const rawId = videoId.replace(/^yt-/, '');
    const cleanId = rawId.replace(/[^a-zA-Z0-9_-]/g, '');
    const validYtId = cleanId.length === 11 ? cleanId : 'wsCBMCa_DBA';
    const startSec = Math.max(0, Math.round(Number(startTime) * 10) / 10);
    const endSec = Math.max(startSec + 2, Math.round(Number(endTime) * 10) / 10);

    const thumbnailsDir = path.resolve(process.cwd(), 'static/cache/thumbnails');
    if (!fs.existsSync(thumbnailsDir)) {
      fs.mkdirSync(thumbnailsDir, { recursive: true });
    }

    // Check if thumbnail files already exist in cache
    const cachedFiles = [
      `thumb_${validYtId}_${Math.floor(startSec)}_${Math.floor(endSec)}_viral_hormozi.jpg`,
      `thumb_${validYtId}_${Math.floor(startSec)}_${Math.floor(endSec)}_cinematic_podcast.jpg`,
      `thumb_${validYtId}_${Math.floor(startSec)}_${Math.floor(endSec)}_shock_revelation.jpg`,
    ];

    const allCached = cachedFiles.every((fn) => {
      const p = path.join(thumbnailsDir, fn);
      return fs.existsSync(p) && fs.statSync(p).size > 10000;
    });

    if (allCached) {
      return json({
        success: true,
        cached: true,
        thumbnails: [
          {
            id: 0,
            styleKey: 'viral_hormozi',
            title: 'Frame Hook Utama (Rasa Penasaran)',
            tag: 'Paling Disarankan',
            badgeColor: 'bg-[#B6F36B] text-[#111315]',
            filename: cachedFiles[0],
            url: `/cache/thumbnails/${cachedFiles[0]}`,
          },
          {
            id: 1,
            styleKey: 'cinematic_podcast',
            title: 'Frame Puncak Energi & Reaksi',
            tag: 'Dinamis',
            badgeColor: 'bg-[#F59E0B] text-[#111315]',
            filename: cachedFiles[1],
            url: `/cache/thumbnails/${cachedFiles[1]}`,
          },
          {
            id: 2,
            styleKey: 'shock_revelation',
            title: 'Frame Punchline Vertikal 9:16',
            tag: `Skor ${score}`,
            badgeColor: 'bg-[#3B82F6] text-white',
            filename: cachedFiles[2],
            url: `/cache/thumbnails/${cachedFiles[2]}`,
          },
        ],
      });
    }

    // Locate Python thumbnail engine
    const possibleScriptPaths = [
      path.resolve(process.cwd(), '../backend/thumbnail_engine.py'),
      path.resolve(process.cwd(), 'backend/thumbnail_engine.py'),
      path.resolve(process.cwd(), '../../backend/thumbnail_engine.py'),
    ];
    const scriptPath = possibleScriptPaths.find((p) => fs.existsSync(p));

    if (!scriptPath) {
      return json({ error: 'thumbnail_engine.py tidak ditemukan' }, { status: 500 });
    }

    // Check for existing local preview video file in static/cache
    const cacheDir = path.resolve(process.cwd(), 'static/cache');
    let localVideoPath: string | null = null;
    const exactPreviewName = `preview_${validYtId}_${startSec.toFixed(1)}_${endSec.toFixed(1)}.mp4`;
    const exactPreviewPath = path.join(cacheDir, exactPreviewName);

    if (fs.existsSync(exactPreviewPath) && fs.statSync(exactPreviewPath).size > 20000) {
      localVideoPath = exactPreviewPath;
    } else if (fs.existsSync(cacheDir)) {
      // Find any preview file matching this videoId
      const matches = fs.readdirSync(cacheDir).filter((f) => f.startsWith(`preview_${validYtId}`) && f.endsWith('.mp4'));
      if (matches.length > 0) {
        localVideoPath = path.join(cacheDir, matches[0]);
      }
    }

    const args = [
      scriptPath,
      '--video-id', validYtId,
      '--start', String(startSec),
      '--end', String(endSec),
      '--title', String(title),
      '--quote', String(quote || title),
      '--speaker', String(speaker || 'Podcast'),
      '--score', String(score || 85),
      '--output-dir', thumbnailsDir,
      '--fallback-url', `https://i.ytimg.com/vi/${validYtId}/hqdefault.jpg`,
    ];

    if (localVideoPath) {
      args.push('--local-video', localVideoPath);
    }

    const pythonBin = fs.existsSync('/usr/bin/python3')
      ? '/usr/bin/python3'
      : fs.existsSync('/usr/local/bin/python3')
        ? '/usr/local/bin/python3'
        : 'python3';

    const child = spawn(pythonBin, args);
    let stdoutData = '';
    let stderrData = '';

    child.stdout.on('data', (d) => {
      stdoutData += d.toString();
    });

    child.stderr.on('data', (d) => {
      stderrData += d.toString();
    });

    const exitCode = await new Promise<number>((resolve) => {
      child.on('close', (code) => resolve(code ?? 0));
      child.on('error', (err) => {
        console.error('Child process error:', err);
        resolve(1);
      });
    });

    if (exitCode !== 0) {
      console.error('thumbnail_engine.py error:', stderrData);
      return json({ error: `Gagal men-generate thumbnail: ${stderrData}` }, { status: 500 });
    }

    let parsedResult: any = {};
    try {
      parsedResult = JSON.parse(stdoutData.trim());
    } catch {
      // Fallback response with filenames
      parsedResult = {
        success: true,
        thumbnails: [
          {
            id: 0,
            styleKey: 'viral_hormozi',
            title: 'Frame Hook Utama (Rasa Penasaran)',
            tag: 'Paling Disarankan',
            badgeColor: 'bg-[#B6F36B] text-[#111315]',
            filename: cachedFiles[0],
            url: `/cache/thumbnails/${cachedFiles[0]}`,
          },
          {
            id: 1,
            styleKey: 'cinematic_podcast',
            title: 'Frame Puncak Energi & Reaksi',
            tag: 'Dinamis',
            badgeColor: 'bg-[#F59E0B] text-[#111315]',
            filename: cachedFiles[1],
            url: `/cache/thumbnails/${cachedFiles[1]}`,
          },
          {
            id: 2,
            styleKey: 'shock_revelation',
            title: 'Frame Punchline Vertikal 9:16',
            tag: `Skor ${score}`,
            badgeColor: 'bg-[#3B82F6] text-white',
            filename: cachedFiles[2],
            url: `/cache/thumbnails/${cachedFiles[2]}`,
          },
        ],
      };
    }

    return json({
      success: true,
      cached: false,
      thumbnails: (parsedResult.thumbnails || []).map((t: any, i: number) => ({
        ...t,
        badgeColor:
          i === 0
            ? 'bg-[#B6F36B] text-[#111315]'
            : i === 1
              ? 'bg-[#F59E0B] text-[#111315]'
              : 'bg-[#3B82F6] text-white',
      })),
    });
  } catch (err: any) {
    console.error('API /api/thumbnail error:', err);
    return json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
};
