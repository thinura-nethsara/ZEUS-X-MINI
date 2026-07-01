const { cmd, commands } = require('../command');
const config = require('../config');
const axios = require('axios');

const CHANNEL_JID = "120363425542933159@newsletter";

// ============================================
// 🟢 ALIVE MESSAGE FUNCTION - NEW DESIGN
// ============================================
function getAliveMessage(botInfo = {}) {
    const now = new Date();
    const sriLankaTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
    
    const date = sriLankaTime.toLocaleDateString('en-US', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
    });
    const time = sriLankaTime.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit', 
        hour12: false 
    });

    const hour = sriLankaTime.getHours();
    let greeting = "ɢᴏᴏᴅ ᴍᴏʀɴɪɴɢ ☀️";
    if (hour >= 12 && hour < 17) greeting = "ɢᴏᴏᴅ ᴀꜰᴛᴇʀɴᴏᴏɴ 🌤️";
    else if (hour >= 17 && hour < 21) greeting = "ɢᴏᴏᴅ ᴇᴠᴇɴɪɴɢ 🌅";
    else if (hour >= 21 || hour < 5) greeting = "ɢᴏᴏᴅ ɴɪɢʜᴛ 🌙";

    const uptimeSec = botInfo.uptime || 0;
    const days = Math.floor(uptimeSec / 86400);
    const hours = Math.floor((uptimeSec % 86400) / 3600);
    const mins = Math.floor((uptimeSec % 3600) / 60);
    const uptimeStr = days > 0 ? `${days}d ${hours}h ${mins}m` : `${hours}h ${mins}m`;

    const prefix = botInfo.prefix || config.DEFAULT_PREFIX || '/';

    return `
╭━〔 ${botInfo.botName || 'ZEUS X MD'} 〕
|   *${greeting}*
╰──────────●●►

╭─「 ᴅᴀᴛᴇ 」
│📅 Date: ${date}
│⏰ Time: ${time}
╰──────────●●►

╭─「 ꜱᴛᴀᴛᴜꜱ ᴅᴇᴛᴀɪʟꜱ 」
│✒️ Prefix: ${prefix}
│🧬 Version: 1.0.0
│📟 Uptime: ${uptimeStr}
╰──────────●●►

> _𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 𝐙𝐄𝐔𝐒 𝐈𝐍𝐂 </>_`;
}
// ============================================

// --- 🖼️ IMAGE PRE-LOAD LOGIC ---
let cachedAliveImage = null;

async function preLoadAliveImage() {
    try {
        const imageUrl = config.ALIVE_IMG || "https://zeus-x-md-database.pages.dev/Data/zeus-x-main.jpeg//";
        const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        cachedAliveImage = Buffer.from(response.data);
        console.log("✅ [CACHE] Alive image pre-loaded successfully.");
    } catch (e) {
        console.error("❌ [CACHE] Failed to pre-load alive image:", e.message);
        cachedAliveImage = null;
    }
}

preLoadAliveImage();

// ============================================
// 🟢 ALIVE COMMAND - WITHOUT LIST BUTTONS
// ============================================
cmd({
    pattern: "alive",
    react: "🤖",
    desc: "Check if the bot is online.",
    category: "main",
    filename: __filename
},
async (zeus, mek, m, { from, reply, userSettings }) => {
    try {
        const settings = userSettings || global.CURRENT_BOT_SETTINGS || {};
        const botName = settings.botName || config.DEFAULT_BOT_NAME || "ZEUS-X-MINI";
        const prefix = settings.prefix || config.DEFAULT_PREFIX || ".";
        const isButtonsOn = settings.buttons === 'true';
        const uptime = process.uptime();

        const finalMsg = getAliveMessage({
            botName: botName,
            prefix: prefix,
            uptime: uptime
        });

        // Voice Message
        try {
            const aliveVoiceUrl = 'https://zeus-x-md-database.pages.dev/Data/Hii.mpeg';
            const vResponse = await axios.get(aliveVoiceUrl, { responseType: 'arraybuffer' });
            const vBuffer = Buffer.from(vResponse.data, 'utf-8');

            await zeus.sendMessage(from, {
                audio: vBuffer,
                mimetype: 'audio/mpeg',
                ptt: false,
                fileName: 'Alive.mp3'
            }, { quoted: mek });
        } catch (voiceError) {
            console.error("[ALIVE VOICE ERROR]", voiceError.message);
        }

        // --- 🖼️ IMAGE LOGIC ---
        let imageToDisplay;
        if (settings.botImage && settings.botImage !== "null" && settings.botImage.startsWith("http")) {
            imageToDisplay = { url: settings.botImage };
        } else {
            imageToDisplay = cachedAliveImage || { url: config.ALIVE_IMG };
        }

        // ============================================
        // 🆕 BUTTON SYSTEM WITHOUT LIST - USING SEPARATE BUTTONS
        // ============================================
        if (isButtonsOn) {
            // Send image with buttons (without list)
            const buttonMessage = {
                image: imageToDisplay,
                caption: finalMsg,
                buttons: [
                    {
                        buttonId: `${prefix}ping`,
                        buttonText: { displayText: "📡 ᴘɪɴɢ" },
                        type: 1
                    },
                    {
                        buttonId: `${prefix}menu`,
                        buttonText: { displayText: "📋 ᴍᴇɴᴜ" },
                        type: 1
                    },
                    {
                        buttonId: `${prefix}settings`,
                        buttonText: { displayText: "⚙️ sᴇᴛᴛɪɴɢs" },
                        type: 1
                    },
                    {
                        buttonId: `${prefix}help`,
                        buttonText: { displayText: "❓ ʜᴇʟᴘ" },
                        type: 1
                    }
                ],
                headerType: 4,
                contextInfo: {
                    forwardingScore: 999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: CHANNEL_JID,
                        serverMessageId: 100,
                        newsletterName: "𝒁 𝑬 𝑼 𝑺  𝑿 𝑴 𝑫  𝑩𝑶𝑻𝒁 𝑰𝑵𝑪 </> 🇱🇰"
                    }
                }
            };

            return await zeus.sendMessage(from, buttonMessage, { quoted: mek });
        } else {
            // Send image without buttons
            return await zeus.sendMessage(from, {
                image: imageToDisplay,
                caption: finalMsg,
                contextInfo: {
                    forwardingScore: 999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: CHANNEL_JID,
                        serverMessageId: 100,
                        newsletterName: "𝒁 𝑬 𝑼 𝑺  𝑿 𝑴 𝑫  𝑩𝑶𝑻𝒁 𝑰𝑵𝑪 </> 🇱🇰"
                    }
                }
            }, { quoted: mek });
        }

    } catch (e) {
        console.error("[ALIVE ERROR]", e);
        reply(`❌ Error: ${e.message}`);
    }
});
