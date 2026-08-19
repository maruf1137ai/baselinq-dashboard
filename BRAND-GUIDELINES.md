# Baselinq Frontend Brand Guidelines

**Derived from the code, not from a mock.** Last verified against `f4cdc51`.

The design system lives in `src/index.css` (tokens) and `tailwind.config.ts` (scales). Those two files are the source of truth; this document describes them. If they disagree with this document, **the code wins and this document is the bug** — the previous revision of this file (dated 2026-03-25) specified a primary colour that appears zero times in the codebase and forbade the one that appears 179 times, so following it produced drift by definition.

Counts in this document are measured over `src/**/*.{ts,tsx}` at the commit above.

---

## 1. Colour tokens

All colours are HSL triplets in `src/index.css`, consumed as `hsl(var(--x))`. **A hex value in that block compiles to `hsl(#f7f8fb)` — invalid CSS the browser silently drops, making `bg-background` (including on `body`) a no-op.** Never put a hex in the token block.

### Brand

| Token | Class | Value | Notes |
|---|---|---|---|
| `--primary` | `bg-primary` / `text-primary` / `border-primary` | `247 74% 63%` = **#6c5ce7** | The brand purple. `--ring`, `--sidebar-primary` and `--chart-1` are the same value exactly. |

`#6c5ce7` is correct and is the declared token. A rebrand is one CSS variable, not a find-and-replace — do not reintroduce hex literals of it.

### Neutral surface ramp

Every neutral surface and border sits on **hue 220** at 13–20% saturation. Saturation scales *down* as lightness drops (20% → 13%) so the tint is equally weak at every step rather than blooming in the darker ones.

*Why 220:* it is the centroid of the cool neutrals already in the file, so the ramp was a tightening, not a re-skin. Held at low saturation it reads as grey with a barely-perceptible cool cast — precise and authoritative, which is what a system of record for contract administration and insurance should look like. Warm greys read consumer and domestic.

**Elevation: card 99% → page 95% → well 91%.** Four lightness points per tier, so the hierarchy is legible without borders having to carry it, while staying far below the point where a professional tool starts looking striped.

| Role | Token | Class | Light value |
|---|---|---|---|
| Card / raised | `--card`, `--popover` | `bg-card` | `220 20% 99%` #fcfcfd |
| Page | `--background` | `bg-background` | `220 16% 95%` #f0f2f4 |
| Sidebar rail | `--sidebar-background` | `bg-sidebar` | `220 15% 93%` #eaecf0 |
| Well / recessed | `--secondary`, `--muted`, `--accent` | `bg-muted` | `220 14% 91%` #e5e7eb |
| Sidebar hover/selected | `--sidebar-accent` | `bg-sidebar-accent` | `220 13% 88%` #dcdfe4 |
| Hairline | `--border`, `--input`, `--sidebar-border` | `border-border` | `220 13% 86%` #d7dae0 |

**The warm cream sidebar (`#F3F2F0`, hue 40) is gone — deliberately, in commit `1dd6da2`.** It was the single warmest thing on screen, sitting next to cool-blue page chrome; that clash is what made the app look untidy. The sidebar now keeps its recessed role **by lightness, not by temperature**: 93%, two points below the page.

