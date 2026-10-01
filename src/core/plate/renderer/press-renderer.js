(function(root) {
  'use strict';

/**
 * Press Renderer (工序 3 & 4: 油墨流变转印与棉纸凹印)
 * Pure numerical rendering of copper plate and printmaking optics.
 * Zero DOM dependencies; produces pure Uint8ClampedArray pixel buffers.
 */
/**
 * Renders the virtual plate into an RGBA pixel buffer.
 *
 * @param {Object} plate Virtual plate context
 * @param {number} plate.width Plate width
 * @param {number} plate.height Plate height
 * @param {Float32Array} plate.depthField Groove depth field [0.0 ~ 1.0]
 * @param {Float32Array} plate.exposedField Metal surface exposure [0.0 ~ 1.0]
 * @param {Uint8Array} plate.blockedField Stop-out varnish mask [0 or 1]
 * @param {Float32Array} plate.burrField Drypoint burr height [0.0 ~ 1.0]
 * @param {Float32Array} plate.grainNoise Metallurgical grain noise [0.0 ~ 1.0]
 * @param {'plate'|'depth'|'print'} [mode='plate'] View mode
 * @param {Object} [options={}] Print and rendering parameters
 * @param {number} [options.ink=0.90] Ink density [0.0 ~ 1.0]
 * @param {number} [options.pressure=0.65] Press roller pressure [0.0 ~ 1.0]
 * @param {number} [options.tone=0.04] Surface plate wiping tone [0.0 ~ 1.0]
 * @param {'rough'|'smooth'} [options.paper='rough'] Cotton paper finish
 * @param {number} [options.seed=17] Print randomness seed
 * @param {Uint8ClampedArray} [targetBuffer] Optional pre-allocated buffer (W * H * 4) to avoid GC
 * @returns {{ width: number, height: number, pixels: Uint8ClampedArray }} Rendered bitmap container
 */
function renderPlate(plate, mode = 'plate', options = {}, targetBuffer = null) {
  const {
    width: W,
    height: H,
    depthField: depth,
    exposedField: exposed,
    blockedField: blocked,
    burrField: burr,
    grainNoise
  } = plate;

  const N = W * H;
  const pixels = targetBuffer || new Uint8ClampedArray(N * 4);

  const ink = options.ink ?? 0.90;
  const pressure = options.pressure ?? 0.65;
  const tone = options.tone ?? 0.04;
  const rough = options.paper !== 'smooth';
  const seed = options.seed ?? 17;

  const pm = Math.round(26 * W / 900);
  const bw = Math.round(7 * W / 900);

  for (let y = 0; y < H; y++) {
    const row = y * W;
    for (let x = 0; x < W; x++) {
      const i = row + x;
      // In print mode, physical transfer produces horizontal mirror: x_print = W - 1 - x
      const j = mode === 'print' ? row + (W - 1 - x) : i;

      const d = depth[j];
      const bu = burr[j];
      const noise = grainNoise[i];
      let r, g, b;

      if (mode === 'depth') {
        const dVal = Math.min(1.0, d + bu * 0.4);
        r = g = b = dVal * 255;
      } else if (mode === 'plate') {
        const slope = d - depth[Math.max(0, j - 1)];
        const cut = exposed[j];
        const burrReflect = bu * 55;

        r = 116 + noise * 9 - d * 67 + slope * 110 + cut * 27 + burrReflect;
        g = 85 + noise * 7 - d * 50 + slope * 95 + cut * 25 + burrReflect * 0.9;
        b = 61 + noise * 5 - d * 29 + slope * 75 + cut * 23 + burrReflect * 0.8;

        if (blocked[j]) {
          r *= 0.42;
          g *= 0.32;
          b *= 0.20;
        }
      } else {
        // 'print' mode: intaglio ink transfer onto rag cotton paper
        const texture = rough ? noise * 9 : noise * 3.5;
        const paperR = 248 - texture;
        const paperG = 242 - texture;
        const paperB = 226 - texture;

        const dxLeft = x - pm;
        const dxRight = W - 1 - pm - x;
        const dyTop = y - pm;
        const dyBottom = H - 1 - pm - y;
        const minBorderDist = Math.min(dxLeft, dxRight, dyTop, dyBottom);

        if (minBorderDist < -bw) {
          // Untouched paper outside plate
          r = paperR + 2;
          g = paperG + 1;
          b = paperB;
        } else if (minBorderDist <= bw) {
          // Plate Bevel debossing transition
          const t = (minBorderDist + bw) / (2 * bw);
          const isShadowSide = (dxLeft < dxRight && dxLeft <= dyBottom) || (dyTop < dyBottom && dyTop <= dxRight);
          const bevel = isShadowSide
            ? (-54 * pressure * Math.sin(t * Math.PI))
            : (38 * pressure * Math.sin(t * Math.PI));

          r = Math.max(0, Math.min(255, paperR + bevel));
          g = Math.max(0, Math.min(255, paperG + bevel));
          b = Math.max(0, Math.min(255, paperB + bevel));
        } else {
          // Inside plate area: intaglio transfer
          const dropOut = 0.07 * (1.0 - pressure);
          const effD = Math.max(0, d - dropOut);
          const transferRate = effD > 0 ? (1.0 - Math.exp(-effD * (1.8 + 13.0 * pressure))) : 0;
          const burrInk = bu * 0.95 * ink * (0.30 + 0.70 * pressure);
          const dryThreshold = Math.max(0, (0.65 - ink) * 1.65);
          const dryBreak = (dryThreshold > 0 && noise < dryThreshold) ? 0.0 : 1.0;
          const lineInk = (transferRate * (0.25 + 0.75 * ink) + burrInk) * dryBreak;
          const variation = rough ? (0.75 + grainNoise[(i + seed * 997) % N] * 0.5) : 1.0;
          const surfaceTone = tone * ink * 0.32;
          const black = Math.min(0.98, lineInk * variation + surfaceTone);

          const pressedR = paperR - 1.5;
          const pressedG = paperG - 1.5;
          const pressedB = paperB - 1.0;

          r = Math.max(0, Math.min(255, pressedR * (1.0 - black)));
          g = Math.max(0, Math.min(255, pressedG * (1.0 - black)));
          b = Math.max(0, Math.min(255, pressedB * (1.0 - black)));
        }
      }

      const pixelIdx = i * 4;
      pixels[pixelIdx] = r;
      pixels[pixelIdx + 1] = g;
      pixels[pixelIdx + 2] = b;
      pixels[pixelIdx + 3] = 255;
    }
  }

  return { width: W, height: H, pixels };
}

  const api = { renderPlate };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.PressRenderer = api;
    root.renderPlate = renderPlate;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
