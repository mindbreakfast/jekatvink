/* script.js — финальная версия
 - анти-кеш: fetch('data/casinos.json?v=...')
 - крупные карточки (3 в ряд), адаптивность
 - промокоды: копирование + автокопирование перед переходом
 - SCAM: без ссылки, по клику карточка падает
 - колесо: праздничное, долгая плавная остановка (+ ~2s), pointer корректно указывает результат
 - конфетти запускается внутри блока колеса (confetti.create)
 - BYBIT modal, donate, автофокус, категории, поиск с раскладкой
*/

"use strict";

/* ====== Refs ====== */
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

const JSON_PATH = 'data/casinos.json';
const DONATE_URL = 'https://donatepay.ru/don/435213';
let casinos = [];

document.addEventListener('DOMContentLoaded', init);

function init(){
  bindRefs();
  loadData().then(()=> {
    buildCategories();
    renderCards();
    setupSearch();
    setupAutoFocus();
    setupBybit();
    setupDonate();
    setupWheel();
  });
}

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

/* ====== Load JSON (anti-cache) ====== */
async function loadData(){
  try {
    const res = await fetch(`data/casinos.json?v=${Date.now()}`, {cache:'no-store'});
    if(!res.ok) throw new Error('HTTP ' + res.status);
    casinos = await res.json();
  } catch(e){
    console.warn('Ошибка загрузки JSON или пустой ответ — используем встроенный набор', e);
    // fallback uses the file contents we already provided in data; but leave casinos as empty to avoid duplicates
    // if empty, you can still edit data/casinos.json externally
    if(!Array.isArray(casinos) || casinos.length === 0){
      // minimal fallback (shouldn't be necessary if file exists)
      casinos = [
        { id: 'demo1', name: 'Демо 1', image: '', bonus: 'Бонус демо', promo_code: 'DEMO1', url: '#', categories: ['Топ'] }
      ];
    }
  }
}

