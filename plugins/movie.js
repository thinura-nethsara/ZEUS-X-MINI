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

        const settings = userSettings || global.CURRENT_BOT_SETTINGS || {};
        const isButtonsOn = settings.buttons === 'true';
        const botName = settings.botName || config.DEFAULT_BOT_NAME || "ZEUS-X-MINI";

        const sources = [
            { name: "CINESUBZ", cmd: "cine" },
            { name: "SINHALASUB", cmd: "sinhalasub" },
            { name: "SUBLK", cmd: "sublk" }
        ];

        // ===== ZEUS ORIGINAL STYLE - DIRECT BUTTONS =====
        const caption = `_*${botName} MOVIE SYSTEM 🎬*_\n\n*\`🔍Input :\`* ${q}\n\n_*🌟 Select your preferred movie download site*_`;

        // Create buttons array
        const buttons = sources.map(src => ({
            buttonId: prefix + src.cmd + ' ' + q,
            buttonText: { displayText: `🎬 ${src.name}` },
            type: 1
        }));

        // Add a cancel/back button
        buttons.push({
            buttonId: prefix + 'menu',
            buttonText: { displayText: '🔙 Back to Menu' },
            type: 1
        });

        // Send with ZEUS original button style
        await conn.sendMessage(from, {
            image: { url: 'https://i.ibb.co/cXYtgWPV/Whats-App-Image-2026-06-18-at-7-35-46-PM.png' },
            caption: caption,
            footer: config.FOOTER || `© ${botName}`,
            buttons: buttons,
            headerType: 4
        }, { quoted: mek });

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
async (conn, mek, m, { from, prefix, q, reply }) => {
    try {
        if (!q) return await reply('*Please give me a movie name 🎬*');

        await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });

        const apiUrl = `https://mr-thinuzz-api-build.vercel.app/api/cinesubz/search?query=${encodeURIComponent(q)}&apiKey=key_13be1374312cdd0a`;
        const response = await axios.get(apiUrl);
        const result = response.data;

        if (!result.status || !result.data || result.data.all?.length === 0) {
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return await conn.sendMessage(from, { text: '*No results found ❌*' }, { quoted: mek });
        }

        const results = result.data.all || [];
        let buttons = [];

        // Create buttons for first 10 results
        results.slice(0, 10).forEach((item) => {
            let cleanTitle = item.title
                .replace("Sinhala Subtitles | සිංහල උපසිරැසි සමඟ", "")
                .replace("Sinhala Subtitle | සිංහල උපසිරැසි සමඟ", "")
                .trim();
            
            const typeBadge = item.type === "TV" ? "📺" : "🎬";
            buttons.push({
                buttonId: `${prefix}cinedl2 ${item.link}`,
                buttonText: { displayText: `${typeBadge} ${cleanTitle.substring(0, 30)}${cleanTitle.length > 30 ? '...' : ''}` },
                type: 1
            });
        });

        // Add next/back buttons
        buttons.push({
            buttonId: prefix + 'mv ' + q,
            buttonText: { displayText: '🔙 Back to Sources' },
            type: 1
        });

        const caption = `*🎬 CINESUBZ RESULTS*\n\n*🔍 Search:* ${q}\n*📊 Found:* ${result.total_results || results.length}\n\n*Select a movie below:*`;

        await conn.sendMessage(from, {
            image: { url: 'https://i.ibb.co/NsV2XcK/movie-poster.png' },
            caption: caption,
            footer: config.FOOTER,
            buttons: buttons,
            headerType: 4
        }, { quoted: mek });

    } catch (e) {
        console.log("CINE Error:", e);
        await conn.sendMessage(from, { text: '🚩 *Error occurred while fetching data!*' }, { quoted: mek });
    }
});

