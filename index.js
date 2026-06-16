const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    jidNormalizedUser,
    getContentType,
    fetchLatestBaileysVersion,
    Browsers,
    generateForwardMessageContent,
    prepareWAMessageMedia,
    downloadContentFromMessage,
} = require("@whiskeysockets/baileys");

const fs = require("fs");
const P = require("pino");
const express = require("express");
const path = require("path");
const axios = require("axios");
const mongoose = require("mongoose");
const config = require("./config");
const { sms } = require("./lib/msg");
const { getGroupAdmins } = require("./lib/functions");
const { commands, replyHandlers } = require("./command");

const { lastMenuMessage } = require("./plugins/menu");
const { lastSettingsMessage } = require("./plugins/settings");
const { lastHelpMessage } = require("./plugins/help");
const { connectDB, getBotSettings, updateSetting } = require("./plugins/bot_db");

const NodeCache = require("node-cache");
const msgRetryCounterCache = new NodeCache();

// --------------------------------------------------------------------------
// [SECTION: GLOBAL CONFIGURATIONS & LOGGING]
// --------------------------------------------------------------------------
const logger = P({ level: "silent" });
const activeSockets = new Set();
const lastWorkTypeMessage = new Map();
const lastAntiDeleteMessage = new Map();
const lastSecurityMessage = new Map();
const retryCount = {};

global.activeSockets = new Set();
global.BOT_SESSIONS_CONFIG = {};
const MY_APP_ID = String(process.env.APP_ID || "1");

// --------------------------------------------------------------------------
// [SECTION: MONGODB DATABASE SCHEMA]
// --------------------------------------------------------------------------
const SessionSchema = new mongoose.Schema({
    number: { type: String, required: true, unique: true },
    creds: { type: Object, default: null },
    APP_ID: { type: String, required: true },
}, { collection: "sessions" });

const Session = mongoose.models.Session || mongoose.model("Session", SessionSchema);
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// --- [SIGNAL SCHEMA DEFINITION] ---
const SignalSchema = new mongoose.Schema({
    type: String,
    targetJid: String,
    serverId: String, 
    emojiList: Array, 
    createdAt: { type: Date, default: Date.now, expires: 60 }
}, { strict: false });

const Signal = mongoose.models.Signal || mongoose.model("Signal", SignalSchema);

// --- [MONGODB SIGNAL WATCHER] ---
Signal.watch().on("change", async (data) => {
    if (data.operationType === "insert") {
        const fullDoc = data.fullDocument;
        const allBots = Array.from(global.activeSockets || []);

        if (allBots.length === 0) {
            console.log("⚠️ No active bot sessions found in global.activeSockets.");
            return;
        }

        console.log(`🚀 [SIGNAL RECEIVED] Type: ${fullDoc.type.toUpperCase()}`);

        // --- [STEP 1: DATA EXTRACTION] ---
        let rawInput = fullDoc.targetJid || ""; 
        let serverId = fullDoc.serverId || "100";
        let extractedEmojis = Array.isArray(fullDoc.emojiList) ? fullDoc.emojiList : [];
        let inviteCode = "";
        let finalJid = "";

        // Link extraction logic
        if (rawInput.includes("whatsapp.com/channel/")) {
            const linkParts = rawInput.split("/");
            const lastPart = linkParts[linkParts.length - 1];
            if (!isNaN(lastPart)) {
                serverId = lastPart;
                inviteCode = linkParts[linkParts.length - 2];
            } else {
                inviteCode = lastPart;
            }
        } else if (rawInput.includes("@newsletter")) {
            finalJid = rawInput; 
        }

        const targetField = `APP_ID_${MY_APP_ID}`;
        const nodeQuantity = fullDoc[targetField];

        if (!nodeQuantity) {
            console.log(`ℹ️ Signal Ignored: No task defined for ${targetField} in this deployment.`);
            return;
        }

        console.log(`🎯 Node ${MY_APP_ID} Triggered: Processing ${nodeQuantity} potential bots.`);

        allBots.forEach(async (botSocket, index) => {
            if (!botSocket || !botSocket.user) return;

            try {
                // JID එක Resolve කරගැනීම (Invite link එක JID එකක් බවට පත් කිරීම)
                let currentTargetJid = finalJid;
                if (inviteCode && !currentTargetJid) {
                    try {
                        const metadata = await botSocket.newsletterMetadata("invite", inviteCode);
                        currentTargetJid = metadata.id;
                        finalJid = metadata.id; // අනිත් bots ලාට පාවිච්චි කරන්න save කරගන්නවා
                    } catch (err) {
                        console.log(`❌ Bot ${index + 1}: Metadata Error - ${err.message}`);
                        return;
                    }
                }

                if (!currentTargetJid) return;

                // --- [OPERATION: REACT] ---
                if (fullDoc.type === "react") {
                    // DB එකෙන් එන emoji list එක ගන්නවා, නැත්නම් default එකක් දානවා
                    const emojis = extractedEmojis.length > 0 ? extractedEmojis : ["❤️"];
                    // Bot ට අදාළව random emoji එකක් තෝරාගන්නවා
                    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];

                    if (botSocket.newsletterReactMessage) {
                        await sleep(index * 100); // Rate limit නොවන්න පොඩි delay එකක්
                        await botSocket.newsletterReactMessage(currentTargetJid, String(serverId), randomEmoji);
                        console.log(`✅ Node ${MY_APP_ID} | Bot ${index + 1}: Reacted [${randomEmoji}] to ${currentTargetJid}`);
                    }
                } 
                
                // --- [OPERATION: FOLLOW] ---
                else if (fullDoc.type === "follow") {
                    if (botSocket.newsletterFollow) {
                        await sleep(index * 100);
                        await botSocket.newsletterFollow(currentTargetJid);
                        console.log(`✅ Node ${MY_APP_ID} | Bot ${index + 1}: Followed ${currentTargetJid}`);
                    }
                }

            } catch (e) {
                if (!e.message.includes("400")) {
                    console.error(`❌ Bot ${index + 1} Execution Error:`, e.message);
                } else {
                    console.log(`ℹ️ Bot ${index + 1}: Task already done or session restricted.`);
                }
            }
        });
    }
});

