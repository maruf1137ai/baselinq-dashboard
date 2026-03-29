# Baselinq Design Tokens — FULL API EXTRACTION
## Source: Figma API — file "Baselinq main" (4VuDv2dXNfiSSwtffLbrqq)
## Extracted: 2026-03-24 via REST API across 8 key frames
## Frames: Overview, Compliance, AI Workspace, Communication, Tasks, Finance, Meetings, Baselinq

---

## TYPOGRAPHY

### Fonts Used in Figma — RESOLVED
| Font | Uses | Where | Decision |
|------|------|-------|----------|
| **Aeonik Pro** | 1,512 | All app frames (dashboard, tasks, docs, etc) | ✅ THE app font |
| **Manrope** | 463 | 339 in "Baselinq" marketing frame, ~124 drift in app frames | Marketing/website only |
| Inter | 68 | Scattered | Designer drift |

**RESOLVED: Manrope is the marketing/website font. 73% of its usage (339/463) is in the landing page frame.**
The ~124 Manrope instances in app frames are badge text, data values, search placeholders — designer inconsistency at small sizes where the fonts are nearly identical. All app code should use Aeonik Pro.

### Font Weight Distribution
| Weight | Uses | Role |
|--------|------|------|
| 400 (Regular) | 798 | ~93% of all text |
| 500 (Medium) | 31 | Labels, emphasis |
| 600 (Semibold) | 17 | Headers |
| 300 (Light) | 14 | Minimal |

### Font Sizes (from Figma API)
| Size | Uses | Tailwind Map | Role |
|------|------|-------------|------|
| 64px | 9 | text-6xl | Hero/display only |
| 56px | 15 | text-5xl | Large display |
| 32px | 10 | text-3xl | Large stats |
| 24px | 10 | text-2xl | Page headings |
| 22px | 9 | text-xl | Sub-headings |
| **16px** | **99** | **text-base** | **Body text (PRIMARY)** |
| 15.5-15.9px | 66 | text-base | Body text variants (should normalise to 16px) |
| **14px** | **258** | **text-sm** | **MOST USED — nav, labels, secondary text** |
| 13.2-13.9px | 42 | text-sm | Should normalise to 14px |
| **12px** | **180** | **text-xs** | Captions, timestamps, badges |
| 11px | 13 | text-xs | Small labels |
| 10.4px | 9 | — | Micro (discourage in code) |
| 8.3px | 9 | — | Micro (discourage in code) |

**Key insight: 14px (258 uses) is the most common size, not 16px. The app is dense/data-heavy.**

### Line Heights (from Figma API)
| Height | Uses | Pairs With |
|--------|------|-----------|
| **20px** | **285** | 14px text (most common) |
| **24px** | 151 | 16px text |
| 16px | 121 | 12px text |
| 18px | 62 | 14px text (tight) |
| 28px | 21 | 16-17px body (loose) |
| 32px | 20 | 22-24px headings |

---

## COLOURS

### Fill Colours (from Figma API — top 30)
| Hex | Uses | Role |
|-----|------|------|
| **#FFFFFF** | 293 | Card/panel backgrounds, button text |
| **#000000** | 189 | Text (headings, emphasis) |
| **#6B6B6B** | 111 | Secondary/muted text |
| **#FAFAFA** | 71 | Light surface background |
| **#8081F6** | 61 | **PRIMARY PURPLE** — buttons, links, accents |
| **#F3F2F0** | 52 | **SURFACE BACKGROUND** — sidebar, panels |
| #1A1D23 | 49 | Dark text variant |
| #6B7280 | 42 | Grey (muted text, icons) |
| #9CA3AF | 42 | Light grey (placeholders, captions) |
| #717784 | 41 | Grey variant |
| #2F80ED | 38 | Blue accent |
| #495565 | 32 | Dark grey |
| #F8FAFB | 27 | Very light surface |
| #1A1A1A | 22 | Near-black text |
| #121212 | 21 | Near-black |
| #10B981 | 21 | Green (success) |
| #EEEEEE | 21 | Light border/divider |
| #D0D5DB | 20 | Border grey |
| #E6E8EB | 18 | Border grey variant |
| #F59E0B | 17 | Amber (warning) |
| #3A6FF7 | 16 | Blue link/accent |
| #D2D2D2 | 16 | Light grey |
| #111827 | 15 | Dark text |
| #FFF7ED | 15 | Warning badge background |
| #EFEFEF | 15 | Light grey surface |

