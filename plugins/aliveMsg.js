function getAliveMessage(botInfo = {}) {
    // ශ්‍රී ලාංකික වේලාව සඳහා (UTC+5:30)
    const now = new Date();
    const sriLankaTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
    
    const date = sriLankaTime.toLocaleDateString('en-US', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
    });
    const time = sriLankaTime.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit', 
        hour12: false 
    });

    // Dynamic Greeting (ශ්‍රී ලාංකික වේලාව අනුව)
    const hour = sriLankaTime.getHours();
    let greeting = "ɢᴏᴏᴅ ᴍᴏʀɴɪɴɢ ☀️";
    if (hour >= 12 && hour < 17) greeting = "ɢᴏᴏᴅ ᴀꜰᴛᴇʀɴᴏᴏɴ 🌤️";
    else if (hour >= 17 && hour < 21) greeting = "ɢᴏᴏᴅ ᴇᴠᴇɴɪɴɢ 🌅";
    else if (hour >= 21 || hour < 5) greeting = "ɢᴏᴏᴅ ɴɪɢʜᴛ 🌙";

    // Uptime
    const uptimeSec = botInfo.uptime || 0;
    const days = Math.floor(uptimeSec / 86400);
    const hours = Math.floor((uptimeSec % 86400) / 3600);
    const mins = Math.floor((uptimeSec % 3600) / 60);
    const uptimeStr = days > 0 ? `${days}d ${hours}h ${mins}m` : `${hours}h ${mins}m`;

    const prefix = botInfo.prefix || global.BOT_PREFIX || '/';

    return `
◈◈◈◈◈◈◈◈◈◈◈
✦ ─── *${botInfo.botName || 'ZEUS XMD'}* ─── ✦
◈◈◈◈◈◈◈◈◈◈◈
${greeting} ✨
\`✦  ᴘʀᴇꜰɪx   :  ${prefix}\`
\`✦  ᴅᴀᴛᴇ     :  ${date}\`
\`✦  ᴛɪᴍᴇ     :  ${time}\`
\`✦  ᴜᴘᴛɪᴍᴇ  :  ${uptimeStr}\`
◈◈◈◈◈◈◈◈◈◈◈
*“ ʀᴇᴀᴅʏ ᴛᴏ ᴀꜱꜱɪꜱᴛ ”*
*⚡ ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴢᴇᴜꜱ ɪɴᴄ ⚡*
`;
}

module.exports = { getAliveMessage };
