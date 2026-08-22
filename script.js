// 1. بيانات اللاعب ونظام المستويات
let user = {
    name: "لاعب مجهول",
    username: "@guest",
    points: 1000,
    level: 1,
    xp: 0,
    photo: "https://via.placeholder.com/50",
    sound: true
};

const xpNeeded = (level) => level * 100; // كل مستوى يحتاج XP أكثر
let currentBet = 100;

// 2. تهيئة التلغرام
document.addEventListener("DOMContentLoaded", () => {
    const tg = window.Telegram?.WebApp;
    if (tg && tg.initDataUnsafe?.user) {
        const u = tg.initDataUnsafe.user;
        user.name = u.first_name;
        user.username = u.username ? "@" + u.username : "";
        if (u.photo_url) user.photo = u.photo_url;
    }
    updateUI();
    generateLeaderboard();
});

function updateUI() {
    document.getElementById("u-name").textContent = user.name;
    document.getElementById("u-points").textContent = user.points.toLocaleString();
    document.getElementById("u-level").textContent = `المستوى: ${user.level} (${user.xp}/${xpNeeded(user.level)} XP)`;
    document.getElementById("u-photo").src = user.photo;
}

function addXP(amount) {
    user.xp += amount;
    if (user.xp >= xpNeeded(user.level)) {
        user.xp -= xpNeeded(user.level);
        user.level++;
        alert(`🎉 مبروك! وصلت للمستوى ${user.level}`);
    }
    updateUI();
}

function switchStage(stageId) {
    document.querySelectorAll(".stage").forEach(s => s.classList.remove("active"));
    document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
    document.getElementById(stageId).classList.add("active");
    event.currentTarget.classList.add("active"); // تفعيل الزر المضغوط
}

// 3. نظام الهدايا والأكواد
function claimDailyReward() {
    const lastClaim = localStorage.getItem("dailyReward");
    const now = new Date().getTime();
    if (lastClaim && now - lastClaim < 86400000) {
        return alert("⏳ لقد استلمت الهدية اليوم! عد غداً.");
    }
    user.points += 500;
    addXP(50);
    localStorage.setItem("dailyReward", now);
    updateUI();
    alert("🎁 حصلت على 500 نقطة و 50 XP!");
}

function showPromoModal() {
    const code = prompt("أدخل كود الهدية (جرب الكود: PLAY2026):");
    if (code === "PLAY2026") {
        if(localStorage.getItem("promo_PLAY2026")) return alert("تم استخدام الكود مسبقاً!");
        user.points += 2000;
        localStorage.setItem("promo_PLAY2026", "true");
        updateUI();
        alert("🎟️ كود صحيح! حصلت على 2000 نقطة.");
    } else if (code) {
        alert("❌ الكود غير صحيح أو منتهي الصلاحية.");
    }
}

// 4. محرك الألعاب الشامل
function openGame(gameType) {
    let betStr = prompt("أدخل قيمة الرهان (الحد الأدنى 100):", "100");
    let bet = parseInt(betStr);
    if (isNaN(bet) || bet < 100 || bet > user.points) return alert("مبلغ غير صحيح أو نقاطك لا تكفي!");
    
    currentBet = bet;
    user.points -= bet; // خصم الرهان
    updateUI();
    
    document.getElementById("current-bet-display").textContent = currentBet;
    const container = document.getElementById("game-container");
    container.innerHTML = ""; // تصفير الساحة
    
    switchStage('sec-game');

    if (gameType === 'xo') initXO(container);
    if (gameType === 'rps') initRPS(container);
    if (gameType === 'soccer') initSoccer(container);
}

function winGame(multiplier = 2) {
    const winAmount = currentBet * multiplier;
    user.points += winAmount;
    addXP(currentBet * 0.5); // XP بناءً على الرهان
    updateUI();
    alert(`🎉 فزت! كسبت ${winAmount} نقطة.`);
    switchStage('sec-home');
}

function loseGame() {
    alert("💀 خسرت الجولة! حظاً أوفر.");
    switchStage('sec-home');
}

function drawGame() {
    user.points += currentBet; // استرجاع الرهان
    updateUI();
    alert("🤝 تعادل! تم استرجاع نقاطك.");
    switchStage('sec-home');
}