// ================ CINESUBZ MOVIE INFO ================
cmd({
    pattern: "cinedl2",
    react: '🎥',
    desc: "Get movie download links",
    filename: __filename
},
async (conn, mek, m, { from, q, prefix, reply }) => {
    try {
        if (!q) return await reply('*Please provide a movie link!*');

        await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });

        const apiUrl = `https://mr-thinuzz-api-build.vercel.app/api/cinesubz/movie?url=${encodeURIComponent(q)}&apiKey=key_13be1374312cdd0a`;
        const res = await axios.get(apiUrl);
        const movie = res.data.data;

        if (!movie) {
            return await conn.sendMessage(from, { text: '🚩 *Error fetching movie details!*' }, { quoted: mek });
        }

        // Clean title
        let cleanTitle = movie.maintitle || movie.title || 'N/A';
        cleanTitle = cleanTitle.replace("Sinhala Subtitles | සිංහල උපසිරැසි සමඟ", "").trim();

        // Get rating
        let rating = 'N/A';
        if (movie.imdb?.value && movie.imdb.value !== "00") {
            rating = movie.imdb.value;
        } else if (movie.rating?.value && movie.rating.value !== "00") {
            rating = movie.rating.value;
        }

        // Get genres
        let genres = 'N/A';
        if (movie.category && movie.category.length > 0) {
            genres = movie.category.join(', ');
        }

        let msg = `*🍿 ${cleanTitle}*\n\n`;
        msg += `*📅 Year:* ${movie.dateCreate || 'N/A'}\n`;
        msg += `*⭐ Rating:* ${rating}\n`;
        msg += `*⏰ Runtime:* ${movie.runtime || 'N/A'}\n`;
        msg += `*🎭 Genres:* ${genres}\n`;
        msg += `*🌍 Country:* ${movie.country || 'N/A'}\n\n`;
        msg += `*📥 Select quality:*`;

        let buttons = [];

        // Download links
        if (movie.downloadUrl && movie.downloadUrl.length > 0) {
            const uniqueLinks = new Map();
            movie.downloadUrl.forEach((dl) => {
                const qualityKey = dl.quality.toLowerCase().replace(/[^a-z0-9]/g, '');
                if (!uniqueLinks.has(qualityKey)) {
                    uniqueLinks.set(qualityKey, dl);
                }
            });
            
            Array.from(uniqueLinks.values()).forEach((dl) => {
                let qualityName = dl.quality || 'Unknown';
                qualityName = qualityName.replace("BluRay", "").trim();
                buttons.push({
                    buttonId: `${prefix}cinemovie ${dl.link}±${cleanTitle}±${movie.mainImage}±${qualityName}`,
                    buttonText: { 
                        displayText: `🎬 ${qualityName} (${dl.size || 'N/A'})` 
                    },
                    type: 1
                });
            });
        }

        // Add details button
        buttons.push({
            buttonId: prefix + 'cdetails ' + q,
            buttonText: { displayText: '📋 Full Details' },
            type: 1
        });

        // Add back button
        buttons.push({
            buttonId: prefix + 'cine ' + cleanTitle,
            buttonText: { displayText: '🔙 Back to Search' },
            type: 1
        });

        if (buttons.length <= 2) {
            return await reply('*No download links available for this movie!*');
        }

        const posterUrl = movie.mainImage || config.LOGO;

        await conn.sendMessage(from, {
            image: { url: posterUrl },
            caption: msg,
            footer: config.FOOTER,
            buttons: buttons,
            headerType: 4
        }, { quoted: mek });

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

        const [movieUrl, movieName, thumbUrl, quality] = q.split("±");
        if (!movieUrl || !movieName) return await reply('*⚠️ Invalid Format!*');

        await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });

        const apiUrl = `https://mr-thinuzz-api-build.vercel.app/api/cinesubz/download?url=${encodeURIComponent(movieUrl)}&apiKey=key_13be1374312cdd0a`;
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

        let cleanName = movieName
            .replace("Sinhala Subtitles | සිංහල උපසිරැසි සමඟ", "")
            .replace("Sinhala Subtitle | සිංහල උපසිරැසි සමඟ", "")
            .trim();

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
            caption: `*🎬 Name:* ${cleanName}\n\n*\`${quality}\`*\n\n${config.NAME}`,
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
async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return await reply('⚠️ *Please provide the movie URL!*');

        let sadas = await fetchJson(`https://mr-thinuzz-api-build.vercel.app/api/cinesubz/movie?url=${encodeURIComponent(q)}&apiKey=key_13be1374312cdd0a`);

        if (!sadas || !sadas.status || !sadas.data) {
            return await conn.sendMessage(from, { text: '🚩 *Error: Could not fetch movie details!*' }, { quoted: mek });
        }

        const movie = sadas.data;

        let mainTitle = movie.maintitle || movie.title || 'N/A';
        mainTitle = mainTitle.replace("Sinhala Subtitles | සිංහල උපසිරැසි සමඟ", "").trim();

        let ratingValue = 'N/A';
        if (movie.imdb?.value && movie.imdb.value !== "00") {
            ratingValue = movie.imdb.value;
        } else if (movie.rating?.value && movie.rating.value !== "00") {
            ratingValue = movie.rating.value;
        }

        let runtimeText = movie.runtime || 'N/A';
        if (runtimeText.startsWith("IMDb:")) {
            runtimeText = runtimeText.replace("IMDb:", "").trim();
        }

        let genres = 'N/A';
        if (movie.category && movie.category.length > 0) {
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

*📅 𝗬ᴇᴀʀ ➮* _${movie.dateCreate || 'N/A'}_
*⭐ 𝗜𝗠ᴅʙ 𝗥ᴀᴛɪɴɢ ➮* _${ratingValue}_
*⏰ 𝗥ᴜɴᴛɪᴍᴇ ➮* _${runtimeText}_
*🌍 𝗖𝗼𝘂𝗻ᴛʀʏ ➮* _${movie.country || 'N/A'}_
*🎭 𝗚𝗲𝗻𝗿𝗲𝘀 ➮* _${genres}_
*🎬 𝗗ɪʀᴇᴄᴛᴏʀ ➮* _${directorName}_

✨ *Follow us:* ${config.FOOTER}`;

        let posterUrl = movie.mainImage;
        if (!posterUrl && movie.imageUrls?.length > 0) {
            posterUrl = movie.imageUrls[0];
        }
        if (!posterUrl) {
            posterUrl = 'https://cinesubz.lk/wp-content/uploads/2021/09/cropped-cropped-CineSubz-Icon-1.png';
        }

        // Add back button
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

// ================ SINHALASUB SEARCH ================
cmd({
    pattern: "sinhalasub",
    react: '🇱🇰',
    category: "movie",
    alias: ["ss"],
    desc: "sinhalasub.lk movie search",
    use: ".sinhalasub movie_name",
    filename: __filename
},
async (conn, mek, m, { from, prefix, q, reply }) => {
    try {
        if (!q) return await reply('*Please give me a movie name 🎬*');

        await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });

        const apiUrl = `https://mr-thinuzz-api-build.vercel.app/api/sinhalasub?keyword=${encodeURIComponent(q)}&apiKey=key_13be1374312cdd0a`;
        const response = await axios.get(apiUrl);
        const result = response.data;

        if (!result.status || !result.data || result.data.length === 0) {
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return await conn.sendMessage(from, { text: '*No results found ❌*' }, { quoted: mek });
        }

        let buttons = [];
        result.data.slice(0, 10).forEach((movie) => {
            let cleanTitle = movie.Title
                .replace("Sinhala Subtitles | සිංහල උපසිරැසි සමඟ", "")
                .replace("Sinhala Subtitle | සිංහල උපසිරැසි සමඟ", "")
                .trim();
            
            let yearInfo = movie.Year ? ` (${movie.Year})` : '';
            buttons.push({
                buttonId: `${prefix}sinfo ${movie.Link}`,
                buttonText: { 
                    displayText: `🇱🇰 ${cleanTitle.substring(0, 30)}${cleanTitle.length > 30 ? '...' : ''}${yearInfo}` 
                },
                type: 1
            });
        });

        buttons.push({
            buttonId: prefix + 'mv ' + q,
            buttonText: { displayText: '🔙 Back to Sources' },
            type: 1
        });

        const caption = `*🇱🇰 SINHALASUB RESULTS*\n\n*🔍 Search:* ${q}\n*📊 Found:* ${result.total_results || result.data.length}\n\n*Select a movie below:*`;

        await conn.sendMessage(from, {
            image: { url: 'https://i.ibb.co/NsV2XcK/movie-poster.png' },
            caption: caption,
            footer: config.FOOTER,
            buttons: buttons,
            headerType: 4
        }, { quoted: mek });

    } catch (e) {
        console.log("SINHALASUB Error:", e);
        await conn.sendMessage(from, { text: '🚩 *Error occurred while fetching data!*' }, { quoted: mek });
    }
});

