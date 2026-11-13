# Baselinq Frontend — shared dev knowledge base

Baselinq is contract administration for South African construction: payment
certificates, variation orders, notices, programme and compliance, run to
the contract (JBCC first). This file is the single source of truth for how
work happens in **this repo**. Commit changes here, not in personal notes.
Claude Code reads it automatically.

Every statement below was checked against the code. If you find one that is no
longer true, fix it in the same PR that made it untrue.

---

## Stack

- React 18 + TypeScript 5.8 + Vite 7 (SWC)
- TanStack Query v5 for server state
- React Router v6
- Tailwind CSS 3 + shadcn/ui (`src/components/ui`) — the only design system in this repo
- Axios through one client: `src/lib/Api.ts`
- Vitest 4 + Testing Library + jsdom

## Commands

```bash
npm install          # first time, and after dependencies change
npm run dev          # Vite on http://localhost:3000; proxies /api to http://localhost:8000
npm run typecheck    # MUST pass before a PR (checks tsconfig.app.json and tsconfig.node.json)
npm test             # Vitest, once
npm run test:watch   # Vitest, watching
npm run build        # production build
npm run lint         # ESLint
```

Do **not** use `npx tsc --noEmit` on its own: `tsconfig.json` has
`"files": []` and only references the app and node configs, so it type-checks
no files and always passes.

The backend (`baselinq-backend`) runs on `http://localhost:8000`.
`.env` needs `VITE_API_BASE_URL=http://localhost:8000/api/`.

## Where things live

| Path | What |
|---|---|
| `src/App.tsx` | Every route, and the guards around them |
| `src/pages/` | One file per page; `settings/` and `account/` group sub-pages |
| `src/components/<feature>/` | Feature UI: `finance/`, `programme/`, `home/`, `risk/`, `meetings/`, `documents/` … |
| `src/components/ui/` | shadcn primitives plus shared pieces (`Badge`, `EmptyState`, `PageHeader`) |
| `src/hooks/` | Data and permission hooks (`useFetch`, `usePermission(s)`, `useSelectedProjectId`) |
| `src/lib/` | Pure logic, formatting and the API client — testable without React |
| `src/test/setup.ts` | Vitest setup |

Tests sit beside the code in `__tests__/` folders.

---

## The team

- **Owner / product:** David (@Intelleqtai)
- **Frontend lead:** Maruf (@maruf1137ai)
- **Backend lead:** Shaon (@shaon-jpg)
- **Developer:** Arifuzzaman Swapnil (the `arif-dev-*` integration branches)

Reviews: Maruf reviews frontend PRs; Shaon or David approves. Anything touching
auth, billing or permissions needs David's review.

## How changes reach `main`

1. Branch from the integration branch you are building on — currently
   `arif-dev-frontend` (backend: `arif-dev-backend`). Hotfixes branch from `main`.
2. Name it `feat/…`, `fix/…`, `chore/…`, `refactor/…` or `docs/…`.
3. Open the PR against that branch. Stacked PRs are fine: say which PR each
   one sits on.
4. The integration branch is merged into `main` after QA.

CI (`.github/workflows/ci.yml`: typecheck, tests, build) runs only on PRs
into, and pushes to, `main`. On PRs into an integration branch, run all four
commands yourself and say so in the PR.

On 28 Oct 2026 a merge of arif-dev into `main` was reverted. On 9 Nov both
integration branches merged `main` back in to supersede that revert, so
`main` is an ancestor of them again. Don't re-merge or revert either side
without checking `git merge-base --is-ancestor origin/main <branch>`.

---

## The domain

### Terminology — use these only

| Concept | Correct term | Never use |
|---|---|---|
| A person on the platform | **User** | personnel, member, team member, colleague, appointee, peer |
| A person's employer | **Company** | organisation (UK spelling is fine in legal copy) |
| A company attached to a project | **Associated Company** | Appointed Company |
| A person on a call | **Attendee** (meetings only) | — |
| A role on a project | **Role** | position |
| The client who pays | **Employer** | owner (except the "Client / Owner" role) |

Before adding a person-noun, grep for existing uses and default to *user*.

### The core model

```
User → belongs to → Company
Project → has many → Associated Companies → have Users (via project team membership)
Meeting → has many → Attendees (Users)
```

