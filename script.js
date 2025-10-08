// script.js
// Декоративные деревья, купюры, выстрелы (WebAudio), дыры от пуль и прицел за курсором.
// Зависимости: нет. HTML ожидает контейнер .container (max-width:1200px) в центре.
// Этот скрипт создаёт и использует два canvas слева и справа (#leftTree, #rightTree),
// а также использует уже присутствующие элементы слот/карточек/и т.д.

// ------------------------- Настройки -------------------------
const TREE_GROW_DURATION = 10000; // ms (10s)
const LEFT_CANVAS_ID = 'leftTree';
const RIGHT_CANVAS_ID = 'rightTree';
const CONTAINER_MAX_WIDTH = 1200; // px (используется для расчёта внешних областей)
const BULLET_HOLE_LIFETIME = 20000; // ms (20s)
const MAX_BANKNOTES_PER_TREE = 40; // сколько купюр максимум на одной стороне
const BANKNOTE_DENOMINATIONS = ['5$', '10€', '50₽', '20$', '100€', '500₽', '1K$', '200€']; // примеры

// ------------------------- Утилиты -------------------------
function qs(id){ return document.getElementById(id); }
function now(){ return performance.now(); }
function rand(min, max){ return min + Math.random()*(max-min); }
function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }

// easeOutQuad
function easeOutQuad(t){ return 1 - (1 - t)*(1 - t); }

