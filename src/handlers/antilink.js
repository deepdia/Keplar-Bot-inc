// antilink.js

const userStrikes = {}; 

async function handleAntiLink(message, chat, groupConfig, isAdmin, isBotAdmin, senderId) {
    if (groupConfig.antilink && !isAdmin) {
        const linkRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|wa\.me\S+|[a-zA-Z0-9-]+\.(com|in|net|org|link)\b)/gi;
        
        if (linkRegex.test(message.body)) {
            if (isBotAdmin) {
                try {
                    const groupId = chat.id._serialized;
                    
                    if (!userStrikes[groupId]) userStrikes[groupId] = {};
                    if (!userStrikes[groupId][senderId]) userStrikes[groupId][senderId] = 0;
                    
                    userStrikes[groupId][senderId] += 1;
                    const strikeCount = userStrikes[groupId][senderId];

                    await message.delete(true); 
                    
                    if (strikeCount >= 3) {
                        await chat.removeParticipants([senderId]);
                        await chat.sendMessage(`🛑 @${senderId.split('@')[0]} কে গ্রুপ থেকে রিমুভ করা হয়েছে (৩ বার লিংক শেয়ার করার জন্য)!`, { mentions: [senderId] });
                        userStrikes[groupId][senderId] = 0; 
                    } else {
                        await chat.sendMessage(`⚠️ @${senderId.split('@')[0]}, এই গ্রুপে লিংক শেয়ার করা নিষেধ!\n\n*সতর্কবার্তা:* ${strikeCount}/3\n(৩ বার লিংক দিলে আপনাকে গ্রুপ থেকে রিমুভ করা হবে!)`, { mentions: [senderId] });
                    }

                } catch (error) {
                    console.log("❌ Delete/Kick Error: বট মেসেজ ডিলিট বা মেম্বার রিমুভ করতে পারছে না।");
                }
            } else {
                await message.reply('⚠️ আমাকে গ্রুপের অ্যাডমিন না করলে আমি লিংক ডিলিট বা মেম্বার রিমুভ করতে পারব না!');
            }
            return true; 
        }
    }
    return false; 
}

module.exports = { handleAntiLink };
