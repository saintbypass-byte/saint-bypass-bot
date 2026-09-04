"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { loadSettings } = require("../legacy/settings");
const ownerNumbers = require("../legacy/Owner/owner");

test("uses the saintbypass branding configuration", () => {
  const settings = loadSettings();
  assert.deepEqual(ownerNumbers, ["263714373922"]);
  assert.equal(settings.ownerName, "saintbypass");
  assert.equal(settings.prefix, "!");
  assert.equal(settings.telegram, "https://t.me/saintbypassstarlink");
  assert.equal(settings.github, "https://github.com/saintbypass-byte");
  assert.equal(settings.startupBanner, "./media/saintbypass-banner.png");
});
