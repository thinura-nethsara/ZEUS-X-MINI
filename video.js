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

        const search = await yts(q);
        const video = search.videos[0];
        if (!video) return reply("❌ No results found on YouTube.");

        let msg = `🎥 *ZEUS X VIDEO PLAYER* 🎥\n\n` +
                  `📝 *Title:* ${video.title}\n` +
                  `👤 *Channel:* ${video.author.name}\n` +
                  `⏱️ *Duration:* ${video.timestamp}\n` +
                  `🔗 *Link:* ${video.url}\n\n` +
                  `*Reply with a quality number:* \n\n` +
                  `1️⃣ *360p* (Low Quality)\n` +
                  `2️⃣ *720p* (HD Quality)\n` +
                  `3️⃣ *1080p* (Full HD Quality)\n\n` +
                  `> _𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 𝐙𝐄𝐔𝐒 𝐈𝐍𝐂 </>_ `;

        const sentMsg = await bot.sendMessage(from, { 
            image: { url: video.thumbnail }, 
            caption: msg 
        }, { quoted: mek });

        const listener = async (update) => {
            const msgUpdate = update.messages[0];
            if (!msgUpdate.message) return;

            const body = msgUpdate.message.conversation || 
                         msgUpdate.message.extendedTextMessage?.text;

            const isReplyToBot = msgUpdate.message.extendedTextMessage?.contextInfo?.stanzaId === sentMsg.key.id;

            if (isReplyToBot && ['1', '2', '3'].includes(body)) {
                await bot.sendMessage(from, { react: { text: '⏳', key: msgUpdate.key } });

                let quality = "360";
                if (body === '1') quality = "360";
                else if (body === '2') quality = "720";
                else if (body === '3') quality = "1080";

                try {
                    // නව API URL එක - යූටියුබ් URL එක encode කර යවන්න
                    const apiUrl = `https://mr-thinuzz-api-build.vercel.app/api/ytmp4v2/download?url=${encodeURIComponent(video.url)}&quality=${quality}&apiKey=key_faa62e4037a95cda`;
                    
                    const response = await axios.get(apiUrl);
                    
                    // නව API response structure එකට අනුව data ගන්න
                    const data = response.data.data;
                    
                    if (!data || !data.links || !data.links.video) {
                        return reply(`❌ Error: ${quality}p quality video link not found in API response!`);
                    }

                    // video link එක data.links.video වලින් ලබා ගන්න
                    const downloadUrl = data.links.video;

                    // සෙවූ quality එක තිබේදැයි check කරන්න
                    const qualityInfo = data.all_qualities?.find(q => q.quality === quality);
                    
                    // caption එක සාදන්න
                    let caption = `📝 ${data.title || video.title}\n`;
                    caption += `✅ Quality: ${data.quality_found || quality}p\n`;
                    caption += `📺 Channel: ${data.channel_author || video.author.name}\n`;
                    caption += `⏱️ Duration: ${data.duration || video.timestamp}\n\n`;
                    caption += `> _𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 𝐙𝐄𝐔𝐒 𝐈𝐍𝐂 </>_`;

                    await bot.sendMessage(from, { 
                        video: { url: downloadUrl }, 
                        mimetype: "video/mp4",
                        caption: caption
                    }, { quoted: msgUpdate });

                    await bot.sendMessage(from, { react: { text: '✅', key: msgUpdate.key } });

                } catch (err) {
                    console.error("API Error:", err.response?.data || err.message);
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
