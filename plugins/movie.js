const config = require('../config');
const { cmd } = require('../command');
const axios = require('axios');
const fetch = require('node-fetch');

// ================ MAIN MOVIE COMMAND ================
cmd({
    pattern: "mv",
    react: "🔎",
    alias: ["movie", "film", "cinema"],
    desc: "Search movies from multiple sources",
    category: "movie",
    filename: __filename
},
async (conn, mek, m, { from, prefix, q, reply, userSettings }) => {
    try {
        if (!q) return await reply('*Enter movie name..🎬*');

        // ===== BUTTON CHECK =====
        const settings = userSettings || global.CURRENT_BOT_SETTINGS || {};
        const isButtonsOn = settings.buttons === 'true';
        const botName = settings.botName || config.DEFAULT_BOT_NAME || "ZEUS-X-MINI";

        const sources = [
            { name: "CINESUBZ", cmd: "cine" },
            { name: "SINHALASUB", cmd: "sinhalasub" },
            { name: "SUBLK", cmd: "sublk" }
        ];

        const caption = `_*${botName} MOVIE SYSTEM 🎬*_\n\n*\`🔍Input :\`* ${q}\n\n_*🌟 Select your preferred movie download site*_`;

        // ===== BUTTONS ON =====
        if (isButtonsOn) {
            const buttons = sources.map(src => ({
                buttonId: prefix + src.cmd + ' ' + q,
                buttonText: { displayText: `🎬 ${src.name}` },
                type: 1
            }));

            buttons.push({
                buttonId: prefix + 'menu',
                buttonText: { displayText: '🔙 Menu' },
                type: 1
            });

            await conn.sendMessage(from, {
                image: { url: 'https://i.ibb.co/cXYtgWPV/Whats-App-Image-2026-06-18-at-7-35-46-PM.png' },
                caption: caption,
                footer: config.FOOTER || `© ${botName}`,
                buttons: buttons,
                headerType: 4
            }, { quoted: mek });
        } 
        // ===== BUTTONS OFF (Text Mode) =====
        else {
            let textMsg = caption + '\n\n*Reply with number:*\n';
            sources.forEach((src, i) => {
                textMsg += `\n${i+1}. ${src.name} (${prefix}${src.cmd} ${q})`;
            });
            textMsg += `\n\n> _𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 ${botName} </>_`;

            await conn.sendMessage(from, {
                image: { url: 'https://i.ibb.co/cXYtgWPV/Whats-App-Image-2026-06-18-at-7-35-46-PM.png' },
                caption: textMsg
            }, { quoted: mek });
        }

    } catch (e) {
        console.error("Movie Error:", e);
        reply('❌ Error occurred');
    }
});

