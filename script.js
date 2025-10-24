// ================== Render casinos ==================
function createCard(c) {
    const card = document.createElement('div'); 
    card.className = 'casino-card';
    if (c.fake) card.classList.add('scam');
    card.dataset.categories = (c.categories||[]).join(' ');
    
    // Определяем, нужен ли перенос текста для хинта
    const hintText = c.hint || 'Отличный выбор!';
    const hintClass = hintText.length > 25 ? 'casino-hint multiline' : 'casino-hint';
    
    if (c.fake) {
        card.innerHTML = `
            <div class="${hintClass}">${hintText}</div>
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
            <div class="${hintClass}">${hintText}</div>
            <img src="${c.img}" alt="${c.name}" loading="lazy">
            <div class="casino-title-strip">
                <h3>${c.name}</h3>
            </div>
            <div class="casino-info">
                <p>${c.desc}</p>
                ${c.promo ? `<div class="promo-label">Промокод при регистрации</div><div class="promo" data-code="${c.promo}">${c.promo}</div>` : `<div style="height:46px"></div>`}
                <button class="play-button">в игру</button>
            </div>
        `;
    }
    
    // Остальной код без изменений...
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
