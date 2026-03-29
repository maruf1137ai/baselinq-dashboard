# Baselinq Frontend Design Audit
## Date: 2026-03-24 | Auditor: Orion

## Executive Summary
The frontend has **severe design inconsistency** caused by multiple developers adding styles independently without a shared standard. What was reported as 18 issues is actually much deeper — the codebase has **164+ unique hardcoded hex colours**, **20 different border-radius values**, and **two competing purple brand colours** used nearly equally throughout.

---

## 🔴 CRITICAL ISSUES

### 1. Two competing brand purples (118 vs 111 uses)
- `#8081F6` — defined as primary in tailwind config (118 uses)
- `#6c5ce7` — a completely different purple used 111 times
- Plus 5 more purple variants: `#6366F1` (8), `#818CF8` (4), `#6c6de9` (7), `#5a4bd1` (6), `#a78bfa` (8)
- **7 different purples** in one app. Users see an inconsistent brand.

### 2. 164+ unique hardcoded hex colours bypassing the token system
- Text colours: 60+ unique hex values (e.g., `text-[#6B7280]` used 365 times instead of a semantic token)
- Background colours: 80+ unique hex values
- Border colours: 50+ unique hex values
- The design system exists in `index.css` and `tailwind.config.ts` but is being ignored

### 3. 20 different border-radius values
- `rounded-[4px]`, `[6px]`, `[7px]`, `[8px]`, `[10px]`, `[11px]`, `[12px]`, `[13px]`, `[14px]`, `[16px]`, `[19px]`, `[20px]`, `[20.444px]`, `[21px]`, `[24px]`, `[28px]`, `[32px]`, `[49px]`
- Plus Tailwind classes: `rounded-lg`, `rounded-xl`, `rounded-2xl`
- `rounded-[10px]` dominates with 125 uses but there's no standard

### 4. Raw `<button>` vs shadcn `<Button>` — nearly equal usage
- Raw `<button>`: 211 instances
- shadcn `<Button>`: 182 instances
- Each developer is choosing independently — buttons look different on every page

### 5. Duplicate/conflicting classes on same element
- `CreateRequestButton.tsx:148` — `rounded-[19px]` AND `rounded-[13px]` on the same element
- Multiple elements have competing styles

---

## 🟠 HIGH ISSUES

### 6. Font sizes completely off the Tailwind scale
- `text-[10px]`: 129 uses — below Tailwind's `text-xs` (12px)
- `text-[11px]`: 89 uses
- `text-[13px]`: 105 uses — between `text-xs` and `text-sm`
- `text-[9px]`: 7 uses — nearly unreadable
- `text-[42px]`: 1 use — no corresponding heading scale
- 14 different arbitrary font sizes, ignoring Tailwind's built-in scale entirely

### 7. Arbitrary pixel spacing breaking vertical rhythm
- `p-[7px]`, `py-[9px]`, `px-[14px]`, `mb-[18px]`, `py-[22px]`, `py-[45px]`
- 30+ unique arbitrary spacing values
- Tailwind has a spacing scale (p-1, p-2, p-3...) that maps to 4px increments — none of these align

### 8. Competing text hierarchy
- Page headings use `text-3xl`, `text-2xl`, `text-xl`, `text-lg` interchangeably
- `CardTitle` uses `text-2xl` while page `h1` uses `text-3xl` — no clear hierarchy
- Body text switches between `text-sm` and `text-base` on the same page

### 9. 6+ different grey text colours for the same purpose
- `#6B7280` (365 uses), `#717784` (61), `#9ca3af` (82), `#9CA3AF` (30), `#6B6B6B` (27), `#4B5563` (30)
- All used for "secondary/muted text" — should be ONE token

### 10. 8+ different border colours
- `#E5E7EB` (74), `#E7E9EB` (21), `#e2e5ea` (19), `#EDEDED` (17), `#E6E8EB` (13), `#DEDEDE` (11), `#EAEAEA` (7), `#e9ecef` (10), `#E8E8E8` (3)
- All are "light grey border" — should be ONE token

### 11. Meetings page uses `CashIcon` for "Upcoming Meetings"
- Wrong icon for the context

### 12. Typo: `badgeText="Fev 10"` on Meetings page

---

## 🟡 MEDIUM ISSUES

### 13. `orenge` typo in tailwind config
- `orenge_dark` and `orenge_light` — should be `orange_dark` / `orange_light`

### 14. Font — using "Aeonik Pro TRIAL"
- Trial font in production. Needs a proper license or replacement.

### 15. Emoji icons mixed with Lucide
- 4 instances of emoji icons (📄, 🖼) alongside 112 Lucide icon imports
- Should be consistently Lucide throughout

### 16. Undocumented bare CSS class names
- `chatWindow`, `chatSummary`, `chatSidebar` — not in any component library or Tailwind config
- Scattered across components with no documentation

### 17. Font weight inconsistency on buttons
- Some buttons use `font-normal`, others `font-medium`, some have no explicit weight
- No standard for button text weight

### 18. Compliance page has duplicate "Compliance Score" cards
- Both audit.tsx and Compliance.tsx render stat cards titled "Compliance Score"

### 19. Settings background diverges
- `bg-[#F7F7F7]` used in settings vs `bg-[#F3F2F0]` used everywhere else
- Meeting sidebar also uses `bg-[#F7F7F7]`

### 20. 5+ different background surfaces
- `#F3F2F0` (sidebar, 45 uses), `#FAFAFA` (26), `#f5f6f8` (21), `#F9FAFB` (17), `#F3F4F6` (16), `#f8f7ff` (15), `#F7F7F7` (6)
- All serve the same purpose — "light surface background"

---

## NUMBERS AT A GLANCE

| Metric | Count | Should Be |
|--------|-------|-----------|
| Unique hex colours | 164+ | ~15-20 tokens |
| Border radius values | 20 | 3-4 (sm, md, lg, full) |
| Purple variants | 7 | 1 (with tints) |
| Grey text variants | 6+ | 1-2 tokens |
| Border colour variants | 8+ | 1-2 tokens |
| Background surface variants | 5+ | 2-3 tokens |
| Arbitrary font sizes | 14 | 0 (use Tailwind scale) |
| Arbitrary spacing values | 30+ | 0 (use Tailwind scale) |
| Raw buttons vs shadcn | 211 vs 182 | 0 raw, all shadcn |
