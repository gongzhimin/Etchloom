import json
from PIL import Image, ImageDraw

w, h = 600, 800
out_dir = r"D:\workshop\molandi_printmaking\v2\experiments\inspect_case05_layers"

def render(paths, filename):
    im = Image.new("RGB", (w, h), (255, 255, 255))
    draw = ImageDraw.Draw(im)
    for p in paths:
        pts = [(pt[0], pt[1]) for pt in p.get("points", [])]
        if len(pts) >= 2:
            width = max(1, int(round((p.get("width", 0.3) or 0.3) * 1.5)))
            draw.line(pts, fill=(20, 20, 20), width=width)
    im.save(f"{out_dir}/{filename}.png")

with open(f"{out_dir}/contours.json") as f: render(json.load(f), "1_contours_only")
with open(f"{out_dir}/hatch_ceramic.json") as f: render(json.load(f), "2_hatch_ceramic")
with open(f"{out_dir}/hatch_arch.json") as f: render(json.load(f), "3_hatch_arch")
