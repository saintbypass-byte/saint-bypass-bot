# Welcome and farewell greetings

The member greeting feature now lives in [`src/features/greetings.js`](../src/features/greetings.js). It creates welcome messages for `add` events and farewell messages for `remove` events, including a mention for every affected participant.

## Enablement

The legacy command `.autogreet on` enables greetings for the current group by setting `global.autogreet[groupJid]` to `true`. `.autogreet off` disables them. The modular event handler also requires `settings.greetings === true`, which provides a global safety switch.

## Integration

The existing `group-participants.update` listener in [`legacy/index.js`](../legacy/index.js) now delegates to `createGreetingHandler()`. The feature receives group metadata and the WhatsApp sender as injected dependencies, which keeps the message templates and business rules independent from the WhatsApp SDK.

Multiple participants are handled individually so each person receives a correctly targeted mention. Unsupported participant actions are ignored, missing metadata falls back to safe defaults, and metadata or send failures are returned as recoverable results and logged.

Tests are located in [`tests/greetings.test.js`](../tests/greetings.test.js).
