# Superpowers — Sportico Frontend Workflow

Source: https://github.com/obra/superpowers

## Installation

```bash
npx skills add https://github.com/obra/superpowers
```

Installed skills are symlinked under `.agents/skills/` in the project root.

## Applied workflow rules

### Inspect before editing
- Read the target file(s) before making changes
- Check related files (types, mappers, API client) before changing one layer
- Run `git status --short` at session start to understand current state

### Plan by module
Work in this order when touching a feature end-to-end:
1. Backend DTO (`src/lib/backend/dto.ts`)
2. Endpoint map (`src/lib/backend/endpoints.ts`)
3. Backend client (`src/lib/backend/client.ts`)
4. API adapter (`src/lib/api.ts`)
5. Component / page

Never skip layers or inject fetch calls directly into components.

### Small, safe changes
- One concern per change — do not combine unrelated fixes in a single edit
- Preserve existing architecture: Controller → Service → Repository pattern on backend; API layer → hooks → components on frontend
- Do not remove business logic to make a build pass — fix the logic instead

### Verify after each major batch
After every significant change:
```bash
npx tsc --noEmit   # type check
pnpm lint          # ESLint
pnpm build         # production build
```

### Do not claim completion before passing
- Never say "done" unless `pnpm build` exits 0
- If a check fails, fix the error and re-run before reporting
- Document any failures that cannot be fixed (external dependencies, confirmed backend gaps)

### Do not continue stale tasks
- At the start of each session, read `CLAUDE.md` and `docs/frontend-api-gaps.md`
- Do not blindly continue work from previous sessions without checking if it's still relevant
- Prior sessions may have created `.env.local` or changed filters that break things — verify first