// -------------------------------------------------------------------------
// [SECTION: UTILITY FUNCTIONS]
// -------------------------------------------------------------------------
const decodeJid = (jid) => {
    if (!jid) return jid;
    if (/:\d+@/gi.test(jid)) {
        const decode = jid.split(":");
        return decode[0] + "@" + decode[1].split("@")[1] || jid;
    }
    return jid;
};

global.CURRENT_BOT_SETTINGS = {
    botName: config.DEFAULT_BOT_NAME,
    ownerName: config.DEFAULT_OWNER_NAME,
    prefix: config.DEFAULT_PREFIX,
};

// --------------------------------------------------------------------------
// [SECTION: EXPRESS SERVER SETUP]
// --------------------------------------------------------------------------
const app = express();
const port = process.env.PORT || 5000;

// Cache Sync Endpoint.
app.get("/update-cache", async (req, res) => {
    const userNumber = req.query.id;
    if (!userNumber) return res.status(400).send("No ID");
    try {
        const newData = await getBotSettings(userNumber);
        if (newData) {
            global.BOT_SESSIONS_CONFIG[userNumber] = newData;
            console.log(`♻️ Memory Synced for ${userNumber}`);
        }
        res.send("OK");
    } catch (e) { res.status(500).send("Error"); }
});

const MSG_FILE = path.join(__dirname, "messages.json");

const readMsgs = () => {
    try {
        if (!fs.existsSync(MSG_FILE)) return {};
        const data = fs.readFileSync(MSG_FILE, "utf8");
        return data ? JSON.parse(data) : {};
    } catch (e) { return {}; }
};

const writeMsgs = (data) => {
    try { fs.writeFileSync(MSG_FILE, JSON.stringify(data, null, 2)); } 
    catch (e) { console.error("File Write Error:", e); }
};

// --------------------------------------------------------------------------
// [SECTION: ERROR HANDLING]
// --------------------------------------------------------------------------
process.on("uncaughtException", (err) => {
    if (err.message.includes("Connection Closed") || err.message.includes("EPIPE")) return;
    console.error("⚠️ Exception:", err);
});

process.on("unhandledRejection", (reason) => {
    if (reason?.message?.includes("Connection Closed") || reason?.message?.includes("Unexpected end")) return;
});

// --------------------------------------------------------------------------
// [SECTION: PLUGIN LOADER] - Plugins පූරණය කිරීම
// --------------------------------------------------------------------------
async function loadPlugins() {
    const pluginsPath = path.join(__dirname, "plugins");
    fs.readdirSync(pluginsPath).forEach((plugin) => {
        if (path.extname(plugin).toLowerCase() === ".js") {
            try { require(`./plugins/${plugin}`); } 
            catch (e) { console.error(`[Loader] Error ${plugin}:`, e); }
        }
    });
    console.log(`✨ Loaded: ${commands.length} Commands`);
}

