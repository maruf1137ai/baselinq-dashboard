# Baselinq Frontend Brand Guidelines
## The single source of truth for all developers and AI agents.
## Updated: 2026-03-25 — Confirmed through PR6 design review with David.

---

## 1. TYPOGRAPHY

### Font Family
- **Aeonik Pro** — the app font (all UI)
- **Manrope** — marketing/website only (not used in app)
- ⚠️ Code currently uses "Aeonik Pro TRIAL" — needs proper license

### Text Hierarchy
| Role | Class | Size | Weight | Use |
|------|-------|------|--------|-----|
| Page title | `text-2xl font-normal tracking-tight text-foreground` | 24px | 400 | Page headings |
| Stat value | `text-2xl text-foreground` | 24px | 400 | Dashboard numbers |
| Section header | `text-sm text-muted-foreground` | 14px | 400 | Card titles (with icon) |
| Sub-page tab | `text-base` | 16px | 500 | Tab labels |
| Body text | `text-sm text-foreground` | 14px | 400 | Content, descriptions |
| Label | `text-xs text-muted-foreground` | 12px | 400 | Metadata, timestamps |
| Badge text | `text-xs` | 12px | 500 | Status pills |

### Font Weights
| Weight | Class | Usage |
|--------|-------|-------|
| 400 | `font-normal` | 93% of all text — body, titles, labels |
| 500 | `font-medium` | Buttons, emphasis, selected states |
| 600 | `font-semibold` | Rarely used |

---

## 2. COLOURS

### Primary
- `primary` / `bg-primary` / `text-primary` → **#8081F6**
- NEVER use #6c5ce7, #6366F1, #818CF8, or any other purple variant

### Text (use semantic tokens ONLY)
| Token | Class | Use |
|-------|-------|-----|
| Foreground | `text-foreground` | Headings, body, emphasis |
| Muted | `text-muted-foreground` | Labels, secondary text, icons |
| Muted/50 | `text-muted-foreground/50` | Placeholders, disabled |
| Primary | `text-primary` | Links, active accents |
| Destructive | `text-destructive` | Errors, overdue |

### Backgrounds
| Token | Class | Hex | Use |
|-------|-------|-----|-----|
| Page | `bg-background` | #F7F8FB | Main page background |
| Surface | `bg-sidebar` | #F3F2F0 | Warm grey panels, selected states |
| Card | `bg-white` | #FFFFFF | Cards, panels, modals |
| Muted | `bg-muted` | ~#F2F3F5 | Toggle backgrounds, secondary surfaces |

### Borders
| Token | Class | Use |
|-------|-------|-----|
| Default | `border-border` | ALL borders — no hardcoded hex |

---

## 3. SPACING & PADDING

### Page Layout
| Context | Padding | How |
|---------|---------|-----|
| Standard pages | 24px all sides | DashboardLayout default `p-6` |
| Panel pages (Comms, Linq Chats) | 0 on main, heading separate | `padding="p-0"` + `px-6 py-4` heading |

### Card Padding (Home page pattern)
| Element | Class |
|---------|-------|
| CardHeader | `px-3 py-2` |
| CardContent | `p-2 mx-2 rounded-md` |

### Section Spacing
| Gap | Class | Use |
|-----|-------|-----|
| Between title and content | `mb-6` | After page heading |
| Between sections | `space-y-6` or `gap-6` | Major content sections |
| Between cards in grid | `gap-4` | Card grids |

---

## 4. BORDER RADIUS

| Class | Value | Use |
|-------|-------|-----|
| `rounded-lg` | 8px | **Buttons, inputs, filters** (Figma-confirmed) |
| `rounded-xl` | 12px | Cards, panels, containers |
| `rounded-md` | 6px | Small inner elements |
| `rounded-full` | 9999px | Status badges, avatars |

---

## 5. COMPONENTS

### Buttons
| Type | Class |
|------|-------|
| Primary | `bg-primary text-white rounded-lg h-10` |
| Secondary | `bg-white border border-border text-foreground rounded-lg h-10 hover:bg-muted` |
| Filter size | `h-8 text-xs rounded-lg` |