// ------------------------- Tree drawing core -------------------------
function setupTreeCanvas(canvasId, side='left') {
  const canvas = qs(canvasId);
  if(!canvas) return null;
  function resize(){ 
    const dpr = window.devicePixelRatio || 1;
    // set canvas CSS width to fill side area: full height, width = (viewportWidth - containerMaxWidth)/2
    const vw = Math.max(document.documentElement.clientWidth || window.innerWidth, window.innerWidth);
    const sideWidth = Math.max(240, Math.floor((vw - CONTAINER_MAX_WIDTH) / 2)); // at least 240px
    canvas.style.width = sideWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    canvas.width = Math.floor(sideWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas._dpr = dpr;
  }
  resize();
  window.addEventListener('resize', resize);
  return canvas;
}

// generate many branch segments across canvas to fill area
function generateBranchesForCanvas(canvas, opts={}) {
  const ctxW = canvas.clientWidth;
  const ctxH = canvas.clientHeight;
  const branches = [];
  // We'll create many primary trunks across the width (density)
  const trunkCount = Math.max(4, Math.floor(ctxW / 80));
  for(let t=0;t<trunkCount;t++){
    // base X roughly across the width
    const margin = 20;
    const baseX = margin + t * ( (ctxW - margin*2) / Math.max(1, trunkCount-1) );
    const baseY = ctxH - 10;
    const primaryLen = rand(ctxH*0.08, ctxH*0.18);
    // recursively create branching structure
    function grow(x,y,len,angle,depth, maxDepth){
      if(depth > maxDepth) return;
      const ex = x + len * Math.cos(angle);
      const ey = y - len * Math.sin(angle);
      branches.push({x,y,ex,ey,depth});
      // create 1-3 sub-branches
      const subCount = depth === 0 ? randInt(2,3) : (Math.random()<0.6?2:1);
      for(let s=0;s<subCount;s++){
        const nextLen = len * rand(0.6, 0.85);
        const spread = rand(0.25, 0.75) * (Math.PI/4);
        const newAngle = angle + (s===0 ? spread : -spread) + rand(-0.25,0.25);
        grow(ex,ey,nextLen,newAngle,depth+1,maxDepth);
      }
      // small chance to add a further long thin branch
      if(depth < maxDepth && Math.random() < 0.25){
        grow(ex,ey,len*0.9, angle + rand(-0.3,0.3), depth+1, maxDepth);
      }
    }
    grow(baseX, baseY, primaryLen, Math.PI/2, 0, randInt(3,6));
  }
  // Return branches in order (trunks first)
  return branches;
}

function randInt(a,b){ return Math.floor(rand(a,b+1)); }

// draw progressive tree with banknotes
function animateTreeGrowth(canvas, branches, duration = TREE_GROW_DURATION, side='left'){
  const ctx = canvas.getContext('2d');
  const dpr = canvas._dpr || 1;
  ctx.scale(dpr, dpr);
  ctx.lineCap = 'round';
  const total = branches.length;
  const start = now();
  // prepare positions at branch tips for potential banknotes
  const tips = branches.filter(b => { 
    // tip heuristics: deeper depth likely leaf
    return b; 
  }).map(b => ({x:b.ex, y:b.ey, depth:b.depth}));
  // choose some tips for banknotes
  const banknoteCount = Math.min(MAX_BANKNOTES_PER_TREE, Math.floor(tips.length * 0.12) + randInt(2,8));
  const chosenTips = shuffle(tips).slice(0, banknoteCount);

  // banknote objects with currency label
  const banknotes = chosenTips.map((t, i) => ({
    x: t.x + rand(-6,6),
    y: t.y + rand(-6,6),
    denom: BANKNOTE_DENOMINATIONS[randInt(0, BANKNOTE_DENOMINATIONS.length-1)],
    wobble: rand(0,Math.PI*2),
    size: rand(26,40),
    placedAt: t
  }));

  function drawFrame() {
    const elapsed = now() - start;
    const t = clamp(elapsed / duration, 0, 1);
    const prog = easeOutQuad(t); // easeOut
    // clear (work in CSS px units)
    ctx.clearRect(0,0,canvas.clientWidth, canvas.clientHeight);

    // draw trunks -> thinner as depth increases
    for(let i=0;i<branches.length;i++){
      const b = branches[i];
      // reveal fractionally based on index and prog so earlier branches draw first
      const revealThresh = (i / total) / 0.95; // spread
      if(prog < revealThresh) continue;
      // determine stroke progress for this branch (simple)
      ctx.strokeStyle = '#5b3f2a';
      ctx.lineWidth = Math.max(6 - b.depth, 1.2);
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      // to simulate growth along branch, draw partial according to how far into overall prog we are
      // compute local progress for branch: ratio between revealThresh and current prog
      const localProg = clamp((prog - revealThresh) / (1 - revealThresh), 0, 1);
      const ex = b.x + (b.ex - b.x) * localProg;
      const ey = b.y + (b.ey - b.y) * localProg;
      ctx.lineTo(ex, ey);
      ctx.stroke();
    }

    // draw leaves/notes: banknotes become visible later (near end)
    for(const bn of banknotes){
      // banknote appear threshold near end
      const appear = clamp((prog - 0.6) / 0.4, 0, 1); // appear when prog>0.6
      if(appear <= 0) continue;
      const x = bn.x;
      const y = bn.y;
      const w = bn.size;
      const h = bn.size * 0.55;
      const sway = Math.sin(bn.wobble + prog * Math.PI * 2) * 4 * (1 - prog*0.6);
      ctx.save();
      ctx.translate(x + sway, y - (1 - appear) * 12);
      ctx.fillStyle = '#f6f3de';
      ctx.strokeStyle = '#c9c29a';
      ctx.lineWidth = 1;
      // rounded rect
      roundRect(ctx, -w/2, -h/2, w, h, 4);
      ctx.fill();
      ctx.stroke();
      // denom text
      ctx.fillStyle = '#2b2b2b';
      ctx.font = `${Math.max(10, Math.floor(h*0.36))}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(bn.denom, 0, 0);
      ctx.restore();
    }

    if(prog < 1) {
      requestAnimationFrame(drawFrame);
    } else {
      // final draw to ensure branches completely visible
      // (we've been drawing partials per branch, so to finish, draw full branches)
      for(const b of branches) {
        ctx.strokeStyle = '#5b3f2a';
        ctx.lineWidth = Math.max(6 - b.depth, 1.2);
        ctx.beginPath();
        ctx.moveTo(b.x,b.y);
        ctx.lineTo(b.ex,b.ey);
        ctx.stroke();
      }
      // redraw banknotes fully
      for(const bn of banknotes){
        const x = bn.x;
        const y = bn.y;
        const w = bn.size;
        const h = bn.size * 0.55;
        ctx.save();
        ctx.translate(x, y);
        roundRect(ctx, -w/2, -h/2, w, h, 4);
        ctx.fillStyle = '#f6f3de';
        ctx.fill();
        ctx.strokeStyle = '#c9c29a';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = '#2b2b2b';
        ctx.font = `${Math.max(10, Math.floor(h*0.36))}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(bn.denom, 0, 0);
        ctx.restore();
      }
    }
  }

  requestAnimationFrame(drawFrame);
}

