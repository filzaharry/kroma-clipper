#!/usr/bin/env python3
"""
Kroma Clip - Automated High-CTR Thumbnail Design Engine
Generates dynamic, non-flat, high-engagement 9:16 vertical thumbnails for YouTube Shorts / TikTok / Reels.
Features:
- Real frame extraction at 3 key emotional timestamps using FFmpeg
- Portrait 9:16 canvas synthesis (1080x1920) with contrast & vibrance enhancement
- Atmospheric depth (cinematic vignettes, bottom black gradient masks)
- Layered 3D typography (thick outer strokes, offset drop shadows, two-tone color coding)
- Angled 3D sticker ribbons and badges
- 3 distinct viral styles: Viral Hormozi/MrBeast, Cinematic Podcast, Shock Revelation
"""

import os
import sys
import math
import json
import argparse
import subprocess
import tempfile
import urllib.request
from typing import List, Tuple, Optional, Dict
from PIL import Image, ImageDraw, ImageFont, ImageEnhance, ImageFilter

# Default Font Paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
FONTS_DIR = os.path.join(SCRIPT_DIR, "assets", "fonts")
IMPACT_FONT_PATH = os.path.join(FONTS_DIR, "Impact.ttf")
ARIAL_BOLD_PATH = os.path.join(FONTS_DIR, "ArialBold.ttf")

def get_font(size: int = 72, prefer_impact: bool = True) -> ImageFont.FreeTypeFont:
    """Load high-impact bold font with system fallbacks."""
    candidates = []
    if prefer_impact and os.path.exists(IMPACT_FONT_PATH):
        candidates.append(IMPACT_FONT_PATH)
    if os.path.exists(ARIAL_BOLD_PATH):
        candidates.append(ARIAL_BOLD_PATH)

    candidates.extend([
        "/System/Library/Fonts/Supplemental/Impact.ttf",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/usr/share/fonts/truetype/msttcorefonts/impact.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf",
    ])

    for p in candidates:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                continue

    return ImageFont.load_default()

def parse_hex_color(hex_str: str, default: Tuple[int, int, int] = (255, 255, 255)) -> Tuple[int, int, int]:
    try:
        h = hex_str.lstrip("#")
        if len(h) == 6:
            return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))
        elif len(h) == 3:
            return tuple(int(c * 2, 16) for c in h)
    except Exception:
        pass
    return default

def extract_video_frame(video_path: str, timestamp_sec: float, out_img_path: str) -> bool:
    """Extract a single frame from video at timestamp using ffmpeg."""
    try:
        cmd = [
            "ffmpeg", "-y",
            "-ss", f"{timestamp_sec:.2f}",
            "-i", video_path,
            "-vframes", "1",
            "-q:v", "2",
            out_img_path
        ]
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=20)
        return res.returncode == 0 and os.path.exists(out_img_path) and os.path.getsize(out_img_path) > 1000
    except Exception as e:
        print(f"[thumbnail_engine] Frame extraction failed at {timestamp_sec}s: {e}", file=sys.stderr)
        return False

def download_image_fallback(url: str, out_path: str) -> bool:
    """Download image fallback from URL (e.g. YouTube maxres/hqdefault)."""
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=10) as response, open(out_path, "wb") as f:
            f.write(response.read())
        return os.path.exists(out_path) and os.path.getsize(out_path) > 1000
    except Exception as e:
        print(f"[thumbnail_engine] Fallback image download failed: {e}", file=sys.stderr)
        return False

