const { cmd, commands } = require('../command');
const config = require('../config');
const axios = require('axios');

const CHANNEL_JID = "120363425542933159@newsletter";

// ============================================
// 🟢 ALIVE MESSAGE FUNCTION - PREFIX DYNAMIC
// ============================================
function getAliveMessage(botInfo = {}) {
    // ශ්‍රී ලාංකික වේලාව (UTC+5:30)
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

    // Dynamic Greeting
    const hour = sriLankaTime.getHours();
    let greeting = "ɢᴏᴏᴅ ᴍᴏʀɴɪɴɢ ☀️";
    if (hour >= 12 && hour < 17) greeting = "ɢᴏᴏᴅ ᴀꜰᴛᴇʀɴᴏᴏɴ 🌤️";
    else if (hour >= 17 && hour < 21) greeting = "ɢᴏᴏᴅ ᴇᴠᴇɴɪɴɢ 🌅";
    else if (hour >= 21 || hour < 5) greeting = "ɢᴏᴏᴅ ɴɪɢʜᴛ 🌙";

    // Uptime
    const uptimeSec = botInfo.uptime || 0;
    const days = Math.floor(uptimeSec / 86400);
    const hours = Math.floor((uptimeSec % 86400) / 3600);
    const mins = Math.floor((uptimeSec % 3600) / 60);
    const uptimeStr = days > 0 ? `${days}d ${hours}h ${mins}m` : `${hours}h ${mins}m`;

    // 🟢 PREFIX DYNAMIC - Config එකෙන් හෝ botInfo වලින් ගන්න
    // පළමුව botInfo වලින්, නැත්නම් config වලින්, නැත්නම් default එක
    const prefix = botInfo.prefix || config.DEFAULT_PREFIX || '/';

    return `
◈◈◈◈◈◈◈◈◈◈◈
✦ ─── *${botInfo.botName || 'ZEUS XMD'}* ─── ✦
◈◈◈◈◈◈◈◈◈◈◈
${greeting} ✨
\`✦  ᴘʀᴇꜰɪx   :  ${prefix}\`
\`✦  ᴅᴀᴛᴇ     :  ${date}\`
\`✦  ᴛɪᴍᴇ     :  ${time}\`
\`✦  ᴜᴘᴛɪᴍᴇ  :  ${uptimeStr}\`
◈◈◈◈◈◈◈◈◈◈◈
*“ ʀᴇᴀᴅʏ ᴛᴏ ᴀꜱꜱɪꜱᴛ ”*
*⚡ ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴢᴇᴜꜱ ɪɴᴄ ⚡*
`;
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
// 🟢 ALIVE COMMAND
// ============================================
cmd({
    pattern: "alive",
    react: "🤖",
    desc: "Check if the bot is online.",
    category: "main",
    filename: __filename
},
async (zanta, mek, m, { from, reply, userSettings }) => {
    try {
        const settings = userSettings || global.CURRENT_BOT_SETTINGS || {};
        const botName = settings.botName || config.DEFAULT_BOT_NAME || "ZEUS-X-MINI";
        
        // 🟢 PREFIX එක Dynamic විදියට ගන්න
        const prefix = settings.prefix || config.DEFAULT_PREFIX || ".";
        const isButtonsOn = settings.buttons === 'true';

        // Uptime ගණනය
        const uptime = process.uptime();

        // 🟢 getAliveMessage call කරන්න - මෙතනදි prefix එක pass කරනවා
        const finalMsg = getAliveMessage({
            botName: botName,
            prefix: prefix,  // 🟢 මෙතනින් update වෙන prefix එක pass වෙනවා
            uptime: uptime
        });

        // Voice Message
        try {
            const aliveVoiceUrl = 'https://zeus-x-md-database.pages.dev/Data/Hii.mpeg';
            const vResponse = await axios.get(aliveVoiceUrl, { responseType: 'arraybuffer' });
            const vBuffer = Buffer.from(vResponse.data, 'utf-8');

            await zanta.sendMessage(from, {
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

        if (isButtonsOn) {
            // --- 🔵 BUTTONS ON MODE ---
            return await zanta.sendMessage(from, {
                image: imageToDisplay,
                caption: finalMsg,
                buttons: [
                    { buttonId: prefix + "ping", buttonText: { displayText: "ᴘɪɴɢ" }, type: 1 },
                    { buttonId: prefix + "menu", buttonText: { displayText: "ᴍᴇɴᴜ" }, type: 1 },
                    { buttonId: prefix + "settings", buttonText: { displayText: "sᴇᴛᴛɪɴɢs" }, type: 1 },
                    { buttonId: prefix + "help", buttonText: { displayText: "ʜᴇʟᴘᴍᴇ" }, type: 1 }
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
            }, { quoted: mek });

        } else {
            // --- 🟢 BUTTONS OFF MODE ---
            return await zanta.sendMessage(from, {
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
