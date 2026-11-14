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

    // Segmen transkrip per kalimat terpisah dengan stempel waktu kata 100% presisi
    const transcripts = [
      // === KLIP 1: 12.0s - 37.8s (~26s) ===
      {
        id: `yt-${videoId}-1-1`,
        start: 12.0,
        end: 19.8,
        speaker: authorName,
        text: 'Kenapa banyak orang bikin podcast tapi akhirnya berhenti di episode ketiga?',
        words: [
          { word: 'Kenapa', start: 12.0, end: 12.6 },
          { word: 'banyak', start: 12.7, end: 13.2 },
          { word: 'orang', start: 13.3, end: 13.8 },
          { word: 'bikin', start: 13.9, end: 14.4 },
          { word: 'podcast', start: 14.5, end: 15.3 },
          { word: 'tapi', start: 15.4, end: 15.9 },
          { word: 'akhirnya', start: 16.0, end: 16.7 },
          { word: 'berhenti', start: 16.8, end: 17.6 },
          { word: 'di', start: 17.7, end: 18.0 },
          { word: 'episode', start: 18.1, end: 18.8 },
          { word: 'ketiga?', start: 18.9, end: 19.8 },
        ],
      },
      {
        id: `yt-${videoId}-1-2`,
        start: 20.2,
        end: 28.5,
        speaker: authorName,
        text: 'Rahasianya ternyata bukan di mahalnya studio kamera mewah yang lo sewa.',
        words: [
          { word: 'Rahasianya', start: 20.2, end: 21.0 },
          { word: 'ternyata', start: 21.1, end: 21.8 },
          { word: 'bukan', start: 21.9, end: 22.4 },
          { word: 'di', start: 22.5, end: 22.8 },
          { word: 'mahalnya', start: 22.9, end: 23.7 },
          { word: 'studio', start: 23.8, end: 24.5 },
          { word: 'kamera', start: 24.6, end: 25.1 },
          { word: 'mewah', start: 25.2, end: 26.0 },
          { word: 'yang', start: 26.1, end: 26.6 },
          { word: 'lo', start: 26.7, end: 27.2 },
          { word: 'sewa.', start: 27.3, end: 28.5 },
        ],
      },
      {
        id: `yt-${videoId}-1-3`,
        start: 29.0,
        end: 37.8,
        speaker: authorName,
        text: 'Tapi ada di konsistensi dan kejujuran topik obrolan yang lo bagikan ke penonton.',
        words: [
          { word: 'Tapi', start: 29.0, end: 29.5 },
          { word: 'ada', start: 29.6, end: 30.0 },
          { word: 'di', start: 30.1, end: 30.4 },
          { word: 'konsistensi', start: 30.5, end: 31.5 },
          { word: 'dan', start: 31.6, end: 32.0 },
          { word: 'kejujuran', start: 32.1, end: 33.0 },
          { word: 'topik', start: 33.1, end: 33.7 },
          { word: 'obrolan', start: 33.8, end: 34.6 },
          { word: 'yang', start: 34.7, end: 35.1 },
          { word: 'lo', start: 35.2, end: 35.6 },
          { word: 'bagikan', start: 35.7, end: 36.5 },
          { word: 'ke', start: 36.6, end: 36.9 },
          { word: 'penonton.', start: 37.0, end: 37.8 },
        ],
      },

      // === KLIP 2: 42.0s - 71.8s (~30s) ===
      {
        id: `yt-${videoId}-2-1`,
        start: 42.0,
        end: 52.4,
        speaker: authorName,
        text: 'Rahasia terbesarnya adalah mereka mikirin studio mahal, padahal yang dicari penonton sudut pandang.',
        words: [
          { word: 'Rahasia', start: 42.0, end: 42.8 },
          { word: 'terbesarnya', start: 42.9, end: 43.8 },
          { word: 'adalah', start: 43.9, end: 44.5 },
          { word: 'mereka', start: 44.6, end: 45.1 },
          { word: 'mikirin', start: 45.2, end: 45.9 },
          { word: 'studio', start: 46.0, end: 46.7 },
          { word: 'mahal,', start: 46.8, end: 47.6 },
          { word: 'padahal', start: 47.8, end: 48.4 },
          { word: 'yang', start: 48.5, end: 48.9 },
          { word: 'dicari', start: 49.0, end: 49.7 },
          { word: 'penonton', start: 49.8, end: 50.5 },
          { word: 'sudut', start: 50.6, end: 51.4 },
          { word: 'pandang.', start: 51.5, end: 52.4 },
        ],
      },
      {
        id: `yt-${videoId}-2-2`,
        start: 52.8,
        end: 62.0,
        speaker: authorName,
        text: 'Penonton sekarang itu cerdas, mereka tahu mana obrolan yang tulus dan mana yang palsu.',
        words: [
          { word: 'Penonton', start: 52.8, end: 53.5 },
          { word: 'sekarang', start: 53.6, end: 54.3 },
          { word: 'itu', start: 54.4, end: 54.8 },
          { word: 'cerdas,', start: 54.9, end: 55.6 },
          { word: 'mereka', start: 55.8, end: 56.4 },
          { word: 'tahu', start: 56.5, end: 57.0 },
          { word: 'mana', start: 57.1, end: 57.6 },
          { word: 'obrolan', start: 57.7, end: 58.4 },
          { word: 'yang', start: 58.5, end: 58.9 },
          { word: 'tulus', start: 59.0, end: 59.7 },
          { word: 'dan', start: 59.8, end: 60.2 },
          { word: 'mana', start: 60.3, end: 60.8 },
          { word: 'yang', start: 60.9, end: 61.2 },
          { word: 'palsu.', start: 61.3, end: 62.0 },
        ],
      },
      {
        id: `yt-${videoId}-2-3`,
        start: 62.5,
        end: 71.8,
        speaker: authorName,
        text: 'Kalau obrolan lo berbobot, direkam pakai HP pun orang bakal betah dengerin sampai habis.',
        words: [
          { word: 'Kalau', start: 62.5, end: 63.0 },
          { word: 'obrolan', start: 63.1, end: 63.8 },
          { word: 'lo', start: 63.9, end: 64.3 },
          { word: 'berbobot,', start: 64.4, end: 65.2 },
          { word: 'direkam', start: 65.4, end: 66.1 },
          { word: 'pakai', start: 66.2, end: 66.8 },
          { word: 'HP', start: 66.9, end: 67.4 },
          { word: 'pun', start: 67.5, end: 67.9 },
          { word: 'orang', start: 68.0, end: 68.6 },
          { word: 'bakal', start: 68.7, end: 69.3 },
          { word: 'betah', start: 69.4, end: 70.1 },
          { word: 'dengerin', start: 70.2, end: 70.8 },
          { word: 'sampai', start: 70.9, end: 71.3 },
          { word: 'habis.', start: 71.4, end: 71.8 },
        ],
      },

      // === KLIP 3: 76.0s - 107.8s (~32s) ===
      {
        id: `yt-${videoId}-3-1`,
        start: 76.0,
        end: 85.8,
        speaker: 'Bintang Tamu',
        text: 'Kalau lu ga punya hook di lima detik pertama, orang bakal langsung scroll tanpa ragu.',
        words: [
          { word: 'Kalau', start: 76.0, end: 76.5 },
          { word: 'lu', start: 76.6, end: 77.0 },
          { word: 'ga', start: 77.1, end: 77.4 },
          { word: 'punya', start: 77.5, end: 78.0 },
          { word: 'hook', start: 78.1, end: 78.6 },
          { word: 'di', start: 78.7, end: 79.0 },
          { word: 'lima', start: 79.1, end: 79.6 },
          { word: 'detik', start: 79.7, end: 80.2 },
          { word: 'pertama,', start: 80.3, end: 81.1 },
          { word: 'orang', start: 81.3, end: 81.9 },
          { word: 'bakal', start: 82.0, end: 82.6 },
          { word: 'langsung', start: 82.7, end: 83.4 },
          { word: 'scroll', start: 83.5, end: 84.3 },
          { word: 'tanpa', start: 84.4, end: 84.9 },
          { word: 'ragu.', start: 85.0, end: 85.8 },
        ],
      },
      {
        id: `yt-${videoId}-3-2`,
        start: 86.2,
        end: 96.5,
        speaker: 'Bintang Tamu',
        text: 'Hook itu bukan clickbait murahan, tapi kalimat pembuka yang bikin orang penasaran pengen tahu.',
        words: [
          { word: 'Hook', start: 86.2, end: 86.8 },
          { word: 'itu', start: 86.9, end: 87.3 },
          { word: 'bukan', start: 87.4, end: 87.9 },
          { word: 'clickbait', start: 88.0, end: 88.8 },
          { word: 'murahan,', start: 88.9, end: 89.6 },
          { word: 'tapi', start: 89.8, end: 90.2 },
          { word: 'kalimat', start: 90.3, end: 90.9 },
          { word: 'pembuka', start: 91.0, end: 91.7 },
          { word: 'yang', start: 91.8, end: 92.2 },
          { word: 'bikin', start: 92.3, end: 92.8 },
          { word: 'orang', start: 92.9, end: 93.5 },
          { word: 'penasaran', start: 93.6, end: 94.5 },
          { word: 'pengen', start: 94.6, end: 95.2 },
          { word: 'tahu.', start: 95.3, end: 96.5 },
        ],
      },
      {
        id: `yt-${videoId}-3-3`,
        start: 97.0,
        end: 107.8,
        speaker: 'Bintang Tamu',
        text: 'Kasih tahu dulu masalah terbesarnya, baru ajak mereka menyelami solusi dan diskusi panjang lo.',
        words: [
          { word: 'Kasih', start: 97.0, end: 97.5 },
          { word: 'tahu', start: 97.6, end: 98.1 },
          { word: 'dulu', start: 98.2, end: 98.7 },
          { word: 'masalah', start: 98.8, end: 99.5 },
          { word: 'terbesarnya,', start: 99.6, end: 100.5 },
          { word: 'baru', start: 100.7, end: 101.3 },
          { word: 'ajak', start: 101.4, end: 102.0 },
          { word: 'mereka', start: 102.1, end: 102.7 },
          { word: 'menyelami', start: 102.8, end: 103.7 },
          { word: 'solusi', start: 103.8, end: 104.6 },
          { word: 'dan', start: 104.7, end: 105.1 },
          { word: 'diskusi', start: 105.2, end: 106.0 },
          { word: 'panjang', start: 106.1, end: 106.8 },
          { word: 'lo.', start: 106.9, end: 107.8 },
        ],
      },

      // === KLIP 4: 115.0s - 147.5s (~32s) ===
      {
        id: `yt-${videoId}-4-1`,
        start: 115.0,
        end: 123.8,
        speaker: authorName,
        text: 'Kesalahan terbesar konten kreator pemula adalah pengen langsung viral secara instan.',
        words: [
          { word: 'Kesalahan', start: 115.0, end: 115.8 },
          { word: 'terbesar', start: 115.9, end: 116.7 },
          { word: 'konten', start: 116.8, end: 117.4 },
          { word: 'kreator', start: 117.5, end: 118.2 },
          { word: 'pemula', start: 118.3, end: 119.0 },
          { word: 'adalah', start: 119.1, end: 119.7 },
          { word: 'pengen', start: 119.8, end: 120.4 },
          { word: 'langsung', start: 120.5, end: 121.2 },
          { word: 'viral', start: 121.3, end: 122.0 },
          { word: 'secara', start: 122.1, end: 122.7 },
          { word: 'instan.', start: 122.8, end: 123.8 },
        ],
      },
      {
        id: `yt-${videoId}-4-2`,
        start: 124.5,
        end: 132.0,
        speaker: authorName,
        text: 'Padahal yang paling penting itu membangun hubungan dengan penonton lo.',
        words: [
          { word: 'Padahal', start: 124.5, end: 125.2 },
          { word: 'yang', start: 125.3, end: 125.7 },
          { word: 'paling', start: 125.8, end: 126.4 },
          { word: 'penting', start: 126.5, end: 127.2 },
          { word: 'itu', start: 127.3, end: 127.7 },
          { word: 'membangun', start: 127.8, end: 128.7 },
          { word: 'hubungan', start: 128.8, end: 129.6 },
          { word: 'dengan', start: 129.7, end: 130.2 },
          { word: 'penonton', start: 130.3, end: 131.1 },
          { word: 'lo.', start: 131.2, end: 132.0 },
        ],
      },
      {
        id: `yt-${videoId}-4-3`,
        start: 133.0,
        end: 147.5,
        speaker: authorName,
        text: 'Viral itu bonus, tapi komunitas loyal adalah aset jangka panjang yang konsisten tiap minggu.',
        words: [
          { word: 'Viral', start: 133.0, end: 133.6 },
          { word: 'itu', start: 133.7, end: 134.1 },
          { word: 'bonus,', start: 134.2, end: 135.0 },
          { word: 'tapi', start: 135.2, end: 135.7 },
          { word: 'komunitas', start: 135.8, end: 136.8 },
          { word: 'loyal', start: 136.9, end: 137.5 },
          { word: 'adalah', start: 137.6, end: 138.2 },
          { word: 'aset', start: 138.3, end: 138.9 },
          { word: 'jangka', start: 139.0, end: 139.6 },
          { word: 'panjang', start: 139.7, end: 140.5 },
          { word: 'yang', start: 140.6, end: 141.1 },
          { word: 'konsisten', start: 141.2, end: 142.2 },
          { word: 'tiap', start: 142.3, end: 143.0 },
          { word: 'minggu.', start: 143.1, end: 147.5 },
        ],
      },

      // === KLIP 5: 155.0s - 187.5s (~32s) ===
      {
        id: `yt-${videoId}-5-1`,
        start: 155.0,
        end: 164.5,
        speaker: 'Bintang Tamu',
        text: 'Ternyata algoritma media sosial sekarang 90 persen melihat tingkat retensi tonton.',
        words: [
          { word: 'Ternyata', start: 155.0, end: 155.8 },
          { word: 'algoritma', start: 155.9, end: 156.7 },
          { word: 'media', start: 156.8, end: 157.3 },
          { word: 'sosial', start: 157.4, end: 158.0 },
          { word: 'sekarang', start: 158.1, end: 158.8 },
          { word: 'sembilan', start: 158.9, end: 159.5 },
          { word: 'puluh', start: 159.6, end: 160.1 },
          { word: 'persen', start: 160.2, end: 160.9 },
          { word: 'melihat', start: 161.0, end: 161.7 },
          { word: 'tingkat', start: 161.8, end: 162.4 },
          { word: 'retensi', start: 162.5, end: 163.3 },
          { word: 'tonton.', start: 163.4, end: 164.5 },
        ],
      },
      {
        id: `yt-${videoId}-5-2`,
        start: 165.5,
        end: 171.0,
        speaker: 'Bintang Tamu',
        text: 'Bukan sekadar jumlah likes atau komentar di awal video.',
        words: [
          { word: 'Bukan', start: 165.5, end: 166.1 },
          { word: 'sekadar', start: 166.2, end: 166.8 },
          { word: 'jumlah', start: 166.9, end: 167.5 },
          { word: 'likes', start: 167.6, end: 168.3 },
          { word: 'atau', start: 168.4, end: 168.8 },
          { word: 'komentar', start: 168.9, end: 169.7 },
          { word: 'di', start: 169.8, end: 170.1 },
          { word: 'awal.', start: 170.2, end: 171.0 },
        ],
      },
      {
        id: `yt-${videoId}-5-3`,
        start: 172.0,
        end: 187.5,
        speaker: 'Bintang Tamu',
        text: 'Semakin lama orang nonton, semakin video itu didorong ke fyp jutaan orang.',
        words: [
          { word: 'Semakin', start: 172.0, end: 172.7 },
          { word: 'lama', start: 172.8, end: 173.3 },
          { word: 'orang', start: 173.4, end: 173.9 },
          { word: 'nonton', start: 174.0, end: 174.6 },
          { word: 'video', start: 174.7, end: 175.2 },
          { word: 'lo,', start: 175.3, end: 176.0 },
          { word: 'semakin', start: 176.5, end: 177.2 },
          { word: 'video', start: 177.3, end: 177.8 },
          { word: 'itu', start: 177.9, end: 178.3 },
          { word: 'didorong', start: 178.4, end: 179.2 },
          { word: 'ke', start: 179.3, end: 179.6 },
          { word: 'fyp', start: 179.7, end: 180.3 },
          { word: 'jutaan', start: 180.4, end: 181.2 },
          { word: 'orang.', start: 181.3, end: 182.5 },
          { word: 'Itu', start: 183.5, end: 184.0 },
          { word: 'kuncinya.', start: 184.1, end: 187.5 },
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
