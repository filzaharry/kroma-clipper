import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|v\/))([\w-]{11})/i);
  if (match) return match[1];
  const rawClean = url.replace(/[^a-zA-Z0-9_-]/g, '');
  return rawClean.length === 11 ? rawClean : null;
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { youtubeUrl } = await request.json();

    if (!youtubeUrl) {
      return json({ error: 'URL video YouTube musik wajib disertakan' }, { status: 400 });
    }

    const cleanId = extractYouTubeId(youtubeUrl);
    if (!cleanId) {
      return json({ error: 'Format link YouTube musik tidak valid' }, { status: 400 });
    }

    const cacheDir = path.resolve(process.cwd(), 'static/cache');
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    const filename = `bgm_${cleanId}.m4a`;
    const filePath = path.join(cacheDir, filename);
    const publicUrl = `/cache/${filename}`;

    // 1. Cek apakah file audio BGM sudah pernah diekstrak dan tersimpan di cache
    if (fs.existsSync(filePath)) {
      const stat = fs.statSync(filePath);
      if (stat.size > 20000) {
        return json({
          success: true,
          audioUrl: publicUrl,
          cached: true,
          videoId: cleanId,
          title: `BGM #${cleanId}`,
        });
      }
    }

    // 2. Unduh dan ekstrak audio dari YouTube menggunakan yt-dlp
    const targetUrl = `https://www.youtube.com/watch?v=${cleanId}`;
    const args = [
      '-x',
      '--audio-format',
      'm4a',
      '--audio-quality',
      '0',
      '--no-playlist',
      '-o',
      filePath,
      targetUrl,
    ];

    let title = `BGM #${cleanId}`;

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
          reject(new Error(`Gagal mengunduh audio BGM (code ${code}): ${stderr}`));
        }
      });

      child.on('error', (err) => {
        reject(err);
      });
    });

    return json({
      success: true,
      audioUrl: publicUrl,
      cached: false,
      videoId: cleanId,
      title,
    });
  } catch (err: any) {
    console.error('API BGM extraction error:', err);
    return json({ success: false, error: err.message || 'Gagal memproses musik dari YouTube' }, { status: 500 });
  }
};

