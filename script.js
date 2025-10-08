// === JekaVipBonus Script ===

// Загружаем JSON со словами
let goodWords = [];
let failWords = [];

async function loadWords() {
  try {
    const goodRes = await fetch('/data/goodWords.json');
    const failRes = await fetch('/data/failWords.json');
    goodWords = await goodRes.json();
    failWords = await failRes.json();
  } catch (e) {
    console.error('Ошибка загрузки JSON:', e);
  }
}
loadWords();

// ==== Звуки ====
const spinSound = new Audio('https://cdn.jsdelivr.net/gh/jhancock532/audiofx/spin.mp3');
const stopSound = new Audio('https://cdn.jsdelivr.net/gh/jhancock532/audiofx/click.mp3');

// ==== Рандомайзер ====
const reel = document.getElementById('reel');
const spinButton = document.getElementById('spinButton');
const spinResult = document.getElementById('spinResult');
const confettiCanvas = document.getElementById('confetti');
const confettiCtx = confettiCanvas.getContext('2d');

let spinning = false;

spinButton.addEventListener('click', async () => {
  if (spinning) return;
  spinning = true;
  spinResult.textContent = '';
  spinResult.classList.remove('win');
  reel.innerHTML = '';

  await loadWords();

  const words = goodWords.length ? goodWords : ["Пусто"];
  let currentIndex = 0;
  let duration = 7000; // чуть дольше — +2 сек
  let interval = 60;
  let startTime = Date.now();

  spinSound.currentTime = 0;
  spinSound.volume = 0.8;
  spinSound.play();

  const spinInterval = setInterval(() => {
    let word = words[currentIndex % words.length];
    reel.innerHTML = `<div class="reel-item">${word}</div>`;
    currentIndex++;
    let elapsed = Date.now() - startTime;
    if (elapsed > duration) {
      clearInterval(spinInterval);
      showResult();
    } else if (elapsed > duration * 0.6) {
      interval += 5;
    }
  }, interval);
});

function showResult() {
  const fail = failWords.length ? failWords[Math.floor(Math.random() * failWords.length)] : "ничего";
  reel.innerHTML = `<div class="reel-item" style="font-size:30px;color:#ff2ee8;text-shadow:0 0 15px #ff2ee8;">${fail}</div>`;
  stopSound.currentTime = 0;
  stopSound.volume = 0.9;
  stopSound.play();
  spinResult.textContent = "Поздравляю!";
  spinResult.classList.add('win');
  launchConfetti();
  setTimeout(() => spinning = false, 2000);
}

// ==== Конфетти ====
function launchConfetti() {
  const confettiCount = 80;
  const confetti = [];

  confettiCanvas.width = confettiCanvas.offsetWidth;
  confettiCanvas.height = confettiCanvas.offsetHeight;

  for (let i = 0; i < confettiCount; i++) {
    confetti.push({
      x: Math.random() * confettiCanvas.width,
      y: Math.random() * confettiCanvas.height - confettiCanvas.height,
      size: Math.random() * 6 + 2,
      speed: Math.random() * 3 + 2,
      color: `hsl(${Math.random() * 360}, 100%, 60%)`
    });
  }

  let frame;
  function draw() {
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    confetti.forEach(c => {
      confettiCtx.fillStyle = c.color;
      confettiCtx.fillRect(c.x, c.y, c.size, c.size);
      c.y += c.speed;
      if (c.y > confettiCanvas.height) c.y = -10;
    });
    frame = requestAnimationFrame(draw);
  }
  draw();
  setTimeout(() => cancelAnimationFrame(frame), 2500);
}

// ==== Промокоды на карточках ====
document.addEventListener('click', e => {
  const promo = e.target.closest('.promo-btn');
  if (!promo) return;
  const code = promo.textContent.trim();
  navigator.clipboard.writeText(code);
  promo.classList.add('copied');
  promo.textContent = 'Скопировано!';
  setTimeout(() => {
    promo.textContent = code;
    promo.classList.remove('copied');
  }, 1500);
});

// ==== Фейк-казик падение ====
document.addEventListener('click', e => {
  const card = e.target.closest('.casino-card.fake');
  const btn = e.target.closest('.play-btn');
  if (card && btn) {
    card.classList.add('fall');
    setTimeout(() => card.remove(), 1500);
  }
});
