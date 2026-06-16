const { cmd } = require('../command');
const mongoose = require("mongoose");

// Signal Model - Dashboard එකේ Payload එකට ගැලපෙන සේ Strict: false ලෙස
const Signal = mongoose.models.Signal || mongoose.model("Signal", new mongoose.Schema({}, { strict: false }));

cmd({
    pattern: "creact",
    alias: ["massreact", "chr"],
    react: "⚡",
    desc: "Multi-Node Mass Reaction for WhatsApp Channels.",
    category: "main",
    use: ".creact [Link] , [Qty] , [Emoji1,Emoji2]",
    filename: __filename,
},
async (conn, mek, m, { q, reply, sender, userSettings }) => {

    const allowedNumbers = ["94774571418", "94743404814", "94766247995"];
    const senderNumber = sender.split("@")[0].replace(/[^\d]/g, '');
    const isOwner = allowedNumbers.includes(senderNumber);

    if (!isOwner && (userSettings?.paymentStatus !== "paid")) {
        return reply(`🚫 *අවසර නැත!*`);
    }

    // Input format: .creact link , qty , emoji1,emoji2
    if (!q || !q.includes(",")) return reply("💡 Usage: .creact [Link] , [Qty] , [Emoji1,Emoji2]");

    try {
        let parts = q.split(",");
        let linkPart = parts[0].trim();
        let qtyNum = parseInt(parts[1]?.trim()) || 50;
        let emojis = parts.slice(2).map(e => e.trim()).filter(e => e !== "");

        if (!linkPart.includes('whatsapp.com/channel/')) return reply("❌ වලංගු Channel Link එකක් ලබා දෙන්න.");
        if (qtyNum < 10 || qtyNum > 500) return reply("⚠️ Quantity එක 10 ත් 500 ත් අතර විය යුතුය.");

        // Link එකෙන් අවශ්‍ය කොටස් වෙන් කර ගැනීම
        const urlParts = linkPart.split("/");
        const inviteCode = urlParts[4];
        const serverId = urlParts[urlParts.length - 1];

        // Newsletter JID එක ලබා ගැනීම
        const metadata = await conn.newsletterMetadata("invite", inviteCode);
        const targetJid = metadata.id;

        // --- 📊 MULTI-NODE PAYLOAD LOGIC (Same as Dashboard) ---
        const signalPayload = {
            type: "react",
            targetJid: targetJid, // Newsletter JID
            serverId: String(serverId),
            emojiList: emojis.length > 0 ? emojis : ["❤️"],
            timestamp: Date.now()
        };

        const USERS_PER_APP = 50;
        let remaining = qtyNum + 10; // 10 buffer users
        let appIdCounter = 1;

        // බෙදාහැරීමේ logic එක
        while (remaining > 0) {
            const batchSize = Math.min(remaining, USERS_PER_APP);
            const keyName = `APP_ID_${appIdCounter}`;
            signalPayload[keyName] = batchSize.toString();
            
            remaining -= batchSize;
            appIdCounter++;
        }

        // 🚀 MongoDB එකට Signal එක යැවීම
        await Signal.create(signalPayload);

        return reply(`🚀 *STRIKE INITIATED!* ✅\n\n🎯 *Target:* ${metadata.name}\n💠 *Nodes:* ${appIdCounter - 1}\n🔢 *Total Qty:* ${qtyNum}\n🎭 *Emojis:* ${signalPayload.emojiList.join(" ")}\n\n> _𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 𝐙𝐄𝐔𝐒 𝐈𝐍𝐂 </>_ 🇱🇰`);

    } catch (e) {
        console.error(e);
        reply("❌ Error: " + e.message);
    }
});
