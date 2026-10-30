
(() => {
  const hero = document.querySelector('.hero-intro');
  const canvas = document.getElementById('hero-organism');
  if (!hero || !canvas) return;

  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  // -------------------------------------------------------
  // CONFIGURATION
  // -------------------------------------------------------

  const CONFIG = {
    fps: 30,
    maxTips: 38,
    maxPaths: 260,
    maxPoints: 9000,
    maxAnchors: 1600,

    speed: [13, 21],
    pointSpacing: 3.0,

    fusionRadius: 9,
    fusionChance: 0.20,

    branchInterval: [5, 12],
    branchAngle: [0.35, 0.95],

    fadeStart: 55,
    fadeEnd: 145,

    // Three levels of hyphal hierarchy
    widths: [1.8, 0.95, 0.48],

    colours: [
      'rgba(137, 181, 146, 1)',
      'rgba(172, 202, 169, 1)',
      'rgba(213, 216, 188, 1)'
    ],

    junction: 'rgba(188, 211, 170, 1)',

    // Restrained illumination
    glow: 0.055,

    // Simulation population
    seeds: 8
  };

  const TAU = Math.PI * 2;
  const CELL = 24;
  const MAX_STEP = 1 / 30;

  const reducedMotion =
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let w = 0, h = 0, dpr = 1;
  let tips = [];
  let paths = [];
  let anchors = [];
  let grid = new Map();
  let junctions = [];

  let elapsed = 0;
  let accumulator = 0;
  let lastFrame = 0;
  let raf = 0;
  let running = false;
  let visible = true;
  let totalPoints = 0;
  let nextId = 1;

  // -------------------------------------------------------
  // UTILITIES
  // -------------------------------------------------------

  const rand = (a, b) => a + Math.random() * (b - a);

  const clamp = (v, a, b) =>
    Math.max(a, Math.min(b, v));

  const angleDiff = (a, b) =>
    Math.atan2(Math.sin(b - a), Math.cos(b - a));

  const distance = (x1, y1, x2, y2) =>
    Math.hypot(x2 - x1, y2 - y1);

  const cellKey = (x, y) =>
    `${Math.floor(x / CELL)},${Math.floor(y / CELL)}`;

  function addAnchor(x, y, owner, time) {
    const node = { x, y, owner, time };
    const key = cellKey(x, y);

    if (!grid.has(key)) grid.set(key, []);
    grid.get(key).push(node);

    anchors.push(node);
  }

  function rebuildGrid() {
    grid.clear();

    for (const node of anchors) {
      const key = cellKey(node.x, node.y);
      if (!grid.has(key)) grid.set(key, []);
      grid.get(key).push(node);
    }
  }

  // -------------------------------------------------------
  // ENVIRONMENT
  // -------------------------------------------------------

  // A slow-moving directional field.
  // It provides coherence without forcing all growth
  // in the same direction.

  function environment(x, y) {
    const nx = x / Math.max(w, 1);
    const ny = y / Math.max(h, 1);

    const t = elapsed * 0.035;

    let vx =
      Math.sin(ny * 5.1 + t) * 0.45 +
      Math.cos(nx * 4.2 - t * 0.7) * 0.35;

    let vy =
      Math.cos(nx * 4.6 + t * 0.6) * 0.4 +
      Math.sin(ny * 5.5 - t) * 0.3;

    // Several soft nutrient centres.
    // These encourage exploration towards the centre
    // without creating obvious radial patterns.

    const nutrients = [
      [0.55, 0.25],
      [0.68, 0.72],
      [0.82, 0.46]
    ];

    let ax = 0, ay = 0;

    for (const [px, py] of nutrients) {
      const dx = px * w - x;
      const dy = py * h - y;
      const dist = Math.hypot(dx, dy) + 1;

      const influence = 1 / (1 + dist / 150);

      ax += dx / dist * influence;
      ay += dy / dist * influence;
    }

    vx += ax * 0.24;
    vy += ay * 0.24;

    // Keep growth biased away from the far-left edge.
    // This protects the text area.

    if (nx < 0.42) {
      vx += 0.7 * (0.42 - nx);
    }

    return Math.atan2(vy, vx);
  }

  // -------------------------------------------------------
  // PATHS AND GROWTH AGENTS
  // -------------------------------------------------------

  function createPath(x, y, level) {
    const path = {
      id: nextId++,
      points: [{ x, y }],
      level,
      width: CONFIG.widths[level],
      created: elapsed,
      lastGrowth: elapsed,
      reinforcement: 0,
      colour: CONFIG.colours[level]
    };

    paths.push(path);
    return path;
  }

  function createTip(x, y, angle, level, parent = null) {
    if (tips.length >= CONFIG.maxTips) return;

    const path = createPath(x, y, level);

    tips.push({
      id: nextId++,
      x, y,
      angle,
      level,
      path,

      speed: rand(...CONFIG.speed) * (level === 0 ? 1 : 0.85),

      energy: rand(0.75, 1),
      age: 0,

      turn: rand(-0.015, 0.015),
      turnTarget: rand(-0.035, 0.035),

      branchTimer: rand(...CONFIG.branchInterval),
      anchorTimer: rand(9, 16),

      travelled: 0,
      parent
    });
  }

  function createSeeds() {
    for (let i = 0; i < CONFIG.seeds; i++) {
      const x = rand(w * 0.57, w * 0.96);
      const y = rand(h * 0.08, h * 0.92);

      // Predominantly inward-facing, but not uniformly so.
      const angle = Math.PI + rand(-0.95, 0.95);

      createTip(x, y, angle, 0);
    }
  }

  function branch(tip) {
    if (tip.level >= 2) return;
    if (tips.length >= CONFIG.maxTips) return;
    if (tip.energy < 0.45) return;

    const spread = rand(...CONFIG.branchAngle);
    const direction = Math.random() < 0.5 ? -1 : 1;

    // Main secondary branch.
    createTip(
      tip.x,
      tip.y,
      tip.angle + spread * direction,
      tip.level + 1,
      tip.id
    );

    // Occasionally produce a second branch.
    if (
      tip.level === 0 &&
      Math.random() < 0.42 &&
      tips.length < CONFIG.maxTips
    ) {
      createTip(
        tip.x,
        tip.y,
        tip.angle - spread * direction * rand(0.65, 1.15),
        1,
        tip.id
      );
    }

    tip.energy -= 0.12;
    tip.branchTimer = rand(...CONFIG.branchInterval) *
      (tip.level === 0 ? 1.2 : 0.85);

    addAnchor(tip.x, tip.y, tip.id, elapsed);
  }

  // -------------------------------------------------------
  // ANASTOMOSIS: CONNECTION BETWEEN FILAMENTS
  // -------------------------------------------------------

  function findConnection(tip) {
    const cx = Math.floor(tip.x / CELL);
    const cy = Math.floor(tip.y / CELL);

    let nearest = null;
    let nearestDist = CONFIG.fusionRadius;

    for (let ox = -1; ox <= 1; ox++) {
      for (let oy = -1; oy <= 1; oy++) {
        const nodes = grid.get(`${cx + ox},${cy + oy}`);
        if (!nodes) continue;

        for (const node of nodes) {
          // Don't connect to very recent growth.
          if (elapsed - node.time < 3) continue;

          // Avoid reconnecting immediately to the same tip.
          if (node.owner === tip.id) continue;

          const d = distance(
            tip.x, tip.y,
            node.x, node.y
          );

          if (d < nearestDist && d > 2) {
            nearestDist = d;
            nearest = node;
          }
        }
      }
    }

    return nearest;
  }

  function fuse(tip, node) {
    if (Math.random() > CONFIG.fusionChance) return false;

    const connection = {
      points: [
        { x: tip.x, y: tip.y },
        { x: node.x, y: node.y }
      ],
      level: Math.min(tip.level, 1),
      width: CONFIG.widths[tip.level] * 0.9,
      created: elapsed,
      lastGrowth: elapsed,
      reinforcement: 1,
      colour: CONFIG.colours[tip.level]
    };

    paths.push(connection);

    // Reinforce the connected structure.
    const related = paths.find(p =>
      p.id === node.owner
    );

    if (related) {
      related.reinforcement = Math.min(
        1,
        related.reinforcement + 0.3
      );
    }

    junctions.push({
      x: node.x,
      y: node.y,
      created: elapsed,
      strength: 1
    });

    addAnchor(node.x, node.y, tip.id, elapsed);

    tip.energy = 0;
    return true;
  }

  // -------------------------------------------------------
  // GROWTH SIMULATION
  // -------------------------------------------------------

  function updateTip(tip, dt) {
    tip.age += dt;
    tip.energy -= dt * (tip.level === 2 ? 0.009 : 0.004);

    if (tip.energy <= 0.08) return false;

    // Slowly changing environmental influence.
    const target = environment(tip.x, tip.y);

    const steering = angleDiff(tip.angle, target);

    // Correlated turning rather than random frame jitter.
    tip.turn += (tip.turnTarget - tip.turn) * dt * 0.25;

    if (Math.random() < dt * 0.35) {
      tip.turnTarget = rand(-0.12, 0.12);
    }

    tip.angle += steering * dt * 0.42;
    tip.angle += tip.turn * dt * 2.2;

    // Slight boundary avoidance.
    const margin = 55;

    if (tip.x < margin) {
      tip.angle += angleDiff(tip.angle, 0) * dt * 1.4;
    } else if (tip.x > w - margin) {
      tip.angle += angleDiff(tip.angle, Math.PI) * dt * 1.4;
    }

    if (tip.y < margin) {
      tip.angle += angleDiff(tip.angle, Math.PI / 2) * dt * 1.2;
    } else if (tip.y > h - margin) {
      tip.angle += angleDiff(tip.angle, -Math.PI / 2) * dt * 1.2;
    }

    const speed = tip.speed * (0.65 + tip.energy * 0.35);

    const nx = tip.x + Math.cos(tip.angle) * speed * dt;
    const ny = tip.y + Math.sin(tip.angle) * speed * dt;

    const moved = distance(tip.x, tip.y, nx, ny);

    tip.x = nx;
    tip.y = ny;
    tip.travelled += moved;

    // Store points only when sufficient distance has accumulated.
    if (tip.travelled >= CONFIG.pointSpacing) {
      const path = tip.path;

      path.points.push({ x: tip.x, y: tip.y });
      path.lastGrowth = elapsed;

      totalPoints++;
      tip.travelled = 0;

      // Periodic network sampling.
      tip.anchorTimer -= dt;

      if (tip.anchorTimer <= 0) {
        addAnchor(tip.x, tip.y, tip.id, elapsed);
        tip.anchorTimer = rand(9, 16);
      }

      // Look for opportunities to fuse.
      const nearby = findConnection(tip);

      if (nearby && fuse(tip, nearby)) {
        return false;
      }
    }

    // Branching is controlled by age, energy and hierarchy.
    tip.branchTimer -= dt;

    if (
      tip.branchTimer <= 0 &&
      tip.age > 3 &&
      tip.energy > 0.45
    ) {
      branch(tip);
    }

    // Growth naturally slows as energy is depleted.
    if (
      tip.x < -80 || tip.x > w + 80 ||
      tip.y < -80 || tip.y > h + 80
    ) return false;

    return true;
  }

  function simulate(dt) {
    elapsed += dt;

    for (let i = tips.length - 1; i >= 0; i--) {
      if (!updateTip(tips[i], dt)) {
        tips.splice(i, 1);
      }
    }

    // The organism should expand from existing structure,
    // not repeatedly generate unrelated random seeds.
    if (tips.length < 9 && paths.length < CONFIG.maxPaths) {
      const candidates = tips.filter(t => t.energy > 0.5);

      if (candidates.length) {
        const parent = candidates[
          Math.floor(Math.random() * candidates.length)
        ];

        if (parent.level < 2) branch(parent);
      } else if (tips.length === 0) {
        // Rare recovery if all active tips have exhausted.
        createTip(
          rand(w * 0.65, w * 0.9),
          rand(h * 0.2, h * 0.8),
          Math.PI + rand(-0.7, 0.7),
          0
        );
      }
    }

    // Limit accumulated geometry.
    if (paths.length > CONFIG.maxPaths) {
      const remove = paths.length - CONFIG.maxPaths;
      paths.splice(0, remove);
    }

    if (totalPoints > CONFIG.maxPoints) {
      // Remove the oldest inactive geometry first.
      const inactive = paths
        .filter(p => !tips.some(t => t.path === p))
        .sort((a, b) => a.lastGrowth - b.lastGrowth);

      const removeCount = Math.min(
        inactive.length,
        Math.ceil(inactive.length * 0.15)
      );

      for (let i = 0; i < removeCount; i++) {
        totalPoints -= inactive[i].points.length;
        const index = paths.indexOf(inactive[i]);
        if (index !== -1) paths.splice(index, 1);
      }

      totalPoints = paths.reduce(
        (sum, p) => sum + p.points.length, 0
      );
    }

    // Periodic spatial index maintenance.
    if (Math.floor(elapsed) % 12 === 0 &&
        Math.abs(elapsed - Math.round(elapsed)) < dt) {
      anchors = anchors.filter(
        a => elapsed - a.time < 110
      );
      rebuildGrid();
    }

    junctions = junctions.filter(
      j => elapsed - j.created < 35
    );
  }

  // -------------------------------------------------------
  // RENDERING
  // -------------------------------------------------------

  function render() {
    ctx.clearRect(0, 0, w, h);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Existing hyphal structures.
    for (const path of paths) {
      const pts = path.points;
      if (pts.length < 2) continue;

      const inactive = elapsed - path.lastGrowth;

      let opacity = 1;

      if (inactive > CONFIG.fadeStart) {
        opacity = clamp(
          1 - (inactive - CONFIG.fadeStart) /
          (CONFIG.fadeEnd - CONFIG.fadeStart),
          0, 1
        );
      }

      // Successful connections persist slightly longer.
      opacity *= 0.52 + path.reinforcement * 0.3;

      if (opacity < 0.015) continue;

      ctx.globalAlpha = opacity * 0.78;
      ctx.strokeStyle = path.colour;
      ctx.lineWidth = path.width *
        (1 + path.reinforcement * 0.28);

      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);

      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }

      ctx.stroke();
    }

    // Subtle junctions.
    for (const j of junctions) {
      const age = elapsed - j.created;
      const alpha = clamp(1 - age / 35, 0, 1);

      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = alpha * 0.13;
      ctx.fillStyle = CONFIG.junction;

      ctx.beginPath();
      ctx.arc(
        j.x, j.y,
        2.2 + alpha * 1.4,
        0, TAU
      );
      ctx.fill();
    }

    // Active hyphal tips.
    // Only the growing extremities receive illumination.
    for (const tip of tips) {
      const radius = tip.level === 0 ? 2.0 :
                     tip.level === 1 ? 1.4 : 0.9;

      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = CONFIG.glow * tip.energy * 2;
      ctx.fillStyle = CONFIG.colours[tip.level];

      ctx.beginPath();
      ctx.arc(tip.x, tip.y, radius * 2.4, 0, TAU);
      ctx.fill();

      ctx.globalAlpha = 0.65 * tip.energy;
      ctx.beginPath();
      ctx.arc(tip.x, tip.y, radius, 0, TAU);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  // -------------------------------------------------------
  // LIFECYCLE
  // -------------------------------------------------------

  function resize() {
    const rect = hero.getBoundingClientRect();
    if (!rect.width || !rect.height) return false;

    w = rect.width;
    h = rect.height;

    dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    return true;
  }

  function initialise() {
    if (!resize()) return;

    tips = [];
    paths = [];
    anchors = [];
    grid = new Map();
    junctions = [];

    elapsed = 0;
    accumulator = 0;
    totalPoints = 0;
    nextId = 1;

    createSeeds();

    // Establish an initial network before showing the hero.
    // This avoids the empty-canvas effect on page load.
    for (let i = 0; i < 1000; i++) {
      simulate(MAX_STEP);
    }

    render();
  }

  function frame(timestamp) {
    if (!running || !visible) return;

    if (!lastFrame) lastFrame = timestamp;

    const delta = Math.min(
      (timestamp - lastFrame) / 1000,
      0.1
    );

    lastFrame = timestamp;
    accumulator += delta;

    while (accumulator >= MAX_STEP) {
      simulate(MAX_STEP);
      accumulator -= MAX_STEP;
    }

    render();
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (running || reducedMotion) return;

    running = true;
    lastFrame = 0;
    raf = requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    cancelAnimationFrame(raf);
    raf = 0;
  }

  function refresh() {
    stop();
    initialise();

    if (!reducedMotion && visible) start();
  }

  // -------------------------------------------------------
  // RESPONSIVE AND PERFORMANCE
  // -------------------------------------------------------

  let resizeTimer;

  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(() => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(refresh, 250);
    });

    observer.observe(hero);
  } else {
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(refresh, 250);
    });
  }

  // Don't run the simulation when the hero is off-screen.
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;

      if (visible) {
        if (!reducedMotion) start();
        else render();
      } else {
        stop();
      }
    }, { threshold: 0 });

    observer.observe(hero);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stop();
    } else if (visible && !reducedMotion) {
      start();
    }
  });

  // Initialisation.
  initialise();

  if (!reducedMotion) start();

})();
