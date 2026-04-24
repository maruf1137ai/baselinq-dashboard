# Documents — Redesign Proposal

> **Status:** PROPOSAL — no code changes yet. This PR exists so the team and the client can review the plan before we start building.
> **Source:** Client review meeting 23 April 2026 (Darren Ogden, Vans Arc, Grant Mcevoy, Risalat Shahriar).
> **Author:** David

---

## TL;DR

Replace the current flat, single-level document system with a three-tier hierarchy **(Category → Subfolder → Document)**, enforce discipline + document type as required on upload, role-gate uploads by discipline, keep the existing version system (it already works), and remove mandatory document uploads from onboarding.

**Shipping in 3 PRs** (see §11 Rollout).

---

## 1. What the client asked for

Verbatim and summarised from the meeting notes.

### Structure
- Only **three** top-level categories: **Drawings**, **Documents**, **Contracts**
- Remove the **"Add Segment"** button — it created confusion
- Subfolders under each category (predetermined + user-addable)

### Drawings subfolders (example — architectural)
`Concepts` · `Design Development` · `Tender` · `Council Drawings` · `Construction Drawings`

### Contracts subfolders (same for every professional)
`Appointment Letter` · `Pre-Proposal / Free Proposal` · `Signed Contract` · `Payment Certificates`

Main contractor additionally gets: `Tender` · `Contract Documentation` · `Variations`

### Upload — required fields
1. **Document name** — required
2. **Document type** — required (e.g. "Concept Drawing", "Working Drawing", "BoQ", "Payment Certificate")
3. **Discipline** — required (fixed list of ~20, with option to add a missing one)

### Role-based upload restrictions
- If logged in as an architect → can only upload **architectural** drawings
- Auto-scopes the discipline field on the upload form

### Version control
- Retain superseded versions (the "it might have been a mistake" rollback case)
- Surface via a "Versions" view on each document — which we already have

### Onboarding change
- **Remove** mandatory document uploads at client onboarding
- Exception: insurance certificates for professionals — redirect those to the Documents page

### Data migration
- All existing uploaded docs to be re-mapped to the new structure
- Risalat does the mapping; pings Darren when unsure

---

## 2. What we have today

### Data model (`documents/models.py`)

**Document.type** is a flat enum:
```
Contract · Drawing · Specification · Report · Certificate · Contract Agreement
```

**Document.discipline** is a free string (not enforced), with a suggested built-in list:
```
Architectural · Structural · MEP · Civil · Environmental · Contract Agreement
```

**No `category` field.** No subfolder model. No folder hierarchy.

**Status:** `Active · Finance Gated · Archived`

### Versioning
Already works well. `DocumentVersion` rows are retained, `is_current` is flipped on upload, restore endpoint re-promotes an old version as a new one. **Keep as-is.**

### Upload flow
- 3 entry points: `UploadDocument.tsx` page, `UploadDocumentModal.tsx` modal, inline in `OnboardingModal.tsx` step 4
- Required today: **name**, **type** only
- Optional today: discipline, reference (auto-generated), description

### Role gating
- Backend permission `can_upload_document_type(user, project, doc_type, cert_subtype)` exists
- Frontend fetches `documents/user-capabilities/` for allowed types
- **No discipline gating** today — once you can upload a Drawing, you can upload it under any discipline

### Onboarding coupling
- `OnboardingModal.tsx` step 4 is a dedicated "Documents" step
- File upload happens during onboarding before the project fully exists

### The "Add Segment" button
In `Documents.tsx:390-396` — spawns an input to POST `projects/{id}/disciplines/` with a new discipline name. The UI confusingly calls it a "segment" but it's a custom discipline. **Client wants it gone.**

---

## 3. Gap analysis

| Client ask | Exists today | Gap |
|------------|--------------|-----|
| 3 categories (Drawings/Documents/Contracts) | ❌ | **New** `category` field + enum |
| Predefined subfolders per category | ❌ | **New** `Folder` model + seed per category |
| User-addable custom subfolders | ⚠️ Partial (custom discipline exists) | New subfolder creation UI, scoped to a category |
| Document type required | ❌ (optional) | Enforce in serializer |
| Discipline required | ❌ (optional) | Enforce in serializer |
| Fixed discipline list (~20) | ⚠️ Partial (6 builtin + custom) | Expand builtin, validate against list |
| Role-gated uploads by discipline | ❌ | New permission: `can_upload_discipline(user, discipline)` |
| Retain superseded versions | ✅ | **Keep as-is** |
| Version history view | ✅ | **Keep as-is** |
| Remove uploads from onboarding | ❌ | Remove step 4, show banner instead |
| Insurance cert redirect to Documents | ❌ | New banner / CTA in profile settings |
| Remove "Add Segment" button | ⚠️ (exists) | Delete UI, deprecate endpoint |

---

## 4. Proposed data model

### New: `Document.category` field