### JBCC is not a foreign contract with local names

Verified against JBCC PBA Ed 6.2:

- **Variation Order stays.** JBCC's own instrument of change is a **Contract
  Instruction** (cl 17.1), but the client wants Variation Order on every
  project (David, 11 Nov 2026). Don't rename it without David's say-so.
- **"Retention" stays for now.** Clause 11 provides security (a guarantee,
  optionally with a payment reduction). The client is being asked which word
  they want; don't change the copy until they answer.
- **The payment clock runs from the date *for* issue** of the certificate,
  not the date it was issued: 14 calendar days private, 21 for an organ of
  state.
- **Notices come in pairs:** time (cl 23.4.2) and money (cl 26.5), each 20
  working days, each forfeiting on its own. Working days exclude weekends,
  public holidays and the builders' break.
- **A payment certificate is not a tax invoice.** The contractor issues one
  (VAT Act s20). A missing invoice does not delay payment under JBCC; under
  GCC 2015 it does.

### Money rules the client has decided (meeting, 10 Nov 2026)

- Baselinq's fee is 1% of the amount certified excl. VAT, after security (charged when security is released), **not reduced by penalties**. No fee on a zero or negative certificate, and never a refund. The rate is uncapped. A rate below 1% needs board approval.
- Baselinq invoices the **employer** monthly, on 14-day terms. A project 30 days overdue becomes read-only.
- The employer uploads proof of payment; the contractor confirms receipt.
- The employer's login is read-only on the money. The QS and PM own the figures.
- Variations are paid only through the next interim certificate, never invoiced on their own.
- A project's money stays in its own currency. Baselinq's fee is in rand.

---

## Status values — the backend is the source of truth

Before checking a status, confirm the backend emits it.

- **Meeting** (`meetings/models.py`): `scheduled | live | completed | cancelled | no_show`.
  AI artefacts have their own field, `artefact_status`:
  `none → processing → transcribed → notes_ready` (or `failed`). Show progress from it.
- **Payment certificate**: read **`workflowState`** (`draft | submitted |
  approved | posted | rejected | cancelled`). **Posted** means certified and
  owed. The legacy `approvalStatus` is a free-text label that still says
  "pending" on posted and rejected certificates. Never decide anything from it.
- **Tasks** (RFI, VO, SI, DC, CPI): each model has its own choices. Read the model.

If you are checking a status the backend doesn't define, you are confusing UI
state with stored state. Add a field, don't invent a value.

---

## Architecture rules

### Data

- Every call goes through `src/lib/Api.ts`: the axios instance, plus
  `fetchData`, `postData`, `patchData` and friends. No new axios instances.
  Token refresh lives in its interceptor.
- `useFetch(url)` keys its query by **the URL** (`queryKey: [url]`). So
  `invalidateQueries({ queryKey: ["tasks"] })` matches nothing. Invalidate
  with a predicate on the URL:
  `invalidateQueries({ predicate: (q) => typeof q.queryKey[0] === "string" && q.queryKey[0].startsWith("projects/") })`.
- TanStack v5 takes filters, never a bare array.
- The selected project is `localStorage.selectedProjectId`, announced with a
  `project-change` event. Read it with `useSelectedProjectId()`, which
  re-renders on change, not with a one-off `localStorage.getItem`.
- Name API wrappers after their URL (`auth/invite-user/` → `inviteUser`).

### Permissions

- Access comes from the server's Roles & Permissions matrix.
  `usePermission(code, projectId)` gives one code;
  `usePermissions().can(flag)` gives the named flags.
- Never decide access from a list of role names in a component.
- Where the server returns a capability (`canEdit`, `canConfirm`,
  `canRecordPayment`, `availableTransitions`), use it rather than
  re-deriving it.
- Routes nest `ProtectedRoute` (signed in) → `RoleRoute` (permission) →
  `ProjectProtectedRoute` (a project selected), all in `src/App.tsx`.

### Figures

- **One definition per figure.** When a number appears on more than one
  screen, compute it once (on the server, or in a shared function in
  `src/lib/`) and read it everywhere. Never recompute it in a component.
  Two screens disagreeing about "certified to date" is a defect.
