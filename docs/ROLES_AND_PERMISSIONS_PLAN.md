# Roles & Permissions — plan

Proposal doc. No code changes yet — decisions first, then implementation.

**Why this exists:** the Roles & Permissions page in Project Settings currently shows "Upcoming Feature" (`src/components/settings/Role&Permissions.tsx` — entire component is commented out). The previous attempt was parked because there was no backend to power it. This doc describes what needs to exist.

**Owner:** David (product decisions) + backend team (Shaon / Maruf) for implementation.

---

## TL;DR

We have role CHECKS scattered across the backend as hard-coded lists of role codes. We have NO Permission model. The UI can render a matrix, but there's no "save" target for it. This PR proposes a real model-backed permissions layer + a decision on the global-vs-per-project role question.

---

## Current state (audit)

### Two competing role systems running in parallel

**1. Global role — `User.role`** (FK to `Role` model, `user/models.py:177-184`)
- Set on signup via invitation (invitation has a `position` text field which gets mapped to a Role)
- Same role applies across ALL projects this user is on
- Example: David Zeeman is "Principal Agent" everywhere

**2. Per-project role — `ProjectTeamMember.role`** (CharField, NOT FK, `project/models.py:174-180`)
- Plain text, any string allowed ("Architect", "Principal / PM", "Owner", "Member")
- Different per project — David could be "Client" on Project A and "Principal Agent" on Project B
- This is the field most backend code actually uses for gating (via `TEXT_ROLE_TO_CODE_MAP`)

**🚩 Result: confusion.** Some places check `user.role.code`, others check `ProjectTeamMember.role`, others do string matching. No single source of truth.

### Where role checks actually happen

- `tasks/views.py:55-150` — `AUTO_ASSIGN_ROLES` dict: hard-coded role codes per task type (VO: `["CLIENT", "ARCH", "CPM", "PM", ...]`, etc.)
- `tasks/views.py:145-209` — `TEXT_ROLE_TO_CODE_MAP`: 200+ line dict mapping free-text role names to 2-4 letter codes
- `project/role_permissions.py:95-162` — `can_add_member()`, `can_remove_member()`: hard-coded `FULL_CONTROL_ROLES = {"CLIENT", "CPM", "PM"}` and `CM_MANAGEABLE_ROLES = {"SE", "SS", "FOREMAN"}`
- `documents/views.py` (via `documents/permissions.py`) — `can_upload_document_type(user, project, doc_type, cert_subtype)` — role-based upload gating
- Frontend (`src/pages/Task.tsx:76-95`) — `rolePermissions` object: role → allowed task types for create buttons

**None of these are config-driven.** All are code constants.

### The commented-out attempt

`src/components/settings/Role&Permissions.tsx`:
```tsx
// UPCOMING_FEATURE: All original code commented out — restore when backend integration is ready
import UpcomingFeature from "@/components/settings/UpcomingFeature";
const RolePermissions = () => {
  return <UpcomingFeature />;
};
```

Whoever did this knew the backend wasn't ready. The original code (in git history) likely rendered a role × module matrix with checkboxes, but had nothing to save to.

### Permission model — doesn't exist

No `Permission` table in the codebase. No `RolePermission` join table. Django's default `auth.Permission` is not used for application-level permissions.

---

## Decision 1 — Global role, per-project role, or both?

The first thing David needs to decide.

### Option A — **Per-project only** (recommended)
- Drop `User.role` as a thing users can have
- Your role on the platform is always "a role on a specific project"
- Set when you accept an invitation to a project
- Changes per project
- Matches construction industry reality — you're an "Architect" on the housing job but you're a "Client" on your own personal project
- Simpler model
- Requires deprecation of `User.role` usage throughout the code

### Option B — **Global only**
- Drop `ProjectTeamMember.role`
- Your role is set once, at signup, and doesn't change
- Simplest mental model for users
- Doesn't match reality — doesn't allow wearing different hats on different projects
- Client-specific exception: project-created-by-user might always be "Client" regardless of User.role

### Option C — **Both, but clearly scoped** (current state, cleaned up)
- `User.role` = professional discipline / industry role ("I am an Architect")
- `ProjectTeamMember.role` = seat on this specific project ("I am Principal Agent on this job")
- Both needed, but used for different purposes:
  - Discipline-based task auto-assignment → uses `User.role`
  - Permission checks (can I approve this VO?) → uses `ProjectTeamMember.role`
- Honest; matches how the code kind of already works
- More to maintain

**Recommendation: Option C, formalised.** Ship the cleanup as clear docs + tests.

---

## Decision 2 — Who decides permissions?

### Option X — **Fixed per role**
- Each role has a pre-defined permission set (CLIENT can do X, PM can do Y, CM can do Z)
- Only Baselinq product team can add new roles or change what a role can do
- Cleanest; protects against customer misconfiguration
- Restricts customer customisation

### Option Y — **Customer-configurable matrix**
- Each customer organisation can grant/revoke permissions per role
- Empower power users (large firms with unusual internal structures)
- Risk: customers can lock themselves out
- The original `Role&Permissions.tsx` was clearly aiming for this

**Recommendation:** Start with Option X (fixed sets, ship fast, no customer UI) and build Option Y later only if customer demand proves it's needed. Ship the page as **read-only** initially so users can SEE what their role can do.

---

## Proposed model

### New model: `Permission`

```python
class Permission(models.Model):
    code = models.CharField(max_length=64, unique=True)   # e.g. "task.create_vo"
    label = models.CharField(max_length=128)
    module = models.CharField(max_length=32)              # "tasks" | "documents" | "finance" | "project" | "meetings"
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
```