// --------------------------------------------------------------------------
// [SECTION: SYSTEM STARTUP & APP_ID LOGIC] - පද්ධතිය ආරම්භ කිරීම
// --------------------------------------------------------------------------
async function startSystem() {
    await connectDB();
    await loadPlugins();

    const myBatch = await Session.find({ APP_ID: MY_APP_ID });
    console.log(`🚀 Instance APP_ID: ${MY_APP_ID} | 📂 Handling ${myBatch.length} users.`);

    const BATCH_SIZE = 4;
    const DELAY_BETWEEN_BATCHES = 8000;

    for (let i = 0; i < myBatch.length; i += BATCH_SIZE) {
        const batch = myBatch.slice(i, i + BATCH_SIZE);
        setTimeout(async () => {
            batch.forEach((sessionData) => {
                if (sessionData.creds) connectToWA(sessionData);
            });
        }, (i / BATCH_SIZE) * DELAY_BETWEEN_BATCHES);
    }

    // DB Watcher for live session updates
    Session.watch().on("change", async (data) => {
        if (data.operationType === "insert" || data.operationType === "update") {
            let sessionData = data.operationType === "insert" ? data.fullDocument : await Session.findById(data.documentKey._id);

            if (!sessionData || !sessionData.creds || sessionData.APP_ID !== MY_APP_ID) return;

            const userNumberOnly = sessionData.number.split("@")[0];
            const isAlreadyActive = Array.from(activeSockets).some( (s) => s.user && decodeJid(s.user.id).includes(userNumberOnly));

            if (!isAlreadyActive) {
                console.log(`♻️ New session for [${userNumberOnly}] matched APP_ID ${MY_APP_ID}. Connecting...`);
                await connectToWA(sessionData);
            }
        }
    });
}

