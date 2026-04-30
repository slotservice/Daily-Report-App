# End-to-End Smoke Test — Paper Walkthrough

A static dry-run of every formula, slice, action, view, bot, and security
rule, exercised against the production seed data. Done before any AppSheet
build so we catch issues while they're cheap to fix.

Date: 2026-04-30
Method: paper / desk-check, no live AppSheet app yet.

---

## TL;DR

| Bucket | Count |
|---|---|
| 🔴 Critical bugs found and fixed | **18 EnumList comparison errors** + 1 broken-ref data bug |
| 🟡 Issues flagged for build-time verification | 4 |
| ✅ User journeys simulated and pass | 6 |
| 🚧 Outstanding feature gaps for client decision | 1 |

The spec is **safe to build against now**. The four 🟡 items are things to
keep an eye on while clicking through the AppSheet editor; none of them
blocks deployment.

---

## 1. Critical bugs found and fixed in this pass

### 1.1 EnumList Role comparisons — 18 places (FIXED)

When `Users.Role` was promoted from `Enum` to `EnumList` (so Evan can be
both Director and Site Superintendent), every formula that compared role
using `=` or `IN LIST(...)` silently broke. AppSheet returns the role
column as a List type; comparing `<list> = "Admin"` is always FALSE,
and `<list> IN LIST("X","Y")` compares lists, not list elements.

Every offending expression was rewritten to use `IN("RoleName", <list>)`.

Locations fixed:

| File | Line(s) | Before | After |
|---|---|---|---|
| `01_columns_and_formulas.md` | DailyReports.ProjectID Valid_If | `... = "Admin"` | `IN("Admin", ...)` |
| `01_columns_and_formulas.md` | Lock-after-review reference | `... = "Admin"` | `IN("Admin", ...)` |
| `02_slices.md` | Slice 1 (`Reports_Editable_By_Me`) | `... = "Admin"` | `IN("Admin", ...)` |
| `02_slices.md` | Slice 3 (`Reports_Visible_To_Me`) | `... = "Admin"` | `IN("Admin", ...)` |
| `02_slices.md` | Slice 6 (`My_Projects`) | `... = "Admin"` | `IN("Admin", ...)` |
| `02_slices.md` | Slice 7 (`Reports_Pending_Review`) | `... IN LIST("Director","Admin")` | `OR(IN("Director",...), IN("Admin",...))` |
| `03_actions.md` | Action 2 (Mark as Reviewed) | `... = "Admin"` | `IN("Admin", ...)` |
| `03_actions.md` | Action 3 (Mark Task Completed) | `... = "Admin"` | `IN("Admin", ...)` |
| `03_actions.md` | Action 6 (Re-send PDF) | `... = "Admin"` | `IN("Admin", ...)` |
| `03_actions.md` | Action 7 (Recall to Draft) | `... = "Admin"` | `IN("Admin", ...)` |
| `04_views.md` | App start expression | `SWITCH(<list>, ...)` | `IFS(IN(role, <list>), ...)` |
| `04_views.md` | Super Home Show_If | `... = "SiteSuperintendent"` | `IN("SiteSuperintendent", ...)` |
| `04_views.md` | Manager Inbox Show_If | `... IN LIST("PM","Coord")` | `OR(IN("PM",...), IN("Coord",...))` |
| `04_views.md` | Director Dashboard Show_If | `... = "Director"` | `IN("Director", ...)` |
| `04_views.md` | Admin Console Show_If | `... = "Admin"` | `IN("Admin", ...)` |
| `06_security.md` | Projects/Users/DailyReports table-level rules | `... = "Admin"` / `... IN LIST(...)` | `IN("Admin", ...)` / `OR(IN(...), IN(...))` |
| `06_security.md` | Lock-after-review canonical rule | `... = "Admin"` | `IN("Admin", ...)` |
| `06_security.md` | DailyReports.Status Editable_If | `... = "Admin"` | `IN("Admin", ...)` |

Why it matters: without these fixes, **no role check would have worked**.
Sam wouldn't have seen Super Home, John wouldn't have seen the Inbox,
Evan wouldn't have routed to the Director Dashboard, the lock-after-review
expression would have admitted everyone, and the admin-only Recall and
Re-send actions would never appear.

### 1.2 ProjectTrades seed rows pollute production (FIXED)

