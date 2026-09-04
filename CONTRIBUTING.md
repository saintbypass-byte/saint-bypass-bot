# Contributing

Keep changes small and focused. New features belong in `src/` and should expose clear interfaces rather than reaching directly into unrelated modules. Preserve the legacy implementation until a migrated feature has equivalent behavior and tests.

Before opening a pull request, run `npm run check` and `npm test`. Do not include authentication state, pairing codes, owner numbers, private media, or environment files in commits.
