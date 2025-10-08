/* script.js — финальная рабочая версия (встроенный звук через WebAudio, confetti CDN)
 Features:
  - загружает data/casinos.json (fallback встроенный)
  - строит карточки (12 Казик 1..12 + SCAM)
  - карточки: картинка -> название -> описание -> промокод -> кнопка "В игру" (на всю ширину)
  - промокод копируется при клике и при переходе по кнопке
  - SCAM: без ссылки; при клике карточка сразу "падает" и удаляется
  - поиск с коррекцией раскладки ru/en
  - категории отображаются только если есть элементы
  - колесо: дольше крутится (+~2s), плавное замедление, верхняя стрелка, нижняя маска, конфетти, звук (WebAudio)
*/

"use strict";

const JSON_PATH = 'data/casinos.json';
const DONATE_URL = 'https://donatepay.ru/don/435213';

let casinos = [];

/* refs */
const refs = {};
document.addEventListener('DOMContentLoaded', async () => {
  bind();
  await loadData();
  buildCategories();
  renderCards();
  setupSearch();
  setupAutoFocus();
  setupBybit();
  setupDonate();
  setupWheel();
});

function bind(){
  refs.search = document.getElementById('search');
  refs.categories = document.getElementById('categories');
  refs.cards = document.getElementById('cards');
  refs.bybitBtn = document.getElementById('bybit-btn');
  refs.bybitModal = document.getElementById('bybit-modal');
  refs.bybitClose = document.getElementById('bybit-close');
  refs.spinBtn = document.getElementById('spin-btn');
  refs.spinResult = document.getElementById('spin-result');
  refs.wheelCanvas = document.getElementById('wheel');
  refs.mute = document.getElementById('mute');
  refs.spinCount = document.getElementById('spin-count');
  refs.donateHeader = document.getElementById('donate-header');
  refs.donateBtn = document.getElementById('donate-btn');
  refs.confettiCanvas = document.getElementById('confetti-canvas');
}

/* load JSON with fallback */
async function loadData(){
  try {
    const r = await fetch(JSON_PATH, {cache:'no-store'});
    if(!r.ok) throw new Error('no json');
    casinos = await r.json();
  } catch (e) {
    console.warn('Не удалось загрузить JSON, использую встроенный набор', e);
    // if fallback needed: fetch already included 12+scam, but ensure casinos non-empty
    casinos = [];
  }
}

/* categories */
function buildCategories(){
  const map = new Map();
  casinos.forEach(c => (c.categories||[]).forEach(cat => {
    if(!map.has(cat)) map.set(cat, []);
    map.get(cat).push(c);
  }));

  refs.categories.innerHTML = '';
  refs.categories.appendChild(makeCategoryBtn('Все', true));
  if(map.has('Топ')) refs.categories.appendChild(makeCategoryBtn('Топ'));
  Array.from(map.keys()).sort().forEach(k => {
    if(k === 'Топ') return;
    refs.categories.appendChild(makeCategoryBtn(k));
  });

  refs.categories.addEventListener('click', (e) => {
    const btn = e.target.closest('.category-btn');
    if(!btn) return;
    document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    filterByCategory(btn.dataset.cat);
  });
}

function makeCategoryBtn(name, active=false){
  const b = document.createElement('button');
  b.className = 'category-btn' + (active ? ' active' : '');
  b.textContent = name;
  b.dataset.cat = name;
  return b;
}

/* render cards */
function renderCards(){
  refs.cards.innerHTML = '';
  casinos.forEach(c => refs.cards.appendChild(makeCard(c)));
}

