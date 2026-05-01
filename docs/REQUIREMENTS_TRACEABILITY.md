# Requirements Traceability Matrix

Every requirement from the two source documents (`project_status&plan.md` and the source PDF) mapped to the file/section that implements it. Use this to prove completeness before sign-off.

Symbols: ✅ implemented · 🟡 implemented + needs client input · ⛔ explicitly out-of-scope.

---

## A. Requirements from `project_status&plan.md`

| # | Requirement | Status | Implementation location |
|---|---|---|---|
| A1 | Mobile-friendly AppSheet app, phone/tablet/desktop | ✅ | AppSheet UI is mobile-first by default. `02_appsheet_config/04_views.md` §Branding |
| A2 | Daily logs | ✅ | `01_database_schema/DailyReports.csv` + `02_appsheet_config/01_columns_and_formulas.md` §3 |
| A3 | Photo uploads | ✅ | `01_database_schema/Photos.csv` + `02_appsheet_config/01_columns_and_formulas.md` §14 + `04_views.md` Action 5 |
| A4 | Time tracking | ✅ | `01_database_schema/TimeEntries.csv` + `02_appsheet_config/01_columns_and_formulas.md` §15 |
| A5 | Automated PDF/email reports | ✅ | `02_appsheet_config/05_automations.md` Bot 1 + Apps-Script fallback in `03_apps_script/PdfGenerator.gs` + `EmailDispatch.gs` |
| A6 | Role-based access | ✅ | `02_appsheet_config/06_security.md` |
| A7 | Review and locking system | ✅ | `02_appsheet_config/03_actions.md` Action 2 + `06_security.md` lock-after-review expression |
| A8 | Weather conditions | ✅ | `DailyReports.WeatherTemp` + `WeatherConditions` |
| A9 | Work completed | ✅ | Captured via `Tasks Completed Today` virtual column |
| A10 | Tasks started | ✅ | `Tasks` table + virtual `[Related Tasks (started today)]` |
| A11 | Tasks in progress (auto carry-forward) | ✅ | `01_columns_and_formulas.md` §3 — virtual column `[Related Tasks (in progress)]` (the load-bearing SELECT). Verified in deployment guide §13 |
| A12 | Tasks completed | ✅ | `[Related Tasks (completed today)]` |
| A13 | Own Forces Personnel | ✅ | `Personnel` + `ProjectPersonnel` + `TimeEntries` (crew on site today is `[Related TimeEntries].PersonnelID`) |
| A14 | Trades on Site (with worker count) | ✅ | `Trades` + `ProjectTrades` + `ReportTrades(WorkerCount)` |
| A15 | Visitors (Company + Purpose) | ✅ | `Visitors` table |
| A16 | Rentals (PO Number) | ✅ | `Rentals` table |
| A17 | Equipment (Trade) | ✅ | `Equipment` table with `TradeID` Ref |
| A18 | Deliveries (PO + Details) | ✅ | `Deliveries` table |
| A19 | Safety checks (inspection, hazards, toolbox) | ✅ | 4 fields on DailyReports — broken out per source PDF, not collapsed |
| A20 | Notable events / daily summary | ✅ | `DailyReports.NotableEvents` |
| A21 | Roles: Site Super, PM, Director, Coordinator | ✅ | `Users.Role` Enum + `Projects` four Ref columns + role matrix in `06_security.md` |
| A22 | Form completion with required fields validated | ✅ | `Required` flags + `Valid_If` per `01_columns_and_formulas.md` |
| A23 | "Save & Submit" button | ✅ | `03_actions.md` Action 1 |
| A24 | On Submit → generate PDF (document-style) | ✅ | `04_pdf_template/DailyReportTemplate.html` + `GoogleDoc_template_setup.md` (mirrors source PDF, Montserrat) |
| A25 | On Submit → email to PM, Director, Coordinator | ✅ | `05_automations.md` Bot 1 step 1.3 |
| A26 | Status: Draft / Submitted / Reviewed | ✅ | `DailyReports.Status` Enum with those exact three values |
| A27 | Review date tracking | ✅ | `DailyReports.ReviewedAt` |
| A28 | Lock after Reviewed | ✅ | `06_security.md` lock-after-review expression |
| A29 | Tables: Projects, Users, DailyReports, Tasks, Trades, Personnel, Equipment, Rentals, Visitors, Deliveries | ✅ | All present, plus the two mandatory join tables `ProjectTrades` / `ProjectPersonnel` and the photo/time tables required by features A3/A4 |
| A30 | Use Refs where appropriate | ✅ | Every cross-table relation in `01_columns_and_formulas.md` |
| A31 | Inline photo capture | ✅ | `Photos.Image` is type `Image` — AppSheet auto-shows camera UI on mobile |
| A32 | Multiple images per report | ✅ | `Photos` is a child table of `DailyReports`; one-to-many |
| A33 | Time tracking — daily crew hours | ✅ | `TimeEntries.Hours` per personnel per report |
| A34 | Offline support | ✅ | AppSheet default — no extra config required |
| A35 | Clean, simple UI | ✅ | `04_views.md` — minimal form first, rich content via inline-add |
| A36 | Role-based views (Super → create/edit, Managers → review) | ✅ | `04_views.md` per-role decks + `App start expression` |
| A37 | Minimal clicks | ✅ | Today's Report opens directly to today's row; Save & Submit is full-width prominent |
| A38 | PDF: professional document-style | ✅ | `04_pdf_template/DailyReportTemplate.html` — boxed sections, navy header, gold accent |
| A39 | PDF: Montserrat font | ✅ | `<link>` to Google Fonts in HTML; default style in Doc template per `GoogleDoc_template_setup.md` §1 |
| A40 | PDF: structured sections matching report template | ✅ | Sections in template follow source-PDF order |
| A41 | Dashboard: list of all reports | ✅ | `04_views.md` Admin Console + Director Dashboard + Submitted History |
| A42 | Dashboard: Status (Draft / Submitted / Reviewed) | ✅ | Surfaced as a column on every list view |
| A43 | Dashboard: Review date | ✅ | `ReviewedAt` shown on all list views |
| A44 | Dashboard: filter by project | ✅ | All list views grouped by `ProjectName` |
| A45 | Dashboard: easy review access for managers | ✅ | Manager Inbox is the home view for PM/Coordinator; one tap → Mark as Reviewed |
| A46 | Best practices for performance and scalability | ✅ | Photos in Drive (not in cells); virtual columns reuse SELECT instead of LOOKUPs in loops; `_Templates` separate from data folder; security via Slices + table-level rules (defense-in-depth) |

