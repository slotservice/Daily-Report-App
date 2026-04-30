# Slices

Slices are AppSheet's row-filter primitives. They drive both UI (which views show which rows) and security (combined with table-level rules in `06_security.md`).

Create each slice in **Data → Slices → Add new slice**.

---

## Slice 1: `Reports_Editable_By_Me`

- **Source table:** `DailyReports`
- **Row filter condition:**
  ```
  AND(
    [Status] <> "Reviewed",
    OR(
      USEREMAIL() = LOOKUP([ProjectID], "Projects", "ProjectID", "SuperintendentEmail"),
      IN("Admin", LOOKUP(USEREMAIL(), "Users", "Email", "Role"))
    )
  )
  ```
- **Slice actions:** allow `Adds`, `Updates`, `Deletes` (Deletes only for Admin via separate slice rule below)
- **Used by:** the superintendent's `Today's Report` and `My Drafts` views.

## Slice 2: `Reports_Reviewable_By_Me`

- **Source table:** `DailyReports`
- **Row filter condition:**
  ```
  AND(
    [Status] = "Submitted",
    OR(
      USEREMAIL() = LOOKUP([ProjectID], "Projects", "ProjectID", "PMEmail"),
      USEREMAIL() = LOOKUP([ProjectID], "Projects", "ProjectID", "DirectorEmail"),
      USEREMAIL() = LOOKUP([ProjectID], "Projects", "ProjectID", "CoordinatorEmail")
    )
  )
  ```
- **Slice actions:** Updates only (no Adds, no Deletes)
- **Used by:** the manager **Inbox** view.

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
- **Row filter condition:**
  ```
  AND(
    [Active] = TRUE,
    OR(
      USEREMAIL() = [SuperintendentEmail],
      USEREMAIL() = [PMEmail],
      USEREMAIL() = [DirectorEmail],
      USEREMAIL() = [CoordinatorEmail],
      IN("Admin", LOOKUP(USEREMAIL(), "Users", "Email", "Role"))
    )
  )
  ```
- **Used by:** every project picker.

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