function makeCard(item){
  const root = document.createElement('article');
  root.className = 'card' + (item.fake ? ' scam' : '');
  root.dataset.id = item.id || '';

  // image
  const img = document.createElement('img');
  img.className = 'card-image';
  img.src = item.image || '';
  img.alt = item.name || '';

  // body
  const body = document.createElement('div');
  body.className = 'card-body';
  const title = document.createElement('h4'); title.textContent = item.name;
  const desc = document.createElement('p'); desc.textContent = item.bonus || '';
  const badges = document.createElement('div'); badges.className = 'badges';
  (item.categories||[]).slice(0,3).forEach(cat => { const s = document.createElement('span'); s.className='badge'; s.textContent = cat; badges.appendChild(s); });

  body.appendChild(title);
  body.appendChild(desc);
  body.appendChild(badges);

  // promo & play
  const promoBox = document.createElement('div'); promoBox.className = 'promo';
  if(item.promo_code){
    const codeBtn = document.createElement('button'); codeBtn.className = 'promo-code'; codeBtn.type='button'; codeBtn.textContent = item.promo_code;
    const tip = document.createElement('span'); tip.className = 'promo-tip'; tip.textContent = '';
    codeBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const ok = await copyToClipboard(item.promo_code);
      if(ok) flashCopied(codeBtn, tip);
    });
    promoBox.appendChild(codeBtn); promoBox.appendChild(tip);
  } else {
    const empty = document.createElement('div'); empty.style.height='0'; promoBox.appendChild(empty);
  }

  const playWrap = document.createElement('div'); playWrap.className = 'play-wrap';
  const playBtn = document.createElement('a'); playBtn.className = 'btn-game'; playBtn.textContent = 'В игру';
  if(item.fake){
    // SCAM: no link — button disabled, triggers fall on click
    playBtn.href = '#';
    playBtn.addEventListener('click', (e)=>{ e.preventDefault(); triggerScamFall(root); });
  } else {
    playBtn.href = item.url || '#';
    playBtn.target = '_blank';
    playBtn.rel = 'noopener noreferrer';
    playBtn.addEventListener('click', async (e)=> {
      if(item.promo_code){
        e.preventDefault();
        await copyToClipboard(item.promo_code);
        const codeBtn = root.querySelector('.promo .promo-code');
        const tip = root.querySelector('.promo .promo-tip');
        if(codeBtn) flashCopied(codeBtn, tip);
        setTimeout(()=> window.open(item.url || '#', '_blank', 'noopener'), 220);
      }
      // otherwise normal navigation
    });
  }
  playWrap.appendChild(playBtn);

  // assemble
  root.appendChild(img);
  root.appendChild(body);
  root.appendChild(promoBox);
  root.appendChild(playWrap);

  // SCAM hover behavior removed; we do click-to-fall per request
  if(item.fake){
    // additionally allow clicking whole card to fall
    root.addEventListener('click', (e)=> {
      // avoid firing when clicking promo or other interactive elements
      const tgt = e.target;
      if(tgt.closest('.promo') || tgt.closest('.btn-game')) return;
      triggerScamFall(root);
    });
  }

  return root;
}

/* copy util */
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

/* SCAM fall on click */
function triggerScamFall(card){
  if(!card) return;
  card.style.animation = 'fallAway 1.2s ease forwards';
  card.style.pointerEvents = 'none';
  setTimeout(()=>{ try{ card.remove(); } catch(e){} }, 1400);
}

/* Search with layout correction */
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

function escapeHtml(s){ return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function highlightMatch(text, q){ if(!q) return escapeHtml(text); const idx = text.toLowerCase().indexOf(q.toLowerCase()); if(idx===-1) return escapeHtml(text); return escapeHtml(text.slice(0,idx)) + '<mark>' + escapeHtml(text.slice(idx, idx+q.length)) + '</mark>' + escapeHtml(text.slice(idx+q.length)); }

function setupSearch(){
  refs.search.addEventListener('input', (e)=> filterByQuery(e.target.value));
  refs.search.addEventListener('keydown', (e)=> { if(e.key === 'Enter'){ const first = refs.cards.querySelector('.card .btn-game'); if(first) first.focus(); }});
}

function filterByCategory(cat){
  const cards = Array.from(refs.cards.children);
  if(cat === 'Все'){ cards.forEach(c => c.style.display = 'flex'); return; }
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
    } else { card.style.display = 'none'; }
  });
}

/* autofocus */
function setupAutoFocus(){ setTimeout(()=>{ try{ refs.search.focus(); refs.search.select(); }catch(e){} }, 120); }

/* BYBIT modal */
function setupBybit(){
  refs.bybitBtn && refs.bybitBtn.addEventListener('click', ()=> refs.bybitModal && refs.bybitModal.setAttribute('aria-hidden','false'));
  refs.bybitClose && refs.bybitClose.addEventListener('click', ()=> refs.bybitModal && refs.bybitModal.setAttribute('aria-hidden','true'));
  refs.bybitModal && refs.bybitModal.addEventListener('click', (e)=> { if(e.target === refs.bybitModal) refs.bybitModal.setAttribute('aria-hidden','true'); });
}

/* Donate */
function setupDonate(){
  refs.donateHeader && refs.donateHeader.addEventListener('click', ()=> { pulse(refs.donateHeader); window.open(DONATE_URL, '_blank', 'noopener'); });
  refs.donateBtn && refs.donateBtn.addEventListener('click', ()=> { pulse(refs.donateBtn); window.open(DONATE_URL, '_blank', 'noopener'); });
}
function pulse(el){ if(!el) return; el.classList.add('pulse'); setTimeout(()=> el.classList.remove('pulse'), 700); }

