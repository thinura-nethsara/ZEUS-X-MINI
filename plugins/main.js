const { cmd, commands } = require("../command");
const os = require('os');
const config = require("../config");
const axios = require('axios');
const MENU_IMAGE_URL = "https://zeus-x-md-database.pages.dev/Data/zeus-x-main.jpeg";
const CHANNEL_JID = "120363425542933159@newsletter";
const lastMenuMessage = new Map();
let cachedMenuImage = null;
let cachedAliveImage = null;

async function preLoadImages() {
    try {
        // Menu image
        const menuRes = await axios.get(MENU_IMAGE_URL, { responseType: 'arraybuffer' });
        cachedMenuImage = Buffer.from(menuRes.data);
        
        // Alive image
        const aliveUrl = config.ALIVE_IMG || "https://zeus-x-md-database.pages.dev/Data/zeus-x-main.jpeg";
        const aliveRes = await axios.get(aliveUrl, { responseType: 'arraybuffer' });
        cachedAliveImage = Buffer.from(aliveRes.data);
        
        console.log("✅ [CACHE] Images pre-loaded successfully.");
    } catch (e) {
        console.error("❌ [CACHE] Failed to pre-load images:", e.message);
    }
}

preLoadImages();


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
╭─「 ${botInfo.botName || 'ZEUS X MD'} 」
│ 🌍⃝⃘̉̉̉━⋆─⋆──❂
│ ┊ ┊ ┊ ┊ ┊
│ ┊ ┊ ✫ ˚㋛ ⋆｡ ❀
│ ┊ ☠️︎︎
│ ✧${greeting} 𝄞
╰──────────────●●►

╭─「 ᴅᴀᴛᴇ 」
│📅 Date: ${date}
│⏰ Time: ${time}
╰──────────────●●►

╭─「 ꜱᴛᴀᴛᴜꜱ ᴅᴇᴛᴀɪʟꜱ 」
│✒️ Prefix: ${prefix}
│🧬 Version: 1.0.0
│📟 Uptime: ${uptimeStr}
╰──────────────●●►

