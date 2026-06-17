const { cmd } = require("../command");
const axios = require("axios");
const yts = require("yt-search");
const config = require("../config");

cmd({
    pattern: "video",
    alias: ["ytv", "mp4", "vd"],
    react: "🎬",
    desc: "Download YouTube MP4 with quality selection",
    category: "download",
    filename: __filename,
}, async (bot, mek, m, { from, q, reply, prefix, userSettings }) => {
    try {
        if (!q) return reply("🎬 *ZEUS X VIDEO PLAYER*\n\nExample: .video alone");

        const settings = userSettings || global.CURRENT_BOT_SETTINGS || {};
        const isButtonsOn = settings.buttons === 'true';
        const botName = settings.botName || config.DEFAULT_BOT_NAME || "ZEUS-X-MINI";

        const search = await yts(q);
        const video = search.videos[0];
        if (!video) return reply("❌ No results found on YouTube.");

        // Get video details from API
        const videoData = await getVideoDetails(video.url);
        if (!videoData) return reply("❌ Failed to fetch video details.");

        let msg = `🎬 *ZEUS X VIDEO PLAYER* 🎬\n\n` +
                  `📝 *Title:* ${videoData.title}\n` +
                  `👤 *Channel:* ${videoData.channel_author || video.author.name}\n` +
                  `⏱️ *Duration:* ${videoData.duration || video.timestamp}\n` +
                  `🎯 *Quality:* ${videoData.quality_found || '720'}\n` +
                  `📊 *Qualities:* ${videoData.all_qualities?.length || 0}\n\n`;

        // --- BUTTON MODE ---
        if (isButtonsOn) {
            msg += `> _𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 𝐙𝐄𝐔𝐒 𝐈𝐍𝐂 </>_ `;

            // Create quality buttons
            const qualityButtons = [];
            const qualities = videoData.all_qualities || [];
            
            // Show top 3 qualities as buttons
            const qualitiesToShow = qualities.slice(0, 3);
            qualitiesToShow.forEach((q, index) => {
                qualityButtons.push({
                    buttonId: `quality_${q.quality}`,
                    buttonText: { displayText: `📹 ${q.quality}p` },
                    type: 1
                });
            });

            // If more than 3 qualities, add a "More" button
            if (qualities.length > 3) {
                qualityButtons.push({
                    buttonId: "more_qualities",
                    buttonText: { displayText: "📋 More Qualities" },
                    type: 1
                });
            }

            const sentMsg = await bot.sendMessage(from, {
                image: { url: videoData.thumbnail || video.thumbnail },
                caption: msg,
                buttons: qualityButtons,
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
                    }

                    const contextInfo = msgUpdate.message.extendedTextMessage?.contextInfo || 
                                      msgUpdate.message.buttonsResponseMessage?.contextInfo ||
                                      msgUpdate.message.templateButtonReplyMessage?.contextInfo;

                    const isReplyToBot = contextInfo?.stanzaId === sentMsg.key.id;

                    if (isReplyToBot && selectedButton) {
                        bot.ev.off('messages.upsert', buttonListener);

                        await bot.sendMessage(from, { react: { text: '⏳', key: msgUpdate.key } });

                        try {
                            let downloadUrl = null;
                            let quality = '';

                            if (selectedButton === 'more_qualities') {
                                // Show all qualities as text
                                let qualityList = `📋 *Available Qualities*\n\n`;
                                qualities.forEach((q, index) => {
                                    qualityList += `${index + 1}. ${q.quality}p\n`;
                                });
                                qualityList += `\n*Reply with number to select quality*`;

                                const qualityMsg = await bot.sendMessage(from, { 
                                    text: qualityList 
                                }, { quoted: msgUpdate });

                                // Wait for quality selection
                                const qualityListener = async (update2) => {
                                    const msgUpdate2 = update2.messages[0];
                                    if (!msgUpdate2 || !msgUpdate2.message) return;

                                    const body = msgUpdate2.message.conversation || 
                                               msgUpdate2.message.extendedTextMessage?.text;
                                    
                                    const isReplyToQuality = msgUpdate2.message.extendedTextMessage?.contextInfo?.stanzaId === qualityMsg.key.id;

                                    if (isReplyToQuality && body && !isNaN(body)) {
                                        const index = parseInt(body) - 1;
                                        if (index >= 0 && index < qualities.length) {
                                            bot.ev.off('messages.upsert', qualityListener);
                                            downloadUrl = qualities[index].downloadUrl;
                                            quality = qualities[index].quality;
                                            
                                            await sendVideo(bot, from, msgUpdate2, downloadUrl, videoData, quality, botName);
                                        }
                                    }
                                };

                                bot.ev.on('messages.upsert', qualityListener);
                                setTimeout(() => {
                                    bot.ev.off('messages.upsert', qualityListener);
                                }, 60000);

                                return;
                            } else {
                                // Find quality from button ID
                                const qualityMatch = selectedButton.match(/quality_(\d+)/);
                                if (qualityMatch) {
                                    const selectedQuality = qualityMatch[1];
                                    const qualityObj = qualities.find(q => q.quality === selectedQuality);
                                    if (qualityObj) {
                                        downloadUrl = qualityObj.downloadUrl;
                                        quality = qualityObj.quality;
                                    }
                                }
                            }

                            if (downloadUrl) {
                                await sendVideo(bot, from, msgUpdate, downloadUrl, videoData, quality, botName);
                            } else {
                                await bot.sendMessage(from, { react: { text: '❌', key: msgUpdate.key } });
                                reply("❌ Download link not found.");
                            }

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
        let qualityList = `*Available Qualities:*\n\n`;
        const qualities = videoData.all_qualities || [];
        qualities.forEach((q, index) => {
            qualityList += `${index + 1}. ${q.quality}p\n`;
        });
        
        msg += qualityList +
               `\n*Reply with a number to select quality*\n\n` +
               `> _𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 𝐙𝐄𝐔𝐒 𝐈𝐍𝐂 </>_ `;

        const sentMsg = await bot.sendMessage(from, { 
            image: { url: videoData.thumbnail || video.thumbnail }, 
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

                if (isReplyToBot && body && !isNaN(body)) {
                    const index = parseInt(body) - 1;
                    if (index >= 0 && index < qualities.length) {
                        bot.ev.off('messages.upsert', listener);

                        await bot.sendMessage(from, { react: { text: '⏳', key: msgUpdate.key } });

                        try {
                            const qualityObj = qualities[index];
                            await sendVideo(bot, from, msgUpdate, qualityObj.downloadUrl, videoData, qualityObj.quality, botName);
                        } catch (err) {
                            console.error("Download Error:", err);
                            await bot.sendMessage(from, { react: { text: '❌', key: msgUpdate.key } });
                            reply("❌ Error downloading video.");
                        }
                    } else {
                        reply("❌ Invalid quality number. Please choose from the list.");
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
        console.log("VIDEO ERROR:", e);
        reply("❌ *Error:* " + e.message);
    }
});

// --- Helper function to send video ---
async function sendVideo(bot, from, msgUpdate, downloadUrl, videoData, quality, botName) {
    try {
        await bot.sendMessage(from, { 
            video: { url: downloadUrl }, 
            caption: `🎬 *${videoData.title}*\n\n` +
                    `📹 Quality: ${quality}p\n` +
                    `👤 Channel: ${videoData.channel_author || 'Unknown'}\n\n` +
                    `> _𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 𝐙𝐄𝐔𝐒 𝐈𝐍𝐂 </>_ `,
            mimetype: "video/mp4"
        }, { quoted: msgUpdate });

        await bot.sendMessage(from, { react: { text: '✅', key: msgUpdate.key } });
    } catch (err) {
        console.error("Send video error:", err);
        await bot.sendMessage(from, { react: { text: '❌', key: msgUpdate.key } });
        throw err;
    }
}

// --- Get Video Details from API ---
async function getVideoDetails(videoUrl) {
    try {
        const apiUrl = `https://mr-thinuzz-api-build.vercel.app/api/ytmp4v2/download?url=${encodeURIComponent(videoUrl)}&quality=720&apiKey=key_faa62e4037a95cda`;
        const response = await axios.get(apiUrl);
        
        if (response.data?.status && response.data.data) {
            return response.data.data;
        }

        // Backup API
        const backupUrl = `https://api.giftedtech.my.id/api/download/dlmp4?url=${encodeURIComponent(videoUrl)}&apikey=gifted`;
        const backup = await axios.get(backupUrl);
        if (backup.data?.result) {
            return {
                title: backup.data.result.title,
                thumbnail: backup.data.result.thumbnail,
                duration: backup.data.result.duration,
                all_qualities: [
                    { quality: '360', downloadUrl: backup.data.result.download_url }
                ],
                channel_author: backup.data.result.channel
            };
        }

        return null;
    } catch (e) {
        console.error('Video details fetch error:', e.message);
        return null;
    }
}

module.exports = { getVideoDetails };
