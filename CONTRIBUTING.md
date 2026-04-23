# Contributing

A short guide for getting a PR merged cleanly. Read [CLAUDE.md](./CLAUDE.md) first — it covers the big picture.

---

## Setup

```bash
npm install
cp .env.example .env        # if .env.example exists, else see CLAUDE.md
npm run dev                 # runs on port 5173 by default
```

---

## Branch & commit

1. Branch from `main`:
   ```bash
   git checkout main && git pull origin main
   git checkout -b feat/my-thing
   ```
2. Commit in small, coherent chunks. Message format:
   ```
   feat: short sentence of what the PR does

   Body explaining WHY this was needed, trade-offs considered,
   any follow-ups expected in a later PR.
   ```
   Prefixes: `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `style:`, `perf:`

---

## Before opening a PR

- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] App loads and the happy path of your change works
- [ ] No `.env`, secrets, or large binary files committed
- [ ] Diff is < 1000 lines (split otherwise)
- [ ] All new strings about people use "User" — see [CLAUDE.md](./CLAUDE.md#terminology)

---

## Opening the PR

Use this template in the body:

```markdown
## Summary
<1–2 sentences of what this PR does>

## Why
<link to issue, slack thread, or paragraph of context>

## Changes
- <bullet of each meaningful change>

## Test plan
- [ ] <specific thing to click / verify>
- [ ] <edge case>
- [ ] `npx tsc --noEmit` passes

## Screenshots
<before / after for UI changes>
```

---

## Review & merge

- **1 reviewer minimum.** No self-merges. CI must pass.
- Reviewers: Maruf (FE), Shaon (BE), David (cross-cutting / auth / billing).
- Use "Squash and merge" to keep `main` history linear.
- After merge, delete the branch.

---

## Hotfixes

For genuine production-breaking bugs only:
- Branch: `hotfix/<short-name>`
- Still requires 1 review, but can ask for expedited turnaround in Slack
- Must include a test plan that exercises the specific broken scenario

---

## Rejecting the urge to ship fast

Shipping twice in a day is great. Shipping twice without review means it comes back as a bug next week. The review process exists to:
- Catch broken logic (status checks for statuses that don't exist, etc.)
- Catch missing error handling / loading states
- Spread knowledge across the team
- Force us to write test plans, which forces us to think about what the change is actually doing

If the reviewer is slow, ping them. Don't self-merge.
