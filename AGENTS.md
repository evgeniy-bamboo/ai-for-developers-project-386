# AGENTS.md

`README.md` is the project specification.

## Tooling (mise)

Tools and tasks are defined in `mise.toml`. Run commands through mise so that they use the pinned tool versions.

First-time setup in a clone:

```sh
mise trust
mise install     # tools: pinned in `mise.toml`
mise run hooks   # Git hooks
```

| Command | Does |
| --- | --- |
| `mise run install` | Install npm dependencies. Not the same as `mise install`. |
| `mise run check` | Scan for secrets, check formatting, lint, type-check, test and build. Run before finishing a change. |
| `mise run typecheck` / `test` / `build` | Single checks |
| `mise run format` | Format code. Fixes `check:format` failures. |
| `mise run generate` | Regenerate `openapi.yaml` and code after changing `spec/` |
| `mise run check:generated` | Fail if generated code does not match `spec/`. Stage regenerated files first. |

Tasks install npm dependencies themselves when needed. `mise tasks` lists all tasks.

Run other tools as `mise x -- <command>`, e.g. `mise x -- npm install <package> -w frontend`.

### Backend folders

`.dependency-cruiser.cjs` enforces the architecture by folder in `backend/src/`: `controllers/`, `use-cases/`, `repositories/`, `domain/` (shared types, errors and pure logic), `generated/`. Other folders fail the check.

### Dev servers

Use daemons: they run in the background and `start` returns once the servers are ready. `mise run dev` blocks the terminal and uses the same ports; do not use it.

| Command | Does |
| --- | --- |
| `mise daemons start [name]` | Start `backend` (port 3000) and `frontend` (port 5173) |
| `mise daemons ls --json` | Show state |
| `mise daemons logs <name>` | Show logs |
| `mise daemons restart <name>` | Restart |
| `mise daemons stop` | Stop all. Do this when finished. |

Use `localhost`, not `127.0.0.1`, for the frontend: Vite may listen on IPv6 only.

### Git hooks

hk (`hk.pkl`) runs `mise run check:commit` on commit, `mise run check:generated` and `mise run check` on push, against the working tree, unstaged changes included. Fix failures; do not bypass hooks with `--no-verify` or `HK=0`.

Do not disable a check to get a change through. An exception covers one path and one rule, states the reason and needs the user's approval.

Hooks, agents and CI must call mise tasks, so that each check is defined once.

The hk version must be the same in `mise.toml` and `hk.pkl`. Commit `mise.lock` with version changes.

## Commits

Use [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/): `type(scope): subject`. Older history does not follow this; do not copy its style.

- Types: `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `build` (dependencies, mise, bundling), `ci` (GitHub Actions), `chore` (linters, hooks, other config).
- Scopes: `spec`, `backend`, `frontend`. Omit if none or several apply.
- A `spec/` change and the code regenerated from it go in one commit, with scope `spec`.
- Subject: imperative, lowercase first word, no period. Header at most 72 characters.
- Body: optional. Say why, not what.