// ================ SINHALASUB MOVIE INFO ================
cmd({
    pattern: "sinfo",
    react: '🎥',
    desc: "Get SinhalaSub movie details",
    filename: __filename
},
async (conn, mek, m, { from, q, prefix, reply }) => {
    try {
        if (!q) return await reply('*Please provide a movie link!*');

        await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });

        const apiUrl = `https://mr-thinuzz-api-build.vercel.app/api/sinhalasub?url=${encodeURIComponent(q)}&apiKey=key_13be1374312cdd0a`;
        const res = await axios.get(apiUrl);
        const movie = res.data.data;

        if (!movie) {
            return await conn.sendMessage(from, { text: '🚩 *Error fetching movie details!*' }, { quoted: mek });
        }

        let genres = 'N/A';
        if (movie.genres?.length > 0) {
            genres = movie.genres.join(', ');
        }

        let cleanTitle = movie.title || 'N/A';
        cleanTitle = cleanTitle.replace("Sinhala Subtitles", "").trim();

        let msg = `*🍿 ${cleanTitle}*\n\n`;
        msg += `*📅 Year:* ${movie.release_date || 'N/A'}\n`;
        msg += `*⭐ Rating:* ${movie.imdb_rating || 'N/A'}\n`;
        msg += `*⏰ Runtime:* ${movie.runtime || 'N/A'}\n`;
        msg += `*🎭 Genres:* ${genres}\n`;
        msg += `*💁 Subtitles:* Sinhalasub\n\n`;
        msg += `*📥 Select quality:*`;

        let buttons = [];

        if (movie.download_links && movie.download_links.length > 0) {
            const uniqueQualities = new Map();
            movie.download_links.forEach((dl) => {
                if (dl.quality === "SRT") return;
                if (dl.provider === "Telegram") return;
                
                if (!uniqueQualities.has(dl.quality)) {
                    uniqueQualities.set(dl.quality, dl);
                }
            });
            
            Array.from(uniqueQualities.values()).forEach((dl) => {
                buttons.push({
                    buttonId: `${prefix}sdlmovie ${dl.url}±${cleanTitle}±${movie.poster}±${dl.quality}`,
                    buttonText: { 
                        displayText: `🎬 ${dl.quality} (${dl.size})` 
                    },
                    type: 1
                });
            });
        }

        buttons.push({
            buttonId: prefix + 'sinhalasubdetails ' + q,
            buttonText: { displayText: '📋 Full Details' },
            type: 1
        });

        buttons.push({
            buttonId: prefix + 'sinhalasub ' + cleanTitle,
            buttonText: { displayText: '🔙 Back to Search' },
            type: 1
        });

        if (buttons.length <= 2) {
            return await reply('*No download links available!*');
        }

        const posterUrl = movie.poster || config.LOGO;

        await conn.sendMessage(from, {
            image: { url: posterUrl },
            caption: msg,
            footer: config.FOOTER,
            buttons: buttons,
            headerType: 4
        }, { quoted: mek });

    } catch (e) {
        console.log("SINFO Error:", e);
        await conn.sendMessage(from, { text: '🚩 *Error occurred!*' }, { quoted: mek });
    }
});

