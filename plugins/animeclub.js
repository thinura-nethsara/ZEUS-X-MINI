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

        await bot.sendMessage(from, { react: { text: '🔎', key: mek.key } });

        // --- Search ---
        const searchUrl = `https://animeclub-api.udmodz-2ab.workers.dev/search?q=${encodeURIComponent(query)}`;
        const { data: searchData } = await axios.get(searchUrl, { timeout: 30000 });

        console.log('🔍 SEARCH RESPONSE:', JSON.stringify(searchData, null, 2));

        let results = [];
        if (searchData?.data && Array.isArray(searchData.data)) results = searchData.data;
        else if (searchData?.results && Array.isArray(searchData.results)) results = searchData.results;
        else if (Array.isArray(searchData)) results = searchData;
        else if (searchData?.movies && Array.isArray(searchData.movies)) results = searchData.movies;

        if (searchData?.error) return reply(`❌ API Error: ${searchData.error}`);
        if (searchData?.message) return reply(`ℹ️ ${searchData.message}`);

        if (!results || !results.length) {
            return reply(`❎ No anime movies found for *"${query}"*.`);
        }

        results = results.slice(0, 10);

        // ---------- BUTTON MODE ----------
        if (isButtonsOn) {
            const buttons = results.map((r, i) => ({
                buttonId: `animeclub_movie_${i}`,
                buttonText: { displayText: `🎌 ${r.title ? r.title.substring(0, 30) : 'Unknown'}` },
                type: 1
            }));

            const searchMsg = await bot.sendMessage(from, {
                image: { url: 'https://i.ibb.co/cXYtgWPV/Whats-App-Image-2026-06-18-at-7-35-46-PM.png' },
                caption: `🎌 *AnimeClub Search Results*\n\nQuery: ${query}\nSelect an anime:`,
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
                    if (!btnId?.startsWith('animeclub_movie_')) return;

                    const index = parseInt(btnId.split('_')[2]);
                    const selected = results[index];
                    if (!selected) return;

                    await bot.sendMessage(from, { react: { text: '⏳', key: m.key } });

                    const movieUrl = selected.url;
                    if (!movieUrl) throw new Error('Movie URL not found');

                    // --- Fetch download info ---
                    const dlUrl = `https://animeclub-api.udmodz-2ab.workers.dev/dl?url=${encodeURIComponent(movieUrl)}`;
                    const { data: dlData } = await axios.get(dlUrl, { timeout: 30000 });

                    console.log('🔽 DOWNLOAD RESPONSE (FULL):', JSON.stringify(dlData, null, 2));

                    // --- TRY MULTIPLE EXTRACTION PATHS ---
                    let downloadUrl = null;
                    let fileName = 'Anime.mp4';
                    let fileSize = 'Unknown';
                    let expiresIn = 'N/A';

                    // Helper to recursively search for a key
                    function findKey(obj, key) {
                        if (!obj || typeof obj !== 'object') return null;
                        if (obj[key] !== undefined && obj[key] !== null) return obj[key];
                        for (let k in obj) {
                            if (typeof obj[k] === 'object') {
                                const found = findKey(obj[k], key);
                                if (found !== null) return found;
                            }
                        }
                        return null;
                    }

                    // Try to find 'download', 'url', 'link', 'direct_link'
                    downloadUrl = findKey(dlData, 'download') || 
                                  findKey(dlData, 'url') || 
                                  findKey(dlData, 'link') || 
                                  findKey(dlData, 'direct_link');

                    // If we still have nothing, maybe the response itself is a string URL?
                    if (!downloadUrl && typeof dlData === 'string') {
                        downloadUrl = dlData;
                    }

                    // If we still have nothing, maybe it's inside a 'data' field as a string?
                    if (!downloadUrl && dlData?.data && typeof dlData.data === 'string') {
                        downloadUrl = dlData.data;
                    }

                    // Extract other fields
                    fileName = findKey(dlData, 'fileName') || findKey(dlData, 'filename') || 'Anime.mp4';
                    fileSize = findKey(dlData, 'fileSize') || findKey(dlData, 'size') || 'Unknown';
                    expiresIn = findKey(dlData, 'expiresIn') || findKey(dlData, 'expires') || 'N/A';

                    // If we still don't have a download URL, send the raw response to the user for debugging
                    if (!downloadUrl) {
                        const raw = JSON.stringify(dlData, null, 2);
                        // Truncate if too long
                        const msg = raw.length > 2000 ? raw.substring(0, 1900) + '...\n\n(truncated)' : raw;
                        return await bot.sendMessage(from, {
                            text: `❌ *No download link found.*\n\n*Raw API response:*\n\`\`\`json\n${msg}\n\`\`\``
                        });
                    }

                    // --- Build and send details ---
                    const detailsCaption = `╭━━━〔 🎌 ANIMECLUB MOVIE 〕━━━⬣

🎬 *Title:* ${selected.title || 'N/A'}
📁 *File:* ${fileName}
💾 *Size:* ${fileSize}
⏳ *Link expires in:* ${expiresIn}

╰━━━━━━━━━━━━━━━━━━⬣
✨ *⏤͟͟͞͞★❮ ZEUS X MINI 〽️ ANIME ❯⏤͟͟͞͞★*`;

                    const actionButtons = [
                        { buttonId: 'animeclub_download', buttonText: { displayText: '⬇️ Download Anime' }, type: 1 },
                        { buttonId: 'animeclub_details_card', buttonText: { displayText: '📑 Details Card' }, type: 1 }
                    ];

                    const detailMsg = await bot.sendMessage(from, {
                        image: { url: 'https://i.ibb.co/cXYtgWPV/Whats-App-Image-2026-06-18-at-7-35-46-PM.png' },
                        caption: detailsCaption,
                        buttons: actionButtons,
                        headerType: 4
                    }, { quoted: mek });

                    bot.ev.off('messages.upsert', movieListener);

                    // --- Action listener ---
                    const actionListener = async (actionUpdate) => {
                        try {
                            const actionMsg = actionUpdate.messages[0];
                            if (!actionMsg?.message?.buttonsResponseMessage) return;

                            const ctx = actionMsg.message.buttonsResponseMessage.contextInfo ||
                                       actionMsg.message.extendedTextMessage?.contextInfo;
                            if (!ctx || ctx.stanzaId !== detailMsg.key.id) return;

                            const actionId = actionMsg.message.buttonsResponseMessage.selectedButtonId;

                            if (actionId === 'animeclub_details_card') {
                                await bot.sendMessage(from, { react: { text: '📋', key: actionMsg.key } });
                                const clean = `*☘️ 𝗧ɪᴛʟᴇ : ${selected.title || 'N/A'}*

*▫️📁 𝗙𝗶𝗹𝗲𝗻𝗮𝗺𝗲 ➟ ${fileName}*
*▫️💾 𝗦𝗶𝘇𝗲 ➟ ${fileSize}*
*▫️⏳ 𝗘𝘅𝗽𝗶𝗿𝗲𝘀 ➟ ${expiresIn}*

*➟➟➟➟➟➟➟➟➟➟➟➟➟➟➟*
*👥 𝙵𝙾𝙻𝙻𝙾𝚆 𝙾𝚄𝚁 𝙲𝙷𝙰𝙽𝙽𝙴𝙻 ➟* https://whatsapp.com/channel/0029VbCe8YW84OmKiJkDfk3o
*➟➟➟➟➟➟➟➟➟➟➟➟➟➟➟*`;
                                await bot.sendMessage(from, { image: { url: 'https://i.ibb.co/cXYtgWPV/Whats-App-Image-2026-06-18-at-7-35-46-PM.png' }, caption: clean }, { quoted: actionMsg });
                                return;
                            }

                            if (actionId === 'animeclub_download') {
                                await bot.sendMessage(from, { react: { text: '⬇️', key: actionMsg.key } });

                                let thumb = null;
                                try {
                                    const thumbRes = await axios.get('https://i.ibb.co/cXYtgWPV/Whats-App-Image-2026-06-18-at-7-35-46-PM.png', { responseType: 'arraybuffer', timeout: 10000 });
                                    thumb = await sharp(thumbRes.data).resize(320, 320).jpeg({ quality: 70 }).toBuffer();
                                } catch (e) { console.warn('Thumbnail error:', e.message); }

                                const safeTitle = (selected.title || 'Anime').replace(/[^\w\s]/g, '');
                                const sendFileName = `🎌ZEUS-X-MINI🎌${safeTitle}.mp4`;

                                await bot.sendMessage(from, {
                                    document: { url: downloadUrl },
                                    mimetype: 'video/mp4',
                                    fileName: sendFileName,
                                    caption: `*${selected.title || 'Anime Movie'}*\n\n💾 *Size:* ${fileSize}\n\n*⏤͟͟͞͞★❮ ZEUS X MINI 〽️ ANIME ❯⏤͟͟͞͞★*`,
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
            return;
        }

        // ---------- TEXT MODE ----------
        // (same but with text replies - I'm omitting for brevity, but you can copy from previous version)
        // Actually, let's include it to keep the plugin complete.
        let searchList = `🎌 *AnimeClub Search Results*\n\nQuery: ${query}\n\n`;
        let idx = 1;
        results.forEach((r) => {
            const title = r.title || 'Unknown';
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

                const movieUrl = selected.url;
                if (!movieUrl) throw new Error('Movie URL not found');

                const dlUrl = `https://animeclub-api.udmodz-2ab.workers.dev/dl?url=${encodeURIComponent(movieUrl)}`;
                const { data: dlData } = await axios.get(dlUrl, { timeout: 30000 });

                console.log('🔽 DOWNLOAD RESPONSE (FULL):', JSON.stringify(dlData, null, 2));

                let downloadUrl = findKey(dlData, 'download') || findKey(dlData, 'url') || findKey(dlData, 'link') || findKey(dlData, 'direct_link');
                if (!downloadUrl && typeof dlData === 'string') downloadUrl = dlData;
                if (!downloadUrl && dlData?.data && typeof dlData.data === 'string') downloadUrl = dlData.data;

                const fileName = findKey(dlData, 'fileName') || findKey(dlData, 'filename') || 'Anime.mp4';
                const fileSize = findKey(dlData, 'fileSize') || findKey(dlData, 'size') || 'Unknown';
                const expiresIn = findKey(dlData, 'expiresIn') || findKey(dlData, 'expires') || 'N/A';

                if (!downloadUrl) {
                    const raw = JSON.stringify(dlData, null, 2);
                    const msg = raw.length > 2000 ? raw.substring(0, 1900) + '...' : raw;
                    return await bot.sendMessage(from, {
                        text: `❌ *No download link found.*\n\n*Raw API response:*\n\`\`\`json\n${msg}\n\`\`\``
                    });
                }

                const detailCaption = `🎌 *${selected.title || 'N/A'}*

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
                            const clean = `*☘️ 𝗧ɪᴛʟᴇ : ${selected.title || 'N/A'}*

*▫️📁 𝗙𝗶𝗹𝗲𝗻𝗮𝗺𝗲 ➟ ${fileName}*
*▫️💾 𝗦𝗶𝘇𝗲 ➟ ${fileSize}*
*▫️⏳ 𝗘𝘅𝗽𝗶𝗿𝗲𝘀 ➟ ${expiresIn}*

*➟➟➟➟➟➟➟➟➟➟➟➟➟➟➟*
*👥 𝙵𝙾𝙻𝙻𝙾𝚆 𝙾𝚄𝚁 𝙲𝙷𝙰𝙽𝙽𝙴𝙻 ➟* https://whatsapp.com/channel/0029VbCe8YW84OmKiJkDfk3o
*➟➟➟➟➟➟➟➟➟➟➟➟➟➟➟*`;
                            await bot.sendMessage(from, { image: { url: 'https://i.ibb.co/cXYtgWPV/Whats-App-Image-2026-06-18-at-7-35-46-PM.png' }, caption: clean }, { quoted: m2 });
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

                            const safeTitle = (selected.title || 'Anime').replace(/[^\w\s]/g, '');
                            const sendFileName = `🎌ZEUS-X-MINI🎌${safeTitle}.mp4`;

                            await bot.sendMessage(from, {
                                document: { url: downloadUrl },
                                mimetype: 'video/mp4',
                                fileName: sendFileName,
                                caption: `*${selected.title || 'Anime Movie'}*\n\n💾 *Size:* ${fileSize}\n\n*⏤͟͟͞͞★❮ ZEUS X MINI 〽️ ANIME ❯⏤͟͟͞͞★*`,
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