- **Say the VAT basis.** Contract figures are excl. VAT; money owed and paid
  is incl. VAT. Label which one.
- **Absent is not zero.** A failed or loading request renders as unknown,
  never `R 0,00`.
- **Format money only through `src/lib/formatCurrency.ts`:** non-breaking
  spaces, decimal comma (`R 1 234 567,89`). Never `toLocaleString(undefined)`;
  it changes with the viewer's browser.
- Dates go through `src/lib/dateUtils.ts`.

### Errors and async

- Every API call in a component has a visible error path: `toast.error` or
  an inline message. No silent `catch {}`.
- Optimistic updates roll back on failure.
- Long-running work (AI generation, document parsing, bots) shows its status.
  It's never a silent wait.
- Never block the UI thread with heavy synchronous work.

---

## UI conventions

The app has one design system: Tailwind and shadcn/ui, with these rules on top.

- **Blue (primary) is for the one primary action on a view.** Row actions
  and links are outline or plain text.
- **Status badges use `Badge`'s semantic variants:** `success`, `warning`,
  `danger`, `info`, `neutral`. Don't hand-roll colour classes.
- **`EmptyState` descriptions are one sentence of 110 characters or fewer.**
  A test enforces this.
- **Use `PageHeader` for page titles and one underline tab rail for tabs.**
  No filled or black segment controls.
- **Figures never wrap mid-number:** use `whitespace-nowrap` and
  `tabular-nums` on money.
- **Copy says what is true and what to do.** Name the missing field, the
  certificate or the deadline. A button's label matches what it does: no
  "Generate AI X" button that asks for manual input.

---

## Testing

- Vitest and Testing Library. Run `npm test`.
- Test behaviour a user or the API would notice, not implementation details.
- Mock hooks at the module boundary (`vi.mock("@/hooks/useFetch", …)`).
- A mock must return **stable references**: one array or object for every
  render, as React Query does. A fresh `[]` on each call re-runs effects
  forever and hangs the test.
- Bug fixes come with a test that would have caught the bug.

---

## PR rules

1. Keep it under **1,000 lines**. Split larger work into stacked PRs. Exceptions need David's approval.
2. Every PR needs one review before merge. **Never merge your own PR.**
3. `npm run typecheck`, `npm test` and `npm run build` pass. Say so if CI doesn't run on your base branch.
4. The PR body says what changed, why (link the issue or decision), and gives a test plan. UI changes include screenshots.
5. Commit prefixes: `feat:` (user-visible), `fix:`, `refactor:` (no behaviour change), `chore:`, `docs:`. The body says *why*; the diff shows what.

## Never do

- Push to `main`, or merge your own PR.
- Commit `.env` or anything holding a secret.
- Add an npm dependency without checking its bundle impact.
- Rename an API response field without the matching backend change: both land together, or behind a flag.
- Ship UI that depends on backend data without handling loading, empty and error states.
- Use `npx tsc --noEmit` as proof of a passing typecheck.
- Decide anything from a payment certificate's `approvalStatus`.

---

## Known tech debt

Kept short so nobody rediscovers it. Remove an item when it's fixed.

- **No task queue on the backend.** LLM calls, emails and risk evaluation run
  in request threads or daemon threads. Scheduled work (risk sweep,
  certificate drafts, exchange rates) runs on systemd timers. Those are
  installed by the EC2 deploy job, which has been failing, so confirm they
  run before relying on them.
- **"Generate AI Notes" still asks for a pasted transcript,** although
  Recall.ai bots join meetings and `artefact_status` tracks the pipeline.
- **Terminology is part-migrated.** Older files still say member and
  personnel, and some backend response fields keep those names until a
  coordinated rename.
- **No end-to-end tests.** Unit and component tests only.
- **Mobile layouts are not finished;** desktop comes first.
- **Unused code awaiting a decision:** `components/Communications/chats.tsx`
  and `viewTask.tsx` (imported nowhere), and `header/createDocument.tsx`
  (imported but never rendered; its save is a stub).

## When you get stuck

1. Grep first: `grep -rn "thing" src/`.
2. Read the backend model: `../baselinq-backend/<app>/models.py`.
3. Ask in Slack: Maruf owns frontend, Shaon owns backend.
4. If you are using Claude Code, paste the code and the error. Don't guess.
