import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const data = await request.json();
    const {
      youtubeUrl,
      videoId,
      startTime = 0,
      endTime = 30,
      clipTitle = 'Highlight Clip',
      aspectRatio = '9:16',
      framingLayout = 'crop',
      backgroundStyle = 'dark_blur',
      captionPreset = 'hormozi',
      captionPosition = 'bottom',
      captionMaxLines = 2,
      captionHighlightColor = '#B6F36B',
      panOffset = 0,
      zoomLevel = 1.0,
      captions = [],
    } = data;

    const rawId = videoId ? videoId.replace(/^yt-/, '') : null;
    const targetUrl =
      youtubeUrl || (rawId ? `https://www.youtube.com/watch?v=${rawId}` : null);

    if (!targetUrl) {
      return json({ error: 'URL YouTube wajib disertakan' }, { status: 400 });
    }

    const exportsDir = path.resolve(process.cwd(), 'static/exports');
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }

    const cleanSafeTitle =
      clipTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 40) || 'kroma_clip';

    const outputFilename = `clip_${Date.now()}_${cleanSafeTitle}_${aspectRatio.replace(':', 'x')}.mp4`;
    const outputPath = path.join(exportsDir, outputFilename);

    const scriptPath = path.resolve(process.cwd(), 'backend/render_engine.py');

    // Jalankan mesin render Python FFmpeg
    const args = [
      scriptPath,
      '--url',
      targetUrl,
      '--start',
      String(startTime),
      '--end',
      String(endTime),
      '--output',
      outputPath,
      '--aspect',
      aspectRatio,
      '--framing-layout',
      framingLayout,
      '--background-style',
      backgroundStyle,
      '--preset',
      captionPreset,
      '--position',
      captionPosition,
      '--max-lines',
      String(captionMaxLines),
      '--highlight-color',
      captionHighlightColor,
      '--pan-offset',
      String(panOffset),
      '--zoom-level',
      String(zoomLevel),
      '--captions-json',
      JSON.stringify(captions),
    ];

    await new Promise<void>((resolve, reject) => {
      const child = spawn('python3', args);
      let stderr = '';
      let stdout = '';

      child.stdout.on('data', (d) => {
        stdout += d.toString();
      });

      child.stderr.on('data', (d) => {
        stderr += d.toString();
      });

      child.on('close', (code) => {
        if (code === 0 && fs.existsSync(outputPath)) {
          resolve();
        } else {
          reject(
            new Error(
              `Proses render gagal (kode ${code}): ${stderr || stdout || 'Unknown error'}`
            )
          );
        }
      });
    });

    const stat = fs.statSync(outputPath);
    const finalDownloadName = `${cleanSafeTitle}_${aspectRatio.replace(':', 'x')}.mp4`;
    const downloadUrl = `/api/download/${outputFilename}?title=${encodeURIComponent(finalDownloadName)}`;

    return json({
      success: true,
      downloadUrl,
      staticUrl: `/exports/${outputFilename}`,
      fileName: finalDownloadName,
      fileSizeBytes: stat.size,
    });
  } catch (err: any) {
    console.error('Render API error:', err);
    return json(
      { error: err?.message || 'Gagal merender video klip' },
      { status: 500 }
    );
  }
};

