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
        end: 38.0,
        speaker: authorName,
        text: 'Kenapa banyak orang bikin podcast tapi akhirnya berhenti di episode ketiga? Rahasianya ada di konsistensi dan topik obrolan.',
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
          { word: 'Rahasianya', start: 19.5, end: 20.5 },
          { word: 'ada', start: 20.6, end: 21.0 },
          { word: 'di', start: 21.1, end: 21.3 },
          { word: 'kejujuran', start: 21.4, end: 22.2 },
          { word: 'obrolan.', start: 22.3, end: 23.5 },
        ],
      },
      {
        id: `yt-${videoId}-2`,
        start: 42.0,
        end: 72.0,
        speaker: authorName,
        text: 'Rahasia terbesarnya adalah mereka mikirin studio mahal, padahal yang dicari penonton itu sudut pandang dan kejujuran obrolannya.',
        words: [
          { word: 'Rahasia', start: 42.0, end: 42.6 },
          { word: 'terbesarnya', start: 42.7, end: 43.5 },
          { word: 'adalah', start: 43.6, end: 44.0 },
          { word: 'mereka', start: 44.1, end: 44.5 },
          { word: 'mikirin', start: 44.6, end: 45.2 },
          { word: 'studio', start: 45.3, end: 45.8 },
          { word: 'mahal,', start: 45.9, end: 46.5 },
          { word: 'padahal', start: 47.0, end: 47.5 },
          { word: 'yang', start: 47.6, end: 47.8 },
          { word: 'dicari', start: 47.9, end: 48.5 },
          { word: 'penonton', start: 48.6, end: 49.2 },
          { word: 'itu', start: 49.3, end: 49.6 },
          { word: 'kejujuran', start: 50.0, end: 51.0 },
          { word: 'obrolannya.', start: 51.1, end: 52.2 },
        ],
      },
      {
        id: `yt-${videoId}-3`,
        start: 76.0,
        end: 108.0,
        speaker: 'Bintang Tamu',
        text: 'Kalau lu ga punya hook di 5 detik pertama di shorts atau reels, orang bakal langsung scroll dan ga akan peduli seberapa bagus isi obrolan lu.',
        words: [
          { word: 'Kalau', start: 76.0, end: 76.4 },
          { word: 'lu', start: 76.5, end: 76.7 },
          { word: 'ga', start: 76.8, end: 77.0 },
          { word: 'punya', start: 77.1, end: 77.5 },
          { word: 'hook', start: 77.6, end: 78.0 },
          { word: 'di', start: 78.1, end: 78.3 },
          { word: '5', start: 78.4, end: 78.7 },
          { word: 'detik', start: 78.8, end: 79.2 },
          { word: 'pertama,', start: 79.3, end: 80.0 },
          { word: 'orang', start: 80.5, end: 81.0 },
          { word: 'bakal', start: 81.1, end: 81.5 },
          { word: 'langsung', start: 81.6, end: 82.2 },
          { word: 'scroll.', start: 82.3, end: 83.0 },
        ],
      },
      {
        id: `yt-${videoId}-4`,
        start: 115.0,
        end: 148.0,
        speaker: authorName,
        text: 'Kesalahan terbesar konten kreator pemula adalah pengen langsung viral tanpa membangun audiens yang setia sejak awal.',
        words: [
          { word: 'Kesalahan', start: 115.0, end: 115.6 },
          { word: 'terbesar', start: 115.7, end: 116.3 },
          { word: 'kreator', start: 116.4, end: 117.0 },
          { word: 'adalah', start: 117.1, end: 117.5 },
          { word: 'ingin', start: 117.6, end: 118.0 },
          { word: 'langsung', start: 118.1, end: 118.7 },
          { word: 'viral', start: 118.8, end: 119.5 },
          { word: 'tanpa', start: 120.0, end: 120.4 },
          { word: 'fondasi.', start: 120.5, end: 121.5 },
        ],
      },
      {
        id: `yt-${videoId}-5`,
        start: 155.0,
        end: 188.0,
        speaker: 'Bintang Tamu',
        text: 'Ternyata algoritma media sosial sekarang 90 persen melihat tingkat retensi dan durasi tonton penonton, bukan sekadar likes.',
        words: [
          { word: 'Ternyata', start: 155.0, end: 155.6 },
          { word: 'algoritma', start: 155.7, end: 156.4 },
          { word: 'sekarang', start: 156.5, end: 157.0 },
          { word: 'melihat', start: 157.1, end: 157.6 },
          { word: 'retensi', start: 157.7, end: 158.4 },
          { word: 'tonton,', start: 158.5, end: 159.2 },
          { word: 'bukan', start: 159.5, end: 160.0 },
          { word: 'likes.', start: 160.1, end: 161.0 },
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

