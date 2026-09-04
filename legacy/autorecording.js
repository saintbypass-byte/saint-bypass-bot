// 📁 File: autorecording.js
const fs = require("fs");
const path = require("path");

// 🔢 Clean number from JID
function getCleanNumber(jid) {
  return jid ? jid.replace(/\D/g, "") : null;
}

// 🔍 Extract sender number
function resolveSenderNumber(m, conn) {
  let senderJid =
    m.sender ||
    m.key?.participant ||
    m.participant ||
    (m.key?.fromMe && conn?.user?.id) ||
    m.key?.remoteJid ||
    m.message?.extendedTextMessage?.contextInfo?.participant;

  if (!senderJid && conn?.decodeJid) {
    try {
      senderJid = conn.decodeJid(m?.key?.remoteJid);
    } catch {
      senderJid = null;
    }
  }

  return getCleanNumber(senderJid);
}

module.exports = async function ({ conn, m, reply, args }) {
  try {
    const senderNum = resolveSenderNumber(m, conn);
    if (!senderNum) {
      return reply(
`╭━━━〔 ❌ *ERROR* 〕━━━╮
┃ Unable to detect sender!
╰━━━━━━━━━━━━━━━━━━━╯`
      );
    }

    const toggle = args[0]?.toLowerCase();
    if (!["on", "off"].includes(toggle)) {
      return reply(
`〔 🎙 *AUTO-RECORDING* 〕
┃ 💡 Usage:
┃   .autorecording on   → Enable
┃   .autorecording off  → Disable
┃ 
┃ 🎧 Fake recording vibes ✨
╰━━━━━━━━━━━━━━━━━━━╯`
      );
    }

    global.autorecording = toggle === "on";

    return reply(
`╭〔 🎙 *AUTO-RECORDING* 〕╮
┃ Status: ${toggle === "on" ? "🟢 ENABLED" : "🔴 DISABLED"}
┃ 
┃ 🎧 Creating *fake recording vibes...*
┃ 💜 Powered by: SAINT BYPASS-MD
╰━━━━━━━━━━━━━━━━━━━╯`
    );
  } catch (err) {
    console.error("❌ AutoRecording Error:", err.message);
    return reply(
`╭〔 💥 *SYSTEM FAILURE* 〕╮
┃ Error while toggling AutoRecording!
┃ 
┃ ⚠️ ${err.message}
╰━━━━━━━━━━━━━━━━━━━╯`
    );
  }
};