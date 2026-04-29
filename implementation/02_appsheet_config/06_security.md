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

| Table | Adds | Updates | Deletes |
|---|---|---|---|
| Projects | `LOOKUP(USEREMAIL(),"Users","Email","Role") = "Admin"` | same | same |
| Users | `LOOKUP(USEREMAIL(),"Users","Email","Role") = "Admin"` | same | same |
| DailyReports | `LOOKUP(USEREMAIL(),"Users","Email","Role") IN LIST("SiteSuperintendent","Admin")` | see expression below | `LOOKUP(USEREMAIL(),"Users","Email","Role") = "Admin"` |
| Tasks | superintendent of project or Admin | superintendent of project or Admin | Admin only |
| ReportTrades / Equipment / Rentals / Visitors / Deliveries / Photos / TimeEntries | superintendent of parent report **AND** parent `[Status] <> "Reviewed"` | same | same |
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
      USEREMAIL() IN LIST(
        LOOKUP([ProjectID],"Projects","ProjectID","PMEmail"),
        LOOKUP([ProjectID],"Projects","ProjectID","DirectorEmail"),
        LOOKUP([ProjectID],"Projects","ProjectID","CoordinatorEmail")
      ),
      [Status] = "Submitted"
    ),
    LOOKUP(USEREMAIL(),"Users","Email","Role") = "Admin"
  )
)
```

This expression encodes the entire spec:

- Superintendents can edit Draft and Submitted reports of their own projects, but never Reviewed ones.
- PM / Director / Coordinator can update only the `Status` field (gated additionally per-action) on Submitted reports of their own projects.
- Admin can edit anything.
- Once `Status = "Reviewed"`, every non-Admin is locked out.

### Belt-and-suspenders: lock the children too

Children of a Reviewed report must also become read-only. Add this to each child table's `Update_If` and `Delete_If`:

```
LOOKUP([ReportID], "DailyReports", "ReportID", "Status") <> "Reviewed"
```

---

## Per-column edit gating (a few notable ones)

| Table.Column | `Editable_If` |
|---|---|
| DailyReports.Status | `LOOKUP(USEREMAIL(),"Users","Email","Role") = "Admin"` (otherwise Status only changes via actions) |
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
