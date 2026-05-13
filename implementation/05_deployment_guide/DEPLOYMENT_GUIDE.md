# Deployment Guide — Mode Projects Daily Report App

End-to-end build steps, in order. Each step is small enough that you can pause between them. **Total time** for a clean run-through: ~2.5 hours.

> Pre-reqs: Google Workspace account at `modeprojects.ca` with permission to create Sheets, Docs, Drive folders, and AppSheet apps. A signed-in browser session for the Workspace admin.

---

## Step 1 — Drive folder structure

1. In Drive, create a top-level folder **`Mode Projects Daily Reports`**. Note its file ID (the part of the URL after `/folders/`).
2. Inside it create **`_Templates`** — this is where the master Doc lives.
3. Share the top-level folder with `evan@modeprojects.ca` (and any other admin) as Editor.

✓ **Outcome:** one root folder ID copied to clipboard for use in Step 9.

---

## Step 2 — Master Google Sheet

1. Create a new Google Sheet in the root folder, name it `MODE — Daily Reports DB`.
2. Delete the default `Sheet1`.
3. For each `*.csv` in `implementation/01_database_schema/` (15 files), in alphabetical order:
   - Add a new tab named exactly the filename minus `.csv`.
   - `File → Import → Upload`, choose the CSV, **Replace current sheet → Append rows**, header detection ON.
4. On every tab: `View → Freeze → 1 row`.
5. Confirm there are no merged cells, no extra empty trailing columns.

✓ **Outcome:** 15-tab Sheet, one seed row each.

---

## Step 3 — PDF template Doc

Follow `implementation/04_pdf_template/GoogleDoc_template_setup.md` end-to-end. Save the Doc as `Mode Daily Report Template` in `_Templates`.

✓ **Outcome:** Doc URL captured.

---

## Step 4 — AppSheet app, initial create

1. Go to https://www.appsheet.com → `Create → App → Start with existing data → Google Sheets`.
2. Pick the master sheet. AppSheet will pull in the first tab (Projects); rename the app to **`Mode Daily Reports`**.
3. `Data → Tables → Add new table` for each remaining tab. For each: select the tab, set "Are updates allowed?" per `02_appsheet_config/06_security.md`.

✓ **Outcome:** 15 tables in AppSheet.

---

## Step 5 — Configure columns

Open `Data → Columns` for each table and apply every row of `02_appsheet_config/01_columns_and_formulas.md`. Pay particular attention to:

- **Keys** — set the `K` column on every table.
- **Labels** — set the `L` column on every table.
- **Refs** — for every `Ref` column, the target table is named in the spec; AppSheet will offer to create the inverse virtual column — accept and rename to the names listed in the spec (e.g. `Related DailyReports`).
- **Initial values** — paste each formula exactly as written.
- **Editable_If** / **Show_If** — paste expressions exactly.

> Tip: AppSheet will warn about formula errors as you type. Fix red flags before moving on.

✓ **Outcome:** all column types/formulas applied; no red errors in the editor.

---

## Step 6 — Slices

`Data → Slices → New slice`, one per entry in `02_appsheet_config/02_slices.md`. For each slice:

- Set the source table.
- Paste the row filter expression.
- Toggle the allowed actions (Adds/Updates/Deletes) per the spec.

✓ **Outcome:** 7 slices created.

---

## Step 7 — Actions

`Behavior → Actions → New action`, one per entry in `02_appsheet_config/03_actions.md`.

- Mark prominent ones as `Display prominently` so they appear as buttons on the detail view.
- Test each action's "Only if this condition is true" by toggling rows in the seed data.

✓ **Outcome:** 7 actions wired up.

---

## Step 8 — Views

`UX → Views → New view`, one per entry in `02_appsheet_config/04_views.md`. Build in this order:

