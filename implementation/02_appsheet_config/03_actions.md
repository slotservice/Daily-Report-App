# Actions

Actions are the buttons users tap. Configure each in **Behavior → Actions**.

---

## Action 1: `Save & Submit` (DailyReports)

- **Display name:** Save & Submit
- **For a record of this table:** `DailyReports`
- **Do this:** `Data: set the values of some columns in this row`
- **Set these columns:**
  - `Status` ← `"Submitted"`
  - `SubmittedAt` ← `NOW()`
- **Behavior → Only if this condition is true:**
  ```
  AND(
    [Status] = "Draft",
    ISNOTBLANK([WeatherTemp]),
    ISNOTBLANK([WeatherConditions])
  )
  ```
- **Why no `USEREMAIL() = LOOKUP(...)` check (per 2026-05-13 live-build):** The Reports_Editable_By_Me slice already filters to "user is super of the project's report, or Admin". If a user can see the report at all (via the slice that powers `Today's Report`), they already have permission to submit it. Including the LOOKUP redundantly inside the action's Only_If introduced a real bug 2026-05-13 — the `LOOKUP([ProjectID], "Projects", "ProjectID", "SuperintendentEmail")` was returning the wrong project's super (USR-003 for PRJ-002 instead of USR-005). Removing the redundant LOOKUP made the button render correctly. The slice handles the auth; the action's Only_If only validates content readiness (Draft status + weather populated).
- **Confirmation:** Yes — "Submit this report? Once submitted it will be emailed for review."
- **Prominence:** Display prominently. **AppSheet renders prominent actions at the top of detail views**, which lines up with Evan's 2026-05-11 (item 10) request that the submit button sit "at the top of the form." After form save, the super lands on `Today's Report` with the `Save & Submit` button as the very first thing they see — functionally the second of Evan's two buttons.
- **Icon:** `paper-plane`
- **Triggers:** Bot 1 (see `05_automations.md`)

## Action 2: `Mark as Reviewed` (DailyReports)

- **Display name:** Mark as Reviewed
- **For a record of this table:** `DailyReports`
- **Do this:** `Data: set the values of some columns in this row`
- **Set these columns:**
  - `Status` ← `"Reviewed"`
  - `ReviewedAt` ← `NOW()`
  - `ReviewedByEmail` ← `USEREMAIL()`
- **Only if this condition is true:**
  ```
  AND(
    [Status] = "Submitted",
    OR(
      USEREMAIL() = LOOKUP([ProjectID],"Projects","ProjectID","PMEmail"),
      USEREMAIL() = LOOKUP([ProjectID],"Projects","ProjectID","DirectorEmail"),
      USEREMAIL() = LOOKUP([ProjectID],"Projects","ProjectID","CoordinatorEmail"),
      IN("Admin", LOOKUP(USEREMAIL(),"Users","Email","Role"))
    )
  )
  ```
- **Confirmation:** Yes — "Mark this report as Reviewed? The superintendent will not be able to edit it after this."
- **Prominence:** Display prominently on the detail view for managers.
- **Icon:** `check-circle`
- **Triggers:** Bot 2 (see `05_automations.md`)
- **Verified 2026-05-14:** Evan reported (item 8 of his 2026-05-14 batch) that supers can see this button. Investigation showed the live action's `Only_If` is character-identical to the spec above and correctly excludes supers — the four `OR` branches all evaluate to FALSE for a pure-super email (no PM/Director/Coord match, no Admin role). Most likely Evan saw the button on his own screen (he holds Director+Super+Admin, so he passes via Director and Admin) and assumed supers would too. Pending: Daniel to verify via Preview-as-James (a pure super on PRJ-001/PRJ-004) that the button is in fact hidden. If hidden → respond to Evan with that confirmation; no spec change. If still visible → deeper bug, dig into prominence/slice.

## Action 3: `Mark Task Completed` (Tasks)

- **Display name:** Mark Completed
- **For a record of this table:** `Tasks`
- **Do this:** `Data: set the values of some columns in this row`
- **Set these columns:**
  - `Status` ← `"Completed"`
  - `CompletedDate` ← `TODAY()`
- **Only if this condition is true:**
  ```
  AND(
    [Status] <> "Completed",
    OR(
      USEREMAIL() = LOOKUP([ProjectID],"Projects","ProjectID","SuperintendentEmail"),
      IN("Admin", LOOKUP(USEREMAIL(),"Users","Email","Role"))
    )
  )
  ```
- **Prominence:** Inline on the Tasks Still in Progress reference list inside today's report.
- **Display style:** Display as `Icon` (not button) so it appears as a single tappable check beside each task — visually reads as a checkbox.
- **Icon:** `check-square` (an empty square with a check). On tap the row's Status flips to `"Completed"` and `CompletedDate` to `TODAY()`, which immediately moves it from "Tasks Still in Progress" to "Tasks Completed Today" via the existing virtual-column filters.
- **Behavior on tap:** No confirmation prompt — the action is one-tap-fast, and a misclick is fully recoverable by editing `Status` back to `"In Progress"` (Admin) or by the super if the report is still Draft / Submitted.

## Action 4: `Add Started Task` (DailyReports → Tasks; Action_Type: nav-add)

- **Display name:** Add Task Started Today
- **For a record of this table:** `DailyReports`
- **Do this:** `App: go to another view within this app`
- **Target:**
  ```
  LINKTOFORM(
    "Tasks_Form",
    "ProjectID", [ProjectID],
    "Description", "",
    "StartDate", [ReportDate],
    "Status", "In Progress",
    "OriginReportID", [ReportID]
  )
  ```
- **Only if this condition is true:**
  ```
  AND(
    [Status] = "Draft",
    USEREMAIL() = LOOKUP([ProjectID],"Projects","ProjectID","SuperintendentEmail")
  )
  ```
- **Prominence:** Display prominently on the report detail view.

## Action 5: `Quick Photo` (DailyReports → Photos; nav-add)

- **Display name:** Add Photo
- **For a record of this table:** `DailyReports`
- **Do this:** `App: go to another view within this app`
- **Target:**
  ```
  LINKTOFORM(
    "Photos_Form",
    "ReportID", [ReportID]
  )
  ```
- **Only if this condition is true:** `[Status] <> "Reviewed"`
- **Prominence:** Inline on the Photos section.

## Action 6: `Re-send PDF` (DailyReports — admin only)

- **Display name:** Re-send Report Email
- **For a record of this table:** `DailyReports`
- **Do this:** `External: invoke an external service` → triggers a webhook to Apps Script `EmailDispatch.gs` (used only if the AppSheet-native email path fails)
- **Only if:** `IN("Admin", LOOKUP(USEREMAIL(),"Users","Email","Role"))`
- **Prominence:** Hidden from the form; surfaced on the admin detail view only.

## Action 7: `Recall to Draft` (DailyReports — admin only)

- **Display name:** Recall to Draft
- **Set these columns:**
  - `Status` ← `"Draft"`
  - `SubmittedAt` ← `""`
  - `ReviewedAt` ← `""`
  - `ReviewedByEmail` ← `""`
- **Only if:** `IN("Admin", LOOKUP(USEREMAIL(),"Users","Email","Role"))`
- **Confirmation:** Yes — "Recalling will unlock this report and allow edits. Continue?"

## Action 8: `Mark Trade Off Site` (ReportTrades)

Per Evan 2026-05-10 (item 13). Mirrors Action 3 (Mark Task Completed) — single-tap inline check that drops the trade off the carry-forward list.

- **Display name:** Off Site
- **For a record of this table:** `ReportTrades`
- **Do this:** `Data: set the values of some columns in this row`
- **Set these columns:**
  - `Status` ← `"Off Site"`
  - `OffSiteDate` ← `TODAY()`
- **Only if this condition is true:**
  ```
  AND(
    [Status] = "On Site",
    OR(
      USEREMAIL() = LOOKUP([ProjectID],"Projects","ProjectID","SuperintendentEmail"),
      IN("Admin", LOOKUP(USEREMAIL(),"Users","Email","Role"))
    )
  )
  ```
- **Prominence:** Inline on the **Trades on Site Today** section of `Today's Report`.
- **Display style:** `Icon` (not button) — shows as a single tappable check beside each trade row, mirroring the visual language of Mark Task Completed.
- **Icon:** `check-square`
- **Behavior on tap:** No confirmation prompt — one-tap-fast, recoverable by Admin direct-edit if a misclick happens.

