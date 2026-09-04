# Saint Bypass Bot

A modular WhatsApp automation bot foundation designed for reliable group administration, owner controls, safety features, and future plugin expansion.

## Current migration status

The original working implementation has been preserved under [`legacy/`](legacy/). The new `src/` layout is the target architecture for incremental migration, so existing behavior can be stabilized before features are moved into isolated modules.

## Repository layout

| Path | Responsibility |
|---|---|
| `src/config/` | Environment-aware configuration and owner settings |
| `src/commands/` | Command registration and command handlers |
| `src/features/` | Group automation and moderation features |
| `src/services/` | WhatsApp client, persistence, and external integrations |
| `src/system/` | Media, metadata, and storage utilities |
| `src/utils/` | Shared helpers, logging, validation, and errors |
| `legacy/` | Imported v1 implementation kept runnable during migration |
| `docs/` | Architecture and operational documentation |
| `tests/` | Unit and integration tests |
| `scripts/` | Maintenance and migration scripts |

## Running the preserved implementation

```bash
cd legacy
npm install
node index.js
```

Never commit credentials, pairing data, session files, or private media. Copy `.env.example` to `.env` and keep the real file local.

## Bot identity

The bot is branded as **SAINTBYPASS PRO BOT** and uses `!` as its command prefix. The configured owner is `saintbypass` at `263714373922`.

When the WhatsApp connection opens, the bot sends the generated professional startup banner to the owner with the current prefix and official links. The banner is stored at `legacy/media/saintbypass-banner.png`.

Official links:

- Telegram: https://t.me/saintbypassstarlink
- GitHub: https://github.com/saintbypass-byte
