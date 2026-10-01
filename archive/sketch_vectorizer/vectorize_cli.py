#!/usr/bin/env python3
"""Headless CLI for Deep Sketch Vectorization (SIGGRAPH 2024).
Takes an input line drawing raster image, runs UDF + NDC models on GPU/CPU,
and outputs clean, continuous vector strokes as JSON.
"""

import argparse
import json
import os
import re
import sys
import time
from pathlib import Path

# Add repo directory to sys.path so its network and utils packages can be imported
CURRENT_DIR = Path(__file__).resolve().parent
REPO_DIR = CURRENT_DIR / "repo"
if str(REPO_DIR) not in sys.path:
    sys.path.insert(0, str(REPO_DIR))

import numpy as np
import torch
from PIL import Image

# Import core methods from predict_s1
import predict_s1


def parse_svg_paths(svg_path: str):
    """Extract polylines from SVG path elements (M x y L x y ...)."""
    with open(svg_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Match viewBox or width/height
    vb_match = re.search(r'viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"', content)
    if vb_match:
        svg_w = float(vb_match.group(1))
        svg_h = float(vb_match.group(2))
    else:
        w_m = re.search(r'width="(\d+(?:\.\d+)?)"', content)
        h_m = re.search(r'height="(\d+(?:\.\d+)?)"', content)
        svg_w = float(w_m.group(1)) if w_m else 800.0
        svg_h = float(h_m.group(1)) if h_m else 600.0

    raw_paths = re.findall(r'<path d="([^"]+)"', content)
    strokes = []

    for d in raw_paths:
        tokens = d.strip().split()
        pts = []
        i = 0
        while i < len(tokens):
            tok = tokens[i]
            if tok in ('M', 'L'):
                i += 1
                if i < len(tokens):
                    coord_str = tokens[i]
                    if ',' in coord_str:
                        x_str, y_str = coord_str.split(',')
                    else:
                        x_str = coord_str
                        i += 1
                        y_str = tokens[i] if i < len(tokens) else '0'
                    try:
                        pts.append([float(x_str), float(y_str)])
                    except ValueError:
                        pass
            elif tok in ('Z', 'z'):
                if pts:
                    pts.append(pts[0])
            i += 1
        if len(pts) >= 2:
            strokes.append(pts)

    return svg_w, svg_h, strokes


def vectorize_image(
    image_path: str,
    output_json: str,
    output_svg: str = None,
    model_type: str = "full",
    model_udf: str = None,
    model_ndc: str = None,
    device: str = "cuda",
    resize_to: int = 0,
    bezier: bool = True,
    rdp: bool = True
):
    t0 = time.time()
    device = "cuda" if (device == "cuda" and torch.cuda.is_available()) else "cpu"

    if model_udf is None:
        udf_filename = "udf_light.pth" if model_type == "light" else "udf_full.pth"
        model_udf = str(REPO_DIR / "pretrained" / udf_filename)
    if model_ndc is None:
        ndc_filename = "ndc_light.pth" if model_type == "light" else "ndc_full.pth"
        model_ndc = str(REPO_DIR / "pretrained" / ndc_filename)

    orig_img = Image.open(image_path).convert("RGB")
    orig_w, orig_h = orig_img.size

    # Set up global state in predict_s1 module
    predict_s1.DEVICE = device
    name = Path(image_path).stem

    # Use a clean isolated temp directory
    temp_dir = str(CURRENT_DIR / "tmp_runs" / f"{name}_{int(time.time()*1000)}")
    os.makedirs(temp_dir, exist_ok=True)
    predict_s1.TEMP_DIR = temp_dir
    predict_s1.FILE_NAME = name

    try:
        # 1. Load image and preprocess
        long_side = max(orig_w, orig_h)
        r_size = resize_to if resize_to > 0 else max(1024, long_side)
        predict_s1.open_img(
            orig_img,
            thin=False,
            line_extractor=False,
            name=name,
            resize_to=r_size
        )

        # 2. Run UDF + NDC vectorization
        predict_s1.vectorize(
            path_model_ndc=model_ndc,
            path_model_udf=model_udf,
            refine=True
        )

        # 3. Finalize with RDP and Bézier
        predict_s1.finalize(
            bezier=bezier,
            rdp_simplify=rdp
        )

        # 4. Parse output SVG
        final_svg = os.path.join(temp_dir, f"{name}_final.svg")
        if not os.path.exists(final_svg):
            final_svg = os.path.join(temp_dir, f"{name}_refine.svg")

        if not os.path.exists(final_svg):
            raise RuntimeError(f"Vectorization failed to produce SVG in {temp_dir}")

        svg_w, svg_h, strokes = parse_svg_paths(final_svg)

        # Scale strokes back to original image dimensions if resized
        scale_x = orig_w / svg_w
        scale_y = orig_h / svg_h

        scaled_strokes = []
        for s in strokes:
            scaled_stroke = []
            for pt in s:
                scaled_stroke.append([
                    round(pt[0] * scale_x, 2),
                    round(pt[1] * scale_y, 2)
                ])
            if len(scaled_stroke) >= 2:
                scaled_strokes.append(scaled_stroke)

        result_data = {
            "width": orig_w,
            "height": orig_h,
            "strokes": scaled_strokes,
            "count": len(scaled_strokes),
            "elapsed_ms": round((time.time() - t0) * 1000, 1),
            "device": device
        }

        with open(output_json, 'w', encoding='utf-8') as f:
            json.dump(result_data, f)

        if output_svg:
            # Also write cleanly scaled SVG
            header = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {orig_w} {orig_h}" width="{orig_w}" height="{orig_h}">\n'
            header += '  <g fill="none" stroke="#000000" stroke-linecap="round" stroke-linejoin="round">\n'
            body = '\n'.join(
                f'    <path d="M ' + ' L '.join(f'{pt[0]} {pt[1]}' for pt in s) + '" stroke-width="1.0"/>'
                for s in scaled_strokes
            )
            footer = '\n  </g>\n</svg>\n'
            with open(output_svg, 'w', encoding='utf-8') as f:
                f.write(header + body + footer)

        print(f"[VectorizeCLI] Success: {len(scaled_strokes)} strokes extracted in {result_data['elapsed_ms']}ms ({device})", flush=True)

    finally:
        # Clean up temp directory
        import shutil
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir, ignore_errors=True)


def main():
    parser = argparse.ArgumentParser(description="Deep Sketch Vectorization Headless CLI")
    parser.add_argument("--input", "-i", required=True, help="Input line drawing image path")
    parser.add_argument("--output", "-o", required=True, help="Output JSON path")
    parser.add_argument("--output-svg", help="Optional output SVG path")
    parser.add_argument("--model-type", choices=["full", "light"], default="full", help="Model weights variant")
    parser.add_argument("--model-udf", help="UDF model weights path")
    parser.add_argument("--model-ndc", help="NDC model weights path")
    parser.add_argument("--device", default="cuda", choices=["cuda", "cpu"])
    parser.add_argument("--resize-to", type=int, default=0, help="Resize long side if > 0")
    parser.add_argument("--no-bezier", action="store_true", help="Disable bezier fitting")
    parser.add_argument("--no-rdp", action="store_true", help="Disable RDP simplification")
    args = parser.parse_args()

    vectorize_image(
        image_path=args.input,
        output_json=args.output,
        output_svg=args.output_svg,
        model_type=args.model_type,
        model_udf=args.model_udf,
        model_ndc=args.model_ndc,
        device=args.device,
        resize_to=args.resize_to,
        bezier=not args.no_bezier,
        rdp=not args.no_rdp
    )


if __name__ == "__main__":
    main()
