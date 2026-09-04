"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { createPersistentSettingsStore, normalizeState } = require("../src/system/persistent-settings");

async function tempFile() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "saint-settings-"));
  return { directory, filePath: path.join(directory, "nested", "settings.json") };
}

test("persists settings and reloads them after a new store is created", async () => {
  const { filePath } = await tempFile();
  const first = createPersistentSettingsStore({ filePath });
  await first.load();
  await first.set("group@g.us", "autogreet", true);
  await first.set("group@g.us", "antilink", true);

  const second = createPersistentSettingsStore({ filePath });
  await second.load();
  assert.deepEqual(second.snapshot("group@g.us"), { autogreet: true, antilink: true });
});

test("removes disabled settings from durable state", async () => {
  const { filePath } = await tempFile();
  const store = createPersistentSettingsStore({ filePath });
  await store.load();
  await store.set("group@g.us", "antilink", true);
  await store.set("group@g.us", "antilink", false);
  assert.equal(store.get("group@g.us", "antilink"), false);
  assert.doesNotMatch(await fs.readFile(filePath, "utf8"), /group@g\.us/);
});

test("sanitizes malformed settings and ignores unknown keys", () => {
  assert.deepEqual(normalizeState({
    autogreet: { "good@g.us": true, "bad@g.us": "yes" },
    antilink: [],
    unknown: { "x@g.us": true },
  }), { autogreet: { "good@g.us": true }, antilink: {} });
});

test("creates parent directories and writes valid JSON", async () => {
  const { filePath } = await tempFile();
  const store = createPersistentSettingsStore({ filePath });
  await store.set("group@g.us", "autogreet", true);
  const parsed = JSON.parse(await fs.readFile(filePath, "utf8"));
  assert.equal(parsed.autogreet["group@g.us"], true);
});

test("reports malformed JSON as a load error", async () => {
  const { filePath } = await tempFile();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, "{not-json", "utf8");
  const store = createPersistentSettingsStore({ filePath });
  await assert.rejects(store.load(), /Unable to load settings/);
});
