#!/usr/bin/env python3
"""
Kroma Clip - Production FFmpeg & Python Video Rendering Engine
Directly slices YouTube stream, formats to portrait 9:16 (Crop Vertikal OR 16:9 Fit with Dark Blurred Background),
generates styled kinetic subtitle cards with Pillow, and burns them inside Instagram Reels/TikTok Safe Zone specifications.
"""

import os
import sys
import json
import argparse
import tempfile
import subprocess
from typing import List, Dict, Optional
from PIL import Image, ImageDraw, ImageFont

def get_best_font(size: int = 46):
    font_candidates = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/System/Library/Fonts/SFNS.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf",
    ]
    for p in font_candidates:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                continue
    return ImageFont.load_default()

def wrap_text_to_lines(text: str, max_lines: int, font, max_width: int) -> List[str]:
    words = text.split()
    if not words:
        return []
    if max_lines <= 1:
        return [" ".join(words)]
    
    lines = []
    current_line = []
    for w in words:
        test_line = " ".join(current_line + [w])
        bbox = font.getbbox(test_line)
        w_px = bbox[2] - bbox[0]
        if w_px <= max_width or not current_line:
            current_line.append(w)
        else:
            lines.append(" ".join(current_line))
            current_line = [w]
            if len(lines) >= max_lines - 1:
                break
    if current_line:
        lines.append(" ".join(current_line))
        
    return lines[:max_lines]

