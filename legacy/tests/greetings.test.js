"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildGreeting,
  createGreetingHandler,
  normalizeMetadata,
} = require("../src/features/greetings");

const metadata = {
  subject: "Pros Group",
  desc: "Respect the rules",
  participants: [{ id: "1" }, { id: "2" }, { id: "3" }],
};

const member = "923000000000@s.whatsapp.net";

test("builds a welcome greeting with group details and a mention", () => {
  const text = buildGreeting({ action: "add", participant: member, metadata });
  assert.match(text, /WELCOME TO BYPASS/);
  assert.match(text, /@923000000000/);
  assert.match(text, /Pros Group/);
  assert.match(text, /Current Members:\* 3/);
  assert.match(text, /Respect the rules/);
});

test("builds a farewell greeting with a non-negative remaining count", () => {
  const text = buildGreeting({
    action: "remove",
    participant: member,
    metadata: { subject: "Small Group", participants: [] },
  });
  assert.match(text, /GOODBYE WARRIOR/);
  assert.match(text, /Now only 0 members remain/);
});

test("normalizes missing metadata safely", () => {
  assert.deepEqual(normalizeMetadata(), {
    memberCount: 0,
    groupName: "Unnamed Group",
    groupDescription: "No description set.",
  });
  assert.equal(buildGreeting({ action: "unknown", participant: member }), null);
});

test("sends one mentioned greeting per participant when enabled", async () => {
  const calls = [];
  const handler = createGreetingHandler({
    isEnabled: () => true,
    getGroupMetadata: async () => metadata,
    sendMessage: async (...args) => calls.push(args),
  });
  const result = await handler({ id: "group@g.us", action: "add", participants: ["a@s.whatsapp.net", "b@s.whatsapp.net"] });

  assert.equal(result.sent, 2);
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0][1].mentions, ["a@s.whatsapp.net"]);
  assert.deepEqual(calls[1][1].mentions, ["b@s.whatsapp.net"]);
});

test("skips disabled groups and unsupported events", async () => {
  const handler = createGreetingHandler({
    isEnabled: () => false,
    getGroupMetadata: async () => metadata,
    sendMessage: async () => assert.fail("must not send"),
  });
  assert.deepEqual(await handler({ id: "group@g.us", action: "add", participants: [member] }), { sent: 0, skipped: true });
  assert.deepEqual(await handler({ id: "group@g.us", action: "promote", participants: [member] }), { sent: 0, skipped: true });
});

test("returns a recoverable result when metadata loading fails", async () => {
  const errors = [];
  const handler = createGreetingHandler({
    isEnabled: () => true,
    getGroupMetadata: async () => { throw new Error("metadata unavailable"); },
    sendMessage: async () => assert.fail("must not send"),
    logger: { error: (...args) => errors.push(args) },
  });
  const result = await handler({ id: "group@g.us", action: "remove", participants: [member] });

  assert.equal(result.sent, 0);
  assert.equal(result.error.message, "metadata unavailable");
  assert.equal(errors.length, 1);
});