// ================ SINHALASUB DOWNLOAD ================
cmd({
    pattern: "sdlmovie",
    react: "⬇️",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return await reply('*📍 Please provide the movie link!*');

        const [movieUrl, movieName, thumbUrl, quality] = q.split("±");
        if (!movieUrl || !movieName) return await reply('*⚠️ Invalid Format!*');

        await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });

        let directLink = movieUrl;
        if (movieUrl.includes("/u/")) {
            directLink = movieUrl.replace("/u/", "/api/file/");
        }

        let cleanName = movieName
            .replace("Sinhala Subtitles | සිංහල උපසිරැසි සමඟ", "")
            .replace("Sinhala Subtitle | සිංහල උපසිරැසි සමඟ", "")
            .trim();

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
            document: { url: directLink },
            mimetype: 'video/mp4',
            fileName: `🎬 ${cleanName}.mp4`,
            caption: `*🎬 Name:* ${cleanName}\n\n*\`${quality}\`*\n\n${config.NAME}`,
            jpegThumbnail: thumbBuffer
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });

    } catch (e) {
        console.log("Download Error:", e);
        await reply(`*❌ Error:* ${e.message}`);
    }
});

// ================ SINHALASUB DETAILS ================
cmd({
    pattern: "sinhalasubdetails",
    react: '🎬',
    desc: "Movie details sender from SinhalaSub",
    filename: __filename
},
async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return await reply('⚠️ *Please provide the movie URL!*');

        let apiUrl = `https://mr-thinuzz-api-build.vercel.app/api/sinhalasub?url=${encodeURIComponent(q)}&apiKey=key_13be1374312cdd0a`;
        let sadas = await fetchJson(apiUrl);

        if (!sadas || !sadas.status || !sadas.data) {
            return await conn.sendMessage(from, { text: '🚩 *Error: Could not find movie details!*' }, { quoted: mek });
        }

        const movie = sadas.data;
        
        let genres = 'N/A';
        if (movie.genres?.length > 0) {
            genres = movie.genres.join(', ');
        }
        
        let cleanTitle = movie.title || 'N/A';
        cleanTitle = cleanTitle.replace("Sinhala Subtitles", "").trim();
        
        let msg = `*🎬 ${cleanTitle}*\n\n`;
        msg += `*📅 Year:* ${movie.release_date || 'N/A'}\n`;
        msg += `*🌟 Rating:* ${movie.imdb_rating || 'N/A'}\n`;
        msg += `*⏰ Duration:* ${movie.runtime || 'N/A'}\n`;
        msg += `*🎭 Genres:* ${genres}\n`;
        msg += `*💁 Subtitles:* Sinhalasub\n\n`;
        msg += `*📝 Description:*\n_${movie.description ? movie.description.substring(0, 300) + (movie.description.length > 300 ? '...' : '') : 'N/A'}_\n\n`;
        msg += `✨ *${config.FOOTER}*`;

        let posterUrl = movie.poster;
        if (!posterUrl && movie.backdrop) {
            posterUrl = movie.backdrop;
        }
        if (!posterUrl) {
            posterUrl = 'https://sinhalasub.lk/wp-content/uploads/2021/09/cropped-cropped-CineSubz-Icon-1.png';
        }

        // Add back button
        const buttons = [{
            buttonId: prefix + 'sinfo ' + q,
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
        await conn.sendMessage(from, { text: '⚠️ *An error occurred while fetching details.*' }, { quoted: mek });
    }
});

