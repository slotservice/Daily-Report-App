# Slices

Slices are AppSheet's row-filter primitives. They drive both UI (which views show which rows) and security (combined with table-level rules in `06_security.md`).

Create each slice in **Data → Slices → Add new slice**.

---

## Slice 1: `Reports_Editable_By_Me`

- **Source table:** `DailyReports`
- **Row filter condition (live as of 2026-05-13):**
  ```
  AND(
    [Status] = "Draft",
    OR(
      USEREMAIL() = LOOKUP([ProjectID], "Projects", "ProjectID", "SuperintendentEmail"),
      IN("Admin", LOOKUP(USEREMAIL(), "Users", "Email", "Role"))
    )
  )
  ```
- **Why `= "Draft"` instead of `<> "Reviewed"`:** Original spec allowed any non-Reviewed report into this slice, including Submitted. That meant a super could keep editing a Submitted report. 2026-05-13 tightened to `= "Draft"` only — once a super taps Save & Submit and the report becomes Submitted, it leaves this slice. The super can no longer edit it without an Admin recall.
- **Slice actions (live):** `Updates` ON, `Adds` ON, `Deletes` OFF (Read-Only not selected).
- **Used by:** the superintendent's `Today's Report` and `My Drafts` views.

## Slice 2: `Reports_Reviewable_By_Me`

- **Source table:** `DailyReports`
- **Row filter condition (live as of 2026-05-13):**
  ```
  AND(
    [Status] = "Submitted",
    OR(
      USEREMAIL() = LOOKUP([ProjectID], "Projects", "ProjectID", "PMEmail"),
      USEREMAIL() = LOOKUP([ProjectID], "Projects", "ProjectID", "CoordinatorEmail"),
      USEREMAIL() = LOOKUP([ProjectID], "Projects", "ProjectID", "DirectorEmail"),
      IN("Admin", LOOKUP(USEREMAIL(), "Users", "Email", "Role"))
    )
  )
  ```
- **Why Admin added 2026-05-13:** Original spec excluded Admin from this slice. That left Admins blind to submitted reports unless they navigated through the Director Dashboard. Adding Admin matches the principle "Admin sees everything everywhere."
- **Slice actions (live):** `Updates` ON (managers need it for the `Mark as Reviewed` action), `Adds` OFF, `Deletes` OFF, `Read-Only` NOT selected.
- **Used by:** the manager **Inbox** view (`Manager Inbox`, gated by Show If = manager-or-admin roles per `04_views.md`).

## Slice 3: `Reports_Visible_To_Me`

- **Source table:** `DailyReports`
- **Row filter condition:**
  ```
  OR(
    USEREMAIL() = LOOKUP([ProjectID], "Projects", "ProjectID", "SuperintendentEmail"),
    USEREMAIL() = LOOKUP([ProjectID], "Projects", "ProjectID", "PMEmail"),
    USEREMAIL() = LOOKUP([ProjectID], "Projects", "ProjectID", "DirectorEmail"),
    USEREMAIL() = LOOKUP([ProjectID], "Projects", "ProjectID", "CoordinatorEmail"),
    IN("Admin", LOOKUP(USEREMAIL(), "Users", "Email", "Role"))
  )
  ```
- **Slice actions:** Reads only
- **Used by:** the **All Reports** dashboard.

## Slice 4: `Tasks_InProgress_For_Project`

- **Source table:** `Tasks`
- **Row filter condition:**
  ```
  [Status] <> "Completed"
  ```
- **Used by:** inline reference list inside the daily report form labelled "Tasks Still in Progress".

## Slice 5: `Tasks_Started_Today`

- **Source table:** `Tasks`
- **Row filter condition:**
  ```
  [StartDate] = TODAY()
  ```
- **Used by:** quick-glance card on the superintendent home view.

## Slice 6: `My_Projects`

- **Source table:** `Projects`
- **Row filter condition (live as of 2026-05-13):**
  ```
  OR(
    USEREMAIL() = [SuperintendentEmail],
    IN("Admin", LOOKUP(USEREMAIL(), "Users", "Email", "Role"))
  )
  ```
- **Why simpler than original spec:** This slice powers the `My Projects` card view embedded in `Super Home`, which is only rendered to SiteSuperintendents (per Super Home's `Show if`). Managers reach reports through `Manager Inbox` directly, not through a project picker. So the slice only needs to admit supers + Admin. Dropping the PM/Director/Coordinator branches keeps the filter intent crisp.
- **Slice actions (live):** `Read-Only` (Updates / Adds / Deletes all OFF). Projects are administered separately by Admin; supers never create projects from the app.
- **Used by:** the `My Projects` card view inside `Super Home`. The cards show project name + project code + a prominent `Start Today's Report` action (Action 10 in `03_actions.md`).

## Slice 7: `Reports_Pending_Review` (Director-only firehose)

- **Source table:** `DailyReports`
- **Row filter condition:**
  ```
  AND(
    [Status] = "Submitted",
    OR(
      IN("Director", LOOKUP(USEREMAIL(), "Users", "Email", "Role")),
      IN("Admin", LOOKUP(USEREMAIL(), "Users", "Email", "Role"))
    )
  )
  ```
- **Used by:** Director's cross-project review dashboard.
