Hi Maruf, Shaon, Swapnil,

This is the full hand-over: finance and notices, the security fixes, and a set of safety-net PRs built overnight. It covers what to do on the servers today, what to review and in what order, how everything was tested, and what's waiting on David.

Nothing has been merged or deployed. Every change is its own PR, so any one can be reverted alone.

---

## 0. Urgent, today: production (Shaon + whoever has server/AWS access)

Step-by-step runbooks for each item are in **backend #122** (`docs/ops/`). Each one has the commands, how to check, and how to roll back. Start with its README, step 0: confirm which host is live, EC2 or Railway.

1. **Close `/media/` (runbook 02).** Uploaded proofs of payment, tax invoices and attachments are publicly readable. Django also serves `/media/` from `urls.py` whatever `DEBUG` is, so add `location /media/ { return 404; }` in nginx. That closes both.
2. **Pause sign-up and `invite-client` (runbook 01).** Both allow account takeover until #103 deploys. The same nginx edit also blocks `setup-admin-once`. David approves the message users see.
3. **Take a disk snapshot now, then check the timers (runbooks 05 and 06).** The EC2 deploy workflow has **never** succeeded: 126 runs, 0 green, with SSH timing out on port 22. So its pre-deploy backup and its timer installs have never run. There may be no usable backup, and the time-bar and escalation sweeps are probably not running. Check with `systemctl list-timers 'baselinq-*'`.
4. **Rotate secrets (runbook 03).** The JWT key *is* `SECRET_KEY`, so rotating it signs everyone out: pick a quiet time. `must_change_password` isn't enforced, so a forced reset needs the small code change the runbook describes.
5. **Purge the git history (runbook 04 + its script).** It removes `db111.sqlite3`, `TEST_USERS_CREDENTIALS.md`, three other databases and `logs/django.log`, which holds user emails.
   - Dry run on a local copy: 78 of 78 branches rewritten, 55 MB down to 22 MB, every file gone, 94 seconds.
   - All 39 open PRs keep identical diffs, provided every branch is pushed together.
   - Do it **after** the finance stack merges, and push any local-only branches first.
6. **Off-server backups (backend #115, runbook 05).** Encrypted nightly dumps to a versioned S3 bucket in Cape Town, then a restore drill.
7. **Fix the EC2 deploy (runbook 07).**
8. **Check `task.create` exists in the production database.** Migration `user/0050` says an aborted migration deleted it in one environment. #123 gates Critical Path Item creation on it, so if the row is missing the API refuses CPI creation to everyone. The app itself offers no CPI creation, so screens are unaffected.
9. **Pin the AI libraries.** `requirements-railway.txt`, which the Railway Dockerfile installs, says `openai>=1.0.0` and `anthropic>=0.18.0`. A fresh build would pull openai 3.x and anthropic 2.x, which nobody has tested. Run `pip freeze | grep -iE 'openai|anthropic'` on the live server and pin those exact versions in `requirements.txt` and `requirements-railway.txt`.

### Security PRs: review and deploy these first

| Fix | Backend | Frontend | Base |
|---|---|---|---|
| Invitations need project authority; existing accounts sign in to accept; sign-up can't choose admin roles | #103 | #102 | `main` |
| Company and user endpoints scoped to your own company; ID and bank numbers masked | #104 (needs #103) | #103 | `main` |
| ID numbers also masked on the project record and in the company lookup | #121 (on #104) | — | #104's branch; retarget to `main` after #104 |
| Organisation settings read-only for people who can't change them, instead of a false "Saved" | (pairs with #104) | #110 (draft, needs David's sign-off) | `main` |
| Uploaded files no longer public: signed, expiring downloads; `/media/` route removed | #105 | — | `main` |
| No more superuser by default: `setup-admin-once` removed, and the deploy script no longer creates an admin on every deploy | #106 | — | `main` |
| Tax invoices and proofs type-checked, served as downloads, refused to deactivated accounts | #107 (includes #105) | — | `arif-dev-backend` |
| Proof and tax-invoice links open the file, not the app | — | #109 | `arif-dev-frontend` |
| RFI and SI creation checks permission and project membership; they can't be moved to another project | #112 | — | `main` |
| Critical Path Item creation checks permission (`task.create`) and project membership; a CPI can't be moved to another project | #123 (**permissions: David to review**) | — | `main` |