// ================ CINESUBZ SEARCH ================
cmd({
    pattern: "cine",
    react: '🔎',
    category: "movie",
    alias: ["cz"],
    desc: "cinesubz.co movie search",
    use: ".cine movie_name",
    filename: __filename
},
async (conn, mek, m, { from, prefix, q, reply, userSettings }) => {
    try {
        if (!q) return await reply('*Please give me a movie name 🎬*');

        // ===== BUTTON CHECK =====
        const settings = userSettings || global.CURRENT_BOT_SETTINGS || {};
        const isButtonsOn = settings.buttons === 'true';

        await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });

        const apiUrl = `https://mr-thinuzz-api-build.vercel.app/api/cinesubz/search?query=${encodeURIComponent(q)}&apiKey=key_faa62e4037a95cda`;
        const response = await axios.get(apiUrl);
        const result = response.data;

        if (!result.status || !result.data) {
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return await conn.sendMessage(from, { text: '*No results found ❌*' }, { quoted: mek });
        }

        let results = result.data.all || result.data.movies || [];
        
        if (results.length === 0) {
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return await conn.sendMessage(from, { text: '*No results found ❌*' }, { quoted: mek });
        }

        const totalResults = result.total_results || results.length;
        const caption = `*🎬 CINESUBZ RESULTS*\n\n*🔍 Search:* ${q}\n*📊 Found:* ${totalResults}\n\n*Select a movie below:*`;

        // ===== BUTTONS ON =====
        if (isButtonsOn) {
            let buttons = [];

            results.slice(0, 10).forEach((item) => {
                let rawTitle = item.title || item.Title || 'Unknown Movie';
                let cleanTitle = rawTitle;
                if (typeof rawTitle === 'string') {
                    cleanTitle = rawTitle
                        .replace("Sinhala Subtitles | සිංහල උපසිරැසි සමඟ", "")
                        .replace("Sinhala Subtitle | සිංහල උපසිරැසි සමඟ", "")
                        .replace("Sinhala Subtitles", "")
                        .trim();
                }
                
                const typeBadge = item.type === "TV" ? "📺" : "🎬";
                const year = item.year || item.Year || '';
                const link = item.link || item.Link || '';
                
                if (!link) return;
                
                let displayTitle = cleanTitle.substring(0, 28);
                if (cleanTitle.length > 28) displayTitle += '...';
                if (year) displayTitle += ` (${year})`;
                
                buttons.push({
                    buttonId: `${prefix}cinedl2 ${link}`,
                    buttonText: { displayText: `${typeBadge} ${displayTitle}` },
                    type: 1
                });
            });

            if (buttons.length === 0) {
                await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
                return await conn.sendMessage(from, { text: '*No valid results found ❌*' }, { quoted: mek });
            }

            buttons.push({
                buttonId: prefix + 'mv ' + q,
                buttonText: { displayText: '🔙 Back' },
                type: 1
            });

            await conn.sendMessage(from, {
                image: { url: 'https://i.ibb.co/NsV2XcK/movie-poster.png' },
                caption: caption,
                footer: config.FOOTER,
                buttons: buttons,
                headerType: 4
            }, { quoted: mek });
        } 
        // ===== BUTTONS OFF (Text Mode) =====
        else {
            let textMsg = caption + '\n\n*Reply with number:*\n';
            
            results.slice(0, 10).forEach((item, index) => {
                let rawTitle = item.title || item.Title || 'Unknown Movie';
                let cleanTitle = rawTitle;
                if (typeof rawTitle === 'string') {
                    cleanTitle = rawTitle
                        .replace("Sinhala Subtitles | සිංහල උපසිරැසි සමඟ", "")
                        .replace("Sinhala Subtitle | සිංහල උපසිරැසි සමඟ", "")
                        .trim();
                }
                
                const year = item.year || item.Year || '';
                const link = item.link || item.Link || '';
                
                if (!link) return;
                
                textMsg += `\n${index+1}. ${cleanTitle}${year ? ` (${year})` : ''}`;
            });
            
            textMsg += `\n\n> _𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 ZEUS-X-MINI </>_`;

            // Send text mode message
            const sentMsg = await conn.sendMessage(from, {
                image: { url: 'https://i.ibb.co/NsV2XcK/movie-poster.png' },
                caption: textMsg
            }, { quoted: mek });

            // Add text listener for replies
            const listener = async (update) => {
                try {
                    const msgUpdate = update.messages[0];
                    if (!msgUpdate || !msgUpdate.message) return;

                    const body = msgUpdate.message.conversation || 
                               msgUpdate.message.extendedTextMessage?.text;

                    const contextInfo = msgUpdate.message.extendedTextMessage?.contextInfo;
                    const isReplyToBot = contextInfo?.stanzaId === sentMsg.key.id;

                    if (isReplyToBot && body && !isNaN(body)) {
                        const index = parseInt(body) - 1;
                        const items = results.slice(0, 10);
                        if (index >= 0 && index < items.length) {
                            const link = items[index].link || items[index].Link || '';
                            if (link) {
                                bot.ev.off('messages.upsert', listener);
                                await conn.sendMessage(from, { react: { text: '⏳', key: msgUpdate.key } });
                                // Process the selected movie
                                await conn.sendMessage(from, {
                                    text: `*Processing:* ${prefix}cinedl2 ${link}`
                                }, { quoted: msgUpdate });
                                // Call the command
                                await conn.ev.emit('messages.upsert', {
                                    messages: [{
                                        key: { remoteJid: from },
                                        message: {
                                            extendedTextMessage: {
                                                text: `${prefix}cinedl2 ${link}`,
                                                contextInfo: { stanzaId: msgUpdate.key.id }
                                            }
                                        }
                                    }]
                                });
                            }
                        }
                    }
                } catch (err) {
                    console.error("Text Listener Error:", err);
                }
            };

            bot.ev.on('messages.upsert', listener);
            setTimeout(() => {
                bot.ev.off('messages.upsert', listener);
            }, 300000);
        }

    } catch (e) {
        console.log("CINE Error:", e);
        await conn.sendMessage(from, { 
            text: '🚩 *Error occurred while fetching data!*\n\n' + e.message 
        }, { quoted: mek });
    }
});

