const { cmd } = require("../command");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
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
async (conn, m, mek, {
    from, q, prefix, isSudo, isOwner, isMe, reply
}) => {
    try {
        // Premium check
        const senderNumber = m.sender.split('@')[0];
        const isPre = await checkPremium(senderNumber);
        const isFree = await checkFree();

        if (!isFree && !isMe && !isPre) {
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return await conn.sendMessage(from, {
                text: "*`You are not a premium user⚠️`*\n\n" +
                      "*Send a message to one of the 2 numbers below and buy Lifetime premium 🎉.*\n\n" +
                      "_Price : 200 LKR ✔️_\n\n" +
                      "*👨‍💻Contact us : 0774571418 , Error*"
            }, { quoted: mek });
        }

        // Block check
        if (config.MV_BLOCK === "true" && !isMe && !isSudo && !isOwner) {
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return await conn.sendMessage(from, {
                text: "*This command currently only works for the Bot owner.*"
            }, { quoted: mek });
        }

        if (!q) return await reply('*Please give me a movie name 🎬*');

        // Fetching Data from API
        const apiUrl = `https://mr-thinuzz-api-build.vercel.app/api/sinhalasub?keyword=${encodeURIComponent(q)}&apiKey=key_13be1374312cdd0a`;
        const response = await axios.get(apiUrl);
        const result = response.data;

        if (!result.status || !result.data || result.data.length === 0) {
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return await conn.sendMessage(from, { text: '*No results found ❌*' }, { quoted: mek });
        }

        // Create search results as buttons instead of list
        let buttons = [];
        let buttonText = [];
        
        result.data.slice(0, 10).forEach((movie) => {
            // Clean title
            let cleanTitle = movie.Title
                .replace("Sinhala Subtitles | සිංහල උපසිරැසි සමඟ", "")
                .replace("Sinhala Subtitle | සිංහල උපසිරැසි සමඟ", "")
                .trim();
            
            const yearInfo = movie.Year ? ` (${movie.Year})` : '';
            
            buttons.push({
                buttonId: `${prefix}sinhalasubinfo ${movie.Link}`,
                buttonText: { displayText: `${cleanTitle}${yearInfo}` },
                type: 1
            });
        });

        // Split buttons into chunks of 3 for better display
        const chunkSize = 3;
        let buttonChunks = [];
        for (let i = 0; i < buttons.length; i += chunkSize) {
            buttonChunks.push(buttons.slice(i, i + chunkSize));
        }

        const msg = `_*SINHALASUB MOVIE SEARCH RESULTS 🎬*_\n\n*\`Input :\`* ${q}\n*Total Results:* ${result.total_results || result.data.length}\n\n*Select a movie from the buttons below to download.*`;

        // Send first chunk as buttons
        if (buttonChunks.length > 0) {
            const buttonMessage = {
                text: msg,
                footer: config.FOOTER,
                buttons: buttonChunks[0],
                headerType: 4
            };
            await conn.buttonMessage(from, buttonMessage, mek);
        }

        // Send remaining chunks as separate messages
        for (let i = 1; i < buttonChunks.length; i++) {
            const buttonMessage = {
                text: `_*More Results...*_`,
                footer: config.FOOTER,
                buttons: buttonChunks[i],
                headerType: 4
            };
            await conn.buttonMessage(from, buttonMessage, mek);
        }

    } catch (e) {
        console.log("SINHALASUB Command Error:", e);
        await conn.sendMessage(from, { text: '🚩 *Error occurred while fetching data!*' }, { quoted: mek });
    }
});

