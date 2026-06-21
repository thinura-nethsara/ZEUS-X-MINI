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

        if (selectedCategory && groupedCommands[selectedCategory]) {
            let displayTitle = selectedCategory.toUpperCase();
            let emoji = { ᴍᴀɪɴ: '🏠', ᴅᴏᴡɴʟᴏᴀᴅꜱ: '📥', ᴛᴏᴏʟꜱ: '🛠', ʟᴏɢᴏ: '🎨', ᴍᴇᴅɪᴀ: '🖼' }[selectedCategory.toLowerCase()] || '📌';

            let commandList = `╭━━〔 ${emoji} ${displayTitle} 〕\n`;
            commandList += `┃ 📝 𝘊ᴀᴛᴇɢᴏʀʏ : ${displayTitle}\n┃ 📊 𝘈ᴠᴀɪʟᴀʙʟᴇ : ${groupedCommands[selectedCategory].length}\n╰━━━━━━━━━━━━━━━━━━━✦\n\n`;

            groupedCommands[selectedCategory].forEach((c) => {
                commandList += `┃ ❃ ${finalPrefix}${c.pattern}\n`;
            });
            commandList += `╰━━━━━━━━━━━━━━━━━━━✦`;

            return await zanta.sendMessage(from, { text: commandList, contextInfo }, { quoted: mek }); 
        }

        let headerText = `╭━〔 ZEUS X MINI 〕━··๏\n`;
        headerText += `┃ 👑 Oᴡɴᴇʀ : ${ownerName}\n┃ ⚙ Mᴏᴅᴇ : ${mode}\n┃ 🔣 Pʀᴇꜰɪx : ${finalPrefix}\n┃ 📚 Cᴏᴍᴍᴀɴᴅꜱ : ${commands.length}\n╰━━━━━━━━━━━━━━━━━━━✦\n\n`;

        // --- 🖼️ IMAGE LOGIC: DB Image එක ඇත්නම් එය පෙන්වයි, නැතිනම් Default Cache Image එක පෙන්වයි ---
        let imageToDisplay;
        if (settings.botImage && settings.botImage !== "null" && settings.botImage.startsWith("http")) {
            imageToDisplay = { url: settings.botImage };
        } else {
            imageToDisplay = cachedMenuImage || { url: MENU_IMAGE_URL };
        }

        if (isButtonsOn) {
            return await zanta.sendMessage(from, {
                image: imageToDisplay,
                caption: headerText + "ꜱᴇʟᴇᴄᴛ 👇",
                footer: `© Zᴇᴜꜱ X ᴍᴅ Mɪɴɪ •`,
                buttons: [
                    { buttonId: "cat_main", buttonText: { displayText: "🏠 ᴍᴀɪɴ" }, type: 1 },
                    { buttonId: "cat_download", buttonText: { displayText: "📥 ᴅᴏᴡɴʟᴏᴀᴅꜱ" }, type: 1 },
                    { buttonId: "cat_tools", buttonText: { displayText: "🛠 ᴛᴏᴏʟꜱ" }, type: 1 },
                    { buttonId: "cat_logo", buttonText: { displayText: "🎨 ʟᴏɢᴏ" }, type: 1 },
                    { buttonId: "cat_media", buttonText: { displayText: "🖼 ᴍᴇᴅɪᴀ" }, type: 1 }
                ],
                headerType: 4,
                contextInfo
            }, { quoted: mek });
        } else {
            let menuText = headerText + `╭━━〔 📜 Mᴇɴᴜ Lɪꜱᴛ 〕\n`;
            categoryKeys.forEach((catKey, index) => {
                let title = catKey.toUpperCase();
                let emoji = { ᴍᴀɪɴ: '🏠', ᴅᴏᴡɴʟᴏᴀᴅꜱ: '📥', ᴛᴏᴏʟꜱ: '🛠', ʟᴏɢᴏ: '🎨', ᴍᴇᴅɪᴀ: '🖼' }[catKey] || '📌';
                menuText += `┃ ${index + 1}. ${emoji} ${title} (${groupedCommands[catKey].length})\n`;
            });
            menuText += `╰━━━━━━━━━━━━━━━━━━━✦\n\n_💡 Reply with number to select._`;

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