Seed `ProjectTrades.csv` had three rows linking `PRJ-001 → TRD-001/2/3`.
After the production swap, `PRJ-001` is now "2603 Athlone Roof Overhang"
— so Athlone would silently inherit Concrete + Framing + Electrical as
assigned trades, even though Evan said trades are fluctuating per project.

`production_data/00_README.md` was updated to instruct **clearing
`ProjectTrades` to headers-only** during the swap.

---

## 2. Data integrity audit — production_data CSVs

| Check | Result |
|---|---|
| All `UserID` keys unique | ✅ USR-001..USR-005 |
| All `ProjectID` keys unique | ✅ PRJ-001..PRJ-004 |
| Every `SuperintendentID/PMID/DirectorID/CoordinatorID` resolves to a real `UserID` | ✅ |
| Every `*Email` matches the corresponding `Users[Email]` | ✅ |
| `Personnel` keys unique | ✅ PER-001 |
| Every `ProjectPersonnel.PersonnelID` resolves | ✅ PER-001 → real |
| Every `ProjectPersonnel.ProjectID` resolves | ✅ PRJ-001 and PRJ-004 → real |
| Role values use the canonical Enum strings (no whitespace, exact case) | ✅ |
| Evan's role list contains all three intended roles | ✅ `Director,SiteSuperintendent,Admin` |
| Sam's dual identity present in both `Users` (USR-005) and `Personnel` (PER-001) with same email | ✅ |

---

## 3. Formula evaluation — load-bearing expressions

### 3.1 ReportID generation

```
"RPT-" & TEXT([ReportDate],"YYYY-MM-DD") & "-" & [ProjectID]
```

Test: ReportDate=`2026-04-30`, ProjectID=`PRJ-002` → `RPT-2026-04-30-PRJ-002` ✅

### 3.2 Carry-forward (DailyReports virtual column)

```
SELECT(Tasks[TaskID],
  AND(
    [ProjectID] = [_THISROW].[ProjectID],
    [Status] <> "Completed",
    [StartDate] <= [_THISROW].[ReportDate]))
```

Scenario: Sam started TSK-001 on 2026-04-30 for PRJ-002 (Status=In Progress).
- For new report dated 2026-05-01 PRJ-002: SELECT returns `[TSK-001]` ✅ — task carries forward
- Sam taps "Mark Completed" → TSK-001.Status=Completed, CompletedDate=2026-05-01
- For new report dated 2026-05-02 PRJ-002: SELECT returns `[]` ✅ — task no longer carries

### 3.3 Lock-after-review (DailyReports table-level Update_If, canonical form in `06_security.md`)

```
AND(
  [Status] <> "Reviewed",
  OR(
    AND(
      USEREMAIL() = LOOKUP([ProjectID],"Projects","ProjectID","SuperintendentEmail"),
      [Status] IN LIST("Draft","Submitted")
    ),
    AND(
      IN(USEREMAIL(), LIST(
        LOOKUP([ProjectID],"Projects","ProjectID","PMEmail"),
        LOOKUP([ProjectID],"Projects","ProjectID","DirectorEmail"),
        LOOKUP([ProjectID],"Projects","ProjectID","CoordinatorEmail")
      )),
      [Status] = "Submitted"
    ),
    IN("Admin", LOOKUP(USEREMAIL(),"Users","Email","Role"))
  )
)
```

