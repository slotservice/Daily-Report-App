# AppSheet Column Configuration & Formulas

For each table the columns are listed in **display order**. After importing the CSVs and adding the tables in AppSheet, set every column to the type / key / label / formula / valid_if / show_if / editable_if / initial-value listed below. This is the implementation-ready spec — copy-paste the formulas directly into AppSheet.

Legend: `K` = Key, `L` = Label, `H` = Hidden in form by default. Empty cells = AppSheet default.

---

## 1. `Projects`

| Column | Type | K/L/H | Initial value | Valid_If / Show_If / notes |
|---|---|---|---|---|
| ProjectID | Text | K | `"PRJ-" & TEXT(COUNT(Projects[ProjectID])+1, "000")` | Read-only after create |
| ProjectCode | Text |  |  | Required |
| ProjectName | Text | L |  | Required |
| Address | Address |  |  |  |
| StartDate | Date |  | `TODAY()` |  |
| EndDate | Date |  |  | Show_If: `ISNOTBLANK([StartDate])` |
| Active | Yes/No |  | `TRUE` |  |
| SuperintendentID | Ref → Users |  |  | Valid_If: `FILTER("Users", IN("SiteSuperintendent", [Role]))` |
| SuperintendentEmail | Email |  | `LOOKUP([SuperintendentID], "Users", "UserID", "Email")` | Editable_If: `FALSE` |
| PMID | Ref → Users |  |  | Valid_If: `FILTER("Users", IN("ProjectManager", [Role]))` |
| PMEmail | Email |  | `LOOKUP([PMID], "Users", "UserID", "Email")` | Editable_If: `FALSE` |
| DirectorID | Ref → Users |  |  | Valid_If: `FILTER("Users", IN("Director", [Role]))` |
| DirectorEmail | Email |  | `LOOKUP([DirectorID], "Users", "UserID", "Email")` | Editable_If: `FALSE` |
| CoordinatorID | Ref → Users |  |  | Valid_If: `FILTER("Users", IN("Coordinator", [Role]))` |
| CoordinatorEmail | Email |  | `LOOKUP([CoordinatorID], "Users", "UserID", "Email")` | Editable_If: `FALSE` |
| LogoFileID | Text |  |  | Drive file ID for project-specific logo override |
| Notes | LongText |  |  |  |
| **Related DailyReports** *(virtual)* | List | H | `REF_ROWS("DailyReports", "ProjectID")` |  |
| **Related Tasks** *(virtual)* | List | H | `REF_ROWS("Tasks", "ProjectID")` |  |
| **Related ProjectTrades** *(virtual)* | List | H | `REF_ROWS("ProjectTrades", "ProjectID")` |  |
| **Related ProjectPersonnel** *(virtual)* | List | H | `REF_ROWS("ProjectPersonnel", "ProjectID")` |  |

---

## 2. `Users`

| Column | Type | K/L/H | Initial value | Notes |
|---|---|---|---|---|
| UserID | Text | K | `"USR-" & TEXT(COUNT(Users[UserID])+1, "000")` |  |
| FullName | Name | L |  | Required |
| Email | Email |  |  | Required, unique. Valid_If: `NOT(IN([Email], Users[Email] - LIST([_THISROW].[Email])))` |
| Role | EnumList |  |  | Values: `SiteSuperintendent, ProjectManager, Director, Coordinator, Admin`. Base type Text. Required. **EnumList (not Enum)** so a single user can hold multiple roles — e.g. Evan Heitman is both Director (on every project) and Site Superintendent (on 2610). |
| Phone | Phone |  |  |  |
| Active | Yes/No |  | `TRUE` |  |
| CreatedAt | DateTime |  | `NOW()` | Editable_If: `FALSE` |

---

## 3. `DailyReports`