// --- لعبة XO (ضد الذكاء الاصطناعي) ---
let xoBoard = [];
function initXO(container) {
    xoBoard = ['', '', '', '', '', '', '', '', ''];
    let grid = document.createElement("div");
    grid.className = "xo-board";
    for (let i = 0; i < 9; i++) {
        let cell = document.createElement("div");
        cell.className = "xo-cell";
        cell.onclick = () => {
            if (xoBoard[i] === '') {
                xoBoard[i] = 'X';
                cell.textContent = 'X';
                cell.style.color = '#ff2a6d';
                checkXOWinner();
            }
        };
        grid.appendChild(cell);
    }
    container.appendChild(grid);
}

function checkXOWinner() {
    const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    let xWin = wins.some(w => w.every(i => xoBoard[i] === 'X'));
    if (xWin) return setTimeout(winGame, 300);
    
    let empty = xoBoard.map((v, i) => v === '' ? i : null).filter(v => v !== null);
    if (empty.length === 0) return setTimeout(drawGame, 300);

    // AI Move
    let aiMove = empty[Math.floor(Math.random() * empty.length)];
    xoBoard[aiMove] = 'O';
    let cells = document.getElementsByClassName("xo-cell");
    cells[aiMove].textContent = 'O';
    cells[aiMove].style.color = '#05d9e8';
    
    let oWin = wins.some(w => w.every(i => xoBoard[i] === 'O'));
    if (oWin) return setTimeout(loseGame, 300);
}

// --- لعبة حجرة ورقة مقص ---
function initRPS(container) {
    container.innerHTML = `
        <h3 style="margin-bottom:20px;">اختر سلاحك:</h3>
        <div>
            <button class="game-btn" onclick="playRPS('rock')">🪨</button>
            <button class="game-btn" onclick="playRPS('paper')">📜</button>
            <button class="game-btn" onclick="playRPS('scissors')">✂️</button>
        </div>
        <div id="rps-result" class="game-result"></div>
    `;
}
function playRPS(playerChoice) {
    const choices = ['rock', 'paper', 'scissors'];
    const aiChoice = choices[Math.floor(Math.random() * 3)];
    const resDiv = document.getElementById("rps-result");
    
    const emojis = {rock:'🪨', paper:'📜', scissors:'✂️'};
    resDiv.innerHTML = `أنت: ${emojis[playerChoice]} | الخصم: ${emojis[aiChoice]}<br>`;
    
    setTimeout(() => {
        if (playerChoice === aiChoice) return drawGame();
        if ((playerChoice === 'rock' && aiChoice === 'scissors') || 
            (playerChoice === 'paper' && aiChoice === 'rock') || 
            (playerChoice === 'scissors' && aiChoice === 'paper')) {
            winGame();
        } else {
            loseGame();
        }
    }, 1000);
}

// --- لعبة ضربات الجزاء ---
function initSoccer(container) {
    container.innerHTML = `
        <h3 style="margin-bottom:20px;">أين ستسدد الكرة؟</h3>
        <div>
            <button class="game-btn" onclick="playSoccer('left')">⬅️</button>
            <button class="game-btn" onclick="playSoccer('center')">⬆️</button>
            <button class="game-btn" onclick="playSoccer('right')">➡️</button>
        </div>
        <div id="soccer-result" class="game-result"></div>
    `;
}
function playSoccer(direction) {
    const directions = ['left', 'center', 'right'];
    const keeperDive = directions[Math.floor(Math.random() * 3)];
    const resDiv = document.getElementById("soccer-result");
    
    resDiv.innerHTML = `الحارس قفز إلى: ${keeperDive === 'left' ? '⬅️' : keeperDive === 'right' ? '➡️' : '⬆️'}<br>`;
    
    setTimeout(() => {
        if (direction !== keeperDive) winGame(2.5); // نسبة فوز أعلى هنا
        else loseGame();
    }, 1000);
}

// 5. قائمة المتصدرين الوهمية (حتى يتم ربطها بقاعدة بيانات)
function generateLeaderboard() {
    const lb = document.getElementById("leaderboard-list");
    const players = ["أحمد (LVL 12)", "سارة (LVL 10)", "Ali (LVL 8)"];
    players.forEach((p, i) => {
        lb.innerHTML += `<div class="task-item"><strong>${i+1}. ${p}</strong> <span>🏆</span></div>`;
    });
}

function toggleSound() {
    user.sound = !user.sound;
    document.getElementById("btn-sound").textContent = user.sound ? "مفعل ✅" : "معطل ❌";
}
