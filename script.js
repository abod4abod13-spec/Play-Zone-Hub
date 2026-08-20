// الربط المباشر مع سيرفر Replit الخاص بك
const SERVER_URL = "https://nodejs-project--abod4abod13.replit.app";

const socket = io(SERVER_URL, {
    path: "/api/socket.io",
    transports: ["websocket", "polling"]
});

// عناصر الواجهة (DOM)
const statusBadge = document.getElementById("connection-status");
const userIdDisplay = document.getElementById("user-id-display");
const errorAlert = document.getElementById("error-alert");
const roomIdInput = document.getElementById("room-id-input");
const joinRoomBtn = document.getElementById("join-room-btn");
const gameArena = document.getElementById("game-arena");
const currentRoomDisplay = document.getElementById("current-room-display");
const timerDisplay = document.getElementById("timer");
const actionBtn = document.getElementById("action-btn");
const gameStatusText = document.getElementById("game-status-text");

// توليد أو جلب ID مستخدم افتراضي
let currentUserId = localStorage.getItem("pz_user_id");
if (!currentUserId) {
    currentUserId = "user_" + Math.floor(1000 + Math.random() * 9000);
    localStorage.setItem("pz_user_id", currentUserId);
}
userIdDisplay.textContent = currentUserId;

let timerInterval = null;

// --- أحداث Socket.io ---

// 1. عند نجاح الاتصال بالسيرفر
socket.on("connect", () => {
    statusBadge.textContent = "متصل";
    statusBadge.classList.remove("offline");
    statusBadge.classList.add("online");

    // إرسال طلب تسجيل المستخدم للتحقق من الـ IP لمنع الحسابات المتعددة
    socket.emit("register_user", { userId: currentUserId });
});

// 2. عند قطع الاتصال
socket.on("disconnect", () => {
    statusBadge.textContent = "غير متصل";
    statusBadge.classList.remove("online");
    statusBadge.classList.add("offline");
});

// 3. استقبال رسائل الخطأ والحظر من السيرفر
socket.on("error_message", (msg) => {
    errorAlert.textContent = msg;
    errorAlert.classList.remove("hidden");
    joinRoomBtn.disabled = true;
    actionBtn.disabled = true;
});

// --- التفاعل مع الواجهة ---

// الانضمام لغرفة
joinRoomBtn.addEventListener("click", () => {
    const roomId = roomIdInput.value.trim();
    if (!roomId) {
        alert("يرجى إدخال رقم الغرفة أولاً!");
        return;
    }

    // إرسال حدث الانضمام للسيرفر
    socket.emit("join_room", { roomId: roomId, userId: currentUserId });

    // تحديث الواجهة
    currentRoomDisplay.textContent = `الغرفة: ${roomId}`;
    gameArena.classList.remove("hidden");
    gameStatusText.textContent = "تم الانضمام، بانتظار الدور...";
    actionBtn.disabled = false;

    startTurnTimer(15);
});

// مؤقت الـ 15 ثانية لكل دور
function startTurnTimer(seconds) {
    clearInterval(timerInterval);
    let timeLeft = seconds;
    timerDisplay.textContent = timeLeft;

    timerInterval = setInterval(() => {
        timeLeft--;
        timerDisplay.textContent = timeLeft;

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            gameStatusText.textContent = "انتهى الوقت! انتقل الدور للاعب الآخر.";
            actionBtn.disabled = true;
        }
    }, 1000);
}

// تنفيذ حركة في اللعبة
actionBtn.addEventListener("click", () => {
    gameStatusText.textContent = "تم تنفيذ الحركة بنجاح!";
    actionBtn.disabled = true;
    clearInterval(timerInterval);
});
