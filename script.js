/* script.js — восстановленный полный функционал
   - соответствует твоему index.html (IDs/classes: #casinoList, #searchInput, .filter-btn, .card, .promo-code, .play-btn, .scam)
   - слот-ролик: вертикальная прокрутка списка goodWords, в конце final из badWords (центруется)
   - overlay "Поздравляю!" фиксирован — не ломает верстку
   - SCAM-карта падает при клике, промокод копируется, фильтры и поиск работают
   - Поставь свои mp3 в SPIN_SOUND_SRC и WIN_SOUND_SRC
*/

/* ---------------- CONFIG ---------------- */
const SPIN_SOUND_SRC = "/sounds/spin.mp3"; // <-- заменишь сам
const WIN_SOUND_SRC  = "/sounds/win.mp3";  // <-- заменишь сам

/* ---------------- DOM ------------------- */
const casinoList = document.getElementById("casinoList");
const searchInput = document.getElementById("searchInput");
const filterBtns = Array.from(document.querySelectorAll(".filter-btn"));
const bybitToggle = document.getElementById("bybitToggle");
const bybitContent = document.getElementById("bybitContent");
const spinButton = document.getElementById("spinButton");
const wordDisplay = document.getElementById("wordDisplay");
const confettiCanvas = document.getElementById("confettiCanvas");
let overlay = document.getElementById("spin-result");
if (!overlay) {
  overlay = document.createElement("div"); overlay.id = "spin-result";
  document.body.appendChild(overlay);
}

/* ---------------- State ------------------ */
let goodWords = [];
let badWords = [];
let isSpinning = false;

/* ---------------- Init ------------------- */
document.addEventListener("DOMContentLoaded", async () => {
  // load word lists
  await Promise.all([loadGood(), loadBad()]);
  // attach events
  setupFilters();
  setupSearch();
  setupPromoAndPlay();
  setupBybit();
  setupSpin();
  setupConfettiCanvas();
});

/* -------------- Loaders ----------------- */
async function loadGood(){
  try {
    const r = await fetch(`/goodWords.json?v=${Date.now()}`, {cache: 'no-store'});
    if (r.ok) goodWords = await r.json();
  } catch(e){ console.warn("loadGood failed", e); goodWords = goodWords || ["Пусто"] }
}
async function loadBad(){
  try {
    const r = await fetch(`/badWords.json?v=${Date.now()}`, {cache: 'no-store'});
    if (r.ok) badWords = await r.json();
  } catch(e){ console.warn("loadBad failed", e); badWords = badWords || ["Ничего"] }
}

/* -------------- Filters & Search ---------------- */
function setupFilters(){
  filterBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      filterBtns.forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");
      applyFilters();
    });
  });
  applyFilters(); // initial
}
function setupSearch(){
  searchInput.addEventListener("input", () => applyFilters());
  // Enter focuses first .play-btn
  searchInput.addEventListener("keydown", (e)=> { if (e.key === "Enter") { const first = casinoList.querySelector('.play-btn'); if (first) first.focus(); }});
}

// variantsOf with ru/en layout map (helps if user forgot switch)
const layoutMap = {
  'й':'q','ц':'w','у':'e','к':'r','е':'t','н':'y','г':'u','ш':'i','щ':'o','з':'p','х':'[','ъ':']',
  'ф':'a','ы':'s','в':'d','а':'f','п':'g','р':'h','о':'j','л':'k','д':'l','ж':';','э':'\'',
  'я':'z','ч':'x','с':'c','м':'v','и':'b','т':'n','ь':'m','б':',','ю':'.'
};
const enToRu = Object.fromEntries(Object.entries(layoutMap).map(([k,v])=>[v,k]));
function variantsOf(q){
  q=(q||'').toLowerCase();
  if(!q) return [''];
  const ruEn = q.split('').map(c => layoutMap[c] || c).join('');
  const enRu = q.split('').map(c => enToRu[c] || c).join('');
  return [q, ruEn, enRu];
}

function applyFilters(){
  const activeCatBtn = document.querySelector('.filter-btn.active');
  const cat = activeCatBtn ? activeCatBtn.dataset.category : "all";
  const q = searchInput.value.trim().toLowerCase();
  const vars = variantsOf(q);

  Array.from(casinoList.children).forEach(card => {
    if (!card.classList.contains('card')) return;
    // category (card dataset may contain space-separated categories)
    const cData = (card.dataset.category || "").toLowerCase();
    const catMatch = (cat === "all") || cData.split(/\s+/).includes(cat.toLowerCase());
    // search match on title, desc, promo
    const title = (card.querySelector('h3')||{textContent:''}).textContent.toLowerCase();
    const desc = (card.querySelector('p')||{textContent:''}).textContent.toLowerCase();
    const promo = (card.querySelector('.promo-code')||{textContent:''}).textContent.toLowerCase();
    const hay = (title+" "+desc+" "+promo).toLowerCase();

    const searchMatch = (!q) || vars.some(v => v && hay.includes(v));
    card.style.display = (catMatch && searchMatch) ? 'block' : 'none';
  });
}

