# Security & Access Control

Configured in **Security → Require Sign-In**, **Security → Roles**, and per-table **Are updates allowed? / Editable_If**.

---

## Sign-in

- **Require user sign-in:** ON.
- **Auth provider:** Google (Mode Projects uses Google Workspace).
- **Whitelist:** `Users[Email]` is the source of truth. Disable "anyone with link" sharing.
- **User table sync:** in `Security → Domain Authentication → User Settings`, set the user table = `Users` and key = `Email`. AppSheet will reject sign-ins for emails not in this table.

---

## Table-level update rules

Set on each table in **Data → Tables → [TableName] → Are updates allowed?**

> **Note on EnumList:** because `Users.Role` is an `EnumList`, `LOOKUP(USEREMAIL(),"Users","Email","Role")` returns a list, not a string. Always use `IN("RoleName", <list>)` rather than `<list> = "RoleName"` or `<list> IN LIST(...)`.

| Table | Adds | Updates | Deletes |
|---|---|---|---|
| Projects | `IN("Admin", LOOKUP(USEREMAIL(),"Users","Email","Role"))` | same | same |
| Users | `IN("Admin", LOOKUP(USEREMAIL(),"Users","Email","Role"))` | same | same |
| DailyReports | `OR(IN("SiteSuperintendent", LOOKUP(USEREMAIL(),"Users","Email","Role")), IN("Admin", LOOKUP(USEREMAIL(),"Users","Email","Role")))` | see expression below | `IN("Admin", LOOKUP(USEREMAIL(),"Users","Email","Role"))` |
| Tasks | superintendent of project or Admin | superintendent of project or Admin | Admin only |
| ReportTrades / Equipment | superintendent of the row's `ProjectID` (project-scoped, not report-scoped) **AND** project is `Active = TRUE` | same | same |
| Rentals / Visitors / Deliveries / Photos / TimeEntries | superintendent of parent report **AND** parent `[Status] <> "Reviewed"` | same | same |
| Trades / Personnel / ProjectTrades / ProjectPersonnel | Admin only | Admin only | Admin only |

### `DailyReports.Updates` (the lock-after-review rule — critical)

```
AND(
  [Status] <> "Reviewed",
  OR(
    AND(
      USEREMAIL() = LOOKUP([ProjectID],"Projects","ProjectID","SuperintendentEmail"),
      [Status] IN LIST("Draft","Submitted")
    ),
    AND(
      IN(USEREMAIL(), LIST(
        LOOKUP([ProjectID],"Projects","ProjectID","PMEmail"),
        LOOKUP([ProjectID],"Projects","ProjectID","DirectorEmail"),
        LOOKUP([ProjectID],"Projects","ProjectID","CoordinatorEmail")
      )),
      [Status] = "Submitted"
    ),
    IN("Admin", LOOKUP(USEREMAIL(),"Users","Email","Role"))
  )
)
```

This expression encodes the entire spec:

- Superintendents can edit Draft and Submitted reports of their own projects, but never Reviewed ones.
- PM / Director / Coordinator can update only the `Status` field (gated additionally per-action) on Submitted reports of their own projects.
- Admin can edit anything.
- Once `Status = "Reviewed"`, every non-Admin is locked out.

### Belt-and-suspenders: lock the children too

Children of a Reviewed report must also become read-only. Add this to **`Rentals`, `Visitors`, `Deliveries`, `Photos`, `TimeEntries`** `Update_If` and `Delete_If`:

```
LOOKUP([ReportID], "DailyReports", "ReportID", "Status") <> "Reviewed"
```

**`ReportTrades` and `Equipment` are EXCLUDED from this rule** as of 2026-05-10. They are project-scoped carry-forward rows (per Evan items 12 + 13) — they outlive their `ReportID`'s report. Their own `Status = "On Site" | "Off Site"` is the source of truth for "is this row still in active use." If you applied the report-status lock to them, a super editing today's report would be locked out of equipment whose original report has been Reviewed weeks ago — wrong. Use this rule for them instead:

```
LOOKUP([ProjectID], "Projects", "ProjectID", "Active") = TRUE
```

Same pattern as `Tasks` (which has always been project-scoped).

---

## Per-column edit gating (a few notable ones)

| Table.Column | `Editable_If` |
|---|---|
| DailyReports.Status | `IN("Admin", LOOKUP(USEREMAIL(),"Users","Email","Role"))` (otherwise Status only changes via actions) |
| DailyReports.SubmittedAt / ReviewedAt / ReviewedByEmail / PdfFileID | `FALSE` (system-managed) |
| Projects.SuperintendentEmail / PMEmail / DirectorEmail / CoordinatorEmail | `FALSE` (auto-derived via LOOKUP from the Ref column) |
| Tasks.CompletedDate | `[Status] = "Completed"` |

---

## Role grants (AppSheet Security → Roles)

| Role attribute | Value |
|---|---|
| Role source | `Users` table, `Role` column keyed by `Email` |
| Roles defined | `SiteSuperintendent, ProjectManager, Director, Coordinator, Admin` |
| Default role for unrecognized email | none — sign-in rejected |

The slices in `02_slices.md` already filter rows per role. The table-level rules above belt-and-suspenders prevent privilege escalation by URL hacking.

---

## Audit trail

Every table has `CreatedAt`/`ModifiedAt` system-managed columns. AppSheet additionally writes a row-level audit log to **Manage → Audit History** automatically when sign-in is required. No additional config needed.