```python
class Document(models.Model):
    class Category(models.TextChoices):
        DRAWINGS = "drawings", "Drawings"
        DOCUMENTS = "documents", "Documents"
        CONTRACTS = "contracts", "Contracts"

    category = models.CharField(
        max_length=20,
        choices=Category.choices,
        db_index=True,
    )
```

The existing `type` field stays and becomes **sub-type of category** (e.g. under `Drawings` → type could be "Concept", "Working Drawing"; under `Contracts` → "Signed Contract", "Variation").

### New: `DocumentSubfolder` model

```python
class DocumentSubfolder(models.Model):
    project = models.ForeignKey("project.Project", on_delete=CASCADE, related_name="doc_subfolders")
    category = models.CharField(max_length=20, choices=Document.Category.choices)
    name = models.CharField(max_length=100)     # e.g. "Concepts", "Construction Drawings"
    is_default = models.BooleanField(default=False)   # seeded vs user-added
    order = models.PositiveIntegerField(default=0)
    created_by = models.ForeignKey(User, null=True, on_delete=SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("project", "category", "name")]
        ordering = ["category", "order", "name"]
```

### New: `Document.subfolder` FK

```python
subfolder = models.ForeignKey(
    DocumentSubfolder,
    null=True, blank=True,       # nullable for root-of-category docs
    on_delete=models.SET_NULL,
    related_name="documents",
)
```

### Expanded discipline list

Move from a backend convention to a real `Discipline` model or enum. Proposed fixed list (confirm with Vans):

```
Architectural · Structural · Civil · Mechanical (MEP) · Electrical (MEP) · Plumbing (MEP)
Quantity Surveying · Project Management · Fire Safety · Landscape · Interior Design
Environmental · Geotechnical · Health & Safety · Traffic · Acoustic · Sustainability (ESD)
Building Surveyor · Planner · Legal · Other
```

Users can propose adding a new discipline; requires project admin approval (not a free-for-all like today).

---

## 5. Proposed UX

### 5a. Browse page (`/documents`)

Replace the current flat table with a three-column layout:

```
┌────────────────────────────────────────────────────────────────┐
│  Drawings        Documents        Contracts       [+ Upload]   │
├────────────────┬────────────────┬──────────────────────────────┤
│ Concepts (12)  │ Reports (5)    │ Appointment Letters (8)     │
│ Design Dev (8) │ Specs (14)     │ Signed Contracts (6)        │
│ Tender (4)     │ Risk Reg (1)   │ Payment Certificates (23)   │
│ Council (3)    │ Prog v1…v3 (3) │ Variations (9)              │
│ Construction (31)│              │                              │
│ + Add subfolder│                │                              │
└────────────────┴────────────────┴──────────────────────────────┘
```

Click a subfolder → document list filtered to that subfolder, sortable by date / discipline / status.

Breadcrumbs: `Documents / Drawings / Construction Drawings`

### 5b. Upload (`/documents/upload` and modal)

Single unified form. Fields, top to bottom:

1. **File(s)** — drag-drop or picker (existing S3 presigned flow)
2. **Category** * — pill toggle: `Drawings | Documents | Contracts`
3. **Subfolder** * — dropdown of that category's subfolders + "Add new subfolder…"
4. **Discipline** * — dropdown from fixed list, auto-scoped by user's role (e.g. architect sees only Architectural)
5. **Document type** * — dropdown dependent on category (e.g. Drawings → Concept / Working / Detail / As-Built)
6. **Document name** * — text
7. **Reference** (optional, auto-suggested, e.g. `ARC-DWG-0042`)
8. **Description** (optional)
9. **Version name** (optional, defaults "v1.0")

`*` = required. Submit button disabled until all required fields filled.

Role-gating: if user.role = Architect, the Discipline field shows `Architectural` locked (read-only) unless they have elevated permission. Same for Structural / MEP / etc.

### 5c. Document detail (`/documents/:id`)

Existing layout is fine. Add a "Category / Subfolder" line in the header, below the title.

### 5d. Versions tab (keep as-is)

Already good. Only UX improvement: replace current "Restore This Version" button label with **"Restore (supersedes current)"** to match the client's mental model.

---

## 6. Role → Discipline upload matrix

Initial proposal. Client to confirm.

| Role | Can upload under discipline |
|------|------------------------------|
| Architect | Architectural |
| Structural Engineer | Structural |
| Civil Engineer | Civil |
| MEP / Mechanical Engineer | Mechanical (MEP) |
| Electrical Engineer | Electrical (MEP) |
| Plumbing Engineer | Plumbing (MEP) |
| Quantity Surveyor | Quantity Surveying |
| Project Manager | **Any** (coordination role) |
| Main Contractor | **Any drawings + Contracts > Variations** |
| Client / Developer | **Any** |
| Baselinq Admin | **Any** |

Enforcement:
- Backend: new `can_upload_discipline(user, project, discipline)` — combines current `can_upload_document_type` + new discipline gate
- Frontend: `documents/user-capabilities/` response extended with `allowedDisciplines: [...]`
- UI: discipline dropdown filtered to that list; single-value locked for most roles

