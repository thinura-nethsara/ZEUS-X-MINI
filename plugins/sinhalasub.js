const { cmd } = require("../command");
const axios = require("axios");
const sharp = require("sharp");
const config = require("../config");

cmd({
    pattern: "sinhalasub",
    alias: ["ss", "submovie", "sinhalasubs"],
    react: "🎬",
    desc: "Search and download Sinhala subtitled movies from Sinhalasub.",
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
            const dlApi = `https://mr-thinuzz-api-build.vercel.app/api/sinhalasub?url=${encodeURIComponent(finalUrl)}&apiKey=key_faa62e4037a95cda`;
            const { data } = await axios.get(dlApi, { timeout: 60000 });
            const movieData = data?.data;
            if (!movieData) throw new Error('No data in API response');
            console.log('✅ API returned movie data:', movieData);
            return movieData;
        }, 3, 2000);
    }

    function selectBestLink(links) {
        if (!links || !links.length) return null;
        
        // Filter out Telegram and non-direct links
        const directLinks = links.filter(link => 
            link.url && 
            link.is_direct !== false && 
            !link.url.includes('telegram.me') &&
            !link.url.includes('t.me')
        );
        
        // Prioritize sinhalasub.net CDN links
        let best = directLinks.find(link => link.url.includes('cdn.sinhalasub.net'));
        if (best) return best.url;
        
        // Then DLServer links
        best = directLinks.find(link => link.url.includes('ddl.sinhalasub.net'));
        if (best) return best.url;
        
        // Then any direct HTTP link
        best = directLinks.find(link => link.url.startsWith('http'));
        if (best) return best.url;
        
        // Fallback: first available link
        if (links.length) return links[0].url;
        return null;
    }

    // Function to generate thumbnail from image URL
    async function getThumbnail(imageUrl) {
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

    try {
        const query = q.trim();
        if (!query) {
            return reply("🎬 *ZEUS X MOVIE ZONE*\n\nExample: .sinhalasub harry potter");
        }

        const settings = userSettings || global.CURRENT_BOT_SETTINGS || {};
        const isButtonsOn = settings.buttons === 'true';
        const botName = settings.botName || config.DEFAULT_BOT_NAME || "ZEUS-X-MINI";

        await bot.sendMessage(from, { react: { text: '🔎', key: mek.key } });

        // --- Search for movies ---
        const searchUrl = `https://mr-thinuzz-api-build.vercel.app/api/sinhalasub?keyword=${encodeURIComponent(query)}&apiKey=key_faa62e4037a95cda`;
        const { data: searchData } = await axios.get(searchUrl);
        let results = searchData?.data || searchData?.results;
        if (!results || !results.length) {
            return reply("❎ No subtitled movies found.");
        }
        results = results.slice(0, 10);

        // ---------- BUTTON MODE ----------
        if (isButtonsOn) {
            const buttons = results.map((r, i) => ({
                buttonId: `sinhalasub_movie_${i}`,
                buttonText: { displayText: `🎬 ${r.Title?.substring(0, 30)}` },
                type: 1
            }));

            const searchMsg = await bot.sendMessage(from, {
                image: { url: 'https://i.ibb.co/cXYtgWPV/Whats-App-Image-2026-06-18-at-7-35-46-PM.png' },
                caption: `🎬 *Sinhala Subtitle Movies Search Results*\n\nQuery: ${query}\nSelect a movie:`,
                buttons,
                headerType: 4
            }, { quoted: mek });

            const movieListener = async (update) => {
                try {
                    const m = update.messages[0];
                    if (!m?.message?.buttonsResponseMessage) return;

                    const contextInfo = m.message.buttonsResponseMessage.contextInfo ||
                                       m.message.extendedTextMessage?.contextInfo;
                    if (!contextInfo || contextInfo.stanzaId !== searchMsg.key.id) return;

                    const btnId = m.message.buttonsResponseMessage.selectedButtonId;
                    if (!btnId?.startsWith('sinhalasub_movie_')) return;

                    const index = parseInt(btnId.split('_')[2]);
                    const selected = results[index];
                    if (!selected) return;

                    await bot.sendMessage(from, { react: { text: '⏳', key: m.key } });

                    const movieUrl = selected.Link || selected.url;
                    if (!movieUrl) throw new Error('Movie URL not found');

                    const infoUrl = `https://mr-thinuzz-api-build.vercel.app/api/sinhalasub?url=${encodeURIComponent(movieUrl)}&apiKey=key_faa62e4037a95cda`;
                    const { data: infoData } = await axios.get(infoUrl);
                    const movie = infoData?.data;
                    if (!movie) {
                        return await bot.sendMessage(from, { text: '❎ Failed to fetch movie details.' });
                    }

                    // Get download links from movie data
                    let downloads = movie.download_links || movie.qualities || [];
                    
                    // Filter to only include sinhalasub.net links
                    downloads = downloads.filter(d => 
                        d.url && (
                            d.url.includes('cdn.sinhalasub.net') || 
                            d.url.includes('ddl.sinhalasub.net')
                        )
                    );
                    
                    if (!downloads.length) {
                        return await bot.sendMessage(from, { text: '❎ No download links available from sinhalasub.net.' });
                    }
                    
                    // Sort by quality (higher resolution first)
                    downloads.sort((a, b) => {
                        const getRes = (q) => {
                            if (!q?.quality) return 0;
                            const match = q.quality.match(/\d+/);
                            return match ? parseInt(match[0]) : 0;
                        };
                        return getRes(b) - getRes(a);
                    });

                    const title = movie.title || selected.Title || 'N/A';
                    const year = movie.release_date || selected.Year || 'N/A';
                    const rating = movie.imdb_rating || selected.Rating || 'N/A';
                    const description = movie.description || movie.plot || 'No description available.';
                    const runtime = movie.runtime || 'N/A';
                    let genres = 'N/A';
                    if (movie.genres && Array.isArray(movie.genres)) {
                        genres = movie.genres.join(', ');
                    }

                    let fullCaption = `
╭━━━〔 🎬 SINHALA SUB DETAILS 〕━━━⬣

☘️ 𝓣𝓲𝓽𝓵𝓮 ➮ ${title}
📅 𝓨𝓮𝓪𝓻 ➮ ${year}
⭐ 𝓡𝓪𝓽𝓲𝓷𝓰 ➮ ${rating}
⏱️ 𝓡𝓾𝓷𝓽𝓲𝓶𝓮 ➮ ${runtime}
🎭 𝓖𝓮𝓷𝓻𝓮𝓼 ➮ ${genres}
⬇️ 𝓐𝓿𝓪𝓲𝓵𝓪𝓫𝓵𝓮 𝓠𝓾𝓪𝓵𝓲𝓽𝓲𝓮𝓼:
${downloads.map(d => `➤ ${d.quality} (${d.size || 'unknown'}) - ${d.provider || 'Unknown'}`).join('\n')}
╰━━━━━━━━━━━━━━━━━━━━⬣
✨ 𝓕𝓸𝓵𝓵𝓸𝔀 𝓾𝓼:
https://whatsapp.com/channel/0029VbCe8YW84OmKiJkDfk3o`.trim();
                    if (fullCaption.length > 4000) fullCaption = fullCaption.substring(0, 3970) + '…\n╰━━━━━━━━━━━━━━━━━━━━⬣';

                    const qualityButtons = downloads.map((dl, i) => ({
                        buttonId: `sinhalasub_quality_${i}`,
                        buttonText: {
                            displayText: dl.quality.includes('1080') ? `🔥 ${dl.quality}` :
                                        dl.quality.includes('720')  ? `⚡ ${dl.quality}` :
                                        `⬇️ ${dl.quality}`
                        },
                        type: 1
                    }));

                    qualityButtons.unshift({
                        buttonId: 'sinhalasub_details_card',
                        buttonText: { displayText: '📑 Details Card' },
                        type: 1
                    });

                    const posterUrl = movie.poster || movie.Img || selected.Img || 'https://via.placeholder.com/300x450?text=No+Image';

                    const qualityMsg = await bot.sendMessage(from, {
                        image: { url: posterUrl },
                        caption: fullCaption,
                        buttons: qualityButtons,
                        headerType: 4
                    }, { quoted: mek });

                    bot.ev.off('messages.upsert', movieListener);

                    const actionListener = async (actionUpdate) => {
                        try {
                            const actionMsg = actionUpdate.messages[0];
                            if (!actionMsg?.message?.buttonsResponseMessage) return;

                            const contextInfo = actionMsg.message.buttonsResponseMessage.contextInfo ||
                                               actionMsg.message.extendedTextMessage?.contextInfo;
                            if (!contextInfo || contextInfo.stanzaId !== qualityMsg.key.id) return;

                            const actionBtnId = actionMsg.message.buttonsResponseMessage.selectedButtonId;

                            if (actionBtnId === 'sinhalasub_details_card') {
                                await bot.sendMessage(from, { react: { text: '📋', key: actionMsg.key } });
                                const cleanDetailsCaption = `*☘️ 𝗧ɪᴛʟᴇ : ${title}*

*▫️📅 𝗥ᴇʟᴇᴀꜱᴇ 𝗗ᴀᴛᴇ ➟ ${year}*
*▫️🥇 𝗜𝗺𝗱𝗯 𝗩𝗼𝘁ᴇꜱ ➟ _${rating}_*
*▫️⏱️ 𝗥ᴜɴᴛɪᴍᴇ ➟ ${runtime}*
*▫️🎭 𝗚𝗲𝗻𝗿𝗲𝘀 ➟ ${genres}*

*▫️📖 𝗗𝗲𝘀𝗰𝗿𝗶𝗽𝘁𝗶𝗼𝗻 ➟ ${description}*

*➟➟➟➟➟➟➟➟➟➟➟➟➟➟➟*
*👥 𝙵𝙾𝙻𝙻𝙾𝚆 𝙾𝚄𝚁 𝙲𝙷𝙰𝙽𝙽𝙴𝙻 ➟* https://whatsapp.com/channel/0029VbCe8YW84OmKiJkDfk3o
*➟➟➟➟➟➟➟➟➟➟➟➟➟➟➟*`.trim();
                                await bot.sendMessage(from, {
                                    image: { url: posterUrl },
                                    caption: cleanDetailsCaption
                                }, { quoted: actionMsg });
                                return;
                            }

                            if (actionBtnId?.startsWith('sinhalasub_quality_')) {
                                const qIndex = parseInt(actionBtnId.split('_')[2]);
                                const selectedQuality = downloads[qIndex];
                                if (!selectedQuality) throw new Error('Invalid quality selection');

                                await bot.sendMessage(from, { react: { text: '⏳', key: actionMsg.key } });

                                const finalLink = selectedQuality.url;
                                if (!finalLink) throw new Error('No download link found for this quality');

                                console.log(`🔗 Using video URL: ${finalLink}`);
                                
                                const usableUrl = finalLink;

                                // ✅ Generate thumbnail from poster URL
                                let thumbnail = null;
                                try {
                                    thumbnail = await getThumbnail(posterUrl);
                                } catch (e) {
                                    console.warn('Thumbnail generation skipped:', e.message);
                                }

                                const safeTitle = title.replace(/[^\w\s]/g, '');
                                const fileName = `🎬ZEUS-X-MINI🎬${safeTitle} (${selectedQuality.quality}).mp4`;

                                await bot.sendMessage(from, {
                                    document: { url: usableUrl },
                                    mimetype: 'video/mp4',
                                    fileName: fileName,
                                    jpegThumbnail: thumbnail, // ✅ Thumbnail added here
                                    caption: `*𝗧ɪᴛʟᴇ : ${title}*\n\n \`[${selectedQuality.quality} ${selectedQuality.size || 'N/A'}]\` \n\n*⏤͟͟͞͞★❮ 𝗭𝗘𝗨𝗦 𝗫 〽️𝗢𝗩𝗜𝗘𝗦 ❯⏤͟͟͞͞★*`
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
            return;
        }

        // ---------- TEXT MODE (Buttons OFF) ----------
        let searchList = `🎬 *Sinhala Subtitle Movies Search Results*\n\nQuery: ${query}\n\n`;
        let idx = 1;
        results.forEach((r) => {
            searchList += `${idx++}️⃣ ${r.Title}\n`;
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
                if (isNaN(selectedNum) || selectedNum < 1 || selectedNum > results.length) {
                    return;
                }

                const selected = results[selectedNum - 1];
                if (!selected) return;

                await bot.sendMessage(from, { react: { text: '⏳', key: m.key } });

                const movieUrl = selected.Link || selected.url;
                if (!movieUrl) throw new Error('Movie URL not found');

                const infoUrl = `https://mr-thinuzz-api-build.vercel.app/api/sinhalasub?url=${encodeURIComponent(movieUrl)}&apiKey=key_faa62e4037a95cda`;
                const { data: infoData } = await axios.get(infoUrl);
                const movie = infoData?.data;
                if (!movie) {
                    return await bot.sendMessage(from, { text: '❎ Failed to fetch movie details.' });
                }

                // Get download links from movie data
                let downloads = movie.download_links || movie.qualities || [];
                
                // Filter to only include sinhalasub.net links
                downloads = downloads.filter(d => 
                    d.url && (
                        d.url.includes('cdn.sinhalasub.net') || 
                        d.url.includes('ddl.sinhalasub.net')
                    )
                );
                
                if (!downloads.length) {
                    return await bot.sendMessage(from, { text: '❎ No download links available from sinhalasub.net.' });
                }
                
                // Sort by quality (higher resolution first)
                downloads.sort((a, b) => {
                    const getRes = (q) => {
                        if (!q?.quality) return 0;
                        const match = q.quality.match(/\d+/);
                        return match ? parseInt(match[0]) : 0;
                    };
                    return getRes(b) - getRes(a);
                });

                const title = movie.title || selected.Title || 'N/A';
                const year = movie.release_date || selected.Year || 'N/A';
                const rating = movie.imdb_rating || selected.Rating || 'N/A';
                const description = movie.description || movie.plot || 'No description available.';
                const runtime = movie.runtime || 'N/A';
                let genres = 'N/A';
                if (movie.genres && Array.isArray(movie.genres)) {
                    genres = movie.genres.join(', ');
                }

                let qualityList = `🎬 *${title}*\n\n📋 *Available Qualities:*\n`;
                let qIdx = 1;
                downloads.forEach((d) => {
                    qualityList += `${qIdx++}️⃣ ${d.quality} (${d.size || 'unknown'}) - ${d.provider || 'Unknown'}\n`;
                });
                qualityList += `\n${qIdx}️⃣ 📑 Details Card\n`;
                qualityList += `\nReply with the number (1-${qIdx}).`;

                const posterUrl = movie.poster || movie.Img || selected.Img || 'https://via.placeholder.com/300x450?text=No+Image';

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

                        if (selectedNum2 === downloads.length + 1) {
                            await bot.sendMessage(from, { react: { text: '📋', key: m2.key } });
                            const cleanDetailsCaption = `*☘️ 𝗧ɪᴛʟᴇ : ${title}*

*▫️📅 𝗥ᴇʟᴇᴀꜱᴇ 𝗗ᴀᴛᴇ ➟ ${year}*
*▫️🥇 𝗜𝗺𝗱𝗯 𝗩𝗼𝘁ᴇꜱ ➟ _${rating}_*
*▫️⏱️ 𝗥ᴜɴᴛɪᴍᴇ ➟ ${runtime}*
*▫️🎭 𝗚𝗲𝗻𝗿𝗲𝘀 ➟ ${genres}*

*▫️📖 𝗗𝗲𝘀𝗰𝗿𝗶𝗽𝘁𝗶𝗼𝗻 ➟ ${description}*

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

                        if (selectedNum2 < 1 || selectedNum2 > downloads.length) return;
                        const selectedQuality = downloads[selectedNum2 - 1];
                        if (!selectedQuality) return;

                        await bot.sendMessage(from, { react: { text: '⏳', key: m2.key } });

                        const finalLink = selectedQuality.url;
                        if (!finalLink) throw new Error('No download link found for this quality');

                        console.log(`🔗 Using video URL: ${finalLink}`);
                        
                        const usableUrl = finalLink;

                        // ✅ Generate thumbnail from poster URL
                        let thumbnail = null;
                        try {
                            thumbnail = await getThumbnail(posterUrl);
                        } catch (e) {
                            console.warn('Thumbnail generation skipped:', e.message);
                        }

                        const safeTitle = title.replace(/[^\w\s]/g, '');
                        const fileName = `🎬ZEUS-X-MINI🎬${safeTitle} (${selectedQuality.quality}).mp4`;

                        await bot.sendMessage(from, {
                            document: { url: usableUrl },
                            mimetype: 'video/mp4',
                            fileName: fileName,
                            jpegThumbnail: thumbnail, // ✅ Thumbnail added here
                            caption: `*𝗧ɪᴛʟᴇ : ${title}*\n\n \`[${selectedQuality.quality} ${selectedQuality.size || 'N/A'}]\` \n\n*⏤͟͟͞͞★❮ 𝗭𝗘𝗨𝗦 𝗫  〽️𝗢𝗩𝗜𝗘𝗦 ❯⏤͟͟͞͞★*`
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
