const { cmd } = require("../command");
const axios = require("axios");
const sharp = require("sharp");
const config = require("../config");

cmd({
    pattern: "sinhalasub",
    alias: ["ss", "sinhala", "sinhaladub"],
    react: "🎬",
    desc: "Search and download Sinhala dubbed movies from Sinhalasub.",
    category: "download",
    filename: __filename,
}, async (bot, mek, m, { from, q, reply, prefix, userSettings }) => {

    try {
        const query = q.trim();
        if (!query) {
            return reply("🔎 *Please enter a movie name!*\nExample: .sinhalasub harry potter");
        }

        // Initial reaction
        await bot.sendMessage(from, { react: { text: '🎬', key: mek.key } });

        // Search API
        const searchUrl = `https://mr-thinuzz-api-build.vercel.app/api/sinhalasub?keyword=${encodeURIComponent(query)}&apiKey=key_13be1374312cdd0a`;
        const { data: searchRes } = await axios.get(searchUrl, { timeout: 30000 });

        if (!searchRes?.status || !searchRes?.data?.length) {
            return reply("❌ *No movies found. Try another name.*");
        }

        const results = searchRes.data.slice(0, 10);
        const wm = "*⏤͟͟͞͞★❮ 𝗭𝗘𝗨𝗦 𝗫 𝗠𝗜𝗡𝗜 〽️𝗢𝗩𝗜𝗘𝗦 ❯⏤͟͟͞͞★*";

        // Search result buttons
        const movieButtons = results.map((movie, i) => ({
            buttonId: `movie_${i}`,
            buttonText: { displayText: `🎬 ${movie.Title.substring(0, 30)}` },
            type: 1
        }));

        const searchCaption = `*📽️ ZEUS X MINI SINHALASUB MOVIES 📽️*\n\n`
            + `*╭───────────────┈⊷*\n`
            + `*┊• 🔎 Search:* ${query}\n`
            + `*┊• 📽️ Movies found:* ${results.length}\n`
            + `*╰───────────────┈⊷*\n\n`
            + `*Select a movie below 👇*\n`;

        const searchMsg = await bot.sendMessage(from, {
            image: { url: results[0]?.Img || 'https://i.imgur.com/8KmK9V8.jpeg' },
            caption: searchCaption,
            buttons: movieButtons,
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
                if (!btnId?.startsWith('movie_')) return;

                const idx = parseInt(btnId.split('_')[1]);
                const selected = results[idx];
                if (!selected) return;

                await bot.sendMessage(from, { react: { text: '⏳', key: m.key } });

                // Fetch movie details
                const detailsUrl = `https://mr-thinuzz-api-build.vercel.app/api/sinhalasub?url=${encodeURIComponent(selected.Link)}&apiKey=key_13be1374312cdd0a`;
                const { data: detailsRes } = await axios.get(detailsUrl, { timeout: 30000 });

                if (!detailsRes?.status || !detailsRes?.data) {
                    return await bot.sendMessage(from, { text: '❌ *Failed to fetch movie details.*' });
                }

                const movieData = detailsRes.data;
                const title = movieData.title || selected.Title;
                const year = movieData.release_date || selected.Year || 'N/A';
                const rating = movieData.imdb_rating || selected.Rating || 'N/A';
                const runtime = movieData.runtime || 'N/A';
                const genres = movieData.genres?.join(', ') || 'N/A';
                const description = movieData.description || 'No description available.';
                const poster = movieData.poster || selected.Img;
                const backdrop = movieData.backdrop || poster;

                let downloads = movieData.download_links || [];
                const validDownloads = downloads.filter(d => d.is_direct && d.url && !d.url.includes('telegram.me'));
                const finalDownloads = validDownloads.length ? validDownloads : downloads.filter(d => d.is_direct);

                if (finalDownloads.length === 0) {
                    return await bot.sendMessage(from, { text: '❌ *No download links available for this movie.*' });
                }

                finalDownloads.sort((a, b) => {
                    const getRes = (q) => parseInt(q.quality?.match(/\d+/)?.[0]) || 0;
                    return getRes(b) - getRes(a);
                });

                const fullCaption = `╭━━━〔 🎬 SINHALASUB MOVIE 〕━━━⬣

🎬 *Title:* ${title}
📅 *Year:* ${year}
⭐ *Rating:* ${rating}
⏱️ *Runtime:* ${runtime}
🎭 *Genres:* ${genres}

📥 *Available Qualities:*
${finalDownloads.map(d => `▫️ ${d.quality} (${d.size || 'N/A'})`).join('\n')}

╰━━━━━━━━━━━━━━━━━━⬣
✨ ${wm}`;

                const cleanDetailsCaption = `*☘️ 𝗧ɪᴛʟᴇ : ${title}*

*▫️🥇 𝗜ᴍᴅʙ 𝗩ᴏᴛᴇꜱ ➟ ${rating}*
*▫️📅 𝗥ᴇʟᴇᴀꜱᴇ 𝗗ᴀᴛᴇ ➟ ${year}*
*▫️🎭 𝗚ᴇɴʀᴇꜱ ➟ ${genres}*
*▫️⏳ 𝗗ᴜʀᴀᴛɪᴏɴ ➟ ${runtime}*

*▫️📖 𝗗𝗲𝘀𝗰𝗿𝗶𝗽𝘁𝗶𝗼𝗻 ➟ ${description.substring(0, 300)}${description.length > 300 ? '…' : ''}*

*➟➟➟➟➟➟➟➟➟➟➟➟➟➟➟*
*👥 𝙵𝙾𝙻𝙻𝙾𝚆 𝙾𝚄𝚁 𝙲𝙷𝙰𝙽𝙽𝙴𝙻 ➟* https://whatsapp.com/channel/0029VbCe8YW84OmKiJkDfk3o
*➟➟➟➟➟➟➟➟➟➟➟➟➟➟➟*`;

                const actionButtons = [
                    {
                        buttonId: 'sinhalasub_details_card',
                        buttonText: { displayText: '📑 Details Card' },
                        type: 1
                    },
                    ...finalDownloads.map((dl, i) => ({
                        buttonId: `dl_${i}`,
                        buttonText: {
                            displayText: dl.quality.includes('1080') ? `🔥 ${dl.quality} (${dl.size})` :
                                       dl.quality.includes('720')  ? `⚡ ${dl.quality} (${dl.size})` :
                                       `⬇️ ${dl.quality} (${dl.size})`
                        },
                        type: 1
                    }))
                ];

                const detailMsg = await bot.sendMessage(from, {
                    image: { url: backdrop },
                    caption: fullCaption,
                    buttons: actionButtons,
                    headerType: 4
                }, { quoted: mek });

                // Remove search listener
                bot.ev.off('messages.upsert', movieListener);

                // --- Action listener (Details / Download) ---
                const actionListener = async (actionUpdate) => {
                    try {
                        const actionMsg = actionUpdate.messages[0];
                        if (!actionMsg?.message?.buttonsResponseMessage) return;

                        const contextInfo = actionMsg.message.buttonsResponseMessage.contextInfo ||
                                           actionMsg.message.extendedTextMessage?.contextInfo;
                        if (!contextInfo || contextInfo.stanzaId !== detailMsg.key.id) return;

                        const actionId = actionMsg.message.buttonsResponseMessage.selectedButtonId;

                        if (actionId === 'sinhalasub_details_card') {
                            await bot.sendMessage(from, { react: { text: '📋', key: actionMsg.key } });
                            await bot.sendMessage(from, {
                                image: { url: backdrop },
                                caption: cleanDetailsCaption
                            }, { quoted: actionMsg });
                            return;
                        }

                        if (actionId?.startsWith('dl_')) {
                            const dlIdx = parseInt(actionId.split('_')[1]);
                            const selectedDl = finalDownloads[dlIdx];
                            if (!selectedDl || !selectedDl.url) {
                                return await bot.sendMessage(from, { text: '❌ *Download link not available.*' });
                            }

                            await bot.sendMessage(from, { react: { text: '⬇️', key: actionMsg.key } });

                            let directUrl = selectedDl.url;
                            let thumb = null;
                            try {
                                const thumbRes = await axios.get(poster, { responseType: 'arraybuffer', timeout: 15000 });
                                thumb = await sharp(thumbRes.data).resize(320, 320).jpeg({ quality: 70 }).toBuffer();
                            } catch (e) { console.warn('Thumbnail error:', e.message); }

                            const fileName = `🎬ZEUS-X-MINI🎬${title.replace(/[^\w\s]/g, '')}_${selectedDl.quality}.mkv`;

                            await bot.sendMessage(from, {
                                document: { url: directUrl },
                                mimetype: 'video/mp4',
                                fileName: fileName,
                                caption: `*𝗧ɪᴛʟᴇ : ${title}*\n\n \`[${selectedDl.quality} ${selectedDl.size || 'N/A'}]\`\n\n${wm}`,
                                jpegThumbnail: thumb
                            }, { quoted: actionMsg });

                            await bot.sendMessage(from, { react: { text: '✅', key: actionMsg.key } });
                            bot.ev.off('messages.upsert', actionListener);
                        }
                    } catch (err) {
                        console.error('Action error:', err);
                        await bot.sendMessage(from, { text: `❌ *Failed:* ${err.message}` });
                        bot.ev.off('messages.upsert', actionListener);
                    }
                };

                bot.ev.on('messages.upsert', actionListener);
                setTimeout(() => bot.ev.off('messages.upsert', actionListener), 5 * 60 * 1000);

            } catch (err) {
                console.error('Movie selection error:', err);
                await bot.sendMessage(from, { text: `❌ *Error:* ${err.message}` });
            }
        };

        bot.ev.on('messages.upsert', movieListener);
        setTimeout(() => bot.ev.off('messages.upsert', movieListener), 10 * 60 * 1000);

    } catch (err) {
        console.error('Sinhalasub command error:', err);
        await bot.sendMessage(from, { text: `❌ *Error:* ${err.message}` });
    }
});

module.exports = {};
