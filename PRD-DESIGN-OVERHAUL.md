# PR6 Design Overhaul PRD
## 15 items — all approved by David

### 1. Rename AI Workspace → Linq Chats
- Sidebar nav label: "AI Workspace" → "Linq Chats"
- Add page heading "Linq Chats" (text-3xl font-normal tracking-tight text-foreground)
- Update any other references

### 2. Left panel padding (Linq Chats + Communications)
- DashboardLayout gives 24px padding, secondary panels add their own internal padding = ~48px total
- Fix: Remove internal left padding from secondary panels so content starts at 24px from nav sidebar

### 3. Left panel widths
- Communications: 340px → 300px
- Linq Chats: 227px → 300px
- Both identical at 300px

### 4. Communications — remove All/Unread toggle
- Replace with unread count badge on each individual chat item in the list

### 5. Communications — add "New Message" button
- Top of left panel, purple filled, matching Linq Chats' "Create New Chat" style

### 6. Orphaned divider lines
- Audit Comms and Linq Chats for lines that stop mid-page
- Lines must reach edges with proper padding or be inside a container

### 7. Message input/response UI
- Align chat input, send button, attachment icons, message bubbles with brand guidelines
- Consistent borders, radius, colours, icon sizes

### 8. Tasks — filter pills
- White background (unselected), black background (selected)
- Add "All" as first option before VO, RFI, SI, DC, CPI

### 9. Task cards — inner colour
- Add bg-sidebar (#F3F2F0) background to cards to differentiate from white columns

### 10. Filter element sizing — ALL pages
- All filters, toggles, pills: 32px height, rounded-lg (8px)
- Consistent across Tasks, Documents, Finance, etc.

### 11. Naming
- "All Items" → "All Tasks"
- "My Items" → "My Tasks"

### 12. Filter pill shape
- VO, RFI, SI, DC, CPI: rounded-lg (8px) — no more half-moon/rounded-full
- Match the "All Tasks" / "My Tasks" toggle shape

### 13. "View Full Task" button (Communications)
- Outlined style (secondary), not purple filled
- Purple filled reserved for primary page actions only

### 14. Sub-page navigation standard
- Purple underline on active tab (as seen on Programme page)
- Apply to Finance tabs
- Add to BRAND-GUIDELINES.md as THE sub-page nav pattern

### 15. Home page card content padding
- "82% Complete" / "97 days remaining" pills — not centred, touching edges → fix padding
- "View all" on Recent Documents — touching right edge → add padding
- Activity Feed content — too close to left/right edges → add padding
- Budget Breakdown values — nearly touching right edge → add padding
- All card content: min 16px padding from card edges
