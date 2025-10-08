// script.js — техно-неон финальный
"use strict";

const JSON_PATH = 'data/casinos.json';
const DONATE_URL = 'https://donatepay.ru/don/435213';

const refs = {
  cards: null,
  categories: null,
  search: null,
  bybitBtn: null,
  bybitModal: null,
  bybitClose: null,
  spinBtn: null,
  wheelCanvas: null,
  mute: null,
  spinCount: null,
  spinResult: null,
  confettiCanvas: null,
  donateHeader: null,
  donateBtn: null
};

let casinos = [];
let wheelState = { rotation: 0, spinning: false, attempts: 0 };

document.addEventListener('DOMContentLoaded', init);

async function init(){
  bindRefs();
  await loadData();
  buildCategories();
  renderCards();
  setupSearch();
  setupAutoFocus();
  setupBybit();
  setupDonate();
  setupWheel();
}

/* ===== bind refs ===== */
function bindRefs(){
  refs.cards = document.getElementById('cards');
  refs.categories = document.getElementById('categories');
  refs.search = document.getElementById('search');
  refs.bybitBtn = document.getElementById('bybit-btn');
  refs.bybitModal = document.getElementById('bybit-modal');
  refs.bybitClose = document.getElementById('bybit-close');
  refs.spinBtn = document.getElementById('spin-btn');
  refs.wheelCanvas = document.getElementById('wheel');
  refs.mute = document.getElementById('mute');
  refs.spinCount = document.getElementById('spin-count');
  refs.spinResult = document.getElementById('spin-result');
  refs.confettiCanvas = document.getElementById('confetti-canvas');
  refs.donateHeader = document.getElementById('donate-header');
  refs.donateBtn = document.getElementById('donate-btn');
}

/* ===== load JSON with anti-cache ===== */
async function loadData(){
  try {
    const res = await fetch(`${JSON_PATH}?v=${Date.now()}`, { cache: 'no-store' });
    if(!res.ok) throw new Error('HTTP ' + res.status);
    casinos = await res.json();
    // safety: ensure array
    if(!Array.isArray(casinos)) casinos = [];
  } catch (e) {
    console.warn('Не удалось загрузить JSON, используем fallback', e);
    // fallback minimal sample if file missing (but user already has data/casinos.json)
    casinos = [
      { id:'k1', name:'Казик 1', image:'', bonus:'Демо бонус 1', promo_code:'KZ1', url:'#', categories:['Топ'] }
    ];
  }
}

