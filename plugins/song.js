const { cmd } = require("../command");
const axios = require("axios");
const yts = require("yt-search");
const config = require("../config");

cmd({
    pattern: "song",
    alias: ["yta", "mp3", "play"],
    react: "🎧",
    desc: "Download YouTube MP3 with selection menu",
    category: "download",
    filename: __filename,
}, async (bot, mek, m, { from, q, reply, prefix }) => {
    try {
        if (!q) return reply("🎧 *ZEUS X AUDIO PLAYER*\n\nExample: .song alone");

        const search = await yts(q);
        const video = search.videos[0];
        if (!video) return reply("❌ No results found on YouTube.");

        let msg = `🎵 *ZEUS X AUDIO PLAYER* 🎵\n\n` +
                  `📝 *Title:* ${video.title}\n` +
                  `👤 *Artist:* ${video.author.name}\n` +
                  `⏱️ *Duration:* ${video.timestamp}\n` +
                  `🔗 *Link:* ${video.url}\n\n` +
                  `*Reply with a number:* \n\n` +
                  `1️⃣ *Audio File* (MPEG)\n` +
                  `2️⃣ *Document File* (MP3)\n\n` +
                  `> *© ZEUS X SONG SYSTEM*`;

        const sentMsg = await bot.sendMessage(from, { 
            image: { url: video.thumbnail }, 
            caption: msg 
        }, { quoted: mek });

        // --- Reply Listener එක මෙතනින් පටන් ගනී ---
        const listener = async (update) => {
            const msgUpdate = update.messages[0];
            if (!msgUpdate.message) return;

            const body = msgUpdate.message.conversation || 
                         msgUpdate.message.extendedTextMessage?.text || 
                         msgUpdate.message.buttonsResponseMessage?.selectedButtonId;

            // පරීක්ෂා කිරීම: රිප්ලයි එක කළේ කලින් යැවූ මැසේජ් එකටද සහ අංකය 1 හෝ 2 ද කියා
            const isReplyToBot = msgUpdate.message.extendedTextMessage?.contextInfo?.stanzaId === sentMsg.key.id;

            if (isReplyToBot && (body === '1' || body === '2')) {
                await bot.sendMessage(from, { react: { text: '⏳', key: msgUpdate.key } });

                try {
                    const finalLink = await getDownloadLink(video.url);
                    if (!finalLink) return reply("❌ Download link not found.");

                    if (body === '1') {
                        // Audio එවන්න
                        await bot.sendMessage(from, { 
                            audio: { url: finalLink }, 
                            mimetype: "audio/mpeg", 
                            ptt: false 
                        }, { quoted: msgUpdate });
                    } else if (body === '2') {
                        // Document එවන්න
                        await bot.sendMessage(from, { 
                            document: { url: finalLink }, 
                            mimetype: "audio/mpeg", 
                            fileName: `${video.title}.mp3`,
                            caption: "> _𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 𝐍𝐄𝐗𝐔𝐒 𝐈𝐍𝐂 </>_ 🇱🇰"
                        }, { quoted: msgUpdate });
                    }

                    await bot.sendMessage(from, { react: { text: '✅', key: msgUpdate.key } });
                } catch (err) {
                    console.error(err);
                    reply("❌ Error downloading audio.");
                }

                // වැඩේ ඉවර වුණාම Listener එක ඉවත් කරන්න
                bot.ev.off('messages.upsert', listener);
            }
        };

        // Listener එක Register කිරීම
        bot.ev.on('messages.upsert', listener);

        // විනාඩි 5කට පසු රිප්ලයි එකක් නැත්නම් ඉබේම Listener එක නතර කරන්න
        setTimeout(() => {
            bot.ev.off('messages.upsert', listener);
        }, 300000);

    } catch (e) {
        console.log("SONG ERROR:", e);
        reply("❌ *Error:* " + e.message);
    }
});

// --- API Logic එක පොදු Function එකක් ලෙස ---
async function getDownloadLink(videoUrl) {
    try {
        // Main API (Mr Thinuzz)
        const apiUrl = `https://mr-thinuzz-api-build.vercel.app/api/ytmp3/download?url=${encodeURIComponent(videoUrl)}&apiKey=key_faa62e4037a95cda`;
        const response = await axios.get(apiUrl);
        
        // Response එකේ data.links.audio තියෙනවද කියලා check කරන්න
        if (response.data?.status && response.data.data?.links?.audio) {
            return response.data.data.links.audio;
        }

        // Backup API (Manul)
        const backupUrl = `https://api-site-x-by-manul.vercel.app/convert?mp3=${encodeURIComponent(videoUrl)}&apikey=Manul-Official`;
        const backup = await axios.get(backupUrl);
        if (backup.data?.status && backup.data.data?.url) {
            return backup.data.data.url;
        }

        // Second Backup API (GiftedTech)
        const giftedUrl = `https://api.giftedtech.my.id/api/download/dlmp3?url=${encodeURIComponent(videoUrl)}&apikey=gifted`;
        const gifted = await axios.get(giftedUrl);
        return gifted.data.result?.download_url;
        
    } catch (e) {
        console.error('Download link fetch error:', e.message);
        return null;
    }
}
