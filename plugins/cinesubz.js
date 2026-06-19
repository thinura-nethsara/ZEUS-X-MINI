const { cmd } = require("../command");
const axios = require("axios");
const sharp = require("sharp");
const config = require("../config");

cmd({
    pattern: "cinesubz",
    alias: ["cs", "movie"],
    react: "🎬",
    desc: "Search and download movies from CineSubz (Streaming version).",
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
            return reply("🎬 *CineSubz Downloader*\n\nExample: .cinesubz Avatar");
        }

        await bot.sendMessage(from, { react: { text: '🔎', key: mek.key } });

        // --- Search ---
        const searchUrl = `https://apis.sadas.dev/api/v1/movie/cinesubz/search?q=${encodeURIComponent(query)}&apiKey=50d7ce3f5137b97bc64d220a3f6a33ed`;
        const { data: searchData } = await axios.get(searchUrl);
        let results = searchData?.results || searchData?.data;
        if (!results || !results.length) {
            return reply("❎ No movies found.");
        }
        results = results.slice(0, 10);

        // Build search buttons
        const buttons = results.map((r, i) => ({
            buttonId: `cinesubz_movie_${i}`,
            buttonText: { displayText: `🎬 ${r.title?.substring(0, 30)}` },
            type: 1
        }));

        const searchMsg = await bot.sendMessage(from, {
            image: { url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQt78F5c1b_8PZM7d--5Jy77lE1FdVRq050lULngkwpq5MX7a-0tVOCJGo&s=10' },
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

                // Build caption
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

                // Remove search listener
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

                            let thumbnail = null;
                            try {
                                const thumbRes = await axios.get(posterUrl, { responseType: 'arraybuffer', timeout: 10000 });
                                thumbnail = await sharp(thumbRes.data).resize(320, 320).jpeg({ quality: 70 }).toBuffer();
                            } catch (e) { console.warn('Thumbnail failed:', e.message); }

                            const safeTitle = title.replace(/[^\w\s]/g, '');
                            const fileName = `🎬ZEUS-X-MINI🎬${safeTitle} (${selectedQuality.quality}).mkv`;

                            // ========== STREAMING IMPLEMENTATION ==========
                            // Download the file as a stream and send directly without storing in RAM
                            try {
                                const fileStream = await axios({
                                    method: 'get',
                                    url: usableUrl,
                                    responseType: 'stream',
                                    timeout: 300000, // 5 minutes
                                }).then(res => res.data);

                                await bot.sendMessage(from, {
                                    document: { stream: fileStream },
                                    mimetype: 'video/mp4',
                                    fileName: fileName,
                                    jpegThumbnail: thumbnail,
                                    caption: `*𝗧ɪᴛʟᴇ : ${title}*\n\n \`[${selectedQuality.quality} ${selectedQuality.size || 'N/A'}]\` \n\n*⏤͟͟͞͞★❮ 𝗭𝗘𝗨𝗦 𝗫 𝗠𝗜𝗡𝗜 〽️𝗢𝗩𝗜𝗘𝗦 ❯⏤͟͟͞͞★*`
                                }, { quoted: actionMsg });

                                bot.ev.off('messages.upsert', actionListener);
                            } catch (streamErr) {
                                console.error('Stream error:', streamErr);
                                await bot.sendMessage(from, { text: `❌ ගොනුව බාගත කිරීමේ දෝෂය: ${streamErr.message}` });
                                bot.ev.off('messages.upsert', actionListener);
                            }
                            // ==============================================
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

    } catch (err) {
        console.error('Command error:', err);
        await bot.sendMessage(from, { text: `❌ ERROR: ${err.message}` });
    }
});

module.exports = {};
