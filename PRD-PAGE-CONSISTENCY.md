# PRD — Finance, Compliance, Meetings, Documents Page Consistency

## Reference Standard (from approved pages)
These patterns are confirmed working on Home, Tasks, Communications, Linq Chats:

### Page Structure
- DashboardLayout with default p-6 (standard pages)
- Page title: text-2xl font-normal tracking-tight text-foreground
- mb-6 gap between title and first content section
- space-y-6 between major sections

### Cards
- CardHeader: px-3 py-2, flex justify-between
- CardContent: p-2 mx-2 rounded-md
- Status pills: py-1 px-3 rounded-full, centred in header

### Filters
- All filter elements: h-8 (32px), text-xs, rounded-lg
- Active: bg-foreground text-white
- Inactive: bg-white border-border text-foreground
- Toggle groups: bg-muted rounded-lg p-0.5 wrapper

### Sub-page Tabs
- text-base py-4 px-6 border-b-2 transition-all
- Active: border-[#8081F6] text-foreground
- Inactive: text-muted-foreground border-transparent
- Container: border-b border-border

### Buttons
- Primary: bg-primary text-white rounded-lg h-10
- Secondary/outlined: bg-white border-border text-foreground rounded-lg h-10
- Filter size: h-8

### Text Hierarchy
- Page title: text-2xl font-normal
- Section header: text-sm text-gray2 (with icon)
- Body text: text-sm text-foreground
- Muted/label: text-xs text-muted-foreground
- Status: text-xs with colour-coded badge

---

## Pages to Fix

### 1. Finance
- [x] Title already added (text-2xl)
- [x] Tabs match Programme style  
- [ ] Summary cards (Total Debits/Credits/Net) — check padding matches Home cards
- [ ] Action buttons row — check h-8/h-10 sizing, consistent styles
- [ ] Search bar — match h-10 bg-white border-border rounded-lg
- [ ] Table styling — check text sizes, header colours match brand
- [ ] VO drawer/sheet — check internal padding consistency

### 2. Compliance
- [x] Title already added
- [ ] Stat cards row — check padding/spacing matches Home cards
- [ ] Search + filter buttons — match Tasks filter styling (h-8, rounded-lg)
- [ ] Compliance item cards — check internal padding, badge styling
- [ ] Risk Overview right sidebar — check panel width, padding
- [ ] Warning banners — check styling consistency

### 3. Meetings
- [x] Title already exists
- [ ] Summary stat cards — check match Home ProjectStatusCard styling
- [ ] Filter/search row — match Tasks filter styling  
- [ ] Meeting cards — check padding, badge styling, date format
- [ ] "Fev 10" typo — fix to "Feb 10"

### 4. Documents
- [x] Title already added
- [ ] Search bar — match h-10 sizing
- [ ] NEEDS ACTION banner pills — check sizing, spacing
- [ ] Discipline filter pills — match Tasks filter styling (h-8, rounded-lg)
- [ ] Document list items — check padding, text hierarchy
- [ ] Sort control — check styling

---

## Implementation Plan
For each page:
1. Check page title ✓
2. Check search/filter elements → standardise to h-8/h-10, rounded-lg
3. Check card padding → match Home standard
4. Check badges/pills → consistent styling
5. Check text hierarchy → match reference standard
6. Fix any specific bugs (Fev 10 typo, duplicate Compliance Score)
7. Build and verify
