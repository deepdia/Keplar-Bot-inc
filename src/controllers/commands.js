// commands.js
const fs = require('fs');
const path = require('path');
const { MessageMedia } = require('whatsapp-web.js'); 
const { handleAntiLink } = require('../handlers/antilink');
const { handleAntiSpam } = require('../handlers/antispam'); 
const { getYoutubeAudio } = require('../services/youtube'); 

async function handleMessage(message, userId, client) {
    const dbPath = path.join(__dirname, '../../config/database.json');
    if (!fs.existsSync(dbPath)) return;

    let db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    const userConfig = db.users[userId];
    if (!userConfig) return; 
    if (!userConfig.groups) userConfig.groups = {};

    const prefix = userConfig.prefix || '!';
    const msg = message.body.toLowerCase().trim();
    const chat = await message.getChat();

    if (chat.isGroup) {
        const groupId = chat.id._serialized;
        
        const senderId = message.fromMe ? client.info.wid._serialized : (message.author || message.from);
        const botId = client.info.wid._serialized;
        
        const senderNumber = senderId.split('@')[0];
        const botNumber = botId.split('@')[0];

        if (!userConfig.groups[groupId]) {
            userConfig.groups[groupId] = { antilink: false, antispam: false };
        }
        const groupConfig = userConfig.groups[groupId];
        
        let isAdmin = message.fromMe; 
        let isBotAdmin = false;

        if (chat.participants) {
            const senderData = chat.participants.find(p => p.id.user === senderNumber || p.id._serialized === senderId);
            const botData = chat.participants.find(p => p.id.user === botNumber || p.id._serialized === botId);
            
            if (senderData) {
                isAdmin = isAdmin || senderData.isAdmin || senderData.isSuperAdmin;
            }
            if (botData) {
                isBotAdmin = botData.isAdmin || botData.isSuperAdmin;
            }
        }

        const isLinkDeleted = await handleAntiLink(message, chat, groupConfig, isAdmin, isBotAdmin, senderId);
        if (isLinkDeleted) return;

        const isSpam = await handleAntiSpam(message, chat, groupConfig, isAdmin, isBotAdmin, senderId);
        if (isSpam) return; 

        if (msg === prefix + 'menu' || msg === prefix + 'settings') {
            if (!isAdmin) {
                await message.reply('❌ শুধুমাত্র গ্রুপের অ্যাডমিনরা এই মেনু দেখতে পারবেন।');
                return;
            }
            let menuText = `⚙️ *KEPLAR WORLD SECURITY MENU*\n\n`;
            menuText += `1️⃣ *Anti-Link*: ${groupConfig.antilink ? '✅ ON' : '❌ OFF'}\n`;
            menuText += `2️⃣ *Anti-Spam*: ${groupConfig.antispam ? '✅ ON' : '❌ OFF'}\n\n`;
            menuText += `_সেটিংস পরিবর্তন করতে নিচে মেসেজ করুন_:\n`;
            menuText += `👉 *${prefix}antilink on* (বা off)\n`;
            menuText += `👉 *${prefix}antispam on* (বা off)\n\n`;
            menuText += `_অ্যাডমিন কমান্ড_:\n`;
            menuText += `👉 মেসেজে রিপ্লাই দিয়ে *del* লিখলে মেসেজ ডিলিট হবে।\n`;
            menuText += `👉 মেসেজে রিপ্লাই দিয়ে বা মেনশন করে *${prefix}kick* লিখলে মেম্বার রিমুভ হবে।`;
            
            await message.reply(menuText);
            return;
        }

        if (isAdmin) {
            let updated = false;
            if (msg === prefix + 'antilink on') { groupConfig.antilink = true; updated = true; }
            else if (msg === prefix + 'antilink off') { groupConfig.antilink = false; updated = true; }
            else if (msg === prefix + 'antispam on') { groupConfig.antispam = true; updated = true; }
            else if (msg === prefix + 'antispam off') { groupConfig.antispam = false; updated = true; }

            if (updated) {
                fs.writeFileSync(dbPath, JSON.stringify(db, null, 4));
                await message.reply('✅ সিকিউরিটি সেটিং আপডেট হয়েছে! চেক করতে `!menu` লিখুন।');
                return;
            }

            if (msg === 'del' || msg === prefix + 'del') {
                if (!isBotAdmin) {
                    await message.reply('⚠️ আমাকে গ্রুপের অ্যাডমিন না করলে আমি মেসেজ ডিলিট করতে পারব না!');
                    return;
                }
                if (message.hasQuotedMsg) {
                    const quotedMsg = await message.getQuotedMessage();
                    try {
                        await quotedMsg.delete(true); 
                        await message.delete(true);   
                    } catch (error) {
                        console.log("❌ Delete Command Error:", error);
                    }
                } else {
                    await message.reply('⚠️ যে মেসেজটি ডিলিট করতে চান, তাতে রিপ্লাই (Reply) দিয়ে `del` লিখুন!');
                }
                return;
            }

            if (msg.startsWith(prefix + 'kick') || msg.startsWith('kick')) {
                if (!isBotAdmin) {
                    await message.reply('⚠️ আমাকে গ্রুপের অ্যাডমিন না করলে আমি মেম্বার রিমুভ করতে পারব না!');
                    return;
                }

                let targetIds = [];
                if (message.hasQuotedMsg) {
                    const quotedMsg = await message.getQuotedMessage();
                    targetIds.push(quotedMsg.author || quotedMsg.from);
                }
                if (message.mentionedIds && message.mentionedIds.length > 0) {
                    targetIds = targetIds.concat(message.mentionedIds);
                }

                if (targetIds.length > 0) {
                    try {
                        await chat.removeParticipants(targetIds);
                        await message.reply('✅ মেম্বারকে গ্রুপ থেকে সফলভাবে রিমুভ করা হয়েছে!');
                    } catch (error) {
                        console.log("❌ Kick Command Error:", error);
                    }
                } else {
                    await message.reply('⚠️ যাকে রিমুভ করতে চান, তার মেসেজে রিপ্লাই দিয়ে বা তাকে মেনশন করে `!kick` লিখুন!');
                }
                return;
            }
        }
    }

    if (msg.startsWith(`${prefix}play `)) {
        const query = message.body.slice(prefix.length + 5).trim();
        
        if (!query) {
            await message.reply(`❌ Please provide a song name. Example: ${prefix}play Arijit Singh`);
            return;
        }

        await message.reply(`🎵 Searching for "${query}"... Please wait ⏳`);

        try {
            const media = await getYoutubeAudio(query);
            
            if (!media) {
                await message.reply('❌ No results found on YouTube!');
                return;
            }

            await client.sendMessage(message.from, media, { sendAudioAsVoice: false });
            return;
        } catch (error) {
            console.error('YouTube Play Error:', error);
            await message.reply('❌ Error downloading the song. Video might be restricted.');
            return;
        }
    }

    for (let item of userConfig.replies) {
        const expectedTrigger = item.usePrefix ? (prefix + item.trigger.toLowerCase()) : item.trigger.toLowerCase();
        if (msg === expectedTrigger) {
            if (item.mediaData) {
                const media = new MessageMedia(item.mimeType, item.mediaData, item.fileName || 'media');
                await client.sendMessage(message.from, media, { caption: item.reply });
            } else {
                await message.reply(item.reply);
            }
            break; 
        }
    }
}

module.exports = { handleMessage };
