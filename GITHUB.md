# DESK MIRROR — GITHUB.md

> **PURPOSE:** Track what has been committed and pushed. Enforce git discipline. The agent must update this file after every push and check it before starting work to avoid conflicts or duplicated effort.

---

## Git Rules

### Branching Strategy

```
main              ← Production-ready. Only merged via PR from dev.
├── dev           ← Integration branch. All feature branches merge here.
│   ├── feat/*    ← New features (e.g., feat/daemon-polling)
│   ├── fix/*     ← Bug fixes (e.g., fix/websocket-reconnect)
│   └── chore/*   ← Docs, config, refactoring (e.g., chore/update-deps)
```

### Commit Convention

Use **Conventional Commits** with a scope:

```
feat(daemon): add macOS window polling via pyobjc
fix(client): correct block scaling on small viewports
chore(docs): update PRIMER.md after Sprint 2
test(server): add WebSocket broadcast unit tests
refactor(client): extract colour mapping to separate module
```

### Rules the Agent Must Follow

1. **Never commit directly to `main`.** Always work on a feature branch off `dev`.
2. **One logical change per commit.** Don't bundle unrelated changes.
3. **Run tests before committing.** If tests fail, fix them in the same commit.
4. **Update PRIMER.md in every session's final commit.** This is non-negotiable.
5. **Tag milestones.** After each sprint is complete, tag: `v0.1.0`, `v0.2.0`, etc.
6. **Write meaningful commit messages.** The message should make sense to someone reading the log 6 months from now.
7. **Never force push to `dev` or `main`.**
8. **Check this file before starting.** Know what's been pushed so you don't redo work.

---

## Push Log

> Update this after every push. Most recent at the top.

| Date | Branch | Commits | Summary | Sprint |
|------|--------|---------|---------|--------|
| _TBD_ | _TBD_ | _TBD_ | _Project not yet initialised_ | 0 |

---

## Branch Status

| Branch | Status | Last Updated | Notes |
|--------|--------|--------------|-------|
| `main` | ⬜ Not created | — | — |
| `dev`  | ⬜ Not created | — | — |

---

## Release Tags

| Tag | Date | Sprint | Description |
|-----|------|--------|-------------|
| _None yet_ | — | — | — |

---

## Pre-Push Checklist

The agent must verify ALL of these before pushing:

- [ ] All tests pass
- [ ] No `console.log` debugging statements left in
- [ ] No hardcoded IPs, ports, or paths (use config/env)
- [ ] `PRIMER.md` updated with current state
- [ ] `GITHUB.md` push log updated
- [ ] Commit messages follow conventional format
- [ ] Branch name follows convention (`feat/`, `fix/`, `chore/`)
- [ ] No secrets, tokens, or credentials in any file
- [ ] `.gitignore` covers node_modules, __pycache__, .env, dist/

---

## .gitignore Template

```
# Dependencies
node_modules/
__pycache__/
*.pyc
.venv/
venv/

# Build output
dist/
build/

# Environment
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/
*.swp
*.swo
.DS_Store

# Logs
*.log
```