## Action 9: `Mark Equipment Off Site` (Equipment)

Per Evan 2026-05-10 (item 12). Identical pattern to Action 8.

- **Display name:** Off Site
- **For a record of this table:** `Equipment`
- **Do this:** `Data: set the values of some columns in this row`
- **Set these columns:**
  - `Status` ← `"Off Site"`
  - `OffSiteDate` ← `TODAY()`
- **Only if this condition is true:**
  ```
  AND(
    [Status] = "On Site",
    OR(
      USEREMAIL() = LOOKUP([ProjectID],"Projects","ProjectID","SuperintendentEmail"),
      IN("Admin", LOOKUP(USEREMAIL(),"Users","Email","Role"))
    )
  )
  ```
- **Prominence:** Inline on the **Equipment On Site Today** section of `Today's Report`.
- **Display style:** `Icon`.
- **Icon:** `check-square`
- **Behavior on tap:** No confirmation prompt.

## Action 10: `Start Today's Report` (Projects → DailyReports; nav-add)

Per Evan 2026-05-11 (item 9). Replaces the loose `LINKTOFORM(...)` CTA that previously lived on `Today's Report`. The guard's whole purpose is to make the duplicate-key error structurally impossible: when a `DailyReports` row already exists for the selected project on today's date, the button does not render.

