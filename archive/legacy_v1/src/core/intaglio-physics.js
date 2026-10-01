/* Copperplate Intaglio Etching Physical Simulation Engine.
 * Pure JS; dependency-free; compatible with Node.js and browser environments.
 */
(function (root) {
  'use strict';

  function random(seed) {
    let s = (seed >>> 0) || 1;
    return () => {
      s += 0x6D2B79F5;
      let t = Math.imul(s ^ s >>> 15, 1 | s);
      t ^= t + Math.imul(t ^ t >>> 7, 61 | t);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function hash(x, y, seed) {
    let n = (Math.imul((x | 0) + 101, 374761393) ^ Math.imul((y | 0) + 47, 668265263) ^ (seed >>> 0)) >>> 0;
    n = Math.imul(n ^ (n >>> 13), 1274126177) >>> 0;
    return (n >>> 0) / 4294967295;
  }

  function createPlate(width, height) {
    const n = width * height;
    return {
      width,
      height,
      depth: new Float32Array(n),     // Groove depth: D in [0, 1]
      exposed: new Float32Array(n),   // Surface opening width / acid exposure: W in [0, 1]
      blocked: new Uint8Array(n),     // Stop-out ground mask (1 = protected)
      burr: new Float32Array(n),      // Drypoint raised copper burr
    };
  }

  /**
   * Simulate acid etching with downward bite and lateral undercutting.
   * @param {Object} plate 
   * @param {number} acidStrength 0..1 (from UI 0..100)
   * @param {number} dt Time step in seconds
   * @param {number} grain 0..1
   * @param {Float32Array} grainNoise 
   */
  function simulateEtching(plate, acidStrength, dt, grain, grainNoise) {
    const { width: w, height: h, depth, exposed, blocked } = plate;
    const n = w * h;
    const nextExposed = new Float32Array(exposed);

    // Lateral undercutting speed is a fraction of downward bite
    const lateralRate = 0.35 * acidStrength * dt * (0.8 + grain * 0.4);
    const depthRate = 0.08 * acidStrength * dt;

    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        if (blocked[i]) continue;

        // Neighbor maximum exposed to simulate acid creeping laterally past the opening edge
        const maxNeighbor = Math.max(
          exposed[i - 1], exposed[i + 1],
          exposed[i - w], exposed[i + w]
        );

        const noise = grainNoise ? grainNoise[i] : hash(x, y, 42);
        const tooth = 1 + (noise - 0.5) * grain * 0.6;

        if (maxNeighbor > exposed[i]) {
          const creep = (maxNeighbor - exposed[i]) * lateralRate * tooth;
          nextExposed[i] = Math.min(1, exposed[i] + creep);
        }

        // Downward vertical etching deepens grooves where exposed to acid
        if (exposed[i] > 0.02) {
          const deltaD = exposed[i] * depthRate * tooth;
          depth[i] = Math.min(1, depth[i] + deltaD);
        }
      }
    }

    exposed.set(nextExposed);
  }

  /**
   * Two-layer ink dynamics: groove ink vs plate surface ink (plate tone).
   * @param {Object} plate 
   * @param {Object} params
   *   inkLoad: 0..1.5 (ink volume)
   *   wiping: 0..1 (wiping intensity: 0 = unwiped dirty plate, 1 = wiped crisp)
   *   wipeAngle: angle of wiping cloth motion in radians
   *   plateToneBias: 0..0.35 (residual plate tone slider)
   *   seed: random seed for wiping cloth fibrous streaks
   */
  function simulateInkingAndWiping(plate, params = {}) {
    const { width: w, height: h, depth, exposed, burr } = plate;
    const n = w * h;
    const inkLoad = params.inkLoad ?? 0.9;
    const wiping = params.wiping ?? 0.85; // higher = cleaner
    const plateToneBias = params.plateToneBias ?? 0.04;
    const wipeAngle = params.wipeAngle ?? 0.25;
    const seed = params.seed || 17;

    const grooveInk = new Float32Array(n);
    const surfaceInk = new Float32Array(n);

    // Directional vector for cloth wiping
    const cosA = Math.cos(wipeAngle), sinA = Math.sin(wipeAngle);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        const d = depth[i];
        const exp = exposed[i];
        const b = burr ? burr[i] : 0;

        if (d > 0.005 || exp > 0.01 || b > 0.01) {
          // Cross-sectional capacity: V ~ d * (0.3 + 0.7 * exp) + burr * 0.4
          const capacity = Math.min(1, d * (0.35 + 0.65 * Math.max(exp, 0.2)) + b * 0.45);
          const initialFill = Math.min(1, capacity * inkLoad * 1.25);

          // Wiping effect on groove:
          // Wide and shallow grooves (exp high, d low) suffer from scooping (drag-out)
          // Narrow and deep grooves are shielded by copper walls
          const aspect = d / (exp + 0.08); // high aspect = deep & narrow = protected
          const protection = Math.min(1, Math.pow(aspect * 2.2, 0.75));
          const scooping = (1 - protection) * wiping * 0.55;

          grooveInk[i] = Math.max(0, initialFill * (1 - scooping));
        }

        // Plate surface ink (Plate tone):
        // Highly dependent on wiping and plate polish.
        // Fiber streaks from tarlatan cloth moving in wiping direction
        const clothCoord = x * cosA + y * sinA;
        const crossCloth = -x * sinA + y * cosA;
        const streakNoise = hash(Math.floor(crossCloth / 3), Math.floor(clothCoord / 65), seed);
        const fineNoise = hash(x, y, seed ^ 0x3f5);

        // Surface ink is wiped away by wiping, but residual tone remains
        const baseSurface = plateToneBias * inkLoad;
        const residualWiped = baseSurface * (1 - wiping * 0.75);
        const streak = 1 + (streakNoise - 0.5) * 0.4 + (fineNoise - 0.5) * 0.15;
        surfaceInk[i] = Math.max(0, Math.min(1, residualWiped * streak));
      }
    }

    return { grooveInk, surfaceInk };
  }

  /**
   * Physical paper transfer under press pressure.
   * Calculates contact threshold, ink transfer, ink squash, capillary bleed, and plate mark embossing.
   * @param {Object} plate 
   * @param {Object} inkState { grooveInk, surfaceInk }
   * @param {Object} options
   *   pressure: 0..100
   *   paper: 'rough' | 'smooth'
   *   plateMarkMargin: margin fraction around plate (default 0.035)
   *   seed: seed for paper fiber distribution
   */
  function simulateTransfer(plate, inkState, options = {}) {
    const { width: w, height: h, depth, exposed } = plate;
    const { grooveInk, surfaceInk } = inkState;
    const n = w * h;

    const pressure = (options.pressure ?? 65) / 100; // 0..1
    const isRough = options.paper === 'rough';
    const seed = options.seed || 17;

    // Buffer for final transferred ink density (0 = blank paper, 1 = saturated black)
    const transferred = new Float32Array(n);
    const embossing = new Float32Array(n); // plate mark relief height

    // Paper fiber characteristics
    const fiberScale = isRough ? 2.8 : 1.4;
    const roughnessAmp = isRough ? 0.28 : 0.12;

    // Physical plate mark geometry
    // The copper plate has beveled edges inset from the paper borders
    const bevelWidth = Math.max(4, Math.round(Math.min(w, h) * 0.016));
    const padX = Math.round(w * 0.025);
    const padY = Math.round(h * 0.025);
    const plateLeft = padX, plateRight = w - 1 - padX;
    const plateTop = padY, plateBottom = h - 1 - padY;

    // First pass: Transfer mechanics for each pixel
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;

        // Plate mark embossing calculation
        let inPlate = x >= plateLeft && x <= plateRight && y >= plateTop && y <= plateBottom;
        if (inPlate) {
          const distToEdge = Math.min(
            x - plateLeft, plateRight - x,
            y - plateTop, plateBottom - y
          );
          if (distToEdge < bevelWidth) {
            // Bevel slope
            const t = distToEdge / bevelWidth;
            // Smooth step
            embossing[i] = t * t * (3 - 2 * t);
          } else {
            embossing[i] = 1.0; // flat plateau
          }
        } else {
          embossing[i] = 0.0; // outside plate
        }

        // Outside the plate, paper receives NO ink (it never touched the copper)
        if (!inPlate) {
          transferred[i] = 0;
          continue;
        }

        const gInk = grooveInk[i];
        const sInk = surfaceInk[i];
        const d = depth[i];
        const exp = exposed[i];

        // Paper surface fiber height at this microscopic point
        const fiberNoise = hash(Math.floor(x / fiberScale), Math.floor(y / fiberScale), seed);
        const microNoise = hash(x, y, seed ^ 0x991);
        const paperZ = (fiberNoise * 0.7 + microNoise * 0.3 - 0.5) * roughnessAmp;

        // Transfer threshold:
        // Paper requires pressure to compress into grooves.
        // Hairlines (very shallow d < 0.08, very narrow exp < 0.12) need sufficient pressure
        // to bridge the paper fiber gap. If pressure is too low, hair lines skip / break!
        const requiredPressure = 0.12 + Math.max(0, 0.22 - d * 2.5) + paperZ * 0.45;
        const effectivePressure = pressure - requiredPressure;

        let grooveTransferRate = 0;
        if (effectivePressure > 0) {
          // Elastic transfer saturation curve
          grooveTransferRate = Math.min(1, Math.pow(effectivePressure / 0.55, 0.75));
        }

        // Surface ink (plate tone) transfers easily because it's right on the plate surface
        const surfaceTransferRate = Math.min(1, pressure * 1.35);

        // Combined transfer
        let transferredDensity = gInk * grooveTransferRate + sInk * surfaceTransferRate;

        // Velvet black saturation in deep grooves under strong pressure
        if (d > 0.35 && pressure > 0.5) {
          transferredDensity = Math.min(1, transferredDensity * (1 + (d - 0.35) * 0.35));
        }

        transferred[i] = Math.min(1, transferredDensity);
      }
    }

    // Second pass: Ink squash (ridge formation under pressure) & capillary bleed
    // High pressure forces excess ink in deep grooves slightly outward past groove walls
    const output = new Float32Array(transferred);
    const bleedRate = isRough ? 0.09 : 0.04;
    const squashFactor = Math.max(0, pressure - 0.45) * 0.25;

    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        const d = depth[i];

        // Ink squash: if this pixel is a filled groove under high pressure, slightly boost neighbors
        if (d > 0.25 && transferred[i] > 0.6 && squashFactor > 0.01) {
          const push = transferred[i] * squashFactor * (d - 0.25);
          output[i - 1] = Math.min(1, output[i - 1] + push * 0.18);
          output[i + 1] = Math.min(1, output[i + 1] + push * 0.18);
          output[i - w] = Math.min(1, output[i - w] + push * 0.18);
          output[i + w] = Math.min(1, output[i + w] + push * 0.18);
        }

        // Capillary fiber feathering
        if (transferred[i] > 0.2) {
          const leak = transferred[i] * bleedRate;
          const fn = hash(x, y, seed ^ 0xa8f);
          if (fn > 0.62) {
            output[i - 1] = Math.min(1, output[i - 1] + leak * 0.25);
            output[i + 1] = Math.min(1, output[i + 1] + leak * 0.25);
          }
        }
      }
    }

    return { transferred: output, embossing, plateBounds: { left: plateLeft, top: plateTop, right: plateRight, bottom: plateBottom } };
  }

  /**
   * Render final print or virtual plate to Canvas ImageData.
   * @param {ImageData} imageData 
   * @param {Object} plate 
   * @param {Object} options
   *   mode: 'print' | 'plate' | 'depth'
   *   inkLoad: 0..1.5
   *   pressure: 0..100
   *   wiping: 0..1
   *   plateTone: 0..0.35
   *   paper: 'rough' | 'smooth'
   *   seed: number
   */
  function renderToImageData(imageData, plate, options = {}) {
    const { width: w, height: h, depth, exposed, blocked } = plate;
    const mode = options.mode || 'print';
    const data = imageData.data;
    const n = w * h;

    if (mode === 'depth') {
      for (let i = 0; i < n; i++) {
        const v = Math.round(depth[i] * 255);
        data[i * 4] = v;
        data[i * 4 + 1] = v;
        data[i * 4 + 2] = v;
        data[i * 4 + 3] = 255;
      }
      return;
    }

    if (mode === 'plate') {
      // Shaded copper surface with incisions and stop-out varnish
      const seed = options.seed || 17;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = y * w + x;
          const d = depth[i];
          const exp = exposed[i];
          const blk = blocked[i];

          // Compute surface normal from depth gradients
          const dx = (depth[y * w + Math.min(w - 1, x + 1)] - depth[y * w + Math.max(0, x - 1)]) * 18;
          const dy = (depth[Math.min(h - 1, y + 1) * w + x] - depth[Math.max(0, y - 1) * w + x]) * 18;
          const slope = dx - dy;

          const nVal = hash(x, y, seed);

          // Warm burnished copper base color: RGB(180, 118, 82)
          let r = 180 + nVal * 12 - d * 110 + slope * 65 + exp * 25;
          let g = 118 + nVal * 10 - d * 75 + slope * 52 + exp * 18;
          let b = 82 + nVal * 8 - d * 55 + slope * 38 + exp * 12;

          if (blk) {
            // Dark asphaltum stop-out varnish: golden amber/brown
            r = r * 0.45 + 35;
            g = g * 0.35 + 22;
            b = b * 0.25 + 10;
          }

          data[i * 4] = Math.max(0, Math.min(255, Math.round(r)));
          data[i * 4 + 1] = Math.max(0, Math.min(255, Math.round(g)));
          data[i * 4 + 2] = Math.max(0, Math.min(255, Math.round(b)));
          data[i * 4 + 3] = 255;
        }
      }
      return;
    }

    // mode === 'print'
    const inkState = simulateInkingAndWiping(plate, {
      inkLoad: options.inkLoad ?? 0.9,
      wiping: options.wiping ?? (1 - (options.plateTone ?? 0.04) * 2.2),
      plateToneBias: options.plateTone ?? 0.04,
      wipeAngle: 0.32,
      seed: options.seed || 17
    });

    const result = simulateTransfer(plate, inkState, {
      pressure: options.pressure ?? 65,
      paper: options.paper || 'rough',
      seed: options.seed || 17
    });

    const isRough = options.paper === 'rough';
    const transferred = result.transferred;
    const embossing = result.embossing;

    // Ink color: Bone black with warm undertone (charbonnel soft black)
    const inkR = 24, inkG = 26, inkB = 22;

    // Paper base color: warm soft cotton rag (rough: 247, 242, 230; smooth: 249, 246, 238)
    const basePaperR = isRough ? 247 : 249;
    const basePaperG = isRough ? 242 : 246;
    const basePaperB = isRough ? 230 : 238;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        // In print mode, intaglio prints mirror horizontally
        const printIdx = y * w + (w - 1 - x);

        const inkDensity = transferred[printIdx];
        const emb = embossing[printIdx];

        // Paper texture noise
        const pNoise = hash(x, y, (options.seed || 17) ^ 0x47b);
        const texMod = isRough ? (pNoise - 0.5) * 11 : (pNoise - 0.5) * 4;

        // Plate mark relief shading:
        // Top-left illumination (light coming from top-left at 45 deg)
        let reliefShadow = 0;
        if (y > 0 && y < h - 1 && x > 0 && x < w - 1) {
          const dEx = (embossing[y * w + (w - 1 - (x + 1))] - embossing[y * w + (w - 1 - (x - 1))]);
          const dEy = (embossing[(y + 1) * w + (w - 1 - x)] - embossing[(y - 1) * w + (w - 1 - x)]);
          reliefShadow = (-dEx - dEy) * 38; // light edge vs shadow crease
        }

        let paperR = basePaperR + texMod + reliefShadow;
        let paperG = basePaperG + texMod + reliefShadow;
        let paperB = basePaperB + texMod + reliefShadow;

        // Blend paper with ink density
        // Intaglio ink has physical body: high density approaches dense velvety black
        const r = paperR * (1 - inkDensity) + inkR * inkDensity;
        const g = paperG * (1 - inkDensity) + inkG * inkDensity;
        const b = paperB * (1 - inkDensity) + inkB * inkDensity;

        data[i * 4] = Math.max(0, Math.min(255, Math.round(r)));
        data[i * 4 + 1] = Math.max(0, Math.min(255, Math.round(g)));
        data[i * 4 + 2] = Math.max(0, Math.min(255, Math.round(b)));
        data[i * 4 + 3] = 255;
      }
    }
  }

  /**
   * Generates a standard 5-zone diagnostic proofing plate (test wedge).
   * Zone 1: Hairlines (varying fine depths and widths)
   * Zone 2: Gradient parallel hatching (sparse to ultra-dense)
   * Zone 3: Cross-hatching grid (intense groove intersections)
   * Zone 4: Solid deep aquatint / velvet patch (deep continuous groove)
   * Zone 5: Clean polished copper (pure highlight / wiped surface test)
   */
  function generateDiagnosticPlate(width, height) {
    const plate = createPlate(width, height);
    const { depth, exposed } = plate;
    const w = width, h = height;

    const padX = Math.round(w * 0.06);
    const padY = Math.round(h * 0.08);
    const workW = w - padX * 2;
    const workH = h - padY * 2;
    const zoneH = Math.floor(workH / 5);

    function drawLine(x0, y0, x1, y1, dVal, expVal) {
      const dist = Math.hypot(x1 - x0, y1 - y0);
      const steps = Math.max(1, Math.ceil(dist));
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const cx = Math.round(x0 + (x1 - x0) * t);
        const cy = Math.round(y0 + (y1 - y0) * t);
        if (cx >= 0 && cx < w && cy >= 0 && cy < h) {
          const idx = cy * w + cx;
          depth[idx] = Math.max(depth[idx], dVal);
          exposed[idx] = Math.max(exposed[idx], expVal);
        }
      }
    }

    // Zone 1: Hairlines (Y: padY -> padY + zoneH)
    // 6 horizontal lines with increasing delicacy and lightness
    const z1Top = padY;
    const z1LineSpacing = Math.floor(zoneH / 7);
    for (let k = 0; k < 6; k++) {
      const y = z1Top + (k + 1) * z1LineSpacing;
      // depth from 0.03 (extremely shallow) to 0.18
      const d = 0.03 + k * 0.03;
      const exp = 0.04 + k * 0.03;
      drawLine(padX + 20, y, padX + workW - 20, y, d, exp);
    }

    // Zone 2: Gradient parallel hatching (Y: padY + zoneH -> padY + zoneH * 2)
    // Vertical parallel lines with pitch decreasing from 22px down to 3px
    const z2Top = padY + zoneH;
    const z2H = zoneH - 12;
    let currX = padX + 20;
    const targetEndX = padX + workW - 20;
    while (currX < targetEndX) {
      const progress = (currX - (padX + 20)) / (targetEndX - (padX + 20));
      const pitch = Math.max(3, Math.round(20 * (1 - progress * 0.85)));
      drawLine(currX, z2Top + 6, currX, z2Top + 6 + z2H, 0.28, 0.35);
      currX += pitch;
    }

    // Zone 3: Cross-hatching grid (Y: padY + zoneH * 2 -> padY + zoneH * 3)
    const z3Top = padY + zoneH * 2;
    const z3Left = padX + 20, z3Right = padX + workW - 20;
    const z3Bottom = z3Top + zoneH - 10;
    const gridStep = 8;
    for (let x = z3Left; x <= z3Right; x += gridStep) {
      drawLine(x, z3Top + 5, x, z3Bottom, 0.42, 0.45);
    }
    for (let y = z3Top + 5; y <= z3Bottom; y += gridStep) {
      drawLine(z3Left, y, z3Right, y, 0.42, 0.45);
    }

    // Zone 4: Solid deep aquatint / velvet patch (Y: padY + zoneH * 3 -> padY + zoneH * 4)
    const z4Top = padY + zoneH * 3 + 6;
    const z4H = zoneH - 14;
    for (let y = z4Top; y < z4Top + z4H; y++) {
      for (let x = padX + 20; x < padX + workW - 20; x++) {
        const i = y * w + x;
        depth[i] = 0.85;
        exposed[i] = 0.92;
      }
    }

    // Zone 5: Clean polished copper (Y: padY + zoneH * 4 -> padY + zoneH * 5)
    // Left completely unetched (depth = 0, exposed = 0)

    return plate;
  }

  const api = {
    createPlate,
    simulateEtching,
    simulateInkingAndWiping,
    simulateTransfer,
    renderToImageData,
    generateDiagnosticPlate,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.IntaglioPhysics = api;
  }
})(globalThis);
