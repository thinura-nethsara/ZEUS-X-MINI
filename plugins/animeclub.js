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

    // ✅ Ominisave GDrive Direct Download API - returns direct URL
    async function getGDriveDirectLink(gdriveUrl) {
        try {
            const apiUrl = `https://www.ominisave.com/api/gdrive?url=${encodeURIComponent(gdriveUrl)}`;
            const { data } = await axios.get(apiUrl, { timeout: 30000 });
            console.log('🔽 OMINISAVE API RESPONSE:', JSON.stringify(data, null, 2));
            
            if (data?.status === true && data?.result?.download) {
                return {
                    directUrl: data.result.download,
                    fileName: data.result.fileName || 'file.mp4',
                    fileSize: data.result.fileSize || 'Unknown',
                    expiresIn: data.result.expiresIn || 'N/A'
                };
            }
            return { directUrl: gdriveUrl, fileName: 'file.mp4', fileSize: 'Unknown', expiresIn: 'N/A' };
        } catch (err) {
            console.error('❌ Ominisave API error:', err.message);
            return { directUrl: gdriveUrl, fileName: 'file.mp4', fileSize: 'Unknown', expiresIn: 'N/A' };
        }
    }

    // ✅ Function to send file using stream (to avoid small error pages)
    async function sendFileAsStream(from, downloadUrl, fileName, caption, thumbnail, quoted) {
        try {
            // Fetch the file as a stream
            const response = await axios.get(downloadUrl, {
                responseType: 'stream',
                timeout: 120000,
                maxRedirects: 5,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            // Send as document with stream
            await bot.sendMessage(from, {
                document: { stream: response.data },
                mimetype: 'video/mp4',
                fileName: fileName,
                caption: caption,
                jpegThumbnail: thumbnail
            }, { quoted: quoted });

            return true;
        } catch (err) {
            console.error('❌ Stream send failed:', err.message);
            // Fallback: try sending with URL
            try {
                await bot.sendMessage(from, {
                    document: { url: downloadUrl },
                    mimetype: 'video/mp4',
                    fileName: fileName,
                    caption: caption,
                    jpegThumbnail: thumbnail
                }, { quoted: quoted });
                return true;
            } catch (fallbackErr) {
                console.error('❌ Fallback send failed:', fallbackErr.message);
                throw fallbackErr;
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

        // --- 1. SEARCH ---
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

            // --- Movie Selection Listener ---
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

                    // --- 2. FETCH DOWNLOAD INFO ---
                    const dlUrl = `https://animeclub-api.udmodz-2ab.workers.dev/dl?url=${encodeURIComponent(movieUrl)}`;
                    const { data: dlData } = await axios.get(dlUrl, { timeout: 30000 });

                    console.log('🔽 DOWNLOAD RESPONSE:', JSON.stringify(dlData, null, 2));

                    const title = dlData.videoname || selected.title || 'N/A';
                    const description = dlData.desc || 'No description available.';
                    const thumbnail = dlData.thumbnail || 'https://i.ibb.co/cXYtgWPV/Whats-App-Image-2026-06-18-at-7-35-46-PM.png';

                    const links = dlData.links || {};
                    const linkEntries = Object.entries(links);

                    // Filter direct download links
                    const directLinks = linkEntries.filter(([key, value]) => {
                        const isDirect = key.includes('Direct Download') || 
                                         value.includes('thenuxgdrive.netlify.app') || 
                                         value.includes('drive.google.com');
                        return isDirect && value && value.startsWith('http');
                    });

                    const finalLinks = directLinks.length ? directLinks : 
                                       linkEntries.filter(([key, value]) => value && value.startsWith('http') && !value.includes('animeclub2.com/links/'));

                    if (!finalLinks.length) {
                        const raw = JSON.stringify(dlData, null, 2);
                        const msg = raw.length > 2000 ? raw.substring(0, 1900) + '...' : raw;
                        return await bot.sendMessage(from, {
                            text: `❌ *No download links found.*\n\n*Raw API response:*\n\`\`\`json\n${msg}\n\`\`\``
                        });
                    }

                    // Build details caption with all links
                    let detailsCaption = `╭━━━〔 🎌 ANIMECLUB MOVIE 〕━━━⬣

🎬 *Title:* ${title}
📝 *Description:* ${description.substring(0, 150)}${description.length > 150 ? '...' : ''}

📥 *Available Direct Downloads:*\n`;
                    finalLinks.forEach(([key, url], i) => {
                        detailsCaption += `${i+1}. ${key}\n`;
                    });
                    detailsCaption += `\n╰━━━━━━━━━━━━━━━━━━⬣
✨ *⏤͟͟͞͞★❮ ZEUS X MINI 〽️ ANIME ❯⏤͟͟͞͞★*`;

                    // Build action buttons for each link + Details Card
                    const actionButtons = finalLinks.map(([key, url], i) => ({
                        buttonId: `animeclub_dl_${i}`,
                        buttonText: { displayText: `⬇️ ${key.substring(0, 25)}` },
                        type: 1
                    }));
                    actionButtons.push({
                        buttonId: 'animeclub_details_card',
                        buttonText: { displayText: '📑 Full Details' },
                        type: 1
                    });

                    const detailMsg = await bot.sendMessage(from, {
                        image: { url: thumbnail },
                        caption: detailsCaption,
                        buttons: actionButtons,
                        headerType: 4
                    }, { quoted: mek });

                    bot.ev.off('messages.upsert', movieListener);

                    // --- 3. ACTION LISTENER (Download / Details) ---
                    const actionListener = async (actionUpdate) => {
                        try {
                            const actionMsg = actionUpdate.messages[0];
                            if (!actionMsg?.message?.buttonsResponseMessage) return;

                            const ctx = actionMsg.message.buttonsResponseMessage.contextInfo ||
                                       actionMsg.message.extendedTextMessage?.contextInfo;
                            if (!ctx || ctx.stanzaId !== detailMsg.key.id) return;

                            const actionId = actionMsg.message.buttonsResponseMessage.selectedButtonId;

                            // --- Full Details Card ---
                            if (actionId === 'animeclub_details_card') {
                                await bot.sendMessage(from, { react: { text: '📋', key: actionMsg.key } });
                                let fullDetails = `*☘️ 𝗧ɪᴛʟᴇ : ${title}*\n\n`;
                                fullDetails += `*📖 𝗗𝗲𝘀𝗰𝗿𝗶𝗽𝘁𝗶𝗼𝗻:*\n${description}\n\n`;
                                fullDetails += `*📥 𝗔𝗹𝗹 𝗔𝘃𝗮𝗶𝗹𝗮𝗯𝗹𝗲 𝗟𝗶𝗻𝗸𝘀:*\n`;
                                linkEntries.forEach(([key, url]) => {
                                    fullDetails += `▫️ ${key}: ${url}\n`;
                                });
                                fullDetails += `\n*➟➟➟➟➟➟➟➟➟➟➟➟➟➟➟*\n`;
                                fullDetails += `*👥 𝙵𝙾𝙻𝙻𝙾𝚆 𝙾𝚄𝚁 𝙲𝙷𝙰𝙽𝙽𝙴𝙻 ➟* https://whatsapp.com/channel/0029VbCe8YW84OmKiJkDfk3o\n`;
                                fullDetails += `*➟➟➟➟➟➟➟➟➟➟➟➟➟➟➟*`;
                                if (fullDetails.length > 4000) fullDetails = fullDetails.substring(0, 3950) + '\n...(truncated)';
                                await bot.sendMessage(from, {
                                    image: { url: thumbnail },
                                    caption: fullDetails
                                }, { quoted: actionMsg });
                                return;
                            }

                            // --- Download Button ---
                            if (actionId?.startsWith('animeclub_dl_')) {
                                const dlIndex = parseInt(actionId.split('_')[2]);
                                const selectedLink = finalLinks[dlIndex];
                                if (!selectedLink) return;

                                const [key, url] = selectedLink;
                                await bot.sendMessage(from, { react: { text: '⬇️', key: actionMsg.key } });

                                // ✅ Check if it's a Google Drive link
                                let downloadUrl = url;
                                let fileName = `${title}.mp4`;
                                let fileSize = 'Unknown';
                                let expiresIn = 'N/A';

                                if (url.includes('drive.google.com')) {
                                    try {
                                        // ✅ Call Ominisave GDrive Direct Download API
                                        const gdriveResult = await getGDriveDirectLink(url);
                                        downloadUrl = gdriveResult.directUrl;
                                        fileName = gdriveResult.fileName;
                                        fileSize = gdriveResult.fileSize;
                                        expiresIn = gdriveResult.expiresIn;
                                        
                                        await bot.sendMessage(from, { 
                                            text: `⏳ *Processing Google Drive link via Ominisave...*\n📁 *File:* ${fileName}\n💾 *Size:* ${fileSize}\n⏳ *Expires:* ${expiresIn}` 
                                        }, { quoted: actionMsg });
                                    } catch (err) {
                                        console.error('Ominisave API error:', err);
                                        await bot.sendMessage(from, { 
                                            text: `⚠️ *Could not process GDrive link. Trying direct URL...*` 
                                        }, { quoted: actionMsg });
                                    }
                                }

                                // Generate thumbnail
                                let thumb = null;
                                try {
                                    const thumbRes = await axios.get(thumbnail, { responseType: 'arraybuffer', timeout: 10000 });
                                    thumb = await sharp(thumbRes.data).resize(320, 320).jpeg({ quality: 70 }).toBuffer();
                                } catch (e) { console.warn('Thumbnail error:', e.message); }

                                const safeTitle = title.replace(/[^\w\s]/g, '');
                                const sendFileName = `🎌ZEUS-X-MINI🎌${safeTitle}.mp4`;
                                const caption = `*${title}*\n\n*Link:* ${key}\n*Size:* ${fileSize}\n*Expires:* ${expiresIn}\n\n*⏤͟͟͞͞★❮ ZEUS X MINI 〽️ ANIME ❯⏤͟͟͞͞★*`;

                                // ✅ Send file using stream (to avoid 2.3KB error pages)
                                try {
                                    await sendFileAsStream(from, downloadUrl, sendFileName, caption, thumb, actionMsg);
                                    await bot.sendMessage(from, { react: { text: '✅', key: actionMsg.key } });
                                } catch (streamErr) {
                                    console.error('Stream send error:', streamErr);
                                    // Fallback: send with URL
                                    await bot.sendMessage(from, {
                                        document: { url: downloadUrl },
                                        mimetype: 'video/mp4',
                                        fileName: sendFileName,
                                        caption: caption,
                                        jpegThumbnail: thumb
                                    }, { quoted: actionMsg });
                                    await bot.sendMessage(from, { react: { text: '✅', key: actionMsg.key } });
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

        // ---------- TEXT MODE (Buttons OFF) ----------
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

                const title = dlData.videoname || selected.title || 'N/A';
                const description = dlData.desc || 'No description available.';
                const thumbnail = dlData.thumbnail || 'https://i.ibb.co/cXYtgWPV/Whats-App-Image-2026-06-18-at-7-35-46-PM.png';

                const links = dlData.links || {};
                const linkEntries = Object.entries(links);

                const directLinks = linkEntries.filter(([key, value]) => {
                    return (key.includes('Direct Download') || value.includes('thenuxgdrive.netlify.app') || value.includes('drive.google.com')) && value && value.startsWith('http');
                });
                const finalLinks = directLinks.length ? directLinks : linkEntries.filter(([key, value]) => value && value.startsWith('http') && !value.includes('animeclub2.com/links/'));

                if (!finalLinks.length) {
                    const raw = JSON.stringify(dlData, null, 2);
                    const msg = raw.length > 2000 ? raw.substring(0, 1900) + '...' : raw;
                    return await bot.sendMessage(from, {
                        text: `❌ *No download links found.*\n\n*Raw API response:*\n\`\`\`json\n${msg}\n\`\`\``
                    });
                }

                let detailCaption = `🎌 *${title}*\n\n📝 ${description.substring(0, 200)}${description.length > 200 ? '...' : ''}\n\n`;
                detailCaption += `*Select a download link by replying with the number:*\n\n`;
                finalLinks.forEach(([key, url], i) => {
                    detailCaption += `${i+1}️⃣ ${key}\n`;
                });
                detailCaption += `\nOr reply with "details" to see all links and full description.`;

                const detailMsg = await bot.sendMessage(from, {
                    image: { url: thumbnail },
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

                        const choice = body2.trim().toLowerCase();
                        if (choice === 'details' || choice === 'details card') {
                            await bot.sendMessage(from, { react: { text: '📋', key: m2.key } });
                            let fullDetails = `*☘️ 𝗧ɪᴛʟᴇ : ${title}*\n\n`;
                            fullDetails += `*📖 𝗗𝗲𝘀𝗰𝗿𝗶𝗽𝘁𝗶𝗼𝗻:*\n${description}\n\n`;
                            fullDetails += `*📥 𝗔𝗹𝗹 𝗔𝘃𝗮𝗶𝗹𝗮𝗯𝗹𝗲 𝗟𝗶𝗻𝗸𝘀:*\n`;
                            linkEntries.forEach(([key, url]) => {
                                fullDetails += `▫️ ${key}: ${url}\n`;
                            });
                            fullDetails += `\n*➟➟➟➟➟➟➟➟➟➟➟➟➟➟➟*\n`;
                            fullDetails += `*👥 𝙵𝙾𝙻𝙻𝙾𝚆 𝙾𝚄𝚁 𝙲𝙷𝙰𝙽𝙽𝙴𝙻 ➟* https://whatsapp.com/channel/0029VbCe8YW84OmKiJkDfk3o\n`;
                            fullDetails += `*➟➟➟➟➟➟➟➟➟➟➟➟➟➟➟*`;
                            if (fullDetails.length > 4000) fullDetails = fullDetails.substring(0, 3950) + '\n...(truncated)';
                            await bot.sendMessage(from, {
                                image: { url: thumbnail },
                                caption: fullDetails
                            }, { quoted: m2 });
                            bot.ev.off('messages.upsert', actionTextListener);
                            return;
                        }

                        const dlIndex = parseInt(choice);
                        if (!isNaN(dlIndex) && dlIndex >= 1 && dlIndex <= finalLinks.length) {
                            const [key, url] = finalLinks[dlIndex - 1];
                            await bot.sendMessage(from, { react: { text: '⬇️', key: m2.key } });

                            let downloadUrl = url;
                            let fileName = `${title}.mp4`;
                            let fileSize = 'Unknown';
                            let expiresIn = 'N/A';

                            if (url.includes('drive.google.com')) {
                                try {
                                    const gdriveResult = await getGDriveDirectLink(url);
                                    downloadUrl = gdriveResult.directUrl;
                                    fileName = gdriveResult.fileName;
                                    fileSize = gdriveResult.fileSize;
                                    expiresIn = gdriveResult.expiresIn;
                                    await bot.sendMessage(from, { 
                                        text: `⏳ *Processing Google Drive link via Ominisave...*\n📁 *File:* ${fileName}\n💾 *Size:* ${fileSize}\n⏳ *Expires:* ${expiresIn}` 
                                    }, { quoted: m2 });
                                } catch (err) {
                                    console.error('Ominisave API error:', err);
                                    await bot.sendMessage(from, { 
                                        text: `⚠️ *Could not process GDrive link. Trying direct URL...*` 
                                    }, { quoted: m2 });
                                }
                            }

                            let thumb = null;
                            try {
                                const thumbRes = await axios.get(thumbnail, { responseType: 'arraybuffer', timeout: 10000 });
                                thumb = await sharp(thumbRes.data).resize(320, 320).jpeg({ quality: 70 }).toBuffer();
                            } catch (e) { console.warn('Thumbnail error:', e.message); }

                            const safeTitle = title.replace(/[^\w\s]/g, '');
                            const sendFileName = `🎌ZEUS-X-MINI🎌${safeTitle}.mp4`;
                            const caption = `*${title}*\n\n*Link:* ${key}\n*Size:* ${fileSize}\n*Expires:* ${expiresIn}\n\n*⏤͟͟͞͞★❮ ZEUS X MINI 〽️ ANIME ❯⏤͟͟͞͞★*`;

                            try {
                                await sendFileAsStream(from, downloadUrl, sendFileName, caption, thumb, m2);
                                await bot.sendMessage(from, { react: { text: '✅', key: m2.key } });
                            } catch (streamErr) {
                                console.error('Stream send error:', streamErr);
                                await bot.sendMessage(from, {
                                    document: { url: downloadUrl },
                                    mimetype: 'video/mp4',
                                    fileName: sendFileName,
                                    caption: caption,
                                    jpegThumbnail: thumb
                                }, { quoted: m2 });
                                await bot.sendMessage(from, { react: { text: '✅', key: m2.key } });
                            }

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
