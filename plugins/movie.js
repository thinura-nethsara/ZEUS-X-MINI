const config = require('../config');
const { cmd, commands } = require('../command');
const axios = require('axios');
const { getBuffer, fetchJson, sleep } = require('../lib/functions');
const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));

// ============================================================
// 📌 GLOBAL CONFIGURATION
// ============================================================
const FOOTER_TEXT = "> *_𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 𝐙𝐄𝐔𝐒 𝐈𝐍𝐂 </>_ 🇱🇰";
const BOT_LOGO = "https://zeus-x-md-database.pages.dev/Data/zeus-x-main.jpeg";

// ============================================================
// 📌 MAIN MOVIE SEARCH COMMAND (.mv)
// ============================================================
cmd({
    pattern: "mv",
    react: "🔎",
    alias: ["movie", "film", "cinema"],
    desc: "Search movies from multiple sources",
    category: "movie",
    use: '.mv <movie name>',
    filename: __filename
},
async (conn, mek, m, { from, prefix, q, reply }) => {
    try {
        if (!q) {
            return await reply(`🎬 *ZEUS X MOVIE SEARCHER*\n\n*Usage:* ${prefix}mv <movie name>\n*Example:* ${prefix}mv Avatar\n\n*Sources:*\n• CineSubz\n• Sinhalasub\n• SUB.LK`);
        }

        // Movie sources configuration
        const sources = [
            { name: "CINE SUBZ", cmd: "cine", emoji: "🎬" },
            { name: "SINHALA SUB", cmd: "sinhalasub", emoji: "🇱🇰" },
            { name: "SUB.LK", cmd: "sublk", emoji: "📽️" }
        ];

        // Create button rows for source selection
        const rows = sources.map(src => ({
            title: `${src.emoji} ${src.name}`,
            rowId: `${prefix}${src.cmd} ${q}`
        }));

        // Create list message for source selection
        const listMessage = {
            text: `🎬 *ZEUS X MOVIE SEARCH*\n\n🔍 *Searching:* ${q}\n\n📌 *Select a source to continue:*\n\n${sources.map((s, i) => `${i+1}. ${s.emoji} ${s.name}`).join('\n')}`,
            footer: FOOTER_TEXT,
            title: '🎥 Select Movie Source',
            buttonText: '📋 Choose Source',
            sections: [{
                title: `🎬 Results for "${q}"`,
                rows: rows
            }]
        };

        await conn.listMessage(from, listMessage, mek);

    } catch (e) {
        console.error("MV Command Error:", e);
        await reply(`❌ *Error:* ${e.message}`);
    }
});

// ============================================================
// 📌 CINESUBZ SEARCH (.cine)
// ============================================================
cmd({
    pattern: "cine",
    react: '🔎',
    category: "movie",
    alias: ["cz"],
    desc: "Search movies from CineSubz",
    use: ".cine <movie name>",
    filename: __filename
},
async (conn, m, mek, { from, q, prefix, reply }) => {
    try {
        if (!q) return await reply('🎬 *Please enter a movie name!*\n\n*Example:* .cine Avatar');

        // Search API
        const apiUrl = `https://mr-thinuzz-api-build.vercel.app/api/cinesubz/search?query=${encodeURIComponent(q)}&apiKey=key_13be1374312cdd0a`;
        const response = await axios.get(apiUrl);
        const result = response.data;

        if (!result.status || !result.data || result.data.all?.length === 0) {
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return await reply(`❌ *No results found for "${q}"*`);
        }

        const results = result.data.all || [];
        const total = result.total_results || results.length;

        // Create rows for list
        let rows = [];
        results.forEach((item) => {
            let cleanTitle = item.title
                .replace("Sinhala Subtitles | සිංහල උපසිරැසි සමඟ", "")
                .replace("Sinhala Subtitle | සිංහල උපසිරැසි සමඟ", "")
                .trim();
            
            const typeBadge = item.type === "TV" ? "📺" : "🎬";
            rows.push({
                title: `${typeBadge} ${cleanTitle} ${item.year ? `(${item.year})` : ''}`,
                rowId: `${prefix}cinedl ${item.link}`
            });
        });

        // Limit to 20 results
        rows = rows.slice(0, 20);

        const listMessage = {
            text: `🎬 *CINESUBZ SEARCH RESULTS*\n\n🔍 *Input:* ${q}\n📊 *Results:* ${total}\n\n📌 *Select a movie from the list below:*`,
            footer: FOOTER_TEXT,
            title: '🎥 CineSubz Movie Downloader',
            buttonText: '📋 View Results',
            sections: [{
                title: `🎬 Results for "${q}" (${total})`,
                rows: rows
            }]
        };

        await conn.listMessage(from, listMessage, mek);

    } catch (e) {
        console.error("CINE Error:", e);
        await reply(`❌ *Error:* ${e.message}`);
    }
});

