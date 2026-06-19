const { cmd } = require("../command");
const axios = require("axios");
const config = require("../config");

// Premium check function
const checkPremium = async (senderNumber) => {
    try {
        const preUser = await axios.get('https://raw.githubusercontent.com/thinura-nethsara/NEXUS-DATABASE/refs/heads/main/Main/premium_user.json');
        const preUsers = preUser.data.numbers.split(",");
        return preUsers.some(preNumber => {
            const cleanPreNumber = preNumber.replace(/[^0-9]/g, '');
            return cleanPreNumber === senderNumber;
        });
    } catch (e) {
        console.log("Premium check error:", e);
        return false;
    }
};

const checkFree = async () => {
    try {
        const mainVar = await axios.get('https://raw.githubusercontent.com/thinura-nethsara/NEXUS-DATABASE/refs/heads/main/Main/main_var.json');
        return mainVar.data.mvfree === "true";
    } catch (e) {
        return false;
    }
};

// Main Search Command
cmd({
    pattern: "sinhalasub",
    react: '🔎',
    category: "movie",
    alias: ["cz"],
    desc: "sinhalasub.lk movie search",
    use: ".sinhalasub 2025",
    filename: __filename
},
async (zanta, mek, m, {
    from, q, prefix, isSudo, isOwner, isMe, reply
}) => {
    try {
        const senderNumber = m.sender.split('@')[0];
        const isPre = await checkPremium(senderNumber);
        const isFree = await checkFree();

        if (!isFree && !isMe && !isPre) {
            await zanta.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return await zanta.sendMessage(from, {
                text: "*`You are not a premium user⚠️`*\n\n" +
                      "*Send a message to one of the 2 numbers below and buy Lifetime premium 🎉.*\n\n" +
                      "_Price : 200 LKR ✔️_\n\n" +
                      "*👨‍💻Contact us : 0774571418 , Error*"
            }, { quoted: mek });
        }

        if (config.MV_BLOCK === "true" && !isMe && !isSudo && !isOwner) {
            await zanta.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return await zanta.sendMessage(from, {
                text: "*This command currently only works for the Bot owner.*"
            }, { quoted: mek });
        }

        if (!q) return await reply('*Please give me a movie name 🎬*');

        const apiUrl = `https://mr-thinuzz-api-build.vercel.app/api/sinhalasub?keyword=${encodeURIComponent(q)}&apiKey=key_13be1374312cdd0a`;
        const response = await axios.get(apiUrl);
        const result = response.data;

        if (!result.status || !result.data || result.data.length === 0) {
            await zanta.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return await zanta.sendMessage(from, { text: '*No results found ❌*' }, { quoted: mek });
        }

        // Create buttons
        let buttons = [];
        const displayResults = result.data.slice(0, 10);
        
        displayResults.forEach((movie, index) => {
            let cleanTitle = movie.Title
                .replace("Sinhala Subtitles | සිංහල උපසිරැසි සමඟ", "")
                .replace("Sinhala Subtitle | සිංහල උපසිරැසි සමඟ", "")
                .trim();
            
            if (cleanTitle.length > 30) {
                cleanTitle = cleanTitle.substring(0, 30) + '...';
            }
            
            const yearInfo = movie.Year ? ` (${movie.Year})` : '';
            
            buttons.push({
                buttonId: `${prefix}sinhalasubinfo ${encodeURIComponent(movie.Link)}`,
                buttonText: { displayText: `${index+1}. ${cleanTitle}${yearInfo}` },
                type: 1
            });
        });

        // Split buttons into chunks of 3
        const chunkSize = 3;
        let buttonChunks = [];
        for (let i = 0; i < buttons.length; i += chunkSize) {
            buttonChunks.push(buttons.slice(i, i + chunkSize));
        }

        const msg = `_*SINHALASUB MOVIE SEARCH RESULTS 🎬*_\n\n`;
        const msg2 = `*\`Input :\`* ${q}\n*Total Results:* ${result.total_results || result.data.length}\n\n*Select a movie from the buttons below to get download links.*\n\n> _𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 𝐙𝐄𝐔𝐒 𝐈𝐍𝐂 </>_`;

        // Send first chunk as buttons
        if (buttonChunks.length > 0) {
            const buttonMessage = {
                text: msg + msg2,
                footer: config.FOOTER || "ZEUS X BOT",
                buttons: buttonChunks[0],
                headerType: 4
            };
            await zanta.sendMessage(from, buttonMessage, { quoted: mek });
        }

        // Send remaining chunks as separate messages
        for (let i = 1; i < buttonChunks.length; i++) {
            const buttonMessage = {
                text: `_*More Results...*_`,
                footer: config.FOOTER || "ZEUS X BOT",
                buttons: buttonChunks[i],
                headerType: 4
            };
            await zanta.sendMessage(from, buttonMessage, { quoted: mek });
        }

    } catch (e) {
        console.log("SINHALASUB Command Error:", e);
        await zanta.sendMessage(from, { text: '🚩 *Error occurred while fetching data!*' }, { quoted: mek });
    }
});

