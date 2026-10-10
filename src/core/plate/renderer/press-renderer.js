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
 * @param {'rough'|'smooth'|'linen'|'rosaspina'} [options.paper='rough'] Paper surface preset
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
  const paper = options.paper || 'rough';
  const paperBase = paper === 'smooth' ? [252, 249, 243]
    : paper === 'linen' ? [244, 238, 224]
    : paper === 'rosaspina' ? [247, 242, 229]
    : [247, 238, 219];
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
        const fiber = (((x >> 3) * 37 ^ (y >> 3) * 91) & 15);
        const cloud = (((x >> 5) * 23 ^ (y >> 5) * 41) & 15);
        const strand = ((x & 31) < 2 && ((y >> 4) & 3) === 0) ? 4 : 0;
        const texture = paper === 'smooth' ? noise * 2.5 + fiber * 0.12
          : paper === 'linen' ? noise * 9 + fiber * 0.7 + strand
          : paper === 'rosaspina' ? noise * 6 + fiber * 0.3 + cloud * 0.5
          : noise * 13 + fiber * 0.9;
        const paperR = paperBase[0] - texture;
        const paperG = paperBase[1] - texture;
        const paperB = paperBase[2] - texture;

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
          const grain = grainNoise[(i + seed * 997) % N];
          const variation = paper === 'smooth' ? 1.0
            : paper === 'linen' ? 0.65 + grain * 0.7
            : paper === 'rosaspina' ? 0.78 + grain * 0.42
            : 0.68 + grain * 0.62;
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

  /**
   * WebGL 2.0 Fragment Shader source for hardware-accelerated press rendering.
   */
  const PRESS_FRAGMENT_SHADER = `#version 300 es
  precision highp float;
  in vec2 vUv;
  out vec4 fragColor;

  uniform sampler2D uDepthField;
  uniform sampler2D uExposedField;
  uniform sampler2D uBlockedField;
  uniform sampler2D uBurrField;
  uniform sampler2D uGrainNoise;

  uniform int uMode; // 0: depth, 1: plate, 2: print
  uniform float uInk;
  uniform float uPressure;
  uniform float uTone;
  uniform vec3 uPaperBase;
  uniform float uW;
  uniform float uH;

  void main() {
    vec2 uv = vUv;
    if (uMode == 2) {
      uv.x = 1.0 - uv.x; // mirror print
    }
    float d = texture(uDepthField, uv).r;
    float exposed = texture(uExposedField, uv).r;
    float blocked = texture(uBlockedField, uv).r;
    float bu = texture(uBurrField, uv).r;
    float noise = texture(uGrainNoise, vUv).r;

    if (uMode == 0) {
      float dVal = min(1.0, d + bu * 0.4);
      fragColor = vec4(vec3(dVal), 1.0);
      return;
    }

    if (uMode == 1) {
      float dLeft = texture(uDepthField, uv - vec2(1.0 / uW, 0.0)).r;
      float slope = d - dLeft;
      float burrReflect = bu * 55.0;

      float r = (116.0 + noise * 9.0 - d * 67.0 + slope * 110.0 + exposed * 27.0 + burrReflect) / 255.0;
      float g = (85.0 + noise * 7.0 - d * 50.0 + slope * 95.0 + exposed * 25.0 + burrReflect * 0.9) / 255.0;
      float b = (61.0 + noise * 5.0 - d * 29.0 + slope * 75.0 + exposed * 23.0 + burrReflect * 0.8) / 255.0;

      if (blocked > 0.5) {
        r *= 0.42; g *= 0.32; b *= 0.20;
      }
      fragColor = vec4(clamp(vec3(r, g, b), 0.0, 1.0), 1.0);
      return;
    }

    // Print mode
    float dropOut = 0.07 * (1.0 - uPressure);
    float effD = max(0.0, d - dropOut);
    float transferRate = effD > 0.0 ? (1.0 - exp(-effD * (1.8 + 13.0 * uPressure))) : 0.0;
    float burrInk = bu * 0.95 * uInk * (0.30 + 0.70 * uPressure);
    float lineInk = transferRate * (0.25 + 0.75 * uInk) + burrInk;
    float black = min(0.98, lineInk + uTone * uInk * 0.32);

    vec3 paperColor = (uPaperBase - noise * 5.0 - 1.5) / 255.0;
    vec3 outColor = paperColor * (1.0 - black);
    fragColor = vec4(clamp(outColor, 0.0, 1.0), 1.0);
  }`;

  /**
   * Creates a WebGL2 hardware accelerated rendering pipeline wrapper.
   * Gracefully returns null if WebGL2 is not supported in the current environment.
   *
   * @param {HTMLCanvasElement} canvas
   * @returns {Object|null} WebGL press pipeline instance or null if unavailable
   */
  function createWebGLPressPipeline(canvas) {
    if (!canvas || typeof canvas.getContext !== 'function') return null;
    let gl = null;
    try {
      gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true, antialias: false });
    } catch (_) {
      return null;
    }
    if (!gl) return null;

    const vsSource = `#version 300 es
    in vec2 aPos;
    out vec2 vUv;
    void main() {
      vUv = (aPos + 1.0) * 0.5;
      vUv.y = 1.0 - vUv.y; // flip Y for WebGL texture coordinate space
      gl.Position = vec4(aPos, 0.0, 1.0);
    }`;

    function createShader(glCtx, type, source) {
      const shader = glCtx.createShader(type);
      glCtx.shaderSource(shader, source);
      glCtx.compileShader(shader);
      if (!glCtx.getShaderParameter(shader, glCtx.COMPILE_STATUS)) {
        glCtx.deleteShader(shader);
        return null;
      }
      return shader;
    }

    const vs = createShader(gl, gl.VERTEX_SHADER, vsSource);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, PRESS_FRAGMENT_SHADER);
    if (!vs || !fs) return null;

    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      return null;
    }

    // Fullscreen Quad VAO
    const quadVao = gl.createVertexArray();
    gl.bindVertexArray(quadVao);
    const quadVbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadVbo);
    const quadVertices = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1
    ]);
    gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);
    const aPosLoc = gl.getAttribLocation(program, 'aPos');
    gl.enableVertexAttribArray(aPosLoc);
    gl.vertexAttribPointer(aPosLoc, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    // Uniform locations
    const uDepthLoc = gl.getUniformLocation(program, 'uDepthField');
    const uExposedLoc = gl.getUniformLocation(program, 'uExposedField');
    const uBlockedLoc = gl.getUniformLocation(program, 'uBlockedField');
    const uBurrLoc = gl.getUniformLocation(program, 'uBurrField');
    const uGrainLoc = gl.getUniformLocation(program, 'uGrainNoise');
    const uModeLoc = gl.getUniformLocation(program, 'uMode');
    const uInkLoc = gl.getUniformLocation(program, 'uInk');
    const uPressureLoc = gl.getUniformLocation(program, 'uPressure');
    const uToneLoc = gl.getUniformLocation(program, 'uTone');
    const uPaperBaseLoc = gl.getUniformLocation(program, 'uPaperBase');
    const uWLoc = gl.getUniformLocation(program, 'uW');
    const uHLoc = gl.getUniformLocation(program, 'uH');

    // Create 5 scalar textures
    const textures = {
      depth: gl.createTexture(),
      exposed: gl.createTexture(),
      blocked: gl.createTexture(),
      burr: gl.createTexture(),
      grain: gl.createTexture()
    };

    function setupTexture(tex) {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }
    Object.values(textures).forEach(setupTexture);

    let lastW = 0, lastH = 0;

    return {
      gl,
      render(plate, mode = 'plate', options = {}) {
        const { width: W, height: H, depthField, exposedField, blockedField, burrField, grainNoise } = plate;
        if (canvas.width !== W || canvas.height !== H) {
          canvas.width = W;
          canvas.height = H;
        }
        gl.viewport(0, 0, W, H);
        gl.useProgram(program);

        const uploadF32 = (unit, tex, data) => {
          gl.activeTexture(gl.TEXTURE0 + unit);
          gl.bindTexture(gl.TEXTURE_2D, tex);
          if (lastW !== W || lastH !== H) {
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, W, H, 0, gl.RED, gl.FLOAT, data);
          } else {
            gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, W, H, gl.RED, gl.FLOAT, data);
          }
        };

        const uploadU8 = (unit, tex, data) => {
          gl.activeTexture(gl.TEXTURE0 + unit);
          gl.bindTexture(gl.TEXTURE_2D, tex);
          // Convert Uint8 to Float32 normalized for sampler2D
          const fData = new Float32Array(data.length);
          for (let k = 0; k < data.length; k++) fData[k] = data[k] > 0 ? 1.0 : 0.0;
          if (lastW !== W || lastH !== H) {
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, W, H, 0, gl.RED, gl.FLOAT, fData);
          } else {
            gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, W, H, gl.RED, gl.FLOAT, fData);
          }
        };

        uploadF32(0, textures.depth, depthField);
        uploadF32(1, textures.exposed, exposedField);
        uploadU8(2, textures.blocked, blockedField);
        uploadF32(3, textures.burr, burrField);
        uploadF32(4, textures.grain, grainNoise);
        lastW = W;
        lastH = H;

        gl.uniform1i(uDepthLoc, 0);
        gl.uniform1i(uExposedLoc, 1);
        gl.uniform1i(uBlockedLoc, 2);
        gl.uniform1i(uBurrLoc, 3);
        gl.uniform1i(uGrainLoc, 4);

        const modeCode = mode === 'depth' ? 0 : (mode === 'plate' ? 1 : 2);
        gl.uniform1i(uModeLoc, modeCode);
        gl.uniform1f(uInkLoc, options.ink ?? 0.90);
        gl.uniform1f(uPressureLoc, options.pressure ?? 0.65);
        gl.uniform1f(uToneLoc, options.tone ?? 0.04);
        gl.uniform1f(uWLoc, W);
        gl.uniform1f(uHLoc, H);

        const paper = options.paper || 'rough';
        const paperBase = paper === 'smooth' ? [252, 249, 243]
          : paper === 'linen' ? [244, 238, 224]
          : paper === 'rosaspina' ? [247, 242, 229]
          : [247, 238, 219];
        gl.uniform3f(uPaperBaseLoc, paperBase[0], paperBase[1], paperBase[2]);

        gl.bindVertexArray(quadVao);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        gl.bindVertexArray(null);
        return true;
      },
      destroy() {
        Object.values(textures).forEach(tex => gl.deleteTexture(tex));
        gl.deleteBuffer(quadVbo);
        gl.deleteVertexArray(quadVao);
        gl.deleteProgram(program);
        gl.deleteShader(vs);
        gl.deleteShader(fs);
      }
    };
  }

  const api = { renderPlate, PRESS_FRAGMENT_SHADER, createWebGLPressPipeline };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.PressRenderer = api;
    root.renderPlate = renderPlate;
    root.createWebGLPressPipeline = createWebGLPressPipeline;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
