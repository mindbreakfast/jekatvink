// /script.js — исправленная финальная версия
// - загружает /data/goodWords.json и /data/failWords.json (anti-cache)
// - показывает "приманку" из goodWords, затем плавно замедляет и показывает финал из объединённого списка
// - финальное слово всегда оказывается в центре (визуально)
// - длительность анимации ~7s (около +2s от короткого варианта)
// - WebAudio для явных звуков (spin + click), confetti в блоке
// - обработка промокод-кнопок и фейковой карточки (падение)

// --- Настройки
const GOOD_JSON = '/data/goodWords.json';
const FAIL_JSON = '/data/failWords.json';

// DOM refs
let reelEl, spinBtn, spinResultEl, confettiCanvas, cardsContainer;

document.addEventListener('DOMContentLoaded', () => {
  reelEl = document.getElementById('reel');
  spinBtn = document.getElementById('spinButton');
  spinResultEl = document.getElementById('spinResult');
  confettiCanvas = document.getElementById('confetti');
  cardsContainer = document.getElementById('cards');

  // attach spin handler
  spinBtn && spinBtn.addEventListener('click', onSpinClick);

  // delegate promo copy and fake-card fall (if cards are rendered)
  document.addEventListener('click', (e) => {
    const promo = e.target.closest('.promo-btn');
    if (promo) {
      const code = promo.dataset.code || promo.textContent.trim();
      if (code) {
        navigator.clipboard.writeText(code).catch(()=>{}); // best-effort
        promo.classList.add('copied');
        const prev = promo.textContent;
        promo.textContent = 'Скопировано';
        setTimeout(()=>{ promo.textContent = prev; promo.classList.remove('copied'); }, 1200);
      }
      return;
    }

    const playBtn = e.target.closest('.play-btn');
    if (playBtn && playBtn.dataset.fake === 'true') {
      const card = playBtn.closest('.casino-card');
      if (card) {
        card.classList.add('fall');
        setTimeout(()=> card.remove(), 1400);
      }
    }
  });

  // optional: render cards from /data/casinos.json if you want
  loadAndRenderCards();

  // adjust confetti canvas size on resize
  window.addEventListener('resize', () => {
    if (confettiCanvas) {
      confettiCanvas.width = confettiCanvas.offsetWidth;
      confettiCanvas.height = confettiCanvas.offsetHeight;
    }
  });
});

// --- load words with anti-cache
async function loadJson(path) {
  try {
    const r = await fetch(`${path}?v=${Date.now()}`, {cache: 'no-store'});
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
  } catch (e) {
    console.warn('JSON load failed', path, e);
    return [];
  }
}

// --- WebAudio helpers
let audioCtx = null;
let spinOsc = null;
let spinGain = null;
function ensureAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}
function startSpinSound() {
  try {
    ensureAudio();
    audioCtx.resume && audioCtx.resume();
    if (spinOsc) try { spinOsc.stop(); } catch(e) {}
    spinOsc = audioCtx.createOscillator();
    spinGain = audioCtx.createGain();
    spinOsc.type = 'sawtooth';
    spinOsc.frequency.setValueAtTime(180, audioCtx.currentTime);
    spinGain.gain.setValueAtTime(0.02, audioCtx.currentTime);
    spinOsc.connect(spinGain); spinGain.connect(audioCtx.destination);
    spinOsc.start();
    // gentle vibrato/frequency modulation for richness
    const lfo = audioCtx.createOscillator();
    const lfoGain = audioCtx.createGain();
    lfo.type = 'sine'; lfo.frequency.value = 3; lfoGain.gain.value = 8;
    lfo.connect(lfoGain);
    lfoGain.connect(spinOsc.frequency);
    lfo.start();
    spinOsc._lfo = lfo; spinOsc._lfoGain = lfoGain;
  } catch (e) { console.warn('startSpinSound failed', e); }
}
function stopSpinSound() {
  try {
    if (!audioCtx) return;
    if (spinGain) spinGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
    if (spinOsc) {
      setTimeout(()=> {
        try {
          if (spinOsc._lfo) { spinOsc._lfo.stop(); spinOsc._lfo.disconnect(); }
          spinOsc.stop(); spinOsc.disconnect();
        } catch(e){}
        spinOsc = null; spinGain = null;
      }, 150);
    }
    // small click/pop
    playClick();
  } catch(e){ console.warn('stopSpinSound', e); }
}
function playClick() {
  try {
    ensureAudio();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'square';
    o.frequency.setValueAtTime(880, audioCtx.currentTime);
    g.gain.setValueAtTime(0.06, audioCtx.currentTime);
    o.connect(g); g.connect(audioCtx.destination);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
    setTimeout(()=> { try{ o.stop(); } catch(e){} }, 140);
  } catch(e){ console.warn('playClick', e); }
}

