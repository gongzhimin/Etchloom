"""Direct CLI inference for Informative Drawings."""
import sys
import io
from pathlib import Path
from PIL import Image
import json

script_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(script_dir))
from server import DrawingModel

def main():
    if len(sys.argv) < 3:
        print("Usage: infer_cli.py <input_image> <output_image_or_json> [--raw-json]", file=sys.stderr)
        sys.exit(1)

    input_path = Path(sys.argv[1])
    output_path = Path(sys.argv[2])
    raw_bytes = input_path.read_bytes()

    weights_path = script_dir / "weights" / "model.pth"
    if not weights_path.exists():
        raise FileNotFoundError(f"Weights not found at {weights_path}")

    model = DrawingModel(weights_path, max_side=1200)
    out_png_bytes = model.predict(raw_bytes)

    if output_path.suffix.lower() == ".ppm":
        out_im = Image.open(io.BytesIO(out_png_bytes)).convert("L")
        out_im.save(output_path)
    elif "--raw-json" in sys.argv:
        out_im = Image.open(io.BytesIO(out_png_bytes)).convert("L")
        w, h = out_im.size
        pixels = [round(v / 255.0, 4) for v in out_im.getdata()]
        output_path.write_text(json.dumps({"width": w, "height": h, "data": pixels}), encoding="utf-8")
    else:
        output_path.write_bytes(out_png_bytes)

if __name__ == "__main__":
    main()