// ============================================================
// 📌 CINESUBZ DOWNLOAD (.cinedl)
// ============================================================
cmd({
    pattern: "cinedl",
    react: '🎥',
    desc: "Get download links for CineSubz movie",
    filename: __filename
},
async (conn, m, mek, { from, q, prefix, reply }) => {
    try {
        if (!q) return await reply('❌ *Invalid link!*');

        const apiUrl = `https://mr-thinuzz-api-build.vercel.app/api/cinesubz/movie?url=${encodeURIComponent(q)}&apiKey=key_13be1374312cdd0a`;
        const res = await axios.get(apiUrl);
        const data = res.data;

        if (!data.status || !data.data) {
            return await reply('❌ *Error fetching movie details!*');
        }

        const movie = data.data;

        // Clean title
        let cleanTitle = movie.maintitle || movie.title || 'N/A';
        cleanTitle = cleanTitle.replace("Sinhala Subtitles | සිංහල උපසිරැසි සමඟ", "").trim();

        // Format details
        let ratingText = 'N/A';
        if (movie.imdb?.value && movie.imdb.value !== "00") {
            ratingText = movie.imdb.value;
        }

        let runtimeText = movie.runtime || 'N/A';
        if (runtimeText.startsWith("IMDb:")) {
            runtimeText = runtimeText.replace("IMDb:", "").trim();
        }

        let genres = 'Movie';
        if (movie.category?.length > 0) {
            genres = movie.category.join(', ');
        }

        // Build message
        let msg = `🎬 *${cleanTitle}*

📅 *Released:* ${movie.dateCreate || 'N/A'}
⭐ *IMDb Rating:* ${ratingText}
⏰ *Runtime:* ${runtimeText}
🎭 *Genres:* ${genres}
🌍 *Country:* ${movie.country || 'N/A'}

📥 *Download Options:*`;

        let rows = [];

        // Add download links as buttons
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
                
                rows.push({
                    buttonId: `${prefix}zdl ${dl.link}±${cleanTitle}±${movie.mainImage}±${qualityName}`,
                    buttonText: { displayText: `🎬 ${qualityName} - ${dl.size || 'N/A'}` },
                    type: 1
                });
            });
        }

        // Poster image
        let posterUrl = movie.mainImage;
        if (!posterUrl && movie.imageUrls?.length > 0) {
            posterUrl = movie.imageUrls[0];
        }

        // Send button message
        const buttonMessage = {
            image: { url: posterUrl || BOT_LOGO },
            caption: msg,
            footer: FOOTER_TEXT,
            buttons: rows,
            headerType: 4
        };

        return await conn.buttonMessage(from, buttonMessage, mek);

    } catch (e) {
        console.error("CINEDL Error:", e);
        await reply(`❌ *Error:* ${e.message}`);
    }
});

