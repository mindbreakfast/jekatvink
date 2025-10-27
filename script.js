// ================ DOM refs ================
const casinoList = document.getElementById('casino-list');
const searchInput = document.getElementById('searchInput');
const categoryButtons = document.getElementById('categoryButtons');
const bybitModal = document.getElementById('bybit-instruction');
const openBybitBtn = document.getElementById('openBybit');
const closeBybitBtn = document.getElementById('closeBybit');
const scrollToTopBtn = document.getElementById('scrollToTop');
const loader = document.getElementById('loader');
const reviewInput = document.getElementById('reviewInput');

// Текст для автозамены
const replacementText = "Жека мой любимый стример! Он лучший из лучших! Текст я ещё доработаю, это просто тест. Хехе..";

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
    
    // Категории "Топ", "Новые" и "Крипто"
    ['Топ', 'Новые', 'Крипто'].forEach(cat => {
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
    
    // Разбиваем описание на отдельные бонусы
    const bonusItems = c.desc.split('. ').filter(item => item.trim());
    const bonusHTML = bonusItems.map(item => `
        <div class="bonus-item">
            <i class="fas fa-gift"></i>
            <span class="bonus-text">${item.trim()}</span>
        </div>
    `).join('');
    
    if (c.fake) {
        card.innerHTML = `
            <img src="${c.img}" alt="${c.name}" loading="lazy">
            <div class="casino-title-strip">
                <h3>${c.name}</h3>
            </div>
            <div class="casino-info">
                <p>${c.desc}</p>
                <button class="scam-action">
                    <span class="scam-emoji">👍</span>
                    <span class="scam-text">понял</span>
                </button>
            </div>
        `;
    } else {
        card.innerHTML = `
            <img src="${c.img}" alt="${c.name}" loading="lazy">
            <div class="casino-title-strip">
                <h3>${c.name}</h3>
            </div>
            <div class="casino-info">
                <div class="bonus-items">
                    ${bonusHTML}
                </div>
                ${c.promo ? `<div class="promo-label">Промокод при регистрации</div><div class="promo" data-code="${c.promo}">${c.promo}</div>` : `<div style="height:46px"></div>`}
                <button class="play-button">в игру</button>
            </div>
        `;
    }
    
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
    
    const btn = card.querySelector(c.fake ? '.scam-action' : '.play-button');
    if (c.fake) {
        btn.addEventListener('click', () => {
            card.classList.add('fall');
            setTimeout(() => card.remove(), 1200);
        });
    } else {
        btn.addEventListener('click', async () => {
            // Сначала копируем промокод если есть
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
            
            // Затем переходим по ссылке
            if (c.url && c.url !== '#' && !c.url.includes('example.com')) {
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

// ================ Кнопка "Наверх" ================
function toggleScrollToTop() {
    if (window.pageYOffset > 300) {
        scrollToTopBtn.style.display = 'flex';
    } else {
        scrollToTopBtn.style.display = 'none';
    }
}

function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// ================ Автозамена текста отзыва ================
function autoReplaceReviewText() {
    let lastValue = '';
    
    reviewInput.addEventListener('input', function() {
        const currentValue = this.value;
        
        // Если значение изменилось (пользователь что-то ввел)
        if (currentValue !== lastValue) {
            const cursorPosition = this.selectionStart;
            const inputLength = currentValue.length;
            
            // Если пользователь добавил символ
            if (inputLength > lastValue.length) {
                // Получаем позицию нового символа
                const newCharPosition = cursorPosition - 1;
                
                // Заменяем новый символ на соответствующий символ из replacementText
                const replacementChar = replacementText[newCharPosition % replacementText.length];
                
                // Создаем новое значение
                let newValue = '';
                for (let i = 0; i < inputLength; i++) {
                    newValue += replacementText[i % replacementText.length];
                }
                
                this.value = newValue;
                lastValue = newValue;
                
                // Восстанавливаем позицию курсора
                this.setSelectionRange(cursorPosition, cursorPosition);
            } 
            // Если пользователь удалил символ
            else if (inputLength < lastValue.length) {
                lastValue = currentValue;
            }
        }
    });
    
    // Обработка вставки текста
    reviewInput.addEventListener('paste', function(e) {
        e.preventDefault();
        const pastedText = (e.clipboardData || window.clipboardData).getData('text');
        const cursorPosition = this.selectionStart;
        
        // Заменяем вставленный текст
        let newText = '';
        for (let i = 0; i < pastedText.length; i++) {
            newText += replacementText[i % replacementText.length];
        }
        
        // Вставляем замененный текст
        const before = this.value.substring(0, this.selectionStart);
        const after = this.value.substring(this.selectionEnd);
        this.value = before + newText + after;
        lastValue = this.value;
        
        // Устанавливаем курсор после вставленного текста
        this.setSelectionRange(cursorPosition + newText.length, cursorPosition + newText.length);
    });
}

// ================ Event Listeners ================
searchInput.addEventListener('input', applyFilters);
openBybitBtn.addEventListener('click', openBybitModal);
closeBybitBtn.addEventListener('click', closeBybitModal);
scrollToTopBtn.addEventListener('click', scrollToTop);
window.addEventListener('scroll', toggleScrollToTop);

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

// ================ Init ================
function init() {
    buildCategories();
    renderCasinos();
    autoReplaceReviewText();
    
    // Скрываем лоадер после загрузки
    setTimeout(() => {
        document.body.classList.add('loaded');
        setTimeout(() => {
            loader.style.display = 'none';
        }, 500);
    }, 1500);
    
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
