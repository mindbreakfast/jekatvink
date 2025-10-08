/* script.js — финальная версия
 - Загрузка data/casinos.json (с fallback)
 - Категории, фильтры, поиск с коррекцией раскладки
 - Промокоды: копирование и автокопирование перед переходом
 - SCAM: "отваливается" через 3s при наведении
 - Колесо удачи: вращение, WebAudio, конфетти (canvas-confetti CDN)
 - Донат-кнопки, BYBIT модалка, автофокус
*/

"use strict";

const JSON_PATH = 'data/casinos.json';
const DONATE_URL = 'https://donatepay.ru/don/435213'; // предоставленная ссылка

let casinos = [];

/* DOM references */
const refs = {
  search: null,
  categories: null,
  cards: null,
  bybitBtn: null,
  bybitModal: null,
  bybitClose: null,
  spinBtn: null,
  spinResult: null,
  wheelCanvas: null,
  mute: null,
  spinCount: null,
  donateHeader: null,
  donateBtn: null,
  confettiCanvas: null
};

document.addEventListener('DOMContentLoaded', init);

async function init(){
  bind();
  await loadData();
  buildCategories();
  renderAllCards();
  setupSearch();
  setupAutoFocus();
  setupBybit();
  setupDonate();
  setupWheel();
}

/* bind DOM */
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
    const r = await fetch(JSON_PATH, {cache: 'no-store'});
    if(!r.ok) throw new Error('no json');
    casinos = await r.json();
  } catch (e) {
    console.warn('Не удалось загрузить JSON — использую резервный набор', e);
    casinos = [
      {"id":"alpha","name":"Casino Alpha (пример)","image":"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='240'><rect width='100%' height='100%' fill='%230b1420'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='28' fill='%23fff'>Alpha</text></svg>","bonus":"Бонус: 100% до 5000","promo_code":"ALPHA100","url":"#","categories":["Топ","Рекомендуем"]},
      {"id":"beta","name":"Casino Beta (пример)","image":"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='240'><rect width='100%' height='100%' fill='%23112233'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='28' fill='%239ef'>Beta</text></svg>","bonus":"Фриспины + 2000","promo_code":"BETA200","url":"#","categories":["Крипто"]},
      {"id":"vip","name":"VIP Roll (пример)","image":"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='240'><rect width='100%' height='100%' fill='%23111111'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='28' fill='%23f6d37a'>VIPRoll</text></svg>","bonus":"Фриспины + 1500","promo_code":"VIPROLL1500","url":"#","categories":["Рекомендуем"]},
      {"id":"scam","name":"Скам","image":"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='240'><rect width='100%' height='100%' fill='%23ff3333'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='36' fill='%23fff'>SCAM</text></svg>","bonus":"Никакого скама! Только проверенные места!","url":"#","fake":true,"categories":[]}
    ];
  }
}

/* ===== Categories ===== */
function buildCategories(){
  const map = new Map();
  casinos.forEach(c => (c.categories||[]).forEach(cat => {
    if(!map.has(cat)) map.set(cat, []);
    map.get(cat).push(c);
  }));

  refs.categories.innerHTML = '';
  refs.categories.appendChild(createCategoryBtn('Все', true));

  // if 'Топ' exists, keep ordering friendly
  if(map.has('Топ')) refs.categories.appendChild(createCategoryBtn('Топ'));

  Array.from(map.keys()).sort().forEach(k => {
    if(k === 'Топ') return;
    refs.categories.appendChild(createCategoryBtn(k));
  });

  refs.categories.addEventListener('click', e => {
    const btn = e.target.closest('.category-btn');
    if(!btn) return;
    document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    filterByCategory(btn.dataset.cat);
  });
}

function createCategoryBtn(name, active=false){
  const b = document.createElement('button');
  b.className = 'category-btn' + (active ? ' active' : '');
  b.textContent = name;
  b.dataset.cat = name;
  return b;
}

/* ===== Cards rendering ===== */
function renderAllCards(){
  refs.cards.innerHTML = '';
  casinos.forEach(c => refs.cards.appendChild(makeCard(c)));
}

