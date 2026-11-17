# Design references

The client supplied five reference screenshots for Phase 2. **The image files were not available on the build machine
when this branch was prepared, so they are not committed yet** — add them here with these names:

| File (to add) | What it shows | Used for |
| --- | --- | --- |
| `interface-1-desktop-app.png` | Live site #work hull demo next to the real Vector OS desktop app: left icon rail, "Workspace" sidebar with Projects list and All / Unread / Working tabs, agent chat pane with "Describe what to build..." composer and an "Active steps" card | Home demo chapter 01 "Interface 1" (`components/demo/Demo.tsx` → `AppChrome`, `ChatCard`) |
| `connections-screen.png` | /software filter dropdowns next to the desktop "Connections" screen: search bar, horizontal category tabs (Design & CAD, Manufacturing & Robotics, …), status filter, "Your software" card, "Software catalogue" grouped by vendor with status pills | `/software` (`components/SoftwareDirectory.tsx`) |
| `pricing-current.png` | Current /pricing: Individuals / Professionals toggle, Pro $100 with Pro / Advanced / Max capacity selector (50 edits), Ultra $1,000 (700 edits), Enterprise "Custom Pricing" | Source of truth for prices — kept exactly |
| `pricing-layout-chatgpt.png` | ChatGPT "Upgrade your plan" layout: centred title, Personal / Business toggle, three equal dark cards, full-width pill CTA, price "/ month", feature list with line icons, highlighted top plan with a corner tier pill | `/pricing` layout (`components/Pricing.tsx`) — layout only, no ChatGPT copy or prices |
| `dashboard-settings-cursor.png` | Cursor dashboard Settings page: left nav (Overview, Settings, Usage, Spending, Billing & Invoices), sections in bordered rows | **Future user dashboard only** — out of scope for the website repo |
