# Architecture

## Principles

The bot is being migrated in small, reversible steps. The compatibility layer in `legacy/` remains the source of truth until an equivalent modular feature has been tested. New code should keep transport concerns, business rules, persistence, and presentation separate.

## Target flow

```text
WhatsApp event
    -> transport adapter
    -> normalized message context
    -> middleware (auth, rate limits, group policy)
    -> command or feature handler
    -> service layer
    -> response and structured logging
```

## Migration order

1. Extract configuration and secrets handling.
2. Introduce a normalized message context and structured logger.
3. Move command dispatch into `src/commands/`.
4. Move moderation and automation features one at a time.
5. Add tests around permissions, group state, and failure recovery.
6. Retire `legacy/` only after parity is verified.
