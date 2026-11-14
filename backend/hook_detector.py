#!/usr/bin/env python3
"""
Kroma Clip - Hook Detection & Speech Pacing Engine
Analyzes speech transcriptions, word pacing, and rhetorical questions
to rank the top highlight candidates from long-form YouTube audio.
"""

from typing import List, Dict, Any

HOOK_KEYWORDS = [
    "kenapa", "mengapa", "bagaimana", "rahasia", "kesalahan terbesar",
    "faktanya", "jangan pernah", "banyak orang", "ternyata", "truth is",
    "why", "how", "secret", "biggest mistake", "nobody talks about"
]

def analyze_transcript_for_hooks(
    transcript_segments: List[Dict[str, Any]],
    min_duration: float = 20.0,
    max_duration: float = 60.0
) -> List[Dict[str, Any]]:
    """
    Evaluates transcript segments and clusters them into high-potential viral clips.
    """
    candidates = []

    for i in range(len(transcript_segments)):
        start_seg = transcript_segments[i]
        accumulated_text = start_seg.get("text", "")
        current_captions = [start_seg]

        for j in range(i + 1, len(transcript_segments)):
            next_seg = transcript_segments[j]
            duration = next_seg.get("end", 0) - start_seg.get("start", 0)

            if duration > max_duration:
                break

            accumulated_text += " " + next_seg.get("text", "")
            current_captions.append(next_seg)

            if min_duration <= duration <= max_duration:
                # Heuristic Hook Score
                lower_first = start_seg.get("text", "").lower()
                hook_score = 65
                if any(kw in lower_first for kw in HOOK_KEYWORDS):
                    hook_score = 95
                elif "?" in lower_first or "!" in lower_first:
                    hook_score = 88

                # Word pacing density
                words_count = len(accumulated_text.split())
                pacing_wpm = (words_count / duration) * 60.0
                energy_score = min(98, max(50, int(pacing_wpm / 1.8)))

                total_score = int(hook_score * 0.4 + energy_score * 0.6)

                candidates.append({
                    "id": f"clip-{int(start_seg.get('start', 0))}-{int(next_seg.get('end', 0))}",
                    "title": start_seg.get("text", "")[:45].strip() + "...",
                    "startTime": start_seg.get("start", 0),
                    "endTime": next_seg.get("end", 0),
                    "duration": round(duration, 1),
                    "score": total_score,
                    "hookScore": hook_score,
                    "energyScore": energy_score,
                    "excerptQuote": f'"{accumulated_text[:110]}..."',
                    "speaker": start_seg.get("speaker", "Speaker"),
                    "aspectRatio": "9:16",
                    "captions": current_captions
                })
                break

    # Sort descending by score
    return sorted(candidates, key=lambda c: c["score"], reverse=True)

if __name__ == "__main__":
    sample = [
        {"start": 10.0, "end": 25.0, "text": "Kenapa banyak orang bikin podcast tapi akhirnya berhenti?", "speaker": "Host"},
        {"start": 25.5, "end": 45.0, "text": "Rahasia terbesarnya adalah mereka mikirin studio mahal bukan konten.", "speaker": "Host"},
    ]
    results = analyze_transcript_for_hooks(sample, 20, 60)
    print(f"Detected {len(results)} candidate highlights.")