def make_vertical_canvas(img: Image.Image, target_w: int = 1080, target_h: int = 1920) -> Image.Image:
    """
    Transforms any image (16:9 or custom) into an eye-popping 9:16 vertical canvas.
    Applies zoom subject framing with contrast, vibrance, and sharpness boosts.
    """
    w, h = img.size
    aspect = w / h
    target_aspect = target_w / target_h # 9/16 = 0.5625

    if aspect > target_aspect:
        # Landscape input: scale height to 1920, zoom-crop center 1080
        scale = target_h / h
        new_w = int(w * scale)
        scaled = img.resize((new_w, target_h), Image.Resampling.LANCZOS)
        left = max(0, (new_w - target_w) // 2)
        canvas = scaled.crop((left, 0, left + target_w, target_h))
    else:
        # Portrait/tall input: scale width to 1080, crop center
        scale = target_w / w
        new_h = int(h * scale)
        scaled = img.resize((target_w, new_h), Image.Resampling.LANCZOS)
        top = max(0, (new_h - target_h) // 2)
        canvas = scaled.crop((0, top, target_w, top + target_h))

    # Boost visual vibrancy & contrast (+25% for high-CTR YouTube Shorts look)
    canvas = ImageEnhance.Contrast(canvas).enhance(1.25)
    canvas = ImageEnhance.Color(canvas).enhance(1.25)
    canvas = ImageEnhance.Sharpness(canvas).enhance(1.20)

    return canvas

def apply_cinematic_overlays(canvas: Image.Image) -> Image.Image:
    """
    Applies top and bottom gradient masks plus subtle edge vignette.
    This creates deep 3D atmosphere and guarantees 100% text legibility.
    """
    w, h = canvas.size
    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    # 1. Top dark gradient (height 280px, max alpha 160)
    top_h = 280
    for y in range(top_h):
        progress = y / top_h
        alpha = int(160 * ((1.0 - progress) ** 1.5))
        draw.line([(0, y), (w, y)], fill=(0, 0, 0, alpha))

    # 2. Bottom deep gradient (height 820px, max alpha 230)
    bottom_h = 820
    start_y = h - bottom_h
    for y in range(start_y, h):
        progress = (y - start_y) / bottom_h
        alpha = int(230 * (progress ** 1.3))
        draw.line([(0, y), (w, y)], fill=(0, 0, 0, alpha))

    # 3. Subtle corner vignette
    vignette = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    vdraw = ImageDraw.Draw(vignette)
    cx, cy = w / 2, h / 2
    max_dist = math.sqrt(cx**2 + cy**2)
    # Draw simple border vignette
    border_thickness = 40
    vdraw.rectangle([0, 0, w, h], outline=(0, 0, 0, 90), width=border_thickness)

    base = canvas.convert("RGBA")
    combined = Image.alpha_composite(base, overlay)
    combined = Image.alpha_composite(combined, vignette)
    return combined

def wrap_text_into_lines(text: str, font: ImageFont.FreeTypeFont, max_width: int, max_lines: int = 3) -> List[str]:
    """Smart multiline wrap for high-impact thumbnail headlines."""
    words = text.strip().split()
    if not words:
        return []

    lines = []
    current_line = []

    for word in words:
        test_line = " ".join(current_line + [word])
        bbox = font.getbbox(test_line)
        line_w = bbox[2] - bbox[0]
        if line_w <= max_width:
            current_line.append(word)
        else:
            if current_line:
                lines.append(" ".join(current_line))
                current_line = [word]
            else:
                lines.append(word)
                current_line = []
        if len(lines) >= max_lines:
            break

    if current_line and len(lines) < max_lines:
        lines.append(" ".join(current_line))

    return lines[:max_lines]

def draw_3d_text_line(
    canvas_draw: ImageDraw.ImageDraw,
    x: int,
    y: int,
    text: str,
    font: ImageFont.FreeTypeFont,
    fill_color: Tuple[int, int, int],
    stroke_color: Tuple[int, int, int] = (0, 0, 0),
    stroke_width: int = 8,
    shadow_offset: Tuple[int, int] = (8, 10),
    shadow_color: Tuple[int, int, int, int] = (0, 0, 0, 220)
):
    """
    Renders text with a thick 3D extrusion effect:
    1. Deep offset shadow
    2. Solid black outer stroke
    3. Vibrant face fill
    """
    sx, sy = shadow_offset
    # Draw shadow passes
    canvas_draw.text(
        (x + sx, y + sy),
        text,
        font=font,
        fill=shadow_color,
        stroke_width=stroke_width + 4,
        stroke_fill=shadow_color
    )
    # Draw main text with heavy stroke
    canvas_draw.text(
        (x, y),
        text,
        font=font,
        fill=fill_color,
        stroke_width=stroke_width,
        stroke_fill=stroke_color
    )

def render_tilted_ribbon(
    text: str,
    font: ImageFont.FreeTypeFont,
    bg_color: Tuple[int, int, int],
    text_color: Tuple[int, int, int],
    angle_deg: float = -5.0,
    border_color: Optional[Tuple[int, int, int]] = None,
    padding: Tuple[int, int] = (32, 16)
) -> Tuple[Image.Image, Tuple[int, int]]:
    """
    Generates an authentic tilted 3D sticker badge/ribbon with drop shadow.
    """
    px, py = padding
    bbox = font.getbbox(text)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]

    rw = tw + px * 2
    rh = th + py * 2

    # Draw flat ribbon on RGBA canvas
    ribbon = Image.new("RGBA", (rw, rh), (0, 0, 0, 0))
    rdraw = ImageDraw.Draw(ribbon)

    radius = 16
    rdraw.rounded_rectangle([0, 0, rw, rh], radius=radius, fill=bg_color)
    if border_color:
        rdraw.rounded_rectangle([0, 0, rw, rh], radius=radius, outline=border_color, width=4)

    # Draw text centered
    tx = (rw - tw) // 2 - bbox[0]
    ty = (rh - th) // 2 - bbox[1]
    rdraw.text((tx, ty), text, font=font, fill=text_color, stroke_width=2, stroke_fill=(0, 0, 0) if text_color != (0, 0, 0) else None)

    # Add drop shadow before rotation
    pad_ext = 40
    shadow_box = Image.new("RGBA", (rw + pad_ext, rh + pad_ext), (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(shadow_box)
    sdraw.rounded_rectangle([8, 12, 8 + rw, 12 + rh], radius=radius, fill=(0, 0, 0, 160))
    shadow_box = shadow_box.filter(ImageFilter.GaussianBlur(radius=6))
    shadow_box.paste(ribbon, (0, 0), ribbon)

    # Rotate with smooth resampling
    rotated = shadow_box.rotate(angle_deg, resample=Image.Resampling.BICUBIC, expand=True)
    return rotated, (rw, rh)


# -------------------------------------------------------------
# 3 DISTINCT THUMBNAIL STYLES
# -------------------------------------------------------------

def render_style_viral_hormozi(
    base_frame: Image.Image,
    title: str,
    quote: str,
    speaker: str,
    score: int
) -> Image.Image:
    """
    Style 0: VIRAL HOOK (MrBeast / Hormozi 3D Style)
    - Tilted neon sticker ribbon at top ('🔥 WAJIB NONTON!')
    - Giant 3D multiline headline with two-tone colors (White + Electric Neon Yellow)
    - High-contrast 8px black stroke + deep drop shadow
    - Speaker pill at bottom
    """
    canvas = make_vertical_canvas(base_frame)
    canvas = apply_cinematic_overlays(canvas)
    draw = ImageDraw.Draw(canvas)
    w, h = canvas.size

    # 1. Top Tilted Sticker Ribbon (-5 degrees tilt)
    ribbon_font = get_font(size=44, prefer_impact=True)
    ribbon_text = "🔥 WAJIB NONTON!"
    rotated_ribbon, _ = render_tilted_ribbon(
        text=ribbon_text,
        font=ribbon_font,
        bg_color=(182, 243, 107), # Neon Lime #B6F36B
        text_color=(17, 19, 21),   # Dark obsidian
        angle_deg=-5.0,
        border_color=(255, 255, 255),
        padding=(34, 16)
    )
    # Paste tilted ribbon near top left/center
    canvas.paste(rotated_ribbon, (70, 90), rotated_ribbon)

    # 2. Main 3D Headline Typography (Impact, 92px)
    main_font = get_font(size=88, prefer_impact=True)
    clean_title = title.upper().replace('"', '').replace("'", "")
    lines = wrap_text_into_lines(clean_title, main_font, max_width=940, max_lines=3)

    if not lines:
        lines = ["JANGAN SAMPAI LEWAT!"]

    # Calculate vertical position inside the safe lower-third area
    line_height = 104
    total_text_h = len(lines) * line_height
    start_y = h - 260 - total_text_h

    # Color mapping: First line White, key emphasis line in Neon Yellow (#FFE600)
    for i, line in enumerate(lines):
        line_bbox = main_font.getbbox(line)
        lw = line_bbox[2] - line_bbox[0]
        lx = (w - lw) // 2

        # Two-tone highlight
        if i == len(lines) - 1 and len(lines) > 1:
            color = (255, 230, 0) # Neon Yellow
        elif i == 0:
            color = (255, 255, 255) # Pure White
        else:
            color = (182, 243, 107) # Neon Lime

        draw_3d_text_line(
            canvas_draw=draw,
            x=lx,
            y=start_y + (i * line_height),
            text=line,
            font=main_font,
            fill_color=color,
            stroke_color=(0, 0, 0),
            stroke_width=9,
            shadow_offset=(8, 12),
            shadow_color=(0, 0, 0, 230)
        )

    # 3. Speaker Pill Tag at bottom
    if speaker:
        speaker_font = get_font(size=36, prefer_impact=False)
        tag_text = f"🎙️ {speaker.upper()} • KLIP VIRAL"
        s_bbox = speaker_font.getbbox(tag_text)
        sw = s_bbox[2] - s_bbox[0]
        sh = s_bbox[3] - s_bbox[1]

        px, py = 28, 12
        bx = (w - (sw + px * 2)) // 2
        by = h - 160

        draw.rounded_rectangle([bx, by, bx + sw + px * 2, by + sh + py * 2], radius=14, fill=(18, 22, 26, 220), outline=(50, 60, 70), width=2)
        draw.text((bx + px, by + py - s_bbox[1]), tag_text, font=speaker_font, fill=(220, 230, 240))

    return canvas.convert("RGB")


def render_style_cinematic_podcast(
    base_frame: Image.Image,
    title: str,
    quote: str,
    speaker: str,
    score: int
) -> Image.Image:
    """
    Style 1: CINEMATIC PODCAST (Close The Door / Joe Rogan Style)
    - Moody dark contrast grading
    - Red Accent Badge ('🔴 PODCAST KLIMAKS')
    - Huge 3D quotation glyph '“'
    - High-tension quote title in White & Crimson Red
    - Sleek glassmorphism speaker card
    """
    canvas = make_vertical_canvas(base_frame)
    # Extra moodiness: slightly lower brightness, deeper contrast
    canvas = ImageEnhance.Brightness(canvas).enhance(0.92)
    canvas = apply_cinematic_overlays(canvas)
    draw = ImageDraw.Draw(canvas)
    w, h = canvas.size

    # 1. Top Red Pill Badge
    badge_font = get_font(size=40, prefer_impact=True)
    badge_text = "🔴 PODCAST KLIMAKS"
    b_bbox = badge_font.getbbox(badge_text)
    bw = b_bbox[2] - b_bbox[0]
    bh = b_bbox[3] - b_bbox[1]
    px, py = 32, 14
    bx, by = 70, 90

    # Draw 3D shadow for badge
    draw.rounded_rectangle([bx + 4, by + 6, bx + bw + px * 2 + 4, by + bh + py * 2 + 6], radius=16, fill=(0, 0, 0, 160))
    draw.rounded_rectangle([bx, by, bx + bw + px * 2, by + bh + py * 2], radius=16, fill=(255, 42, 77), outline=(255, 255, 255), width=3)
    draw.text((bx + px, by + py - b_bbox[1]), badge_text, font=badge_font, fill=(255, 255, 255))

    # 2. Huge 3D Quotation Glyph
    quote_glyph_font = get_font(size=140, prefer_impact=True)
    draw_3d_text_line(
        canvas_draw=draw,
        x=80,
        y=h - 590,
        text="“",
        font=quote_glyph_font,
        fill_color=(255, 77, 106),
        stroke_color=(0, 0, 0),
        stroke_width=6,
        shadow_offset=(6, 8)
    )

    # 3. Main Hook Text
    main_font = get_font(size=84, prefer_impact=True)
    clean_text = (quote or title).upper().replace('"', '').replace("'", "")
    lines = wrap_text_into_lines(clean_text, main_font, max_width=920, max_lines=3)

    if not lines:
        lines = [title.upper()[:30]]

    line_height = 98
    start_y = h - 230 - (len(lines) * line_height)

    for i, line in enumerate(lines):
        line_bbox = main_font.getbbox(line)
        lw = line_bbox[2] - line_bbox[0]
        lx = (w - lw) // 2

        # White for main lines, Crimson Red for final impact punchline
        color = (255, 77, 106) if (i == len(lines) - 1 and len(lines) > 1) else (255, 255, 255)

        draw_3d_text_line(
            canvas_draw=draw,
            x=lx,
            y=start_y + (i * line_height),
            text=line,
            font=main_font,
            fill_color=color,
            stroke_color=(0, 0, 0),
            stroke_width=8,
            shadow_offset=(8, 10),
            shadow_color=(0, 0, 0, 230)
        )

    # 4. Speaker Attribution Card at bottom
    speaker_font = get_font(size=36, prefer_impact=False)
    spk_label = f"{speaker.upper() if speaker else 'SPEAKER'} • REAKSI EMOSIONAL"
    sb = speaker_font.getbbox(spk_label)
    sw = sb[2] - sb[0]
    sh = sb[3] - sb[1]

    bx = (w - (sw + 56)) // 2
    by = h - 150
    draw.rounded_rectangle([bx, by, bx + sw + 56, by + sh + 24], radius=14, fill=(15, 18, 22, 230), outline=(255, 77, 106), width=2)
    draw.text((bx + 28, by + 12 - sb[1]), spk_label, font=speaker_font, fill=(240, 240, 245))

    return canvas.convert("RGB")


def render_style_shock_revelation(
    base_frame: Image.Image,
    title: str,
    quote: str,
    speaker: str,
    score: int
) -> Image.Image:
    """
    Style 2: SHOCKING REVELATION (Click Magnet Warning Style)
    - Yellow / Black Caution Ribbon ('⚠️ FAKTA TERBONGKAR!')
    - Multi-color High-CTR Typography (Pure White + Electric Cyan + Hot Red)
    - 3D Extrusion Stroke
    - Viral Score Pill Badge ('⚡ VIRAL SCORE {score}/100')
    """
    canvas = make_vertical_canvas(base_frame)
    # Extra punchy saturation
    canvas = ImageEnhance.Color(canvas).enhance(1.35)
    canvas = apply_cinematic_overlays(canvas)
    draw = ImageDraw.Draw(canvas)
    w, h = canvas.size

    # 1. Caution Warning Ribbon
    ribbon_font = get_font(size=44, prefer_impact=True)
    ribbon_text = "⚠️ FAKTA TERBONGKAR!"
    rotated_ribbon, _ = render_tilted_ribbon(
        text=ribbon_text,
        font=ribbon_font,
        bg_color=(255, 215, 0), # Bright Caution Gold/Yellow
        text_color=(0, 0, 0),
        angle_deg=4.0, # Tilted slightly to the right
        border_color=(0, 0, 0),
        padding=(36, 16)
    )
    canvas.paste(rotated_ribbon, (w - rotated_ribbon.size[0] - 60, 90), rotated_ribbon)

    # 2. Main Shocking Typography (Impact, 90px)
    main_font = get_font(size=90, prefer_impact=True)
    clean_title = title.upper().replace('"', '').replace("'", "")
    lines = wrap_text_into_lines(clean_title, main_font, max_width=940, max_lines=3)

    if not lines:
        lines = ["FAKTA INI BIKIN KAGET!"]

    line_height = 106
    start_y = h - 250 - (len(lines) * line_height)

    for i, line in enumerate(lines):
        line_bbox = main_font.getbbox(line)
        lw = line_bbox[2] - line_bbox[0]
        lx = (w - lw) // 2

        # Tri-color hierarchy: White -> Electric Cyan -> Hot Red
        if i == 0:
            color = (255, 255, 255)
        elif i == 1:
            color = (0, 240, 255) # Electric Cyan #00F0FF
        else:
            color = (255, 45, 85) # Hot Punchy Red

        draw_3d_text_line(
            canvas_draw=draw,
            x=lx,
            y=start_y + (i * line_height),
            text=line,
            font=main_font,
            fill_color=color,
            stroke_color=(0, 0, 0),
            stroke_width=10,
            shadow_offset=(10, 12),
            shadow_color=(0, 0, 0, 240)
        )

    # 3. Floating Viral Score Pill at bottom
    score_val = score if score > 0 else 88
    score_font = get_font(size=36, prefer_impact=True)
    badge_label = f"⚡ SKOR VIRAL {score_val}/100 • POTENSI TINGGI"
    s_bbox = score_font.getbbox(badge_label)
    sw = s_bbox[2] - s_bbox[0]
    sh = s_bbox[3] - s_bbox[1]

    bx = (w - (sw + 60)) // 2
    by = h - 160
    draw.rounded_rectangle([bx, by, bx + sw + 60, by + sh + 26], radius=16, fill=(24, 28, 34, 230), outline=(0, 240, 255), width=3)
    draw.text((bx + 30, by + 13 - s_bbox[1]), badge_label, font=score_font, fill=(0, 240, 255))

    return canvas.convert("RGB")


# -------------------------------------------------------------
# MAIN CLI & GENERATOR PIPELINE
# -------------------------------------------------------------

def generate_all_thumbnails(
    video_id: str,
    start_time: float,
    end_time: float,
    title: str,
    quote: str,
    speaker: str,
    score: int,
    output_dir: str,
    local_video_path: Optional[str] = None,
    fallback_image_url: Optional[str] = None
) -> Dict[str, str]:
    """
    Executes frame extraction and produces 3 distinct 9:16 high-CTR thumbnails.
    Returns dictionary with style names and relative/absolute output paths.
    """
    os.makedirs(output_dir, exist_ok=True)
    clean_id = video_id.replace("yt-", "").replace("/", "_").replace("\\", "_")
    duration = max(2.0, end_time - start_time)

    # Calculate 3 timestamps for 3 key moments:
    # 1. Early Hook (start + 1.2s or 15% in)
    # 2. Peak Energy / Reaction (45% in)
    # 3. Climax / Punchline (80% in)
    t1 = start_time + min(1.5, duration * 0.15)
    t2 = start_time + (duration * 0.45)
    t3 = start_time + (duration * 0.80)
    timestamps = [t1, t2, t3]

    styles = [
        ("viral_hormozi", render_style_viral_hormozi, "Frame Hook Utama (Rasa Penasaran)", "Paling Disarankan"),
        ("cinematic_podcast", render_style_cinematic_podcast, "Frame Puncak Energi & Reaksi", "Dinamis"),
        ("shock_revelation", render_style_shock_revelation, "Frame Punchline Vertikal 9:16", f"Skor {score}")
    ]

    results = []

    with tempfile.TemporaryDirectory() as tmp_dir:
        # Step 1: Extract or retrieve 3 base frames
        base_frames = []

        for i, ts in enumerate(timestamps):
            tmp_frame_path = os.path.join(tmp_dir, f"frame_{i}.jpg")
            frame_extracted = False

            # Try local video if available
            if local_video_path and os.path.exists(local_video_path):
                # When using local preview snippet, timestamp is relative to segment start if snippet is sliced!
                # If preview was sliced from start_time..end_time, ts_relative = ts - start_time
                # Let's inspect duration of local video
                probe_cmd = ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", local_video_path]
                local_dur = 0.0
                try:
                    probe_res = subprocess.run(probe_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
                    local_dur = float(probe_res.stdout.strip())
                except Exception:
                    pass

                seek_ts = ts
                if local_dur > 0 and local_dur < (duration + 5.0):
                    # Local video is already the sliced clip snippet!
                    seek_ts = max(0.2, min(local_dur - 0.5, ts - start_time))

                frame_extracted = extract_video_frame(local_video_path, seek_ts, tmp_frame_path)

            # Fallback to downloading fallback image or YouTube hqdefault
            if not frame_extracted:
                if not fallback_image_url:
                    fallback_image_url = f"https://i.ytimg.com/vi/{clean_id}/hqdefault.jpg"
                download_image_fallback(fallback_image_url, tmp_frame_path)

            if os.path.exists(tmp_frame_path):
                try:
                    loaded = Image.open(tmp_frame_path).convert("RGB")
                    base_frames.append(loaded)
                except Exception as e:
                    print(f"[thumbnail_engine] Error loading extracted frame {i}: {e}", file=sys.stderr)
            else:
                # Emergency blank gradient frame
                blank = Image.new("RGB", (1920, 1080), (20, 24, 30))
                base_frames.append(blank)

        # Step 2: Render each style with its corresponding frame
        for idx, (style_key, render_func, style_title, style_tag) in enumerate(styles):
            frame = base_frames[idx] if idx < len(base_frames) else base_frames[0]
            rendered_canvas = render_func(
                base_frame=frame,
                title=title,
                quote=quote,
                speaker=speaker,
                score=score
            )

            out_filename = f"thumb_{clean_id}_{int(start_time)}_{int(end_time)}_{style_key}.jpg"
            out_file_path = os.path.join(output_dir, out_filename)
            rendered_canvas.save(out_file_path, "JPEG", quality=92, optimize=True)

            results.append({
                "id": idx,
                "styleKey": style_key,
                "title": style_title,
                "tag": style_tag,
                "filename": out_filename,
                "filePath": out_file_path,
                "url": f"/cache/thumbnails/{out_filename}",
                "timestamp": timestamps[idx]
            })

    return results

def main():
    parser = argparse.ArgumentParser(description="Kroma Clip High-CTR Automated Thumbnail Engine")
    parser.add_argument("--video-id", required=True, help="YouTube Video ID or source ID")
    parser.add_argument("--start", type=float, default=0.0, help="Clip start time in seconds")
    parser.add_argument("--end", type=float, default=30.0, help="Clip end time in seconds")
    parser.add_argument("--title", default="Viral Moment", help="Clip hook title")
    parser.add_argument("--quote", default="", help="Excerpt quote / punchline")
    parser.add_argument("--speaker", default="Podcast", help="Speaker name")
    parser.add_argument("--score", type=int, default=85, help="Viral score")
    parser.add_argument("--output-dir", required=True, help="Output directory to save thumbnails")
    parser.add_argument("--local-video", default=None, help="Optional path to local video MP4 file")
    parser.add_argument("--fallback-url", default=None, help="Optional fallback image URL")

    args = parser.parse_args()

    results = generate_all_thumbnails(
        video_id=args.video_id,
        start_time=args.start,
        end_time=args.end,
        title=args.title,
        quote=args.quote,
        speaker=args.speaker,
        score=args.score,
        output_dir=args.output_dir,
        local_video_path=args.local_video,
        fallback_image_url=args.fallback_url
    )

    print(json.dumps({"success": True, "thumbnails": results}, indent=2))

if __name__ == "__main__":
    main()
