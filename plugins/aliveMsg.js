function getAliveMessage() {
    const date = new Date().toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

    return `*{BOT_NAME} 𝐈𝐒 𝐎𝐍𝐋𝐈𝐍𝐄 💞*

*╭────♡◉◉◉♡────⌬*
💖 *Hey...I’m {BOT_NAME}🙃, your lovely assistant — alive and sparkling now!*
*╰────♡◉◉◉♡────⌬*

*📅 ᴅᴀᴛᴇ: ${date}*
*⌚ ᴛɪᴍᴇ: ${time}*
*───────────────*

*📱 ɴᴜᴍʙᴇʀ: {OWNER_NUMBER}*
*💬 ᴘʀᴇꜰɪx: {PREFIX}*
*───────────────*
*🌐 Contact US*
> http://wa.me/+94774571418?text=*Hey__Suduu*

> *_𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 𝐙𝐄𝐔𝐒 𝐈𝐍𝐂 </>_ 🇱🇰*`;
}

module.exports = { getAliveMessage };
