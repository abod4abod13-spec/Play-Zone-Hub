let user = JSON.parse(localStorage.getItem("pz_user")) || {
    id: "guest",
    name: "مستخدم تجريبي",
    username: "@guest",
    points: 1000,
    level: 1,
    xp: 0,
    photo: "https://via.placeholder.com/50",
    inventory: []
};
let settings = JSON.parse(localStorage.getItem("pz_settings")) || { dailyReward: 500 };
let currentBet = 100;
let isAdminUnlocked = false;

const xpNeeded = (level) => level * 100;

document.addEventListener("DOMContentLoaded", () => {
    const tg = window.Telegram?.WebApp;
    if (tg && tg.initDataUnsafe?.user) {
        const u = tg.initDataUnsafe.user;
        user.name = u.first_name || user.name;
        user.username = u.username ? `@${u.username}` : user.username;
        if (u.photo_url) user.photo = u.photo_url;
    }
    updateUI();
});

function saveData() {
    localStorage.setItem("pz_user", JSON.stringify(user));
    localStorage.setItem("pz_settings", JSON.stringify(settings));
    updateUI();
}

function updateUI() {
    const isVip = user.inventory.includes('vip');
    document.getElementById("u-name").textContent = isVip ? `👑 ${user.name}` : user.name;
    document.getElementById("u-name").style.color = isVip ? "var(--gold)" : "#fff";
    document.getElementById("u-points").textContent = user.points.toLocaleString();
    document.getElementById("u-level").textContent = `المستوى: ${user.level} (${user.xp}/${xpNeeded(user.level)} XP)`;
    if (document.getElementById("u-photo")) document.getElementById("u-photo").src = user.photo;
}

function switchStage(stageId) {
    document.querySelectorAll(".stage").forEach(s => s.classList.remove("active"));
    document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
    
    document.getElementById(stageId).classList.add("active");
}

// --- الهدايا والأكواد ---
function claimDailyReward() {
    const lastClaim = localStorage.getItem("pz_daily");
    const now = new Date().getTime();
    if (lastClaim && now - lastClaim < 86400000) {
        const hoursLeft = Math.ceil((86400000 - (now - lastClaim)) / 3600000);
        return alert(`⏳ الهدية غير متاحة. عد بعد ${hoursLeft} ساعة.`);
    }
    user.points += settings.dailyReward;
    user.xp += 50;
    if (user.xp >= xpNeeded(user.level)) { user.level++; user.xp = 0; }
    localStorage.setItem("pz_daily", now);
    saveData();
    alert(`🎁 مبروك! حصلت على ${settings.dailyReward} نقطة.`);
}

function usePromoCode() {
    const code = prompt("أدخل كود الهدية:");
    if (!code) return;
    
    const codeValue = localStorage.getItem(`promo_${code.toUpperCase()}`);
    if (codeValue) {
        if(localStorage.getItem(`used_promo_${code.toUpperCase()}`)) return alert("❌ تم استخدام هذا الكود مسبقاً!");
        const amount = parseInt(codeValue);
        user.points += amount;
        localStorage.setItem(`used_promo_${code.toUpperCase()}`, "true");
        saveData();
        alert(`🎟️ كود صحيح! تمت إضافة ${amount} نقطة.`);
    } else {
        alert("❌ الكود غير صحيح أو منتهي الصلاحية.");
    }
}

// --- المتجر ---
function buyItem(itemId, price) {
    if (user.inventory.includes(itemId) && itemId !== 'shield') {
        return alert("❌ أنت تملك هذا العنصر بالفعل!");
    }
    if (user.points >= price) {
        user.points -= price;
        user.inventory.push(itemId);
        saveData();
        alert("✅ تم الشراء بنجاح!");
    } else {
        alert("💀 نقاطك لا تكفي لإتمام الشراء.");
    }
}

// --- محرك الألعاب ---
function getWinProbability() {
    const diff = document.getElementById("game-difficulty").value;
    if (diff === 'easy') return 0.8;
    if (diff === 'medium') return 0.5;
    return 0.2;
}

function openGame(gameType) {
    let betStr = prompt("أدخل قيمة الرهان (الحد الأدنى 100):", "100");
    let bet = parseInt(betStr);
    if (isNaN(bet) || bet < 100 || bet > user.points) return alert("❌ مبلغ غير صحيح أو نقاطك غير كافية!");
    
    currentBet = bet;
    user.points -= bet; 
    saveData();
    
    document.getElementById("current-bet-display").textContent = currentBet;
    const container = document.getElementById("game-container");
    container.innerHTML = ""; 
    switchStage('sec-game');

    if (gameType === 'xo') initXO(container);
    if (gameType === 'rps') initRPS(container);
    if (gameType === 'soccer') initSoccer(container);
}