/* ====== Categories ====== */
function buildCategories(){
  const map = new Map();
  casinos.forEach(c => (c.categories||[]).forEach(cat => {
    if(!map.has(cat)) map.set(cat, 0);
    map.set(cat, map.get(cat)+1);
  }));

  refs.categories.innerHTML = '';
  refs.categories.appendChild(categoryBtn('Все', true));
  if(map.has('Топ')) refs.categories.appendChild(categoryBtn('Топ'));
  Array.from(map.keys()).sort().forEach(k => { if(k !== 'Топ') refs.categories.appendChild(categoryBtn(k)); });

  refs.categories.addEventListener('click', (e)=>{
    const btn = e.target.closest('.category-btn');
    if(!btn) return;
    document.querySelectorAll('.category-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    filterByCategory(btn.dataset.cat);
  });
}
function categoryBtn(name, active=false){
  const b = document.createElement('button');
  b.className = 'category-btn' + (active ? ' active' : '');
  b.dataset.cat = name;
  b.textContent = name;
  return b;
}

/* ====== Render Cards ====== */
function renderCards(){
  refs.cards.innerHTML = '';
  casinos.forEach(item => refs.cards.appendChild(renderCard(item)));
}

function renderCard(item){
  const root = document.createElement('article');
  root.className = 'card' + (item.fake ? ' scam' : '');
  root.dataset.id = item.id || '';

  // image
  const img = document.createElement('img');
  img.className = 'card-image';
  img.src = item.image || placeholderSVG(item.name);
  img.alt = item.name || '';

  // body
  const body = document.createElement('div'); body.className = 'card-body';
  const title = document.createElement('h4'); title.textContent = item.name;
  const desc = document.createElement('p'); desc.textContent = item.bonus || '';
  const badges = document.createElement('div'); badges.className = 'badges';
  (item.categories||[]).slice(0,3).forEach(cat => { const s = document.createElement('span'); s.className='badge'; s.textContent = cat; badges.appendChild(s); });

  body.appendChild(title); body.appendChild(desc); body.appendChild(badges);

  // promo
  const promoBox = document.createElement('div'); promoBox.className = 'promo';
  if(item.promo_code){
    const codeBtn = document.createElement('button'); codeBtn.className='promo-code'; codeBtn.type='button'; codeBtn.textContent = item.promo_code;
    const tip = document.createElement('span'); tip.className='promo-tip'; tip.textContent = '';
    codeBtn.addEventListener('click', async (ev) => {
      ev.stopPropagation();
      const ok = await copyToClipboard(item.promo_code);
      if(ok) flashCopied(codeBtn, tip);
    });
    promoBox.appendChild(codeBtn); promoBox.appendChild(tip);
  } else {
    const spacer = document.createElement('div'); spacer.style.height='0'; promoBox.appendChild(spacer);
  }

  // play button (full width)
  const playWrap = document.createElement('div'); playWrap.className='play-wrap';
  const playBtn = document.createElement('a'); playBtn.className='btn-game'; playBtn.textContent = 'В игру';
  if(item.fake){
    playBtn.href = '#';
    playBtn.addEventListener('click', (e) => { e.preventDefault(); triggerScamFall(root); });
    // clicking anywhere (except promo) also triggers fall
    root.addEventListener('click', (e)=>{
      if(e.target.closest('.promo') || e.target.closest('.btn-game')) return;
      triggerScamFall(root);
    });
  } else {
    playBtn.href = item.url || '#';
    playBtn.target = '_blank';
    playBtn.rel = 'noopener noreferrer';
    playBtn.addEventListener('click', async (e) => {
      if(item.promo_code){
        e.preventDefault();
        await copyToClipboard(item.promo_code);
        const codeBtn = root.querySelector('.promo .promo-code');
        const tip = root.querySelector('.promo .promo-tip');
        if(codeBtn) flashCopied(codeBtn, tip);
        setTimeout(()=> window.open(item.url || '#', '_blank', 'noopener'), 220);
      }
      // else normal behavior
    });
  }
  playWrap.appendChild(playBtn);

  // assemble
  root.appendChild(img);
  root.appendChild(body);
  root.appendChild(promoBox);
  root.appendChild(playWrap);

  return root;
}

/* Placeholder SVG if image missing */
function placeholderSVG(name){
  const txt = encodeURIComponent(name || '');
  return `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='400'><rect width='100%' height='100%' fill='%230b1626'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='48' fill='%23fff'>${txt}</text></svg>`;
}

/* ====== Copy utils ====== */
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

/* ====== SCAM fall ====== */
function triggerScamFall(card){
  if(!card) return;
  card.style.animation = 'fallAway 1.2s ease forwards';
  card.style.pointerEvents = 'none';
  setTimeout(()=>{ try{ card.remove(); } catch(e){} }, 1400);
}

/* ====== Search (with layout correction ru<->en) ====== */
const layoutMap = {
  ru_to_en: {
    'й':'q','ц':'w','у':'e','к':'r','е':'t','н':'y','г':'u','ш':'i','щ':'o','з':'p','х':'[','ъ':']',
    'ф':'a','ы':'s','в':'d','а':'f','п':'g','р':'h','о':'j','л':'k','д':'l','ж':';','э':'\'',
    'я':'z','ч':'x','с':'c','м':'v','и':'b','т':'n','ь':'m','б':',','ю':'.'
  }
};
const en_to_ru = Object.fromEntries(Object.entries(layoutMap.ru_to_en).map(([k,v]) => [v,k]));

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
  refs.search.addEventListener('input', (e)=> filterByQuery(e.target.value));
  refs.search.addEventListener('keydown', (e)=>{ if(e.key === 'Enter'){ const first = refs.cards.querySelector('.card .btn-game'); if(first) first.focus(); }});
}

function filterByCategory(cat){
  const cards = Array.from(refs.cards.children);
  if(cat === 'Все'){ cards.forEach(c=>c.style.display='flex'); return; }
  cards.forEach(card => {
    const badges = Array.from(card.querySelectorAll('.badge')).map(b => b.textContent);
    if(badges.includes(cat)) card.style.display = 'flex'; else card.style.display = 'none';
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
      let done = false;
      for(const v of variants){
        if(!v) continue;
        if(name.toLowerCase().includes(v)){ card.querySelector('h4').innerHTML = highlightMatch(name, v); done=true; break; }
        else if(bonus.toLowerCase().includes(v)){ card.querySelector('p').innerHTML = highlightMatch(bonus, v); done=true; break; }
        else if(promo.toLowerCase().includes(v)){ const codeElem = card.querySelector('.promo .promo-code'); if(codeElem) codeElem.innerHTML = highlightMatch(codeElem.textContent, v); done=true; break; }
      }
      if(!done){ card.querySelector('h4').innerHTML = escapeHtml(name); card.querySelector('p').innerHTML = escapeHtml(bonus); }
    } else {
      card.style.display = 'none';
    }
  });
}

