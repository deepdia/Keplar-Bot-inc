// youtube.js
const play = require('play-dl');
const { MessageMedia } = require('whatsapp-web.js');

async function getYoutubeAudio(query) {
    try {
        const searchResults = await play.search(query, { limit: 5 });
        const video = searchResults.find(v => v.durationInSec < 600);

        if (!video) {
            console.log('❌ No short video found (under 10 mins).');
            return null;
        }

        console.log(`🎵 Found Video: ${video.title} (Duration: ${video.durationRaw})`);

        const stream = await play.stream(video.url);
        
        const buffer = await new Promise((resolve, reject) => {
            const chunks = [];
            stream.stream.on('data', (chunk) => chunks.push(chunk));
            stream.stream.on('end', () => resolve(Buffer.concat(chunks)));
            stream.stream.on('error', (err) => reject(err));
        });

        return new MessageMedia('audio/mp4', buffer.toString('base64'), `${video.title}.mp3`);
    } catch (error) {
        console.error('❌ Download Error:', error);
        return null;
    }
}

module.exports = { getYoutubeAudio };
