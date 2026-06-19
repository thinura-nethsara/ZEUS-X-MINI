const { cmd } = require("../command");
const { updateSetting } = require("./bot_db");
const config = require("../config");

// Default Image Link
const DEFAULT_IMG = "https://zeus-x-md-database.pages.dev/Data/zeus-x-main.jpeg";

const lastSettingsMessage = new Map();

// --- Helper Functions ---
function getStatus(val) {
    return val === 'true' ? '✅ ON' : '❌ OFF';
}

function getAntiDeleteStatus(val) {
    if (val === "1") return '👤 USER CHAT';
    if (val === "2") return '📥 YOUR CHAT';
    return '❌ OFF';
}

function generateBasicConfigs(settings, botName, ownerName, botPrefix, webPass, workType, botImageStatus) {
    let text = `⚡ *${botName.toUpperCase()} - BASIC CONFIGS* ⚡\n\n`;
    text += `1. 🤖 *Bot Name:* ${botName}\n`;
    text += `2. 👤 *Owner Name:* ${ownerName}\n`;
    text += `3. 🎮 *Bot Prefix:* [ ${botPrefix} ]\n`;
    text += `4. 🔐 *Work Mode:* ${workType}\n`;
    text += `5. 🔑 *Web Password:* ${webPass}\n`;
    text += `6. 🖼️ *Bot Image:* ${botImageStatus}\n\n`;
    text += `*💡 EDIT:* Reply with number + value\n`;
    text += `Ex: *1 NewName* or *3 .*\n\n`;
    text += `> _𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 𝐙𝐄𝐔𝐒 𝐈𝐍𝐂 </>_ 🇱🇰`;
    return text;
}

function generateBotSettings(settings, botName) {
    const isSecurityOn = settings.badWords === "true" || settings.antiLink === "true" || 
                         settings.antiCmd === "true" || settings.antiBot === "true";
    const securityStatus = isSecurityOn ? '✅ ON' : '❌ OFF';

    let text = `⚡ *${botName.toUpperCase()} - BOT SETTINGS* ⚡\n\n`;
    text += `7. 🚀 *Always Online:* ${getStatus(settings.alwaysOnline)}\n`;
    text += `8. 📩 *Auto Read:* ${getStatus(settings.autoRead)}\n`;
    text += `9. ⌨️ *Auto Typing:* ${getStatus(settings.autoTyping)}\n`;
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
    text += `*💡 EDIT:* Reply with number + value\n`;
    text += `Ex: *7 on* or *7 off*\n\n`;
    text += `> _𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 𝐙𝐄𝐔𝐒 𝐈𝐍𝐂 </>_ 🇱🇰`;
    return text;
}

function generateFullDashboard(settings, botName, ownerName, botPrefix, webPass, workType, botImageStatus) {
    const isSecurityOn = settings.badWords === "true" || settings.antiLink === "true" || 
                         settings.antiCmd === "true" || settings.antiBot === "true";
    const securityStatus = isSecurityOn ? '✅ ON' : '❌ OFF';

    let text = `⚡ *${botName.toUpperCase()} SYSTEM DASHBOARD* ⚡\n\n`;
    text += `*—「 BASIC CONFIGS 」—*\n\n`;
    text += `1. 🤖 *Bot Name:* ${botName}\n`;
    text += `2. 👤 *Owner Name:* ${ownerName}\n`;
    text += `3. 🎮 *Bot Prefix:* [ ${botPrefix} ]\n`;
    text += `4. 🔐 *Work Mode:* ${workType}\n`;
    text += `5. 🔑 *Web Password:* ${webPass}\n`;
    text += `6. 🖼️ *Bot Image:* ${botImageStatus}\n\n`;
    text += `*—「 BOT SETTINGS 」—*\n\n`;
    text += `7. 🚀 *Always Online:* ${getStatus(settings.alwaysOnline)}\n`;
    text += `8. 📩 *Auto Read:* ${getStatus(settings.autoRead)}\n`;
    text += `9. ⌨️ *Auto Typing:* ${getStatus(settings.autoTyping)}\n`;
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
    text += `*💡 EDIT:* Reply with number + value\n`;
    text += `Ex: *16 on* or *16 off*\n\n`;
    text += `*📌 VIEW SECTIONS:*\n`;
    text += `1️⃣ → BASIC CONFIGS\n`;
    text += `2️⃣ → BOT SETTINGS\n\n`;
    text += `> _𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 𝐙𝐄𝐔𝐒 𝐈𝐍𝐂 </>_ 🇱🇰`;
    return text;
}

