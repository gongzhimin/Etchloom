"""
Lotus 3D Geometry CLI (Depth & Surface Normal Inference Service)

Exports raw Float32 binary (.bin) and visualization PNGs for zero-copy IPC into Etchloom.
Supports both deep-learning Lotus diffusion pipelines and resilient analytical fallback.
"""
import os
import sys

# Ensure high-speed Hugging Face access and suppress Windows symlink warning
os.environ.setdefault("HF_ENDPOINT", "https://hf-mirror.com")
os.environ.setdefault("HF_HUB_DISABLE_SYMLINKS_WARNING", "1")

import time
import json
import argparse
from pathlib import Path
from PIL import Image
import numpy as np
import torch

script_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(script_dir))

from pipeline_lotus import LotusGPipeline, LotusDPipeline
from utils_geometry import (
    save_float32_bin,
    save_depth_vis,
    save_normal_vis,
    compute_heuristic_geometry,
)


def parse_args():
    parser = argparse.ArgumentParser(description="Etchloom Lotus 3D Geometry Extractor")
    parser.add_argument("--input", "-i", type=str, required=True, help="Input RGB image path")
    parser.add_argument("--output-dir", "-o", type=str, required=True, help="Output directory for .bin and .png")
    parser.add_argument("--task", type=str, choices=["depth", "normal", "both"], default="both", help="Task to run")
    parser.add_argument("--model-depth", type=str, default="jingheya/lotus-depth-g-v1-0", help="Hugging Face depth model")
    parser.add_argument("--model-normal", type=str, default="jingheya/lotus-normal-g-v1-0", help="Hugging Face normal model")
    parser.add_argument("--device", type=str, default=None, help="Device (cuda or cpu)")
    parser.add_argument("--fp16", action="store_true", default=True, help="Use float16 half precision")
    parser.add_argument("--processing-res", type=int, default=768, help="Operating resolution (default 768)")
    parser.add_argument("--fallback", action="store_true", help="Force heuristic fallback without model download")
    return parser.parse_args()


def run_lotus_pipeline(image_path: str, model_id: str, task: str, device: torch.device, dtype: torch.dtype, processing_res: int):
    """Run single-step Lotus pipeline for either depth or normal estimation."""
    pipe = LotusGPipeline.from_pretrained(
        model_id,
        torch_dtype=dtype,
    ).to(device)
    pipe.set_progress_bar_config(disable=True)

    im = Image.open(image_path).convert("RGB")
    orig_w, orig_h = im.size
    im_np = np.array(im).astype(np.float32)
    im_tensor = torch.tensor(im_np).permute(2, 0, 1).unsqueeze(0)
    im_tensor = (im_tensor / 127.5 - 1.0).to(device=device, dtype=dtype)

    task_emb = torch.tensor([1, 0]).float().unsqueeze(0).repeat(1, 1).to(device)
    task_emb = torch.cat([torch.sin(task_emb), torch.cos(task_emb)], dim=-1).repeat(1, 1)

    with torch.no_grad():
        with torch.autocast(device.type):
            pred = pipe(
                rgb_in=im_tensor,
                prompt="",
                num_inference_steps=1,
                timesteps=[999],
                task_emb=task_emb,
                output_type="np",
                processing_res=processing_res,
                match_input_res=True,
                resample_method="bilinear",
            ).images[0]

    # Postprocess
    if task == "depth":
        # Depth is grayscale map in [0, 1]
        depth_np = pred.mean(axis=-1).astype(np.float32)
        # Ensure min is 0 and max is 1 (0 = near, 1 = far)
        d_min, d_max = depth_np.min(), depth_np.max()
        if d_max - d_min > 1e-6:
            depth_np = (depth_np - d_min) / (d_max - d_min)
        return depth_np
    else:
        # Normals are RGB in [0, 1] -> map to [-1, 1] and unit-normalize
        norm_raw = pred.astype(np.float32) * 2.0 - 1.0
        norms = np.linalg.norm(norm_raw, axis=-1, keepdims=True) + 1e-8
        normal_np = (norm_raw / norms).astype(np.float32)
        return normal_np


def main():
    t0 = time.time()
    args = parse_args()
    input_path = Path(args.input)
    if not input_path.exists():
        print(f"Error: input file '{input_path}' not found", file=sys.stderr)
        sys.exit(1)

    out_dir = Path(args.output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    im = Image.open(input_path).convert("RGB")
    w, h = im.size

    device_str = args.device or ("cuda" if torch.cuda.is_available() else "cpu")
    device = torch.device(device_str)
    dtype = torch.float16 if (args.fp16 and device.type == "cuda") else torch.float32

    depth_data = None
    normal_data = None
    model_used = "lotus-diffusion"

    if args.fallback:
        print("[Lotus CLI] Forced heuristic fallback mode.", file=sys.stderr)
        depth_data, normal_data = compute_heuristic_geometry(str(input_path), target_res=args.processing_res)
        model_used = "heuristic-cv"
    else:
        try:
            if args.task in ["depth", "both"]:
                print(f"[Lotus CLI] Estimating depth with {args.model_depth}...", file=sys.stderr)
                depth_data = run_lotus_pipeline(str(input_path), args.model_depth, "depth", device, dtype, args.processing_res)
            if args.task in ["normal", "both"]:
                print(f"[Lotus CLI] Estimating surface normals with {args.model_normal}...", file=sys.stderr)
                normal_data = run_lotus_pipeline(str(input_path), args.model_normal, "normal", device, dtype, args.processing_res)
        except Exception as e:
            print(f"[Lotus CLI] Deep learning inference failed: {e}. Falling back to analytical CV.", file=sys.stderr)
            depth_fallback, normal_fallback = compute_heuristic_geometry(str(input_path), target_res=args.processing_res)
            if depth_data is None:
                depth_data = depth_fallback
            if normal_data is None:
                normal_data = normal_fallback
            model_used = "heuristic-cv-fallback"

    elapsed = round(time.time() - t0, 3)

    # Save outputs
    meta = {
        "width": w,
        "height": h,
        "model_used": model_used,
        "elapsed_sec": elapsed,
    }

    if depth_data is not None:
        depth_bin_path = str(out_dir / "depth.bin")
        depth_vis_path = str(out_dir / "depth_vis.png")
        save_float32_bin(depth_bin_path, depth_data)
        save_depth_vis(depth_vis_path, depth_data)
        meta["depth_bin"] = "depth.bin"
        meta["depth_vis"] = "depth_vis.png"
        meta["depth_min"] = float(depth_data.min())
        meta["depth_max"] = float(depth_data.max())

    if normal_data is not None:
        normal_bin_path = str(out_dir / "normal.bin")
        normal_vis_path = str(out_dir / "normal_vis.png")
        save_float32_bin(normal_bin_path, normal_data)
        save_normal_vis(normal_vis_path, normal_data)
        meta["normal_bin"] = "normal.bin"
        meta["normal_vis"] = "normal_vis.png"

    meta_path = out_dir / "meta.json"
    meta_path.write_text(json.dumps(meta, indent=2), encoding="utf-8")
    print(f"[Lotus CLI] Successfully completed in {elapsed}s. Saved to {out_dir}")
    print(json.dumps(meta))


if __name__ == "__main__":
    main()
