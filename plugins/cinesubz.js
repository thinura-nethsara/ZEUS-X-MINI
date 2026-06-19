const { cmd } = require("../command");
const axios = require("axios");
const config = require("../config");

cmd({
    pattern: "cinesubz",
    alias: ["cs", "movie"],
    react: "🎬",
    desc: "Search and download movies from CineSubz.",
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

    async function getDownloadLinks(finalUrl) {
        return await retry(async () => {
            const dlApi = `https://apis.sadas.dev/api/v1/movie/cinesubz/dl?q=${encodeURIComponent(finalUrl)}&apiKey=50d7ce3f5137b97bc64d220a3f6a33ed`;
            const { data } = await axios.get(dlApi, { timeout: 60000 });
            const links = data?.data?.links || data?.links || [];
            if (!links.length) throw new Error('No links in API response');
            console.log('✅ API returned links:', links);
            return links;
        }, 3, 2000);
    }

    function selectBestLink(links) {
        if (!links || !links.length) return null;
        let best = links.find(link => link.includes('pixeldrain.com'));
        if (best) {
            if (best.includes('pixeldrain.com/u/')) {
                best = best.replace('/u/', '/api/file/');
            }
            return best;
        }
        best = links.find(link => link.startsWith('http') && !link.includes('t.me'));
        if (best) return best;
        if (links.length) return links[0];
        return null;
    }

    try {
        const query = q.trim();
        if (!query) {
            return reply("🎬 *ZEUS X MOVIE ZONE*\n\nExample: .cinesubz Avatar");
        }

        const settings = userSettings || global.CURRENT_BOT_SETTINGS || {};
        const isButtonsOn = settings.buttons === 'true';
        const botName = settings.botName || config.DEFAULT_BOT_NAME || "ZEUS-X-MINI";

        // Send initial reaction
        await bot.sendMessage(from, { react: { text: '🔎', key: mek.key } });

        // --- Search for movies ---
        const searchUrl = `https://apis.sadas.dev/api/v1/movie/cinesubz/search?q=${encodeURIComponent(query)}&apiKey=50d7ce3f5137b97bc64d220a3f6a33ed`;
        const { data: searchData } = await axios.get(searchUrl);
        let results = searchData?.results || searchData?.data;
        if (!results || !results.length) {
            return reply("❎ No movies found.");
        }
        results = results.slice(0, 10);

        // ---------- BUTTON MODE ----------
        if (isButtonsOn) {
            // Build search result buttons
            const buttons = results.map((r, i) => ({
                buttonId: `cinesubz_movie_${i}`,
                buttonText: { displayText: `🎬 ${r.title?.substring(0, 30)}` },
                type: 1
            }));

            const searchMsg = await bot.sendMessage(from, {
                image: { url: 'https://i.ibb.co/cXYtgWPV/Whats-App-Image-2026-06-18-at-7-35-46-PM.png' },
                caption: `🎬 *CineSubz Search Results*\n\nQuery: ${query}\nSelect a movie:`,
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
                    if (!btnId?.startsWith('cinesubz_movie_')) return;

                    const index = parseInt(btnId.split('_')[2]);
                    const selected = results[index];
                    if (!selected) return;

                    await bot.sendMessage(from, { react: { text: '⏳', key: m.key } });

                    const movieUrl = selected.link || selected.url;
                    if (!movieUrl) throw new Error('Movie URL not found');

                    // Fetch movie details
                    const infoUrl = `https://apis.sadas.dev/api/v1/movie/cinesubz/info?q=${encodeURIComponent(movieUrl)}&apiKey=50d7ce3f5137b97bc64d220a3f6a33ed`;
                    const { data: infoData } = await axios.get(infoUrl);
                    const movie = infoData?.result || infoData?.data;
                    if (!movie) {
                        return await bot.sendMessage(from, { text: '❎ Failed to fetch movie details.' });
                    }

                    let downloads = movie.download_links || movie.downloads || movie.qualities || [];
                    if (!downloads.length) {
                        return await bot.sendMessage(from, { text: '❎ No download links available.' });
                    }
                    downloads.sort((a, b) => {
                        const getRes = (q) => parseInt(q?.quality?.match(/\d+/)?.[0]) || 0;
                        return getRes(b) - getRes(a);
                    });

                    const title = movie.title || 'N/A';
                    const year = movie.year || movie.release_date?.split('-')[0] || 'N/A';
                    const rating = movie.rating || movie.imdb_rating || movie.tmdb_rating || 'N/A';
                    const plot = movie.plot || movie.synopsis || movie.description || 'No description available.';
                    let cast = 'N/A';
                    if (movie.cast && Array.isArray(movie.cast)) {
                        cast = movie.cast.map(c => `${c.name}${c.role ? ` (${c.role})` : ''}`).join(', ');
                    }

                    // Build quality caption
                    let fullCaption = `
╭━━━〔 🎬 CINE SUBZ DETAILS 〕━━━⬣

☘️ 𝓣𝓲𝓽𝓵𝓮 ➮ ${title}
📅 𝓨𝓮𝓪𝓻 ➮ ${year}
⭐ 𝓡𝓪𝓽𝓲𝓷𝓰 ➮ ${rating}
🌟 𝓒𝓪𝓼𝓽 ➮ ${cast}
⬇️ 𝓐𝓿𝓪𝓲𝓵𝓪𝓫𝓵𝓮 𝓠𝓾𝓪𝓵𝓲𝓽𝓲𝓮𝓼:
${downloads.map(d => `➤ ${d.quality} (${d.size || 'unknown'})`).join('\n')}
╰━━━━━━━━━━━━━━━━━━⬣
✨ 𝓕𝓸𝓵𝓵𝓸𝔀 𝓾𝓼:
https://whatsapp.com/channel/0029VbCe8YW84OmKiJkDfk3o`.trim();
                    if (fullCaption.length > 4000) fullCaption = fullCaption.substring(0, 3970) + '…\n╰━━━━━━━━━━━━━━━━━━⬣';

                    // Build quality buttons
                    const qualityButtons = downloads.map((dl, i) => ({
                        buttonId: `cinesubz_quality_${i}`,
                        buttonText: {
                            displayText: dl.quality.includes('1080') ? `🔥 ${dl.quality}` :
                                        dl.quality.includes('720')  ? `⚡ ${dl.quality}` :
                                        `⬇️ ${dl.quality}`
                        },
                        type: 1
                    }));

                    qualityButtons.unshift({
                        buttonId: 'cinesubz_details_card',
                        buttonText: { displayText: '📑 Details Card' },
                        type: 1
                    });

                    const posterUrl = movie.backdrop || movie.poster || 'https://via.placeholder.com/300x450?text=No+Image';

                    const qualityMsg = await bot.sendMessage(from, {
                        image: { url: posterUrl },
                        caption: fullCaption,
                        buttons: qualityButtons,
                        headerType: 4
                    }, { quoted: mek });

                    // Remove the search listener now
                    bot.ev.off('messages.upsert', movieListener);

                    // --- Quality / Details action listener ---
                    const actionListener = async (actionUpdate) => {
                        try {
                            const actionMsg = actionUpdate.messages[0];
                            if (!actionMsg?.message?.buttonsResponseMessage) return;

                            const contextInfo = actionMsg.message.buttonsResponseMessage.contextInfo ||
                                               actionMsg.message.extendedTextMessage?.contextInfo;
                            if (!contextInfo || contextInfo.stanzaId !== qualityMsg.key.id) return;

                            const actionBtnId = actionMsg.message.buttonsResponseMessage.selectedButtonId;

                            if (actionBtnId === 'cinesubz_details_card') {
                                await bot.sendMessage(from, { react: { text: '📋', key: actionMsg.key } });
                                const cleanDetailsCaption = `*☘️ 𝗧ɪᴛʟᴇ : ${title}*

*▫️📅 𝗥ᴇʟᴇᴀꜱᴇ 𝗗ᴀᴛᴇ ➟ ${year}*
*▫️🥇 𝗜ᴍᴅʙ 𝗩ᴏᴛᴇꜱ ➟ _${rating}_*
*▫️🕵️‍♂️ 𝗖ᴀsᴛ ➟ ${cast}*

*▫️📖 𝗗𝗲𝘀𝗰𝗿𝗶𝗽𝘁𝗶𝗼𝗻 ➟ ${plot}*

*➟➟➟➟➟➟➟➟➟➟➟➟➟➟➟*
*👥 𝙵𝙾𝙻𝙻𝙾𝚆 𝙾𝚄𝚁 𝙲𝙷𝙰𝙽𝙽𝙴𝙻 ➟* https://whatsapp.com/channel/0029VbCe8YW84OmKiJkDfk3o
*➟➟➟➟➟➟➟➟➟➟➟➟➟➟➟*`.trim();
                                await bot.sendMessage(from, {
                                    image: { url: posterUrl },
                                    caption: cleanDetailsCaption
                                }, { quoted: actionMsg });
                                return;
                            }

                            if (actionBtnId?.startsWith('cinesubz_quality_')) {
                                const qIndex = parseInt(actionBtnId.split('_')[2]);
                                const selectedQuality = downloads[qIndex];
                                if (!selectedQuality) throw new Error('Invalid quality selection');

                                await bot.sendMessage(from, { react: { text: '⏳', key: actionMsg.key } });

                                const finalLink = selectedQuality.final_link || selectedQuality.url;
                                if (!finalLink) throw new Error('No download link found for this quality');

                                console.log(`🔗 Fetching download links for: ${finalLink}`);
                                const links = await getDownloadLinks(finalLink);
                                const usableUrl = selectBestLink(links);
                                if (!usableUrl) throw new Error('No usable download link found');

                                const safeTitle = title.replace(/[^\w\s]/g, '');
                                const fileName = `🎬ZEUS-X-MINI🎬${safeTitle} (${selectedQuality.quality}).mkv`;
                                await bot.sendMessage(from, {
                                    document: { url: usableUrl },
                                    mimetype: 'video/mp4',
                                    fileName: fileName,
                                    caption: `*𝗧ɪᴛʟᴇ : ${title}*\n\n \`[${selectedQuality.quality} ${selectedQuality.size || 'N/A'}]\` \n\n*⏤͟͟͞͞★❮ 𝗭𝗘𝗨𝗦 𝗫 𝗠𝗜𝗡𝗜 〽️𝗢𝗩𝗜𝗘𝗦 ❯⏤͟͟͞͞★*`
                                }, { quoted: actionMsg });

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
                    await bot.sendMessage(from, { text: `❌ Failed to process movie: ${err.message}` });
                }
            };

            bot.ev.on('messages.upsert', movieListener);
            setTimeout(() => bot.ev.off('messages.upsert', movieListener), 300000);
            return; // End of button mode
        }

        // ---------- TEXT MODE (Buttons OFF) - TikTok style dynamic emoji numbers ----------
        // Build numbered list for search results (using dynamic emojis like 1️⃣, 2️⃣, ...)
        let searchList = `🎬 *CineSubz Search Results*\n\nQuery: ${query}\n\n`;
        let idx = 1;
        results.forEach((r) => {
            searchList += `${idx++}️⃣ ${r.title}\n`;
        });
        searchList += `\nReply with the number (1-${results.length}).`;

        const searchMsg = await bot.sendMessage(from, {
            image: { url: 'https://i.ibb.co/cXYtgWPV/Whats-App-Image-2026-06-18-at-7-35-46-PM.png' },
            caption: searchList
        }, { quoted: mek });

        // Listener for movie selection
        const movieTextListener = async (update) => {
            try {
                const m = update.messages[0];
                if (!m?.message) return;
                const body = m.message.conversation || m.message.extendedTextMessage?.text;
                if (!body) return;

                // Check if it's a reply to our search message
                const contextInfo = m.message.extendedTextMessage?.contextInfo;
                if (!contextInfo || contextInfo.stanzaId !== searchMsg.key.id) return;

                const selectedNum = parseInt(body.trim());
                if (isNaN(selectedNum) || selectedNum < 1 || selectedNum > results.length) {
                    return; // ignore invalid
                }

                const selected = results[selectedNum - 1];
                if (!selected) return;

                await bot.sendMessage(from, { react: { text: '⏳', key: m.key } });

                const movieUrl = selected.link || selected.url;
                if (!movieUrl) throw new Error('Movie URL not found');

                // Fetch movie details
                const infoUrl = `https://apis.sadas.dev/api/v1/movie/cinesubz/info?q=${encodeURIComponent(movieUrl)}&apiKey=50d7ce3f5137b97bc64d220a3f6a33ed`;
                const { data: infoData } = await axios.get(infoUrl);
                const movie = infoData?.result || infoData?.data;
                if (!movie) {
                    return await bot.sendMessage(from, { text: '❎ Failed to fetch movie details.' });
                }

                let downloads = movie.download_links || movie.downloads || movie.qualities || [];
                if (!downloads.length) {
                    return await bot.sendMessage(from, { text: '❎ No download links available.' });
                }
                downloads.sort((a, b) => {
                    const getRes = (q) => parseInt(q?.quality?.match(/\d+/)?.[0]) || 0;
                    return getRes(b) - getRes(a);
                });

                const title = movie.title || 'N/A';
                const year = movie.year || movie.release_date?.split('-')[0] || 'N/A';
                const rating = movie.rating || movie.imdb_rating || movie.tmdb_rating || 'N/A';
                const plot = movie.plot || movie.synopsis || movie.description || 'No description available.';
                let cast = 'N/A';
                if (movie.cast && Array.isArray(movie.cast)) {
                    cast = movie.cast.map(c => `${c.name}${c.role ? ` (${c.role})` : ''}`).join(', ');
                }

                // Build quality list with TikTok style dynamic emojis
                let qualityList = `🎬 *${title}*\n\n📋 *Available Qualities:*\n`;
                let qIdx = 1;
                downloads.forEach((d) => {
                    qualityList += `${qIdx++}️⃣ ${d.quality} (${d.size || 'unknown'})\n`;
                });
                // Details card option
                qualityList += `\n${qIdx}️⃣ 📑 Details Card\n`;
                qualityList += `\nReply with the number (1-${qIdx}).`;

                const posterUrl = movie.backdrop || movie.poster || 'https://via.placeholder.com/300x450?text=No+Image';

                const qualityMsg = await bot.sendMessage(from, {
                    image: { url: posterUrl },
                    caption: qualityList
                }, { quoted: mek });

                // Remove the search listener
                bot.ev.off('messages.upsert', movieTextListener);

                // Listener for quality selection
                const qualityTextListener = async (update2) => {
                    try {
                        const m2 = update2.messages[0];
                        if (!m2?.message) return;
                        const body2 = m2.message.conversation || m2.message.extendedTextMessage?.text;
                        if (!body2) return;

                        const ctx2 = m2.message.extendedTextMessage?.contextInfo;
                        if (!ctx2 || ctx2.stanzaId !== qualityMsg.key.id) return;

                        const selectedNum2 = parseInt(body2.trim());
                        if (isNaN(selectedNum2)) return;

                        // Check if it's details card (last option)
                        if (selectedNum2 === downloads.length + 1) {
                            await bot.sendMessage(from, { react: { text: '📋', key: m2.key } });
                            const cleanDetailsCaption = `*☘️ 𝗧ɪᴛʟᴇ : ${title}*

*▫️📅 𝗥ᴇʟᴇᴀꜱᴇ 𝗗ᴀᴛᴇ ➟ ${year}*
*▫️🥇 𝗜ᴍᴅʙ 𝗩ᴏᴛᴇꜱ ➟ _${rating}_*
*▫️🕵️‍♂️ 𝗖ᴀsᴛ ➟ ${cast}*

*▫️📖 𝗗𝗲𝘀𝗰𝗿𝗶𝗽𝘁𝗶𝗼𝗻 ➟ ${plot}*

*➟➟➟➟➟➟➟➟➟➟➟➟➟➟➟*
*👥 𝙵𝙾𝙻𝙻𝙾𝚆 𝙾𝚄𝚁 𝙲𝙷𝙰𝙽𝙽𝙴𝙻 ➟* https://whatsapp.com/channel/0029VbCe8YW84OmKiJkDfk3o
*➟➟➟➟➟➟➟➟➟➟➟➟➟➟➟*`.trim();
                            await bot.sendMessage(from, {
                                image: { url: posterUrl },
                                caption: cleanDetailsCaption
                            }, { quoted: m2 });
                            bot.ev.off('messages.upsert', qualityTextListener);
                            return;
                        }

                        // Quality selection
                        if (selectedNum2 < 1 || selectedNum2 > downloads.length) return;
                        const selectedQuality = downloads[selectedNum2 - 1];
                        if (!selectedQuality) return;

                        await bot.sendMessage(from, { react: { text: '⏳', key: m2.key } });

                        const finalLink = selectedQuality.final_link || selectedQuality.url;
                        if (!finalLink) throw new Error('No download link found for this quality');

                        console.log(`🔗 Fetching download links for: ${finalLink}`);
                        const links = await getDownloadLinks(finalLink);
                        const usableUrl = selectBestLink(links);
                        if (!usableUrl) throw new Error('No usable download link found');

                        const safeTitle = title.replace(/[^\w\s]/g, '');
                        const fileName = `🎬ZEUS-X-MINI🎬${safeTitle} (${selectedQuality.quality}).mkv`;
                        await bot.sendMessage(from, {
                            document: { url: usableUrl },
                            mimetype: 'video/mp4',
                            fileName: fileName,
                            caption: `*𝗧ɪᴛʟᴇ : ${title}*\n\n \`[${selectedQuality.quality} ${selectedQuality.size || 'N/A'}]\` \n\n*⏤͟͟͞͞★❮ 𝗭𝗘𝗨𝗦 𝗫 𝗠𝗜𝗡𝗜 〽️𝗢𝗩𝗜𝗘𝗦 ❯⏤͟͟͞͞★*`
                        }, { quoted: m2 });

                        bot.ev.off('messages.upsert', qualityTextListener);
                    } catch (err) {
                        console.error('Quality text error:', err);
                        await bot.sendMessage(from, { text: `❌ Failed: ${err.message}` });
                        bot.ev.off('messages.upsert', qualityTextListener);
                    }
                };

                bot.ev.on('messages.upsert', qualityTextListener);
                setTimeout(() => bot.ev.off('messages.upsert', qualityTextListener), 300000);

            } catch (err) {
                console.error('Movie text selection error:', err);
                await bot.sendMessage(from, { text: `❌ Failed to process movie: ${err.message}` });
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
