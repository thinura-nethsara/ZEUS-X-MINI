const { cmd, commands } = require("../command");
const os = require('os');
const config = require("../config");
const axios = require('axios');

const MENU_IMAGE_URL = "https://zeus-x-md-database.pages.dev/Data/zeus-x-main.jpeg";
const CHANNEL_JID = "120363404252774256@newsletter";
const lastMenuMessage = new Map();

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

        let inputBody = m.body ? m.body.trim().toLowerCase() : "";
        const isNumber = /^\d+$/.test(inputBody);
        const isCategorySelection = inputBody.startsWith('cat_');
        const isMainCmd = (inputBody === `${finalPrefix}menu` || inputBody === "menu");

        if (!isNumber && !isCategorySelection && !isMainCmd) return;

        if (isNumber && !isMainCmd) {
            if (!m.quoted || lastMenuMessage.get(from) !== m.quoted.id) return;
        }

        const groupedCommands = {};
        const customOrder = ["main", "download", "tools", "logo", "media", "group", "owner", "ai", "misc"];

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

        // --- 📋 Category View ---
        if (selectedCategory && groupedCommands[selectedCategory]) {
            let displayTitle = selectedCategory.toUpperCase();
            let emoji = {
                main: '🏠', download: '📥', tools: '🛠',
                logo: '🎨', media: '🖼', group: '👥',
                owner: '👑', ai: '🧠', misc: '📌'
            }[selectedCategory.toLowerCase()] || '📌';

            let commandList = `╭──⦁──⦁─❤️─⦁──⦁──╮\n`;
            commandList += `   💕 ${displayTitle} ᴄᴏᴍᴍᴀɴᴅꜱ 💕\n`;
            commandList += `╰──⦁──⦁─⦁─⦁─⦁──⦁──╯\n\n`;

            groupedCommands[selectedCategory].forEach((c) => {
                commandList += `┆ ◈ ${finalPrefix}${c.pattern}\n`;
            });

            commandList += `\n╭━━━━━━━━━━━━━━━━━━━━╮\n`;
            commandList += `┆ 📝 ᴛᴏᴛᴀʟ : ${groupedCommands[selectedCategory].length}\n`;
            commandList += `┆ 🎯 ᴄᴀᴛᴇɢᴏʀʏ : ${displayTitle}\n`;
            commandList += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;
            commandList += `> ✦ ᴘᴏᴡᴇʀᴇᴅ ʙʏ ${botName} 💜`;

            return await zanta.sendMessage(from, { text: commandList, contextInfo }, { quoted: mek });
        }

        // --- 🏠 Main Menu with Header ---
        let currentDate = new Date();
        let dateStr = currentDate.toLocaleDateString('en-GB').replace(/\//g, '/');
        let timeStr = currentDate.toLocaleTimeString('en-US', { hour12: true });

        let headerText = `╭──⦁──⦁─❤️─⦁──⦁──╮\n`;
        headerText += `   💕 ${botName} 💕\n`;
        headerText += `╰──⦁──⦁─⦁─⦁─⦁──⦁──╯\n\n`;
        headerText += `👤 ᴏᴡɴᴇʀ: ${ownerName} 💕\n`;
        headerText += `📅 ᴅᴀᴛᴇ  : ${dateStr} 📆\n`;
        headerText += `⏰ ᴛɪᴍᴇ  : ${timeStr} ⏳\n`;
        headerText += `:･°🌸⋆.ೃ🌷ೃ࿔:･°🌸⋆.ೃ࿔🌷࿔:･\n`;
        headerText += `┆ ┆ ┆ ┆⋆ .ೃ࿔*:･°🌼\n`;
        headerText += `┆ ┆ ┆જ ✾ 💮\n`;
        headerText += `┆ ♡ • ➵ ✩  ° 💫\n`;
        headerText += `┆彡\n`;
        headerText += `🌸\n\n`;

        // --- 📂 Menu Categories ---
        let menuText = `╭━━━━━━━━━━━━━━━━━━━━╮\n`;
        menuText += `┆   📂 ᴍᴀɪɴ ᴍᴇɴᴜ 📂\n`;
        menuText += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;

        const categoryEmojis = {
            main: '🏠', download: '📥', tools: '🛠',
            logo: '🎨', media: '🖼', group: '👥',
            owner: '👑', ai: '🧠', misc: '📌'
        };

        const categoryNames = {
            main: 'MAIN', download: 'DOWNLOAD', tools: 'TOOLS',
            logo: 'LOGO', media: 'MEDIA', group: 'GROUP',
            owner: 'OWNER', ai: 'AI', misc: 'MISC'
        };

        categoryKeys.forEach((catKey, index) => {
            let emoji = categoryEmojis[catKey] || '📌';
            let name = categoryNames[catKey] || catKey.toUpperCase();
            menuText += `┆ ${index + 1}➊  ${emoji} ${name} ᴄᴍᴅ ʟɪꜱᴛ 🌷\n`;
            menuText += `┆    ───────────────\n`;
        });

        menuText += `\n╭━━━━━━━━━━━━━━━━━━━━╮\n`;
        menuText += `┆ 📌 ᴛᴏᴛᴀʟ ᴄᴏᴍᴍᴀɴᴅꜱ : ${commands.length}\n`;
        menuText += `┆ 🔣 ᴘʀᴇғɪx : ${finalPrefix}\n`;
        menuText += `┆ ⚙️ ᴍᴏᴅᴇ : ${mode}\n`;
        menuText += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;

        menuText += `.help: ʙᴏᴛ ʜᴇʟᴘᴇʀ\n`;
        menuText += `.settings: ʙᴏᴛ ꜱᴇᴛᴛɪɴɢꜱ ᴄʜᴀɴɢᴇ\n`;
        menuText += `━━━━━━━━━━━━━━━━━━━━\n`;
        menuText += `📌 ɴᴏᴛᴇ : ʀᴇᴘʟʏ ᴡɪᴛʜ ɴᴜᴍʙᴇʀ ᴏɴʟʏ 💌\n`;
        menuText += `━━━━━━━━━━━━━━━━━━━━\n\n`;
        menuText += `𝙲𝙾𝙽𝙽𝙴𝙲𝚃 𝙽𝙴𝚆 𝙱𝙾𝚃 ✅\n`;
        menuText += `www.goldenqueen.store/wa-bot/\n`;
        menuText += `</> ᴘᴏᴡᴇʀᴇᴅ ʙʏ ${botName}`;

        // --- 🖼️ Image Logic ---
        let imageToDisplay;
        if (settings.botImage && settings.botImage !== "null" && settings.botImage.startsWith("http")) {
            imageToDisplay = { url: settings.botImage };
        } else {
            imageToDisplay = cachedMenuImage || { url: MENU_IMAGE_URL };
        }

        if (isButtonsOn) {
            const buttonRows = [];
            let row = [];
            categoryKeys.forEach((catKey, index) => {
                if (index < 3) {
                    row.push({
                        buttonId: `cat_${catKey}`,
                        buttonText: { displayText: `${categoryEmojis[catKey] || '📌'} ${categoryNames[catKey] || catKey.toUpperCase()}` },
                        type: 1
                    });
                } else {
                    if (row.length > 0) {
                        buttonRows.push({ title: "📂 MENU", rows: row });
                        row = [];
                    }
                    row.push({
                        buttonId: `cat_${catKey}`,
                        buttonText: { displayText: `${categoryEmojis[catKey] || '📌'} ${categoryNames[catKey] || catKey.toUpperCase()}` },
                        type: 1
                    });
                }
            });
            if (row.length > 0) {
                buttonRows.push({ title: "📂 MORE", rows: row });
            }

            return await zanta.sendMessage(from, {
                image: imageToDisplay,
                caption: headerText + menuText,
                footer: `© ${botName} • ${ownerName}`,
                buttons: buttonRows,
                headerType: 4,
                contextInfo
            }, { quoted: mek });
        } else {
            const sent = await zanta.sendMessage(from, {
                image: imageToDisplay,
                caption: headerText + menuText,
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
