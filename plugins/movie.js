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

        // Get bot settings
        const settings = userSettings || global.CURRENT_BOT_SETTINGS || {};
        const isButtonsOn = settings.buttons === 'true';
        const botName = settings.botName || config.DEFAULT_BOT_NAME || "ZEUS-X-MINI";

        const sources = [
            { name: "🎬 CINESUBZ", cmd: "cine" },
            { name: "🇱🇰 SINHALASUB", cmd: "sinhalasub" },
            { name: "📽️ SUBLK", cmd: "sublk" }
        ];

        // Use logo from config
        const imageUrl = config.LOGO || 'https://i.ibb.co/cXYtgWPV/Whats-App-Image-2026-06-18-at-7-35-46-PM.png';

        const caption = `*🎬 ${botName} MOVIE SYSTEM*\n\n` +
                       `*\`🔍 Search :\`* ${q}\n\n` +
                       `*🌟 Select your preferred movie site below*`;

        if (isButtonsOn) {
            // Button Mode
            const listButtons = {
                title: "❯❯ Choose Movie Source ❮❮",
                sections: [{
                    title: "📺 MOVIE SOURCES",
                    rows: sources.map(src => ({
                        title: `${src.name}`,
                        description: `Search "${q}" on ${src.name}`,
                        id: prefix + src.cmd + ' ' + q
                    }))
                }]
            };

            await conn.sendMessage(from, {
                image: { url: imageUrl },
                caption: caption,
                footer: config.FOOTER || `© ${botName}`,
                buttons: [{
                    buttonId: "movie_menu",
                    buttonText: { displayText: "🎥 Select Source" },
                    type: 4,
                    nativeFlowInfo: {
                        name: "single_select",
                        paramsJson: JSON.stringify(listButtons)
                    }
                }],
                headerType: 1,
                viewOnce: true
            }, { quoted: mek });
        } else {
            // Text Mode
            let textMsg = caption + '\n\n*Reply with number:*\n';
            sources.forEach((src, i) => {
                textMsg += `\n${i+1}. ${src.name}`;
            });
            textMsg += `\n\n> _𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 ${botName} </>_`;

            await conn.sendMessage(from, {
                image: { url: imageUrl },
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
async (conn, mek, m, { from, prefix, q, reply }) => {
    try {
        if (!q) return await reply('*Please give me a movie name 🎬*');

        // API call
        const apiUrl = `https://mr-thinuzz-api-build.vercel.app/api/cinesubz/search?query=${encodeURIComponent(q)}&apiKey=key_13be1374312cdd0a`;
        const response = await axios.get(apiUrl);
        const result = response.data;

        if (!result.status || !result.data || result.data.all?.length === 0) {
            return await reply('*No results found ❌*');
        }

        const results = result.data.all || [];
        let rows = [];

        results.forEach((item) => {
            let cleanTitle = item.title
                .replace("Sinhala Subtitles | සිංහල උපසිරැසි සමඟ", "")
                .replace("Sinhala Subtitle | සිංහල උපසිරැසි සමඟ", "")
                .trim();
            
            const typeBadge = item.type === "TV" ? "📺" : "🎬";
            rows.push({
                title: `${typeBadge} ${cleanTitle}`,
                description: `${item.year || 'N/A'} | ${item.type || 'Movie'}`,
                rowId: `${prefix}cinedl2 ${item.link}`
            });
        });

        // Limit to 20 results
        rows = rows.slice(0, 20);

        const listMessage = {
            text: `*🎬 CINESUBZ SEARCH RESULTS*\n\n*🔍 Input:* ${q}\n*📊 Found:* ${result.total_results || results.length} results\n\n*Select a movie below to get download links*`,
            footer: config.FOOTER || `© ZEUS-X-MINI`,
            title: '🎥 Cinesubz Results',
            buttonText: '📋 View Movies',
            sections: [{
                title: `📺 Results for "${q}"`,
                rows: rows
            }]
        };

        await conn.listMessage(from, listMessage, mek);

    } catch (e) {
        console.log("CINE Error:", e);
        await reply('🚩 *Error fetching data!*\n\n' + e.message);
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

        // Show loading
        await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });

        const apiUrl = `https://mr-thinuzz-api-build.vercel.app/api/cinesubz/movie?url=${encodeURIComponent(q)}&apiKey=key_13be1374312cdd0a`;
        const res = await axios.get(apiUrl);
        const movie = res.data.data;

        if (!movie) {
            return await reply('🚩 *Error fetching movie details!*');
        }

        // Clean title
        let cleanTitle = movie.maintitle || movie.title || 'N/A';
        cleanTitle = cleanTitle.replace("Sinhala Subtitles | සිංහල උපසිරැසි සමඟ", "").trim();
        cleanTitle = cleanTitle.replace("Sinhala Subtitle | සිංහල උපසිරැසි සමඟ", "").trim();

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

        // Format message
        let msg = `*🎬 ${cleanTitle}*\n\n`;
        msg += `*📅 Year:* ${movie.dateCreate || 'N/A'}\n`;
        msg += `*⭐ Rating:* ${rating}\n`;
        msg += `*⏰ Runtime:* ${movie.runtime || 'N/A'}\n`;
        msg += `*🎭 Genres:* ${genres}\n`;
        msg += `*🌍 Country:* ${movie.country || 'N/A'}\n\n`;
        msg += `*📥 Select quality below:*`;

        let buttons = [];

        // Download links
        if (movie.downloadUrl && movie.downloadUrl.length > 0) {
            // Remove duplicates
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
                    buttonText: { displayText: `🎬 ${qualityName} (${dl.size || 'N/A'})` },
                    type: 1
                });
            });
        }

        if (buttons.length === 0) {
            return await reply('*No download links available for this movie!*');
        }

        // Poster image
        const posterUrl = movie.mainImage || movie.posterUrl || config.LOGO;

        // Send button message
        await conn.buttonMessage(from, {
            image: { url: posterUrl },
            caption: msg,
            footer: config.FOOTER || '© ZEUS-X-MINI',
            buttons: buttons,
            headerType: 4
        }, mek);

    } catch (e) {
        console.log("CINEDL2 Error:", e);
        await reply('🚩 *Error occurred!*\n\n' + e.message);
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

        // Show loading
        await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });

        // Get download link
        const apiUrl = `https://mr-thinuzz-api-build.vercel.app/api/cinesubz/download?url=${encodeURIComponent(movieUrl)}&apiKey=key_13be1374312cdd0a`;
        const response = await axios.get(apiUrl);

        if (!response?.data?.status || !response?.data?.data?.downloadUrls) {
            return await reply('*❌ Download link not found!*');
        }

        // Find direct link (not Telegram)
        const directLink = response.data.data.downloadUrls.find(item => 
            item.url && !item.url.includes("t.me") && !item.url.includes("telegram")
        );

        if (!directLink) {
            return await reply('*❌ No direct download link available! Only Telegram links found.*');
        }

        // Clean movie name
        let cleanName = movieName
            .replace("Sinhala Subtitles | සිංහල උපසිරැසි සමඟ", "")
            .replace("Sinhala Subtitle | සිංහල උපසිරැසි සමඟ", "")
            .trim();

        // Process thumbnail
        let thumbBuffer = null;
        if (thumbUrl && thumbUrl !== 'undefined') {
            try {
                const thumbRes = await fetch(thumbUrl);
                if (thumbRes.ok) {
                    thumbBuffer = await thumbRes.buffer();
                }
            } catch (e) { /* ignore */ }
        }

        // Send upload status
        await conn.sendMessage(from, { text: '*⬆️ Uploading your movie...*' }, { quoted: mek });

        // Send to JID or current chat
        const targetJid = config.JID || from;

        // Send document
        await conn.sendMessage(targetJid, {
            document: { url: directLink.url },
            mimetype: 'video/mp4',
            fileName: `🎬 ${cleanName}.mp4`,
            caption: `*🎬 Name:* ${cleanName}\n\n*\`${quality}\`*\n\n© ZEUS-X-MINI`,
            jpegThumbnail: thumbBuffer
        }, { quoted: mek });

        // Success reaction
        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });

    } catch (e) {
        console.log("Download Error:", e);
        await reply(`*❌ Error:* ${e.message}`);
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
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

        const apiUrl = `https://mr-thinuzz-api-build.vercel.app/api/sinhalasub?keyword=${encodeURIComponent(q)}&apiKey=key_13be1374312cdd0a`;
        const response = await axios.get(apiUrl);
        const result = response.data;

        if (!result.status || !result.data || result.data.length === 0) {
            return await reply('*No results found ❌*');
        }

        let rows = [];
        result.data.forEach((movie) => {
            let cleanTitle = movie.Title
                .replace("Sinhala Subtitles | සිංහල උපසිරැසි සමඟ", "")
                .replace("Sinhala Subtitle | සිංහල උපසිරැසි සමඟ", "")
                .trim();
            
            let yearInfo = movie.Year ? ` (${movie.Year})` : '';
            let ratingInfo = movie.Rating && movie.Rating !== "N/A" ? ` ⭐${movie.Rating}` : '';
            
            rows.push({
                title: `${cleanTitle}${yearInfo}${ratingInfo}`,
                rowId: `${prefix}sinfo ${movie.Link}`
            });
        });

        rows = rows.slice(0, 20);

        const listMessage = {
            text: `*🇱🇰 SINHALASUB MOVIE SEARCH*\n\n*🔍 Input:* ${q}\n*📊 Found:* ${result.total_results || result.data.length} results\n\n*Select a movie below*`,
            footer: config.FOOTER || '© ZEUS-X-MINI',
            title: '🎥 SinhalaSub Results',
            buttonText: '📋 View Movies',
            sections: [{
                title: `🇱🇰 Results for "${q}"`,
                rows: rows
            }]
        };

        await conn.listMessage(from, listMessage, mek);

    } catch (e) {
        console.log("SINHALASUB Error:", e);
        await reply('🚩 *Error fetching data!*');
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
            return await reply('🚩 *Error fetching movie details!*');
        }

        // Format genres
        let genres = 'N/A';
        if (movie.genres && movie.genres.length > 0) {
            genres = movie.genres.join(', ');
        }

        // Clean title
        let cleanTitle = movie.title || 'N/A';
        cleanTitle = cleanTitle.replace("Sinhala Subtitles", "").trim();

        // Format message
        let msg = `*🇱🇰 ${cleanTitle}*\n\n`;
        msg += `*📅 Year:* ${movie.release_date || 'N/A'}\n`;
        msg += `*⭐ Rating:* ${movie.imdb_rating || 'N/A'}\n`;
        msg += `*⏰ Runtime:* ${movie.runtime || 'N/A'}\n`;
        msg += `*🎭 Genres:* ${genres}\n\n`;
        msg += `*📥 Select quality below:*`;

        let buttons = [];

        // Download links
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
                    buttonText: { displayText: `🎬 ${dl.quality} (${dl.size})` },
                    type: 1
                });
            });
        }

        if (buttons.length === 0) {
            return await reply('*No download links available!*');
        }

        const posterUrl = movie.poster || config.LOGO;

        await conn.buttonMessage(from, {
            image: { url: posterUrl },
            caption: msg,
            footer: config.FOOTER || '© ZEUS-X-MINI',
            buttons: buttons,
            headerType: 4
        }, mek);

    } catch (e) {
        console.log("SINFO Error:", e);
        await reply('🚩 *Error occurred!*');
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

        // Process Pixeldrain link if needed
        let directLink = movieUrl;
        if (movieUrl.includes("/u/")) {
            directLink = movieUrl.replace("/u/", "/api/file/");
        }

        // Clean movie name
        let cleanName = movieName
            .replace("Sinhala Subtitles | සිංහල උපසිරැසි සමඟ", "")
            .replace("Sinhala Subtitle | සිංහල උපසිරැසි සමඟ", "")
            .trim();

        // Process thumbnail
        let thumbBuffer = null;
        if (thumbUrl && thumbUrl !== 'undefined') {
            try {
                const thumbRes = await fetch(thumbUrl);
                if (thumbRes.ok) {
                    thumbBuffer = await thumbRes.buffer();
                }
            } catch (e) { /* ignore */ }
        }

        await conn.sendMessage(from, { text: '*⬆️ Uploading your movie...*' }, { quoted: mek });

        const targetJid = config.JID || from;

        await conn.sendMessage(targetJid, {
            document: { url: directLink },
            mimetype: 'video/mp4',
            fileName: `🎬 ${cleanName}.mp4`,
            caption: `*🎬 Name:* ${cleanName}\n\n*\`${quality}\`*\n\n© ZEUS-X-MINI`,
            jpegThumbnail: thumbBuffer
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });

    } catch (e) {
        console.log("Download Error:", e);
        await reply(`*❌ Error:* ${e.message}`);
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

        const url = await fetchJson(`https://visper-md-ap-is.vercel.app/movie/sublk/SEARCH?q=${encodeURIComponent(q)}`);

        if (!url || !url.result || url.result.length === 0) {
            return await reply('*No results found ❌*');
        }

        let rows = [];
        url.result.forEach((movie) => {
            rows.push({
                title: movie.title || 'Unknown',
                description: movie.year || '',
                rowId: prefix + `sdlk ${movie.link}&${movie.year}`
            });
        });

        rows = rows.slice(0, 20);

        const listMessage = {
            text: `*📽️ SUB.LK MOVIE SEARCH*\n\n*🔍 Input:* ${q}\n*📊 Found:* ${url.result.length} results\n\n*Select a movie below*`,
            footer: config.FOOTER || '© ZEUS-X-MINI',
            title: '🎥 SUB.LK Results',
            buttonText: '📋 View Movies',
            sections: [{
                title: `📽️ Results for "${q}"`,
                rows: rows
            }]
        };

        await conn.listMessage(from, listMessage, mek);

    } catch (e) {
        console.log("SUBLK Error:", e);
        await reply('🚩 *Error fetching results!*');
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

        let data = await fetchJson(`https://sadaslk-apis.vercel.app/api/v1/movie/sublk/infodl?q=${q}&apiKey=sadasggggg`);
        const movie = data.data;

        if (!movie) return await reply('*🚩 No details found!*');

        let msg = `*📽️ ${movie.title || 'N/A'}*\n\n`;
        msg += `*📅 Release:* ${movie.releaseDate || 'N/A'}\n`;
        msg += `*🌍 Country:* ${movie.country || 'N/A'}\n`;
        msg += `*⭐ Rating:* ${movie.ratingValue || 'N/A'} (${movie.ratingCount || 'N/A'})\n`;
        msg += `*⏰ Runtime:* ${movie.runtime || 'N/A'}\n`;
        msg += `*🎭 Genres:* ${movie.genres?.join(', ') || 'N/A'}\n\n`;
        msg += `*📥 Select quality below:*`;

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

        if (buttons.length === 0) {
            return await reply('*No download links available!*');
        }

        const imageUrl = movie.imageUrl?.replace('-200x300', '') || config.LOGO;

        await conn.buttonMessage(from, {
            image: { url: imageUrl },
            caption: msg,
            footer: config.FOOTER || '© ZEUS-X-MINI',
            buttons: buttons,
            headerType: 4
        }, mek);

    } catch (e) {
        console.log("SDLK Error:", e);
        await reply('🚩 *Error occurred!*');
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

        // Get Mega download link
        const apiUrl = `https://sadaslk-fast-mega-dl.vercel.app/mega?q=${encodeURIComponent(megaUrl.trim())}`;
        let megaApi = await fetchJson(apiUrl);
        
        if (!megaApi.status || !megaApi.result || !megaApi.result.download) {
            return await reply("🚫 *Failed to fetch download link!*");
        }

        const directDownloadUrl = megaApi.result.download;
        const fileName = megaApi.result.name || title;

        // Process thumbnail
        let thumbBuffer = null;
        if (imglink) {
            try {
                const thumbRes = await fetch(imglink.trim());
                if (thumbRes.ok) {
                    thumbBuffer = await thumbRes.buffer();
                }
            } catch (e) { /* ignore */ }
        }

        await conn.sendMessage(from, { text: '*⬆️ Uploading your movie...*' }, { quoted: mek });

        const targetJid = config.JID || from;

        await conn.sendMessage(targetJid, {
            document: { url: directDownloadUrl },
            caption: `🎬 *${title}*\n\n*\`${quality}\`*\n\n© ZEUS-X-MINI`,
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

        await conn.sendMessage(from, {
            image: { url: imageUrl },
            caption: msg
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