> _𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 𝐙𝐄𝐔𝐒 𝐈𝐍𝐂 </>_`;
}


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

        let imageToDisplay;
        if (settings.botImage && settings.botImage !== "null" && settings.botImage.startsWith("http")) {
            imageToDisplay = { url: settings.botImage };
        } else {
            imageToDisplay = cachedAliveImage || { url: config.ALIVE_IMG };
        }

        if (isButtonsOn) {
            const buttonMessage = {
                image: imageToDisplay,
                caption: finalMsg,
                buttons: [
                    { buttonId: `${prefix}ping`, buttonText: { displayText: "📡 ᴘɪɴɢ" }, type: 1 },
                    { buttonId: `${prefix}menu`, buttonText: { displayText: "📋 ᴍᴇɴᴜ" }, type: 1 },
                    { buttonId: `${prefix}settings`, buttonText: { displayText: "⚙️ sᴇᴛᴛɪɴɢs" }, type: 1 },
                    { buttonId: `${prefix}help`, buttonText: { displayText: "❓ ʜᴇʟᴘ" }, type: 1 }
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

// ============================================
// 📜 MENU COMMAND
// ============================================
cmd({
    pattern: "menu",
    react: "📜",
    desc: "Displays the main menu or a category list.",
    category: "main",
    filename: __filename,
},
async (zeus, mek, m, { from, reply, args, userSettings }) => {
    try {
        const settings = userSettings || global.CURRENT_BOT_SETTINGS || {};
        const finalPrefix = settings.prefix || config.DEFAULT_PREFIX || '.'; 
        const botName = settings.botName || config.DEFAULT_BOT_NAME || "ZEUS X MINI"; 
        const ownerName = settings.ownerName || config.DEFAULT_OWNER_NAME || 'ZEUS X INC';
        const mode = (settings.workType || "Public").toUpperCase();
        const isButtonsOn = settings.buttons === 'true';

        let inputBody = m.body ? m.body.trim().toLowerCase() : "";
        const isNumber = /^\d+$/.test(inputBody); 
        const isCategorySelection = inputBody.startsWith('cat_');
        const isMainCmd = (inputBody === `${finalPrefix}menu` || inputBody === "menu");

        if (!isNumber && !isCategorySelection && !isMainCmd) return;

        if (isNumber && !isMainCmd) {
            if (!m.quoted || lastMenuMessage.get(from) !== m.quoted.id) return;
        }

        const groupedCommands = {};
        const customOrder = ["main", "download", "tools", "logo", "media", "group", "owner", "adult", "movie", "misc"];

        commands.filter(c => c.pattern && c.pattern !== "menu").forEach(cmdData => {
            let cat = cmdData.category?.toLowerCase() || "misc";
            if (!groupedCommands[cat]) groupedCommands[cat] = [];
            groupedCommands[cat].push(cmdData);
        });

        const categoryKeys = Object.keys(groupedCommands).sort((a, b) => {
            let indexA = customOrder.indexOf(a);
            let indexB = customOrder.indexOf(b);
            return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
        });

        const categoryMap = {}; 
        categoryKeys.forEach((cat, index) => { categoryMap[index + 1] = cat; });

        let selectedCategory;
        if (isCategorySelection) {
            selectedCategory = inputBody.replace('cat_', '');
        } else if (isNumber) {
            selectedCategory = categoryMap[parseInt(inputBody)];
        }

        const contextInfo = {
            forwardingScore: 999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid: CHANNEL_JID,
                serverMessageId: 100,
                newsletterName: "𝒁 𝑬 𝑼 𝑺  𝑿 𝑴 𝑫  𝑩𝑶𝑻𝒁 𝑰𝑵𝑪 </> 🇱🇰"
            }
        };

        const categoryEmojis = { 
            'main': '🏠', 'download': '📥', 'tools': '🛠', 'logo': '🎨', 
            'media': '🖼', 'group': '👥', 'owner': '👑', 'adult': '🔞',
            'movie': '🎬', 'misc': '📌'
        };

        if (selectedCategory && groupedCommands[selectedCategory]) {
            let displayTitle = selectedCategory.toUpperCase();
            let emoji = categoryEmojis[selectedCategory] || '📌';

            let commandList = `
                            ╭─「 ${emoji} ${displayTitle} 」\n`;
            commandList += `|  📝 𝘊ᴀᴛᴇɢᴏʀʏ : ${displayTitle}\n`;
            commandList += `|  📊 𝘈𝘷𝘢𝘪𝘭𝘢𝘣𝘭𝘦 : ${groupedCommands[selectedCategory].length}\n`;
            commandList += `╰──────────────────●●►\n\n`;
                                                                                                                            
            groupedCommands[selectedCategory].forEach((c) => {
                commandList += `| ➤ ${finalPrefix}${c.pattern}\n`;
            });
            commandList += `╰──────────────────●●►`;

            return await zeus.sendMessage(from, { text: commandList, contextInfo }, { quoted: mek }); 
        }
                                            
        let headerText = `╭─「 ${botName} 」─●●►\n`;
        headerText += `┃  👑 Oᴡɴᴇʀ : ${ownerName}\n`;
        headerText += `|  ⚙ Mᴏᴅᴇ : ${mode}\n`;
        headerText += `|  🔣 Pʀᴇꜰɪx : ${finalPrefix}\n`;
        headerText += `|  📚 Cᴏᴍᴍᴀɴᴅꜱ : ${commands.length}\n`;
        headerText += `╰──────────────────●●►\n\n`;

        let imageToDisplay;
        if (settings.botImage && settings.botImage !== "null" && settings.botImage.startsWith("http")) {
            imageToDisplay = { url: settings.botImage };
        } else {
            imageToDisplay = cachedMenuImage || { url: MENU_IMAGE_URL };
        }

        if (isButtonsOn) {
            return await zeus.sendMessage(from, {
                image: imageToDisplay,
                caption: headerText + "ꜱᴇʟᴇᴄᴛ 👇",
                footer: `${botName}`,
                buttons: [
                    { buttonId: "cat_main", buttonText: { displayText: "🏠 ᴍᴀɪɴ" }, type: 1 },
                    { buttonId: "cat_download", buttonText: { displayText: "📥 ᴅᴏᴡɴʟᴏᴀᴅꜱ" }, type: 1 },
                    { buttonId: "cat_tools", buttonText: { displayText: "🛠 ᴛᴏᴏʟꜱ" }, type: 1 },
                    { buttonId: "cat_logo", buttonText: { displayText: "🎨 ʟᴏɢᴏ" }, type: 1 },
                    { buttonId: "cat_media", buttonText: { displayText: "🖼 ᴍᴇᴅɪᴀ" }, type: 1 },
                    { buttonId: "cat_group", buttonText: { displayText: "👥 ɢʀᴏᴜᴘ" }, type: 1 },
                    { buttonId: "cat_owner", buttonText: { displayText: "👑 ᴏᴡɴᴇʀ" }, type: 1 },
                    { buttonId: "cat_adult", buttonText: { displayText: "🔞 ᴀᴅᴜʟᴛ" }, type: 1 },
                    { buttonId: "cat_movie", buttonText: { displayText: "🎬 ᴍᴏᴠɪᴇ" }, type: 1 },
                    { buttonId: "cat_misc", buttonText: { displayText: "📌 ᴍɪꜱᴄ" }, type: 1 }
                ],
                headerType: 4,
                contextInfo
            }, { quoted: mek });
        } else {
            let menuText = headerText + `╭─「 📜 Mᴇɴᴜ Lɪꜱᴛ 」\n`;
            categoryKeys.forEach((catKey, index) => {
                let title = catKey.toUpperCase();
                let emoji = categoryEmojis[catKey] || '📌';
                menuText += `| ${index + 1}. ${emoji} ${title} (${groupedCommands[catKey].length})\n`;
            });
            menuText += `╰──────────────────●●►\n\n_💡 Reply with number to select._`;

            const sent = await zeus.sendMessage(from, {
                image: imageToDisplay,
                caption: menuText,
                contextInfo
            }, { quoted: mek });

            lastMenuMessage.set(from, sent.key.id);
            setTimeout(() => lastMenuMessage.delete(from), 10 * 60 * 1000);
        }

    } catch (err) {
        console.error("Menu Error:", err);
        reply("❌ Error generating menu.");
    }
});

module.exports = { lastMenuMessage };
