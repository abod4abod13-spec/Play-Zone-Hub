// --- 1. إعدادات السيرفر والبيانات ---
// ضع هنا رابط الاستضافة التي يعمل عليها كود البايثون (مثال: https://your-bot-app.onrender.com)
const API_URL = "http://localhost:5000"; 

let user = JSON.parse(localStorage.getItem("pz_user")) || {
    id: "guest",
    name: "لاعب مجهول",
    username: "@guest",
    points: 1000,
    level: 1,
    xp: 0,
    photo: "https://via.placeholder.com/50",
    inventory: []
};
let settings = JSON.parse(localStorage.getItem("pz_settings")) || { dailyReward: 500 };
let currentBet = 100;

const xpNeeded = (level) => level * 100;

// --- 2. الربط المباشر مع تليجرام وسيرفر البايثون ---
document.addEventListener("DOMContentLoaded", async () => {
    const tg = window.Telegram?.WebApp;
    if (tg) tg.expand();

    if (tg && tg.initDataUnsafe?.user) {
        const u = tg.initDataUnsafe.user;
        user.id = str(u.id);
        user.name = u.first_name || user.name;
        user.username = u.username ? `@${u.username}` : user.username;
        if (u.photo_url) user.photo = u.photo_url;
        
        // جلب البيانات الحقيقية من الباك إند (Python)
        await fetchUserDataFromBackend(user.id);
    }
    updateUI();
});

// دالة جلب البيانات من سيرفر البايثون
async function fetchUserDataFromBackend(userId) {
    try {
        const res = await fetch(`${API_URL}/api/get_user?user_id=${userId}`);
        if (res.ok) {
            const data = await res.json();
            if (data.status === "success") {
                user.points = data.data.points ?? user.points;
                user.level = data.data.level ?? user.level;
                user.xp = data.data.xp ?? user.xp;
                user.inventory = data.data.inventory || [];
                saveDataLocally();
            }
        }
    } catch (e) {
        console.log("تعذر الاتصال بالباك إند، يتم استخدام الحفظ المحلي حالياً.");
    }
}

// دالة حفظ البيانات في المتصفح والسيرفر معاً
async function saveData() {
    saveDataLocally();
    updateUI();

    // إرسال البيانات المحدثة إلى سيرفر البايثون في الخلفية
    if (user.id !== "guest") {
        try {
            await fetch(`${API_URL}/api/update_user`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    user_id: user.id,
                    points: user.points,
                    level: user.level,
                    xp: user.xp,
                    inventory: user.inventory
                })
            });
        } catch (e) {
            console.log("خطأ في تحديث البيانات على السيرفر.");
        }
    }
}

function saveDataLocally() {
    localStorage.setItem("pz_user", JSON.stringify(user));
    localStorage.setItem("pz_settings", JSON.stringify(settings));
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
    document.getElementById(stageId).classList.add("active");
}

// --- 3. الهدايا والأكواد ---
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

// --- 4. المتجر والمشتريات ---
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

// --- 5. منطق الألعاب ومستويات الصعوبة ---
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

// لعبة ضربات الجزاء
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

// لعبة حجرة ورقة مقص
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

// لعبة XO
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

// --- 6. لوحة تحكم المطور والتحكم بالكامل ---
function openAdminPanel() {
    const pass = prompt("أدخل كلمة مرور المطور:");
    if (pass === "HAJJA84040@$@(ishs") {
        switchStage('sec-admin');
        renderAdminUsers();
    } else {
        alert("⛔ وصول مرفوض! كلمة المرور غير صحيحة.");
    }
}

function generatePromoCode() {
    const code = prompt("أدخل اسم الكود الجديد (مثال: HAJJA2026):");
    const amount = parseInt(prompt("كم عدد النقاط التي سيعطيها هذا الكود؟"));
    if (code && amount) {
        localStorage.setItem(`promo_${code.toUpperCase()}`, amount);
        alert(`✅ تم إنشاء الكود بنجاح!\nالكود: ${code.toUpperCase()}\nالهدية: ${amount} نقطة.`);
    }
}

function setDailyRewardAmount() {
    const amount = parseInt(prompt("أدخل قيمة الهدية اليومية الجديدة:"));
    if (amount) {
        settings.dailyReward = amount;
        saveData();
        alert(`✅ تم تغيير مبلغ الهدية اليومية إلى ${amount} نقطة.`);
    }
}

function renderAdminUsers() {
    const list = document.getElementById("admin-users-list");
    const mockUsers = [
        { id: "1", name: "أحمد", username: "@ahmed", points: 25000, level: 8 },
        { id: "2", name: "سارة", username: "@sara", points: 12000, level: 4 }
    ];

    list.innerHTML = mockUsers.map(u => `
        <div class="shop-item" style="flex-direction:column; align-items:flex-start; gap:10px;">
            <div><strong>${u.name}</strong> (${u.username})<br><small>المستوى: ${u.level} | 🟡 ${u.points.toLocaleString()}</small></div>
            <div style="display:flex; gap:8px; width:100%;">
                <button class="btn-secondary" style="padding:6px; font-size:0.75rem;" onclick="adminAddPoints('${u.name}')">➕ إضافة نقاط</button>
                <button class="btn-secondary" style="padding:6px; font-size:0.75rem;" onclick="adminDeductPoints('${u.name}')">➖ سحب نقاط</button>
                <button class="btn-primary" style="padding:6px; font-size:0.75rem; background:red;" onclick="adminBanUser('${u.name}')">🚫 حظر</button>
            </div>
        </div>
    `).join('');
}

function adminAddPoints(name) {
    const amount = prompt(`كم نقطة تريد إضافتها للاعب ${name}؟`);
    if(amount) alert(`✅ تمت إضافة ${amount} نقطة للاعب ${name}.`);
}

function adminDeductPoints(name) {
    const amount = prompt(`كم نقطة تريد سحبها من اللاعب ${name}؟`);
    if(amount) alert(`✅ تم سحب ${amount} نقطة من اللاعب ${name}.`);
}

function adminBanUser(name) {
    if(confirm(`هل أنت تأكد من حظر ${name}؟`)) {
        alert(`🚨 تم حظر اللاعب ${name} بنجاح.`);
    }
}
