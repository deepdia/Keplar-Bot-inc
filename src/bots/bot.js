// bot.js
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const { handleMessage } = require('../controllers/commands'); 

const clients = {}; 

function startWhatsappBot(socket, choice, phone, userId) {
    if (clients[userId]) {
        socket.emit('bot_ready');
        return;
    }

    const client = new Client({
        authStrategy: new LocalAuth({ clientId: userId }), 
        puppeteer: {
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        },
        webVersionCache: { type: 'none' }
    });

    clients[userId] = client;

    client.on('qr', async (qr) => {
        if (choice === '1') {
            qrcode.toDataURL(qr, (err, url) => {
                if (!err) socket.emit('qr_code', url);
            });
        } else if (choice === '2' && phone) {
            try {
                const pairingCode = await client.requestPairingCode(phone);
                socket.emit('pairing_code', pairingCode);
                console.log(`✅ Pairing Code Generated: ${pairingCode}`);
            } catch (err) {
                console.error('❌ Error requesting pairing code:', err);
            }
        }
    });

    client.on('ready', () => {
        socket.emit('bot_ready');
        console.log(`✅ Bot is connected for user: ${userId}`);
    });

    client.on('message_create', async message => {
        await handleMessage(message, userId, client); 
    });

    client.initialize();
}

async function stopWhatsappBot(socket, userId) {
    if (clients[userId]) {
        await clients[userId].destroy();
        delete clients[userId];
        console.log(`🛑 Bot turned OFF for user: ${userId}`);
        if (socket) socket.emit('bot_stopped');
    }
}

module.exports = { startWhatsappBot, stopWhatsappBot };