Likewise `#F7F8FB` is not the page colour. The page is `bg-background` (#f0f2f4).

`bg-card` (492 uses) is the card surface, not `bg-white` (23 uses). Prefer `bg-card`.

### Text

| Token | Class | Value | Use |
|---|---|---|---|
| `--foreground` | `text-foreground` | `220 20% 12%` | Headings, body, emphasis |
| `--muted-foreground` | `text-muted-foreground` | `220 9% 42%` | Labels, secondary text, icons |
| — | `text-muted-foreground/50` | — | Placeholders, disabled |
| `--primary` | `text-primary` | #6c5ce7 | Links, active accents |
| `--destructive` | `text-destructive` | `0 72% 51%` | Errors, overdue |

`--muted-foreground` is 42%, not the earlier 47%: at 47% it scored 4.30:1 on `--muted` and 4.24:1 on the sidebar — **both below the 4.5:1 body-text floor, i.e. secondary text in the nav was already failing WCAG AA.** 42% clears every surface in the ramp. Do not lighten it.

### Semantic / status

| Token | Value | Foreground |
|---|---|---|
| `--success` | `142 71% 45%` | white |
| `--warning` | `38 92% 50%` | white |
| `--info` | `199 89% 48%` | white |
| `--destructive` | `0 72% 51%` | white |

Charts: `--chart-1` brand purple, `-2` success green, `-3` warning amber, `-4` `220 9% 42%` (the neutral, so the grey series belongs to the same family), `-5` info blue.

### Dark mode

`.dark` is fully defined in `src/index.css` and is **unreachable today** — there is no ThemeProvider and nothing sets the class. It is kept internally consistent (same hue 220, elevation inverted sidebar 8% → page 10% → card 14% → well 19%, brand purple at 68% lightness) so it is not left broken for whoever wires the toggle up. Don't rely on it; don't let it rot.

### Deprecated literal aliases

`tailwind.config.ts` still exposes 15 legacy hex aliases. **These are escape hatches for un-migrated call sites, not options.** Do not use them in new code; replace them when you touch a file.

| Alias | Value | Use instead | Live uses |
|---|---|---|---|
| `purple` | `#6c5ce7` | `primary` | 51 |
| `gray2`, `gray3` | → `hsl(var(--muted-foreground))` | `muted-foreground` | 23 |
| `green_dark` | `#10B981` | `success` / `green-700` | 13 |
| `red_dark` | `#EF4444` | `destructive` | 4 |
| `red_light` | `#FECACA` | `red-200` | 4 |
| `green_light` | `#BBF7D0` | `green-200` | 2 |
| `black1`–`black4`, `gray1`, `gray4`, `orange_dark`, `orange_light`, `border_color` | hex literals | `foreground` / `muted-foreground` / `border` | 0 |

`gray2` and `gray3` were already repointed at `--muted-foreground` rather than rewriting ~30 call sites — `gray3` was a faintly *green* grey (hue 165) doing the same job as the token. Secondary text is now one colour everywhere, but the alias names still lie about what they are.

---

## 2. Border radius

The whole scale derives from `--radius: 0.375rem` (6px) in `src/index.css`. Previously only `sm`/`md`/`lg` did, while `xl` and `2xl` fell through to Tailwind's 12px/16px defaults — so the token controlled only part of the app and cards were rounder than buttons by accident rather than by intent.

*Why 6px:* Baselinq produces legally defensible records for contract administration and insurance. Tighter geometry reads precise and authoritative; softer geometry reads consumer. Best-in-class enterprise tooling sits in the 4–8px band.

| Class | Computed | Use | Live uses |
|---|---|---|---|
| `rounded-sm` | 3px | Inline chips, small tags | 28 |
| `rounded-md` | 4px | **Badges**, inputs, menu items | 145 |
| `rounded-lg` | **6px** | Buttons, form controls | 572 |
| `rounded-xl` | **8px** | Cards, panels, wells | 419 |
| `rounded-2xl` | 12px | Modals, drawers, hero | 11 |
| `rounded-full` | — | Avatars, unread dots, icon buttons, progress bars — genuinely circular things only | 356 |

`rounded-lg` is **6px, not 8px**; `rounded-xl` is **8px, not 12px**. Any doc or Figma note saying otherwise predates the scale.

---

## 3. Typography

Font: `Aeonik Pro TRIAL`, set on `body` in `src/index.css`. ⚠️ **Still a trial licence — the app is shipping on an unlicensed font.** Resolve before launch.

### Size scale in use

| Class | Size | Uses | Share |
|---|---|---|---|
| `text-xs` | 12px | 1784 | 57% |
| `text-sm` | 14px | 1159 | 37% |
| `text-2xl` | 24px | 66 | 2% |
| `text-base` | 16px | 60 | 2% |
| `text-lg` | 18px | 29 | <1% |
| `text-3xl` | 30px | 15 | <1% |
| `text-xl` | 20px | 12 | <1% |
| `text-4xl` | 36px | 1 | <1% |
| `text-[Npx]` arbitrary | — | 4 | — |

**94% of all text is `text-xs` or `text-sm`.** That is the app: dense, tabular, information-first. Reach for a larger size only for a page title or a stat value.

### Weights

| Class | Uses | Share | Use |
|---|---|---|---|
| `font-normal` | 843 | 64% | Body, titles, labels — the default |
| `font-medium` | 456 | 35% | Buttons, badges, emphasis, selected states |
| `font-semibold` | 8 | <1% | Effectively unused — don't add more |
| `font-light` | 1 | — | Deprecated; `Button`'s base weight was moved off it because `outline` had to re-declare `font-normal`, rendering two variants of the same button at different weights |

Only two weights are in real use. Treat `font-semibold`/`font-bold` as out of system.

### Roles

| Role | Class |
|---|---|
| Page title | `text-2xl font-normal tracking-tight text-foreground` — use `<PageHeader>`, don't retype it |
| Page description | `text-sm text-muted-foreground mt-1` |
| Body | `text-sm text-foreground` |
| Label / metadata | `text-xs text-muted-foreground` |
| Badge text | `text-xs font-medium` |

---

## 4. Canonical components — use these instead

Four primitives were written during the July 2026 cleanup to end specific duplication. **`StatusBadge` and `Alert` currently have ZERO importers**, while the patterns they replace are still being hand-rolled. Adopt them.

| Instead of this inline pattern | Use | Importers today |
|---|---|---|
| `<h1 className="text-2xl font-normal tracking-tight text-foreground">` | `<PageHeader title description actions>` — `src/components/ui/page-header.tsx` | 3 |
| Hand-rolled "nothing here yet" block | `<EmptyState icon title description action>` — `src/components/ui/empty-state.tsx` | ~30 |
| `<span className="bg-green-50 text-green-700 border border-green-200 rounded-md px-2 py-0.5 text-xs">` | `<StatusBadge status={x} />` or `<StatusBadge tone="success" />` — `src/components/ui/status-badge.tsx` | **0** |
| `<div className="bg-amber-50 border border-amber-200 rounded-xl p-4">` inline banner (~106 occurrences) | `<Alert>` + `<AlertTitle>` + `<AlertDescription>` — `src/components/ui/alert.tsx` | **0** |
| Hand-rolled status colour strings | `<Badge variant="success\|warning\|danger\|info\|neutral">` — `src/components/ui/badge.tsx` | — |

### PageHeader
The title class string was retyped on every page, so drift was inevitable and had already happened: some pages reached `text-3xl`, one used `text-xl font-medium`, one used a non-existent `font-regular` class, and the dashboard home had no page title at all.

### EmptyState
Five-plus hand-rolled empty states used four vertical paddings (`py-12/14/16/24`), three border treatments (dashed, solid, none) and two text colours, plus three near-duplicate local components all called some variant of "EmptyState". *An empty screen is where a user decides whether a product feels finished. Worth having exactly one of.* Props: `variant="bordered"` (dashed well, default) or `"plain"` (inside cards); `size="sm"` (panels/drawers) or `"md"` (full pages).

### StatusBadge / Badge
Roughly twelve parallel "status pill" implementations existed across TaskDetails, Compliance, AuditPage, ProjectHealth, HealthBadge, ProjectStatusCard, RecentActivity, chatSammary, RiskOverView, TimeBarsTab and MeetingStatusBadges. They disagreed on hue (green vs emerald, amber vs orange vs yellow), on intensity (`bg-*-50` vs `-100` vs `-500` vs `-600`), and on whether a border was drawn — so the same logical state rendered differently depending on the page. `StatusBadge` supports a `dot` form for dense rows, whose colour is derived from the pill classes so the two can never drift apart.

**Badges are `rounded-md` (4px), not `rounded-full`.** A status badge is a data element; a squared-off chip reads as precise where a pill reads as consumer. Genuinely circular things — avatars, unread dots, icon buttons — keep `rounded-full` at their call sites.

### Status colour scale — 50 / 700 / 200
`src/lib/statusColors.ts` maps an API status string to classes. It is the convention `Badge` and `StatusBadge` codify; use it rather than inventing a mapping.

| Meaning | Classes | Statuses matched |
|---|---|---|
| Positive / done | `bg-green-50 text-green-700 border border-green-200` | done, approved, completed, verified, closed, eot awarded, acknowledged, active |
| In progress / awaiting | `bg-primary/10 text-primary border border-primary/30` | in progress, in review, issued, submitted, under review, priced, notice issued, under assessment, distributed, scheduled, … |
| Pending / waiting | `bg-amber-50 text-amber-700 border border-amber-200` | pending, draft, todo |
| Rejected / failed | `bg-red-50 text-red-700 border border-red-200` | rejected, declined, inactive, overdue |
| Default | `bg-muted text-muted-foreground border border-border` | everything else |

`Badge`'s `info` variant uses `blue-50/700/200` rather than `primary/10` — the only place the two diverge.

---

## 5. Other primitives, as built

| Primitive | Actual base classes |
|---|---|
| `Button` | `rounded-lg text-sm font-normal`; sizes `default h-10 px-4`, `sm h-9 px-3`, `xs h-8 px-3 text-xs`, `lg h-11 px-8`, `icon h-10 w-10`. Variants: default (`bg-primary`), destructive, outline, secondary, ghost, link |
| `Card` | `rounded-xl shadow-none border border-border bg-card overflow-hidden`; `CardHeader`/`CardContent`/`CardFooter` = `p-6`; `CardTitle` = `text-2xl font-medium` |
| `Input` | `rounded-xl border border-border bg-card text-sm py-[12px] px-[18px]` (~44px tall) |
| `Alert` | `rounded-lg border p-4`; variants `default`, `destructive` |
| `Tabs` (segmented) | List `h-10 rounded-md bg-muted p-1`; trigger `rounded-sm text-sm font-medium`, active `bg-background shadow-sm` |
| Underline tabs | `border-b-2 border-transparent` inactive → `border-primary` active, `text-sm font-normal px-0 py-3` |
| Layout | `<DashboardLayout>` defaults `padding="p-6"`; pass `padding="p-0"` for panel pages and give the heading its own `px-6 py-4 border-b border-border` strip |

`Button size="xs"` exists because ~19 call sites were hand-pasting `h-8 text-xs`. Use the variant.

### Icons
Lucide React only (173 files), no emoji. `h-4 w-4` is the default (735 uses); `h-3 w-3` / `h-3.5 w-3.5` inside dense rows and badges; `h-5 w-5` and `h-6 w-6` for headers and empty states. Colour inherits or `text-muted-foreground`.

### Spacing
`gap-6` / `space-y-6` between major sections, `gap-4` between cards in a grid, `p-6` page padding. No spacing token exists beyond Tailwind's default scale — don't invent one.

---

## 6. Known inconsistencies — unsettled, decide deliberately

These are real divergences in the code today. **Do not pick one at random per page.** Pick the left-hand column (it is what the shared primitives use) or settle it repo-wide in one change.

| Question | Canonical | Divergent | Where |
|---|---|---|---|
| Green for on-track/positive | `green-*` | `emerald-*` | 27 files use emerald, incl. `src/pages/Compliance.tsx:83`, `src/components/HealthBadge.tsx:11`, `src/components/ProjectStatusCard.tsx:44`. `src/lib/statusColors.ts:16` and `src/components/ui/badge.tsx:31` use green |
| Amber vs orange for warning | `amber-*` (`badge.tsx:32`) | `orange-*` | `src/components/ProjectStatusCard.tsx:38,45,52` |
| Status pill intensity | `50 / 700 / 200` | `100 / 800` | `src/components/compliance/ComplianceDetailModal.tsx:65` (`bg-red-100 text-red-800`), which also overrides the badge back to `rounded-full` |
| Badge shape | `rounded-md` | `rounded-full` overrides at call sites | 356 `rounded-full` uses; most are legitimately circular, some are status pills |
| Input surface | `bg-card`, `rounded-xl` | Old guidance said `bg-white h-10 rounded-lg` | `src/components/ui/input.tsx` — also carries hardcoded `text-black` and `placeholder:text-[#1A1A1A80]`, both off-token |
| `CardTitle` size | — | `text-2xl font-medium`, identical in size to a page title | `src/components/ui/card.tsx` — most cards override it |
| Legacy `purple` alias | `primary` | `text-purple` / `bg-purple` / `border-purple` | 51 uses |

---

## 7. Checklist before a PR

- [ ] No hex literals — use tokens. (1221 hex strings remain in `src/`, mostly in charts, mail templates and SVGs; don't add more.)
- [ ] No `rounded-[Npx]` (1 left) or `text-[Npx]` (4 left) arbitrary values.
- [ ] Surfaces use `bg-card` / `bg-background` / `bg-muted` / `bg-sidebar`, not `bg-white` or a hex.
- [ ] Page title via `<PageHeader>`.
- [ ] Empty state via `<EmptyState>`.
- [ ] Status pill via `<StatusBadge>` or `<Badge variant="…">`, never a hand-typed colour string.
- [ ] Inline coloured banner via `<Alert>`.
- [ ] Compact button via `<Button size="xs">`, not `h-8 text-xs`.
- [ ] Icons from `lucide-react`, `h-4 w-4` unless in a dense row.
- [ ] No new legacy-alias uses (`purple`, `gray2`, `green_dark`, …).
- [ ] Text is `text-xs`/`text-sm` and `font-normal`/`font-medium` unless there's a reason.

---

## 8. Changing the system

- Changing the brand colour: edit `--primary` in `src/index.css`. Nothing else.
- Changing corner sharpness: edit `--radius`. The whole scale follows.
- Adding a colour: don't. Every value above already exists; adding a sixteenth grey is how the previous mess happened.
- Changing this document: only after changing the code. This file records what is, not what someone wished.
