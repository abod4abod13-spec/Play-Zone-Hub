const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// تخزين عناوين الـ IP المسجلة لمنع الإحالات التكرارية
const registeredIPs = new Set();
const usersDB = new Map();

io.on('connection', (socket) => {
    const clientIP = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;

    socket.on('register_user', (userData) => {
        // التحقق من الإحالة والغش من نفس الجهاز
        if (userData.referredBy) {
            if (registeredIPs.has(clientIP)) {
                socket.emit('error_msg', '❌ لن يتم احتساب نقاط الإحالة لأنك انضممت سابقاً من نفس الجهاز/الشبكة!');
            } else {
                registeredIPs.add(clientIP);
                // إضافة مكافأة الإحالة للمُحيل
            }
        }
        
        usersDB.set(userData.tgId, { socketId: socket.id, points: 1000, ip: clientIP });
        socket.emit('update_user_data', { points: 1000 });
    });

    socket.on('find_match', (data) => {
        // البحث عن منافس حقيقي بنفس الرهان واللعبة
    });

    socket.on('turn_timeout', () => {
        // تطبيق خسارة الدور أو اللعبة
    });
});

server.listen(3000, () => console.log('Serever running on port 3000'));