// ============================================================
// 📌 ZEUS DOWNLOAD (.zdl) - Direct Download Handler
// ============================================================
cmd({
    pattern: "zdl",
    react: "⬇️",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return await reply('❌ *Invalid request!*');

        const [movieUrl, movieName, thumbUrl, quality] = q.split("±");
        if (!movieUrl || !movieName) return await reply('⚠️ *Invalid Format!*');

        // Get download link from API
        const apiUrl = `https://mr-thinuzz-api-build.vercel.app/api/cinesubz/download?url=${encodeURIComponent(movieUrl)}&apiKey=key_13be1374312cdd0a`;
        const response = await fetchJson(apiUrl);

        let downloadUrl = null;
        let fileSize = "Unknown";

        if (response?.status && response?.data?.downloadUrls) {
            // Prefer direct links over Telegram links
            const directLink = response.data.downloadUrls.find(item => 
                item.url && !item.url.includes("t.me") && !item.url.includes("telegram")
            );
            if (directLink) {
                downloadUrl = directLink.url;
                fileSize = response.data.size || "Unknown";
            } else {
                // If only Telegram links available, use the first one
                const telegramLink = response.data.downloadUrls.find(item => item.url);
                if (telegramLink) {
                    downloadUrl = telegramLink.url;
                    fileSize = response.data.size || "Unknown";
                }
            }
        }

        if (!downloadUrl) {
            return await reply('❌ *No download link available!*');
        }

        // Send loading status
        await conn.sendMessage(from, { react: { text: '⬆️', key: mek.key } });

        // Process thumbnail
        let thumbBuffer = null;
        if (thumbUrl && thumbUrl !== 'undefined') {
            try {
                const thumbResponse = await fetch(thumbUrl);
                if (thumbResponse.ok) {
                    thumbBuffer = await thumbResponse.buffer();
                }
            } catch (e) {
                console.log("Thumb error:", e.message);
            }
        }

        // Clean movie name
        const cleanName = movieName.replace("Sinhala Subtitles", "").trim();

        // Send the movie
        await conn.sendMessage(config.JID || from, {
            document: { url: downloadUrl },
            mimetype: 'video/mp4',
            fileName: `🎬 ${cleanName}.mp4`,
            caption: `🎬 *${cleanName}*\n\n*\`${quality}\`*\n\n${FOOTER_TEXT}`,
            jpegThumbnail: thumbBuffer || null
        });

        await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

    } catch (e) {
        console.error("ZDL Error:", e);
        await reply(`❌ *Error:* ${e.message}`);
    }
});

// ============================================================
// 📌 SINHALASUB SEARCH (.sinhalasub)
// ============================================================
cmd({
    pattern: "sinhalasub",
    react: '🔎',
    category: "movie",
    desc: "Search movies from Sinhalasub.lk",
    use: ".sinhalasub <movie name>",
    filename: __filename
},
async (conn, m, mek, { from, q, prefix, reply }) => {
    try {
        if (!q) return await reply('🎬 *Please enter a movie name!*\n\n*Example:* .sinhalasub Avatar');

        const apiUrl = `https://mr-thinuzz-api-build.vercel.app/api/sinhalasub?keyword=${encodeURIComponent(q)}&apiKey=key_13be1374312cdd0a`;
        const response = await axios.get(apiUrl);
        const result = response.data;

        if (!result.status || !result.data || result.data.length === 0) {
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return await reply(`❌ *No results found for "${q}"*`);
        }

        let rows = [];
        result.data.forEach((movie) => {
            let cleanTitle = movie.Title
                .replace("Sinhala Subtitles | සිංහල උපසිරැසි සමඟ", "")
                .replace("Sinhala Subtitle | සිංහල උපසිරැසි සමඟ", "")
                .trim();
            
            const yearInfo = movie.Year ? ` (${movie.Year})` : '';
            const ratingInfo = movie.Rating && movie.Rating !== "N/A" ? ` ⭐${movie.Rating}` : '';
            
            rows.push({
                title: `${cleanTitle}${yearInfo}${ratingInfo}`,
                rowId: `${prefix}sinfodl ${movie.Link}`
            });
        });

        rows = rows.slice(0, 20);

        const listMessage = {
            text: `🎬 *SINHALASUB SEARCH RESULTS*\n\n🔍 *Input:* ${q}\n📊 *Results:* ${result.total_results || result.data.length}\n\n📌 *Select a movie from the list below:*`,
            footer: FOOTER_TEXT,
            title: '🇱🇰 Sinhalasub Movie Downloader',
            buttonText: '📋 View Results',
            sections: [{
                title: `🎬 Results for "${q}"`,
                rows: rows
            }]
        };

        await conn.listMessage(from, listMessage, mek);

    } catch (e) {
        console.error("SINHALASUB Error:", e);
        await reply(`❌ *Error:* ${e.message}`);
    }
});

