import type { RequestHandler } from './$types';
import path from 'path';
import fs from 'fs';

export const GET: RequestHandler = async ({ params, request }) => {
  const { filename } = params;
  const safeFilename = path.basename(filename);
  const filePath = path.resolve(process.cwd(), 'static/cache', safeFilename);

  if (!fs.existsSync(filePath)) {
    return new Response('File preview tidak ditemukan', { status: 404 });
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = request.headers.get('range');

  const ext = path.extname(safeFilename).toLowerCase();
  const contentType =
    ext === '.jpg' || ext === '.jpeg'
      ? 'image/jpeg'
      : ext === '.png'
        ? 'image/png'
        : ext === '.webp'
          ? 'image/webp'
          : ext === '.m4a'
            ? 'audio/mp4'
            : ext === '.webm'
              ? 'video/webm'
              : 'video/mp4';

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    if (isNaN(start) || start >= fileSize || end >= fileSize) {
      return new Response(null, {
        status: 416,
        headers: {
          'Content-Range': `bytes */${fileSize}`,
        },
      });
    }

    const chunksize = end - start + 1;
    const stream = fs.createReadStream(filePath, { start, end });

    return new Response(stream as any, {
      status: 206,
      headers: {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize.toString(),
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, no-transform',
      },
    });
  }

  const stream = fs.createReadStream(filePath);
  return new Response(stream as any, {
    status: 200,
    headers: {
      'Content-Length': fileSize.toString(),
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=86400, no-transform',
    },
  });
};
