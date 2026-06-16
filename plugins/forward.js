const { cmd } = require("../command");
const { generateForwardMessageContent } = require('@whiskeysockets/baileys');

cmd({
    pattern: "forward",
    alias: ["fwd", "sendto"],
    react: "↪",
    desc: "Forward any message using gifted-baileys method",
    category: "main",
    filename: __filename,
}, async (bot, mek, m, { from, q, reply, isOwner }) => {
    try {
        if (!isOwner) return reply("❌ Bot Owner use only.");
        if (!q) return reply("📌 Target JID/LID එක ලබා දෙන්න.");
        if (!m.quoted) return reply("❌ Forward කිරීමට අවශ්‍ය මැසේජ් එකට Reply කරන්න.");

        const targetJid = q.trim();
        const rawMessage = m.quoted.fakeObj; // මුල් මැසේජ් එකේ දත්ත

        // 1. Gifted-Baileys ක්‍රමයට Forward Content එක හදමු
        // මෙතන false දාන්නේ "Forwarded" ටැග් එක ඕනේ නැත්නම් (true දාන්න ටැග් එක ඕනේ නම්)
        const forwardContent = await generateForwardMessageContent(rawMessage, true);

        // 2. generateForwardMessageContent එකෙන් එන result එකේ 
        // message කෑල්ල විතරක් sendMessage එකට pass කරමු
        if (!forwardContent || !forwardContent.message) {
            throw new Error("Could not generate forward content.");
        }

        await bot.sendMessage(targetJid, forwardContent.message);

        // Success
        await bot.sendMessage(from, { react: { text: "✅", key: mek.key } });
        reply(`🚀 *Forwarded Successfully to:* ${targetJid}`);

    } catch (e) {
        console.error("FORWARD ERROR:", e);
        reply("❌ Forwarding failed: " + e.message);
    }
});