### Search Bars
```
h-10 bg-white border border-border rounded-lg text-sm placeholder:text-muted-foreground
```
- Search icon: `h-4 w-4 text-muted-foreground` inside, left-aligned
- NO grey background (bg-muted) on search inputs

### Filter Pills / Toggles
```
h-8 text-xs rounded-lg border transition-colors
Active:   bg-foreground text-white border-foreground
Inactive: bg-white text-foreground border-border hover:bg-zinc-50
```
- Toggle wrapper: `bg-muted rounded-lg p-0.5`
- Active toggle: `bg-white text-foreground shadow-sm`

### Status Badges
```
text-xs px-2 py-0.5 rounded-full
```
| Status | Colours |
|--------|---------|
| Success/Done | `bg-green-50 text-green-700` |
| Warning/Pending | `bg-amber-50 text-amber-700` |
| Error/Overdue | `bg-red-50 text-red-700` |
| Info/In Progress | `bg-primary/10 text-primary` |
| Default/Draft | `bg-muted text-muted-foreground` |

### Sub-page Tabs (Programme/Finance pattern)
```
Container: border-b border-border
Tab: text-base py-4 px-6 border-b-2 transition-all
Active:   border-[#8081F6] text-foreground
Inactive: text-muted-foreground border-transparent
```

### Cards
- Outer: Card component with default styling
- Header: `CardHeader className="flex flex-row items-center justify-between px-3 py-2"`
- Content: `CardContent className="bg-white p-2 mx-2 rounded-md"`
- Status pills in header: `py-1 px-3 bg-white rounded-full text-xs`

### Panel Sidebars (Comms / Linq Chats)
- Width: `w-[300px] shrink-0`
- Internal padding: `p-3`
- Button: secondary outlined (`bg-white border-border`)
- Search: `h-10 bg-white border-border rounded-lg`
- Selected item: `bg-sidebar` (warm grey)
- Border between panels: `border-r border-border` or `border-l border-border`

---

## 6. PAGE PATTERNS

### Standard Page (Finance, Compliance, Meetings, Documents, Programme)
```tsx
<DashboardLayout>
  <div className="space-y-6">
    <h1 className="text-2xl font-normal tracking-tight text-foreground">Page Title</h1>
    {/* Content sections */}
  </div>
</DashboardLayout>
```

### Panel Page (Communications, Linq Chats)
```tsx
<DashboardLayout padding="p-0">
  <div className="flex flex-col h-[calc(100vh-64px)]">
    <div className="px-6 py-4 border-b border-border">
      <h1 className="text-2xl font-normal tracking-tight text-foreground">Page Title</h1>
    </div>
    <div className="flex flex-1 overflow-hidden">
      {/* Panels */}
    </div>
  </div>
</DashboardLayout>
```

### Dashboard Page (Home)
```tsx
<DashboardLayout>
  <div className="space-y-6">
    {/* Project header bar */}
    {/* Card grid */}
    {/* Full-width cards */}
  </div>
</DashboardLayout>
```

---

## 7. ICONS
- Library: **Lucide React** exclusively
- Default size: `h-4 w-4`
- Medium: `h-5 w-5`
- Large: `h-6 w-6`
- Colour: inherit or `text-muted-foreground`
- NO emoji icons

---

## 8. ENFORCEMENT CHECKLIST (before every PR)
- [ ] Zero hardcoded hex colours (use tokens)
- [ ] Zero arbitrary rounded-[Npx] values
- [ ] Zero arbitrary text-[Npx] font sizes
- [ ] All search bars: h-10, bg-white, rounded-lg
- [ ] All filter elements: h-8, rounded-lg
- [ ] All buttons: rounded-lg, h-10 or h-8
- [ ] Page title: text-2xl font-normal tracking-tight
- [ ] Sub-page tabs: Programme pattern (text-base, purple underline)
- [ ] Icons from lucide-react only
- [ ] Status badges use standard colour system