// rounded rect helper
function roundRect(ctx, x, y, w, h, r) {
  const min = Math.min(w/2,h/2);
  if(r > min) r = min;
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

// shuffle util
function shuffle(arr){ for(let i=arr.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]] } return arr; }

// ------------------------- Initialize both side trees -------------------------
function initTrees(){
  const left = setupTreeCanvas(LEFT_CANVAS_ID, 'left');
  const right = setupTreeCanvas(RIGHT_CANVAS_ID, 'right');
  if(!left || !right) return;
  // generate branches to fill canvas
  const leftBranches = generateBranchesForCanvas(left, {});
  const rightBranches = generateBranchesForCanvas(right, {});
  // animate growth
  animateTreeGrowth(left, leftBranches, TREE_GROW_DURATION, 'left');
  animateTreeGrowth(right, rightBranches, TREE_GROW_DURATION, 'right');
}

// ------------------------- Bullet hole + shot sound -------------------------
// We'll synthesize a gunshot-like sound using WebAudio (noise burst + short pitch)
// This avoids external files and works cross-browser (modern browsers)

let audioCtx = null;
function ensureAudioCtx(){
  if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playGunshot(){
  const ctx = ensureAudioCtx();
  const nowt = ctx.currentTime;

  // Noise burst
  const bufferSize = 1 * ctx.sampleRate; // 1 sec buffer
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  // fill with noise and envelope
  for(let i=0;i<bufferSize;i++){
    // white noise with exponential decay
    const t = i / bufferSize;
    const env = Math.exp(-8 * t); // fast decay
    data[i] = (Math.random()*2 - 1) * env;
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'bandpass';
  noiseFilter.frequency.value = 1500;
  noise.connect(noiseFilter);
  noiseFilter.connect(ctx.destination);

  // quick click/impact oscillator
  const osc = ctx.createOscillator();
  const oscGain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(900, nowt);
  oscGain.gain.setValueAtTime(0.18, nowt);
  oscGain.gain.exponentialRampToValueAtTime(0.0001, nowt + 0.12);

  osc.connect(oscGain);
  oscGain.connect(ctx.destination);

  // start/stop
  noise.start(nowt);
  noise.stop(nowt + 0.18);
  osc.start(nowt);
  osc.stop(nowt + 0.14);
}

// Bullet hole creation
function createBulletHole(x, y){
  const hole = document.createElement('div');
  hole.className = 'bullet-hole';
  // style: fixed positioned circle with inner dark center and burnt edges (SVG background)
  const size = randInt(36, 72);
  hole.style.position = 'fixed';
  hole.style.left = (x - size/2) + 'px';
  hole.style.top = (y - size/2) + 'px';
  hole.style.width = size + 'px';
  hole.style.height = size + 'px';
  hole.style.borderRadius = '50%';
  hole.style.pointerEvents = 'none';
  hole.style.zIndex = 9998;
  // create an SVG dataURL for a stylized bullet hole with transparent center and dark rim
  const svg = `
  <svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'>
    <defs>
      <radialGradient id='g' cx='50%' cy='50%' r='50%'>
        <stop offset='0%' stop-color='rgba(0,0,0,0.9)' />
        <stop offset='40%' stop-color='rgba(20,10,10,0.95)' />
        <stop offset='70%' stop-color='rgba(60,30,20,0.85)' />
        <stop offset='100%' stop-color='rgba(120,80,60,0.6)' />
      </radialGradient>
    </defs>
    <rect x='0' y='0' width='100%' height='100%' fill='rgba(0,0,0,0)'/>
    <circle cx='50%' cy='50%' r='38%' fill='url(#g)' />
    <circle cx='50%' cy='50%' r='18%' fill='rgba(0,0,0,0.95)' />
  </svg>`;
  const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  hole.style.backgroundImage = `url("${url}")`;
  hole.style.backgroundSize = 'cover';
  hole.style.opacity = '1';
  hole.style.transition = `opacity ${BULLET_HOLE_LIFETIME}ms linear`;
  document.body.appendChild(hole);
  // start fade
  requestAnimationFrame(()=> {
    hole.style.opacity = '0';
  });
  // remove after lifetime + small margin
  setTimeout(()=> { try{ hole.remove(); }catch(e){} }, BULLET_HOLE_LIFETIME + 600);
  // small ripple effect (optional)
  spawnImpactRing(x, y);
}

// small impact ring
function spawnImpactRing(x,y){
  const ring = document.createElement('div');
  ring.style.position = 'fixed';
  ring.style.left = (x - 6) + 'px';
  ring.style.top = (y - 6) + 'px';
  ring.style.width = '12px';
  ring.style.height = '12px';
  ring.style.borderRadius = '50%';
  ring.style.border = '2px solid rgba(255,240,200,0.9)';
  ring.style.zIndex = 9997;
  ring.style.pointerEvents = 'none';
  ring.style.transform = 'scale(0.6)';
  ring.style.opacity = '0.9';
  ring.style.transition = 'transform 600ms ease-out, opacity 900ms ease-out';
  document.body.appendChild(ring);
  requestAnimationFrame(()=> {
    ring.style.transform = 'scale(8)';
    ring.style.opacity = '0';
  });
  setTimeout(()=> ring.remove(), 950);
}

// ------------------------- Crosshair (pistol-like) -------------------------
function createCrosshair(){
  const el = document.createElement('div');
  el.id = 'pistol-crosshair';
  el.style.position = 'fixed';
  el.style.left = '0px';
  el.style.top = '0px';
  el.style.width = '44px';
  el.style.height = '44px';
  el.style.borderRadius = '50%';
  el.style.pointerEvents = 'none';
  el.style.zIndex = 99999;
  el.style.transform = 'translate(-50%,-50%)';
  el.style.display = 'flex';
  el.style.alignItems = 'center';
  el.style.justifyContent = 'center';
  // inner crosshair visuals
  el.innerHTML = `
    <svg width="44" height="44" viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg">
      <circle cx="22" cy="22" r="16" stroke="rgba(10,10,10,0.45)" stroke-width="3" fill="rgba(255,255,255,0.02)"/>
      <rect x="28" y="20" width="10" height="4" rx="2" fill="#222" />
      <rect x="20" y="10" width="4" height="6" rx="2" fill="#222" />
    </svg>
  `;
  document.body.appendChild(el);
  return el;
}

// smooth follow
function attachCrosshairBehavior(crossEl){
  let mx = window.innerWidth/2, my = window.innerHeight/2;
  let cx = mx, cy = my;
  function onMove(e){
    mx = e.clientX; my = e.clientY;
    crossEl.style.display = '';
  }
  window.addEventListener('mousemove', onMove);
  // animate: lerp
  function raf(){
    cx += (mx - cx) * 0.22;
    cy += (my - cy) * 0.22;
    crossEl.style.left = cx + 'px';
    crossEl.style.top = cy + 'px';
    requestAnimationFrame(raf);
  }
  raf();
  return {onMove};
}

// ------------------------- Global click handler -------------------------
function attachGlobalClickShot(){
  window.addEventListener('click', (e)=>{
    // play gunshot sound
    try{ playGunshot(); } catch(e){ console.warn('audio fail', e); }
    // create bullet hole at click
    createBulletHole(e.clientX, e.clientY);
    // animate crosshair "recoil" (scale)
    const ch = qs('pistol-crosshair');
    if(ch){
      ch.style.transition = 'transform 120ms ease-out';
      ch.style.transform = 'translate(-50%,-50%) scale(0.86)';
      setTimeout(()=> ch.style.transform = 'translate(-50%,-50%) scale(1)', 160);
    }
  }, {capture:false});
}

// ------------------------- Init everything -------------------------
function initAll(){
  // trees
  initTrees();
  // crosshair
  const cross = createCrosshair();
  attachCrosshairBehavior(cross);
  // global shots
  attachGlobalClickShot();
  // ensure confetti canvas in slot area keeps correct sizing if present
  window.addEventListener('resize', ()=> {
    // no-op here; other code may handle
  });
}

// start on DOMContentLoaded
if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', initAll);
} else {
  initAll();
}
