const config = require('../config')
const { cmd, commands } = require('../command')
const axios = require('axios');
const sharp = require('sharp');
const { getBuffer, getGroupAdmins, getRandom, h2k, isUrl, Json, runtime, sleep, fetchJson} = require('../lib/functions')
const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));
const { Buffer } = require('buffer'); 
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const fileType = require("file-type")
const l = console.log
const https = require("https")
const { URL } = require('url');
const { sizeFormatter} = require('human-readable');
const fg = require('api-dylux');
const { Octokit } = require("@octokit/rest");

// ==================== CINESUBZ SEARCH COMMAND ====================
cmd({
    pattern: "cine",
    react: '🔎',
    category: "movie",
    alias: ["cz", "cinesubz"],
    desc: "Cinesubz.lk movie search with download",
    use: ".cine avatar",
    filename: __filename
},
async (conn, m, mek, {
    from, q, prefix, isSudo, isOwner, isMe, reply
}) => {
    try {
        // ========== PREMIUM CHECK ==========
        const preUser = await fetchJson(`https://raw.githubusercontent.com/thinura-nethsara/NEXUS-DATABASE/refs/heads/main/Main/premium_user.json`);
        const preUsers = preUser.numbers.split(",");
        const senderNumber = m.sender.split('@')[0];
        const isPre = preUsers.some(preNumber => {
            const cleanPreNumber = preNumber.replace(/[^0-9]/g, '');
            return cleanPreNumber === senderNumber;
        });
        
        console.log("📦 [CINE] Premium JSON:", preUser.numbers);
        console.log("🔢 [CINE] Sender Number:", senderNumber);
        console.log("✅ [CINE] Is Premium:", isPre);
        
        const mainVar = (await axios.get('https://raw.githubusercontent.com/thinura-nethsara/NEXUS-DATABASE/refs/heads/main/Main/main_var.json')).data;
        const isFree = mainVar.mvfree === "true";

        if (!isFree && !isMe && !isPre) {
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return await conn.sendMessage(from, {
                text: "*`You are not a premium user⚠️`*\n\n" +
                      "*Send a message to one of the 2 numbers below and buy Lifetime premium 🎉.*\n\n" +
                      "_Price : 200 LKR ✔️_\n\n" +
                      "*👨‍💻Contact us : 0774571418 , Error*"
            }, { quoted: mek });
        }

        if (config.MV_BLOCK === "true" && !isMe && !isSudo && !isOwner) {
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return await conn.sendMessage(from, {
                text: "*This command currently only works for the Bot owner.*"
            }, { quoted: mek });
        }

        if (!q) return await reply('*Please give me a movie name 🎬*');

        // ========== SEARCH API ==========
        const apiUrl = `https://mr-thinuzz-api-build.vercel.app/api/cinesubz/search?query=${encodeURIComponent(q)}&apiKey=key_13be1374312cdd0a`;
        const response = await axios.get(apiUrl);
        const result = response.data;

        if (!result.status || !result.data || (result.data.all && result.data.all.length === 0)) {
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return await conn.sendMessage(from, { text: '*No results found ❌*' }, { quoted: mek });
        }

        const results = result.data.all || [];
        
        if (results.length === 0) {
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return await conn.sendMessage(from, { text: '*No results found ❌*' }, { quoted: mek });
        }

        // ========== CREATE LIST ==========
        let srh = [];
        results.forEach((item) => {
            let cleanTitle = item.title
                .replace("Sinhala Subtitles | සිංහල උපසිරැසි සමඟ", "")
                .replace("Sinhala Subtitle | සිංහල උපසිරැසි සමඟ", "")
                .trim();
            
            const typeBadge = item.type === "TV" ? "📺" : "🎬";
            
            srh.push({
                title: `${typeBadge} ${cleanTitle} ${item.year ? `(${item.year})` : ''}`,
                rowId: `${prefix}cineinfo ${item.link}`
            });
        });

        const sections = [{
            title: `🔍 Cinesubz Search Results for "${q}" (${result.total_results || results.length} found)`,
            rows: srh.slice(0, 20)
        }];

        const listMessage = {
            text: `*_CINESUBZ MOVIE SEARCH RESULTS 🎬_*\n\n*Input:* ${q}\n*Total Results:* ${result.total_results || results.length}\n\n*Select a movie/TV show from the list below.*`,
            footer: config.FOOTER,
            title: 'Cinesubz Movie Downloader',
            buttonText: '📋 View Results',
            sections
        };

        await conn.listMessage(from, listMessage, mek);

    } catch (e) {
        console.log("CINE Command Error:", e);
        await conn.sendMessage(from, { text: '🚩 *Error occurred while fetching data!*\n\n' + e.message }, { quoted: mek });
    }
});

