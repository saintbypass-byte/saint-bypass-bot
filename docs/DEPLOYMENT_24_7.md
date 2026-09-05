# 24/7 Deployment Guide

This guide explains how to run **SAINTBYPASS PRO BOT** continuously on a managed cloud platform. It covers Railway and Render, which can both deploy directly from the public GitHub repository:

> [https://github.com/saintbypass-byte/saint-bypass-bot](https://github.com/saintbypass-byte/saint-bypass-bot)

The bot is a Node.js long-polling process. It does not expose an HTTP webhook endpoint, so it should be deployed as a continuously running service rather than as a short-lived job. It stores group settings and warnings in SQLite. That database must be placed on a persistent volume or disk if settings are expected to survive restarts and redeployments.

## 1. Choose the hosting model

Both platforms can run the bot continuously, but their service terminology differs.

| Requirement | Railway | Render |
|---|---|---|
| Correct service type | Regular service | Background Worker |
| Bot process | `npm start` | `npm start` |
| Telegram transport | Long polling | Long polling |
| Persistent SQLite | Attach a Railway Volume and set `DB_PATH` inside it | Attach a Render Persistent Disk and set `DB_PATH` inside it |
| Public HTTP endpoint | Not required for this bot | Not required for a Background Worker |
| Scaling recommendation | One replica when using SQLite | One worker instance when using SQLite |
| Best operational fit | Simple GitHub-connected service with a mounted volume | Explicit worker service with a mounted persistent disk |

A single instance is intentional. Telegram long polling should not be run by multiple replicas using the same bot token, and the local SQLite file is designed for one active writer. If the project later needs horizontal scaling, move settings and warnings to a managed database before adding replicas.

## 2. Prepare the Telegram bot

Create or use a bot through [@BotFather](https://t.me/BotFather). Copy the token securely; it grants control of the bot and must never be committed to GitHub.

Add the bot to the target group and promote it to administrator. For the moderation commands to work, grant only the permissions the bot actually needs:

| Telegram permission | Used by |
|---|---|
| Delete messages | `/purge`, `/antilink`, anti-spam filtering |
| Restrict members | `/mute`, `/unmute`, `/lock`, `/unlock` |
| Ban users | `/ban`, `/kick`, `/unban` |
| Pin messages | `/pin`, `/unpin` |
| Manage chat permissions | `/lock`, `/unlock` |

For link filtering and message moderation, open the bot's settings in [@BotFather](https://t.me/BotFather), select **Bot Settings**, and disable privacy mode with `/setprivacy` if the bot must inspect ordinary group messages. Telegram administrators' messages are visible to bots even when privacy mode is enabled, but privacy mode is normally disabled for moderation bots that need to inspect member messages.

To obtain the numeric owner ID, use `/id` after the bot is running or use a trusted Telegram ID utility. Treat the ID as configuration, not as a secret.

## 3. Repository and runtime requirements

The repository already contains the required production scripts:

```json
{
  "scripts": {
    "start": "node src/telegram/bot.js",
    "check": "node --check src/telegram/bot.js",
    "test": "node --test tests/*.test.js"
  }
}
```

The standard build and start commands are therefore:

```bash
npm ci
npm start
```

The application requires Node.js 20 or newer, installs `grammy`, `better-sqlite3`, and `dotenv`, and creates the SQLite schema automatically on first launch. It does not require a web server, webhook URL, reverse proxy, or separate Redis service.

## 4. Required environment variables

Configure these variables in the hosting provider's secret/environment settings rather than committing a `.env` file:

| Variable | Required | Railway example | Render example | Purpose |
|---|---:|---|---|---|
| `BOT_TOKEN` | Yes | BotFather token | BotFather token | Authenticates the Telegram Bot API |
| `BOT_OWNER_ID` | No | Numeric Telegram ID | Numeric Telegram ID | Allows the configured owner through the owner check |
| `DB_PATH` | Yes for persistence | `/data/saintbypass.sqlite` | `/var/data/saintbypass.sqlite` | Places SQLite on persistent storage |
| `COMMAND_PREFIX` | No | `/` | `/` | Documentation/display prefix |
| `LOG_LEVEL` | No | `info` | `info` | Reserved logging setting |

Use a strong process for secrets:

1. Add `BOT_TOKEN` only in the platform dashboard.
2. Do not paste the token into `README.md`, `render.yaml`, shell history, issue comments, or screenshots.
3. If the token is ever exposed, revoke it immediately with BotFather and generate a replacement.
4. Keep production and test bots separate so testing cannot moderate the real group.

## 5. Railway deployment

Railway builds a service from the repository and starts it with its detected or configured start command. Railway supports persistent Volumes for data that must survive deploys and restarts.[1] Its healthcheck feature is intended for services that expose a reachable HTTP endpoint; this bot is long-polling-only, so a healthcheck is optional and should not be configured unless an HTTP health endpoint is added to the application.[2]

### 5.1 Create the service

1. Open [Railway](https://railway.com/) and create a new project.
2. Choose **Deploy from GitHub repo** and select `saintbypass-byte/saint-bypass-bot`.
3. Select the `main` branch.
4. Confirm the service uses Node.js.
5. Set the build command to `npm ci` if Railway does not infer it automatically.
6. Set the start command to `npm start`.
7. Keep the service at one replica.

Railway detects the repository and builds a deployable container using its build system or a supplied Dockerfile. The service then starts using the configured start command.[3]

### 5.2 Add the persistent Volume

The database is not safe on ephemeral deployment storage. Create a Volume from the Railway service's **Volumes** or **Storage** settings:

1. Add a Volume to the bot service.
2. Set the mount path to `/data`.
3. Choose a size appropriate for a small SQLite database. The database is usually small, but leave room for SQLite journal files and future operational data.
4. Add the service variable `DB_PATH=/data/saintbypass.sqlite`.
5. Redeploy the service.

Railway documents that volumes provide persistent data and that the available size depends on the plan. Railway also notes that attaching a volume prevents multiple deployments from being active on the same mounted volume, so a short interruption during redeployment is expected.[4]

### 5.3 Add environment variables

In the Railway service's **Variables** section, add:

```text
BOT_TOKEN=<your BotFather token>
BOT_OWNER_ID=<optional numeric Telegram user ID>
DB_PATH=/data/saintbypass.sqlite
COMMAND_PREFIX=/
LOG_LEVEL=info
```

Do not set `DB_PATH` to `./data/saintbypass.sqlite` after attaching the Volume. A relative path may point outside the mounted directory and can be lost when Railway replaces the deployment.

### 5.4 Deploy and verify

After the first deployment:

1. Open the deployment logs and confirm `SAINTBYPASS PRO BOT starting with 25 commands…` appears.
2. Confirm the process remains active instead of exiting successfully.
3. Open Telegram and send `/start` to the bot.
4. Confirm that the supplied banner is returned.
5. Add the bot to a test group and run `/help`.
6. Promote it to administrator and test `/rules`, `/setrules`, `/warn`, `/mute`, `/pin`, `/lock`, and `/unlock`.
7. Restart or redeploy the service, then run `/settings` and `/warnings` to confirm the SQLite data remains.

Railway's deployment state becomes active after startup when no healthcheck is configured. Railway healthchecks are not continuous monitoring; they are used during deployment activation, so use platform logs or an external monitor if you need ongoing alerting.[2]

### 5.5 Railway restart and graceful shutdown notes

Railway can restart or redeploy the service after crashes, manual actions, migrations, or platform operations. Railway sends `SIGTERM` during replacement deployments and documents a configurable draining period through `RAILWAY_DEPLOYMENT_DRAINING_SECONDS`.[3] The bot uses Telegram long polling and SQLite, so keep one active deployment and avoid manually starting a second copy with the same token.

## 6. Render deployment

Render provides a dedicated **Background Worker** service type for continuously running processes that do not receive incoming traffic.[5] This is the natural Render service type for this bot. Render services have an ephemeral filesystem by default, so attach a Persistent Disk if SQLite data must survive deploys and restarts.[6]

### 6.1 Create the Background Worker

1. Open [Render](https://render.com/) and connect your GitHub account.
2. Select **New > Background Worker**.
3. Choose `saintbypass-byte/saint-bypass-bot` and the `main` branch.
4. Select the Node.js native runtime.
5. Set **Build Command** to `npm ci`.
6. Set **Start Command** to `npm start`.
7. Select a region and keep the worker at one instance.
8. Create the worker and wait for the initial build.

A Background Worker does not require a public domain or HTTP port. Do not convert this bot into a Web Service merely to obtain a health-check URL; the worker is the correct process type for a long-polling bot.

### 6.2 Add environment variables

Open the worker's **Environment** page and add:

```text
BOT_TOKEN=<your BotFather token>
BOT_OWNER_ID=<optional numeric Telegram user ID>
DB_PATH=/var/data/saintbypass.sqlite
COMMAND_PREFIX=/
LOG_LEVEL=info
```

Render environment variables are intended for runtime configuration and secrets. Render supports adding them individually or importing valid `.env` syntax through the dashboard, but do not commit the local `.env` file.[7]

### 6.3 Add the Persistent Disk

Create a disk from the worker's **Disks** settings:

1. Add a Persistent Disk to the worker.
2. Set the mount path to `/var/data`.
3. Choose the smallest size that comfortably fits the database and any future runtime files.
4. Save the disk and allow Render to redeploy the worker.
5. Confirm `DB_PATH=/var/data/saintbypass.sqlite` is set.

Render states that only filesystem changes under the disk's mount path persist. The rest of the service filesystem remains ephemeral.[6] Render also limits a persistent disk to one service instance, which is another reason to run exactly one bot worker when using local SQLite.

### 6.4 Verify the deployment

Open the Render worker logs and confirm the startup line appears. Then complete the same Telegram checks as for Railway: `/start`, `/help`, administrator promotion, a safe moderation test group, and a restart persistence check.

Render health checks apply to Web Services and Private Services that receive network traffic; they do not apply to Background Workers.[8] Worker reliability should therefore be monitored through Render logs, deploy notifications, and an external process or alerting system if the group requires operational alerting.

### 6.5 Render Blueprint option

Teams that prefer infrastructure as code can represent the worker and disk in `render.yaml`. The following is a template; keep the secret token in the Render dashboard by using `sync: false` rather than writing the value into Git:

```yaml
services:
  - type: worker
    name: saintbypass-telegram-bot
    runtime: node
    buildCommand: npm ci
    startCommand: npm start
    plan: starter
    envVars:
      - key: BOT_TOKEN
        sync: false
      - key: BOT_OWNER_ID
        sync: false
      - key: DB_PATH
        value: /var/data/saintbypass.sqlite
      - key: COMMAND_PREFIX
        value: /
      - key: LOG_LEVEL
        value: info
    disk:
      name: saintbypass-data
      mountPath: /var/data
      sizeGB: 1
```

Validate the Blueprint before syncing it. Render's official Blueprint reference documents `type: worker`, Node runtimes, `buildCommand`, `startCommand`, environment variables, and persistent disk fields.[9] Plan names and pricing can change, so select the currently available paid worker plan in the dashboard if `starter` is not available in the account or region.

## 7. SQLite persistence and backups

The bot's SQLite database contains group rules, welcome messages, anti-link and anti-spam settings, lock state, warning counts, and activity counters. Losing it does not expose the Telegram token, but it will reset moderation configuration and warning history.

A persistent disk protects against ordinary restarts and redeploys; it is not a complete backup strategy. Schedule periodic copies of the database or use provider snapshots where available. Before copying, stop the worker briefly or use a SQLite-aware backup method so the backup is consistent. A simple maintenance approach on a server with shell access is:

```bash
sqlite3 /var/data/saintbypass.sqlite '.backup /var/data/backups/saintbypass-$(date +%Y%m%d-%H%M%S).sqlite'
```

The `sqlite3` CLI is not included in the bot repository by default, so do not add this command to the application start process unless the host provides the CLI. For Railway and Render, use the provider's disk backup facilities or a separate maintenance environment. Keep backups encrypted, restrict access, and periodically test restoration.

If the bot grows to multiple instances, needs analytics queries, or requires zero-downtime migrations, migrate settings and warnings to a managed database before scaling. Do not put one SQLite file on a shared network mount and run multiple polling instances against it.

## 8. Security hardening

Use the following production baseline:

| Control | Recommendation |
|---|---|
| Bot token | Store only in provider secrets; rotate immediately if exposed |
| Telegram permissions | Grant only delete, restrict, ban, pin, and permission-management capabilities needed by the group |
| Owner ID | Configure the numeric ID carefully; never treat it as a replacement for Telegram admin roles |
| Privacy mode | Disable only when the bot must inspect ordinary member messages |
| Repository | Keep secrets, databases, logs, and session files ignored |
| Test group | Test destructive commands in a separate group before production |
| Replicas | Keep one instance with long polling and SQLite |
| Deploy access | Protect the GitHub repository and hosting account with MFA |
| Logs | Never print `BOT_TOKEN`; restrict dashboard access |

The bot is defensive group-management software. Do not use it to collect private conversations, evade access restrictions, mass-message users, or perform unauthorized actions.

## 9. Troubleshooting

### The process exits with `BOT_TOKEN is required`

The platform did not receive `BOT_TOKEN`, or the variable still contains the placeholder from `.env.example`. Add the real token in the hosting provider's environment settings and redeploy.

### The deployment is active but the bot does not respond

Check the service logs for Telegram API errors. Confirm the token is valid, the bot was not started by another process using the same token, and the bot is not blocked. If the bot is in a group, confirm it has not been removed and that the group allows the relevant permissions.

### `/help` works but moderation fails

The bot must be a group administrator with the relevant permission. Reply to the target member for `/mute`, `/unmute`, `/ban`, `/kick`, `/warn`, and `/unwarn`. For `/unban`, use a numeric Telegram user ID.

### Settings disappear after redeploy

The process is writing SQLite outside the persistent mount. Check `DB_PATH` exactly:

```text
Railway: /data/saintbypass.sqlite
Render:  /var/data/saintbypass.sqlite
```

Also verify that the volume or disk is attached to the same service that runs the bot. Do not scale to multiple instances while using local SQLite.

### Railway healthcheck reports service unavailable

The current bot does not expose an HTTP health endpoint, so do not configure a Railway HTTP healthcheck for the unmodified long-polling runtime. If you add an HTTP health server later, make it listen on Railway's injected `PORT` and configure the matching path. Railway requires the health endpoint to return a successful `2xx` response during deployment.[2]

### Render asks for a port

You likely created a Web Service instead of a Background Worker. Recreate the service as a Background Worker, or add a small HTTP health server to the application before using a Web Service. The current bot does not need a public port.

### The bot sends duplicate responses

More than one process is polling with the same token. Stop all extra local, Railway, Render, or container instances. Keep only one production worker active.

### SQLite reports a locked database

This normally indicates multiple processes are using the same file or a backup is copying it during writes. Stop duplicate instances, keep one worker, and use a SQLite-aware backup procedure. If the workload requires concurrent writers, migrate to a managed database.

## 10. Release checklist

Before declaring production ready, verify the following:

- The service is connected to the intended GitHub repository and branch.
- `BOT_TOKEN` is configured as a secret and is not present in Git history.
- `BOT_OWNER_ID` is correct or intentionally omitted.
- `DB_PATH` points inside the mounted persistent storage.
- The bot runs as one long-lived process.
- The bot is an administrator in the target group.
- `/start` returns the SaintBypass banner.
- `/help` lists all 25 commands.
- Rules and welcome settings survive a restart.
- A warning, mute, pin, and lock test succeed in a test group.
- Logs show no token or private message contents.
- A backup or provider snapshot strategy exists.
- Deployment notifications are enabled.

## References

[1]: https://docs.railway.com/reference/volumes "Railway Volumes"
[2]: https://docs.railway.com/deployments/healthchecks "Railway Healthchecks"
[3]: https://docs.railway.com/deployments/reference "Railway Deployments Reference"
[4]: https://docs.railway.com/reference/volumes "Railway Volumes: Limits and Caveats"
[5]: https://render.com/docs/background-workers "Render Background Workers"
[6]: https://render.com/docs/disks "Render Persistent Disks"
[7]: https://render.com/docs/configure-environment-variables "Render Environment Variables and Secrets"
[8]: https://render.com/docs/health-checks "Render Health Checks"
[9]: https://render.com/docs/blueprint-spec "Render Blueprint YAML Reference"