// ============================================================
// 📌 SINHALASUB INFO (.sinfodl)
// ============================================================
cmd({
    pattern: "sinfodl",
    react: '🎥',
    desc: "Get download links from Sinhalasub",
    filename: __filename
},
async (conn, m, mek, { from, q, prefix, reply }) => {
    try {
        if (!q) return await reply('❌ *Invalid link!*');

        const apiUrl = `https://mr-thinuzz-api-build.vercel.app/api/sinhalasub?url=${encodeURIComponent(q)}&apiKey=key_13be1374312cdd0a`;
        const res = await axios.get(apiUrl);
        const movie = res.data.data;

        if (!movie) {
            return await reply('❌ *Error fetching movie details!*');
        }

        // Format genres
        let genres = 'N/A';
        if (movie.genres?.length > 0) {
            genres = movie.genres.join(', ');
        }

        let cleanTitle = movie.title || 'N/A';
        cleanTitle = cleanTitle.replace("Sinhala Subtitles", "").trim();

        let msg = `🎬 *${cleanTitle}*

📅 *Released:* ${movie.release_date || 'N/A'}
⭐ *IMDb Rating:* ${movie.imdb_rating || 'N/A'}
⏰ *Runtime:* ${movie.runtime || 'N/A'}
🎭 *Genres:* ${genres}
📝 *Description:* ${movie.description ? movie.description.substring(0, 100) + '...' : 'N/A'}

📥 *Download Options:*`;

        let rows = [];

        // Download links with duplicate removal
        if (movie.download_links && movie.download_links.length > 0) {
            const uniqueQualities = new Map();
            movie.download_links.forEach((dl) => {
                if (dl.quality === "SRT") return;
                if (dl.provider === "Telegram") return;
                
                const qualityKey = dl.quality;
                if (!uniqueQualities.has(qualityKey)) {
                    uniqueQualities.set(qualityKey, dl);
                }
            });
            
            Array.from(uniqueQualities.values()).forEach((dl) => {
                rows.push({
                    buttonId: `${prefix}sdl ${dl.url}±${cleanTitle}±${movie.poster}±${dl.quality}`,
                    buttonText: { displayText: `${dl.quality} - ${dl.size}` },
                    type: 1
                });
            });
        }

        const posterUrl = movie.poster || BOT_LOGO;

        const buttonMessage = {
            image: { url: posterUrl },
            caption: msg,
            footer: FOOTER_TEXT,
            buttons: rows,
            headerType: 4
        };

        return await conn.buttonMessage(from, buttonMessage, mek);

    } catch (e) {
        console.error("SINFODL Error:", e);
        await reply(`❌ *Error:* ${e.message}`);
    }
});

// ============================================================
// 📌 SINHALASUB DIRECT DOWNLOAD (.sdl)
// ============================================================
cmd({
    pattern: "sdl",
    react: "⬇️",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return await reply('❌ *Invalid request!*');
        
        const [movieUrl, movieName, thumbUrl, quality] = q.split("±");
        if (!movieUrl || !movieName) return await reply('⚠️ *Invalid Format!*');

        // Convert Pixeldrain links
        let directLink = movieUrl;
        if (movieUrl.includes("/u/")) {
            directLink = movieUrl.replace("/u/", "/api/file/");
        }

        // Process thumbnail
        let thumbBuffer = null;
        if (thumbUrl && thumbUrl !== 'undefined') {
            try {
                const thumbResponse = await fetch(thumbUrl);
                if (thumbResponse.ok) {
                    thumbBuffer = await thumbResponse.buffer();
                }
            } catch (e) {
                console.log("Thumb error:", e.message);
            }
        }

        const cleanName = movieName
            .replace("Sinhala Subtitles", "")
            .replace("Sinhala Subtitle", "")
            .trim();

        await conn.sendMessage(from, { react: { text: '⬆️', key: mek.key } });

        await conn.sendMessage(config.JID || from, {
            document: { url: directLink },
            mimetype: 'video/mp4',
            fileName: `🎬 ${cleanName}.mp4`,
            caption: `🎬 *${cleanName}*\n\n*\`${quality}\`*\n\n${FOOTER_TEXT}`,
            jpegThumbnail: thumbBuffer || null
        });

        await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

    } catch (e) {
        console.error("SDL Error:", e);
        await reply(`❌ *Error:* ${e.message}`);
    }
});

