# AppSheet Column Configuration & Formulas

For each table the columns are listed in **display order**. After importing the CSVs and adding the tables in AppSheet, set every column to the type / key / label / formula / valid_if / show_if / editable_if / initial-value listed below. This is the implementation-ready spec — copy-paste the formulas directly into AppSheet.

Legend: `K` = Key, `L` = Label, `H` = Hidden in form by default. Empty cells = AppSheet default.

---

## Universal display-name rule (applies to every table)

**For every column whose internal name is CamelCase (`WeatherTemp`, `WorksafeInspectionToday`, `ReceivedAt`, etc.), set the `Display name` field in AppSheet to the human-readable spaced version** (e.g., `WeatherTemp` → `Weather Temp`, `WorksafeInspectionToday` → `Worksafe Inspection Today?`, `ReceivedAt` → `Received At`).

Per Evan 2026-05-10: every fillable-field heading in the superintendent's view must read as natural English, not as a database identifier. Where this spec lists a specific `Display name` (for safety toggles, the Field Level Hazard heading, etc.), use that exact string. For everything else, follow the auto-rule: split CamelCase on capital letters and capitalise each word.

---

## 1. `Projects`

| Column | Type | K/L/H | Initial value | Valid_If / Show_If / notes |
|---|---|---|---|---|
| ProjectID | Text | K | `"PRJ-" & TEXT(COUNT(Projects[ProjectID])+1, "000")` | Read-only after create |
| ProjectCode | Text |  |  | Required |
| ProjectName | Text | L |  | Required |
| Address | Address |  |  |  |
| Latitude | Decimal |  |  | Required. Used by the auto-weather webhook (Bot 4) to fetch current conditions from Open-Meteo. Range: -90 to 90. Town-centre coords are accurate enough for the ~10 km weather grid; refine to actual site coords if available. |
| Longitude | Decimal |  |  | Required. Same as above. Range: -180 to 180. |
| StartDate | Date |  | `TODAY()` |  |
| EndDate | Date |  |  | Show_If: `ISNOTBLANK([StartDate])` |
| Active | Yes/No |  | `TRUE` |  |
| SuperintendentID | Ref → Users |  |  | Valid_If: `FILTER("Users", IN("SiteSuperintendent", [Role]))` |
| SuperintendentEmail | Email |  | `LOOKUP([SuperintendentID], "Users", "UserID", "Email")` | Editable_If: `FALSE` |
| PMID | Ref → Users |  |  | Valid_If: `FILTER("Users", IN("ProjectManager", [Role]))` |
| PMEmail | Email |  | `LOOKUP([PMID], "Users", "UserID", "Email")` | Editable_If: `FALSE` |
| DirectorID | Ref → Users |  |  | Valid_If: `FILTER("Users", IN("Director", [Role]))` |
| DirectorEmail | Email |  | `LOOKUP([DirectorID], "Users", "UserID", "Email")` | Editable_If: `FALSE` |
| CoordinatorID | Ref → Users |  |  | Valid_If: `FILTER("Users", IN("Coordinator", [Role]))` |
| CoordinatorEmail | Email |  | `LOOKUP([CoordinatorID], "Users", "UserID", "Email")` | Editable_If: `FALSE` |
| LogoFileID | Text |  |  | Drive file ID for project-specific logo override |
| Notes | LongText |  |  |  |
| **Related DailyReports** *(virtual)* | List | H | `REF_ROWS("DailyReports", "ProjectID")` |  |
| **Related Tasks** *(virtual)* | List | H | `REF_ROWS("Tasks", "ProjectID")` |  |
| **Related ProjectTrades** *(virtual)* | List | H | `REF_ROWS("ProjectTrades", "ProjectID")` |  |
| **Related ProjectPersonnel** *(virtual)* | List | H | `REF_ROWS("ProjectPersonnel", "ProjectID")` |  |

---

## 2. `Users`