| Column | Type | K/L/H | Initial value | Valid_If / Show_If / notes |
|---|---|---|---|---|
| ReportID | Text | K | `"RPT-" & TEXT([ReportDate],"YYYY-MM-DD") & "-" & [ProjectID]` | Read-only after create |
| ProjectID | Ref → Projects |  | (passed in from view) | Required. Valid_If: `FILTER("Projects", AND([Active] = TRUE, OR(LOOKUP(USEREMAIL(),"Users","Email","Role")="Admin", USEREMAIL() = [SuperintendentEmail])))` |
| ReportDate | Date |  | `TODAY()` | Required. Valid_If: prevents duplicate same-day reports: `NOT(IN([_THIS], SELECT(DailyReports[ReportDate], AND([ProjectID] = [_THISROW].[ProjectID], [ReportID] <> [_THISROW].[ReportID]))))` |
| SuperintendentID | Ref → Users |  | `LOOKUP([ProjectID], "Projects", "ProjectID", "SuperintendentID")` | Editable_If: `FALSE` |
| PreparedByEmail | Email |  | `USEREMAIL()` | Editable_If: `FALSE` |
| WeatherTemp | Number |  |  | Required. Show as °C |
| WeatherConditions | Text |  |  | Required. Suggested values: `Sunny, Cloudy, Overcast, Light Rain, Heavy Rain, Snow, Wind, Fog` |
| WorksafeInspectionToday | Yes/No |  | `FALSE` | Required |
| SiteInspectionDoneToday | Yes/No |  | `FALSE` | Required |
| FieldLevelHazardUpToDate | Yes/No |  | `TRUE` | Required |
| NextToolboxMeeting | Date |  |  |  |
| NotableEvents | LongText |  |  |  |
| Status | Enum |  | `"Draft"` | Values: `Draft, Submitted, Reviewed`. Editable_If: see §6 lock rule |
| SubmittedAt | DateTime | H |  | Set by Save & Submit action. Editable_If: `FALSE` |
| ReviewedAt | DateTime | H |  | Set by Mark as Reviewed action. Editable_If: `FALSE` |
| ReviewedByEmail | Email | H |  | Set by Mark as Reviewed action. Editable_If: `FALSE` |
| PdfFileID | Text | H |  | Set by automation Bot 1 step 1. Editable_If: `FALSE` |
| CreatedAt | DateTime | H | `NOW()` | Editable_If: `FALSE` |
| ModifiedAt | DateTime | H | `NOW()` | App formula: `NOW()` (recomputes on every save) |
| **Related Tasks (in progress)** *(virtual)* | List | H | `SELECT(Tasks[TaskID], AND([ProjectID] = [_THISROW].[ProjectID], [Status] <> "Completed", [StartDate] <= [_THISROW].[ReportDate]))` |  |
| **Related Tasks (started today)** *(virtual)* | List | H | `SELECT(Tasks[TaskID], AND([ProjectID] = [_THISROW].[ProjectID], [StartDate] = [_THISROW].[ReportDate], [OriginReportID] = [_THISROW].[ReportID]))` |  |
| **Related Tasks (completed today)** *(virtual)* | List | H | `SELECT(Tasks[TaskID], AND([ProjectID] = [_THISROW].[ProjectID], [Status] = "Completed", [CompletedDate] = [_THISROW].[ReportDate]))` |  |
| **Related ReportTrades** *(virtual)* | List | H | `REF_ROWS("ReportTrades", "ReportID")` |  |
| **Related Equipment** *(virtual)* | List | H | `REF_ROWS("Equipment", "ReportID")` |  |
| **Related Rentals** *(virtual)* | List | H | `REF_ROWS("Rentals", "ReportID")` |  |
| **Related Visitors** *(virtual)* | List | H | `REF_ROWS("Visitors", "ReportID")` |  |
| **Related Deliveries** *(virtual)* | List | H | `REF_ROWS("Deliveries", "ReportID")` |  |
| **Related Photos** *(virtual)* | List | H | `REF_ROWS("Photos", "ReportID")` |  |
| **Related TimeEntries** *(virtual)* | List | H | `REF_ROWS("TimeEntries", "ReportID")` |  |
| **TotalHoursToday** *(virtual)* | Decimal |  | `SUM([Related TimeEntries][Hours])` |  |
| **ProjectName** *(virtual)* | Text |  | `LOOKUP([ProjectID], "Projects", "ProjectID", "ProjectName")` | Used in PDF + email subject |
| **IsLocked** *(virtual)* | Yes/No |  | `[Status] = "Reviewed"` |  |

