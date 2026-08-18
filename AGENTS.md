# Agent instructions

`CLAUDE.md` is the single source of truth for this project. Read it first, then this file.

## Ownership boundaries

This repository is worked on by more than one agent, sometimes in parallel git worktrees. Staying inside your boundary is what keeps merges clean.

**UI agent** (Antigravity — branches `feature/ui`, `feature/admin`) owns:
```
app/**/page.tsx
app/**/layout.tsx
components/marketplace/**
components/admin/**
messages/*/admin.json, messages/*/marketplace.json
```

**Core agent** (Claude Code — branches `main`, `feature/ai`) owns:
```
supabase/migrations/**
supabase/seed/**
lib/db/**
lib/ai/**
actions/**
tests/**
docs/**
```

**Shared — change only on `main`, never on a feature branch:**
```
app/globals.css        (Tailwind v4 @theme block)
components/ui/**       (shadcn primitives)
lib/types/**
lib/format.ts
package.json / package-lock.json
```

## Rules that prevent merge pain

- Migrations have exactly one author (the core agent). A UI branch must never add a migration — schema drift between worktrees is the hardest failure to diagnose.
- Add a dependency on one branch only. If both branches need it, add it on `main` first.
- Namespace i18n files per feature. Do not create a single monolithic `en.json`.
- Rebase onto `main` at least twice per work session.
- Run `npm run typecheck && npm test` before every merge, on both branches.

## If a task requires crossing the boundary

Stop and say so. Do not edit files you do not own, and do not create a parallel implementation to avoid the boundary — that is how two competing abstractions end up in one codebase.