// --- helper easing
function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

// --- global scheduling cleanup
let scheduledIds = [];
function clearScheduled() { scheduledIds.forEach(id => clearTimeout(id)); scheduledIds = []; }

// --- spin logic
let isSpinning = false;

async function onSpinClick() {
  if (isSpinning) return;
  isSpinning = true;
  spinBtn.disabled = true;
  spinResultEl.textContent = '';
  clearScheduled();

  // load lists
  const good = await loadJson(GOOD_JSON);
  const fail = await loadJson(FAIL_JSON);
  const goodList = Array.isArray(good) && good.length ? good : ['—'];
  const failList = Array.isArray(fail) && fail.length ? fail : ['ничего'];

  // start sound
  startSpinSound();

  // prepare sequence (we'll show "good" words during the spin)
  const steps = 110;                  // number of visible "frames"
  const totalDuration = 7000;         // ms (≈7s) — увеличенная длительность
  const startTime = performance.now();

  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const when = Math.round(easeOutCubic(t) * totalDuration);
    const word = goodList[Math.floor(Math.random() * goodList.length)];
    const id = setTimeout(() => {
      showReelWord(word);
    }, when);
    scheduledIds.push(id);
  }

  // schedule final (in center) slightly after totalDuration
  const finalWhen = totalDuration + 80;
  const finalId = setTimeout(() => {
    // stop spin sound, play stop
    stopSpinSound();

    // choose final from combined (honest random)
    const combined = goodList.concat(failList);
    const finalWord = combined[Math.floor(Math.random() * combined.length)];

    showFinal(finalWord);

    // confetti
    try {
      if (typeof confetti !== 'undefined' && confetti) {
        const conf = confetti.create(confettiCanvas, { resize: true, useWorker: true });
        conf({ particleCount: 110, spread: 90, ticks: 160, origin: { x: 0.5, y: 0.28 } });
      }
    } catch (e) { console.warn('confetti failed', e); }

    // end
    spinBtn.disabled = false;
    isSpinning = false;
  }, finalWhen);
  scheduledIds.push(finalId);
}

// show a word in the reel (temporary)
function showReelWord(word) {
  if (!reelEl) return;
  // sanitize minimal
  const safe = String(word || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  reelEl.innerHTML = `<div class="reel-item">${safe}</div>`;
}

// show final centered word
function showFinal(word) {
  if (!reelEl) return;
  const safe = String(word || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  reelEl.innerHTML = `<div class="reel-item final" style="font-size:28px;color:#ff2ee8;text-shadow:0 0 16px #ff2ee8">${safe}</div>`;
  spinResultEl.textContent = 'Поздравляю!';
  spinResultEl.classList.add('win');
  setTimeout(()=> spinResultEl.classList.remove('win'), 1600);
}

// --- optional: load and render cards from /data/casinos.json (keeps previous behavior)
async function loadAndRenderCards(){
  try {
    const r = await fetch(`/data/casinos.json?v=${Date.now()}`, { cache: 'no-store' });
    if (!r.ok) return;
    const list = await r.json();
    if (!Array.isArray(list)) return;
    renderCards(list);
  } catch(e){ console.warn('loadAndRenderCards error', e); }
}
function renderCards(list) {
  if (!cardsContainer) return;
  cardsContainer.innerHTML = '';
  list.forEach(item => {
    const card = document.createElement('article');
    card.className = 'casino-card';
    if (item.fake) card.classList.add('fake');
    const img = item.image || '';
    card.innerHTML = `
      <div class="card-img"><img src="${img}" alt="${item.name || ''}"></div>
      <div class="card-body">
        <h3 class="card-title">${item.name || ''}</h3>
        <p class="card-desc">${item.bonus || ''}</p>
        <div class="promo-wrap">
          <button class="promo-btn" data-code="${item.promo_code || ''}">${item.promo_code || '—'}</button>
        </div>
        <button class="play-btn" ${item.fake ? 'data-fake="true"' : `data-url="${item.url || '#'}"`}>В игру</button>
      </div>
    `;
    cardsContainer.appendChild(card);
  });
}