// ============================================================
// 📌 SUB.LK SEARCH (.sublk)
// ============================================================
cmd({
    pattern: "sublk",
    react: '🔎',
    category: "movie",
    desc: "Search movies from SUB.LK",
    use: ".sublk <movie name>",
    filename: __filename
},
async (conn, m, mek, { from, q, prefix, reply }) => {
    try {
        if (!q) return await reply('🎬 *Please enter a movie name!*\n\n*Example:* .sublk Avatar');

        const url = await fetchJson(`https://visper-md-ap-is.vercel.app/movie/sublk/SEARCH?q=${encodeURIComponent(q)}`);

        if (!url?.result || url.result.length === 0) {
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return await reply(`❌ *No results found for "${q}"*`);
        }

        let rows = url.result.map((item) => ({
            title: item.title || 'Unknown Title',
            rowId: `${prefix}sublkdl ${item.link}&${item.year || 'N/A'}`
        }));

        rows = rows.slice(0, 20);

        const listMessage = {
            text: `🎬 *SUB.LK SEARCH RESULTS*\n\n🔍 *Input:* ${q}\n📊 *Results:* ${url.result.length}\n\n📌 *Select a movie from the list below:*`,
            footer: FOOTER_TEXT,
            title: '📽️ SUB.LK Movie Downloader',
            buttonText: '📋 View Results',
            sections: [{
                title: `🎬 Results for "${q}"`,
                rows: rows
            }]
        };

        await conn.listMessage(from, listMessage, mek);

    } catch (e) {
        console.error("SUBLK Error:", e);
        await reply(`❌ *Error:* ${e.message}`);
    }
});

// ============================================================
// 📌 SUB.LK DOWNLOAD (.sublkdl)
// ============================================================
cmd({
    pattern: "sublkdl",
    react: '🎥',
    desc: "Get download links from SUB.LK",
    filename: __filename
},
async (conn, m, mek, { from, q, prefix, reply }) => {
    try {
        if (!q || !q.includes('https://sub.lk/movies/')) {
            return await reply('❌ *Invalid link! Please search using .sublk first.*');
        }

        const data = await fetchJson(`https://sadaslk-apis.vercel.app/api/v1/movie/sublk/infodl?q=${q}&apiKey=sadasggggg`);
        const movie = data.data;

        if (!movie) return await reply('❌ *No details found!*');

        let msg = `🎬 *${movie.title || 'N/A'}*
${movie.tagline ? `✨ *Tagline:* ${movie.tagline}` : ''}

📅 *Release Date:* ${movie.releaseDate || 'N/A'}
🌍 *Country:* ${movie.country || 'N/A'}
⭐ *Rating:* ${movie.ratingValue || 'N/A'} (${movie.ratingCount || 'N/A'})
⏰ *Runtime:* ${movie.runtime || 'N/A'}
🎭 *Genres:* ${movie.genres?.join(', ') || 'N/A'}

📥 *Download Options:*`;

        let rows = [];

        if (movie.pixeldrainDownloads?.length > 0) {
            movie.pixeldrainDownloads.forEach((dl) => {
                rows.push({
                    buttonId: `${prefix}sublkdl2 ${dl.finalDownloadUrl}±${movie.imageUrl}±${movie.title}±${dl.quality}`,
                    buttonText: { displayText: `${dl.size} - ${dl.quality}` },
                    type: 1
                });
            });
        }

        const highQualityImg = movie.imageUrl?.replace('-200x300', '') || BOT_LOGO;

        const buttonMessage = {
            image: { url: highQualityImg },
            caption: msg,
            footer: FOOTER_TEXT,
            buttons: rows,
            headerType: 4
        };

        return await conn.buttonMessage(from, buttonMessage, mek);

    } catch (e) {
        console.error("SUBLKDL Error:", e);
        await reply(`❌ *Error:* ${e.message}`);
    }
});

