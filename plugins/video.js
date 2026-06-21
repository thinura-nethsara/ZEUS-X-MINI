const { cmd } = require("../command");
const axios = require("axios");
const yts = require("yt-search");
const config = require("../config");
const fs = require('fs');

cmd({
    pattern: "video",
    alias: ["ytv", "mp4", "vdo"],
    react: "🎬",
    desc: "Download YouTube MP4 (supports search & direct URL)",
    category: "download",
    filename: __filename,
}, async (bot, mek, m, { from, q, reply, prefix, userSettings }) => {
    try {
        if (!q) return reply("🎬 *ZEUS X VIDEO PLAYER*\n\n*Usage:*\n`.video song name`\n`.video https://youtube.com/...`");

        const settings = userSettings || global.CURRENT_BOT_SETTINGS || {};
        const isButtonsOn = settings.buttons === 'true';
        const botName = settings.botName || config.DEFAULT_BOT_NAME || "ZEUS-X-MINI";

        let video;
        let isDirectUrl = false;

        // Check if input is a YouTube URL
        const youtubeUrlPattern = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/;
        const urlMatch = q.match(youtubeUrlPattern);

        if (urlMatch) {
            // Direct URL mode
            isDirectUrl = true;
            const videoId = urlMatch[1];
            const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
            
            // Get video info using yt-search
            const searchResults = await yts({ videoId: videoId });
            if (searchResults && searchResults.videoId) {
                video = {
                    title: searchResults.title || 'YouTube Video',
                    author: { name: searchResults.author?.name || 'Unknown' },
                    timestamp: searchResults.duration?.timestamp || 'N/A',
                    url: videoUrl,
                    thumbnail: searchResults.thumbnail || 'https://i.ibb.co/cXYtgWPV/Whats-App-Image-2026-06-18-at-7-35-46-PM.png'
                };
            } else {
                // Fallback: use yts search with URL
                const fallbackResults = await yts(q);
                if (fallbackResults && fallbackResults.videos.length > 0) {
                    video = fallbackResults.videos[0];
                } else {
                    return reply("❌ Could not fetch video details from URL.");
                }
            }
        } else {
            // Search mode
            const search = await yts(q);
            if (!search || !search.videos || !search.videos.length) {
                return reply("❌ No results found on YouTube.");
            }
            video = search.videos[0];
        }

        let msg = `🎬 *ZEUS X VIDEO PLAYER* 🎬\n\n` +
                  `📝 *Title:* ${video.title}\n` +
                  `👤 *Uploader:* ${video.author.name}\n` +
                  `⏱️ *Duration:* ${video.timestamp}\n` +
                  `🔗 *Link:* ${video.url}\n\n`;

        // --- BUTTON MODE ---
        if (isButtonsOn) {
            msg += `> _𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 𝐙𝐄𝐔𝐒 𝐈𝐍𝐂 </>_ `;

            const sentMsg = await bot.sendMessage(from, {
                image: { url: video.thumbnail },
                caption: msg,
                buttons: [
                    { buttonId: "video_360p", buttonText: { displayText: "🎬 360p Video" }, type: 1 },
                    { buttonId: "video_720p", buttonText: { displayText: "📹 720p Video" }, type: 1 }
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

                    if (isReplyToBot && (selectedButton === 'video_360p' || selectedButton === 'video_720p')) {
                        bot.ev.off('messages.upsert', buttonListener);

                        await bot.sendMessage(from, { react: { text: '⏳', key: msgUpdate.key } });

                        try {
                            const quality = selectedButton === 'video_360p' ? '360p' : '720p';
                            
                            const downloadResult = await getVideoLink(video.url, quality);
                            
                            if (!downloadResult) {
                                await bot.sendMessage(from, { react: { text: '❌', key: msgUpdate.key } });
                                return reply("❌ Download link not found for " + quality);
                            }

                            // Send video with thumbnail as preview
                            let thumbnailBuffer = null;
                            try {
                                const thumbResponse = await axios.get(video.thumbnail, { responseType: 'arraybuffer', timeout: 10000 });
                                thumbnailBuffer = Buffer.from(thumbResponse.data);
                            } catch (e) {
                                console.log('Thumbnail fetch failed');
                            }

                            if (downloadResult.downloadUrl) {
                                await bot.sendMessage(from, { 
                                    video: { url: downloadResult.downloadUrl },
                                    caption: `🎬 *${video.title}*\n> _𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 ${botName} </>_ `,
                                    mimetype: "video/mp4",
                                    thumbnail: thumbnailBuffer
                                }, { quoted: msgUpdate });
                            } else if (downloadResult.filePath) {
                                await bot.sendMessage(from, { 
                                    video: { url: downloadResult.filePath },
                                    caption: `🎬 *${video.title}*\n> _𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 ${botName} </>_ `,
                                    mimetype: "video/mp4",
                                    thumbnail: thumbnailBuffer
                                }, { quoted: msgUpdate });
                            }

                            await bot.sendMessage(from, { react: { text: '✅', key: msgUpdate.key } });
                        } catch (err) {
                            console.error("Download Error:", err);
                            await bot.sendMessage(from, { react: { text: '❌', key: msgUpdate.key } });
                            reply("❌ Error downloading video. Please try another quality.");
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
               `1️⃣ *360p Video* (MP4)\n` +
               `2️⃣ *720p Video* (MP4)\n\n` +
               `> _𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 𝐙𝐄𝐔𝐒 𝐈𝐍𝐂 </>_ `;

        const sentMsg = await bot.sendMessage(from, { 
            image: { url: video.thumbnail }, 
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
                        const quality = body === '1' ? '360p' : '720p';
                        const downloadResult = await getVideoLink(video.url, quality);
                        
                        if (!downloadResult) {
                            await bot.sendMessage(from, { react: { text: '❌', key: msgUpdate.key } });
                            return reply("❌ Download link not found for " + quality);
                        }

                        let thumbnailBuffer = null;
                        try {
                            const thumbResponse = await axios.get(video.thumbnail, { responseType: 'arraybuffer', timeout: 10000 });
                            thumbnailBuffer = Buffer.from(thumbResponse.data);
                        } catch (e) {
                            console.log('Thumbnail fetch failed');
                        }

                        if (downloadResult.downloadUrl) {
                            await bot.sendMessage(from, { 
                                video: { url: downloadResult.downloadUrl },
                                caption: `🎬 *${video.title}*\n> _𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 ${botName} </>_ `,
                                mimetype: "video/mp4",
                                thumbnail: thumbnailBuffer
                            }, { quoted: msgUpdate });
                        } else if (downloadResult.filePath) {
                            await bot.sendMessage(from, { 
                                video: { url: downloadResult.filePath },
                                caption: `🎬 *${video.title}*\n> _𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 ${botName} </>_ `,
                                mimetype: "video/mp4",
                                thumbnail: thumbnailBuffer
                            }, { quoted: msgUpdate });
                        }

                        await bot.sendMessage(from, { react: { text: '✅', key: msgUpdate.key } });
                    } catch (err) {
                        console.error("Download Error:", err);
                        await bot.sendMessage(from, { react: { text: '❌', key: msgUpdate.key } });
                        reply("❌ Error downloading video. Please try another quality.");
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

// --- Video Download Function with Multiple Methods ---
async function getVideoLink(videoUrl, quality = '360p') {
    try {
        // Method 1: Ominisave API
        const apiUrl = `https://www.ominisave.com/api/ytmp4_v2?url=${encodeURIComponent(videoUrl)}&quality=${quality}`;
        const response = await axios.get(apiUrl, { timeout: 30000 });
        
        if (response.data?.status && response.data.result?.downloadUrl) {
            return { 
                downloadUrl: response.data.result.downloadUrl,
                method: 'ominisave'
            };
        }

        // Method 2: Mr Thinuzz API (Video)
        const backupUrl1 = `https://mr-thinuzz-api-build.vercel.app/api/ytmp4/download?url=${encodeURIComponent(videoUrl)}&apiKey=key_faa62e4037a95cda`;
        const backup1 = await axios.get(backupUrl1, { timeout: 30000 });
        if (backup1.data?.status && backup1.data.data?.links?.video) {
            return { 
                downloadUrl: backup1.data.data.links.video,
                method: 'thinuzz'
            };
        }

        // Method 3: GiftedTech API
        const backupUrl2 = `https://api.giftedtech.my.id/api/download/dlmp4?url=${encodeURIComponent(videoUrl)}&apikey=gifted`;
        const backup2 = await axios.get(backupUrl2, { timeout: 30000 });
        if (backup2.data?.result?.download_url) {
            return { 
                downloadUrl: backup2.data.result.download_url,
                method: 'gifted'
            };
        }

        // Method 4: Direct Download with ytdl-core (if available)
        try {
            const ytdl = require('ytdl-core');
            const videoInfo = await ytdl.getInfo(videoUrl);
            const format = videoInfo.formats.find(f => 
                f.qualityLabel === quality && f.container === 'mp4'
            );
            if (format) {
                return { 
                    downloadUrl: format.url,
                    method: 'ytdl-core'
                };
            }
        } catch (ytdlError) {
            console.log('ytdl-core failed:', ytdlError.message);
        }

        return null;
    } catch (e) {
        console.error('Video link fetch error:', e.message);
        return null;
    }
}

module.exports = { getVideoLink };
