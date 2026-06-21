const { cmd } = require("../command");
const axios = require("axios");
const sharp = require("sharp");
const config = require("../config");

// ============================================================
// SHARED UTILITY FUNCTIONS
// ============================================================

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

async function getThumbnail(imageUrl) {
    if (!imageUrl) return null;
    try {
        const response = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            timeout: 15000
        });
        return await sharp(response.data)
            .resize(320, 320, { fit: 'cover' })
            .jpeg({ quality: 70 })
            .toBuffer();
    } catch (err) {
        console.warn('⚠️ Thumbnail generation failed:', err.message);
        return null;
    }
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

function isValidUrl(url) {
    if (!url) return false;
    try {
        const parsed = new URL(url);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
        return false;
    }
}

// ============================================================
// SOURCE CONFIGURATIONS
// ============================================================

const SOURCES = {
    cinesubz: {
        name: "CineSubz",
        emoji: "🎬",
        alias: ["cs", "movie"],
        search: (q) => `https://mr-thinuzz-api-build.vercel.app/api/cinesubz/search?query=${encodeURIComponent(q)}&apiKey=key_faa62e4037a95cda`,
        info: (url) => `https://mr-thinuzz-api-build.vercel.app/api/cinesubz/movie?url=${encodeURIComponent(url)}&apiKey=key_faa62e4037a95cda`,
        download: (url) => `https://mr-thinuzz-api-build.vercel.app/api/cinesubz/download?url=${encodeURIComponent(url)}&apiKey=key_faa62e4037a95cda`,
        extractResults: (data) => data?.data?.all || data?.data?.movies || [],
        extractMovie: (data) => data?.data,
        extractDownloads: (movie) => {
            let downloads = movie?.downloadUrl || [];
            return downloads.map(d => ({
                quality: d.quality || 'HD',
                size: d.size || 'N/A',
                url: d.link || d.url
            }));
        },
        getTitle: (movie) => movie?.maintitle || movie?.title || 'N/A',
        getYear: (movie) => movie?.dateCreate || movie?.year || 'N/A',
        getRating: (movie) => movie?.imdb?.value || movie?.rating?.value || 'N/A',
        getPlot: (movie) => movie?.description || 'No description available.',
        getCast: (movie) => {
            if (movie?.cast && Array.isArray(movie.cast)) {
                return movie.cast.map(c => c.actor?.name || c.name).join(', ');
            }
            return 'N/A';
        },
        getPoster: (movie) => movie?.mainImage || null,
        getBackground: (movie) => movie?.mainImage || null,
    },
    animeclub: {
        name: "AnimeClub",
        emoji: "🎌",
        alias: ["ac", "anime"],
        search: (q) => `https://animeclub-api.udmodz-2ab.workers.dev/search?q=${encodeURIComponent(q)}`,
        info: (url) => `https://animeclub-api.udmodz-2ab.workers.dev/dl?url=${encodeURIComponent(url)}`,
        download: null, // No separate download endpoint needed
        extractResults: (data) => data?.data || data?.results || data?.movies || [],
        extractMovie: (data) => data,
        extractDownloads: (movie) => {
            const links = movie?.links || {};
            const entries = Object.entries(links);
            const directLinks = entries.filter(([key, value]) => {
                return (key.includes('Direct Download') || 
                        value?.includes('thenuxgdrive.netlify.app') || 
                        value?.includes('drive.google.com')) && 
                        value && value.startsWith('http');
            });
            const finalLinks = directLinks.length ? directLinks : 
                              entries.filter(([key, value]) => value && value.startsWith('http') && !value.includes('animeclub2.com/links/'));
            
            return finalLinks.map(([key, url]) => ({
                quality: key.replace('Direct Download', '').trim() || 'HD',
                size: 'N/A',
                url: url,
                label: key
            }));
        },
        getTitle: (movie) => movie?.videoname || movie?.title || 'N/A',
        getYear: (movie) => movie?.year || 'N/A',
        getRating: (movie) => movie?.rating || 'N/A',
        getPlot: (movie) => movie?.desc || movie?.description || 'No description available.',
        getCast: (movie) => movie?.cast || 'N/A',
        getPoster: (movie) => movie?.thumbnail || null,
        getBackground: (movie) => movie?.thumbnail || null,
    },
    sincartoons: {
        name: "SinhaCartoons",
        emoji: "🎬",
        alias: ["sc", "cartoon", "sinhala"],
        search: (q) => `https://mr-thinuzz-api-build.vercel.app/api/sincartoons/search?query=${encodeURIComponent(q)}&apiKey=key_faa62e4037a95cda`,
        info: (url) => `https://mr-thinuzz-api-build.vercel.app/api/sincartoons/movie?url=${encodeURIComponent(url)}&apiKey=key_faa62e4037a95cda`,
        download: null,
        extractResults: (data) => data?.data?.movies || data?.data?.all || data?.results || [],
        extractMovie: (data) => data?.data,
        extractDownloads: (movie) => {
            if (movie?.video_url) {
                return [{
                    quality: movie.quality || "HD",
                    size: movie.file_size || "N/A",
                    url: movie.video_url
                }];
            }
            return [];
        },
        getTitle: (movie) => movie?.title || 'N/A',
        getYear: (movie) => movie?.year || 'N/A',
        getRating: (movie) => movie?.imdb_rating || movie?.rating || 'N/A',
        getPlot: (movie) => movie?.description || movie?.plot || 'No description available.',
        getCast: (movie) => {
            if (movie?.cast && Array.isArray(movie.cast)) {
                return movie.cast.map(c => `${c.name}${c.character ? ` (${c.character})` : ''}`).join(', ');
            }
            return 'N/A';
        },
        getPoster: (movie) => movie?.poster || null,
        getBackground: (movie) => movie?.poster || null,
    },
    sinhalasub: {
        name: "Sinhalasub",
        emoji: "🎬",
        alias: ["ss", "submovie", "sinhalasubs"],
        search: (q) => `https://mr-thinuzz-api-build.vercel.app/api/sinhalasub?keyword=${encodeURIComponent(q)}&apiKey=key_faa62e4037a95cda`,
        info: (url) => `https://mr-thinuzz-api-build.vercel.app/api/sinhalasub?url=${encodeURIComponent(url)}&apiKey=key_faa62e4037a95cda`,
        download: null,
        extractResults: (data) => data?.data || data?.results || [],
        extractMovie: (data) => data?.data,
        extractDownloads: (movie) => {
            let downloads = movie?.download_links || movie?.qualities || [];
            downloads = downloads.filter(d => 
                d.url && (
                    d.url.includes('cdn.sinhalasub.net') || 
                    d.url.includes('ddl.sinhalasub.net')
                )
            );
            return downloads.map(d => ({
                quality: d.quality || 'HD',
                size: d.size || 'N/A',
                url: d.url,
                provider: d.provider || 'Unknown'
            }));
        },
        getTitle: (movie) => movie?.title || movie?.Title || 'N/A',
        getYear: (movie) => movie?.release_date || movie?.Year || 'N/A',
        getRating: (movie) => movie?.imdb_rating || movie?.Rating || 'N/A',
        getPlot: (movie) => movie?.description || movie?.plot || 'No description available.',
        getCast: (movie) => movie?.cast || 'N/A',
        getPoster: (movie) => movie?.poster || movie?.Img || null,
        getBackground: (movie) => movie?.poster || movie?.Img || null,
    }
};