// ================ CINESUBZ MOVIE INFO ================
cmd({
    pattern: "cinedl2",
    react: '🎥',
    desc: "Get movie download links",
    filename: __filename
},
async (conn, mek, m, { from, q, prefix, reply, userSettings }) => {
    try {
        if (!q) return await reply('*Please provide a movie link!*');

        // ===== BUTTON CHECK =====
        const settings = userSettings || global.CURRENT_BOT_SETTINGS || {};
        const isButtonsOn = settings.buttons === 'true';

        await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });

        const apiUrl = `https://mr-thinuzz-api-build.vercel.app/api/cinesubz/movie?url=${encodeURIComponent(q)}&apiKey=key_faa62e4037a95cda`;
        const res = await axios.get(apiUrl);
        const movie = res.data.data;

        if (!movie) {
            return await conn.sendMessage(from, { text: '🚩 *Error fetching movie details!*' }, { quoted: mek });
        }

        let cleanTitle = movie.maintitle || movie.title || 'N/A';
        if (typeof cleanTitle === 'string') {
            cleanTitle = cleanTitle.replace("Sinhala Subtitles | සිංහල උපසිරැසි සමඟ", "").trim();
        }

        let rating = 'N/A';
        if (movie.imdb?.value && movie.imdb.value !== "00") {
            rating = movie.imdb.value;
        } else if (movie.rating?.value && movie.rating.value !== "00") {
            rating = movie.rating.value;
        }

        let genres = 'N/A';
        if (movie.category && Array.isArray(movie.category) && movie.category.length > 0) {
            genres = movie.category.join(', ');
        }

        let msg = `*🍿 ${cleanTitle}*\n\n`;
        msg += `*📅 Year:* ${movie.dateCreate || movie.year || 'N/A'}\n`;
        msg += `*⭐ Rating:* ${rating}\n`;
        msg += `*⏰ Runtime:* ${movie.runtime || 'N/A'}\n`;
        msg += `*🎭 Genres:* ${genres}\n`;
        msg += `*🌍 Country:* ${movie.country || 'N/A'}\n\n`;
        msg += `*📥 Select quality:*`;

        let buttons = [];
        let textQualities = [];

        if (movie.downloadUrl && Array.isArray(movie.downloadUrl) && movie.downloadUrl.length > 0) {
            const uniqueLinks = new Map();
            movie.downloadUrl.forEach((dl) => {
                if (!dl || !dl.quality) return;
                const qualityKey = dl.quality.toLowerCase().replace(/[^a-z0-9]/g, '');
                if (!uniqueLinks.has(qualityKey)) {
                    uniqueLinks.set(qualityKey, dl);
                }
            });
            
            let qualityIndex = 0;
            Array.from(uniqueLinks.values()).forEach((dl) => {
                let qualityName = dl.quality || 'Unknown';
                qualityName = qualityName.replace("BluRay", "").trim();
                const link = dl.link || dl.url || '';
                if (link) {
                    qualityIndex++;
                    const btnId = `${prefix}cinemovie ${link}±${cleanTitle}±${movie.mainImage || movie.posterUrl || ''}±${qualityName}`;
                    
                    buttons.push({
                        buttonId: btnId,
                        buttonText: { displayText: `🎬 ${qualityName} (${dl.size || 'N/A'})` },
                        type: 1
                    });
                    
                    textQualities.push(`${qualityIndex}. ${qualityName} (${dl.size || 'N/A'})`);
                }
            });
        }

        // ===== BUTTONS ON =====
        if (isButtonsOn) {
            if (buttons.length === 0) {
                return await reply('*No download links available for this movie!*');
            }

            buttons.push({
                buttonId: prefix + 'cdetails ' + q,
                buttonText: { displayText: '📋 Full Details' },
                type: 1
            });

            buttons.push({
                buttonId: prefix + 'cine ' + cleanTitle.split(' ').slice(0, 3).join(' '),
                buttonText: { displayText: '🔙 Back' },
                type: 1
            });

            const posterUrl = movie.mainImage || movie.posterUrl || 'https://i.ibb.co/NsV2XcK/movie-poster.png';

            await conn.sendMessage(from, {
                image: { url: posterUrl },
                caption: msg,
                footer: config.FOOTER,
                buttons: buttons,
                headerType: 4
            }, { quoted: mek });
        } 
        // ===== BUTTONS OFF (Text Mode) =====
        else {
            if (textQualities.length === 0) {
                return await reply('*No download links available for this movie!*');
            }

            let textMsg = msg + '\n\n*Reply with number:*\n';
            textQualities.forEach(q => {
                textMsg += `\n${q}`;
            });
            textMsg += `\n\n> _𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 ZEUS-X-MINI </>_`;

            const posterUrl = movie.mainImage || movie.posterUrl || 'https://i.ibb.co/NsV2XcK/movie-poster.png';

            const sentMsg = await conn.sendMessage(from, {
                image: { url: posterUrl },
                caption: textMsg
            }, { quoted: mek });

            // Text listener for quality selection
            const listener = async (update) => {
                try {
                    const msgUpdate = update.messages[0];
                    if (!msgUpdate || !msgUpdate.message) return;

                    const body = msgUpdate.message.conversation || 
                               msgUpdate.message.extendedTextMessage?.text;

                    const contextInfo = msgUpdate.message.extendedTextMessage?.contextInfo;
                    const isReplyToBot = contextInfo?.stanzaId === sentMsg.key.id;

                    if (isReplyToBot && body && !isNaN(body)) {
                        const index = parseInt(body) - 1;
                        if (index >= 0 && index < textQualities.length) {
                            // Get the corresponding button ID
                            const btnId = buttons[index]?.buttonId;
                            if (btnId) {
                                bot.ev.off('messages.upsert', listener);
                                await conn.sendMessage(from, { react: { text: '⏳', key: msgUpdate.key } });
                                // Execute the download command
                                const parts = btnId.split(' ');
                                const cmd = parts[0];
                                const args = parts.slice(1).join(' ');
                                await conn.ev.emit('messages.upsert', {
                                    messages: [{
                                        key: { remoteJid: from },
                                        message: {
                                            extendedTextMessage: {
                                                text: `${cmd} ${args}`,
                                                contextInfo: { stanzaId: msgUpdate.key.id }
                                            }
                                        }
                                    }]
                                });
                            }
                        }
                    }
                } catch (err) {
                    console.error("Text Listener Error:", err);
                }
            };

            bot.ev.on('messages.upsert', listener);
            setTimeout(() => {
                bot.ev.off('messages.upsert', listener);
            }, 300000);
        }

    } catch (e) {
        console.log("CINEDL2 Error:", e);
        await conn.sendMessage(from, { text: '🚩 *Error occurred!*\n\n' + e.message }, { quoted: mek });
    }
});