| Column | Type | K/L/H | Initial value | Notes |
|---|---|---|---|---|
| UserID | Text | K | `"USR-" & TEXT(COUNT(Users[UserID])+1, "000")` |  |
| FullName | Name | L |  | Required |
| Email | Email |  |  | Required, unique. Valid_If: `NOT(IN([Email], Users[Email] - LIST([_THISROW].[Email])))` |
| Role | EnumList |  |  | Values: `SiteSuperintendent, ProjectManager, Director, Coordinator, Admin`. Base type Text. Required. **EnumList (not Enum)** so a single user can hold multiple roles — e.g. Evan Heitman is both Director (on every project) and Site Superintendent (on 2610). |
| Phone | Phone |  |  |  |
| Active | Yes/No |  | `TRUE` |  |
| CreatedAt | DateTime |  | `NOW()` | Editable_If: `FALSE` |

---

## 3. `DailyReports`

| Column | Type | K/L/H | Initial value | Valid_If / Show_If / Display name / notes |
|---|---|---|---|---|
| ReportID | Text | K, H | `"RPT-" & TEXT([ReportDate],"YYYY-MM-DD") & "-" & [ProjectID]` | Read-only after create. **Type MUST be `Text` — not `Yes/No`.** During 2026-05-13 live build the Type was accidentally set to `Yes/No` while editing the `Show?` formula, which silently broke the column (it could no longer store text values like `RPT-2026-05-13-PRJ-002`). The fix is to revert Type to `Text` in the column edit panel. **`Show?` = `IN("Admin", LOOKUP(USEREMAIL(),"Users","Email","Role"))`** — hide from supers, PMs, Coordinators, Directors per Evan 2026-05-10 (item 1). |
| ProjectID | Ref → Projects |  | (passed in from view) | **Display name: `Project Name`.** **Pinned to the very top of the form** (per Evan item 7) — first visible field in `DailyReports_Form` and first row of the General Info section in `Today's Report`. AppSheet displays this Ref using the `Projects.ProjectName` Label, so the user sees the project name, not `PRJ-001`. **`Show?` = default (always visible)** — must NOT be set to `ISBLANK([_THIS])`. During 2026-05-13 live build, the column had an inherited `ISBLANK([_THIS])` formula that hid the field once prefilled via `LINKTOFORM`, which made Project Name disappear from the top of Sam's form. Cleared back to default. Required. Valid_If: `FILTER("Projects", AND([Active] = TRUE, OR(IN("Admin", LOOKUP(USEREMAIL(),"Users","Email","Role")), USEREMAIL() = [SuperintendentEmail])))` |
| ReportDate | Date |  | `TODAY()` | Display name: `Report Date`. Required. Valid_If: prevents duplicate same-day reports: `NOT(IN([_THIS], SELECT(DailyReports[ReportDate], AND([ProjectID] = [_THISROW].[ProjectID], [ReportID] <> [_THISROW].[ReportID]))))` |
| SuperintendentID | Ref → Users |  | `LOOKUP([ProjectID], "Projects", "ProjectID", "SuperintendentID")` | Display name: `Superintendent`. Editable_If: `FALSE`. **`Show?` = `CONTEXT("ViewType") = "Detail"`** (set 2026-05-13) — visible on `Today's Report` detail view, hidden in `DailyReports_Form` so it doesn't clutter the create flow. |
| PreparedByEmail | Email |  | `USEREMAIL()` | Display name: `Prepared By`. Editable_If: `FALSE`. **`Show?` = `CONTEXT("ViewType") = "Detail"`** (set 2026-05-13) — same reasoning as `SuperintendentID`. |
| WeatherTemp | Number |  |  | Display name: `Weather Temp`. **Auto-filled by Bot 4** from Open-Meteo using the project's Lat/Long shortly after the report row is created. Show as °C. Editable by super (manual override always wins — Bot 4 only writes when this column is blank). Required at submit time, not at create time — see Save & Submit `Only_If` in `03_actions.md`. |
| WeatherConditions | Enum |  |  | Display name: `Weather Conditions`. **Auto-filled by Bot 4** from Open-Meteo's WMO weather code → label mapping. Editable by super. Required at submit time, not at create time. Values: `Sunny, Cloudy, Overcast, Light Rain, Heavy Rain, Snow, Wind, Fog`. Base type Text. |
| WorksafeInspectionToday | Yes/No |  | `FALSE` | **Display name: `Worksafe Inspection Today?`** (per Evan item 4 — every safety toggle ends with `?`). Required. |
| SiteInspectionDoneToday | Yes/No |  | `FALSE` | **Display name: `Site Inspection Done Today?`** (per Evan item 4). Required. |
| FieldLevelHazardUpToDate | Yes/No |  | `TRUE` | **Display name: `Field Level Hazard Assessments Up to Date?`** (per Evan item 3 — exact wording). Required. |
| NextToolboxMeeting | Date |  |  | Display name: `Next Toolbox Meeting`. Date field (no `?` — not a yes/no). |
| NotableEvents | LongText |  |  | Display name: `Notable Events`. **Pinned as the LAST input field** in both the form and the detail view (per Evan item 5) — must appear after every child-table section (Equipment, Rentals, Visitors, Deliveries, Photos) and immediately before the `Save & Submit` action button. |
| Status | Enum |  | `"Draft"` | Values: `Draft, Submitted, Reviewed`. Editable_If: see §6 lock rule. **`Show?` = `IN("Admin", LOOKUP(USEREMAIL(),"Users","Email","Role"))`** — hide from supers per Evan 2026-05-10 (item 6: "hide the status bar"). Managers / Director still see it inline on the Manager Inbox / Director Dashboard via slice filters; Admin sees it everywhere. |
| SubmittedAt | DateTime | H |  | Set by Save & Submit action. Editable_If: `FALSE` |
| ReviewedAt | DateTime | H |  | Set by Mark as Reviewed action. Editable_If: `FALSE` |
| ReviewedByEmail | Email | H |  | Set by Mark as Reviewed action. Editable_If: `FALSE` |
| PdfFileID | Text | H |  | Set by automation Bot 1 step 1. Editable_If: `FALSE` |
| CreatedAt | DateTime | H | `NOW()` | Editable_If: `FALSE` |
| ModifiedAt | DateTime | H | `NOW()` | App formula: `NOW()` (recomputes on every save) |
| **Related Tasks (in progress)** *(virtual)* | List | H | `SELECT(Tasks[TaskID], AND([ProjectID] = [_THISROW].[ProjectID], [Status] <> "Completed", [StartDate] <= [_THISROW].[ReportDate]))` | **`Show?` = `CONTEXT("ViewType") = "Detail"`** (set 2026-05-13) — inline reference list on `Today's Report` detail view, hidden in the create form. |
| **Related Tasks (started today)** *(virtual)* | List | H | `SELECT(Tasks[TaskID], AND([ProjectID] = [_THISROW].[ProjectID], [StartDate] = [_THISROW].[ReportDate], [OriginReportID] = [_THISROW].[ReportID]))` | **`Show?` = `CONTEXT("ViewType") = "Detail"`** (set 2026-05-13). Section appears on detail view post-save (per Evan 2026-05-11 item 4); the super uses the inline `+ Add` to create new in-progress tasks. |
| **Related Tasks (completed today)** *(virtual)* | List | H | `SELECT(Tasks[TaskID], AND([ProjectID] = [_THISROW].[ProjectID], [Status] = "Completed", [CompletedDate] = [_THISROW].[ReportDate]))` | **`Show?` = `CONTEXT("ViewType") = "Detail"`** (set 2026-05-13). Per Evan 2026-05-11 item 5 — completed tasks appear here in their own section. |
| **Related ReportTrades** *(virtual)* | List | H | `REF_ROWS("ReportTrades", "ReportID")` | Per-report row history (audit). **`Show?` = `FALSE`** (set 2026-05-13) — this is the raw audit list; the user-facing list is the `(still on site)` variant below. |
| **Related ReportTrades (still on site)** *(virtual)* | List | H | `SELECT(ReportTrades[ReportTradeID], AND([ProjectID] = [_THISROW].[ProjectID], [Status] = "On Site"))` | **Per Evan 2026-05-10 (item 13): trades carry forward like tasks in progress.** **`Show?` = `CONTEXT("ViewType") = "Detail"`** (set 2026-05-13). This is the list the super sees on today's report under "Trades on Site Today". When a trade leaves site, the super taps the inline "Mark Off Site" action on Action 8 (`03_actions.md`), which flips `ReportTrades.Status` to `"Off Site"` and the row drops out of this virtual column. New trades are added via the inline `+` on this section, which calls `LINKTOFORM("ReportTrades_Form", "ReportID", [ReportID], "ProjectID", [ProjectID])`. |
| **Related Equipment** *(virtual)* | List | H | `REF_ROWS("Equipment", "ReportID")` | Per-report row history (audit). **`Show?` = `FALSE`** (set 2026-05-13) — audit list, not user-facing. |
| **Related Equipment (still on site)** *(virtual)* | List | H | `SELECT(Equipment[EquipmentID], AND([ProjectID] = [_THISROW].[ProjectID], [Status] = "On Site"))` | **Per Evan 2026-05-10 (item 12): equipment carries forward.** **`Show?` = `CONTEXT("ViewType") = "Detail"`** (set 2026-05-13). Same pattern as trades above — Action 9 in `03_actions.md` flips `Equipment.Status` to `"Off Site"` when the super taps the inline "Mark Off Site" check. |
| **Related Rentals** *(virtual)* | List | H | `REF_ROWS("Rentals", "ReportID")` | **Display name: `Rentals on Site Today`** (per Evan 2026-05-11 item 8 — exact wording, was `Rentals On Site`). **`Show?` = `CONTEXT("ViewType") = "Detail"`** (set 2026-05-13) — inline ref list on detail view only, not on the create form. |
| **Related Visitors** *(virtual)* | List | H | `REF_ROWS("Visitors", "ReportID")` | **Display name: `Visitors on Site Today`** (per Evan 2026-05-11 item 8 — exact wording, was `Visitors On Site`). **`Show?` = `CONTEXT("ViewType") = "Detail"`**. |
| **Related Deliveries** *(virtual)* | List | H | `REF_ROWS("Deliveries", "ReportID")` | **Display name: `Deliveries`** (per Evan 2026-05-11 item 6 — AppSheet defaults to the singular `Delivery` from the table name; override to plural). **`Show?` = `CONTEXT("ViewType") = "Detail"`**. |
| **Related Photos** *(virtual)* | List | H | `REF_ROWS("Photos", "ReportID")` | **`Show?` = `FALSE`** per Evan 2026-05-11 (item 7 — hide the photos section for now). The underlying Photos table + automation logic stays intact; only the on-screen section is hidden. Re-enable later by reverting `Show?` to default. |
| **Related TimeEntries** *(virtual)* | List | H | `REF_ROWS("TimeEntries", "ReportID")` | **`Show?` = `FALSE`** per Evan 2026-05-11 (item 7 — hide the time/crew section for now). PDF + TotalHoursToday still depend on this column being populated; only the on-screen section is hidden. Re-enable later by reverting `Show?`. |
| **TotalHoursToday** *(virtual)* | Decimal |  | `SUM([Related TimeEntries][Hours])` | **`Show?` = `FALSE`** (set 2026-05-13) — computed value used by the PDF template; should not appear as a field on either the form or the detail view. Without this hide, the column showed up in the form as a 0 value that confused Sam during the live test. |
| **ProjectName** *(virtual)* | Text |  | `LOOKUP([ProjectID], "Projects", "ProjectID", "ProjectName")` | Used in PDF + email subject. **`Show?` = `FALSE`** (set 2026-05-13) — this is an internal lookup used by the PDF generator; the user already sees the project name via the `ProjectID` Ref column's auto-rendering. Without this hide, it would appear as a duplicate "ProjectName" field on the detail view. |
| **IsLocked** *(virtual)* | Yes/No | H | `[Status] = "Reviewed"` | **`Show?` = `FALSE`** — internal flag, hide everywhere per Evan 2026-05-10 (item 10). Used only by other formulas / security rules; never shown in UI. |

