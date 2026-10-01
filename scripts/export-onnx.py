# -*- coding: utf-8 -*-
"""Export Informative Drawings PyTorch weights to standard ONNX model."""
import sys
from pathlib import Path
import torch

def export_model():
    root = Path(__file__).resolve().parent.parent
    sys.path.insert(0, str(root / 'services' / 'informative_drawings'))
    from server import Generator

    weights_path = root / 'services' / 'informative_drawings' / 'weights' / 'model.pth'
    if not weights_path.exists():
        print(f"Weights file not found: {weights_path}")
        return False

    print("Loading PyTorch model...")
    model = Generator()
    state = torch.load(weights_path, map_location='cpu', weights_only=True)
    model.load_state_dict(state)
    model.eval()

    out_dir = root / 'models'
    out_dir.mkdir(exist_ok=True)
    out_path = out_dir / 'informative-drawings.onnx'

    dummy_input = torch.randn(1, 3, 512, 512)
    print(f"Exporting to {out_path}...")
    torch.onnx.export(
        model, dummy_input, str(out_path),
        input_names=['input'], output_names=['output'],
        dynamic_axes={'input': {2: 'height', 3: 'width'}, 'output': {2: 'height', 3: 'width'}},
        opset_version=14
    )
    print(f"Export successful. Size: {out_path.stat().st_size / (1024*1024):.2f} MB")
    return True

if __name__ == '__main__':
    export_model()