// Movie Info Command
cmd({
    pattern: "sinhalasubinfo",
    react: '🎥',
    desc: "movie downloader info",
    filename: __filename
},
async (zanta, mek, m, { from, q, isMe, prefix, reply }) => {
    try {
        if (!q) return await reply('*Please provide a link!*');
        
        console.log("🔗 Raw q:", q);
        
        let movieLink = q.trim();
        if (movieLink.includes('sinhalasubinfo')) {
            const parts = movieLink.split(' ');
            for (const part of parts) {
                if (part.includes('http') || part.includes('%')) {
                    movieLink = part;
                    break;
                }
            }
        }
        
        try {
            movieLink = decodeURIComponent(movieLink);
        } catch (e) {
            console.log("URL decode error, using as is");
        }
        
        if (!movieLink.startsWith('http')) {
            return await reply('*Invalid movie link!*');
        }
        
        console.log("🔗 Movie Link:", movieLink);

        const apiUrl = `https://mr-thinuzz-api-build.vercel.app/api/sinhalasub?url=${encodeURIComponent(movieLink)}&apiKey=key_13be1374312cdd0a`;
        const res = await axios.get(apiUrl);
        const sadas = res.data;

        if (!sadas.status || !sadas.data) {
            return await zanta.sendMessage(from, { text: '🚩 *Error fetching movie details!*' }, { quoted: mek });
        }

        const movie = sadas.data;

        let genres = 'N/A';
        if (movie.genres && movie.genres.length > 0) {
            genres = movie.genres.join(', ');
        }

        let msg = `*🍿 ${movie.title || 'N/A'}*\n\n`;
        msg += `*📅 Release:* ${movie.release_date || 'N/A'}\n`;
        msg += `*⭐ IMDb:* ${movie.imdb_rating || 'N/A'}\n`;
        msg += `*⏰ Runtime:* ${movie.runtime || 'N/A'}\n`;
        msg += `*🎭 Genres:* ${genres}\n`;
        msg += `*💁 Subtitles:* Sinhalasub\n`;
        msg += `*📝 Description:*\n${movie.description ? movie.description.substring(0, 120) + '...' : 'N/A'}\n\n`;
        msg += `*Select a quality button below to download:*`;

        // Filter download links
        const ALLOWED_QUALITIES = ["SD 480p", "HD 720p", "FHD 1080p"];
        const PROVIDER_PRIORITY = ["DLServer-01", "DLServer-02"];
        
        let filteredLinks = movie.download_links.filter(link => {
            if (!ALLOWED_QUALITIES.includes(link.quality)) return false;
            if (link.provider === "Telegram") return false;
            return true;
        });

        filteredLinks.sort((a, b) => {
            return PROVIDER_PRIORITY.indexOf(a.provider) - PROVIDER_PRIORITY.indexOf(b.provider);
        });

        let buttons = [];

        // Add Details button
        buttons.push({
            buttonId: `${prefix}sinhalasubdetails ${encodeURIComponent(movieLink)}`,
            buttonText: { displayText: '📋 Details Card' },
            type: 1
        });

        if (filteredLinks.length > 0) {
            filteredLinks.forEach((dl) => {
                const encodedUrl = encodeURIComponent(dl.url);
                const encodedTitle = encodeURIComponent(movie.title || 'Movie');
                const encodedPoster = encodeURIComponent(movie.poster || '');
                buttons.push({
                    buttonId: `${prefix}sinhalasubdl ${encodedUrl}±${encodedTitle}±${encodedPoster}±${dl.quality}`,
                    buttonText: {
                        displayText: `⬇️ ${dl.quality} (${dl.size})`
                    },
                    type: 1
                });
            });
        } else {
            const fallbackLinks = movie.download_links.filter(link => link.provider !== "Telegram");
            fallbackLinks.slice(0, 5).forEach((dl) => {
                const encodedUrl = encodeURIComponent(dl.url);
                const encodedTitle = encodeURIComponent(movie.title || 'Movie');
                const encodedPoster = encodeURIComponent(movie.poster || '');
                buttons.push({
                    buttonId: `${prefix}sinhalasubdl ${encodedUrl}±${encodedTitle}±${encodedPoster}±${dl.quality || 'Unknown'}`,
                    buttonText: {
                        displayText: `⬇️ ${dl.quality || 'Download'} (${dl.size || 'Unknown'})`
                    },
                    type: 1
                });
            });
        }

        const posterUrl = movie.poster || 'https://sinhalasub.lk/wp-content/uploads/2021/09/cropped-cropped-CineSubz-Icon-1.png';

        await zanta.sendMessage(from, {
            image: { url: posterUrl },
            caption: msg,
            footer: config.FOOTER || "ZEUS X BOT",
            buttons: buttons,
            headerType: 4
        }, { quoted: mek });

        console.log("✅ Movie info sent successfully!");

    } catch (e) {
        console.log("SINHALASUBINFO Error:", e);
        await zanta.sendMessage(from, { text: '🚩 *Error fetching movie details!*' }, { quoted: mek });
    }
});

