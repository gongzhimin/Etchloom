/* Deterministic, dependency-free streamline generator. Coordinates are plate pixels. */
(function (root) {
  'use strict';
  const proEngine=typeof module!=='undefined'&&module.exports?require('./photo-pro.js'):root.PhotoPro;
  const WIDTH = 900, HEIGHT = 660;
  const defaults = { density: 48, flow: 48, order: 72, space: 45, width: 24 };
  const algorithmDefaults = { swirl: 70, viscosity: 20, duration: 65, bias: 55, loops: 0, warp: 20, fidelity: 75, randomness: 30, detail: 65, contrast: 55 };
  function random(seed) {
    let state = seed >>> 0;
    return () => {
      state += 0x6D2B79F5;
      let t = Math.imul(state ^ state >>> 15, 1 | state);
      t ^= t + Math.imul(t ^ t >>> 7, 61 | t);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function validRecipe(r) {
    return r && r.version === 1 && ['wind', 'vortex', 'islands', 'fluid', 'maze', 'photo'].includes(r.mode)
      && (r.mode !== 'photo' || validImage(r.image))
      && (!r.pro || (r.mode==='photo'&&proEngine&&proEngine.valid(r.pro)))
      && ['seed', 'layoutSeed', 'variation'].every(k => Number.isInteger(r[k]) && r[k] >= 0 && r[k] <= 4294967295)
      && r.params && Object.keys(defaults).every(k => Number.isFinite(r.params[k]) && r.params[k] >= 0 && r.params[k] <= 100)
      && (r.params.finish === undefined || ['raw', 'engraved'].includes(r.params.finish))
      && Object.keys(algorithmDefaults).every(k => r.params[k] === undefined || (Number.isFinite(r.params[k]) && r.params[k] >= 0 && r.params[k] <= 100))
      && (r.params.mazeAlgorithm === undefined || ['dfs', 'prim'].includes(r.params.mazeAlgorithm));
  }
  function layout(recipe) {
    const rng = random(recipe.layoutSeed);
    const angle = (rng() - .5) * 1.6;
    const lobes = Array.from({ length: recipe.mode === 'islands' ? 3 : recipe.mode === 'vortex' ? 1 + Math.floor(rng() * 3) : 2 }, (_, i) => ({
      x: 220 + rng() * 450, y: 170 + rng() * 320,
      rx: 140 + rng() * 170, ry: 100 + rng() * 150,
      spin: rng() > .5 ? 1 : -1, phase: rng() * Math.PI * 2
    }));
    // Separated masses are intentional in the island preset.
    if (recipe.mode === 'islands') lobes.forEach((l, i) => {
      l.x = 190 + i * 255 + (rng() - .5) * 65;
      l.y = 330 + Math.sin(i * 2.5 + angle) * 115;
      l.rx = 135 + rng() * 30; l.ry = 130 + rng() * 60;
    });
    return { angle, lobes, hole: { x: 320 + rng() * 300, y: 230 + rng() * 200, rx: 65 + rng() * 65, ry: 70 + rng() * 65 } };
  }
  function generate(recipe) {
    if (!validRecipe(recipe)) throw new Error('无效的生成方案');
    if (recipe.mode === 'photo') return recipe.pro?proEngine.generate(recipe,photo,root.generationProgress):photo(recipe);
    if (recipe.mode === 'maze') return maze(recipe);
    if (recipe.mode === 'fluid') return fluid(recipe);
    const p = recipe.params, shape = layout(recipe);
    const rng = random((recipe.seed ^ Math.imul(recipe.variation + 1, 1597334677)) >>> 0);
    const phase = rng() * 6.283, disorder = 1 - p.order / 100;
    const spacing = 15 - p.density * .105, step = 2.8;
    const cell = spacing, cols = Math.ceil(WIDTH / cell);
    const grid = new Map(), paths = [];
    function mask(x, y) {
      if (x < 45 || x > WIDTH - 45 || y < 45 || y > HEIGHT - 45) return false;
      const shrink = 1.22 - p.space * .0055;
      let mass = Infinity;
      for (const l of shape.lobes) mass = Math.min(mass, ((x - l.x) / (l.rx * shrink)) ** 2 + ((y - l.y) / (l.ry * shrink)) ** 2);
      if (mass > 1) return false;
      const h = shape.hole, holeScale = p.space / 115;
      return !holeScale || ((x - h.x) / (h.rx * holeScale)) ** 2 + ((y - h.y) / (h.ry * holeScale)) ** 2 > 1;
    }
    function field(x, y) {
      let a = shape.angle;
      if (recipe.mode === 'vortex') {
        let vx = 0, vy = 0;
        for (const l of shape.lobes) {
          const dx = (x - l.x) / l.rx, dy = (y - l.y) / l.ry;
          const weight = 1 / ((dx * dx + dy * dy + .06) ** 2);
          vx += (-dy * l.spin + dx * .1) * weight;
          vy += (dx * l.spin + dy * .1) * weight;
        }
        a = Math.atan2(vy, vx);
      } else if (recipe.mode === 'islands') {
        let nearest = shape.lobes[0], best = Infinity;
        for (const l of shape.lobes) {
          const d = ((x - l.x) / l.rx) ** 2 + ((y - l.y) / l.ry) ** 2;
          if (d < best) { best = d; nearest = l; }
        }
        a = Math.atan2((y - nearest.y) / nearest.ry, (x - nearest.x) / nearest.rx) + nearest.spin * Math.PI / 2;
        a += .25 * Math.sin(x / 90 + nearest.phase);
      }
      a += p.flow / 100 * (Math.sin(x / 140 + y / 220 + shape.angle * 3) * .9 + Math.cos(y / 110 - x / 290) * .5);
      a += disorder * .4 * Math.sin(x / 38 + Math.sin(y / 57) + phase);
      // Smoothly bend around the reserved white region.
      const h = shape.hole, dx = x - h.x, dy = y - h.y, radius = Math.hypot(dx, dy);
      if (radius > 0 && p.space > 0) {
        const weight = Math.exp(-(((radius - 85) / 80) ** 2)) * p.space / 180;
        let tangent = Math.atan2(dy, dx) + Math.PI / 2;
        if (Math.cos(tangent - a) < 0) tangent += Math.PI;
        a += Math.atan2(Math.sin(tangent - a), Math.cos(tangent - a)) * weight;
      }
      return a;
    }
    function nearby(x, y) {
      const gx = Math.floor(x / cell), gy = Math.floor(y / cell);
      for (let yy = gy - 1; yy <= gy + 1; yy++) for (let xx = gx - 1; xx <= gx + 1; xx++) {
        const points = grid.get(yy * cols + xx);
        if (points) for (const q of points) if ((x - q[0]) ** 2 + (y - q[1]) ** 2 < spacing ** 2) return true;
      }
      return false;
    }
    function trace(x, y, direction) {
      const points = [], maxSteps = 290;
      for (let k = 0; k < maxSteps; k++) {
        const a = field(x, y), midX = x + Math.cos(a) * step * direction / 2, midY = y + Math.sin(a) * step * direction / 2;
        const mid = field(midX, midY);
        x += Math.cos(mid) * step * direction; y += Math.sin(mid) * step * direction;
        if (!mask(x, y) || nearby(x, y)) break;
        if (points.length > 20 && points.some((q, index) => index < points.length - 15 && Math.hypot(x - q[0], y - q[1]) < step * 1.6)) break;
        points.push([x, y]);
      }
      return points;
    }
    for (let attempt = 0; attempt < 2200; attempt++) {
      const x = 45 + rng() * 810, y = 45 + rng() * 570;
      if (!mask(x, y) || nearby(x, y)) continue;
      const forward = trace(x, y, 1), back = trace(x, y, -1);
      const points = back.reverse().concat([[x, y]], forward);
      if (points.length < 16) continue;
      const width = (.65 + p.width * .036) * (1 - disorder * .2 + rng() * disorder * .4);
      paths.push({ points, width });
      for (const q of points) {
        const key = Math.floor(q[1] / cell) * cols + Math.floor(q[0] / cell);
        if (!grid.has(key)) grid.set(key, []);
        grid.get(key).push(q);
      }
    }
    return { paths, layout: shape, recipe: JSON.parse(JSON.stringify(recipe)) };
  }
  function draw(context, result, paper = true, strokeScale = 1) {
    const canvas = context.canvas;
    context.save();
    context.clearRect(0, 0, canvas.width, canvas.height);
    if (paper) { context.fillStyle = '#f2eddd'; context.fillRect(0, 0, canvas.width, canvas.height); }
    context.scale(canvas.width / WIDTH, canvas.height / HEIGHT);
    context.strokeStyle = paper ? '#292d27' : '#fff'; context.lineCap = 'round'; context.lineJoin = 'round';
    for (const path of result.paths) {
      // Smooth width modulation follows the whole stroke rather than independent pixel noise.
      for (let start = 0; start < path.points.length - 1; start += 12) {
        context.beginPath(); context.lineWidth = path.width * strokeScale * (path.taper ? .18 + .82 * Math.pow(Math.sin(Math.PI * (start+6)/(path.points.length+12)), .45) : .85 + .15 * Math.sin(start / path.points.length * Math.PI));
        const end = Math.min(path.points.length - 1, start + 12);
        context.moveTo(...path.points[start]);
        for (let i = start + 1; i <= end; i++) context.lineTo(...path.points[i]);
        context.stroke();
      }
    }
    context.restore();
  }
  // Randomized spanning trees: passages are edges of a connected cell graph.
  function maze(recipe) {
    const p = { ...algorithmDefaults, ...recipe.params };
    const rng = random((recipe.seed ^ Math.imul(recipe.variation + 1, 1597334677)) >>> 0);
    const shapeRng = random(recipe.layoutSeed);
    const cols = 22 + Math.round(p.density * .48), rows = Math.round(cols * .68), n = cols * rows;
    const visited = new Uint8Array(n), passages = new Uint8Array(n), stack = [], edges = [];
    const neighbors = i => {
      const x = i % cols, y = Math.floor(i / cols), out = [];
      if (x + 1 < cols) out.push([i + 1, 1, 2]);
      if (x > 0) out.push([i - 1, 2, 1]);
      if (y + 1 < rows) out.push([i + cols, 4, 8]);
      if (y > 0) out.push([i - cols, 8, 4]);
      return out;
    };
    function connect(a, b, bit, reverse) { passages[a] |= bit; passages[b] |= reverse; edges.push([a, b]); }
    const start = Math.floor(shapeRng() * n); visited[start] = 1;
    if (p.mazeAlgorithm === 'prim') {
      const frontier = [];
      const add = i => neighbors(i).forEach(([j, b, r]) => { if (!visited[j]) frontier.push([i, j, b, r]); });
      add(start);
      while (frontier.length) {
        const at = rng() < p.bias / 100 ? frontier.length - 1 : Math.floor(rng() * frontier.length);
        const [a, b, bit, reverse] = frontier[at]; frontier[at] = frontier[frontier.length - 1]; frontier.pop();
        if (visited[b]) continue;
        visited[b] = 1; connect(a, b, bit, reverse); add(b);
      }
    } else {
      stack.push([start, 0]);
      while (stack.length) {
        const [i, direction] = stack[stack.length - 1];
        const choices = neighbors(i).filter(([j]) => !visited[j]);
        if (!choices.length) { stack.pop(); continue; }
        const straight = choices.find(([, bit]) => bit === direction);
        const [j, bit, reverse] = straight && rng() < p.bias / 100 ? straight : choices[Math.floor(rng() * choices.length)];
        visited[j] = 1; connect(i, j, bit, reverse); stack.push([j, bit]);
      }
    }
    // Additional removed walls introduce cycles without disconnecting any cell.
    for (let i = 0; i < n; i++) for (const [j, bit, reverse] of neighbors(i)) {
      if (j > i && !(passages[i] & bit) && rng() < p.loops / 250) connect(i, j, bit, reverse);
    }
    const margin = 38 + p.space * .32, w = WIDTH - margin * 2, h = HEIGHT - margin * 2;
    const phase = shapeRng() * Math.PI * 2, amplitude = p.warp * .18;
    function point(gx, gy) {
      if (p.finish === 'engraved') {
        const angle = -.46*Math.PI + gx/cols*Math.PI*1.84;
        const radius = 103 + gy/rows*154 + 4*Math.sin(angle*5+phase)*Math.sin(Math.PI*gy/rows)*p.warp/100;
        return [450 + Math.cos(angle)*radius*1.32, 330 + Math.sin(angle)*radius];
      }
      const x = margin + gx / cols * w, y = margin + gy / rows * h;
      const fade = Math.sin(Math.PI * gx / cols) * Math.sin(Math.PI * gy / rows);
      return [x + amplitude * fade * Math.sin(y / 65 + phase), y + amplitude * fade * Math.sin(x / 85 + phase)];
    }
    const paths = [], width = .7 + p.width * .038;
    function wall(x1, y1, x2, y2) {
      const count = Math.max(2, Math.ceil(Math.hypot((x2-x1)*w/cols, (y2-y1)*h/rows) / 4));
      const points = Array.from({ length: count + 1 }, (_, k) => point(x1 + (x2-x1)*k/count, y1 + (y2-y1)*k/count));
      paths.push({ points, width: p.finish === 'engraved' ? width*.65 : width });
    }
    // Merge collinear walls before applying one continuous deformation.
    for (let y = 0; y <= rows; y++) {
      let start = -1;
      for (let x = 0; x <= cols; x++) {
        const solid = x < cols && (y === 0 ? x !== 0 : y === rows ? x !== cols-1 : !(passages[(y-1)*cols+x] & 4));
        if (solid && start < 0) start = x;
        if (!solid && start >= 0) { wall(start, y, x, y); start = -1; }
      }
    }
    for (let x = 0; x <= cols; x++) {
      let start = -1;
      for (let y = 0; y <= rows; y++) {
        const solid = y < rows && (x === 0 || x === cols || !(passages[y*cols+x-1] & 1));
        if (solid && start < 0) start = y;
        if (!solid && start >= 0) { wall(x, start, x, y); start = -1; }
      }
    }
    if (p.finish === 'engraved') {
      // Guilloche medallion and concentric fine rules contrast with the maze's larger passages.
      for (let band=0;band<18;band++) {
        const points=[];
        for(let k=0;k<=800;k++) {
          const a=k/800*Math.PI*2, r=44+band*2.3+(11+band*.12)*Math.sin(a*7+phase);
          points.push([450+Math.cos(a)*r*1.32,330+Math.sin(a)*r]);
        }
        paths.push({points,width:.32+band*.012});
      }
      for(const radius of [96,99,261,265]) {
        const points=Array.from({length:901},(_,i)=>{const a=-.46*Math.PI+i/900*Math.PI*1.84;return [450+Math.cos(a)*radius*1.32,330+Math.sin(a)*radius]});
        paths.push({points,width:.48});
      }
      for(let k=0;k<220;k++) {
        const a=-.46*Math.PI+k/219*Math.PI*1.84, r=269, length=k%5===0?5:2;
        paths.push({points:[[450+Math.cos(a)*r*1.32,330+Math.sin(a)*r],[450+Math.cos(a)*(r+length)*1.32,330+Math.sin(a)*(r+length)]],width:.4});
      }
      const scale=1.08-p.space*.0018;
      for(const path of paths)for(const q of path.points){q[0]=450+(q[0]-450)*scale;q[1]=330+(q[1]-330)*scale;}
    }
    return { paths, recipe: JSON.parse(JSON.stringify(recipe)), layout: { cols, rows, margin, phase },
      stats: { algorithm: p.mazeAlgorithm || 'dfs', cells: n, edges: edges.length, cycles: edges.length - n + 1 },
      graph: { cols, rows, passages: Array.from(passages) } };
  }

  // Grid velocity simulation: viscosity, semi-Lagrangian advection and pressure projection.
  // Visual implementation informed by J. Stam, Stable Fluids, SIGGRAPH 1999.
  function fluid(recipe) {
    const p = { ...algorithmDefaults, ...recipe.params }, nx = 72, ny = 52, size = nx * ny;
    const rng = random((recipe.seed ^ Math.imul(recipe.variation + 1, 1597334677)) >>> 0);
    const sr = random(recipe.layoutSeed), sources = Array.from({ length: 8 }, () => ({ x: 8 + sr()*56, y: 7 + sr()*38, radius: 3 + sr()*9, spin: sr() < .5 ? -1 : 1 }));
    let u = new Float32Array(size), v = new Float32Array(size);
    const fu = new Float32Array(size), fv = new Float32Array(size), pressure = new Float32Array(size), div = new Float32Array(size);
    for (let y = 1; y < ny-1; y++) for (let x = 1; x < nx-1; x++) {
      const i = y*nx+x;
      for (const s of sources) {
        const dx = x-s.x, dy = y-s.y, f = Math.exp(-(dx*dx+dy*dy)/(2*s.radius*s.radius)) * s.spin / s.radius;
        fu[i] -= dy*f; fv[i] += dx*f;
      }
      u[i] = fu[i] * (1 + p.swirl*.065); v[i] = fv[i] * (1 + p.swirl*.065);
    }
    const sample = (a, x, y) => {
      x = Math.max(1, Math.min(nx-2.001, x)); y = Math.max(1, Math.min(ny-2.001, y));
      const ix = Math.floor(x), iy = Math.floor(y), fx = x-ix, fy = y-iy, i = iy*nx+ix;
      return (a[i]*(1-fx)+a[i+1]*fx)*(1-fy)+(a[i+nx]*(1-fx)+a[i+nx+1]*fx)*fy;
    };
    function project() {
      pressure.fill(0); div.fill(0);
      for (let y=1;y<ny-1;y++) for (let x=1;x<nx-1;x++) { const i=y*nx+x; div[i]=-.5*(u[i+1]-u[i-1]+v[i+nx]-v[i-nx]); }
      for (let k=0;k<20;k++) for (let y=1;y<ny-1;y++) for (let x=1;x<nx-1;x++) { const i=y*nx+x; pressure[i]=(div[i]+pressure[i-1]+pressure[i+1]+pressure[i-nx]+pressure[i+nx])*.25; }
      for (let y=1;y<ny-1;y++) for (let x=1;x<nx-1;x++) { const i=y*nx+x; u[i]-=.5*(pressure[i+1]-pressure[i-1]); v[i]-=.5*(pressure[i+nx]-pressure[i-nx]); }
    }
    project();
    const phase = rng()*Math.PI*2, steps = 28 + Math.round(p.duration*.95), count = 180 + Math.round(p.density*13);
    const margin = 38, px = x => margin + (x-1)/(nx-3)*(WIDTH-2*margin), py = y => margin + (y-1)/(ny-3)*(HEIGHT-2*margin);
    const particles = Array.from({ length: count }, () => ({ x: 2+rng()*(nx-5), y: 2+rng()*(ny-5), points: [], width: (.35+p.width*.023)*(.65+rng()*.65), active: true }));
    const reserved = (x,y) => p.space > 0 && ((x-36)/(.07*p.space+1))**2 + ((y-26)/(.05*p.space+1))**2 < 1;
    for (let t=0;t<steps;t++) {
      // Implicit viscosity solve, then transport velocity through the previous field.
      const oldU = u.slice(), oldV = v.slice(), a = .008+p.viscosity*.012;
      for (let k=0;k<5;k++) for (let y=1;y<ny-1;y++) for (let x=1;x<nx-1;x++) {
        const i=y*nx+x;
        u[i]=(oldU[i]+a*(u[i-1]+u[i+1]+u[i-nx]+u[i+nx]))/(1+4*a);
        v[i]=(oldV[i]+a*(v[i-1]+v[i+1]+v[i-nx]+v[i+nx]))/(1+4*a);
      }
      const advU=new Float32Array(size), advV=new Float32Array(size), force=.025+p.swirl*.001;
      for(let y=1;y<ny-1;y++) for(let x=1;x<nx-1;x++) {
        const i=y*nx+x, bx=x-u[i]*.32, by=y-v[i]*.32, pulse=1+.25*Math.sin(t*.06+phase);
        advU[i]=sample(u,bx,by)+fu[i]*force*pulse; advV[i]=sample(v,bx,by)+fv[i]*force*pulse;
      }
      u=advU; v=advV; project();
      for(const q of particles) {
        if(!q.active) continue;
        const vx=sample(u,q.x,q.y), vy=sample(v,q.x,q.y);
        const mx=q.x+vx*.16, my=q.y+vy*.16;
        q.x+=sample(u,mx,my)*.32;
        q.y+=sample(v,mx,my)*.32;
        if(q.x<1||q.x>nx-2||q.y<1||q.y>ny-2||reserved(q.x,q.y)) { q.active=false; continue; }
        q.points.push([px(q.x),py(q.y)]);
      }
    }
    let paths=particles.filter(q=>q.points.length>8 && Math.hypot(q.points[0][0]-q.points[q.points.length-1][0],q.points[0][1]-q.points[q.points.length-1][1])>4).map(({points,width})=>({points,width}));
    if(p.finish === 'engraved') {
      // Extract closely spaced integral curves from the evolved field. A spatial grid
      // prevents the random overdraw of particle trails and creates engraved tonal bands.
      paths=[];
      const spacing=3.6-p.density*.019, cell=4, grid=new Map();
      const shapePhase= sources[0].x*.13;
      const inside=(x,y)=>{
        const dx=(x-450)/350,dy=(y-330)/238,a=Math.atan2(dy,dx);
        return Math.hypot(dx,dy)<.93+.055*Math.sin(a*3+shapePhase)+.03*Math.cos(a*5) && !(((x-510)/(.55*p.space+8))**2+((y-298)/(.9*p.space+8))**2<1);
      };
      const near=(x,y,d)=>{
        const gx=Math.floor(x/cell),gy=Math.floor(y/cell);
        for(let yy=gy-1;yy<=gy+1;yy++)for(let xx=gx-1;xx<=gx+1;xx++){
          const bucket=grid.get(yy*225+xx);if(bucket)for(const q of bucket)if((x-q[0])**2+(y-q[1])**2<d*d)return true;
        }return false;
      };
      const direction=(x,y)=>{
        const gx=1+(x-margin)/(WIDTH-2*margin)*(nx-3),gy=1+(y-margin)/(HEIGHT-2*margin)*(ny-3);
        return Math.atan2(sample(v,gx,gy),sample(u,gx,gy));
      };
      function trace(x,y,sign,d){
        const out=[];const sx=x,sy=y;
        for(let k=0;k<650;k++){
          const a=direction(x,y),b=direction(x+Math.cos(a)*sign,y+Math.sin(a)*sign);
          x+=Math.cos(b)*2*sign;y+=Math.sin(b)*2*sign;
          if(!inside(x,y)||near(x,y,d))break;
          if(k>20&&Math.hypot(x-sx,y-sy)<3)break;
          out.push([x,y]);
        }return out;
      }
      for(let attempt=0;attempt<10500;attempt++){
        const x=110+rng()*680,y=95+rng()*470;
        const d=spacing*(.76+.2*Math.sin(x/65+y/110+shapePhase));
        if(!inside(x,y)||near(x,y,d))continue;
        const points=trace(x,y,-1,d).reverse().concat([[x,y]],trace(x,y,1,d));
        if(points.length<18)continue;
        paths.push({points,width:(.4+p.width*.027)*(.45+1.25*(.5+.5*Math.sin(x/90+y/135+shapePhase))**3),taper:true});
        for(const q of points){const key=Math.floor(q[1]/cell)*225+Math.floor(q[0]/cell);if(!grid.has(key))grid.set(key,[]);grid.get(key).push(q);}
      }
      // Sparse stippling is tied to the silhouette, never a full-page noise overlay.
      for(let k=0;k<2400;k++){
        const a=rng()*Math.PI*2,r=.98+rng()*.06;
        const x=450+Math.cos(a)*350*r,y=330+Math.sin(a)*238*r;
        if(inside(x,y)||rng()>.24)continue;
        paths.push({points:[[x,y],[x+.15,y+.12]],width:.22+rng()*.5});
      }
    }
    return { paths, recipe: JSON.parse(JSON.stringify(recipe)), layout: { sources }, stats: { algorithm: 'fluid', steps, particles: count, grid: [nx,ny] } };
  }
  function validImage(image) {
    return image && ((image.width===225 && image.height===165)||(image.width===450&&image.height===330)||(image.width===900&&image.height===660)) && Array.isArray(image.pixels)
      && image.pixels.length===image.width*image.height && image.pixels.every(v=>Number.isInteger(v)&&v>=0&&v<=255);
  }
  function photo(recipe) {
    const p={...algorithmDefaults,...recipe.params}, w=recipe.image.width,h=recipe.image.height,n=w*h,hd=w>=450;
    const rng=random((recipe.seed^Math.imul(recipe.variation+1,1597334677))>>>0), phase=rng()*Math.PI*2;
    let tone=Float32Array.from(recipe.image.pixels,v=>v/255);
    // Smoothing suppresses camera noise before direction and edge estimation.
    for(let pass=0;pass<Math.round((100-p.detail)/22);pass++) {
      const next=tone.slice();
      for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const i=y*w+x;next[i]=(tone[i]*4+tone[i-1]+tone[i+1]+tone[i-w]+tone[i+w])/8;}
      tone=next;
    }
    const tx=new Float32Array(n),ty=new Float32Array(n),edge=new Float32Array(n),normal=new Uint8Array(n);
    for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
      const i=y*w+x,gx=(tone[i+1]-tone[i-1])*.5,gy=(tone[i+w]-tone[i-w])*.5;
      tx[i]=gx*gx-gy*gy;ty[i]=2*gx*gy;edge[i]=Math.hypot(gx,gy);
      const a=(Math.atan2(gy,gx)*180/Math.PI+180)%180;
      normal[i]=a<22.5||a>=157.5?0:a<67.5?1:a<112.5?2:3;
    }
    // Smooth doubled-angle orientation: antiparallel edges share the same tangent.
    for(let pass=0;pass<3;pass++){
      const a=tx.slice(),b=ty.slice();
      for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
        const i=y*w+x;tx[i]=(a[i]*4+a[i-1]+a[i+1]+a[i-w]+a[i+w])/8;ty[i]=(b[i]*4+b[i-1]+b[i+1]+b[i-w]+b[i+w])/8;
      }
    }
    const sample=(a,x,y)=>{
      x=Math.max(0,Math.min(w-1.001,x*w/900));y=Math.max(0,Math.min(h-1.001,y*h/660));
      const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,i=iy*w+ix;
      return (a[i]*(1-fx)+a[i+1]*fx)*(1-fy)+(a[i+w]*(1-fx)+a[i+w+1]*fx)*fy;
    };
    const dark=(x,y)=>Math.max(0,Math.min(1,(.5-sample(tone,x,y))*(.5+p.contrast*.018)+.5-p.space*.0015));
    const angle=(x,y,cross)=>{
      const a=sample(tx,x,y),b=sample(ty,x,y),strength=Math.min(1,Math.hypot(a,b)*180);
      const base=-.65+Math.sin(x/105+y/150+phase)*p.randomness*.009;
      let tangent=.5*Math.atan2(b,a)+Math.PI/2;
      if(Math.cos(tangent-base)<0)tangent+=Math.PI;
      return base+Math.atan2(Math.sin(tangent-base),Math.cos(tangent-base))*strength*p.fidelity/100+(cross?Math.PI*.48:0);
    };
    const paths=[],grid=new Map(),cell=8;
    const near=(x,y,d)=>{
      const gx=Math.floor(x/cell),gy=Math.floor(y/cell);
      for(let yy=gy-1;yy<=gy+1;yy++)for(let xx=gx-1;xx<=gx+1;xx++){
        const b=grid.get(yy*113+xx);if(b)for(const q of b)if((x-q[0])**2+(y-q[1])**2<d*d)return true;
      }return false;
    };
    function trace(x,y,sign,cross,spacing){
      const points=[],initial=dark(x,y);let prev=angle(x,y,cross);
      for(let k=0;k<65+p.detail;k++){
        let a=angle(x,y,cross);if(Math.cos(a-prev)<0)a+=Math.PI;
        x+=Math.cos(a)*sign*(hd?1:2);y+=Math.sin(a)*sign*(hd?1:2);prev=a;
        if(x<24||x>876||y<24||y>636)break;
        const d=dark(x,y),e=sample(edge,x,y);
        if(d<(cross?.55:.07)||(p.fidelity>40&&Math.abs(d-initial)>.24+(100-p.fidelity)*.005)||near(x,y,spacing))break;
        points.push([x,y]);
      }return points;
    }
    let primary=0;
    for(const cross of [false,true]){
      grid.clear();
      for(let attempt=0;attempt<(hd?(cross?24000:60000):(cross?9000:18000));attempt++){
        const x=24+rng()*852,y=24+rng()*612,d=dark(x,y),e=sample(edge,x,y);
        if(d<(cross?.58:.08)||rng()>d+.12)continue;
        const spacing=Math.min(7.5,(hd?3.6-p.density*.018:6.8-p.density*.035)*(1.35-d*.8))*(cross?1.15:1);
        if(near(x,y,spacing))continue;
        const points=trace(x,y,-1,cross,spacing).reverse().concat([[x,y]],trace(x,y,1,cross,spacing));
        if(points.length<5)continue;
        paths.push({points,width:(hd?.22+p.width*.012:.35+p.width*.025)*(.4+d*1.25+Math.min(.45,e*3)*p.fidelity/100)*(cross?.7:1),taper:true,role:cross?'cross':'hatch'});
        if(!cross)primary++;
        for(const q of points){const key=Math.floor(q[1]/cell)*113+Math.floor(q[0]/cell);if(!grid.has(key))grid.set(key,[]);grid.get(key).push(q);}
      }
    }
    const crossCount=paths.length-primary;let contours=0;
    if(hd&&p.fidelity>0){
      // Non-maximum suppression creates thin edge ridges; strong seeds trace into
      // weaker neighbors, retaining fine boundaries independently of tone hatching.
      const ridge=new Uint8Array(n),used=new Uint8Array(n),seeds=[];
      const low=.012+(100-p.detail)*.0004,high=low*2.2;
      const offsets=[1,w+1,w,w-1];
      for(let y=Math.ceil(25*h/660);y<Math.floor(635*h/660);y++)for(let x=Math.ceil(25*w/900);x<Math.floor(875*w/900);x++){
        const i=y*w+x,o=offsets[normal[i]],e=edge[i];
        if(e>low&&e>=edge[i-o]&&e>edge[i+o]){ridge[i]=1;if(e>high)seeds.push(i);}
      }
      seeds.sort((a,b)=>edge[b]-edge[a]);
      function follow(start){
        const out=[];let i=start;
        for(let k=0;k<1800;k++){
          let best=-1,score=-1;
          for(const o of [-w-1,-w,-w+1,-1,1,w-1,w,w+1]){
            const j=i+o;if(ridge[j]&&!used[j]&&edge[j]>score){best=j;score=edge[j];}
          }
          if(best<0)break;used[best]=1;out.push([best%w,Math.floor(best/w)]);i=best;
        }return out;
      }
      for(const i of seeds){
        if(used[i])continue;used[i]=1;
        const a=follow(i),b=follow(i),points=b.reverse().concat([[i%w,Math.floor(i/w)]],a);
        if(points.length<3+Math.round((100-p.detail)/25))continue;
        paths.push({points:points.map(q=>[q[0]*900/w,q[1]*660/h]),width:(.3+Math.min(.65,edge[i]*2))*p.fidelity/100,role:'contour'});contours++;
      }
    }
    return {paths,recipe:JSON.parse(JSON.stringify(recipe)),layout:{width:w,height:h},stats:{algorithm:'photo',primary,cross:crossCount,contours}};
  }
  const api = { defaults, algorithmDefaults, generate, draw, layout, validRecipe, validImage };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PrintGenerator = api;
})(globalThis);