// ==================== CINESUBZ MOVIE INFO COMMAND ====================
cmd({
    pattern: "cineinfo",
    react: '🎥',
    desc: "Get Cinesubz movie details and download options",
    filename: __filename
},
async (conn, m, mek, { from, q, isMe, prefix, reply }) => {
    try {
        if (!q) return await reply('*Please provide a link!*');

        // ========== MOVIE INFO API ==========
        const apiUrl = `https://mr-thinuzz-api-build.vercel.app/api/cinesubz/movie?url=${encodeURIComponent(q)}&apiKey=key_13be1374312cdd0a`;
        const res = await axios.get(apiUrl);
        const sadas = res.data;

        if (!sadas.status || !sadas.data) {
            return await conn.sendMessage(from, { text: '🚩 *Error fetching movie details!*' }, { quoted: mek });
        }

        const movie = sadas.data;

        // ========== CLEAN DATA ==========
        let cleanTitle = movie.maintitle || movie.title || 'N/A';
        if (cleanTitle.includes("Sinhala Subtitles")) {
            cleanTitle = cleanTitle.replace("Sinhala Subtitles | සිංහල උපසිරැසි සමඟ", "").trim();
        }

        let ratingText = 'N/A';
        if (movie.imdb && movie.imdb.value && movie.imdb.value !== "00") {
            ratingText = movie.imdb.value;
        } else if (movie.rating && movie.rating.value && movie.rating.value !== "00") {
            ratingText = movie.rating.value;
        }

        let runtimeText = movie.runtime || 'N/A';
        if (runtimeText.startsWith("IMDb:")) {
            runtimeText = runtimeText.replace("IMDb:", "").trim();
        }

        let genres = 'Movie';
        if (movie.category && movie.category.length > 0) {
            genres = movie.category.join(', ');
        }

        // ========== BUILD MESSAGE ==========
        let msg = `*🍿 𝗧ɪᴛʟᴇ ➮* *_${cleanTitle}_*

*📅 𝗥ᴇʟᴇᴀꜱᴇᴅ ʏᴇᴀʀ ➮* _${movie.dateCreate || 'N/A'}_
*🌎 𝗖ᴏᴜɴᴛʀʏ ➮* _${movie.country || 'N/A'}_
*⭐ 𝗜𝗠ᴅʙ ʀᴀᴛɪɴɢ ➮* _${ratingText}_
*⏰ 𝗥ᴜɴᴛɪᴍᴇ ➮* _${runtimeText}_
*🎭 𝗚ᴇɴʀᴇꜱ ➮* _${genres}_
*💁 𝗦ᴜʙᴛɪᴛʟᴇ ʙʏ ➮* _CineSubz_`

        let rows = [];

        // ========== DETAILS BUTTON ==========
        rows.push(
            { buttonId: prefix + 'cinedetails ' + `${q}`, buttonText: { displayText: '📋 Details Card' }, type: 1 }
        );

        // ========== DOWNLOAD BUTTONS ==========
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
                if (qualityName.includes("BluRay")) {
                    qualityName = qualityName.replace("BluRay", "").trim();
                }
                
                rows.push({
                    buttonId: `${prefix}cinedl ${dl.link}±${cleanTitle}±${movie.mainImage}±${qualityName}`, 
                    buttonText: { 
                        displayText: `🎬 ${qualityName} - ${dl.size || 'N/A'}` 
                    },
                    type: 1
                });
            });
        }

        // ========== POSTER IMAGE ==========
        let posterUrl = movie.mainImage;
        if (!posterUrl && movie.imageUrls && movie.imageUrls.length > 0) {
            posterUrl = movie.imageUrls[0];
        }
        if (!posterUrl) {
            posterUrl = 'https://cinesubz.lk/wp-content/uploads/2021/09/cropped-cropped-CineSubz-Icon-1.png';
        }

        // ========== SEND BUTTON MESSAGE ==========
        const buttonMessage = {
            image: { url: posterUrl },
            caption: msg,
            footer: config.FOOTER,
            buttons: rows,
            headerType: 4
        };

        return await conn.buttonMessage(from, buttonMessage, mek);

    } catch (e) {
        console.log("CINEINFO Error:", e);
        await conn.sendMessage(from, { text: '🚩 *Error occurred!*\n\n' + e.message }, { quoted: mek });
    }
});

