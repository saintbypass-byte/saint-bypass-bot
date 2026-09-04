const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const antiLink = require("../src/features/anti-link");
const greetings = require("../src/features/greetings");
const settings = require("../src/commands/settings");
const middleware = require("../src/runtime/message-middleware");
const loggerModule = require("../src/system/logger");
const errors = require("../src/system/error-handler");
const persistence = require("../src/system/persistent-settings");

const groupMessage = (overrides = {}) => ({
  key: {
    remoteJid: "group@g.us",
    id: "message-id",
    participant: "member@s.whatsapp.net",
    fromMe: false,
  },
  message: { conversation: "visit https://example.com" },
  ...overrides,
});

test("anti-link policy detects, exempts, and deletes violating messages", async () => {
  const policy = antiLink.createAntiLinkPolicy({ enabled: true, ownerJids: ["owner@s.whatsapp.net"] });
  expect(policy.shouldModerate(groupMessage())).toBe(true);
  expect(policy.shouldModerate(groupMessage({ key: { ...groupMessage().key, fromMe: true } }))).toBe(false);
  expect(policy.shouldModerate(groupMessage({ key: { ...groupMessage().key, participant: "owner@s.whatsapp.net" } }))).toBe(false);

  const sendMessage = jest.fn().mockResolvedValue(undefined);
  const result = await antiLink.handleAntiLink({ conn: { sendMessage }, message: groupMessage(), policy });
  expect(result).toMatchObject({ matched: true, deleted: true });
  expect(sendMessage).toHaveBeenCalledWith("group@g.us", expect.objectContaining({ delete: expect.objectContaining({ id: "message-id" }) }));
});

test("greetings builds and sends add/remove messages", async () => {
  expect(greetings.buildGreeting({ action: "add", participant: "123@s.whatsapp.net", metadata: { subject: "Pros", participants: [1] } })).toContain("WELCOME TO BYPASS");
  expect(greetings.buildGreeting({ action: "remove", participant: "123@s.whatsapp.net", metadata: { participants: [] } })).toContain("GOODBYE WARRIOR");
  const sendMessage = jest.fn().mockResolvedValue(undefined);
  const handler = greetings.createGreetingHandler({
    isEnabled: () => true,
    getGroupMetadata: jest.fn().mockResolvedValue({ subject: "Pros", participants: [1, 2] }),
    sendMessage,
  });
  await expect(handler({ id: "group@g.us", action: "add", participants: ["a@s.whatsapp.net", "b@s.whatsapp.net"] })).resolves.toMatchObject({ sent: 2 });
  expect(sendMessage).toHaveBeenCalledTimes(2);
});

test("settings parser and command handler manage per-group preferences", async () => {
  expect(settings.parseSettingCommand("settings", ["antilink", "on"])).toEqual({ setting: "antilink", mode: "on" });
  const store = settings.createSettingsStore();
  const reply = jest.fn().mockResolvedValue(undefined);
  const handler = settings.createSettingsCommandHandler({ store, isAuthorized: () => true, isGroup: true });
  await handler({ command: "autogreet", args: ["on"], jid: "group@g.us", reply });
  expect(store.get("group@g.us", "autogreet")).toBe(true);
  await handler({ command: "settings", args: [], jid: "group@g.us", reply });
  expect(reply).toHaveBeenLastCalledWith(expect.stringContaining("Auto-greet: 🟢 ON"));
});

test("message middleware returns moderation decisions", async () => {
  const sendMessage = jest.fn().mockResolvedValue(undefined);
  const process = middleware.createMessageMiddleware({ config: { antiLink: true }, logger: { error: jest.fn() } });
  const result = await process({ conn: { sendMessage }, message: groupMessage() });
  expect(result.shouldContinue).toBe(false);
  expect(result.moderation.deleted).toBe(true);
});

test("logger emits structured redacted records", () => {
  const output = [];
  const logger = loggerModule.createLogger({ level: "debug", context: { component: "jest" }, write: (line) => output.push(JSON.parse(line)) });
  logger.debug("debug.event", { token: "secret" });
  logger.error("error.event", new Error("boom"));
  expect(output[0]).toMatchObject({ level: "debug", event: "debug.event", token: "[REDACTED]" });
  expect(output[1]).toMatchObject({ level: "error", event: "error.event", error: { message: "boom" } });
});

test("central error handler logs and replies safely", async () => {
  const logger = { error: jest.fn() };
  const reply = jest.fn().mockResolvedValue(undefined);
  await expect(errors.handleError({ logger, error: new Error("internal"), reply })).resolves.toMatchObject({ handled: true });
  expect(logger.error).toHaveBeenCalledWith("runtime.error", expect.any(Error), {});
  expect(reply).toHaveBeenCalledWith(expect.stringContaining("Something went wrong"));
});

test("persistent store survives a reload", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "jest-settings-"));
  const filePath = path.join(directory, "settings.json");
  const first = persistence.createPersistentSettingsStore({ filePath });
  await first.set("group@g.us", "antilink", true);
  const second = persistence.createPersistentSettingsStore({ filePath });
  await second.load();
  expect(second.snapshot("group@g.us")).toEqual({ autogreet: false, antilink: true });
});
