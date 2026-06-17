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
                  `2️⃣ *480p* (Medium Quality)\n` +
                  `3️⃣ *720p* (HD Quality)\n\n` +
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
                else if (body === '2') quality = "480";
                else if (body === '3') quality = "720";

                try {
                    const apiUrl = `https://sai-green.vercel.app/manump4?url=${encodeURIComponent(video.url)}&quality=${quality}`;
                    const response = await axios.get(apiUrl);
                    
                    // --- නිවැරදි කළ ලින්ක් එක ලබා ගන්නා පේළිය ---
                    // API එකේ JSON structure එකට අනුව: download -> url
                    const downloadUrl = response.data.download?.url;

                    if (!downloadUrl) {
                        return reply(`❌ Error: ${quality}p quality link not found in API response!`);
                    }

                    await bot.sendMessage(from, { 
                        video: { url: downloadUrl }, 
                        mimetype: "video/mp4",
                        caption: `📝 ${video.title}\n✅ Quality: ${quality}p\n\n> _𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 𝐙𝐄𝐔𝐒 𝐈𝐍𝐂 </>_`
                    }, { quoted: msgUpdate });

                    await bot.sendMessage(from, { react: { text: '✅', key: msgUpdate.key } });

                } catch (err) {
                    console.error(err);
                    reply("❌ වීඩියෝව ලබා ගැනීමේදී දෝෂයක් සිදු විය.");
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
