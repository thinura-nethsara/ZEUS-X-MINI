const { cmd } = require("../command");
const axios = require("axios");
const config = require("../config");

cmd({
    pattern: "tt",
    alias: ["tiktok", "tk"],
    react: "🎵",
    desc: "Download TikTok Videos without watermark",
    category: "download",
    filename: __filename,
}, async (bot, mek, m, { from, q, reply, prefix, userSettings }) => {
    try {
        if (!q) return reply("🎵 *ZEUS X TIKTOK DOWNLOADER*\n\nExample: .tt https://vt.tiktok.com/ZSxqH29nq/");

        const settings = userSettings || global.CURRENT_BOT_SETTINGS || {};
        const isButtonsOn = settings.buttons === 'true';
        const botName = settings.botName || config.DEFAULT_BOT_NAME || "ZEUS-X-MINI";

        // URL එක validate කිරීම
        const tiktokUrl = q.trim();
        if (!tiktokUrl.includes('tiktok.com') && !tiktokUrl.includes('vt.tiktok.com')) {
            return reply("❌ Please provide a valid TikTok URL");
        }

        // API එකෙන් data ගැනීම
        const apiUrl = `https://mr-thinuzz-api-build.vercel.app/api/tiktok?url=${encodeURIComponent(tiktokUrl)}&apiKey=key_faa62e4037a95cda`;
        const response = await axios.get(apiUrl);
        
        if (!response.data?.status) {
            return reply("❌ Failed to fetch TikTok content. Please check the URL.");
        }

        const data = response.data.data;
        const downloadLinks = data.download_links || [];

        if (downloadLinks.length === 0) {
            return reply("❌ No download links found for this video.");
        }

        // Find available qualities
        const nowmLink = downloadLinks.find(link => link.type === 'nowm');
        const wmLink = downloadLinks.find(link => link.type === 'wm');
        const hdLink = downloadLinks.find(link => link.type === 'hd');

        let msg = `🎵 *ZEUS X TIKTOK DOWNLOADER* 🎵\n\n`;
        msg += `📝 *Title:* ${data.title || 'TikTok Video'}\n`;
        msg += `👤 *Author:* ${data.author_name || data.username || 'Unknown'}\n`;
        msg += `⏱️ *Duration:* ${data.duration || 'Unknown'} seconds\n`;
        msg += `👁️ *Views:* ${formatNumber(data.views)}\n`;
        msg += `❤️ *Likes:* ${formatNumber(data.likes)}\n`;
        msg += `💬 *Comments:* ${formatNumber(data.comments)}\n`;
        msg += `↗️ *Shares:* ${formatNumber(data.shares)}\n\n`;

        // --- BUTTON MODE ---
        if (isButtonsOn) {
            msg += `> _𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 𝐙𝐄𝐔𝐒 𝐈𝐍𝐂 </>_ `;

            // Create buttons based on available links
            const buttons = [];
            if (nowmLink) {
                buttons.push({ 
                    buttonId: "tt_nowm", 
                    buttonText: { displayText: "🎬 No Watermark" }, 
                    type: 1 
                });
            }
            if (hdLink && hdLink.url !== nowmLink?.url) {
                buttons.push({ 
                    buttonId: "tt_hd", 
                    buttonText: { displayText: "📹 HD Quality" }, 
                    type: 1 
                });
            }
            if (wmLink) {
                buttons.push({ 
                    buttonId: "tt_wm", 
                    buttonText: { displayText: "💧 With Watermark" }, 
                    type: 1 
                });
            }

            // Music button
            if (data.music_url) {
                buttons.push({ 
                    buttonId: "tt_music", 
                    buttonText: { displayText: "🎵 Music Only" }, 
                    type: 1 
                });
            }

            const sentMsg = await bot.sendMessage(from, {
                image: { url: data.thumbnail || data.cover },
                caption: msg,
                buttons: buttons,
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

                    if (isReplyToBot && selectedButton) {
                        bot.ev.off('messages.upsert', buttonListener);

                        await bot.sendMessage(from, { react: { text: '⏳', key: msgUpdate.key } });

                        try {
                            let mediaUrl = null;
                            let mediaType = 'video';
                            let caption = `🎵 *${data.title || 'TikTok Video'}*\n> _𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 𝐙𝐄𝐔𝐒 𝐈𝐍𝐂 </>_ `;

                            switch(selectedButton) {
                                case 'tt_nowm':
                                    mediaUrl = nowmLink?.url;
                                    caption += '\n🎬 *Without Watermark*';
                                    break;
                                case 'tt_hd':
                                    mediaUrl = hdLink?.url;
                                    caption += '\n📹 *HD Quality*';
                                    break;
                                case 'tt_wm':
                                    mediaUrl = wmLink?.url;
                                    caption += '\n💧 *With Watermark*';
                                    break;
                                case 'tt_music':
                                    mediaUrl = data.music_url;
                                    mediaType = 'audio';
                                    caption += '\n🎵 *Audio Only*';
                                    break;
                                default:
                                    mediaUrl = nowmLink?.url || downloadLinks[0]?.url;
                            }

                            if (!mediaUrl) {
                                await bot.sendMessage(from, { react: { text: '❌', key: msgUpdate.key } });
                                return reply("❌ Download link not available.");
                            }

                            // Send media
                            if (mediaType === 'audio') {
                                await bot.sendMessage(from, { 
                                    audio: { url: mediaUrl },
                                    mimetype: "audio/mpeg",
                                    ptt: false,
                                    caption: caption
                                }, { quoted: msgUpdate });
                            } else {
                                await bot.sendMessage(from, { 
                                    video: { url: mediaUrl },
                                    caption: caption,
                                    mimetype: "video/mp4"
                                }, { quoted: msgUpdate });
                            }

                            await bot.sendMessage(from, { react: { text: '✅', key: msgUpdate.key } });
                        } catch (err) {
                            console.error("Download Error:", err);
                            await bot.sendMessage(from, { react: { text: '❌', key: msgUpdate.key } });
                            reply("❌ Error downloading media.");
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
        let options = [];
        let index = 1;
        
        if (nowmLink) {
            options.push(`${index++}️⃣ *No Watermark* (Best Quality)`);
        }
        if (hdLink && hdLink.url !== nowmLink?.url) {
            options.push(`${index++}️⃣ *HD Quality* (High Quality)`);
        }
        if (wmLink) {
            options.push(`${index++}️⃣ *With Watermark*`);
        }
        if (data.music_url) {
            options.push(`${index++}️⃣ *Music Only* (Audio)`);
        }

        msg += `*Reply with a number:* \n\n${options.join('\n')}\n\n`;
        msg += `> _𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 𝐙𝐄𝐔𝐒 𝐈𝐍𝐂 </>_ `;

        const sentMsg = await bot.sendMessage(from, { 
            image: { url: data.thumbnail || data.cover }, 
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
                    
                    if (selectedOption >= 1 && selectedOption <= options.length) {
                        bot.ev.off('messages.upsert', listener);

                        await bot.sendMessage(from, { react: { text: '⏳', key: msgUpdate.key } });

                        try {
                            let mediaUrl = null;
                            let mediaType = 'video';
                            let caption = `🎵 *${data.title || 'TikTok Video'}*\n> _𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 ${botName.toUpperCase()} </>`;

                            // Map selection to media
                            let currentIndex = 1;
                            if (selectedOption === currentIndex++ && nowmLink) {
                                mediaUrl = nowmLink.url;
                                caption += '\n🎬 *Without Watermark*';
                            } else if (selectedOption === currentIndex++ && hdLink && hdLink.url !== nowmLink?.url) {
                                mediaUrl = hdLink.url;
                                caption += '\n📹 *HD Quality*';
                            } else if (selectedOption === currentIndex++ && wmLink) {
                                mediaUrl = wmLink.url;
                                caption += '\n💧 *With Watermark*';
                            } else if (selectedOption === currentIndex++ && data.music_url) {
                                mediaUrl = data.music_url;
                                mediaType = 'audio';
                                caption += '\n🎵 *Audio Only*';
                            } else {
                                mediaUrl = nowmLink?.url || downloadLinks[0]?.url;
                            }

                            if (!mediaUrl) {
                                await bot.sendMessage(from, { react: { text: '❌', key: msgUpdate.key } });
                                return reply("❌ Download link not available.");
                            }

                            if (mediaType === 'audio') {
                                await bot.sendMessage(from, { 
                                    audio: { url: mediaUrl },
                                    mimetype: "audio/mpeg",
                                    ptt: false,
                                    caption: caption
                                }, { quoted: msgUpdate });
                            } else {
                                await bot.sendMessage(from, { 
                                    video: { url: mediaUrl },
                                    caption: caption,
                                    mimetype: "video/mp4"
                                }, { quoted: msgUpdate });
                            }

                            await bot.sendMessage(from, { react: { text: '✅', key: msgUpdate.key } });
                        } catch (err) {
                            console.error("Download Error:", err);
                            await bot.sendMessage(from, { react: { text: '❌', key: msgUpdate.key } });
                            reply("❌ Error downloading media.");
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
        console.log("TIKTOK ERROR:", e);
        reply("❌ *Error:* " + e.message);
    }
});

// --- Helper Function ---
function formatNumber(num) {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

module.exports = {};