// Movie Details Command
cmd({
    pattern: "sinhalasubdetails",
    react: '📋',
    desc: "movie details card",
    filename: __filename
},
async (zanta, mek, m, { from, q, reply }) => {
    try {
        if (!q) return await reply('*Please provide a link!*');
        
        let movieLink = q.trim();
        if (movieLink.includes('sinhalasubdetails')) {
            const parts = movieLink.split(' ');
            for (const part of parts) {
                if (part.includes('http') || part.includes('%')) {
                    movieLink = part;
                    break;
                }
            }
        }
        
        try {
            movieLink = decodeURIComponent(movieLink);
        } catch (e) {
            console.log("URL decode error, using as is");
        }
        
        if (!movieLink.startsWith('http')) {
            return await reply('*Invalid movie link!*');
        }

        const apiUrl = `https://mr-thinuzz-api-build.vercel.app/api/sinhalasub?url=${encodeURIComponent(movieLink)}&apiKey=key_13be1374312cdd0a`;
        const res = await axios.get(apiUrl);
        const movie = res.data.data;

        if (!movie) {
            return await zanta.sendMessage(from, { text: '🚩 *Error fetching movie details!*' }, { quoted: mek });
        }

        let genres = 'N/A';
        if (movie.genres && movie.genres.length > 0) {
            genres = movie.genres.join(', ');
        }

        let msg = `*🎬 ${movie.title || 'N/A'}*\n\n`;
        msg += `*📅 Release:* ${movie.release_date || 'N/A'}\n`;
        msg += `*⭐ IMDb:* ${movie.imdb_rating || 'N/A'}\n`;
        msg += `*⏰ Runtime:* ${movie.runtime || 'N/A'}\n`;
        msg += `*🎭 Genres:* ${genres}\n`;
        msg += `*📝 Description:*\n${movie.description || 'N/A'}\n\n`;
        msg += `*🔗 Source:* ${movie.source_url || 'N/A'}`;

        const posterUrl = movie.poster || 'https://sinhalasub.lk/wp-content/uploads/2021/09/cropped-cropped-CineSubz-Icon-1.png';

        await zanta.sendMessage(from, {
            image: { url: posterUrl },
            caption: msg
        }, { quoted: mek });

    } catch (e) {
        console.log("SINHALASUBDETAILS Error:", e);
        await zanta.sendMessage(from, { text: '🚩 *Error !!*' }, { quoted: mek });
    }
});

