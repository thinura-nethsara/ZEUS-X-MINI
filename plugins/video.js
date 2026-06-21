const { cmd } = require("../command");
const axios = require("axios");
const yts = require("yt-search");
const config = require("../config");
const sharp = require('sharp');

// Helper Functions
const fetchJson = async (url) => {
    try {
        const response = await axios.get(url, { timeout: 30000 });
        return response.data;
    } catch (e) {
        console.error('fetchJson error:', e.message);
        throw e;
    }
};

const resizeImage = async (buffer, width, height) => {
    try {
        return await sharp(buffer)
            .resize(width, height, { fit: 'cover' })
            .jpeg({ quality: 80 })
            .toBuffer();
    } catch (e) {
        console.error('resizeImage error:', e.message);
        return buffer;
    }
};

cmd({
    pattern: "video",
    alias: ["ytv", "mp4", "vdo", "ytdownload"],
    react: "📽️",
    desc: "Download YouTube videos (search or URL)",
    category: "download",
    filename: __filename,
}, async (bot, mek, m, { from, q, reply, prefix, userSettings }) => {
    try {
        if (!q) {
            return reply(`📽️ *ZEUS X VIDEO DOWNLOADER* 📽️\n\n` +
                        `*Usage:*\n` +
                        `• ${prefix}video <song name>\n` +
                        `• ${prefix}video <YouTube URL>\n\n` +
                        `*Examples:*\n` +
                        `${prefix}video Despacito\n` +
                        `${prefix}video https://youtu.be/xxxxx`);
        }

        const settings = userSettings || global.CURRENT_BOT_SETTINGS || {};
        const isButtonsOn = settings.buttons === 'true';
        const botName = settings.botName || config.DEFAULT_BOT_NAME || "ZEUS-X-MINI";

        await bot.sendMessage(from, { react: { text: '🔍', key: mek.key } });

        // Check if input is YouTube URL
        const youtubeUrlPattern = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/;
        const urlMatch = q.match(youtubeUrlPattern);
        
        let video;
        let isUrl = false;

        if (urlMatch) {
            isUrl = true;
            const videoId = urlMatch[1];
            const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
            
            try {
                const searchResults = await yts({ videoId: videoId });
                if (searchResults && searchResults.videoId) {
                    video = {
                        title: searchResults.title || 'YouTube Video',
                        author: { name: searchResults.author?.name || 'Unknown' },
                        views: searchResults.views || 'N/A',
                        duration: searchResults.duration?.timestamp || 'N/A',
                        url: videoUrl,
                        thumbnail: searchResults.thumbnail || 'https://i.ibb.co/cXYtgWPV/Whats-App-Image-2026-06-18-at-7-35-46-PM.png'
                    };
                } else {
                    const fallbackResults = await yts(q);
                    if (fallbackResults && fallbackResults.videos.length > 0) {
                        video = fallbackResults.videos[0];
                    } else {
                        return reply('❌ Could not fetch video details from URL.');
                    }
                }
            } catch (e) {
                const fallbackResults = await yts(q);
                if (fallbackResults && fallbackResults.videos.length > 0) {
                    video = fallbackResults.videos[0];
                } else {
                    return reply('❌ Could not fetch video details from URL.');
                }
            }
        } else {
            // Search mode
            const search = await yts(q);
            if (!search || !search.videos || !search.videos.length) {
                return reply('❌ No results found on YouTube.');
            }
            video = search.videos[0];
        }

        const caption = `🎬 *${botName} VIDEO DOWNLOADER* 🎬\n` +
                       `╭━━━━━━━━━━━━━━━━━⬣\n` +
                       `┃📹 *Title:* ${video.title}\n` +
                       `┃👤 *Uploader:* ${video.author.name}\n` +
                       `┃👁️ *Views:* ${video.views || 'N/A'}\n` +
                       `┃⏱️ *Duration:* ${video.duration || 'N/A'}\n` +
                       `┃🔗 *URL:* ${video.url}\n` +
                       `╰━━━━━━━━━━━━━━━━━⬣\n\n` +
                       `*Select download type:*`;

        // --- BUTTON MODE ---
        if (isButtonsOn) {
            const buttons = [
                {
                    buttonId: `vd_work ${video.url}&${video.thumbnail}&${encodeURIComponent(video.title)}`,
                    buttonText: { displayText: '📹 Video (MP4)' },
                    type: 1
                },
                {
                    buttonId: `doc_work ${video.url}&${video.thumbnail}&${encodeURIComponent(video.title)}`,
                    buttonText: { displayText: '📁 Document' },
                    type: 1
                },
                {
                    buttonId: `vn_work ${video.url}&${video.thumbnail}&${encodeURIComponent(video.title)}`,
                    buttonText: { displayText: '🎥 Video Note' },
                    type: 1
                }
            ];

            await bot.sendMessage(from, { react: { text: '✅', key: mek.key } });

            await bot.sendMessage(from, {
                image: { url: video.thumbnail },
                caption: caption,
                buttons: buttons,
                headerType: 4
            }, { quoted: mek });

            return;
        }

        // --- TEXT MODE ---
        const textMenu = caption + `\n\n` +
                        `*Reply with number:*\n` +
                        `1️⃣ Video (MP4)\n` +
                        `2️⃣ Document\n` +
                        `3️⃣ Video Note\n\n` +
                        `> _𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 ${botName} </>_`;

        const sentMsg = await bot.sendMessage(from, {
            image: { url: video.thumbnail },
            caption: textMenu
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

                if (isReplyToBot && (body === '1' || body === '2' || body === '3')) {
                    bot.ev.off('messages.upsert', listener);

                    await bot.sendMessage(from, { react: { text: '⏳', key: msgUpdate.key } });

                    try {
                        if (body === '1') {
                            await handleVideoDownload(bot, from, video.url, video.thumbnail, video.title, msgUpdate);
                        } else if (body === '2') {
                            await handleDocumentDownload(bot, from, video.url, video.thumbnail, video.title, msgUpdate);
                        } else if (body === '3') {
                            await handleVideoNoteDownload(bot, from, video.url, video.title, msgUpdate);
                        }
                    } catch (err) {
                        console.error('Download Error:', err);
                        await bot.sendMessage(from, { react: { text: '❌', key: msgUpdate.key } });
                        reply('❌ Error downloading. Please try again.');
                    }
                }
            } catch (err) {
                console.error('Listener Error:', err);
            }
        };

        bot.ev.on('messages.upsert', listener);
        setTimeout(() => {
            bot.ev.off('messages.upsert', listener);
        }, 300000);

    } catch (e) {
        console.error('VIDEO ERROR:', e);
        reply('❌ *Error:* ' + e.message);
    }
});