---

## 4. `Tasks`

| Column | Type | K/L/H | Initial value | Valid_If / Show_If / notes |
|---|---|---|---|---|
| TaskID | Text | K | `"TSK-" & TEXT(COUNT(Tasks[TaskID])+1, "0000")` |  |
| ProjectID | Ref → Projects |  |  | Required |
| Description | Text | L |  | Required |
| StartDate | Date |  | `TODAY()` | Required |
| Status | Enum |  | `"In Progress"` | Values: `In Progress, Completed`. Required |
| CompletedDate | Date | H |  | Editable_If: `[Status] = "Completed"` |
| OriginReportID | Ref → DailyReports | H |  | Set when the task is created from inside a report's "Tasks Started Today" inline-add |
| CreatedByEmail | Email | H | `USEREMAIL()` | Editable_If: `FALSE` |
| CreatedAt | DateTime | H | `NOW()` | Editable_If: `FALSE` |

---

## 5. `ReportTrades`

Per Evan 2026-05-10 (item 13) the trades-on-site list **carries forward** day to day, mirroring the Tasks-in-progress pattern. Same additive change as `Equipment` (§10): new `ProjectID`, `Status`, `OffSiteDate`, `OriginReportID` columns. Existing columns unchanged.

| Column | Type | K/L/H | Initial value | Notes |
|---|---|---|---|---|
| ReportTradeID | Text | K, H | `"RT-" & TEXT(COUNT(ReportTrades[ReportTradeID])+1, "0000")` | Hidden in UI (internal ID). |
| ReportID | Ref → DailyReports | H |  | Required at create. First-report pointer. Hidden in form (prefilled from parent). |
| ProjectID | Ref → Projects | H | `LOOKUP([ReportID], "DailyReports", "ReportID", "ProjectID")` | **NEW 2026-05-10.** Required. Auto-derived; never edited by user. Drives the carry-forward virtual column on `DailyReports`. |
| TradeID | Ref → Trades |  |  | Display name: `Trade`. Required. Valid_If: `SELECT(ProjectTrades[TradeID], [ProjectID] = LOOKUP([_THISROW].[ReportID], "DailyReports", "ReportID", "ProjectID"))` |
| WorkerCount | Number |  | `1` | Display name: `Worker Count`. Min 1. |
| Notes | Text |  |  |  |
| Status | Enum |  | `"On Site"` | **NEW 2026-05-10.** Display name: `Status`. Values: `On Site, Off Site`. Base type Text. Required. Toggle via Action 8 (`Mark Trade Off Site`) in `03_actions.md`. Direct edit allowed for Admin. |
| OffSiteDate | Date | H |  | **NEW 2026-05-10.** Set by Action 8. Editable_If: `[Status] = "Off Site"`. |
| OriginReportID | Ref → DailyReports | H |  | **NEW 2026-05-10.** First report on which this trade appeared. Editable_If: `FALSE`. |