// ==================== CINESUBZ DOWNLOAD COMMAND ====================
cmd({
    pattern: "cinedl",
    react: "⬇️",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return await reply('*📍 Please provide the movie link!*');

        const [movieUrl, movieName, thumbUrl, quality] = q.split("±");
        if (!movieUrl || !movieName) return await reply('*⚠️ Invalid Format!*');

        console.log("🎬 Movie URL:", movieUrl);
        console.log("🖼️ Thumb URL:", thumbUrl);

        // ========== GET DOWNLOAD LINK ==========
        const downloadApi = `https://mr-thinuzz-api-build.vercel.app/api/cinesubz/download?url=${encodeURIComponent(movieUrl)}&apiKey=key_13be1374312cdd0a`;
        const response = await fetchJson(downloadApi);

        if (!response?.status || !response?.data?.downloadUrls) {
            return await reply('*❌ Error: Direct download link not found!*');
        }

        // ========== FIND DIRECT LINK (Avoid Telegram) ==========
        const directLink = response.data.downloadUrls.find(item => 
            item.url && !item.url.includes("t.me") && !item.url.includes("telegram")
        );

        if (!directLink) {
            return await reply('*❌ Error: Direct download link not found! Only Telegram links available.*');
        }

        const downloadUrl = directLink.url;
        const fileSize = response.data.size || "Unknown Size";

        console.log("📥 Final Download URL:", downloadUrl);
        console.log("📦 File Size:", fileSize);

        // ========== SEND LOADING ==========
        await conn.sendMessage(from, { react: { text: '⬆️', key: mek.key } });
        await conn.sendMessage(from, { text: '*Uploading your movie..⬆️*' }, { quoted: mek });

        // ========== PROCESS THUMBNAIL ==========
        let resizedBotImg = null;
        let thumbBuffer = null;

        if (thumbUrl && thumbUrl !== 'undefined') {
            try {
                const botimgResponse = await fetch(thumbUrl);
                if (botimgResponse.ok) {
                    thumbBuffer = await botimgResponse.buffer();
                    resizedBotImg = await sharp(thumbBuffer)
                        .resize(200, 200, { fit: 'cover', position: 'center' })
                        .toBuffer();
                }
            } catch (e) { 
                console.log("Thumb error skipped:", e.message); 
            }
        }

        // ========== CLEAN MOVIE NAME ==========
        let cleanMovieName = movieName
            .replace("Sinhala Subtitles | සිංහල උපසිරැසි සමඟ", "")
            .replace("Sinhala Subtitle | සිංහල උපසිරැසි සමඟ", "")
            .trim();

        // ========== SEND DOCUMENT ==========
        const targetJid = config.JID || from;
        await conn.sendMessage(targetJid, {
            document: { url: downloadUrl },
            mimetype: 'video/mp4',
            fileName: `🎬 ${cleanMovieName}.mp4`,
            caption: `*🎬 Name :* *${cleanMovieName}*

*\`${quality || 'Movie'}\`*

${config.NAME}`,
            jpegThumbnail: resizedBotImg || thumbBuffer
        });

        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });

    } catch (e) {
        console.log("Critical Error Log:", e);
        await reply(`*❌ Error:* ${e.message}`);
        await conn.sendMessage(from, { react: { text: "⚠️", key: mek.key } });
    }
});