def generate_card_image(
    text: str,
    preset: str,
    highlight_color_hex: str,
    max_lines: int,
    out_path: str
) -> int:
    """
    Renders styled subtitle PNG card using PIL and returns the height of the card in px.
    Padded to fit safely within the 35px side and 100px right-icon safe zone margin.
    """
    font_size = 46 if max_lines <= 2 else 38
    font = get_best_font(font_size)
    
    display_text = text.upper() if preset in ["hormozi", "mrbeast", "vox_box", "fire_gradient"] else text
    lines = wrap_text_to_lines(display_text, max_lines, font, max_width=860)
    
    line_height = font_size + 16
    content_h = len(lines) * line_height
    card_h = content_h + 46
    card_w = 920
    
    img = Image.new("RGBA", (card_w, card_h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    def parse_hex(h: str, default=(182, 243, 107)):
        h = h.lstrip("#")
        try:
            return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))
        except Exception:
            return default
            
    hl_rgb = parse_hex(highlight_color_hex, (182, 243, 107))
    
    if preset == "hormozi":
        draw.rounded_rectangle([10, 8, card_w - 10, card_h - 8], radius=24, fill=(15, 18, 22, 235), outline=(*hl_rgb, 255), width=4)
        text_color = (*hl_rgb, 255)
    elif preset == "mrbeast":
        draw.rounded_rectangle([10, 8, card_w - 10, card_h - 8], radius=28, fill=(0, 0, 0, 245), outline=(250, 204, 21, 255), width=5)
        text_color = (250, 204, 21, 255)
    elif preset == "vox_box":
        draw.rectangle([10, 8, card_w - 10, card_h - 8], fill=(10, 10, 10, 245), outline=(255, 255, 255, 255), width=3)
        text_color = (255, 255, 255, 255)
    elif preset == "neon_glow":
        draw.rounded_rectangle([10, 8, card_w - 10, card_h - 8], radius=20, fill=(10, 15, 24, 225), outline=(6, 182, 212, 255), width=4)
        text_color = (255, 255, 255, 255)
    elif preset == "fire_gradient":
        draw.rounded_rectangle([10, 8, card_w - 10, card_h - 8], radius=24, fill=(24, 12, 10, 235), outline=(249, 115, 22, 255), width=4)
        text_color = (254, 215, 170, 255)
    else:
        # Minimal / clean default
        draw.rounded_rectangle([10, 8, card_w - 10, card_h - 8], radius=20, fill=(20, 23, 26, 210), outline=(50, 56, 64, 200), width=2)
        text_color = (240, 243, 246, 255)
        
    start_y = (card_h - content_h) // 2 + (font_size // 2)
    for idx, line in enumerate(lines):
        y = start_y + idx * line_height
        draw.text((card_w // 2, y), line, font=font, fill=text_color, anchor="mm")
        
    img.save(out_path)
    return card_h

def render_clip(
    youtube_url: str,
    start_time: float,
    end_time: float,
    output_path: str,
    aspect_ratio: str = "9:16",
    framing_layout: str = "crop", # "crop" | "fit_blur"
    background_style: str = "dark_blur", # "dark_blur" | "extra_dark_blur" | "pure_black" | "dark_gradient"
    caption_preset: str = "hormozi",
    caption_position: str = "bottom",
    caption_max_lines: int = 2,
    caption_highlight_color: str = "#B6F36B",
    captions: Optional[List[Dict]] = None
) -> Dict:
    duration = end_time - start_time
    if duration <= 0:
        duration = 15.0
        end_time = start_time + duration
        
    temp_dir = tempfile.mkdtemp(prefix="kroma_render_")
    raw_video = os.path.join(temp_dir, "segment_raw.mp4")
    
    # 1. Download YouTube slice via yt-dlp
    print(f"[1/3] Downloading YouTube segment: {start_time}s - {end_time}s...", flush=True)
    cmd_dl = [
        "yt-dlp",
        "--download-sections", f"*{start_time}-{end_time}",
        "--force-keyframes-at-cuts",
        "-f", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
        "-o", raw_video,
        youtube_url
    ]
    
    subprocess.run(cmd_dl, check=True)
    if not os.path.exists(raw_video):
        raise RuntimeError("Gagal mengunduh segmen video dari YouTube")

    # 2. Generate subtitle card PNGs
    print(f"[2/3] Generating kinetic subtitle cards within safe zone...", flush=True)
    overlay_cards = []
    
    if captions:
        for idx, seg in enumerate(captions):
            seg_start = seg.get("start", 0)
            seg_end = seg.get("end", 0)
            text = seg.get("text", "").strip()
            if not text:
                continue
                
            if seg_end <= start_time or seg_start >= end_time:
                continue
                
            rel_start = max(0.0, round(seg_start - start_time, 2))
            rel_end = min(round(duration, 2), round(seg_end - start_time, 2))
            if rel_end <= rel_start:
                rel_end = rel_start + 1.2
                
            card_path = os.path.join(temp_dir, f"sub_{idx}.png")
            card_h = generate_card_image(
                text=text,
                preset=caption_preset,
                highlight_color_hex=caption_highlight_color,
                max_lines=caption_max_lines,
                out_path=card_path
            )
            
            overlay_cards.append({
                "path": card_path,
                "start": rel_start,
                "end": rel_end,
                "height": card_h
            })

    # 3. Build FFmpeg command strictly adhering to 9:16 Portrait Canvas & Safe Zone (Gambar 3)
    print(f"[3/3] Encoding 9:16 portrait video (framing: {framing_layout}) with safe zone subtitles...", flush=True)
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    
    ffmpeg_cmd = ["ffmpeg", "-y", "-i", raw_video]
    for c in overlay_cards:
        ffmpeg_cmd.extend(["-i", c["path"]])
        
    filter_chains = []
    target_w, target_h = 1080, 1920

    # Framing Layout: Always produces 1080x1920 portrait video!
    if framing_layout == "fit_blur":
        # Gambar 2 style: 16:9 original video centered, with dark & blurred background
        if background_style == "pure_black":
            filter_chains.append("color=c=black:s=1080x1920:d=100[bg]")
        elif background_style == "extra_dark_blur":
            filter_chains.append(
                "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,"
                "boxblur=30:5,colorlevels=rimax=0.25:gimax=0.25:bimax=0.25[bg]"
            )
        elif background_style == "dark_gradient":
            filter_chains.append(
                "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,"
                "boxblur=20:5,colorlevels=rimax=0.2:gimax=0.2:bimax=0.2[bg]"
            )
        else: # "dark_blur" default (Gambar 2)
            filter_chains.append(
                "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,"
                "boxblur=25:5,colorlevels=rimax=0.4:gimax=0.4:bimax=0.4[bg]"
            )
        filter_chains.append("[0:v]scale=1080:-2[main]")
        filter_chains.append("[bg][main]overlay=0:(H-h)/2[v0]")
    else:
        # Standard Center Crop to 9:16 Vertical
        filter_chains.append("[0:v]crop=ih*(9/16):ih:(iw-ow)/2:0,scale=1080:1920[v0]")
        
    last_v = "v0"
    for i, c in enumerate(overlay_cards):
        next_v = f"v{i+1}"
        input_idx = i + 1
        card_h = c["height"]
        
        # Gambar 3 Safe Zone standard coordinates:
        # Top boundary: 220px (above is unsafe header)
        # Bottom boundary: 450px (below is unsafe navigation & user handle)
        if caption_position == "top":
            y_pos = 220 + 25  # 245px (safely below 220px top boundary)
        elif caption_position == "middle":
            if framing_layout == "fit_blur":
                # In fit_blur, 16:9 video spans y=656 to y=1264.
                # Placing subtitle right in lower blurred band (y=1300) avoids covering the main video
                y_pos = 1300 - (card_h // 2)
            else:
                y_pos = (target_h - card_h) // 2
        else: # bottom default
            # Placed above 450px bottom limit (1920 - 450 = 1470)
            y_pos = 1470 - card_h - 15  # e.g. ~1310px, clear of Reels/TikTok icons & descriptions!
            
        filter_chains.append(
            f"[{last_v}][{input_idx}:v]overlay=(W-w)/2:{y_pos}:enable='between(t,{c['start']},{c['end']})'[{next_v}]"
        )
        last_v = next_v
        
    filter_complex = ";".join(filter_chains)
    ffmpeg_cmd.extend([
        "-filter_complex", filter_complex,
        "-map", f"[{last_v}]",
        "-map", "0:a",
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "20",
        "-c:a", "aac",
        "-b:a", "192k",
        "-movflags", "+faststart",
        output_path
    ])
    
    subprocess.run(ffmpeg_cmd, check=True)
    
    try:
        for f in os.listdir(temp_dir):
            os.remove(os.path.join(temp_dir, f))
        os.rmdir(temp_dir)
    except Exception:
        pass
        
    file_size = os.path.getsize(output_path)
    return {
        "status": "success",
        "output_path": output_path,
        "file_size": file_size,
        "duration": duration,
        "framing_layout": framing_layout,
        "background_style": background_style
    }

def main():
    parser = argparse.ArgumentParser(description="Kroma Clip Video Renderer")
    parser.add_argument("--url", required=True, help="YouTube Video URL")
    parser.add_argument("--start", type=float, required=True, help="Start time in seconds")
    parser.add_argument("--end", type=float, required=True, help="End time in seconds")
    parser.add_argument("--output", required=True, help="Output MP4 file path")
    parser.add_argument("--aspect", default="9:16", help="Target aspect ratio")
    parser.add_argument("--framing-layout", default="crop", help="Framing layout: crop or fit_blur")
    parser.add_argument("--background-style", default="dark_blur", help="Background style: dark_blur, extra_dark_blur, pure_black, dark_gradient")
    parser.add_argument("--preset", default="hormozi", help="Caption preset")
    parser.add_argument("--position", default="bottom", help="Caption position: top, middle, bottom")
    parser.add_argument("--max-lines", type=int, default=2, help="Max caption lines: 1, 2, 3")
    parser.add_argument("--highlight-color", default="#B6F36B", help="Highlight color hex")
    parser.add_argument("--captions-json", default="[]", help="JSON string of caption segments")
    
    args = parser.parse_args()
    
    try:
        captions = json.loads(args.captions_json)
    except Exception:
        captions = []
        
    result = render_clip(
        youtube_url=args.url,
        start_time=args.start,
        end_time=args.end,
        output_path=args.output,
        aspect_ratio=args.aspect,
        framing_layout=args.framing_layout,
        background_style=args.background_style,
        caption_preset=args.preset,
        caption_position=args.position,
        caption_max_lines=args.max_lines,
        caption_highlight_color=args.highlight_color,
        captions=captions
    )
    
    print(json.dumps(result))

if __name__ == "__main__":
    main()
