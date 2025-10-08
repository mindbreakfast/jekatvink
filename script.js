/* script.js — интегрированный полный функционал:
   - карточки/категории/поиск/промокоды/SCAM-отвал
   - рандомайзер: показываем goodWords, в конце final из badWords
   - anti-cache при fetch, promo copy, autoplay-aware audio
   - user will replace SPIN_SOUND_SRC and WIN_SOUND_SRC with actual .mp3 URLs
*/

/* ================== CONFIG ================== */
// Put your sound file URLs here (replace with real links)
const SPIN_SOUND_SRC = "/sounds/spin.mp3"; // <-- заменишь сам
const WIN_SOUND_SRC =  "/sounds/win.mp3";  // <-- заменишь сам

// Paths to JSON (anti-cache applied on fetch)
const CASINOS_JSON = "/data/casinos.json";
const GOOD_WORDS_JSON = "/goodWords.json";
const BAD_WORDS_JSON = "/badWords.json";

/* ================== Refs ================== */
const refs = {
  cards: null,
  categories: null,
  search: null,
  bybitBtn: null,
  bybitModal: null,
  bybitClose: null,
  donateHeader: null,
  // randomizer elements (support several id names to be robust)
  reel: null,          // old versions used 'reel' or 'wordDisplay'
  wordDisplay: null,
  spinButton: null,
  confettiCanvas: null,
  spinResultOverlay: null
};

/* ================== State ================== */
let casinos = [];
let goodWords = [];
let badWords = [];
let isSpinning = false;

/* ================== Init ================== */
document.addEventListener("DOMContentLoaded", async () => {
  bindRefs();
  await Promise.all([loadCasinos(), loadWordLists()]);
  buildCategories();
  renderCards();
  setupSearch();
  setupAutoFocus();
  setupBybit();
  setupDonate();
  setupPromoAndCardsEvents();
  setupRandomizerUI(); // prepare confetti canvas / overlay
});

/* ================== Helpers ================== */
function bindRefs() {
  refs.cards = document.getElementById("cards");
  refs.categories = document.getElementById("categories");
  refs.search = document.getElementById("search");
  refs.bybitBtn = document.getElementById("bybit-btn");
  refs.bybitModal = document.getElementById("bybit-modal");
  refs.bybitClose = document.getElementById("bybit-close");
  refs.donateHeader = document.getElementById("donate-header");

  refs.reel = document.getElementById("reel") || null;
  refs.wordDisplay = document.getElementById("wordDisplay") || null;
  refs.spinButton = document.getElementById("spinButton") || document.getElementById("spin-btn") || document.getElementById("spin-btn-main") || null;
  refs.confettiCanvas = document.getElementById("confettiCanvas") || document.getElementById("confetti") || document.getElementById("confetti-canvas") || null;

  // overlay for result (absolute, prevents layout shift)
  refs.spinResultOverlay = document.getElementById("spin-result") || createSpinOverlay();
}

function createSpinOverlay() {
  // create overlay element if not present - absolute positioned in body top center
  const el = document.createElement("div");
  el.id = "spin-result";
  el.style.position = "fixed";
  el.style.left = "50%";
  el.style.top = "20%";
  el.style.transform = "translateX(-50%)";
  el.style.padding = "10px 18px";
  el.style.borderRadius = "10px";
  el.style.background = "rgba(0,0,0,0.6)";
  el.style.color = "#fff";
  el.style.pointerEvents = "none";
  el.style.zIndex = "9999";
  el.style.fontFamily = "system-ui, Arial";
  el.style.fontWeight = "700";
  el.style.opacity = "0";
  el.style.transition = "opacity .25s ease, transform .25s ease";
  document.body.appendChild(el);
  return el;
}

