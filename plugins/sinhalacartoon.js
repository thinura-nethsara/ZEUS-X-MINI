const { cmd } = require("../command");
const axios = require("axios");
const config = require("../config");

cmd({
    pattern: "sincartoons",
    alias: ["sc", "cartoon", "sinhalacartoon"],
    react: "🎬",
    desc: "Search and download Sinhala dubbed cartoons from SinhaCartoons.",
    category: "download",
    filename: __filename,
}, async (bot, mek, m, { from, q, reply, prefix, userSettings }) => {

    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

    async function retry(fn, retries = 3, baseDelay = 2000) {
        for (let i = 1; i <= retries; i++) {
            try {
                return await fn();
            } catch (err) {
                console.error(`Attempt ${i} failed:`, err.message);
                if (i === retries) throw err;
                await sleep(baseDelay * i);
            }
        }
    }

    try {
        const query = q.trim();
        if (!query) {
            return reply("🎬 *SinCartoons Downloader*\n\nExample: .sincartoons diary of a wimpy kid");
        }

        const settings = userSettings || global.CURRENT_BOT_SETTINGS || {};
        const isButtonsOn = settings.buttons === 'true';
        const botName = settings.botName || config.DEFAULT_BOT_NAME || "ZEUS-X-MINI";

        // Send initial reaction
        await bot.sendMessage(from, { react: { text: '🔎', key: mek.key } });

        // --- Search for cartoons ---
        const searchUrl = `https://mr-thinuzz-api-build.vercel.app/api/sincartoons/search?query=${encodeURIComponent(query)}&apiKey=key_faa62e4037a95cda`;
        const { data: searchData } = await axios.get(searchUrl);
        
        let results = searchData?.data?.movies || searchData?.data?.all || [];
        if (!results || !results.length) {
            return reply("❎ No cartoons found.");
        }
        results = results.slice(0, 10);

        // ---------- BUTTON MODE ----------
        if (isButtonsOn) {
            // Build search result buttons
            const buttons = results.map((r, i) => ({
                buttonId: `sincartoons_movie_${i}`,
                buttonText: { displayText: `🎬 ${r.title?.substring(0, 30)}` },
                type: 1
            }));

            const searchMsg = await bot.sendMessage(from, {
                image: { url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQt78F5c1b_8PZM7d--5Jy77lE1FdVRq050lULngkwpq5MX7a-0tVOCJGo&s=10' },
                caption: `🎬 *SinCartoons Search Results*\n\nQuery: ${query}\nSelect a cartoon:`,
                buttons,
                headerType: 4
            }, { quoted: mek });

            // --- Movie selection listener ---
            const movieListener = async (update) => {
                try {
                    const m = update.messages[0];
                    if (!m?.message?.buttonsResponseMessage) return;

                    const contextInfo = m.message.buttonsResponseMessage.contextInfo ||
                                       m.message.extendedTextMessage?.contextInfo;
                    if (!contextInfo || contextInfo.stanzaId !== searchMsg.key.id) return;

                    const btnId = m.message.buttonsResponseMessage.selectedButtonId;
                    if (!btnId?.startsWith('sincartoons_movie_')) return;

                    const index = parseInt(btnId.split('_')[2]);
                    const selected = results[index];
                    if (!selected) return;

                    await bot.sendMessage(from, { react: { text: '⏳', key: m.key } });

                    const movieUrl = selected.url;
                    if (!movieUrl) throw new Error('Movie URL not found');

                    // Fetch movie details
                    const infoUrl = `https://mr-thinuzz-api-build.vercel.app/api/sincartoons/movie?url=${encodeURIComponent(movieUrl)}&apiKey=key_faa62e4037a95cda`;
                    const { data: infoData } = await axios.get(infoUrl);
                    const movie = infoData?.data;
                    if (!movie) {
                        return await bot.sendMessage(from, { text: '❎ Failed to fetch cartoon details.' });
                    }

                    const title = movie.title || 'N/A';
                    const year = movie.year || 'N/A';
                    const rating = movie.imdb_rating || movie.rating || 'N/A';
                    const quality = movie.quality || 'HD';
                    const director = movie.director || 'N/A';
                    const description = movie.description || 'No description available.';
                    const videoUrl = movie.video_url || null;
                    
                    let cast = 'N/A';
                    if (movie.cast && Array.isArray(movie.cast)) {
                        cast = movie.cast.map(c => `${c.name}${c.character ? ` (${c.character})` : ''}`).join(', ');
                    }

                    const posterUrl = movie.poster || 'https://via.placeholder.com/300x450?text=No+Image';

                    // Build details caption
                    const detailsCaption = `
╭━━━〔 🎬 SIN CARTOONS DETAILS 〕━━━⬣

☘️ 𝓣𝓲𝓽𝓵𝓮 ➮ ${title}
📅 𝓨𝓮𝓪𝓻 ➮ ${year}
⭐ 𝓡𝓪𝓽𝓲𝓷𝓰 ➮ ${rating}
🎬 𝓠𝓾𝓪𝓵𝓲𝓽𝔂 ➮ ${quality}
🎥 𝓓𝓲𝓻𝓮𝓬𝓽𝓸𝓻 ➮ ${director}
🌟 𝓒𝓪𝓼𝓽 ➮ ${cast}
📖 𝓓𝓮𝓼𝓬𝓻𝓲𝓹𝓽𝓲𝓸𝓷 ➮ ${description.substring(0, 200)}${description.length > 200 ? '...' : ''}
╰━━━━━━━━━━━━━━━━━━⬣
✨ 𝓕𝓸𝓵𝓵𝓸𝔀 𝓾𝓼:
https://whatsapp.com/channel/0029VbCe8YW84OmKiJkDfk3o`.trim();

                    // Build action buttons
                    const actionButtons = [];

                    if (videoUrl) {
                        actionButtons.push({
                            buttonId: 'sincartoons_download',
                            buttonText: { displayText: '⬇️ Download Cartoon' },
                            type: 1
                        });
                    }

                    actionButtons.push({
                        buttonId: 'sincartoons_details_card',
                        buttonText: { displayText: '📑 Full Details' },
                        type: 1
                    });

                    // If no video URL, only show details button
                    const caption = videoUrl ? detailsCaption : `${detailsCaption}\n\n❌ *No download link available for this cartoon.*`;

                    const detailMsg = await bot.sendMessage(from, {
                        image: { url: posterUrl },
                        caption: caption,
                        buttons: actionButtons,
                        headerType: 4
                    }, { quoted: mek });

                    // Remove the search listener now
                    bot.ev.off('messages.upsert', movieListener);

                    // --- Action listener ---
                    const actionListener = async (actionUpdate) => {
                        try {
                            const actionMsg = actionUpdate.messages[0];
                            if (!actionMsg?.message?.buttonsResponseMessage) return;

                            const contextInfo = actionMsg.message.buttonsResponseMessage.contextInfo ||
                                               actionMsg.message.extendedTextMessage?.contextInfo;
                            if (!contextInfo || contextInfo.stanzaId !== detailMsg.key.id) return;

                            const actionBtnId = actionMsg.message.buttonsResponseMessage.selectedButtonId;

                            if (actionBtnId === 'sincartoons_details_card') {
                                await bot.sendMessage(from, { react: { text: '📋', key: actionMsg.key } });
                                
                                const fullDetailsCaption = `*☘️ 𝗧ɪᴛʟᴇ : ${title}*

*▫️📅 𝗥ᴇʟᴇᴀꜱᴇ 𝗬ᴇᴀʀ ➟ ${year}*
*▫️🥇 𝗜ᴍᴅʙ 𝗥ᴀᴛɪɴɢ ➟ ${rating}*
*▫️🎬 𝗤ᴜᴀʟɪᴛʏ ➟ ${quality}*
*▫️🎥 𝗗ɪʀᴇᴄᴛᴏʀ ➟ ${director}*
*▫️🌟 𝗖ᴀsᴛ ➟ ${cast}*

*▫️📖 𝗗𝗲𝘀𝗰𝗿𝗶𝗽𝘁𝗶𝗼𝗻 ➟ ${description}*

*➟➟➟➟➟➟➟➟➟➟➟➟➟➟➟*
*👥 𝙵𝙾𝙻𝙻𝙾𝚆 𝙾𝚄𝚁 𝙲𝙷𝙰𝙽𝙽𝙴𝙻 ➟* https://whatsapp.com/channel/0029VbCe8YW84OmKiJkDfk3o
*➟➟➟➟➟➟➟➟➟➟➟➟➟➟➟*`.trim();
                                
                                await bot.sendMessage(from, {
                                    image: { url: posterUrl },
                                    caption: fullDetailsCaption
                                }, { quoted: actionMsg });
                                return;
                            }

                            if (actionBtnId === 'sincartoons_download') {
                                if (!videoUrl) {
                                    await bot.sendMessage(from, { react: { text: '❌', key: actionMsg.key } });
                                    return await bot.sendMessage(from, { text: '❌ No download link available.' });
                                }

                                await bot.sendMessage(from, { react: { text: '⏳', key: actionMsg.key } });

                                try {
                                    // Send video directly
                                    const safeTitle = title.replace(/[^\w\s]/g, '');
                                    const fileName = `🎬ZEUS-X-MINI🎬${safeTitle}.mp4`;

                                    // Try to get thumbnail
                                    let thumbnail = null;
                                    try {
                                        const thumbRes = await axios.get(posterUrl, { responseType: 'arraybuffer', timeout: 10000 });
                                        thumbnail = await sharp(thumbRes.data).resize(320, 320).jpeg({ quality: 70 }).toBuffer();
                                    } catch (e) { console.warn('Thumbnail failed:', e.message); }

                                    await bot.sendMessage(from, {
                                        video: { url: videoUrl },
                                        mimetype: 'video/mp4',
                                        fileName: fileName,
                                        jpegThumbnail: thumbnail,
                                        caption: `*${title}*\n\n🎬 *Quality:* ${quality}\n⭐ *Rating:* ${rating}\n\n*⏤͟͟͞͞★❮ 𝗭𝗘𝗨𝗦 𝗫 𝗠𝗜𝗡𝗜 〽️𝗢𝗩𝗜𝗘𝗦 ❯⏤͟͟͞͞★*`
                                    }, { quoted: actionMsg });

                                    await bot.sendMessage(from, { react: { text: '✅', key: actionMsg.key } });
                                } catch (err) {
                                    console.error('Download error:', err);
                                    await bot.sendMessage(from, { react: { text: '❌', key: actionMsg.key } });
                                    await bot.sendMessage(from, { text: `❌ Failed to send video: ${err.message}` });
                                }

                                bot.ev.off('messages.upsert', actionListener);
                            }
                        } catch (err) {
                            console.error('Action error:', err);
                            await bot.sendMessage(from, { text: `❌ Failed: ${err.message}` });
                            bot.ev.off('messages.upsert', actionListener);
                        }
                    };

                    bot.ev.on('messages.upsert', actionListener);
                    setTimeout(() => bot.ev.off('messages.upsert', actionListener), 300000);

                } catch (err) {
                    console.error('Movie selection error:', err);
                    await bot.sendMessage(from, { text: `❌ Failed to process cartoon: ${err.message}` });
                }
            };

            bot.ev.on('messages.upsert', movieListener);
            setTimeout(() => bot.ev.off('messages.upsert', movieListener), 300000);
            return; // End of button mode
        }

        // ---------- TEXT MODE (Buttons OFF) - TikTok style dynamic emoji numbers ----------
        // Build numbered list for search results (using dynamic emojis like 1️⃣, 2️⃣, ...)
        let searchList = `🎬 *SinCartoons Search Results*\n\nQuery: ${query}\n\n`;
        let idx = 1;
        results.forEach((r) => {
            searchList += `${idx++}️⃣ ${r.title}\n`;
        });
        searchList += `\nReply with the number (1-${results.length}).`;

        const searchMsg = await bot.sendMessage(from, {
            image: { url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQt78F5c1b_8PZM7d--5Jy77lE1FdVRq050lULngkwpq5MX7a-0tVOCJGo&s=10' },
            caption: searchList
        }, { quoted: mek });

        // Listener for movie selection
        const movieTextListener = async (update) => {
            try {
                const m = update.messages[0];
                if (!m?.message) return;
                const body = m.message.conversation || m.message.extendedTextMessage?.text;
                if (!body) return;

                const contextInfo = m.message.extendedTextMessage?.contextInfo;
                if (!contextInfo || contextInfo.stanzaId !== searchMsg.key.id) return;

                const selectedNum = parseInt(body.trim());
                if (isNaN(selectedNum) || selectedNum < 1 || selectedNum > results.length) {
                    return;
                }

                const selected = results[selectedNum - 1];
                if (!selected) return;

                await bot.sendMessage(from, { react: { text: '⏳', key: m.key } });

                const movieUrl = selected.url;
                if (!movieUrl) throw new Error('Movie URL not found');

                // Fetch movie details
                const infoUrl = `https://mr-thinuzz-api-build.vercel.app/api/sincartoons/movie?url=${encodeURIComponent(movieUrl)}&apiKey=key_faa62e4037a95cda`;
                const { data: infoData } = await axios.get(infoUrl);
                const movie = infoData?.data;
                if (!movie) {
                    return await bot.sendMessage(from, { text: '❎ Failed to fetch cartoon details.' });
                }

                const title = movie.title || 'N/A';
                const year = movie.year || 'N/A';
                const rating = movie.imdb_rating || movie.rating || 'N/A';
                const quality = movie.quality || 'HD';
                const director = movie.director || 'N/A';
                const description = movie.description || 'No description available.';
                const videoUrl = movie.video_url || null;
                
                let cast = 'N/A';
                if (movie.cast && Array.isArray(movie.cast)) {
                    cast = movie.cast.map(c => `${c.name}${c.character ? ` (${c.character})` : ''}`).join(', ');
                }

                const posterUrl = movie.poster || 'https://via.placeholder.com/300x450?text=No+Image';

                // Build options list with emojis
                let optionsList = `🎬 *${title}*\n\n📋 *Options:*\n`;
                let optIdx = 1;
                if (videoUrl) {
                    optionsList += `${optIdx++}️⃣ ⬇️ Download Cartoon\n`;
                }
                optionsList += `${optIdx++}️⃣ 📑 Full Details\n`;
                if (!videoUrl) {
                    optionsList += `\n❌ *No download link available.*\n`;
                }
                optionsList += `\nReply with the number (1-${optIdx-1}).`;

                const detailMsg = await bot.sendMessage(from, {
                    image: { url: posterUrl },
                    caption: optionsList
                }, { quoted: mek });

                // Remove search listener
                bot.ev.off('messages.upsert', movieTextListener);

                // Listener for options selection
                const optionsTextListener = async (update2) => {
                    try {
                        const m2 = update2.messages[0];
                        if (!m2?.message) return;
                        const body2 = m2.message.conversation || m2.message.extendedTextMessage?.text;
                        if (!body2) return;

                        const ctx2 = m2.message.extendedTextMessage?.contextInfo;
                        if (!ctx2 || ctx2.stanzaId !== detailMsg.key.id) return;

                        const selectedNum2 = parseInt(body2.trim());
                        if (isNaN(selectedNum2)) return;

                        // Determine which option was selected
                        let optIndex = 1;
                        if (videoUrl) {
                            if (selectedNum2 === optIndex) {
                                // Download option
                                await bot.sendMessage(from, { react: { text: '⏳', key: m2.key } });
                                try {
                                    const safeTitle = title.replace(/[^\w\s]/g, '');
                                    const fileName = `🎬ZEUS-X-MINI🎬${safeTitle}.mp4`;

                                    let thumbnail = null;
                                    try {
                                        const thumbRes = await axios.get(posterUrl, { responseType: 'arraybuffer', timeout: 10000 });
                                        thumbnail = await sharp(thumbRes.data).resize(320, 320).jpeg({ quality: 70 }).toBuffer();
                                    } catch (e) { console.warn('Thumbnail failed:', e.message); }

                                    await bot.sendMessage(from, {
                                        video: { url: videoUrl },
                                        mimetype: 'video/mp4',
                                        fileName: fileName,
                                        jpegThumbnail: thumbnail,
                                        caption: `*${title}*\n\n🎬 *Quality:* ${quality}\n⭐ *Rating:* ${rating}\n\n*⏤͟͟͞͞★❮ 𝗭𝗘𝗨𝗦 𝗫 𝗠𝗜𝗡𝗜 〽️𝗢𝗩𝗜𝗘𝗦 ❯⏤͟͟͞͞★*`
                                    }, { quoted: m2 });

                                    await bot.sendMessage(from, { react: { text: '✅', key: m2.key } });
                                } catch (err) {
                                    console.error('Download error:', err);
                                    await bot.sendMessage(from, { react: { text: '❌', key: m2.key } });
                                    await bot.sendMessage(from, { text: `❌ Failed to send video: ${err.message}` });
                                }
                                bot.ev.off('messages.upsert', optionsTextListener);
                                return;
                            }
                            optIndex++;
                        }

                        // Details card (if selectedNum2 matches current optIndex)
                        if (selectedNum2 === optIndex) {
                            await bot.sendMessage(from, { react: { text: '📋', key: m2.key } });
                            const fullDetailsCaption = `*☘️ 𝗧ɪᴛʟᴇ : ${title}*

*▫️📅 𝗥ᴇʟᴇᴀꜱᴇ 𝗬ᴇᴀʀ ➟ ${year}*
*▫️🥇 𝗜ᴍᴅʙ 𝗥ᴀᴛɪɴɢ ➟ ${rating}*
*▫️🎬 𝗤ᴜᴀʟɪᴛʏ ➟ ${quality}*
*▫️🎥 𝗗ɪʀᴇᴄᴛᴏʀ ➟ ${director}*
*▫️🌟 𝗖ᴀsᴛ ➟ ${cast}*

*▫️📖 𝗗𝗲𝘀𝗰𝗿𝗶𝗽𝘁𝗶𝗼𝗻 ➟ ${description}*

*➟➟➟➟➟➟➟➟➟➟➟➟➟➟➟*
*👥 𝙵𝙾𝙻𝙻𝙾𝚆 𝙾𝚄𝚁 𝙲𝙷𝙰𝙽𝙽𝙴𝙻 ➟* https://whatsapp.com/channel/0029VbCe8YW84OmKiJkDfk3o
*➟➟➟➟➟➟➟➟➟➟➟➟➟➟➟*`.trim();
                            await bot.sendMessage(from, {
                                image: { url: posterUrl },
                                caption: fullDetailsCaption
                            }, { quoted: m2 });
                            bot.ev.off('messages.upsert', optionsTextListener);
                            return;
                        }

                        // Invalid selection
                        await bot.sendMessage(from, { text: '❌ Invalid option. Please reply with a valid number.' });

                    } catch (err) {
                        console.error('Options text error:', err);
                        await bot.sendMessage(from, { text: `❌ Failed: ${err.message}` });
                        bot.ev.off('messages.upsert', optionsTextListener);
                    }
                };

                bot.ev.on('messages.upsert', optionsTextListener);
                setTimeout(() => bot.ev.off('messages.upsert', optionsTextListener), 300000);

            } catch (err) {
                console.error('Movie text selection error:', err);
                await bot.sendMessage(from, { text: `❌ Failed to process cartoon: ${err.message}` });
            }
        };

        bot.ev.on('messages.upsert', movieTextListener);
        setTimeout(() => bot.ev.off('messages.upsert', movieTextListener), 300000);

    } catch (err) {
        console.error('Command error:', err);
        await bot.sendMessage(from, { text: `❌ ERROR: ${err.message}` });
    }
});

module.exports = {};
