# Etchloom

**Weave images into digital prints.**

Etchloom is a local-first digital printmaking studio. It translates photographs into structured engraving marks, then lets you work with the result as a virtual plate: guide the hatch direction, reserve highlights, deepen the etch, apply ink, set pressure, and pull a print.

![Etchloom workbench showing the source image and generated engraving](docs/images/etchloom-workbench.png)

## From image to impression

```text
Image analysis → Engraving grammar → Virtual plate → Etching → Ink & pressure → Print
```

Etchloom rebuilds image information with a vocabulary inspired by intaglio printmaking:

- **Regional hatching** keeps neighboring marks coherent instead of varying every pixel.
- **Cross-hatching** enters progressively through midtones and shadows.
- **Micro-engraving marks** retain small edges, hair, foliage, masonry, and surface changes.
- **Lost-and-found contours** open weak edges while preserving decisive silhouettes.
- **Dark masses and plate tone** create depth without filling every shadow uniformly.
- **Deterministic seeds** make every design reproducible and open to controlled variation.

## A virtual plate, not just an image

The generated drawing can be transferred to a simulated copper plate. The plate stores depth, exposed material, and stop-out protection separately from the printed appearance. One plate can therefore produce different impressions as ink, pressure, wiping, and paper change.

Local tools provide a compact editing workflow:

| Tool | Purpose |
|---|---|
| Direction guide | Bend marks toward a chosen local direction |
| White | Remove marks and recover paper |
| Protect | Freeze a finished region while generating variations |
| Needle / Drypoint | Add marks directly to the virtual plate |
| Stop-out / Burnisher | Protect or reduce existing plate depth |

## Try it

Etchloom has no runtime dependencies and no build step.

### Open directly

Double-click `index.html`. This keeps the entire workflow offline. Complex generations run on the main browser thread in this mode.

### Run the local studio

Node.js 20 or newer is recommended:

```bash
npm start
```

Open <http://127.0.0.1:4173/>. The local server enables background generation with a Web Worker, so the interface remains responsive during detailed analysis.

To open the included demonstration automatically:

```text
http://127.0.0.1:4173/?demo=1
```

Uploaded images remain on the device. Etchloom does not send image data to a server.

## Export and reproducibility

Etchloom exports:

- print-ready PNG with physical DPI metadata;
- scalable SVG engraving paths;
- deterministic design recipes;
- complete virtual plates with depth and stop-out data.

Target needle width and ink-gain compensation affect the plate, PNG, and SVG output. Saved design recipes contain the grayscale analysis, parameters, and seeds; they do not contain the original color photograph.

## Project structure

```text
.
├─ index.html                 Browser entry and virtual plate studio
├─ src/
│  ├─ core/                  Generation, engraving, and plate codecs
│  ├─ ui/                    Image workflow and local editing
│  └─ workers/               Background generation worker
├─ styles/                   Workbench styles
├─ tests/                    Deterministic Node test suite
├─ examples/                 Programmatically created sample images
├─ docs/                     Algorithm notes and refinement plans
├─ scripts/                  Local server and benchmark
└─ .github/workflows/        Continuous integration
```

## Development

```bash
npm test          # Run the complete test suite
npm run benchmark # Update BENCHMARK.json
npm start         # Start the local studio
```

The core uses browser-compatible scripts that can also be loaded by Node tests. The current suite covers deterministic generation, fine-feature retention, regional engraving grammar, virtual plate persistence, physical stroke scaling, Worker cancellation, and direct-file operation.

Read the [engraving texture plan](docs/LINE_TEXTURE_PLAN.md) for the visual system and the [refinement record](docs/REFINEMENT_PLAN.md) for implementation history. Contributions are described in [CONTRIBUTING.md](CONTRIBUTING.md).

## Material calibration

The plate-depth, paper, ink, and pressure model is designed for visual experimentation. Needle-width conversion is physically scaled, while absorption and pressure presets still require calibration against real printed sheets.

## License

[MIT](LICENSE) © 2026 Contributors