---

## 4. `Tasks`

| Column | Type | K/L/H | Initial value | Valid_If / Show_If / notes |
|---|---|---|---|---|
| TaskID | Text | K | `"TSK-" & TEXT(COUNT(Tasks[TaskID])+1, "0000")` |  |
| ProjectID | Ref → Projects |  |  | Required |
| Description | Text | L |  | Required |
| StartDate | Date |  | `TODAY()` | Required |
| Status | Enum |  | `"In Progress"` | Values: `In Progress, Completed`. Required |
| CompletedDate | Date | H |  | Editable_If: `[Status] = "Completed"` |
| OriginReportID | Ref → DailyReports | H |  | Set when the task is created from inside a report's "Tasks Started Today" inline-add |
| CreatedByEmail | Email | H | `USEREMAIL()` | Editable_If: `FALSE` |
| CreatedAt | DateTime | H | `NOW()` | Editable_If: `FALSE` |

---

## 5. `ReportTrades`

| Column | Type | K/L/H | Initial value | Notes |
|---|---|---|---|---|
| ReportTradeID | Text | K | `"RT-" & TEXT(COUNT(ReportTrades[ReportTradeID])+1, "0000")` |  |
| ReportID | Ref → DailyReports |  |  | Required |
| TradeID | Ref → Trades |  |  | Required. Valid_If: `SELECT(ProjectTrades[TradeID], [ProjectID] = LOOKUP([_THISROW].[ReportID], "DailyReports", "ReportID", "ProjectID"))` |
| WorkerCount | Number |  | `1` | Min 1 |
| Notes | Text |  |  |  |

---

## 6. `Trades`

| Column | Type | K/L/H | Initial value | Notes |
|---|---|---|---|---|
| TradeID | Text | K | `"TRD-" & TEXT(COUNT(Trades[TradeID])+1, "000")` |  |
| TradeName | Text | L |  | Required, unique |
| CompanyName | Text |  |  |  |
| ContactName | Name |  |  |  |
| ContactEmail | Email |  |  |  |
| ContactPhone | Phone |  |  |  |
| Active | Yes/No |  | `TRUE` |  |

---

## 7. `ProjectTrades`

| Column | Type | K/L/H | Initial value | Notes |
|---|---|---|---|---|
| ProjectTradeID | Text | K | `"PT-" & TEXT(COUNT(ProjectTrades[ProjectTradeID])+1, "000")` |  |
| ProjectID | Ref → Projects |  |  | Required |
| TradeID | Ref → Trades |  |  | Required. Valid_If: `NOT(IN([_THIS], SELECT(ProjectTrades[TradeID], AND([ProjectID]=[_THISROW].[ProjectID], [ProjectTradeID]<>[_THISROW].[ProjectTradeID]))))` |
| Active | Yes/No |  | `TRUE` |  |

---

## 8. `Personnel`

| Column | Type | K/L/H | Initial value |
|---|---|---|---|
| PersonnelID | Text | K | `"PER-" & TEXT(COUNT(Personnel[PersonnelID])+1, "000")` |
| FullName | Name | L |  |
| Role | Text |  |  |
| Email | Email |  |  |
| Phone | Phone |  |  |
| Active | Yes/No |  | `TRUE` |

---

## 9. `ProjectPersonnel`

| Column | Type | K/L/H | Initial value | Notes |
|---|---|---|---|---|
| ProjectPersonnelID | Text | K | `"PP-" & TEXT(COUNT(ProjectPersonnel[ProjectPersonnelID])+1, "000")` |  |
| ProjectID | Ref → Projects |  |  | Required |
| PersonnelID | Ref → Personnel |  |  | Required. Same uniqueness Valid_If pattern as ProjectTrades |
| Active | Yes/No |  | `TRUE` |  |

---

## 10. `Equipment`

| Column | Type | K/L/H | Initial value | Notes |
|---|---|---|---|---|
| EquipmentID | Text | K | `"EQ-" & TEXT(COUNT(Equipment[EquipmentID])+1, "0000")` |  |
| ReportID | Ref → DailyReports |  |  | Required |
| EquipmentName | Text | L |  | Required |
| TradeID | Ref → Trades |  |  |  |
| Comments | Text |  |  |  |

