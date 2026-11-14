#!/usr/bin/env python3
"""
Kroma Clip - Production FFmpeg & Python Video Rendering Engine
Directly slices YouTube stream, formats to portrait 9:16 (Crop Vertikal OR 16:9 Fit with Dark Blurred Background),
generates 1:1 styled kinetic subtitle cards with Pillow matching the editor preview, and burns them inside Safe Zone specifications.
"""

import os
import sys
import json
import argparse
import tempfile
import subprocess
from typing import List, Dict, Optional, Tuple
from PIL import Image, ImageDraw, ImageFont

def get_best_font(size: int = 46, bold: bool = True, mono: bool = False):
    candidates = []
    if mono:
        candidates = [
            "/System/Library/Fonts/Menlo.ttc",
            "/System/Library/Fonts/Courier.dfont",
            "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf"
        ]
    elif bold:
        candidates = [
            "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
            "/System/Library/Fonts/Supplemental/Arial.ttf",
            "/System/Library/Fonts/SFNS.ttf",
            "/System/Library/Fonts/Helvetica.ttc",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf",
        ]
    else:
        candidates = [
            "/System/Library/Fonts/Supplemental/Arial.ttf",
            "/System/Library/Fonts/SFNS.ttf",
            "/System/Library/Fonts/Helvetica.ttc",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        ]
    for p in candidates:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                continue
    return ImageFont.load_default()

def parse_hex(h: str, default: Tuple[int, int, int] = (182, 243, 107)) -> Tuple[int, int, int]:
    h = h.lstrip("#")
    try:
        return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))
    except Exception:
        return default

