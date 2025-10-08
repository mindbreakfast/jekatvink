// script.js — улучшенная версия деревьев, купюр и выстрелов
(() => {
  // ========== CONFIG ==========
  const LEFT_CANVAS_ID = 'leftTree';
  const RIGHT_CANVAS_ID = 'rightTree';
  const CONTAINER_MAX_WIDTH = 1200; // px
  const TREE_GROW_DURATION = 10000; // ms
  const BULLET_HOLE_LIFETIME = 20000; // ms
  const MAX_BANKNOTES_PER_SIDE = 60;
  const BANKNOTE_DENOMINATIONS = ['5$', '10€', '50₽', '20$', '100€', '500₽', '1K$', '200€'];

  // ========== UTILS ==========
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (a, b) => a + Math.random() * (b - a);
  const randInt = (a, b) => Math.floor(rand(a, b + 1));
  const now = () => performance.now();
  const easeOutQuad = t => 1 - (1 - t) * (1 - t);
  const shuffle = arr => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]] } return arr; };

  // ========== CANVAS HELPERS ==========
  function setupCanvas(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    function resize() {
      const vw = Math.max(document.documentElement.clientWidth || window.innerWidth, window.innerWidth);
      const sideWidth = Math.max(320, Math.floor((vw - CONTAINER_MAX_WIDTH) / 2)); // минимум 320px
      // If viewport narrower than container, still keep a minimal side
      const cssWidth = sideWidth > 0 ? sideWidth : Math.max(200, Math.floor(vw * 0.18));
      const cssHeight = Math.max(window.innerHeight, 600);
      canvas.style.width = cssWidth + 'px';
      canvas.style.height = cssHeight + 'px';
      const dpr = window.devicePixelRatio || 1;
      canvas._dpr = dpr;
      canvas.width = Math.floor(cssWidth * dpr);
      canvas.height = Math.floor(cssHeight * dpr);
    }
    resize();
    window.addEventListener('resize', resize);
    return canvas;
  }

  // ========== BRANCH GENERATION ==========
  function generateBranches(canvas) {
    const W = canvas.clientWidth;
    const H = canvas.clientHeight;
    const branches = [];
    const trunkCount = Math.max(6, Math.floor(W / 60)); // гуще
    for (let t = 0; t < trunkCount; t++) {
      const margin = 12 + Math.random() * 12;
      const baseX = margin + t * ((W - margin * 2) / Math.max(1, trunkCount - 1));
      const baseY = H - 10 - Math.random() * 8;
      const primaryLen = rand(H * 0.12, H * 0.28);
      // recursive grow
      const maxDepth = randInt(4, 7);
      (function grow(x, y, len, angle, depth) {
        if (depth > maxDepth) return;
        const ex = x + len * Math.cos(angle);
        const ey = y - len * Math.sin(angle);
        branches.push({ x, y, ex, ey, depth });
        const sub = randInt(1, 3);
        for (let s = 0; s < sub; s++) {
          const nextLen = len * rand(0.6, 0.86);
          const spread = rand(0.18, 0.65);
          const newAngle = angle + (s % 2 === 0 ? spread : -spread) + rand(-0.25, 0.25);
          grow(ex, ey, nextLen, newAngle, depth + 1);
        }
        // thin extra twig sometimes
        if (Math.random() < 0.25 && depth < maxDepth) {
          grow(ex, ey, len * (0.7 + Math.random() * 0.1), angle + rand(-0.3, 0.3), depth + 1);
        }
      })(baseX, baseY, primaryLen, Math.PI / 2, 0);
    }
    return branches;
  }

  // ========== TREE ANIMATION WITH BANKNOTES ==========
  function animateTree(canvas, branches, duration = TREE_GROW_DURATION) {
    const ctx = canvas.getContext('2d');
    const dpr = canvas._dpr || 1;

    // Setup transform once
    function prepareCtx() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // scale to device pixels
      ctx.lineCap = 'round';
    }

    prepareCtx();

    const total = branches.length;
    const start = now();

    // find tips (endpoints) as candidates for banknotes: prefer deeper branches
    const tips = branches.filter(b => b.depth >= 3).map(b => ({ x: b.ex, y: b.ey, depth: b.depth }));
    const banknoteCount = Math.min(MAX_BANKNOTES_PER_SIDE, Math.max(8, Math.floor(tips.length * 0.18)));
    const chosen = shuffle(tips.slice()).slice(0, banknoteCount);
    const banknotes = chosen.map((t, i) => ({
      x: t.x + rand(-8, 8),
      y: t.y + rand(-8, 8),
      denom: BANKNOTE_DENOMINATIONS[randInt(0, BANKNOTE_DENOMINATIONS.length - 1)],
      size: rand(28, 44),
      appearAt: rand(0.55, 0.95) // relative progress where it becomes visible
    }));

    function draw() {
      const elapsed = now() - start;
      const t = clamp(elapsed / duration, 0, 1);
      const prog = easeOutQuad(t);
      // clear
      ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);

      // Draw branches progressively:
      // compute reveal index floating value
      const revealFloat = prog * total * 1.05; // overshoot a bit so end finishes nicely
      for (let i = 0; i < total; i++) {
        const b = branches[i];
        const local = clamp(revealFloat - i, 0, 1); // 0..1 portion
        if (local <= 0) continue;
        // draw branch partial from (x,y) to (x + (ex-x)*local)
        ctx.beginPath();
        ctx.strokeStyle = '#6b4e2e';
        ctx.lineWidth = Math.max(6 - b.depth, 1.2);
        const sx = b.x, sy = b.y;
        const ex = b.x + (b.ex - b.x) * local;
        const ey = b.y + (b.ey - b.y) * local;
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.stroke();
      }

      // draw banknotes if prog exceeds their appearAt
      for (const bn of banknotes) {
        if (prog < bn.appearAt) continue;
        const localAppear = clamp((prog - bn.appearAt) / (1 - bn.appearAt), 0, 1);
        const x = bn.x;
        const y = bn.y - (1 - localAppear) * 12; // slide in
        const w = bn.size;
        const h = bn.size * 0.55;
        // sway animation slight
        const sway = Math.sin((elapsed / 350) + (bn.x + bn.y)) * 3 * (1 - localAppear * 0.6);
        ctx.save();
        ctx.translate(x + sway, y);
        // shadow/edge
        ctx.fillStyle = '#f9f7ea';
        roundRectPath(ctx, -w / 2, -h / 2, w * localAppear, h * localAppear, 4);
        ctx.fill();
        ctx.strokeStyle = '#d6d0a7';
        ctx.lineWidth = 1;
        ctx.stroke();
        // text
        ctx.fillStyle = '#2b2b2b';
        const fontSize = Math.max(10, Math.floor((h * localAppear) * 0.36));
        ctx.font = `${fontSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(bn.denom, 0, 0);
        ctx.restore();
      }

      // continue or finish
      if (t < 1) {
        requestAnimationFrame(draw);
      } else {
        // ensure final draw complete (draw full branches and banknotes fully)
        for (const b of branches) {
          ctx.beginPath();
          ctx.strokeStyle = '#6b4e2e';
          ctx.lineWidth = Math.max(6 - b.depth, 1.2);
          ctx.moveTo(b.x, b.y);
          ctx.lineTo(b.ex, b.ey);
          ctx.stroke();
        }
        for (const bn of banknotes) {
          const x = bn.x;
          const y = bn.y;
          const w = bn.size;
          const h = bn.size * 0.55;
          ctx.save();
          ctx.translate(x, y);
          roundRectPath(ctx, -w / 2, -h / 2, w, h, 4);
          ctx.fillStyle = '#f9f7ea';
          ctx.fill();
          ctx.strokeStyle = '#d6d0a7';
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.fillStyle = '#2b2b2b';
          const fontSize = Math.max(10, Math.floor(h * 0.36));
          ctx.font = `${fontSize}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(bn.denom, 0, 0);
          ctx.restore();
        }
      }
    }

    requestAnimationFrame(draw);
  }

  function roundRectPath(ctx, x, y, w, h, r) {
    const min = Math.min(w / 2, h / 2);
    if (r > min) r = min;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // ========== AUDIO: synthesized gunshot ==========
  let audioCtx = null;
  function ensureAudio() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtx;
  }

  function playGunshot() {
    const ctx = ensureAudio();
    const t = ctx.currentTime;
    // Noise burst (short)
    const noiseLength = 0.3;
    const bufferSize = Math.floor(ctx.sampleRate * noiseLength);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const tt = i / bufferSize;
      const env = Math.pow(1 - tt, 2.0); // quick decay
      data[i] = (Math.random() * 2 - 1) * env * 0.9;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 1500 + Math.random() * 800;
    band.Q.value = 0.8 + Math.random() * 0.8;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.6;
    noise.connect(band);
    band.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    // Impulse/impact oscillator for punch
    const osc = ctx.createOscillator();
    const og = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(700 + Math.random() * 600, t);
    og.gain.setValueAtTime(0.18, t);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    osc.connect(og);
    og.connect(ctx.destination);

    noise.start(t);
    noise.stop(t + 0.18 + Math.random() * 0.06);
    osc.start(t);
    osc.stop(t + 0.12);
  }

  // ========== Bullet hole visuals ==========
  function createBulletHole(clientX, clientY) {
    const size = randInt(36, 68);
    const hole = document.createElement('div');
    hole.style.position = 'fixed';
    hole.style.left = (clientX - size / 2) + 'px';
    hole.style.top = (clientY - size / 2) + 'px';
    hole.style.width = size + 'px';
    hole.style.height = size + 'px';
    hole.style.borderRadius = '50%';
    hole.style.pointerEvents = 'none';
    hole.style.zIndex = 99998;
    hole.style.backgroundImage = `radial-gradient(circle at 40% 35%, rgba(0,0,0,0.95) 0 18%, rgba(30,20,18,0.95) 18% 40%, rgba(80,40,30,0.7) 40% 70%, rgba(120,80,60,0.45) 70% 100%)`;
    hole.style.boxShadow = '0 2px 18px rgba(0,0,0,0.3) inset';
    hole.style.transition = `opacity ${BULLET_HOLE_LIFETIME}ms linear`;
    document.body.appendChild(hole);
    // start fade-out on next tick
    requestAnimationFrame(() => hole.style.opacity = '0');
    setTimeout(() => { try { hole.remove(); } catch (e) {} }, BULLET_HOLE_LIFETIME + 200);
    // short ring
    spawnImpactRing(clientX, clientY);
  }

  function spawnImpactRing(x, y) {
    const ring = document.createElement('div');
    ring.style.position = 'fixed';
    ring.style.left = (x - 6) + 'px';
    ring.style.top = (y - 6) + 'px';
    ring.style.width = '12px';
    ring.style.height = '12px';
    ring.style.borderRadius = '50%';
    ring.style.border = '2px solid rgba(250,240,200,0.9)';
    ring.style.zIndex = 99997;
    ring.style.pointerEvents = 'none';
    ring.style.transform = 'scale(0.6)';
    ring.style.opacity = '0.95';
    ring.style.transition = 'transform 600ms ease-out, opacity 900ms ease-out';
    document.body.appendChild(ring);
    requestAnimationFrame(() => {
      ring.style.transform = 'scale(8)';
      ring.style.opacity = '0';
    });
    setTimeout(() => ring.remove(), 950);
  }

  // ========== Crosshair (pistol-like) ==========
  function ensureCrosshair() {
    let ch = document.getElementById('pistol-crosshair');
    if (ch) return ch;
    ch = document.createElement('div');
    ch.id = 'pistol-crosshair';
    ch.style.position = 'fixed';
    ch.style.left = '50%';
    ch.style.top = '50%';
    ch.style.width = '44px';
    ch.style.height = '44px';
    ch.style.pointerEvents = 'none';
    ch.style.zIndex = 99999;
    ch.style.transform = 'translate(-50%,-50%)';
    ch.innerHTML = `<svg width="44" height="44" viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg">
      <circle cx="22" cy="22" r="16" stroke="rgba(10,10,10,0.45)" stroke-width="3" fill="rgba(255,255,255,0.02)"/>
      <rect x="28" y="20" width="10" height="4" rx="2" fill="#222" />
      <rect x="20" y="10" width="4" height="6" rx="2" fill="#222" />
    </svg>`;
    document.body.appendChild(ch);
    // follow mouse smoothly
    let mx = window.innerWidth / 2, my = window.innerHeight / 2;
    let cx = mx, cy = my;
    window.addEventListener('mousemove', (e) => { mx = e.clientX; my = e.clientY; });
    (function raf() {
      cx += (mx - cx) * 0.22;
      cy += (my - cy) * 0.22;
      ch.style.left = cx + 'px';
      ch.style.top = cy + 'px';
      requestAnimationFrame(raf);
    })();
    return ch;
  }

  // ========== Global pointer handler (gunshot + hole) ==========
  function attachGlobalPointer() {
    const cross = ensureCrosshair();
    // First pointerdown resume audio context (user gesture) and also create shot
    window.addEventListener('pointerdown', (ev) => {
      try { ensureAudio().resume && ensureAudio().resume(); } catch (e) { /* ignore */ }
      // Play sound
      try { playGunshot(); } catch (e) { console.warn('gunshot failed', e); }
      // bullet hole
      createBulletHole(ev.clientX, ev.clientY);
      // crosshair recoil
      cross.style.transition = 'transform 120ms ease-out';
      cross.style.transform = 'translate(-50%,-50%) scale(0.86)';
      setTimeout(() => cross.style.transform = 'translate(-50%,-50%) scale(1)', 160);
    }, { passive: true });
  }

  // ========== Init ==========
  function init() {
    // Setup canvases
    const leftCanvas = setupCanvas(LEFT_CANVAS_ID);
    const rightCanvas = setupCanvas(RIGHT_CANVAS_ID);
    if (!leftCanvas || !rightCanvas) {
      // nothing to do
      console.warn('Tree canvases not found (ids:', LEFT_CANVAS_ID, RIGHT_CANVAS_ID, ')');
      // still attach pointer and crosshair so clicks make holes & sound
      ensureCrosshair();
      attachGlobalPointer();
      return;
    }

    // Generate and animate branches
    const leftBranches = generateBranches(leftCanvas);
    const rightBranches = generateBranches(rightCanvas);
    animateTree(leftCanvas, leftBranches, TREE_GROW_DURATION);
    animateTree(rightCanvas, rightBranches, TREE_GROW_DURATION);

    // global pointer (sound + holes)
    attachGlobalPointer();
  }

  // Start when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
