# Google Doc Template — Setup Instructions

AppSheet's `Create new file` automation step consumes a **Google Doc**, not HTML. The HTML file in this folder is the visual reference; this guide explains how to translate it into a Google Doc that AppSheet can use.

---

## 1. Create the Doc

1. Open Google Docs → blank document.
2. Page setup: Letter (8.5 × 11 in), margins 0.5 in all sides.
3. **Default font:** Montserrat. Apply via `Format → Text → Format options` and set as default style. If Montserrat is not in the dropdown, use `More fonts` to add it from Google Fonts.
4. Save the doc as **`Mode Daily Report Template`** in the same Drive folder you'll set as `REPORTS_ROOT_FOLDER_ID`.

## 2. Build the layout

Mirror the HTML reference (`DailyReportTemplate.html`):

- **Header band:** insert a 1×1 table, set background to `#1A2E45`, type `MODE PROJECTS` in 14pt bold white with letter-spacing. Below it, add the gold band `#D4B98C` with no text.
- **Title row:** `Daily Site Report` (16pt) on the left, a 1×1 table containing `Date: <<ReportDate>>` on the right.
- **Project line:** `Project: <<ProjectCode>> — <<ProjectName>>` in 11.5pt bold.

For each section that appears in the source PDF (General Info, Tasks Started Today, Tasks Still in Progress, Tasks Completed Today, Equipment, Rentals, Visitors, Deliveries, Safety, Notable Events) insert a table whose first row is a navy-bg / white-text section heading spanning all columns.

## 3. Inline placeholders

Anywhere a single value appears, paste the literal token surrounded by double angle brackets:

```
<<ProjectName>>      <<ProjectCode>>      <<ProjectAddress>>
<<ReportDate>>       <<Superintendent>>   <<PreparedBy>>
<<WeatherTemp>>      <<WeatherConditions>>
<<WorksafeInspection>>  <<SiteInspection>>
<<FieldLevelHazard>>    <<NextToolboxMeeting>>
<<NotableEvents>>    <<TotalHours>>       <<Status>>     <<GeneratedAt>>
```

> AppSheet's bot replaces these tokens automatically when the source row is the row that triggered the bot. The tokens are case-sensitive and must use double angle brackets.

## 4. Repeating tables (`Start: ` / `End: ` markers)

For each child table (Crew, Trades, Tasks Started, Tasks In Progress, Tasks Completed, Equipment, Rentals, Visitors, Deliveries) build a 2-row table:

- Row 1 = static header (e.g. `Crew Member | Hours | Notes`)
- Row 2 = a single row containing AppSheet repeat tokens of the form `<<Start: [Related TimeEntries]>><<[PersonnelID].[FullName]>> | <<[Hours]>> | <<[Notes]>><<End>>`.

Use this exact syntax. AppSheet detects the `<<Start:>> ... <<End>>` pair and clones the row for each item in the list.

The parent virtual columns to bind each table to:

| Doc table | Bind list |
|---|---|
| Crew & Hours | `[Related TimeEntries]` |
| Trades on Site Today | `[Related ReportTrades]` |
| Tasks Started Today | `[Related Tasks (started today)]` |
| Tasks Still in Progress | `[Related Tasks (in progress)]` |
| Tasks Completed Today | `[Related Tasks (completed today)]` |
| Equipment | `[Related Equipment]` |
| Rentals | `[Related Rentals]` |
| Visitors | `[Related Visitors]` |
| Deliveries | `[Related Deliveries]` |

> Each virtual column was defined in `02_appsheet_config/01_columns_and_formulas.md` §3.

## 5. Photos block

For the photos grid:

```
<<Start: [Related Photos]>>
<<[Image]>>
<<[Caption]>>
<<End>>
```

Place this inside a 2-column 1-row table to get a 2-up grid (AppSheet repeats *cells*, not just rows, when the start/end is inside a cell).

## 6. Apps-Script fallback path (alternate template syntax)

If you switch to the Apps-Script renderer (`PdfGenerator.gs`), the syntax is *different*. The script looks for sentinel strings, not AppSheet tokens:

| AppSheet syntax | Apps-Script sentinel |
|---|---|
| `<<Start: [Related TimeEntries]>>...<<End>>` | a paragraph containing `[[CREW_TABLE]]` immediately followed by a 2-row table whose row 2 will be cloned |
| `<<Start: [Related ReportTrades]>>...<<End>>` | `[[TRADES_TABLE]]` |
| `<<Start: [Related Tasks (started today)]>>...<<End>>` | `[[TASKS_STARTED_TABLE]]` |
| `<<Start: [Related Tasks (in progress)]>>...<<End>>` | `[[TASKS_INPROGRESS_TABLE]]` |
| `<<Start: [Related Tasks (completed today)]>>...<<End>>` | `[[TASKS_COMPLETED_TABLE]]` |
| `<<Start: [Related Equipment]>>...<<End>>` | `[[EQUIPMENT_TABLE]]` |
| `<<Start: [Related Rentals]>>...<<End>>` | `[[RENTALS_TABLE]]` |
| `<<Start: [Related Visitors]>>...<<End>>` | `[[VISITORS_TABLE]]` |
| `<<Start: [Related Deliveries]>>...<<End>>` | `[[DELIVERIES_TABLE]]` |
| Photos grid | `[[PHOTOS_GRID]]` |

You can keep both sets of markers in the same Doc — AppSheet ignores `[[…]]` sentinels and Apps Script ignores AppSheet's `<<…>>` syntax — but only **one** rendering path will run for any given report.

## 7. Logo swap

When Evan provides the brand graphics:
1. Upload the logo PNG to the `REPORTS_ROOT_FOLDER_ID` Drive folder.
2. In the Doc, replace the gold square placeholder with `Insert → Image → Drive → <selected logo>`.
3. Resize to ~38×38 px, anchor to the navy header table cell.
4. Optionally update `CONFIG.BRAND_LOGO_FILE_ID` in `Config.gs`.

## 8. Sanity test

After building, run **AppSheet → Bot 1 → Test** with a Submitted seed report. Confirm:

- Every `<<token>>` was replaced (no raw `<<...>>` remains in the PDF).
- Each table has at least the seed row visible.
- The PDF lands in `/Mode Projects Daily Reports/<ProjectName>/`.
- Email arrives at the three recipients with the PDF attached.
