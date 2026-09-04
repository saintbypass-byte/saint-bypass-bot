"use strict";

const MANAGED_SETTINGS = Object.freeze({
  autogreet: "autogreet",
  antilink: "antilink",
});

function createSettingsStore(initialState = {}) {
  const state = {
    autogreet: { ...(initialState.autogreet || {}) },
    antilink: { ...(initialState.antilink || {}) },
  };

  function get(groupId, setting) {
    return state[setting]?.[groupId] === true;
  }

  function set(groupId, setting, enabled) {
    if (!groupId || !MANAGED_SETTINGS[setting]) {
      throw new TypeError("A valid group and managed setting are required");
    }
    if (enabled) state[setting][groupId] = true;
    else delete state[setting][groupId];
    return enabled;
  }

  function snapshot(groupId) {
    return Object.fromEntries(Object.keys(MANAGED_SETTINGS).map((setting) => [setting, get(groupId, setting)]));
  }

  return { get, set, snapshot, state };
}

function parseSettingCommand(command, args = []) {
  const normalizedCommand = command.toLowerCase();
  const normalizedArgs = args.map((arg) => arg.toLowerCase());
  const setting = normalizedCommand === "settings" ? normalizedArgs[0] : normalizedCommand;
  const mode = normalizedCommand === "settings" ? normalizedArgs[1] : normalizedArgs[0];

  if (normalizedCommand === "settings" && !setting) return { setting: null, mode: "all" };
  if (!MANAGED_SETTINGS[setting]) return null;
  if (mode !== undefined && mode !== "on" && mode !== "off") {
    return { setting, mode: "invalid" };
  }
  return { setting, mode: mode || "status" };
}

function formatStatus(snapshot) {
  return [
    "〔 ⚙️ *BOT SETTINGS* 〕",
    `┃ Auto-greet: ${snapshot.autogreet ? "🟢 ON" : "🔴 OFF"}`,
    `┃ Anti-link: ${snapshot.antilink ? "🟢 ON" : "🔴 OFF"}`,
    "┃",
    "┃ Usage: .settings <autogreet|antilink> <on|off>",
    "╰━━━━━━━━━━━━━━━━━━━╯",
  ].join("\n");
}

function createSettingsCommandHandler({ store, isAuthorized = () => false, isGroup = true }) {
  if (!store || typeof store.get !== "function" || typeof store.set !== "function") {
    throw new TypeError("A settings store is required");
  }

  return async function handleSettingsCommand({ command, args = [], jid, reply }) {
    const parsed = parseSettingCommand(command, args);
    if (!parsed) return { handled: false };
    if (!isGroup) {
      await reply("〔 🚫 *GROUP ONLY* 〕\n┃ Settings can only be changed inside groups.\n╰━━━━━━━━━━━━━━━━━━━╯");
      return { handled: true, changed: false, reason: "group-only" };
    }
    if (!isAuthorized()) {
      await reply("🚫 *Only the bot owner can change group settings.*");
      return { handled: true, changed: false, reason: "unauthorized" };
    }
    if (parsed.mode === "all") {
      await reply(formatStatus(store.snapshot(jid)));
      return { handled: true, changed: false, value: store.snapshot(jid) };
    }
    if (parsed.mode === "invalid") {
      await reply("⚠️ Use `on`, `off`, or no mode to view the setting status.");
      return { handled: true, changed: false, reason: "invalid-mode" };
    }
    if (parsed.mode === "status") {
      const value = store.get(jid, parsed.setting);
      await reply(`⚙️ *${parsed.setting}*: ${value ? "🟢 ENABLED" : "🔴 DISABLED"}`);
      return { handled: true, changed: false, value };
    }

    const enabled = parsed.mode === "on";
    store.set(jid, parsed.setting, enabled);
    await reply(`✅ *${parsed.setting} ${enabled ? "enabled" : "disabled"} for this group.*`);
    return { handled: true, changed: true, setting: parsed.setting, value: enabled };
  };
}

module.exports = {
  MANAGED_SETTINGS,
  createSettingsStore,
  parseSettingCommand,
  formatStatus,
  createSettingsCommandHandler,
};
