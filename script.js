document.addEventListener('DOMContentLoaded', async () => {
  const cardsContainer = document.getElementById('cards');
  const searchInput = document.getElementById('search');
  const categoriesContainer = document.getElementById('categories');
  const bybitBtn = document.getElementById('bybit-btn');
  const bybitModal = document.getElementById('bybit-modal');
  const bybitClose = document.getElementById('bybit-close');
  const spinBtn = document.getElementById('spin-btn');
  const spinResult = document.getElementById('spin-result');
  const spinCountEl = document.getElementById('spin-count');
  const reel = document.getElementById('reel');
  const confCanvas = document.getElementById('confetti-canvas');
  const donateBtn = document.getElementById('donate-header');

  let spinCount = 0;
  let casinos = [];
  let categories = new Set();
  let currentCategory = 'Все';
  let muted = false;
  const prizes = ["Нихуя", "Ничего", "0", "Ноль", "Неа", "Йух", "No", "Error", "Жаль", "Нет.", "Сори", "Плак плак", ":'("];

  // --- Звук ---
  const spinSound = new Audio('https://cdn.pixabay.com/download/audio/2022/03/15/audio_3a5e414cc1.mp3?filename=wheel-spin-2-102600.mp3');
  spinSound.volume = 0.3;

  // --- Фокус на поиск при загрузке ---
  searchInput.focus();

  // --- Загрузка данных ---
  try {
    const res = await fetch(`data/casinos.json?v=${Date.now()}`);
    casinos = await res.json();
    renderCards(casinos);
    renderCategories(casinos);
  } catch (err) {
    console.error('Ошибка загрузки JSON', err);
  }

  // --- Рендер категорий ---
  function renderCategories(list) {
    categories.clear();
    list.forEach(c => c.categories && c.categories.forEach(cat => categories.add(cat)));
    categoriesContainer.innerHTML = '';
    const allBtn = document.createElement('button');
    allBtn.className = 'cat-btn active';
    allBtn.textContent = 'Все';
    allBtn.onclick = () => filterByCategory('Все');
    categoriesContainer.appendChild(allBtn);
    [...categories].forEach(cat => {
      const btn = document.createElement('button');
      btn.className = 'cat-btn';
      btn.textContent = cat;
      btn.onclick = () => filterByCategory(cat);
      categoriesContainer.appendChild(btn);
    });
  }

  // --- Фильтр по категории ---
  function filterByCategory(cat) {
    currentCategory = cat;
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.toggle('active', b.textContent === cat));
    renderCards(casinos);
  }

  // --- Поиск ---
  searchInput.addEventListener('input', () => renderCards(casinos));

  // --- Рендер карточек ---
  function renderCards(list) {
    const query = normalize(searchInput.value);
    cardsContainer.innerHTML = '';

    const filtered = list.filter(c => {
      const matchCategory = currentCategory === 'Все' || (c.categories && c.categories.includes(currentCategory));
      const matchSearch = normalize(c.name).includes(query) || normalize(c.promo_code).includes(query);
      return matchCategory && matchSearch;
    });

    filtered.forEach(c => {
      const card = document.createElement('div');
      card.className = 'casino-card neon-card';
      if (c.fake) card.classList.add('fake');

      card.innerHTML = `
        <div class="card-img"><img src="${c.image}" alt="${c.name}"></div>
        <div class="card-body">
          <h3 class="card-title">${c.name}</h3>
          <p class="card-desc">${c.bonus}</p>
          <div class="promo-wrap">
            <button class="promo-btn" data-code="${c.promo_code || ''}">${c.promo_code || '—'}</button>
          </div>
          <button class="play-btn" ${c.fake ? 'data-fake="true"' : `data-url="${c.url}"`}>В игру</button>
        </div>
      `;
      cardsContainer.appendChild(card);
    });

    attachCardEvents();
  }

  function normalize(str) {
    return (str || '').toLowerCase()
      .replace(/[а-яё]/g, ch => ({'ё':'e'}[ch] || ch))
      .replace(/[a-z]/g, ch => ({'e':'ё'}[ch] || ch));
  }

  // --- События карточек ---
  function attachCardEvents() {
    document.querySelectorAll('.promo-btn').forEach(btn => {
      btn.onclick = e => {
        const code = e.currentTarget.dataset.code;
        if (code) {
          navigator.clipboard.writeText(code).then(() => {
            e.currentTarget.classList.add('copied');
            setTimeout(() => e.currentTarget.classList.remove('copied'), 1000);
          });
        }
      };
    });

    document.querySelectorAll('.play-btn').forEach(btn => {
      if (btn.dataset.fake === 'true') {
        btn.onclick = e => {
          const card = e.currentTarget.closest('.casino-card');
          card.classList.add('fall');
          setTimeout(() => card.remove(), 2000);
        };
      } else {
        btn.onclick = e => {
          const url = e.currentTarget.dataset.url;
          const codeEl = e.currentTarget.parentElement.querySelector('.promo-btn');
          const code = codeEl ? codeEl.dataset.code : '';
          if (code) navigator.clipboard.writeText(code);
          window.open(url, '_blank');
        };
      }
    });
  }

  // --- BYBIT модалка ---
  bybitBtn.onclick = () => bybitModal.classList.add('show');
  bybitClose.onclick = () => bybitModal.classList.remove('show');
  bybitModal.addEventListener('click', e => {
    if (e.target === bybitModal) bybitModal.classList.remove('show');
  });

  // --- DONATE ---
  donateBtn.onclick = () => window.open('https://donatepay.ru/don/435213', '_blank');

  // --- Рандомайзер ---
  const ctx = confCanvas.getContext('2d');
  const confetti = window.confetti.create(confCanvas, { resize: true });

  spinBtn.onclick = async () => {
    if (spinBtn.disabled) return;
    spinBtn.disabled = true;
    spinResult.textContent = '';
    spinCount++;
    spinCountEl.textContent = `Попыток: ${spinCount}`;

    if (!document.getElementById('mute').checked) {
      spinSound.currentTime = 0;
      spinSound.play().catch(() => {});
    }

    // Создаем имитацию "барабана"
    reel.innerHTML = '';
    const sequence = [];
    for (let i = 0; i < 40; i++) {
      sequence.push(prizes[Math.floor(Math.random() * prizes.length)]);
    }
    sequence.forEach(word => {
      const el = document.createElement('div');
      el.className = 'reel-item';
      el.textContent = word;
      reel.appendChild(el);
    });

    // Анимация прокрутки
    reel.style.transition = 'none';
    reel.style.transform = 'translateY(0)';
    void reel.offsetWidth;

    const total = sequence.length * 80; // высота элементов
    const endPos = total - 80 - Math.floor(Math.random() * 80);
    reel.style.transition = 'transform 3.2s cubic-bezier(0.1, 0.9, 0.3, 1)';
    reel.style.transform = `translateY(-${endPos}px)`;

    // После окончания
    setTimeout(() => {
      const final = sequence[sequence.length - 1];
      spinResult.textContent = 'Поздравляю!';
      spinResult.classList.add('win');
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.3 } });
      spinBtn.disabled = false;
      setTimeout(() => spinResult.classList.remove('win'), 1500);
    }, 3400);
  };
});