/* ===== categories ===== */
function buildCategories(){
  const map = new Set();
  casinos.forEach(c => (c.categories||[]).forEach(cat => map.add(cat)));
  refs.categories.innerHTML = '';
  refs.categories.appendChild(createCategoryBtn('Все', true));
  if(map.has('Топ')) refs.categories.appendChild(createCategoryBtn('Топ'));
  Array.from(map).sort().forEach(cat => {
    if(cat === 'Топ') return;
    refs.categories.appendChild(createCategoryBtn(cat));
  });

  refs.categories.addEventListener('click', e => {
    const btn = e.target.closest('.category-btn');
    if(!btn) return;
    document.querySelectorAll('.category-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    filterByCategory(btn.dataset.cat);
  });
}
function createCategoryBtn(name, active=false){
  const b = document.createElement('button');
  b.className = 'category-btn' + (active ? ' active' : '');
  b.dataset.cat = name;
  b.textContent = name;
  return b;
}

/* ===== render cards ===== */
function renderCards(){
  refs.cards.innerHTML = '';
  casinos.forEach(c => refs.cards.appendChild(makeCard(c)));
}

function makeCard(item){
  const root = document.createElement('article');
  root.className = 'card' + (item.fake ? ' scam' : '');
  root.dataset.id = item.id || '';

  // image (use provided image or placeholder - single common placeholder)
  const img = document.createElement('img');
  img.className = 'card-image';
  img.src = item.image || placeholderSVG(item.name || 'Казик');
  img.alt = item.name || '';

  // body
  const body = document.createElement('div'); body.className = 'card-body';
  const title = document.createElement('h4'); title.textContent = item.name || '';
  const desc = document.createElement('p'); desc.textContent = item.bonus || '';
  const badges = document.createElement('div'); badges.className = 'badges';
  (item.categories||[]).slice(0,3).forEach(cat => {
    const b = document.createElement('span'); b.className = 'badge'; b.textContent = cat; badges.appendChild(b);
  });
  body.appendChild(title); body.appendChild(desc); body.appendChild(badges);

  // promo row
  const promoRow = document.createElement('div'); promoRow.className = 'promo';
  if(item.promo_code){
    const codeBtn = document.createElement('button'); codeBtn.className = 'promo-code'; codeBtn.type='button'; codeBtn.textContent = item.promo_code;
    const tip = document.createElement('span'); tip.className = 'promo-tip'; tip.textContent = '';
    codeBtn.addEventListener('click', async ev=>{
      ev.stopPropagation();
      const ok = await copyToClipboard(item.promo_code);
      if(ok) flashCopied(codeBtn, tip);
    });
    promoRow.appendChild(codeBtn);
    promoRow.appendChild(tip);
  } else {
    promoRow.appendChild(document.createElement('div'));
  }

  // play button full width
  const playWrap = document.createElement('div'); playWrap.className = 'play-wrap';
  const playBtn = document.createElement('a'); playBtn.className = 'btn-game'; playBtn.textContent = 'В игру';

  if(item.fake){
    playBtn.href = '#';
    playBtn.addEventListener('click', (e)=>{ e.preventDefault(); triggerScamFall(root); });
    // clicking card area (except on promo) also triggers fall
    root.addEventListener('click', (e)=>{
      if(e.target.closest('.promo') || e.target.closest('.btn-game')) return;
      triggerScamFall(root);
    });
  } else {
    playBtn.href = item.url || '#';
    playBtn.target = '_blank';
    playBtn.rel = 'noopener noreferrer';
    playBtn.addEventListener('click', async (e)=>{
      if(item.promo_code){
        e.preventDefault();
        await copyToClipboard(item.promo_code);
        const codeBtn = root.querySelector('.promo .promo-code');
        const tip = root.querySelector('.promo .promo-tip');
        if(codeBtn) flashCopied(codeBtn, tip);
        setTimeout(()=> window.open(item.url || '#', '_blank', 'noopener'), 220);
      }
    });
  }
  playWrap.appendChild(playBtn);

  // assemble
  root.appendChild(img);
  root.appendChild(body);
  root.appendChild(promoRow);
  root.appendChild(playWrap);

  return root;
}

/* placeholder single-image (data URI) */
function placeholderSVG(text){
  const t = encodeURIComponent(text || 'Казик');
  return `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='600'><defs><linearGradient id='g' x1='0' x2='1'><stop offset='0' stop-color='%2324495b'/><stop offset='1' stop-color='%2312192a'/></linearGradient></defs><rect width='100%' height='100%' fill='url(%23g)' /><text x='50%' y='50%' font-family='Arial' font-size='60' fill='%23fff' dominant-baseline='middle' text-anchor='middle'>${t}</text></svg>`;
}

/* ===== copy util ===== */
async function copyToClipboard(text){
  try {
    if(navigator.clipboard && navigator.clipboard.writeText){
      await navigator.clipboard.writeText(text);
    } else {
      const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); ta.remove();
    }
    return true;
  } catch(e){
    console.warn('copy failed', e);
    return false;
  }
}
function flashCopied(elem, tip){
  if(!elem) return;
  elem.classList.add('copied');
  if(tip) tip.textContent = '✅ Скопировано!';
  setTimeout(()=>{ elem.classList.remove('copied'); if(tip) tip.textContent = ''; }, 1400);
}

