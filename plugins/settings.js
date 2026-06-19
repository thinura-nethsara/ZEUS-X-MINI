const { cmd } = require("../command");
const { updateSetting } = require("./bot_db");
const config = require("../config");

// Default Image Link
const DEFAULT_IMG = "https://zeus-x-md-database.pages.dev/Data/zeus-x-main.jpeg";

const lastSettingsMessage = new Map();
const lastSecurityMessage = new Map(); // Security sub-menu එක track කිරීමට

// Helper function to generate BASIC CONFIGS section
function generateBasicConfigs(settings, botName, ownerName, botPrefix, webPass, workType, botImageStatus, displayImg) {
    let text = `⚡ *${botName.toUpperCase()} - BASIC CONFIGS* ⚡\n\n`;
    text += `01. 🤖 *Bot Name:* ${botName}\n`;
    text += `02. 👤 *Owner Name:* ${ownerName}\n`;
    text += `03. 🎮 *Bot Prefix:* [ ${botPrefix} ]\n`;
    text += `04. 🔐 *Work Mode:* ${workType}\n`;
    text += `05. 🔑 *Web Password:* ${webPass}\n`;
    text += `06. 🖼️ *Bot Image:* ${botImageStatus}\n\n`;
    text += `*💡 EDIT SETTINGS:* \n`;
    text += `Reply with number + value.\n`;
    text += `Ex: Reply *1 newname* or *3 .*\n\n`;
    text += `> _𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 𝐙𝐄𝐔𝐒 𝐈𝐍𝐂 </>_ 🇱🇰`;
    return text;
}

// Helper function to generate BOT SETTINGS section
function generateBotSettings(settings, botName) {
    const getStatus = (val) => val === 'true' ? '『 ✅ ON 』' : '『 ❌ OFF 』';
    const getAntiDeleteStatus = (val) => {
        if (val === "1") return '『 👤 USER CHAT 』';
        if (val === "2") return '『 📥 YOUR CHAT 』';
        return '『 ❌ OFF 』';
    };
    const isSecurityOn = settings.badWords === "true" || settings.antiLink === "true" || settings.antiCmd === "true" || settings.antiBot === "true";
    const securityStatus = isSecurityOn ? '『 ✅ ON 』' : '『 ❌ OFF 』';

    let text = `⚡ *${botName.toUpperCase()} - BOT SETTINGS* ⚡\n\n`;
    text += `07. 🚀 *Always Online:* ${getStatus(settings.alwaysOnline)}\n`;
    text += `08. 📩 *Auto Read:* ${getStatus(settings.autoRead)}\n`;
    text += `09. ⌨️ *Auto Typing:* ${getStatus(settings.autoTyping)}\n`;
    text += `10. 👁️ *Status Seen:* ${getStatus(settings.autoStatusSeen)}\n`;
    text += `11. ❤️ *Status React:* ${getStatus(settings.autoStatusReact)}\n`;
    text += `12. 📑 *Read Cmd:* ${getStatus(settings.readCmd)}\n`;
    text += `13. 🎙️ *Recording Voice:* ${getStatus(settings.autoVoice)}\n`;
    text += `14. 🤖 *Auto Reply:* ${getStatus(settings.autoReply)}\n`;
    text += `15. 🔔 *Connect Msg:* ${getStatus(settings.connectionMsg)}\n`;
    text += `16. 🔘 *Buttons:* ${getStatus(settings.buttons)}\n`;
    text += `17. 🎵 *Voice Reply:* ${getStatus(settings.autoVoiceReply)}\n`;
    text += `18. 🛡️ *Anti-Delete:* ${getAntiDeleteStatus(settings.antidelete)}\n`;
    text += `19. ⚡ *Auto React:* ${getStatus(settings.autoReact)}\n`;
    text += `20. 🛡️ *Group Security:* ${securityStatus}\n\n`;
    text += `*💡 EDIT SETTINGS:* \n`;
    text += `Reply with number + value.\n`;
    text += `Ex: Reply *7 on* or *7 off*\n\n`;
    text += `> _𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 𝐙𝐄𝐔𝐒 𝐈𝐍𝐂 </>_ 🇱🇰`;
    return text;
}

