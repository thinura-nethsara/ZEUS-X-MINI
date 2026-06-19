const { cmd } = require("../command");
const axios = require("axios");
const sharp = require("sharp");
const config = require("../config");

cmd({
    pattern: "animeclub",
    alias: ["ac", "anime"],
    react: "🎌",
    desc: "Search and download anime movies from AnimeClub.",
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
            return reply("🎌 *AnimeClub Downloader*\n\nExample: .animeclub kaguya");
        }

        const settings = userSettings || global.CURRENT_BOT_SETTINGS || {};
        const isButtonsOn = settings.buttons === 'true';
        const botName = settings.botName || config.DEFAULT_BOT_NAME || "ZEUS-X-MINI";

        // Send initial reaction
        await bot.sendMessage(from, { react: { text: '🔎', key: mek.key } });

        // --- Search for anime movies ---
        const searchUrl = `https://animeclub-api.udmodz-2ab.workers.dev/search?q=${encodeURIComponent(query)}`;
        const { data: searchData } = await axios.get(searchUrl, { timeout: 30000 });

        let results = searchData?.data || [];
        if (!results || !results.length) {
            return reply("❎ No anime movies found.");
        }
        results = results.slice(0, 10);

        // ---------- BUTTON MODE ----------
        if (isButtonsOn) {
            const buttons = results.map((r, i) => ({
                buttonId: `animeclub_movie_${i}`,
                buttonText: { displayText: `🎌 ${r.title.substring(0, 30)}` },
                type: 1
            }));

            const searchMsg = await bot.sendMessage(from, {
                image: { url: 'https://i.ibb.co/cXYtgWPV/Whats-App-Image-2026-06-18-at-7-35-46-PM.png' },
                caption: `🎌 *AnimeClub Search Results*\n\nQuery: ${query}\nSelect an anime:`,
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
                    if (!btnId?.startsWith('animeclub_movie_')) return;

                    const index = parseInt(btnId.split('_')[2]);
                    const selected = results[index];
                    if (!selected) return;

                    await bot.sendMessage(from, { react: { text: '⏳', key: m.key } });

                    const movieUrl = selected.url;
                    if (!movieUrl) throw new Error('Movie URL not found');

                    // Fetch download info
                    const dlUrl = `https://animeclub-api.udmodz-2ab.workers.dev/dl?url=${encodeURIComponent(movieUrl)}`;
                    const { data: dlData } = await axios.get(dlUrl, { timeout: 30000 });

                    if (!dlData?.status || !dlData?.result) {
                        return await bot.sendMessage(from, { text: '❎ Failed to fetch download info.' });
                    }

                    const result = dlData.result;
                    const fileName = result.fileName || 'Anime.mp4';
                    const fileSize = result.fileSize || 'Unknown';
                    const downloadUrl = result.download;
                    const expiresIn = result.expiresIn || 'N/A';

                    if (!downloadUrl) {
                        return await bot.sendMessage(from, { text: '❎ No download link available.' });
                    }

                    // Build details caption
                    const detailsCaption = `╭━━━〔 🎌 ANIMECLUB MOVIE 〕━━━⬣

🎬 *Title:* ${selected.title}
📁 *File:* ${fileName}
💾 *Size:* ${fileSize}
⏳ *Link expires in:* ${expiresIn}

╰━━━━━━━━━━━━━━━━━━⬣
✨ *⏤͟͟͞͞★❮ ZEUS X MINI 〽️ ANIME ❯⏤͟͟͞͞★*`;

                    const actionButtons = [
                        {
                            buttonId: 'animeclub_download',
                            buttonText: { displayText: '⬇️ Download Anime' },
                            type: 1
                        },
                        {
                            buttonId: 'animeclub_details_card',
                            buttonText: { displayText: '📑 Details Card' },
                            type: 1
                        }
                    ];

                    const detailMsg = await bot.sendMessage(from, {
                        image: { url: 'https://i.ibb.co/cXYtgWPV/Whats-App-Image-2026-06-18-at-7-35-46-PM.png' },
                        caption: detailsCaption,
                        buttons: actionButtons,
                        headerType: 4
                    }, { quoted: mek });

                    // Remove search listener
                    bot.ev.off('messages.upsert', movieListener);

                    // --- Action listener ---
                    const actionListener = async (actionUpdate) => {
                        try {
                            const actionMsg = actionUpdate.messages[0];
                            if (!actionMsg?.message?.buttonsResponseMessage) return;

                            const contextInfo = actionMsg.message.buttonsResponseMessage.contextInfo ||
                                               actionMsg.message.extendedTextMessage?.contextInfo;
                            if (!contextInfo || contextInfo.stanzaId !== detailMsg.key.id) return;

                            const actionId = actionMsg.message.buttonsResponseMessage.selectedButtonId;

                            if (actionId === 'animeclub_details_card') {
                                await bot.sendMessage(from, { react: { text: '📋', key: actionMsg.key } });
                                const cleanDetails = `*☘️ 𝗧ɪᴛʟᴇ : ${selected.title}*

*▫️📁 𝗙𝗶𝗹𝗲𝗻𝗮𝗺𝗲 ➟ ${fileName}*
*▫️💾 𝗦𝗶𝘇𝗲 ➟ ${fileSize}*
*▫️⏳ 𝗘𝘅𝗽𝗶𝗿𝗲𝘀 ➟ ${expiresIn}*

*➟➟➟➟➟➟➟➟➟➟➟➟➟➟➟*
*👥 𝙵𝙾𝙻𝙻𝙾𝚆 𝙾𝚄𝚁 𝙲𝙷𝙰𝙽𝙽𝙴𝙻 ➟* https://whatsapp.com/channel/0029VbCe8YW84OmKiJkDfk3o
*➟➟➟➟➟➟➟➟➟➟➟➟➟➟➟*`;
                                await bot.sendMessage(from, {
                                    image: { url: 'https://i.ibb.co/cXYtgWPV/Whats-App-Image-2026-06-18-at-7-35-46-PM.png' },
                                    caption: cleanDetails
                                }, { quoted: actionMsg });
                                return;
                            }

                            if (actionId === 'animeclub_download') {
                                await bot.sendMessage(from, { react: { text: '⬇️', key: actionMsg.key } });

                                // Send the video as document with thumbnail
                                let thumb = null;
                                try {
                                    // Use a generic thumbnail or fetch from poster if available
                                    const thumbRes = await axios.get('https://i.ibb.co/cXYtgWPV/Whats-App-Image-2026-06-18-at-7-35-46-PM.png', { responseType: 'arraybuffer', timeout: 10000 });
                                    thumb = await sharp(thumbRes.data).resize(320, 320).jpeg({ quality: 70 }).toBuffer();
                                } catch (e) { console.warn('Thumbnail error:', e.message); }

                                const safeTitle = selected.title.replace(/[^\w\s]/g, '');
                                const sendFileName = `🎌ZEUS-X-MINI🎌${safeTitle}.mp4`;

                                await bot.sendMessage(from, {
                                    document: { url: downloadUrl },
                                    mimetype: 'video/mp4',
                                    fileName: sendFileName,
                                    caption: `*${selected.title}*\n\n💾 *Size:* ${fileSize}\n\n*⏤͟͟͞͞★❮ ZEUS X MINI 〽️ ANIME ❯⏤͟͟͞͞★*`,
                                    jpegThumbnail: thumb
                                }, { quoted: actionMsg });

                                await bot.sendMessage(from, { react: { text: '✅', key: actionMsg.key } });
                                bot.ev.off('messages.upsert', actionListener);
                            }
                        } catch (err) {
                            console.error('Action error:', err);
                            await bot.sendMessage(from, { text: `❌ Failed: ${err.message}` });
                            bot.ev.off('messages.upsert', actionListener);
                        }
                    };

                    bot.ev.on('messages.upsert', actionListener);
                    setTimeout(() => bot.ev.off('messages.upsert', actionListener), 5 * 60 * 1000);

                } catch (err) {
                    console.error('Movie selection error:', err);
                    await bot.sendMessage(from, { text: `❌ Error: ${err.message}` });
                }
            };

            bot.ev.on('messages.upsert', movieListener);
            setTimeout(() => bot.ev.off('messages.upsert', movieListener), 10 * 60 * 1000);
            return; // End of button mode
        }

        // ---------- TEXT MODE (Buttons OFF) ----------
        let searchList = `🎌 *AnimeClub Search Results*\n\nQuery: ${query}\n\n`;
        let idx = 1;
        results.forEach((r) => {
            searchList += `${idx++}️⃣ ${r.title}\n`;
        });
        searchList += `\nReply with the number (1-${results.length}).`;

        const searchMsg = await bot.sendMessage(from, {
            image: { url: 'https://i.ibb.co/cXYtgWPV/Whats-App-Image-2026-06-18-at-7-35-46-PM.png' },
            caption: searchList
        }, { quoted: mek });

        // --- Text listener for movie selection ---
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

                const movieUrl = selected.url;
                if (!movieUrl) throw new Error('Movie URL not found');

                // Fetch download info
                const dlUrl = `https://animeclub-api.udmodz-2ab.workers.dev/dl?url=${encodeURIComponent(movieUrl)}`;
                const { data: dlData } = await axios.get(dlUrl, { timeout: 30000 });

                if (!dlData?.status || !dlData?.result) {
                    return await bot.sendMessage(from, { text: '❎ Failed to fetch download info.' });
                }

                const result = dlData.result;
                const fileName = result.fileName || 'Anime.mp4';
                const fileSize = result.fileSize || 'Unknown';
                const downloadUrl = result.download;
                const expiresIn = result.expiresIn || 'N/A';

                if (!downloadUrl) {
                    return await bot.sendMessage(from, { text: '❎ No download link available.' });
                }

                const detailCaption = `🎌 *${selected.title}*

📁 *File:* ${fileName}
💾 *Size:* ${fileSize}
⏳ *Expires:* ${expiresIn}

*Reply with:*
1️⃣ Download Anime
2️⃣ Details Card`;

                const detailMsg = await bot.sendMessage(from, {
                    image: { url: 'https://i.ibb.co/cXYtgWPV/Whats-App-Image-2026-06-18-at-7-35-46-PM.png' },
                    caption: detailCaption
                }, { quoted: mek });

                bot.ev.off('messages.upsert', movieTextListener);

                // --- Text listener for action ---
                const actionTextListener = async (update2) => {
                    try {
                        const m2 = update2.messages[0];
                        if (!m2?.message) return;
                        const body2 = m2.message.conversation || m2.message.extendedTextMessage?.text;
                        if (!body2) return;

                        const ctx2 = m2.message.extendedTextMessage?.contextInfo;
                        if (!ctx2 || ctx2.stanzaId !== detailMsg.key.id) return;

                        const choice = body2.trim();
                        if (choice === '2' || choice.toLowerCase() === 'details card') {
                            await bot.sendMessage(from, { react: { text: '📋', key: m2.key } });
                            const cleanDetails = `*☘️ 𝗧ɪᴛʟᴇ : ${selected.title}*

*▫️📁 𝗙𝗶𝗹𝗲𝗻𝗮𝗺𝗲 ➟ ${fileName}*
*▫️💾 𝗦𝗶𝘇𝗲 ➟ ${fileSize}*
*▫️⏳ 𝗘𝘅𝗽𝗶𝗿𝗲𝘀 ➟ ${expiresIn}*

*➟➟➟➟➟➟➟➟➟➟➟➟➟➟➟*
*👥 𝙵𝙾𝙻𝙻𝙾𝚆 𝙾𝚄𝚁 𝙲𝙷𝙰𝙽𝙽𝙴𝙻 ➟* https://whatsapp.com/channel/0029VbCe8YW84OmKiJkDfk3o
*➟➟➟➟➟➟➟➟➟➟➟➟➟➟➟*`;
                            await bot.sendMessage(from, {
                                image: { url: 'https://i.ibb.co/cXYtgWPV/Whats-App-Image-2026-06-18-at-7-35-46-PM.png' },
                                caption: cleanDetails
                            }, { quoted: m2 });
                            bot.ev.off('messages.upsert', actionTextListener);
                            return;
                        }

                        if (choice === '1' || choice.toLowerCase() === 'download') {
                            await bot.sendMessage(from, { react: { text: '⬇️', key: m2.key } });

                            let thumb = null;
                            try {
                                const thumbRes = await axios.get('https://i.ibb.co/cXYtgWPV/Whats-App-Image-2026-06-18-at-7-35-46-PM.png', { responseType: 'arraybuffer', timeout: 10000 });
                                thumb = await sharp(thumbRes.data).resize(320, 320).jpeg({ quality: 70 }).toBuffer();
                            } catch (e) { console.warn('Thumbnail error:', e.message); }

                            const safeTitle = selected.title.replace(/[^\w\s]/g, '');
                            const sendFileName = `🎌ZEUS-X-MINI🎌${safeTitle}.mp4`;

                            await bot.sendMessage(from, {
                                document: { url: downloadUrl },
                                mimetype: 'video/mp4',
                                fileName: sendFileName,
                                caption: `*${selected.title}*\n\n💾 *Size:* ${fileSize}\n\n*⏤͟͟͞͞★❮ ZEUS X MINI 〽️ ANIME ❯⏤͟͟͞͞★*`,
                                jpegThumbnail: thumb
                            }, { quoted: m2 });

                            await bot.sendMessage(from, { react: { text: '✅', key: m2.key } });
                            bot.ev.off('messages.upsert', actionTextListener);
                        }
                    } catch (err) {
                        console.error('Action text error:', err);
                        await bot.sendMessage(from, { text: `❌ Failed: ${err.message}` });
                        bot.ev.off('messages.upsert', actionTextListener);
                    }
                };

                bot.ev.on('messages.upsert', actionTextListener);
                setTimeout(() => bot.ev.off('messages.upsert', actionTextListener), 5 * 60 * 1000);

            } catch (err) {
                console.error('Movie text selection error:', err);
                await bot.sendMessage(from, { text: `❌ Error: ${err.message}` });
            }
        };

        bot.ev.on('messages.upsert', movieTextListener);
        setTimeout(() => bot.ev.off('messages.upsert', movieTextListener), 10 * 60 * 1000);

    } catch (err) {
        console.error('Command error:', err);
        await bot.sendMessage(from, { text: `❌ ERROR: ${err.message}` });
    }
});

module.exports = {};