// ============================================================
// 📌 SUB.LK DIRECT DOWNLOAD (.sublkdl2)
// ============================================================
cmd({
    pattern: "sublkdl2",
    react: "⬇️",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return await reply('❌ *Invalid request!*');

        const [megaUrl, imglink, title, quality] = q.split("±");
        if (!megaUrl || !title) return await reply('⚠️ *Invalid Format!*');

        await conn.sendMessage(from, { react: { text: '⬆️', key: mek.key } });

        // Get Mega download link
        const apiUrl = `https://sadaslk-fast-mega-dl.vercel.app/mega?q=${encodeURIComponent(megaUrl.trim())}`;
        const megaApi = await fetchJson(apiUrl);
        
        if (!megaApi?.status || !megaApi?.result?.download) {
            return await reply('❌ *Failed to fetch download link!*');
        }

        const directDownloadUrl = megaApi.result.download;
        const fileName = megaApi.result.name || title;

        // Process thumbnail
        let thumbBuffer = null;
        if (imglink && imglink !== 'undefined') {
            try {
                const thumbResponse = await fetch(imglink.trim());
                if (thumbResponse.ok) {
                    thumbBuffer = await thumbResponse.buffer();
                }
            } catch (e) {}
        }

        await conn.sendMessage(config.JID || from, {
            document: { url: directDownloadUrl },
            caption: `🎬 *${title}*\n\n*\`${quality}\`*\n\n${FOOTER_TEXT}`,
            mimetype: "video/mp4",
            jpegThumbnail: thumbBuffer || null,
            fileName: `🎬 ${fileName}.mp4`,
        });

        await conn.sendMessage(from, { react: { text: '✔️', key: mek.key } });

    } catch (e) {
        console.error("SUBLKDL2 Error:", e);
        await reply(`❌ *Error:* ${e.message}`);
    }
});

// ============================================================
// 📌 IMDb INFO (.imdb)
// ============================================================
cmd({
    pattern: "imdb",
    react: '🎬',
    category: "info",
    desc: "Get Movie/TV series details from IMDb",
    use: ".imdb <movie name>",
    filename: __filename
},
async (conn, m, mek, { from, q, reply }) => {
    try {
        if (!q) return await reply('🎬 *Please enter a Movie or TV Series name!*\n\n*Example:* .imdb Avatar');

        const { data } = await axios.get(`http://www.omdbapi.com/?t=${encodeURIComponent(q)}&apikey=d90ff23e`);

        if (data.Response === 'False') {
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return await reply(`❌ *No results found for "${q}" on IMDb!*`);
        }

        // Get poster
        let imageUrl = data.Poster !== 'N/A' ? data.Poster : BOT_LOGO;

        // Try to get image from alternative source if not available
        if (data.Poster === 'N/A') {
            try {
                const searchRes = await axios.get(`https://tharuzz-movie-api.vercel.app/api/cinesub/search?query=${encodeURIComponent(q)}`);
                if (searchRes.data?.result?.length > 0) {
                    const movieUrl = searchRes.data.result[0].link;
                    const infoRes = await axios.get(`https://api-dark-shan-yt.koyeb.app/movie/cinesubz-info?url=${encodeURIComponent(movieUrl)}&apikey=6bb99ab216a7fb7f`);
                    if (infoRes.data?.data?.image) {
                        imageUrl = infoRes.data.data.image;
                    }
                }
            } catch (err) {
                console.log("Image fallback error:", err.message);
            }
        }

        let msg = `🎬 *${data.Title}*

📅 *Year:* ${data.Year}
⭐ *IMDb Rating:* ${data.imdbRating}/10
⏰ *Runtime:* ${data.Runtime}
🎭 *Genre:* ${data.Genre}
🌍 *Language:* ${data.Language}
🎬 *Director:* ${data.Director}
👥 *Cast:* ${data.Actors}
🏆 *Awards:* ${data.Awards}

📝 *Plot:* ${data.Plot}

${FOOTER_TEXT}`;

        await conn.sendMessage(from, {
            image: { url: imageUrl },
            caption: msg
        });

        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });

    } catch (e) {
        console.error("IMDb Error:", e);
        await reply(`❌ *Error:* ${e.message}`);
    }
});

// ============================================================
// 📌 EXPORT
// ============================================================
module.exports = { commands };
