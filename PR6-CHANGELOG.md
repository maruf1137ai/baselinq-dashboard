# PR6 — Complete Design System Overhaul Changelog
## 69 commits | 121 files changed | 2,909 insertions | 3,719 deletions

---

## GLOBAL CHANGES (All Pages)

### Colours
1. Consolidated 7 purple variants (#6c5ce7, #6366F1, #818CF8, #6c6de9, #5a4bd1, #4F46E5, #a78bfa) → single `#8081F6` — 143 instances replaced
2. Replaced 164+ hardcoded hex text colours → `text-foreground`, `text-muted-foreground`, `text-muted-foreground/50`
3. Replaced 80+ hardcoded background hex colours → `bg-sidebar`, `bg-muted`, `bg-primary/10`
4. Replaced 50+ hardcoded border hex colours → `border-border`
5. Fixed `orenge` typo → `orange` in tailwind.config.ts

### Border Radius
6. Normalised 20 arbitrary `rounded-[Npx]` values → 5 Tailwind standards: `rounded`, `rounded-md`, `rounded-lg`, `rounded-xl`, `rounded-full`
7. Button component: removed competing radius overrides from size variants — all buttons now `rounded-lg` (8px, Figma-confirmed)
8. Fixed duplicate conflicting `rounded-[19px] rounded-[13px]` on CreateRequestButton

### Typography
9. Normalised 14 arbitrary font sizes (text-[10px], text-[11px], text-[13px] etc) → Tailwind scale (text-xs, text-sm, text-base)
10. Page titles: `text-3xl` (30px) → `text-2xl` (24px) — industry standard for SaaS
11. All page titles use consistent pattern: `text-2xl font-normal tracking-tight text-foreground`

### Spacing & Padding
12. All standard pages use DashboardLayout default `p-6` (24px)
13. Communications + Linq Chats: `padding="p-0"` (panel layouts need full width)
14. Consistent heading gap: `mb-6` after page title (where applicable)
15. Section gaps: `space-y-6` between major sections

### Components
16. All search bars standardised: `h-10 bg-white border-border rounded-lg text-sm`
17. All filter elements standardised: `h-8 text-xs rounded-lg`
18. Primary buttons: `bg-primary text-white rounded-lg h-10`
19. Secondary buttons: `bg-white border-border text-foreground rounded-lg h-10`

---

## HOME PAGE

### Header Area
20. Page padding uses DashboardLayout default p-6

### Cards
21. CardHeader: `px-3 py-2` (consistent across My Actions, Activity Feed, Budget, Timeline, Recent Documents)
22. CardContent: `p-2 mx-2 rounded-md` (consistent across all cards)
23. Status pills ("82% Complete", "97 days remaining"): added `py-1 px-3`, proper vertical centering, `mr-2` margin so they don't touch card edges
24. Budget Breakdown: restructured to use CardHeader + CardContent pattern (was CardContent-only with p-5)
25. Project Timeline: restructured to use CardHeader + CardContent pattern (was CardContent-only with p-5 bg-sidebar)
26. Budget inner grid: removed excessive `py-6 px-10` padding
27. Timeline phase labels: `text-[10px]` → `text-xs` (12px)

### Activity Feed
28. Avatar initials: `text-[10px]` → `text-xs`
29. Timestamp text: `text-[10px]` → `text-xs`
30. Notification count badge: `text-[10px]` → `text-xs`
31. Removed left border accent lines (`border-l-2`) on action items

### Top Bar
32. Bell icon button: added `rounded-lg` to match other buttons
33. Button component radius conflicts resolved — all use `rounded-lg` from base class

---

## TASKS PAGE

### Header
34. Added "Tasks" page heading: `text-2xl font-normal tracking-tight text-foreground`

### Filter Bar
35. "All Items" → "All Tasks", "My Items" → "My Tasks"
36. Added "All" as first option in document type pills
37. Filter pills: black for all → white (unselected) / black (selected only)
38. "All" shows black on default load, individual pills show black only when specifically clicked
39. All filter pills: `h-8 rounded-lg text-xs` (was `rounded-full`)
40. All dropdowns ("All Assignees", "All Dates"): `h-8 rounded-lg text-xs border-border`
41. Toggle ("All Tasks" / "My Tasks"): `bg-muted rounded-lg p-0.5` wrapper, `h-8 rounded-lg text-xs`

### Task Cards
42. Card background: `bg-sidebar` (#F3F2F0) inner colour for visual separation from white columns

---

## COMMUNICATIONS PAGE

### Layout
43. Added "Communications" page heading with `border-b border-border`
44. `DashboardLayout padding="p-0"` with `h-[calc(100vh-64px)]` to account for nav bar
45. Three panels inside flex container with `overflow-hidden`

### Left Panel (Channel Sidebar)
46. Width: 340px → 300px (matches Linq Chats)
47. Always 300px (removed collapse/expand toggle)
48. Internal padding: `pl-0 pr-3 py-3` → `p-3` (content no longer touches left border)
49. Added "New Message" button (secondary outlined style: `bg-white border-border`)
50. Search bar: `h-10 bg-white border-border rounded-lg` (was `bg-muted py-[12px] rounded-xl`)
51. Removed All/Unread toggle
52. Selected channel: `bg-sidebar` (warm grey, matches Home)

### Middle Panel (Chat Window)
53. Chat input container: `bg-[#f9f9f9] rounded-full` → `bg-muted rounded-lg border border-border`
54. Send button: `rounded-full` → `rounded-lg`
55. Chat height: `h-[calc(100vh-209px)]` → `h-[calc(100vh-265px)]` to account for heading
56. Removed `border-r` from chat window nav (container handles borders)
57. Disabled message polling (was 2.5s causing page bouncing → disabled entirely)

### Right Panel (AI Summary)
58. Complete redesign from "Task Context" to AI Summary layout
59. Header: task reference + status badge + title + due date
60. Summary section with sparkle icon
61. Details section: key-value pairs (priority, discipline, type)
62. Documents section with clean list items
63. Footer: "View Full Task" (outlined secondary) + "Request Info"
64. Section headers: removed uppercase tracking-wide → sentence case `text-xs font-medium text-muted-foreground`
65. Removed all inner border-b lines between sections (paragraph spacing instead)
66. Width: `w-80` (320px) → `w-[300px]` (matches left panel)
67. Footer: `shrink-0` to stay fixed at bottom
68. Border dividers: `border-r` on sidebar wrapper, `border-l` on summary wrapper

---

## LINQ CHATS (formerly AI Workspace)

### Naming
69. "AI Workspace" → "Linq Chats" everywhere (sidebar nav, page heading)

### Layout
70. Added "Linq Chats" page heading
71. `DashboardLayout padding="p-0"` with heading in separate `px-6 py-4 border-b` section

### Left Panel (Chat Sidebar)
72. Width: `w-64` (256px) → `w-[300px]` + `shrink-0` (was being compressed by flexbox to 237px)
73. Internal padding: `pl-0 pr-3 py-3` → `p-3`
74. "Create New Chat" → "New Chat" (secondary outlined style)
75. Added search bar: `h-10 bg-white border-border rounded-lg` (matching Communications)
76. Removed purple focus ring on search (was `focus:ring-2 focus:ring-ring`)
77. Removed minimize/maximize toggle — sidebar always visible
78. Removed mobile toggle buttons (PanelLeft icons)
79. Removed duplicate "Create New Chat" button

### Chat Area
80. Welcome heading: `text-3xl/4xl` → `text-2xl`
81. Chat messages: `text-base` → `text-sm`
82. Section headings in chat: `text-base` → `text-sm`
83. Chat input: `rounded-2xl` → `rounded-lg`
84. Message bubbles: `rounded-2xl` → `rounded-lg`
85. AI chat container: fixed `rounded-full` (was incorrectly mapped from `rounded-[24px]`) → `rounded-3xl`
86. All `#6c5ce7` references → `#8081F6`

---

## FINANCE PAGE

### Layout
87. Added "Finance" title above tabs
88. Removed `max-w-7xl mx-auto` wrapper (no other page has this)
89. Title-to-tabs gap: `mb-6` → `mb-2` (was too much space)

### Tabs
90. Tabs match Programme purple underline style: `text-base py-4 px-6 border-b-2 border-[#8081F6]`
91. Removed `<ul><li>` wrapping → simple flex + buttons
92. `border-gray-200` → `border-border`

### Cost Ledger
93. `mt-10` → `mt-6` on header
94. Removed duplicate `p-6` padding (was doubling with DashboardLayout)
95. Removed redundant "Cost Ledger" sub-heading (tabs already show section)
96. Table links: `text-[#8081F6] hover:text-indigo-800` → `text-primary hover:text-primary/80`
97. Table headers: `bg-gray-50/70` → `bg-muted/50`
98. Clear Filters: `text-indigo-600` → `text-primary`
99. "Add your first entry": hardcoded hex → `text-primary`

### Payment Certificates
100. All table cells: `text-base` → `text-sm`
101. Table headers: `text-sm` → `text-xs font-normal text-muted-foreground uppercase tracking-wider`
102. Links: `text-[#8081F6] hover:text-blue-800` → `text-primary hover:text-primary/80`
103. `bg-gray-50` → `bg-muted/50`

### Variation Orders
104. Status badges: hardcoded `bg-[#E9F7EC] text-[#16A34A]` → `bg-green-50 text-green-700 border-green-200`

---

## COMPLIANCE PAGE

### Layout
105. Removed "Dashboard" breadcrumb — clean title only
106. Removed `min-h-screen` (unnecessary)
107. Stat cards: `mt-[27px]` → `mt-6`

### Stat Cards
108. Inner padding: `py-[6px] px-[14px]` → `p-3`
109. `py-[10px] px-[14px]` → `p-3`
110. Fixed duplicate "Compliance Score" card — renamed second to "Overdue Items"

### Right Panel (Risk Overview)
111. Panel padding: `px-[25px] py-[45px]` → `p-6`
112. `border-l` → `border-l border-border`
113. Left content: added `pr-6` so text doesn't touch the border line
114. Risk badges: `bg-[#FEE2E2] text-[#DC2626]` → `bg-red-50 text-red-700`
115. Risk badges: `bg-[#FFF7ED] text-[#FF8C00]` → `bg-amber-50 text-amber-700`
116. Risk badges: `bg-[#E9F7EC] text-[#10B981]` → `bg-green-50 text-green-700`
117. Risk item cards: `p-[13px]` → `p-3`
118. Risk header margin: `mb-[11px]` → `mb-3`

### Compliance Items
119. `mb-[14px]` → `mb-3`
120. `p-[14px]` → `p-3`
121. Hardcoded `text-[#DC2626]` → `text-destructive`
122. Hardcoded `text-[#00000091]` → `text-muted-foreground`
123. Badge colours → semantic Tailwind classes

### Search & Filters
124. Search bar: `h-10 bg-white border-border rounded-lg` (standardised)
125. Filter buttons: `h-8 rounded-lg border-border` (standardised)

---

## MEETINGS PAGE

### Layout — Complete Redesign
126. Removed 4 stat cards (Upcoming Meetings, AI Notes Generated, Tasks from Meetings, Compliance Evidence)
127. Removed List/Calendar view toggle
128. Removed "All Meetings" filter button
129. New layout: title → search + Schedule Meeting → Upcoming section → Completed section

### Meeting List
130. Search bar: `h-10 bg-white border-border rounded-lg`
131. Meeting cards: clean — title + badge, date + location, description (1 line), attendees, AI Notes indicator
132. Upcoming meetings show "Upcoming" badge (primary/10)
133. Completed meetings show "Completed" badge (green-50)
134. AI Notes indicator with sparkle icon (completed only)
135. Status badges: hardcoded hex → `bg-green-50 text-green-700`, `bg-amber-50 text-amber-700`
136. Metadata text: `text-base` → `text-sm`
137. Metadata icons: `h-5 w-5` → `h-4 w-4`
138. Card radius: `rounded-xl` → `rounded-lg`
139. Avatar colours: `bg-[#3A6FF7]` → `bg-primary`
140. Link colours: `text-[#3A6FF7]` → `text-primary`
141. Fixed "Fev 10" typo → "Feb 10"

### Meeting Detail — Complete Rewrite
142. Complete rewrite from messy card layout → world-class AI notes (Fireflies/Otter pattern)
143. Clean header: title + status badge + date/time/location/participants
144. AI Summary section with sparkle icon
145. Key Decisions as bullet points with owners
146. Action Items as clean table (action, owner, due date)
147. Risks with warning icon + mitigation text
148. Participants with avatar chips (initials + role)
149. Collapsible Transcript with timestamped speaker segments
150. All sections wrapped in `p-4 border border-border rounded-lg` containers
151. Removed tick boxes, card clutter, "Next Steps" section
152. Title: `text-4xl` → was `text-base` → now `text-lg font-medium`
153. Removed `max-w-4xl` — full width
154. Removed `bg-white text-muted-foreground` from page wrapper
155. All `py-4 px-6` / `py-4 px-5` → `p-4`
156. All `rounded-xl` → `rounded-lg`
157. 20+ hardcoded hex colours → semantic Tailwind classes
158. Labels: `text-sm` → `text-xs text-muted-foreground`
159. Section headers: removed uppercase tracking — sentence case `text-sm font-medium`
160. Removed all remaining hardcoded avatar, badge, button colours

### Meetings Dialogs
161. Schedule Meeting dialog: `bg-[#E6EDFF]` → `bg-primary/10`
162. Create Task dialog: `bg-[#E6EDFF]` → `bg-primary/10`
163. Dialog buttons: `rounded-xl` → `rounded-lg`

---

## DOCUMENTS PAGE

### Header
164. Removed subtitle "1,043 documents"
165. Title: `text-2xl font-normal text-foreground tracking-tight`

### Needs Action Ribbon
166. `bg-gray-50/50 border-gray-100` → `bg-muted/50 border-border`
167. "3 AI flags (4 high)" → "3 issues detected (4 high)"

### Filters
168. Discipline label: `text-sm text-gray-500` → `text-xs text-muted-foreground`
169. Removed "AI flagged" / "IFC only" filters (confusing, non-functional, second line)
170. Sort control moved inline with discipline pills — one clean row
171. Removed extra `pt-4` on filters and `mt-4` on document table

### Document Table
172. Card containers: `rounded-xl shadow-sm` → `rounded-lg` (no shadow)
173. Custom discipline containers: `border-gray-200` → `border-border`
174. Revision circles: `bg-blue-600` → `bg-primary`
175. Badge colours: `text-[#B45309]` → `text-amber-700`, `text-[#C53030]` → `text-red-700`
176. "AI flags" column header → "Issues"
177. `border-gray-100` → `border-border`

### Document Detail
178. Title: `text-4xl` → `text-2xl`
179. Removed `max-w-6xl mx-auto` — full width
180. All `rounded-2xl` → `rounded-lg` on cards
181. All `rounded-xl` → `rounded-lg` on icon containers
182. All buttons: `h-11` → `h-10`
183. Removed `shadow-lg shadow-primary/20` on upload button
184. Section headers: removed `uppercase tracking-widest` → `text-sm font-medium`
185. Padding: `p-8` → `p-4`, `gap-8` → `gap-6`
186. All hardcoded `text-gray-*` → semantic tokens
187. Badge: `text-[#B45309]` → `text-amber-700`
188. Badge: `text-[#6D28D9]` → `text-purple-700`
189. `border-gray-200` → `border-border`
190. Removed floating `border-t` line

---

## PROGRAMME PAGE

### Layout
191. Padding: DashboardLayout prop → `padding="p-0"` with inner `px-9 pt-9 pb-6` → reverted to default `p-6`
192. Title: added `font-normal` to match standard

---

## AUDIT & COMPLIANCE PAGE

193. Removed "Dashboard" breadcrumb
194. Title: consistent `text-2xl font-normal text-foreground tracking-tight`

---

## SIDEBAR

195. "AI Workspace" → "Linq Chats"
196. Removed "Products" (dead link, no page exists)

---

## SETTINGS PAGES (all sub-pages)

197. Standardised padding: removed extra `px-6 pt-6 pb-4` that was doubling with DashboardLayout
198. Site, Audit, Data Management, Notifications, Project Details, Security, Team Management — all cleaned

---

## BRAND GUIDELINES (BRAND-GUIDELINES.md)

199. Complete rewrite with all confirmed standards
200. Typography hierarchy documented (text-2xl → text-xs)
201. Font weights documented (400, 500, 600)
202. All colour tokens documented
203. Spacing and padding rules documented
204. Component specs: buttons, filters, search, badges, tabs, cards, panels
205. Page layout patterns: standard, panel, dashboard
206. Sub-page navigation pattern documented (purple underline)
207. Enforcement checklist for PRs

---

## FIGMA DESIGN TOKENS (FIGMA-DESIGN-TOKENS.md)

208. Full API extraction from Figma file
209. All colours with usage counts
210. All font sizes with usage counts
211. Font analysis: Aeonik Pro (1,512 app uses) vs Manrope (339 marketing)
212. Border radius confirmed values
213. Layout dimensions (sidebar 280px, top bar 78px)

---

## DESIGN AUDIT (DESIGN-AUDIT.md)

214. Complete code-level audit with exact issue counts
215. 20+ issues catalogued with line-level detail

---

## DESIGN VS CODE REVIEW (DESIGN-VS-CODE-REVIEW.md)

216. Visual browser review via Puppeteer
217. Cross-page inconsistency analysis
218. Before/after comparison methodology

---

## OTHER

219. Fixed chat message polling (2.5s → disabled, was causing page bouncing)
220. Backend: merged main into development (documents module, S3 storage, signup updates)
221. Backend: applied new migrations (documents, user, project)
222. Backend: installed new dependencies (resend, boto3)
