@AGENTS.md

# Creative Scheduler — Project Brief

## Overview

**App Name:** Creative Scheduler
**Type:** Web Application (Next.js 16 + React 19 + TypeScript + Tailwind CSS 4)
**Purpose:** Internal task scheduling and management platform for a digital marketing agency. Enables admins to create campaign plans and automatically distribute work across creative team members based on capacity, skills, availability, deadlines, and priorities.

---

## Business Context

The agency manages content production for multiple client companies simultaneously. Admins create **campaign plans** for each client — a campaign has a name, start date, end date, and a set of deliverables (e.g., 500 artworks, 100 videos, 2 TV ad campaigns). Campaigns are not restricted to a calendar month; they can span any date range. The system intelligently schedules and assigns tasks across the creative team on a daily basis throughout the campaign period.

Admins can also assign **ad-hoc tasks** that are not part of any campaign plan — for example, urgent last-minute requests. These are added directly when creating or editing tomorrow's daily plan. Tomorrow's plan can be reviewed and updated at any time before it goes live.

---

## Team Structure

The team structure is **flexible and configurable** — roles can be added, renamed, or removed by an admin via Settings. The scheduler assigns tasks based on each team member's assigned role and skill tags, not a hardcoded list.

**Default creator roles (configurable):**

| Role | Typical Responsibilities |
|---|---|
| Senior Creative Executive | Lead creative direction, complex artwork, campaign oversight |
| Creative Executive | Artwork, social media graphics, static ads, general design |
| Video Designer | Video editing, motion graphics, reels, TV ad production |
| Content Writer | Copy, captions, scripts, blog posts, campaign messaging |
| Marketing Specialist | Campaign strategy, analytics, ad set-up, performance reporting |

> Additional roles (e.g. Photographer, Illustrator, UI Designer) can be created in **Settings → Roles & Skills** and will automatically be available for task assignment and scheduling.

---

## User Roles

### Admin
- Full system access
- Create and manage campaign plans (any date range, not restricted to a month)
- View and override daily schedules
- Add/edit/remove tasks manually
- Assign ad-hoc tasks outside of campaign plans when creating or editing tomorrow's plan
- Review and update tomorrow's plan at any time before it goes live
- Manage team availability (mark users as unavailable/on leave)
- View end-of-day reports
- Access all analytics and reporting

### Manager (Manager / Assistant Manager / Team Leader)
- View and manage schedules
- Reassign tasks between available creators
- Review and approve daily plans
- View reports and team progress
- Cannot upload content plans or manage system-level settings

### Creator (Senior Creative Executive / Creative Executive / Video Designer / Content Writer / Marketing Specialist / etc.)
- View their own assigned task list (today and upcoming)
- Update task status through the full workflow (see Task Status Workflow below)
- Add notes or comments to any task
- View their upcoming schedule

---

## Core Application Flows

### 1. Campaign Plan Creation — 3-Step Wizard

**Step 1 — Plan Details:**
- Client (dropdown from preset list), Campaign Name, Campaign Period (date range picker), Notes
- Both Client and Campaign Name are required before advancing

**Step 2 — Import CSV (skippable):**
- Upload CSV with columns: `Content Type`, `Quantity`
- Shows a preview table of imported items
- Imported items appear as "Unscheduled Items" in Step 3
- Replace or delete uploaded file before advancing

**Step 3 — Calendar Plan:**
- Shows a monthly calendar grid covering the campaign period
- Only dates within the campaign period are interactive (clickable)
- Days outside the period are dimmed/non-interactive
- Navigate months with prev/next buttons (constrained to campaign period months)
- **Right panel — Unscheduled Items:** CSV items waiting to be placed; click an item to add it to the selected day
- **Right panel — Day Detail:** Shows items scheduled for the selected day; add new items via content type dropdown + quantity; delete existing items
- Content type chips use color-coded badges per type
- Calendar shows up to 3 items per day cell with overflow count

**Available Clients:** Abans PLC, Xiaomi Sri Lanka, Moeka, Territory London, Madara Books, Sri Sri Madara

**Content Types:**
- Google Ad Set
- Post
- Story
- Paid Ad
- Album (minimum two artworks required)
- Animated Videos

### 2. Automatic Schedule Generation
- System distributes tasks across working days of the month
- Assignment logic considers:
  - Content type vs. creator skills (video editors for video, graphic creators for artwork)
  - Workload balance across team members
  - Task priorities and client deadlines
  - Creator availability (leave, part-time days)
- Daily plan is generated showing each creator's task list for that day

### 3. Daily Task Execution (Creator View)
- Each creator sees their assigned tasks for the day and upcoming days
- Creators move tasks through the status workflow (see Task Status Workflow below)
- Status changes are real-time and visible to managers/admins

