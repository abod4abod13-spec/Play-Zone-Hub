const SERVER_URL = "https://nodejs-project--abod4abod13.replit.app";
const socket = io(SERVER_URL, { path: "/api/socket.io", transports: ["websocket", "polling"] });

// Telegram WebApp
const tg = window.Telegram?.WebApp;
if (tg) {
    tg.expand();
    if (tg.initDataUnsafe?.user) {
        const u = tg.initDataUnsafe.user;
        document.getElementById("user-name").textContent = u.first_name;
        document.getElementById("p-name").textContent = u.first_name;
        document.getElementById("user-avatar").textContent = u.first_name[0];
        document.getElementById("p-avatar").textContent = u.first_name[0];
    }
}

// التنقل بين الشاشات
function switchTab(tabId) {
    document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));

    document.getElementById(tabId).classList.add('active');
}

// أزرار بدء اللعب
document.getElementById("btn-practice").addEventListener("click", () => {
    document.getElementById("game-mode-txt").textContent = "تدريب";
    switchTab("sec-game");
});

document.getElementById("btn-quick-play").addEventListener("click", () => {
    document.getElementById("game-mode-txt").textContent = "لعب سريع اونلاين";
    switchTab("sec-game");
    socket.emit("join_room", { roomId: "global_1", userId: "user_" + Math.random() });
});

// الاتصال بالسيرفر
socket.on("connect", () => console.log("متصل بالسيرفر بنجاح!"));
