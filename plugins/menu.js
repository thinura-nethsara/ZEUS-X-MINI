const { cmd, commands } = require("../command");
const os = require('os');
const config = require("../config");
const axios = require('axios');

const MENU_IMAGE_URL = "https://zeus-x-md-database.pages.dev/Data/zeus-x-main.jpeg";
const CHANNEL_JID = "120363425542933159@newsletter";
const lastMenuMessage = new Map();

// ============================================
// 🟢 ALIVE STYLE HEADER GENERATOR
// ============================================
function getMenuHeader(botInfo = {}) {
    // ශ්‍රී ලාංකික වේලාව
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
\`✦  ᴍᴏᴅᴇ     :  ${botInfo.mode || 'PUBLIC'}\`
\`✦  ᴄᴏᴍᴍᴀɴᴅꜱ :  ${botInfo.totalCmds || 0}\`
◈◈◈◈◈◈◈◈◈◈◈
`;
}
// ============================================

// --- 🖼️ IMAGE PRE-LOAD LOGIC ---
let cachedMenuImage = null;

async function preLoadMenuImage() {
    try {
        const response = await axios.get(MENU_IMAGE_URL, { responseType: 'arraybuffer' });
        cachedMenuImage = Buffer.from(response.data);
        console.log("✅ [CACHE] Menu image pre-loaded successfully.");
    } catch (e) {
        console.error("❌ [CACHE] Failed to pre-load menu image:", e.message);
        cachedMenuImage = null;
    }
}

preLoadMenuImage();

cmd({
    pattern: "menu",
    react: "📜",
    desc: "Displays the main menu or a category list.",
    category: "main",
    filename: __filename,
},
async (zanta, mek, m, { from, reply, args, userSettings }) => {
    try {
        const settings = userSettings || global.CURRENT_BOT_SETTINGS || {};
        const finalPrefix = settings.prefix || config.DEFAULT_PREFIX || '.';
        const botName = settings.botName || config.DEFAULT_BOT_NAME || "ZEUS-X-MINI";
        const ownerName = settings.ownerName || config.DEFAULT_OWNER_NAME || 'Mr ThinUzz';
        const mode = (settings.workType || "Public").toUpperCase();
        const isButtonsOn = settings.buttons === 'true';
        const uptime = process.uptime();

        let inputBody = m.body ? m.body.trim().toLowerCase() : "";
        const isNumber = /^\d+$/.test(inputBody);
        const isCategorySelection = inputBody.startsWith('cat_');
        const isMainCmd = (inputBody === `${finalPrefix}menu` || inputBody === "menu");

        if (!isNumber && !isCategorySelection && !isMainCmd) return;

        if (isNumber && !isMainCmd) {
            if (!m.quoted || lastMenuMessage.get(from) !== m.quoted.id) return;
        }

        const groupedCommands = {};
        const customOrder = ["main", "download", "tools", "logo", "media"];

        commands.filter(c => c.pattern && c.pattern !== "menu").forEach(cmdData => {
            let cat = cmdData.category?.toLowerCase() || "other";
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

        // ============================================
        // 🟢 CATEGORY VIEW (Alive Style)
        // ============================================
        if (selectedCategory && groupedCommands[selectedCategory]) {
            let displayTitle = selectedCategory.toUpperCase();
            let emoji = { 
                main: '🏠', 
                download: '📥', 
                tools: '🛠', 
                logo: '🎨', 
                media: '🖼' 
            }[selectedCategory.toLowerCase()] || '📌';

            let commandList = `
◈◈◈◈◈◈◈◈◈◈◈
✦ ─── *${emoji} ${displayTitle}* ─── ✦
◈◈◈◈◈◈◈◈◈◈◈
\`✦  ᴄᴀᴛᴇɢᴏʀʏ  :  ${displayTitle}\`
\`✦  ᴀᴠᴀɪʟᴀʙʟᴇ :  ${groupedCommands[selectedCategory].length}\`
◈◈◈◈◈◈◈◈◈◈◈
`;

            groupedCommands[selectedCategory].forEach((c) => {
                commandList += `\`✦  ${finalPrefix}${c.pattern}\`\n`;
            });

            commandList += `
◈◈◈◈◈◈◈◈◈◈◈
*“ ʀᴇᴀᴅʏ ᴛᴏ ᴀꜱꜱɪꜱᴛ ”*
*⚡ ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴢᴇᴜꜱ ɪɴᴄ ⚡*
`;

            return await zanta.sendMessage(from, { 
                text: commandList, 
                contextInfo 
            }, { quoted: mek });
        }

        // ============================================
        // 🟢 MAIN MENU (Alive Style Header)
        // ============================================
        const headerText = getMenuHeader({
            botName: botName,
            prefix: finalPrefix,
            uptime: uptime,
            mode: mode,
            totalCmds: commands.length
        });

        // --- 🖼️ IMAGE LOGIC ---
        let imageToDisplay;
        if (settings.botImage && settings.botImage !== "null" && settings.botImage.startsWith("http")) {
            imageToDisplay = { url: settings.botImage };
        } else {
            imageToDisplay = cachedMenuImage || { url: MENU_IMAGE_URL };
        }

        if (isButtonsOn) {
            // --- 🔵 BUTTONS ON MODE ---
            let menuText = headerText + `
◈◈◈◈◈◈◈◈◈◈◈
*📌 SELECT A CATEGORY*
◈◈◈◈◈◈◈◈◈◈◈
`;

            return await zanta.sendMessage(from, {
                image: imageToDisplay,
                caption: menuText,
                footer: `_𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 𝐙𝐄𝐔𝐒 𝐈𝐍𝐂 </>_`,
                buttons: [
                    { buttonId: "cat_main", buttonText: { displayText: "🏠 MAIN" }, type: 1 },
                    { buttonId: "cat_download", buttonText: { displayText: "📥 DOWNLOAD" }, type: 1 },
                    { buttonId: "cat_tools", buttonText: { displayText: "🛠 TOOLS" }, type: 1 },
                    { buttonId: "cat_logo", buttonText: { displayText: "🎨 LOGO" }, type: 1 },
                    { buttonId: "cat_media", buttonText: { displayText: "🖼 MEDIA" }, type: 1 }
                ],
                headerType: 4,
                contextInfo
            }, { quoted: mek });

        } else {
            // --- 🟢 BUTTONS OFF MODE ---
            let menuText = headerText + `
◈◈◈◈◈◈◈◈◈◈◈
*📌 CATEGORIES*
◈◈◈◈◈◈◈◈◈◈◈
`;

            categoryKeys.forEach((catKey, index) => {
                let title = catKey.toUpperCase();
                let emoji = { 
                    main: '🏠', 
                    download: '📥', 
                    tools: '🛠', 
                    logo: '🎨', 
                    media: '🖼' 
                }[catKey] || '📌';
                menuText += `\`✦  ${index + 1}. ${emoji} ${title} (${groupedCommands[catKey].length})\`\n`;
            });

            menuText += `
◈◈◈◈◈◈◈◈◈◈◈
*“ ʀᴇᴘʟʏ ᴡɪᴛʜ ɴᴜᴍʙᴇʀ ”*
*⚡ ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴢᴇᴜꜱ ɪɴᴄ ⚡*
`;

            const sent = await zanta.sendMessage(from, {
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
