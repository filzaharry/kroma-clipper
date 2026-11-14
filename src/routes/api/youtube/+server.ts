import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { VideoSource } from '#lib/types';
import { generateMockWaveform } from '#lib/utils/clippingRules';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== 'string') {
      return json({ error: 'URL YouTube wajib diisi' }, { status: 400 });
    }

    // Match standard, short, embed, or shorts YouTube URLs
    const match = url.match(
      /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/
    );

    if (!match || !match[1]) {
      return json({ error: 'Format link YouTube tidak valid' }, { status: 400 });
    }

    const videoId = match[1];

    // Fetch official YouTube oEmbed metadata
    let title = 'YouTube Video';
    let authorName = 'YouTube Creator';
    let thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

    try {
      const oembedRes = await fetch(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
      );
      if (oembedRes.ok) {
        const oembed = await oembedRes.json();
        title = oembed.title || title;
        authorName = oembed.author_name || authorName;
        thumbnailUrl = oembed.thumbnail_url || thumbnailUrl;
      }
    } catch (e) {
      console.warn('oEmbed fetch error, fallback to videoId:', e);
    }

    // Realistic Indonesian/English podcast transcript cues for highlight detection
    const transcripts = [
      {
        id: `yt-${videoId}-1`,
        start: 12.0,
        end: 28.5,
        speaker: authorName,
        text: 'Kenapa banyak orang bikin podcast tapi akhirnya berhenti di episode ketiga?',
        words: [
          { word: 'Kenapa', start: 12.0, end: 12.5 },
          { word: 'banyak', start: 12.6, end: 13.0 },
          { word: 'orang', start: 13.1, end: 13.5 },
          { word: 'bikin', start: 13.6, end: 14.0 },
          { word: 'podcast', start: 14.1, end: 14.8 },
          { word: 'tapi', start: 15.0, end: 15.3 },
          { word: 'akhirnya', start: 15.4, end: 16.0 },
          { word: 'berhenti', start: 16.1, end: 17.0 },
          { word: 'di', start: 17.1, end: 17.3 },
          { word: 'episode', start: 17.4, end: 18.0 },
          { word: 'ketiga?', start: 18.1, end: 19.0 },
        ],
      },
      {
        id: `yt-${videoId}-2`,
        start: 29.0,
        end: 52.0,
        speaker: authorName,
        text: 'Rahasia terbesarnya adalah mereka mikirin studio mahal, padahal yang dicari penonton itu sudut pandang dan kejujuran obrolannya.',
        words: [
          { word: 'Rahasia', start: 29.0, end: 29.6 },
          { word: 'terbesarnya', start: 29.7, end: 30.5 },
          { word: 'adalah', start: 30.6, end: 31.0 },
          { word: 'mereka', start: 31.1, end: 31.5 },
          { word: 'mikirin', start: 31.6, end: 32.2 },
          { word: 'studio', start: 32.3, end: 32.8 },
          { word: 'mahal,', start: 32.9, end: 33.5 },
          { word: 'padahal', start: 34.0, end: 34.5 },
          { word: 'yang', start: 34.6, end: 34.8 },
          { word: 'dicari', start: 34.9, end: 35.5 },
          { word: 'penonton', start: 35.6, end: 36.2 },
          { word: 'itu', start: 36.3, end: 36.6 },
          { word: 'kejujuran', start: 37.0, end: 38.0 },
          { word: 'obrolannya.', start: 38.1, end: 39.2 },
        ],
      },
      {
        id: `yt-${videoId}-3`,
        start: 53.0,
        end: 78.0,
        speaker: 'Guest',
        text: 'Kalau lu ga punya hook di 5 detik pertama di shorts atau reels, orang bakal langsung scroll dan ga akan peduli seberapa bagus isi obrolan lu.',
        words: [
          { word: 'Kalau', start: 53.0, end: 53.4 },
          { word: 'lu', start: 53.5, end: 53.7 },
          { word: 'ga', start: 53.8, end: 54.0 },
          { word: 'punya', start: 54.1, end: 54.5 },
          { word: 'hook', start: 54.6, end: 55.0 },
          { word: 'di', start: 55.1, end: 55.3 },
          { word: '5', start: 55.4, end: 55.7 },
          { word: 'detik', start: 55.8, end: 56.2 },
          { word: 'pertama,', start: 56.3, end: 57.0 },
          { word: 'orang', start: 57.5, end: 58.0 },
          { word: 'bakal', start: 58.1, end: 58.5 },
          { word: 'langsung', start: 58.6, end: 59.2 },
          { word: 'scroll.', start: 59.3, end: 60.0 },
        ],
      },
    ];

    const video: VideoSource = {
      id: `yt-${videoId}`,
      title,
      fileName: `youtube_${videoId}.mp4`,
      fileSizeBytes: 1048576000, // ~1GB equivalent
      durationSeconds: 1820, // ~30m
      resolution: { width: 1920, height: 1080 },
      fps: 30,
      audioChannels: 2,
      sampleRate: 48000,
      uploadDate: new Date().toISOString().split('T')[0],
      thumbnailUrl,
      status: 'ready',
      waveformPoints: generateMockWaveform(120, videoId.charCodeAt(0) || 42),
      transcripts,
    };

    return json({ video, videoId });
  } catch (err: any) {
    return json({ error: err?.message || 'Gagal memproses URL YouTube' }, { status: 500 });
  }
};

