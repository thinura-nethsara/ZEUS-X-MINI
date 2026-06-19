const config = require('../config');
const { cmd, commands } = require('../command');
const axios = require('axios');
const { getBuffer, fetchJson, sleep, runtime, h2k, isUrl, Json } = require('../lib/functions');
const { sms } = require('../lib/msg');

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
async (zanta, mek, m, { from, prefix, q, reply, sender, isOwner }) => {
    try {
        if (!q) {
            return await reply(`🎬 *ZEUS X MOVIE SEARCHER*\n\n*Usage:* ${prefix}mv <movie name>\n*Example:* ${prefix}mv Avatar\n\n*Sources:*\n• CineSubz 🎬\n• Sinhalasub 🇱🇰\n• SUB.LK 📽️`);
        }

        const sources = [
            { name: "CINE SUBZ", cmd: "cine", emoji: "🎬" },
            { name: "SINHALA SUB", cmd: "sinhalasub", emoji: "🇱🇰" },
            { name: "SUB.LK", cmd: "sublk", emoji: "📽️" }
        ];

        // Using ZEUS buttonMessage with buttons
        const buttons = sources.map(src => ({
            buttonId: `${prefix}${src.cmd} ${q}`,
            buttonText: { displayText: `${src.emoji} ${src.name}` },
            type: 1
        }));

        const buttonMessage = {
            image: { url: BOT_LOGO },
            caption: `🎬 *ZEUS X MOVIE SEARCH*\n\n🔍 *Searching:* ${q}\n\n📌 *Select a source to continue:*`,
            footer: FOOTER_TEXT,
            buttons: buttons,
            headerType: 4
        };

        await zanta.buttonMessage(from, buttonMessage, mek);

    } catch (e) {
        console.error("MV Error:", e);
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
async (zanta, mek, m, { from, q, prefix, reply }) => {
    try {
        if (!q) return await reply('🎬 *Please enter a movie name!*\n\n*Example:* .cine Avatar');

        const result = await fetchJson(`https://mr-thinuzz-api-build.vercel.app/api/cinesubz/search?query=${encodeURIComponent(q)}&apiKey=key_13be1374312cdd0a`);

        if (!result.status || !result.data || result.data.all?.length === 0) {
            await m.react('❌');
            return await reply(`❌ *No results found for "${q}"*`);
        }

        const results = result.data.all || [];
        const total = result.total_results || results.length;

        // Create buttons for each movie (max 10)
        let buttons = [];
        results.slice(0, 10).forEach((item) => {
            let cleanTitle = item.title
                .replace("Sinhala Subtitles | සිංහල උපසිරැසි සමඟ", "")
                .replace("Sinhala Subtitle | සිංහල උපසිරැසි සමඟ", "")
                .trim();
            
            const typeBadge = item.type === "TV" ? "📺" : "🎬";
            const displayTitle = cleanTitle.length > 30 ? cleanTitle.substring(0, 27) + '...' : cleanTitle;
            
            buttons.push({
                buttonId: `${prefix}cinedl ${item.link}`,
                buttonText: { displayText: `${typeBadge} ${displayTitle} ${item.year ? `(${item.year})` : ''}` },
                type: 1
            });
        });

        // If more than 10 results, add a "Next" button
        if (results.length > 10) {
            buttons.push({
                buttonId: `${prefix}cine ${q} more`,
                buttonText: { displayText: `📋 Next ${results.length - 10} results...` },
                type: 1
            });
        }

        const buttonMessage = {
            image: { url: BOT_LOGO },
            caption: `🎬 *CINESUBZ SEARCH RESULTS*\n\n🔍 *Input:* ${q}\n📊 *Results:* ${total}\n\n📌 *Select a movie from below:*`,
            footer: FOOTER_TEXT,
            buttons: buttons,
            headerType: 4
        };

        await zanta.buttonMessage(from, buttonMessage, mek);

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
async (zanta, mek, m, { from, q, prefix, reply }) => {
    try {
        if (!q) return await reply('❌ *Invalid link!*');

        const data = await fetchJson(`https://mr-thinuzz-api-build.vercel.app/api/cinesubz/movie?url=${encodeURIComponent(q)}&apiKey=key_13be1374312cdd0a`);

        if (!data.status || !data.data) {
            return await reply('❌ *Error fetching movie details!*');
        }

        const movie = data.data;

        let cleanTitle = movie.maintitle || movie.title || 'N/A';
        cleanTitle = cleanTitle.replace("Sinhala Subtitles | සිංහල උපසිරැසි සමඟ", "").trim();

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

        let msg = `🎬 *${cleanTitle}*

📅 *Released:* ${movie.dateCreate || 'N/A'}
⭐ *IMDb Rating:* ${ratingText}
⏰ *Runtime:* ${runtimeText}
🎭 *Genres:* ${genres}
🌍 *Country:* ${movie.country || 'N/A'}

📥 *Download Options:*`;

        let buttons = [];

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
                    buttonId: `${prefix}zdl ${dl.link}±${cleanTitle}±${movie.mainImage}±${qualityName}`,
                    buttonText: { displayText: `🎬 ${qualityName} - ${dl.size || 'N/A'}` },
                    type: 1
                });
            });
        }

        // Add details button
        buttons.push({
            buttonId: `${prefix}mvcard ${cleanTitle}`,
            buttonText: { displayText: `📋 Full Details` },
            type: 1
        });

        let posterUrl = movie.mainImage;
        if (!posterUrl && movie.imageUrls?.length > 0) {
            posterUrl = movie.imageUrls[0];
        }

        const buttonMessage = {
            image: { url: posterUrl || BOT_LOGO },
            caption: msg,
            footer: FOOTER_TEXT,
            buttons: buttons,
            headerType: 4
        };

        return await zanta.buttonMessage(from, buttonMessage, mek);

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
}, async (zanta, mek, m, { from, q, reply }) => {
    try {
        if (!q) return await reply('❌ *Invalid request!*');

        const [movieUrl, movieName, thumbUrl, quality] = q.split("±");
        if (!movieUrl || !movieName) return await reply('⚠️ *Invalid Format!*');

        const response = await fetchJson(`https://mr-thinuzz-api-build.vercel.app/api/cinesubz/download?url=${encodeURIComponent(movieUrl)}&apiKey=key_13be1374312cdd0a`);

        let downloadUrl = null;
        let fileSize = "Unknown";

        if (response?.status && response?.data?.downloadUrls) {
            const directLink = response.data.downloadUrls.find(item => 
                item.url && !item.url.includes("t.me") && !item.url.includes("telegram")
            );
            if (directLink) {
                downloadUrl = directLink.url;
                fileSize = response.data.size || "Unknown";
            } else {
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

        await m.react('⬆️');

        let thumbBuffer = null;
        if (thumbUrl && thumbUrl !== 'undefined') {
            try {
                thumbBuffer = await getBuffer(thumbUrl);
            } catch (e) {
                console.log("Thumb error:", e.message);
            }
        }

        const cleanName = movieName.replace("Sinhala Subtitles", "").trim();

        // Send file to JID or current chat
        const targetJid = config.JID || from;
        await zanta.sendMessage(targetJid, {
            document: { url: downloadUrl },
            mimetype: 'video/mp4',
            fileName: `🎬 ${cleanName}.mp4`,
            caption: `🎬 *${cleanName}*\n\n*\`${quality}\`*\n\n${FOOTER_TEXT}`,
            jpegThumbnail: thumbBuffer || null
        });

        await m.react('✅');

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
async (zanta, mek, m, { from, q, prefix, reply }) => {
    try {
        if (!q) return await reply('🎬 *Please enter a movie name!*\n\n*Example:* .sinhalasub Avatar');

        const result = await fetchJson(`https://mr-thinuzz-api-build.vercel.app/api/sinhalasub?keyword=${encodeURIComponent(q)}&apiKey=key_13be1374312cdd0a`);

        if (!result.status || !result.data || result.data.length === 0) {
            await m.react('❌');
            return await reply(`❌ *No results found for "${q}"*`);
        }

        let buttons = [];
        result.data.slice(0, 10).forEach((movie) => {
            let cleanTitle = movie.Title
                .replace("Sinhala Subtitles | සිංහල උපසිරැසි සමඟ", "")
                .replace("Sinhala Subtitle | සිංහල උපසිරැසි සමඟ", "")
                .trim();
            
            const yearInfo = movie.Year ? ` (${movie.Year})` : '';
            const ratingInfo = movie.Rating && movie.Rating !== "N/A" ? ` ⭐${movie.Rating}` : '';
            const displayTitle = cleanTitle.length > 30 ? cleanTitle.substring(0, 27) + '...' : cleanTitle;
            
            buttons.push({
                buttonId: `${prefix}sinfodl ${movie.Link}`,
                buttonText: { displayText: `🇱🇰 ${displayTitle}${yearInfo}${ratingInfo}` },
                type: 1
            });
        });

        const buttonMessage = {
            image: { url: BOT_LOGO },
            caption: `🎬 *SINHALASUB SEARCH RESULTS*\n\n🔍 *Input:* ${q}\n📊 *Results:* ${result.total_results || result.data.length}\n\n📌 *Select a movie from below:*`,
            footer: FOOTER_TEXT,
            buttons: buttons,
            headerType: 4
        };

        await zanta.buttonMessage(from, buttonMessage, mek);

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
async (zanta, mek, m, { from, q, prefix, reply }) => {
    try {
        if (!q) return await reply('❌ *Invalid link!*');

        const res = await fetchJson(`https://mr-thinuzz-api-build.vercel.app/api/sinhalasub?url=${encodeURIComponent(q)}&apiKey=key_13be1374312cdd0a`);
        const movie = res.data;

        if (!movie) {
            return await reply('❌ *Error fetching movie details!*');
        }

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

        let buttons = [];

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
                buttons.push({
                    buttonId: `${prefix}sdl ${dl.url}±${cleanTitle}±${movie.poster}±${dl.quality}`,
                    buttonText: { displayText: `${dl.quality} - ${dl.size}` },
                    type: 1
                });
            });
        }

        // Add details button
        buttons.push({
            buttonId: `${prefix}mvcard ${cleanTitle}`,
            buttonText: { displayText: `📋 Full Details` },
            type: 1
        });

        const posterUrl = movie.poster || BOT_LOGO;

        const buttonMessage = {
            image: { url: posterUrl },
            caption: msg,
            footer: FOOTER_TEXT,
            buttons: buttons,
            headerType: 4
        };

        return await zanta.buttonMessage(from, buttonMessage, mek);

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
}, async (zanta, mek, m, { from, q, reply }) => {
    try {
        if (!q) return await reply('❌ *Invalid request!*');
        
        const [movieUrl, movieName, thumbUrl, quality] = q.split("±");
        if (!movieUrl || !movieName) return await reply('⚠️ *Invalid Format!*');

        let directLink = movieUrl;
        if (movieUrl.includes("/u/")) {
            directLink = movieUrl.replace("/u/", "/api/file/");
        }

        let thumbBuffer = null;
        if (thumbUrl && thumbUrl !== 'undefined') {
            try {
                thumbBuffer = await getBuffer(thumbUrl);
            } catch (e) {
                console.log("Thumb error:", e.message);
            }
        }

        const cleanName = movieName
            .replace("Sinhala Subtitles", "")
            .replace("Sinhala Subtitle", "")
            .trim();

        await m.react('⬆️');

        const targetJid = config.JID || from;
        await zanta.sendMessage(targetJid, {
            document: { url: directLink },
            mimetype: 'video/mp4',
            fileName: `🎬 ${cleanName}.mp4`,
            caption: `🎬 *${cleanName}*\n\n*\`${quality}\`*\n\n${FOOTER_TEXT}`,
            jpegThumbnail: thumbBuffer || null
        });

        await m.react('✅');

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
async (zanta, mek, m, { from, q, prefix, reply }) => {
    try {
        if (!q) return await reply('🎬 *Please enter a movie name!*\n\n*Example:* .sublk Avatar');

        const url = await fetchJson(`https://visper-md-ap-is.vercel.app/movie/sublk/SEARCH?q=${encodeURIComponent(q)}`);

        if (!url?.result || url.result.length === 0) {
            await m.react('❌');
            return await reply(`❌ *No results found for "${q}"*`);
        }

        let buttons = [];
        url.result.slice(0, 10).forEach((item) => {
            const title = item.title || 'Unknown Title';
            const displayTitle = title.length > 30 ? title.substring(0, 27) + '...' : title;
            
            buttons.push({
                buttonId: `${prefix}sublkdl ${item.link}&${item.year || 'N/A'}`,
                buttonText: { displayText: `📽️ ${displayTitle}` },
                type: 1
            });
        });

        const buttonMessage = {
            image: { url: BOT_LOGO },
            caption: `🎬 *SUB.LK SEARCH RESULTS*\n\n🔍 *Input:* ${q}\n📊 *Results:* ${url.result.length}\n\n📌 *Select a movie from below:*`,
            footer: FOOTER_TEXT,
            buttons: buttons,
            headerType: 4
        };

        await zanta.buttonMessage(from, buttonMessage, mek);

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
async (zanta, mek, m, { from, q, prefix, reply }) => {
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

        let buttons = [];

        if (movie.pixeldrainDownloads?.length > 0) {
            movie.pixeldrainDownloads.forEach((dl) => {
                buttons.push({
                    buttonId: `${prefix}sublkdl2 ${dl.finalDownloadUrl}±${movie.imageUrl}±${movie.title}±${dl.quality}`,
                    buttonText: { displayText: `${dl.size} - ${dl.quality}` },
                    type: 1
                });
            });
        }

        // Add details button
        buttons.push({
            buttonId: `${prefix}mvcard ${movie.title}`,
            buttonText: { displayText: `📋 Full Details` },
            type: 1
        });

        const highQualityImg = movie.imageUrl?.replace('-200x300', '') || BOT_LOGO;

        const buttonMessage = {
            image: { url: highQualityImg },
            caption: msg,
            footer: FOOTER_TEXT,
            buttons: buttons,
            headerType: 4
        };

        return await zanta.buttonMessage(from, buttonMessage, mek);

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
}, async (zanta, mek, m, { from, q, reply }) => {
    try {
        if (!q) return await reply('❌ *Invalid request!*');

        const [megaUrl, imglink, title, quality] = q.split("±");
        if (!megaUrl || !title) return await reply('⚠️ *Invalid Format!*');

        await m.react('⬆️');

        const megaApi = await fetchJson(`https://sadaslk-fast-mega-dl.vercel.app/mega?q=${encodeURIComponent(megaUrl.trim())}`);
        
        if (!megaApi?.status || !megaApi?.result?.download) {
            return await reply('❌ *Failed to fetch download link!*');
        }

        const directDownloadUrl = megaApi.result.download;
        const fileName = megaApi.result.name || title;

        let thumbBuffer = null;
        if (imglink && imglink !== 'undefined') {
            try {
                thumbBuffer = await getBuffer(imglink.trim());
            } catch (e) {}
        }

        const targetJid = config.JID || from;
        await zanta.sendMessage(targetJid, {
            document: { url: directDownloadUrl },
            caption: `🎬 *${title}*\n\n*\`${quality}\`*\n\n${FOOTER_TEXT}`,
            mimetype: "video/mp4",
            jpegThumbnail: thumbBuffer || null,
            fileName: `🎬 ${fileName}.mp4`,
        });

        await m.react('✅');

    } catch (e) {
        console.error("SUBLKDL2 Error:", e);
        await reply(`❌ *Error:* ${e.message}`);
    }
});

// ============================================================
// 📌 MOVIE DETAILS CARD (.mvcard)
// ============================================================
cmd({
    pattern: "mvcard",
    react: '🎴',
    category: "movie",
    desc: "Get detailed movie information card",
    use: ".mvcard <movie name>",
    filename: __filename
},
async (zanta, mek, m, { from, q, reply }) => {
    try {
        if (!q) return await reply('🎬 *Please enter a movie name!*\n\n*Example:* .mvcard Avatar');

        const { data } = await axios.get(`http://www.omdbapi.com/?t=${encodeURIComponent(q)}&apikey=d90ff23e`);

        if (data.Response === 'False') {
            await m.react('❌');
            return await reply(`❌ *No results found for "${q}" on IMDb!*`);
        }

        let imageUrl = data.Poster !== 'N/A' ? data.Poster : BOT_LOGO;

        // Try to get image from CineSubz if not available
        if (data.Poster === 'N/A') {
            try {
                const searchRes = await fetchJson(`https://tharuzz-movie-api.vercel.app/api/cinesub/search?query=${encodeURIComponent(q)}`);
                if (searchRes?.result?.length > 0) {
                    const movieUrl = searchRes.result[0].link;
                    const infoRes = await fetchJson(`https://api-dark-shan-yt.koyeb.app/movie/cinesubz-info?url=${encodeURIComponent(movieUrl)}&apikey=6bb99ab216a7fb7f`);
                    if (infoRes?.data?.image) {
                        imageUrl = infoRes.data.image;
                    }
                }
            } catch (err) {
                console.log("Image fallback error:", err.message);
            }
        }

        let msg = `✨ *MOVIE DETAILS CARD* ✨

━━━━━━━━━━━━━━━━
🎬 *Title:* ${data.Title}
📅 *Year:* ${data.Year}
⭐ *Rating:* ${data.imdbRating}/10
⏰ *Runtime:* ${data.Runtime}
🎭 *Genre:* ${data.Genre}
🌍 *Language:* ${data.Language}
🎬 *Director:* ${data.Director}
👥 *Cast:* ${data.Actors}
🏆 *Awards:* ${data.Awards}
━━━━━━━━━━━━━━━━
📝 *Plot:* ${data.Plot.substring(0, 300)}...
━━━━━━━━━━━━━━━━
${FOOTER_TEXT}`;

        await zanta.sendMessage(from, {
            image: { url: imageUrl },
            caption: msg
        });

        await m.react('✅');

    } catch (e) {
        console.error("MVCARD Error:", e);
        await reply(`❌ *Error:* ${e.message}`);
    }
});

// ============================================================
// 📌 EXPORT
// ============================================================
module.exports = { commands };