function makeCard(item){
  const root = document.createElement('article');
  root.className = 'card' + (item.fake ? ' scam' : '');
  root.dataset.id = item.id || '';
  root.dataset.name = item.name || '';

  // thumb
  const thumb = document.createElement('div'); thumb.className = 'thumb';
  const img = document.createElement('img'); img.src = item.image || ''; img.alt = item.name || '';
  img.style.width = '100%'; img.style.height = '100%'; img.style.objectFit = 'cover';
  thumb.appendChild(img);

  // info
  const info = document.createElement('div'); info.className = 'info';
  const h4 = document.createElement('h4'); h4.textContent = item.name;
  const p = document.createElement('p'); p.textContent = item.bonus || '';
  const badges = document.createElement('div'); badges.className = 'badges';
  (item.categories||[]).slice(0,3).forEach(cat => {
    const s = document.createElement('span'); s.className = 'badge'; s.textContent = cat; badges.appendChild(s);
  });
  info.appendChild(h4); info.appendChild(p); info.appendChild(badges);

  // actions
  const actions = document.createElement('div'); actions.className = 'actions';

  // promo
  if(item.promo_code){
    const promo = document.createElement('div'); promo.className = 'promo';
    const codeBtn = document.createElement('button'); codeBtn.className = 'promo-code'; codeBtn.type = 'button';
    codeBtn.textContent = item.promo_code;
    const tip = document.createElement('span'); tip.className = 'promo-tip'; tip.textContent = '';
    promo.appendChild(codeBtn); promo.appendChild(tip);
    actions.appendChild(promo);

    codeBtn.addEventListener('click', async () => {
      const ok = await copyToClipboard(item.promo_code);
      if(ok) flashCopied(codeBtn, tip);
    });
  }

  // play button
  const play = document.createElement('a'); play.className = 'btn-game'; play.textContent = 'В игру';
  play.href = item.url || '#'; play.target = '_blank'; play.rel = 'noopener noreferrer';
  play.addEventListener('click', async (e) => {
    if(item.promo_code){
      // prevent immediate navigation; copy first
      e.preventDefault();
      await copyToClipboard(item.promo_code);
      const promoBtn = root.querySelector('.promo .promo-code');
      const tip = root.querySelector('.promo .promo-tip');
      if(promoBtn) flashCopied(promoBtn, tip);
      // small delay to let clipboard settle
      setTimeout(() => window.open(item.url || '#', '_blank', 'noopener'), 220);
    }
    // otherwise default link navigation
  });

  actions.appendChild(play);

  root.appendChild(thumb);
  root.appendChild(info);
  root.appendChild(actions);

  // SCAM behavior
  if(item.fake){
    root.addEventListener('mouseenter', ()=> startScamCountdown(root));
    root.addEventListener('mouseleave', ()=> cancelScamCountdown(root));
  }

  return root;
}

/* copy util + visual */
async function copyToClipboard(text){
  try {
    if(navigator.clipboard && navigator.clipboard.writeText){
      await navigator.clipboard.writeText(text);
    } else {
      const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); ta.remove();
    }
    return true;
  } catch (e) {
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

/* ===== SCAM falling ===== */
const SCAM_TIMEOUT = 3000;
const _scamTimers = new WeakMap();
function startScamCountdown(card){
  if(_scamTimers.has(card)) return;
  const t = setTimeout(()=>{
    card.style.animation = 'fallAway 1.4s ease forwards';
    card.style.pointerEvents = 'none';
    setTimeout(()=>{ try{ card.remove(); }catch(e){} },1500);
  }, SCAM_TIMEOUT);
  _scamTimers.set(card, t);
}
function cancelScamCountdown(card){
  const t = _scamTimers.get(card);
  if(t){ clearTimeout(t); _scamTimers.delete(card); }
}

/* ===== Search with layout correction (ru<>en) ===== */
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
function highlightMatch(text, q){
  if(!q) return escapeHtml(text);
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if(idx === -1) return escapeHtml(text);
  return escapeHtml(text.slice(0,idx)) + '<mark>' + escapeHtml(text.slice(idx, idx+q.length)) + '</mark>' + escapeHtml(text.slice(idx+q.length));
}

function setupSearch(){
  refs.search.addEventListener('input', (e) => filterByQuery(e.target.value));
  refs.search.addEventListener('keydown', (e)=>{
    if(e.key === 'Enter'){
      const first = refs.cards.querySelector('.card a.btn-game');
      if(first) first.focus();
    }
  });
}

function filterByCategory(cat){
  const cards = Array.from(refs.cards.children);
  if(cat === 'Все'){
    cards.forEach(c => c.style.display = 'flex');
    return;
  }
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
      let found = false;
      for(const v of variants){
        if(!v) continue;
        if(name.toLowerCase().includes(v)){
          card.querySelector('h4').innerHTML = highlightMatch(name, v);
          card.querySelector('p').innerHTML = escapeHtml(bonus);
          found = true; break;
        } else if(bonus.toLowerCase().includes(v)){
          card.querySelector('p').innerHTML = highlightMatch(bonus, v);
          card.querySelector('h4').innerHTML = escapeHtml(name);
          found = true; break;
        } else if(promo.toLowerCase().includes(v)){
          const codeElem = card.querySelector('.promo .promo-code');
          if(codeElem) codeElem.innerHTML = highlightMatch(codeElem.textContent, v);
          card.querySelector('h4').innerHTML = escapeHtml(name);
          card.querySelector('p').innerHTML = escapeHtml(bonus);
          found = true; break;
        }
      }
      if(!found){
        card.querySelector('h4').innerHTML = escapeHtml(name);
        card.querySelector('p').innerHTML = escapeHtml(bonus);
      }
    } else {
      card.style.display = 'none';
    }
  });
}

/* autofocus */
function setupAutoFocus(){
  setTimeout(()=>{ try{ refs.search.focus(); refs.search.select(); }catch(e){} }, 100);
}