- **Display name:** Start Today's Report
- **For a record of this table:** `Projects`
- **Do this:** `App: go to another view within this app`
- **Target:**
  ```
  LINKTOFORM(
    "DailyReports_Form",
    "ProjectID",  [ProjectID],
    "ReportDate", TODAY()
  )
  ```
- **Only if this condition is true:**
  ```
  AND(
    [Active] = TRUE,
    OR(
      USEREMAIL() = [SuperintendentEmail],
      IN("Admin", LOOKUP(USEREMAIL(),"Users","Email","Role"))
    ),
    ISBLANK(
      SELECT(
        DailyReports[ReportID],
        AND(
          [ProjectID]   = [_THISROW].[ProjectID],
          [ReportDate]  = TODAY()
        )
      )
    )
  )
  ```
  - First clause: project must be active.
  - Second clause: only the assigned super (or Admin) can start a report for the project. PMs / Director / Coordinator never see this button.
  - Third clause is the load-bearing one: `SELECT` returns the list of `ReportID`s on this project for today; `ISBLANK(list)` is `TRUE` only when the list is empty (no row yet). When a row exists, the action is hidden — the super instead sees the existing report inside `Today's Report` and can edit it directly.
- **Prominence:** Display prominently. This is the primary CTA on the `My Projects` card view inside `Super Home`. Each project card shows the action; tapping it opens the prefilled form.
- **Icon:** `plus-circle`
- **No confirmation prompt** — one tap to start.
- **Cross-ref:** `04_views.md` → `Today's Report` "Default row" note + `DailyReports_Form` Position rules. The form view itself is hidden from the menu so Action 10 is the only path that opens it.

## Action 11: `Add Trade` (DailyReports → ReportTrades; nav-add)

Per Evan 2026-05-14 (item 1). The Trades on Site Today section was missing its inline `+ Add` button in the live build — Equipment had its parallel `+ Add Equipment` action wired up but Trades did not. Action 11 fills that gap.

Mirrors Action 4 (`Add Task Started Today`) in shape: parent-table nav-add action that LINKTOFORMs to the child form with all the carry-forward columns prefilled.

- **Display name:** Add Trade
- **For a record of this table:** `DailyReports`
- **Do this:** `App: go to another view within this app`
- **Target:**
  ```
  LINKTOFORM(
    "ReportTrades_Form",
    "ReportID", [ReportID],
    "ProjectID", [ProjectID],
    "Status", "On Site",
    "OriginReportID", [ReportID]
  )
  ```
