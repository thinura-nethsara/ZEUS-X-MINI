const { cmd } = require("../command");
const axios = require("axios");

const CHANNEL_JID = "120363425542933159@newsletter";
const cooldowns = new Map();
const PAIR_IMAGE = "https://zeus-x-md-database.pages.dev/Data/zeus-x-main.jpeg";

cmd({
    pattern: "pair",
    alias: ["code", "login"],
    react: "🔑",
    desc: "Get ZEUS X pair code (Auto-copy format).",
    category: "main",
    filename: __filename
}, async (bot, mek, m, { from, q, reply, userSettings }) => {
    let phoneNumber = null; // මෙතන define කරන්න
    try {
        if (!q) return reply("ℹ️ *Please provide your phone number.*\n*Example:* .pair 947xxxxxxxx");

        phoneNumber = q.replace(/[^0-9]/g, ''); // මෙතන assign කරන්න
        
        // Cooldown Check
        if (cooldowns.has(phoneNumber)) {
            return reply("⏳ *Wait a moment!* Request already in progress.");
        }

        await bot.sendMessage(from, { react: { text: '⏳', key: mek.key } });

        // Cooldown Set (40s)
        cooldowns.set(phoneNumber, Date.now());
        setTimeout(() => cooldowns.delete(phoneNumber), 40000); 

        const pairUrl = `https://zeus-x-mini-official.ominisave.store/code?number=${phoneNumber}`;
        const response = await axios.get(pairUrl, { timeout: 30000 });

        if (response.data && response.data.code) {
            const pairCode = response.data.code;

            let mainMsg = `✨ *ZEUS X MINI PAIR CODE* ✨\n\n` +
                          `👤 *NUMBER:* ${phoneNumber}\n` +
                          `🔑 *STATUS:* Generated Successfully\n\n` +
                          `> _𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 𝐙𝐄𝐔𝐒 𝐈𝐍𝐂 </>_ 🇱🇰`;

            const contextInfo = {
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: CHANNEL_JID,
                    serverMessageId: 100,
                    newsletterName: "_𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 𝐙𝐄𝐔𝐒 𝐈𝐍𝐂 </>_ 🇱🇰"
                }
            };

            await bot.sendMessage(from, { 
                image: { url: PAIR_IMAGE }, 
                caption: mainMsg,
                contextInfo 
            }, { quoted: mek });

            await bot.sendMessage(from, { text: `${pairCode}` });
            await bot.sendMessage(from, { react: { text: '✅', key: mek.key } });

        } else {
            throw new Error("Invalid response");
        }

    } catch (e) {
        if (phoneNumber) { // phoneNumber null නෙමෙයි නම් විතරක්
            cooldowns.delete(phoneNumber);
        }
        console.error("Pair Error:", e.message);
        reply("❌ *Error:* සර්වර් එකෙන් කෝඩ් එක ලබාගත නොහැකි විය. පසුව උත්සාහ කරන්න.");
    }
});
