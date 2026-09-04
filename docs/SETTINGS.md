# Modular settings commands

The settings command handler lives in [`src/commands/settings.js`](../src/commands/settings.js). It manages group-scoped preferences through a small store interface, keeping state management separate from command parsing and WhatsApp transport.

## Commands

| Command | Effect |
|---|---|
| `.settings` | Shows the current autogreet and anti-link status for the group |
| `.settings autogreet on` | Enables welcome and farewell greetings for the group |
| `.settings autogreet off` | Disables welcome and farewell greetings for the group |
| `.settings antilink on` | Enables anti-link deletion for the group |
| `.settings antilink off` | Disables anti-link deletion for the group |
| `.autogreet on\|off` | Backward-compatible alias |
| `.antilink on\|off` | Backward-compatible alias |

Only the bot owner may change settings, and settings commands are restricted to group chats. Invalid modes are rejected without changing state. The current implementation uses the existing in-memory `global.autogreet` and `global.antilink` maps through an adapter, so behavior remains compatible while persistent storage is added later.

The next hardening step is to replace the in-memory adapter with a persistent group settings repository and to add explicit group-administrator authorization when settings are delegated beyond the owner.
