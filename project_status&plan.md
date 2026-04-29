You are an expert in Google AppSheet, workflow automation, and data modeling.

I need you to design and guide the full implementation of a construction daily reporting app using Google AppSheet.

Your response must be detailed, step-by-step, and implementation-ready. Avoid high-level explanations. I need exact structure, logic, and formulas.

---

PROJECT OVERVIEW

We are building a mobile-friendly AppSheet app for site managers to capture and submit daily construction reports from phone, tablet, or desktop.

Core features:
- Daily logs
- Photo uploads
- Time tracking
- Automated PDF/email reports
- Role-based access
- Review and locking system

The app must be simple and fast for on-site use.

---

EXISTING REPORT STRUCTURE (VERY IMPORTANT)

The app must follow this report format:

- Weather conditions
- Work completed
- Tasks started
- Tasks in progress (must automatically carry forward from previous day until completed)
- Tasks completed
- Own Forces Personnel
- Trades on Site (with number of workers)
- Visitors on Site (Company + Purpose)
- Rentals on Site (PO Number)
- Equipment on Site (Trade)
- Deliveries (PO Number + Details)
- Safety checks (inspection, hazards, toolbox meeting)
- Notable events / daily summary

Task logic is critical:
Tasks started must automatically move into "in progress" and remain there until marked completed.

---

USER ROLES

- Site Superintendent → creates and submits reports
- Project Manager → receives reports and reviews
- Director → receives reports and reviews
- Coordinator → receives reports and reviews

---

WORKFLOW REQUIREMENTS

1. Form Completion
- User fills full report
- Required fields must be validated before submission
- Button: "Save & Submit"

2. On Submit
- Generate a PDF report (document-style layout)
- Automatically email the PDF to:
  - Project Manager
  - Director
  - Coordinator

3. Review System
- Report status values:
  - Draft
  - Submitted
  - Reviewed
- Add:
  - Review date
- Once marked as "Reviewed":
  - Site Superintendent must NOT be able to edit the report anymore

---

DATA STRUCTURE REQUIREMENTS

Design proper normalized tables (Google Sheets or AppSheet DB):

Must include:
- Projects
- Users (with roles and email)
- Daily Reports
- Tasks (separate table to support carry-forward logic)
- Trades
- Personnel
- Equipment
- Rentals
- Visitors
- Deliveries

Use Ref relationships where appropriate.

---

FEATURES

- Inline photo capture within report
- Multiple images per report
- Images linked to report
- Time tracking (simple daily crew hours input is sufficient)
- Offline support (AppSheet default)

---

USER INTERFACE REQUIREMENTS

- Clean and simple UI for fast field use
- Role-based views:
  - Superintendent → create/edit reports
  - Managers → dashboard + review access
- Minimal clicks, mobile optimized

---

PDF OUTPUT REQUIREMENTS

- Professional document-style PDF
- Use Montserrat font
- Structured sections matching report template
- Clean formatting for readability

---

DASHBOARD REQUIREMENTS

- List of all reports
- Status (Draft / Submitted / Reviewed)
- Review date
- Filter by project
- Easy review access for managers

---

WHAT I NEED FROM YOU

Provide a complete implementation plan including:

1. Full database schema (tables + columns)
2. Column types and exact configurations
3. AppSheet expressions and formulas
4. Task carry-forward logic implementation
5. Role-based access control setup
6. Form design structure
7. Automation setup (PDF generation + email sending)
8. Report locking logic after review
9. Dashboard design
10. Best practices for performance and scalability

---

IMPORTANT RULES

- Do NOT give vague or generic advice
- Provide exact AppSheet formulas wherever needed
- Think like a senior AppSheet architect
- Be practical and implementation-focused

---

OUTPUT FORMAT

Structure your response clearly into sections:

1. Architecture Overview
2. Tables & Schema
3. Column Configuration & Formulas
4. Business Logic (Task Carry Forward, Status, Locking)
5. Automations (PDF + Email)
6. UI / UX Design
7. Dashboard Setup
8. Deployment Steps

---

Your goal is to help me build this app correctly and efficiently from start to finish.