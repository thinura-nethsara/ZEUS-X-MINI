const { cmd } = require("../command");
const axios = require("axios");
const config = require("../config");

cmd({
    pattern: "fb",
    alias: ["facebook", "fbdl", "fbdown"],
    react: "📱",
    desc: "Download Facebook videos with selection menu",
    category: "download",
    filename: __filename,
}, async (bot, mek, m, { from, q, reply, prefix, userSettings }) => {
    try {
        if (!q) return reply("📱 *ZEUS X FACEBOOK DOWNLOADER*\n\nExample: .fb https://www.facebook.com/share/v/xxxxx");

        // Validate Facebook URL
        if (!q.includes('facebook.com') && !q.includes('fb.watch')) {
            return reply("❌ *Invalid URL*\n\nPlease provide a valid Facebook video URL");
        }

        const settings = userSettings || global.CURRENT_BOT_SETTINGS || {};
        const isButtonsOn = settings.buttons === 'true';
        const botName = settings.botName || config.DEFAULT_BOT_NAME || "ZEUS-X-MINI";

        // Send loading reaction
        await bot.sendMessage(from, { react: { text: '⏳', key: mek.key } });

        // Fetch video data
        const apiUrl = `https://mr-thinuzz-api-build.vercel.app/api/fbdown/download?url=${encodeURIComponent(q)}&apiKey=key_faa62e4037a95cda`;
        const response = await axios.get(apiUrl);

        if (!response.data?.status || !response.data?.data?.links) {
            return reply("❌ Failed to fetch video. Please check the URL and try again.");
        }

        const data = response.data.data;
        const videoTitle = data.title || "Facebook Video";
        const thumbnail = data.thumbnail;
        const duration = data.duration || "Unknown";
        const quality = data.quality_found || "HD";
        const hdLink = data.links.hd;
        const sdLink = data.links.sd;

        let msg = `📱 *ZEUS X FB DOWNLOADER* 📱\n\n` +
                  `📝 *Title:* ${videoTitle}\n` +
                  `⏱️ *Duration:* ${duration}\n` +
                  `📊 *Quality:* ${quality}\n` +
                  `🔗 *Link:* ${q}\n\n`;

        // --- BUTTON MODE ---
        if (isButtonsOn) {
            msg += `> _𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 𝐙𝐄𝐔𝐒 𝐈𝐍𝐂 </>_ `;

            const sentMsg = await bot.sendMessage(from, {
                image: { url: thumbnail },
                caption: msg,
                buttons: [
                    { buttonId: "hd_video", buttonText: { displayText: "🎬 HD Video" }, type: 1 },
                    { buttonId: "sd_video", buttonText: { displayText: "📹 SD Video" }, type: 1 }
                ],
                headerType: 4
            }, { quoted: mek });

            // 🟢 BUTTON LISTENER
            const buttonListener = async (update) => {
                try {
                    const msgUpdate = update.messages[0];
                    if (!msgUpdate || !msgUpdate.message) return;

                    let selectedButton = null;
                    
                    if (msgUpdate.message.buttonsResponseMessage) {
                        selectedButton = msgUpdate.message.buttonsResponseMessage.selectedButtonId;
                    } else if (msgUpdate.message.templateButtonReplyMessage) {
                        selectedButton = msgUpdate.message.templateButtonReplyMessage.selectedId;
                    } else if (msgUpdate.message.interactiveResponseMessage) {
                        selectedButton = msgUpdate.message.interactiveResponseMessage.nativeFlowResponseMessage?.buttonsMessage?.selectedButtonId;
                    }

                    const contextInfo = msgUpdate.message.extendedTextMessage?.contextInfo || 
                                      msgUpdate.message.buttonsResponseMessage?.contextInfo ||
                                      msgUpdate.message.templateButtonReplyMessage?.contextInfo;

                    const isReplyToBot = contextInfo?.stanzaId === sentMsg.key.id;

                    if (isReplyToBot && (selectedButton === 'hd_video' || selectedButton === 'sd_video')) {
                        bot.ev.off('messages.upsert', buttonListener);

                        await bot.sendMessage(from, { react: { text: '⏳', key: msgUpdate.key } });

                        try {
                            const videoUrl = selectedButton === 'hd_video' ? hdLink : sdLink;
                            if (!videoUrl) {
                                await bot.sendMessage(from, { react: { text: '❌', key: msgUpdate.key } });
                                return reply(`❌ ${selectedButton === 'hd_video' ? 'HD' : 'SD'} video link not found.`);
                            }

                            // Send video
                            await bot.sendMessage(from, {
                                video: { url: videoUrl },
                                caption: `📱 *${videoTitle}*\n\n> _𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 𝐙𝐄𝐔𝐒 𝐈𝐍𝐂 </>_ `,
                                mimetype: "video/mp4"
                            }, { quoted: msgUpdate });

                            await bot.sendMessage(from, { react: { text: '✅', key: msgUpdate.key } });
                        } catch (err) {
                            console.error("Download Error:", err);
                            await bot.sendMessage(from, { react: { text: '❌', key: msgUpdate.key } });
                            reply("❌ Error downloading video.");
                        }
                    }
                } catch (err) {
                    console.error("Listener Error:", err);
                }
            };

            bot.ev.on('messages.upsert', buttonListener);
            setTimeout(() => {
                bot.ev.off('messages.upsert', buttonListener);
            }, 300000);

            return;
        }

        // --- TEXT MODE (Default) ---
        msg += `*Reply with a number:* \n\n` +
               `1️⃣ *HD Video* (${quality})\n` +
               `2️⃣ *SD Video* (360p)\n\n` +
               `> _𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 𝐙𝐄𝐔𝐒 𝐈𝐍𝐂 </>_`;

        const sentMsg = await bot.sendMessage(from, {
            image: { url: thumbnail },
            caption: msg
        }, { quoted: mek });

        // Text Reply Listener
        const listener = async (update) => {
            try {
                const msgUpdate = update.messages[0];
                if (!msgUpdate || !msgUpdate.message) return;

                const body = msgUpdate.message.conversation || 
                           msgUpdate.message.extendedTextMessage?.text;

                const contextInfo = msgUpdate.message.extendedTextMessage?.contextInfo;
                const isReplyToBot = contextInfo?.stanzaId === sentMsg.key.id;

                if (isReplyToBot && (body === '1' || body === '2')) {
                    bot.ev.off('messages.upsert', listener);

                    await bot.sendMessage(from, { react: { text: '⏳', key: msgUpdate.key } });

                    try {
                        const videoUrl = body === '1' ? hdLink : sdLink;
                        if (!videoUrl) {
                            await bot.sendMessage(from, { react: { text: '❌', key: msgUpdate.key } });
                            return reply(`❌ ${body === '1' ? 'HD' : 'SD'} video link not found.`);
                        }

                        await bot.sendMessage(from, {
                            video: { url: videoUrl },
                            caption: `📱 *${videoTitle}*\n\n> _𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 𝐙𝐄𝐔𝐒 𝐈𝐍𝐂 </>_`,
                            mimetype: "video/mp4"
                        }, { quoted: msgUpdate });

                        await bot.sendMessage(from, { react: { text: '✅', key: msgUpdate.key } });
                    } catch (err) {
                        console.error("Download Error:", err);
                        await bot.sendMessage(from, { react: { text: '❌', key: msgUpdate.key } });
                        reply("❌ Error downloading video.");
                    }
                }
            } catch (err) {
                console.error("Listener Error:", err);
            }
        };

        bot.ev.on('messages.upsert', listener);
        setTimeout(() => {
            bot.ev.off('messages.upsert', listener);
        }, 300000);

    } catch (e) {
        console.log("FB ERROR:", e);
        reply("❌ *Error:* " + e.message);
    }
});

module.exports = {};
