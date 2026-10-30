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
    fade: 0.035 // Clears old growth faster, prevents dense mesh
  };

  // Tunables
  const FLOW_STRENGTH = 0.022;  // Gentle steering
  const EDGE_MARGIN  = 100;
  const EDGE_STRENGTH = 0.03;
  const NARROW_MIN = 0.45, NARROW_MAX = 0.85; // Distinct Y-junction angles
  const WIDE_MIN   = 1.0,  WIDE_MAX   = 1.4;

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

  // Very low frequency flow field. Creates broad, sweeping, organic river-like curves.
  function flowAngle(x, y, phase) {
    const a = Math.sin(x * 0.0010 + 1.7 + phase) + Math.cos(y * 0.0013 - 0.9 + phase);
    const b = Math.sin(x * 0.0005 - 0.4 + phase) * 0.5 + Math.cos(y * 0.0007 + 2.3 + phase) * 0.5;
    return (a + b) * 1.5;
  }

  function addBranch(x, y, a, width, maxLen, color) {
    branches.push({
      x, y, a, len: 0, max: maxLen, width, color,
      phase: Math.random() * Math.PI * 2, // Unique phase offset
      curl: (Math.random() - 0.5) * 0.02   // Gentle persistent curl
    });
  }

  function addSeeds(n) {
    for (let i = 0; i < n; i++) {
      let x, y, a;
      const r = Math.random();

      // Seed from edges, creeping inward
      if (r < 0.45) {
        x = w - 10;
        y = h * (0.1 + Math.random() * 0.9);
        a = Math.PI + (Math.random() - 0.5) * 0.6;
      } else if (r < 0.85) {
        x = w * (0.3 + Math.random() * 0.7);
        y = h + 10;
        a = -Math.PI / 2 + (Math.random() - 0.5) * 0.6;
      } else {
        x = w * (0.5 + Math.random() * 0.5);
        y = -10;
        a = Math.PI / 2 + (Math.random() - 0.5) * 0.6;
      }

      // Thicker base veins, longer lifespans (encourages recursive branching)
      addBranch(x, y, a, 1.0 + Math.random() * 1.5, 250 + Math.random() * 400,
        PAL.filaments[(Math.random() * PAL.filaments.length) | 0]);
    }
  }

  function step() {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0,0,0,' + PAL.fade + ')';
    ctx.fillRect(0, 0, w, h);

    ctx.lineCap = 'round';
    const MAX = 280;

    for (let i = branches.length - 1; i >= 0; i--) {
      const b = branches[i];
      const d = 0.8 + Math.random() * 1.2; // Slightly longer steps

      const target = flowAngle(b.x, b.y, b.phase);
      let dA = target - b.a;
      dA = Math.atan2(Math.sin(dA), Math.cos(dA));

      // Jitter reduced to 0.02 so the flow field dominates and lines stay smooth
      b.a += dA * FLOW_STRENGTH + b.curl + (Math.random() - 0.5) * 0.02;

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

      b.x = nx; b.y = ny; b.len += d; b.width *= 0.9975; // Slower taper

      // Fractal Branching: fewer seeds, but they branch heavily into a hierarchy
      if (Math.random() < 0.025 && branches.length < MAX && b.len > 20) {
        const wide = Math.random() < 0.15;
        const spread = wide
          ? WIDE_MIN + Math.random() * (WIDE_MAX - WIDE_MIN)
          : NARROW_MIN + Math.random() * (NARROW_MAX - NARROW_MIN);
        const side = Math.random() < 0.5 ? -1 : 1;

        addBranch(b.x, b.y, b.a + spread * side, b.width * 0.75,
          Math.min(b.max * 0.8, 100 + Math.random() * 200), b.color);

        // Occasional double-fork (Y-junction)
        if (!wide && Math.random() < 0.3) {
          addBranch(b.x, b.y, b.a - spread * side, b.width * 0.65,
            Math.min(b.max * 0.6, 80 + Math.random() * 150), b.color);
        }

        if (b.width > 1.2) {
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
      ctx.globalAlpha = bt.life * 0.2;
      ctx.fillStyle = 'rgba(180, 222, 190, 1)';
      ctx.beginPath();
      ctx.arc(bt.x, bt.y, bt.r, 0, Math.PI * 2);
      ctx.fill();
      bt.life -= 0.004;
      if (bt.life <= 0) boutons.splice(i, 1);
    }

    // Replenish slowly to maintain the hierarchy
    if (branches.length < 20) addSeeds(4);
  }

  function loop() {
    step();
    raf = requestAnimationFrame(loop);
  }

  function restart(warm = 400) {
    cancelAnimationFrame(raf);
    if (!size()) return;
    ctx.clearRect(0, 0, w, h);
    branches = [];
    boutons = [];
    addSeeds(14);
    for (let i = 0; i < warm; i++) step();
    if (!reduceMotion) raf = requestAnimationFrame(loop);
  }

  let rt;
  const onResize = () => { clearTimeout(rt); rt = setTimeout(() => restart(150), 220); };
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

  restart(400);
})();
