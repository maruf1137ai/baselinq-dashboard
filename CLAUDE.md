# Baselinq Frontend — shared dev knowledge base

This file is the single source of truth for how work happens in this repo.
Commit here, not in personal notes. Claude Code reads this automatically.

---

## Stack

- React 18 + TypeScript + Vite
- TanStack Query for server state
- React Router
- TailwindCSS (production pages)
- Custom **arch** CSS variables (v5 pages — see below)
- Axios (`src/lib/Api.ts`) — single API client

## Commands

```bash
npm install          # first time / after deps change
npm run dev          # Vite dev server (default port 5173; use --port 3500 for testing)
npx tsc --noEmit     # typecheck — MUST pass before opening a PR
npm run build        # production build
npm run lint         # ESLint
```

Backend companion repo runs locally on `http://localhost:8000/api/`.
`.env` must have `VITE_API_BASE_URL=http://localhost:8000/api/`.

---

## The team

- **Frontend lead:** Maruf (@maruf1137ai)
- **Backend lead:** Shaon (@shaon-jpg)
- **Owner / product:** David (@Intelleqtai)

Pair reviewers:
- Maruf reviews frontend PRs → Shaon or David approves
- For big frontend changes touching auth, billing, or permissions, David must review

---

## Terminology — use these ONLY

| Concept | Correct term | Never use |
|---------|--------------|-----------|
| A person on the platform | **User** | personnel, member, team member, colleague, appointee, peer |
| A person's employer | **Company** | organisation (UK spelling fine for legal copy) |
| A company attached to a project | **Associated Company** | Appointed Company |
| A person on a call | **Attendee** (meetings only) | — |
| A role on a project | **Role** (not "position") | — |

Before adding any person-noun to the codebase: grep for existing uses, and default to `user`.

## The core model

```
User → belongs to → Company
Company → has many → Users
Project → has many → Associated Companies
Associated Company → has many → Users (via project team membership)
Meeting → has many → Attendees (where Attendee is a User)
```

---

## Status enums — source of truth is the backend

Before checking a status, confirm it's a value the backend actually emits. Common mistakes live in this codebase already (e.g. `meeting.status === "completed"` — this status does **not** exist, it's `held`).

**Meeting** (`meetings/models.py`):
- `scheduled` | `held` | `cancelled`
- Everything else (`completed`, `occurred`) was either dead code or intended for an `ai_status` field that doesn't exist yet

**Tasks** (`tasks/models.py`) — RFI, VO, SI, DC, CPI each have their own choices. Check the model.

**Rule:** If you find yourself checking a status the backend doesn't define, you're probably confusing UI state with DB state. Add a new field for UI state, or fix the backend.

---

## Architecture rules

### API calls
- All API calls go through `src/lib/Api.ts` (the axios instance)
- Never create new axios instances in components
- Token refresh is handled by the response interceptor — don't reimplement
- Keep wrapper function names close to their URL (e.g. wrapper for `auth/invite-user/` should be `inviteUser`)

### Async work
- Never block the UI thread with synchronous heavy work
- Expensive server work belongs in a queued backend task, not in-line in a request
- Long-running processes (AI generation, document parsing, bot webhooks) must show status to the user — never silent waits

### Error handling
- Every API call in a component needs a visible error path (`toast.error` or inline alert)
- No silent `catch { }` that swallows errors
- Optimistic updates must have rollback on failure

### Routing
- All routes declared in `src/App.tsx`
- Permission wrappers: `ProtectedRoute` (auth) → `RoleRoute` (permission) → `ProjectProtectedRoute` (has selected project)

---

## v5 design system — separate from production components

There are two design systems in this repo. They don't mix.

### v5 pages (the new design)
- Use **only** arch CSS variables: `var(--arch-fg)`, `var(--arch-bg)`, `var(--arch-border)`, `var(--arch-stone)`, `var(--arch-dim)`, `var(--arch-font-mono)`, `var(--arch-font-main)`
- Or classes from `styles/project-detail.css`
- **Never** import production components into v5 pages:
  - `components/tasks/*`
  - `components/project/ProcurementTable.tsx`
  - `components/project/ProcurementRow.tsx`
  - `TaskModal`, `ListView`, `TimelineView`, `StatusBadge`, `TypeChip`, `Avatar`
- **Never** use Tailwind utility classes in v5 (`bg-white`, `rounded-xl`, `text-gray-600`, etc.)
- If a feature exists in production, **reuse the logic** (hooks, API calls, data flow) but **rebuild the UI** in arch style

### Production pages (the existing design)
- Tailwind + shadcn/ui as currently used
- Don't pull arch vars into production pages

---

## PR rules

1. **Branch from latest `main`.** Rebase if you're behind.
2. **Branch naming:** `feat/...`, `fix/...`, `chore/...`, `refactor/...`
3. **PR size ceiling: 1000 lines.** Split larger features. Exceptions need approval from David.
4. **Every PR requires 1 review before merge.** No self-merges. Ever.
5. **`npx tsc --noEmit` must pass.** CI will enforce this.
6. **Every PR body includes:**
   - What changed (1-2 sentences)
   - Why (link to issue / context)
   - Test plan (bullet list of what to verify)
   - Screenshots for UI changes
7. **Commit messages:**
   - `feat:` new user-visible feature
   - `fix:` bug fix
   - `refactor:` no functional change
   - `chore:` tooling, deps, CI, non-product
   - Body should explain *why*, not *what* (the diff shows the what)

---

## Never do

- Don't push directly to `main` (branch protection will block this anyway)
- Don't merge your own PR
- Don't commit `.env` files or any file with secrets
- Don't add a new npm dependency without checking bundle impact
- Don't rename an API response field without also renaming it on the backend — these must land together or behind a feature flag
- Don't add UI that depends on backend data without handling the null / loading / error states
- Don't add a "Generate AI X" button that actually accepts manual input — the label must match the behaviour

---

## When you get stuck

1. Grep first: `grep -rn "thing"` in `src/`
2. Read the backend model (`../baselinq-backend/<app>/models.py`)
3. Ask Maruf or Shaon in Slack — they own frontend / backend respectively
4. If using Claude Code, paste the relevant code + error into the chat — don't guess

---

## Known tech debt (short list)

These are documented so we don't re-discover them:

- No Celery / task queue on backend → LLM calls block HTTP handlers
- Meeting `ai_status` field doesn't exist → UI has no way to show "Transcribing..." / "Generating..." / "Ready"
- "Generate AI Notes" dialog still requires manual transcript paste despite Recall.ai integration
- Terminology ("user") partially migrated — still find old names in older files
- No E2E tests, no unit tests
- No CI beyond typecheck (this PR adds typecheck)
- Backend response field names still say `members`, `team_members`, `personnel` — scheduled to rename in a future PR