---

## 6. `Trades`

| Column | Type | K/L/H | Initial value | Notes |
|---|---|---|---|---|
| TradeID | Text | K | `"TRD-" & TEXT(COUNT(Trades[TradeID])+1, "000")` |  |
| TradeName | Text | L |  | Required, unique |
| CompanyName | Text |  |  |  |
| ContactName | Name |  |  |  |
| ContactEmail | Email |  |  |  |
| ContactPhone | Phone |  |  |  |
| Active | Yes/No |  | `TRUE` |  |

---

## 7. `ProjectTrades`

| Column | Type | K/L/H | Initial value | Notes |
|---|---|---|---|---|
| ProjectTradeID | Text | K | `"PT-" & TEXT(COUNT(ProjectTrades[ProjectTradeID])+1, "000")` |  |
| ProjectID | Ref → Projects |  |  | Required |
| TradeID | Ref → Trades |  |  | Required. Valid_If: `NOT(IN([_THIS], SELECT(ProjectTrades[TradeID], AND([ProjectID]=[_THISROW].[ProjectID], [ProjectTradeID]<>[_THISROW].[ProjectTradeID]))))` |
| Active | Yes/No |  | `TRUE` |  |

---

## 8. `Personnel`

| Column | Type | K/L/H | Initial value |
|---|---|---|---|
| PersonnelID | Text | K | `"PER-" & TEXT(COUNT(Personnel[PersonnelID])+1, "000")` |
| FullName | Name | L |  |
| Role | Text |  |  |
| Email | Email |  |  |
| Phone | Phone |  |  |
| Active | Yes/No |  | `TRUE` |