// ================ SUBLK SEARCH ================
cmd({
    pattern: "sublk",        
    react: '📽️',
    category: "movie",
    desc: "SUB.LK movie search",
    use: ".sublk movie_name",
    filename: __filename
},
async (conn, mek, m, { from, prefix, q, reply }) => {
    try {
        if (!q) return await reply('*Please give me a movie name 🎥*');

        await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });

        let url = await fetchJson(`https://visper-md-ap-is.vercel.app/movie/sublk/SEARCH?q=${encodeURIComponent(q)}`);

        if (!url || !url.result || url.result.length === 0) {
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return await conn.sendMessage(from, { text: '*No results found ❌*' }, { quoted: mek });
        }

        let buttons = [];
        url.result.slice(0, 10).forEach((movie) => {
            buttons.push({
                buttonId: prefix + `sdlk ${movie.link}&${movie.year}`,
                buttonText: { 
                    displayText: `📽️ ${movie.title.substring(0, 35)}${movie.title.length > 35 ? '...' : ''}` 
                },
                type: 1
            });
        });

        buttons.push({
            buttonId: prefix + 'mv ' + q,
            buttonText: { displayText: '🔙 Back to Sources' },
            type: 1
        });

        const caption = `*📽️ SUB.LK RESULTS*\n\n*🔍 Search:* ${q}\n*📊 Found:* ${url.result.length}\n\n*Select a movie below:*`;

        await conn.sendMessage(from, {
            image: { url: 'https://i.ibb.co/NsV2XcK/movie-poster.png' },
            caption: caption,
            footer: config.FOOTER,
            buttons: buttons,
            headerType: 4
        }, { quoted: mek });

    } catch (e) {
        console.log("SUBLK Error:", e);
        await conn.sendMessage(from, { text: '🚩 *Error fetching results !!*' }, { quoted: mek });
    }
});

