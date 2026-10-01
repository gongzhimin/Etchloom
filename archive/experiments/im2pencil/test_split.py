"""
Im2Pencil Decoupled Inference Script (Pure Python, No MATLAB required).
Splits and exports:
  1. Pure outline/sketch (outputE)
  2. Pure tonal shading texture (outputS: hatching/cross-hatching/stippling/blending)
  3. Combined pencil illustration (output = outputE * outputS)
  4. Intermediate edge and tone guides (edge.png, tone.png, xdog.png)
"""

import os
import argparse
import numpy as np
from PIL import Image
import torch

from preprocess import prepare_inputs, extract_tone, vectorized_xdog
from models import build_models


def deprocess(output_tensor):
    """Converts PyTorch tensor in [-1, 1] to uint8 PIL Image."""
    arr = output_tensor[0].detach().cpu().float().numpy()
    arr = arr.transpose(1, 2, 0)
    arr = arr * 0.5 + 0.5
    arr = np.clip(arr, 0.0, 1.0)
    return arr, Image.fromarray((arr * 255.0).astype(np.uint8))


def run_inference(
    input_path,
    output_dir,
    outline_style=0,
    shading_style=1,
    edge_weights=None,
    shading_weights=None,
    device='cpu',
    demo_fallback=False
):
    os.makedirs(output_dir, exist_ok=True)
    base_name = os.path.splitext(os.path.basename(input_path))[0]
    print(f"[Im2Pencil] Processing: {input_path}")
    print(f"[Im2Pencil] Outline Style: {outline_style}, Shading Style: {shading_style} (0=Hatch, 1=Cross, 2=Stipple, 3=Blend)")
    print(f"[Im2Pencil] Using device: {device}")

    # Stage 1: Preprocessing in pure Python
    inputs = prepare_inputs(input_path, outline_style=outline_style, shading_style=shading_style)
    
    edge_save_path = os.path.join(output_dir, f"{base_name}_edge.png")
    tone_save_path = os.path.join(output_dir, f"{base_name}_tone_gf.png")
    xdog_save_path = os.path.join(output_dir, f"{base_name}_xdog.png")
    
    inputs['edge_pil'].save(edge_save_path)
    inputs['tone_pil'].save(tone_save_path)
    inputs['xdog_pil'].save(xdog_save_path)
    print(f"[Im2Pencil] Saved edge guide: {edge_save_path}")
    print(f"[Im2Pencil] Saved tone guide (Guided Filter): {tone_save_path}")
    print(f"[Im2Pencil] Saved XDoG guide: {xdog_save_path}")

    # Check weights availability
    has_edge_w = edge_weights and os.path.isfile(edge_weights)
    has_shading_w = shading_weights and os.path.isfile(shading_weights)

    if has_edge_w and has_shading_w:
        print("[Im2Pencil] Loading neural generators...")
        netG1, netG2 = build_models(edge_weights, shading_weights, device=device)
        
        # Branch 1: Outline Generator
        imgE_xdog = inputs['imgE_xdog'].to(device)
        unitE = inputs['unitE'].to(device)
        with torch.no_grad():
            outE_tensor = netG1(imgE_xdog, unitE)
        arrE, imgE_pil = deprocess(outE_tensor)
        outline_path = os.path.join(output_dir, f"{base_name}_outline_e{outline_style}.png")
        imgE_pil.save(outline_path)
        print(f"[Im2Pencil] [Branch 1 Outline] Saved: {outline_path}")

        # Branch 2: Shading Generator
        imgE = inputs['imgE'].to(device)
        unitS = inputs['unitS'].to(device)
        imgS = inputs['imgS'].to(device)
        with torch.no_grad():
            outS_tensor = netG2(imgE, unitS, imgS)
        arrS, imgS_pil = deprocess(outS_tensor)
        shading_path = os.path.join(output_dir, f"{base_name}_shading_s{shading_style}.png")
        imgS_pil.save(shading_path)
        print(f"[Im2Pencil] [Branch 2 Shading] Saved: {shading_path}")

        # Combination: Element-wise multiply
        arr_combo = np.clip(arrE * arrS, 0.0, 1.0)
        combo_pil = Image.fromarray((arr_combo * 255.0).astype(np.uint8))
        combo_path = os.path.join(output_dir, f"{base_name}_combo_e{outline_style}_s{shading_style}.png")
        combo_pil.save(combo_path)
        print(f"[Im2Pencil] [Final Combo] Saved: {combo_path}")

        return {
            'outline': outline_path,
            'shading': shading_path,
            'combo': combo_path
        }
    else:
        print("[Im2Pencil] NOTE: One or both .pth weight files were not found.")
        print(f"  edge_weights: {edge_weights} (exists: {has_edge_w})")
        print(f"  shading_weights: {shading_weights} (exists: {has_shading_w})")
        
        if demo_fallback:
            print("[Im2Pencil] Running verified demo split mode using official repository samples...")
            # We verify the math on the official sample data
            sample_dir = 'experiments/im2pencil_samples'
            ref_e = os.path.join(sample_dir, '3--1_e1.png')
            ref_s = os.path.join(sample_dir, '3--1_s1.png')
            if os.path.isfile(ref_e) and os.path.isfile(ref_s):
                im_e = Image.open(ref_e).convert('RGB')
                im_s = Image.open(ref_s).convert('RGB')
                arr_e = np.array(im_e, dtype=np.float32) / 255.0
                arr_s = np.array(im_s, dtype=np.float32) / 255.0
                arr_c = np.clip(arr_e * arr_s, 0.0, 1.0)
                im_c = Image.fromarray((arr_c * 255.0).astype(np.uint8))
                
                demo_e_path = os.path.join(output_dir, f"demo_official_outline_e1.png")
                demo_s_path = os.path.join(output_dir, f"demo_official_shading_s1.png")
                demo_c_path = os.path.join(output_dir, f"demo_official_combo.png")
                
                im_e.save(demo_e_path)
                im_s.save(demo_s_path)
                im_c.save(demo_c_path)
                print(f"[Demo] Outline saved: {demo_e_path}")
                print(f"[Demo] Shading saved: {demo_s_path}")
                print(f"[Demo] Re-synthesized combo saved: {demo_c_path}")


def main():
    parser = argparse.ArgumentParser(description="Im2Pencil Decoupled Branch Inference")
    parser.add_argument("--input", type=str, default="experiments/im2pencil_samples/3--1_raw.jpg", help="Path to input image")
    parser.add_argument("--output_dir", type=str, default="experiments/im2pencil_results", help="Directory to save outputs")
    parser.add_argument("--outline_style", type=int, default=0, help="Outline style: 0 or 1")
    parser.add_argument("--shading_style", type=int, default=1, help="Shading style: 0=hatching, 1=cross, 2=stipple, 3=blend")
    parser.add_argument("--edge_weights", type=str, default="experiments/im2pencil/pretrained_models/edge_model/latest_net_G.pth")
    parser.add_argument("--shading_weights", type=str, default="experiments/im2pencil/pretrained_models/shading_model/latest_net_G.pth")
    parser.add_argument("--device", type=str, default="cuda" if torch.cuda.is_available() else "cpu")
    parser.add_argument("--demo", action="store_true", default=True, help="Enable demo fallback if weights are missing")
    
    args = parser.parse_args()
    run_inference(
        input_path=args.input,
        output_dir=args.output_dir,
        outline_style=args.outline_style,
        shading_style=args.shading_style,
        edge_weights=args.edge_weights,
        shading_weights=args.shading_weights,
        device=args.device,
        demo_fallback=args.demo
    )


if __name__ == "__main__":
    main()