/* ===== SCAM fall ===== */
function triggerScamFall(card){
  if(!card) return;
  card.style.animation = 'fallAway 1.2s ease forwards';
  card.style.pointerEvents = 'none';
  setTimeout(()=>{ try{ card.remove(); }catch(e){} }, 1400);
}

/* ===== Search with layout correction (ru<->en) ===== */
const layoutMap = {
  ru_to_en: {
    'й':'q','ц':'w','у':'e','к':'r','е':'t','н':'y','г':'u','ш':'i','щ':'o','з':'p','х':'[','ъ':']',
    'ф':'a','ы':'s','в':'d','а':'f','п':'g','р':'h','о':'j','л':'k','д':'l','ж':';','э':'\'',
    'я':'z','ч':'x','с':'c','м':'v','и':'b','т':'n','ь':'m','б':',','ю':'.'
  }
};
const en_to_ru = Object.fromEntries(Object.entries(layoutMap.ru_to_en).map(([k,v])=>[v,k]));
function variantsOf(q){
  q = (q||'').trim();
  if(!q) return [''];
  const lower = q.toLowerCase();
  const ruToEn = lower.split('').map(ch => layoutMap.ru_to_en[ch]||ch).join('');
  const enToRu = lower.split('').map(ch => en_to_ru[ch]||ch).join('');
  return [lower, ruToEn, enToRu];
}

function setupSearch(){
  if(!refs.search) return;
  refs.search.addEventListener('input', e => filterByQuery(e.target.value));
  refs.search.addEventListener('keydown', (e)=>{ if(e.key === 'Enter'){ const first = refs.cards.querySelector('.card .btn-game'); if(first) first.focus(); }});
}

function filterByCategory(cat){
  const cards = Array.from(refs.cards.children);
  if(cat === 'Все'){ cards.forEach(c => c.style.display = 'flex'); return; }
  cards.forEach(card => {
    const badges = Array.from(card.querySelectorAll('.badge')).map(b => b.textContent);
    card.style.display = badges.includes(cat) ? 'flex' : 'none';
  });
}

function filterByQuery(q){
  const variants = variantsOf(q);
  const cards = Array.from(refs.cards.children);
  cards.forEach(card => {
    const name = card.querySelector('h4').textContent || '';
    const bonus = card.querySelector('p').textContent || '';
    const promo = (card.querySelector('.promo .promo-code')||{}).textContent || '';
    const hay = (name + ' ' + bonus + ' ' + promo).toLowerCase();
    const match = variants.some(v => v && hay.includes(v.toLowerCase()));
    if(!q){
      card.style.display = 'flex';
      card.querySelector('h4').innerHTML = escapeHtml(name);
      card.querySelector('p').innerHTML = escapeHtml(bonus);
    } else if(match){
      card.style.display = 'flex';
      let found = false;
      for(const v of variants){
        if(!v) continue;
        if(name.toLowerCase().includes(v)){ card.querySelector('h4').innerHTML = highlightMatch(name, v); found=true; break; }
        if(bonus.toLowerCase().includes(v)){ card.querySelector('p').innerHTML = highlightMatch(bonus, v); found=true; break; }
        if(promo.toLowerCase().includes(v)){ const codeElem = card.querySelector('.promo .promo-code'); if(codeElem) codeElem.innerHTML = highlightMatch(codeElem.textContent, v); found=true; break; }
      }
      if(!found){ card.querySelector('h4').innerHTML = escapeHtml(name); card.querySelector('p').innerHTML = escapeHtml(bonus); }
    } else {
      card.style.display = 'none';
    }
  });
}

function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function highlightMatch(text, q){ if(!q) return escapeHtml(text); const idx = text.toLowerCase().indexOf(q.toLowerCase()); if(idx === -1) return escapeHtml(text); return escapeHtml(text.slice(0,idx)) + '<mark>' + escapeHtml(text.slice(idx, idx+q.length)) + '</mark>' + escapeHtml(text.slice(idx+q.length)); }

