function getAliveMessage() {
    const date = new Date().toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

    return ` ◉◉◉◉◉━⋆─⋆──❂
┊ ┊ ┊ ┊ ┊
┊ ┊ ✫ ˚㋛ ⋆｡ ❀
┊ ☠️︎︎
✧ {BOT_NAME}✍️︎𝄞
╰────────────────❂

*|💖 Hey...🤗 I'm,*
*| your lovely assistant*
*| Now alive and Ready To Help!*
*╰◉◉◉────♡♡───────❥*

┏━「 INFORMATION 」
┃ *📅 ᴅᴀᴛᴇ: ${date}*
┃ *⌚ ᴛɪᴍᴇ: ${time}*
┃ *💬 ᴘʀᴇꜰɪx: {PREFIX}*
┗━━━━━━━━━━━━━◉◉◉

> *_𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 𝐙𝐄𝐔𝐒 𝐈𝐍𝐂 </>_*`;
}

module.exports = { getAliveMessage };
