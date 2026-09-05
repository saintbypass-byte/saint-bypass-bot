"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createLogger, redact } = require("../src/system/logger");
const { handleError, wrapHandler } = require("../src/system/error-handler");

test("writes structured JSON logs with context and redaction", () => {
  const lines = [];
  const logger = createLogger({ level: "info", context: { component: "test" }, write: (line) => lines.push(line) });
  logger.info("bot.started", { connection: "open", token: "do-not-log" });
  const entry = JSON.parse(lines[0]);

  assert.equal(entry.level, "info");
  assert.equal(entry.event, "bot.started");
  assert.equal(entry.component, "test");
  assert.equal(entry.token, "[REDACTED]");
  assert.ok(entry.timestamp);
});

test("filters debug logs below the configured level", () => {
  const lines = [];
  const logger = createLogger({ level: "warn", write: (line) => lines.push(line) });
  logger.debug("debug.event");
  logger.info("info.event");
  logger.warn("warning.event");
  logger.error("error.event", new Error("failure"));
  assert.equal(lines.length, 2);
  assert.equal(JSON.parse(lines[0]).event, "warning.event");
  assert.equal(JSON.parse(lines[1]).event, "error.event");
});

test("redacts sensitive nested fields", () => {
  const result = redact({ password: "secret", nested: { authorization: "bearer" }, safe: "value" });
  assert.deepEqual(result, { password: "[REDACTED]", nested: { authorization: "[REDACTED]" }, safe: "value" });
});

test("logs command failures and sends a safe public response", async () => {
  const lines = [];
  const replies = [];
  const logger = createLogger({ write: (line) => lines.push(line) });
  const result = await handleError({
    logger,
    error: new Error("database password=hidden"),
    event: "command.execution_failed",
    context: { command: "settings", chatId: "group@g.us" },
    reply: async (message) => replies.push(message),
  });

  assert.equal(result.handled, true);
  assert.equal(replies.length, 1);
  assert.match(replies[0], /Something went wrong/);
  assert.equal(JSON.parse(lines[0]).event, "command.execution_failed");
});

test("wrapHandler converts thrown errors into handled results", async () => {
  const replies = [];
  const wrapped = wrapHandler(async () => { throw new Error("boom"); }, {
    logger: { error: () => {} },
    reply: async (message) => replies.push(message),
  });
  const result = await wrapped();
  assert.equal(result.handled, true);
  assert.equal(replies.length, 1);
});