---

## 9. `ProjectPersonnel`

| Column | Type | K/L/H | Initial value | Notes |
|---|---|---|---|---|
| ProjectPersonnelID | Text | K | `"PP-" & TEXT(COUNT(ProjectPersonnel[ProjectPersonnelID])+1, "000")` |  |
| ProjectID | Ref → Projects |  |  | Required |
| PersonnelID | Ref → Personnel |  |  | Required. Same uniqueness Valid_If pattern as ProjectTrades |
| Active | Yes/No |  | `TRUE` |  |

---

## 10. `Equipment`

Per Evan 2026-05-10 (item 12) the Equipment list **carries forward** day to day, mirroring the Tasks-in-progress pattern. New columns `ProjectID`, `Status`, `OffSiteDate`, `OriginReportID` were added 2026-05-10 to enable this. Existing columns (`ReportID`, `EquipmentName`, `TradeID`, `Comments`) are unchanged. `ReportID` stays for backward compatibility and as the "first appeared on this report" pointer; the project-wide carry-forward is driven by `ProjectID` + `Status`.

| Column | Type | K/L/H | Initial value | Notes |
|---|---|---|---|---|
| EquipmentID | Text | K, H | `"EQ-" & TEXT(COUNT(Equipment[EquipmentID])+1, "0000")` | Hidden everywhere (per Evan item 1 family — no internal IDs in the UI). |
| ReportID | Ref → DailyReports | H |  | Required at create. The first-report pointer; not required to match the row's project beyond create. **Hidden in the form** — prefilled from the parent report when the super taps `+ Add Equipment` on today's report. |
| ProjectID | Ref → Projects | H | `LOOKUP([ReportID], "DailyReports", "ReportID", "ProjectID")` | **NEW 2026-05-10.** Required. Auto-derived from ReportID at create — never edited by the user. Drives the project-wide carry-forward virtual column on `DailyReports`. Hidden in the form. |
| EquipmentName | Text | L |  | Display name: `Equipment Name`. Required. |
| TradeID | Ref → Trades |  |  | Display name: `Trade`. |
| Comments | Text |  |  |  |
| Status | Enum |  | `"On Site"` | **NEW 2026-05-10.** Display name: `Status`. Values: `On Site, Off Site`. Base type Text. Required. Drives whether the row appears in tomorrow's "Equipment on Site Today" carry-forward list. Editable_If: super of the project, or Admin. Toggle is via the inline `Mark Equipment Off Site` action (Action 9) in `03_actions.md`, not by the user editing this column directly — but direct edit is allowed for cleanup. |
| OffSiteDate | Date | H |  | **NEW 2026-05-10.** Set by `Mark Equipment Off Site` (Action 9). Editable_If: `[Status] = "Off Site"`. Hidden in form. |
| OriginReportID | Ref → DailyReports | H |  | **NEW 2026-05-10.** Set by `+ Add Equipment` action — the report on which this piece of equipment was first added. Editable_If: `FALSE`. Mirrors `Tasks.OriginReportID`. |