// ================ CINESUBZ DOWNLOAD ================
cmd({
    pattern: "cinemovie",
    react: "⬇️",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return await reply('*📍 Please provide the movie link!*');

        const parts = q.split("±");
        const movieUrl = parts[0] || '';
        const movieName = parts[1] || 'Movie';
        const thumbUrl = parts[2] || '';
        const quality = parts[3] || '';

        if (!movieUrl) return await reply('*⚠️ Invalid Format!*');

        await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });

        const apiUrl = `https://mr-thinuzz-api-build.vercel.app/api/cinesubz/download?url=${encodeURIComponent(movieUrl)}&apiKey=key_faa62e4037a95cda`;
        const response = await axios.get(apiUrl);

        if (!response?.data?.status || !response?.data?.data?.downloadUrls) {
            return await reply('*❌ Download link not found!*');
        }

        const directLink = response.data.data.downloadUrls.find(item => 
            item.url && !item.url.includes("t.me") && !item.url.includes("telegram")
        );

        if (!directLink) {
            return await reply('*❌ No direct download link available!*');
        }

        let cleanName = movieName;
        if (typeof cleanName === 'string') {
            cleanName = cleanName
                .replace("Sinhala Subtitles | සිංහල උපසිරැසි සමඟ", "")
                .replace("Sinhala Subtitle | සිංහල උපසිරැසි සමඟ", "")
                .trim();
        }

        let thumbBuffer = null;
        if (thumbUrl && thumbUrl !== 'undefined') {
            try {
                const thumbRes = await fetch(thumbUrl);
                if (thumbRes.ok) {
                    thumbBuffer = await thumbRes.buffer();
                }
            } catch (e) { /* ignore */ }
        }

        await conn.sendMessage(from, { text: '*Uploading your movie..⬆️*' }, { quoted: mek });

        const targetJid = config.JID || from;

        await conn.sendMessage(targetJid, {
            document: { url: directLink.url },
            mimetype: 'video/mp4',
            fileName: `🎬 ${cleanName}.mp4`,
            caption: `*🎬 Name:* ${cleanName}\n\n*\`${quality}\`*\n\n${config.NAME || 'ZEUS-X-MINI'}`,
            jpegThumbnail: thumbBuffer
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });

    } catch (e) {
        console.log("Download Error:", e);
        await reply(`*❌ Error:* ${e.message}`);
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
    }
});