### 4. End-of-Day Report
- System auto-generates a daily report at end of day (or on demand)
- Report shows: completed tasks, incomplete tasks, blocked tasks, % completion per creator, % completion per client
- Report feeds into next-day planning

### 5. Next-Day Plan Generation — 3-Step Wizard

Accessible via "Create Tomorrow's Plan" button on the Dashboard.

#### Step 1 — Available Employees
- Lists all team members; all are available by default
- Admin marks leave type per member: Full Day (0h), Half Day (4h), Short Leave (6h)
- Shows capacity pill per member; full-day leave dims and disables the row
- Summary bar: X of Y employees working, total capacity in hours

#### Step 2 — Assign Tasks (split-screen layout)
The step fills the full viewport height with two panels side-by-side:

**Left panel — Task Pool (fixed 360px wide):**
- Shows all available tasks (carry-forward + campaign scheduled + ad-hoc), sorted by deadline then priority
- **Carry-forward / incomplete tasks** shown with **orange tint** (`bg-[#FFF7ED] border-orange-200`) and an "Carry-forward" badge
- Two tabs: **All Tasks** | **Incomplete** (carry-forward only)
- Search bar filters by task name or client
- Each task card shows: name, client, content type badge, priority badge, hours, deadline, current assignee (if any)
- **Assign button** opens a portal dropdown listing available employees — click to assign
- **Drag-and-drop**: cards are `draggable`; drop onto an employee column to assign
- Already-assigned tasks show the assignee name + avatar and dim to 60% opacity; can be reassigned or unassigned
- "Add Task" button opens the Ad-hoc Task Drawer (480px right-side drawer)
  - **Add Task Form Fields:**
    - Task Name (required) — text input
    - Content Type (required) — dropdown select
    - Quantity (required) — number input with +/- cart-style buttons
    - Hours (required) — auto-calculated based on content type × quantity, manually editable
    - Deadline (optional) — date picker
    - Artwork Copy / Caption (optional) — text area for artwork description or video caption
    - Creator (Assignee) (optional) — dropdown select; if not set, task starts in Backlog status
    - Notes (optional) — text area for internal team notes
    - References (optional) — file upload/links section
    - Status is NOT shown (automatically set: Backlog if unassigned, Assigned if creator selected)
    - Priority is NOT in this form (can be set later when task is in Backlog/Assigned)
    - Campaign is NOT in this form (separate creation flow for campaign-based tasks)
- Footer: "X of Y tasks assigned" count

**Right panel — Employee Columns (flex, fills remaining width):**
- One column per available employee; columns share equal width (`flex-1 min-w-[200px]`) with horizontal scroll
- Column header: avatar, name, designation, workload bar (green/amber/red), hours fraction
- Empty column shows a dashed drop-zone with UserPlus icon; highlights with primary color on drag-over
- Assigned task cards show: name, content type, priority, hours; hover reveals Trash (unassign) and "Move →" button
- "Move →" opens a portal dropdown to reassign to another employee column
- Unassigning a task removes it from the column (task stays in left pool, returns to unassigned state)

#### Step 3 — Review & Confirm
- Full read-only summary of the plan before publishing
- Summary stat cards: Total Tasks, Total Hours, Employees, Clients Covered
- Warning banner if any tasks in the pool are unassigned
- Per-employee breakdown: avatar, name, task count, total hours, task chips
- "Publish Plan" button saves to localStorage (`daily-plans`) and redirects to `/schedule?tab=tomorrow`
- Published tasks default to `work-in-progress` status

### 6. Admin Overrides
- Admin can: add new tasks to any day, reassign tasks between creators, change priorities, postpone tasks, remove tasks
- Manual changes are preserved and do not get overwritten by the auto-scheduler unless the admin requests a re-run

### 7. Availability Management
- Admins manage a team availability calendar
- Each creator can be toggled available / on leave / unavailable per day
- When a creator is marked unavailable, their tasks for that day are automatically redistributed among available team members of the same skill set
- Leave can be set for single days or date ranges

---

## Key Entities / Data Model (Conceptual)

- **Client** — company name, contact info (e.g., Abans PLC, Xiaomi Sri Lanka)
- **CampaignPlan** — linked to a client, has name, start date, end date, contains content items
- **CampaignItem** — content type, quantity, deadline, priority; part of a CampaignPlan
- **Task** — atomic unit of work with name, client, content type, hours estimate, priority (optional), deadline (optional), assignee (optional), status, and notes; moves through workflow from Backlog → Assigned → In Progress → In Internal Review → Internally Approved → In Client Review → Client Approved
- **DailySchedule** — collection of tasks assigned per creator per day
- **Creator** — team member with role, skills, availability calendar
- **AvailabilityRecord** — date, creator, status (available / leave / unavailable)
- **DailyReport** — snapshot of task completion at end of each day

---

## Design System

### Color Palette