---

## 11. `Rentals`

| Column | Type | K/L/H | Initial value | Notes |
|---|---|---|---|---|
| RentalID | Text | K | `"REN-" & TEXT(COUNT(Rentals[RentalID])+1, "0000")` |  |
| ReportID | Ref → DailyReports |  |  | Required |
| Description | Text | L |  | Required |
| PONumber | Text |  |  | Required (per spec: "Rentals (PO Number)") |
| Supplier | Text |  |  |  |
| DailyRate | Decimal |  |  |  |
| Notes | LongText |  |  |  |

---

## 12. `Visitors`

| Column | Type | K/L/H | Initial value | Notes |
|---|---|---|---|---|
| VisitorID | Text | K | `"VIS-" & TEXT(COUNT(Visitors[VisitorID])+1, "0000")` |  |
| ReportID | Ref → DailyReports |  |  | Required |
| Company | Text | L |  | Required |
| Purpose | Text |  |  | Required |
| NumPeople | Number |  | `1` |  |
| VisitTime | DateTime |  | `NOW()` |  |

---

## 13. `Deliveries`

| Column | Type | K/L/H | Initial value | Notes |
|---|---|---|---|---|
| DeliveryID | Text | K, H | `"DEL-" & TEXT(COUNT(Deliveries[DeliveryID])+1, "0000")` | Hidden in UI. |
| ReportID | Ref → DailyReports | H |  | Required. Hidden in form (prefilled from parent). |
| PONumber | Text | L |  | Display name: `PO Number`. Required. |
| Supplier | Text |  |  | Required. |
| Description | LongText |  |  | Required. |
| ReceivedAt | **Time** |  | `TIMENOW()` | **CHANGED 2026-05-10 from `DateTime` → `Time`** per Evan item 11: "Time Picker. Minutes/Hours is enough accuracy, turn off seconds." AppSheet's `Time` type uses an HH:MM picker (no seconds wheel) on every platform. The date is implicit from the parent `DailyReports.ReportDate`, so we don't need date precision on the delivery itself. Display name: `Received At`. |

