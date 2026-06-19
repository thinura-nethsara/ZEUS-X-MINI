const { cmd } = require("../command");
const { updateSetting } = require("./bot_db");
const config = require("../config");

// Default Image Link
const DEFAULT_IMG = "https://zeus-x-md-database.pages.dev/Data/zeus-x-main.jpeg";

const lastSettingsMessage = new Map();
const lastSecurityMessage = new Map(); // Security sub-menu එක track කිරීමට

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

    // --- 📊 Status Indicators ---
    const getStatus = (val) => val === 'true' ? '『 ✅ ON 』' : '『 ❌ OFF 』';
    
    const getAntiDeleteStatus = (val) => {
        if (val === "1") return '『 👤 USER CHAT 』';
        if (val === "2") return '『 📥 YOUR CHAT 』';
        return '『 ❌ OFF 』';
    };

    // Security Status: එකක් හරි ON නම් Dashboard එකේ ON ලෙස පෙන්වයි
    const isSecurityOn = settings.badWords === "true" || settings.antiLink === "true" || settings.antiCmd === "true" || settings.antiBot === "true";
    const securityStatus = isSecurityOn ? '『 ✅ ON 』' : '『 ❌ OFF 』';

    // --- Functions to generate section texts ---
    function getBasicConfigs() {
        let text = `⚡ *${botName.toUpperCase()} - BASIC CONFIGS* ⚡\n\n`;
        text += `01. 🤖 *Bot Name:* ${botName}\n`;
        text += `02. 👤 *Owner Name:* ${ownerName}\n`;
        text += `03. 🎮 *Bot Prefix:* [ ${botPrefix} ]\n`;
        text += `04. 🔐 *Work Mode:* ${workType}\n`;
        text += `05. 🔑 *Web Password:* ${webPass}\n`;
        text += `06. 🖼️ *Bot Image:* ${botImageStatus}\n\n`;
        text += `*💡 EDIT:* Reply with number + value.\n`;
        text += `Ex: *01 Zeus-X* or *04 private*\n\n`;
        text += `> _𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 𝐙𝐄𝐔𝐒 𝐈𝐍𝐂 </>_ 🇱🇰`;
        return text;
    }

    function getBotSettings() {
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
        text += `*💡 EDIT:* Reply with number + value.\n`;
        text += `Ex: *16 on* or *16 off*\n\n`;
        text += `> _𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 𝐙𝐄𝐔𝐒 𝐈𝐍𝐂 </>_ 🇱🇰`;
        return text;
    }

    // --- Check if Buttons mode is ON ---
    const isButtonsOn = settings.buttons === 'true';

    // ---------- BUTTON MODE ----------
    if (isButtonsOn) {
        // Home buttons
        const homeButtons = [
            {
                buttonId: 'settings_basic',
                buttonText: { displayText: '📋 BASIC CONFIGS' },
                type: 1
            },
            {
                buttonId: 'settings_bot',
                buttonText: { displayText: '⚙️ BOT SETTINGS' },
                type: 1
            }
        ];

        const homeCaption = `⚡ *${botName.toUpperCase()} SYSTEM DASHBOARD* ⚡\n\nSelect an option below to view or edit settings.`;

        const homeMsg = await zanta.sendMessage(from, {
            image: { url: displayImg },
            caption: homeCaption,
            buttons: homeButtons,
            headerType: 4
        }, { quoted: mek });

        lastSettingsMessage.set(from, homeMsg.key.id);

        // --- Listener for home buttons ---
        const homeListener = async (update) => {
            try {
                const msg = update.messages[0];
                if (!msg?.message?.buttonsResponseMessage) return;

                const contextInfo = msg.message.buttonsResponseMessage.contextInfo ||
                                   msg.message.extendedTextMessage?.contextInfo;
                if (!contextInfo || contextInfo.stanzaId !== homeMsg.key.id) return;

                const btnId = msg.message.buttonsResponseMessage.selectedButtonId;
                
                let responseText = '';
                let section = '';
                if (btnId === 'settings_basic') {
                    responseText = getBasicConfigs();
                    section = 'basic';
                } else if (btnId === 'settings_bot') {
                    responseText = getBotSettings();
                    section = 'bot';
                } else {
                    return;
                }

                // Send selected section
                const detailMsg = await zanta.sendMessage(from, {
                    image: { url: displayImg },
                    caption: responseText
                }, { quoted: msg });

                // Remove home listener after selection
                zanta.ev.off('messages.upsert', homeListener);

                // --- Listener for editing settings in detail view ---
                const editListener = async (editUpdate) => {
                    try {
                        const editMsg = editUpdate.messages[0];
                        if (!editMsg?.message) return;
                        const body = editMsg.message.conversation || editMsg.message.extendedTextMessage?.text;
                        if (!body) return;

                        const ctx = editMsg.message.extendedTextMessage?.contextInfo;
                        if (!ctx || ctx.stanzaId !== detailMsg.key.id) return;

                        const parts = body.trim().split(/\s+/);
                        if (parts.length < 2) return;

                        const num = parseInt(parts[0]);
                        if (isNaN(num)) return;

                        const value = parts.slice(1).join(' ');
                        
                        // Map numbers to setting keys
                        const settingMap = {
                            '1': 'botName',
                            '2': 'ownerName',
                            '3': 'prefix',
                            '4': 'workType',
                            '5': 'password',
                            '6': 'botImage',
                            '7': 'alwaysOnline',
                            '8': 'autoRead',
                            '9': 'autoTyping',
                            '10': 'autoStatusSeen',
                            '11': 'autoStatusReact',
                            '12': 'readCmd',
                            '13': 'autoVoice',
                            '14': 'autoReply',
                            '15': 'connectionMsg',
                            '16': 'buttons',
                            '17': 'autoVoiceReply',
                            '18': 'antidelete',
                            '19': 'autoReact',
                            '20': 'security' // Combined security, handled as string
                        };

                        const key = settingMap[num];
                        if (!key) return;

                        // Update setting
                        await updateSetting(senderNumber, key, value);
                        
                        // Confirmation
                        await zanta.sendMessage(from, {
                            text: `✅ *${key}* updated to: *${value}*`
                        }, { quoted: editMsg });

                        // Refresh the current section view
                        let updatedText = '';
                        if (section === 'basic') {
                            updatedText = getBasicConfigs();
                        } else {
                            updatedText = getBotSettings();
                        }
                        await zanta.sendMessage(from, {
                            image: { url: displayImg },
                            caption: updatedText
                        }, { quoted: editMsg });

                        zanta.ev.off('messages.upsert', editListener);
                    } catch (err) {
                        console.error('Edit listener error:', err);
                        zanta.ev.off('messages.upsert', editListener);
                    }
                };

                zanta.ev.on('messages.upsert', editListener);
                setTimeout(() => zanta.ev.off('messages.upsert', editListener), 300000);

            } catch (err) {
                console.error('Home listener error:', err);
                zanta.ev.off('messages.upsert', homeListener);
            }
        };

        zanta.ev.on('messages.upsert', homeListener);
        setTimeout(() => zanta.ev.off('messages.upsert', homeListener), 300000);

        // Memory cleanup for home message
        setTimeout(() => {
            if (lastSettingsMessage.get(from) === homeMsg.key.id) {
                lastSettingsMessage.delete(from);
            }
        }, 30 * 60 * 1000);

        return; // End of Button Mode
    }

    // ---------- TEXT MODE (Buttons OFF) ----------
    // Text-based menu with emoji numbers
    const textMenu = `⚡ *${botName.toUpperCase()} SYSTEM DASHBOARD* ⚡\n\nSelect an option by replying with the number:\n\n1️⃣ BASIC CONFIGS\n2️⃣ BOT SETTINGS\n\nReply with *1* or *2* to view.`;

    const textHomeMsg = await zanta.sendMessage(from, {
        image: { url: displayImg },
        caption: textMenu
    }, { quoted: mek });

    lastSettingsMessage.set(from, textHomeMsg.key.id);

    // --- Text Listener for navigation ---
    const textNavListener = async (navUpdate) => {
        try {
            const navMsg = navUpdate.messages[0];
            if (!navMsg?.message) return;
            const body = navMsg.message.conversation || navMsg.message.extendedTextMessage?.text;
            if (!body) return;

            const ctx = navMsg.message.extendedTextMessage?.contextInfo;
            if (!ctx || ctx.stanzaId !== textHomeMsg.key.id) return;

            const choice = parseInt(body.trim());
            if (isNaN(choice)) return;

            let responseText = '';
            let section = '';
            if (choice === 1) {
                responseText = getBasicConfigs();
                section = 'basic';
            } else if (choice === 2) {
                responseText = getBotSettings();
                section = 'bot';
            } else {
                return;
            }

            const detailMsg = await zanta.sendMessage(from, {
                image: { url: displayImg },
                caption: responseText
            }, { quoted: navMsg });

            // Remove nav listener
            zanta.ev.off('messages.upsert', textNavListener);

            // --- Edit listener for text mode ---
            const editListener2 = async (editUpdate) => {
                try {
                    const editMsg = editUpdate.messages[0];
                    if (!editMsg?.message) return;
                    const body2 = editMsg.message.conversation || editMsg.message.extendedTextMessage?.text;
                    if (!body2) return;

                    const ctx2 = editMsg.message.extendedTextMessage?.contextInfo;
                    if (!ctx2 || ctx2.stanzaId !== detailMsg.key.id) return;

                    const parts = body2.trim().split(/\s+/);
                    if (parts.length < 2) return;

                    const num = parseInt(parts[0]);
                    if (isNaN(num)) return;

                    const value = parts.slice(1).join(' ');
                    
                    const settingMap = {
                        '1': 'botName',
                        '2': 'ownerName',
                        '3': 'prefix',
                        '4': 'workType',
                        '5': 'password',
                        '6': 'botImage',
                        '7': 'alwaysOnline',
                        '8': 'autoRead',
                        '9': 'autoTyping',
                        '10': 'autoStatusSeen',
                        '11': 'autoStatusReact',
                        '12': 'readCmd',
                        '13': 'autoVoice',
                        '14': 'autoReply',
                        '15': 'connectionMsg',
                        '16': 'buttons',
                        '17': 'autoVoiceReply',
                        '18': 'antidelete',
                        '19': 'autoReact',
                        '20': 'security'
                    };

                    const key = settingMap[num];
                    if (!key) return;

                    await updateSetting(senderNumber, key, value);
                    
                    await zanta.sendMessage(from, {
                        text: `✅ *${key}* updated to: *${value}*`
                    }, { quoted: editMsg });

                    let updatedText = '';
                    if (section === 'basic') {
                        updatedText = getBasicConfigs();
                    } else {
                        updatedText = getBotSettings();
                    }
                    await zanta.sendMessage(from, {
                        image: { url: displayImg },
                        caption: updatedText
                    }, { quoted: editMsg });

                    zanta.ev.off('messages.upsert', editListener2);
                } catch (err) {
                    console.error('Edit listener error (text mode):', err);
                    zanta.ev.off('messages.upsert', editListener2);
                }
            };

            zanta.ev.on('messages.upsert', editListener2);
            setTimeout(() => zanta.ev.off('messages.upsert', editListener2), 300000);

        } catch (err) {
            console.error('Text nav error:', err);
            zanta.ev.off('messages.upsert', textNavListener);
        }
    };

    zanta.ev.on('messages.upsert', textNavListener);
    setTimeout(() => zanta.ev.off('messages.upsert', textNavListener), 300000);

    // Memory cleanup for text home message
    setTimeout(() => {
        if (lastSettingsMessage.get(from) === textHomeMsg.key.id) {
            lastSettingsMessage.delete(from);
        }
    }, 30 * 60 * 1000);
});

module.exports = { lastSettingsMessage, lastSecurityMessage };
