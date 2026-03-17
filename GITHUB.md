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
| 2026-03-17 | main | v0.3.2 | Beginner-friendly README, session 5 PRIMER update | post-4 |
| 2026-03-17 | main | v0.3.1 | Fix drag-to-move (AXValueCreate in HIServices) | post-4 |
| 2026-03-17 | main | v0.3.0 | Drag windows within screen boundaries | post-4 |
| 2026-03-17 | main | v0.2.0 | Window z-order mirroring | post-4 |
| 2026-03-17 | main | v0.1.1 | Latency fix + start.sh stabilisation | post-4 |
| 2026-03-16 | main | 3634a23 | Initial release — all 3 components, 50 tests, setup scripts | 4 |

---

## Branch Status

| Branch | Status | Last Updated | Notes |
|--------|--------|--------------|-------|
| `main` | ✅ Active | 2026-03-17 | v0.3.2 latest |
| `dev`  | ⬜ Not created | — | — |

---

## Release Tags

| Tag | Date | Sprint | Description |
|-----|------|--------|-------------|
| v0.3.2 | 2026-03-17 | post-4 | Beginner-friendly README + session updates |
| v0.3.1 | 2026-03-17 | post-4 | Working drag-to-move windows |
| v0.3.0 | 2026-03-17 | post-4 | Drag within screen boundaries |
| v0.2.0 | 2026-03-17 | post-4 | Window z-order mirroring |
| v0.1.1 | 2026-03-17 | post-4 | Latency fix + start.sh fix |
| v0.1.0 | 2026-03-16 | 4 | Initial release — daemon + server + PWA |

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
