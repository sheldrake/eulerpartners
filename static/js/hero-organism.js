(() => {
  const hero = document.querySelector('.hero-intro');
  const canvas = document.getElementById('hero-organism');
  if (!hero || !canvas) return;

  const ctx = canvas.getContext('2d');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const PAL = {
    filaments: [
      'rgba(122, 196, 150, 0.88)',
      'rgba(170, 218, 182, 0.72)',
      'rgba(214, 178, 116, 0.58)',
      'rgba(96, 158, 124, 0.82)'
    ],
    glow: 0.15,
    blend: 'lighter',
    fade: 0.025
  };

  // Tunables
  const FLOW_STRENGTH = 0.008;  // Much lower: global current barely matters
  const EDGE_MARGIN  = 80;
  const EDGE_STRENGTH = 0.06;
  const NARROW_MIN = 0.3, NARROW_MAX = 0.8;
  const WIDE_MIN   = 1.0,  WIDE_MAX   = 1.6;

  let w = 0, h = 0, branches = [], boutons = [], raf = 0;

  function size() {
    const r = hero.getBoundingClientRect();
    if (!r.width || !r.height) return false;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = Math.round(r.width);
    h = Math.round(r.height);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return true;
  }

  // Gentle global flow — just enough to keep it from looking purely random.
  function flowAngle(x, y, phase) {
    const a = Math.sin(x * 0.002 + 1.7 + phase) + Math.cos(y * 0.0025 - 0.9 + phase);
    const b = Math.sin(x * 0.001 - 0.4 + phase) * 0.5 + Math.cos(y * 0.0013 + 2.3 + phase) * 0.5;
    return (a + b) * 1.2;
  }

  function addBranch(x, y, a, width, maxLen, color) {
    branches.push({
      x, y, a, len: 0, max: maxLen, width, color,
      phase: Math.random() * Math.PI * 2,
      curl: (Math.random() - 0.5) * 0.06 // High persistent curl
    });
  }

  // Seed from 3–5 random interior points, with random initial headings.
  // This creates the "radiating from nodes" look of a neural/mycelial network.
  function addSeeds(n) {
    for (let i = 0; i < n; i++) {
      // Bias seeds toward the right and bottom-right, but allow some center-right.
      let x, y;
      if (w < 767) {
        // Mobile: keep entirely on the right half
        x = w * (0.6 + Math.random() * 0.35);
        y = h * (0.1 + Math.random() * 0.8);
      } else {
        x = w * (0.35 + Math.random() * 0.6);
        y = h * (0.1 + Math.random() * 0.8);
      }

      // Random initial heading, full 360°
      const a = Math.random() * Math.PI * 2;

      // Thicker, longer roots
      addBranch(x, y, a, 1.2 + Math.random() * 1.8, 300 + Math.random() * 500,
        PAL.filaments[(Math.random() * PAL.filaments.length) | 0]);
    }
  }

  function step() {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0,0,0,' + PAL.fade + ')';
    ctx.fillRect(0, 0, w, h);

    ctx.lineCap = 'round';
    const MAX = 350;

    for (let i = branches.length - 1; i >= 0; i--) {
      const b = branches[i];

      // SMALL STEPS: 0.25–0.6 px per frame
      const d = 0.25 + Math.random() * 0.35;

      const target = flowAngle(b.x, b.y, b.phase);
      let dA = target - b.a;
      dA = Math.atan2(Math.sin(dA), Math.cos(dA));

      // HIGH JITTER: 0.12 rad per step creates the squiggle.
      // Low flow strength means the jitter isn't immediately corrected.
      b.a += dA * FLOW_STRENGTH + b.curl + (Math.random() - 0.5) * 0.12;

      // Edge containment
      let pushX = 0, pushY = 0;
      if (b.x < EDGE_MARGIN) pushX = (EDGE_MARGIN - b.x) / EDGE_MARGIN;
      else if (b.x > w - EDGE_MARGIN) pushX = -(b.x - (w - EDGE_MARGIN)) / EDGE_MARGIN;
      if (b.y < EDGE_MARGIN) pushY = (EDGE_MARGIN - b.y) / EDGE_MARGIN;
      else if (b.y > h - EDGE_MARGIN) pushY = -(b.y - (h - EDGE_MARGIN)) / EDGE_MARGIN;

      if (pushX !== 0 || pushY !== 0) {
        const inA = Math.atan2(pushY, pushX);
        let dE = inA - b.a;
        dE = Math.atan2(Math.sin(dE), Math.cos(dE));
        b.a += dE * EDGE_STRENGTH;
      }

      const nx = b.x + Math.cos(b.a) * d;
      const ny = b.y + Math.sin(b.a) * d;

      // glow pass
      ctx.globalCompositeOperation = PAL.blend;
      ctx.globalAlpha = PAL.glow;
      ctx.strokeStyle = b.color;
      ctx.lineWidth = b.width * 3;
      ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(nx, ny); ctx.stroke();

      // core pass
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.lineWidth = b.width;
      ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(nx, ny); ctx.stroke();

      b.x = nx; b.y = ny; b.len += d; b.width *= 0.9975;

      // Branching: higher probability for a denser, more fractal network
      if (Math.random() < 0.06 && branches.length < MAX && b.len > 15) {
        const wide = Math.random() < 0.15;
        const spread = wide
          ? WIDE_MIN + Math.random() * (WIDE_MAX - WIDE_MIN)
          : NARROW_MIN + Math.random() * (NARROW_MAX - NARROW_MIN);
        const side = Math.random() < 0.5 ? -1 : 1;

        addBranch(b.x, b.y, b.a + spread * side, b.width * 0.75,
          Math.min(b.max * 0.8, 100 + Math.random() * 200), b.color);

        if (!wide && Math.random() < 0.4) {
          addBranch(b.x, b.y, b.a - spread * side, b.width * 0.65,
            Math.min(b.max * 0.6, 80 + Math.random() * 150), b.color);
        }

        if (b.width > 1.0) {
          boutons.push({ x: b.x, y: b.y, r: b.width * 1.8, life: 1 });
        }
      }

      if (
        b.len > b.max || b.width < 0.15 ||
        b.x < -80 || b.x > w + 80 ||
        b.y < -80 || b.y > h + 80
      ) {
        branches.splice(i, 1);
      }
    }

    // Boutons (synaptic junctions)
    for (let i = boutons.length - 1; i >= 0; i--) {
      const bt = boutons[i];
      ctx.globalCompositeOperation = PAL.blend;
      ctx.globalAlpha = bt.life * 0.25;
      ctx.fillStyle = 'rgba(180, 222, 190, 1)';
      ctx.beginPath();
      ctx.arc(bt.x, bt.y, bt.r, 0, Math.PI * 2);
      ctx.fill();
      bt.life -= 0.004;
      if (bt.life <= 0) boutons.splice(i, 1);
    }

    // Replenish: if the network thins out, add 3–4 new seeds
    if (branches.length < 25) addSeeds(3 + Math.floor(Math.random() * 2));
  }

  function loop() {
    step();
    raf = requestAnimationFrame(loop);
  }

  function restart(warm = 900) { // Long warmup because steps are tiny
    cancelAnimationFrame(raf);
    if (!size()) return;
    ctx.clearRect(0, 0, w, h);
    branches = [];
    boutons = [];
    addSeeds(4); // Start with 4 seeds
    for (let i = 0; i < warm; i++) step();
    if (!reduceMotion) raf = requestAnimationFrame(loop);
  }

  let rt;
  const onResize = () => { clearTimeout(rt); rt = setTimeout(() => restart(200), 220); };
  if ('ResizeObserver' in window) new ResizeObserver(onResize).observe(hero);
  else window.addEventListener('resize', onResize);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(raf);
    } else if (!reduceMotion) {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(loop);
    }
  });

  restart(900);
})();
