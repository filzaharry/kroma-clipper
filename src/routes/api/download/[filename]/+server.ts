import type { RequestHandler } from './$types';
import path from 'path';
import fs from 'fs';

export const GET: RequestHandler = async ({ params, url }) => {
  const { filename } = params;
  const safeFilename = path.basename(filename);
  const filePath = path.resolve(process.cwd(), 'static/exports', safeFilename);

  if (!fs.existsSync(filePath)) {
    return new Response('File video tidak ditemukan', { status: 404 });
  }

  const stat = fs.statSync(filePath);
  const fileStream = fs.createReadStream(filePath);

  const titleQuery = url.searchParams.get('title') || safeFilename;
  const downloadName = titleQuery.endsWith('.mp4') ? titleQuery : `${titleQuery}.mp4`;

  return new Response(fileStream as any, {
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Length': stat.size.toString(),
      'Content-Disposition': `attachment; filename="${downloadName}"`,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-cache',
    },
  });
};