function escapeHtml(s){ return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function highlightMatch(text, q){ if(!q) return escapeHtml(text); const idx = text.toLowerCase().indexOf(q.toLowerCase()); if(idx===-1) return escapeHtml(text); return escapeHtml(text.slice(0,idx)) + '<mark>' + escapeHtml(text.slice(idx, idx+q.length)) + '</mark>' + escapeHtml(text.slice(idx+q.length)); }

/* ====== Autofocus ====== */
function setupAutoFocus(){ setTimeout(()=>{ try{ refs.search && refs.search.focus(); refs.search && refs.search.select(); } catch(e){} }, 120); }

/* ====== BYBIT modal ====== */
function setupBybit(){
  refs.bybitBtn && refs.bybitBtn.addEventListener('click', ()=> refs.bybitModal && refs.bybitModal.setAttribute('aria-hidden','false'));
  refs.bybitClose && refs.bybitClose.addEventListener('click', ()=> refs.bybitModal && refs.bybitModal.setAttribute('aria-hidden','true'));
  refs.bybitModal && refs.bybitModal.addEventListener('click', (e)=> { if(e.target === refs.bybitModal) refs.bybitModal.setAttribute('aria-hidden','true'); });
}

/* ====== Donate ====== */
function setupDonate(){
  refs.donateHeader && refs.donateHeader.addEventListener('click', ()=> { pulse(refs.donateHeader); window.open(DONATE_URL, '_blank', 'noopener'); });
  refs.donateBtn && refs.donateBtn.addEventListener('click', ()=> { pulse(refs.donateBtn); window.open(DONATE_URL, '_blank', 'noopener'); });
}
function pulse(el){ if(!el) return; el.classList.add('pulse'); setTimeout(()=> el.classList.remove('pulse'), 700); }

/* ====== Wheel ====== */
function setupWheel(){
  const sectors = [
    "Нихуя","Ничего","0","Ноль","Неа","Йух","No","Error","Жаль","Нет.","Сори","Плак плак", ":'("
  ];
  const canvas = refs.wheelCanvas;
  const confettiCanvas = refs.confettiCanvas;
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  const size = Math.min(canvas.width, canvas.height); // e.g. 520
  const cx = canvas.width/2, cy = canvas.height/2;
  const radius = size/2 - 8;
  const sectorCount = sectors.length;
  const sectorAngle = 360 / sectorCount;
  const anglePer = Math.PI*2 / sectorCount;

  // draw festive wheel
  function drawWheel(){
    ctx.clearRect(0,0,canvas.width, canvas.height);
    const colors = ['#FFB3C1','#FFD699','#B3ECFF','#E2B3FF','#B8FFDA','#FFF0B3'];
    for(let i=0;i<sectorCount;i++){
      const ang = i * anglePer - Math.PI/2; // start from top
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, ang, ang + anglePer);
      ctx.closePath();
      ctx.fillStyle = colors[i % colors.length];
      ctx.fill();
      // text
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(ang + anglePer/2);
      ctx.fillStyle = '#071018';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(sectors[i], radius*0.58, 6);
      ctx.restore();
    }
    // ring
    ctx.beginPath(); ctx.arc(cx,cy,radius+6,0,Math.PI*2); ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(0,0,0,0.08)'; ctx.stroke();
    // center button visual
    ctx.beginPath(); ctx.arc(cx,cy,60,0,Math.PI*2); ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fill();
  }

  drawWheel();

  // synth sound (WebAudio)
  const audioCtx = (window.AudioContext || window.webkitAudioContext) ? new (window.AudioContext || window.webkitAudioContext)() : null;
  function playTone(type){
    if(refs.mute && refs.mute.checked) return;
    if(!audioCtx) return;
    try {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = type === 'spin' ? 'sawtooth' : 'triangle';
      if(type === 'spin'){
        o.frequency.setValueAtTime(200, audioCtx.currentTime);
        g.gain.setValueAtTime(0.02, audioCtx.currentTime);
        o.connect(g); g.connect(audioCtx.destination);
        o.start(); setTimeout(()=> o.stop(), 900);
      } else {
        o.frequency.setValueAtTime(740, audioCtx.currentTime);
        g.gain.setValueAtTime(0.03, audioCtx.currentTime);
        o.connect(g); g.connect(audioCtx.destination);
        o.start(); setTimeout(()=> o.stop(), 260);
      }
    } catch(e){}
  }

  // spin state
  let rotation = 0; // degrees
  let spinning = false;
  let attempts = 0;

  function spin(){
    if(spinning) return;
    spinning = true;
    playTone('spin');

    // pick random sector index externally (for visual fairness)
    const targetIndex = Math.floor(Math.random() * sectorCount);
    // compute target rotation so that chosen sector ends at top (pointer at 270deg -> top)
    // we want (startAngle + rotation) such that pointerAngle (270) lies within sector
    // simpler: compute the wheel angle we need so that sector's center aligns with pointer(270)
    const sectorCenterAngle = targetIndex * sectorAngle + sectorAngle/2; // degrees from 0 (3 o'clock)
    // canvas drawing was shifted by -90deg so earlier we used -90; but we'll use formula:
    // targetRotationDegrees so that (sectorCenterAngle + rotation) % 360 === 270
    // => rotation === (270 - sectorCenterAngle) mod 360
    const desiredRotationForIndex = (270 - sectorCenterAngle + 360) % 360;

    // we want many rounds plus this offset
    const rounds = 6 + Math.floor(Math.random() * 4); // 6-9 rounds
    const targetTotalRotation = rounds * 360 + desiredRotationForIndex;

    const start = performance.now();
    const duration = 4500 + Math.random() * 1400; // longer / smoother (~4.5-6s)
    const from = rotation;
    const to = rotation + targetTotalRotation;

    function easeOutCubic(t){ return 1 - Math.pow(1 - t, 3); }

    function animate(now){
      const t = Math.min(1, (now - start) / duration);
      const eased = easeOutCubic(t);
      rotation = from + (to - from) * eased;
      canvas.style.transform = `rotate(${rotation}deg)`;
      if(t < 1) requestAnimationFrame(animate);
      else {
        spinning = false;
        attempts++;
        refs.spinCount && (refs.spinCount.textContent = `Попыток: ${attempts}`);
        // compute sector at pointer:
        const normalized = ((270 - (rotation % 360) ) + 360) % 360; // in [0,360)
        const index = Math.floor(normalized / sectorAngle) % sectorCount;
        // show simple congratulation
        refs.spinResult && (refs.spinResult.textContent = 'Поздравляю!');
        playTone('stop');
        // confetti inside wheel area
        try {
          const conf = confetti.create(confettiCanvasForWheel(), { resize: true, useWorker: true });
          conf({ particleCount: 110, spread: 90, ticks: 160, origin: { x: 0.5, y: 0.25 } });
        } catch(e){
          try{ confetti({particleCount:60, spread:60}); }catch(e){}
        }
        // clear message after timeout
        setTimeout(()=>{ refs.spinResult && (refs.spinResult.textContent = ''); }, 2400);
      }
    }
    requestAnimationFrame(animate);
  }

  // confetti canvas scoping: return element inside wheel viewport if possible
  function confettiCanvasForWheel(){
    // try to use the confetti canvas defined in DOM inside wheel block
    if(refs.confettiCanvas) return refs.confettiCanvas;
    return null;
  }

  refs.spinBtn && refs.spinBtn.addEventListener('click', spin);
  canvas && canvas.addEventListener('click', spin);
}

/* ====== Utilities ====== */
function copyToClipboard(text){
  try {
    if(navigator.clipboard && navigator.clipboard.writeText){
      return navigator.clipboard.writeText(text);
    } else {
      const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); ta.remove();
      return Promise.resolve();
    }
  } catch(e){
    return Promise.reject(e);
  }
}

/* helpers for search highlighting */
function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

/* ====== End ====== */
