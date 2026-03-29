# Baselinq: Visual Review vs Code Audit vs Brand Guidelines
## Browser screenshots reviewed via Puppeteer on 2026-03-24

## Pages Reviewed
1. Login / Signup
2. Dashboard (Home)
3. Tasks (Kanban)
4. Documents
5. Meetings
6. Finance
7. Compliance
8. Settings (Team Management)
9. Communications
10. AI Workspace

---

## 🔴 CRITICAL FINDINGS FROM VISUAL REVIEW

### 1. PRIMARY PURPLE — AT LEAST 3 DIFFERENT SHADES IN USE
What I see across pages:
- **"+ Action" button**: ~`#7C3AED` (violet-600, more saturated)
- **Sidebar active accent**: ~`#7C3AED` (violet-600)
- **Document revision circle**: `#8081F6` (the supposed brand primary)
- **Reference codes** (CONT-001 etc): `#8081F6`
- **"+ Upload" button on Documents**: `#8081F6`
- **User avatar**: ~`#7C3AED`
- **AI chat bubble**: `#6c5ce7`
- **Create/Edit project accent elements**: `#6c5ce7`

The code confirmed 7 purple variants. The visual confirms at least 3 are clearly visible to users — the buttons, accents, and text links are noticeably different shades.

**VERDICT: The brand guidelines MUST lock this to `#8081F6` as defined in tailwind config. The visual shows `#7C3AED` may actually be what the designer intended for the primary. NEED FIGMA CONFIRMATION on which purple is the source of truth.**

### 2. ACTIVE STATE PATTERNS — 3 DIFFERENT APPROACHES
- **Main sidebar**: Left 3px border accent + lavender background
- **Settings sub-nav**: Full lavender background fill, no left border
- **Documents discipline tabs**: Black/dark pill for active, no purple at all
- **Settings tab bar**: Purple bottom border underline
- **Meetings toggle**: White elevated card with shadow
- **Communications toggle**: White elevated segment with shadow

Six different "this is selected" patterns. Users shouldn't need to learn a new selection model on every page.

### 3. CARD STYLES — MOSTLY CONSISTENT BUT WITH DRIFT
- Dashboard cards: white, ~12px radius, subtle border ✅
- Compliance stat cards: white, ~12px radius, subtle border ✅
- Meeting stat cards: white, ~12px radius, **LEFT COLOURED ACCENT BORDER** ← different
- Settings: no cards, just table layout ← different

### 4. BADGE/STATUS COLOURS — GOOD BUT OVERLOADED
The status badge system across pages is actually fairly consistent:
- Green = active/approved/completed
- Red = overdue/rejected/error
- Amber/Orange = warning/pending
- Grey = default/draft
- Purple = in review/progress

But the implementation varies (outlined pills vs filled pills vs dots with text). Need one pattern.

### 5. BUTTON CONSISTENCY
- **Primary buttons** ("+ Action", "+ Upload", "+ Add"): Consistent purple fill ✅
- **Secondary/ghost buttons** ("Ask AI", "Filters", "Scan Docs"): Consistent outline style ✅
- **404 page "Dashboard" button**: BLACK, not purple ❌
- **Kanban category pills**: BLACK circles, not purple ❌

### 6. TYPOGRAPHY — VISUAL CONFIRMS THE CODE MESS
- Page titles range from ~24px to ~32px across pages
- Body text switches between sizes noticeably on Compliance vs Documents
- The `text-[10px]` and `text-[11px]` code values ARE visible as cramped, hard-to-read labels

### 7. SPECIFIC BUGS CONFIRMED
- ✅ "Fev 10" typo badge on Meetings page — visible in screenshot
- ✅ Duplicate "Compliance Score" cards — both visible
- ✅ "orenge" typo in config — not visible but confirmed in code
- ✅ Meetings uses money/cash icon for "Upcoming Meetings" card — visible

---

## ✅ WHAT'S ACTUALLY CONSISTENT (credit where due)

1. **Sidebar structure** — Same on every page, good bones
2. **Top bar** — Consistent across all pages
3. **Card border radius** — Mostly ~12px everywhere
4. **Font family** — Aeonik Pro is consistent throughout
5. **Background colour** — Light grey main area consistent
6. **Icon system** — Lucide icons used consistently (no emoji visible in screenshots)
7. **General spacing** — Most cards use ~16-24px padding

---

## 🎯 WHAT THE BRAND GUIDELINES NEED TO SETTLE

Before sharing the guidelines with the team, David needs to confirm with the Figma file:

### Must-Answer Questions:
1. **Which purple is THE purple?** `#8081F6` (in tailwind config) or `#7C3AED` (what buttons actually look like) or something else from Figma?
2. **Which grey is THE secondary text grey?** Code has 6+ options. Pick one.
3. **Which grey is THE border grey?** Code has 8+ options. Pick one.
4. **What's the active state pattern?** Left border accent? Background fill? Bottom underline? Pick ONE and use everywhere.
5. **Meeting stat cards** — should all cards have left accent borders, or should none?
6. **Dark/black elements** (kanban pills, 404 button) — intended or developer drift?

---

## RECOMMENDED NEXT STEP

David: Open the Figma file side-by-side with these findings. Take screenshots of:
1. The colour palette/styles panel
2. One page showing the "correct" button style
3. One page showing the "correct" active sidebar state
4. One page showing the "correct" card style

Send those to me and I'll update the brand guidelines to match the designer's actual intent. Then we lock it down for all 4 devs.