---

## 7. Onboarding change

### Remove
- Step 4 ("Documents") from `OnboardingModal.tsx`
- All `attachments` validation on that step
- File upload state in OnboardingModal

### Add
- Post-onboarding **banner** on first visit to `/documents`:
  > *"Welcome! Upload your professional insurance certificate here."* → CTA button → opens upload modal with category=Documents, type=Insurance Certificate pre-selected.
- Pre-filled on insurance: `category=Documents`, `subfolder=Compliance / Insurance`, `discipline=<user's discipline>`

### Keep
- Step numbering reflows from 6 steps → 5 steps
- Insurance reminder also shows as a profile-completion nudge (persistent until uploaded)

---

## 8. Migration plan for existing documents

Migration script (`manage.py remap_documents`):

1. Every existing Document gets a `category` based on current `type`:
   - `Drawing` → `drawings`
   - `Contract`, `Contract Agreement` → `contracts`
   - `Specification`, `Report`, `Certificate` → `documents`
2. Create default subfolders per project per category (the predetermined ones)
3. Best-effort subfolder assignment based on `type` + `discipline` + `reference`:
   - Drawings with `type=Drawing` + no sub-hint → `Construction Drawings` (safest default)
   - Contracts with `type=Contract Agreement` → `Signed Contracts`
   - Certificates with `subtype=Insurance` → `Documents > Compliance > Insurance`
4. Any ambiguous doc → leave `subfolder=None` and flag with `migration_review_needed=True`
5. **Darren reviews the `migration_review_needed` list** and fixes the ambiguous ones via UI

Deliver as a reversible migration + a report (JSON/CSV) listing docs that need human review.

---

## 9. Terminology across the feature

Use these words in UI, API, code. (Matches client's language from the meeting.)

- **Category**: Drawings / Documents / Contracts
- **Subfolder**: e.g. Concepts, Signed Contract
- **Discipline**: Architectural, Structural, etc. (**not** "profession", "role")
- **Version**: v1.0, v2.0 …
- **Superseded**: old version, retained
- **Restore**: create new version from an old one
- **Document**: an individual file + its metadata
- Do NOT use: "Segment", "Bucket", "Folder" (too generic), "Stage 1 / 2 / 3"

---

## 10. Out of scope (deferred, separate PRs)

The client mentioned these in the same meeting but they're separate features:
- **Program** (milestones → graph, builder edits)
- **Finance** (payment schedule tied to program)
- **Compliance / Project Health** page
- **Custom-coded bar chart** for project status
- **Design sign-off** flow (triggers invoicing)
- **Showcase project** onboarding for R2.5m investor pitch

Each should get its own proposal PR like this one.

---

## 11. Rollout — proposed 3 PRs

### PR 1 — Data model + migration (backend)
- Add `Document.category`, `Document.subfolder` FK
- Add `DocumentSubfolder` model
- Expand discipline enum
- Add `can_upload_discipline` permission
- Write migration + remap script
- Admin UI for subfolders
- CI must pass — confirms nothing else breaks

**Size:** ~500-700 lines. Single reviewer. **No UI changes yet.**

### PR 2 — New upload + browse UX (frontend)
- Rewrite `UploadDocument.tsx` + `UploadDocumentModal.tsx` with the new required fields
- Replace `Documents.tsx` list view with the 3-category column layout
- Delete "Add Segment" button + supporting state
- Wire the role-to-discipline UI gating
- Consolidate the 3 duplicate upload forms into one shared component

**Size:** ~800-1200 lines (lots of deletions). Single reviewer. Backend must be merged first.

### PR 3 — Onboarding change + insurance banner
- Remove step 4 from `OnboardingModal.tsx`
- Add post-onboarding banner on Documents page
- Add insurance upload CTA in profile settings
- Persistent nudge until insurance uploaded

**Size:** ~300 lines. Single reviewer.

Total estimated time with 1 engineer: **6-10 dev days**.

---

## 12. Open questions for the client

Need confirmation on:

1. **Discipline list** — is the list of ~20 in §4 what Vans has in mind? Anything to add / remove?
2. **Role → discipline matrix** — does §6 match how they want role gating? Specifically for Project Manager (currently proposed as "Any").
3. **Subfolders per category** — are the defaults in §1 the full list? What goes in `Documents` and `Contracts` subfolders?
4. **Custom subfolders** — can any user add them, or just project admins?
5. **Data migration ambiguity** — how tolerant of wrong auto-assignments? Is 24-hour review window OK before locking?
6. **Who is "professional" for insurance purposes?** — all non-client users, or specific roles?

---

## 13. How to review this PR

This PR only adds this markdown file. Nothing else changes.

To approve the plan:
- ✅ Leave a GitHub review comment per section if you disagree
- ✅ Tag Darren / Vans on the open questions above
- ✅ Once merged (or explicitly approved in this thread), I'll open PR 1 (data model) on a fresh branch

To reject the plan:
- 👎 Block the PR, we rework the plan, nothing is built yet.
