const { cmd } = require("../command");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

const API_KEY = "key_faa62e4037a95cda";
const BASE_API = "https://mr-thinuzz-api-build.vercel.app/api/sinhalasub";

// Allowed qualities (only these will be shown)
const ALLOWED_QUALITIES = ["SD 480p", "HD 720p", "FHD 1080p"];

// Provider priority order
const PROVIDER_PRIORITY = ["DLServer-01", "DLServer-02"];

cmd({
    pattern: "movie",
    alias: ["film", "sinhalasub"],
    react: "🎬",
    desc: "Search movies from Sinhalasub with Memory Protection.",
    category: "download",
    filename: __filename
}, async (bot, mek, m, { from, q, reply }) => {
    try {
        if (!q) return reply("🎬 *ZEUS X MOVIE ZONE*\n\nExample: .movie Avengers");

        // Search movies
        const searchRes = await axios.get(`${BASE_API}?keyword=${encodeURIComponent(q)}&apiKey=${API_KEY}`).catch(() => null);
        if (!searchRes || !searchRes.data.status || !searchRes.data.data.length) return reply("❌ කිසිදු ප්‍රතිඵලයක් හමු නොවීය.");

        const results = searchRes.data.data.slice(0, 10);
        let msg = `🎬 *ZEUS X MOVIE ZONE* 🎬\n\n`;
        results.forEach((res, index) => { 
            msg += `${index + 1}️⃣ *${res.Title}*\n`;
            msg += `   📊 ${res.Quality} | ⭐ ${res.Rating}\n\n`;
        });
        msg += `*Reply with the number to see quality list.* \n\n> _𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 𝐙𝐄𝐔𝐒 𝐈𝐍𝐂 </>_`;

        const sentMsg = await bot.sendMessage(from, { 
            image: { url: results[0].Img || "https://i.ibb.co/cXYtgWPV/Whats-App-Image-2026-06-18-at-7-35-46-PM.png" }, 
            caption: msg 
        }, { quoted: mek });

        const movieListener = async (update) => {
            try {
                const msgUpdate = update.messages[0];
                if (!msgUpdate.message) return;
                const body = msgUpdate.message.conversation || msgUpdate.message.extendedTextMessage?.text;
                const isReplyToBot = msgUpdate.message.extendedTextMessage?.contextInfo?.stanzaId === sentMsg.key.id;

                if (isReplyToBot && !isNaN(body)) {
                    const index = parseInt(body) - 1;
                    const selectedMovie = results[index];
                    if (selectedMovie) {
                        bot.ev.off('messages.upsert', movieListener);
                        await bot.sendMessage(from, { react: { text: '⏳', key: msgUpdate.key } });

                        // Get movie details
                        const infoRes = await axios.get(`${BASE_API}?url=${encodeURIComponent(selectedMovie.Link)}&apiKey=${API_KEY}`).catch(() => null);
                        if (!infoRes || !infoRes.data.status) return reply("❌ No download links found.");

                        const infoData = infoRes.data.data;
                        
                        // Filter only allowed qualities and preferred providers
                        let filteredLinks = infoData.download_links.filter(link => {
                            if (!ALLOWED_QUALITIES.includes(link.quality)) return false;
                            if (link.provider === "Telegram") return false;
                            return PROVIDER_PRIORITY.includes(link.provider);
                        });

                        // If no links from preferred providers, get any allowed quality (except Telegram)
                        if (filteredLinks.length === 0) {
                            filteredLinks = infoData.download_links.filter(link => {
                                if (!ALLOWED_QUALITIES.includes(link.quality)) return false;
                                if (link.provider === "Telegram") return false;
                                return true;
                            });
                        }

                        if (filteredLinks.length === 0) return reply("❌ No compatible download links found.");

                        // Sort by provider priority
                        filteredLinks.sort((a, b) => {
                            return PROVIDER_PRIORITY.indexOf(a.provider) - PROVIDER_PRIORITY.indexOf(b.provider);
                        });

                        let infoMsg = `🎬 *${infoData.title}*\n\n*Available Qualities:* \n\n`;
                        filteredLinks.forEach((dl, i) => { 
                            infoMsg += `${i + 1}️⃣ ${dl.quality} (${dl.size}) - ${dl.provider}\n`; 
                        });
                        infoMsg += `\n> *Reply with the number to download.*`;

                        const infoSent = await bot.sendMessage(from, { 
                            image: { url: infoData.poster || selectedMovie.Img }, 
                            caption: infoMsg 
                        }, { quoted: msgUpdate });

                        const qualityListener = async (qUpdate) => {
                            try {
                                const qMsg = qUpdate.messages[0];
                                const qBody = qMsg.message?.conversation || qMsg.message?.extendedTextMessage?.text;
                                if (qMsg.message?.extendedTextMessage?.contextInfo?.stanzaId === infoSent.key.id && !isNaN(qBody)) {
                                    const selectedDl = filteredLinks[parseInt(qBody) - 1];
                                    if (selectedDl) {
                                        bot.ev.off('messages.upsert', qualityListener);
                                        await bot.sendMessage(from, { react: { text: '⬇️', key: qMsg.key } });

                                        const waitMsg = await reply("📥 *Downloading...* \n*Mode: Direct Stream*");

                                        // Send video directly using URL (streaming)
                                        await bot.sendMessage(from, { 
                                            video: { url: selectedDl.url },
                                            caption: `🎬 *${infoData.title}*\n📊 *Quality:* ${selectedDl.quality}\n⚖️ *Size:* ${selectedDl.size}\n📦 *Provider:* ${selectedDl.provider}\n\n> _𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 𝐙𝐄𝐔𝐒 𝐈𝐍𝐂 </>_`
                                        }, { 
                                            quoted: qMsg,
                                            mediaUploadTimeoutMs: 1000 * 60 * 60,
                                            generateHighQualityLinkPreview: false 
                                        });

                                        // Force memory cleanup
                                        if (global.gc) global.gc();

                                        await bot.sendMessage(from, { delete: waitMsg.key }).catch(() => null);
                                        await bot.sendMessage(from, { react: { text: '✅', key: qMsg.key } });
                                    }
                                }
                            } catch (err) { 
                                console.error(err);
                                reply("❌ Error: " + err.message);
                            }
                        };
                        bot.ev.on('messages.upsert', qualityListener);
                    }
                }
            } catch (err) { console.error(err); }
        };
        bot.ev.on('messages.upsert', movieListener);
    } catch (e) { console.error(e); }
});
