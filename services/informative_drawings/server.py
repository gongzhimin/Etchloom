"""Local Informative Drawings inference service for Etchloom."""
from __future__ import annotations

import argparse
import io
import json
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import torch
import torch.nn as nn
from PIL import Image, ImageOps
from torchvision.transforms.functional import pil_to_tensor, to_pil_image


class ResidualBlock(nn.Module):
    def __init__(self, channels: int):
        super().__init__()
        self.conv_block = nn.Sequential(
            nn.ReflectionPad2d(1), nn.Conv2d(channels, channels, 3), nn.InstanceNorm2d(channels), nn.ReLU(True),
            nn.ReflectionPad2d(1), nn.Conv2d(channels, channels, 3), nn.InstanceNorm2d(channels),
        )

    def forward(self, value):
        return value + self.conv_block(value)


class Generator(nn.Module):
    def __init__(self):
        super().__init__()
        self.model0 = nn.Sequential(nn.ReflectionPad2d(3), nn.Conv2d(3, 64, 7), nn.InstanceNorm2d(64), nn.ReLU(True))
        self.model1 = nn.Sequential(
            nn.Conv2d(64, 128, 3, 2, 1), nn.InstanceNorm2d(128), nn.ReLU(True),
            nn.Conv2d(128, 256, 3, 2, 1), nn.InstanceNorm2d(256), nn.ReLU(True),
        )
        self.model2 = nn.Sequential(*(ResidualBlock(256) for _ in range(3)))
        self.model3 = nn.Sequential(
            nn.ConvTranspose2d(256, 128, 3, 2, 1, 1), nn.InstanceNorm2d(128), nn.ReLU(True),
            nn.ConvTranspose2d(128, 64, 3, 2, 1, 1), nn.InstanceNorm2d(64), nn.ReLU(True),
        )
        self.model4 = nn.Sequential(nn.ReflectionPad2d(3), nn.Conv2d(64, 1, 7), nn.Sigmoid())

    def forward(self, value):
        return self.model4(self.model3(self.model2(self.model1(self.model0(value)))))


class DrawingModel:
    def __init__(self, weights: Path, max_side: int):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.max_side = max_side
        self.lock = threading.Lock()
        self.model = Generator()
        state = torch.load(weights, map_location="cpu", weights_only=True)
        self.model.load_state_dict(state)
        self.model.to(self.device).eval()
        if self.device.type == "cuda":
            torch.backends.cudnn.benchmark = True

    def predict(self, payload: bytes) -> bytes:
        source = ImageOps.exif_transpose(Image.open(io.BytesIO(payload))).convert("RGB")
        original = source.size
        scale = min(1.0, self.max_side / max(original))
        if scale < 1:
            source = source.resize((max(4, round(original[0] * scale)), max(4, round(original[1] * scale))), Image.Resampling.LANCZOS)
        width, height = source.size
        padded_width, padded_height = (width + 3) // 4 * 4, (height + 3) // 4 * 4
        padded = Image.new("RGB", (padded_width, padded_height), "white")
        padded.paste(source, (0, 0))
        tensor = pil_to_tensor(padded).float().div_(255).unsqueeze(0).to(self.device)
        with self.lock, torch.inference_mode():
            output = self.model(tensor)[0].cpu().clamp_(0, 1)
        drawing = to_pil_image(output).crop((0, 0, width, height))
        if drawing.size != original:
            drawing = drawing.resize(original, Image.Resampling.LANCZOS)
        stream = io.BytesIO()
        drawing.save(stream, "PNG", optimize=True)
        return stream.getvalue()


def handler(model: DrawingModel):
    class Handler(BaseHTTPRequestHandler):
        server_version = "EtchloomModel/1.0"

        def cors(self):
            origin = self.headers.get("Origin", "")
            allowed = {"http://127.0.0.1:4173", "http://localhost:4173"}
            self.send_header("Access-Control-Allow-Origin", origin if origin in allowed else "http://127.0.0.1:4173")
            self.send_header("Vary", "Origin")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")

        def do_OPTIONS(self):
            self.send_response(204); self.cors(); self.end_headers()

        def do_GET(self):
            if self.path != "/health":
                self.send_error(404); return
            body = json.dumps({"ready": True, "device": str(model.device), "maxSide": model.max_side}).encode()
            self.send_response(200); self.cors(); self.send_header("Content-Type", "application/json"); self.send_header("Content-Length", str(len(body))); self.end_headers(); self.wfile.write(body)

        def do_POST(self):
            if self.path != "/infer":
                self.send_error(404); return
            length = int(self.headers.get("Content-Length", "0"))
            if length < 1 or length > 20 * 1024 * 1024:
                self.send_error(413, "Image must be between 1 byte and 20 MiB"); return
            try:
                output = model.predict(self.rfile.read(length))
                self.send_response(200); self.cors(); self.send_header("Content-Type", "image/png"); self.send_header("Content-Length", str(len(output))); self.end_headers(); self.wfile.write(output)
            except Exception as error:
                body = json.dumps({"error": str(error)}).encode()
                self.send_response(400); self.cors(); self.send_header("Content-Type", "application/json"); self.send_header("Content-Length", str(len(body))); self.end_headers(); self.wfile.write(body)

        def log_message(self, pattern, *args):
            print(f"{self.address_string()} - {pattern % args}")

    return Handler


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=7861)
    parser.add_argument("--max-side", type=int, default=1024)
    parser.add_argument("--weights", type=Path, default=Path(__file__).with_name("weights") / "model.pth")
    args = parser.parse_args()
    model = DrawingModel(args.weights, args.max_side)
    print(f"Informative Drawings ready on http://{args.host}:{args.port} ({model.device})", flush=True)
    ThreadingHTTPServer((args.host, args.port), handler(model)).serve_forever()


if __name__ == "__main__":
    main()
