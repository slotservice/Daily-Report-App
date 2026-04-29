# ULTRADEEP Analysis — Mode Projects Daily Report App

Date of analysis: 2026-04-30
Analyst: Implementation review pass #1
Client: Mode Projects Inc. (Evan Heitman, Director / Superintendent — evan@modeprojects.ca)
Brand: Montserrat font, navy + cream brand palette (per source PDF letterhead)

---

## 1. Inventory of pre-existing files

| File | Purpose | Status |
|------|---------|--------|
| `chat.md` | Freelancer chat transcript with the client | Reference only — captures scope, brand, contact, and the deliverable list |
| `XXXX Project Name - Daily Report Working Copy Template.pdf` | The client's existing 2-page Google Doc template | Source of truth for the **PDF output layout** |
| `project_status&plan.md` | The build brief / spec | Source of truth for the **functional requirements** |

## 2. Implementation status — bottom line

**0 % implemented.** No schema, AppSheet config, Apps Script, PDF template, or deployment artifact exists in the working directory. There is no AppSheet app and no backing Google Sheet. Everything described as "implemented incorrectly" in the user's request is therefore **not yet built**, not actually broken — but the spec itself does have **gaps vs. the source PDF** that we must reconcile before building, otherwise we will under-deliver.

## 3. Spec ↔ source-PDF reconciliation (the gaps that matter)

The brief in `project_status&plan.md` and the source PDF disagree in several places. The implementation must honour the **superset** so the new app fully replaces the old document.

| # | Source-PDF field | Spec field | Decision |
|---|---|---|---|
| 1 | `Superintendent` (auto from project) + `Report Prepared by` (free text) | "Site Superintendent → creates and submits" | Implement BOTH. `Superintendent` is a Ref pulled from `Projects.Superintendent`; `PreparedBy` defaults to `USEREMAIL()` lookup |
| 2 | `Mode Team Members` — pulls crew assigned to the project | "Own Forces Personnel" | Same concept. Implement as a **multi-select** of `Personnel` rows whose `[ProjectID] = [_THISROW].[ProjectID]` |
| 3 | `Trades on Site Today` — pulls trades assigned to project | "Trades on Site (with number of workers)" | Implement as a **child table** `ReportTrades(ReportID, TradeID, WorkerCount)` with `Valid_If` constraining `TradeID` to trades assigned to the project |
| 4 | `Tasks Started Today` (5 bullets) | "Tasks Started" | Implement as `Tasks` table; new tasks created from the report inherit `Status = 'In Progress'` once submitted |
| 5 | `Tasks Still in Progress` + `Task Start Date` | "Tasks in progress (must auto carry forward from previous day until completed)" | **Carry-forward logic** — see §6. Each task row carries a `StartDate`, `Status`, `ProjectID`, and is shown read-only in subsequent reports until `Status = 'Completed'` |
| 6 | `Tasks Completed Today` | "Tasks completed" | Same `Tasks` table; superintendent flags `Status = 'Completed'` and `CompletedDate = TODAY()` |
| 7 | `Rentals On Site` (free text in PDF) | "Rentals on Site (PO Number)" | Spec wins — implement as child table `Rentals(ReportID, Description, PONumber)` so PO is captured |
| 8 | `Equipment On Site / Trade / Comments` (3-column table) | "Equipment on Site (Trade)" | Source-PDF wins — implement `Equipment(ReportID, EquipmentName, TradeID, Comments)` |
| 9 | Safety: 4 distinct fields (`Worksafe Inspection?`, `Site Inspection Done?`, `Field Level Hazard Up to Date?`, `Next Toolbox Meeting`) | "Safety checks (inspection, hazards, toolbox meeting)" | Source-PDF wins — implement all 4 fields, not a single bullet |
| 10 | `Notable Events` (free text) | "Notable events / daily summary" | Single Long-Text field |
| 11 | (not in PDF) | "Visitors on Site (Company + Purpose)" | Spec adds — implement as child table `Visitors(ReportID, Company, Purpose, NumPeople)` |
| 12 | (not in PDF) | "Deliveries (PO Number + Details)" | Spec adds — implement as child table `Deliveries(ReportID, PONumber, Description, Supplier)` |
| 13 | (not in PDF) | "Photo uploads, multiple per report" | Spec adds — implement as child table `Photos(ReportID, Image, Caption)` |
| 14 | (not in PDF) | "Time tracking — daily crew hours" | Spec adds — implement as child table `TimeEntries(ReportID, PersonnelID, Hours, Notes)` |
| 15 | (not in PDF) | "Review system — Draft/Submitted/Reviewed + ReviewDate + lock" | Spec adds — see §7 |
| 16 | (not in PDF) | "Role-based access: Site Super, PM, Director, Coordinator" | Spec adds — see §8 |

