# Mode Projects — Daily Report App

Google AppSheet construction-daily-reporting app for Mode Projects Inc.
Client contact: Evan Heitman, Director / Superintendent · `evan@modeprojects.ca`

---

## Where to start

1. Read **[`docs/ANALYSIS.md`](docs/ANALYSIS.md)** — the gap analysis between the spec and the source PDF, and the locked design decisions.
2. Read **[`docs/REQUIREMENTS_TRACEABILITY.md`](docs/REQUIREMENTS_TRACEABILITY.md)** — every requirement mapped to the file that implements it.
3. Follow **[`implementation/05_deployment_guide/DEPLOYMENT_GUIDE.md`](implementation/05_deployment_guide/DEPLOYMENT_GUIDE.md)** — 14 steps, ~2.5 hrs end-to-end.

For a chronological log of how this implementation was built, see **[`docs/IMPLEMENTATION_LOG.md`](docs/IMPLEMENTATION_LOG.md)**.

---

## Layout

```
.
├── README.md                                        ← you are here
├── chat.md                                          ← original client correspondence (read-only, do not edit)
├── project_status&plan.md                           ← original brief (read-only, do not edit)
├── XXXX Project Name - Daily Report  Working Copy Template.pdf  ← source template (read-only)
│
├── docs/
│   ├── ANALYSIS.md                                  ← deep dive: spec ↔ source-PDF reconciliation
│   ├── REQUIREMENTS_TRACEABILITY.md                 ← coverage matrix
│   └── IMPLEMENTATION_LOG.md                        ← chronological build journal
│
└── implementation/
    ├── 01_database_schema/                          ← 15 CSVs, ready to import to Google Sheets
    ├── 02_appsheet_config/                          ← exhaustive AppSheet build spec
    │   ├── 01_columns_and_formulas.md
    │   ├── 02_slices.md
    │   ├── 03_actions.md
    │   ├── 04_views.md
    │   ├── 05_automations.md
    │   └── 06_security.md
    ├── 03_apps_script/                              ← Google Apps Script fallback (PDF + email)
    │   ├── appsscript.json
    │   ├── Config.gs
    │   ├── SheetReader.gs
    │   ├── PdfGenerator.gs
    │   └── EmailDispatch.gs
    ├── 04_pdf_template/                             ← document-style PDF, Montserrat
    │   ├── DailyReportTemplate.html
    │   └── GoogleDoc_template_setup.md
    └── 05_deployment_guide/
        └── DEPLOYMENT_GUIDE.md
```

---

## Implementation status snapshot

| Area | Status |
|---|---|
| Database schema | ✅ 15 tables, CSVs ready to import |
| AppSheet column / formula spec | ✅ Every column on every table specified |
| Slices (row-filter security) | ✅ 7 slices |
| Actions | ✅ 7 actions |
| Views | ✅ Per-role decks (Super, Manager, Director, Admin) + role-pivoted home |
| Automations | ✅ 2 active bots (Submit→PDF+email, Reviewed→notify), 1 optional (daily reminder, disabled) |
| Security & access | ✅ Per-role table rules, lock-after-review expression |
| Apps Script fallback | ✅ Full PDF generator + email dispatcher |
| PDF template | ✅ HTML reference + Doc-template setup guide. Logo placeholder pending client graphics |
| Deployment guide | ✅ 14-step procedure with smoke tests and rollback notes |
| Requirements coverage | ✅ 46/46 from brief + 17/18 from source PDF (logo blocked on client input) |

See `docs/REQUIREMENTS_TRACEABILITY.md` §C for the four small client inputs still outstanding (none of them block deployment of the smoke-test build).

---

## How this is implemented (and why no `src/` folder)

AppSheet is a no-code platform configured through a web editor, not a code-first IDE. The "implementation" is therefore three things, all of which live in this repo:

1. **Data layer** — the 15 CSVs in `implementation/01_database_schema/` are imported into a Google Sheet that backs the app.
2. **Configuration** — every column type, formula, slice, action, view, automation and security rule is documented exactly as the operator must enter it in the AppSheet editor (`implementation/02_appsheet_config/`). This is the build spec, copy-paste ready.
3. **Code** — the optional Apps Script fallback (`implementation/03_apps_script/`) and the PDF template (`implementation/04_pdf_template/`) are the only true code/templating files; the Apps Script is invoked when AppSheet's native templating language is too constrained for a given report layout.

Together these three layers fully describe the deployed AppSheet app.