// ============= VIDEO TYPE (button) =============
cmd({
    pattern: "vd_work",
    react: "⬇️",
    dontAddCommandList: true,
    filename: __filename
}, async (bot, mek, m, { from, q, reply }) => {
    try {
        if (!q) return await reply('❌ Need a YouTube URL!');
        // Remove the command prefix if present (button sends it)
        let data = q;
        if (data.startsWith('vd_work ')) {
            data = data.slice('vd_work '.length);
        }
        const parts = data.split("&");
        const videoUrl = parts[0];
        const thumbUrl = parts[1];
        const title = decodeURIComponent(parts[2] || 'Video');
        await handleVideoDownload(bot, from, videoUrl, thumbUrl, title, mek);
    } catch (e) {
        console.error(e);
        await reply('❌ Error downloading video!');
    }
});

// ============= DOCUMENT TYPE (button) =============
cmd({
    pattern: "doc_work",
    react: "⬇️",
    dontAddCommandList: true,
    filename: __filename
}, async (bot, mek, m, { from, q, reply }) => {
    try {
        if (!q) return await reply('❌ Need a YouTube URL!');
        let data = q;
        if (data.startsWith('doc_work ')) {
            data = data.slice('doc_work '.length);
        }
        const parts = data.split("&");
        const videoUrl = parts[0];
        const thumbUrl = parts[1];
        const title = decodeURIComponent(parts[2] || 'Video');
        await handleDocumentDownload(bot, from, videoUrl, thumbUrl, title, mek);
    } catch (e) {
        console.error(e);
        await reply('❌ Error downloading document!');
    }
});