// ============================================================
// SOURCE SELECTION HELPERS
// ============================================================

function getSourceFromQuery(query) {
    const lower = query.toLowerCase();
    for (const [key, source] of Object.entries(SOURCES)) {
        if (key === lower) return key;
        if (source.alias && source.alias.some(a => a === lower)) return key;
    }
    return null;
}

function getSourceOptions() {
    let options = "📽️ *Available Movie Sources:*\n\n";
    let i = 1;
    for (const [key, source] of Object.entries(SOURCES)) {
        options += `${i}️⃣ ${source.emoji} ${source.name}\n`;
        i++;
    }
    options += `\n_Example: .mv cinesubz Avatar_`;
    return options;
}

// ============================================================
// MAIN MV COMMAND
// ============================================================

cmd({
    pattern: "mv",
    alias: ["movie", "getmovie", "downloadmovie"],
    react: "🎬",
    desc: "Search and download movies from multiple sources.",
    category: "download",
    filename: __filename,
}, async (bot, mek, m, { from, q, reply, prefix, userSettings }) => {

    try {
        const args = q.trim().split(/\s+/);
        const sourceKey = args[0]?.toLowerCase();
        const query = args.slice(1).join(' ');

        // Show available sources if no source specified
        if (!sourceKey || !getSourceFromQuery(sourceKey)) {
            if (!sourceKey) {
                return reply(getSourceOptions());
            }
            return reply(`❌ Invalid source: *${sourceKey}*\n\n${getSourceOptions()}`);
        }

        const sourceName = getSourceFromQuery(sourceKey);
        const source = SOURCES[sourceName];

        if (!query) {
            return reply(`🎬 *${source.emoji} ${source.name} Downloader*\n\nExample: .mv ${sourceKey} Avatar`);
        }

        const settings = userSettings || global.CURRENT_BOT_SETTINGS || {};
        const isButtonsOn = settings.buttons === 'true';
        const botName = settings.botName || config.DEFAULT_BOT_NAME || "ZEUS-X-MINI";

        await bot.sendMessage(from, { react: { text: '🔎', key: mek.key } });

        // --- SEARCH ---
        const searchUrl = source.search(query);
        const searchResponse = await retry(async () => {
            const { data } = await axios.get(searchUrl, { timeout: 30000 });
            return data;
        });

        let results = source.extractResults(searchResponse);
        if (!results || !results.length) {
            return reply(`❎ No ${source.name} results found for *"${query}"*.`);
        }
        results = results.slice(0, 10);

        // ============================================================
        // BUTTON MODE
        // ============================================================
        if (isButtonsOn) {
            const buttons = results.map((r, i) => ({
                buttonId: `mv_${sourceName}_movie_${i}`,
                buttonText: { displayText: `${source.emoji} ${(r.title || r.Title || 'Unknown').substring(0, 30)}` },
                type: 1
            }));

            const searchMsg = await bot.sendMessage(from, {
                image: { url: 'https://i.ibb.co/cXYtgWPV/Whats-App-Image-2026-06-18-at-7-35-46-PM.png' },
                caption: `${source.emoji} *${source.name} Search Results*\n\nQuery: ${query}\nSelect a movie:`,
                buttons,
                headerType: 4
            }, { quoted: mek });

            // --- Movie Selection Listener ---
            const movieListener = async (update) => {
                try {
                    const m = update.messages[0];
                    if (!m?.message?.buttonsResponseMessage) return;

                    const contextInfo = m.message.buttonsResponseMessage.contextInfo ||
                                       m.message.extendedTextMessage?.contextInfo;
                    if (!contextInfo || contextInfo.stanzaId !== searchMsg.key.id) return;

                    const btnId = m.message.buttonsResponseMessage.selectedButtonId;
                    if (!btnId?.startsWith(`mv_${sourceName}_movie_`)) return;

                    const index = parseInt(btnId.split('_')[3]);
                    const selected = results[index];
                    if (!selected) return;

                    await bot.sendMessage(from, { react: { text: '⏳', key: m.key } });

                    const movieUrl = selected.link || selected.url || selected.Link;
                    if (!movieUrl) throw new Error('Movie URL not found');

                    // Get movie info
                    let movie;
                    if (source.info) {
                        const infoUrl = source.info(movieUrl);
                        const infoResponse = await retry(async () => {
                            const { data } = await axios.get(infoUrl, { timeout: 30000 });
                            return data;
                        });
                        movie = source.extractMovie(infoResponse);
                    } else {
                        movie = selected;
                    }

                    if (!movie) {
                        return await bot.sendMessage(from, { text: `❎ Failed to fetch ${source.name} details.` });
                    }

                    let downloads = source.extractDownloads(movie);
                    if (!downloads.length) {
                        return await bot.sendMessage(from, { text: '❎ No download links available.' });
                    }

                    // Sort by quality
                    downloads.sort((a, b) => {
                        const getRes = (q) => {
                            const match = q.quality?.match(/\d+/);
                            return match ? parseInt(match[0]) : 0;
                        };
                        return getRes(b) - getRes(a);
                    });

                    const title = source.getTitle(movie);
                    const year = source.getYear(movie);
                    const rating = source.getRating(movie);
                    const plot = source.getPlot(movie);
                    const cast = source.getCast(movie);
                    const posterUrl = source.getPoster(movie) || 'https://via.placeholder.com/300x450?text=No+Image';

                    // Build caption
                    let fullCaption = `
╭━━━〔 ${source.emoji} ${source.name.toUpperCase()} DETAILS 〕━━━⬣

☘️ 𝓣𝓲𝓽𝓵𝓮 ➮ ${title}
📅 𝓨𝓮𝓪𝓻 ➮ ${year}
⭐ 𝓡𝓪𝓽𝓲𝓷𝓰 ➮ ${rating}
🌟 𝓒𝓪𝓼𝓽 ➮ ${cast}
⬇️ 𝓐𝓿𝓪𝓲𝓵𝓪𝓫𝓵𝓮 𝓠𝓾𝓪𝓵𝓲𝓽𝓲𝓮𝓼:
${downloads.map(d => `➤ ${d.quality} (${d.size || 'N/A'})${d.provider ? ` - ${d.provider}` : ''}`).join('\n')}
╰━━━━━━━━━━━━━━━━━━━━⬣
✨ 𝓕𝓸𝓵𝓵𝓸𝔀 𝓾𝓼:
https://whatsapp.com/channel/0029VbCe8YW84OmKiJkDfk3o`.trim();
                    if (fullCaption.length > 4000) fullCaption = fullCaption.substring(0, 3970) + '…\n╰━━━━━━━━━━━━━━━━━━━━⬣';

                    // Quality buttons
                    const qualityButtons = downloads.map((dl, i) => ({
                        buttonId: `mv_${sourceName}_quality_${i}`,
                        buttonText: {
                            displayText: dl.quality?.includes('1080') ? `🔥 ${dl.quality}` :
                                        dl.quality?.includes('720')  ? `⚡ ${dl.quality}` :
                                        `⬇️ ${dl.quality}`
                        },
                        type: 1
                    }));

                    qualityButtons.unshift({
                        buttonId: `mv_${sourceName}_details_card`,
                        buttonText: { displayText: '📑 Details Card' },
                        type: 1
                    });

                    const qualityMsg = await bot.sendMessage(from, {
                        image: { url: posterUrl },
                        caption: fullCaption,
                        buttons: qualityButtons,
                        headerType: 4
                    }, { quoted: mek });

                    bot.ev.off('messages.upsert', movieListener);

                    // --- Action Listener ---
                    const actionListener = async (actionUpdate) => {
                        try {
                            const actionMsg = actionUpdate.messages[0];
                            if (!actionMsg?.message?.buttonsResponseMessage) return;

                            const contextInfo = actionMsg.message.buttonsResponseMessage.contextInfo ||
                                               actionMsg.message.extendedTextMessage?.contextInfo;
                            if (!contextInfo || contextInfo.stanzaId !== qualityMsg.key.id) return;

                            const actionBtnId = actionMsg.message.buttonsResponseMessage.selectedButtonId;

                            // Details Card
                            if (actionBtnId === `mv_${sourceName}_details_card`) {
                                await bot.sendMessage(from, { react: { text: '📋', key: actionMsg.key } });
                                
                                const detailsCaption = `*${source.emoji} 𝗧ɪᴛʟᴇ : ${title}*

*▫️📅 𝗥ᴇʟᴇᴀꜱᴇ 𝗗ᴀᴛᴇ ➟ ${year}*
*▫️🥇 𝗜𝗺𝗱𝗯 𝗩𝗼ᴛᴇꜱ ➟ ${rating}*
*▫️🌟 𝗖ᴀsᴛ ➟ ${cast}*

*▫️📖 𝗗𝗲𝘀𝗰𝗿𝗶ᴘ𝘁ɪᴏɴ ➟ ${plot}*

*➟➟➟➟➟➟➟➟➟➟➟➟➟➟➟*
*👥 𝙵𝙾𝙻𝙻𝙾𝚆 𝙾𝚄𝚁 𝙲𝙷𝙰𝙽𝙽𝙴𝙻 ➟* https://whatsapp.com/channel/0029VbCe8YW84OmKiJkDfk3o
*➟➟➟➟➟➟➟➟➟➟➟➟➟➟➟*`.trim();
                                
                                await bot.sendMessage(from, {
                                    image: { url: posterUrl },
                                    caption: detailsCaption
                                }, { quoted: actionMsg });
                                return;
                            }

                            // Download
                            if (actionBtnId?.startsWith(`mv_${sourceName}_quality_`)) {
                                const qIndex = parseInt(actionBtnId.split('_')[3]);
                                const selectedQuality = downloads[qIndex];
                                if (!selectedQuality) throw new Error('Invalid quality selection');

                                await bot.sendMessage(from, { react: { text: '⏳', key: actionMsg.key } });

                                let downloadUrl = selectedQuality.url;
                                if (!downloadUrl) throw new Error('No download link found');

                                // For CineSubz, fetch actual download links
                                if (sourceName === 'cinesubz' && source.download) {
                                    const dlResponse = await retry(async () => {
                                        const dlUrl = source.download(downloadUrl);
                                        const { data } = await axios.get(dlUrl, { timeout: 60000 });
                                        return data;
                                    });
                                    const links = dlResponse?.data?.downloadUrls?.map(u => u.url) || [];
                                    const usableUrl = selectBestLink(links);
                                    if (usableUrl) downloadUrl = usableUrl;
                                }

                                // Generate thumbnail
                                let thumbnail = null;
                                try {
                                    thumbnail = await getThumbnail(posterUrl);
                                } catch (e) {
                                    console.warn('Thumbnail generation skipped:', e.message);
                                }

                                const safeTitle = title.replace(/[^\w\s]/g, '');
                                const fileName = `${source.emoji}${botName}${safeTitle} (${selectedQuality.quality}).mp4`;

                                await bot.sendMessage(from, {
                                    document: { url: downloadUrl },
                                    mimetype: 'video/mp4',
                                    fileName: fileName,
                                    jpegThumbnail: thumbnail,
                                    caption: `*𝗧ɪᴛʟᴇ : ${title}*\n\n \`[${selectedQuality.quality} ${selectedQuality.size || 'N/A'}]\` \n\n*⏤͟͟͞͞★❮ ${botName} 〽️𝗠𝗢𝗩𝗜𝗘𝗦 ❯⏤͟͟͞͞★*`
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
                    await bot.sendMessage(from, { text: `❌ Failed: ${err.message}` });
                }
            };

            bot.ev.on('messages.upsert', movieListener);
            setTimeout(() => bot.ev.off('messages.upsert', movieListener), 300000);
            return;
        }

        // ============================================================
        // TEXT MODE
        // ============================================================
        let searchList = `${source.emoji} *${source.name} Search Results*\n\nQuery: ${query}\n\n`;
        let idx = 1;
        results.forEach((r) => {
            const title = r.title || r.Title || 'Unknown';
            searchList += `${idx++}️⃣ ${title}\n`;
        });
        searchList += `\nReply with the number (1-${results.length}).`;

        const searchMsg = await bot.sendMessage(from, {
            image: { url: 'https://i.ibb.co/cXYtgWPV/Whats-App-Image-2026-06-18-at-7-35-46-PM.png' },
            caption: searchList
        }, { quoted: mek });

        const movieTextListener = async (update) => {
            try {
                const m = update.messages[0];
                if (!m?.message) return;
                const body = m.message.conversation || m.message.extendedTextMessage?.text;
                if (!body) return;

                const contextInfo = m.message.extendedTextMessage?.contextInfo;
                if (!contextInfo || contextInfo.stanzaId !== searchMsg.key.id) return;

                const selectedNum = parseInt(body.trim());
                if (isNaN(selectedNum) || selectedNum < 1 || selectedNum > results.length) return;

                const selected = results[selectedNum - 1];
                if (!selected) return;

                await bot.sendMessage(from, { react: { text: '⏳', key: m.key } });

                const movieUrl = selected.link || selected.url || selected.Link;
                if (!movieUrl) throw new Error('Movie URL not found');

                let movie;
                if (source.info) {
                    const infoUrl = source.info(movieUrl);
                    const infoResponse = await retry(async () => {
                        const { data } = await axios.get(infoUrl, { timeout: 30000 });
                        return data;
                    });
                    movie = source.extractMovie(infoResponse);
                } else {
                    movie = selected;
                }

                if (!movie) {
                    return await bot.sendMessage(from, { text: `❎ Failed to fetch ${source.name} details.` });
                }

                let downloads = source.extractDownloads(movie);
                if (!downloads.length) {
                    return await bot.sendMessage(from, { text: '❎ No download links available.' });
                }

                downloads.sort((a, b) => {
                    const getRes = (q) => {
                        const match = q.quality?.match(/\d+/);
                        return match ? parseInt(match[0]) : 0;
                    };
                    return getRes(b) - getRes(a);
                });

                const title = source.getTitle(movie);
                const year = source.getYear(movie);
                const rating = source.getRating(movie);
                const plot = source.getPlot(movie);
                const cast = source.getCast(movie);
                const posterUrl = source.getPoster(movie) || 'https://via.placeholder.com/300x450?text=No+Image';

                let qualityList = `${source.emoji} *${title}*\n\n📋 *Available Qualities:*\n`;
                let qIdx = 1;
                downloads.forEach((d) => {
                    qualityList += `${qIdx++}️⃣ ${d.quality} (${d.size || 'N/A'})${d.provider ? ` - ${d.provider}` : ''}\n`;
                });
                qualityList += `\n${qIdx}️⃣ 📑 Details Card\n`;
                qualityList += `\nReply with the number (1-${qIdx}).`;

                const qualityMsg = await bot.sendMessage(from, {
                    image: { url: posterUrl },
                    caption: qualityList
                }, { quoted: mek });

                bot.ev.off('messages.upsert', movieTextListener);

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

                        // Details Card
                        if (selectedNum2 === downloads.length + 1) {
                            await bot.sendMessage(from, { react: { text: '📋', key: m2.key } });
                            const detailsCaption = `*${source.emoji} 𝗧ɪᴛʟᴇ : ${title}*

*▫️📅 𝗥ᴇʟᴇᴀꜱᴇ 𝗗ᴀᴛᴇ ➟ ${year}*
*▫️🥇 𝗜𝗺𝗱𝗯 𝗩ᴏᴛᴇꜱ ➟ ${rating}*
*▫️🌟 𝗖ᴀsᴛ ➟ ${cast}*

*▫️📖 𝗗𝗲𝘀𝗰𝗿ɪᴘᴛɪᴏɴ ➟ ${plot}*

*➟➟➟➟➟➟➟➟➟➟➟➟➟➟➟*
*👥 𝙵𝙾𝙻𝙻𝙾𝚆 𝙾𝚄𝚁 𝙲𝙷𝙰𝙽𝙽𝙴𝙻 ➟* https://whatsapp.com/channel/0029VbCe8YW84OmKiJkDfk3o
*➟➟➟➟➟➟➟➟➟➟➟➟➟➟➟*`.trim();
                            await bot.sendMessage(from, {
                                image: { url: posterUrl },
                                caption: detailsCaption
                            }, { quoted: m2 });
                            bot.ev.off('messages.upsert', qualityTextListener);
                            return;
                        }

                        // Download
                        if (selectedNum2 < 1 || selectedNum2 > downloads.length) return;
                        const selectedQuality = downloads[selectedNum2 - 1];
                        if (!selectedQuality) return;

                        await bot.sendMessage(from, { react: { text: '⏳', key: m2.key } });

                        let downloadUrl = selectedQuality.url;
                        if (!downloadUrl) throw new Error('No download link found');

                        if (sourceName === 'cinesubz' && source.download) {
                            const dlResponse = await retry(async () => {
                                const dlUrl = source.download(downloadUrl);
                                const { data } = await axios.get(dlUrl, { timeout: 60000 });
                                return data;
                            });
                            const links = dlResponse?.data?.downloadUrls?.map(u => u.url) || [];
                            const usableUrl = selectBestLink(links);
                            if (usableUrl) downloadUrl = usableUrl;
                        }

                        let thumbnail = null;
                        try {
                            thumbnail = await getThumbnail(posterUrl);
                        } catch (e) {
                            console.warn('Thumbnail generation skipped:', e.message);
                        }

                        const safeTitle = title.replace(/[^\w\s]/g, '');
                        const fileName = `${source.emoji}${botName}${safeTitle} (${selectedQuality.quality}).mp4`;

                        await bot.sendMessage(from, {
                            document: { url: downloadUrl },
                            mimetype: 'video/mp4',
                            fileName: fileName,
                            jpegThumbnail: thumbnail,
                            caption: `*𝗧ɪᴛʟᴇ : ${title}*\n\n \`[${selectedQuality.quality} ${selectedQuality.size || 'N/A'}]\` \n\n*⏤͟͟͞͞★❮ ${botName} 〽️𝗠𝗢𝗩𝗜𝗘𝗦 ❯⏤͟͟͞͞★*`
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
                await bot.sendMessage(from, { text: `❌ Failed: ${err.message}` });
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
