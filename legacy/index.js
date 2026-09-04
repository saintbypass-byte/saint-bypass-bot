const fs = require("fs");
const path = require("path");
const readline = require("readline");
const P = require("pino");
const { 
  default: makeWASocket, 
  useMultiFileAuthState, 
  fetchLatestBaileysVersion, 
  DisconnectReason 
} = require("@whiskeysockets/baileys");

const { handleCommand } = require("./menu/case");
const { loadSettings } = require("./settings");
const { storeMessage, handleMessageRevocation } = require("./antidelete");
const AntiLinkKick = require("./antilinkick.js");
const { antibugHandler } = require("./antibug.js"); // ✅ import correct function
const { createAntiLinkPolicy, handleAntiLink } = require("../src/features/anti-link");
const { createGreetingHandler } = require("../src/features/greetings");
const { createPersistentSettingsStore } = require("../src/system/persistent-settings");
const { createLogger } = require("../src/system/logger");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

async function startBot() {
  const logger = createLogger({ context: { component: "bot-runtime" } });
  logger.info("bot.starting");
  const { state, saveCreds } = await useMultiFileAuthState("auth_info");
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({ version, auth: state, logger: P({ level: "fatal" }) });

  const settings = typeof loadSettings === 'function' ? loadSettings() : {};
  const settingsStore = createPersistentSettingsStore({
    filePath: process.env.SETTINGS_FILE || path.join(process.cwd(), "data", "settings.json"),
  });
  await settingsStore.load();
  let ownerRaw = settings.ownerNumber?.[0] || "26371xxxxxxx";
  const ownerJid = ownerRaw.includes("@s.whatsapp.net") ? ownerRaw : ownerRaw + "@s.whatsapp.net";

  global.sock = sock;
  global.settings = settings;
  global.signature = settings.signature || "> 𓆩 𝑺𝑨𝑰𝑵𝑻𝑩𝒀𝑷𝑨𝑺𝑺 𓆪";
  global.owner = ownerJid;
  global.ownerNumber = ownerRaw;
  global.settingsStore = settingsStore;
  // ✅ Flags
  global.antilink = settingsStore.state.antilink;

  global.antilinkick = {};
  global.antibug = false;
  global.autogreet = settingsStore.state.autogreet;
  global.autotyping = false;
  global.autoreact = false;
  global.autostatus = false;

  logger.info("bot.owner_configured", { owner: global.owner });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "open") {
      logger.info("bot.connection.open");
      try {
        const bannerPath = path.resolve(__dirname, settings.startupBanner || "./media/saintbypass-banner.png");
        await sock.sendMessage(ownerJid, {
          image: fs.readFileSync(bannerPath),
          caption: [
            "✅ SAINTBYPASS PRO BOT ONLINE",
            "👑 Owner: saintbypass",
            `⚡ Prefix: ${settings.prefix || "!"}`,
            "",
            "Telegram: https://t.me/saintbypassstarlink",
            "GitHub: https://github.com/saintbypass-byte",
          ].join("\\n"),
        });
      } catch (err) {
        logger.error("bot.startup_banner_failed", err, { owner: ownerJid });
      }
      rl.close();
    }

    if (connection === "close") {  
      const shouldReconnect = (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut);  
      logger.warn("bot.connection.closed", { reconnecting: shouldReconnect });
      if (shouldReconnect) startBot();  
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    const jid = msg.key.remoteJid;
    const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";

    // ✅ AntiDelete
    if (settings.ANTIDELETE === true) {  
      try {  
        if (msg.message) storeMessage(msg);  
        if (msg.message?.protocolMessage?.type === 0) {  
          await handleMessageRevocation(sock, msg);  
          return;  
        }  
      } catch (err) {  
        console.error("❌ AntiDelete Error:", err.message);  
      }  
    }  

    // ✅ AutoTyping
    if (global.autotyping && jid !== "status@broadcast") {  
      try {  
        await sock.sendPresenceUpdate('composing', jid);  
        await new Promise(res => setTimeout(res, 2000));  
      } catch (err) {  
        console.error("❌ AutoTyping Error:", err.message);  
      }  
    }  

    // ✅ AutoReact
    if (global.autoreact && jid !== "status@broadcast") {
      try {
        const hearts = [
          "❤️","☣️","🅣","🧡","💛","💚","💙","💜",
          "🖤","🤍","🤎","💕","💞","💓",
          "💗","💖","💘","💝","🇵🇰","♥️"
        ];
        const randomHeart = hearts[Math.floor(Math.random() * hearts.length)];
        await sock.sendMessage(jid, { react: { text: randomHeart, key: msg.key } });
      } catch (err) {
        console.error("❌ AutoReact Error:", err.message);
      }
    }  

    // ✅ AutoStatus View
    if (global.autostatus && jid === "status@broadcast") {  
      try {  
        await sock.readMessages([{  
          remoteJid: jid,  
          id: msg.key.id,  
          participant: msg.key.participant || msg.participant  
        }]);  
        console.log(`👁️ Status Seen: ${msg.key.participant || "Unknown"}`);  
      } catch (err) {  
        console.error("❌ AutoStatus View Error:", err.message);  
      }  
      return;  
    }  

    // ✅ Antilink (modular feature)
    try {
      const antiLinkPolicy = createAntiLinkPolicy({
        enabled: global.antilink[jid] === true,
        ownerJids: [global.owner],
      });
      const moderation = await handleAntiLink({
        conn: sock,
        message: msg,
        policy: antiLinkPolicy,
        onError: (label, err) => console.error(`❌ ${label}:`, err.message),
      });
    } catch (err) {
      console.error("❌ Antilink Middleware Error:", err.message);
    }

    // ✅ AntilinkKick
    if (
      jid.endsWith("@g.us") &&
      global.antilinkick[jid] === true &&
      /(chat\.whatsapp\.com|t\.me|discord\.gg|wa\.me|bit\.ly|youtu\.be|https?:\/\/)/i.test(text) &&
      !msg.key.fromMe
    ) {
      try {
        await AntiLinkKick.checkAntilinkKick({ conn: sock, m: msg });
        
      } catch (err) {
        console.error("❌ AntilinkKick Error:", err.message || err);
      }
    }

    // ✅ AntiBug
    if (global.antibug === true && !msg.key.fromMe) {
      try {
        const isBug = await antibugHandler({ conn: sock, m: msg }); // ✅ FIX
        if (isBug) {
          
          return;
        }
      } catch (err) {
        console.error("❌ AntiBug Error:", err.message || err);
      }
    }

    // ✅ Command handler
    try {  
      await handleCommand(sock, msg, {});  
    } catch (err) {  
      console.error("❌ Command error:", err.message || err);  
    }
  });

    // ✅ AutoGreet (modular feature)
  const handleGreetingUpdate = createGreetingHandler({
    isEnabled: (groupId) => settings.greetings === true && global.autogreet?.[groupId] === true,
    getGroupMetadata: (groupId) => sock.groupMetadata(groupId),
    sendMessage: (groupId, content) => sock.sendMessage(groupId, content),
    logger: { error: (label, error) => logger.error("greeting.failed", error, { detail: label }) },
  });

  sock.ev.on("group-participants.update", async (update) => {
    await handleGreetingUpdate(update);
  });


  // ✅ Pairing code
  if (!state.creds?.registered) {
    const phoneNumber = await question("📱 Enter your WhatsApp number (with country code): ");
    await sock.requestPairingCode(phoneNumber.trim());

    setTimeout(() => {  
      const code = sock.authState.creds?.pairingCode;  
      if (code) {  
        console.log("\n🔗 Pair this device using this code in WhatsApp:\n");  
        console.log("   " + code + "\n");  
        console.log("Go to WhatsApp → Linked Devices → Link with code.");  
      } else {  
        console.log("❌ Pairing code not found.");  
      }  
    }, 1000);
  }
}

startBot();