---

## 14. `Photos`

| Column | Type | K/L/H | Initial value | Notes |
|---|---|---|---|---|
| PhotoID | Text | K | `"PH-" & TEXT(COUNT(Photos[PhotoID])+1, "0000")` |  |
| ReportID | Ref → DailyReports |  |  | Required |
| Image | Image |  |  | Required. AppSheet uploads to Drive in a folder named after the app |
| Caption | Text |  |  |  |
| CapturedAt | DateTime |  | `NOW()` |  |
| UploadedByEmail | Email | H | `USEREMAIL()` | Editable_If: `FALSE` |

---

## 15. `TimeEntries`

| Column | Type | K/L/H | Initial value | Notes |
|---|---|---|---|---|
| TimeEntryID | Text | K | `"TE-" & TEXT(COUNT(TimeEntries[TimeEntryID])+1, "0000")` |  |
| ReportID | Ref → DailyReports |  |  | Required |
| PersonnelID | Ref → Personnel |  |  | Required. Valid_If: `SELECT(ProjectPersonnel[PersonnelID], [ProjectID] = LOOKUP([_THISROW].[ReportID], "DailyReports", "ReportID", "ProjectID"))` |
| Hours | Decimal |  | `8` | Required. Min 0, Max 24 |
| Notes | Text |  |  |  |

---

## Key formula reference (copy-paste targets)

These three are the load-bearing expressions. Memorise their location.

```
# Carry-forward of in-progress tasks (DailyReports virtual column)
SELECT(
  Tasks[TaskID],
  AND(
    [ProjectID] = [_THISROW].[ProjectID],
    [Status] <> "Completed",
    [StartDate] <= [_THISROW].[ReportDate]
  )
)
```

```
# Lock after review (simple form — table-level Update_If)
# Note: the full canonical lock-after-review expression lives in
# 06_security.md and is more granular (separates super / manager / admin
# rights). This simple form is a useful shorthand for understanding the
# core invariant: Reviewed is read-only for everyone except Admin.
AND(
  [Status] <> "Reviewed",
  OR(
    USEREMAIL() = LOOKUP([ProjectID], "Projects", "ProjectID", "SuperintendentEmail"),
    IN("Admin", LOOKUP(USEREMAIL(), "Users", "Email", "Role"))
  )
)
```

```
# Email recipient list for Bot 1
LOOKUP([ProjectID],"Projects","ProjectID","PMEmail") & "," &
LOOKUP([ProjectID],"Projects","ProjectID","DirectorEmail") & "," &
LOOKUP([ProjectID],"Projects","ProjectID","CoordinatorEmail")
```
