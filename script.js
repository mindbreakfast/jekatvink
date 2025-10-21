// ================ DOM refs ================
const casinoList = document.getElementById('casino-list');
const searchInput = document.getElementById('searchInput');
const categoryButtons = document.getElementById('categoryButtons');
const bybitModal = document.getElementById('bybit-instruction');
const openBybitBtn = document.getElementById('openBybit');
const closeBybitBtn = document.getElementById('closeBybit');

// ================== Render casinos ==================
function buildCategories() {
    const cats = new Set();
    CASINOS.forEach(c => (c.categories||[]).forEach(cat => cats.add(cat)));
    categoryButtons.innerHTML = '';
    
    const allBtn = document.createElement('button'); 
    allBtn.className = 'cat-btn active'; 
    allBtn.textContent = 'Все'; 
    allBtn.dataset.cat = 'all'; 
    categoryButtons.appendChild(allBtn);
    
    // Только категории "Топ" и "Новые"
    ['Топ', 'Новые'].forEach(cat => {
        if (cats.has(cat)) {
            const b = document.createElement('button'); 
            b.className = 'cat-btn'; 
            b.textContent = cat; 
            b.dataset.cat = cat; 
            categoryButtons.appendChild(b);
        }
    });
    
    categoryButtons.addEventListener('click', e => {
        const btn = e.target.closest('button'); 
        if (!btn) return;
        categoryButtons.querySelectorAll('button').forEach(x => x.classList.remove('active'));
        btn.classList.add('active');
        applyFilters();
    });
}

function createCard(c) {
    const card = document.createElement('div'); 
    card.className = 'casino-card';
    if (c.fake) card.classList.add('scam');
    card.dataset.categories = (c.categories||[]).join(' ');
    
    card.innerHTML = `
        <img src="${c.img}" alt="${c.name}" loading="lazy">
        <div class="casino-info">
            <h3>${c.name}</h3>
            <p>${c.desc}</p>
            ${c.promo ? `<div class="promo" data-code="${c.promo}">${c.promo}</div>` : `<div style="height:46px"></div>`}
            <button class="play-button">${c.name === 'СКАМ' || c.fake ? 'в игру' : 'в игру'}</button>
        </div>
    `;
    
    // Обработчики событий
    const promoEl = card.querySelector('.promo');
    if (promoEl) {
        promoEl.addEventListener('click', async (ev) => {
            const code = promoEl.dataset.code || promoEl.textContent;
            try { 
                await navigator.clipboard.writeText(code); 
                promoEl.classList.add('copied'); 
                promoEl.textContent = 'Скопировано!'; 
                setTimeout(() => { 
                    promoEl.classList.remove('copied'); 
                    promoEl.textContent = code; 
                }, 1500); 
            } catch(e) {
                // Fallback для старых браузеров
                const textArea = document.createElement('textarea');
                textArea.value = code;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                promoEl.classList.add('copied'); 
                promoEl.textContent = 'Скопировано!'; 
                setTimeout(() => { 
                    promoEl.classList.remove('copied'); 
                    promoEl.textContent = code; 
                }, 1500);
            }
            ev.stopPropagation();
        });
    }
    
    const btn = card.querySelector('.play-button');
    if (c.fake || c.name.toLowerCase().includes('скам')) {
        btn.addEventListener('click', () => {
            card.classList.add('fall');
            setTimeout(() => card.remove(), 1200);
        });
    } else {
        btn.addEventListener('click', async () => {
            if (c.promo) { 
                try { 
                    await navigator.clipboard.writeText(c.promo);
                } catch(e) {
                    const textArea = document.createElement('textarea');
                    textArea.value = c.promo;
                    document.body.appendChild(textArea);
                    textArea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textArea);
                } 
            }
            if (c.url && c.url !== '#') {
                window.open(c.url, '_blank', 'noopener,noreferrer');
            }
        });
    }
    return card;
}

function renderCasinos(list = CASINOS) {
    casinoList.innerHTML = '';
    list.forEach(c => casinoList.appendChild(createCard(c)));
}

// ================ Filters & Search ================
function variantsOf(q) {
    q = (q||'').toLowerCase();
    if (!q) return [''];
    const map = {
        'й':'q','ц':'w','у':'e','к':'r','е':'t','н':'y','г':'u','ш':'i','щ':'o','з':'p',
        'х':'[','ъ':']','ф':'a','ы':'s','в':'d','а':'f','п':'g','р':'h','о':'j','л':'k',
        'д':'l','ж':';','э':"'",'я':'z','ч':'x','с':'c','м':'v','и':'b','т':'n','ь':'m',
        'б':',','ю':'.'
    };
    const enToRu = Object.fromEntries(Object.entries(map).map(([k,v]) => [v,k]));
    const ruEn = q.split('').map(c => map[c] || c).join('');
    const enRu = q.split('').map(c => enToRu[c] || c).join('');
    return [q, ruEn, enRu];
}

