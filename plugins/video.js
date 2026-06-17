const { cmd } = require("../command");
const axios = require("axios");
const yts = require("yt-search");
const config = require("../config");

cmd({
    pattern: "video",
    alias: ["ytv", "mp4", "ytvideo", "ytmp4"],
    react: "🎬",
    desc: "Download YouTube videos with quality selection",
    category: "download",
    filename: __filename,
}, async (bot, mek, m, { from, q, reply, prefix, userSettings }) => {
    try {
        if (!q) return reply("🎬 *ZEUS X VIDEO DOWNLOADER*\n\nExample: .video alone");

        const settings = userSettings || global.CURRENT_BOT_SETTINGS || {};
        const isButtonsOn = settings.buttons === 'true';
        const botName = settings.botName || config.DEFAULT_BOT_NAME || "ZEUS-X-MINI";

        // Send loading reaction
        await bot.sendMessage(from, { react: { text: '⏳', key: mek.key } });

        // Search YouTube video
        const search = await yts(q);
        const video = search.videos[0];
        if (!video) return reply("❌ No results found on YouTube.");

        // Fetch video download links
        const apiUrl = `https://mr-thinuzz-api-build.vercel.app/api/ytmp4v2/download?url=${encodeURIComponent(video.url)}&quality=720&apiKey=key_faa62e4037a95cda`;
        const response = await axios.get(apiUrl);

        if (!response.data?.status || !response.data?.data?.all_qualities) {
            return reply("❌ Failed to fetch video links. Please try again.");
        }

        const data = response.data.data;
        const videoTitle = data.title || video.title;
        const thumbnail = data.thumbnail || video.thumbnail;
        const duration = data.duration || video.timestamp || "Unknown";
        const channel = data.channel_author || video.author?.name || "Unknown";
        const qualities = data.all_qualities || [];
        
        // Sort qualities (highest first)
        qualities.sort((a, b) => parseInt(b.quality) - parseInt(a.quality));

        let msg = `🎬 *ZEUS X VIDEO DOWNLOADER* 🎬\n\n` +
                  `📝 *Title:* ${videoTitle}\n` +
                  `👤 *Channel:* ${channel}\n` +
                  `⏱️ *Duration:* ${duration}\n` +
                  `🔗 *Link:* ${video.url}\n\n`;

        // --- BUTTON MODE ---
        if (isButtonsOn) {
            // Create buttons for top 3 qualities
            const buttons = [];
            const qualityMap = {
                '1080': '🎥 1080p HD',
                '720': '🎥 720p HD',
                '480': '🎥 480p',
                '360': '🎥 360p',
                '240': '🎥 240p',
                '144': '🎥 144p'
            };

            // Add up to 3 quality buttons
            qualities.slice(0, 3).forEach((q, index) => {
                const qualityLabel = qualityMap[q.quality] || `🎥 ${q.quality}p`;
                buttons.push({
                    buttonId: `quality_${q.quality}`,
                    buttonText: { displayText: qualityLabel },
                    type: 1
                });
            });

            // If more than 3 qualities, add a "More" button
            if (qualities.length > 3) {
                buttons.push({
                    buttonId: "more_qualities",
                    buttonText: { displayText: "📋 More Qualities" },
                    type: 1
                });
            }

            msg += `*Available Qualities:* ${qualities.length}\n\n`;
            msg += `> _𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 𝐙𝐄𝐔𝐒 𝐈𝐍𝐂 </>_ `;

            const sentMsg = await bot.sendMessage(from, {
                image: { url: thumbnail },
                caption: msg,
                buttons: buttons,
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

                    if (isReplyToBot && selectedButton) {
                        // Handle "More Qualities" button
                        if (selectedButton === 'more_qualities') {
                            bot.ev.off('messages.upsert', buttonListener);
                            
                            // Send quality list as text
                            let qualityList = `📋 *Available Qualities*\n\n`;
                            qualities.forEach((q, index) => {
                                qualityList += `${index + 1}. ${q.quality}p\n`;
                            });
                            qualityList += `\n_Reply with the number to select quality._\n\n> _𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 𝐙𝐄𝐔𝐒 𝐈𝐍𝐂 </>_ `;

                            const qualityMsg = await bot.sendMessage(from, {
                                text: qualityList
                            }, { quoted: msgUpdate });

                            // Quality selection listener
                            const qualityListener = async (update2) => {
                                try {
                                    const msgUpdate2 = update2.messages[0];
                                    if (!msgUpdate2 || !msgUpdate2.message) return;

                                    const body = msgUpdate2.message.conversation || 
                                               msgUpdate2.message.extendedTextMessage?.text;
                                    const contextInfo2 = msgUpdate2.message.extendedTextMessage?.contextInfo;
                                    const isReplyToQuality = contextInfo2?.stanzaId === qualityMsg.key.id;

                                    if (isReplyToQuality && body && !isNaN(body) && parseInt(body) > 0 && parseInt(body) <= qualities.length) {
                                        bot.ev.off('messages.upsert', qualityListener);
                                        
                                        const selectedQuality = qualities[parseInt(body) - 1];
                                        await downloadAndSendVideo(selectedQuality.downloadUrl, videoTitle, botName, from, msgUpdate2);
                                    }
                                } catch (err) {
                                    console.error("Quality Listener Error:", err);
                                }
                            };

                            bot.ev.on('messages.upsert', qualityListener);
                            setTimeout(() => {
                                bot.ev.off('messages.upsert', qualityListener);
                            }, 300000);
                            
                            return;
                        }

                        // Handle quality button
                        const qualityMatch = selectedButton.match(/quality_(\d+)/);
                        if (qualityMatch) {
                            const selectedQuality = qualityMatch[1];
                            const qualityData = qualities.find(q => q.quality === selectedQuality);
                            
                            if (qualityData) {
                                bot.ev.off('messages.upsert', buttonListener);
                                await downloadAndSendVideo(qualityData.downloadUrl, videoTitle, botName, from, msgUpdate);
                            }
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
        msg += `*Available Qualities:*\n\n`;
        qualities.forEach((q, index) => {
            const qualityLabel = `${q.quality}p`;
            msg += `${index + 1}. ${qualityLabel}\n`;
        });
        msg += `\n*Reply with a number to select quality.*\n\n`;
        msg += `> _𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 𝐙𝐄𝐔𝐒 𝐈𝐍𝐂 </>_ `;

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

                if (isReplyToBot && body && !isNaN(body) && parseInt(body) > 0 && parseInt(body) <= qualities.length) {
                    bot.ev.off('messages.upsert', listener);

                    const selectedQuality = qualities[parseInt(body) - 1];
                    await downloadAndSendVideo(selectedQuality.downloadUrl, videoTitle, botName, from, msgUpdate);
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
        console.log("VIDEO ERROR:", e);
        reply("❌ *Error:* " + e.message);
    }
});

// Helper function to download and send video
async function downloadAndSendVideo(videoUrl, title, botName, from, msgUpdate) {
    try {
        await bot.sendMessage(from, { react: { text: '⏳', key: msgUpdate.key } });

        await bot.sendMessage(from, {
            video: { url: videoUrl },
            caption: `🎬 *${title}*\n\n> _𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 𝐙𝐄𝐔𝐒 𝐈𝐍𝐂 </>_ `,
            mimetype: "video/mp4"
        }, { quoted: msgUpdate });

        await bot.sendMessage(from, { react: { text: '✅', key: msgUpdate.key } });
    } catch (err) {
        console.error("Download Error:", err);
        await bot.sendMessage(from, { react: { text: '❌', key: msgUpdate.key } });
        reply("❌ Error downloading video.");
    }
}

module.exports = {};
