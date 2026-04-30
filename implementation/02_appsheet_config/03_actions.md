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
    USEREMAIL() = LOOKUP([ProjectID],"Projects","ProjectID","SuperintendentEmail"),
    ISNOTBLANK([WeatherTemp]),
    ISNOTBLANK([WeatherConditions])
  )
  ```
- **Confirmation:** Yes — "Submit this report? Once submitted it will be emailed for review."
- **Prominence:** Display prominently
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
