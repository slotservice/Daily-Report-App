# Views

AppSheet view layout for each role. Each view is created in **UX → Views**.

The app uses a **role-pivoted home view** — when the user signs in, AppSheet routes them to the right deck via the `App start expression`. Because `Users.Role` is an EnumList (a single user can hold multiple roles), we use `IFS()` with `IN()` checks rather than `SWITCH()` so the first matching role wins. The order is intentional: a user who is both Director and SiteSuperintendent (e.g. Evan) lands on the Director Dashboard, since reviewing across projects is the senior role.

```
IFS(
  IN("Director",           LOOKUP(USEREMAIL(), "Users", "Email", "Role")), LINKTOVIEW("Director Dashboard"),
  IN("ProjectManager",     LOOKUP(USEREMAIL(), "Users", "Email", "Role")), LINKTOVIEW("Manager Inbox"),
  IN("Coordinator",        LOOKUP(USEREMAIL(), "Users", "Email", "Role")), LINKTOVIEW("Manager Inbox"),
  IN("SiteSuperintendent", LOOKUP(USEREMAIL(), "Users", "Email", "Role")), LINKTOVIEW("Super Home"),
  IN("Admin",              LOOKUP(USEREMAIL(), "Users", "Email", "Role")), LINKTOVIEW("Admin Console"),
  TRUE,                                                                     LINKTOVIEW("Manager Inbox")
)
```

---

## Superintendent deck

### View: `Super Home` (Dashboard)
- **Type:** Dashboard
- **Position:** Center (primary)
- **Embedded views:**
  - `My Projects` (Card view of `My_Projects` slice)
  - `Today's Report` (Detail view, see below)
  - `Tasks Still In Progress` (Deck of `Tasks_InProgress_For_Project` filtered by selected project)
- **Show if:** `IN("SiteSuperintendent", LOOKUP(USEREMAIL(),"Users","Email","Role"))`

### View: `Today's Report` (Detail)
- **Type:** Detail
- **For data:** `Reports_Editable_By_Me`
- **Default row:** the report whose `ReportDate = TODAY()` and project = currently selected project. If none exists, the view shows a CTA `Start Today's Report` that calls `LINKTOFORM("DailyReports_Form", "ProjectID", <selected>, "ReportDate", TODAY())`.
- **Hidden from this Detail view (per Evan 2026-05-10):**
  - `ReportID` — internal ID, never shown to non-Admin (item 1).
  - `Status` — the "status bar" (item 6); supers don't see Draft/Submitted/Reviewed.
  - `IsLocked` — internal virtual flag (item 10).
  - `SubmittedAt`, `ReviewedAt`, `ReviewedByEmail`, `PdfFileID`, `CreatedAt`, `ModifiedAt` — system-managed audit fields.
