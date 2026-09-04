# Logging and error handling

The bot now uses [`src/system/logger.js`](../src/system/logger.js) for structured JSON logs. Each entry includes an ISO timestamp, severity level, event name, and contextual fields. The default level is `info`; set `LOG_LEVEL=debug` to include diagnostic events or `LOG_LEVEL=warn` to reduce routine output.

Sensitive fields whose names contain values such as `token`, `password`, `secret`, `authorization`, `pairing`, `session`, or `owner` are replaced with `[REDACTED]` before output. Authentication state, pairing data, and private message contents should not be placed in log fields.

The centralized handler in [`src/system/error-handler.js`](../src/system/error-handler.js) records internal failures with context and sends a generic public response. It also catches failures while sending the error response, preventing a second exception from escaping the original failure boundary.

The runtime records bot startup, owner configuration, connection open and close events, startup-banner failures, greeting failures, and command execution failures. Command failures include the command and chat context in logs while keeping implementation details out of user-facing replies.

Logs currently go to standard output so deployment platforms can collect them. A future operational layer can add rotating files or an external log sink without changing feature modules.