## 4. Final table set (13 tables)

1. **Projects** — one row per construction project, holds the four role assignments (Superintendent / PM / Director / Coordinator) by `Ref` to Users
2. **Users** — every person who can sign in; `Role` ∈ {SiteSuperintendent, ProjectManager, Director, Coordinator, Admin}
3. **DailyReports** — the parent of everything captured per day per project; holds the safety block, weather, narrative summary, status, review fields
4. **Tasks** — task carry-forward backbone. `(ProjectID, Description, StartDate, Status, CompletedDate, OriginReportID)`
5. **ReportTrades** — child of DailyReports — trades on site that day with worker count
6. **Trades** — master list of trades; can be assigned to projects via `ProjectTrades`
7. **ProjectTrades** — many-to-many between Projects and Trades (controls which trades show up in a project's report form)
8. **Personnel** — Mode crew master list; can be assigned to projects via `ProjectPersonnel`
9. **ProjectPersonnel** — many-to-many between Projects and Personnel
10. **Equipment** — child of DailyReports — equipment on site with trade ref + comments
11. **Rentals** — child of DailyReports — rental description + PO number
12. **Visitors** — child of DailyReports — company + purpose + number of people
13. **Deliveries** — child of DailyReports — PO + supplier + description
14. **Photos** — child of DailyReports — image + optional caption
15. **TimeEntries** — child of DailyReports — personnel ref + hours + notes

(That is 15, not 13. The spec listed 10 tables minimum; the extras `ProjectTrades` and `ProjectPersonnel` are mandatory join tables to support source-PDF requirement #2 and #3 — "pulls from database sheet for crew/trades assigned to project". They are not optional.)

## 5. Role-based access — definitive matrix

| Role | Projects | Reports (own project) | Reports (other project) | Tasks | Personnel/Trades master |
|---|---|---|---|---|---|
| SiteSuperintendent | Read | CRU* (until Reviewed, then Read) | None | CRU (own project) | Read |
| ProjectManager | Read | Read + flag-as-Reviewed | None | Read | Read |
| Director | Read | Read + flag-as-Reviewed (all projects) | Read | Read | Read |
| Coordinator | Read | Read + flag-as-Reviewed | None | Read | Read |
| Admin | CRUD | CRUD | CRUD | CRUD | CRUD |

\* CRU = Create / Read / Update; no Delete on submitted reports.

## 6. Task carry-forward logic — exact AppSheet expression

A task is "carried forward and visible on today's report" iff:

```
AND(
  [ProjectID] = [_THISROW].[ProjectID],
  [Status] <> "Completed",
  [StartDate] <= [_THISROW].[ReportDate]
)
```

This is implemented as a **virtual column** `RelatedTasksInProgress` on DailyReports, of type `List` of `Ref` to `Tasks`, app formula:

```
SELECT(
  Tasks[TaskID],
  AND(
    [ProjectID] = [_THISROW].[ProjectID],
    [Status] <> "Completed",
    [StartDate] <= [_THISROW].[ReportDate]
  )
)
```

When the superintendent marks a task `Completed` from within today's report, an action sets `[Status] = "Completed"` and `[CompletedDate] = [_THISROW].[ReportDate]`. From the next day's report onward, that task drops out of `RelatedTasksInProgress` automatically. No manual carry-forward is needed.

## 7. Locking after review — exact expression

DailyReports gets a `Status` column with valid values `Draft / Submitted / Reviewed`. Editing is gated by table-level `Update_If`:

```
AND(
  [Status] <> "Reviewed",
  OR(
    USEREMAIL() = LOOKUP([ProjectID], "Projects", "ProjectID", "SuperintendentEmail"),
    LOOKUP(USEREMAIL(), "Users", "Email", "Role") = "Admin"
  )
)
```

Once `Status = "Reviewed"`, the row is read-only for everyone except Admin, and the `Save & Submit` button is hidden via `Show_If = ([Status] <> "Reviewed")`.

A separate "Mark as Reviewed" action visible **only to PM/Director/Coordinator** sets `[Status] = "Reviewed"` and `[ReviewDate] = NOW()`.

## 8. Workflow / automation — exact bot definition

**Bot 1: On Submit → generate PDF + email**
- Trigger: data-change event, table = `DailyReports`, type = `Updates only`, condition = `AND([_THISROW_BEFORE].[Status] = "Draft", [_THISROW_AFTER].[Status] = "Submitted")`
- Step 1: `Create a new file` task — template = `DailyReportTemplate.gdoc`, output type = PDF, save to Drive folder `/Mode Projects Daily Reports/{Project}/`
- Step 2: `Send an email` task — to: `LOOKUP([ProjectID],"Projects","ProjectID","PMEmail") & "," & LOOKUP([ProjectID],"Projects","ProjectID","DirectorEmail") & "," & LOOKUP([ProjectID],"Projects","ProjectID","CoordinatorEmail")`, attach the PDF from Step 1, subject = `"Daily Report — " & [ProjectName] & " — " & TEXT([ReportDate], "YYYY-MM-DD")`

**Bot 2: On Reviewed → notify superintendent**
- Trigger: `AND([_THISROW_BEFORE].[Status] = "Submitted", [_THISROW_AFTER].[Status] = "Reviewed")`
- Step 1: email to `LOOKUP([ProjectID],"Projects","ProjectID","SuperintendentEmail")` letting them know the report is locked.

## 9. Branding

Per `chat.md` line 132–133:
- Font for all documentation: **Montserrat**
- Brand assets: client offered to send logos — *we have not yet received them*. Placeholder logo path noted in deployment guide; client must drop a PNG into the Drive folder and the template will pick it up.

## 10. What this analysis explicitly excludes

- AppSheet apps cannot be checked into git as binary blobs the way code can. The "implementation" is therefore: (a) deployable Google Sheets schema, (b) a configuration spec the user (or we) apply in the AppSheet editor, (c) Apps Script + Doc template that AppSheet calls. All three live in this repo.
- We have not received the brand graphics yet; logo is a placeholder in the template until the client provides it.
- We have not received a real list of projects, users, or trades; the schema ships with a single seed-data row per table for testing.

## 11. Risk register

| Risk | Mitigation |
|---|---|
| Client sends brand graphics late → PDF looks generic | Template uses an `<img src>` from a known Drive file ID; swapping the logo is a one-file replace, no template change |
| AppSheet free-tier row limits | Schema designed to keep DailyReports lean; large blobs (photos) live in Drive, not in cells |
| Offline conflicts on simultaneous edits | Reports are scoped per-superintendent per-project per-day; collisions are vanishingly rare |
| Email deliverability from AppSheet | Default sender is `appsheet@appsheet.com`; deployment guide instructs setting a Gmail SMTP relay using `evan@modeprojects.ca` if branded sender is required |
| Task carry-forward across project transfers | `Tasks.ProjectID` is the anchor; if a task moves projects, a new task row is created and the old one is closed — documented in deployment guide |
