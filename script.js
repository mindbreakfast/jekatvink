// ---------- ГЛАВНЫЕ ДАННЫЕ ----------
const casinos = [
  { name: "Вавада", desc: "Тот самый, но шуточный.", promo: "VAVADA2025", category: ["Топ"], img: "https://via.placeholder.com/400x150?text=Вавада", link: "#" },
  { name: "Стейк", desc: "Для тех, кто любит ставки на мясо.", promo: "STEAKFUN", category: ["Топ"], img: "https://via.placeholder.com/400x150?text=Стейк", link: "#" },
  { name: "Водка", desc: "Отдохни с душой и бонусом.", promo: "SHOT777", category: ["Прикол"], img: "https://via.placeholder.com/400x150?text=Водка", link: "#" },
  { name: "Буй", desc: "Корабль удачи поднимает паруса.", promo: "BUOYLUCK", category: ["Топ"], img: "https://via.placeholder.com/400x150?text=Буй", link: "#" },
  { name: "ПлейФортуна", desc: "Играй с улыбкой, не на деньги.", promo: "FORTUNAJOY", category: ["Топ"], img: "https://via.placeholder.com/400x150?text=ПлейФортуна", link: "#" },
  { name: "ДжойКазино", desc: "Веселье без депозита (и смысла).", promo: "JOYHAPPY", category: ["Топ"], img: "https://via.placeholder.com/400x150?text=ДжойКазино", link: "#" },
  { name: "Скам", desc: "Никакого скама! Только честный фейк.", promo: "NONE", category: ["Фейк"], img: "https://via.placeholder.com/400x150?text=SCAM", link: "#" }
];

// ---------- РЕНДЕРИНГ КАРТОЧЕК ----------
const casinoList = document.getElementById("casino-list");
const searchInput = document.getElementById("searchInput");
const categoryButtons = document.getElementById("categoryButtons");

function renderCasinos(filter = "") {
  const filtered = casinos.filter(c => c.name.toLowerCase().includes(filter.toLowerCase()));
  casinoList.innerHTML = "";

  filtered.forEach(c => {
    const card = document.createElement("div");
    card.className = "casino-card";

    card.innerHTML = `
      <img src="${c.img}" alt="${c.name}">
      <div class="casino-info">
        <h3>${c.name}</h3>
        <p>${c.desc}</p>
        <div class="promo" data-code="${c.promo}">${c.promo}</div>
        <button class="play-button"${c.name === "Скам" ? "" : ` onclick="openCasino('${c.link}','${c.promo}')"`}>
          ${c.name === "Скам" ? "в игру" : "в игру"}
        </button>
      </div>
    `;

    if (c.name === "Скам") {
      card.querySelector(".play-button").addEventListener("click", () => {
        card.style.transition = "transform 1s ease, opacity 1s ease";
        card.style.transform = "rotate(90deg) translateY(100px)";
        card.style.opacity = "0";
        setTimeout(() => card.remove(), 1000);
      });
    }

    card.querySelector(".promo").addEventListener("click", e => {
      const code = e.target.dataset.code;
      navigator.clipboard.writeText(code);
      e.target.innerText = "Скопировано!";
      setTimeout(() => e.target.innerText = code, 1500);
    });

    casinoList.appendChild(card);
  });
}

searchInput.addEventListener("input", e => {
  renderCasinos(e.target.value);
});

renderCasinos();

// ---------- РАНДОМАЙЗЕР ----------
let goodList = [];
let badList = [];

fetch("/good.json").then(r => r.json()).then(data => goodList = data);
fetch("/bad.json").then(r => r.json()).then(data => badList = data);

const slotDisplay = document.getElementById("slotDisplay");
const startButton = document.getElementById("startRandomizer");

let isAnimating = false;

startButton.addEventListener("click", () => {
  if (isAnimating) return;
  isAnimating = true;

  const spinDuration = 6000; // длительность 6 сек
  const start = performance.now();

  function spin(timestamp) {
    const progress = timestamp - start;
    const easing = Math.pow(progress / spinDuration, 0.7);
    const index = Math.floor(Math.random() * goodList.length);
    slotDisplay.textContent = goodList[index];
    if (progress < spinDuration) {
      requestAnimationFrame(spin);
    } else {
      const finalWord = badList[Math.floor(Math.random() * badList.length)];
      slotDisplay.textContent = finalWord;
      isAnimating = false;
      // Конфетти или звук можно добавить здесь
    }
  }
  requestAnimationFrame(spin);
});

// ---------- BYBIT ----------
const bybitSection = document.getElementById("bybit-instruction");
const closeBybit = document.getElementById("closeBybit");
if (closeBybit) closeBybit.addEventListener("click", () => bybitSection.classList.add("hidden"));

// ---------- ПОДДЕЛЬНОЕ ОТКРЫТИЕ ----------
function openCasino(link, promo) {
  navigator.clipboard.writeText(promo);
  window.open(link, "_blank");
}

// ---------- ДЕРЕВЬЯ ----------
const leftTree = document.getElementById("leftTree");
const rightTree = document.getElementById("rightTree");

function drawTree(canvas, mirrored = false) {
  const ctx = canvas.getContext("2d");
  let branches = [];
  const baseX = mirrored ? canvas.width - 20 : 20;
  const baseY = canvas.height - 10;

  function growBranch(x, y, length, angle, depth) {
    if (depth > 5) return;
    const endX = x + length * Math.cos(angle);
    const endY = y - length * Math.sin(angle);
    branches.push({ x, y, endX, endY, depth });
    const nextLength = length * (0.7 + Math.random() * 0.1);
    const leftAngle = angle + (0.3 + Math.random() * 0.2);
    const rightAngle = angle - (0.3 + Math.random() * 0.2);
    growBranch(endX, endY, nextLength, leftAngle, depth + 1);
    growBranch(endX, endY, nextLength, rightAngle, depth + 1);
  }

  growBranch(baseX, baseY, 50, Math.PI / 2, 0);

  let progress = 0;
  const growStart = performance.now();
  function animateGrow(timestamp) {
    const elapsed = timestamp - growStart;
    progress = Math.min(elapsed / 10000, 1);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = "round";

    branches.forEach((b, i) => {
      const visible = i / branches.length < progress;
      if (visible) {
        ctx.strokeStyle = "#6b4e2e";
        ctx.lineWidth = 6 - b.depth;
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(b.endX, b.endY);
        ctx.stroke();

        // Монетки на концах
        if (b.depth > 4 && Math.random() < 0.05) {
          ctx.beginPath();
          ctx.arc(b.endX, b.endY, 4, 0, Math.PI * 2);
          ctx.fillStyle = "#f6c75a";
          ctx.fill();
        }
      }
    });

    if (progress < 1) requestAnimationFrame(animateGrow);
  }

  requestAnimationFrame(animateGrow);
}

drawTree(leftTree, false);
drawTree(rightTree, true);
