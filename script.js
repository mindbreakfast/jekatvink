const display = document.getElementById("wordDisplay");
const button = document.getElementById("spinButton");
const confCanvas = document.getElementById("confettiCanvas");
const confCtx = confCanvas.getContext("2d");

let goodWords = [];
let badWords = [];

let confetti = [];
let spinning = false;

// Загрузка JSON файлов
async function loadWords() {
  try {
    const [goodRes, badRes] = await Promise.all([
      fetch("/goodWords.json"),
      fetch("/badWords.json")
    ]);
    goodWords = await goodRes.json();
    badWords = await badRes.json();
  } catch (e) {
    console.error("Ошибка загрузки списков:", e);
  }
}

// Звук
const spinSound = new Audio("/sounds/spin.mp3");
const winSound = new Audio("/sounds/win.mp3");

// Настройка холста конфетти
function resizeCanvas() {
  confCanvas.width = window.innerWidth;
  confCanvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// Функция создания конфетти
function createConfetti() {
  confetti = Array.from({ length: 100 }, () => ({
    x: Math.random() * confCanvas.width,
    y: Math.random() * -confCanvas.height,
    r: Math.random() * 6 + 2,
    d: Math.random() * 0.5 + 0.5,
    color: `hsl(${Math.random() * 360}, 100%, 60%)`
  }));
}

// Анимация конфетти
function drawConfetti() {
  confCtx.clearRect(0, 0, confCanvas.width, confCanvas.height);
  confetti.forEach(p => {
    confCtx.beginPath();
    confCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    confCtx.fillStyle = p.color;
    confCtx.fill();
  });
  updateConfetti();
  requestAnimationFrame(drawConfetti);
}

function updateConfetti() {
  confetti.forEach(p => {
    p.y += p.d * 6;
    if (p.y > confCanvas.height) {
      p.y = Math.random() * -50;
      p.x = Math.random() * confCanvas.width;
    }
  });
}

// Рандомайзер
async function spin() {
  if (spinning) return;
  spinning = true;

  spinSound.currentTime = 0;
  spinSound.play();

  let time = 0;
  const duration = 5000; // 5 секунд
  let lastTime = performance.now();
  let resultWord = badWords[Math.floor(Math.random() * badWords.length)];
  let frame = () => {
    const now = performance.now();
    const delta = now - lastTime;
    lastTime = now;
    time += delta;

    // скорость убывает к концу
    const progress = time / duration;
    const speed = 50 + 2500 * (1 - progress) ** 2;

    if (Math.random() < delta / speed) {
      display.textContent =
        goodWords[Math.floor(Math.random() * goodWords.length)];
    }

    if (time < duration) {
      requestAnimationFrame(frame);
    } else {
      // Завершение
      display.textContent = resultWord;
      display.classList.add("highlight");
      setTimeout(() => display.classList.remove("highlight"), 1500);
      winSound.currentTime = 0;
      winSound.play();
      createConfetti();
      setTimeout(() => (spinning = false), 1000);
    }
  };
  requestAnimationFrame(frame);
}

// Подсветка при выигрыше
const style = document.createElement("style");
style.innerHTML = `
  .highlight {
    color: #ff4081 !important;
    text-shadow: 0 0 20px #ff4081, 0 0 40px #ff4081;
    transform: scale(1.1);
    transition: all 0.4s ease;
  }
`;
document.head.appendChild(style);

// Запуск
window.addEventListener("DOMContentLoaded", async () => {
  await loadWords();
  createConfetti();
  drawConfetti();
  button.addEventListener("click", spin);
});
