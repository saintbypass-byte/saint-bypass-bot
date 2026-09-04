# Testing

The repository now has a dedicated Jest unit-testing suite for the migrated architecture. Jest tests live in `jest-tests/`, use the Node test environment, run serially for deterministic stateful tests, and collect coverage from every JavaScript module under `src/`.

Run the complete validation suite with:

```bash
npm test
```

This runs both the Jest suite and the original Node-based compatibility tests. To run only Jest with coverage, use:

```bash
npm run test:jest
```

The Jest suite covers anti-link policy and deletion, welcome and farewell greetings, settings command parsing and authorization, message middleware, persistent settings reloads, structured logging, redaction, centralized error handling, and the branding configuration. The compatibility tests remain in `tests/` while the migration continues.

GitHub Actions installs dependencies with `npm ci`, validates JavaScript syntax, and executes `npm test` on pushes and pull requests targeting `main`.
