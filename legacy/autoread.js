// 📂 File: autoread.js
// ☠️ AutoRead Command - SAINT BYPASS-MD

let autoReadEnabled = false; // Default OFF

module.exports = async function autoread({ conn, m, args, reply }) {
  try {
    if (!args[0]) {
      return reply(
`╭〔 ⚙️ *AUTO-READ STATUS* 〕╮
┃ Current: ${autoReadEnabled ? "🟢 ON" : "🔴 OFF"}
┃ 
┃ 💡 Usage:
┃   .autoread on   → Enable
┃   .autoread off  → Disable
┃ 
┃ 💜 Powered by: SAINT BYPASS-MD
╰━━━━━━━━━━━━━━━━━━━╯`
      );
    }

    const option = args[0].toLowerCase();

    if (option === "on") {
      autoReadEnabled = true;
      reply(
`〔 💫 *AUTO-READ ACTIVATED* 〕
┃ ☠️ Bot will now mark every
┃     incoming message as *READ*.
┃ 
┃ 💜 Powered by: SAINT BYPASS-MD
╰━━━━━━━━━━━━━━━━━━`
      );
    } 
    else if (option === "off") {
      autoReadEnabled = false;
      reply(
`〔 🚫 *AUTO-READ DEACTIVATED* 〕
┃ ☠️ Bot will no longer mark
┃     messages as *READ*.
┃ 
┃ 💜 Powered by: SAINT BYPASS-MD
╰━━━━━━━━━━━━━━━━━━━╯`
      );
    } 
    else {
      reply(
`〔 ❌ *INVALID OPTION* 〕
┃ 💡 Usage:
┃   .autoread on   → Enable
┃   .autoread off  → Disable
╰━━━━━━━━━━━━━━━━━━━╯`
      );
    }

  } catch (e) {
    console.error(e);
    reply(
`╭━━━〔 ⚠️ *ERROR* 〕━━━╮
┃ ${e.message}
╰━━━━━━━━━━━━━━━━━━━╯`
    );
  }
};

// 📌 Hook for index.js or handler.js
module.exports.checkAutoRead = async function (conn, m) {
  if (autoReadEnabled) {
    try {
      await conn.readMessages([m.key]);
    } catch (err) {
      console.error("AutoRead error:", err);
    }
  }
};