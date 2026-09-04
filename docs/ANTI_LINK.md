# Anti-link moderation

The anti-link feature now lives in [`src/features/anti-link.js`](../src/features/anti-link.js). It is intentionally independent of the WhatsApp SDK except for the small injected `sendMessage()` deletion adapter.

## Policy

The feature moderates links only when the message is in a group and the configured per-group policy is enabled. It recognizes ordinary HTTP(S) and `www.` links, as well as common invite and platform links including WhatsApp, Telegram, Discord, Bitly, and YouTube. Messages sent by the bot itself and configured owner JIDs are exempt by default.

## Runtime integration

The preserved entrypoint in [`legacy/index.js`](../legacy/index.js) now constructs a modular policy for each incoming message and delegates deletion to `handleAntiLink()`. The existing anti-link-kick stage remains after deletion, preserving the previous moderation sequence.

The reusable middleware factory in [`src/runtime/message-middleware.js`](../src/runtime/message-middleware.js) is the target integration point for the future v2 runtime. It returns a normalized result containing `matched`, `deleted`, and `shouldContinue` fields, allowing later middleware and command dispatch to make explicit decisions.

## Testing

The tests in [`tests/anti-link.test.js`](../tests/anti-link.test.js) cover group filtering, captions, disabled policies, bot and owner exemptions, successful deletion, and recoverable adapter failures.
