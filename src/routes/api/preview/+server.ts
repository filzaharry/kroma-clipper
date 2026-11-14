import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { videoId, startTime = 0, endTime = 30 } = await request.json();

    if (!videoId) {
      return json({ error: 'videoId wajib disertakan' }, { status: 400 });
    }

    const rawId = videoId.replace(/^yt-/, '');
    const cleanId = rawId.replace(/[^a-zA-Z0-9_-]/g, '');
    const validYtId = cleanId.length === 11 ? cleanId : 'wsCBMCa_DBA';
    const startSec = Math.max(0, Math.floor(Number(startTime)));
    const endSec = Math.max(startSec + 2, Math.ceil(Number(endTime)));

    const cacheDir = path.resolve(process.cwd(), 'static/cache');
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    const filename = `preview_${validYtId}_${startSec}_${endSec}.mp4`;
    const filePath = path.join(cacheDir, filename);
    const publicUrl = `/cache/${filename}`;

    // 1. Cek apakah file MP4 cache untuk segmen ini sudah ada
    if (fs.existsSync(filePath)) {
      const stat = fs.statSync(filePath);
      if (stat.size > 50000) {
        return json({ success: true, url: publicUrl, cached: true });
      }
    }

    // 2. Unduh potongan klip cepat menggunakan yt-dlp secara lokal
    const youtubeUrl = `https://www.youtube.com/watch?v=${validYtId}`;
    const args = [
      '--download-sections',
      `*${startSec}-${endSec}`,
      '-f',
      '18/best[height<=480]/best[ext=mp4]/best',
      '--force-keyframes-at-cuts',
      '-o',
      filePath,
      youtubeUrl,
    ];

    await new Promise<void>((resolve, reject) => {
      const child = spawn('yt-dlp', args);
      let stderr = '';

      child.stderr.on('data', (d) => {
        stderr += d.toString();
      });

      child.on('close', (code) => {
        if (code === 0 && fs.existsSync(filePath)) {
          resolve();
        } else {
          reject(new Error(`yt-dlp preview error (code ${code}): ${stderr}`));
        }
      });

      child.on('error', (err) => {
        reject(err);
      });
    });

    return json({ success: true, url: publicUrl, cached: false });
  } catch (err: any) {
    console.error('API preview error:', err);
    return json({ success: false, error: err.message || 'Gagal memproses video preview' }, { status: 500 });
  }
};

