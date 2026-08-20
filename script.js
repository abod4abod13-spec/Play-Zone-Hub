let user = { name: "زائر", username: "@guest", points: 1000, photo: "https://via.placeholder.com/50" };
let selectedGame = null;
let playMode = 'ai';
let currentBet = 100;
let timer = null;

// التعرف على بيانات المستخدم تلقائياً من Telegram
document.addEventListener("DOMContentLoaded", () => {
    const tg = window.Telegram?.WebApp;
    if (tg && tg.initDataUnsafe?.user) {
        const u = tg.initDataUnsafe.user;
        user.name = u.first_name + (u.last_name ? " " + u.last_name : "");
        user.username = u.username ? "@" + u.username : "@no_user";
        if (u.photo_url) user.photo = u.photo_url;

        document.getElementById("u-name").textContent = user.name;
        document.getElementById("u-username").textContent = user.username;
        document.getElementById("u-photo").src = user.photo;
    }
});

function switchStage(stageId) {
    document.querySelectorAll(".stage").forEach(s => s.classList.remove("active"));
    document.getElementById(stageId).classList.add("active");
}

function openGameModal(game) {
    selectedGame = game;
    document.getElementById("modal-game-title").textContent = game.toUpperCase();
    switchStage("sec-mode");
}

function setMode(mode) {
    playMode = mode;
}

function selectBet(amount) {
    if (user.points < amount) return alert("نقاطك غير كافية!");
    currentBet = amount;
    alert(`تم اختيار رهان ${amount} نقطة`);
}

function startGame() {
    switchStage("sec-game");
    startTimer();
    renderBoard();
}

function startTimer() {
    let timeLeft = 15;
    document.getElementById("game-timer").textContent = timeLeft;
    clearInterval(timer);
    timer = setInterval(() => {
        timeLeft--;
        document.getElementById("game-timer").textContent = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(timer);
            alert("⏰ انتهى الوقت! خسرت الدور.");
            switchStage("sec-home");
        }
    }, 1000);
}

function renderBoard() {
    const board = document.getElementById("game-board");
    board.innerHTML = "";
    if (selectedGame === 'xo') {
        let grid = document.createElement("div");
        grid.className = "xo-board";
        for (let i = 0; i < 9; i++) {
            let cell = document.createElement("div");
            cell.className = "xo-cell";
            cell.onclick = () => {
                cell.textContent = "X";
                clearInterval(timer);
                setTimeout(() => {
                    alert(`🎉 فزت بالمباراة وحصلت على ${currentBet * 2} نقطة!`);
                    user.points += currentBet * 2;
                    document.getElementById("u-points").textContent = user.points;
                    switchStage("sec-home");
                }, 500);
            };
            grid.appendChild(cell);
        }
        board.appendChild(grid);
    } else {
        board.innerHTML = "<h3>جاري تحميل ساحة اللعب...</h3>";
    }
}

function claimDailyReward() {
    user.points += 200;
    document.getElementById("u-points").textContent = user.points;
    alert("🎁 حصلت على 200 نقطة هدية يومية!");
}

function doTask(btn, reward) {
    user.points += reward;
    document.getElementById("u-points").textContent = user.points;
    btn.disabled = true;
    btn.textContent = "تم ✅";
}