/* ================== Loaders ================== */
async function loadCasinos() {
  try {
    const res = await fetch(`${CASINOS_JSON}?v=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    casinos = await res.json();
    if (!Array.isArray(casinos)) casinos = [];
  } catch (e) {
    console.warn("Не удалось загрузить casinos JSON:", e);
    casinos = [];
  }
}

async function loadWordLists() {
  try {
    const [gRes, bRes] = await Promise.all([
      fetch(`${GOOD_WORDS_JSON}?v=${Date.now()}` , { cache: "no-store" }),
      fetch(`${BAD_WORDS_JSON}?v=${Date.now()}` , { cache: "no-store" })
    ]);
    goodWords = gRes.ok ? await gRes.json() : [];
    badWords = bRes.ok ? await bRes.json() : [];
  } catch (e) {
    console.warn("Load words failed:", e);
    goodWords = goodWords || [];
    badWords = badWords || [];
  }
}

/* ================== Categories ================== */
function buildCategories() {
  if (!refs.categories) return;
  const set = new Set();
  casinos.forEach(c => (c.categories || []).forEach(cat => set.add(cat)));
  refs.categories.innerHTML = "";
  // All button
  const allBtn = document.createElement("button");
  allBtn.className = "category-btn active";
  allBtn.dataset.cat = "Все";
  allBtn.textContent = "Все";
  refs.categories.appendChild(allBtn);

  // Only show categories that have casinos
  Array.from(set).sort().forEach(cat => {
    const b = document.createElement("button");
    b.className = "category-btn";
    b.dataset.cat = cat;
    b.textContent = cat;
    refs.categories.appendChild(b);
  });

  refs.categories.addEventListener("click", (e) => {
    const btn = e.target.closest(".category-btn");
    if (!btn) return;
    document.querySelectorAll(".category-btn").forEach(x => x.classList.remove("active"));
    btn.classList.add("active");
    filterByCategory(btn.dataset.cat);
  });
}

/* ================== Render cards ================== */
function renderCards() {
  if (!refs.cards) return;
  refs.cards.innerHTML = "";
  // if casinos is empty, render nothing (or could render sample)
  casinos.forEach(item => {
    const card = createCasinoCard(item);
    refs.cards.appendChild(card);
  });
}

/* card structure: image, title, desc, badges, promo (coupon style), play button full width */
function createCasinoCard(item) {
  const root = document.createElement("article");
  root.className = "casino-card";
  if (item.fake) root.classList.add("fake");
  root.dataset.id = item.id || "";

  // image
  const imgWrap = document.createElement("div");
  imgWrap.className = "card-img";
  const img = document.createElement("img");
  img.alt = item.name || "";
  img.src = item.image || placeholderSVG(item.name || "Казик");
  imgWrap.appendChild(img);

  // body
  const body = document.createElement("div");
  body.className = "card-body";
  const title = document.createElement("h3"); title.className = "card-title"; title.textContent = item.name || "";
  const desc = document.createElement("p"); desc.className = "card-desc"; desc.textContent = item.bonus || "";
  const badgesWrap = document.createElement("div"); badgesWrap.className = "badges";
  (item.categories || []).slice(0,3).forEach(cat => {
    const s = document.createElement("span"); s.className = "badge"; s.textContent = cat; badgesWrap.appendChild(s);
  });
  body.appendChild(title); body.appendChild(desc); body.appendChild(badgesWrap);

  // promo coupon
  const promoWrap = document.createElement("div"); promoWrap.className = "promo-wrap";
  const promoBtn = document.createElement("button");
  promoBtn.className = "promo-btn";
  promoBtn.type = "button";
  promoBtn.dataset.code = item.promo_code || "";
  promoBtn.textContent = item.promo_code || "—";
  promoWrap.appendChild(promoBtn);

  // play button
  const playBtn = document.createElement("button");
  playBtn.className = "play-btn";
  playBtn.textContent = "В игру";
  if (item.fake) {
    playBtn.dataset.fake = "true";
  } else {
    playBtn.dataset.url = item.url || "#";
    playBtn.dataset.promo = item.promo_code || "";
  }

  // assemble
  root.appendChild(imgWrap);
  root.appendChild(body);
  root.appendChild(promoWrap);
  root.appendChild(playBtn);

  // event: clicking card body (if fake) also triggers fall
  if (item.fake) {
    root.addEventListener("click", (e) => {
      if (e.target.closest(".promo-btn")) return;
      triggerScamFall(root);
    });
  }

  return root;
}

function placeholderSVG(name) {
  const txt = encodeURIComponent(name);
  return `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='600'><rect width='100%' height='100%' fill='%230b1626'/><text x='50%' y='50%' font-family='Arial' font-size='64' fill='%23fff' text-anchor='middle' dominant-baseline='middle'>${txt}</text></svg>`;
}

/* ================== Promo & Card events ================== */
function setupPromoAndCardsEvents() {
  // delegate promo click and play button clicks
  document.addEventListener("click", async (e) => {
    const promo = e.target.closest(".promo-btn");
    if (promo) {
      const code = promo.dataset.code || promo.textContent.trim();
      try {
        await navigator.clipboard.writeText(code);
        promo.classList.add("copied");
        const prev = promo.textContent;
        promo.textContent = "Скопировано";
        setTimeout(()=> { promo.textContent = prev; promo.classList.remove("copied"); }, 1200);
      } catch (err) { console.warn("copy failed", err); }
      return;
    }

    const play = e.target.closest(".play-btn");
    if (play) {
      if (play.dataset.fake === "true") {
        const card = play.closest(".casino-card");
        if (card) triggerScamFall(card);
      } else {
        const url = play.dataset.url || "#";
        const code = play.dataset.promo || "";
        if (code) {
          // try copy; then open
          try { await navigator.clipboard.writeText(code); } catch(e){}
        }
        // open in new tab
        window.open(url, "_blank", "noopener");
      }
    }
  });
}

function triggerScamFall(card) {
  if (!card) return;
  card.style.animation = "fallAway 1.2s ease forwards";
  card.style.pointerEvents = "none";
  setTimeout(()=> { try{ card.remove(); } catch(e){} }, 1400);
}

/* ================== Search (with layout correction) ================== */
const layoutMap = {
  ru_to_en: {'й':'q','ц':'w','у':'e','к':'r','е':'t','н':'y','г':'u','ш':'i','щ':'o','з':'p','х':'[','ъ':']',
             'ф':'a','ы':'s','в':'d','а':'f','п':'g','р':'h','о':'j','л':'k','д':'l','ж':';','э':'\'',
             'я':'z','ч':'x','с':'c','м':'v','и':'b','т':'n','ь':'m','б':',','ю':'.'}
};
const en_to_ru = Object.fromEntries(Object.entries(layoutMap.ru_to_en).map(([k,v]) => [v,k]));

function variantsOf(query) {
  const q = (query || "").trim().toLowerCase();
  if (!q) return [''];
  const ruToEn = q.split('').map(ch => layoutMap.ru_to_en[ch] || ch).join('');
  const enToRu = q.split('').map(ch => en_to_ru[ch] || ch).join('');
  return [q, ruToEn, enToRu];
}

function setupSearch() {
  if (!refs.search) return;
  refs.search.addEventListener("input", (e) => filterByQuery(e.target.value));
  refs.search.addEventListener("keydown", (e) => { if (e.key === "Enter") { const first = refs.cards && refs.cards.querySelector('.play-btn'); if (first) first.focus(); } });
}

function filterByCategory(cat) {
  if (!refs.cards) return;
  const cards = Array.from(refs.cards.children);
  if (cat === "Все") {
    cards.forEach(c => c.style.display = "block");
    return;
  }
  cards.forEach(card => {
    const badges = Array.from(card.querySelectorAll(".badge")).map(b => b.textContent);
    card.style.display = badges.includes(cat) ? "block" : "none";
  });
}

function filterByQuery(q) {
  if (!refs.cards) return;
  const variants = variantsOf(q);
  const cards = Array.from(refs.cards.children);
  cards.forEach(card => {
    const name = (card.querySelector('.card-title') || {}).textContent || '';
    const bonus = (card.querySelector('.card-desc') || {}).textContent || '';
    const promo = (card.querySelector('.promo-btn') || {}).dataset.code || '';
    const hay = (name + ' ' + bonus + ' ' + promo).toLowerCase();
    const match = variants.some(v => v && hay.includes(v));
    if (!q) {
      card.style.display = 'block';
    } else if (match) {
      card.style.display = 'block';
    } else {
      card.style.display = 'none';
    }
  });
}

/* ================== Autofocus ================== */
function setupAutoFocus() {
  setTimeout(()=> { try { refs.search && refs.search.focus(); refs.search && refs.search.select(); } catch(e){} }, 120);
}

/* ================== Bybit modal & donate ================== */
function setupBybit() {
  if (refs.bybitBtn && refs.bybitModal && refs.bybitClose) {
    refs.bybitBtn.addEventListener("click", ()=> refs.bybitModal.setAttribute("aria-hidden","false"));
    refs.bybitClose.addEventListener("click", ()=> refs.bybitModal.setAttribute("aria-hidden","true"));
    refs.bybitModal.addEventListener("click", (e)=> { if (e.target === refs.bybitModal) refs.bybitModal.setAttribute("aria-hidden","true"); });
  }
}

function setupDonate(){
  if (refs.donateHeader) refs.donateHeader.addEventListener("click", ()=> window.open("https://donatepay.ru/don/435213", "_blank", "noopener"));
}

/* ================== Randomizer UI & logic ================== */
function setupRandomizerUI() {
  // find reel/wordDisplay and spin button (robust)
  const reel = refs.reel || refs.wordDisplay;
  const spinBtn = refs.spinButton;

  // confetti canvas
  const confCanvas = refs.confettiCanvas;
  let confCanvasCtx = null;
  if (confCanvas) {
    confCanvasCtx = confCanvas.getContext('2d');
    resizeConfettiCanvas();
    window.addEventListener('resize', resizeConfettiCanvas);
  }

  // Audio elements (user will replace SPIN_SOUND_SRC/WIN_SOUND_SRC)
  const spinAudio = new Audio(SPIN_SOUND_SRC);
  const winAudio = new Audio(WIN_SOUND_SRC);
  // set moderate volumes; user can change
  spinAudio.volume = 0.75;
  winAudio.volume = 0.9;

  // main spin function (shows goodWords quickly, then final from badWords at center)
  async function spinHandler() {
    if (isSpinning) return;
    isSpinning = true;
    // ensure words loaded
    if (!goodWords.length || !badWords.length) {
      await loadWordLists();
    }
    // user gesture -> allow audio play
    try { spinAudio.currentTime = 0; await spinAudio.play(); } catch(e){ /* ignore */ }

    // Decide timings
    const duration = 5000; // 5s total
    const frames = 80;     // visual updates
    // We'll schedule updates at times t_i = easeOutCubic(i/frames) * duration
    const times = [];
    for (let i=0;i<frames;i++) {
      times.push(Math.round(easeOutCubic(i/(frames-1)) * duration));
    }

    // schedule showing good words at all times except final
    let timers = [];
    for (let i=0;i<times.length;i++) {
      const showTime = times[i];
      const timer = setTimeout(() => {
        if (!reel) {
          // fallback to overlay
          refs.spinResultOverlay.textContent = getRandomFromArray(goodWords);
          refs.spinResultOverlay.style.opacity = "1";
          refs.spinResultOverlay.style.transform = "translateX(-50%) scale(1)";
        } else {
          // write into reel or wordDisplay
          if (typeof reel === 'string') {
            // impossible but leave safe guard
          } else {
            reel.textContent = getRandomFromArray(goodWords);
          }
        }
      }, showTime);
      timers.push(timer);
    }

    // final show after duration + small gap: choose from badWords only
    const finalTimer = setTimeout(async () => {
      // stop spin audio
      try { spinAudio.pause(); spinAudio.currentTime = 0; } catch(e){}
      // final word from bad list (honest)
      const finalWord = getRandomFromArray(badWords);
      if (!reel) {
        refs.spinResultOverlay.textContent = finalWord;
        refs.spinResultOverlay.style.opacity = "1";
        refs.spinResultOverlay.style.transform = "translateX(-50%) scale(1.05)";
      } else {
        reel.textContent = finalWord;
        // add highlight class on reel if exists
        reel.classList && reel.classList.add("final-word");
      }
      // show non-layout-shifting overlay message "Поздравляю!"
      showSpinResultOverlay("Поздравляю!");
      // play win sound
      try { winAudio.currentTime = 0; await winAudio.play(); } catch(e){}
      // confetti
      if (confCanvasCtx) {
        launchConfetti(confCanvas, confCanvasCtx);
      }
      // cleanup highlight after short time
      setTimeout(()=> {
        if (reel && reel.classList) reel.classList.remove("final-word");
        hideSpinResultOverlay();
        isSpinning = false;
      }, 1800);
    }, duration + 60);
    timers.push(finalTimer);

    // safety: if user navigates away etc, clear timers after done + plus margin
    setTimeout(()=> timers.forEach(t => clearTimeout(t)), duration + 3000);
  }

  if (spinBtn) spinBtn.addEventListener("click", spinHandler);
}

/* ================== Confetti (simple particle burst) ================== */
function resizeConfettiCanvas() {
  const canvas = refs.confettiCanvas;
  if (!canvas) return;
  canvas.width = canvas.offsetWidth || window.innerWidth;
  canvas.height = canvas.offsetHeight || 300;
}

function launchConfetti(canvas, ctx) {
  if (!canvas || !ctx) return;
  const particles = [];
  const count = 120;
  for (let i=0;i<count;i++){
    particles.push({
      x: canvas.width/2 + (Math.random()-0.5)*200,
      y: canvas.height/3,
      vx: (Math.random()-0.5)*6,
      vy: Math.random()*6 + 2,
      r: Math.random()*6 + 2,
      color: `hsl(${Math.floor(Math.random()*360)},80%,60%)`,
      life: 2000 + Math.random()*800
    });
  }
  const start = performance.now();
  function frame(now){
    const dt = now - start;
    ctx.clearRect(0,0,canvas.width, canvas.height);
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.12; // gravity
      ctx.beginPath();
      ctx.fillStyle = p.color;
      ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      ctx.fill();
    });
    // stop after life
    if (performance.now() - start < 2400) requestAnimationFrame(frame);
    else setTimeout(()=> ctx.clearRect(0,0,canvas.width, canvas.height), 80);
  }
  requestAnimationFrame(frame);
}

/* ================== Utilities ================== */
function getRandomFromArray(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return "";
  return arr[Math.floor(Math.random()*arr.length)];
}
function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

/* overlay helpers (avoids layout shift) */
function showSpinResultOverlay(text) {
  const el = refs.spinResultOverlay;
  el.textContent = text || "";
  el.style.opacity = "1";
  el.style.transform = "translateX(-50%) scale(1.03)";
}
function hideSpinResultOverlay() {
  const el = refs.spinResultOverlay;
  el.style.opacity = "0";
  el.style.transform = "translateX(-50%) scale(0.98)";
}

/* ================== End ================== */

/* Note:
   - Ensure your HTML contains IDs/classes matching: #cards, #categories, #search, #bybit-btn, #bybit-modal, #bybit-close, #donate-header
   - Randomizer UI expects either a #reel element or #wordDisplay element, and a #spinButton button. Also a confetti canvas with id confettiCanvas helps visuals.
   - Replace SPIN_SOUND_SRC and WIN_SOUND_SRC with actual mp3 URLs; the code uses Audio() and will play on user click.
   - If you want the overlay "Поздравляю!" text placed elsewhere, edit createSpinOverlay() or provide an element with id="spin-result" in HTML.
*/