| Token | Value | Usage |
|---|---|---|
| `--color-primary` | `#5231FF` | Primary buttons, active states, links, highlights |
| `--color-primary-hover` | `#3D1FE8` | Primary button hover |
| `--color-primary-light` | `#EDE9FF` | Primary tinted backgrounds, badges |
| `--color-gray-900` | `#111118` | Headings, primary text |
| `--color-gray-700` | `#374151` | Body text |
| `--color-gray-500` | `#6B7280` | Secondary / muted text, placeholders |
| `--color-gray-300` | `#D1D5DB` | Dividers, strong borders |
| `--color-gray-200` | `#E5E7EB` | Card borders, input borders (default border color) |
| `--color-gray-100` | `#F3F4F6` | Subtle backgrounds, table stripes |
| `--color-gray-50` | `#F9FAFB` | Subtle hover backgrounds, nested surface tints |
| `--color-secondary-btn` | `#4B5563` | Secondary button background |
| `--color-secondary-btn-hover` | `#374151` | Secondary button hover |
| `--color-success` | `#10B981` | Completed status, positive indicators |
| `--color-warning` | `#F59E0B` | In-progress, medium priority |
| `--color-danger` | `#EF4444` | Overdue, blocked, high priority alerts |
| `--color-info` | `#3B82F6` | Informational badges |

### Dark Mode

**Architecture:** Dark mode is fully implemented across all screens via CSS variable overrides and global badge color mappings.

**Core Setup:**
- `components/ThemeProvider.tsx` — React context that manages theme state and sets `data-theme="dark"` on `<html>`
- Toggle button in `TopNav` (Moon/Sun icon) — click to toggle, persists to `localStorage` key `"theme"`
- `globals.css` — defines all dark mode CSS variables, badge color overrides, and modal styling
- Tailwind v4 dark: variants enabled via `@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *))`

**Surface Tokens** — automatically switch via CSS variables, use these for ALL backgrounds:
| Token | Light | Dark |
|---|---|---|
| `--surface-page` | `#ffffff` | `#010910` |
| `--surface-card` | `#FAFAFA` | `#0f1419` |
| `--surface-elevated` | `#FAFAFA` | `#1a202c` |
| `--surface-input` | `#FAFAFA` | `#0f1419` |
| `--surface-subtle` | `#F5F5F5` | `#141820` |

**Text & Border Tokens** — automatically switch via CSS variables:
| Scale | Light | Dark | Usage |
|---|---|---|---|
| `--color-gray-900` | `#111118` | `#F1F5F9` | Headings, primary text |
| `--color-gray-700` | `#374151` | `#CBD5E1` | Body text |
| `--color-gray-500` | `#6B7280` | `#94A3B8` | Muted/secondary text |
| `--color-gray-300` | `#D1D5DB` | `#475569` | Dividers |
| `--color-gray-200` | `#E5E7EB` | `#334155` | Borders |
| `--color-card-border` | `#EBEBED` | `#334155` | Card borders |

**Status & Badge Colors** — automatically switch in dark mode via global CSS overrides in `globals.css`:
| Badge | Light BG | Dark BG | Light Text | Dark Text |
|---|---|---|---|---|
| Blue (Work in Progress) | `#1E40AF` | `#0c4a6e` | `#ffffff` | `#7dd3fc` |
| Purple (Internal Review) | `#6B21A8` | `#4c1d95` | `#ffffff` | `#d8b4fe` |
| Indigo (Internal Approved) | `#3730A3` | `#3730a3` | `#ffffff` | `#a5b4fc` |
| Yellow (Client Review) | `#7C2D12` | `#78350f` | `#ffffff` | `#fcd34d` |
| Orange (Redesign) | `#EA580C` | `#7c2d12` | `#ffffff` | `#fdba74` |
| Green (Client Approved) | `#059669` | `#064e3b` | `#ffffff` | `#6ee7b7` |
| Red (Overdue) | `#DC2626` | `#7f1d1d` | `#ffffff` | `#fca5a5` |