1. Forms (DailyReports_Form, Tasks_Form, Photos_Form, plus the 6 child-table forms).
2. Detail views (Today's Report, Report Detail (Manager)).
3. Tables (My Drafts, Submitted History, My Reviewed).
4. Decks (Manager Inbox, Pending Review).
5. Dashboards (Super Home, Director Dashboard, Admin Console).
6. Set the `App start expression` from §04_views.md.

✓ **Outcome:** signed-in users land on the right home view per their role.

---

## Step 9 — Bots (automation)

`Automation → Bots → New bot`, one per entry in `02_appsheet_config/05_automations.md`.

For Bot 1 specifically:
- **Step 1.1 (Create new file):** template = the Doc from Step 3, file folder path uses `LOOKUP(...)` per spec.
- **Step 1.2 (data action _setPdfFileID):** create the action in `Behavior → Actions` first, then reference it.
- **Step 1.3 (email):** paste the To/CC/Subject/Body verbatim.

Test Bot 1 by editing the seed DailyReports row's `Status` from `Draft` → `Submitted` and clicking `Sync`. Within ~30s a PDF should land in Drive and an email should hit the seed inboxes.

✓ **Outcome:** Bot 1 + Bot 2 active. Bot 3 created but disabled.

---

## Step 9.5 — Deploy WeatherFetch.gs as a web app

This step gives Bot 4 a URL to call. It depends on Step 11 (Apps Script project created), so do Step 11 first if you haven't, then come back here.

1. In the Apps Script editor, confirm `WeatherFetch.gs` is present alongside `Config.gs`, `SheetReader.gs`, `PdfGenerator.gs`, `EmailDispatch.gs`. If not, copy it in from `implementation/03_apps_script/WeatherFetch.gs`.
2. `appsscript.json` already includes the `script.external_request` OAuth scope (needed for the Open-Meteo API call) and `spreadsheets` (needed for the write-back). No edits required.
3. `Deploy → Manage deployments → Edit (pencil)` on the existing web-app deployment from Step 11 → `New version` → `Deploy`. (If you haven't deployed yet, `Deploy → New deployment → Web app`. Execute as **Me**, access **Anyone with the link**.)
4. Copy the deployment URL. It looks like `https://script.google.com/macros/s/AKfy.../exec`.
5. Paste it into `Config.gs` `WEATHER_WEBHOOK_URL` for completeness, then save.
6. Sanity test: in Apps Script, run the function `fetchAndApplyWeather('RPT-2026-04-30-PRJ-001', 'PRJ-001')` from the editor. First run will prompt for OAuth — accept. Confirm the seed DailyReports row's `WeatherTemp` and `WeatherConditions` populate in the master Sheet.

✓ **Outcome:** webhook URL captured; manual test populates weather on the seed report row.

---

## Step 9.6 — Create Bot 4 (auto-weather on report create)

`Automation → Bots → New bot`. Configure per `02_appsheet_config/05_automations.md` Bot 4:

1. Trigger: `DailyReports` adds-only, with the `ISBLANK([WeatherTemp]) AND ISBLANK([WeatherConditions])` condition.
2. Process step: `Call a webhook`. Paste the URL from Step 9.5. POST, content-type `application/json`, body:
   ```
   {
     "reportId": "<<[ReportID]>>",
     "projectId": "<<[ProjectID]>>"
   }
   ```
3. Test: as the seed superintendent, sign in to the AppSheet preview, tap **Start Today's Report** for any project (delete the existing seed RPT row first if needed), save the form. Within ~30 s, sync — `WeatherTemp` and `WeatherConditions` should appear prefilled.
4. Manual-override test: create another report; immediately type `WeatherTemp = 99` before sync settles. Confirm Bot 4 leaves the `99` alone (the "only write if blank" check in `WeatherFetch.gs` enforces this).

✓ **Outcome:** Bot 4 active. New reports prefill weather automatically.

---

## Step 10 — Security & sign-in

Apply every rule in `02_appsheet_config/06_security.md`:

1. `Security → Require Sign-In = ON`.
2. `Security → Authentication providers = Google`.
3. `Security → Domain Authentication → User Settings`: user table = `Users`, key = `Email`.
4. Define roles, then for each table set `Are updates allowed?` to the table-level expression in §06_security.md.
5. For child tables, paste the belt-and-suspenders `Update_If` referencing the parent's `Status`.

✓ **Outcome:** signing in with `super@modeprojects.ca` shows Super Home; signing in with `pm@modeprojects.ca` shows Manager Inbox.

---

## Step 11 — Apps Script fallback (optional but recommended)

1. In the master Sheet, `Extensions → Apps Script`. A blank project opens.
2. Copy in the five files from `implementation/03_apps_script/`:
   - `Config.gs` — fill in `SHEET_ID`, `TEMPLATE_DOC_ID`, `REPORTS_ROOT_FOLDER_ID`. `WEATHER_WEBHOOK_URL` is filled in later (Step 9.5) once this script is deployed.
   - `SheetReader.gs`
   - `PdfGenerator.gs`
   - `EmailDispatch.gs`
   - `WeatherFetch.gs` — auto-weather webhook (consumed by Bot 4 in Step 9.6).
   - `appsscript.json` — copy via `Project Settings → Show appsscript.json`.
3. `Deploy → New deployment → Web app`. Execute as **the deployer**, who has access **anyone**. Copy the deployment URL.
4. In AppSheet, the optional Action 6 (`Re-send Report Email`) calls this URL with `{ reportId: <ReportID>, dispatchEmail: true }`.

✓ **Outcome:** if the AppSheet bot ever fails to render a complex layout, the admin has a one-click fallback.

---

## Step 12 — Smoke test

Sign in as each of the four seed users (use Google's "Add another account") and confirm:

| Role | Expected |
|---|---|
| `super@modeprojects.ca` | Lands on Super Home. Can edit RPT-2026-04-30-PRJ-001 (Draft). Save & Submit moves it to Submitted. After PM reviews, the report becomes read-only. |
| `pm@modeprojects.ca` | Lands on Manager Inbox. Sees the submitted report. Can Mark as Reviewed. Cannot edit any other field. |
| `evan@modeprojects.ca` (Director) | Lands on Director Dashboard. Sees all submitted reports across projects. |
| `coord@modeprojects.ca` | Lands on Manager Inbox. Same powers as PM. |

After the PM marks Reviewed:
- Email lands in `super@modeprojects.ca` (Bot 2).
- The report cannot be edited by the superintendent (verify the form is read-only).
- The PDF link in `PdfFileID` opens the correct file in Drive.

✓ **Outcome:** all four roles behave per spec.

---

## Step 13 — Carry-forward verification

1. As superintendent, on the seed report, add a task `Pour slab west elevation` via `Add Task Started Today`. Save.
2. Submit the report. Have PM mark it Reviewed.
3. As superintendent, on a *different* date, create a new report for the same project. Confirm the task `Pour footings on east elevation` (seed) **and** the new task `Pour slab west elevation` both appear in `Tasks Still in Progress`.
4. Mark `Pour slab west elevation` Completed inline. Save report. Confirm next day's report no longer shows it.

✓ **Outcome:** carry-forward logic verified end-to-end.

---

## Step 14 — Go live

1. Replace seed `Users` rows with the real Mode team. Email each user a sign-in link from `Manage → Deploy → Share`.
2. Replace seed `Projects` row with real projects. Assign roles via the four Ref columns.
3. Replace seed `Trades` and `Personnel` lists.
4. Once Evan provides brand graphics, swap the logo placeholder per `04_pdf_template/GoogleDoc_template_setup.md` §7.
5. `Manage → Deploy → Deploy check` — resolve every warning before flipping to **Deployed**.
6. Set the app to **Deployed**. AppSheet will require a one-time billing setup if this is a paid plan.

✓ **Outcome:** production app live.

---

## Rollback

- Reverting to a known-good config: AppSheet keeps app versions. `Manage → Versions → Revert`.
- Reverting data: the master Sheet's `File → Version history` is the source of truth.
- Disabling the bot quickly: `Automation → Bots → Bot 1 → toggle off`. The app keeps working; emails just stop.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Bot 1 runs but no PDF arrives | Template not in shared folder | Re-share `_Templates` with the AppSheet service identity |
| `<<Token>>` literal text in PDF | Token misspelled or row-context lost | Double-check casing; tokens are case-sensitive |
| Repeating table renders only once | Missing `<<Start:>> ... <<End>>` pair | Re-add inside row 2; the START token must be the first thing in the cell |
| Carry-forward shows completed tasks | `Status` not exactly `"Completed"` | Confirm Enum values are `In Progress` and `Completed` (no whitespace) |
| Manager can't Mark as Reviewed | Email not in `Users` table | Add the row; AppSheet rejects unknown sign-ins |
| Bot 4 fires but weather stays blank | Project missing Lat/Long, OR webhook URL not pasted into the bot, OR Open-Meteo blocked by network egress | Apps Script `View → Executions` shows the error. Most common: paste the webhook URL into Bot 4 step config. Second most common: fill Lat/Long on the Projects row. |
| Bot 4 overwrites super's manual values | Should not happen — `WeatherFetch.gs` only writes when fields are blank | Verify the `if (!tempIsBlank && !condIsBlank) return ...` branch wasn't edited away in `WeatherFetch.gs` |
| Equipment / Trades not carrying forward to next day's report | New `ProjectID` or `Status` columns missing on the Sheet | Re-import `Equipment.csv` / `ReportTrades.csv` so AppSheet picks up the new headers, then `Data → Tables → Regenerate Schema` for both tables. Set `Status` Enum values to `On Site, Off Site` (no whitespace). |
| "Off Site" check-square doesn't drop the row from today's report | Action 8 / 9 `Only_If` condition false, OR virtual column hasn't refreshed | Confirm super's email is in `Projects.SuperintendentEmail` for the row's `ProjectID`. Force a sync. |
| Phantom report rows appearing at odd hours (e.g. 1 AM) | Most often it's the **builder's own test rows** that the client doesn't recognise (this is what the 2026-05-10 incident turned out to be — see `HANDOFF.md` §14 findings). Less common: auto-saved offline form replay, or a leftover time-based Apps Script trigger from testing. | Open AppSheet → Manage → Monitor → Launch log analyzer; filter by table=DailyReports, uncheck Syncs, leave Adds checked. The `By User` column tells you who in 30 s. |
| Trades / Equipment "Off Site" check visible to non-supers | Action 8 / 9 `Only_If` permits wrong role | Re-paste the `Only_If` from `03_actions.md` exactly. |

---

## Step 17 — Apply 2026-05-10 client feedback (delta from previous build)

This step is a **delta**, not a full rebuild. Skip if you're building from scratch — the changes are already in the spec docs above. Apply it if you've already deployed an earlier version of the app and need to bring it up to spec.

1. **Schema** — re-import `Equipment.csv` and `ReportTrades.csv` (now has `ProjectID`, `Status`, `OffSiteDate`, `OriginReportID` columns). `Data → Tables → Regenerate Schema` for both. For any pre-existing rows, fill `ProjectID` from `LOOKUP(ReportID, "DailyReports", "ReportID", "ProjectID")` and set `Status = "On Site"`.
2. **Deliveries.ReceivedAt** — change column type from `DateTime` to `Time`, initial value `TIMENOW()`. Update any pre-existing rows by stripping the date portion.
3. **DailyReports virtual columns** — add `[Related ReportTrades (still on site)]` and `[Related Equipment (still on site)]` per `01_columns_and_formulas.md` §3.
4. **Display names** — apply per-column `Display name` overrides for safety toggles, weather, notable events, etc. (see §3 of `01_columns_and_formulas.md`). Worksafe / Site Inspection / Field Level Hazard headings get a `?` suffix.
5. **Hide flags** — set `Show? = FALSE` on `IsLocked`. Set `Show? = IN("Admin", LOOKUP(...))` on `ReportID` and `Status`. Hide `EquipmentID`, `ReportTradeID`, `DeliveryID` from forms.
6. **Detail view layout** — pin the section order per `04_views.md` `Today's Report`. Project Name first; Notable Events last (right before Save & Submit). Equipment + Trades sections bind to the new "still on site" virtual columns.
7. **Actions 8 + 9** — create `Mark Trade Off Site` (on `ReportTrades`) and `Mark Equipment Off Site` (on `Equipment`) per `03_actions.md`.
8. **PDF template** — update the binding of the Trades and Equipment tables to point at `[Related ReportTrades (still on site)]` and `[Related Equipment (still on site)]` per `04_pdf_template/GoogleDoc_template_setup.md` §4.
9. **Form auto-save** — confirm `DailyReports_Form` requires explicit Save tap (not auto-commit on field blur). Mitigates the ghost-report incident.
10. **Smoke test** — open today's report on PRJ-001 as James, mark a trade Off Site → confirm it disappears from the list. Open tomorrow's report → confirm the remaining trades appear.

---

## Step 18 — Apply 2026-05-11 client feedback (second delta)

Same pattern as Step 17: a delta, not a rebuild. Apply on top of Step 17. Scope = Evan's 2026-05-11 email + screenshot ("8-item list + can't save + two-button request").

**Pre-flight (must happen before any of the AppSheet edits below):**

- Open the AppSheet editor for `Mode Daily Reports`. Look at the top-right of the editor toolbar. **If a `Save` button is highlighted (unsaved changes from a prior session), click it first.** Every change made in the editor preview lives in the editor's draft state until you click that top-right Save — and only then does it push to live users. This is the single most likely reason the 2026-05-10 fixes weren't visible to Evan when he tested on 2026-05-11.

**Data cleanup (do this in the master Sheet before retesting save):**

1. Open `MODE — Daily Reports DB` → `DailyReports` tab. Filter `ReportID` for any row with `2026-05-11` in it (the row that caused the duplicate-key error). Delete that row. Repeat for any other test rows for today on PRJ-001 that aren't intentional data.

**AppSheet edits (apply in this order — each step references the spec doc that now contains the canonical config):**

2. **`DailyReports_Form` is system-generated** and therefore not in the main menu by default. Verified in editor 2026-05-11 — system-generated views have no `Position` selector. The auto-`+` button on `Reports_Editable_By_Me` is the real entry path Evan used. To close it: `Data → Slices → Reports_Editable_By_Me → Adds allowed = OFF` AFTER Action 10 (step 3) is live. Do not flip this before Action 10 exists or no one can create new reports.
3. **Create Action 10 `Start Today's Report`** on the `Projects` table per `03_actions.md` Action 10. After Action 10 exists, place it as the prominent action on the `My Projects` card view inside `Super Home` (`UX → Views → My Projects → Behavior → Card actions`). Then return to step 2 and disable adds on the slice.
4. **Form save-button label:** AppSheet does not allow renaming the form's Save button per-view (verified 2026-05-11). Communicate to Evan in the reply that the form's `Save` button creates the draft, and the post-save detail view shows the `Save & Submit` action — functionally his two-button flow.
5. **Project Name first, Notable Events last (in the create form).** `UX → Views → DailyReports_Form → View Options → Column order`. Drag `ProjectID` (which renders as "Project Name") to position 1. Drag `NotableEvents` to the last position. Save the view.
6. **Project Name first, Notable Events last (in the detail view).** Same operation on `UX → Views → Today's Report → View Options → Column order`. Pin section order per `04_views.md` `Today's Report` section.
7. **Hide ReportID, Status, IsLocked everywhere they show in the supers' view.** Re-verify the `Show?` formulas on `DailyReports.ReportID`, `DailyReports.Status`, `DailyReports.IsLocked` per `01_columns_and_formulas.md` §3. Then on `UX → Views → Today's Report → View Options → Column order`, explicitly remove `ReportID`, `Status`, `IsLocked`, `ProjectName` (virtual), `TotalHoursToday`, `DisplayName`, `Related ReportTrades By OriginReportID`, `Related Equipments By OriginReportID` from the visible column list. Column-level `Show?` rules apply, but the detail view's column-order list also has to not include them.
8. **Add `Tasks Started Today` + `Tasks Completed Today` sections to the detail view.** `UX → Views → Today's Report → View Options → Column order`. The columns `Related Tasks (started today)` and `Related Tasks (completed today)` should be present in the order list (positions per `04_views.md` Today's Report sections 4 + 6). Toggle "Show empty group = ON" on both — they must render even with zero rows so the super sees the section exists.
9. **Rename inline section headings.**
   - `Data → Columns → DailyReports → Related Rentals → Display name = Rentals on Site Today`.
   - `Data → Columns → DailyReports → Related Visitors → Display name = Visitors on Site Today`.
   - `Data → Columns → DailyReports → Related Deliveries → Display name = Deliveries` (was `Delivery`).
10. **Hide TimeEntries + Photos sections on the detail view.**
    - `Data → Columns → DailyReports → Related TimeEntries → Show? = FALSE`.
    - `Data → Columns → DailyReports → Related Photos → Show? = FALSE`.
    - These hide only the on-screen sections. PDF + email logic still depend on the underlying tables, so do not delete columns or tables.
11. **Save & publish.** Top-right `Save` in the AppSheet editor. Confirm the green "App is up to date" indicator before moving on. **This step is the difference between editor-draft and live; do not skip it.**

**Verification (sign in as James to a clean browser profile, not the editor preview):**

12. Land on `Super Home`. Confirm `My Projects` shows two project cards (PRJ-001, PRJ-004), each with a `Start Today's Report` button.
13. Tap `Start Today's Report` on PRJ-001. Form opens. Confirm: Project Name = "Athlone Roof Overhang" at the very top; safety toggles next; Notable Events at the bottom; one `Save Draft` button at the bottom.
14. Tap `Save Draft` with safety toggles at their defaults. Form should commit. Confirm you land on `Today's Report` (detail view) with no errors.
15. On the detail view, confirm Report ID is not visible; status bar is not visible; sections in this order: General Info / Trades on Site Today / Tasks Started Today / Tasks Still in Progress / Tasks Completed Today / Equipment on Site Today / Rentals on Site Today / Visitors on Site Today / Deliveries / Safety / Notable Events / Save & Submit button.
16. Tap `Start Today's Report` on PRJ-001 a SECOND time. The button should not render — the row now exists for today, the `Only_If` evaluates `FALSE`, and the duplicate-key path is structurally closed.
17. Tap `Save & Submit`. Confirm row Status flips to Submitted in the Sheet within one sync cycle.

✓ **Outcome:** Evan's 8 cosmetic items + the save blocker + the two-button request all resolved. Verified end-to-end as a real super, not in editor preview.

---

## Step 19 — Apply 2026-05-13 live-build delta (slice filters + column-level hides + Save & Submit simplification)

A third delta. Discovered during the 2026-05-13 live test as Sam that the previous Step 17/18 build had several config gaps that weren't surfaced in any earlier smoke test. This step captures every fix applied 2026-05-13 — copy each to a fresh build or apply selectively if you've already done Steps 17 + 18.

**Pre-flight:** the three slice filters and the column-level `Show?` formulas in this step were ALL empty in Daniel's live app even though the spec specified them in §02_slices.md, §01_columns_and_formulas.md, etc. Treat "spec says X" as "spec WANTS X" — verify the live app actually has it, don't assume.

1. **Three slice filters** (`Data → Slices`). All three were empty in live; set them now:
   - `My_Projects` row filter: `OR(USEREMAIL() = [SuperintendentEmail], IN("Admin", LOOKUP(USEREMAIL(),"Users","Email","Role")))`. Update mode: Read-Only.
   - `Reports_Editable_By_Me` row filter: `AND([Status] = "Draft", OR(USEREMAIL() = LOOKUP([ProjectID],"Projects","ProjectID","SuperintendentEmail"), IN("Admin", LOOKUP(USEREMAIL(),"Users","Email","Role"))))`. Update mode: Updates ON, Adds ON, Deletes OFF.
   - `Reports_Reviewable_By_Me` row filter: `AND([Status] = "Submitted", OR(USEREMAIL() = LOOKUP([ProjectID],"Projects","ProjectID","PMEmail"), USEREMAIL() = LOOKUP([ProjectID],"Projects","ProjectID","CoordinatorEmail"), USEREMAIL() = LOOKUP([ProjectID],"Projects","ProjectID","DirectorEmail"), IN("Admin", LOOKUP(USEREMAIL(),"Users","Email","Role"))))`. Update mode: Updates ON, Adds OFF, Deletes OFF.
2. **`DailyReports_Form` column order** (`UX → Views → DailyReports_Form → View Options → Column order → Manual`): drag `NotableEvents` to the very last position. Confirm `ProjectID` stays at position 1.
3. **Column-level `Show?` formulas** on `DailyReports` columns (`Data → Columns → DailyReports`, pencil each):

   **Group A — always hidden (`Show?` = `FALSE`):** `TotalHoursToday`, `DisplayName`, `ProjectName` (virtual), `IsLocked`, `Related Tasks` (no qualifier — generic audit list), `Related ReportTrades` (generic audit), `Related Equipments` (generic audit), `Related Equipments By OriginReportID`, `Related ReportTrades By OriginReportID`.

   **Group B — Admin only (`Show?` = `IN("Admin", LOOKUP(USEREMAIL(),"Users","Email","Role"))`):** `ReportID`, `Status`.

   **Group C — Detail view only (`Show?` = `CONTEXT("ViewType") = "Detail"`):** `SuperintendentID`, `PreparedByEmail`, `Related Tasks (in progress)`, `Related Tasks (started today)`, `Related Tasks (completed today)`, `Related Deliveries`, `Related Rentals`, `Related Visitors`, `Related Equipment (still on site)`, `Related ReportTrades (still on site)`.

4. **`ReportID` type guard.** When pasting the Group B formula on `ReportID`, AppSheet's UI sometimes auto-flips the Type dropdown to `Yes/No`. Confirm Type is `Text` before clicking Done. If wrong, set back to `Text` and confirm Initial value is `"RPT-" & TEXT([ReportDate],"YYYY-MM-DD") & "-" & [ProjectID]`.
5. **`ProjectID` Show? guard.** If the column has `ISBLANK([_THIS])` in its Show? field, clear it (X button next to the formula). Otherwise Project Name disappears from the top of the form when prefilled via `LINKTOFORM`. Show? should be left as default (always show).
6. **`Manager Inbox` Show If** (`UX → Views → Manager Inbox → Display → Show if`):
   ```
   OR(IN("ProjectManager", LOOKUP(USEREMAIL(),"Users","Email","Role")), IN("Coordinator", LOOKUP(USEREMAIL(),"Users","Email","Role")), IN("Director", LOOKUP(USEREMAIL(),"Users","Email","Role")), IN("Admin", LOOKUP(USEREMAIL(),"Users","Email","Role")))
   ```
7. **`My Projects` Card view layout** (`UX → Views → My Projects`): set View type to `card` (not `gallery`), Layout = `list` (not `large`). In the layout's interactive demo, click `ACTION 1` text and select `Start Today's Report` from the dropdown. Leave Action 2 as default (`View Ref (CoordinatorID)`).
8. **Action 10 `Start Today's Report`** on `Projects` table (`Behavior → Actions → New action`) — see `03_actions.md` Action 10 for full spec. Critical: `Only_If` must include the `ISBLANK(SELECT(DailyReports[ReportID], ...))` guard to prevent the duplicate-key error on a second tap.
9. **Simplify `Save & Submit` Only_If.** Original spec had `USEREMAIL() = LOOKUP([ProjectID],"Projects","ProjectID","SuperintendentEmail")` inside the AND. In live testing 2026-05-13 this LOOKUP was returning the wrong project's super (USR-003 for PRJ-002 instead of USR-005), making the Only_If evaluate FALSE and hiding the button entirely. Replace the Only_If with:
   ```
   AND([Status] = "Draft", ISNOTBLANK([WeatherTemp]), ISNOTBLANK([WeatherConditions]))
   ```
   The auth check is redundant because the `Reports_Editable_By_Me` slice already filters to "user is super of the project, or Admin." See `03_actions.md` Action 1 for the full reasoning.
10. **Verification — sign in as a SiteSuperintendent in editor preview** (`Preview app as` field, bottom-right of preview pane). Use a super who is actually assigned to a project — check the `Projects` sheet's `SuperintendentID` column to find one. James (`james@modeprojects.ca`) was NOT assigned to any project in the live data as of 2026-05-13; Sam (`sam@modeprojects.ca`) was. Walk through:
    - Lands on `Super Home` ✓
    - `My Projects` shows ONLY their project(s) ✓
    - `Start Today's Report` button visible on each card ✓
    - Tap it — form opens with Project Name first, Notable Events last ✓
    - Save form — no duplicate-key error, lands on `Today's Report` detail view ✓
    - Detail view: no ReportID, no Status bar, no IsLocked, no Time/Photos sections, all section headings renamed correctly, `Save & Submit` button at top ✓
    - Tap `Save & Submit` (with weather populated) — confirmation, then row status flips to Submitted ✓
    - Re-tap `Start Today's Report` on the same project — button is now hidden (row exists for today) ✓
    - Try to reach Manager Inbox via menu — not present (Show If filters them out) ✓

✓ **Outcome:** all of Evan's 2026-05-11 items resolved + slice-filter security + form/detail polish. The known remaining anomalies (Superintendent LOOKUP returning wrong row, `Related ReportTrades (still on site)` rendering inconsistently, `Recall to Draft 2` duplicate action, `Draff` typo on seed row) are tracked in the post-2026-05-13 punch list and don't block client testing.
