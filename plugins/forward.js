const { cmd } = require("../command");
const axios = require('axios');

cmd({
    pattern: "forward",
    alias: ["fwd", "f"],
    react: "↪",
    desc: "Forward any message including media",
    category: "main",
    filename: __filename,
}, async (bot, mek, m, { from, q, reply, isOwner }) => {
    try {
        if (!isOwner) return reply("❌ Bot Owner use only.");
        if (!q) return reply("📌 Target JID/LID එක ලබා දෙන්න.");
        if (!m.quoted) return reply("❌ Forward කිරීමට අවශ්‍ය මැසේජ් එකට Reply කරන්න.");

        // Split and trim JIDs
        let jidList = q.split(',').map(jid => jid.trim());
        if (jidList.length === 0) {
            return reply("*Provide at least one Valid Jid. ⁉️*");
        }

        let successfulJIDs = [];
        const quoted = m.quoted;

        // Function to download media
        async function downloadMedia(message) {
            try {
                let mediaType = null;
                let mediaData = null;
                let caption = '';

                if (message.imageMessage) {
                    mediaType = 'image';
                    mediaData = message.imageMessage;
                    caption = mediaData.caption || '';
                } else if (message.videoMessage) {
                    mediaType = 'video';
                    mediaData = message.videoMessage;
                    caption = mediaData.caption || '';
                } else if (message.documentMessage) {
                    mediaType = 'document';
                    mediaData = message.documentMessage;
                    caption = mediaData.caption || '';
                } else if (message.audioMessage) {
                    mediaType = 'audio';
                    mediaData = message.audioMessage;
                    caption = mediaData.caption || '';
                } else if (message.stickerMessage) {
                    mediaType = 'sticker';
                    mediaData = message.stickerMessage;
                }

                if (mediaData && mediaData.url) {
                    // Download the media
                    const response = await axios.get(mediaData.url, {
                        responseType: 'arraybuffer',
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                        }
                    });
                    
                    return {
                        type: mediaType,
                        buffer: Buffer.from(response.data),
                        caption: caption,
                        mimetype: mediaData.mimetype || 'application/octet-stream',
                        fileName: mediaData.fileName || null,
                        ptt: mediaData.ptt || false
                    };
                }
                return null;
            } catch (error) {
                console.error('Download error:', error);
                return null;
            }
        }

        // Function to get text content
        function getTextContent(message) {
            if (message.conversation) return message.conversation;
            if (message.extendedTextMessage?.text) return message.extendedTextMessage.text;
            if (message.text) return message.text;
            return null;
        }

        for (let targetJid of jidList) {
            try {
                // Try to download media if available
                const mediaContent = await downloadMedia(quoted);
                
                if (mediaContent) {
                    // Send media message
                    const sendParams = {
                        caption: mediaContent.caption || '',
                        mimetype: mediaContent.mimetype
                    };

                    if (mediaContent.type === 'image') {
                        await bot.sendMessage(targetJid, { 
                            image: mediaContent.buffer, 
                            caption: mediaContent.caption || '',
                            mimetype: mediaContent.mimetype
                        });
                    } else if (mediaContent.type === 'video') {
                        await bot.sendMessage(targetJid, { 
                            video: mediaContent.buffer, 
                            caption: mediaContent.caption || '',
                            mimetype: mediaContent.mimetype
                        });
                    } else if (mediaContent.type === 'document') {
                        await bot.sendMessage(targetJid, { 
                            document: mediaContent.buffer, 
                            caption: mediaContent.caption || '',
                            mimetype: mediaContent.mimetype,
                            fileName: mediaContent.fileName || 'document'
                        });
                    } else if (mediaContent.type === 'audio') {
                        await bot.sendMessage(targetJid, { 
                            audio: mediaContent.buffer, 
                            mimetype: mediaContent.mimetype,
                            ptt: mediaContent.ptt
                        });
                    } else if (mediaContent.type === 'sticker') {
                        await bot.sendMessage(targetJid, { 
                            sticker: mediaContent.buffer, 
                            mimetype: mediaContent.mimetype
                        });
                    }
                } else {
                    // Send text message
                    const text = getTextContent(quoted);
                    if (text) {
                        await bot.sendMessage(targetJid, { text: text });
                    } else {
                        // Try to forward as is using quoted message
                        await bot.sendMessage(targetJid, { 
                            text: "⚠️ Unable to forward this message type. Original message content couldn't be retrieved."
                        });
                    }
                }
                
                successfulJIDs.push(targetJid);
                
            } catch (error) {
                console.log(`Failed to forward to ${targetJid}:`, error.message);
                // Try fallback method
                try {
                    // Fallback: Try to send as text with media info
                    await bot.sendMessage(targetJid, { 
                        text: `⚠️ *Media Forwarding Failed*\n\nMedia type: ${Object.keys(quoted).find(k => k.includes('Message')) || 'Unknown'}\nError: ${error.message}`
                    });
                } catch (e) {
                    console.log('Fallback failed:', e);
                }
            }
        }

        // Response
        if (successfulJIDs.length > 0) {
            await bot.sendMessage(from, { react: { text: "✅", key: mek.key } });
            return reply(`🚀 *Forwarded Successfully to:*\n\n${successfulJIDs.join("\n")}`);
        } else {
            return reply("❌ Failed to forward to any JID.");
        }

    } catch (e) {
        console.error("FORWARD ERROR:", e);
        reply("❌ Forwarding failed: " + e.message);
    }
});