cmd({
    pattern: "settings",
    alias: ["set", "dashboard", "status"],
    desc: "Display and edit bot settings via reply.",
    category: "main",
    react: "⚙️",
    filename: __filename,
}, async (zanta, mek, m, { from, reply, sender, isOwner, prefix, userSettings }) => {

    // --- 🛡️ Access Control Setup ---
    const allowedNumbers = [
        "94774571418", 
        "94743404814", 
        "94766247995", 
        "122286761861330", 
        "270819766866076"
    ];

    const senderNumber = sender.split("@")[0].replace(/[^\d]/g, "");
    const isAllowed = allowedNumbers.includes(senderNumber) || isOwner;

    if (!isAllowed) {
        return reply("🚫 *අවසර නැත!* \n\nමෙම Dashboard එක භාවිතා කළ හැක්කේ බොට් අයිතිකරුට හෝ විශේෂ අවසර ලත් පරිශීලකයින්ට පමණි.");
    }

    // --- 📊 Settings Configuration ---
    const settings = userSettings || global.BOT_SESSIONS_CONFIG[senderNumber] || {};
    const botName = settings.botName || config.DEFAULT_BOT_NAME || "ZEUS-X-MINI";
    const ownerName = settings.ownerName || config.DEFAULT_OWNER_NAME || "Owner";
    const botPrefix = settings.prefix || prefix || ".";
    const webPass = settings.password === 'not_set' ? "Not Set ❌" : "Set ✅";
    const workType = (settings.workType || "public").toUpperCase();
    
    // --- 🖼️ Image Logic ---
    const botImageStatus = (settings.botImage && settings.botImage !== "null") ? "Updated ✅" : "Default 🖼️";
    const displayImg = (settings.botImage && settings.botImage !== "null") ? settings.botImage : DEFAULT_IMG;

    // --- 📊 Status Indicators (for full dashboard) ---
    const getStatus = (val) => val === 'true' ? '『 ✅ ON 』' : '『 ❌ OFF 』';
    const getAntiDeleteStatus = (val) => {
        if (val === "1") return '『 👤 USER CHAT 』';
        if (val === "2") return '『 📥 YOUR CHAT 』';
        return '『 ❌ OFF 』';
    };
    const isSecurityOn = settings.badWords === "true" || settings.antiLink === "true" || settings.antiCmd === "true" || settings.antiBot === "true";
    const securityStatus = isSecurityOn ? '『 ✅ ON 』' : '『 ❌ OFF 』';

    // Check if buttons are enabled
    const isButtonsOn = settings.buttons === 'true';

    // ---------- BUTTON MODE ----------
    if (isButtonsOn) {
        // Full dashboard caption (for main message)
        let statusText = `⚡ *${botName.toUpperCase()} SYSTEM DASHBOARD* ⚡\n\n`;
        statusText += `*—「 BASIC CONFIGS 」—*\n\n`;
        statusText += `01. 🤖 *Bot Name:* ${botName}\n`;
        statusText += `02. 👤 *Owner Name:* ${ownerName}\n`;
        statusText += `03. 🎮 *Bot Prefix:* [ ${botPrefix} ]\n`;
        statusText += `04. 🔐 *Work Mode:* ${workType}\n`;
        statusText += `05. 🔑 *Web Password:* ${webPass}\n`;
        statusText += `06. 🖼️ *Bot Image:* ${botImageStatus}\n\n`;
        statusText += `*—「 BOT SETTINGS 」—*\n\n`;
        statusText += `07. 🚀 *Always Online:* ${getStatus(settings.alwaysOnline)}\n`;
        statusText += `08. 📩 *Auto Read:* ${getStatus(settings.autoRead)}\n`;
        statusText += `09. ⌨️ *Auto Typing:* ${getStatus(settings.autoTyping)}\n`;
        statusText += `10. 👁️ *Status Seen:* ${getStatus(settings.autoStatusSeen)}\n`;
        statusText += `11. ❤️ *Status React:* ${getStatus(settings.autoStatusReact)}\n`;
        statusText += `12. 📑 *Read Cmd:* ${getStatus(settings.readCmd)}\n`;
        statusText += `13. 🎙️ *Recording Voice:* ${getStatus(settings.autoVoice)}\n`;
        statusText += `14. 🤖 *Auto Reply:* ${getStatus(settings.autoReply)}\n`;
        statusText += `15. 🔔 *Connect Msg:* ${getStatus(settings.connectionMsg)}\n`;
        statusText += `16. 🔘 *Buttons:* ${getStatus(settings.buttons)}\n`;
        statusText += `17. 🎵 *Voice Reply:* ${getStatus(settings.autoVoiceReply)}\n`;
        statusText += `18. 🛡️ *Anti-Delete:* ${getAntiDeleteStatus(settings.antidelete)}\n`;
        statusText += `19. ⚡ *Auto React:* ${getStatus(settings.autoReact)}\n`;
        statusText += `20. 🛡️ *Group Security:* ${securityStatus}\n\n`;
        statusText += `*💡 EDIT SETTINGS:* \n`;
        statusText += `Reply with number + value.\n`;
        statusText += `Ex: Reply *16 on* or *16 off*\n\n`;
        statusText += `> _𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 𝐙𝐄𝐔𝐒 𝐈𝐍𝐂 </>_ 🇱🇰`;

        // Send main dashboard with two buttons
        const mainButtons = [
            {
                buttonId: "settings_basic",
                buttonText: { displayText: "⚙️ BASIC CONFIGS" },
                type: 1
            },
            {
                buttonId: "settings_bot",
                buttonText: { displayText: "🤖 BOT SETTINGS" },
                type: 1
            }
        ];

        const sentMsg = await zanta.sendMessage(from, {
            image: { url: displayImg },
            caption: statusText,
            buttons: mainButtons,
            headerType: 4
        }, { quoted: mek });

        lastSettingsMessage.set(from, sentMsg.key.id);

        // Listener for button clicks
        const buttonListener = async (update) => {
            try {
                const msg = update.messages[0];
                if (!msg?.message?.buttonsResponseMessage) return;

                const contextInfo = msg.message.buttonsResponseMessage.contextInfo ||
                                   msg.message.extendedTextMessage?.contextInfo;
                if (!contextInfo || contextInfo.stanzaId !== sentMsg.key.id) return;

                const btnId = msg.message.buttonsResponseMessage.selectedButtonId;
                
                if (btnId === "settings_basic") {
                    // Show BASIC CONFIGS
                    const basicText = generateBasicConfigs(settings, botName, ownerName, botPrefix, webPass, workType, botImageStatus, displayImg);
                    await zanta.sendMessage(from, {
                        image: { url: displayImg },
                        caption: basicText
                    }, { quoted: msg });
                    await zanta.sendMessage(from, { react: { text: '⚙️', key: msg.key } });
                } else if (btnId === "settings_bot") {
                    // Show BOT SETTINGS
                    const botText = generateBotSettings(settings, botName);
                    await zanta.sendMessage(from, {
                        image: { url: displayImg },
                        caption: botText
                    }, { quoted: msg });
                    await zanta.sendMessage(from, { react: { text: '🤖', key: msg.key } });
                }
            } catch (err) {
                console.error("Settings button listener error:", err);
            }
        };

        zanta.ev.on('messages.upsert', buttonListener);
        setTimeout(() => {
            zanta.ev.off('messages.upsert', buttonListener);
        }, 300000);

        return; // End of button mode
    }

    // ---------- TEXT MODE (Buttons OFF) ----------
    // Show full dashboard with options 1 and 2
    let statusText = `⚡ *${botName.toUpperCase()} SYSTEM DASHBOARD* ⚡\n\n`;
    statusText += `*—「 BASIC CONFIGS 」—*\n\n`;
    statusText += `01. 🤖 *Bot Name:* ${botName}\n`;
    statusText += `02. 👤 *Owner Name:* ${ownerName}\n`;
    statusText += `03. 🎮 *Bot Prefix:* [ ${botPrefix} ]\n`;
    statusText += `04. 🔐 *Work Mode:* ${workType}\n`;
    statusText += `05. 🔑 *Web Password:* ${webPass}\n`;
    statusText += `06. 🖼️ *Bot Image:* ${botImageStatus}\n\n`;
    statusText += `*—「 BOT SETTINGS 」—*\n\n`;
    statusText += `07. 🚀 *Always Online:* ${getStatus(settings.alwaysOnline)}\n`;
    statusText += `08. 📩 *Auto Read:* ${getStatus(settings.autoRead)}\n`;
    statusText += `09. ⌨️ *Auto Typing:* ${getStatus(settings.autoTyping)}\n`;
    statusText += `10. 👁️ *Status Seen:* ${getStatus(settings.autoStatusSeen)}\n`;
    statusText += `11. ❤️ *Status React:* ${getStatus(settings.autoStatusReact)}\n`;
    statusText += `12. 📑 *Read Cmd:* ${getStatus(settings.readCmd)}\n`;
    statusText += `13. 🎙️ *Recording Voice:* ${getStatus(settings.autoVoice)}\n`;
    statusText += `14. 🤖 *Auto Reply:* ${getStatus(settings.autoReply)}\n`;
    statusText += `15. 🔔 *Connect Msg:* ${getStatus(settings.connectionMsg)}\n`;
    statusText += `16. 🔘 *Buttons:* ${getStatus(settings.buttons)}\n`;
    statusText += `17. 🎵 *Voice Reply:* ${getStatus(settings.autoVoiceReply)}\n`;
    statusText += `18. 🛡️ *Anti-Delete:* ${getAntiDeleteStatus(settings.antidelete)}\n`;
    statusText += `19. ⚡ *Auto React:* ${getStatus(settings.autoReact)}\n`;
    statusText += `20. 🛡️ *Group Security:* ${securityStatus}\n\n`;
    statusText += `*💡 EDIT SETTINGS:* \n`;
    statusText += `Reply with number + value.\n`;
    statusText += `Ex: Reply *16 on* or *16 off*\n\n`;
    statusText += `*📌 VIEW SECTIONS:*\n`;
    statusText += `1️⃣ - BASIC CONFIGS only\n`;
    statusText += `2️⃣ - BOT SETTINGS only\n\n`;
    statusText += `> _𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 𝐙𝐄𝐔𝐒 𝐈𝐍𝐂 </>_ 🇱🇰`;

    const sentMsg = await zanta.sendMessage(from, {
        image: { url: displayImg },
        caption: statusText
    }, { quoted: mek });

    lastSettingsMessage.set(from, sentMsg.key.id);

    // Listener for text replies (number 1 or 2)
    const textListener = async (update) => {
        try {
            const msg = update.messages[0];
            if (!msg?.message) return;
            const body = msg.message.conversation || msg.message.extendedTextMessage?.text;
            if (!body) return;

            const contextInfo = msg.message.extendedTextMessage?.contextInfo;
            if (!contextInfo || contextInfo.stanzaId !== sentMsg.key.id) return;

            const num = parseInt(body.trim());
            if (num === 1) {
                // Show BASIC CONFIGS
                const basicText = generateBasicConfigs(settings, botName, ownerName, botPrefix, webPass, workType, botImageStatus, displayImg);
                await zanta.sendMessage(from, {
                    image: { url: displayImg },
                    caption: basicText
                }, { quoted: msg });
                await zanta.sendMessage(from, { react: { text: '⚙️', key: msg.key } });
            } else if (num === 2) {
                // Show BOT SETTINGS
                const botText = generateBotSettings(settings, botName);
                await zanta.sendMessage(from, {
                    image: { url: displayImg },
                    caption: botText
                }, { quoted: msg });
                await zanta.sendMessage(from, { react: { text: '🤖', key: msg.key } });
            }
        } catch (err) {
            console.error("Settings text listener error:", err);
        }
    };

    zanta.ev.on('messages.upsert', textListener);
    setTimeout(() => {
        zanta.ev.off('messages.upsert', textListener);
    }, 300000);

    // Memory Cleanup
    setTimeout(() => {
        if (lastSettingsMessage.get(from) === sentMsg.key.id) {
            lastSettingsMessage.delete(from);
        }
    }, 30 * 60 * 1000); 
});

module.exports = { lastSettingsMessage, lastSecurityMessage };
