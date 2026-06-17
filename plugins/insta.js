const { cmd } = require("../command");
const axios = require("axios");
const config = require("../config");

cmd({
    pattern: "ig",
    alias: ["instagram", "reel", "insta"],
    react: "📸",
    desc: "Download Instagram Reels/Videos",
    category: "download",
    filename: __filename,
}, async (bot, mek, m, { from, q, reply, prefix, userSettings }) => {
    try {
        if (!q) return reply("📸 *ZEUS X INSTAGRAM DOWNLOADER*\n\nExample: .ig https://www.instagram.com/reel/...");

        const settings = userSettings || global.CURRENT_BOT_SETTINGS || {};
        const isButtonsOn = settings.buttons === 'true';
        const botName = settings.botName || config.DEFAULT_BOT_NAME || "ZEUS-X-MINI";

        // URL එක validate කිරීම
        const instagramUrl = q.trim();
        if (!instagramUrl.includes('instagram.com')) {
            return reply("❌ Please provide a valid Instagram URL");
        }

        // API එකෙන් data ගැනීම
        const apiUrl = `https://mr-thinuzz-api-build.vercel.app/api/instadown/download?url=${encodeURIComponent(instagramUrl)}&apiKey=key_faa62e4037a95cda`;
        const response = await axios.get(apiUrl);
        
        if (!response.data?.status) {
            return reply("❌ Failed to fetch Instagram content. Please check the URL.");
        }

        const data = response.data.data;
        const isVideo = data.type === 'video';
        const isImage = data.type === 'image' || data.type === 'carousel';
        
        // Multiple media types support
        let mediaUrls = [];
        if (isVideo) {
            mediaUrls = [
                { quality: 'HD', url: data.links.hd || data.links.sd },
                { quality: 'SD', url: data.links.sd || data.links.hd }
            ];
        } else if (isImage) {
            // Carousel or single image
            if (data.links && Array.isArray(data.links)) {
                mediaUrls = data.links.map(link => ({ quality: 'Image', url: link }));
            } else if (data.links?.hd) {
                mediaUrls = [{ quality: 'HD', url: data.links.hd }];
            } else if (data.links?.sd) {
                mediaUrls = [{ quality: 'SD', url: data.links.sd }];
            }
        }

        if (mediaUrls.length === 0) {
            return reply("❌ No media found in this post.");
        }

        let msg = `📸 *ZEUS X INSTAGRAM DOWNLOADER* 📸\n\n`;
        msg += `📝 *Title:* ${data.title || 'Instagram Post'}\n`;
        msg += `📎 *Type:* ${isVideo ? '🎬 Video' : isImage ? '🖼️ Image' : '📁 Media'}\n`;
        msg += `⏱️ *Expires:* ${data.expires_in || '15 minutes'}\n\n`;

        // --- BUTTON MODE ---
        if (isButtonsOn && isVideo) {
            msg += `> _𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 𝐙𝐄𝐔𝐒 𝐈𝐍𝐂 </>_ `;

            const sentMsg = await bot.sendMessage(from, {
                image: { url: data.thumbnail || mediaUrls[0]?.url },
                caption: msg,
                buttons: [
                    { buttonId: "ig_hd", buttonText: { displayText: "🎬 HD Video" }, type: 1 },
                    { buttonId: "ig_sd", buttonText: { displayText: "📹 SD Video" }, type: 1 }
                ],
                headerType: 4
            }, { quoted: mek });

            // Button Listener
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

                    if (isReplyToBot && (selectedButton === 'ig_hd' || selectedButton === 'ig_sd')) {
                        bot.ev.off('messages.upsert', buttonListener);

                        await bot.sendMessage(from, { react: { text: '⏳', key: msgUpdate.key } });

                        try {
                            const quality = selectedButton === 'ig_hd' ? 'HD' : 'SD';
                            const mediaUrl = mediaUrls.find(m => m.quality === quality)?.url || mediaUrls[0]?.url;
                            
                            if (!mediaUrl) {
                                await bot.sendMessage(from, { react: { text: '❌', key: msgUpdate.key } });
                                return reply(`❌ ${quality} video not available.`);
                            }

                            // Send video
                            await bot.sendMessage(from, { 
                                video: { url: mediaUrl },
                                caption: `📸 *${data.title || 'Instagram Reel'}*\n> _𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 𝐙𝐄𝐔𝐒 𝐈𝐍𝐂 </>_ `,
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
        if (isVideo) {
            msg += `*Reply with a number:* \n\n` +
                   `1️⃣ *HD Video* (High Quality)\n` +
                   `2️⃣ *SD Video* (Standard Quality)\n\n` +
                   `> _𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 𝐙𝐄𝐔𝐒 𝐈𝐍𝐂 </>_ `;
        } else if (isImage) {
            msg += `*Reply with a number:* \n\n` +
                   `1️⃣ *Download Image* (${mediaUrls.length > 1 ? 'All Images' : 'Image'})\n\n` +
                   `> _𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 𝐙𝐄𝐔𝐒 𝐈𝐍𝐂 </>_ `;
        }

        const sentMsg = await bot.sendMessage(from, { 
            image: { url: data.thumbnail || mediaUrls[0]?.url }, 
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

                if (isReplyToBot) {
                    const selectedOption = parseInt(body);
                    
                    // For videos
                    if (isVideo && (selectedOption === 1 || selectedOption === 2)) {
                        bot.ev.off('messages.upsert', listener);

                        await bot.sendMessage(from, { react: { text: '⏳', key: msgUpdate.key } });

                        try {
                            const quality = selectedOption === 1 ? 'HD' : 'SD';
                            const mediaUrl = mediaUrls.find(m => m.quality === quality)?.url || mediaUrls[0]?.url;
                            
                            if (!mediaUrl) {
                                await bot.sendMessage(from, { react: { text: '❌', key: msgUpdate.key } });
                                return reply(`❌ ${quality} video not available.`);
                            }

                            await bot.sendMessage(from, { 
                                video: { url: mediaUrl },
                                caption: `📸 *${data.title || 'Instagram Reel'}*\n> _𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 𝐙𝐄𝐔𝐒 𝐈𝐍𝐂 </>_ `,
                                mimetype: "video/mp4"
                            }, { quoted: msgUpdate });

                            await bot.sendMessage(from, { react: { text: '✅', key: msgUpdate.key } });
                        } catch (err) {
                            console.error("Download Error:", err);
                            await bot.sendMessage(from, { react: { text: '❌', key: msgUpdate.key } });
                            reply("❌ Error downloading video.");
                        }
                    }
                    // For images
                    else if (isImage && selectedOption === 1) {
                        bot.ev.off('messages.upsert', listener);

                        await bot.sendMessage(from, { react: { text: '⏳', key: msgUpdate.key } });

                        try {
                            if (mediaUrls.length === 1) {
                                // Single image
                                await bot.sendMessage(from, { 
                                    image: { url: mediaUrls[0].url },
                                    caption: `📸 *${data.title || 'Instagram Image'}*\n> _𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 𝐙𝐄𝐔𝐒 𝐈𝐍𝐂 </>_ `
                                }, { quoted: msgUpdate });
                            } else {
                                // Multiple images (carousel)
                                for (let i = 0; i < Math.min(mediaUrls.length, 10); i++) {
                                    await bot.sendMessage(from, { 
                                        image: { url: mediaUrls[i].url },
                                        caption: `📸 *${data.title || 'Instagram Image'} (${i+1}/${mediaUrls.length})*\n> _𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 𝐙𝐄𝐔𝐒 𝐈𝐍𝐂 </>_ `
                                    }, { quoted: msgUpdate });
                                }
                            }

                            await bot.sendMessage(from, { react: { text: '✅', key: msgUpdate.key } });
                        } catch (err) {
                            console.error("Download Error:", err);
                            await bot.sendMessage(from, { react: { text: '❌', key: msgUpdate.key } });
                            reply("❌ Error downloading image.");
                        }
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
        console.log("IG ERROR:", e);
        reply("❌ *Error:* " + e.message);
    }
});

module.exports = {};
