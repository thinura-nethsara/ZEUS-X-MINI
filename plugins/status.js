const { cmd } = require("../command");
const { getContentType, downloadContentFromMessage } = require("@whiskeysockets/baileys"); 
const config = require("../config"); 

cmd(
    {
        pattern: "save", 
        react: "📥",
        desc: "Download status",
        category: "media",
        filename: __filename,
    },
    async (zanta, mek, m, { from, reply, args, prefix }) => {
        try {
            if (!m.quoted) {
                return reply(`❌ Status message එකකට reply කර *${prefix}save* ලෙස යවන්න.`);
            }

            const quotedObject = m.quoted;
            const innerMessage = quotedObject.msg || quotedObject.message; 

            if (!innerMessage) {
                return reply(`❌ Reply කළ පණිවිඩයේ දත්ත සොයා ගැනීමට නොහැක.`);
            }

            if (!quotedObject.isStatus) {
                let actualType = innerMessage.type || getContentType(innerMessage);
                if (innerMessage.mimetype) {
                    if (innerMessage.mimetype.startsWith('image')) actualType = 'imageMessage';
                    else if (innerMessage.mimetype.startsWith('video')) actualType = 'videoMessage';
                    else if (innerMessage.mimetype.startsWith('audio')) actualType = 'audioMessage';
                }
                return reply(`⚠️ කරුණාකර reply කරන්න *Status Message* එකකට පමණි. (Actual Type: ${actualType || 'unknown'})`);
            }

            const type = quotedObject.type; 

            if (type === 'imageMessage' || type === 'videoMessage') {

                reply("📥 Status Download කරමින්...");
                await zanta.sendMessage(from, { react: { text: "⏳", key: mek.key } });

                // --- RAM එක ඉතිරි කරගන්නා අලුත් ක්‍රමය (Streaming) ---
                const stream = await downloadContentFromMessage(
                    innerMessage, 
                    type === 'imageMessage' ? 'image' : 'video'
                );

                let buffer = Buffer.from([]);
                for await (const chunk of stream) {
                    buffer = Buffer.concat([buffer, chunk]);
                }
                // ---------------------------------------------

                const senderJid = quotedObject.sender;
                const caption = `${type === 'imageMessage' ? '🖼️ *Status Image Saved*' : '📹 *Status Video Saved*'}\nStatus Owner: @${senderJid.split('@')[0]}`;

                await zanta.sendMessage(from, { 
                    [type === 'imageMessage' ? 'image' : 'video']: buffer, 
                    caption: caption,
                    mentions: [senderJid]
                }, { quoted: mek });

                await zanta.sendMessage(from, { react: { text: "✅", key: mek.key } });

            } else {
                return reply(`❌ මෙම Status වර්ගය (${type}) Save කළ නොහැක.`);
            }

        } catch (err) {
            console.error("Status Saver Command Error:", err);
            reply("❌ Status එක Download කිරීමේදී දෝෂයක් සිදුවිය.");
        }
    }
);