// ==================== CINESUBZ DETAILS CARD ====================
cmd({
    pattern: "cinedetails",
    react: '🎬',
    desc: "Movie details card from Cinesubz",
    filename: __filename
},
async (conn, m, mek, { from, q, isMe, reply }) => {
    try {
        if (!q) return await reply('⚠️ *Please provide the movie URL!*');

        const movieUrl = q;

        // ========== GET MOVIE DETAILS ==========
        let sadas = await fetchJson(`https://mr-thinuzz-api-build.vercel.app/api/cinesubz/movie?url=${encodeURIComponent(movieUrl)}&apiKey=key_13be1374312cdd0a`);

        if (!sadas || !sadas.status || !sadas.data) {
            return await conn.sendMessage(from, { text: '🚩 *Error: Could not fetch movie details!*' }, { quoted: mek });
        }

        const movie = sadas.data;
        let details = (await axios.get('https://raw.githubusercontent.com/thinura-nethsara/NEXUS-DATABASE/refs/heads/main/Main/main_var.json')).data;

        // ========== CLEAN DATA ==========
        let mainTitle = movie.maintitle || movie.title || 'N/A';
        if (mainTitle.includes("Sinhala Subtitles")) {
            mainTitle = mainTitle.replace("Sinhala Subtitles | සිංහල උපසිරැසි සමඟ", "").trim();
        }

        let ratingValue = 'N/A';
        if (movie.imdb && movie.imdb.value && movie.imdb.value !== "00") {
            ratingValue = movie.imdb.value;
        } else if (movie.rating && movie.rating.value && movie.rating.value !== "00") {
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
        if (movie.director && movie.director.name) {
            if (Array.isArray(movie.director.name)) {
                directorName = movie.director.name.join(', ');
            } else {
                directorName = movie.director.name;
            }
        }

        // ========== GET DOWNLOAD QUALITIES ==========
        let downloadQualities = 'N/A';
        if (movie.downloadUrl && movie.downloadUrl.length > 0) {
            const uniqueQualities = new Map();
            movie.downloadUrl.forEach((dl) => {
                const qualityKey = dl.quality.toLowerCase().replace(/[^a-z0-9]/g, '');
                if (!uniqueQualities.has(qualityKey)) {
                    uniqueQualities.set(qualityKey, dl);
                }
            });
            downloadQualities = Array.from(uniqueQualities.values()).map(dl => dl.quality).join(', ');
        }

        // ========== BUILD MESSAGE ==========
        let msg = `*☘️ 𝗧ɪᴛʟᴇ ➮* *_${mainTitle}_*

*📅 𝗬ᴇᴀʀ ➮* _${movie.dateCreate || 'N/A'}_
*⭐ 𝗜𝗠ᴅʙ 𝗥ᴀᴛɪɴɢ ➮* _${ratingValue}_
*⏰ 𝗥ᴜɴᴛɪᴍᴇ ➮* _${runtimeText}_
*🌍 𝗖ᴏᴜɴᴛʀʏ ➮* _${movie.country || 'N/A'}_
*🎭 𝗚𝗲𝗻𝗿𝗲𝘀 ➮* _${genres}_
*🎬 𝗗ɪʀᴇᴄᴛᴏʀ ➮* _${directorName}_
*📥 𝗗ᴏᴡɴʟᴏᴀᴅ 𝗤ᴜᴀʟɪᴛɪᴇꜱ ➮* _${downloadQualities}_

✨ *Follow us:* ${details.mvchlink}`;

        // ========== GET POSTER ==========
        let posterUrl = movie.mainImage;
        if (!posterUrl && movie.imageUrls && movie.imageUrls.length > 0) {
            posterUrl = movie.imageUrls[0];
        }
        if (!posterUrl) {
            posterUrl = 'https://cinesubz.lk/wp-content/uploads/2021/09/cropped-cropped-CineSubz-Icon-1.png';
        }

        // ========== SEND ==========
        await conn.sendMessage(config.JID || from, {
            image: { url: posterUrl },
            caption: msg
        });

        await conn.sendMessage(from, { react: { text: '✔️', key: mek.key } });

    } catch (error) {
        console.error('Error:', error);
        await conn.sendMessage(from, '⚠️ *An error occurred while fetching details.*', { quoted: mek });
    }
});

// ==================== CINESUBZ TEXT MODE (Search + Info + Download) ====================
cmd({
    pattern: "cinetext",
    react: '📝',
    category: "movie",
    alias: ["ct"],
    desc: "Cinesubz movie search (Text mode - no buttons)",
    use: ".cinetext avatar",
    filename: __filename
},
async (conn, m, mek, {
    from, q, prefix, isSudo, isOwner, isMe, reply
}) => {
    try {
        // ========== PREMIUM CHECK ==========
        const preUser = await fetchJson(`https://raw.githubusercontent.com/thinura-nethsara/NEXUS-DATABASE/refs/heads/main/Main/premium_user.json`);
        const preUsers = preUser.numbers.split(",");
        const senderNumber = m.sender.split('@')[0];
        const isPre = preUsers.some(preNumber => {
            const cleanPreNumber = preNumber.replace(/[^0-9]/g, '');
            return cleanPreNumber === senderNumber;
        });
        
        const mainVar = (await axios.get('https://raw.githubusercontent.com/thinura-nethsara/NEXUS-DATABASE/refs/heads/main/Main/main_var.json')).data;
        const isFree = mainVar.mvfree === "true";

        if (!isFree && !isMe && !isPre) {
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return await conn.sendMessage(from, {
                text: "*`You are not a premium user⚠️`*\n\n" +
                      "*Send a message to one of the 2 numbers below and buy Lifetime premium 🎉.*\n\n" +
                      "_Price : 200 LKR ✔️_\n\n" +
                      "*👨‍💻Contact us : 0774571418 , Error*"
            }, { quoted: mek });
        }

        if (config.MV_BLOCK === "true" && !isMe && !isSudo && !isOwner) {
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return await conn.sendMessage(from, {
                text: "*This command currently only works for the Bot owner.*"
            }, { quoted: mek });
        }

        if (!q) return await reply('*Please give me a movie name 🎬*');

        // ========== SEARCH API ==========
        const apiUrl = `https://mr-thinuzz-api-build.vercel.app/api/cinesubz/search?query=${encodeURIComponent(q)}&apiKey=key_13be1374312cdd0a`;
        const response = await axios.get(apiUrl);
        const result = response.data;

        if (!result.status || !result.data || (result.data.all && result.data.all.length === 0)) {
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return await conn.sendMessage(from, { text: '*No results found ❌*' }, { quoted: mek });
        }

        const results = result.data.all || [];
        
        // ========== BUILD TEXT MESSAGE ==========
        let msg = `*_CINESUBZ MOVIE SEARCH RESULTS 🎬_*\n\n`;
        msg += `*Input:* ${q}\n`;
        msg += `*Total Results:* ${result.total_results || results.length}\n\n`;
        msg += `*Select a movie by replying with the number:*\n\n`;

        results.slice(0, 15).forEach((item, index) => {
            const typeBadge = item.type === "TV" ? "📺" : "🎬";
            let cleanTitle = item.title
                .replace("Sinhala Subtitles | සිංහල උපසිරැසි සමඟ", "")
                .replace("Sinhala Subtitle | සිංහල උපසිරැසි සමඟ", "")
                .trim();
            const year = item.year ? ` (${item.year})` : '';
            msg += `${index + 1}. ${typeBadge} ${cleanTitle}${year}\n`;
        });

        msg += `\n💡 *Reply with a number (1-${Math.min(results.length, 15)}) to get download options*`;
        msg += `\n\n> _𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 ${config.NAME || 'NEXUS'} </>`;

        // ========== SEND SEARCH RESULTS ==========
        const sentMsg = await conn.sendMessage(from, {
            image: { url: results[0]?.image || 'https://cinesubz.lk/wp-content/uploads/2021/09/cropped-cropped-CineSubz-Icon-1.png' },
            caption: msg
        }, { quoted: mek });

        // ========== LISTENER FOR SELECTION ==========
        const listener = async (update) => {
            try {
                const updateMsg = update.messages[0];
                if (!updateMsg || !updateMsg.message) return;

                const body = updateMsg.message.conversation ||
                    updateMsg.message.extendedTextMessage?.text;

                const contextInfo = updateMsg.message.extendedTextMessage?.contextInfo;
                const isReplyToBot = contextInfo?.stanzaId === sentMsg.key.id;

                if (isReplyToBot) {
                    const selectedNumber = parseInt(body);
                    if (selectedNumber >= 1 && selectedNumber <= Math.min(results.length, 15)) {
                        bot.ev.off('messages.upsert', listener);

                        const selectedItem = results[selectedNumber - 1];
                        await conn.sendMessage(from, { react: { text: '⏳', key: updateMsg.key } });

                        // ========== GET MOVIE INFO ==========
                        const infoApi = `https://mr-thinuzz-api-build.vercel.app/api/cinesubz/movie?url=${encodeURIComponent(selectedItem.link)}&apiKey=key_13be1374312cdd0a`;
                        const infoRes = await axios.get(infoApi);
                        const movieData = infoRes.data.data;

                        if (!movieData) {
                            return await conn.sendMessage(from, { text: '🚩 *Error fetching movie details!*' }, { quoted: updateMsg });
                        }

                        // ========== BUILD INFO MESSAGE ==========
                        let cleanTitle = movieData.maintitle || movieData.title || 'N/A';
                        if (cleanTitle.includes("Sinhala Subtitles")) {
                            cleanTitle = cleanTitle.replace("Sinhala Subtitles | සිංහල උපසිරැසි සමඟ", "").trim();
                        }

                        let ratingText = 'N/A';
                        if (movieData.imdb && movieData.imdb.value && movieData.imdb.value !== "00") {
                            ratingText = movieData.imdb.value;
                        }

                        let genres = 'Movie';
                        if (movieData.category && movieData.category.length > 0) {
                            genres = movieData.category.join(', ');
                        }

                        let infoMsg = `*🍿 ${cleanTitle}*\n\n`;
                        infoMsg += `📅 *Year:* ${movieData.dateCreate || 'N/A'}\n`;
                        infoMsg += `⭐ *IMDb:* ${ratingText}\n`;
                        infoMsg += `🎭 *Genres:* ${genres}\n\n`;
                        infoMsg += `*📥 Download Options:*\n\n`;

                        // ========== SHOW DOWNLOAD OPTIONS ==========
                        if (movieData.downloadUrl && movieData.downloadUrl.length > 0) {
                            const uniqueLinks = new Map();
                            movieData.downloadUrl.forEach((dl) => {
                                const qualityKey = dl.quality.toLowerCase().replace(/[^a-z0-9]/g, '');
                                if (!uniqueLinks.has(qualityKey)) {
                                    uniqueLinks.set(qualityKey, dl);
                                }
                            });
                            
                            let dlIndex = 1;
                            Array.from(uniqueLinks.values()).forEach((dl) => {
                                let qualityName = dl.quality || 'Unknown';
                                if (qualityName.includes("BluRay")) {
                                    qualityName = qualityName.replace("BluRay", "").trim();
                                }
                                infoMsg += `${dlIndex}. ${qualityName} - ${dl.size || 'N/A'}\n`;
                                infoMsg += `   Reply with *${dlIndex}* to download\n\n`;
                                dlIndex++;
                            });
                        } else {
                            infoMsg += `❌ No download links available.\n\n`;
                        }

                        infoMsg += `> _𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 ${config.NAME || 'NEXUS'} </>`;

                        // ========== SEND MOVIE INFO ==========
                        const posterUrl = movieData.mainImage || movieData.imageUrls?.[0] || 'https://cinesubz.lk/wp-content/uploads/2021/09/cropped-cropped-CineSubz-Icon-1.png';
                        
                        const infoSentMsg = await conn.sendMessage(from, {
                            image: { url: posterUrl },
                            caption: infoMsg
                        }, { quoted: updateMsg });

                        // ========== DOWNLOAD LISTENER ==========
                        const dlListener = async (update) => {
                            try {
                                const dlUpdateMsg = update.messages[0];
                                if (!dlUpdateMsg || !dlUpdateMsg.message) return;

                                const dlBody = dlUpdateMsg.message.conversation ||
                                    dlUpdateMsg.message.extendedTextMessage?.text;

                                const dlContext = dlUpdateMsg.message.extendedTextMessage?.contextInfo;
                                const isDlReply = dlContext?.stanzaId === infoSentMsg.key.id;

                                if (isDlReply) {
                                    const dlNum = parseInt(dlBody);
                                    const uniqueLinks = new Map();
                                    movieData.downloadUrl.forEach((dl) => {
                                        const qualityKey = dl.quality.toLowerCase().replace(/[^a-z0-9]/g, '');
                                        if (!uniqueLinks.has(qualityKey)) {
                                            uniqueLinks.set(qualityKey, dl);
                                        }
                                    });
                                    const linksArray = Array.from(uniqueLinks.values());
                                    
                                    if (dlNum >= 1 && dlNum <= linksArray.length) {
                                        bot.ev.off('messages.upsert', dlListener);
                                        
                                        const selectedDl = linksArray[dlNum - 1];
                                        
                                        // ========== GET ACTUAL DOWNLOAD LINK ==========
                                        const downloadApi = `https://mr-thinuzz-api-build.vercel.app/api/cinesubz/download?url=${encodeURIComponent(selectedDl.link)}&apiKey=key_13be1374312cdd0a`;
                                        const dlResponse = await fetchJson(downloadApi);

                                        if (dlResponse?.status && dlResponse?.data?.downloadUrls) {
                                            const directLink = dlResponse.data.downloadUrls.find(item => 
                                                item.url && !item.url.includes("t.me") && !item.url.includes("telegram")
                                            );
                                            
                                            if (directLink) {
                                                await conn.sendMessage(from, { react: { text: '⬆️', key: dlUpdateMsg.key } });
                                                await conn.sendMessage(from, { text: '*Uploading your movie..⬆️*' }, { quoted: dlUpdateMsg });

                                                // ========== SEND DOCUMENT ==========
                                                let thumbBuffer = null;
                                                try {
                                                    const thumbRes = await fetch(posterUrl);
                                                    if (thumbRes.ok) {
                                                        thumbBuffer = await thumbRes.buffer();
                                                    }
                                                } catch (e) {}

                                                await conn.sendMessage(config.JID || from, {
                                                    document: { url: directLink.url },
                                                    mimetype: 'video/mp4',
                                                    fileName: `🎬 ${cleanTitle}.mp4`,
                                                    caption: `*🎬 Name :* *${cleanTitle}*

*\`${selectedDl.quality}\`*

${config.NAME}`,
                                                    jpegThumbnail: thumbBuffer
                                                });

                                                await conn.sendMessage(from, { react: { text: '✅', key: dlUpdateMsg.key } });
                                            } else {
                                                await conn.sendMessage(from, { text: '*❌ No direct download link found!*' }, { quoted: dlUpdateMsg });
                                            }
                                        } else {
                                            await conn.sendMessage(from, { text: '*❌ Failed to get download link!*' }, { quoted: dlUpdateMsg });
                                        }
                                    }
                                }
                            } catch (err) {
                                console.error("Download Listener Error:", err);
                            }
                        };

                        bot.ev.on('messages.upsert', dlListener);
                        setTimeout(() => {
                            bot.ev.off('messages.upsert', dlListener);
                        }, 120000);

                    }
                }
            } catch (err) {
                console.error("Selection Listener Error:", err);
            }
        };

        bot.ev.on('messages.upsert', listener);
        setTimeout(() => {
            bot.ev.off('messages.upsert', listener);
        }, 180000);

    } catch (e) {
        console.log("CINETEXT Error:", e);
        await conn.sendMessage(from, { text: '🚩 *Error occurred!*\n\n' + e.message }, { quoted: mek });
    }
});