- **Layout sections (in this exact order — pin in the AppSheet detail-view editor; do not let AppSheet auto-group reorder them):**
  1. **General Info** — `ProjectID` shown as **Project Name** (Ref → Projects, displayed via Label = ProjectName) **must be the very first row** (item 7), then ReportDate, SuperintendentID (read-only), PreparedByEmail (read-only), WeatherTemp, WeatherConditions.
  2. **Mode Team Members on Site Today** — inline TimeEntries (label "Crew & Hours").
  3. **Trades on Site Today** — inline reference list of `[Related ReportTrades (still on site)]` (the carry-forward virtual column from `01_columns_and_formulas.md` §3 — per Evan item 13). Inline `+ Add Trade` action calls `LINKTOFORM("ReportTrades_Form", "ReportID", [ReportID], "ProjectID", [ProjectID], "Status", "On Site", "OriginReportID", [ReportID])`. Inline **Mark Trade Off Site** action (Action 8 in `03_actions.md`) shown as a check-square icon on each row (same pattern as Mark Task Completed).
  4. **Tasks Started Today** — inline reference list of `[Related Tasks (started today)]`. The **Add Task Started Today** action (Action 4) is **pinned to this section as a prominent inline action**, so the super can tap it to add a new in-progress task right where they expect it (per Evan item 8). This section only appears on the Detail view, not in the create-form, because the report row must exist before tasks can ref it — make this clear in `GUIDE_FOR_CLIENT.md`.
  5. **Tasks Still in Progress** — inline reference list of `[Related Tasks (in progress)]` (read-only carry-forward), with inline **Mark Task Completed** action (Action 3) shown as a check-square icon per row.
  6. **Tasks Completed Today** — inline reference list of `[Related Tasks (completed today)]`. **Section must always render**, even when empty (use AppSheet's "Show empty group" toggle on the inline ref-list). Per Evan item 9: tasks marked completed must appear here within one sync cycle. The virtual column filter is `[CompletedDate] = [_THISROW].[ReportDate]` — note this implies a task completed on a day OTHER than the report's date (e.g., a backdated edit) won't appear; this is intentional, day-of-completion accuracy.
  7. **Equipment On Site Today** — inline reference list of `[Related Equipment (still on site)]` (the carry-forward virtual column — per Evan item 12). Inline `+ Add Equipment` action calls `LINKTOFORM("Equipment_Form", "ReportID", [ReportID], "ProjectID", [ProjectID], "Status", "On Site", "OriginReportID", [ReportID])`. Inline **Mark Equipment Off Site** action (Action 9) per row.
  8. **Rentals On Site** — inline Rentals.
  9. **Visitors On Site** — inline Visitors.
  10. **Deliveries** — inline Deliveries.
  11. **Photos** — inline Photos.
  12. **Safety** — `WorksafeInspectionToday` (display: "Worksafe Inspection Today?"), `SiteInspectionDoneToday` ("Site Inspection Done Today?"), `FieldLevelHazardUpToDate` ("Field Level Hazard Assessments Up to Date?"), `NextToolboxMeeting`. Display names per Evan items 3 + 4.
  13. **Notable Events** — `NotableEvents`. **Pinned as the last input field** (per Evan item 5) — must be after every child-table section above and immediately before the Save & Submit action.
  14. **Save & Submit** action button (prominent, full-width).

### View: `My Drafts` (Table)
- **Type:** Table
- **For data:** `Reports_Editable_By_Me`
- **Sort:** `ReportDate` desc
- **Columns:** ReportDate, ProjectName, Status, TotalHoursToday

### View: `Submitted History` (Table)
- **Type:** Table
- **For data:** `Reports_Visible_To_Me` filtered to `[Status] IN LIST("Submitted","Reviewed")`
- **Sort:** `ReportDate` desc
- **Group by:** ProjectName

---

## Manager (PM / Coordinator) deck

### View: `Manager Inbox` (Deck)
- **Type:** Deck
- **For data:** `Reports_Reviewable_By_Me`
- **Sort:** `SubmittedAt` desc
- **Main:** ProjectName • ReportDate
- **Subtitle:** "Submitted " & TEXT(SubmittedAt, "YYYY-MM-DD HH:MM")
- **Action on tap:** open `Report Detail (Manager)`
- **Show if:** `OR(IN("ProjectManager", LOOKUP(USEREMAIL(),"Users","Email","Role")), IN("Coordinator", LOOKUP(USEREMAIL(),"Users","Email","Role")))`

### View: `Report Detail (Manager)` (Detail)
- **Type:** Detail
- **For data:** `Reports_Reviewable_By_Me`
- **Layout:** same sections as Super Home → Today's Report, but every field is read-only. **Mark as Reviewed** action surfaces full-width at the bottom.

### View: `My Reviewed` (Table)
- **Type:** Table
- **For data:** `Reports_Visible_To_Me` filtered to `[ReviewedByEmail] = USEREMAIL()`

---

## Director deck

### View: `Director Dashboard` (Dashboard)
- **Type:** Dashboard
- **Embedded views:**
  - `Pending Review` (Deck of `Reports_Pending_Review`)
  - `All Projects KPI` (Chart — count of reports by Status grouped by ProjectName)
  - `Reviewed This Week` (Table of `Reports_Visible_To_Me` filtered to `[ReviewedAt] >= TODAY() - 7`)
- **Show if:** `IN("Director", LOOKUP(USEREMAIL(),"Users","Email","Role"))`

---

## Admin deck

### View: `Admin Console` (Dashboard)
- **Type:** Dashboard
- **Embedded views:**
  - `All Reports` (Table of unsliced `DailyReports`)
  - `Users` (Table of `Users`)
  - `Projects` (Table of `Projects`)
  - `Trades`, `Personnel` masters
- **Show if:** `IN("Admin", LOOKUP(USEREMAIL(),"Users","Email","Role"))`

---

## Forms

### Form: `DailyReports_Form`
- **Position:** Hidden from menu (reached via `Start Today's Report` action)
- **Hidden from this form (per Evan 2026-05-10):**
  - `ReportID` — internal ID (item 1).
  - `Status` — "status bar" never shown to the super (item 6).
  - `IsLocked` — internal flag (item 10).
  - All audit columns (`SubmittedAt`, `ReviewedAt`, `ReviewedByEmail`, `PdfFileID`, `CreatedAt`, `ModifiedAt`).
- **Form columns visible in this order, with section headers — pin in the AppSheet form editor:**
  1. *General Info:* **ProjectID (displays as "Project Name") MUST be the first field** (per Evan item 7). Then ReportDate, WeatherTemp, WeatherConditions. AppSheet renders the Ref column using the Projects table's Label (`ProjectName`), so the super sees the project name, not `PRJ-001`.
  2. *Safety:* WorksafeInspectionToday ("Worksafe Inspection Today?"), SiteInspectionDoneToday ("Site Inspection Done Today?"), FieldLevelHazardUpToDate ("Field Level Hazard Assessments Up to Date?"), NextToolboxMeeting. Question marks per items 3 + 4.
  3. *Notable Events:* NotableEvents. **MUST be the last section** (per Evan item 5) — every other section in this form, plus all the post-save inline-add child sections in the Detail view, must come before this one.
- **All other content** (tasks, trades, photos, time, equipment, rentals, visitors, deliveries) is captured **after save** via inline child-table actions on the detail view. This keeps the form minimal so a foreman can hit save in under 30 seconds, then add the rich content as the day unfolds. Mention this in the user guide so Evan understands "Tasks Started Today" appears on the report screen, not on the create form.
- **Form Saved Behavior:** `Go to view` → `Today's Report` (the Detail view of the just-saved row).
- **Auto-save: OFF.** Set the form to require an explicit Save tap. Background sync should never commit a partial form. (Mitigation for the ghost-report incident reported by Evan 2026-05-10 — see investigation in `HANDOFF.md` §14 / Daniel diagnostic checklist.)

### Form: `Tasks_Form`
- Standard Add/Edit form, all columns visible.

### Form: `Photos_Form`
- Image first (camera-up by default on mobile), then Caption.

### Forms for `Equipment`, `Rentals`, `Visitors`, `Deliveries`, `ReportTrades`, `TimeEntries`
- Standard inline-add forms reached via the `+` button on each section of `Today's Report`. ReportID hidden and prefilled from the parent.

### Form: `Equipment_Form` (specific overrides)
- Hidden columns: `EquipmentID`, `ReportID`, `ProjectID`, `OffSiteDate`, `OriginReportID` (all auto-populated). Visible: `EquipmentName`, `TradeID`, `Comments`, `Status`.
- `Status` defaults to `"On Site"` and is editable (rare to add equipment that's already off-site, but allowed for back-filling).
- Reached via inline `+ Add Equipment` on Detail view section 7. Per Evan item 12 — equipment carries forward via the project-scoped `[Related Equipment (still on site)]` virtual column.

### Form: `ReportTrades_Form` (specific overrides)
- Hidden columns: `ReportTradeID`, `ReportID`, `ProjectID`, `OffSiteDate`, `OriginReportID`. Visible: `TradeID` (display: "Trade"), `WorkerCount`, `Notes`, `Status`.
- `Status` defaults to `"On Site"`.
- Reached via inline `+ Add Trade` on Detail view section 3. Per Evan item 13 — trades carry forward via `[Related ReportTrades (still on site)]`.

---

## Branding

- **Theme:** Light
- **Primary color:** `#1A2E45` (the navy from the source PDF letterhead)
- **Accent color:** `#D4B98C` (the cream/gold from the source PDF letterhead)
- **Logo:** Drive file ID set in `App → Properties → Branding → Launch Image` once the client provides graphics.
- **Font:** AppSheet UI uses Roboto (cannot change). The PDF uses Montserrat (see `04_pdf_template/`).
