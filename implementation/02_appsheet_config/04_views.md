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
  - `My Projects` (Card view of `My_Projects` slice — Layout = **`list`** per 2026-05-13 live build; not `large` or `gallery`)
  - `Today's Report` (Detail view, see below)
  - `Tasks Still In Progress` (Deck of `Tasks_InProgress_For_Project` filtered by selected project)
- **Show if:** `IN("SiteSuperintendent", LOOKUP(USEREMAIL(),"Users","Email","Role"))`

#### `My Projects` Card view — Layout config notes (2026-05-13)

- **Layout option:** `list` (single-line entry per project).
- **Why not `large`:** the `large` layout has 5 text slots (Title, Subtitle, Header, Subheader, Description). Each needs an explicit column binding. AppSheet does not auto-bind them when switching from another view type — they default to literal placeholder text ("Title goes here"). The `list` layout uses the source table's Label column (`Projects.ProjectName`) automatically, so the project name appears with zero binding work.
- **Why not `gallery`:** Gallery views don't expose an Action slot, so `Start Today's Report` can't be attached inline.
- **Action 1 binding:** `Start Today's Report` (Action 10 in `03_actions.md`). This is the prominent inline action that opens the prefilled `DailyReports_Form` with `ProjectID` and `ReportDate = TODAY()` already set. The action's `Only_If` guard hides it when a same-day report already exists for the project, so the duplicate-key error Evan hit 2026-05-11 is structurally impossible.
- **Action 2 binding:** Defaulted to `View Ref (CoordinatorID)` (auto-generated). Left untouched — clicking it opens the coordinator's profile, which is reasonable secondary behavior.

### View: `Today's Report` (Detail)
- **Type:** Detail
- **For data:** `Reports_Editable_By_Me`
- **Default row:** the report whose `ReportDate = TODAY()` and project = currently selected project. If none exists, the view shows a CTA `Start Today's Report` (Action 10 in `03_actions.md`) whose `Only_If` evaluates `FALSE` when a row already exists for the selected project + today — so the user cannot accidentally trigger the form when a row is already in the Sheet, eliminating the duplicate-key error Evan hit 2026-05-11.
- **Hidden from this Detail view (per Evan 2026-05-10):**
  - `ReportID` — internal ID, never shown to non-Admin (item 1).
  - `Status` — the "status bar" (item 6); supers don't see Draft/Submitted/Reviewed.
  - `IsLocked` — internal virtual flag (item 10).
  - `SubmittedAt`, `ReviewedAt`, `ReviewedByEmail`, `PdfFileID`, `CreatedAt`, `ModifiedAt` — system-managed audit fields.