// ============= VIDEO NOTE TYPE (button) =============
cmd({
    pattern: "vn_work",
    react: "⬇️",
    dontAddCommandList: true,
    filename: __filename
}, async (bot, mek, m, { from, q, reply }) => {
    try {
        if (!q) return await reply('❌ Need a YouTube URL!');
        let data = q;
        if (data.startsWith('vn_work ')) {
            data = data.slice('vn_work '.length);
        }
        const parts = data.split("&");
        const videoUrl = parts[0];
        const title = decodeURIComponent(parts[2] || 'Video');
        await handleVideoNoteDownload(bot, from, videoUrl, title, mek);
    } catch (e) {
        console.error(e);
        await reply('❌ Error creating video note!');
    }
});

// ============= HANDLER FUNCTIONS =============

// Video Download (sends as playable video)
async function handleVideoDownload(bot, from, videoUrl, thumbUrl, title, mek) {
    try {
        await bot.sendMessage(from, { react: { text: '⏳', key: mek.key } });

        const apiKey = '82406ca340409d44';
        const apiUrl = `https://api-dark-shan-yt.koyeb.app/download/ytdl?url=${encodeURIComponent(videoUrl)}&format=720&apikey=${apiKey}`;
        
        const res = await fetchJson(apiUrl);
        
        let downloadUrl = null;
        let videoTitle = title;
        
        if (res && res.status && res.data) {
            downloadUrl = res.data.download;
            videoTitle = res.data.title || title;
        }
        
        if (!downloadUrl) {
            return await bot.sendMessage(from, { text: '❌ Could not get download URL! Please try again.' });
        }

        // Generate thumbnail
        let thumbnailBuffer = null;
        try {
            const thumbResponse = await axios.get(thumbUrl, { 
                responseType: 'arraybuffer',
                timeout: 15000 
            });
            const rawBuffer = Buffer.from(thumbResponse.data);
            try {
                thumbnailBuffer = await sharp(rawBuffer)
                    .resize(200, 200, { fit: 'cover' })
                    .jpeg({ quality: 80 })
                    .toBuffer();
            } catch (sharpError) {
                thumbnailBuffer = rawBuffer;
            }
        } catch(e) {
            console.log('Thumbnail fetch failed:', e.message);
        }

        await bot.sendMessage(from, { react: { text: '⬇️', key: mek.key } });

        // Download video as buffer
        const videoResponse = await axios.get(downloadUrl, {
            responseType: 'arraybuffer',
            timeout: 120000
        });
        const videoBuffer = Buffer.from(videoResponse.data);

        // Send as video message (buffer)
        await bot.sendMessage(from, {
            video: videoBuffer,
            caption: `🎬 *${videoTitle}*\n📺 Quality: 720p HD\n\n*⏤͟͟͞͞★❮ ZEUS X VIDEO ❯⏤͟͟͞͞★*`,
            thumbnail: thumbnailBuffer,
            mimetype: 'video/mp4'
        }, { quoted: mek });

        await bot.sendMessage(from, { react: { text: '✅', key: mek.key } });

    } catch (e) {
        console.error('Video download error:', e);
        await bot.sendMessage(from, { text: '❌ Error downloading video! Please try again later.' });
    }
}

