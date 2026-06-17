const { cmd } = require("../command");
const axios = require("axios");
const yts = require("yt-search");
const config = require("../config");

cmd({
    pattern: "video",
    alias: ["mp4", "ytv"],
    react: "🎥",
    desc: "Download YouTube Video with quality selection",
    category: "download",
    filename: __filename,
}, async (bot, mek, m, { from, q, reply, prefix }) => {
    try {
        if (!q) return reply("🎥 *ZEUS X VIDEO PLAYER*\n\nExample: .video alone");

        // Check if it's a YouTube URL
        const isYouTubeUrl = q.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
        let videoUrl = q;
        let videoInfo = null;

        if (!isYouTubeUrl) {
            // Search using yts
            const search = await yts(q);
            const video = search.videos[0];
            if (!video) return reply("❌ No results found on YouTube.");
            videoInfo = video;
            videoUrl = video.url;
        } else {
            // Get video info from API directly
            const apiUrl = `https://mr-thinuzz-api-build.vercel.app/api/ytmp4v2/download?url=${encodeURIComponent(q)}&quality=720&apiKey=key_faa62e4037a95cda`;
            const response = await axios.get(apiUrl);
            if (response.data && response.data.status && response.data.data) {
                const data = response.data.data;
                videoInfo = {
                    title: data.title || 'N/A',
                    author: { name: data.channel_author || 'N/A' },
                    timestamp: data.duration || 'N/A',
                    url: data.original_url || q,
                    thumbnail: data.thumbnail || `https://i.ytimg.com/vi/${data.video_id}/hqdefault.jpg`
                };
            }
        }

        if (!videoInfo) return reply("❌ No results found on YouTube.");

        // Get available qualities from API
        let qualityOptions = [];
        let allQualities = [];
        
        try {
            const apiUrl = `https://mr-thinuzz-api-build.vercel.app/api/ytmp4v2/download?url=${encodeURIComponent(videoUrl)}&quality=720&apiKey=key_faa62e4037a95cda`;
            const response = await axios.get(apiUrl);
            if (response.data && response.data.status && response.data.data) {
                allQualities = response.data.data.all_qualities || [];
                // Update video info with more details
                if (response.data.data.title) videoInfo.title = response.data.data.title;
                if (response.data.data.channel_author) videoInfo.author.name = response.data.data.channel_author;
                if (response.data.data.duration) videoInfo.timestamp = response.data.data.duration;
                if (response.data.data.thumbnail) videoInfo.thumbnail = response.data.data.thumbnail;
            }
        } catch (e) {
            console.log("Error fetching qualities:", e);
        }

        // Build quality options message
        let qualityMsg = '';
        if (allQualities.length > 0) {
            const qualityMap = {
                '1️⃣': 0,
                '2️⃣': 1,
                '3️⃣': 2,
                '4️⃣': 3,
                '5️⃣': 4
            };
            qualityMsg = allQualities.map((q, index) => {
                const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];
                return `${emojis[index] || '🔹'} *${q.quality}p*`;
            }).join('\n');
        } else {
            qualityMsg = `1️⃣ *360p* (Low Quality)\n2️⃣ *720p* (HD Quality)\n3️⃣ *1080p* (Full HD Quality)`;
        }

        let msg = `🎥 *ZEUS X VIDEO PLAYER* 🎥\n\n` +
                  `📝 *Title:* ${videoInfo.title}\n` +
                  `👤 *Channel:* ${videoInfo.author.name}\n` +
                  `⏱️ *Duration:* ${videoInfo.timestamp}\n` +
                  `🔗 *Link:* ${videoInfo.url}\n\n` +
                  `*Reply with a quality number:* \n\n` +
                  `${qualityMsg}\n\n` +
                  `> _𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 𝐙𝐄𝐔𝐒 𝐈𝐍𝐂 </>_ `;

        const sentMsg = await bot.sendMessage(from, { 
            image: { url: videoInfo.thumbnail }, 
            caption: msg 
        }, { quoted: mek });

        const listener = async (update) => {
            const msgUpdate = update.messages[0];
            if (!msgUpdate.message) return;

            const body = msgUpdate.message.conversation || 
                         msgUpdate.message.extendedTextMessage?.text;

            const isReplyToBot = msgUpdate.message.extendedTextMessage?.contextInfo?.stanzaId === sentMsg.key.id;

            if (isReplyToBot && ['1', '2', '3', '4', '5'].includes(body)) {
                await bot.sendMessage(from, { react: { text: '⏳', key: msgUpdate.key } });

                let quality = "720";
                let selectedIndex = parseInt(body) - 1;

                try {
                    let downloadUrl = null;
                    let videoTitle = videoInfo.title;
                    let qualityFound = "720p";

                    // Try to get from allQualities first
                    if (allQualities.length > 0 && allQualities[selectedIndex]) {
                        const selected = allQualities[selectedIndex];
                        downloadUrl = selected.downloadUrl;
                        qualityFound = selected.quality + 'p';
                    } else {
                        // Fallback qualities
                        const fallbackQualities = ['360', '480', '720', '1080', '144'];
                        if (selectedIndex < fallbackQualities.length) {
                            quality = fallbackQualities[selectedIndex];
                        } else {
                            quality = '720';
                        }

                        // Fetch from API with selected quality
                        const apiUrl = `https://mr-thinuzz-api-build.vercel.app/api/ytmp4v2/download?url=${encodeURIComponent(videoInfo.url)}&quality=${quality}&apiKey=key_faa62e4037a95cda`;
                        const response = await axios.get(apiUrl);
                        
                        if (response.data && response.data.status && response.data.data) {
                            const data = response.data.data;
                            downloadUrl = data.links?.video || null;
                            qualityFound = data.quality_found || quality + 'p';
                            if (data.title) videoTitle = data.title;
                        }
                    }

                    if (!downloadUrl) {
                        return reply(`❌ Error: ${qualityFound} quality link not found in API response!`);
                    }

                    await bot.sendMessage(from, { 
                        video: { url: downloadUrl }, 
                        mimetype: "video/mp4",
                        caption: `📝 ${videoTitle}\n✅ Quality: ${qualityFound}\n\n> _𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 𝐙𝐄𝐔𝐒 𝐈𝐍𝐂 </>_`
                    }, { quoted: msgUpdate });

                    await bot.sendMessage(from, { react: { text: '✅', key: msgUpdate.key } });

                } catch (err) {
                    console.error(err);
                    reply("❌ වීඩියෝව ලබා ගැනීමේදී දෝෂයක් සිදු විය.\n" + err.message);
                }

                bot.ev.off('messages.upsert', listener);
            }
        };

        bot.ev.on('messages.upsert', listener);

        setTimeout(() => {
            bot.ev.off('messages.upsert', listener);
        }, 300000);

    } catch (e) {
        console.log("VIDEO ERROR:", e);
        reply("❌ *Error:* " + e.message);
    }
});
