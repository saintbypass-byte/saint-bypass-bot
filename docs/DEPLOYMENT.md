# Automated deployment

The repository includes two controlled GitHub Actions workflows. Both run the complete test suite before deployment and can be started manually from the Actions tab or automatically when a GitHub release is published.

| Target | Workflow | Required secrets |
|---|---|---|
| VPS | `.github/workflows/deploy-vps.yml` | `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `VPS_APP_PATH`; optional `VPS_PORT` |
| Heroku | `.github/workflows/deploy-heroku.yml` | `HEROKU_API_KEY`, `HEROKU_APP_NAME`, `HEROKU_EMAIL` |

## VPS setup

Clone the repository on the server at the path stored in `VPS_APP_PATH`, install Node.js 20 or newer, and install the service template at [`deploy/saint-bypass-bot.service`](../deploy/saint-bypass-bot.service). Create `/etc/saint-bypass-bot.env` with production values and configure the deployment SSH user to run the specific `systemctl restart saint-bypass-bot` and `systemctl is-active saint-bypass-bot` commands without an interactive password prompt. The workflow fetches the selected release, installs dependencies, restarts the service, and verifies that it is active.

Keep the WhatsApp authentication directory and `data/settings.json` outside the repository or in protected server paths. Do not store pairing data or secrets in GitHub source files.

## Heroku setup

Create a Heroku app with a worker process. Add the three Heroku secrets to the GitHub repository or its `production` environment. The [`Procfile`](../Procfile) starts the bot as a worker, which is appropriate for an always-on WhatsApp client rather than an HTTP web process.

Heroku's filesystem should not be treated as a durable location for WhatsApp authentication state or settings. Use a suitable external persistent store or volume strategy before relying on Heroku for production sessions; otherwise, the bot may require relinking after a dyno replacement.

## Release process

Run tests locally with `npm test`, publish a GitHub release, and choose exactly one deployment target workflow if both environments are configured. The workflows use production environment protection and concurrency locks so overlapping deployments to the same target are not run simultaneously.

The VPS workflow uses SSH credentials and the Heroku workflow uses an API key. Store all credentials as GitHub Actions secrets, restrict who can approve the production environment, and rotate keys periodically.