// Movie Info Command
cmd({
    pattern: "sinhalasubinfo",
    react: '🎥',
    desc: "movie downloader info",
    filename: __filename
},
async (conn, m, mek, { from, q, isMe, prefix, reply }) => {
    try {
        if (!q) return await reply('*Please provide a link!*');

        const apiUrl = `https://mr-thinuzz-api-build.vercel.app/api/sinhalasub?url=${encodeURIComponent(q)}&apiKey=key_13be1374312cdd0a`;
        const res = await axios.get(apiUrl);
        const sadas = res.data;

        if (!sadas.status || !sadas.data) {
            return await conn.sendMessage(from, { text: '🚩 *Error fetching movie details!*' }, { quoted: mek });
        }

        const movie = sadas.data;

        let genres = 'N/A';
        if (movie.genres && movie.genres.length > 0) {
            genres = movie.genres.join(', ');
        }

        let msg = `*🍿 𝗧ɪᴛʟᴇ ➮* *_${movie.title || 'N/A'}_*

*📅 𝗥ᴇʟᴇᴀꜱᴇᴅ ʏᴇᴀʀ ➮* _${movie.release_date || 'N/A'}_
*⭐ 𝗜𝗠ᴅʙ ʀᴀᴛɪɴɢ ➮* _${movie.imdb_rating || 'N/A'}_
*⏰ 𝗥ᴜɴᴛɪᴍᴇ ➮* _${movie.runtime || 'N/A'}_
*🎭 𝗚ᴇɴʀᴇꜱ ➮* _${genres}_
*💁 𝗦ᴜʙᴛɪᴛʟᴇ ʙʏ ➮* _Sinhalasub_
*📝 𝗗ᴇꜱᴄʀɪᴘᴛɪᴏɴ ➮* _${movie.description ? movie.description.substring(0, 100) + '...' : 'N/A'}_`

        let rows = [];
        rows.push({
            buttonId: prefix + 'sinhalasubdetails ' + `${q}`,
            buttonText: { displayText: '📋 Details Card' },
            type: 1
        });

        // Filter download links - Only 480p, 720p, 1080p (No Telegram)
        const ALLOWED_QUALITIES = ["SD 480p", "HD 720p", "FHD 1080p"];
        const PROVIDER_PRIORITY = ["DLServer-01", "DLServer-02"];
        
        let filteredLinks = movie.download_links.filter(link => {
            if (!ALLOWED_QUALITIES.includes(link.quality)) return false;
            if (link.provider === "Telegram") return false;
            return true;
        });

        // Sort by provider priority
        filteredLinks.sort((a, b) => {
            return PROVIDER_PRIORITY.indexOf(a.provider) - PROVIDER_PRIORITY.indexOf(b.provider);
        });

        if (filteredLinks.length > 0) {
            filteredLinks.forEach((dl) => {
                rows.push({
                    buttonId: `${prefix}sinhalasubdl ${dl.url}±${movie.title}±${movie.poster}±${dl.quality}`,
                    buttonText: {
                        displayText: `⬇️ ${dl.quality} - ${dl.size}`
                    },
                    type: 1
                });
            });
        } else {
            // Fallback: Show all except Telegram if no filtered links found
            const fallbackLinks = movie.download_links.filter(link => link.provider !== "Telegram");
            fallbackLinks.forEach((dl) => {
                rows.push({
                    buttonId: `${prefix}sinhalasubdl ${dl.url}±${movie.title}±${movie.poster}±${dl.quality}`,
                    buttonText: {
                        displayText: `⬇️ ${dl.quality} - ${dl.size}`
                    },
                    type: 1
                });
            });
        }

        const posterUrl = movie.poster || 'https://sinhalasub.lk/wp-content/uploads/2021/09/cropped-cropped-CineSubz-Icon-1.png';

        const buttonMessage = {
            image: { url: posterUrl },
            caption: msg,
            footer: config.FOOTER,
            buttons: rows,
            headerType: 4
        };

        return await conn.buttonMessage(from, buttonMessage, mek);

    } catch (e) {
        console.log("SINHALASUBINFO Error:", e);
        await conn.sendMessage(from, { text: '🚩 *Error !!*' }, { quoted: mek });
    }
});

// Download Command
cmd({
    pattern: "sinhalasubdl",
    react: "⬇️",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return await reply('*📍 Please provide the movie link!*');
        
        const [movieUrl, movieName, thumbUrl, quality] = q.split("±");
        if (!movieUrl || !movieName) return await reply('*⚠️ Invalid Format!*');

        await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });

        // Check if download is allowed (Premium check for downloads)
        const senderNumber = m.sender.split('@')[0];
        const isPre = await checkPremium(senderNumber);
        const isFree = await checkFree();

        if (!isFree && !isMe && !isPre) {
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return await conn.sendMessage(from, {
                text: "*`You are not a premium user⚠️`*\n\n" +
                      "*Send a message to one of the 2 numbers below and buy Lifetime premium 🎉.*\n\n" +
                      "_Price : 200 LKR ✔️_\n\n" +
                      "*👨‍💻Contact us : 0774571418 , Error*"
            }, { quoted: mek });
        }

        // Direct download
        let direct_link = movieUrl;

        console.log("📥 Download URL:", direct_link);
        console.log("🎬 Movie:", movieName);
        console.log("📊 Quality:", quality);

        // Thumbnail Processing
        let resizedBotImg = null;
        let thumbBuffer = null;
        
        if (thumbUrl && thumbUrl !== 'undefined') {
            try {
                const botimgResponse = await fetch(thumbUrl);
                if (botimgResponse.ok) {
                    thumbBuffer = await botimgResponse.buffer();
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

        // Clean movie name
        let cleanMovieName = movieName
            .replace("Sinhala Subtitles | සිංහල උපසිරැසි සමඟ", "")
            .replace("Sinhala Subtitle | සිංහල උපසිරැසි සමඟ", "")
            .replace(/\s*\(\d{4}\)\s*/, " ")
            .trim();

        await conn.sendMessage(from, { react: { text: '⬆️', key: mek.key } });

        // Send as document
        await conn.sendMessage(from, { 
            document: { url: direct_link }, 
            mimetype: 'video/mp4',
            fileName: `${cleanMovieName}.mp4`,
            caption: `*🎬 Name :* *${cleanMovieName}*\n\n*📊 Quality :* \`${quality}\`\n\n> _𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 𝐙𝐄𝐔𝐒 𝐈𝐍𝐂 </>_`,
            jpegThumbnail: resizedBotImg || thumbBuffer
        }, { 
            quoted: mek,
            mediaUploadTimeoutMs: 1000 * 60 * 60,
            generateHighQualityLinkPreview: false 
        });

        await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

    } catch (e) {
        console.log("Download Error:", e);
        await reply(`*❌ Error:* ${e.message}`);
        await conn.sendMessage(from, { react: { text: "⚠️", key: mek.key } });
    }
});
