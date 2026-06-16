const { cmd } = require("../command");

/**
 * Thappara ganaka delay ekak athi kireema
 * @param {number} ms - Milliseconds
 */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

cmd({
    pattern: "boom",
    alias: ["spam", "flood"],
    react: "💣",
    desc: "Send multiple messages with a delay.",
    category: "tools",
    use: ".boom hi,10",
    filename: __filename,
}, async (bot, mek, m, { from, q, reply, isOwner }) => {
    try {
        // Owner check (Meka dangerous nisa owner vitharak use karana eka hodayi)
        if (!isOwner) return reply("❌ This command is only for the Bot Owner.");

        if (!q) return reply("📌 *Usage Example:* .boom Hello,10\n(Message and count separated by a comma)");

        // Message eka saha count eka wen karaganeema
        const args = q.split(",");
        const messageText = args[0]?.trim();
        const count = parseInt(args[1]?.trim());

        if (!messageText || isNaN(count)) {
            return reply("❌ Invalid format! Use: `.boom message,count` (e.g - .boom hi,5)");
        }

        // 50 limit eka check kireema
        if (count > 50) {
            return reply("⚠️ *Max limit is 50 for your security!*");
        }

        if (count <= 0) return reply("❌ Count must be at least 1.");

        await bot.sendMessage(from, { react: { text: "🚀", key: mek.key } });

        // Loop eka haraha messages yawama
        for (let i = 0; i < count; i++) {
            await bot.sendMessage(from, { text: messageText });
            
            // Thappara 1.5ka (1500ms) delay ekak thiyamu
            // Meka last message ekedi thiyanna oni nathi nisa i < count - 1 dala thiyenawa
            if (i < count - 1) {
                await delay(1500);
            }
        }

        await bot.sendMessage(from, { react: { text: "✅", key: mek.key } });

    } catch (e) {
        console.error("BOOM ERROR:", e);
        reply("❌ Error: " + e.message);
    }
});
