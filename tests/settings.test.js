"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createSettingsStore,
  parseSettingCommand,
  createSettingsCommandHandler,
} = require("../src/commands/settings");

const jid = "120363000000000000@g.us";

function makeHandler({ authorized = true, group = true } = {}) {
  const store = createSettingsStore();
  const replies = [];
  const handler = createSettingsCommandHandler({
    store,
    isAuthorized: () => authorized,
    isGroup: group,
  });
  return { handler, store, replies, reply: async (text) => replies.push(text) };
}

test("parses settings command and backward-compatible aliases", () => {
  assert.deepEqual(parseSettingCommand("settings", ["autogreet", "on"]), { setting: "autogreet", mode: "on" });
  assert.deepEqual(parseSettingCommand("antilink", ["off"]), { setting: "antilink", mode: "off" });
  assert.deepEqual(parseSettingCommand("settings", []), { setting: null, mode: "all" });
  assert.deepEqual(parseSettingCommand("settings", ["unknown", "on"]), null);
});

test("enables and disables a group setting", async () => {
  const context = makeHandler();
  const enabled = await context.handler({ command: "autogreet", args: ["on"], jid, reply: context.reply });
  assert.equal(enabled.changed, true);
  assert.equal(context.store.get(jid, "autogreet"), true);

  const disabled = await context.handler({ command: "settings", args: ["autogreet", "off"], jid, reply: context.reply });
  assert.equal(disabled.value, false);
  assert.equal(context.store.get(jid, "autogreet"), false);
});

test("reports all settings with .settings", async () => {
  const context = makeHandler();
  context.store.set(jid, "antilink", true);
  const result = await context.handler({ command: "settings", args: [], jid, reply: context.reply });
  assert.equal(result.value.antilink, true);
  assert.match(context.replies[0], /Anti-link: 🟢 ON/);
  assert.match(context.replies[0], /Auto-greet: 🔴 OFF/);
});

test("rejects unauthorized changes and non-group use", async () => {
  const unauthorized = makeHandler({ authorized: false });
  const result = await unauthorized.handler({ command: "antilink", args: ["on"], jid, reply: unauthorized.reply });
  assert.equal(result.reason, "unauthorized");
  assert.equal(unauthorized.store.get(jid, "antilink"), false);

  const privateChat = makeHandler({ group: false });
  const privateResult = await privateChat.handler({ command: "settings", args: ["autogreet", "on"], jid: "user@s.whatsapp.net", reply: privateChat.reply });
  assert.equal(privateResult.reason, "group-only");
});

test("handles invalid modes and unknown commands", async () => {
  const context = makeHandler();
  const invalid = await context.handler({ command: "settings", args: ["antilink", "maybe"], jid, reply: context.reply });
  assert.equal(invalid.reason, "invalid-mode");
  assert.deepEqual(await context.handler({ command: "help", args: [], jid, reply: context.reply }), { handled: false });
});