| User | Status before | Result |
|---|---|---|
| Sam (super on 2609) | Draft on 2609 | ✅ allowed |
| Sam (super on 2609) | Submitted on 2609 | ✅ allowed |
| Sam (super on 2609) | Reviewed on 2609 | ❌ blocked |
| John (PM) | Submitted on any | ✅ allowed (writes via Mark as Reviewed action only) |
| John (PM) | Draft on 2609 | ❌ blocked (intended — PMs don't edit drafts) |
| Evan (Director+Super+Admin) | Reviewed on any | ✅ allowed via Admin branch |
| Random signed-in user not in any role | any | ❌ blocked |

### 3.4 Email recipient list (Bot 1 step 3)

```
CONCATENATE(
  LOOKUP([ProjectID],"Projects","ProjectID","PMEmail"), ",",
  LOOKUP([ProjectID],"Projects","ProjectID","DirectorEmail"), ",",
  LOOKUP([ProjectID],"Projects","ProjectID","CoordinatorEmail")
)
```

For PRJ-002: `john@modeprojects.ca,evan@modeprojects.ca,mary-ann@modeprojects.ca` ✅

### 3.5 ProjectName virtual

`LOOKUP([ProjectID], "Projects", "ProjectID", "ProjectName")` for PRJ-001 → `Athlone Roof Overhang` ✅

### 3.6 TimeEntries.PersonnelID Valid_If

```
SELECT(ProjectPersonnel[PersonnelID],
  [ProjectID] = LOOKUP([_THISROW].[ReportID],"DailyReports","ReportID","ProjectID"))
```

For a TimeEntry on a PRJ-001 report → returns `[PER-001]` (Sam Dick) ✅

### 3.7 ReportTrades.TradeID Valid_If

```
SELECT(ProjectTrades[TradeID],
  [ProjectID] = LOOKUP([_THISROW].[ReportID],"DailyReports","ReportID","ProjectID"))
```

After production swap, `ProjectTrades` is empty → picker is empty until Evan
adds project↔trade assignments. **Behavior is correct but the picker UX
will be empty** until first assignment is made. See §5 Issue D for
recommendation.

---

## 4. User journey simulations

### Journey 1 — Sam Dick (single-role superintendent, PRJ-002)

Step | Click | Expected | Verdict
---|---|---|---
1 | Sign in `sam@modeprojects.ca` | `IFS` resolves: not Director, not PM, not Coord, IS SiteSuperintendent → **Super Home** | ✅
2 | Tap PRJ-002 (only project Sam is super on) in My_Projects card | Today's Report opens with no row → "Start Today's Report" CTA | ✅
3 | Tap CTA | DailyReports_Form opens, ProjectID prefilled PRJ-002, ReportDate=TODAY() | ✅
4 | Fill WeatherTemp=12, WeatherConditions=Sunny, save | Row created. ReportID=`RPT-2026-04-30-PRJ-002`. Status=Draft. SuperintendentID auto-filled USR-005. | ✅
5 | "Add Task Started Today" → Tasks_Form prefilled, save with Description="Pour washroom slab" | Tasks row created with OriginReportID linking to today's report | ✅
6 | Detail view → Tasks Started Today section shows the new task | Virtual column SELECTs by ProjectID + StartDate=ReportDate + OriginReportID match | ✅
7 | Save & Submit (only_if passes: Draft + super + temp/conditions filled) | Status=Submitted, SubmittedAt=NOW(). Bot 1 fires. | ✅
8 | Bot 1: PDF created in `/Mode Projects Daily Reports/Fourth Street Washroom/`, email to John, Evan, Mary-Ann (cc Sam) | Bot trigger condition `Draft → Submitted` matches | ✅
9 | Sam tries to edit a field while Status=Submitted | Update_If passes (super branch, status=Submitted allowed) | ✅
10 | After John reviews, Sam tries to edit | Update_If fails (Status=Reviewed blocks all non-Admin branches) | ✅

### Journey 2 — John Hughes (PM, all 4 projects)

Step | Click | Expected | Verdict
---|---|---|---
1 | Sign in `john@modeprojects.ca` | IFS: not Director, IS PM → **Manager Inbox** | ✅
2 | Manager Inbox | Slice `Reports_Reviewable_By_Me` returns: Status=Submitted AND USEREMAIL ∈ {PM,Director,Coord}. John is PM on all 4 → sees every Submitted report across projects | ✅
3 | Tap Sam's submitted report | Report Detail (Manager) view opens; all fields read-only; Mark as Reviewed prominent | ✅
4 | Mark as Reviewed | Action 2 only_if passes (Submitted + PM in role chain) → Status=Reviewed, ReviewedAt=NOW(), ReviewedByEmail=john@. Bot 2 fires. | ✅
5 | Bot 2: notify Sam | Email arrives at sam@ confirming review and lock | ✅
6 | John tries to add a row to DailyReports | Adds rule = `OR(IN("SiteSuperintendent",...), IN("Admin",...))` → both FALSE for John → blocked | ✅

### Journey 3 — Evan Heitman (Director + Super + Admin)

Step | Click | Expected | Verdict
---|---|---|---
1 | Sign in `evan@modeprojects.ca`; role=`Director,SiteSuperintendent,Admin` | IFS first match: Director → **Director Dashboard** | ✅
2 | Pending Review deck | Slice `Reports_Pending_Review` returns: Status=Submitted AND (Director OR Admin in roles) → sees every Submitted across all 4 projects | ✅
3 | Open Sam's Submitted on PRJ-002, Mark as Reviewed | Action 2 only_if matches the Director-on-2609 path | ✅
4 | Switch via menu to Super Home | Show_If = `IN("SiteSuperintendent", roles)` = TRUE → visible | ✅
5 | My_Projects on Super Home | Filtered by `USEREMAIL = SuperintendentEmail` → only PRJ-003 (Galvin Place, where Evan is the super) | ✅
6 | Switch via menu to Admin Console | Show_If = `IN("Admin", roles)` = TRUE → visible. Can edit Users/Projects/master tables. | ✅

### Journey 4 — James McCaul (super on PRJ-001 + PRJ-004) tracking Sam's hours

Step | Click | Expected | Verdict
---|---|---|---
1 | Sign in `james@modeprojects.ca` → Super Home | IFS: SiteSuperintendent only → Super Home | ✅
2 | My_Projects shows 2 cards (PRJ-001, PRJ-004) | Slice filters projects where USEREMAIL=SuperEmail → both Athlone and Tofino Gas Bar | ✅
3 | Pick PRJ-001, fill weather, save report | RPT-2026-04-30-PRJ-001 created | ✅
4 | "+" on Crew & Hours → TimeEntries_Form | PersonnelID picker = `SELECT(ProjectPersonnel[PersonnelID], ProjectID=PRJ-001)` → returns `[PER-001]` (Sam) | ✅
5 | Pick Sam, Hours=8, save | TimeEntry written with ReportID=RPT...PRJ-001, PersonnelID=PER-001 | ✅
6 | TotalHoursToday on report = 8 | `SUM([Related TimeEntries][Hours])` = 8 | ✅
7 | Save & Submit → Bot 1 fires → email to John, Evan, Mary-Ann (cc James) | ✅

### Journey 5 — Carry-forward across days

Already covered in §3.2. **Verdict ✅** — task carries forward automatically
until Mark Completed; afterwards drops out.

### Journey 6 — Bot 3 (9 AM next-day reminder)

Step | Trigger | Expected | Verdict
---|---|---|---
1 | 2026-04-30 ends; Sam never submits for PRJ-002 | — | —
2 | 2026-05-01 09:00 PT, Bot 3 schedule fires | Iterates active projects | ✅
3 | For PRJ-002: condition `ISBLANK(SELECT(reports, ProjectID=PRJ-002, ReportDate=2026-04-30, Status IN LIST("Submitted","Reviewed")))` → TRUE | Sends email to sam@, cc john@ | ✅
4 | For PRJ-001 (where James already submitted yesterday) | condition FALSE → no email | ✅

---

## 5. Issues flagged for build-time verification

### Issue A — 🚧 Superintendent's own hours not trackable

James (USR-004), Sam-as-super (on PRJ-002), and Evan-as-super (on PRJ-003)
have rows in `Users` but not in `Personnel`. A superintendent submitting
a report cannot enter their own hours via TimeEntries because the picker
is filtered to `ProjectPersonnel` rows.

**Severity:** medium / feature gap.

**Resolution options for Evan:**
1. Accept it — the super's presence is implicit; only crew hours need tracking.
2. Add each super to `Personnel` (e.g. PER-002 James, PER-003 Evan) and
   create `ProjectPersonnel` rows for super → their own project. ~5 minutes
   in the Sheet.
3. Add an explicit `SupervisorHours` field on `DailyReports` for the
   super's own time (~15 min spec change).

I'd recommend option 2. **Don't change anything until Evan picks.**

### Issue B — 🟡 Bot 1 step output reference syntax

Bot 1 step 1.2 ("Save PDF reference back to row") uses a placeholder
expression `[_OUTPUT_URL_FROM_STEP_1_1]`. AppSheet's actual reference
syntax for previous-step output URLs depends on how the Create File step
is named and how its outputs are exposed. **Verify during deployment Step
9** by clicking into the column-set picker — AppSheet shows the available
output references from the previous step in a dropdown. Pick the URL
output. If unclear, ask in the AppSheet forum or copy the pattern from
the AppSheet docs example.

### Issue C — 🟡 ReportID race in offline mode

The deterministic ReportID `RPT-<date>-<project>` could collide if the
same superintendent creates a report on two devices offline for the same
project + day, then both sync. AppSheet's sync engine would surface a
conflict at the second device's sync. Acceptable for the foreseeable
caseload. **No fix needed unless we see real conflicts in practice.**

### Issue D — 🟡 ProjectTrades empty after production swap

After clearing `ProjectTrades` per the corrected README, the
`ReportTrades.TradeID` picker on every report will be **empty** until
Evan adds project↔trade assignments. The form will work but the picker
will show no options.

**Workaround during smoke test:** add 1–2 manual rows in `ProjectTrades`
linking each test project to a trade (e.g. PRJ-001 → TRD-001 Concrete) so
the form has something to pick. **Real assignments come later** as
trades show up on site.

### Issue E — 🟡 DailyReports_Form post-save navigation

Post-save behavior is "Go to view → Today's Report" (Detail view).
AppSheet's default "go to" lands on the just-saved row by reference,
which works for slice-based detail views in most cases. If the navigation
glitches during smoke testing (e.g. lands on the wrong row), set the
behavior to a `LINKTOROW([_THISROW], "Today's Report")` expression
instead.

---

## 6. Pre-deployment checklist (use during Steps 1–13 of the deployment guide)

After completing each AppSheet config step, verify the corresponding
test below before moving on. This catches any drift between the spec and
your actual editor settings.

### After Step 5 — Columns & formulas
- [ ] `Users.Role` is type **EnumList** (not Enum). Values: `SiteSuperintendent, ProjectManager, Director, Coordinator, Admin`.
- [ ] `DailyReports.ReportID` initial value uses TEXT(ReportDate, "YYYY-MM-DD") — not the default ISO format.
- [ ] All four `Projects` role-Ref Valid_If formulas use `IN("RoleName", [Role])`.
- [ ] All three load-bearing expressions in `01_columns_and_formulas.md` §"Key formula reference" copy-paste cleanly into the editor without red errors.

### After Step 6 — Slices
- [ ] Sign in as `sam@modeprojects.ca` — `My_Projects` slice returns 1 project (PRJ-002).
- [ ] Sign in as `john@modeprojects.ca` — `Reports_Reviewable_By_Me` returns 0 rows initially (no submitted reports yet), and once one is submitted it returns 1.
- [ ] Sign in as `evan@modeprojects.ca` — `Reports_Pending_Review` returns same as John for any submitted reports (Director branch).

### After Step 7 — Actions
- [ ] On a Draft report, tap Save & Submit → Status flips to Submitted.
- [ ] On a Submitted report, the Save & Submit button is hidden (only_if fails).
- [ ] On a Submitted report viewed by John, Mark as Reviewed appears.
- [ ] On a Submitted report viewed by Sam (the super), Mark as Reviewed does NOT appear.

### After Step 8 — Views
- [ ] Sign-in routing: Sam → Super Home, John → Manager Inbox, Mary-Ann → Manager Inbox, Evan → Director Dashboard.
- [ ] Evan can navigate to Super Home via menu (Show_If passes).
- [ ] Admin Console only shows the menu item when Evan is signed in.

### After Step 9 — Bots
- [ ] Bot 1 fires when Status moves Draft → Submitted (test by manually flipping Status).
- [ ] PDF lands in the right Drive folder, file name = `DailyReport_<code>_<date>.pdf`.
- [ ] Email arrives at all three recipients with the PDF attached.
- [ ] Bot 2 fires when Status moves Submitted → Reviewed.
- [ ] Bot 3 schedule shows "Daily at 09:00 America/Vancouver", enabled.

### After Step 10 — Security
- [ ] Trying to sign in with an email NOT in `Users` is rejected.
- [ ] Sam cannot edit a Reviewed report (form is read-only).
- [ ] Mary-Ann cannot edit anything except Status (via Mark as Reviewed action).
- [ ] Admin (Evan) can recall a Reviewed report to Draft via Action 7.

### After Step 13 — Carry-forward verification
- [ ] Create a task on day 1, submit and review the report.
- [ ] Create a new report on day 2 → task appears in "Tasks Still in Progress".
- [ ] Mark the task Completed inline → it moves to "Tasks Completed Today".
- [ ] Create a new report on day 3 → task no longer appears in "Tasks Still in Progress".

---

## 7. Sign-off

When every checkbox in §6 is ticked, the app is functionally verified.
Then proceed to Step 14 (real data swap) and the Day-4 handoff to Evan.

The smoke test was paper-only on 2026-04-30 by AI dry-run; **a live
re-run during AppSheet build is still required** because real-app
validation surfaces things paper can't (pixel layout, mobile UX, sync
timing, network errors). The §6 checklist is the live re-run.
