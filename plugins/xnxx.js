const { cmd } = require("../command");
const axios = require("axios");

const API_KEY = "darknero";
const SEARCH_API = "https://apis.sandarux.sbs/api/download/xnxx-search";
const DL_API = "https://apis.sandarux.sbs/api/download/xnxx-dl";
const LOGO_URL = "https://raw.githubusercontent.com/Akashkavindu/MINI-BOT-SOURCE/main/zanta-md.png";

cmd({
    pattern: "xnxx",
    alias: ["porn", "xvideo"],
    react: "🔞",
    desc: "XNXX downloader with 150MB limit and RAM optimization.",
    category: "download",
    filename: __filename
}, async (bot, mek, m, { from, q, reply }) => {
    try {
        if (!q) return reply("🔞 *ZANTA XNXX SEARCH*\n\nExample: .xnxx blue film");

        const searchRes = await axios.get(`${SEARCH_API}?apikey=${API_KEY}&q=${encodeURIComponent(q)}`).catch(() => null);
        
        if (!searchRes || !searchRes.data.status || !searchRes.data.data.length === 0) {
            return reply("❌ කිසිදු ප්‍රතිඵලයක් හමු නොවීය.");
        }

        const results = searchRes.data.data.slice(0, 10);
        let msg = `🔞 *ZANTA XNXX SEARCH* 🔞\n\n🔍 Query: *${q}*\n\n`;
        results.forEach((res, index) => {
            msg += `${index + 1}️⃣ *${res.title}*\n`;
        });
        msg += `\n> *Reply with the number to download.* \n\n*© ZANTA-MD*`;

        const sentMsg = await bot.sendMessage(from, { 
            image: { url: LOGO_URL }, 
            caption: msg 
        }, { quoted: mek });

        const xnxxListener = async (update) => {
            try {
                const msgUpdate = update.messages[0];
                if (!msgUpdate.message) return;

                const body = msgUpdate.message.conversation || msgUpdate.message.extendedTextMessage?.text;
                const isReplyToBot = msgUpdate.message.extendedTextMessage?.contextInfo?.stanzaId === sentMsg.key.id;

                if (isReplyToBot && !isNaN(body)) {
                    const index = parseInt(body) - 1;
                    const selectedVideo = results[index];

                    if (selectedVideo) {
                        bot.ev.off('messages.upsert', xnxxListener); // Stop listening immediately
                        await bot.sendMessage(from, { react: { text: '⏳', key: msgUpdate.key } });

                        const dlRes = await axios.get(`${DL_API}?apikey=${API_KEY}&url=${selectedVideo.url}`).catch(() => null);
                        
                        if (!dlRes || !dlRes.data.status || !dlRes.data.links) {
                            return reply("❌ වීඩියෝ ලින්ක් එක ලබා ගැනීමට නොහැකි විය.");
                        }

                        // --- 1. Size Limit Check (150MB) ---
                        // API එකෙන් size එක එන්නේ නැත්නම් axios head request එකක් දානවා
                        const finalUrl = dlRes.data.links.high || dlRes.data.links.low;
                        const head = await axios.head(finalUrl).catch(() => null);
                        const sizeInBytes = head?.headers['content-length'] || 0;
                        const sizeInMB = sizeInBytes / (1024 * 1024);

                        if (sizeInMB > 150) {
                            return reply(`⚠️ මේ වීඩියෝ එක 150MB ට වඩා වැඩියි (${sizeInMB.toFixed(2)} MB). කරුණාකර වෙනත් වීඩියෝවක් තෝරාගන්න.`);
                        }

                        const videoTitle = selectedVideo.title || "XNXX Video";

                        // --- 2. Send Video ---
                        await bot.sendMessage(from, { 
                            document: { url: finalUrl }, 
                            mimetype: 'video/mp4', 
                            fileName: `[ZANTA-MD] ${videoTitle}.mp4`,
                            caption: `🎬 *${videoTitle}*\n⚖️ *Size:* ${sizeInMB.toFixed(2)} MB\n\n> *© ZANTA-MD XNXX SERVICE*`
                        }, { quoted: msgUpdate });

                        await bot.sendMessage(from, { react: { text: '✅', key: msgUpdate.key } });

                        // --- 3. RAM Cleanup Logic ---
                        if (global.gc) {
                            global.gc(); // Force garbage collection if enabled
                        }
                    }
                }
            } catch (err) {
                console.error("XNXX Listener Error:", err);
            }
        };

        bot.ev.on('messages.upsert', xnxxListener);
        setTimeout(() => bot.ev.off('messages.upsert', xnxxListener), 300000);

    } catch (e) {
        console.error("Main Command Error:", e);
        reply("❌ දෝෂයක් සිදු විය: " + e.message);
    }
});
