# Database Schema — Google Sheets

Each `.csv` in this folder corresponds to one **tab** of the master Google Sheet that backs the AppSheet app.

## Import procedure

1. Create a new Google Sheet, name it `MODE — Daily Reports DB`.
2. For each CSV file in this folder:
   - Add a tab with the same name as the CSV (without `.csv`).
   - `File → Import → Upload → CSV`, choose **Append rows to current sheet** (so headers land on row 1).
3. Freeze row 1 on every tab (`View → Freeze → 1 row`).
4. Confirm there are no merged cells, no blank columns, and that headers are exactly as shipped — AppSheet matches columns by header name.
5. In AppSheet (`appsheet.com`), `Create app → Start with existing data → Google Sheets`, point at this sheet, then add each remaining tab via `Data → Add new table`.

## Table summary

| # | Table | Key | Purpose |
|---|---|---|---|
| 1 | Projects | ProjectID | Master list of construction projects, holds the four role assignments |
| 2 | Users | UserID | All app users with role + email |
| 3 | DailyReports | ReportID | Parent record — one row per project per day |
| 4 | Tasks | TaskID | Task carry-forward backbone |
| 5 | ReportTrades | ReportTradeID | Trades on site that day with worker count |
| 6 | Trades | TradeID | Master list of trades |
| 7 | ProjectTrades | ProjectTradeID | Many-to-many: which trades are assigned to which project |
| 8 | Personnel | PersonnelID | Mode crew master list |
| 9 | ProjectPersonnel | ProjectPersonnelID | Many-to-many: which crew are assigned to which project |
| 10 | Equipment | EquipmentID | Equipment on site with trade ref + comments |
| 11 | Rentals | RentalID | Rental description + PO |
| 12 | Visitors | VisitorID | Company + purpose + headcount |
| 13 | Deliveries | DeliveryID | PO + supplier + description |
| 14 | Photos | PhotoID | Image + optional caption |
| 15 | TimeEntries | TimeEntryID | Personnel ref + hours + notes |

## Seed data

Every CSV ships with **one** seed row so the app smoke-tests immediately after import. Seed IDs use the pattern `<TBL>-001`. Replace or extend with real data after the smoke test passes.

## Conventions

- **IDs** are text, format `<TABLE>-<INCREMENTING>` (e.g. `PRJ-001`, `RPT-2026-04-30-PRJ-001`). AppSheet generates these via `INITIAL_VALUE` formulas — see `../02_appsheet_config/01_columns_and_formulas.md`.
- **Dates** are ISO `YYYY-MM-DD`. **Timestamps** are ISO `YYYY-MM-DD HH:MM:SS` UTC.
- **Booleans** are `TRUE` / `FALSE` (uppercase, no quotes).
- **Refs** are stored as the foreign-table key (text), never a formula or display string.