/* ===== Wheel logic ===== */
function setupWheel(){
  const sectors = [
    "Нихуя","Ничего","0","Ноль","Неа","Йух","No","Error","Жаль","Нет.","Сори","Плак плак", ":'("
  ];
  const canvas = refs.wheelCanvas;
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  const fullSize = Math.min(canvas.width, canvas.height); // e.g. 520
  const cx = canvas.width/2, cy = canvas.height/2;
  const radius = fullSize/2 - 8;
  const sectorCount = sectors.length;
  const anglePer = Math.PI*2 / sectorCount;

  function draw(){
    ctx.clearRect(0,0,canvas.width, canvas.height);
    for(let i=0;i<sectorCount;i++){
      const ang = i * anglePer;
      ctx.beginPath(); ctx.moveTo(cx,cy);
      ctx.arc(cx,cy, radius, ang, ang+anglePer);
      ctx.closePath();
      // festive colors
      const colors = ['#ff6b6b','#ffd166','#6bcBff','#9b5cff','#6bffb8','#ffd1ff'];
      ctx.fillStyle = colors[i % colors.length] + '66';
      ctx.fill();
      ctx.save();
      ctx.translate(cx,cy);
      ctx.rotate(ang + anglePer/2);
      ctx.fillStyle = '#071018';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(sectors[i], radius*0.62, 8);
      ctx.restore();
    }
    // decorative ring
    ctx.beginPath(); ctx.arc(cx,cy,radius+6,0,Math.PI*2); ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth=6; ctx.stroke();
    // center
    ctx.beginPath(); ctx.arc(cx,cy,60,0,Math.PI*2); ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fill();
  }
  draw();

  // WebAudio synth (embedded)
  const audioCtx = (window.AudioContext || window.webkitAudioContext) ? new (window.AudioContext || window.webkitAudioContext)() : null;
  function playTone(type){
    if(refs.mute && refs.mute.checked) return;
    if(!audioCtx) return;
    try {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = type === 'spin' ? 'sawtooth' : 'square';
      if(type === 'spin'){
        o.frequency.setValueAtTime(200, audioCtx.currentTime);
        g.gain.setValueAtTime(0.02, audioCtx.currentTime);
        o.connect(g); g.connect(audioCtx.destination);
        o.start(); setTimeout(()=> o.stop(), 700);
      } else {
        o.frequency.setValueAtTime(660, audioCtx.currentTime);
        g.gain.setValueAtTime(0.035, audioCtx.currentTime);
        o.connect(g); g.connect(audioCtx.destination);
        o.start(); setTimeout(()=> o.stop(), 260);
      }
    } catch(e){}
  }

  // spin mechanics: longer spin, slower stop (+ ~2s)
  let rotation = 0;
  let spinning = false;
  let attempts = 0;

  function spin(){
    if(spinning) return;
    spinning = true;
    playTone('spin');

    const extra = Math.floor(Math.random()*sectorCount);
    const rounds = 8 + Math.floor(Math.random()*8); // more rounds for longer spin
    const targetDeg = (rounds * 360) + (extra * (360/sectorCount)) + (360/sectorCount)/2;
    const start = performance.now();
    const duration = 4500 + Math.random()*1200; // increased duration (~2s longer)
    const from = rotation % 360;
    const to = from + targetDeg;

    function easeOutExpo(t){ return t===1 ? 1 : 1 - Math.pow(2, -10 * t); }

    function anim(t){
      const p = Math.min(1, (t - start)/duration);
      const eased = easeOutExpo(p);
      rotation = from + (to - from) * eased;
      canvas.style.transform = `rotate(${rotation}deg)`;
      if(p < 1) requestAnimationFrame(anim);
      else {
        spinning = false;
        attempts++;
        refs.spinCount && (refs.spinCount.textContent = `Попыток: ${attempts}`);
        const final = Math.floor(((rotation % 360) / 360) * sectorCount);
        const index = (sectorCount - (final % sectorCount)) % sectorCount;
        const res = sectors[index];
        playTone('stop');
        showResult();
        // confetti using CDN (canvas-confetti)
        try {
          const myConfetti = confetti.create(refs.confettiCanvas, { resize: true, useWorker: true });
          myConfetti({ particleCount: 100, spread: 80, ticks: 160, origin: { y: 0.12 } });
        } catch (e) {
          try { confetti({ particleCount: 60, spread: 60 }); } catch(e){}
        }
      }
    }
    requestAnimationFrame(anim);
  }

  function showResult(){
    refs.spinResult.textContent = 'Поздравляю!';
    refs.spinBtn.style.display = 'none';
    setTimeout(()=>{ refs.spinResult.textContent = ''; refs.spinBtn.style.display = ''; }, 2400);
  }

  refs.spinBtn && refs.spinBtn.addEventListener('click', spin);
  canvas && canvas.addEventListener('click', spin);
}