// ================ SUBLK MOVIE INFO ================
cmd({
    pattern: "sdlk",    
    react: '🎥',
    desc: "SUB.LK movie downloader",
    filename: __filename
},
async (conn, mek, m, { from, q, prefix, reply }) => {
    try {
        if (!q || !q.includes('https://sub.lk/movies/')) {
            return await reply('*❗ Invalid link. Please search using .sublk first.*');
        }

        await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });

        let data = await fetchJson(`https://sadaslk-apis.vercel.app/api/v1/movie/sublk/infodl?q=${q}&apiKey=sadasggggg`);
        const movie = data.data;

        if (!movie) return await reply('*🚩 No details found!*');

        let msg = `*📽️ ${movie.title || 'N/A'}*\n\n`;
        msg += `*📅 Release:* ${movie.releaseDate || 'N/A'}\n`;
        msg += `*🌍 Country:* ${movie.country || 'N/A'}\n`;
        msg += `*⭐ Rating:* ${movie.ratingValue || 'N/A'} (${movie.ratingCount || 'N/A'})\n`;
        msg += `*⏰ Runtime:* ${movie.runtime || 'N/A'}\n`;
        msg += `*🎭 Genres:* ${movie.genres?.join(', ') || 'N/A'}\n\n`;
        msg += `*📥 Select quality:*`;

        let buttons = [];

        if (movie.pixeldrainDownloads && movie.pixeldrainDownloads.length > 0) {
            movie.pixeldrainDownloads.forEach((dl) => {
                buttons.push({
                    buttonId: `${prefix}sdlkmovie ${dl.finalDownloadUrl}±${movie.imageUrl}±${movie.title}±${dl.quality}`,
                    buttonText: { 
                        displayText: `🎬 ${dl.quality} (${dl.size})`
                    },
                    type: 1
                });
            });
        }

        buttons.push({
            buttonId: prefix + 'ssdetails ' + q,
            buttonText: { displayText: '📋 Full Details' },
            type: 1
        });

        buttons.push({
            buttonId: prefix + 'sublk ' + movie.title,
            buttonText: { displayText: '🔙 Back to Search' },
            type: 1
        });

        if (buttons.length <= 2) {
            return await reply('*No download links available!*');
        }

        const imageUrl = movie.imageUrl?.replace('-200x300', '') || config.LOGO;

        await conn.sendMessage(from, {
            image: { url: imageUrl },
            caption: msg,
            footer: config.FOOTER,
            buttons: buttons,
            headerType: 4
        }, { quoted: mek });

    } catch (e) {
        console.log("SDLK Error:", e);
        await conn.sendMessage(from, { text: '🚩 *Error occurred while fetching data!*' }, { quoted: mek });
    }
});

// ================ SUBLK DOWNLOAD ================
cmd({
    pattern: "sdlkmovie",
    react: "⬇️",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return await reply('*📍 Please provide the movie link!*');

        const [megaUrl, imglink, title, quality] = q.split("±");

        if (!megaUrl || !imglink || !title) {
            return await reply("⚠️ Invalid format.");
        }

        await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });
        await conn.sendMessage(from, { text: '*Fetching download link...* ⏳' }, { quoted: mek });

        const apiUrl = `https://sadaslk-fast-mega-dl.vercel.app/mega?q=${encodeURIComponent(megaUrl.trim())}`;
        let megaApi = await fetchJson(apiUrl);
        
        if (!megaApi.status || !megaApi.result || !megaApi.result.download) {
            return await reply("🚫 *Failed to fetch download link!*");
        }

        const directDownloadUrl = megaApi.result.download;
        const fileName = megaApi.result.name || title;

        let thumbBuffer = null;
        if (imglink) {
            try {
                const thumbRes = await fetch(imglink.trim());
                if (thumbRes.ok) {
                    thumbBuffer = await thumbRes.buffer();
                }
            } catch (e) { /* ignore */ }
        }

        await conn.sendMessage(from, { text: '*Uploading your movie..⬆️*' }, { quoted: mek });

        const targetJid = config.JID || from;

        await conn.sendMessage(targetJid, {
            document: { url: directDownloadUrl },
            caption: `🎬 *${title}*\n\n*\`${quality}\`*\n\n${config.NAME}`,
            mimetype: "video/mp4",
            jpegThumbnail: thumbBuffer,
            fileName: `🎬 ${fileName}.mp4`,
        });

        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });

    } catch (e) {
        console.error("SUBLK Download Error:", e);
        reply('🚫 *Error Occurred!*\n\n' + e.message);
    }
});