## B. Requirements from the source PDF

| # | Field on source PDF | Status | Implementation location |
|---|---|---|---|
| B1 | Date pill on header | ✅ | Template title row |
| B2 | Project: code + name | ✅ | Template `<<ProjectCode>> — <<ProjectName>>` |
| B3 | Superintendent (auto from project) | ✅ | `DailyReports.SuperintendentID` initial value uses `LOOKUP` |
| B4 | Report Prepared by (auto from sign-in) | ✅ | `DailyReports.PreparedByEmail = USEREMAIL()` |
| B5 | Weather temperature + conditions | ✅ | Two columns rendered as one PDF field |
| B6 | Mode Team Members (pulls from project crew) | ✅ | `ProjectPersonnel` filters the picker on `TimeEntries` form |
| B7 | Trades on Site Today (pulls from project trades) | ✅ | `ProjectTrades` filters the picker on `ReportTrades` form |
| B8 | Tasks Started Today (5+ items) | ✅ | `Tasks` table — unlimited items |
| B9 | Tasks Still in Progress + Task Start Date | ✅ | Carry-forward virtual column shows StartDate per row |
| B10 | Tasks Completed Today | ✅ | Same |
| B11 | Rentals On Site (free text in PDF) | ✅ | Spec'd as table with PO# — superset of source |
| B12 | Equipment / Trade / Comments table | ✅ | `Equipment` with `TradeID` Ref + `Comments` field |
| B13 | Worksafe Inspection Today? | ✅ | `WorksafeInspectionToday` Yes/No |
| B14 | Site Inspection Done Today? | ✅ | `SiteInspectionDoneToday` Yes/No |
| B15 | Field Level Hazard Assessments Up to Date? | ✅ | `FieldLevelHazardUpToDate` Yes/No |
| B16 | Next Scheduled Toolbox Meeting (date) | ✅ | `NextToolboxMeeting` Date |
| B17 | Notable Events (free text) | ✅ | `NotableEvents` LongText |
| B18 | Mode Projects branded letterhead | 🟡 | Template has placeholder navy/gold band; logo PNG must be supplied by client per `04_pdf_template/GoogleDoc_template_setup.md` §7 |

## B-prime. Change requests applied 2026-05-01 (Evan, Freelancer chat)

| # | Request | Status | Implementation location |
|---|---|---|---|
| BR1 | Checkbox beside each "Tasks Still in Progress" row to mark complete and move it to "Tasks Completed Today" | ✅ — already built (Action 3); icon updated to `check-square` and surfaced inline as a tappable icon | `02_appsheet_config/03_actions.md` Action 3 + `04_views.md` Today's Report §5 |
| BR2 | Geo-locate the site and automatically pull weather | ✅ — implemented as project-pinned coords + Open-Meteo webhook (manual override preserved) | `Projects.Latitude/Longitude` columns, `03_apps_script/WeatherFetch.gs`, `05_automations.md` Bot 4, deployment Steps 9.5 + 9.6 |

---

## C. Outstanding client inputs

| # | Item | Owner | Where it plugs in |
|---|---|---|---|
| C1 | Brand graphics (logo PNG) | Evan | `Config.BRAND_LOGO_FILE_ID` + Doc template header |
| C2 | Real list of projects, with role assignments | Evan | Replace seed row in `Projects.csv` |
| C3 | Real list of users (Mode staff + reviewers) | Evan | Replace seed rows in `Users.csv` |
| C4 | Real list of subcontractor trades + project assignments | Evan | Replace seed rows in `Trades.csv` + `ProjectTrades.csv` |
| C5 | Confirm timezone (`America/Vancouver` assumed) | Evan | `Config.gs` + AppSheet app settings |
| C6 | Confirm whether the daily-reminder Bot 3 should be enabled | Evan | `02_appsheet_config/05_automations.md` Bot 3 |

## D. Coverage summary

- 46 requirements from the build brief: **46 implemented** (100 %).
- 18 fields from the source PDF: **17 implemented**, 1 blocked on client inputs (logo PNG — now received and bundled).
- 2 change requests applied 2026-05-01 (BR1, BR2): both implemented.
- 6 outstanding client inputs identified, none of them block the smoke test.

The implementation is feature-complete pending the four client-input items in §C.
