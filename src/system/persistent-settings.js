"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");

const EMPTY_STATE = Object.freeze({ autogreet: {}, antilink: {} });

function normalizeState(value = {}) {
  const cleanMap = (candidate) => {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return {};
    return Object.fromEntries(
      Object.entries(candidate).filter(([groupId, enabled]) => groupId && enabled === true),
    );
  };
  return {
    autogreet: cleanMap(value.autogreet),
    antilink: cleanMap(value.antilink),
  };
}

function createPersistentSettingsStore({ filePath = path.join(process.cwd(), "data", "settings.json"), initialState = {}, fsImpl = fs } = {}) {
  let state = normalizeState(initialState);
  let writeQueue = Promise.resolve();

  async function load() {
    try {
      const raw = await fsImpl.readFile(filePath, "utf8");
      state = normalizeState(JSON.parse(raw));
    } catch (error) {
      if (error.code !== "ENOENT") throw new Error(`Unable to load settings: ${error.message}`);
      state = normalizeState(EMPTY_STATE);
    }
    return state;
  }

  function get(groupId, setting) {
    return state[setting]?.[groupId] === true;
  }

  function snapshot(groupId) {
    return { autogreet: get(groupId, "autogreet"), antilink: get(groupId, "antilink") };
  }

  function set(groupId, setting, enabled) {
    if (!groupId || !Object.hasOwn(state, setting) || typeof enabled !== "boolean") {
      throw new TypeError("A valid group, setting, and boolean value are required");
    }
    if (enabled) state[setting][groupId] = true;
    else delete state[setting][groupId];

    const serialized = `${JSON.stringify(state, null, 2)}\n`;
    writeQueue = writeQueue.then(async () => {
      await fsImpl.mkdir(path.dirname(filePath), { recursive: true });
      const temporaryPath = `${filePath}.${process.pid}.tmp`;
      await fsImpl.writeFile(temporaryPath, serialized, { encoding: "utf8", mode: 0o600 });
      await fsImpl.rename(temporaryPath, filePath);
    });
    return writeQueue;
  }

  return {
    load,
    get,
    set,
    snapshot,
    get state() { return state; },
    get filePath() { return filePath; },
  };
}

module.exports = { EMPTY_STATE, normalizeState, createPersistentSettingsStore };