- **Layout sections (in this exact order — pin in the AppSheet detail-view editor; do not let AppSheet auto-group reorder them):**
  1. **General Info** — `ProjectID` shown as **Project Name** (Ref → Projects, displayed via Label = ProjectName) **must be the very first row** (item 7), then ReportDate, SuperintendentID (read-only), PreparedByEmail (read-only), WeatherTemp, WeatherConditions.
  2. **Mode Team Members on Site Today** — inline TimeEntries (label "Crew & Hours"). **HIDDEN per Evan 2026-05-11 (item 7).** Set the inline reference column's `Show?` to `FALSE`. Leave the underlying TimeEntries table + column intact (PDF and time-tracking logic still depend on it); only the on-screen section is hidden. Easy to re-enable later by flipping the toggle.
  3. **Trades on Site Today** — inline reference list of `[Related ReportTrades (still on site)]` (the carry-forward virtual column from `01_columns_and_formulas.md` §3 — per Evan item 13). Inline `+ Add Trade` action calls `LINKTOFORM("ReportTrades_Form", "ReportID", [ReportID], "ProjectID", [ProjectID], "Status", "On Site", "OriginReportID", [ReportID])`. Inline **Mark Trade Off Site** action (Action 8 in `03_actions.md`) shown as a check-square icon on each row (same pattern as Mark Task Completed).
  4. **Tasks Started Today** — inline reference list of `[Related Tasks (started today)]`. The **Add Task Started Today** action (Action 4) is **pinned to this section as a prominent inline action**, so the super can tap it to add a new in-progress task right where they expect it (per Evan item 8). This section only appears on the Detail view, not in the create-form, because the report row must exist before tasks can ref it — make this clear in `GUIDE_FOR_CLIENT.md`.
  5. **Tasks Still in Progress** — inline reference list of `[Related Tasks (in progress)]` (read-only carry-forward), with inline **Mark Task Completed** action (Action 3) shown as a check-square icon per row.
  6. **Tasks Completed Today** — inline reference list of `[Related Tasks (completed today)]`. **Section must always render**, even when empty (use AppSheet's "Show empty group" toggle on the inline ref-list). Per Evan item 9: tasks marked completed must appear here within one sync cycle. The virtual column filter is `[CompletedDate] = [_THISROW].[ReportDate]` — note this implies a task completed on a day OTHER than the report's date (e.g., a backdated edit) won't appear; this is intentional, day-of-completion accuracy.
  7. **Equipment On Site Today** — inline reference list of `[Related Equipment (still on site)]` (the carry-forward virtual column — per Evan item 12). Inline `+ Add Equipment` action calls `LINKTOFORM("Equipment_Form", "ReportID", [ReportID], "ProjectID", [ProjectID], "Status", "On Site", "OriginReportID", [ReportID])`. Inline **Mark Equipment Off Site** action (Action 9) per row.
  8. **Rentals on Site Today** — inline Rentals. **Section heading renamed 2026-05-11 (item 8)** — exact wording: `Rentals on Site Today` (was `Rentals On Site`). Set this as the inline reference column's `Display name` on the `[Related Rentals]` column in `DailyReports`.
  9. **Visitors on Site Today** — inline Visitors. **Section heading renamed 2026-05-11 (item 8)** — exact wording: `Visitors on Site Today` (was `Visitors On Site`). Set this as the inline reference column's `Display name` on the `[Related Visitors]` column.
  10. **Deliveries** — inline Deliveries. Heading wording confirmed by Evan 2026-05-11 (item 6) — already correct as `Deliveries` (the singular `Delivery` in the editor is auto-generated from the table name and must be overridden to `Deliveries` on the inline reference column's `Display name`).
  11. **Photos** — inline Photos. **HIDDEN per Evan 2026-05-11 (item 7).** Set the inline reference column's `Show?` to `FALSE`. Leave the Photos table + column intact (PDF append-photos logic still uses it); only the on-screen section is hidden. Re-enable later by flipping the toggle.
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
- **Show if (live as of 2026-05-13):**
  ```
  OR(
    IN("ProjectManager", LOOKUP(USEREMAIL(),"Users","Email","Role")),
    IN("Coordinator",    LOOKUP(USEREMAIL(),"Users","Email","Role")),
    IN("Director",       LOOKUP(USEREMAIL(),"Users","Email","Role")),
    IN("Admin",          LOOKUP(USEREMAIL(),"Users","Email","Role"))
  )
  ```
- **Why Director + Admin added 2026-05-13:** Initial build's Show If was just PM/Coordinator, so when James (a super) signed in during testing he was reaching Manager Inbox by accident because the slice filter was empty too (see `02_slices.md` Reports_Reviewable_By_Me). After the slice was tightened to admit only the right roles, the view's Show If also tightened to mirror — and Director + Admin were added so the menu item appears for them too (otherwise Director would only see submitted reports inside their dashboard, which is fine, but Admin would lose menu access entirely).

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
- **Position:** System-generated form. AppSheet's system-generated form views do not expose a `Position` selector and are not added to the main menu by default. The remaining concern is the auto-`+` button AppSheet adds wherever a slice has Adds allowed (e.g. on `Reports_Editable_By_Me`). That `+` is the path Evan used to hit the duplicate-key error 2026-05-11. The structural fix is Action 10 (`Start Today's Report`) in `03_actions.md`, whose `Only_If` returns FALSE when a same-day report already exists. After Action 10 is live, the recommended path is to **disable adds on `Reports_Editable_By_Me`** (`Data → Slices → Reports_Editable_By_Me → Adds allowed = OFF`) so the only way to create a new DailyReports row is via Action 10's guarded path.
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
- **Save button label:** AppSheet does not expose a per-form "Save button display name" property — the button always reads `Save` (or the locale equivalent). Verified in editor 2026-05-11. The `UX → Views → DailyReports_Form → Behavior → Event Actions → Form Saved` dropdown configures the post-save action, not the button label.
- **Two-button UX note (Evan 2026-05-11 item 10):** Evan asked for two side-by-side buttons at the top of the form — `Save` and `Save and Submit`. AppSheet forms support exactly one Save button per form, at the bottom, with no per-view label override. The closest workable layout: form's single `Save` button commits the row with `Status = "Draft"`, then `Form Saved → Finish view = Today's Report` lands the super on the detail view where the prominent `Save & Submit` action sits as the next button. Functionally the same two-choice flow — "save and come back later" vs "I'm done, push it" — but the second button is one screen transition away rather than side-by-side. Communicate this to Evan in the reply: "Save = creates the draft; on the next screen tap Save & Submit when you're ready to push to the office." If Evan rejects this and insists on a literal toggle, fallback: add a `ReadyToSubmit` Yes/No column to `DailyReports` (top of the form, default `FALSE`), wire a `Save Form` event-action that conditionally chains to `Save & Submit` when `ReadyToSubmit = TRUE`. Do not implement the fallback unless Evan asks — it adds a confusing third toggle to the form.
- **Form Saved Behavior:** `Go to view` → `Today's Report` (the Detail view of the just-saved row). This is what surfaces the second of the two buttons (`Save & Submit`) per the note above.
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