**Re-checked overnight by fresh reviewers.** Each new problem was proven with a failing test before it was fixed, and each fixed PR has a comment saying what changed:
- **#103:**
  - signing in silently joined you to any company that had listed your email, so a stranger could pull you into their company;
  - a mixed-case email was shown the new-account form;
  - an existing company-admin account accepting a colleague's invite became that company's administrator.
- **#104:** a user the invite endpoint refused could still invite people through their own account's `team_invites`.
- **#106:** `scripts/create_default_admin.py` ran on every deploy, switched on by default, with a password written in the repo.
- **#107:**
  - a deactivated account's proof and tax-invoice links still worked;
  - the PDF check refused real PDFs that have bytes before the header.
- **#112:** you could create an RFI on your own project, then move it onto another with `PATCH {"project": …}`.
- **#105, FE #102, FE #103:** sound, no changes.

**Deploy order:** frontend first (#102, #103, #110), then the backend.

**What clients will notice:**
- existing users open the invite link and accept, rather than being joined just by signing in;
- invites sent by someone who has left the project need re-sending;
- file links download and expire after an hour;
- people who can't edit Organisation settings see them read-only.

**Size:** backend #103 is now about 1,700 lines, most of them tests, so it needs David's exception.

**Merge conflicts to expect:**
- **#106 with `arif-dev-backend`:** one, on the import line in `user/urls.py`. Take arif's side.
- **Frontend #109 and #94:** merge #109 first. #94 then has one conflict in `PaymentPositionSection.tsx`: keep #94's block and wrap both links in `resolveApiUrl`.

---

## 1. Safety-net PRs (tests, CI, tooling): no client impact, merge any time

These protect what clients already like: permissions, RFIs, tasks, alerts and the homepage. They change no app code, except #116, which is superuser-only.

| PR | What it does | Base | Note |
|---|---|---|---|
| backend #117 | CI runs the full suite on **MySQL 8 and SQLite** for PRs into every branch, and compares the two | `main` | Report-only for now. First run: MySQL 2,171 pass / 48 fail, SQLite 2,207 / 12. Of the 36 MySQL-only failures, 7 are real gaps (below) and 29 are a test artefact ("server has gone away") |
| frontend #105 | CI runs vitest and the typecheck for PRs into every branch, not just `main` | `main` | Vitest is report-only until the 21 failures already on `main` are fixed |
| backend #114 | Role-regression tool. It compares production with any branch, role by role: permissions, 157 endpoints, capability flags, alert recipients | `main` | Run `tools/role_regression/run.sh origin/main <branch>` before any merge to `main`. It's 2,478 lines, nearly all harness. Today, `main` vs `arif-dev` shows 70 unexpected rows, all fixed by #108–#110 |
| backend #118, #119, #120 | Behaviour-lock tests: RFIs and task types, who each alert reaches, what each role may do | `main` | 122 tests, all passing on `main`. On `arif-dev`, 3 fail because of the VO-approval PIN (see §6) |
| frontend #106, #107, #108 | Behaviour-lock tests: the homepage, the task board, the RFI view | `main` | 61 tests, all passing on `main`. On `arif-dev`, 3 homepage tests fail because of the label changes (see §6) |
| backend #116 | Every scheduled job records that it ran; the superuser health page shows all timers and flags late ones | `arif-dev-backend` | One reversible migration (a new `scheduled_jobs` app). When #89 lands, `refresh_exchange_rates` needs the one-line decorator; a test enforces it |
| backend #115 | Off-server encrypted backups and a restore script | `main` | Does nothing until someone installs it (runbook 05) |
| backend #122 | The ops runbooks above | `main` | Docs only |

**After merging the CI PRs,** bring the workflow commits into `arif-dev-backend` and `arif-dev-frontend` too. Until then, PRs into those branches still get no checks.

**Neither `main` has branch protection.** David (GitHub admin) should switch it on, with the CI checks required once they're green.

---

## 2. What's already merged, and PRs to close

`main` is unchanged since the 28 Oct revert. None of the finance work is live.

These are **already inside `arif-dev`** (merged as branches), so please close them as merged:
- frontend #68, #69, #70, #71, #72, #73, #74, #75, #76, #77
- backend #77, #78, #79, #80, #81, #82, #83, #84, #85, #86

These were **superseded** by later work (their code exists in `arif-dev` in fuller form), so please close them:
- frontend #59 and #60 (already in `main`), #63 (admin width), #64 (certificate payment UI)
- backend #73 (payment terms follow contract type)

---

## 3. Finance and notices: review and merge order

**Step 1: permission fixes into `arif-dev` (these block `arif-dev → main`).** `user/0077`, already in `arif-dev`, silently removes certificate rights from seven roles. The Principal Agent also loses approval, and under JBCC the PA certifies. Each fix is its own permissions PR, and **David reviews them**:

| PR | Fixes | Base |
|---|---|---|
| backend #108 | **Blocker.** Restores certificate create/approve for ARCH, ELEC_ENG, MECH_ENG, PRINCIPAL_AGENT, SE, STRUCT_ENG and SUPER_USER, without opening Finance to them. Adds `user/0081`, so merge it right after Shaon's `user/0080` | `arif-dev-backend` |
| backend #109 | LEGAL is no longer treated as the contractor for payment alerts | `arif-dev-backend` |
| backend #110 | The Cost Ledger answers to `finance.cost_ledger.view`, so Employer, Contractor and MC no longer see it or the Baselinq fee row | `arif-dev-backend` |
| backend #111 | Removes the leftover contractor-side billing-view rows from the 0072 backfill. Adds `billing/0069` | `arif-dev-backend` |
| backend #113 | Only the employer side (plus Baselinq support) can verify or report a bank-detail change. ADMIN and PROJECT_ADMIN lose it, because they only had it through role aliases. David to confirm | on #96 |

With these merged, the role comparison shows **0 unexpected differences from production**. One deliberate change: Shaon's 6d41a89 removes the contractor side's read access to Baselinq invoices and fees.

**Step 2: the open finance stack** (up to date with `arif-dev` as of 11 Nov, mergeable):
- frontend #78 → #79 → #80 (paired notices → bank-detail hold → multi-currency)
- backend #87 → #88 → #89
- Please retarget frontend #78 and backend #87 to `arif-dev-*`, since everything below them is already in.

**Step 3: the feature PRs**, all based on the stack above (frontend #80 / backend #89):

| Feature | Backend | Frontend | Notes |
|---|---|---|---|
| Certified / Remaining on the variation register | #90 | #89 | FE safe to deploy first |
| One email when a certificate is certified, in the project's currency | #91 | — | fixes the duplicate between e5f8eb4 and 0262172 |
| Month-end invoice timer | #92 | — | needs the timer installed |
| The contractor confirms a payment, never records one | #93 | — | **permissions: David to review** |
| JBCC: Contract Instruction wording | #94 | #90 | **On hold, don't merge (draft):** the client wants Variation Order kept |
| JBCC: Payment reduction (security), not "retention" | #95 (on #94) | #91 (on #90) | **On hold, don't merge (draft):** waiting on the client's answer |
| Bank-detail change: every field, verify by phone or report fraud | #96 | #95 | **ship together** (verify now needs contactName/calledAt); FE #95 sits on FE #87 and #86 |
| Record payment shows the payee's account | (in #96) | #92 (on FE #95; also contains #85) | |
| Contractor confirms receipt, can correct within 14 days | #97 (on #96) | #94 (on FE #92) | merge FE #109 first (see §0) |
| One tax-invoice path, honest copy | — | #93 | |
| Notice deadlines: urgency colours | — | #96 | blocker fix |
| Notice deadlines: record service, on-time verdict | #98 (on #96) | #97 | BE about 1,270 lines: David's exception |
| Notice deadlines grouped by event, time+money pair | (in #98) | #98 | |
| Contractor records service of its own notice | #99 | #99 | **permissions: David to review** |
| Delay claim: clocks run from awareness, not the notice date | #100 | #100 | migration `tasks/0083` after #96's `0082` |
| 40-working-day steps carry no forfeiture | #101 | #101 | |
| Notice lapse sweep timer | #102 | — | needs the timer installed |
| Smaller fixes | — | #83, #84, #85, #86, #87, #88 | invoice test wording, approve toast, any-currency payments (blocker), fee rate label, estimated lateness, register dates |

The backend notice chain (#98–#102) is stacked on #96 so the migrations stay in one line. #98 also contains #108, because #99's `user/0082` depends on #108's `user/0081`. Merge #108 first, then the table in order, and each app keeps a single migration leaf.

**Brought up to date with `arif-dev`** (11 Nov; conflicts resolved keeping both sides):
- **Backend** (includes 982f400, 6d41a89 and 7760805): the lock enforcement and own-role contractor checks; the payee block, bank-check outcomes and receipt correction, all under the lock; the paginated alerts carrying `bankChange` and who may verify.
- **Frontend** (includes 9bb01dc, 4eedbab and e6c0be7): paginated Needs attention with the bank Verify dialog; locked certificate actions hidden; your receipt-control styling; the fee title from `currentRatePct`.

One choice to check: the receipt row's "Yes, received…" is primary, following e6c0be7, although CLAUDE.md says row actions are outline.

**Step 4: tooling PRs into `main`:** frontend #81 (the typecheck checks 516 files, not 0, and fixes the 15 errors it finds) and #82 (CLAUDE.md corrected, including "keep Variation Order").

---

## 4. How this was tested

- **Frontend:** all 19 finance and notices frontend PRs merged together on `arif-dev` (11 Nov): no conflicts, typecheck unchanged (15 existing errors, fixed by #81), **1,309 tests pass**.
- **Backend:** `arif-dev` (11 Nov), plus the 5 permission fixes, the 13 feature PRs and #113: 18 merges, no conflicts, one migration leaf per app, and `migrate` runs on a fresh database.
  - **Full suite: 2,052 pass / 75 fail, against `arif-dev` alone at 1,745 / 110.** No new failures from our PRs. The remaining failures are fixtures that predate `user/0077`, plus a known SQLite-lock flake.
- **End to end:** on the fully merged code with a fresh demo database (email, push and S3 off): QS certifies, the tax invoice drafts itself, the 1% fee is charged, the employer records payment with proof, and the contractor confirms. Notice deadlines are grouped, counted from awareness, the contractor records service, and the server gives the on-time verdict.
- **Role regression:** production vs the combined new code: 3,613 differences, 3,604 intended (each traced to a commit), 9 pre-existing (fixed by #112), **0 unexpected**.
- **Overnight:**
  - each security fix was proven with a failing test first;
  - the behaviour locks pass on `main`;
  - the first MySQL CI run is in §1.
- **Still needed before `arif-dev → main`:** restore an anonymised production dump to staging and run every migration on MySQL.

---

## 5. Known gaps, not in these PRs

- **MySQL lets through duplicates the code thinks are impossible** (found by #117): a second live approval chain, a duplicate active fee charge, a second draft invoice, two cost-ledger debits for the same Variation Order, and others. That's 14 conditional unique rules Django skips on MySQL. The fix needs MySQL-safe unique keys.
- **Security leftovers:**
  - task and channel attachment links still work for a deactivated account until they expire;
  - users can register S3 keys without an ownership check;
  - `tasks/{id}/update-entity/` on `main` still lets a document move to another project (already fixed on `arif-dev`).
- **Billing lock:** check every remaining write control; make the banner role-aware; warn before the lock; lock only after confirmed invoice delivery.
- **Late-payment interest:** needs the SARB repo rate fetched automatically.
- **Cash-flow forecast:** should come from the programme.
- **Alert copy:** some shows raw amounts ("ZAR 1713380.40") and internal terms.
- **Builders' break:** can't be set, so deadlines over the December shutdown will be wrong. Needed before 15 Dec.
- **Clause numbers:** some show "clause unverified" until a QS confirms them against JBCC PBA 6.2.

---

## 6. Waiting on David

- **Permission reviews:** #108–#111, #113, #123, #93, #99 and FE #99.
- **Size exceptions:** backend #98 and #103, frontend #97, and #114 (tooling).
- **Sign-off on visible changes:** FE #110 (Organisation settings read-only).
- **Changes already in `arif-dev` that clients will notice, to confirm before `arif-dev → main`:**
  1. Approving a Variation Order now needs a signing PIN. On production a Client or PM can approve without one, so every Client and PM would need a PIN first.
  2. Homepage wording: "Budget" and "Remaining" become "Revised sum" and "Balance still to certify", with the same figures, plus a new "needs you" row for signed but uncertified Variation Orders.
- **Product calls:**
  1. Should a company admin see the full ID numbers of their own users? Today only the person and Baselinq staff do.
  2. Any project user whose account is a company account can invite anyone onto the project, including the client. Keep it?
  3. Following 6d41a89, a LEGAL user with `finance.edit` can record a payment. Should Legal ever record one?
  4. Should a fraud report on bank details work on a billing-locked project? (Recommendation: yes.)
  5. `tasks/bank_details._contractor_members` still counts LEGAL as the contractor. Fix it to match #109?
  6. ADMIN and PROJECT_ADMIN lose bank-change verify in #113. Confirm.
- **Admin:** turn on branch protection; confirm backup retention (35 days of dailies, 13 months of monthlies).
- **Wording:** Variation Order and retention stay. The four wording PRs (backend #94 and #95, frontend #90 and #91) are drafts until the client answers.

Thanks. Shout with questions.
