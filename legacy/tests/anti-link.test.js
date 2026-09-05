"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createAntiLinkPolicy,
  handleAntiLink,
} = require("../src/features/anti-link");

const groupMessage = (overrides = {}) => ({
  key: {
    remoteJid: "120363000000000000@g.us",
    id: "ABC123",
    participant: "923000000000@s.whatsapp.net",
    fromMe: false,
  },
  message: { conversation: "Join https://example.com" },
  ...overrides,
});

test("moderates links in group conversation messages", () => {
  const policy = createAntiLinkPolicy({ enabled: true });
  assert.equal(policy.shouldModerate(groupMessage()), true);
});

test("supports captions and ignores non-group chats", () => {
  const policy = createAntiLinkPolicy({ enabled: true });
  assert.equal(
    policy.shouldModerate(groupMessage({ message: { imageMessage: { caption: "wa.me/123" } } })),
    true,
  );
  assert.equal(
    policy.shouldModerate({
      key: { remoteJid: "923000000000@s.whatsapp.net", fromMe: false },
      message: { conversation: "https://example.com" },
    }),
    false,
  );
});

test("does not moderate when disabled, from the bot, or from an owner", () => {
  const message = groupMessage();
  assert.equal(createAntiLinkPolicy({ enabled: false }).shouldModerate(message), false);
  assert.equal(
    createAntiLinkPolicy({ enabled: true }).shouldModerate(
      groupMessage({ key: { ...message.key, fromMe: true } }),
    ),
    false,
  );
  assert.equal(
    createAntiLinkPolicy({
      enabled: true,
      ownerJids: ["923000000000@s.whatsapp.net"],
    }).shouldModerate(message),
    false,
  );
});

test("deletes a violating message through the injected connection", async () => {
  const calls = [];
  const conn = { sendMessage: async (...args) => calls.push(args) };
  const policy = createAntiLinkPolicy({ enabled: true });
  const result = await handleAntiLink({ conn, message: groupMessage(), policy });

  assert.equal(result.matched, true);
  assert.equal(result.deleted, true);
  assert.deepEqual(calls[0][0], "120363000000000000@g.us");
  assert.equal(calls[0][1].delete.id, "ABC123");
});

test("returns a recoverable failure when deletion fails", async () => {
  const errors = [];
  const conn = { sendMessage: async () => { throw new Error("not admin"); } };
  const policy = createAntiLinkPolicy({ enabled: true });
  const result = await handleAntiLink({
    conn,
    message: groupMessage(),
    policy,
    onError: (...args) => errors.push(args),
  });

  assert.equal(result.matched, true);
  assert.equal(result.deleted, false);
  assert.equal(result.error.message, "not admin");
  assert.equal(errors.length, 1);
});