def render_kinetic_card(
    words: List[str],
    active_idx: int,
    preset: str,
    highlight_color_hex: str,
    max_lines: int,
    out_path: str
) -> int:
    """
    Renders styled 1:1 kinetic subtitle PNG card with transparent background matching EditorPlayer.svelte preview.
    """
    hl_rgb = parse_hex(highlight_color_hex, (182, 243, 107))
    is_mono = (preset == "typewriter")
    font_size = 46 if max_lines <= 2 else 38
    font = get_best_font(font_size, bold=True, mono=is_mono)
    font_active = get_font = get_best_font(font_size + 4, bold=True, mono=is_mono) if preset in ["hormozi", "karaoke"] else font

    # Format words case to match preview CSS
    if preset in ["hormozi", "mrbeast", "vox_box", "neon_glow", "cinematic", "fire_gradient"]:
        display_words = [w.upper() for w in words]
    else:
        display_words = words[:]

    # Partition words across lines (3 words per line max)
    lines_of_words = []
    if len(display_words) <= 3 or max_lines == 1:
        lines_of_words = [list(range(len(display_words)))]
    elif len(display_words) <= 6 or max_lines == 2:
        split_pt = (len(display_words) + 1) // 2
        lines_of_words = [list(range(0, split_pt)), list(range(split_pt, len(display_words)))]
    else:
        lines_of_words = [list(range(0, 3)), list(range(3, 6)), list(range(6, len(display_words)))]

    line_h = font_size + 24
    card_h = len(lines_of_words) * line_h + 30
    card_w = 1080
    img = Image.new("RGBA", (card_w, card_h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    spacing = 16

    # Optional container for Ali Abdaal frosted pill or Subtle Box
    if preset in ["ali_abdaal", "subtle_box", "typewriter"]:
        max_line_w = 0
        for l_indices in lines_of_words:
            lw = sum(font.getbbox(display_words[i])[2] - font.getbbox(display_words[i])[0] for i in l_indices) + spacing * (len(l_indices) - 1)
            max_line_w = max(max_line_w, lw)
        box_w = min(1000, max_line_w + 56)
        box_x0 = (card_w - box_w) // 2
        box_x1 = box_x0 + box_w
        if preset == "ali_abdaal":
            draw.rounded_rectangle([box_x0, 6, box_x1, card_h - 6], radius=28, fill=(15, 18, 22, 215), outline=(255, 255, 255, 50), width=1)
        elif preset == "typewriter":
            draw.rounded_rectangle([box_x0, 6, box_x1, card_h - 6], radius=12, fill=(13, 15, 17, 230), outline=(41, 46, 52, 255), width=2)
        else:
            draw.rounded_rectangle([box_x0, 6, box_x1, card_h - 6], radius=16, fill=(17, 19, 21, 225), outline=(41, 46, 52, 255), width=2)

    for line_idx, l_indices in enumerate(lines_of_words):
        # Measure line width
        widths = []
        for i in l_indices:
            f = font_active if (i == active_idx and preset in ["hormozi", "karaoke"]) else font
            bbox = f.getbbox(display_words[i])
            w_px = bbox[2] - bbox[0]
            if preset == "mrbeast" and i == active_idx:
                w_px += 24  # badge padding
            elif preset == "vox_box":
                w_px += 20  # box padding
            widths.append(w_px)

        line_total_w = sum(widths) + spacing * (len(l_indices) - 1)
        curr_x = (card_w - line_total_w) // 2
        y = 20 + line_idx * line_h + (line_h // 2)

        for idx_in_line, i in enumerate(l_indices):
            w_text = display_words[i]
            is_active = (i == active_idx)
            f = font_active if (is_active and preset in ["hormozi", "karaoke"]) else font
            w_w = widths[idx_in_line]

            if preset == "hormozi":
                color = hl_rgb if is_active else (255, 255, 255)
                draw.text((curr_x, y), w_text, font=f, fill=(*color, 255), stroke_width=4, stroke_fill=(0, 0, 0, 255), anchor="lm")
            elif preset == "mrbeast":
                if is_active:
                    draw.rounded_rectangle([curr_x, y - 26, curr_x + w_w, y + 26], radius=10, fill=(*hl_rgb, 255))
                    draw.text((curr_x + 12, y), w_text, font=f, fill=(0, 0, 0, 255), anchor="lm")
                else:
                    draw.text((curr_x, y), w_text, font=f, fill=(255, 255, 255, 255), stroke_width=3, stroke_fill=(0, 0, 0, 230), anchor="lm")
            elif preset == "vox_box":
                box_bg = (*hl_rgb, 255) if is_active else (10, 10, 10, 240)
                text_col = (0, 0, 0, 255) if is_active else (255, 255, 255, 255)
                draw.rectangle([curr_x, y - 24, curr_x + w_w, y + 24], fill=box_bg, outline=(0, 0, 0, 120), width=1)
                draw.text((curr_x + 10, y), w_text, font=f, fill=text_col, anchor="lm")
            elif preset == "neon_glow":
                if is_active:
                    for gw in [6, 4, 2]:
                        draw.text((curr_x, y), w_text, font=f, fill=(*hl_rgb, 120), stroke_width=gw, stroke_fill=(*hl_rgb, 80), anchor="lm")
                    draw.text((curr_x, y), w_text, font=f, fill=(255, 255, 255, 255), anchor="lm")
                else:
                    draw.text((curr_x, y), w_text, font=f, fill=(200, 200, 200, 180), stroke_width=2, stroke_fill=(0, 0, 0, 220), anchor="lm")
            elif preset == "karaoke":
                if i < active_idx:
                    draw.text((curr_x, y), w_text, font=f, fill=(255, 255, 255, 255), stroke_width=2, stroke_fill=(0, 0, 0, 200), anchor="lm")
                elif is_active:
                    draw.text((curr_x, y), w_text, font=f, fill=(*hl_rgb, 255), stroke_width=4, stroke_fill=(0, 0, 0, 255), anchor="lm")
                else:
                    draw.text((curr_x, y), w_text, font=f, fill=(255, 255, 255, 90), stroke_width=1, stroke_fill=(0, 0, 0, 120), anchor="lm")
            elif preset == "fire_gradient":
                if is_active:
                    txt = "🔥 " + w_text
                    draw.text((curr_x, y), txt, font=f, fill=(255, 190, 40, 255), stroke_width=3, stroke_fill=(180, 40, 10, 255), anchor="lm")
                else:
                    draw.text((curr_x, y), w_text, font=f, fill=(255, 255, 255, 255), stroke_width=3, stroke_fill=(0, 0, 0, 240), anchor="lm")
            else:  # ali_abdaal, cinematic, typewriter, subtle_box
                color = hl_rgb if is_active else (255, 255, 255)
                draw.text((curr_x, y), w_text, font=f, fill=(*color, 255), stroke_width=2, stroke_fill=(0, 0, 0, 180), anchor="lm")
                if is_active and preset == "ali_abdaal":
                    bbox_w = f.getbbox(w_text)
                    u_w = bbox_w[2] - bbox_w[0]
                    draw.line([curr_x, y + 16, curr_x + u_w, y + 16], fill=(*hl_rgb, 255), width=3)

            curr_x += w_w + spacing

    img.save(out_path)
    return card_h

def render_clip(
    youtube_url: str,
    start_time: float,
    end_time: float,
    output_path: str,
    aspect_ratio: str = "9:16",
    framing_layout: str = "crop",  # "crop" | "fit_blur"
    background_style: str = "dark_blur",  # "dark_blur" | "extra_dark_blur" | "pure_black" | "dark_gradient"
    caption_preset: str = "hormozi",
    caption_position: str = "bottom",
    caption_max_lines: int = 2,
    caption_highlight_color: str = "#B6F36B",
    pan_offset: float = 0.0,
    zoom_level: float = 1.0,
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

    # 2. Generate 1:1 kinetic word-by-word subtitle cards
    print(f"[2/3] Generating kinetic subtitle cards (preset: {caption_preset})...", flush=True)
    overlay_cards = []

    target_word_count = 3 if caption_max_lines == 1 else 9 if caption_max_lines == 3 else 6
    lead_words = target_word_count // 2

    card_counter = 0

    if captions:
        for seg in captions:
            seg_start = seg.get("start", 0)
            seg_end = seg.get("end", 0)

            if seg_end <= start_time or seg_start >= end_time:
                continue

            raw_words = seg.get("words", [])
            if not raw_words:
                # Fallback if words array is empty: split text evenly
                tokens = seg.get("text", "").split()
                if not tokens:
                    continue
                w_dur = max(0.4, (seg_end - seg_start) / len(tokens))
                raw_words = [{"word": w, "start": seg_start + idx * w_dur, "end": seg_start + (idx + 1) * w_dur} for idx, w in enumerate(tokens)]

            all_word_texts = [w["word"] for w in raw_words]

            for w_idx, w_obj in enumerate(raw_words):
                w_start = w_obj.get("start", seg_start)
                w_end = w_obj.get("end", seg_end)

                if w_end <= start_time or w_start >= end_time:
                    continue

                rel_start = max(0.0, round(w_start - start_time, 2))
                rel_end = min(round(duration, 2), round(w_end - start_time, 2))

                # Smooth transition to next word without gap
                if w_idx + 1 < len(raw_words):
                    next_start = raw_words[w_idx + 1].get("start", w_end)
                    rel_next_start = min(round(duration, 2), round(next_start - start_time, 2))
                    if 0 < (rel_next_start - rel_start) < 2.0:
                        rel_end = rel_next_start

                if rel_end <= rel_start:
                    rel_end = min(round(duration, 2), rel_start + 0.3)

                # Determine window of words matching EditorPlayer.svelte visibleWords
                if len(all_word_texts) <= target_word_count:
                    window_words = all_word_texts
                    local_active_idx = w_idx
                else:
                    start_idx = max(0, min(w_idx - lead_words, len(all_word_texts) - target_word_count))
                    window_words = all_word_texts[start_idx : start_idx + target_word_count]
                    local_active_idx = w_idx - start_idx

                card_path = os.path.join(temp_dir, f"sub_card_{card_counter}.png")
                card_counter += 1

                card_h = render_kinetic_card(
                    words=window_words,
                    active_idx=local_active_idx,
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
    print(f"[3/3] Encoding 9:16 portrait video (framing: {framing_layout}, bg: {background_style}) with {len(overlay_cards)} subtitle cuts...", flush=True)
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)

    ffmpeg_cmd = ["ffmpeg", "-y", "-i", raw_video]
    for c in overlay_cards:
        ffmpeg_cmd.extend(["-i", c["path"]])

    filter_chains = []
    target_w, target_h = 1080, 1920

    # Framing Layout: Always produces 1080x1920 portrait video!
    if framing_layout == "fit_blur":
        # Gambar 2: 16:9 original video centered, with dark & blurred background
        if background_style == "pure_black":
            filter_chains.append(f"color=c=black:s=1080x1920:d={duration}[bg]")
        elif background_style == "extra_dark_blur":
            filter_chains.append(
                "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,"
                "boxblur=30:5,drawbox=t=fill:color=black@0.80[bg]"
            )
        elif background_style == "dark_gradient":
            filter_chains.append(
                "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,"
                "boxblur=25:5,drawbox=t=fill:color=black@0.75[bg]"
            )
        else:  # "dark_blur" default (Gambar 2)
            filter_chains.append(
                "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,"
                "boxblur=25:5,drawbox=t=fill:color=black@0.60[bg]"
            )
        filter_chains.append("[0:v]scale=1080:-2[main]")
        filter_chains.append("[bg][main]overlay=0:(H-h)/2[v0]")
    else:
        # Standard Center Crop to 9:16 Vertical with Pan & Zoom support
        if zoom_level != 1.0 or pan_offset != 0:
            filter_chains.append(
                f"[0:v]scale=1080*{zoom_level}:-1,crop=1080:1920:(in_w-out_w)/2+({pan_offset}/100)*(in_w-out_w)/2:(in_h-out_h)/2[v0]"
            )
        else:
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
            y_pos = 250  # safely below 220px top boundary
        elif caption_position == "middle":
            if framing_layout == "fit_blur":
                # In fit_blur, 16:9 video spans y=656 to y=1264.
                # Placing subtitle right in lower blurred band (y=1270) avoids covering the main video
                y_pos = 1270 - (card_h // 2)
            else:
                y_pos = (target_h - card_h) // 2
        else:  # bottom default
            # Placed above 450px bottom limit (1920 - 450 = 1470)
            y_pos = 1440 - card_h - 15  # e.g. ~1280px, clear of Reels/TikTok icons & descriptions!

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
    parser.add_argument("--pan-offset", type=float, default=0.0, help="Camera pan offset")
    parser.add_argument("--zoom-level", type=float, default=1.0, help="Camera zoom level")
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
        pan_offset=args.pan_offset,
        zoom_level=args.zoom_level,
        captions=captions
    )

    print(json.dumps(result))

if __name__ == "__main__":
    main()