function handleWin(multiplier = 2) {
    let winAmount = currentBet * multiplier;
    if (user.inventory.includes('double_xp')) winAmount *= 2;
    user.points += winAmount;
    user.xp += currentBet * 0.5;
    if (user.xp >= xpNeeded(user.level)) { user.level++; user.xp = 0; }
    saveData();
    alert(`🎉 فزت! كسبت ${winAmount} نقطة.`);
    switchStage('sec-home');
}

function handleLose() {
    if (user.inventory.includes('shield')) {
        alert("🛡️ درع الخسارة حماك من فقدان النقاط! تم استرجاع رهانك.");
        user.points += currentBet;
        const index = user.inventory.indexOf('shield');
        if (index > -1) user.inventory.splice(index, 1);
        saveData();
    } else {
        alert("💀 خسرت الجولة! حظاً أوفر.");
    }
    switchStage('sec-home');
}

// ضربات الجزاء
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
        const isWin = Math.random() < getWinProbability() ? (direction !== keeperDive) : false;
        if (isWin) handleWin(2.5);
        else handleLose();
    }, 1200);
}

// حجرة ورقة مقص
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
        if (playerChoice === aiChoice) {
            user.points += currentBet; saveData();
            alert("🤝 تعادل! تم استرجاع نقاطك.");
            switchStage('sec-home');
        } else {
            const isWin = Math.random() < getWinProbability();
            if (isWin) handleWin(2);
            else handleLose();
        }
    }, 1200);
}

// XO
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
                cell.style.color = 'var(--primary)';
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
    if (xWin) return setTimeout(() => handleWin(2), 500);
    
    let empty = xoBoard.map((v, i) => v === '' ? i : null).filter(v => v !== null);
    if (empty.length === 0) {
        user.points += currentBet; saveData();
        return setTimeout(() => { alert("🤝 تعادل!"); switchStage('sec-home'); }, 500);
    }

    let aiMove = empty[Math.floor(Math.random() * empty.length)];
    xoBoard[aiMove] = 'O';
    let cells = document.getElementsByClassName("xo-cell");
    cells[aiMove].textContent = 'O';
    cells[aiMove].style.color = 'var(--secondary)';
    
    let oWin = wins.some(w => w.every(i => xoBoard[i] === 'O'));
    if (oWin) return setTimeout(handleLose, 500);
}

// --- لوحة التحكم والإدارة (منشطة بالكامل) ---
function openAdminPanel() {
    if (isAdminUnlocked) {
        switchStage('sec-admin');
        renderAdminUsers();
        return;
    }
    
    const pass = prompt("🔑 أدخل كلمة مرور المطور للوصول للوحة التحكم:");
    if (pass === "HAJJA84040@$@(ishs") {
        isAdminUnlocked = true;
        switchStage('sec-admin');
        renderAdminUsers();
    } else {
        alert("⛔ كلمة المرور غير صحيحة!");
    }
}

function generatePromoCode() {
    const code = prompt("أدخل اسم الكود الجديد:");
    const amount = parseInt(prompt("كم عدد النقاط لهذا الكود؟"));
    if (code && amount) {
        localStorage.setItem(`promo_${code.toUpperCase()}`, amount);
        alert(`✅ تم إنشاء الكود: ${code.toUpperCase()}\nالهدية: ${amount} نقطة.`);
    }
}

function setDailyRewardAmount() {
    const amount = parseInt(prompt("أدخل قيمة الهدية اليومية الجديدة:"));
    if (amount) {
        settings.dailyReward = amount;
        saveData();
        alert(`✅ تم تغيير مبلغ الهدية إلى ${amount} نقطة.`);
    }
}

function renderAdminUsers() {
    const list = document.getElementById("admin-users-list");
    const mockUsers = [
        { id: "1", name: "علي", username: "@ali", points: 15000, level: 5 },
        { id: "2", name: "محمد", username: "@mo", points: 8000, level: 3 }
    ];
    list.innerHTML = mockUsers.map(u => `
        <div class="shop-item" style="flex-direction:column; align-items:flex-start; gap:10px;">
            <div><strong>${u.name}</strong> (${u.username})<br><small>المستوى: ${u.level} | 🟡 ${u.points.toLocaleString()}</small></div>
            <div style="display:flex; gap:8px; width:100%;">
                <button class="btn-secondary" style="padding:6px; font-size:0.75rem;" onclick="alert('تمت إضافة النقاط')">➕ إضافة نقاط</button>
                <button class="btn-primary" style="padding:6px; font-size:0.75rem; background:red;" onclick="alert('تم حظر اللاعب')">🚫 حظر</button>
            </div>
        </div>
    `).join('');
}
