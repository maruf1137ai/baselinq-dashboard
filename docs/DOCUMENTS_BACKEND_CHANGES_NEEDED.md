# Documents redesign — backend changes still needed

## Glossary — agreed terminology (use these ONLY)

| Word | Meaning | Examples |
|------|---------|----------|
| **Category** | Top-level bucket. 3 fixed values. | `Drawings` · `Documents` · `Contracts` |
| **Type** | What kind of thing within a Category. Fixed list per category. | `Concept Drawing` · `Payment Certificate` · `BoQ` |
| **Discipline** | The profession / specialty. 21-item cross-cutting list. | `Architectural` · `Structural` · `MEP` · `Quantity Surveying` |

Retired words — **do not use**: "Segment", "Sub-category", "Subfolder" (the latter only as internal model name, not user-facing).

Hierarchy:
```
Category (3 fixed)
  └── Type (per-category list)
       └── Discipline (cross-cutting)
```

---


This doc lists everything the Documents v1 redesign **couldn't do with the existing backend schema**. The frontend PR ships with sensible defaults that work today; these changes are required to unlock the full client requirements.

**Owner:** backend team (Shaon / Maruf / Risalat)
**Related:** frontend PR `feat/documents-redesign-v1`, proposal doc `docs/DOCUMENTS_REDESIGN_PROPOSAL.md`

---

## ⚡ TL;DR — what's done, what's left

### ✅ Shipped in frontend PR (#24) — works with current backend

| Client ask | Status | How |
|-----|--------|----|
| 3 top-level categories (Drawings / Documents / Contracts) | ✅ Done | Category pills on `/documents`, derived from `Document.type` client-side |
| Remove "Add Segment" button | ✅ Done | Deleted from UI |
| Upload form: name / type / discipline required | ✅ Done | Form validates and blocks submit |
| 21-item fixed discipline list | ✅ Done | `src/lib/documentTaxonomy.ts` |
| Field cascade: Category → Type → Discipline → Name | ✅ Done | Upload form rebuilt |
| Consistent glossary (Category/Type/Discipline) | ✅ Done | UI + internal vars |
| Remove mandatory doc upload from onboarding | ✅ Done | OnboardingModal step 4 removed |
| DocumentDetail shows Category + Type + Discipline | ✅ Done | Detail panel updated |
| Category + Discipline grouping in doc list | ✅ Done | Table groups break up the rows |
| Version control retention + rollback | ✅ Works | Already worked in existing backend, untouched |

### ❌ STILL NEEDED — blocked on backend

| Client ask | Why it needs backend | See section |
|-----|----|----|
| Role-gated uploads (architect → architectural only) | Needs new `can_upload_discipline` permission, extension of `/user-capabilities/` endpoint | §4 |
| Predetermined subfolders under each category (Concepts/Design Dev/Tender/etc.) | Needs new `DocumentSubfolder` model + API + defaults seeder | §2 |
| Custom subfolder creation | Requires the subfolder model above | §2 |
| Re-map existing docs to new structure | Needs data migration script | §7 |
| Insurance expiry warnings | Needs `has_current_insurance` property on user | §6 |

### 🟡 FRONTEND-ONLY, deferred to a follow-up

| Ask | Status |
|-----|--------|
| "Add your professional insurance" banner on Dashboard | In separate PR (`feat/dashboard-insurance-banner`) |
| "Needs filing" inbox for ambiguous migrated docs | Depends on backend migration (§7) landing first |

---

## What the frontend currently does (no backend change required)

- ✅ **Category** (Drawings / Documents / Contracts) is **derived client-side** from `Document.type`:
  - `Drawing` → Drawings
  - `Contract`, `Contract Agreement` → Contracts
  - `Specification`, `Report`, `Certificate` → Documents
- ✅ Upload form enforces: name, document type, discipline required
- ✅ Expanded discipline list (21 items) in `src/lib/documentTaxonomy.ts` — frontend-only, backend still accepts any string
- ✅ Category tabs filter the document list
- ✅ "Add Segment" button removed from UI
- ✅ Document upload step removed from OnboardingModal
- ✅ Version system kept as-is (works well already)

---

## What the backend needs to do

### 1. Make `category` a first-class field on `Document` (recommended)

**Why:** Deriving category from `type` on the frontend is fine for v1, but:
- Two places to keep in sync (backend migration from old data needs the same mapping)
- Can't filter by category server-side — v1 does client-side filtering, but at scale (100s of docs) this will be slow
- Analytics / reporting queries will want `category` directly

