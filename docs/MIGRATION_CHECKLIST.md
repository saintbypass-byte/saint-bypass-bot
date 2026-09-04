# Migration checklist

| Area | Status | Next action |
|---|---|---|
| Imported v1 source | Complete | Preserve under `legacy/` during transition |
| Repository structure | Complete | Use `src/` for all new modules |
| Secret protection | Complete | Keep `.env` and session artifacts untracked |
| CI syntax check | Complete | Add tests and linting as modules are extracted |
| Configuration extraction | Planned | Move settings into `src/config/` |
| Command registry | Planned | Replace monolithic dispatch with registered handlers |
| Feature plugins | Planned | Extract moderation and automation independently |
| Observability | Planned | Add structured logs, health checks, and audit events |
