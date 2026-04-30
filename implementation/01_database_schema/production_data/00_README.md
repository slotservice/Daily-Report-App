# Production Data — real Mode Projects records

These CSVs are the **production-ready data** Evan supplied on
2026-04-30. They replace the seed rows in the parent
`01_database_schema/` folder when you reach Step 14 of the
deployment guide.

## How to apply

After Steps 1–13 of `05_deployment_guide/DEPLOYMENT_GUIDE.md` succeed
with seed data, in the master Google Sheet:

| Tab | Action |
|---|---|
| `Users` | Delete all seed rows (USR-001..USR-004 from the seed file). Paste in the 5 rows from `Users.csv` here. |
| `Projects` | Delete the seed row (PRJ-001 from the seed file). Paste in the 4 rows from `Projects.csv` here. |
| `Personnel` | Delete seed rows. Paste in the 1 row from `Personnel.csv` (Sam Dick). Add more crew as Evan supplies them. |
| `ProjectPersonnel` | Delete seed rows. Paste in the 2 rows from `ProjectPersonnel.csv` (Sam Dick on 2603 and 2510). |
| `DailyReports`, `Tasks`, `ReportTrades`, `Equipment`, `Rentals`, `Visitors`, `Deliveries`, `Photos`, `TimeEntries` | Delete every seed row — these are per-day records that Evan's team will create going forward. Leave the tab with headers only. |
| `Trades`, `ProjectTrades` | Keep the seed entries as placeholders. Per Evan's instruction (2026-04-30): "trades and crew are constantly fluctuating, I'll enter as we go. Use placeholders for testing." |

## Quick reference — who's who

| UserID | Name | Email | Roles |
|---|---|---|---|
| USR-001 | Evan Heitman | evan@modeprojects.ca | Director, SiteSuperintendent (also gets Admin) |
| USR-002 | John Hughes | john@modeprojects.ca | ProjectManager |
| USR-003 | Mary-Ann Nyal | mary-ann@modeprojects.ca | Coordinator |
| USR-004 | James McCaul | james@modeprojects.ca | SiteSuperintendent |
| USR-005 | Sam Dick | sam@modeprojects.ca | SiteSuperintendent |

| ProjectID | Code | Name | Super | PM | Director | Coord |
|---|---|---|---|---|---|---|
| PRJ-001 | 2603 | Athlone Roof Overhang | James (USR-004) | John | Evan | Mary-Ann |
| PRJ-002 | 2609 | Fourth Street Washroom | Sam (USR-005) | John | Evan | Mary-Ann |
| PRJ-003 | 2610 | Galvin Place Shop | Evan (USR-001) | John | Evan | Mary-Ann |
| PRJ-004 | 2510 | Tofino Gas Bar Upgrade | James (USR-004) | John | Evan | Mary-Ann |

## Sam Dick's dual identity

Sam appears in two tables on purpose:

- **`Users` (USR-005)** — because he signs in as Site Superintendent on
  project 2609 to submit his own daily reports.
- **`Personnel` (PER-001)** — because he is also Site Staff (crew) on
  projects 2603 and 2510, where James McCaul is the superintendent
  submitting reports and entering Sam's hours under TimeEntries.

Same email (`sam@modeprojects.ca`) keeps the two rows linked logically
even though there's no formal foreign key between them.