/* -------------- Promo & Play handlers ------------- */
function setupPromoAndPlay(){
  document.addEventListener("click", async (e) => {
    const promo = e.target.closest('.promo-code');
    if (promo) {
      const code = promo.textContent.trim();
      try { await navigator.clipboard.writeText(code); }
      catch(e){ console.warn('copy err',e) }
      const prev = promo.textContent;
      promo.classList.add('copied');
      promo.textContent = 'Скопировано';
      setTimeout(()=>{ promo.textContent = prev; promo.classList.remove('copied'); }, 1200);
      return;
    }

    const play = e.target.closest('.play-btn');
    if (play) {
      const card = play.closest('.card');
      if (card && card.classList.contains('scam')) {
        // trigger fall
        card.classList.add('fall');
        setTimeout(()=>{ try{ card.remove(); }catch(e){} }, 1400);
        return;
      }
      // otherwise copy promo code if exists nearby
      const promoSpan = (card && card.querySelector('.promo-code')) || null;
      if (promoSpan) {
        try { await navigator.clipboard.writeText(promoSpan.textContent.trim()); } catch(e){}
      }
      // open link if present on card.dataset.url or anchor inside
      const link = card && card.dataset.url;
      if (link) window.open(link, '_blank', 'noopener');
    }
  });
}

/* --------------- BYBIT toggle ---------------- */
function setupBybit(){
  if (!bybitToggle || !bybitContent) return;
  bybitToggle.addEventListener("click", ()=> {
    bybitContent.classList.toggle('hidden');
  });
}

/* --------------- Confetti canvas ---------------- */
let confettiCtx = null;
function setupConfettiCanvas(){
  if (!confettiCanvas) return;
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = 300;
  confettiCtx = confettiCanvas.getContext('2d');
  window.addEventListener('resize', ()=> { confettiCanvas.width = window.innerWidth; confettiCanvas.height = 300; });
}

/* simple confetti burst for finish */
function launchConfetti() {
  if (!confettiCtx) return;
  const canvas = confettiCanvas;
  const ctx = confettiCtx;
  const parts = [];
  const N = 80;
  for (let i=0;i<N;i++){
    parts.push({
      x: canvas.width/2 + (Math.random()-0.5)*240,
      y: 30 + Math.random()*40,
      vx: (Math.random()-0.5)*6,
      vy: Math.random()*6 + 2,
      r: Math.random()*5+2,
      color: `hsl(${Math.floor(Math.random()*360)},70%,60%)`
    });
  }
  const start = performance.now();
  function frame(now){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    for (const p of parts){
      p.x += p.vx; p.y += p.vy; p.vy += 0.15;
      ctx.beginPath(); ctx.fillStyle = p.color; ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill();
    }
    if (now - start < 2400) requestAnimationFrame(frame);
    else setTimeout(()=>ctx.clearRect(0,0,canvas.width,canvas.height), 80);
  }
  requestAnimationFrame(frame);
}

/* ------------- Slot-like spin (vertical scroll) --------------- */
function setupSpin(){
  if (!spinButton || !wordDisplay) return;
  const spinAudio = new Audio(SPIN_SOUND_SRC);
  const winAudio = new Audio(WIN_SOUND_SRC);
  spinAudio.volume = 0.75; winAudio.volume = 0.9;
  spinButton.addEventListener("click", async () => {
    if (isSpinning) return;
    isSpinning = true;
    spinButton.disabled = true;

    // ensure words loaded
    if (!goodWords.length) await loadGood();
    if (!badWords.length) await loadBad();

    // Prepare sequence: several loops of shuffled goodWords + final bad
    const loops = 6; // how many cycles of goods
    const seq = [];
    for (let i=0;i<loops;i++){
      const shuffled = shuffle([...goodWords]);
      for (const w of shuffled) seq.push(w);
    }
    // choose final bad word and push many duplicates near end to slow visually
    const finalBad = badWords.length ? badWords[Math.floor(Math.random()*badWords.length)] : "Ничего";
    // append few goods right before final to look natural
    const tailGoods = shuffle([...goodWords]).slice(0,6);
    for (const g of tailGoods) seq.push(g);
    seq.push(finalBad); // final at very end

    // Build DOM list
    wordDisplay.innerHTML = '';
    const list = document.createElement('div');
    list.className = 'reel-list';
    for (const v of seq){
      const it = document.createElement('div');
      it.className = 'reel-item';
      it.textContent = v;
      list.appendChild(it);
    }
    wordDisplay.appendChild(list);

    // Wait one tick, measure item height & viewport
    await new Promise(r => requestAnimationFrame(r));
    const firstItem = list.querySelector('.reel-item');
    const itemH = firstItem ? firstItem.getBoundingClientRect().height : 84;
    const viewportH = wordDisplay.getBoundingClientRect().height;
    // target index = last item (final bad)
    const targetIndex = seq.length - 1;
    // compute translateY so final item centered:
    const finalTranslate = -(itemH * targetIndex) + ( (viewportH - itemH) / 2 );

    // start audio (loop)
    try { spinAudio.currentTime = 0; spinAudio.loop = true; await spinAudio.play(); } catch(e){ /* auto-play may be blocked until user gesture — but click is user gesture */ }

    // initial small offset so it looks like start from top 0
    list.style.transition = 'none';
    list.style.transform = `translateY(0px)`;
    // force reflow
    list.getBoundingClientRect();

    // animate with CSS transition — ease-out feeling
    const duration = 5000; // 5 sec total as
