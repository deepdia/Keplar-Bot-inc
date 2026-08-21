// index.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { startWhatsappBot, stopWhatsappBot } = require('./src/bots/bot'); 
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const dbPath = path.join(__dirname, 'config/database.json');

if (!fs.existsSync(path.dirname(dbPath))) {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
}

if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify({ users: {} }, null, 4));
    console.log('📁 New database.json file created automatically.');
}

function readDB() {
    try {
        return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    } catch (error) {
        console.error('Database read error:', error);
        return { users: {} };
    }
}

app.use(express.static('public'));

io.on('connection', (socket) => {
    
    socket.on('register_user', (data) => {
        let db = readDB();
        if (db.users[data.username]) {
            socket.emit('auth_error', 'Ei username ti age thekei ache!');
        } else {
            db.users[data.username] = {
                password: data.password,
                prefix: '!',
                replies: []
            };
            fs.writeFileSync(dbPath, JSON.stringify(db, null, 4));
            socket.emit('register_success', 'Account toiri hoyeche! Ebar login korun.');
        }
    });

    socket.on('login_user', (data) => {
        let db = readDB();
        if (db.users[data.username] && db.users[data.username].password === data.password) {
            socket.emit('login_success', data.username);
        } else {
            socket.emit('auth_error', 'Username ba password bhul!');
        }
    });

    socket.on('start_bot', (data) => {
        startWhatsappBot(socket, data.choice, data.phone, data.userId);
    });

    socket.on('stop_bot', async (userId) => {
        await stopWhatsappBot(socket, userId);
    });

    socket.on('get_config', (userId) => {
        let db = readDB();
        if (db.users[userId]) {
            socket.emit('config_data', db.users[userId]);
        }
    });

    socket.on('save_config', (data) => {
        let db = readDB();
        if (db.users[data.userId]) {
            db.users[data.userId].prefix = data.config.prefix;
            db.users[data.userId].replies = data.config.replies;
            fs.writeFileSync(dbPath, JSON.stringify(db, null, 4));
            socket.emit('config_saved');
        }
    });
});

server.listen(3000, () => {
    console.log('🌐 Multi-User Keplar Server Running on http://localhost:3000');
});
