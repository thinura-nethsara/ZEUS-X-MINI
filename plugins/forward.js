const { cmd } = require("../command");
const { generateForwardMessageContent } = require('@whiskeysockets/baileys');

cmd({
    pattern: "forward",
    alias: ["f"],
    react: "↪",
    desc: "Forward message",
    category: "main",
    filename: __filename,
}, async (bot, mek, m, { from, q, reply, isOwner }) => {
    try {
        if (!isOwner) return reply("❌ Owner only.");
        if (!q) return reply("📌 Target JID එක දෙන්න.");
        if (!m.quoted) return reply("❌ Message එකට reply කරන්න.");

        let jidList = q.split(',').map(jid => jid.trim());
        let successfulJIDs = [];

        for (let targetJid of jidList) {
            try {
                // Generate forward content
                const forwardContent = await generateForwardMessageContent(m.quoted.fakeObj, false);
                
                if (forwardContent && forwardContent.message) {
                    await bot.sendMessage(targetJid, forwardContent.message);
                    successfulJIDs.push(targetJid);
                }
            } catch (error) {
                console.log(`Failed to forward to ${targetJid}:`, error.message);
            }
        }

        if (successfulJIDs.length > 0) {
            await bot.sendMessage(from, { react: { text: "✅", key: mek.key } });
            reply(`✅ Forwarded to:\n${successfulJIDs.join("\n")}`);
        } else {
            reply("❌ Failed to forward.");
        }

    } catch (e) {
        console.error(e);
        reply("❌ Error: " + e.message);
    }
});
