// === Настройки ===
const wordDisplay = document.getElementById("wordDisplay");
const spinButton = document.getElementById("spinButton");
const confettiCanvas = document.getElementById("confettiCanvas");
const spinSound = document.getElementById("spinSound");
const winSound = document.getElementById("winSound");

let goodWords = [];
let failWords = [];
let isSpinning = false;

// === Загрузка данных ===
async function loadWords() {
  const [goodRes, failRes] = await Promise.all([
    fetch("/data/goodWords.json"),
    fetch("/data/failWords.json"),
  ]);
  goodWords = await goodRes.json();
  failWords = await failRes.json();
}

// === Конфетти ===
const ctx = confettiCanvas.getContext("2d");
let confetti = [];
function initConfetti() {
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
}
window.addEventListener("resize", initConfetti);
initConfetti();

function createConfetti() {
  for (let i = 0; i < 150; i++) {
    confetti.push({
      x: Math.random() * confettiCanvas.width,
      y: Math.random() * confettiCanvas.height - confettiCanvas.height,
      r: Math.random() * 6 + 2,
      d: Math.random() * 0.5,
    });
  }
}
function drawConfetti() {
  ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  confetti.forEach((c) => {
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2, true);
    ctx.fill();
  });
  moveConfetti();
}
function moveConfetti() {
  confetti.forEach((c) => {
    c.y += c.d * 5;
    if (c.y > confettiCanvas.height) {
      c.y = -10;
      c.x = Math.random() * confettiCanvas.width;
    }
  });
}
function animateConfetti() {
  drawConfetti();
  requestAnimationFrame(animateConfetti);
}
animateConfetti();

// === Перелистывание слов ===
function shuffleArray(arr) {
  return arr.sort(() => Math.random() - 0.5);
}

function getRandomWord(list) {
  return list[Math.floor(Math.random() * list.length)];
}

async function spinWords() {
  if (isSpinning) return;
  isSpinning = true;
  spinButton.disabled = true;

  spinSound.currentTime = 0;
  spinSound.play();

  // Смешиваем оба списка
  const mixedList = shuffleArray([...goodWords, ...failWords]);

  let duration = 5000; // общее время перелистывания
  let step = 0;
  let totalSteps = 50;
  let lastTimestamp = 0;

  function animate(timestamp) {
    if (!lastTimestamp) lastTimestamp = timestamp;
    const progress = timestamp - lastTimestamp;

    if (progress > duration / totalSteps) {
      const word = mixedList[step % mixedList.length];
      wordDisplay.textContent = word;
      lastTimestamp = timestamp;
      step++;
    }

    // замедление к концу
    if (step < totalSteps) {
      requestAnimationFrame(animate);
    } else {
      // эффект завершения
      winSound.currentTime = 0;
      winSound.play();
      createConfetti();
      setTimeout(() => {
        confetti = [];
      }, 3000);
      isSpinning = false;
      spinButton.disabled = false;
    }
  }

  requestAnimationFrame(animate);
}

// === События ===
window.addEventListener("load", loadWords);
spinButton.addEventListener("click", spinWords);
