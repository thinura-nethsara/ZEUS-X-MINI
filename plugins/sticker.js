const { cmd } = require("../command");
const fs = require('fs');
const path = require('path');
const ffmpegPath = require('ffmpeg-static');
const ffmpeg = require('fluent-ffmpeg');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const axios = require('axios');
const FormData = require('form-data');

ffmpeg.setFfmpegPath(ffmpegPath);

const tempDir = path.join(__dirname, '../temp');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });



/**
 * Media බාගත කිරීමේ ක්‍රියාවලිය
 */
const downloadMedia = async (message, type) => {
    try {
        const stream = await downloadContentFromMessage(message, type);
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }
        return buffer;
    } catch (e) {
        return null;
    }
};

/**
 * Media Type එක හරියටම සොයාගැනීමේ logic එක (Deep Search)
 */
const getMedia = (quoted) => {
    if (!quoted) return null;
    let msg = quoted.message || quoted.msg || quoted;
    
    if (msg.imageMessage) return { data: msg.imageMessage, type: 'image' };
    if (msg.videoMessage) return { data: msg.videoMessage, type: 'video' };
    if (msg.stickerMessage) return { data: msg.stickerMessage, type: 'sticker' };
    
    let context = msg.extendedTextMessage?.contextInfo?.quotedMessage;
    if (context) {
        if (context.imageMessage) return { data: context.imageMessage, type: 'image' };
        if (context.videoMessage) return { data: context.videoMessage, type: 'video' };
        if (context.stickerMessage) return { data: context.stickerMessage, type: 'sticker' };
    }
    
    if (quoted.imageMessage) return { data: quoted.imageMessage, type: 'image' };
    if (quoted.videoMessage) return { data: quoted.videoMessage, type: 'video' };
    if (quoted.stickerMessage) return { data: quoted.stickerMessage, type: 'sticker' };
    
    return null;
};

// 1. 🖼️ IMAGE/VIDEO TO STICKER (.s)
cmd({
    pattern: "sticker",
    alias: ["s", "st"],
    react: "🌟",
    desc: "Convert image to sticker.",
    category: "convert",
    filename: __filename,
}, async (zanta, mek, m, { from, reply, quoted }) => {
    try {
        let media = getMedia(quoted);
        if (!media || (media.type !== 'image' && media.type !== 'video')) return reply("*Please reply to image* ❌");

        reply("*Creating.....* ⏳");
        const buffer = await downloadMedia(media.data, media.type);
        const inPath = path.join(tempDir, `temp_${Date.now()}`);
        const outPath = path.join(tempDir, `st_${Date.now()}.webp`);
        fs.writeFileSync(inPath, buffer);

        ffmpeg(inPath)
            .on('end', async () => {
                await zanta.sendMessage(from, { sticker: fs.readFileSync(outPath), packname: "ZANTA-MD", author: "Sticker-Bot" }, { quoted: mek });
                fs.unlinkSync(inPath); fs.unlinkSync(outPath);
            })
            .on('error', (e) => { reply("Error!"); fs.unlinkSync(inPath); })
            .addOutputOptions(["-vcodec", "libwebp", "-vf", "scale=320:320:force_original_aspect_ratio=decrease,pad=320:320:(320-iw)/2:(320-ih)/2:color=white@0.0"])
            .save(outPath);
    } catch (e) { reply("Error!"); }
});

// 2. 🎡 STICKER TO IMAGE (.toimg)
cmd({
    pattern: "toimg",
    react: "🖼️",
    desc: "Convert sticker to image.",
    category: "convert",
    filename: __filename,
}, async (zanta, mek, m, { from, reply, quoted }) => {
    try {
        let media = getMedia(quoted);
        if (!media || media.type !== 'sticker') return reply("*Please reply to sticker* ❌");

        reply("*Creating....* ⏳");
        const buffer = await downloadMedia(media.data, 'sticker');
        const inPath = path.join(tempDir, `st_in_${Date.now()}.webp`);
        const outPath = path.join(tempDir, `img_${Date.now()}.png`);
        fs.writeFileSync(inPath, buffer);

        ffmpeg(inPath)
            .on('end', async () => {
                await zanta.sendMessage(from, { image: fs.readFileSync(outPath), caption: "> *ZANTA-MD Convert*" }, { quoted: mek });
                fs.unlinkSync(inPath); fs.unlinkSync(outPath);
            })
            .save(outPath);
    } catch (e) { reply("Error!"); }
});


module.exports = {};