// Document Download (sends as document)
async function handleDocumentDownload(bot, from, videoUrl, thumbUrl, title, mek) {
    try {
        await bot.sendMessage(from, { react: { text: '⏳', key: mek.key } });

        const apiKey = '82406ca340409d44';
        const apiUrl = `https://api-dark-shan-yt.koyeb.app/download/ytdl?url=${encodeURIComponent(videoUrl)}&format=720&apikey=${apiKey}`;
        
        const res = await fetchJson(apiUrl);
        
        let downloadUrl = null;
        let videoTitle = title;
        
        if (res && res.status && res.data) {
            downloadUrl = res.data.download;
            videoTitle = res.data.title || title;
        }
        
        if (!downloadUrl) {
            return await bot.sendMessage(from, { text: '❌ Could not get download URL! Please try again.' });
        }

        // Thumbnail
        let thumbnailBuffer = null;
        try {
            const thumbResponse = await axios.get(thumbUrl, { 
                responseType: 'arraybuffer',
                timeout: 15000 
            });
            const rawBuffer = Buffer.from(thumbResponse.data);
            try {
                thumbnailBuffer = await sharp(rawBuffer)
                    .resize(200, 200, { fit: 'cover' })
                    .jpeg({ quality: 80 })
                    .toBuffer();
            } catch (sharpError) {
                thumbnailBuffer = rawBuffer;
            }
        } catch(e) {
            console.log('Thumbnail fetch failed:', e.message);
        }

        await bot.sendMessage(from, { react: { text: '⬇️', key: mek.key } });

        // Download video as buffer
        const videoResponse = await axios.get(downloadUrl, {
            responseType: 'arraybuffer',
            timeout: 120000
        });
        const videoBuffer = Buffer.from(videoResponse.data);

        const fileName = `${videoTitle.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 100)}.mp4`;

        await bot.sendMessage(from, {
            document: videoBuffer,
            jpegThumbnail: thumbnailBuffer,
            caption: `📄 *${videoTitle}*\n📺 Quality: 720p HD\n📁 Type: Document\n\n*⏤͟͟͞͞★❮ ZEUS X VIDEO ❯⏤͟͟͞͞★*`,
            mimetype: 'video/mp4',
            fileName: fileName
        }, { quoted: mek });

        await bot.sendMessage(from, { react: { text: '✅', key: mek.key } });

    } catch (e) {
        console.error('Document download error:', e);
        await bot.sendMessage(from, { text: '❌ Error downloading document! Please try again.' });
    }
}

// Video Note Download
async function handleVideoNoteDownload(bot, from, videoUrl, title, mek) {
    try {
        await bot.sendMessage(from, { react: { text: '⏳', key: mek.key } });

        const apiKey = '82406ca340409d44';
        const apiUrl = `https://api-dark-shan-yt.koyeb.app/download/ytdl?url=${encodeURIComponent(videoUrl)}&format=720&apikey=${apiKey}`;
        
        const res = await fetchJson(apiUrl);
        
        let downloadUrl = null;
        let videoTitle = title;
        
        if (res && res.status && res.data) {
            downloadUrl = res.data.download;
            videoTitle = res.data.title || title;
        }
        
        if (!downloadUrl) {
            return await bot.sendMessage(from, { text: '❌ Could not get download URL! Please try again.' });
        }

        // Download video as buffer
        const videoResponse = await axios.get(downloadUrl, { 
            responseType: 'arraybuffer',
            timeout: 120000 
        });
        const videoBuffer = Buffer.from(videoResponse.data);

        await bot.sendMessage(from, { react: { text: '🔄', key: mek.key } });

        // Send as video note
        await bot.sendMessage(from, {
            videoNote: videoBuffer,
            ptt: false,
            seconds: 60
        }, { quoted: mek });

        await bot.sendMessage(from, { 
            text: `🎥 *${videoTitle}*\n📺 Quality: 720p HD\n📝 Type: Video Note\n\n*⏤͟͟͞͞★❮ ZEUS X VIDEO ❯⏤͟͟͞͞★*` 
        }, { quoted: mek });

        await bot.sendMessage(from, { react: { text: '✅', key: mek.key } });

    } catch (e) {
        console.error('Video note error:', e);
        await bot.sendMessage(from, { text: '❌ Error creating video note! Try another format.' });
    }
}

module.exports = {};
