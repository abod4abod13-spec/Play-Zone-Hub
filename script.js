const SERVER_URL = "https://your-server-domain.com"; // رابط سيرفرك الحقيفي
const socket = io(SERVER_URL);

let currentUser = { id: null, name: "زائر", points: 0 };
let currentBet = 100;
let currentGame = null;
let turnTimer = null;

// التهيئة من Telegram Mini App
const tg = window.Telegram?.WebApp;
if (tg) {
    tg.expand();
    if (tg.initDataUnsafe?.user) {
        const u = tg.initDataUnsafe.user;
        currentUser.id = u.id;
        currentUser.name = u.first_name;
        document.getElementById("u-name").textContent = u.first_name;
        document.getElementById("u-avatar").textContent = u.first_name[0];
        
        // تسجيل المستخدم في السيرفر وتمرير بياناته
        socket.emit("register_user", { tgId: u.id, name: u.first_name, initData: tg.initData });
    }
}

function switchTab(tabId) {
    document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
}

function openBetModal(gameType) {
    currentGame = gameType;
    document.getElementById("selected-game-title").textContent = `رهان لعبة: ${gameType.toUpperCase()}`;
    switchTab("sec-bet");
}

function selectBet(amount) {
    if (currentUser.points < amount) {
        alert("عذراً! لا تمتلك نقاط كافية للعب هذا الرهان ❌");
        return;
    }
    currentBet = amount;
    alert(`تم اختيار رهان ${amount} نقطة ✅`);
}

function startMatchmaking() {
    switchTab("sec-game");
    socket.emit("find_match", { userId: currentUser.id, game: currentGame, bet: currentBet });
}

// استقبال بدء اللعبة والمؤقت
socket.on("match_start", (data) => {
    document.getElementById("player-1-name").textContent = data.p1.name;
    document.getElementById("player-2-name").textContent = data.p2.name;
    start15SecTimer();
});

function start15SecTimer() {
    let timeLeft = 15;
    document.getElementById("game-timer").textContent = timeLeft;
    clearInterval(turnTimer);
    
    turnTimer = setInterval(() => {
        timeLeft--;
        document.getElementById("game-timer").textContent = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(turnTimer);
            socket.emit("turn_timeout"); // انتهاء الوقت وفقدان الدور
        }
    }, 1000);
}

socket.on("update_user_data", (data) => {
    currentUser.points = data.points;
    document.getElementById("u-points").textContent = data.points;
});
