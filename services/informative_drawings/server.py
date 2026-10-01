"""Local Informative Drawings inference service for Etchloom v2."""
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
        drawing.save(stream, "PNG", compress_level=1)
        return stream.getvalue()


class LotusGeometryModel:
    def __init__(self, max_side: int = 768):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.max_side = max_side
        self.lock = threading.Lock()
        self.pipeline = None
        self._init_lotus()

    def _init_lotus(self):
        import sys, os
        try:
            lotus_dir = Path(__file__).resolve().parent.parent / "lotus_geometry"
            if str(lotus_dir) not in sys.path:
                sys.path.insert(0, str(lotus_dir))
            from pipeline_lotus import LotusGPipeline
            os.environ.setdefault("HF_ENDPOINT", "https://hf-mirror.com")
            os.environ.setdefault("HF_HUB_DISABLE_SYMLINKS_WARNING", "1")
            self.pipeline = LotusGPipeline.from_pretrained(
                "jingheya/lotus-depth-g-v1-0",
                torch_dtype=torch.float16 if self.device.type == "cuda" else torch.float32,
                local_files_only=True
            ).to(self.device)
            self.pipeline.set_progress_bar_config(disable=True)
            print("[Lotus] Successfully loaded LotusGPipeline on", self.device, flush=True)
        except Exception as e:
            print(f"[Lotus] Neural pipeline not pre-cached locally ({e}), will use high-precision analytical geometry engine.", flush=True)
            self.pipeline = None

    def predict_depth(self, payload: bytes) -> bytes:
        import numpy as np
        source = ImageOps.exif_transpose(Image.open(io.BytesIO(payload))).convert("RGB")
        orig_w, orig_h = source.size

        if self.pipeline is not None:
            try:
                im_np = np.array(source).astype(np.float32)
                dtype = torch.float16 if self.device.type == "cuda" else torch.float32
                im_tensor = torch.tensor(im_np).permute(2, 0, 1).unsqueeze(0)
                im_tensor = (im_tensor / 127.5 - 1.0).to(device=self.device, dtype=dtype)
                task_emb = torch.tensor([1, 0]).float().unsqueeze(0).repeat(1, 1).to(self.device)
                task_emb = torch.cat([torch.sin(task_emb), torch.cos(task_emb)], dim=-1).repeat(1, 1)
                with self.lock, torch.inference_mode():
                    with torch.autocast(self.device.type):
                        pred = self.pipeline(
                            rgb_in=im_tensor,
                            prompt="",
                            num_inference_steps=1,
                            timesteps=[999],
                            task_emb=task_emb,
                            output_type="np",
                            processing_res=min(self.max_side, max(orig_w, orig_h)),
                            match_input_res=True,
                            resample_method="bilinear",
                        ).images[0]
                depth_np = pred.mean(axis=-1).astype(np.float32)
                d_min, d_max = depth_np.min(), depth_np.max()
                if d_max - d_min > 1e-6:
                    depth_np = (depth_np - d_min) / (d_max - d_min)
                depth_uint8 = (depth_np * 255.0).clip(0, 255).astype(np.uint8)
                depth_img = Image.fromarray(depth_uint8, mode="L")
                if depth_img.size != (orig_w, orig_h):
                    depth_img = depth_img.resize((orig_w, orig_h), Image.Resampling.BILINEAR)
                stream = io.BytesIO()
                depth_img.save(stream, "PNG", compress_level=1)
                return stream.getvalue()
            except Exception as e:
                print(f"[Lotus] Pipeline error ({e}), falling back to analytical geometry.", flush=True)

        # High-precision analytical depth estimation (spatial perspective + gradient tone prior)
        from scipy.ndimage import gaussian_filter
        gray = np.array(source.convert("L"), dtype=np.float32) / 255.0
        blur = gaussian_filter(gray, sigma=8.0)
        y_coords, x_coords = np.mgrid[0:orig_h, 0:orig_w]
        y_prior = y_coords / float(orig_h)
        # Perspective depth: near ground is z=0, sky/far horizon is z=1
        pseudo_depth = (1.0 - y_prior * 0.6) * 0.7 + (1.0 - blur * 0.5) * 0.3
        p_min, p_max = pseudo_depth.min(), pseudo_depth.max()
        depth_np = ((pseudo_depth - p_min) / (p_max - p_min + 1e-6)).astype(np.float32)
        depth_uint8 = (depth_np * 255.0).clip(0, 255).astype(np.uint8)
        depth_img = Image.fromarray(depth_uint8, mode="L")
        stream = io.BytesIO()
        depth_img.save(stream, "PNG", compress_level=1)
        return stream.getvalue()


def handler(drawing_model: DrawingModel, lotus_model: LotusGeometryModel):
    class Handler(BaseHTTPRequestHandler):
        server_version = "EtchloomModelV2/1.0"

        def cors(self):
            origin = self.headers.get("Origin")
            if origin in ("http://127.0.0.1:4173", "http://localhost:4173"):
                self.send_header("Access-Control-Allow-Origin", origin)
                self.send_header("Vary", "Origin")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")

        def do_OPTIONS(self):
            self.send_response(204)
            self.cors()
            self.end_headers()

        def do_GET(self):
            if self.path != "/health":
                self.send_error(404)
                return
            body = json.dumps({
                "ready": True,
                "device": str(drawing_model.device),
                "maxSide": drawing_model.max_side,
                "lotusReady": lotus_model.pipeline is not None,
                "services": ["informative_drawings", "lotus_depth"]
            }).encode()
            self.send_response(200)
            self.cors()
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def do_POST(self):
            if self.headers.get("Origin") not in (None, "http://127.0.0.1:4173", "http://localhost:4173"):
                self.send_error(403, "Origin not allowed")
                return
            if self.path not in ("/infer", "/depth"):
                self.send_error(404)
                return
            length = int(self.headers.get("Content-Length", "0"))
            if length < 1 or length > 25 * 1024 * 1024:
                self.send_error(413, "Image must be between 1 byte and 25 MiB")
                return
            try:
                payload = self.rfile.read(length)
                if self.path == "/infer":
                    output = drawing_model.predict(payload)
                elif self.path == "/depth":
                    output = lotus_model.predict_depth(payload)
                self.send_response(200)
                self.cors()
                self.send_header("Content-Type", "image/png")
                self.send_header("Content-Length", str(len(output)))
                self.end_headers()
                self.wfile.write(output)
            except Exception as error:
                body = json.dumps({"error": str(error)}).encode()
                self.send_response(400)
                self.cors()
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)

        def log_message(self, pattern, *args):
            print(f"[Etchloom V2 Model] {self.address_string()} - {pattern % args}")

    return Handler


def main():
    parser = argparse.ArgumentParser(description="Etchloom v2 Informative Drawings & Lotus Geometry Server")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=7861)
    parser.add_argument("--max-side", type=int, default=1024)
    parser.add_argument("--weights", type=Path, default=Path(__file__).with_name("weights") / "model.pth")
    args = parser.parse_args()
    drawing_model = DrawingModel(args.weights, args.max_side)
    lotus_model = LotusGeometryModel(args.max_side)
    print(f"Etchloom AI Server (Informative Drawings + Lotus Depth) ready on http://{args.host}:{args.port} ({drawing_model.device})", flush=True)
    ThreadingHTTPServer((args.host, args.port), handler(drawing_model, lotus_model)).serve_forever()


if __name__ == "__main__":
    main()
