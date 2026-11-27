import type { RequestHandler } from './$types';
import path from 'path';
import fs from 'fs';

export const GET: RequestHandler = async ({ params }) => {
  const { filename } = params;
  const safeFilename = path.basename(filename);
  const filePath = path.resolve(process.cwd(), 'static/cache/thumbnails', safeFilename);

  if (!fs.existsSync(filePath)) {
    return new Response('Thumbnail tidak ditemukan', { status: 404 });
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const ext = path.extname(safeFilename).toLowerCase();
  const contentType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';

  const stream = fs.createReadStream(filePath);
  return new Response(stream as any, {
    status: 200,
    headers: {
      'Content-Length': fileSize.toString(),
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=604800, immutable',
    },
  });
};
