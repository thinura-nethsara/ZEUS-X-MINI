const { cmd, commands } = require('../command');
const config = require('../config');
const aliveMsg = require('./aliveMsg');
const axios = require('axios'); 

const CHANNEL_JID = "120363406265537739@newsletter"; 

// --- 🖼️ IMAGE PRE-LOAD LOGIC ---
let cachedAliveImage = null;

async function preLoadAliveImage() {
    try {
        // මෙතනදී config එකේ තියෙන default image එක cache කරගන්නවා
        const imageUrl = config.ALIVE_IMG || "https://raw.githubusercontent.com/Akashkavindu/MINI-BOT-SOURCE/main/zanta-md.png";
        const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        cachedAliveImage = Buffer.from(response.data);
        console.log("✅ [CACHE] Alive image pre-loaded successfully.");
    } catch (e) {
        console.error("❌ [CACHE] Failed to pre-load alive image:", e.message);
        cachedAliveImage = null; 
    }
}

preLoadAliveImage();

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
        const botName = settings.botName || config.DEFAULT_BOT_NAME || "ZANTA-MD";
        const prefix = settings.prefix || config.DEFAULT_PREFIX || ".";
        const isButtonsOn = settings.buttons === 'true';

        // Placeholder replace කිරීම
        const finalMsg = aliveMsg.getAliveMessage()
            .replace(/{BOT_NAME}/g, botName)
            .replace(/{OWNER_NUMBER}/g, config.OWNER_NUMBER)
            .replace(/{PREFIX}/g, prefix);

        try {
            const aliveVoiceUrl = 'https://github.com/Akashkavindu/ZANTA_MD/raw/main/images/alive.mp3'; 
            const vResponse = await axios.get(aliveVoiceUrl, { responseType: 'arraybuffer' });
            const vBuffer = Buffer.from(vResponse.data, 'utf-8');

            // voice එක ගිහින් ඉවර වෙනකම් await එකෙන් ඉන්නවා
            await zanta.sendMessage(from, { 
                audio: vBuffer, 
                mimetype: 'audio/mpeg', 
                ptt: false, 
                fileName: 'Alive.mp3'
            }, { quoted: mek });

        } catch (voiceError) {
            console.error("[ALIVE VOICE ERROR]", voiceError.message);
        }

        // --- 🖼️ IMAGE LOGIC: DB එකේ තියෙන එක මුලින් බලනවා, නැතිනම් Cache/Config පාවිච්චි කරනවා ---
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
                footer: `© ${botName} - Cyber System`,
                buttons: [
                    { buttonId: prefix + "ping", buttonText: { displayText: "⚡ PING" }, type: 1 },
                    { buttonId: prefix + "menu", buttonText: { displayText: "📜 MENU" }, type: 1 },
                    { buttonId: prefix + "settings", buttonText: { displayText: "⚙️ SETTINGS" }, type: 1 },
                    { buttonId: prefix + "help", buttonText: { displayText: "📞 HELP" }, type: 1 }
                ],
                headerType: 4, 
                contextInfo: {
                    forwardingScore: 999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: CHANNEL_JID,
                        serverMessageId: 100,
                        newsletterName: "𝒁𝑨𝑵𝑻𝑨-𝑴𝑫 𝑶𝑭𝑭𝑰𝑪𝑰𝑨𝑳"
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
                        newsletterName: "𝒁𝑨𝑵𝑻𝑨-𝑴𝑫 𝑶𝑭𝑭𝑰𝑪𝑰𝑨𝑳"
                    }
                }
            }, { quoted: mek });
        }

    } catch (e) {
        console.error("[ALIVE ERROR]", e);
        reply(`❌ Error: ${e.message}`);
    }
});