**Migration:**
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
        blank=True,   # temporarily, for back-fill
        default="",
    )
```

Data migration to back-fill existing rows using the same mapping the frontend does:
- `type=Drawing` → `category=drawings`
- `type in (Contract, Contract Agreement)` → `category=contracts`
- `type in (Specification, Report, Certificate)` → `category=documents`
- Empty → `documents` (safe fallback)

Once back-filled, remove `blank=True` and make required on new docs. Serializer validates client-supplied category matches the type.

API: add `category` to create/update serializers (accept either client-supplied or infer from type). Add `?category=` filter to list view.

Frontend will be updated in a follow-up to send `category` explicitly (currently derives).

---

### 2. `DocumentSubfolder` model (NEW)

**Why:** Client wants subfolders under each category (e.g. Drawings → Concepts, Design Development, Tender, Council, Construction Drawings). Subfolders are project-scoped with defaults + user-addable custom ones.

```python
class DocumentSubfolder(models.Model):
    project = models.ForeignKey("project.Project", on_delete=CASCADE, related_name="doc_subfolders")
    category = models.CharField(max_length=20, choices=Document.Category.choices)
    name = models.CharField(max_length=100)
    is_default = models.BooleanField(default=False)   # true for seeded defaults
    order = models.PositiveIntegerField(default=0)
    created_by = models.ForeignKey(User, null=True, on_delete=SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("project", "category", "name")]
        ordering = ["category", "order", "name"]

    def __str__(self):
        return f"{self.category}/{self.name}"
```

**Default subfolders to seed per new project** (client-confirmed list still pending — see proposal §12):

| Category | Defaults |
|----------|----------|
| Drawings | Concepts · Design Development · Tender · Council Drawings · Construction Drawings |
| Documents | Reports · Specifications · Schedules · Compliance |
| Contracts | Appointment Letters · Pre-Proposal / Free Proposals · Signed Contracts · Payment Certificates · Tender · Variations |

Add a signal or project-creation hook that seeds these per-project.

**On Document:**
```python
subfolder = models.ForeignKey(
    DocumentSubfolder,
    null=True, blank=True,
    on_delete=models.SET_NULL,
    related_name="documents",
)
```

**API endpoints needed:**
- `GET /api/projects/{id}/doc-subfolders/` — list all, grouped by category
- `POST /api/projects/{id}/doc-subfolders/` — create custom subfolder
- `DELETE /api/projects/{id}/doc-subfolders/{subfolderId}/` — remove (only if not is_default and no documents use it)

---

### 3. Expand `Document.type` enum — or deprecate it

**Problem today:** `Document.type` only has 6 values:
`Contract · Drawing · Specification · Report · Certificate · Contract Agreement`

**Client wants** the `type` to be a finer classification like:
- For drawings: "Concept Drawing", "Working Drawing", "Detail Drawing", "As-Built"
- For contracts: "Appointment Letter", "Signed Contract", "Payment Certificate", "Variation"
- For documents: "Report", "Specification", "Schedule", "BoQ"

**Two valid paths:**

**Option A (simpler):** Expand `DocType.choices` to include all finer types. Keep backward compat with old values. Frontend derives category from an expanded mapping.

**Option B (cleaner):** Introduce `DocumentSubfolder` (§2) as the "sub-type", and keep `Document.type` free-text or deprecate it. The subfolder becomes the sub-classification.

**Recommendation:** Option B. Subfolder IS the sub-classification. `Document.type` can stay but deprecate its role.

---

### 4. Role-based discipline upload gating

**Why:** Darren wants "if you're logged in as an architect, you can only upload architectural drawings."

**Current:** `can_upload_document_type(user, project, doc_type, cert_subtype)` exists in `documents/permissions.py`. It gates by type, not by discipline.

**Needed:**
```python
def can_upload_discipline(user, project, discipline: str) -> tuple[bool, str]:
    """
    Check if the user is allowed to upload a document under a given discipline
    on this project. Combines role on project + discipline.
    """
    # Project admin / creator / client → any discipline
    if user == project.created_by:
        return True, ""
    role = ProjectTeamMember.objects.filter(project=project, user=user).first()
    if not role:
        return False, "Not a team member of this project"
    # Map role → allowed disciplines (see matrix in proposal §6)
    ROLE_TO_DISCIPLINES = {
        "architect": ["Architectural"],
        "structural_engineer": ["Structural"],
        "civil_engineer": ["Civil"],
        "mechanical_engineer": ["Mechanical (MEP)"],
        "electrical_engineer": ["Electrical (MEP)"],
        "plumbing_engineer": ["Plumbing (MEP)"],
        "quantity_surveyor": ["Quantity Surveying"],
        "project_manager": "ANY",  # coordination role
        "contractor": "ANY_DRAWINGS_AND_CONTRACTS_VARIATIONS",
        "client": "ANY",
    }
    allowed = ROLE_TO_DISCIPLINES.get(role.role)
    if allowed == "ANY":
        return True, ""
    if allowed and discipline in allowed:
        return True, ""
    return False, f"Your role ({role.role}) cannot upload {discipline} documents"
