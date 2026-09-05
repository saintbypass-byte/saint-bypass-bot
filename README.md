# SAINTBYPASS PRO BOT

![SAINTBYPASS banner](public/assets/saintbypass-banner.png)

A professional Telegram group-management bot for moderation, member safety, configurable group rules, and administrator workflows. The project is branded with the supplied SaintBypass artwork and ships with **25 working commands**.

> Use this project only in groups where you have permission to administer the community. The bot is defensive moderation software; it does not bypass access controls, steal data, or automate abuse.

## Features

The bot provides persistent per-group settings, administrator-only moderation actions, warnings, lock and unlock controls, anti-link filtering, basic anti-spam protection, message reporting, activity statistics, and a branded help panel. Settings are stored locally in SQLite, while Telegram updates are received through long polling so no public webhook server is required.

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

Commands that change group state require the sender to be a Telegram administrator. Moderation commands generally require replying to the target member or message.

## Quick start

Create a bot with [@BotFather](https://t.me/BotFather), copy the token, and add the bot to your group. Promote it to administrator with permission to delete messages, restrict members, ban members, pin messages, and manage chat permissions.

```bash
git clone https://github.com/saintbypass-byte/saint-bypass-bot.git
cd saint-bypass-bot
npm install
cp .env.example .env
```

Set `BOT_TOKEN` and `BOT_OWNER_ID` in `.env`. `BOT_OWNER_ID` is optional but allows the configured owner to pass the administrator check; normal group administration still follows Telegram's role system.

```bash
npm start
```

For development, use `npm run dev`. The local SQLite database is created at `data/saintbypass.sqlite` and is intentionally ignored by Git.

## Configuration

| Variable | Required | Description |
|---|---:|---|
| `BOT_TOKEN` | Yes | Token issued by BotFather |
| `BOT_OWNER_ID` | No | Numeric owner ID |
| `DB_PATH` | No | SQLite database path |
| `COMMAND_PREFIX` | No | Documentation prefix; Telegram slash commands remain supported |
| `LOG_LEVEL` | No | Reserved for deployment logging |

## 24/7 cloud deployment

For production hosting on Railway or Render, see [`docs/DEPLOYMENT_24_7.md`](docs/DEPLOYMENT_24_7.md). The guide covers persistent SQLite storage, secrets, one-instance long polling, backups, security, monitoring, and troubleshooting.

## Testing and checks

```bash
npm run check
npm test
```

The repository retains the earlier WhatsApp implementation under `legacy/` as historical reference, but the root runtime is now the Telegram bot. Do not commit `.env`, databases, logs, session files, or private media.

## License

MIT. See [`LICENSE`](LICENSE).
