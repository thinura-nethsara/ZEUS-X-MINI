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

    // Function to get direct download link from GDrive API
    async function getGDriveDirectLink(gdriveUrl) {
        try {
            // Extract the file ID from the GDrive URL
            let fileId = null;
            // Try to extract from various GDrive URL formats
            const idMatch = gdriveUrl.match(/[?&]id=([^&]+)/) || 
                           gdriveUrl.match(/\/d\/([^\/]+)/) ||
                           gdriveUrl.match(/file\/d\/([^\/]+)/);
            if (idMatch) {
                fileId = idMatch[1];
            }

            // If we have a file ID, use the GDrive API
            if (fileId) {
                const apiUrl = `https://mr-thinuzz-api-build.vercel.app/api/gdrive?url=https://drive.usercontent.google.com/download?id=${fileId}&export=download&authuser=0&apiKey=key_faa62e4037a95cda`;
                const { data } = await axios.get(apiUrl, { timeout: 30000 });
                console.log('🔽 GDRIVE API RESPONSE:', JSON.stringify(data, null, 2));
                
                if (data?.status && data?.result?.download) {
                    return {
                        directUrl: data.result.download,
                        fileName: data.result.fileName || 'file.mp4',
                        fileSize: data.result.fileSize || 'Unknown'
                    };
                }
            }

            // Fallback: try using the original URL
            return { directUrl: gdriveUrl, fileName: 'file.mp4', fileSize: 'Unknown' };
        } catch (err) {
            console.error('GDrive API error:', err);
            return { directUrl: gdriveUrl, fileName: 'file.mp4', fileSize: 'Unknown' };
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

                    // Extract basic info
                    const title = dlData.videoname || selected.title || 'N/A';
                    const description = dlData.desc || 'No description available.';
                    const thumbnail = dlData.thumbnail || 'https://i.ibb.co/cXYtgWPV/Whats-App-Image-2026-06-18-at-7-35-46-PM.png';

                    // Extract links
                    const links = dlData.links || {};
                    const linkEntries = Object.entries(links);

                    // Filter for direct download links (prefer those with "Direct Download" or from thenuxgdrive)
                    const directLinks = linkEntries.filter(([key, value]) => {
                        const isDirect = key.includes('Direct Download') || value.includes('thenuxgdrive.netlify.app') || value.includes('drive.google.com');
                        return isDirect && value && value.startsWith('http');
                    });

                    // If no direct links, fallback to any link that starts with http and is not a redirect to animeclub2.com/links/
                    const fallbackLinks = linkEntries.filter(([key, value]) => {
                        return value && value.startsWith('http') && !value.includes('animeclub2.com/links/');
                    });

                    const finalLinks = directLinks.length ? directLinks : fallbackLinks;

                    if (!finalLinks.length) {
                        const raw = JSON.stringify(dlData, null, 2);
                        const msg = raw.length > 2000 ? raw.substring(0, 1900) + '...' : raw;
                        return await bot.sendMessage(from, {
                            text: `❌ *No download links found.*\n\n*Raw API response:*\n\`\`\`json\n${msg}\n\`\`\``
                        });
                    }

                    // Build the details caption (summary)
                    let detailsCaption = `╭━━━〔 🎌 ANIMECLUB MOVIE 〕━━━⬣

🎬 *Title:* ${title}
📝 *Description:* ${description.substring(0, 150)}${description.length > 150 ? '...' : ''}

📥 *Available Direct Downloads:*\n`;
                    finalLinks.forEach(([key, url], i) => {
                        detailsCaption += `${i+1}. ${key}\n`;
                    });
                    detailsCaption += `\n╰━━━━━━━━━━━━━━━━━━⬣
✨ *⏤͟͟͞͞★❮ ZEUS X MINI 〽️ ANIME ❯⏤͟͟͞͞★*`;

                    // Build action buttons (one for each link + Details Card)
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

                            // Download button
                            if (actionId?.startsWith('animeclub_dl_')) {
                                const dlIndex = parseInt(actionId.split('_')[2]);
                                const selectedLink = finalLinks[dlIndex];
                                if (!selectedLink) return;

                                const [key, url] = selectedLink;
                                await bot.sendMessage(from, { react: { text: '⬇️', key: actionMsg.key } });

                                // Check if this is a Google Drive link
                                let downloadUrl = url;
                                let fileName = `${title}.mp4`;
                                let fileSize = 'Unknown';

                                if (url.includes('drive.google.com')) {
                                    try {
                                        // Get direct download link from GDrive API
                                        const gdriveResult = await getGDriveDirectLink(url);
                                        downloadUrl = gdriveResult.directUrl;
                                        fileName = gdriveResult.fileName;
                                        fileSize = gdriveResult.fileSize;
                                        
                                        // Show progress
                                        await bot.sendMessage(from, { 
                                            text: `⏳ *Processing Google Drive link...*\nFile: ${fileName}\nSize: ${fileSize}` 
                                        }, { quoted: actionMsg });
                                    } catch (err) {
                                        console.error('GDrive processing error:', err);
                                        await bot.sendMessage(from, { 
                                            text: `⚠️ *Could not process GDrive link. Trying direct URL...*` 
                                        }, { quoted: actionMsg });
                                    }
                                }

                                let thumb = null;
                                try {
                                    const thumbRes = await axios.get(thumbnail, { responseType: 'arraybuffer', timeout: 10000 });
                                    thumb = await sharp(thumbRes.data).resize(320, 320).jpeg({ quality: 70 }).toBuffer();
                                } catch (e) { console.warn('Thumbnail error:', e.message); }

                                const safeTitle = title.replace(/[^\w\s]/g, '');
                                const sendFileName = `🎌ZEUS-X-MINI🎌${safeTitle}.mp4`;

                                await bot.sendMessage(from, {
                                    document: { url: downloadUrl },
                                    mimetype: 'video/mp4',
                                    fileName: sendFileName,
                                    caption: `*${title}*\n\n*Link:* ${key}\n*Size:* ${fileSize}\n\n*⏤͟͟͞͞★❮ ZEUS X MINI 〽️ ANIME ❯⏤͟͟͞͞★*`,
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

                // Filter direct links
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

                            if (url.includes('drive.google.com')) {
                                try {
                                    const gdriveResult = await getGDriveDirectLink(url);
                                    downloadUrl = gdriveResult.directUrl;
                                    fileName = gdriveResult.fileName;
                                    fileSize = gdriveResult.fileSize;
                                    await bot.sendMessage(from, { 
                                        text: `⏳ *Processing Google Drive link...*\nFile: ${fileName}\nSize: ${fileSize}` 
                                    }, { quoted: m2 });
                                } catch (err) {
                                    console.error('GDrive processing error:', err);
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

                            await bot.sendMessage(from, {
                                document: { url: downloadUrl },
                                mimetype: 'video/mp4',
                                fileName: sendFileName,
                                caption: `*${title}*\n\n*Link:* ${key}\n*Size:* ${fileSize}\n\n*⏤͟͟͞͞★❮ ZEUS X MINI 〽️ ANIME ❯⏤͟͟͞͞★*`,
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
