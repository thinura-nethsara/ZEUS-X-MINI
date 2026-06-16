const { cmd } = require("../command");
const { updateSetting } = require("./bot_db");
const config = require("../config");

cmd({
    pattern: "reset",
    desc: "Reset your bot settings to default.",
    category: "main",
    react: "🔄",
    filename: __filename,
}, async (zanta, mek, m, { from, reply, sender, isOwner }) => {

    try {
        // --- 🆔 නිවැරදි ID එක ලබා ගැනීම ---
        // sender පාවිච්චි නොකර බොට්ගේ සැබෑ ID එක මෙතැනින් ලබා ගනී
        // zanta.user.id එකෙන් "9471234567:4@s.whatsapp.net" වැනි එකක් ආවත් එය පිරිසිදු කර අංකය පමණක් ගනී.
        const botNumber = zanta.user.id.split(":")[0].split("@")[0];

        // --- 🛡️ අයිතිකරු පමණක්දැයි පරීක්ෂාව (Security) ---
        // සෙටින්ග්ස් රීසෙට් කිරීම අයිතිකරුට පමණක් සීමා කිරීම වඩාත් ආරක්ෂිතයි.
        const senderNumber = sender.split("@")[0].replace(/[^\d]/g, "");
        if (!isOwner && senderNumber !== botNumber) {
            return reply("🚫 *අවසර නැත!* \n\nමෙම කමාන්ඩ් එක භාවිතා කළ හැක්කේ බොට්ගේ හිමිකරුට පමණි.");
        }

        // --- ⚙️ Default Settings ---
        const defaultSettings = {
            botName: config.DEFAULT_BOT_NAME || "ZEUS-X-MINI",
            ownerName: config.DEFAULT_OWNER_NAME || "Owner",
            prefix: config.DEFAULT_PREFIX || ".",
            workType: "public",
            password: "not_set",
            botImage: "null",
            alwaysOnline: "false",
            autoRead: "false",
            autoTyping: "false",
            autoStatusSeen: "true",
            autoStatusReact: "true",
            readCmd: "false",
            autoVoice: "false",
            autoReply: "false",
            connectionMsg: "true",
            buttons: "true",
            autoVoiceReply: "false",
            antidelete: "false",
            autoReact: "false",
            badWords: "false",
            antiLink: "false",
            antiCmd: "false",
            antiBot: "false"
        };

        // 1. Database Update (බොට්ගේ නිවැරදි අංකයට)
        const success = await updateSetting(botNumber, defaultSettings);

        if (success) {
            // 2. Global Memory Cache Update
            if (global.BOT_SESSIONS_CONFIG) {
                global.BOT_SESSIONS_CONFIG[botNumber] = {
                    ...global.BOT_SESSIONS_CONFIG[botNumber],
                    ...defaultSettings
                };
            }

            // 3. UI Status Update
            await zanta.sendPresenceUpdate("unavailable");

            return reply(`✅ *SUCCESSFULLY RESET!*\n\nID: *${botNumber}* සඳහා වූ සියලුම settings සාර්ථකව මුල් තත්වයට පත් කරන ලදී.`);
        } else {
            return reply("❌ *FAILED:* Settings reset කිරීමට නොහැකි විය.");
        }

    } catch (error) {
        console.error("Reset Command Error:", error);
        return reply("❌ *ERROR:* පද්ධතියේ දෝෂයක් පවතී.");
    }
});
