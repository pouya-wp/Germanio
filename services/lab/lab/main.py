"""
Germanio lab — local speech service on 127.0.0.1:4318.

Only brain talks to lab (brain enforces origin rules for browsers), so lab
binds to loopback and rejects any request carrying a browser Origin header.

Endpoints
  GET  /health
  POST /tts       {text, voice, rate}            -> audio/wav (cached on disk)
  POST /podcast   {id, segments:[{voice,text}]}   -> writes podcasts/<id>.wav, returns segment timings
"""

from __future__ import annotations

import hashlib
import io
import os
import re
import wave
from functools import lru_cache
from pathlib import Path

import numpy as np
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse, Response
from piper import PiperVoice, SynthesisConfig
from pydantic import BaseModel, Field

ROOT = Path(__file__).resolve().parents[3]
DATA = Path(os.environ.get("GERMANIO_DATA", ROOT / "data"))
VOICES = DATA / "voices"
CACHE = DATA / "tts-cache"
PODCASTS = DATA / "podcasts"
for d in (CACHE, PODCASTS):
    d.mkdir(parents=True, exist_ok=True)

VOICE_FILES = {
    "thorsten": "de_DE-thorsten-medium.onnx",
    "kerstin": "de_DE-kerstin-low.onnx",
}

app = FastAPI(title="Germanio lab", docs_url=None, redoc_url=None)


@app.middleware("http")
async def local_only(request: Request, call_next):
    host = request.headers.get("host", "")
    if not re.match(r"^(127\.0\.0\.1|localhost)(:\d+)?$", host) or request.headers.get("origin"):
        return JSONResponse({"error": "forbidden"}, status_code=403)
    return await call_next(request)


@lru_cache(maxsize=4)
def voice(name: str) -> PiperVoice:
    file = VOICE_FILES.get(name)
    if not file or not (VOICES / file).exists():
        raise HTTPException(404, f"voice {name!r} not installed")
    return PiperVoice.load(str(VOICES / file))


def synth(text: str, voice_name: str, rate: float) -> bytes:
    """WAV bytes for one utterance. `rate` > 1 is faster (Piper's length_scale is its inverse)."""
    v = voice(voice_name)
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        v.synthesize_wav(text, w, SynthesisConfig(length_scale=1 / max(0.5, min(rate, 1.6))))
    return buf.getvalue()


@app.on_event("startup")
def warm_voices() -> None:
    """Load voices up front: the first synthesis otherwise pays ~10 s of model loading."""
    for name, file in VOICE_FILES.items():
        if (VOICES / file).exists():
            synth("Hallo.", name, 1.0)


class TtsRequest(BaseModel):
    text: str = Field(min_length=1, max_length=2000)
    voice: str = "thorsten"
    rate: float = 0.95


@app.get("/health")
def health():
    installed = [n for n, f in VOICE_FILES.items() if (VOICES / f).exists()]
    return {"ok": True, "voices": installed}


@app.post("/tts")
def tts(req: TtsRequest):
    key = hashlib.sha256(f"{req.voice}|{req.rate:.2f}|{req.text}".encode()).hexdigest()[:32]
    path = CACHE / f"{key}.wav"
    if not path.exists():
        path.write_bytes(synth(req.text, req.voice, req.rate))
    return Response(path.read_bytes(), media_type="audio/wav", headers={"Cache-Control": "max-age=31536000, immutable"})


class Segment(BaseModel):
    voice: str
    text: str = Field(min_length=1, max_length=3000)


class PodcastRequest(BaseModel):
    id: str = Field(pattern=r"^[A-Za-z0-9_-]{1,64}$")
    segments: list[Segment] = Field(min_length=1, max_length=200)
    rate: float = 0.92


@app.post("/podcast")
def podcast(req: PodcastRequest):
    """Render a two-voice episode into one WAV with natural pauses; return timings for the transcript."""
    out_path = PODCASTS / f"{req.id}.wav"
    timings = []
    chunks: list[np.ndarray] = []
    cursor = 0
    for i, seg in enumerate(req.segments):
        pcm = to_rate(synth(seg.text, seg.voice, req.rate), PODCAST_RATE)
        timings.append({"index": i, "start": round(cursor / PODCAST_RATE, 3), "end": round((cursor + len(pcm)) / PODCAST_RATE, 3)})
        # Longer pause when the speaker changes, a short breath otherwise.
        nxt = req.segments[i + 1].voice if i + 1 < len(req.segments) else None
        pause = np.zeros(int((0.55 if nxt and nxt != seg.voice else 0.25) * PODCAST_RATE), dtype=np.int16)
        chunks += [pcm, pause]
        cursor += len(pcm) + len(pause)
    audio = np.concatenate(chunks)
    with wave.open(str(out_path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(PODCAST_RATE)
        w.writeframes(audio.tobytes())
    return {"id": req.id, "file": out_path.name, "duration": round(len(audio) / PODCAST_RATE, 2), "timings": timings}


PODCAST_RATE = 22050


def to_rate(wav_bytes: bytes, rate: int) -> np.ndarray:
    """Mono int16 PCM at `rate`. Voices differ (16 kHz vs 22.05 kHz); linear resampling is plenty for speech."""
    with wave.open(io.BytesIO(wav_bytes), "rb") as w:
        src = w.getframerate()
        pcm = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16)
    if src == rate:
        return pcm
    n = int(len(pcm) * rate / src)
    x = np.linspace(0, len(pcm) - 1, n)
    return np.interp(x, np.arange(len(pcm)), pcm.astype(np.float32)).astype(np.int16)
