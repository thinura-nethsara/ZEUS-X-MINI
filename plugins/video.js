const { cmd } = require("../command");
const axios = require("axios");
const yts = require("yt-search");
const config = require("../config");
const fs = require("fs");
const path = require("path");

cmd({
    pattern: "video",
    alias: ["mp4", "ytv"],
    react: "🎥",
    desc: "Download YouTube Video with quality selection",
    category: "download",
    filename: __filename,
}, async (bot, mek, m, { from, q, reply, prefix }) => {
    try {
        if (!q) return reply("🎥 *ZEUS X VIDEO PLAYER*\n\nExample: .video alone\n\nOr: .video https://youtube.com/watch?v=xxx");

        let videoUrl = q;
        let videoInfo = null;

        // යූටියුබ් URL එකක්දැයි පරීක්ෂා කරන්න
        const isYouTubeUrl = q.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);

        if (isYouTubeUrl) {
            videoUrl = q;
        } else {
            const search = await yts(q);
            const video = search.videos[0];
            if (!video) return reply("❌ No results found on YouTube.");
            videoUrl = video.url;
            videoInfo = video;
        }

        // API URL එක සාදන්න
        const apiUrl = `https://mr-thinuzz-api-build.vercel.app/api/ytmp4v2/download?url=${encodeURIComponent(videoUrl)}&quality=720&apiKey=key_faa62e4037a95cda`;

        // මුලින්ම API එකෙන් වීඩියෝ තොරතුරු ලබා ගන්න
        const initialResponse = await axios.get(apiUrl);
        const data = initialResponse.data.data;

        if (!data || !data.all_qualities || data.all_qualities.length === 0) {
            return reply("❌ වීඩියෝව සොයා ගැනීමට නොහැකි විය.");
        }

        // Quality options සාදන්න
        const qualityOptions = data.all_qualities.map((q, index) => {
            const emoji = index === 0 ? '1️⃣' : index === 1 ? '2️⃣' : index === 2 ? '3️⃣' : '4️⃣';
            return `${emoji} *${q.quality}p*`;
        }).join('\n');

        let msg = `🎥 *ZEUS X VIDEO PLAYER* 🎥\n\n` +
                  `📝 *Title:* ${data.title || 'N/A'}\n` +
                  `👤 *Channel:* ${data.channel_author || 'N/A'}\n` +
                  `⏱️ *Duration:* ${data.duration || 'N/A'}\n` +
                  `🔗 *Link:* ${data.original_url || videoUrl}\n\n` +
                  `*Reply with a quality number:* \n\n` +
                  `${qualityOptions}\n\n` +
                  `💡 *Tip:* Lower quality = Smaller file size\n` +
                  `> _𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 𝐙𝐄𝐔𝐒 𝐈𝐍𝐂 </>_ `;

        const thumbnail = data.thumbnail || `https://i.ytimg.com/vi/${data.video_id}/hqdefault.jpg`;
        
        const sentMsg = await bot.sendMessage(from, { 
            image: { url: thumbnail }, 
            caption: msg 
        }, { quoted: mek });

        const listener = async (update) => {
            const msgUpdate = update.messages[0];
            if (!msgUpdate.message) return;

            const body = msgUpdate.message.conversation || 
                         msgUpdate.message.extendedTextMessage?.text;

            const isReplyToBot = msgUpdate.message.extendedTextMessage?.contextInfo?.stanzaId === sentMsg.key.id;

            if (isReplyToBot && ['1', '2', '3', '4'].includes(body)) {
                await bot.sendMessage(from, { react: { text: '⏳', key: msgUpdate.key } });

                const selectedIndex = parseInt(body) - 1;
                
                if (selectedIndex >= data.all_qualities.length) {
                    return reply("❌ Invalid quality selection!");
                }

                const selectedQuality = data.all_qualities[selectedIndex];
                const downloadUrl = selectedQuality.downloadUrl;
                const quality = selectedQuality.quality;

                try {
                    // Video එක ඩවුන්ලෝඩ් කරන්න
                    const videoResponse = await axios({
                        method: 'get',
                        url: downloadUrl,
                        responseType: 'stream',
                        timeout: 60000 // 60 seconds timeout
                    });

                    // Temp file path එක හදන්න
                    const tempFilePath = path.join(__dirname, '../temp', `${Date.now()}_${quality}p.mp4`);
                    
                    // Temp folder එක exist කරන්නේ නැත්නම් හදන්න
                    if (!fs.existsSync(path.join(__dirname, '../temp'))) {
                        fs.mkdirSync(path.join(__dirname, '../temp'), { recursive: true });
                    }

                    // Video එක save කරන්න
                    const writer = fs.createWriteStream(tempFilePath);
                    videoResponse.data.pipe(writer);

                    await new Promise((resolve, reject) => {
                        writer.on('finish', resolve);
                        writer.on('error', reject);
                    });

                    // File size check කරන්න (WhatsApp limit 16MB)
                    const stats = fs.statSync(tempFilePath);
                    const fileSizeInMB = stats.size / (1024 * 1024);

                    let caption = `📝 *${data.title || 'Video'}*\n`;
                    caption += `✅ *Quality:* ${quality}p\n`;
                    caption += `📦 *File Size:* ${fileSizeInMB.toFixed(2)} MB\n`;
                    caption += `👤 *Channel:* ${data.channel_author || 'N/A'}\n\n`;
                    caption += `> _𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 𝐙𝐄𝐔𝐒 𝐈𝐍𝐂 </>_`;

                    // File size එක 16MB ට වඩා වැඩි නම් document එකක් ලෙස යවන්න
                    if (fileSizeInMB > 16) {
                        await bot.sendMessage(from, {
                            document: fs.readFileSync(tempFilePath),
                            mimetype: 'video/mp4',
                            fileName: `${data.title || 'video'}_${quality}p.mp4`,
                            caption: `📁 *File too large for video upload*\n\n${caption}`
                        }, { quoted: msgUpdate });
                    } else {
                        // Normal video එකක් ලෙස යවන්න
                        await bot.sendMessage(from, {
                            video: fs.readFileSync(tempFilePath),
                            mimetype: "video/mp4",
                            caption: caption
                        }, { quoted: msgUpdate });
                    }

                    // Temp file එක මකන්න
                    fs.unlinkSync(tempFilePath);

                    await bot.sendMessage(from, { react: { text: '✅', key: msgUpdate.key } });

                } catch (err) {
                    console.error("Download Error:", err.message);
                    reply(`❌ වීඩියෝව ලබා ගැනීමේදී දෝෂයක් සිදු විය.\n\n*Error:* ${err.message}\n\n*Try lower quality or try again later.*`);
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
