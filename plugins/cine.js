const { cmd } = require("../command");
const axios = require("axios");
const config = require("../config");
const fs = require('fs');
const path = require('path');

// ---- Helper Functions ----
function formatFileSize(bytes) {
    if (!bytes) return 'Unknown';
    if (typeof bytes === 'string') return bytes;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatNumber(num) {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

// ---- Main Command ----
cmd({
    pattern: "cine",
    alias: ["cinesubz", "movie", "sinhala"],
    react: "🎬",
    desc: "Search, Get Info & Download Sinhala Subtitled Movies as Documents",
    category: "download",
    filename: __filename,
}, async (bot, mek, m, { from, q, reply, prefix, userSettings }) => {
    try {
        if (!q) {
            return reply(
                "🎬 *ZEUS X CINESUBZ* 🎬\n\n" +
                "🔍 *Search:* .cine avatar\n" +
                "📥 *Get Movie:* .cine https://cinesubz.lk/movies/...\n" +
                "📄 *Download as Document:* Reply with number\n\n" +
                "_💡 Videos will be sent as document files for better compatibility_"
            );
        }

        const settings = userSettings || global.CURRENT_BOT_SETTINGS || {};
        const isButtonsOn = settings.buttons === 'true';
        const botName = settings.botName || config.DEFAULT_BOT_NAME || "ZEUS-X-MINI";

        const input = q.trim();

        // ---- Check if it's a URL (Movie Info Request) ----
        if (input.includes('cinesubz.lk/')) {
            await getMovieInfo(bot, from, input, reply, mek, botName, isButtonsOn);
            return;
        }

        // ---- SEARCH MODE ----
        const apiUrl = `https://mr-thinuzz-api-build.vercel.app/api/cinesubz/search?query=${encodeURIComponent(input)}&apiKey=key_faa62e4037a95cda`;
        const response = await axios.get(apiUrl);

        if (!response.data?.status) {
            return reply("❌ Search failed. Please try again.");
        }

        const data = response.data.data;
        const allResults = data.all || [];

        if (allResults.length === 0) {
            return reply(`❌ No results found for "${input}".\n\n_Try different keywords or check spelling._`);
        }

        const movies = data.movies || [];
        const tvShows = data.tvshows || [];

        let msg = `🎬 *ZEUS X CINESUBZ SEARCH* 🎬\n\n`;
        msg += `🔍 *Query:* "${input}"\n`;
        msg += `📊 *Total:* ${response.data.total_results || allResults.length}\n`;
        msg += `🎥 *Movies:* ${movies.length}\n`;
        msg += `📺 *TV Shows:* ${tvShows.length}\n\n`;

        const displayResults = allResults.slice(0, 12);
        msg += `📋 *Results:*\n\n`;

        displayResults.forEach((item, index) => {
            const typeEmoji = item.type === 'Movie' ? '🎥' : '📺';
            const year = item.year ? ` (${item.year})` : '';
            msg += `${index + 1}. ${typeEmoji} *${item.title}*${year}\n`;
        });

        if (allResults.length > 12) {
            msg += `\n_And ${allResults.length - 12} more..._\n`;
        }

        msg += `\n💡 *Reply with number (1-${Math.min(displayResults.length, 12)}) for details*`;
        msg += `\n\n> _𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 ${botName.toUpperCase()} </>`;

        const sentMsg = await bot.sendMessage(from, {
            image: { url: displayResults[0]?.image || "https://cinesubz.net/wp-content/uploads/2023/12/cropped-Cinesubz-Logo-1-1.png" },
            caption: msg
        }, { quoted: mek });

        // ---- Listener for Selection ----
        const listener = async (update) => {
            try {
                const msgUpdate = update.messages[0];
                if (!msgUpdate || !msgUpdate.message) return;

                const body = msgUpdate.message.conversation ||
                    msgUpdate.message.extendedTextMessage?.text;

                const contextInfo = msgUpdate.message.extendedTextMessage?.contextInfo;
                const isReplyToBot = contextInfo?.stanzaId === sentMsg.key.id;

                if (isReplyToBot) {
                    const selectedNumber = parseInt(body);
                    if (selectedNumber >= 1 && selectedNumber <= Math.min(displayResults.length, 12)) {
                        bot.ev.off('messages.upsert', listener);

                        const selectedItem = displayResults[selectedNumber - 1];
                        await bot.sendMessage(from, { react: { text: '⏳', key: msgUpdate.key } });

                        await getMovieInfo(bot, from, selectedItem.link, reply, mek, botName, isButtonsOn, msgUpdate);

                        await bot.sendMessage(from, { react: { text: '✅', key: msgUpdate.key } });
                    }
                }
            } catch (err) {
                console.error("Listener Error:", err);
            }
        };

        bot.ev.on('messages.upsert', listener);
        setTimeout(() => {
            bot.ev.off('messages.upsert', listener);
        }, 180000);

    } catch (e) {
        console.log("CINESUBZ ERROR:", e);
        reply("❌ *Error:* " + e.message);
    }
});

// ---- Get Movie Info Function with Button Support ----
async function getMovieInfo(bot, from, url, reply, mek, botName, isButtonsOn, msgUpdate = null) {
    try {
        const apiUrl = `https://mr-thinuzz-api-build.vercel.app/api/cinesubz/movie?url=${encodeURIComponent(url)}&apiKey=key_faa62e4037a95cda`;
        const response = await axios.get(apiUrl);

        if (!response.data?.status) {
            return reply("❌ Failed to fetch movie details.");
        }

        const data = response.data.data;
        const downloads = data.downloadUrl || [];

        // ---- Build Info Message ----
        let msg = `🎬 *${data.maintitle || data.title}*\n\n`;
        
        if (data.dateCreate) msg += `📅 *Year:* ${data.dateCreate}\n`;
        if (data.runtime) msg += `⭐ *IMDb:* ${data.runtime}\n`;
        if (data.category && data.category.length > 0) {
            msg += `🏷️ *Genres:* ${data.category.slice(0, 5).join(', ')}\n`;
        }
        
        if (data.director?.name && data.director.name.length > 0) {
            const directors = data.director.name.slice(0, 3).join(', ');
            msg += `🎬 *Director:* ${directors}\n`;
        }

        if (data.cast && data.cast.length > 0) {
            const castNames = data.cast.slice(0, 5).map(c => c.actor.name).join(', ');
            msg += `🎭 *Cast:* ${castNames}\n`;
        }

        msg += `\n📥 *Download Options:*\n\n`;

        if (downloads.length === 0) {
            msg += `❌ No download links available.\n`;
        } else {
            downloads.forEach((dl, i) => {
                const emoji = ['🎬', '📹', '🎥', '💿', '📀'][i % 5];
                msg += `${i + 1}. ${emoji} *${dl.quality}*\n`;
                msg += `   📦 Size: ${dl.size || 'Unknown'}\n`;
                msg += `   🌐 Language: ${dl.language || 'Unknown'}\n\n`;
            });
        }

        msg += `📄 *Will be sent as Document File*\n`;
        msg += `💡 *Reply with number (1-${downloads.length}) to download as document*`;
        msg += `\n\n> _𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 ${botName.toUpperCase()} </>`;

        const imageUrl = data.mainImage || data.imageUrls?.[0] || "https://cinesubz.net/wp-content/uploads/2023/12/cropped-Cinesubz-Logo-1-1.png";

        // ---- BUTTON MODE ----
        if (isButtonsOn && downloads.length > 0) {
            // Create download buttons (max 5)
            const buttons = downloads.slice(0, 5).map((dl, i) => ({
                buttonId: `cine_dl_${i}`,
                buttonText: { displayText: `${i + 1}. ${dl.quality}` },
                type: 1
            }));

            // Add image gallery button if available
            if (data.imageUrls && data.imageUrls.length > 1) {
                buttons.push({
                    buttonId: "cine_images",
                    buttonText: { displayText: "🖼️ View Images" },
                    type: 1
                });
            }

            const sentMsg = await bot.sendMessage(from, {
                image: { url: imageUrl },
                caption: msg,
                footer: `© ${botName}`,
                buttons: buttons,
                headerType: 4
            }, { quoted: mek || msgUpdate });

            // ---- Button Listener ----
            const buttonListener = async (update) => {
                try {
                    const updateMsg = update.messages[0];
                    if (!updateMsg || !updateMsg.message) return;

                    let selectedButton = null;
                    if (updateMsg.message.buttonsResponseMessage) {
                        selectedButton = updateMsg.message.buttonsResponseMessage.selectedButtonId;
                    } else if (updateMsg.message.templateButtonReplyMessage) {
                        selectedButton = updateMsg.message.templateButtonReplyMessage.selectedId;
                    } else if (updateMsg.message.interactiveResponseMessage) {
                        selectedButton = updateMsg.message.interactiveResponseMessage.nativeFlowResponseMessage?.buttonsMessage?.selectedButtonId;
                    }

                    const contextInfo = updateMsg.message.extendedTextMessage?.contextInfo ||
                        updateMsg.message.buttonsResponseMessage?.contextInfo;
                    const isReplyToBot = contextInfo?.stanzaId === sentMsg.key.id;

                    if (isReplyToBot && selectedButton) {
                        bot.ev.off('messages.upsert', buttonListener);

                        if (selectedButton === 'cine_images') {
                            await bot.sendMessage(from, { react: { text: '⏳', key: updateMsg.key } });
                            await showImageGallery(bot, from, data.imageUrls, reply, updateMsg, botName);
                            await bot.sendMessage(from, { react: { text: '✅', key: updateMsg.key } });
                            return;
                        }

                        const dlIndex = parseInt(selectedButton.replace('cine_dl_', ''));
                        if (dlIndex >= 0 && dlIndex < downloads.length) {
                            await bot.sendMessage(from, { react: { text: '⏳', key: updateMsg.key } });
                            const selectedDl = downloads[dlIndex];
                            await handleDocumentDownload(bot, from, selectedDl, data.maintitle || data.title, 
                                                        reply, updateMsg, botName);
                            await bot.sendMessage(from, { react: { text: '✅', key: updateMsg.key } });
                        }
                    }
                } catch (err) {
                    console.error("Button Listener Error:", err);
                }
            };

            bot.ev.on('messages.upsert', buttonListener);
            setTimeout(() => {
                bot.ev.off('messages.upsert', buttonListener);
            }, 300000);

            return;
        }

        // ---- TEXT MODE ----
        const sentMsg = await bot.sendMessage(from, {
            image: { url: imageUrl },
            caption: msg
        }, { quoted: mek || msgUpdate });

        // ---- Download Listener (Text Mode) ----
        if (downloads.length > 0) {
            const dlListener = async (update) => {
                try {
                    const updateMsg = update.messages[0];
                    if (!updateMsg || !updateMsg.message) return;

                    const body = updateMsg.message.conversation ||
                        updateMsg.message.extendedTextMessage?.text;
                    const contextInfo = updateMsg.message.extendedTextMessage?.contextInfo;
                    const isReplyToBot = contextInfo?.stanzaId === sentMsg.key.id;

                    if (isReplyToBot) {
                        const dlNum = parseInt(body);
                        if (dlNum >= 1 && dlNum <= downloads.length) {
                            bot.ev.off('messages.upsert', dlListener);

                            await bot.sendMessage(from, { react: { text: '⏳', key: updateMsg.key } });
                            const selectedDl = downloads[dlNum - 1];
                            await handleDocumentDownload(bot, from, selectedDl, data.maintitle || data.title, 
                                                        reply, updateMsg, botName);
                            await bot.sendMessage(from, { react: { text: '✅', key: updateMsg.key } });
                        }
                    }
                } catch (err) {
                    console.error("Download Listener Error:", err);
                }
            };

            bot.ev.on('messages.upsert', dlListener);
            setTimeout(() => {
                bot.ev.off('messages.upsert', dlListener);
            }, 180000);
        }

        // ---- Image Gallery (Text Mode) ----
        if (data.imageUrls && data.imageUrls.length > 1) {
            await bot.sendMessage(from, {
                text: `🖼️ *Image Gallery Available* (${data.imageUrls.length} images)\nReply with "images" to view.`
            }, { quoted: mek || msgUpdate });

            const galleryListener = async (update) => {
                try {
                    const updateMsg = update.messages[0];
                    if (!updateMsg || !updateMsg.message) return;

                    const body = updateMsg.message.conversation ||
                        updateMsg.message.extendedTextMessage?.text;
                    const contextInfo = updateMsg.message.extendedTextMessage?.contextInfo;
                    const isReplyToBot = contextInfo?.stanzaId === sentMsg.key.id;

                    if (isReplyToBot && body && body.toLowerCase() === 'images') {
                        bot.ev.off('messages.upsert', galleryListener);
                        await showImageGallery(bot, from, data.imageUrls, reply, updateMsg, botName);
                    }
                } catch (err) {
                    console.error("Gallery Listener Error:", err);
                }
            };

            bot.ev.on('messages.upsert', galleryListener);
            setTimeout(() => {
                bot.ev.off('messages.upsert', galleryListener);
            }, 60000);
        }

    } catch (e) {
        console.error("Movie Info Error:", e);
        reply("❌ Error fetching movie details.");
    }
}

// ---- Handle Document Download ----
async function handleDocumentDownload(bot, from, selectedDl, title, reply, msgUpdate, botName) {
    try {
        const apiUrl = `https://mr-thinuzz-api-build.vercel.app/api/cinesubz/download?url=${encodeURIComponent(selectedDl.link)}&apiKey=key_faa62e4037a95cda`;
        const response = await axios.get(apiUrl);

        let downloadUrl = selectedDl.link;
        let fileName = `${title} - ${selectedDl.quality}.mp4`;
        let fileSize = selectedDl.size || 'Unknown';

        fileName = fileName.replace(/[^\w\s.-]/g, '').replace(/\s+/g, ' ');

        if (response.data?.status && response.data.data?.downloadUrls) {
            const urls = response.data.data.downloadUrls;
            const directUrl = urls.find(u => u.url.includes('.online') || u.url.includes('.mp4'));
            if (directUrl) {
                downloadUrl = directUrl.url;
            } else {
                downloadUrl = urls[0].url;
            }
            if (response.data.data.size) {
                fileSize = response.data.data.size;
            }
        }

        // Try to send as document
        try {
            await bot.sendMessage(from, { react: { text: '⏳', key: msgUpdate.key } });

            const videoBuffer = await downloadFile(downloadUrl);
            
            if (videoBuffer && videoBuffer.length > 0) {
                await bot.sendMessage(from, {
                    document: videoBuffer,
                    mimetype: "video/mp4",
                    fileName: fileName,
                    caption: `🎬 *${title}*\n` +
                             `📥 *Quality:* ${selectedDl.quality}\n` +
                             `📦 *Size:* ${fileSize}\n` +
                             `📄 *Document Format*\n\n` +
                             `> _𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 ${botName.toUpperCase()} </>`
                }, { quoted: msgUpdate });

                await bot.sendMessage(from, { react: { text: '✅', key: msgUpdate.key } });
                return;
            }
        } catch (error) {
            console.error("Document Send Error:", error);
        }

        // Fallback: Send download links
        let fallbackMsg = `🎬 *${title}*\n\n`;
        fallbackMsg += `📥 *Quality:* ${selectedDl.quality}\n`;
        fallbackMsg += `📦 *Size:* ${fileSize}\n\n`;
        fallbackMsg += `🔗 *Download Links:*\n\n`;

        if (response.data?.status && response.data.data?.downloadUrls) {
            response.data.data.downloadUrls.forEach((item, i) => {
                fallbackMsg += `${i + 1}. ${item.url}\n\n`;
            });
        } else {
            fallbackMsg += `1. ${downloadUrl}\n\n`;
        }

        fallbackMsg += `📌 *Note:* File is large, download using the links above\n`;
        fallbackMsg += `> _𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 ${botName.toUpperCase()} </>`;

        await bot.sendMessage(from, {
            text: fallbackMsg
        }, { quoted: msgUpdate });

    } catch (e) {
        console.error("Download Error:", e);
        await bot.sendMessage(from, {
            text: `❌ Error downloading file.\n\n📥 *Try this link:*\n${selectedDl.link}`
        }, { quoted: msgUpdate });
    }
}

// ---- Download File Function ----
async function downloadFile(url) {
    try {
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 120000,
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (response.status === 200 && response.data) {
            return Buffer.from(response.data);
        }
        return null;
    } catch (error) {
        console.error("Download File Error:", error.message);
        try {
            const response = await axios.get(url, {
                responseType: 'arraybuffer',
                timeout: 120000,
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            });
            if (response.status === 200 && response.data) {
                return Buffer.from(response.data);
            }
        } catch (e) {
            console.error("Alternative Download Error:", e.message);
        }
        return null;
    }
}

// ---- Show Image Gallery ----
async function showImageGallery(bot, from, imageUrls, reply, mek, botName) {
    try {
        if (!imageUrls || imageUrls.length === 0) {
            return reply("❌ No images available.");
        }

        const maxImages = Math.min(imageUrls.length, 10);
        let msg = `🖼️ *Image Gallery*\n\n`;
        msg += `📸 Total: ${imageUrls.length} images\n`;
        msg += `💡 Reply with number (1-${maxImages}) to view\n\n`;

        imageUrls.slice(0, maxImages).forEach((url, i) => {
            msg += `${i + 1}. Image ${i + 1}\n`;
        });

        msg += `\n> _𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 ${botName.toUpperCase()} </>`;

        const sentMsg = await bot.sendMessage(from, {
            image: { url: imageUrls[0] },
            caption: msg
        }, { quoted: mek });

        const listener = async (update) => {
            try {
                const updateMsg = update.messages[0];
                if (!updateMsg || !updateMsg.message) return;

                const body = updateMsg.message.conversation ||
                    updateMsg.message.extendedTextMessage?.text;
                const contextInfo = updateMsg.message.extendedTextMessage?.contextInfo;
                const isReplyToBot = contextInfo?.stanzaId === sentMsg.key.id;

                if (isReplyToBot) {
                    const imgNum = parseInt(body);
                    if (imgNum >= 1 && imgNum <= maxImages) {
                        bot.ev.off('messages.upsert', listener);
                        await bot.sendMessage(from, {
                            image: { url: imageUrls[imgNum - 1] },
                            caption: `🖼️ *Image ${imgNum}/${imageUrls.length}*`
                        }, { quoted: updateMsg });
                    }
                }
            } catch (err) {
                console.error("Gallery Error:", err);
            }
        };

        bot.ev.on('messages.upsert', listener);
        setTimeout(() => {
            bot.ev.off('messages.upsert', listener);
        }, 120000);

    } catch (e) {
        console.error("Gallery Error:", e);
        reply("❌ Error loading gallery.");
    }
}

module.exports = {};