// ================ SUBLK DETAILS ================
cmd({
    pattern: "ssdetails",
    react: '🎬',
    desc: "Movie details sender (Details Only)",
    filename: __filename
},
async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return await reply('⚠️ *Please provide the movie URL!*');

        let sadas = await fetchJson(`https://sadaslk-apis.vercel.app/api/v1/movie/sublk/infodl?q=${q}&apiKey=sadasggggg`);

        if (!sadas || !sadas.status || !sadas.data) {
            return await conn.sendMessage(from, { text: '🚩 *Error: Could not fetch movie details!*' }, { quoted: mek });
        }

        const movie = sadas.data;

        let msg = `*☘️ 𝗧ɪᴛʟᴇ ➮* *_${movie.title || 'N/A'}_*`;
        if (movie.tagline) {
            msg += `\n*✨ Tagline:* _${movie.tagline}_`;
        }
        msg += `\n\n*📅 Release:* _${movie.releaseDate || 'N/A'}_`;
        msg += `\n*💃 Rating:* _${movie.ratingValue || 'N/A'} (${movie.ratingCount})_`;
        msg += `\n*⏰ Runtime:* _${movie.runtime || 'N/A'}_`;
        msg += `\n*🌍 Country:* _${movie.country || 'N/A'}_`;
        msg += `\n*🎭 Genres:* ${movie.genres ? movie.genres.join(', ') : 'N/A'}`;
        msg += `\n*🔞 Content Rating:* _${movie.contentRating || 'N/A'}_\n\n`;
        msg += `✨ *${config.FOOTER}*`;

        // Add back button
        const buttons = [{
            buttonId: prefix + 'sdlk ' + q,
            buttonText: { displayText: '🔙 Back to Downloads' },
            type: 1
        }];

        await conn.sendMessage(from, {
            image: { url: movie.imageUrl?.replace('-200x300', '') || config.LOGO },
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

// ================ IMDb MOVIE INFO ================
cmd({
    pattern: "imdb",
    react: '🎬',
    category: "info",
    desc: "Get Movie/TV series details from IMDb",
    filename: __filename
},
async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return await reply('*Please enter a Movie or TV Series name! 🎥*');

        await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });

        const { data } = await axios.get(`http://www.omdbapi.com/?t=${encodeURIComponent(q)}&apikey=d90ff23e`);

        if (data.Response === 'False') return await reply('*No results found on IMDb! ❌*');

        let msg = `*🎬 ${data.Title}*\n\n`;
        msg += `*📅 Year:* ${data.Year}\n`;
        msg += `*⭐ Rating:* ${data.imdbRating}/10\n`;
        msg += `*⏰ Runtime:* ${data.Runtime}\n`;
        msg += `*🎭 Genre:* ${data.Genre}\n`;
        msg += `*🌍 Language:* ${data.Language}\n`;
        msg += `*🎬 Director:* ${data.Director}\n`;
        msg += `*👥 Cast:* ${data.Actors}\n\n`;
        msg += `*📝 Plot:* ${data.Plot}`;

        const imageUrl = data.Poster !== 'N/A' ? data.Poster : config.LOGO;

        const buttons = [{
            buttonId: prefix + 'mv ' + data.Title,
            buttonText: { displayText: '🔙 Search Movie' },
            type: 1
        }];

        await conn.sendMessage(from, {
            image: { url: imageUrl },
            caption: msg,
            footer: config.FOOTER,
            buttons: buttons,
            headerType: 4
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });

    } catch (e) {
        console.error("IMDb Error:", e);
        reply('🚩 *Error fetching IMDb details!*');
    }
});

// ================ HELPER FUNCTION ================
async function fetchJson(url) {
    const res = await fetch(url);
    return await res.json();
}