```

Call this in the upload view alongside `can_upload_document_type`.

**Extend `user-capabilities` endpoint** to return allowed disciplines so the frontend can lock the discipline dropdown:
```json
{
  "documentTypes": ["Drawing", "Specification"],
  "certificateSubtypes": [],
  "allowedDisciplines": ["Architectural"]
}
```

**Matrix to configure** — see proposal §6. Needs client sign-off on edge cases (e.g. Project Manager should probably be "ANY").

---

### 5. Remove mandatory upload requirement from onboarding

**Frontend has already removed the UI**. Backend just needs to:

- Confirm no API validation errors occur if a project is created without attachments (probably already fine, but verify).
- If there's an invite flow that expects certain documents to exist before finalising, relax that.

---

### 6. Insurance certificate redirect

**Client ask:** When a professional user tries to upload at onboarding, redirect them to the Documents page to upload insurance certificates there instead.

**Backend needs:**

Add a flag/computed field on `User` to indicate whether insurance is on file:
```python
@property
def has_current_insurance(self):
    return self.insurance_document and self.insurance_document.expiry_date and self.insurance_document.expiry_date > timezone.now().date()
```

Expose in `/auth/profile/` response. The frontend already has a `currentUser.insurance_document` check; formalise it.

---

### 7. Data migration script — map existing docs to new structure

Once §1 and §2 land, run:

```bash
python manage.py remap_documents
```

This does:
1. Back-fill `category` on existing docs based on `type` (see §1).
2. Seed default subfolders for every existing project.
3. Best-effort assign each doc to a subfolder:
   - Drawings with no hint → `Construction Drawings` (safest default for existing data)
   - Contracts with type=Contract Agreement → `Signed Contracts`
   - Reports → `Reports`
   - Specifications → `Specifications`
   - Certificates → `Compliance` (or unassigned if not clear)
4. Set `migration_review_needed=True` (new boolean field on Document) for ambiguous docs so Darren can review in a "needs filing" inbox UI later.

Output a CSV/JSON report listing how each doc was mapped so the client can spot-check.

---

## Frontend PR to follow, once backend ships the above

After backend lands §§1–5, a frontend follow-up PR will:
- Send `category` explicitly on upload (instead of deriving)
- Show subfolders as a secondary filter within each category tab
- Enforce role-discipline gating in the upload form using `allowedDisciplines` from `user-capabilities`
- Add "needs filing" section for migration-flagged docs
- Add insurance banner using the `has_current_insurance` flag

---

## Proposed order / size

| # | Change | Size | PR |
|---|--------|------|----|
| 1 | `Document.category` field + migration + back-fill | S | 1 |
| 2 | `DocumentSubfolder` model + seed defaults + API endpoints | M | 2 |
| 3 | Expand type / deprecate (Option B above) | S | 2 |
| 4 | `can_upload_discipline` + matrix + user-capabilities extension | M | 3 |
| 5 | Onboarding validation relaxation | XS | merge with any |
| 6 | Insurance `has_current_insurance` property | XS | merge with any |
| 7 | `remap_documents` management command | M | 4 |

**Estimated total:** ~3 backend PRs over 2–4 days with 1 engineer.

---

## Open questions still outstanding (from client meeting)

These are in the proposal doc §12 but worth repeating here because the backend choices depend on them:

1. **Exact subfolder list per category** — Vans was going to send the finalised list. Needs confirmation before seeding defaults.
2. **Role-to-discipline matrix** — proposal §6 is an initial draft. Needs client sign-off, especially for Project Manager, Main Contractor, Client roles.
3. **Who can add custom subfolders?** — Any team member, or project admins only?
4. **Who counts as "professional" for insurance purposes?** — All non-client users, or specific roles?
5. **Data migration tolerance** — how much human review does Darren want on the remapped existing docs? 24-hour review window, or auto-apply with a "needs filing" inbox?