/* ===== autofocus ===== */
function setupAutoFocus(){ setTimeout(()=>{ try{ refs.search && refs.search.focus(); refs.search && refs.search.select(); } catch(e){} }, 120); }

/* ===== BYBIT modal ===== */
function setupBybit(){
  refs.bybitBtn && refs.bybitBtn.addEventListener('click', ()=> refs.bybitModal && refs.bybitModal.setAttribute('aria-hidden','false'));
  refs.bybitClose && refs.bybitClose.addEventListener('click', ()=> refs.bybitModal && refs.bybitModal.setAttribute('aria-hidden','true'));
  refs.bybitModal && refs.bybitModal.addEventListener('click', e => { if(e.target === refs.bybitModal) refs.bybitModal.setAttribute('aria-hidden','true'); });
}

/* ===== Donate ===== */
function setupDonate(){
  refs.donateHeader && refs.donateHeader.addEventListener('click', ()=>{ pulse(refs.donateHeader); window.open(DONATE_URL, '_blank', 'noopener'); });
  refs.donateBtn && refs.donateBtn.addEventListener('click', ()=>{ pulse(refs.donateBtn); window.open(DONATE_URL, '_blank', 'noopener'); });
}
function pulse(el){ if(!el) return; el.classList.add('pulse'); setTimeout(()=>el.classList.remove('pulse'), 700); }