// Download Command
cmd({
    pattern: "sinhalasubdl",
    react: "⬇️",
    dontAddCommandList: true,
    filename: __filename
}, async (zanta, mek, m, { from, q, reply, isMe }) => {
    try {
        if (!q) return await reply('*📍 Please provide the movie link!*');
        
        console.log("📥 Raw q:", q);
        
        const parts = q.split("±");
        let movieUrl = parts[0] || '';
        let movieName = parts[1] || '';
        let thumbUrl = parts[2] || '';
        let quality = parts[3] || '';
        
        try {
            movieUrl = decodeURIComponent(movieUrl);
            movieName = decodeURIComponent(movieName);
            thumbUrl = decodeURIComponent(thumbUrl);
        } catch (e) {
            console.log("URL decode error, using as is");
        }
        
        if (!movieUrl || !movieName) return await reply('*⚠️ Invalid Format!*');

        console.log("📥 Movie URL:", movieUrl);
        console.log("🎬 Movie:", movieName);
        console.log("📊 Quality:", quality);

        const senderNumber = m.sender.split('@')[0];
        const isPre = await checkPremium(senderNumber);
        const isFree = await checkFree();

        if (!isFree && !isMe && !isPre) {
            await zanta.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return await zanta.sendMessage(from, {
                text: "*`You are not a premium user⚠️`*\n\n" +
                      "*Send a message to one of the 2 numbers below and buy Lifetime premium 🎉.*\n\n" +
                      "_Price : 200 LKR ✔️_\n\n" +
                      "*👨‍💻Contact us : 0774571418 , Error*"
            }, { quoted: mek });
        }

        await zanta.sendMessage(from, { react: { text: '⏳', key: mek.key } });

        let resizedBotImg = null;
        let thumbBuffer = null;
        
        if (thumbUrl && thumbUrl !== 'undefined' && thumbUrl !== 'null' && thumbUrl !== '') {
            try {
                const botimgResponse = await axios.get(thumbUrl, { responseType: 'arraybuffer' });
                if (botimgResponse.data) {
                    thumbBuffer = Buffer.from(botimgResponse.data);
                    try {
                        const sharp = require('sharp');
                        resizedBotImg = await sharp(thumbBuffer)
                            .resize(200, 200, { fit: 'cover', position: 'center' })
                            .toBuffer();
                    } catch (e) {
                        resizedBotImg = thumbBuffer;
                    }
                }
            } catch (e) { 
                console.log("Thumb error skipped:", e.message); 
            }
        }

        let cleanMovieName = movieName
            .replace("Sinhala Subtitles | සිංහල උපසිරැසි සමඟ", "")
            .replace("Sinhala Subtitle | සිංහල උපසිරැසි සමඟ", "")
            .replace(/\s*\(\d{4}\)\s*/, " ")
            .trim();

        if (cleanMovieName.length > 50) {
            cleanMovieName = cleanMovieName.substring(0, 50);
        }

        await zanta.sendMessage(from, { react: { text: '⬆️', key: mek.key } });

        await zanta.sendMessage(from, { 
            document: { url: movieUrl }, 
            mimetype: 'video/mp4',
            fileName: `${cleanMovieName}.mp4`,
            caption: `*🎬 Name :* *${cleanMovieName}*\n\n*📊 Quality :* \`${quality}\`\n\n> _𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 𝐙𝐄𝐔𝐒 𝐈𝐍𝐂 </>_`,
            jpegThumbnail: resizedBotImg || thumbBuffer
        }, { 
            quoted: mek,
            mediaUploadTimeoutMs: 1000 * 60 * 60,
            generateHighQualityLinkPreview: false 
        });

        await zanta.sendMessage(from, { react: { text: "✅", key: mek.key } });

    } catch (e) {
        console.log("Download Error:", e);
        await reply(`*❌ Error:* ${e.message}`);
        await zanta.sendMessage(from, { react: { text: "⚠️", key: mek.key } });
    }
});
