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
    const startSec = Math.max(0, Math.round(Number(startTime) * 10) / 10);
    const endSec = Math.max(startSec + 2, Math.round(Number(endTime) * 10) / 10);

    const cacheDir = path.resolve(process.cwd(), 'static/cache');
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    const filename = `preview_${validYtId}_${startSec.toFixed(1)}_${endSec.toFixed(1)}.mp4`;
    const filePath = path.join(cacheDir, filename);
    const publicUrl = `/cache/${filename}`;

    // 1. Cek apakah file MP4 cache untuk segmen ini sudah ada dan valid
    if (fs.existsSync(filePath)) {
      const stat = fs.statSync(filePath);
      if (stat.size > 20000) {
        return json({ success: true, url: publicUrl, cached: true });
      } else {
        // Hapus file rusak / 0 bytes dari percobaan sebelumnya
        try {
          fs.unlinkSync(filePath);
        } catch {}
      }
    }

    // 2. Deteksi runtime node untuk yt-dlp jika tersedia
    const nodeBin = fs.existsSync('/usr/bin/node')
      ? '/usr/bin/node'
      : fs.existsSync('/usr/local/bin/node')
        ? '/usr/local/bin/node'
        : null;

    // 3. Unduh potongan klip cepat menggunakan yt-dlp dengan batas waktu desimal presisi
    const youtubeUrl = `https://www.youtube.com/watch?v=${validYtId}`;
    const args = [
      '--download-sections',
      `*${startSec.toFixed(2)}-${endSec.toFixed(2)}`,
      '-f',
      'bv*[vcodec^=avc][height<=720]+ba[acodec^=mp4a]/bv*[height<=720]+ba/b[height<=720]/bv*+ba/b',
      '--merge-output-format',
      'mp4',
      '--force-keyframes-at-cuts',
      '--no-playlist',
    ];

    if (nodeBin) {
      args.push('--js-runtimes', `node:${nodeBin}`);
    }

    args.push('-o', filePath, youtubeUrl);

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