- **Only if this condition is true:**
  ```
  AND(
    [Status] <> "Reviewed",
    OR(
      USEREMAIL() = LOOKUP([ProjectID],"Projects","ProjectID","SuperintendentEmail"),
      IN("Admin", LOOKUP(USEREMAIL(),"Users","Email","Role"))
    )
  )
  ```
  - First clause: don't allow add after the report is locked (Reviewed).
  - Second clause: only the project's super (or Admin) can add trades — matches the pattern for Equipment + Task adds. Director/PM/Coordinator do not see this button; if they want to add a trade they ask the super.
- **Prominence:** Display inline on the Trades on Site Today section of `Today's Report`. Attach by setting the action's `Prominence` to `Display inline` and binding it to the inline reference column `[Related ReportTrades (still on site)]` in the Detail view editor.
- **Icon:** `plus-circle`
- **No confirmation prompt** — one tap to open the prefilled form.

## Action 12: `Mark Rental Returned` (Rentals)

Per Evan 2026-05-14 (item 7, option a). Identical pattern to Action 8 (Mark Trade Off Site) and Action 9 (Mark Equipment Off Site). Single-tap inline check that drops the rental off the carry-forward list once it has been returned to the supplier.

- **Display name:** Mark Returned
- **For a record of this table:** `Rentals`
- **Do this:** `Data: set the values of some columns in this row`
- **Set these columns:**
  - `Status` ← `"Returned"`
  - `ReturnedDate` ← `TODAY()`
- **Only if this condition is true:**
  ```
  AND(
    [Status] = "On Site",
    OR(
      USEREMAIL() = LOOKUP([ProjectID],"Projects","ProjectID","SuperintendentEmail"),
      IN("Admin", LOOKUP(USEREMAIL(),"Users","Email","Role"))
    )
  )
  ```
- **Prominence:** Inline on the **Rentals on Site Today** section of `Today's Report`. Attach to the inline reference column `[Related Rentals (still on site)]` in the Detail view editor.
- **Display style:** `Icon` (not button) — shows as a single tappable check beside each rental row, mirroring the visual language of Mark Task Completed / Mark Equipment Off Site.
- **Icon:** `check-square`
- **Behavior on tap:** No confirmation prompt — one-tap-fast, recoverable by Admin direct-edit if a misclick happens.

## Action 13: `Add Rental` (DailyReports → Rentals; nav-add)

Per Evan 2026-05-14 (item 7, option a). Parallel of Action 11 (`Add Trade`) and Action 4 (`Add Task Started Today`). Parent-table nav-add action that LINKTOFORMs to `Rentals_Form` with the carry-forward columns prefilled.

- **Display name:** Add Rental
- **For a record of this table:** `DailyReports`
- **Do this:** `App: go to another view within this app`
- **Target:**
  ```
  LINKTOFORM(
    "Rentals_Form",
    "ReportID", [ReportID],
    "ProjectID", [ProjectID],
    "Status", "On Site",
    "OriginReportID", [ReportID]
  )
  ```
- **Only if this condition is true:**
  ```
  AND(
    [Status] <> "Reviewed",
    OR(
      USEREMAIL() = LOOKUP([ProjectID],"Projects","ProjectID","SuperintendentEmail"),
      IN("Admin", LOOKUP(USEREMAIL(),"Users","Email","Role"))
    )
  )
  ```
  - First clause: don't allow add after the report is locked (Reviewed).
  - Second clause: only the project's super (or Admin) can add rentals — matches the pattern for Equipment + Trade + Task adds. Director/PM/Coordinator do not see this button; if they want to add a rental they ask the super.
- **Prominence:** Display inline on the Rentals on Site Today section of `Today's Report`. Attach by setting the action's `Prominence` to `Display inline` and binding it to the inline reference column `[Related Rentals (still on site)]` in the Detail view editor.
- **Icon:** `plus-circle`
- **No confirmation prompt** — one tap to open the prefilled form.