/* BYBIT modal */
function setupBybit(){
  refs.bybitBtn.addEventListener('click', ()=> refs.bybitModal.setAttribute('aria-hidden','false'));
  refs.bybitClose.addEventListener('click', ()=> refs.bybitModal.setAttribute('aria-hidden','true'));
  refs.bybitModal.addEventListener('click', (e)=> { if(e.target === refs.bybitModal) refs.bybitModal.setAttribute('aria-hidden','true'); });
}

/* Donate */
function setupDonate(){
  refs.donateHeader.addEventListener('click', ()=> { pulse(refs.donateHeader); window.open(DONATE_URL, '_blank', 'noopener'); });
  refs.donateBtn.addEventListener('click', ()=> { pulse(refs.donateBtn); window.open(DONATE_URL, '_blank', 'noopener'); });
}
function pulse(el){ el.classList.add('pulse'); setTimeout(()=> el.classList.remove('pulse'), 700); }

/* ===== Wheel + confetti + sound ===== */
function setupWheel(){
  const sectors = [
    "Нихуя","Ничего","0","Ноль","Неа","Йух","No","Error","Жаль","Нет.","Сори","Плак плак", ":'("
  ];
  const canvas = refs.wheelCanvas;
  const ctx = canvas.getContext('2d');
  const size = Math.min(canvas.width, canvas.height);
  const cx = canvas.width/2, cy = canvas.height/2;
  const radius = size/2 - 8;
  const sectorCount = sectors.length;
  const anglePer = Math.PI*2 / sectorCount;

  function draw(){
    ctx.clearRect(0,0,canvas.width, canvas.height);
    for(let i=0;i<sectorCount;i++){
      const ang = i * anglePer;
      ctx.beginPath(); ctx.moveTo(cx,cy);
      ctx.arc(cx,cy, radius, ang, ang+anglePer);
      ctx.closePath();
      ctx.fillStyle = i%2 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.06)';
      ctx.fill();
      ctx.save();
      ctx.translate(cx,cy);
      ctx.rotate(ang + anglePer/2);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(sectors[i], radius*0.6, 6);
      ctx.restore();
    }
    // center
    ctx.beginPath(); ctx.arc(cx,cy,60,0,Math.PI*2); ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fill();
  }
  draw();

  let rotation = 0;
  let spinning = false;
  let attempts = 0;

  function playTone(type){
    if(refs.mute && refs.mute.checked) return;
    try {
      const audioCtx = window._jv_audio || (window._jv_audio = new (window.AudioContext || window.webkitAudioContext)());
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = type === 'spin' ? 'sawtooth' : 'square';
      if(type === 'spin'){
        o.frequency.setValueAtTime(220, audioCtx.currentTime);
        g.gain.setValueAtTime(0.02, audioCtx.currentTime);
        o.connect(g); g.connect(audioCtx.destination);
        o.start(); setTimeout(()=>o.stop(), 450);
      } else {
        o.frequency.setValueAtTime(440, audioCtx.currentTime);
        g.gain.setValueAtTime(0.03, audioCtx.currentTime);
        o.connect(g); g.connect(audioCtx.destination);
        o.start(); setTimeout(()=>o.stop(), 220);
      }
    } catch(e){}
  }

  function spin(){
    if(spinning) return;
    spinning = true;
    playTone('spin');
    const extra = Math.floor(Math.random()*sectorCount);
    const rounds = 6 + Math.floor(Math.random()*6);
    const targetDeg = (rounds * 360) + (extra * (360/sectorCount)) + (360/sectorCount)/2;
    const start = performance.now();
    const duration = 2700 + Math.random()*1200;
    const from = rotation % 360;
    const to = from + targetDeg;

    function anim(t){
      const p = Math.min(1, (t - start)/duration);
      const ease = 1 - Math.pow(1 - p, 3);
      rotation = from + (to - from) * ease;
      canvas.style.transform = `rotate(${rotation}deg)`;
      if(p < 1) requestAnimationFrame(anim);
      else {
        spinning = false;
        attempts++;
        refs.spinCount.textContent = `Попыток: ${attempts}`;
        const final = Math.floor(((rotation % 360) / 360) * sectorCount);
        const index = (sectorCount - (final % sectorCount)) % sectorCount;
        const res = sectors[index];
        playTone('stop');
        showResult(res);
        // confetti
        try {
          const myConfetti = confetti.create(refs.confettiCanvas, { resize: true, useWorker: true });
          myConfetti({ particleCount: 90, spread: 70, ticks: 140, origin: { y: 0.15 } });
        } catch (e) {
          try { confetti({ particleCount: 50, spread: 60 }); } catch(e){}
        }
      }
    }
    requestAnimationFrame(anim);
  }

  function showResult(text){
    refs.spinResult.textContent = `Поздравляем! Вы выиграли — ${text}`;
    refs.spinBtn.style.display = 'none';
    setTimeout(()=>{ refs.spinResult.textContent = ''; refs.spinBtn.style.display = ''; }, 2200);
  }

  refs.spinBtn.addEventListener('click', spin);
  canvas.addEventListener('click', spin);
}

/* end of script */
