#!/usr/bin/env python3
"""
Kroma Clip - FastAPI Background Video Processing Service
Bridges SvelteKit UI to Python yt-dlp + FFmpeg rendering engine.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os

from render_engine import VideoClipRenderer
from hook_detector import analyze_transcript_for_hooks

app = FastAPI(title="Kroma Clip Video Processing Engine", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

renderer = VideoClipRenderer(output_dir="rendered_output")

class RenderRequest(BaseModel):
    youtube_url: str
    start_time: float
    end_time: float
    aspect_ratio: str = "9:16"
    caption_preset: str = "hormozi"
    captions: List[dict] = []
    watermark_path: Optional[str] = None

@app.get("/health")
def health():
    return {"status": "ok", "engine": "Python + yt-dlp + FFmpeg"}

@app.post("/api/render")
def render_clip(req: RenderRequest):
    duration = req.end_time - req.start_time
    if duration <= 0:
        raise HTTPException(status_code=400, detail="Invalid start/end time duration.")

    temp_raw = os.path.join(renderer.output_dir, "temp_raw.mp4")
    output_filename = f"clip_{int(req.start_time)}_{int(req.end_time)}_{req.aspect_ratio.replace(':', 'x')}.mp4"
    final_output = os.path.join(renderer.output_dir, output_filename)

    # 1. Download segment via yt-dlp
    dl_success = renderer.download_youtube_segment(
        youtube_url=req.youtube_url,
        start_sec=req.start_time,
        duration_sec=duration,
        output_path=temp_raw
    )

    if not dl_success:
        raise HTTPException(status_code=500, detail="Failed to fetch YouTube stream.")

    # 2. Generate ASS Subtitles
    ass_path = None
    if req.captions:
        ass_path = renderer.generate_ass_subtitles(req.captions, req.caption_preset)

    # 3. FFmpeg Render: 9:16 Crop + Subtitles + Watermark
    render_success = renderer.render_clip(
        input_video_path=temp_raw,
        output_clip_path=final_output,
        aspect_ratio=req.aspect_ratio,
        ass_subtitles_path=ass_path,
        watermark_path=req.watermark_path
    )

    if not render_success:
        raise HTTPException(status_code=500, detail="FFmpeg rendering error.")

    return {
        "status": "success",
        "clip_file": output_filename,
        "full_path": os.path.abspath(final_output)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
