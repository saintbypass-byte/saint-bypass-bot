# SAINTBYPASS PRO BOT

![SAINTBYPASS banner](public/assets/saintbypass-banner.png)

A professional Telegram group-management bot for moderation, member safety, configurable group rules, and administrator workflows. The project is branded with the supplied SaintBypass artwork and ships with **25 working commands**.

> Use this project only in groups where you have permission to administer the community. The bot is defensive moderation software; it does not bypass access controls, steal data, or automate abuse.

## Features

The bot provides persistent per-group settings, administrator-only moderation actions, warnings, lock and unlock controls, anti-link filtering, basic anti-spam protection, message reporting, activity statistics, and a branded interactive control center. Inline buttons provide dashboard navigation and security toggles, animated feedback makes operations feel responsive, and mute, ban, and kick actions require confirmation. Settings are stored locally in a portable JSON state file, while Telegram updates are received through long polling; an optional `/healthz` endpoint is exposed when the host supplies `PORT`.

## Command reference

| # | Command | Purpose |
|---:|---|---|
| 1 | `/start` | Show the branded welcome panel |
| 2 | `/help` | List all commands |
| 3 | `/settings` | Show current group settings |
| 4 | `/id` | Show chat and user IDs |
| 5 | `/rules` | Show group rules |
| 6 | `/setrules <text>` | Save group rules |
| 7 | `/welcome` | Show the welcome template |
| 8 | `/setwelcome <text>` | Save a welcome template; use `{name}` |
| 9 | `/mute` | Mute a replied-to member |
| 10 | `/unmute` | Restore a member's permissions |
| 11 | `/ban` | Ban a replied-to member |
| 12 | `/unban <user_id>` | Unban by numeric Telegram ID |
| 13 | `/kick` | Remove a replied-to member without a permanent ban |
| 14 | `/warn` | Add a warning to a replied-to member |
| 15 | `/unwarn` | Remove one warning |
| 16 | `/warnings` | Show warning count |
| 17 | `/purge <count>` | Delete up to 100 messages starting at a reply |
| 18 | `/pin` | Pin a replied-to message |
| 19 | `/unpin` | Remove the latest pin |
| 20 | `/lock` | Lock the group for regular members |
| 21 | `/unlock` | Restore group messaging |
| 22 | `/antispam on|off` | Toggle long-message filtering |
| 23 | `/antilink on|off` | Toggle link filtering for non-admins |
| 24 | `/report` | Send a replied-to message to administrators |
| 25 | `/stats` | Show observed messages and admin actions |

Commands that change group state require the sender to be a Telegram administrator. Moderation commands generally require replying to the target member or message. Send `/start` to open the branded dashboard, then use the inline buttons to navigate panels without memorizing commands.

## Future-platform upgrade

The bot now includes a modular registry of **103 safe tools** across group operations, protection, content utilities, local utilities, owner controls, and integrations. Use `/pro` for the 2050-style HUD and `/tools` to open a paginated button grid with a dedicated clickable button for every tool. Each tool opens a detail panel, and the catalog provides previous/next navigation across ten pages. Use `/apis` to inspect opt-in integrations, `/plugins` to inspect the registry, `/ownercheck` to diagnose owner access, and `/theme obsidian|neon|frost|royal|matrix` to select a HUD theme.

The entitlement model has three tiers. **Core** is the default. **Pro** can be granted to a chat with `/grantpro <chat_id>` by the configured owner or through `PREMIUM_CHAT_IDS`. **Owner** is automatically recognized from `BOT_OWNER_ID`, which is set to Telegram ID `7451988083` in the sanitized template. Pro and Owner unlock the API and integration catalog; they do not bypass Telegram permissions or service limits. The catalog now includes **50 API modules**, including a QA-only temporary inbox adapter.

API modules are metadata-driven and disabled until explicitly configured. They are intended for authorized services such as RSS, public status pages, GitHub metadata, weather, translation, approved calendar or workspace bridges, and encrypted backups. The temporary inbox adapters are restricted to approved QA workflows and cannot be used for third-party account creation, verification bypass, or bulk disposable identities. The platform must not be used for spam, mass messaging, credential collection, access bypass, or disposable-account abuse.

## Quick start

Create a bot with [@BotFather](https://t.me/BotFather), copy the token, and add the bot to your group. Promote it to administrator with permission to delete messages, restrict members, ban members, pin messages, and manage chat permissions.

```bash
git clone https://github.com/saintbypass-byte/saint-bypass-bot.git
cd saint-bypass-bot
npm install
cp .env.example .env
```

Set `BOT_TOKEN` in `.env`; the sanitized template configures `BOT_OWNER_ID=7451988083`. Owner access is password-free and is based on the Telegram numeric ID received from Telegram. Never add a Telegram password to the bot or repository. Add comma-separated chat IDs to `PREMIUM_CHAT_IDS` only for groups that should receive Pro access. Use `/ownercheck` to verify the current Telegram ID and owner match.

```bash
npm start
```

For development, use `npm run dev`. The local state file is created at `data/saintbypass.json` and is intentionally ignored by Git.

## Configuration

| Variable | Required | Description |
|---|---:|---|
| `BOT_TOKEN` | Yes | Token issued by BotFather |
| `BOT_OWNER_ID` | No | Primary numeric owner ID; sanitized template uses `7451988083` |
| `BOT_OWNER_IDS` | No | Optional comma-separated additional owner IDs |
| `PREMIUM_CHAT_IDS` | No | Comma-separated chat IDs with Pro access |
| `DB_PATH` | No | Persistent JSON state-file path |
| `COMMAND_PREFIX` | No | Documentation prefix; Telegram slash commands remain supported |
| `LOG_LEVEL` | No | Reserved for deployment logging |

## 24/7 cloud deployment

For production hosting on Railway or Render, see [`docs/DEPLOYMENT_24_7.md`](docs/DEPLOYMENT_24_7.md). The guide covers persistent state storage, secrets, one-instance long polling, backups, security, monitoring, and troubleshooting.

## Testing and checks

```bash
npm run check
npm test
```

The repository retains the earlier WhatsApp implementation under `legacy/` as historical reference, but the root runtime is now the Telegram bot. Do not commit `.env`, databases, logs, session files, or private media.

## License

MIT. See [`LICENSE`](LICENSE).
