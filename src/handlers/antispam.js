// antispam.js

const userSpamTracker = {}; 

async function handleAntiSpam(message, chat, groupConfig, isAdmin, isBotAdmin, senderId) {
    if (groupConfig.antispam && !isAdmin) {
        const now = Date.now();
        if (!userSpamTracker[senderId]) userSpamTracker[senderId] = [];
        
        userSpamTracker[senderId].push(now);
        userSpamTracker[senderId] = userSpamTracker[senderId].filter(time => now - time < 5000);
        
        if (userSpamTracker[senderId].length > 4) { 
            if (isBotAdmin) {
                await message.delete(true);
                await chat.sendMessage(`🛑 @${senderId.split('@')[0]}, দয়া করে স্প্যামিং (Spamming) করা বন্ধ করুন!`, { mentions: [senderId] });
            }
            return true; 
        }
    }
    return false; 
}

module.exports = { handleAntiSpam };
