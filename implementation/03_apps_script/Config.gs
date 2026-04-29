/**
 * Config.gs — single source of truth for IDs and folders.
 *
 * Replace every "FILL_ME_IN_*" before deploying. Keep this file out of public
 * sharing because the Sheet ID and Drive folder IDs are sensitive.
 */
const CONFIG = {
  // The Google Sheet that backs the AppSheet app
  SHEET_ID: 'FILL_ME_IN_SHEET_ID',

  // The Google Doc used as the PDF template (created from
  // 04_pdf_template/DailyReportTemplate.html — see GoogleDoc_template_setup.md)
  TEMPLATE_DOC_ID: 'FILL_ME_IN_TEMPLATE_DOC_ID',

  // Drive folder under which per-project subfolders are created and PDFs land
  REPORTS_ROOT_FOLDER_ID: 'FILL_ME_IN_REPORTS_FOLDER_ID',

  // Optional brand assets — populated once Evan sends them
  BRAND_LOGO_FILE_ID: '',

  // Email defaults
  EMAIL_FROM_NAME: 'Mode Projects Daily Reports',
  EMAIL_REPLY_TO: 'evan@modeprojects.ca',

  // Sheet tab names — must match CSV filenames in 01_database_schema/
  TABS: {
    Projects:        'Projects',
    Users:           'Users',
    DailyReports:    'DailyReports',
    Tasks:           'Tasks',
    ReportTrades:    'ReportTrades',
    Trades:          'Trades',
    ProjectTrades:   'ProjectTrades',
    Personnel:       'Personnel',
    ProjectPersonnel:'ProjectPersonnel',
    Equipment:       'Equipment',
    Rentals:         'Rentals',
    Visitors:        'Visitors',
    Deliveries:      'Deliveries',
    Photos:          'Photos',
    TimeEntries:     'TimeEntries'
  }
};
