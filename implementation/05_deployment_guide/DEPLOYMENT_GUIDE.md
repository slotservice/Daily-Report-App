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
2. Copy in the four files from `implementation/03_apps_script/`:
   - `Config.gs` — fill in `SHEET_ID`, `TEMPLATE_DOC_ID`, `REPORTS_ROOT_FOLDER_ID`.
   - `SheetReader.gs`
   - `PdfGenerator.gs`
   - `EmailDispatch.gs`
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
