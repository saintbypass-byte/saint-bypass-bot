// Clean & Readable Command Handler
const fs = require("fs");
const path = require("path");
const { generateWAMessageFromContent } = require("@whiskeysockets/baileys");
const { toggleAntidelete } = require("../antidelete");
const { createSettingsCommandHandler } = require("../../src/commands/settings");

// Default mode
if (!global.mode) global.mode = "self";

// Owner-only commands list
const ownerOnlyCommands = [
  "video2", "song2", "kick", "add", "nice", "tagall",
  "settings", "antilink", "antilinkick", "autostatus", "autoreact",
  "autogreet", "autotyping", "autoread", "block", "unblock",
  "shutdown", "restart", "setbio", "setname", "setpp", "save",
  "join", "delaymsg", "del", "reactch", "kickall", "antibug",
  "leave", "open", "close", "tagadmin", "hidetag", "listactive",
  "changename", "closetime", "warn", "promote", "demote",
  "promoteall", "demoteall", "say", "cpp", "harami", "ghostping",
  "adminkill", "delaymsg", "autorecording"
];

// Load menu.js
const menuData = {};
try {
  const menuPath = path.join(__dirname, "..", "media", "menu.js");
  Object.assign(menuData, require(menuPath));
} catch (err) {
  console.error("❌ Error loading menu.js:", err);
}

// Load core.js if exists
let core;
try {
  const corePath = path.join(__dirname, "./core.js");
  core = require(corePath);
} catch (err) {
  console.error("❌ Error loading core.js:", err);
}

// ===============================
// 🔹 MAIN COMMAND HANDLER
// ===============================
async function handleCommand(conn, msg) {
  const text =
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    msg.message?.videoMessage?.caption ||
    "";

  const prefix = global.settings?.prefix || "!";
  if (!text.startsWith(prefix)) return;

  const parts = text.trim().split(/ +/);
  const command = parts[0].slice(prefix.length).toLowerCase();
  const args = parts.slice(1);

  const chatId = msg.key.remoteJid;
  const isGroup = chatId.endsWith("@g.us");
  const senderId = msg.key.fromMe
    ? conn.user.id.split(":")[0] + "@s.whatsapp.net"
    : msg.key.participant || msg.key.remoteJid;

  const senderNum = senderId.replace(/\D/g, "");
  const botNum = (conn.user.id || "").replace(/\D/g, "");
  const isOwner = senderNum.slice(0, 10) === botNum.slice(0, 10);
  const isDev = senderNum.includes("9234"); // dev bypass

  const reply = (text) => conn.sendMessage(chatId, { text }, { quoted: msg });

  // 🔸 Mode control
  if (command === "self") {
    if (!isOwner && !isDev)
      return reply("🚫 *Only Owner Can Switch Modes*");

    global.mode = "self";
    return reply("🔒 BOT IS NOW IN *SELF MODE* — Only Owner can use me!");
  }

  if (command === "public") {
    if (!isOwner && !isDev)
      return reply("🚫 *Only Owner Can Switch Modes*");

    global.mode = "public";
    return reply("🌍 BOT IS NOW IN *PUBLIC MODE* — Everyone can use me!");
  }

  // 🔸 Owner bypass
  if (isDev) {
    return runCommand({
      conn,
      msg,
      args,
      command,
      chatId,
      isGroup,
      senderNum,
      reply,
      isOwner
    });
  }

  // 🔸 Mode restrictions
  if (global.mode === "self" && !isOwner && !["menu", "repo", "idcheck"].includes(command)) {
    return;
  }

  if (global.mode === "public" && ownerOnlyCommands.includes(command) && !isOwner) {
    return reply("💀 *OWNER ONLY COMMAND!* You ain't my master londey!");
  }

  // 🔸 Direct calls
  if (["menu", "repo", "idcheck", "antidelete"].includes(command)) {
    return runCommand({
      conn,
      msg,
      args,
      command,
      chatId,
      isGroup,
      senderNum,
      reply,
      isOwner
    });
  }

  // Default
  return runCommand({
    conn,
    msg,
    args,
    command,
    chatId,
    isGroup,
    senderNum,
    reply,
    isOwner
  });
}

// ===============================
// 🔹 COMMAND EXECUTOR
// ===============================
async function runCommand({
  conn,
  msg,
  args,
  command,
  chatId,
  isGroup,
  senderNum,
  reply,
  isOwner = false
}) {
  try {
    // 🔸 idcheck
    if (command === "idcheck") {
      const botId = conn.user.id || "";
      return reply(
        `🤖 *Bot ID:* ${botId}\n📤 *Sender JID:* ${
          msg.key.participant || msg.key.remoteJid
        }\n🔢 *Sender Clean:* ${senderNum}`
      );
    }

    // 🔸 menu message
    if (menuData[command]) {
      const menuMessage = generateWAMessageFromContent(
        chatId,
        { extendedTextMessage: { text: menuData[command] } },
        { userJid: chatId }
      );
      return await conn.relayMessage(chatId, menuMessage.message, {
        messageId: menuMessage.key.id
      });
    }

    // 🔸 modular group settings; aliases remain backward-compatible
    const settingsHandler = createSettingsCommandHandler({
      store: global.settingsStore || {
        get: (groupId, setting) => global[setting]?.[groupId] === true,
        set: (groupId, setting, enabled) => {
          global[setting] = global[setting] || {};
          if (enabled) global[setting][groupId] = true;
          else delete global[setting][groupId];
          return Promise.resolve(enabled);
        },
      },
      isAuthorized: () => isOwner,
      isGroup,
    });
    const settingsResult = await settingsHandler({ command, args, jid: chatId, reply });
    if (settingsResult.handled) return settingsResult;

    // 🔸 antidelete handler
    if (command === "antidelete") {
      return toggleAntidelete({ conn, m: msg, args, reply, jid: chatId });
    }

    // 🔸 core functions
    if (core && core[command] && typeof core[command] === "function") {
      return await core[command]({
        conn,
        m: msg,
        args,
        command,
        jid: chatId,
        isGroup,
        sender: senderNum,
        reply
      });
    }

    // 🔸 individual command files
    const filePath = path.join(__dirname, "..", `${command}.js`);
    if (fs.existsSync(filePath)) {
      const commandFile = require(filePath);
      if (typeof commandFile === "function") {
        return await commandFile({ conn, m: msg, args, command, jid: chatId, isGroup, sender: senderNum, reply });
      }
      if (typeof commandFile.run === "function") {
        return await commandFile.run({ conn, m: msg, args, command, jid: chatId, isGroup, sender: senderNum, reply });
      }
    }

    // 🔸 unknown command
    return reply("*ᴜɴᴋɴᴏᴡɴ ᴄᴏᴍᴍᴀɴᴅ! ᴛʀʏ `.ᴍᴇɴᴜ` ʙᴇꜰᴏʀᴇ sʜᴏᴡɪɴɢ ᴏꜰꜰ 𓄀*");

  } catch (err) {
    console.error("⚠️ Error in command execution:", err);
    return reply("⚠️ Error in command execution!");
  }
}

// ===============================
// 🔹 Export
// ===============================
module.exports = {
  handleCommand
};