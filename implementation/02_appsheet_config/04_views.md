# Views

AppSheet view layout for each role. Each view is created in **UX → Views**.

The app uses a **role-pivoted home view** — when the user signs in, AppSheet routes them to the right deck via the `App start expression`:

```
SWITCH(
  LOOKUP(USEREMAIL(), "Users", "Email", "Role"),
  "SiteSuperintendent", LINKTOVIEW("Super Home"),
  "ProjectManager",     LINKTOVIEW("Manager Inbox"),
  "Director",           LINKTOVIEW("Director Dashboard"),
  "Coordinator",        LINKTOVIEW("Manager Inbox"),
  "Admin",              LINKTOVIEW("Admin Console"),
  LINKTOVIEW("Manager Inbox")
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
- **Show if:** `LOOKUP(USEREMAIL(),"Users","Email","Role") = "SiteSuperintendent"`

### View: `Today's Report` (Detail)
- **Type:** Detail
- **For data:** `Reports_Editable_By_Me`
- **Default row:** the report whose `ReportDate = TODAY()` and project = currently selected project. If none exists, the view shows a CTA `Start Today's Report` that calls `LINKTOFORM("DailyReports_Form", "ProjectID", <selected>, "ReportDate", TODAY())`.
- **Layout sections (in order):**
  1. **General Info** — ProjectName (read-only), ReportDate, SuperintendentID (read-only), PreparedByEmail (read-only), WeatherTemp, WeatherConditions
  2. **Mode Team Members on Site Today** — inline TimeEntries (label "Crew & Hours")
  3. **Trades on Site Today** — inline ReportTrades
  4. **Tasks Started Today** — inline reference list of `[Related Tasks (started today)]` with the **Add Started Task** action
  5. **Tasks Still in Progress** — inline reference list of `[Related Tasks (in progress)]` (read-only carry-forward), with inline **Mark Task Completed** action button
  6. **Tasks Completed Today** — inline reference list of `[Related Tasks (completed today)]`
  7. **Equipment On Site** — inline Equipment
  8. **Rentals On Site** — inline Rentals
  9. **Visitors On Site** — inline Visitors
  10. **Deliveries** — inline Deliveries
  11. **Photos** — inline Photos
  12. **Safety** — WorksafeInspectionToday, SiteInspectionDoneToday, FieldLevelHazardUpToDate, NextToolboxMeeting
  13. **Notable Events** — NotableEvents
  14. **Save & Submit** action button (prominent, full-width)

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
- **Show if:** `LOOKUP(USEREMAIL(),"Users","Email","Role") IN LIST("ProjectManager","Coordinator")`

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
- **Show if:** `LOOKUP(USEREMAIL(),"Users","Email","Role") = "Director"`

---

## Admin deck

### View: `Admin Console` (Dashboard)
- **Type:** Dashboard
- **Embedded views:**
  - `All Reports` (Table of unsliced `DailyReports`)
  - `Users` (Table of `Users`)
  - `Projects` (Table of `Projects`)
  - `Trades`, `Personnel` masters
- **Show if:** `LOOKUP(USEREMAIL(),"Users","Email","Role") = "Admin"`

---

## Forms

### Form: `DailyReports_Form`
- **Position:** Hidden from menu (reached via `Start Today's Report` action)
- **Form columns visible in this order, with section headers:**
  1. *General Info:* ProjectID, ReportDate, WeatherTemp, WeatherConditions
  2. *Safety:* WorksafeInspectionToday, SiteInspectionDoneToday, FieldLevelHazardUpToDate, NextToolboxMeeting
  3. *Notable Events:* NotableEvents
- **All other content** (tasks, trades, photos, time, equipment, rentals, visitors, deliveries) is captured **after save** via inline child-table actions on the detail view. This keeps the form minimal so a foreman can hit save in under 30 seconds, then add the rich content as the day unfolds.
- **Form Saved Behavior:** `Go to view` → `Today's Report` (the Detail view of the just-saved row).

### Form: `Tasks_Form`
- Standard Add/Edit form, all columns visible.

### Form: `Photos_Form`
- Image first (camera-up by default on mobile), then Caption.

### Forms for `Equipment`, `Rentals`, `Visitors`, `Deliveries`, `ReportTrades`, `TimeEntries`
- Standard inline-add forms reached via the `+` button on each section of `Today's Report`. ReportID hidden and prefilled from the parent.

---

## Branding

- **Theme:** Light
- **Primary color:** `#1A2E45` (the navy from the source PDF letterhead)
- **Accent color:** `#D4B98C` (the cream/gold from the source PDF letterhead)
- **Logo:** Drive file ID set in `App → Properties → Branding → Launch Image` once the client provides graphics.
- **Font:** AppSheet UI uses Roboto (cannot change). The PDF uses Montserrat (see `04_pdf_template/`).