/* ===== Wheel (pointer aligning to chosen sector) ===== */
function setupWheel(){
  const sectors = [
    "Нихуя","Ничего","0","Ноль","Неа","Йух","No","Error","Жаль","Нет.","Сори","Плак плак", ":'("
  ];
  const canvas = refs.wheelCanvas;
  const confCanvas = refs.confettiCanvas;
  if(!canvas) return;
  const ctx = canvas.getContext('2d');

  const sectorCount = sectors.length;
  const sectorAngle = 360 / sectorCount;
  const anglePer = (Math.PI*2) / sectorCount;

  // draw wheel with festive colors
  function drawWheel(){
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0,0,w,h);
    const colors = ['#8e2de2','#da22ff','#ff7eb3','#ffb86b','#7afcff','#4be1a0'];
    for(let i=0;i<sectorCount;i++){
      const ang = i * anglePer - Math.PI/2; // start from top
      ctx.beginPath();
      ctx.moveTo(w/2, h/2);
      ctx.arc(w/2, h/2, (Math.min(w,h)/2)-8, ang, ang + anglePer);
      ctx.closePath();
      ctx.fillStyle = hexWithAlpha(colors[i % colors.length], 0.95);
      ctx.fill();

      // text
      ctx.save();
      ctx.translate(w/2, h/2);
      ctx.rotate(ang + anglePer/2);
      ctx.fillStyle = '#071018';
      ctx.font = 'bold 16px Inter, Arial';
      ctx.textAlign = 'center';
      ctx.fillText(sectors[i], (Math.min(w,h)/2)*0.60, 6);
      ctx.restore();
    }
    // ring
    ctx.beginPath();
    ctx.arc(w/2,h/2,(Math.min(w,h)/2)-4,0,Math.PI*2);
    ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.stroke();
    // center circle
    ctx.beginPath(); ctx.arc(w/2,h/2,58,0,Math.PI*2); ctx.fillStyle='rgba(0,0,0,0.45)'; ctx.fill();
  }
  drawWheel();

  // WebAudio synth
  const audioCtx = (window.AudioContext || window.webkitAudioContext) ? new (window.AudioContext || window.webkitAudioContext)() : null;
  function playTone(kind){
    if(refs.mute && refs.mute.checked) return;
    if(!audioCtx) return;
    try {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = kind === 'spin' ? 'sawtooth' : 'triangle';
      if(kind === 'spin'){
        o.frequency.setValueAtTime(220, audioCtx.currentTime);
        g.gain.setValueAtTime(0.02, audioCtx.currentTime);
        o.connect(g); g.connect(audioCtx.destination);
        o.start(); setTimeout(()=>o.stop(), 1000);
      } else {
        o.frequency.setValueAtTime(880, audioCtx.currentTime);
        g.gain.setValueAtTime(0.035, audioCtx.currentTime);
        o.connect(g); g.connect(audioCtx.destination);
        o.start(); setTimeout(()=>o.stop(), 260);
      }
    } catch(e){}
  }

  // animate spin so that pointer points to chosen sector
  function spin(){
    if(wheelState.spinning) return;
    wheelState.spinning = true;
    // ensure audio context resumed on user gesture (browser autoplay policy)
    try { audioCtx && audioCtx.resume(); } catch(e){}

    playTone('spin');
    const targetIndex = Math.floor(Math.random() * sectorCount);

    // sector center angle in degrees (0 at 3 o'clock, clockwise)
    const sectorCenter = (targetIndex * sectorAngle) + sectorAngle/2; // degrees
    // we want sector center to end at pointer at top (which is -90deg)
    // desiredRotationDegrees such that (sectorCenter + rotation) % 360 === 270 (which is -90)
    // => rotation ≡ 270 - sectorCenter (mod 360)
    const desiredRotationForIndex = (270 - sectorCenter + 360) % 360;

    // pick rounds and target
    const rounds = 6 + Math.floor(Math.random() * 4); // 6..9
    const targetTotal = rounds * 360 + desiredRotationForIndex;

    const start = performance.now();
    const duration = 4800 + Math.random() * 1500; // ~4.8-6.3s
    const from = wheelState.rotation;
    const to = from + targetTotal;

    function easeOutExpo(t){ return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); }

    function frame(now){
      const t = Math.min(1, (now - start) / duration);
      const eased = easeOutExpo(t);
      wheelState.rotation = from + (to - from) * eased;
      refs.wheelCanvas.style.transform = `rotate(${wheelState.rotation}deg)`;
      if(t < 1){
        requestAnimationFrame(frame);
      } else {
        wheelState.spinning = false;
        wheelState.attempts++;
        refs.spinCount && (refs.spinCount.textContent = `Попыток: ${wheelState.attempts}`);
        // compute final index by reverse calculation
        const normalized = ((270 - (wheelState.rotation % 360) ) + 360) % 360; // degrees in [0,360)
        const idx = Math.floor(normalized / sectorAngle) % sectorCount;
        // show simple congratulation (no prize text per request)
        refs.spinResult && (refs.spinResult.textContent = 'Поздравляю!');
        playTone('stop');
        // confetti inside wheel area
        try {
          const conf = confetti.create(confCanvas || window.confetti, { resize: true, useWorker: true });
          if(refs.confettiCanvas) conf = confetti.create(refs.confettiCanvas, { resize: true, useWorker: true });
          (conf || confetti)({ particleCount: 110, spread: 90, ticks: 160, origin: { x: 0.5, y: 0.25 } });
        } catch(e){
          try { confetti({ particleCount: 60, spread: 60 }); } catch(e){}
        }
        // clear text shortly after
        setTimeout(()=>{ refs.spinResult && (refs.spinResult.textContent = ''); }, 2400);
      }
    }
    requestAnimationFrame(frame);
  }

  // local confCanvas var for try/fallback
  const confCanvas = refs.confettiCanvas || null;

  // events
  refs.spinBtn && refs.spinBtn.addEventListener('click', spin);
  canvas && canvas.addEventListener('click', spin);
}

/* small helper: hex color to rgba string with alpha */
function hexWithAlpha(hex, a){
  // expect #rrggbb
  const c = hex.replace('#','');
  if(c.length !== 6) return hex;
  const r = parseInt(c.substring(0,2),16);
  const g = parseInt(c.substring(2,4),16);
  const b = parseInt(c.substring(4,6),16);
  return `rgba(${r},${g},${b},${a})`;
}

/* ===== end of file ===== */

