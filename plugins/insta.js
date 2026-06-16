const { cmd } = require("../command");
const axios = require("axios");
const config = require("../config");

cmd({
    pattern: "insta",
    alias: ["ig", "instagram", "igdl"],
    react: "📸",
    desc: "Download Instagram Media with stream optimization",
    category: "download",
    filename: __filename,
}, async (bot, mek, m, { from, q, reply, prefix, senderNumber, sender }) => {
    try {
        if (!q) return reply("📸 *ZANTA-MD INSTAGRAM DL*\n\nExample: .insta https://www.instagram.com/reels/xxxx/");
        if (!q.includes("instagram.com")) return reply("❌ Please provide a valid Instagram link.");

        await bot.sendMessage(from, { react: { text: "🔍", key: mek.key } });

        const apiUrl = `https://zanta-api.vercel.app/api/insta?url=${encodeURIComponent(q)}`;
        const response = await axios.get(apiUrl);

        if (response.data && response.data.status) {
            const result = response.data;
            
            // API එකේ තියෙන thumbnail එක මුලින්ම පෙන්වමු
            let msg = `✨ *ZANTA-MD INSTA DL* ✨\n\n` +
                      `📝 *Type:* Instagram Media\n` +
                      `🔗 *Link:* ${q.split('?')[0]}\n\n` +
                      `*Reply with a number:* \n\n` +
                      `1️⃣ *Download Media* (Video/Image)\n\n` +
                      `> *© Powered by ZANTA-MD*`;

            const sentMsg = await bot.sendMessage(from, { 
                image: { url: result.thumbnail }, 
                caption: msg 
            }, { quoted: mek });

            const listener = async (update) => {
                const msgUpdate = update.messages[0];
                if (!msgUpdate || !msgUpdate.message) return;

                const body = msgUpdate.message.conversation || 
                             msgUpdate.message.extendedTextMessage?.text;

                const isReplyToBot = msgUpdate.message.extendedTextMessage?.contextInfo?.stanzaId === sentMsg.key.id;

                if (isReplyToBot && body === '1') {
                    bot.ev.off('messages.upsert', listener);
                    await bot.sendMessage(from, { react: { text: '📥', key: msgUpdate.key } });

                    try {
                        const mediaUrl = result.downloadUrl;
                        
                        // --- [වැදගත් වෙනස] ---
                        // URL එකේ mp4 තියෙනවද බලනවා වෙනුවට, අපි මුලින්ම URL එකට Request එකක් දාලා 
                        // ඒක ඇත්තටම වීඩියෝ එකක්ද (video/mp4) කියලා Header එකෙන් චෙක් කරමු.
                        const head = await axios.head(mediaUrl, {
                            headers: { 'User-Agent': 'Mozilla/5.0' }
                        });
                        const contentType = head.headers['content-type'];
                        const isVideo = contentType && contentType.includes('video');

                        const mediaResponse = await axios({
                            method: 'get',
                            url: mediaUrl,
                            responseType: 'arraybuffer', // Stream වලදී සමහරවිට ඩවුන්ලෝඩ් නොවී මැසේජ් එක යනවා, ArrayBuffer එක 100% sure.
                            headers: {
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
                                'Referer': 'https://instasave.website/'
                            }
                        });

                        const buffer = Buffer.from(mediaResponse.data);

                        if (isVideo) {
                            await bot.sendMessage(from, { 
                                video: buffer, 
                                caption: `✅ *Downloaded by ZANTA-MD*`,
                                mimetype: 'video/mp4',
                                fileName: 'insta_video.mp4'
                            }, { quoted: msgUpdate });
                        } else {
                            await bot.sendMessage(from, { 
                                image: buffer, 
                                caption: `✅ *Downloaded by ZANTA-MD*`,
                                mimetype: 'image/jpeg'
                            }, { quoted: msgUpdate });
                        }

                        await bot.sendMessage(from, { react: { text: '✅', key: msgUpdate.key } });
                    } catch (err) {
                        console.error("DOWNLOAD ERROR:", err.message);
                        reply("❌ Failed to download media. It might be a private post or an expired link.");
                    }
                }
            };

            bot.ev.on('messages.upsert', listener);
            setTimeout(() => bot.ev.off('messages.upsert', listener), 300000);

        } else {
            return reply("❌ Media not found.");
        }

    } catch (e) {
        console.log("INSTA ERROR:", e);
        reply("❌ *Error:* " + (e.response?.data?.message || e.message));
    }
});