### New model: `RolePermission`

```python
class RolePermission(models.Model):
    role = models.ForeignKey(Role, on_delete=CASCADE, related_name="permissions")
    permission = models.ForeignKey(Permission, on_delete=CASCADE)

    class Meta:
        unique_together = [("role", "permission")]
```

### Seed data

Ship Option X as seeded `Permission` + `RolePermission` rows via a data migration. Initial matrix based on what the existing code does today:

Modules to cover: `tasks`, `documents`, `meetings`, `finance`, `compliance`, `project_settings`, `roles_management`.

Example permission codes:
- `task.create_vo`, `task.create_rfi`, `task.create_si`, `task.create_dc`, `task.create_cpi`
- `task.approve_vo`, `task.verify_si`, `task.respond_rfi`
- `document.upload_drawing`, `document.upload_contract`, `document.upload_document`
- `document.upload_as_discipline.architectural`, ... (see Documents spec §4)
- `project.add_member`, `project.remove_member`, `project.edit_settings`
- `finance.view_budget`, `finance.edit_budget`, `finance.approve_payment_certificate`
- `meeting.schedule`, `meeting.delete`
- `roles.view` (everyone), `roles.manage` (platform admin only)

### Replace hardcoded checks

Every hard-coded check (`AUTO_ASSIGN_ROLES`, `FULL_CONTROL_ROLES`, `can_upload_document_type` etc.) gets replaced with a single helper:

```python
def has_permission(user, project, permission_code: str) -> bool:
    """
    Returns True if user has permission_code on this project.
    Resolves from either ProjectTeamMember.role or User.role depending on
    what the permission is scoped to (Option C).
    """
    ...
```

Call this helper everywhere instead of string-comparing role codes.

---

## UI — what "Roles & Permissions" page becomes

### Phase 1 (read-only, ship first)

- List all roles in your organisation
- For each role, show the permission matrix (role × module × permission) as read-only
- "You are a [Role]. Your role allows: [list]. Contact Baselinq to change."
- Ships as soon as the backend model lands

### Phase 2 (optional, later)

- Platform admins can toggle permissions per role
- Changes scoped per-org (one customer can't affect another)
- Audit trail of who changed what

### Component

Uncomment and rewire `src/components/settings/Role&Permissions.tsx`. The original commented-out code in git history is likely a starting point but will need updating against the new API.

---

## Rollout — proposed 3 PRs

### PR A — Backend model + seed
- Add `Permission`, `RolePermission` models
- Migration + data migration with initial permission set
- `has_permission()` helper
- API endpoint: `GET /auth/permissions/` (current user's effective permissions on a given project)
- API endpoint: `GET /projects/{id}/roles-matrix/` (full matrix for display)

### PR B — Replace hardcoded checks
- `AUTO_ASSIGN_ROLES` → query `Permission` + `Role` at task-assign time
- `can_upload_document_type` → `has_permission(user, project, f'document.upload_{doc_type}')`
- `can_add_member` → `has_permission(user, project, 'project.add_member')`
- Frontend `rolePermissions` object → replaced with `currentUser.permissions` fetched once per session
- **Dangerous PR** — needs careful testing, many touchpoints

### PR C — Page UI (read-only matrix)
- Uncomment `Role&Permissions.tsx`
- Render the matrix
- Display current user's effective permissions
- No edit — this is the "see, don't touch" version

### Optional PR D — Edit matrix (Phase 2)
- Platform admins can toggle per role per permission
- Audit log

**Total size:** ~1500 lines + 2 migrations across 3 PRs. ~1-2 weeks for one engineer.

---

## Open questions for David

1. **Option A, B, or C?** (Per-project only / Global only / Both-scoped) — the foundational decision
2. **Option X or Y?** (Fixed permission sets / Customer-configurable matrix) — ships fast vs. flexible
3. **What modules need permission gating beyond what we already have?** Suggest: tasks, documents, meetings, finance, compliance, project settings. Anything else?
4. **Who qualifies as a "platform admin" in Option Y?** (not any user can manage permissions — even your own users. Usually an Intelleqt staff role.)
5. **Should the page live under Project Settings or Account Settings?** Currently under Project Settings but permissions are arguably org-level not project-level.
6. **Do we need role-hierarchy enforcement?** (e.g. PM can add a CM, but not another PM.) `project/role_permissions.py` has a `ROLE_HIERARCHY` dict with numeric levels — do we keep this?

---

## What this doc does NOT address

- Role-based navigation (which menu items a role sees) — separate concern, can be derived from permissions later
- Super-user / bypass mode — flagged separately in the Darren/Vans meeting (profile permission bug)
- Migration path for existing users / projects — needed but detailed later once Option A/B/C is decided

---

## File map for implementation (once decided)

Backend:
- `user/models.py` — Role (already exists), Permission (new), RolePermission (new)
- `user/migrations/00XX_add_permission_model.py` — new
- `user/migrations/00YY_seed_default_permissions.py` — data migration
- `user/permissions_helper.py` — `has_permission()` single source of truth
- Replace scattered checks in `tasks/views.py`, `documents/views.py`, `project/role_permissions.py`, etc.

Frontend:
- `src/components/settings/Role&Permissions.tsx` — uncomment + rewrite against new API
- `src/hooks/usePermissions.ts` — already exists, wire to new endpoint
- Remove `rolePermissions` constant in `src/pages/Task.tsx` in favour of hook
