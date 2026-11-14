# Kroma Clip — Python Media & Render Engine

Layanan backend headless berkinerja tinggi untuk memproses klip video YouTube secara otomatis tanpa database:
1. **Direct Stream Download & Slice** (`yt-dlp` + `ffmpeg`) langsung dari URL YouTube tanpa mendownload full video raksasa ke disk jika hanya memotong segmen pendek.
2. **AI Hook & Transcript Analysis** (`faster-whisper` + heuristic density analyzer) untuk mendeteksi bagian paling engaging, retention spike, dan transkrip kata-per-kata.
3. **Kinetic Caption Generator** (Hormozi / Clean style via Advanced SubStation Alpha `.ass` subtitles).
4. **9:16 Vertical Smart Crop & Watermark Overlay** menggunakan FFmpeg complex filtergraph (`crop`, `scale`, `overlay`).
5. **FastAPI Microservice** untuk integrasi dengan frontend SvelteKit.

---

## Prasyarat Sistem
- **Python 3.10+**
- **FFmpeg 5.0+** terpasang di sistem (`brew install ffmpeg` di macOS atau `sudo apt install ffmpeg` di Ubuntu/Debian)

---

## Instalasi Dependencies

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

---

## Menjalankan Server API

```bash
uvicorn api_server:app --host 0.0.0.0 --port 8000 --reload
```

Dokumentasi Swagger API interaktif otomatis aktif di:
`http://localhost:8000/docs`

---

## Endpoint API Utama

- `GET /health`: Health check status engine FFmpeg & yt-dlp.
- `POST /api/analyze-hooks`: Menganalisis URL YouTube/transkrip dan mengembalikan segmen klip terbaik berdasar skor hook, speech density, dan emosi pembicara.
- `POST /api/render`: Memotong video dari YouTube, mengubah rasio jadi 9:16 (Shorts/TikTok/Reels), membakar subtitle kinetic otomatis, dan menempelkan watermark.
