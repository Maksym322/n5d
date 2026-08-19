# Agent instructions

`CLAUDE.md` is the single source of truth for this project. Read it first, then this file.

## How this was built

Single-agent build: **Claude Code (Opus)** wrote effectively all of the code on one branch.
**Antigravity** was used only in phase 0, to inspect the reference marketplace and produce
`docs/design-audit.md` — it wrote none of the application code. An earlier plan for two agents in
parallel worktrees was dropped before implementation; the guardrails below are the conventions that
actually governed the build and still apply to any future contributor.

## Guardrails

**Migrations have exactly one owner and one home.** Schema changes go **only** into
`supabase/migrations/**`, append-only — never edit an applied migration, and never introduce a
schema change anywhere else. Regenerate `lib/types/database.ts` after every schema change.

**Treat these files as shared surface — change them deliberately, not incidentally:**
```
app/globals.css        (Tailwind v4 @theme block)
components/ui/**        (in-house UI primitives — ADR-17; do not restructure after the foundation phase)
lib/types/**           (generated database types)
lib/format.ts          (money/date/ticket formatting)
package.json / package-lock.json   (one lockfile, npm only — never add a second)
```

**Other conventions:**
- Add a dependency deliberately and only when needed — the project intentionally runs on a small
  dependency set (ADR-17).
- Namespace i18n files per feature (`messages/*/marketplace.json`, `.../admin.json`, …). Do not
  create a single monolithic `en.json`.
- Run `npm run typecheck && npm run lint && npm test` before reporting a task complete.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
