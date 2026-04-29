/**
 * SheetReader.gs — thin wrapper that reads tabs of the master sheet as
 * arrays of plain-object rows keyed by header name.
 *
 * Used by PdfGenerator to assemble the report payload. AppSheet's own bot
 * does not need this — it talks to the data layer natively. This module is
 * for the Apps-Script fallback path only.
 */

function readTab_(tabName) {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  const sh = ss.getSheetByName(tabName);
  if (!sh) throw new Error('Tab not found: ' + tabName);
  const values = sh.getDataRange().getValues();
  if (values.length < 1) return [];
  const headers = values.shift().map(String);
  return values
    .filter(row => row.some(cell => cell !== '' && cell !== null))
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = row[i]; });
      return obj;
    });
}

function findOne_(tabName, keyCol, keyVal) {
  const rows = readTab_(tabName);
  return rows.find(r => String(r[keyCol]) === String(keyVal)) || null;
}

function findAll_(tabName, keyCol, keyVal) {
  const rows = readTab_(tabName);
  return rows.filter(r => String(r[keyCol]) === String(keyVal));
}

/**
 * Build the full payload for a Daily Report by ID. This object is fed into
 * the Doc template by PdfGenerator.fillTemplate_().
 */
function buildReportPayload(reportId) {
  const report = findOne_(CONFIG.TABS.DailyReports, 'ReportID', reportId);
  if (!report) throw new Error('Report not found: ' + reportId);

  const project = findOne_(CONFIG.TABS.Projects, 'ProjectID', report.ProjectID);
  const superintendent = project
    ? findOne_(CONFIG.TABS.Users, 'UserID', project.SuperintendentID)
    : null;

  // Tasks (carry-forward, started today, completed today)
  const allProjectTasks = findAll_(CONFIG.TABS.Tasks, 'ProjectID', report.ProjectID);
  const reportDate = formatDate_(report.ReportDate);
  const tasksStartedToday    = allProjectTasks.filter(t => formatDate_(t.StartDate)     === reportDate && t.OriginReportID === reportId);
  const tasksCompletedToday  = allProjectTasks.filter(t => t.Status === 'Completed' && formatDate_(t.CompletedDate) === reportDate);
  const tasksInProgress      = allProjectTasks.filter(t =>
    t.Status !== 'Completed' &&
    formatDate_(t.StartDate) <= reportDate
  );

  // Children
  const reportTrades = findAll_(CONFIG.TABS.ReportTrades, 'ReportID', reportId).map(rt => {
    const trade = findOne_(CONFIG.TABS.Trades, 'TradeID', rt.TradeID);
    return Object.assign({}, rt, { TradeName: trade ? trade.TradeName : '' });
  });
  const equipment  = findAll_(CONFIG.TABS.Equipment,  'ReportID', reportId).map(e => {
    const trade = findOne_(CONFIG.TABS.Trades, 'TradeID', e.TradeID);
    return Object.assign({}, e, { TradeName: trade ? trade.TradeName : '' });
  });
  const rentals    = findAll_(CONFIG.TABS.Rentals,    'ReportID', reportId);
  const visitors   = findAll_(CONFIG.TABS.Visitors,   'ReportID', reportId);
  const deliveries = findAll_(CONFIG.TABS.Deliveries, 'ReportID', reportId);
  const photos     = findAll_(CONFIG.TABS.Photos,     'ReportID', reportId);
  const timeEntries = findAll_(CONFIG.TABS.TimeEntries, 'ReportID', reportId).map(te => {
    const person = findOne_(CONFIG.TABS.Personnel, 'PersonnelID', te.PersonnelID);
    return Object.assign({}, te, { PersonnelName: person ? person.FullName : '' });
  });

  const totalHours = timeEntries.reduce((s, t) => s + (Number(t.Hours) || 0), 0);

  return {
    report: report,
    project: project,
    superintendent: superintendent,
    tasksStartedToday: tasksStartedToday,
    tasksInProgress: tasksInProgress,
    tasksCompletedToday: tasksCompletedToday,
    reportTrades: reportTrades,
    equipment: equipment,
    rentals: rentals,
    visitors: visitors,
    deliveries: deliveries,
    photos: photos,
    timeEntries: timeEntries,
    totalHours: totalHours
  };
}

function formatDate_(value) {
  if (!value) return '';
  if (value instanceof Date) {
    return Utilities.formatDate(value, 'America/Vancouver', 'yyyy-MM-dd');
  }
  return String(value).slice(0, 10);
}