---

## 11. `Rentals`

| Column | Type | K/L/H | Initial value | Notes |
|---|---|---|---|---|
| RentalID | Text | K | `"REN-" & TEXT(COUNT(Rentals[RentalID])+1, "0000")` |  |
| ReportID | Ref → DailyReports |  |  | Required |
| Description | Text | L |  | Required |
| PONumber | Text |  |  | Required (per spec: "Rentals (PO Number)") |
| Supplier | Text |  |  |  |
| DailyRate | Decimal |  |  |  |
| Notes | LongText |  |  |  |

---

## 12. `Visitors`

| Column | Type | K/L/H | Initial value | Notes |
|---|---|---|---|---|
| VisitorID | Text | K | `"VIS-" & TEXT(COUNT(Visitors[VisitorID])+1, "0000")` |  |
| ReportID | Ref → DailyReports |  |  | Required |
| Company | Text | L |  | Required |
| Purpose | Text |  |  | Required |
| NumPeople | Number |  | `1` |  |
| VisitTime | DateTime |  | `NOW()` |  |

---

## 13. `Deliveries`

| Column | Type | K/L/H | Initial value | Notes |
|---|---|---|---|---|
| DeliveryID | Text | K | `"DEL-" & TEXT(COUNT(Deliveries[DeliveryID])+1, "0000")` |  |
| ReportID | Ref → DailyReports |  |  | Required |
| PONumber | Text | L |  | Required |
| Supplier | Text |  |  | Required |
| Description | LongText |  |  | Required |
| ReceivedAt | DateTime |  | `NOW()` |  |

---

## 14. `Photos`

| Column | Type | K/L/H | Initial value | Notes |
|---|---|---|---|---|
| PhotoID | Text | K | `"PH-" & TEXT(COUNT(Photos[PhotoID])+1, "0000")` |  |
| ReportID | Ref → DailyReports |  |  | Required |
| Image | Image |  |  | Required. AppSheet uploads to Drive in a folder named after the app |
| Caption | Text |  |  |  |
| CapturedAt | DateTime |  | `NOW()` |  |
| UploadedByEmail | Email | H | `USEREMAIL()` | Editable_If: `FALSE` |

---

## 15. `TimeEntries`

| Column | Type | K/L/H | Initial value | Notes |
|---|---|---|---|---|
| TimeEntryID | Text | K | `"TE-" & TEXT(COUNT(TimeEntries[TimeEntryID])+1, "0000")` |  |
| ReportID | Ref → DailyReports |  |  | Required |
| PersonnelID | Ref → Personnel |  |  | Required. Valid_If: `SELECT(ProjectPersonnel[PersonnelID], [ProjectID] = LOOKUP([_THISROW].[ReportID], "DailyReports", "ReportID", "ProjectID"))` |
| Hours | Decimal |  | `8` | Required. Min 0, Max 24 |
| Notes | Text |  |  |  |

---

## Key formula reference (copy-paste targets)

These three are the load-bearing expressions. Memorise their location.

```
# Carry-forward of in-progress tasks (DailyReports virtual column)
SELECT(
  Tasks[TaskID],
  AND(
    [ProjectID] = [_THISROW].[ProjectID],
    [Status] <> "Completed",
    [StartDate] <= [_THISROW].[ReportDate]
  )
)
```

```
# Lock after review (DailyReports table-level Update_If)
AND(
  [Status] <> "Reviewed",
  OR(
    USEREMAIL() = LOOKUP([ProjectID], "Projects", "ProjectID", "SuperintendentEmail"),
    LOOKUP(USEREMAIL(), "Users", "Email", "Role") = "Admin"
  )
)
```

```
# Email recipient list for Bot 1
LOOKUP([ProjectID],"Projects","ProjectID","PMEmail") & "," &
LOOKUP([ProjectID],"Projects","ProjectID","DirectorEmail") & "," &
LOOKUP([ProjectID],"Projects","ProjectID","CoordinatorEmail")
```
