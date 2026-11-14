#!/usr/bin/env python3
"""
Kroma Clip - Production FFmpeg & Python Video Rendering Engine
Handles:
1. YouTube video slice downloading via yt-dlp
2. Dynamic 9:16 vertical smart-cropping
3. Kinetic typography subtitle burning (Hormozi / Karaoke style via ASS subtitles)
4. Automatic watermark overlay positioning
5. High-speed H.264/AAC MP4 encoding
"""

import os
import sys
import json
import subprocess
from typing import List, Dict, Optional

class VideoClipRenderer:
    def __init__(self, output_dir: str = "output_clips"):
        self.output_dir = output_dir
        os.makedirs(self.output_dir, exist_ok=True)

    def download_youtube_segment(self, youtube_url: str, start_sec: float, duration_sec: float, output_path: str) -> bool:
        """
        Uses yt-dlp with ffmpeg stream-slicing to download ONLY the needed segment
        without downloading the full multi-gigabyte video.
        """
        print(f"[1/4] Downloading YouTube segment: {start_sec}s - {start_sec + duration_sec}s...")
        
        # yt-dlp download-sections command
        cmd = [
            "yt-dlp",
            "--download-sections", f"*{start_sec}-{start_sec + duration_sec}",
            "--force-keyframes-at-cuts",
            "-f", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
            "-o", output_path,
            youtube_url
        ]

        try:
            subprocess.run(cmd, check=True)
            return os.path.exists(output_path)
        except Exception as e:
            print(f"Error downloading YouTube segment: {e}", file=sys.stderr)
            return False

    def generate_ass_subtitles(self, captions: List[Dict], style_preset: str = "hormozi", highlight_color: str = "&H6BF3B6&") -> str:
        """
        Generates Advanced SubStation Alpha (.ass) file with Hormozi-style pop & karaoke colors.
        """
        ass_path = os.path.join(self.output_dir, "temp_subtitles.ass")
        
        # ASS Header with 1080x1920 canvas
        header = f"""[Script Info]
Title: Kroma Clip Kinetic Subtitles
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Hormozi,Arial Black,76,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,2,0,1,6,3,2,60,60,380,1
Style: Minimal,Helvetica,52,&H00E7E9EC,&H000000FF,&H00000000,&H80000000,0,0,0,0,100,100,0,0,1,2,1,2,60,60,320,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
        with open(ass_path, "w", encoding="utf-8") as f:
            f.write(header)
            for seg in captions:
                start_fmt = self._sec_to_ass_time(seg.get("start", 0))
                end_fmt = self._sec_to_ass_time(seg.get("end", 0))
                text = seg.get("text", "").upper() if style_preset == "hormozi" else seg.get("text", "")
                
                # Highlight keyword in color
                styled_text = f"{{\\c{highlight_color}\\b1}}{text}{{\\r}}" if style_preset == "hormozi" else text
                f.write(f"Dialogue: 0,{start_fmt},{end_fmt},Hormozi,,0,0,0,,{styled_text}\n")
                
        return ass_path

    def _sec_to_ass_time(self, seconds: float) -> str:
        h = int(seconds // 3600)
        m = int((seconds % 3600) // 60)
        s = int(seconds % 60)
        cs = int((seconds - int(seconds)) * 100)
        return f"{h:01d}:{m:02d}:{s:02d}.{cs:02d}"

    def render_clip(
        self,
        input_video_path: str,
        output_clip_path: str,
        aspect_ratio: str = "9:16",
        ass_subtitles_path: Optional[str] = None,
        watermark_path: Optional[str] = None,
    ) -> bool:
        """
        Executes FFmpeg with complex filtergraph:
        - 9:16 vertical center crop
        - Subtitle burning (via libass)
        - Watermark logo overlay (top-right safe margin)
        - Hardware/CPU fast encoding
        """
        print(f"[2/4] Rendering clip to {aspect_ratio} format with FFmpeg...")

        # Build FFmpeg filtergraph
        # Center-crop formula to 9:16:
        # crop=ih*(9/16):ih:(iw-ow)/2:0,scale=1080:1920
        filters = []
        if aspect_ratio == "9:16":
            filters.append("crop=ih*(9/16):ih:(iw-ow)/2:0,scale=1080:1920")
        elif aspect_ratio == "1:1":
            filters.append("crop=min(iw\\,ih):min(iw\\,ih),scale=1080:1080")

        # Burn ASS Subtitles
        if ass_subtitles_path and os.path.exists(ass_subtitles_path):
            escaped_path = ass_subtitles_path.replace(":", "\\:").replace("\\", "/")
            filters.append(f"ass={escaped_path}")

        filter_complex = ",".join(filters)

        cmd = ["ffmpeg", "-y", "-i", input_video_path]

        # Add watermark input if provided
        if watermark_path and os.path.exists(watermark_path):
            cmd.extend(["-i", watermark_path])
            filter_complex += ";[0:v][1:v]overlay=W-w-40:80[outv]"
            cmd.extend(["-filter_complex", filter_complex, "-map", "[outv]", "-map", "0:a"])
        else:
            cmd.extend(["-vf", filter_complex])

        # Encoding settings
        cmd.extend([
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "19",
            "-c:a", "aac",
            "-b:a", "192k",
            output_clip_path
        ])

        print(f"Executing: {' '.join(cmd)}")
        try:
            subprocess.run(cmd, check=True)
            print(f"[SUCCESS] Rendered clip: {output_clip_path}")
            return True
        except Exception as e:
            print(f"FFmpeg error: {e}", file=sys.stderr)
            return False

if __name__ == "__main__":
    print("Kroma Clip - Python Render Engine loaded successfully.")