// ================ CINESUBZ DETAILS ================
cmd({
    pattern: "cdetails",
    react: '🎬',
    desc: "Movie details sender from Cinesubz",
    filename: __filename
},
async (conn, mek, m, { from, q, prefix, reply }) => {
    try {
        if (!q) return await reply('⚠️ *Please provide the movie URL!*');

        let sadas = await fetchJson(`https://mr-thinuzz-api-build.vercel.app/api/cinesubz/movie?url=${encodeURIComponent(q)}&apiKey=key_faa62e4037a95cda`);

        if (!sadas || !sadas.status || !sadas.data) {
            return await conn.sendMessage(from, { text: '🚩 *Error: Could not fetch movie details!*' }, { quoted: mek });
        }

        const movie = sadas.data;

        let mainTitle = movie.maintitle || movie.title || 'N/A';
        if (typeof mainTitle === 'string') {
            mainTitle = mainTitle.replace("Sinhala Subtitles | සිංහල උපසිරැසි සමඟ", "").trim();
        }

        let ratingValue = 'N/A';
        if (movie.imdb?.value && movie.imdb.value !== "00") {
            ratingValue = movie.imdb.value;
        } else if (movie.rating?.value && movie.rating.value !== "00") {
            ratingValue = movie.rating.value;
        }

        let runtimeText = movie.runtime || 'N/A';
        if (typeof runtimeText === 'string' && runtimeText.startsWith("IMDb:")) {
            runtimeText = runtimeText.replace("IMDb:", "").trim();
        }

        let genres = 'N/A';
        if (movie.category && Array.isArray(movie.category) && movie.category.length > 0) {
            genres = movie.category.join(', ');
        }

        let directorName = 'N/A';
        if (movie.director?.name) {
            if (Array.isArray(movie.director.name)) {
                directorName = movie.director.name.join(', ');
            } else {
                directorName = movie.director.name;
            }
        }

        let msg = `*☘️ 𝗧ɪᴛʟᴇ ➮* *_${mainTitle}_*

*📅 𝗬ᴇᴀʀ ➮* _${movie.dateCreate || movie.year || 'N/A'}_
*⭐ 𝗜𝗠ᴅʙ 𝗥ᴀᴛɪɴɢ ➮* _${ratingValue}_
*⏰ 𝗥ᴜɴᴛɪᴍᴇ ➮* _${runtimeText}_
*🌍 𝗖𝗼𝘂ɴᴛʀʏ ➮* _${movie.country || 'N/A'}_
*🎭 𝗚𝗲𝗻𝗿𝗲𝘀 ➮* _${genres}_
*🎬 𝗗ɪʀᴇᴄᴛᴏʀ ➮* _${directorName}_

✨ *Follow us:* ${config.FOOTER || 'ZEUS-X-MINI'}`;

        let posterUrl = movie.mainImage;
        if (!posterUrl && movie.imageUrls && Array.isArray(movie.imageUrls) && movie.imageUrls.length > 0) {
            posterUrl = movie.imageUrls[0];
        }
        if (!posterUrl) {
            posterUrl = 'https://i.ibb.co/NsV2XcK/movie-poster.png';
        }

        const buttons = [{
            buttonId: prefix + 'cinedl2 ' + q,
            buttonText: { displayText: '🔙 Back to Downloads' },
            type: 1
        }];

        await conn.sendMessage(from, {
            image: { url: posterUrl },
            caption: msg,
            footer: config.FOOTER,
            buttons: buttons,
            headerType: 4
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: '✔️', key: mek.key } });

    } catch (error) {
        console.error('Error:', error);
        await conn.sendMessage(from, '⚠️ *An error occurred while fetching details.*', { quoted: mek });
    }
});

// ================ HELPER FUNCTION ================
async function fetchJson(url) {
    const res = await fetch(url);
    return await res.json();
}
