# Automations (Bots)

Configure these in **Automation → Bots → New Bot**.

---

## Bot 1: `OnSubmit-PdfAndEmail`

**Trigger:**
- Event type: `Data change`
- Event source: `DailyReports`
- Update event: `Updates only`
- Condition:
  ```
  AND(
    [_THISROW_BEFORE].[Status] = "Draft",
    [_THISROW_AFTER].[Status]  = "Submitted"
  )
  ```

**Process steps:**

### Step 1.1 — `Generate PDF`
- Step type: `Create a new file`
- Table: `DailyReports`
- Template: `DailyReportTemplate` (Google Doc — see `04_pdf_template/GoogleDoc_template_setup.md`)
- File folder path:
  ```
  CONCATENATE("Mode Projects Daily Reports/", LOOKUP([ProjectID],"Projects","ProjectID","ProjectName"), "/")
  ```
- File name prefix:
  ```
  CONCATENATE("DailyReport_", LOOKUP([ProjectID],"Projects","ProjectID","ProjectCode"), "_", TEXT([ReportDate],"YYYY-MM-DD"))
  ```
- File type: `PDF`
- **Important — capture the file URL:** map the step output `[_OUTPUT_URL]` into the `DailyReports.PdfFileID` column via a downstream `Run a data action` step (Step 1.2 below).

### Step 1.2 — `Save PDF reference back to row`
- Step type: `Run a data action`
- Referenced table: `DailyReports`
- Referenced action: a new action `_setPdfFileID` whose definition is:
  - Do this: `Data: set the values of some columns in this row`
  - Set columns: `PdfFileID` ← `[_OUTPUT_URL_FROM_STEP_1_1]` (in AppSheet automation context this is `[_THISROW_BEFORE].[_OUTPUT_URL]` — see deployment guide for the exact dropdown path)

### Step 1.3 — `Email reviewers`
- Step type: `Send an email`
- To:
  ```
  CONCATENATE(
    LOOKUP([ProjectID],"Projects","ProjectID","PMEmail"), ",",
    LOOKUP([ProjectID],"Projects","ProjectID","DirectorEmail"), ",",
    LOOKUP([ProjectID],"Projects","ProjectID","CoordinatorEmail")
  )
  ```
- Cc: `LOOKUP([ProjectID],"Projects","ProjectID","SuperintendentEmail")`
- Subject:
  ```
  CONCATENATE(
    "Daily Report — ",
    LOOKUP([ProjectID],"Projects","ProjectID","ProjectName"),
    " — ",
    TEXT([ReportDate],"YYYY-MM-DD")
  )
  ```
- Email body: see Email Template below
- Attachment: the PDF from step 1.1 (toggle `Attach the file from the previous step`)

### Email body template (paste into the bot's `Email body` field)

```
Hi team,

Please find attached the daily site report for <<LOOKUP([ProjectID],"Projects","ProjectID","ProjectName")>> on <<TEXT([ReportDate],"YYYY-MM-DD")>>.

Submitted by:   <<[PreparedByEmail]>>
Submitted at:   <<TEXT([SubmittedAt],"YYYY-MM-DD HH:MM")>>
Total crew hrs: <<[TotalHoursToday]>>
Status:         Submitted (awaiting review)

Open the report in the app to review and mark it as Reviewed:
https://www.appsheet.com/start/<<APP_ID>>#view=Report Detail (Manager)&row=<<[ReportID]>>

— Mode Projects Daily Reports
```

---

## Bot 2: `OnReviewed-NotifySuperintendent`

**Trigger:**
- Event type: `Data change`
- Event source: `DailyReports`
- Update event: `Updates only`
- Condition:
  ```
  AND(
    [_THISROW_BEFORE].[Status] = "Submitted",
    [_THISROW_AFTER].[Status]  = "Reviewed"
  )
  ```

**Process steps:**

### Step 2.1 — `Notify superintendent`
- Step type: `Send an email`
- To: `LOOKUP([ProjectID],"Projects","ProjectID","SuperintendentEmail")`
- Subject:
  ```
  CONCATENATE(
    "Reviewed — ",
    LOOKUP([ProjectID],"Projects","ProjectID","ProjectName"),
    " — ",
    TEXT([ReportDate],"YYYY-MM-DD")
  )
  ```
- Body:
  ```
  Hi <<LOOKUP(LOOKUP([ProjectID],"Projects","ProjectID","SuperintendentEmail"),"Users","Email","FullName")>>,

  Your daily report for <<LOOKUP([ProjectID],"Projects","ProjectID","ProjectName")>> on <<TEXT([ReportDate],"YYYY-MM-DD")>> has been reviewed and marked complete by <<[ReviewedByEmail]>> at <<TEXT([ReviewedAt],"YYYY-MM-DD HH:MM")>>.

  This report is now locked and cannot be edited.

  — Mode Projects Daily Reports
  ```

---

## Bot 3 (optional): `Daily-Reminder-At-1700`

A nightly nudge to any superintendent who hasn't submitted a report for any of their active projects.

**Trigger:**
- Event type: `Schedule`
- Schedule: Daily at 17:00 in the project timezone
- For each row in: `Projects[My_Projects]` where `[Active] = TRUE`
- Condition:
  ```
  ISBLANK(
    SELECT(
      DailyReports[ReportID],
      AND(
        [ProjectID] = [_THISROW].[ProjectID],
        [ReportDate] = TODAY(),
        [Status] IN LIST("Submitted","Reviewed")
      )
    )
  )
  ```

**Step:** send an email to `[SuperintendentEmail]` reminding them.

> **Default deployment:** disabled. Enable only after the client confirms cadence.