**Rule — Critical for Dark Mode Compliance:**
1. **Never use `bg-white` directly** — use `bg-[var(--surface-card)]` for cards, `bg-[var(--surface-page)]` for page roots, `bg-[var(--surface-input)]` for form inputs
2. **Never use hardcoded text colors** — always use color tokens like `text-[var(--color-gray-700)]` or `text-[var(--color-gray-500)]` so they auto-switch
3. **Never use hardcoded borders** — use color tokens like `border-[var(--color-gray-200)]` or `border-[var(--color-card-border)]`
4. **Badge colors are auto-converted** via CSS rules in `globals.css` — no component changes needed when adding new badges (they'll inherit dark mode automatically)

**Testing Dark Mode:**
- Click the Moon icon in TopNav to toggle dark mode
- All surfaces, text, badges, and modals should smoothly switch
- Text contrast in dark mode must be readable (light text on dark surfaces)
- No white backgrounds should be visible in dark mode

**When Adding New Components:**
- Use surface tokens: `bg-[var(--surface-card)]`, `bg-[var(--surface-input)]`
- Use color tokens for text/borders: `text-[var(--color-gray-700)]`, `border-[var(--color-gray-200)]`, `text-[var(--color-gray-500)]` (pick the appropriate gray shade for your context)
- For status/priority badges, existing colors in `bg-blue-50`, `bg-red-100`, etc. will auto-convert via globals.css
- No additional `dark:` prefixes needed for standard patterns — they work automatically

**Default mode:** light; toggle persisted to `localStorage`

### Typography

- **Font Family:** SF Pro Display (headings), SF Pro Text (body/UI)
- Fallback stack: `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
- Scale:
  - `text-xs`: 12px / labels, helper text
  - `text-sm`: 14px / table cells, secondary info
  - `text-base`: 16px / body default
  - `text-lg`: 18px / card titles, section headings
  - `text-xl`: 20px / page titles (main headings like "Dashboard", "Create Monthly Plan")
  - `text-2xl`: 24px / reserved for future hero/marketing use only
  - `text-3xl`: 28px / dashboard stats numbers
  - Note: Keep main UI font sizes modest. Top navigation links use `text-sm`; main content area uses standard body text

### Spacing & Layout
- Base spacing unit: 4px (Tailwind default)
- Card padding: `p-6` (24px)
- Section gaps: `gap-6` or `gap-8`
- Page horizontal padding: `px-6` on content; layout is full-width (no sidebar offset)
- Consistent use of `gap`, not mixed margin hacks
- **Page heading + description pattern:** heading row has `mb-0`, description paragraph uses `mt-1 mb-5` — keeps the subtitle tight to the title across all pages

### Card & Surface Styles
- **Page background:** `#ffffff` white on page root — set on `html`, `body`, and the content wrapper in layout
- **Card backgrounds:** All cards and elevated surfaces use `bg-[var(--surface-card)]` which is `#FAFAFA` (light gray)
- **Card border color:** `--color-card-border: #E8E8E9` — subtle neutral border for airy feel
- **Card shadow:** `shadow-[0_1px_4px_rgba(0,0,0,0.06)]` — very subtle, just enough depth without feeling heavy
- Card class pattern: `bg-[var(--surface-card)] rounded-xl border border-[var(--color-card-border)] shadow-[0_1px_4px_rgba(0,0,0,0.06)]`
- Inputs and form elements use `bg-[var(--surface-input)]` for consistency with dark mode
- Inputs and ghost buttons use `border-[var(--color-gray-200)]` — no shadow on form elements

### Border Radius
- Buttons: `rounded-lg` (8px)
- Cards: `rounded-xl` (12px)
- Badges/chips: `rounded-full`
- Inputs: `rounded-lg` (8px)
- Modals: `rounded-2xl` (16px)

### Button Styles

Three sizes are defined. Always use the explicit size name when asking for a button.

#### Size scale
| Size | Padding | Font | Icon size | Border radius |
|---|---|---|---|---|
| **Small** | `px-3 py-1.5` | `text-xs font-semibold` | `size={14}` | `rounded-lg` |
| **Medium** *(default)* | `px-5 py-2.5` | `text-sm font-semibold` | `size={16}` | `rounded-lg` |
| **Large** | `px-6 py-3` | `text-base font-semibold` | `size={18}` | `rounded-lg` |

#### Variants (apply to any size)
- **Primary:** `bg-[#5231FF] text-white`
- **Secondary:** `bg-[#4B5563] text-white hover:bg-[#374151]`
- **Ghost / Outline:** `border border-[var(--color-gray-200)] text-[var(--color-gray-700)] bg-white hover:bg-[var(--color-gray-100)]`
- **Danger filled:** `bg-[#EF4444] text-white hover:bg-red-600`
- **Danger outline:** `border border-red-200 text-[#EF4444] hover:bg-red-50`

#### Full class examples
- **Primary Medium:** `bg-[#5231FF] text-white rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors`
- **Primary Large:** `bg-[#5231FF] text-white rounded-lg px-6 py-3 text-base font-semibold transition-colors`
- **Primary Small:** `bg-[#5231FF] text-white rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors`
- **Ghost Medium:** `border border-[var(--color-gray-200)] text-[var(--color-gray-700)] rounded-lg px-5 py-2.5 text-sm font-semibold hover:bg-[var(--color-gray-100)] transition-colors`

#### Delete / Trash Icon Button (canonical — use everywhere)
There is **one** delete button style across the entire app. Never deviate from it.

```
p-1.5 rounded-lg text-[var(--color-gray-400)] hover:text-[#EF4444] hover:bg-red-50 transition-colors
```

- Icon: always `<Trash2 size={15} />` from lucide-react — never use `<X>` for delete actions
- For hover-reveal buttons (inside cards/rows): append `opacity-0 group-hover:opacity-100`
- The confirmation UI (inline "Remove task?" with Cancel/Remove buttons) is separate from the trigger button style

#### Rules
- All buttons have `transition-colors` and `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5231FF]`
- Icon buttons include `gap-2` between icon and label; icon size matches the size scale above
- **Medium is the default** for all page-level actions (Create, Save, Submit, Cancel)
- Only use Small inside dense UI: table rows, tags, inline actions
- Only use Large for hero/empty-state CTAs when asked explicitly

### Stepper (Multi-step Wizard)

Used in: Create Campaign Plan (`/plans/new`), Create Tomorrow's Plan (`/schedule/tomorrow`).

**Container:** Full-width `bg-[var(--color-gray-50)] border border-[var(--color-gray-200)] rounded-2xl px-8 py-3 shadow-[0_1px_4px_rgba(0,0,0,0.04)]` — compact vertical spacing (py-3 instead of py-5).

**Layout:** `flex items-center` row — each step node is `flex-1 last:flex-none` and contains a horizontal group (circle + label side-by-side) and a connector line.

**Step node layout:** Circle and label sit horizontally with `flex items-center gap-2.5` — compact and space-efficient. No vertical stacking.

**Step circle states:**
- **Upcoming:** `bg-[var(--surface-input)] border-2 border-[var(--color-gray-200)] text-[var(--color-gray-400)]` — shows step number
- **Active:** `bg-[#5231FF] text-white shadow-[0_0_0_4px_rgba(82,49,255,0.18)]` — plus an absolute outer ring `w-10 h-10 rounded-full border-2 border-[#5231FF] opacity-20` for the halo
- **Done:** `bg-[#5231FF] text-white shadow-[0_0_0_3px_rgba(82,49,255,0.15)]` — shows `<Check size={13} />`
- Circle size: `w-7 h-7 rounded-full`, `text-xs font-bold`, `flex-shrink-0`

**Label placement:** Immediately right of circle. States:
- Active: `text-xs font-semibold text-[var(--color-gray-900)]`
- Done: `text-xs font-semibold text-[#5231FF]`
- Upcoming: `text-xs font-semibold text-[var(--color-gray-400)]`
- All labels: `whitespace-nowrap`

**Connector line:** `flex-1 mx-3 h-px` container with layered `relative h-px` div. Two layers: gray base (`bg-[var(--color-gray-200)]`) and purple fill (`bg-[#5231FF] transition-all duration-500`). Fill uses `right-0` when done, `right-full` when not.

### Form Elements
- **Dropdowns/Selects:** Use `react-select` with custom styling to match the design system. **Never use native HTML `<select>` elements.**
  - **Styling function:**
    ```javascript
    const selectStyles = {
      control: (base) => ({
        ...base, borderColor: "var(--color-gray-200)", borderRadius: "8px",
        minHeight: "auto", fontSize: "14px", boxShadow: "none",
        "&:hover": { borderColor: "#9ca3af" },
        "&:focus-within": { borderColor: "var(--color-primary)", boxShadow: "0 0 0 2px rgba(82,49,255,0.12)" },
      }),
      input: (base) => ({ ...base, padding: "6px 8px", margin: "2px", fontSize: "14px" }),
      option: (base, { isSelected, isFocused }) => ({
        ...base,
        backgroundColor: isSelected ? "#5231FF" : isFocused ? "#f3f4f6" : "white",
        color: isSelected ? "white" : "#111118",
        fontSize: "14px", padding: "8px 12px", cursor: "pointer",
      }),
      menuList: (base) => ({ ...base, padding: "0", borderRadius: "8px" }),
      menu: (base) => ({ ...base, borderRadius: "8px", marginTop: "4px", boxShadow: "0 4px 16px rgba(0,0,0,0.1)", zIndex: 60 }),
    };
    ```
  - **Usage:** `<Select ... styles={selectStyles} isSearchable={false} />` for non-searchable dropdowns (e.g., sort, filter)
  - Control (closed): Border `var(--color-gray-200)`, border-radius `8px`, no shadow
  - Control (focus): Border `var(--color-primary)`, focus ring `0 0 0 2px rgba(82,49,255,0.12)`
  - Menu (dropdown list): Border-radius `8px`, margin-top `4px`, shadow `0 4px 16px rgba(0,0,0,0.1)`, z-index `60`
  - Option hover: `#f3f4f6` background
  - Option selected: `#5231FF` background with white text
  - Font size: `14px`, padding: `8px 12px` per option
- **Date Range Picker (Campaign Period):** Use `react-date-range` with popover calendar and quick access buttons
  - Input field displays: `"MMM dd, yyyy — MMM dd, yyyy"` (e.g., "May 07, 2026 — Jun 30, 2026")
  - Input is a button that toggles the calendar popover on click
  - Popover layout: Two-column design with calendar on left, quick access buttons on right
  - Popover positioned below with `z-50` and shadow: `0 8px 24px rgba(0,0,0,0.12)`
  - **Quick Access Buttons (Right Column):**
    - Options: "Next 7 Days", "Next 2 Weeks", "Next Month", "Next 2 Months"
    - Background: `#fafafa` light gray
    - Width: `160px`, border-right: `1px var(--color-gray-200)`
    - Button text: `13px`, `500` font weight, `var(--color-gray-700)`
    - Padding: `0.75rem 1rem` per button
    - Hover: `#f3f4f6` background, darker text
    - Active/Selected: `var(--color-primary-light)` background with `var(--color-primary)` text, `600` font weight
  - **Calendar (Left Column):**
    - Width: `320px`
    - Header: Gray background (`#f3f4f6`), `0.75rem` padding, border-bottom
    - Month/Year selectors: Native select dropdowns with gray border, white background, `4px` border radius, compact sizing
    - Date range highlighting: Light purple background (`rgba(82, 49, 255, 0.1)`) for all dates in range
    - Range start/end dates: `#5231FF` solid background, white text, `4px` border radius
    - Today indicator: Primary color text, bold font weight
    - Disabled past dates: `#d1d5db` gray text, no hover effect
    - Day cells: `28px` size, `4px` border radius, `13px` font, hover: `#f3f4f6`
    - Week headers: Single letter format (S M T W T F S), `11px` uppercase, gray text, bold
  - **Date Constraints:**
    - Campaign Period: `minDate` = Jan 1 of current year (no previous years allowed)
    - Deadline (per item): `minDate` = Jan 1 of current year, still uses `react-datepicker` with month/year dropdowns
- **Input Fields:** All form inputs must use standardized styling:
  - **Input Class:** `w-full border border-[var(--color-gray-200)] rounded-lg px-3 py-2 text-sm text-[var(--color-gray-900)] placeholder:text-[var(--color-gray-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-colors bg-[var(--surface-input)]`
  - Border: `var(--color-gray-200)`, rounded `8px`, no shadow
  - Focus: ring `2px` with primary color (`rgba(82,49,255,0.12)`), border becomes transparent
  - **Label Class:** `block text-xs font-medium text-[var(--color-gray-700)] mb-1.5`
  - **Required Field Indicator:** Red asterisk `*` using `text-[var(--color-danger)]` (not gray)
  - **Optional Field Indicator:** Gray text `(optional)` using `text-[var(--color-gray-500)] font-normal`

### Color Usage Guidelines
- **Primary Color (`#5231FF`)** — Use sparingly for:
  - Primary call-to-action buttons (Create, Save, Submit)
  - Active/selected navigation states
  - Links and interactive text
  - Focus rings and highlights
- **Semantic Colors** — Use for meaningful indicators:
  - `--color-success` (#10B981) — Completed tasks, positive metrics, done states
  - `--color-warning` (#F59E0B) — In-progress, medium priority, caution states
  - `--color-danger` (#EF4444) — Overdue, blocked, high priority alerts
  - `--color-info` (#3B82F6) — Informational badges, neutral indicators
- **Gray Scale** — Default for neutral elements:
  - Cards, containers, borders, dividers
  - Icons and secondary text
  - Backgrounds
- **Avoid** applying primary color to non-essential UI (card backgrounds, decorative elements, stats boxes)

### Task Status Workflow

Tasks move through a defined lifecycle. Status automatically transitions when assignee changes; creators and managers can manually advance or roll back status within permitted transitions.

| # | Status | Trigger / Who Can Set | Meaning |
|---|---|---|---|
| 1 | **Backlog** | System (default) | Task created but not yet assigned to anyone |
| 2 | **Assigned** | System (auto) | Task has been assigned to a creator |
| 3 | **In Progress** | Creator | Assignee is actively working on this task |
| 4 | **In Internal Review** | Creator | Work submitted; awaiting internal feedback from manager/lead |
| 5 | **Internally Approved** | Manager / Admin | Passed internal review; ready to send to client |
| 6 | **In Client Review** | Manager / Admin | Delivered to client; awaiting their feedback |
| 7 | **Client Approved** | Manager / Admin | Client has signed off; task is fully complete |

> **Overdue** is a computed flag (not a manual status) applied to any task whose due date has passed and status is not Client Approved.

### Task Fields

Each task contains the following fields:

| Field | Type | Required | Description |
|---|---|---|---|
| **id** | string | Auto | Unique identifier |
| **name** | string | Yes | Task title/name |
| **client** | string | Yes | Client company name |
| **contentType** | string | Yes | Deliverable type (Post, Story, Google Ad Set, Paid Ad, Album, Animated Videos, etc.) |
| **hours** | number | Yes | Estimated hours to complete |
| **priority** | enum | No | Task importance: `urgent` \| `high` \| `medium` \| `low` (optional, can be unset) |
| **status** | enum | Auto | Current workflow stage (see above; starts as Backlog) |
| **deadline** | date | No | Due date (optional) |
| **assigneeId** | string | No | ID of assigned creator (optional; null = unassigned/Backlog state) |
| **assigneeName** | string | No | Name of assigned creator (auto-populated when assigneeId is set) |
| **assigneePhoto** | string | No | Avatar URL of assigned creator (optional) |
| **campaign** | string | No | Campaign plan this task belongs to (optional) |
| **notes** | string | No | Internal notes or instructions (optional) |
| **references** | string[] | No | Links or file references (optional array) |

### Status Badge Colors

| Status | Background | Text |
|---|---|---|
| Backlog | `gray-100` | `gray-500` |
| Assigned | `blue-50` | `blue-600` |
| In Progress | `blue-50` | `blue-600` |
| In Internal Review | `purple-50` | `purple-600` |
| Internally Approved | `indigo-50` | `indigo-700` |
| In Client Review | `yellow-50` | `yellow-700` |
| Client Approved | `green-50` | `green-600` |

### Priority Badge Colors (Optional)

Priority is an optional field. When set, it displays as a badge with the following colors:

| Priority | Color |
|---|---|
| Urgent | Red |
| High | Orange |
| Medium | Yellow/Amber |
| Low | Gray |
| (None/Unset) | No badge shown |

---

## Application Structure (Pages & Sections)

### Top Navigation Bar (`components/TopNav.tsx`)
- Full-width sticky bar, `h-14`, white background (light mode) / `#010910` (dark mode), `border-b border-[var(--color-gray-200)]`
- **Left:** Logo (`public/images/logo.png`, 130×30)
- **Center:** Pill-group nav — links sit inside a `bg-[var(--color-gray-100)] rounded-full` container
  - Active tab: `bg-[var(--color-primary-light)] text-[var(--color-primary)] font-semibold rounded-full`
  - Inactive tab: `text-[var(--color-gray-600)] hover:text-[var(--color-gray-900)] hover:bg-white rounded-full`
  - Nav links: Dashboard, Campaign Plans, Schedule, Tasks, Team, Reports
- **Right:** Bell icon (with red dot badge) · Settings icon (links to `/settings`) · divider · Avatar + name + email
- No sidebar, no collapse toggle — layout is full-width for all pages

### Tab Switcher Pattern (canonical — use everywhere)

Use this style for all in-page tab switchers. Reference implementation: `app/schedule/page.tsx` and `app/tasks/page.tsx`.

```tsx
<div className="flex gap-1 bg-[var(--color-gray-100)] p-1 rounded-lg w-fit">
  {/* Active tab */}
  <button className="flex items-center gap-2 px-5 py-2 rounded-md text-sm font-semibold bg-[var(--surface-elevated)] text-[var(--color-gray-900)] shadow-sm whitespace-nowrap">
    Today
    <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-[#5231FF] text-white">4</span>
  </button>
  {/* Inactive tab */}
  <button className="px-5 py-2 rounded-md text-sm font-semibold text-[var(--color-gray-500)] hover:text-[var(--color-gray-700)] whitespace-nowrap">
    Upcoming
  </button>
</div>
```

- Container: `bg-[var(--color-gray-100)] p-1 rounded-lg w-fit`
- Active: `bg-[var(--surface-elevated)] text-[var(--color-gray-900)] shadow-sm rounded-md`
- Inactive: `text-[var(--color-gray-500)] hover:text-[var(--color-gray-700)] rounded-md`
- Count badge (active): `bg-[#5231FF] text-white rounded-full text-[11px] font-bold px-1.5 py-0.5`
- Count badge (inactive): `bg-[var(--color-gray-200)] text-[var(--color-gray-600)] rounded-full text-[11px] font-bold px-1.5 py-0.5`
- **Do not use the TopNav pill-group style (`rounded-full`) for in-page tabs** — that is only for the top navigation bar.

### Breadcrumb (`components/Breadcrumb.tsx`)
- Rendered globally below the top nav bar in the root layout
- Auto-generated from the current URL path using `usePathname` — no per-page setup needed
- Hidden on Dashboard root (single crumb = no render)
- **No border** — sits flush below the top nav with `px-6 py-2` spacing
- Background: white (light mode) / `#010910` (dark mode)
- Breadcrumb text: `text-xs`; current/active segment `font-semibold text-[var(--color-gray-900)]`, parent segments `text-[var(--color-gray-500)]` as links

### Navigation Links
- **Dashboard** (overview stats + today's snapshot)
- **Campaign Plans** (create + manage campaign plans across any date range)
- **Schedule** (daily/weekly/monthly calendar view of assignments)
- **Tasks** (filterable list of all tasks)
- **Team** (creator profiles, skills, availability)
- **Reports** (daily/weekly/monthly reports)
- **Settings** (admin only — in right icon area, not main nav)

### Dashboard
- Summary cards: Total Tasks This Month, Completed Today, Overdue, In Progress
- Today's Schedule snapshot (mini view per creator)
- Completion progress per client (progress bars)
- Recent activity feed
- Alerts: overdue tasks, creators on leave tomorrow, upcoming deadlines

### Monthly Plans
- Upload new monthly content plan (CSV/Excel or manual entry)
- List of current and past plans (by month/client)
- Plan detail: all line items with quantities, deadlines, priorities
- Progress tracking per plan item (how many tasks completed vs. total)

### Schedule View
- **Daily view:** grid of creators vs. time/tasks for a single day
- **Weekly view:** calendar-style, tasks shown per creator per day
- **Monthly view:** high-level overview with completion indicators
- Filter by: creator, client, content type, status
- Admin override controls: drag-to-reassign, add task button, edit task inline

### Tasks
- Full task list with filters (status, assignee, client, priority, due date)
- Sortable columns
- Bulk actions (reassign, change priority, mark complete)

### Team
- **View Modes:** Card view (grid) and List view (table), toggle via icons in toolbar
- **Member Information:** Each member displays profile avatar (initials), name, designation, total working hours this month, and workload percentage with color-coded progress bar
- **Workload Colors:**
  - Red (`#EF4444`): >= 85% workload
  - Orange (`#F59E0B`): 70–84% workload
  - Blue (`#3B82F6`): 50–69% workload
  - Green (`#10B981`): < 50% workload
- **Member Management:**
  - **Add Member:** Modal with Name, Designation, Email fields
  - **Pause/Resume:** Toggle member availability without deleting; paused members show "Paused" badge and reduced opacity
  - **Delete Member:** Confirmation modal before permanent removal
- **Card View:** Grid layout (1 col mobile, 2 col tablet, 3 col desktop) with full member info and action buttons
- **List View:** Table-style rows with member info, hours, workload bar, and action icons; sortable and comparable at a glance

### Reports
- End-of-day report view (select date)
- Completed vs incomplete breakdown
- Per-creator performance
- Per-client completion rate
- Exportable (PDF / CSV)

### Settings (Admin)
- User management (invite, edit roles, deactivate)
- Content type definitions
- Working hours / working days config
- Notification preferences
- Theme toggle (Light / Dark)

---

## Technical Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| UI | React 19 |
| Styling | Tailwind CSS 4 |
| State | React Context + hooks (expand to Zustand if needed) |
| Forms | React Hook Form + Zod validation |
| Icons | Lucide React |
| Charts | Recharts |
| Date handling | date-fns |
| File parsing | PapaParse (CSV), SheetJS (Excel) |

---

## Code Conventions

- All components in `components/` directory, grouped by feature
- Page files in `app/` using App Router conventions — read `node_modules/next/dist/docs/` before writing routing or layout code
- Tailwind CSS 4 uses `@import "tailwindcss"` not `@tailwind` directives — check `app/globals.css` for existing setup
- Use CSS custom properties for theme tokens (light/dark switching)
- No inline styles; use Tailwind utility classes throughout
- Components should be typed with TypeScript interfaces, not `any`
- Prefer `'use client'` only where interactivity requires it; default to Server Components

---

## Content Types Reference

Content types are also configurable in Settings. The default set and their eligible roles:

| Content Type | Eligible Roles |
|---|---|
| Artwork / Static Graphic | Senior Creative Executive, Creative Executive |
| Social Media Post | Creative Executive, Content Writer, Marketing Specialist |
| Banner / Ad Creative | Senior Creative Executive, Creative Executive |
| Short Video / Reel | Video Designer, Senior Creative Executive (if video-skilled) |
| Long-form Video | Video Designer |
| TV Ad Campaign | Video Designer, Senior Creative Executive |
| Caption / Copy | Content Writer |
| Blog Post / Article | Content Writer |
| Campaign Strategy | Marketing Specialist |
| Performance Report | Marketing Specialist |

---

## Scheduling Logic Rules

1. Task type determines eligible assignees (respect skill constraints)
2. Spread tasks evenly across eligible creators, weighted by current load
3. Prioritise tasks by: (a) deadline proximity, (b) client priority tier, (c) task priority
4. Never assign tasks to creators marked unavailable for that day
5. Incomplete tasks from previous day are treated as high-priority carry-forwards
6. Admin overrides are always preserved and never auto-overwritten
7. Re-schedule button available per day/week to recalculate non-overridden slots

---
