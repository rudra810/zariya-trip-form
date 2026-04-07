const GRID_SIZE = 5;
const TOTAL_TILES = GRID_SIZE * GRID_SIZE;
const TOTAL_GEMS = 12;
const DISCOUNT_PER_GEM = 2.5;
const MAX_DISCOUNT = TOTAL_GEMS * DISCOUNT_PER_GEM;

const boardEl = document.getElementById("board");
const amountInput = document.getElementById("amount");
const statusEl = document.getElementById("status");
const startBtn = document.getElementById("startBtn");
const cashoutBtn = document.getElementById("cashoutBtn");

const openedGemsEl = document.getElementById("openedGems");
const discountRateEl = document.getElementById("discountRate");
const originalAmountEl = document.getElementById("originalAmount");
const discountValueEl = document.getElementById("discountValue");
const discountedAmountEl = document.getElementById("discountedAmount");
const mineSound = new Audio("assets/Fahhh- sound effect (HD) - HighQualitySFX (128k).mp3");
mineSound.preload = "auto";

let board = [];
let amount = 0;
let gemsOpened = 0;
let gameActive = false;

function money(value) {
  return `₹${value.toFixed(2)}`;
}

function getDiscountData() {
  const discountRate = Math.min(gemsOpened * DISCOUNT_PER_GEM, MAX_DISCOUNT);
  const discountValue = (amount * discountRate) / 100;
  const discountedAmount = amount - discountValue;

  return { discountRate, discountValue, discountedAmount };
}

function updateStats() {
  const { discountRate, discountValue, discountedAmount } = getDiscountData();

  openedGemsEl.textContent = `${gemsOpened} / ${TOTAL_GEMS}`;
  discountRateEl.textContent = `${discountRate}%`;
  originalAmountEl.textContent = money(amount);
  discountValueEl.textContent = money(discountValue);
  discountedAmountEl.textContent = money(discountedAmount);
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildBoard() {
  board = Array(TOTAL_GEMS)
    .fill("gem")
    .concat(Array(TOTAL_TILES - TOTAL_GEMS).fill("mine"));
  shuffle(board);

  boardEl.innerHTML = "";

  board.forEach((_, idx) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "tile";
    button.dataset.index = String(idx);
    button.setAttribute("aria-label", `Tile ${idx + 1}`);
    boardEl.appendChild(button);
  });
}

function revealAllMines() {
  const tiles = boardEl.querySelectorAll(".tile");
  tiles.forEach((tile, idx) => {
    if (tile.classList.contains("revealed")) return;
    if (board[idx] === "mine") {
      tile.classList.add("revealed", "mine", "locked");
      tile.textContent = "✖";
    } else {
      tile.classList.add("locked");
    }
  });
}

function endRound(message) {
  gameActive = false;
  statusEl.textContent = message;
  cashoutBtn.disabled = true;

  const tiles = boardEl.querySelectorAll(".tile");
  tiles.forEach((tile) => tile.classList.add("locked"));
}

function startRound() {
  const parsedAmount = Number(amountInput.value);
  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    statusEl.textContent = "Enter a valid amount greater than 0.";
    return;
  }

  amount = parsedAmount;
  gemsOpened = 0;
  gameActive = true;
  cashoutBtn.disabled = false;
  buildBoard();
  updateStats();
  statusEl.textContent =
    "Round started: open tiles. Each gem gives 2.5% discount (up to 30%).";
}

function cashoutDiscount() {
  if (!gameActive) return;

  const { discountRate, discountedAmount } = getDiscountData();
  endRound(
    `Discount confirmed at ${discountRate}%. Final amount: ${money(discountedAmount)}.`
  );
}

function onTileClick(event) {
  const tile = event.target.closest(".tile");
  if (!tile || !gameActive) return;
  if (tile.classList.contains("revealed")) return;

  const idx = Number(tile.dataset.index);
  const type = board[idx];

  tile.classList.add("revealed");

  if (type === "gem") {
    gemsOpened += 1;
    tile.classList.add("gem");
    tile.textContent = "◆";
    updateStats();

    if (gemsOpened === TOTAL_GEMS) {
      endRound("Perfect! You found all 12 gems and reached the 30% max discount.");
      return;
    }

    statusEl.textContent =
      "Gem found! Discount increased by 2.5%. Keep opening or use Discount Out.";
    return;
  }

  tile.classList.add("mine");
  tile.textContent = "✖";
  mineSound.currentTime = 0;
  mineSound.play().catch(() => {});
  revealAllMines();
  endRound("Mine hit. Round ended.");
}

startBtn.addEventListener("click", startRound);
cashoutBtn.addEventListener("click", cashoutDiscount);
boardEl.addEventListener("click", onTileClick);

updateStats();
buildBoard();
