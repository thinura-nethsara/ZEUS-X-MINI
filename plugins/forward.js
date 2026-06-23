const { cmd } = require("../command");

cmd({
    pattern: "forward",
    alias: ["fwd", "sendto"],
    react: "↪",
    desc: "Forward any message using forwardMessage method",
    category: "main",
    filename: __filename,
}, async (bot, mek, m, { from, q, reply, isOwner }) => {
    try {
        if (!isOwner) return reply("❌ Bot Owner use only.");
        if (!q) return reply("📌 Target JID/LID එක ලබා දෙන්න.");
        if (!m.quoted) return reply("❌ Forward කිරීමට අවශ්‍ය මැසේජ් එකට Reply කරන්න.");

        // Split and trim JIDs (comma separated support)
        let jidList = q.split(',').map(jid => jid.trim());
        if (jidList.length === 0) {
            return reply("*Provide at least one Valid Jid. ⁉️*");
        }

        // Prepare the message to forward using quoted message
        let Opts = {
            key: mek.quoted?.["fakeObj"]?.["key"]
        };

        // Handle document message with caption
        if (mek.quoted.documentWithCaptionMessage?.message?.documentMessage) {
            let docMessage = mek.quoted.documentWithCaptionMessage.message.documentMessage;
            const mimeTypes = require("mime-types");
            let ext = mimeTypes.extension(docMessage.mimetype) || "file";
            docMessage.fileName = docMessage.fileName || `file.${ext}`;
        }

        Opts.message = mek.quoted;
        let successfulJIDs = [];

        // Forward the message to each JID
        for (let jid of jidList) {
            try {
                await bot.forwardMessage(jid, Opts, false);
                successfulJIDs.push(jid);
            } catch (error) {
                console.log(error);
                // Continue with next JID even if one fails
            }
        }

        // Response based on successful forwards
        if (successfulJIDs.length > 0) {
            await bot.sendMessage(from, { react: { text: "✅", key: mek.key } });
            return reply(`🚀 *Message Forwarded Successfully to:*\n\n${successfulJIDs.join("\n")}`);
        } else {
            return reply("❌ Failed to forward to any JID. Check console for errors.");
        }

    } catch (e) {
        console.error("FORWARD ERROR:", e);
        reply("❌ Forwarding failed: " + e.message);
    }
});
