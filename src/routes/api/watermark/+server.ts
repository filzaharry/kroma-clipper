import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import path from 'path';
import fs from 'fs';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return json({ error: 'File gambar wajib diunggah' }, { status: 400 });
    }

    const uploadsDir = path.resolve(process.cwd(), 'static/uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const originalName = file.name || 'watermark.png';
    const ext = path.extname(originalName).toLowerCase() || '.png';
    const filename = `watermark_${Date.now()}${ext}`;
    const filePath = path.join(uploadsDir, filename);

    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    const publicUrl = `/uploads/${filename}`;
    return json({ success: true, url: publicUrl, filename });
  } catch (err: any) {
    console.error('API watermark upload error:', err);
    return json({ success: false, error: err.message || 'Gagal mengunggah watermark' }, { status: 500 });
  }
};

