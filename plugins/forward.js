const { cmd } = require("../command");
const axios = require('axios');
const fs = require('fs');
const path = require('path');

cmd({
    pattern: "forward",
    alias: ["f", "sendto"],
    react: "↪",
    desc: "Forward any message with media download",
    category: "main",
    filename: __filename,
}, async (bot, mek, m, { from, q, reply, isOwner }) => {
    try {
        if (!isOwner) return reply("❌ Bot Owner use only.");
        if (!q) return reply("📌 Target JID/LID එක ලබා දෙන්න.");
        if (!m.quoted) return reply("❌ Forward කිරීමට අවශ්‍ය මැසේජ් එකට Reply කරන්න.");

        let jidList = q.split(',').map(jid => jid.trim());
        let successfulJIDs = [];
        const quoted = m.quoted;

        // Function to get media buffer from message
        async function getMediaBuffer(message) {
            try {
                // Check for different media types
                let mediaMessage = null;
                let mediaType = null;
                let caption = '';

                if (message.imageMessage) {
                    mediaMessage = message.imageMessage;
                    mediaType = 'image';
                    caption = mediaMessage.caption || '';
                } else if (message.videoMessage) {
                    mediaMessage = message.videoMessage;
                    mediaType = 'video';
                    caption = mediaMessage.caption || '';
                } else if (message.documentMessage) {
                    mediaMessage = message.documentMessage;
                    mediaType = 'document';
                    caption = mediaMessage.caption || '';
                } else if (message.audioMessage) {
                    mediaMessage = message.audioMessage;
                    mediaType = 'audio';
                    caption = mediaMessage.caption || '';
                } else if (message.stickerMessage) {
                    mediaMessage = message.stickerMessage;
                    mediaType = 'sticker';
                }

                if (!mediaMessage) return null;

                // Try to get media URL
                let mediaUrl = mediaMessage.url || mediaMessage.directPath;
                
                // If no URL, try to get from other sources
                if (!mediaUrl) {
                    // Try to get from message context
                    if (message.contextInfo && message.contextInfo.quotedMessage) {
                        // Try to get from quoted message
                        const quotedMsg = message.contextInfo.quotedMessage;
                        if (quotedMsg.imageMessage) mediaUrl = quotedMsg.imageMessage.url;
                        else if (quotedMsg.videoMessage) mediaUrl = quotedMsg.videoMessage.url;
                        else if (quotedMsg.documentMessage) mediaUrl = quotedMsg.documentMessage.url;
                    }
                }

                if (!mediaUrl) {
                    // Try to download using bot's download method if available
                    try {
                        if (bot.downloadMediaMessage) {
                            const buffer = await bot.downloadMediaMessage(message);
                            return {
                                buffer: buffer,
                                type: mediaType,
                                caption: caption,
                                mimetype: mediaMessage.mimetype || 'application/octet-stream',
                                fileName: mediaMessage.fileName || null
                            };
                        }
                    } catch (e) {
                        console.log('Download with bot method failed:', e);
                    }
                    return null;
                }

                // Download media using axios
                try {
                    const response = await axios.get(mediaUrl, {
                        responseType: 'arraybuffer',
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                            'Accept': '*/*',
                            'Accept-Encoding': 'gzip, deflate, br',
                            'Connection': 'keep-alive'
                        },
                        timeout: 30000 // 30 seconds timeout
                    });

                    return {
                        buffer: Buffer.from(response.data),
                        type: mediaType,
                        caption: caption,
                        mimetype: mediaMessage.mimetype || 'application/octet-stream',
                        fileName: mediaMessage.fileName || null,
                        ptt: mediaMessage.ptt || false
                    };
                } catch (downloadError) {
                    console.log('Download error:', downloadError.message);
                    return null;
                }

            } catch (error) {
                console.log('getMediaBuffer error:', error);
                return null;
            }
        }

        // Function to get text content
        function getTextContent(message) {
            if (message.conversation) return message.conversation;
            if (message.extendedTextMessage?.text) return message.extendedTextMessage.text;
            if (message.text) return message.text;
            if (message.message?.conversation) return message.message.conversation;
            if (message.message?.extendedTextMessage?.text) return message.message.extendedTextMessage.text;
            return null;
        }

        for (let targetJid of jidList) {
            try {
                // Try to get media buffer
                const mediaData = await getMediaBuffer(quoted);
                
                if (mediaData && mediaData.buffer) {
                    // Send media message
                    const sendParams = {
                        caption: mediaData.caption || '',
                        mimetype: mediaData.mimetype
                    };

                    if (mediaData.type === 'image') {
                        await bot.sendMessage(targetJid, { 
                            image: mediaData.buffer, 
                            caption: mediaData.caption || '',
                            mimetype: mediaData.mimetype
                        });
                    } else if (mediaData.type === 'video') {
                        await bot.sendMessage(targetJid, { 
                            video: mediaData.buffer, 
                            caption: mediaData.caption || '',
                            mimetype: mediaData.mimetype
                        });
                    } else if (mediaData.type === 'document') {
                        await bot.sendMessage(targetJid, { 
                            document: mediaData.buffer, 
                            caption: mediaData.caption || '',
                            mimetype: mediaData.mimetype,
                            fileName: mediaData.fileName || 'document'
                        });
                    } else if (mediaData.type === 'audio') {
                        await bot.sendMessage(targetJid, { 
                            audio: mediaData.buffer, 
                            mimetype: mediaData.mimetype,
                            ptt: mediaData.ptt || false
                        });
                    } else if (mediaData.type === 'sticker') {
                        await bot.sendMessage(targetJid, { 
                            sticker: mediaData.buffer, 
                            mimetype: mediaData.mimetype
                        });
                    }
                    
                    successfulJIDs.push(targetJid);
                } else {
                    // Try to send as text
                    const text = getTextContent(quoted);
                    if (text) {
                        await bot.sendMessage(targetJid, { text: text });
                        successfulJIDs.push(targetJid);
                    } else {
                        // Try one more method - use generateForwardMessageContent
                        try {
                            const { generateForwardMessageContent } = require('@whiskeysockets/baileys');
                            const forwardContent = await generateForwardMessageContent(quoted.fakeObj || quoted, false);
                            if (forwardContent && forwardContent.message) {
                                await bot.sendMessage(targetJid, forwardContent.message);
                                successfulJIDs.push(targetJid);
                            }
                        } catch (e) {
                            console.log('Generate forward failed:', e);
                            throw new Error("Cannot forward this message type");
                        }
                    }
                }
                
            } catch (error) {
                console.log(`Failed to forward to ${targetJid}:`, error.message);
            }
        }

        if (successfulJIDs.length > 0) {
            await bot.sendMessage(from, { react: { text: "✅", key: mek.key } });
            return reply(`✅ *Successfully forwarded to:*\n\n${successfulJIDs.join("\n")}`);
        } else {
            return reply("❌ Failed to forward to any JID. The media might be expired or unavailable.");
        }

    } catch (e) {
        console.error("FORWARD ERROR:", e);
        reply("❌ Error: " + e.message);
    }
});
