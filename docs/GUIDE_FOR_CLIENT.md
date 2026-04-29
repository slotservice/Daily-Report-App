# Client Guide — Mode Projects Daily Report App

For Evan Heitman, Director / Superintendent — Mode Projects Inc.

This is a step-by-step walkthrough of (a) what we need from you to
finish building, and (b) how to use the app once it's live.

---

## Part 1 — Inputs we need from you (one-time, ~30 min)

Send these in a single email reply. The build is on hold until item 2
arrives; everything else can follow.

### 1. Brand logo
- Format: PNG, transparent background preferred
- Use: it appears top-left on every PDF report and in the app's launch
  screen
- Send: as an attachment to the reply email

### 2. Active project list
For each project that should be live in the app, give us:
- Project code (e.g. `2401`)
- Project name (e.g. `Oak Bay Townhomes`)
- Address
- Start date
- (Optional) end date

### 3. Role assignments — per project
For **each** project above, tell us the four people in these roles
(name + email):
- **Site Superintendent** — creates and submits daily reports
- **Project Manager** — receives reports, reviews them
- **Director** — receives reports, reviews them
- **Coordinator** — receives reports, reviews them

The same person can hold multiple roles across different projects (e.g.
you might be Director on every project but also Superintendent on one).
Just list them per project.

### 4. Master lists
- **Subcontractor trades** currently active across all projects:
  trade name, company name, primary contact name + email + phone
- **Mode crew members** who appear on daily reports: full name, role
  (carpenter, foreman, etc.), email, phone

### 5. Two quick confirmations
- **Timezone** — we've assumed `Pacific Time (America/Vancouver)`. OK?
- **Daily reminder** — should the app send superintendents an
  automatic email at 5pm if they haven't submitted that day's report?
  (Default: off. Easy to flip on later.)

**Once we have these, your live app will be ready in ~3 days.**

---

## Part 2 — Receiving the app (~20 min, when we notify you)

### Step 1. You'll get an install link by email
The email comes from `noreply@appsheet.com` with subject something like
*"You've been invited to install Mode Daily Reports."* The body has a
button **"Install app."**

### Step 2. Sign in with Google
- Click the button
- Sign in with your `evan@modeprojects.ca` Google account
- AppSheet will install on your phone, tablet, or desktop

> **Phone install:** the AppSheet mobile app from the App Store / Play
> Store wraps it as a native-feeling app. Desktop = browser tab.

### Step 3. Watch the 5-minute walkthrough Loom
We'll send you a Loom video. It covers:
- Where to find each project
- How a superintendent submits a report
- How you review and lock a report
- Where the PDF lands in Drive

### Step 4. Sign-off test
We'll create a sample submitted report for you. Please:
- Open it in the app
- Read through every section
- Tap **Mark as Reviewed**
- Confirm you receive the locked-notification email
- Open the attached PDF and check the layout
- Reply with "Approved" or "Change X, Y, Z"

That's the acceptance milestone.

---

## Part 3 — Day-to-day use

### For Site Superintendents
1. Open the app at the start of the day
2. Tap your project → **Today's Report** opens automatically
3. Fill the General Info block (weather, etc.)
4. As the day goes on, tap **+** on each section to add:
   - Crew & hours
   - Trades on site
   - Tasks started, in progress, completed
   - Equipment, rentals, visitors, deliveries
   - Photos (camera-up by default)
5. Tick the four safety boxes
6. Add notable events at end of day
7. Tap **Save & Submit** — it auto-emails PM, Director, Coordinator
   and locks for review

### For PM / Director / Coordinator
1. Open the app — your inbox shows submitted reports awaiting review
2. Tap a report to read
3. Tap **Mark as Reviewed** when satisfied
4. Report becomes read-only for the superintendent; everyone receives
   the PDF copy by email

### For Director (cross-project view)
- Director Dashboard shows pending reviews across **all** projects
- KPI charts: report count by status, by project, by week
- Can mark any report as Reviewed (override)

---

## Part 4 — Adding new things over time

You'll periodically need to:
- **Add a project** → ask Daniel, or add it to the master Google Sheet's
  Projects tab yourself
- **Add a crew member** → master Sheet, Personnel tab, then
  ProjectPersonnel tab to assign them to specific projects
- **Add a subcontractor trade** → master Sheet, Trades tab, then
  ProjectTrades tab
- **Replace someone in a role** → just update the email in Projects tab
- **Pause a project** → set `Active = FALSE` in Projects tab; it
  disappears from active dropdowns but historical reports remain

For the first few weeks, just message Daniel — he'll do these for you
while you get used to the app.

---

## Part 5 — Where stuff lives

| Thing | Where |
|---|---|
| The app | `appsheet.com` (signed in) or the AppSheet mobile app |
| Daily report PDFs | Google Drive → `Mode Projects Daily Reports / <Project>/` |
| Submitted-report emails | Your `evan@modeprojects.ca` inbox + PM + Coordinator |
| The data | One master Google Sheet (Daniel will share the URL) |
| The build spec / source | GitHub: `slotservice/Daily-Report-App` |

---

## FAQ

**Can a superintendent edit a report after submitting it?**
Yes — until you (or PM/Coordinator) mark it Reviewed. After Reviewed,
it's locked. If something needs to change after lock, ask Daniel to
**Recall to Draft** (admin-only action).

**What if a task isn't finished by end of day?**
Don't do anything. Tasks Started Today automatically carry forward to
the next day's report under "Tasks Still in Progress" until the
superintendent ticks them as Completed.

**What if there's no internet on site?**
The app works offline. Reports save locally and sync when the phone is
back online.

**Can I see old reports?**
Yes — Director Dashboard → Reviewed This Week, plus the full history
under Submitted History.

**Can I customize the PDF?**
Layout changes are easy (move sections, change colors, add fields).
Big restructures are change-orders.

**Who pays for AppSheet?**
You do — Mode Projects Inc. takes over the AppSheet billing during
go-live. Approximately CAD $5/user/month for the standard plan, billed
to Google Workspace.

---

## Anything else?

- Bug or quirk? Email Daniel directly
- Feature request? Email Daniel — we'll scope and price as a
  change-order
- Lost the install link? Sign in at `appsheet.com` with
  `evan@modeprojects.ca` and the app appears in your library