function applyFilters() {
    const activeBtn = categoryButtons.querySelector('.active');
    const cat = activeBtn ? activeBtn.dataset.cat : 'all';
    const q = searchInput.value.trim().toLowerCase();
    const vars = variantsOf(q);
    
    Array.from(casinoList.children).forEach(card => {
        const title = (card.querySelector('h3') || {}).textContent.toLowerCase();
        const desc = (card.querySelector('p') || {}).textContent.toLowerCase();
        const promo = (card.querySelector('.promo') || {}).dataset.code || '';
        const hay = (title + ' ' + desc + ' ' + promo).toLowerCase();
        const matchQ = !q || vars.some(v => v && hay.includes(v));
        const cats = (card.dataset.categories || '').toLowerCase().split(/\s+/);
        const matchCat = (cat === 'all') || cats.includes(cat.toLowerCase());
        card.style.display = (matchQ && matchCat) ? 'block' : 'none';
    });
}

// ================ Modal Management ================
function openBybitModal() {
    bybitModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeBybitModal() {
    bybitModal.classList.add('hidden');
    document.body.style.overflow = '';
}

// ================ Event Listeners ================
searchInput.addEventListener('input', applyFilters);
openBybitBtn.addEventListener('click', openBybitModal);
closeBybitBtn.addEventListener('click', closeBybitModal);

// Закрытие модалки по клику вне её области
bybitModal.addEventListener('click', (e) => {
    if (e.target === bybitModal) {
        closeBybitModal();
    }
});

// Закрытие модалки по ESC
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !bybitModal.classList.contains('hidden')) {
        closeBybitModal();
    }
});

// ================ Эффект шлейфа за курсором ================
function createCursorTrail() {
    const trail = document.createElement('div');
    trail.className = 'cursor-trail';
    document.body.appendChild(trail);

    const glow = document.createElement('div');
    glow.className = 'cursor-glow';
    document.body.appendChild(glow);

    let mouseX = 0;
    let mouseY = 0;
    let trailTimeout;

    const coinSymbols = ['🪙', '💰', '💎', '⭐', '✦', '♠', '♥', '♦', '♣'];
    
    function updateGlow(x, y) {
        glow.style.left = x + 'px';
        glow.style.top = y + 'px';
    }

    function createTrailElement(x, y) {
        // Случайный выбор между монетой и частицей
        if (Math.random() > 0.3) {
            // Создаем монету
            const coin = document.createElement('div');
            coin.className = 'cursor-coin';
            coin.textContent = coinSymbols[Math.floor(Math.random() * coinSymbols.length)];
            coin.style.left = x + 'px';
            coin.style.top = y + 'px';
            coin.style.fontSize = (Math.random() * 8 + 14) + 'px';
            
            trail.appendChild(coin);
            
            setTimeout(() => {
                if (coin.parentNode === trail) {
                    trail.removeChild(coin);
                }
            }, 1500);
        } else {
            // Создаем частицу
            const particle = document.createElement('div');
            particle.className = 'cursor-particle';
            particle.style.left = x + 'px';
            particle.style.top = y + 'px';
            particle.style.background = `hsl(${40 + Math.random() * 10}, 70%, 55%)`;
            particle.style.width = (Math.random() * 4 + 4) + 'px';
            particle.style.height = particle.style.width;
            
            trail.appendChild(particle);
            
            setTimeout(() => {
                if (particle.parentNode === trail) {
                    trail.removeChild(particle);
                }
            }, 1000);
        }
    }

    function handleMouseMove(e) {
        mouseX = e.clientX;
        mouseY = e.clientY;
        
        updateGlow(mouseX, mouseY);
        trail.style.opacity = '1';
        
        clearTimeout(trailTimeout);
        trailTimeout = setTimeout(() => {
            trail.style.opacity = '0';
        }, 100);
    }

    function handleMouseLeave() {
        trail.style.opacity = '0';
        glow.style.opacity = '0';
    }

    function handleMouseEnter() {
        trail.style.opacity = '1';
        glow.style.opacity = '1';
    }

    // Создаем элементы шлейфа с интервалом
    let trailInterval = setInterval(() => {
        if (trail.style.opacity === '1') {
            createTrailElement(mouseX, mouseY);
        }
    }, 50);

    // Обработчики событий
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);

    // Активация при клике - больше частиц
    document.addEventListener('click', (e) => {
        for (let i = 0; i < 8; i++) {
            setTimeout(() => {
                createTrailElement(
                    e.clientX + (Math.random() - 0.5) * 30,
                    e.clientY + (Math.random() - 0.5) * 30
                );
            }, i * 50);
        }
    });

    // Остановка анимации когда страница не видна
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            clearInterval(trailInterval);
        } else {
            trailInterval = setInterval(() => {
                if (trail.style.opacity === '1') {
                    createTrailElement(mouseX, mouseY);
                }
            }, 50);
        }
    });
}

// ================ Init ================
function init() {
    buildCategories();
    renderCasinos();
    createCursorTrail();
    
    // Фокус на поиск
    setTimeout(() => { 
        try { 
            searchInput.focus(); 
        } catch(e) {} 
    }, 100);
}
// Запуск при загрузке DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
