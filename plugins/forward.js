cmd({
    pattern: "forward",
    react: "⏩",
    alias: ["f"],
    desc: "Forward messages with media support",
    use: ".f jid1,jid2",
    category: "main",
    filename: __filename
},
async (conn, mek, m, { from, q, reply, isOwner, isMe, isSudo }) => {
    try {
        if (!isMe && !isOwner && !isSudo) return reply('*📛OWNER COMMAND*');
        if (!q || !m.quoted) {
            return reply("*Please give me a Jid and Quote a Message to continue.*");
        }

        let jidList = q.split(',').map(jid => jid.trim());
        if (jidList.length === 0) {
            return reply("*Provide at least one Valid Jid. ⁉️*");
        }

        const quoted = m.quoted;
        let successfulJIDs = [];

        for (let targetJid of jidList) {
            try {
                // ---- TEXT MESSAGE ----
                if (quoted.type === "conversation" || quoted.text) {
                    await conn.sendMessage(targetJid, { text: quoted.text || quoted.msg });
                    successfulJIDs.push(targetJid);
                }
                // ---- IMAGE MESSAGE ----
                else if (quoted.type === "imageMessage") {
                    const image = await quoted.download();
                    const caption = quoted.imageMessage?.caption || '';
                    await conn.sendMessage(targetJid, { image: image, caption: caption });
                    successfulJIDs.push(targetJid);
                }
                // ---- VIDEO MESSAGE ----
                else if (quoted.type === "videoMessage") {
                    const video = await quoted.download();
                    const caption = quoted.videoMessage?.caption || '';
                    await conn.sendMessage(targetJid, { video: video, caption: caption, mimetype: 'video/mp4' });
                    successfulJIDs.push(targetJid);
                }
                // ---- AUDIO MESSAGE ----
                else if (quoted.type === "audioMessage") {
                    const audio = await quoted.download();
                    await conn.sendMessage(targetJid, { 
                        audio: audio, 
                        mimetype: 'audio/mpeg',
                        ptt: quoted.audioMessage?.ptt || false 
                    });
                    successfulJIDs.push(targetJid);
                }
                // ---- STICKER MESSAGE ----
                else if (quoted.type === "stickerMessage") {
                    const sticker = await quoted.download();
                    await conn.sendMessage(targetJid, { sticker: sticker });
                    successfulJIDs.push(targetJid);
                }
                // ---- DOCUMENT MESSAGE ----
                else if (quoted.type === "documentMessage" || quoted.type === "documentWithCaptionMessage") {
                    const doc = await quoted.download();
                    let docMsg = quoted.documentMessage || quoted.documentWithCaptionMessage?.message?.documentMessage;
                    await conn.sendMessage(targetJid, { 
                        document: doc, 
                        mimetype: docMsg?.mimetype || 'application/octet-stream',
                        fileName: docMsg?.fileName || 'document.pdf',
                        caption: docMsg?.caption || ''
                    });
                    successfulJIDs.push(targetJid);
                }
                // ---- VIEW ONCE (VIDEO) ----
                else if (quoted.viewOnceMessageV2?.message?.videoMessage) {
                    const videoMsg = quoted.viewOnceMessageV2.message.videoMessage;
                    const video = await quoted.download();
                    await conn.sendMessage(targetJid, { 
                        video: video, 
                        caption: videoMsg.caption || '',
                        viewOnce: true 
                    });
                    successfulJIDs.push(targetJid);
                }
                // ---- VIEW ONCE (IMAGE) ----
                else if (quoted.viewOnceMessageV2?.message?.imageMessage) {
                    const imgMsg = quoted.viewOnceMessageV2.message.imageMessage;
                    const image = await quoted.download();
                    await conn.sendMessage(targetJid, { 
                        image: image, 
                        caption: imgMsg.caption || '',
                        viewOnce: true 
                    });
                    successfulJIDs.push(targetJid);
                }
                // ---- DEFAULT / UNKNOWN ----
                else {
                    // Try to send as text if possible
                    const text = quoted.msg || quoted.text || quoted.body || '';
                    if (text) {
                        await conn.sendMessage(targetJid, { text: text });
                        successfulJIDs.push(targetJid);
                    } else {
                        throw new Error("Unsupported message type: " + quoted.type);
                    }
                }

            } catch (error) {
                console.log(`Failed to forward to ${targetJid}:`, error.message);
                // Try fallback: send as text with error info
                try {
                    await conn.sendMessage(targetJid, { 
                        text: `⚠️ *Forward Failed*\nType: ${quoted.type || 'Unknown'}\nError: ${error.message}` 
                    });
                } catch (e) {}
            }
        }

        if (successfulJIDs.length > 0) {
            await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });
            return reply(`*✅ Forwarded to:*\n\n${successfulJIDs.join("\n")}`);
        } else {
            return reply("❌ Failed to forward to any JID.");
        }

    } catch (e) {
        console.error("FORWARD ERROR:", e);
        reply(`❌ Error: ${e.message}`);
    }
});