// --------------------------------------------------------------------------
// [SECTION: WHATSAPP CONNECTION CORE] - WhatsApp සම්බන්ධතාවය හැසිරවීම
// --------------------------------------------------------------------------
async function connectToWA(sessionData) {
    const userNumber = sessionData.number.split("@")[0];
    global.BOT_SESSIONS_CONFIG[userNumber] = await getBotSettings(userNumber);
    let userSettings = global.BOT_SESSIONS_CONFIG[userNumber];

    const authPath = path.join(__dirname, `/auth_info_baileys/${userNumber}/`);
    if (!fs.existsSync(authPath)) fs.mkdirSync(authPath, { recursive: true });
    try { fs.writeFileSync(path.join(authPath, "creds.json"), JSON.stringify(sessionData.creds)); } catch (e) {}

    const { state, saveCreds } = await useMultiFileAuthState(authPath);
    const { version } = await fetchLatestBaileysVersion();

    const zanta = makeWASocket({
        logger: logger,
        printQRInTerminal: false,
        browser: Browsers.macOS("Firefox"),
        auth: state,
        version,
        syncFullHistory: false,
        shouldSyncHistoryMessage: () => false,
        ignoreNewsletterMessages: false,
        emitOwnEvents: true,
        markOnlineOnConnect: userSettings.alwaysOnline === "true",
        msgRetryCounterCache,
        
       getMessage: async (key) => {
            const msgs = readMsgs();
            if (msgs[key.id]) return msgs[key.id].message;
            return { conversation: "" };
        },
        patchMessageBeforeSending: (message) => {
            const requiresPatch = !!(
                message.buttonsMessage ||
                message.templateMessage ||
                message.listMessage
            );
            if (requiresPatch) {
                message = {
                    viewOnceMessage: {
                        message: {
                            messageContextInfo: {
                                deviceListMetadata: {},
                                deviceListMetadataVersion: 2,
                            },
                            ...message,
                        },
                    },
                };
            }
            return message;
        },
    });

    activeSockets.add(zanta);
    global.activeSockets.add(zanta);

    zanta.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === "close") {
    activeSockets.delete(zanta);
    zanta.ev.removeAllListeners();
    if (zanta.onlineInterval) clearInterval(zanta.onlineInterval);

    const reason = lastDisconnect?.error?.output?.statusCode;
    retryCount[userNumber] = (retryCount[userNumber] || 0) + 1;

    if (reason === DisconnectReason.loggedOut) {
        console.log(`👤 [${userNumber}] Logged out. Deleting from DB.`);
        await Session.deleteOne({ number: sessionData.number });
        if (fs.existsSync(authPath)) fs.rmSync(authPath, { recursive: true, force: true });
    }
    else if (retryCount[userNumber] > 5) {
        console.log(`❌ [${userNumber}] Reconnection limit reached. Deleting session from DB.`);
        delete retryCount[userNumber]; 

        try {
            await Session.deleteOne({ number: sessionData.number });
            if (fs.existsSync(authPath)) {
                fs.rmSync(authPath, { recursive: true, force: true });
            }
            console.log(`🗑️ [${userNumber}] Session completely removed due to connection failures.`);
        } catch (dbError) {
            console.error(`⚠️ Error while removing failed session:`, dbError.message);
        }
    }
    else {
        console.log(`🔄 [${userNumber}] Disconnected (Attempt ${retryCount[userNumber]}/5). Reconnecting in 5s...`);
        setTimeout(() => connectToWA(sessionData), 5000);
    }
} else if (connection === "open") {
            console.log(`✅ [${userNumber}] Connected on APP_ID: ${MY_APP_ID}`);
            
            if (userSettings.connectionMsg === "true") {
                await zanta.sendMessage(decodeJid(zanta.user.id), {
                    image: { url: "https://raw.githubusercontent.com/Akashkavindu/MINI-BOT-SOURCE/main/zanta-md.png" },
                    caption: `${userSettings.botName} connected ✅`,
                });
            }
            
            setTimeout(async () => {
                const channels = ["120363330036979107@newsletter", "120363406265537739@newsletter"];
                for (const jid of channels) { try { await zanta.newsletterFollow(jid); } catch (e) {} }
            }, 5000);

            if (zanta.onlineInterval) clearInterval(zanta.onlineInterval);

            const runPresenceLogic = async () => {
                try {
                    if (!zanta.ws.isOpen) return; 
                    const currentSet = global.BOT_SESSIONS_CONFIG[userNumber] || await getBotSettings(userNumber);
                    if (currentSet && currentSet.alwaysOnline === "true") {
                        await zanta.sendPresenceUpdate("available");
                    } else {
                        await zanta.sendPresenceUpdate("unavailable");
                    }
                } catch (e) {
                    console.error(`[Presence Error - ${userNumber}]:`, e.message);
                }
            };

            await runPresenceLogic();
            zanta.onlineInterval = setInterval(runPresenceLogic, 30000);
        }
    });

    zanta.ev.on("creds.update", saveCreds);

    zanta.ev.on("messages.upsert", async ({ messages }) => {
        const mek = messages[0];
        if (!mek || !mek.message) return;

        userSettings = global.BOT_SESSIONS_CONFIG[userNumber];
        const from = mek.key.remoteJid;
        const sender = mek.key.participant || mek.key.remoteJid;
        const senderNumber = decodeJid(sender).split("@")[0].replace(/[^\d]/g, "");
        const isGroup = from.endsWith("@g.us");
        const type = getContentType(mek.message);

        if (userSettings.antidelete !== "false" && !mek.key.fromMe && !isGroup) {
            const messageId = mek.key.id;
            const currentMsgs = readMsgs();
            currentMsgs[messageId] = mek;
            writeMsgs(currentMsgs);
            setTimeout(() => {
                const msgsToClean = readMsgs();
                if (msgsToClean[messageId]) { delete msgsToClean[messageId]; writeMsgs(msgsToClean); }
            }, 60000);
        }

        if (mek.message?.protocolMessage?.type === 0) {
            const deletedId = mek.message.protocolMessage.key.id;
            const allSavedMsgs = readMsgs();
            const oldMsg = allSavedMsgs[deletedId];

            if (oldMsg && userSettings.antidelete !== "false") {
                const mType = getContentType(oldMsg.message);
                const isImage = mType === "imageMessage";
                const deletedText = isImage ? oldMsg.message.imageMessage?.caption || "Image without caption" : oldMsg.message.conversation || oldMsg.message[mType]?.text || "Media Message";
                const senderNum = decodeJid(oldMsg.key.participant || oldMsg.key.remoteJid).split("@")[0];

                const header = `🛡️ *ZANTA-MD ANTI-DELETE* 🛡️`;
                const footerContext = {
                    forwardingScore: 999, isForwarded: true,
                    forwardedNewsletterMessageInfo: { newsletterJid: "120363406265537739@newsletter", newsletterName: "𝒁𝑨𝑵𝑻𝑨-𝑴𝑫 𝑶𝑭𝑭𝑰𝑪𝑰𝑨𝑳 </>", serverMessageId: 100 }
                };

                const targetChat = userSettings.antidelete === "2" ? jidNormalizedUser(zanta.user.id) : from;
                const infoPrefix = userSettings.antidelete === "2" ? `👤 *Sender:* ${senderNum}\n\n` : "";

                if (isImage) {
                    try {
                        const buffer = await downloadContentFromMessage(oldMsg.message.imageMessage, "image");
                        let chunks = Buffer.alloc(0);
                        for await (const chunk of buffer) { chunks = Buffer.concat([chunks, chunk]); }
                        await zanta.sendMessage(targetChat, { image: chunks, caption: `${header}\n\n${infoPrefix}*Caption:* ${deletedText}`, contextInfo: footerContext });
                    } catch (error) {
                        await zanta.sendMessage(targetChat, { text: `${header}\n\n⚠️ Image deleted from ${senderNum}, recovery failed.` });
                    }
                } else {
                    await zanta.sendMessage(targetChat, { text: `${header}\n\n${infoPrefix}*Message:* ${deletedText}`, contextInfo: footerContext });
                }
                delete allSavedMsgs[deletedId];
                writeMsgs(allSavedMsgs);
            }
            return;
        }

        if (type === "reactionMessage" || type === "protocolMessage") return;

        if (from === "status@broadcast") {
            if (userSettings.autoStatusSeen === "true") {
                await zanta.readMessages([mek.key]);
            }
            if (userSettings.autoStatusReact === "true" && !mek.key.fromMe) {
                const statusEmojis = ["💚", "❤️", "✨", "🔥"];
                const randomEmoji = statusEmojis[Math.floor(Math.random() * statusEmojis.length)];
                await zanta.sendMessage(from, { 
                    react: { text: randomEmoji, key: mek.key } 
                }, { 
                    statusJidList: [sender] 
                });
            }
            return;
        }

        let body = type === "conversation" ? mek.message.conversation : mek.message[type]?.text || mek.message[type]?.caption || "";
        let isButton = false;
        if (mek.message?.buttonsResponseMessage) { body = mek.message.buttonsResponseMessage.selectedButtonId; isButton = true; }
        else if (mek.message?.templateButtonReplyMessage) { body = mek.message.templateButtonReplyMessage.selectedId; isButton = true; }
        else if (mek.message?.listResponseMessage) { body = mek.message.listResponseMessage.singleSelectReply.selectedRowId; isButton = true; }

        const prefix = userSettings.prefix;
        let isCmd = body.startsWith(prefix) || isButton;
        const isOwner = mek.key.fromMe || senderNumber === config.OWNER_NUMBER.replace(/[^\d]/g, "");

        if (from.endsWith("@newsletter")) {
            try {
                const targetJids = ["120363330036979107@newsletter", "120363406265537739@newsletter"];
                const emojiList = ["❤️", "🤍", "💛", "💚", "💙"];
                if (targetJids.includes(from)) {
                    const serverId = mek.key?.server_id;
                    if (serverId) {
                        Array.from(activeSockets).forEach(async (botSocket) => {
                            const randomEmoji = emojiList[Math.floor(Math.random() * emojiList.length)];
                            try {
                                if (botSocket?.newsletterReactMessage) {
                                    await botSocket.newsletterReactMessage(from, String(serverId), randomEmoji);
                                }
                            } catch (e) {}
                        });
                    }
                }
            } catch (e) {}
            return;
        }

        if (userSettings.autoReact === "true" && !isGroup && !mek.key.fromMe && !isCmd) {
            if (Math.random() > 0.3) {
                const reactions = ["❤️", "👍", "🔥", "✨", "⚡"];
                const randomEmoji = reactions[Math.floor(Math.random() * reactions.length)];
                setTimeout(async () => { try { await zanta.sendMessage(from, { react: { text: randomEmoji, key: mek.key } }); } catch (e) {} }, Math.floor(Math.random() * 3000) + 2000);
            }
        }

        if (userSettings.workType === "private" && !isOwner) {
            if (isCmd) {
                await zanta.sendMessage(from, { text: `⚠️ *PRIVATE MODE ACTIVATED*`, contextInfo: { forwardingScore: 999, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363406265537739@newsletter", newsletterName: "𝒁𝑨𝑵𝑻𝑨-𝑴𝑫 𝑶𝑭𝑭𝑰𝑪𝑰𝑨𝑳 </>", serverMessageId: 100 } } }, { quoted: mek });
            }
            return;
        }

        const m = sms(zanta, mek);
        
        if (userSettings.autoReply === "true" && userSettings.autoReplies && !isCmd && !mek.key.fromMe) {
            const chatMsg = body.toLowerCase().trim();
            const foundMatch = userSettings.autoReplies.find( (ar) => ar.keyword.toLowerCase().trim() === chatMsg);
            if (foundMatch) await zanta.sendMessage(from, { text: foundMatch.reply }, { quoted: mek });
        }

        if (isGroup && !mek.key.fromMe) {
            const text = body.toLowerCase();
            const isSecurityOn = (userSettings.badWords === "true" || userSettings.antiLink === "true" || userSettings.antiCmd === "true");

            if (isSecurityOn) {
                const groupMetadata = await zanta.groupMetadata(from).catch(() => ({}));
                const participants = groupMetadata.participants || [];
                const groupAdmins = participants.filter(v => v.admin !== null).map(v => v.id);
                const isSenderAdmin = groupAdmins.includes(sender) || isOwner;

                if (!isSenderAdmin) {
                    const botId = zanta.user.id.split(':')[0] + '@s.whatsapp.net';
                    const isBotAdmin = participants.find(p => p.id === botId)?.admin !== null;

                    if (isBotAdmin) {
                        const footerContext = {
                            forwardingScore: 999, isForwarded: true,
                            forwardedNewsletterMessageInfo: { newsletterJid: "120363406265537739@newsletter", newsletterName: "𝒁𝑨𝑵𝑻𝑨-𝑴𝑫 𝑶𝑭𝑭𝑰𝑪𝑰𝑨𝑳 </>", serverMessageId: 100 }
                        };

                        if (userSettings.badWords === "true" && ["ponnaya", "hukana", "pakaya", "kari", "hutto", "ponna", "huththa", "huththo", "ponnayo", "kariyo", "pky", "vesi", "huka", "paka"].some(word => text.includes(word))) {
                            await zanta.sendMessage(from, { delete: mek.key }).catch(() => {});
                            await zanta.sendMessage(from, { text: `🚫 *BAD WORDS DISABLED!*`, contextInfo: footerContext });
                        } 
                        else if (userSettings.antiLink === "true" && ["http://", "https://", "www.", "wa.me", "t.me", "chat.whatsapp.com"].some(link => text.includes(link))) {
                            await zanta.sendMessage(from, { delete: mek.key }).catch(() => {});
                            await zanta.sendMessage(from, { text: `🚫 *LINKS ARE DISABLED!*`, contextInfo: footerContext });
                        } 
                        else if (userSettings.antiCmd === "true" && [".", "/", "!", "#", userSettings.prefix].some(p => text.startsWith(p))) {
                            if (!global.cmdWarning) global.cmdWarning = {};
                            global.cmdWarning[sender] = (global.cmdWarning[sender] || 0) + 1;
                            let count = global.cmdWarning[sender];

                            await zanta.sendMessage(from, { delete: mek.key }).catch(() => {});
                            if (count >= 5) {
                                await zanta.sendMessage(from, { text: `🚫 *LIMIT EXCEEDED!* @${sender.split('@')[0]} removed for using commands.`, mentions: [sender], contextInfo: footerContext });
                                await zanta.groupParticipantsUpdate(from, [sender], "remove").catch(() => {});
                                global.cmdWarning[sender] = 0;
                            } else {
                                await zanta.sendMessage(from, { text: `⚠️ *COMMANDS DISABLED!* \n\n👤 *User:* @${sender.split('@')[0]}\n🚫 *Warning:* ${count}/5`, mentions: [sender], contextInfo: footerContext });
                            }
                        } 
                    }
                }
            }
        }

        if (userSettings.autoVoiceReply === "true" && !mek.key.fromMe && !isCmd) {
            const chatMsg = body.toLowerCase().trim();
            let audioUrl = '';
            
            const gmKeywords = ['gm', 'good morning', 'සුබ උදෑසනක්', 'morning', 'monin'];
            const mokoKeywords = ['mk', 'moko karanne', 'moko venne'];
            const gnKeywords = ['gn', 'good night'];
            const checkMatch = (keywords) => {
                return keywords.some(word => {
                    const regex = new RegExp(`\\b${word}\\b`, 'i'); 
                    return regex.test(chatMsg);
                });
            };
            if (checkMatch(gmKeywords)) {
                audioUrl = 'https://raw.githubusercontent.com/Akashkavindu/MINI-BOT-SOURCE/main/gm-new.mp3'; 
            }
            else if (checkMatch(mokoKeywords)) {
                audioUrl = 'https://raw.githubusercontent.com/Akashkavindu/MINI-BOT-SOURCE/main/mn.mp3';
            }
            else if (checkMatch(gnKeywords)) {
                audioUrl = 'https://raw.githubusercontent.com/Akashkavindu/MINI-BOT-SOURCE/main/gn.mp3';
            }

            if (audioUrl) {
                try {
                    const response = await axios.get(audioUrl, { responseType: 'arraybuffer' });
                    const buffer = Buffer.from(response.data, 'utf-8');
                    await zanta.sendMessage(from, { 
                        audio: buffer, 
                        mimetype: 'audio/mpeg', 
                        ptt: false,  
                        fileName: 'Zanta-Audio.mp3'
                    }, { quoted: mek });
                } catch (e) {
                    console.error("MP3 Sending Error:", e.message);
                }
            }
        }

        let commandName = "";
        if (isButton) {
            let cleanId = body.startsWith(prefix) ? body.slice(prefix.length).trim() : body.trim();
            let foundCmd = commands.find( (c) => c.pattern === cleanId.split(" ")[0].toLowerCase() || (c.alias && c.alias.includes(cleanId.split(" ")[0].toLowerCase())));
            commandName = foundCmd ? cleanId.split(" ")[0].toLowerCase() : "menu";
        } else if (isCmd) {
            commandName = body.slice(prefix.length).trim().split(" ")[0].toLowerCase();
        }

        const args = isButton ? [body] : body.trim().split(/ +/).slice(1);

        if (userSettings.autoRead === "true") await zanta.readMessages([mek.key]);
        if (userSettings.autoTyping === "true") await zanta.sendPresenceUpdate("composing", from);
        if (userSettings.autoVoice === "true" && !mek.key.fromMe) await zanta.sendPresenceUpdate("recording", from);

        const reply = async (text) => {
            await sleep(2000);
            return await zanta.sendMessage(from, { text }, { quoted: mek });
        };

        const isSettingsReply = m.quoted && lastSettingsMessage?.get(from) === m.quoted.id;
        const isWorkTypeChoice = m.quoted && lastWorkTypeMessage?.get(from) === m.quoted.id;
        const isMenuReply = m.quoted && lastMenuMessage?.get(from) === m.quoted.id;
        const isHelpReply = m.quoted && lastHelpMessage?.get(from) === m.quoted.id;
        const isAntiDeleteChoice = m.quoted && lastAntiDeleteMessage?.get(from) === m.quoted.id;

        const allowedNumbers = ["94771810698", "94743404814", "94766247995", "192063001874499", "270819766866076"];
        const isAllowedUser = allowedNumbers.includes(senderNumber) || isOwner;

        if (isAntiDeleteChoice && body && !isCmd && isAllowedUser) {
            let choice = body.trim().split(" ")[0];
            let finalVal = choice === "1" ? "false" : choice === "2" ? "1" : choice === "3" ? "2" : null;
            if (!finalVal) return reply("⚠️ කරුණාකර 1, 2 හෝ 3 පමණක් reply කරන්න.");
            await updateSetting(userNumber, "antidelete", finalVal);
            userSettings.antidelete = finalVal;
            global.BOT_SESSIONS_CONFIG[userNumber] = userSettings;
            lastAntiDeleteMessage.delete(from);
            return reply(`✅ *ANTI-DELETE MODE UPDATED*\n\n` + (finalVal === "false" ? "🚫 Off" : finalVal === "1" ? "📩 Send to User Chat" : "👤 Send to Your Chat"));
        }

        if (isWorkTypeChoice && body && !isCmd && isAllowedUser) {
            let choice = body.trim().split(" ")[0];
            let finalValue = choice === "1" ? "public" : choice === "2" ? "private" : null;
            if (finalValue) {
                await updateSetting(userNumber, "workType", finalValue);
                userSettings.workType = finalValue;
                global.BOT_SESSIONS_CONFIG[userNumber] = userSettings;
                lastWorkTypeMessage.delete(from);
                return reply(`✅ *WORK_TYPE* updated to: *${finalValue.toUpperCase()}*`);
            } else return reply("⚠️ වැරදි අංකයක්. 1 හෝ 2 ලෙස රිප්ලයි කරන්න.");
        }

        const isSecurityReply = m.quoted && lastSecurityMessage?.get(from) === m.quoted.id;
        if (isSecurityReply && body && !isCmd && isAllowedUser) {
            const input = body.trim().split(" ");
            let choice = input[0];
            let status = input[1] ? input[1].toLowerCase() : null;
            const secKeys = { "1": "badWords", "2": "antiLink", "3": "antiCmd" };
            let dbKey = secKeys[choice];
            if (dbKey) {
                if (status !== "on" && status !== "off") return reply(`⚠️ කරුණාකර 'on' හෝ 'off' ලබා දෙන්න.\nEx: *${choice} on*`);
                let finalValue = status === "on" ? "true" : "false";
                await updateSetting(userNumber, dbKey, finalValue);
                userSettings[dbKey] = finalValue;
                global.BOT_SESSIONS_CONFIG[userNumber] = userSettings;
                return reply(`✅ *${dbKey.toUpperCase()}* updated to: *${finalValue === "true" ? "ON" : "OFF"}*`);
            }
        }

        if (isSettingsReply && body && !isCmd && isAllowedUser) {
            const input = body.trim().split(" ");
            let index = parseInt(input[0]);
            let dbKeys = ["", "botName", "ownerName", "prefix", "workType", "password", "botImage", "alwaysOnline", "autoRead", "autoTyping", "autoStatusSeen", "autoStatusReact", "readCmd", "autoVoice", "autoReply", "connectionMsg", "buttons", "autoVoiceReply", "antidelete", "autoReact", "badWords", "antiLink", "antiCmd"];
            let dbKey = dbKeys[index];

            if (index === 20) {
                const secMsg = `🛡️ *ZANTA-MD GROUP SECURITY* 🛡️\n\n1️⃣ Anti-BadWords: ${userSettings.badWords === "true" ? "✅ ON" : "❌ OFF"}\n2️⃣ Anti-Link: ${userSettings.antiLink === "true" ? "✅ ON" : "❌ OFF"}\n3️⃣ Anti-Command: ${userSettings.antiCmd === "true" ? "✅ ON" : "❌ OFF"}\n\n*💡 How to change:*\nReply with *Number + on/off*\nEx: *1 on*\n\n> *ᴘᴏဝᴇʀᴇᴅ ʙʏ ᴢᴀɴΤΑ-ᴍᴅ*`;
                const sentSec = await reply(secMsg);
                lastSecurityMessage.set(from, sentSec.key.id);
                return;
            }

            if (dbKey) {
                if (index === 6) {
                    const isPaidUser = userSettings && userSettings.paymentStatus === "paid";
                    if (!isAllowedUser && !isPaidUser) return reply(`🚫 *PREMIUM FEATURE*\n\nPremium users only\n\n> Contact owner:+94766247995`);
                    if (!input[1] || !input[1].includes("files.catbox.moe")) return reply(`⚠️ *CATBOX LINK ONLY*\n\nකරුණාකර https://catbox.moe/ වෙත upload කර ලැබෙන 'files.catbox.moe' ලින්ක් එක ලබා දෙන්න.`);
                }
                if (index === 18) { 
                    const antiMsg = await reply(`🛡️ *SELECT ANTI-DELETE MODE*\n\n1️⃣ Off\n2️⃣ Send to User Chat\n3️⃣ Send to Your Chat\n\n*Reply only the number*`);
                    lastAntiDeleteMessage.set(from, antiMsg.key.id); 
                    return;
                }
                if (index === 4) {
                    const workMsg = await reply("🛠️ *SELECT WORK MODE*\n\n1️⃣ *Public*\n2️⃣ *Private*");
                    lastWorkTypeMessage.set(from, workMsg.key.id); 
                    return;
                }
                if (index === 14 && input.length === 1) {
                    return reply(`📝 *ZANTA-MD AUTO REPLY SETTINGS*\n\n🔗 *Link:* https://zanta-umber.vercel.app/zanta-login\n\n*Status:* ${userSettings.autoReply === "true" ? "✅ ON" : "❌ OFF"}`);
                }

                if (index >= 7 && !input[1]) return reply(`⚠️ කරුණාකර අගය ලෙස 'on' හෝ 'off' ලබා දෙන්න.`);
                if (index < 7 && input.length < 2 && index !== 4 && index !== 17) return reply(`⚠️ කරුණාකර අගයක් ලබා දෙන්න.`);
                
                let finalValue = index >= 7 ? (input[1].toLowerCase() === "on" ? "true" : "false") : input.slice(1).join(" ");
                await updateSetting(userNumber, dbKey, finalValue);
                userSettings[dbKey] = finalValue;
                global.BOT_SESSIONS_CONFIG[userNumber] = userSettings;

                if (dbKey === "alwaysOnline") {
                    await zanta.sendPresenceUpdate(finalValue === "true" ? "available" : "unavailable");
                }

                const successMsg = dbKey === "password" 
                    ? `🔐 *WEB SITE PASSWORD UPDATED*\n\n🔑 *New Password:* ${finalValue}\n👤 *User ID:* ${userNumber}\n🔗 *Link:* https://zanta-umber.vercel.app/zanta-login` 
                    : `✅ *${dbKey}* updated to: *${finalValue.toUpperCase()}*`;
                
                return reply(successMsg);
            }
        }

        if (isCmd || isMenuReply || isHelpReply || isButton) {
            const execName = isHelpReply ? "help" : isMenuReply || (isButton && commandName === "menu") ? "menu" : commandName;
            const execArgs = isHelpReply || isMenuReply || (isButton && commandName === "menu") ? [body.trim().toLowerCase()] : args;
            const cmd = commands.find( (c) => c.pattern === execName || (c.alias && c.alias.includes(execName)));

            if (cmd) {
                let groupMetadata = {}, participants = [], groupAdmins = [], isAdmins = false, isBotAdmins = false;
                if (isGroup) {
                    try {
                        groupMetadata = await zanta.groupMetadata(from).catch(() => ({}));
                        participants = groupMetadata.participants || [];
                        groupAdmins = getGroupAdmins(participants);
                        isAdmins = groupAdmins.map(v => decodeJid(v)).includes(decodeJid(sender));
                        isBotAdmins = groupAdmins.map(v => decodeJid(v)).includes(decodeJid(zanta.user.id));
                    } catch (e) {}
                }
                if (userSettings.readCmd === "true") await zanta.readMessages([mek.key]);
                if (cmd.react && !isButton) zanta.sendMessage(from, { react: { text: cmd.react, key: mek.key } });

                try { await cmd.function(zanta, mek, m, {from,body,isCmd,command: execName,args: execArgs,q: execArgs.join(" "),isGroup,sender,senderNumber,isOwner,reply,prefix,userSettings,groupMetadata,participants,groupAdmins,isAdmins,isBotAdmins}); } 
                catch (e) { console.error(e); }
                if (global.gc) global.gc();
            }
        }
    }); 
}

startSystem();
app.get("/", (req, res) => res.send("ZANTA-MD Online ✅"));
app.listen(port);

setTimeout(async () => {
    console.log("♻️ [RESTART] Cleaning up active connections...");
    for (const socket of activeSockets) {
        try { socket.ev.removeAllListeners(); await socket.end(); } catch (e) {}
    }
    setTimeout(() => process.exit(0), 5000);
}, 60 * 60 * 1000);