async function handleEditCommand(zanta, from, msg, body, settings, senderNumber, botName) {
    const parts = body.trim().split(/\s+/);
    if (parts.length < 2) return false;

    const num = parseInt(parts[0]);
    const value = parts.slice(1).join(' ');

    if (isNaN(num) || num < 1 || num > 20) return false;

    // Mapping numbers to setting keys
    const settingMap = {
        1: 'botName',
        2: 'ownerName',
        3: 'prefix',
        4: 'workType',
        5: 'password',
        6: 'botImage',
        7: 'alwaysOnline',
        8: 'autoRead',
        9: 'autoTyping',
        10: 'autoStatusSeen',
        11: 'autoStatusReact',
        12: 'readCmd',
        13: 'autoVoice',
        14: 'autoReply',
        15: 'connectionMsg',
        16: 'buttons',
        17: 'autoVoiceReply',
        18: 'antidelete',
        19: 'autoReact',
        20: 'groupSecurity'
    };

    const key = settingMap[num];
    if (!key) return false;

    // Special handling for groupSecurity (20)
    if (num === 20) {
        const val = value.toLowerCase();
        if (val === 'on' || val === 'true') {
            await updateSetting(senderNumber, 'badWords', 'true');
            await updateSetting(senderNumber, 'antiLink', 'true');
            await updateSetting(senderNumber, 'antiCmd', 'true');
            await updateSetting(senderNumber, 'antiBot', 'true');
            await zanta.sendMessage(from, { text: `✅ *Group Security* turned ON (badWords, antiLink, antiCmd, antiBot)` });
            return true;
        } else if (val === 'off' || val === 'false') {
            await updateSetting(senderNumber, 'badWords', 'false');
            await updateSetting(senderNumber, 'antiLink', 'false');
            await updateSetting(senderNumber, 'antiCmd', 'false');
            await updateSetting(senderNumber, 'antiBot', 'false');
            await zanta.sendMessage(from, { text: `✅ *Group Security* turned OFF (badWords, antiLink, antiCmd, antiBot)` });
            return true;
        }
        return false;
    }

    // Special handling for antidelete (18)
    if (num === 18) {
        const val = value.toLowerCase();
        if (val === '1' || val === 'user') {
            await updateSetting(senderNumber, 'antidelete', '1');
            await zanta.sendMessage(from, { text: `✅ *Anti-Delete* set to USER CHAT` });
            return true;
        } else if (val === '2' || val === 'your' || val === 'my') {
            await updateSetting(senderNumber, 'antidelete', '2');
            await zanta.sendMessage(from, { text: `✅ *Anti-Delete* set to YOUR CHAT` });
            return true;
        } else if (val === 'off' || val === 'false' || val === '0') {
            await updateSetting(senderNumber, 'antidelete', 'false');
            await zanta.sendMessage(from, { text: `✅ *Anti-Delete* turned OFF` });
            return true;
        }
        return false;
    }

    // Handle boolean settings (7-17, 19)
    if (num >= 7 && num <= 17 || num === 19) {
        const val = value.toLowerCase();
        if (val === 'on' || val === 'true') {
            await updateSetting(senderNumber, key, 'true');
            await zanta.sendMessage(from, { text: `✅ *${key}* turned ON` });
            return true;
        } else if (val === 'off' || val === 'false') {
            await updateSetting(senderNumber, key, 'false');
            await zanta.sendMessage(from, { text: `✅ *${key}* turned OFF` });
            return true;
        }
        return false;
    }

    // Handle string settings (1-6)
    if (num >= 1 && num <= 6) {
        if (value.length > 0) {
            await updateSetting(senderNumber, key, value);
            await zanta.sendMessage(from, { text: `✅ *${key}* updated to: ${value}` });
            return true;
        }
        return false;
    }

    return false;
}

