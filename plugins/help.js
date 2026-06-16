const { cmd } = require("../command");
const config = require("../config");
const axios = require('axios'); 

const lastHelpMessage = new Map();

const HELP_IMG_URL = "https://raw.githubusercontent.com/Akashkavindu/MINI-BOT-SOURCE/main/zanta-md.png";

// --- 🖼️ IMAGE PRE-LOAD LOGIC ---
let cachedHelpImage = null;

async function preLoadHelpImage() {
    try {
        const response = await axios.get(HELP_IMG_URL, { responseType: 'arraybuffer' });
        cachedHelpImage = Buffer.from(response.data);
        console.log("✅ [CACHE] Help image pre-loaded successfully.");
    } catch (e) {
        console.error("❌ [CACHE] Failed to pre-load help image:", e.message);
        cachedHelpImage = null;
    }
}

preLoadHelpImage();

cmd({
    pattern: "help",
    alias: ["bothelp", "info", "උදව්"],
    category: "main",
    react: "❓",
    desc: "බොට් සහාය මධ්‍යස්ථානය.",
    filename: __filename,
}, async (zanta, mek, m, { from, reply, args, pushname, userSettings }) => {
    try {
        const settings = userSettings || global.CURRENT_BOT_SETTINGS || {};
        const botName = settings.botName || config.DEFAULT_BOT_NAME || "ZANTA-MD";

        // --- 📂 1. අංකයක් Reply කළ විට ක්‍රියාත්මක වන කොටස ---
        const selection = args[0]; 

        if (selection === "1") {
            let devMsg = `*👨‍💻 Bot Developer Details*

👤 *නම:* Akash Kavindu
🛠️ *ව්‍යාපෘතිය:* ZANTA-MD (WhatsApp Bot)
🌍 *රට:* ශ්‍රී ලංකා
🔗 *GitHub:* 🤐
🔗 *WhatsApp:* http://wa.me/+94743404814?text=*Hey__ZANTA

> *Created with ❤️ by Akash*`;
            return reply(devMsg);
        }

        if (selection === "2") {
            let featMsg = `*🚀 ZANTA-MD All Features*

🖼️ *Media:* Getdp, Save status, Unlock view once image...
🎶 *Download:* Song, YTmp4, FB, Tiktok, Apk
🎨 *AI:* AI Image Gen (Genimg), Remove image Bg
🛠️ *Tools:* ToURL, ToQR, Ping, Alive, To sticker
🎮 *Fun:* Guess Game, Tod Game, Funtext
⚙ *Admin:* Group Settings, Bot DB, Settings

_සවිස්තරාත්මක ලැයිස්තුවට .menu ටයිප් කරන්න._`;
            return reply(featMsg);
        }

        if (selection === "3") {
            let contactMsg = `*📞 Contact Me*

ඔබට කිසියම් ගැටළුවක් ඇත්නම් පහත ලින්ක් හරහා අපව සම්බන්ධ කරගන්න:

🔗 *Official WhatsApp:* http://wa.me/+94743404814?text=*Hey__ZANTA

_ස්තුතියි!_`;
            return reply(contactMsg);
        }

        // --- 📂 2. මුලින්ම .help ගැසූ විට එන Main Help Message එක ---
        let mainHelp = `*✨ ${botName} සහය මධ්‍යස්ථානය ✨*

👋 ආයුබෝවන් *${pushname}*! ඔබට අවශ්‍ය සහය ලබා ගැනීමට අදාළ අංකය Reply කරන්න.

---
1️⃣ *බොට් සංවර්ධක (Bot Developer)*
2️⃣ *සියලුම විශේෂාංග (All Features)*
3️⃣ *සම්බන්ධ වීමට (Contact Me)*
---

> *${botName} Support System*`;

        // --- 🖼️ IMAGE LOGIC: DB Image එක ඇත්නම් එය පෙන්වයි, නැතිනම් Default Cache Image එක පෙන්වයි ---
        let imageToDisplay;
        if (settings.botImage && settings.botImage !== "null" && settings.botImage.startsWith("http")) {
            imageToDisplay = { url: settings.botImage };
        } else {
            imageToDisplay = cachedHelpImage || { url: HELP_IMG_URL };
        }

        const sentHelp = await zanta.sendMessage(from, { 
            image: imageToDisplay, 
            caption: mainHelp 
        }, { quoted: mek });

        // මැසේජ් ID එක සේව් කිරීම
        lastHelpMessage.set(from, sentHelp.key.id);

    } catch (e) {
        console.log(e);
        reply("❌ දෝෂයකි: " + e.message);
    }
});

module.exports = { lastHelpMessage };