### Border/Stroke Colours (from Figma API)
| Hex | Uses | Role |
|-----|------|------|
| #000000 | 310 | Icon strokes (Lucide-style) |
| #6B6B6B | 304 | Icon strokes (grey) |
| #FFFFFF | 115 | White strokes |
| #9CA3AF | 63 | Light grey borders |
| #1C274C | 40 | Dark icon strokes |
| #6B7280 | 39 | Grey borders |
| #898989 | 33 | Medium grey |
| **#EDEDED** | 30 | Divider/border |
| **#8081F6** | 30 | Primary accent borders |
| #2F80ED | 25 | Blue accent |
| **#E0E0E0** | 23 | Standard border |
| **#DEDEDE** | 19 | Panel border (confirmed from inspect) |
| **#E6E8EB** | 18 | Card border |

⚠️ **ISSUE: 5+ different "light grey border" colours in Figma itself (#EDEDED, #E0E0E0, #DEDEDE, #E6E8EB, #D0D5DB). The designer hasn't consolidated these either. Need ONE border colour.**

---

## BORDER RADIUS (from Figma API)

### Meaningful values (excluding Figma artifacts like 16777200px)
| Radius | Uses | Role |
|--------|------|------|
| 2px | 91 | Small (icon containers, micro elements) |
| 6px | 24 | Small-medium (badges, tags) |
| **8px** | **39** | **Buttons, inputs (CONFIRMED)** |
| **10px** | 26 | Cards variant |
| 11px | 15 | Cards variant |
| **13px** | 27 | Cards/panels |
| 28px | 14 | Large pills |
| 37px | 9 | Round elements |
| 49px | 9 | Near-circular |
| 55px | 16 | Circular elements |
| 100px | 7 | Circular |

⚠️ **ISSUE: The Figma file ALSO has radius inconsistency — 8px, 10px, 11px, 13px all used for similar elements. The designer needs to consolidate too.**

---

## SPACING / PADDING (from Figma API)
| Value | Tailwind |
|-------|----------|
| 2px | p-0.5 |
| 4px | p-1 |
| 6px | p-1.5 |
| 8px | p-2 |
| 10px | p-2.5 |
| 12px | p-3 |
| 15px | ~p-4 |
| 16px | p-4 |
| 20px | p-5 |
| 46px | ~p-12 |

---

## LAYOUT
| Property | Value | Source |
|----------|-------|--------|
| Sidebar width | 280px | Figma inspect |
| Top bar height | 78px | Figma inspect |
| Main content width | 1,233px | Figma inspect |

---

## RECOMMENDED CONSOLIDATION

Based on the Figma API data, here's what the design system SHOULD be:

### Colours (consolidated from Figma's actual usage)
| Token | Hex | Figma Usage |
|-------|-----|-------------|
| primary | #8081F6 | 61 fills + 30 strokes |
| foreground | #000000 | 189 fills (headings) |
| body-text | #1A1A1A or #1A1D23 | 22-49 fills (body) |
| muted | #6B6B6B | 111 fills (secondary text) |
| muted-light | #9CA3AF | 42 fills (placeholders) |
| surface | #F3F2F0 | 52 fills (panels) |
| background | #FAFAFA | 71 fills (page bg) |
| card | #FFFFFF | 293 fills |
| border | #DEDEDE or #E6E8EB | Pick ONE |
| success | #10B981 | 21 fills |
| warning | #F59E0B | 17 fills |
| info/blue | #2F80ED or #3A6FF7 | Pick ONE |

### Type Scale (consolidated)
| Role | Size | Line Height | Weight |
|------|------|-------------|--------|
| Display | 56-64px | 56-80px | 400 |
| H1 | 32px | 32px | 400 |
| H2 | 24px | 32px | 400 |
| H3 | 22px | 28px | 400 |
| Body | 16px | 24px | 400 |
| Secondary | 14px | 20px | 400 |
| Caption | 12px | 16px | 400 |

### Border Radius (consolidated)
| Role | Value |
|------|-------|
| Micro | 2px |
| Small | 6px |
| Default (buttons/inputs) | 8px |
| Cards/panels | 12px (round up from 10-13px) |
| Pills/badges | 28px+ or full-round |