cmd({
    pattern: "settings",
    alias: ["set", "dashboard", "status"],
    desc: "Display and edit bot settings via reply.",
    category: "main",
    react: "⚙️",
    filename: __filename,
}, async (zanta, mek, m, { from, reply, sender, isOwner, prefix, userSettings }) => {

    // --- 🛡️ Access Control ---
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

    // --- 📊 Settings ---
    const settings = userSettings || global.BOT_SESSIONS_CONFIG[senderNumber] || {};
    const botName = settings.botName || config.DEFAULT_BOT_NAME || "ZEUS-X-MINI";
    const ownerName = settings.ownerName || config.DEFAULT_OWNER_NAME || "Owner";
    const botPrefix = settings.prefix || prefix || ".";
    const webPass = settings.password === 'not_set' ? "Not Set ❌" : "Set ✅";
    const workType = (settings.workType || "public").toUpperCase();
    const botImageStatus = (settings.botImage && settings.botImage !== "null") ? "Updated ✅" : "Default 🖼️";
    const displayImg = (settings.botImage && settings.botImage !== "null") ? settings.botImage : DEFAULT_IMG;
    const isButtonsOn = settings.buttons === 'true';

    // ---------- BUTTON MODE ----------
    if (isButtonsOn) {
        const fullText = generateFullDashboard(settings, botName, ownerName, botPrefix, webPass, workType, botImageStatus);
        
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
            caption: fullText,
            buttons: mainButtons,
            headerType: 4
        }, { quoted: mek });

        lastSettingsMessage.set(from, sentMsg.key.id);

        // Listener for button clicks AND edit commands
        const listener = async (update) => {
            try {
                const msg = update.messages[0];
                if (!msg?.message) return;

                // Check if it's a reply to our message
                const contextInfo = msg.message.extendedTextMessage?.contextInfo ||
                                   msg.message.buttonsResponseMessage?.contextInfo;
                if (!contextInfo || contextInfo.stanzaId !== sentMsg.key.id) return;

                // --- Handle Edit Command (text reply) ---
                const body = msg.message.conversation || msg.message.extendedTextMessage?.text;
                if (body) {
                    const handled = await handleEditCommand(zanta, from, msg, body, settings, senderNumber, botName);
                    if (handled) return;
                }

                // --- Handle Button Click ---
                const btnId = msg.message.buttonsResponseMessage?.selectedButtonId;
                if (!btnId) return;

                if (btnId === "settings_basic") {
                    const basicText = generateBasicConfigs(settings, botName, ownerName, botPrefix, webPass, workType, botImageStatus);
                    await zanta.sendMessage(from, {
                        image: { url: displayImg },
                        caption: basicText
                    }, { quoted: msg });
                    await zanta.sendMessage(from, { react: { text: '⚙️', key: msg.key } });
                } else if (btnId === "settings_bot") {
                    const botText = generateBotSettings(settings, botName);
                    await zanta.sendMessage(from, {
                        image: { url: displayImg },
                        caption: botText
                    }, { quoted: msg });
                    await zanta.sendMessage(from, { react: { text: '🤖', key: msg.key } });
                }
            } catch (err) {
                console.error("Settings listener error:", err);
            }
        };

        zanta.ev.on('messages.upsert', listener);
        setTimeout(() => zanta.ev.off('messages.upsert', listener), 300000);

        return;
    }

    // ---------- TEXT MODE (Buttons OFF) ----------
    const fullText = generateFullDashboard(settings, botName, ownerName, botPrefix, webPass, workType, botImageStatus);

    const sentMsg = await zanta.sendMessage(from, {
        image: { url: displayImg },
        caption: fullText
    }, { quoted: mek });

    lastSettingsMessage.set(from, sentMsg.key.id);

    // Listener for text replies (view options AND edit commands)
    const textListener = async (update) => {
        try {
            const msg = update.messages[0];
            if (!msg?.message) return;

            const body = msg.message.conversation || msg.message.extendedTextMessage?.text;
            if (!body) return;

            const contextInfo = msg.message.extendedTextMessage?.contextInfo;
            if (!contextInfo || contextInfo.stanzaId !== sentMsg.key.id) return;

            // --- Check if it's an edit command (number + value) ---
            const parts = body.trim().split(/\s+/);
            if (parts.length >= 2 && !isNaN(parseInt(parts[0]))) {
                const handled = await handleEditCommand(zanta, from, msg, body, settings, senderNumber, botName);
                if (handled) return;
            }

            // --- Check if it's a view option (1 or 2) ---
            const num = parseInt(body.trim());
            if (num === 1) {
                const basicText = generateBasicConfigs(settings, botName, ownerName, botPrefix, webPass, workType, botImageStatus);
                await zanta.sendMessage(from, {
                    image: { url: displayImg },
                    caption: basicText
                }, { quoted: msg });
                await zanta.sendMessage(from, { react: { text: '⚙️', key: msg.key } });
            } else if (num === 2) {
                const botText = generateBotSettings(settings, botName);
                await zanta.sendMessage(from, {
                    image: { url: displayImg },
                    caption: botText
                }, { quoted: msg });
                await zanta.sendMessage(from, { react: { text: '🤖', key: msg.key } });
            }
        } catch (err) {
            console.error("Text listener error:", err);
        }
    };

    zanta.ev.on('messages.upsert', textListener);
    setTimeout(() => zanta.ev.off('messages.upsert', textListener), 300000);

    // Memory cleanup
    setTimeout(() => {
        if (lastSettingsMessage.get(from) === sentMsg.key.id) {
            lastSettingsMessage.delete(from);
        }
    }, 30 * 60 * 1000);
});

module.exports = { lastSettingsMessage };
