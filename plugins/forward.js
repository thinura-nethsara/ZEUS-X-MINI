const { cmd } = require("../command");

cmd({
    pattern: "forward",
    alias: ["f", "sendto"],
    react: "↪",
    desc: "Forward any message using sendMessage method",
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

        let successfulJIDs = [];

        // Forward the message to each JID
        for (let targetJid of jidList) {
            try {
                // Get the quoted message content
                const quotedMsg = m.quoted;
                
                // Extract message content based on type
                let messageContent = {};
                
                if (quotedMsg.text) {
                    // Text message
                    messageContent = { text: quotedMsg.text };
                } else if (quotedMsg.imageMessage) {
                    // Image message
                    const imageMsg = quotedMsg.imageMessage;
                    messageContent = {
                        image: { url: imageMsg.url || imageMsg.directPath },
                        caption: imageMsg.caption || '',
                        mimetype: imageMsg.mimetype
                    };
                } else if (quotedMsg.videoMessage) {
                    // Video message
                    const videoMsg = quotedMsg.videoMessage;
                    messageContent = {
                        video: { url: videoMsg.url || videoMsg.directPath },
                        caption: videoMsg.caption || '',
                        mimetype: videoMsg.mimetype
                    };
                } else if (quotedMsg.documentMessage) {
                    // Document message
                    const docMsg = quotedMsg.documentMessage;
                    messageContent = {
                        document: { url: docMsg.url || docMsg.directPath },
                        mimetype: docMsg.mimetype,
                        fileName: docMsg.fileName || 'document.pdf'
                    };
                } else if (quotedMsg.audioMessage) {
                    // Audio message
                    const audioMsg = quotedMsg.audioMessage;
                    messageContent = {
                        audio: { url: audioMsg.url || audioMsg.directPath },
                        mimetype: audioMsg.mimetype,
                        ptt: audioMsg.ptt || false
                    };
                } else if (quotedMsg.stickerMessage) {
                    // Sticker message
                    const stickerMsg = quotedMsg.stickerMessage;
                    messageContent = {
                        sticker: { url: stickerMsg.url || stickerMsg.directPath },
                        mimetype: stickerMsg.mimetype
                    };
                } else if (quotedMsg.contactMessage) {
                    // Contact message
                    const contactMsg = quotedMsg.contactMessage;
                    messageContent = {
                        contacts: {
                            displayName: contactMsg.displayName,
                            vcard: contactMsg.vcard
                        }
                    };
                } else if (quotedMsg.locationMessage) {
                    // Location message
                    const locMsg = quotedMsg.locationMessage;
                    messageContent = {
                        location: {
                            degreesLatitude: locMsg.degreesLatitude,
                            degreesLongitude: locMsg.degreesLongitude,
                            name: locMsg.name || '',
                            address: locMsg.address || ''
                        }
                    };
                } else if (quotedMsg.extendedTextMessage) {
                    // Extended text message with context info
                    const extMsg = quotedMsg.extendedTextMessage;
                    messageContent = {
                        text: extMsg.text || ''
                    };
                } else if (quotedMsg.conversation) {
                    // Simple conversation
                    messageContent = { text: quotedMsg.conversation };
                } else {
                    // Try to get any available message content
                    const msgKeys = Object.keys(quotedMsg);
                    const possibleMsgTypes = ['conversation', 'text', 'extendedTextMessage', 'imageMessage', 'videoMessage', 'documentMessage', 'audioMessage', 'stickerMessage', 'contactMessage', 'locationMessage'];
                    
                    let found = false;
                    for (let type of possibleMsgTypes) {
                        if (quotedMsg[type]) {
                            messageContent = { [type]: quotedMsg[type] };
                            found = true;
                            break;
                        }
                    }
                    
                    if (!found) {
                        throw new Error("Unsupported message type");
                    }
                }

                // Send the message to target JID
                await bot.sendMessage(targetJid, messageContent);
                successfulJIDs.push(targetJid);
                
            } catch (error) {
                console.log(`Failed to forward to ${targetJid}:`, error.message);
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
