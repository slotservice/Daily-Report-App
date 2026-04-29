/**
 * PdfGenerator.gs — fallback PDF generator (Apps Script).
 *
 * AppSheet's built-in bot is the *primary* path for PDF + email. Use this
 * Apps-Script path only when the AppSheet template language hits a wall
 * (complex tables, conditional sections, image grids beyond AppSheet's
 * limits). It is invoked either:
 *   (a) directly from the Apps Script editor for a given ReportID, or
 *   (b) via the AppSheet "Re-send Report Email" action, which webhooks to
 *       the deployed Web App URL with { reportId, dispatchEmail: true }.
 *
 * It produces a Google Doc copy of the template, replaces all <<placeholder>>
 * tokens, populates the four child-table sections, exports as PDF, and
 * writes the PDF URL back to DailyReports.PdfFileID.
 */

/**
 * Public entry — generate a PDF for the given report ID and return its URL.
 * If dispatchEmail = true, also email it to PM/Director/Coordinator (cc super).
 */
function generateReportPdf(reportId, dispatchEmail) {
  if (!reportId) throw new Error('reportId is required');
  const payload = buildReportPayload(reportId);

  const folder = ensureProjectFolder_(payload.project);
  const docCopyId = copyTemplate_(payload, folder);
  const docCopy = DocumentApp.openById(docCopyId);
  fillTemplate_(docCopy, payload);
  docCopy.saveAndClose();

  const pdfBlob = DriveApp.getFileById(docCopyId).getAs('application/pdf');
  const fileName = buildFileName_(payload);
  pdfBlob.setName(fileName);
  const pdfFile = folder.createFile(pdfBlob);

  // Tidy up the doc copy — keep the PDF, drop the editable doc.
  DriveApp.getFileById(docCopyId).setTrashed(true);

  // Write the PDF URL back to the row so AppSheet can show it.
  writePdfUrlBack_(reportId, pdfFile.getUrl());

  if (dispatchEmail) {
    sendReviewEmail(reportId, pdfFile);
  }

  return pdfFile.getUrl();
}

function ensureProjectFolder_(project) {
  const root = DriveApp.getFolderById(CONFIG.REPORTS_ROOT_FOLDER_ID);
  const projectFolderName = (project && project.ProjectName) || 'Unknown Project';
  const it = root.getFoldersByName(projectFolderName);
  return it.hasNext() ? it.next() : root.createFolder(projectFolderName);
}

function copyTemplate_(payload, folder) {
  const tpl = DriveApp.getFileById(CONFIG.TEMPLATE_DOC_ID);
  const copyName = '_working_' + buildFileName_(payload).replace(/\.pdf$/i, '');
  return tpl.makeCopy(copyName, folder).getId();
}

function buildFileName_(payload) {
  const code = (payload.project && payload.project.ProjectCode) || 'XXXX';
  const date = formatDate_(payload.report.ReportDate);
  return `DailyReport_${code}_${date}.pdf`;
}

/**
 * Replace simple <<token>> placeholders + repopulate the named tables.
 *
 * The Doc template is expected to contain:
 *   - inline placeholders like <<ProjectName>>, <<ReportDate>>, etc.
 *   - five tables, each preceded by a heading whose text contains one of:
 *       "[[CREW_TABLE]]" "[[TRADES_TABLE]]" "[[EQUIPMENT_TABLE]]"
 *       "[[RENTALS_TABLE]]" "[[VISITORS_TABLE]]" "[[DELIVERIES_TABLE]]"
 *       "[[TASKS_STARTED_TABLE]]" "[[TASKS_INPROGRESS_TABLE]]"
 *       "[[TASKS_COMPLETED_TABLE]]" "[[PHOTOS_GRID]]"
 *     The sentinel text is stripped after the table is filled.
 *   - one row of placeholder cells that is cloned for each data row.
 * See 04_pdf_template/GoogleDoc_template_setup.md for setup details.
 */
function fillTemplate_(doc, payload) {
  const body = doc.getBody();
  const r = payload.report;
  const p = payload.project;

  const tokens = {
    'ProjectName':   p ? p.ProjectName : '',
    'ProjectCode':   p ? p.ProjectCode : '',
    'ProjectAddress': p ? p.Address : '',
    'ReportDate':    formatDate_(r.ReportDate),
    'Superintendent': payload.superintendent ? payload.superintendent.FullName : '',
    'PreparedBy':    r.PreparedByEmail,
    'WeatherTemp':   r.WeatherTemp + '°C',
    'WeatherConditions': r.WeatherConditions,
    'WorksafeInspection': boolText_(r.WorksafeInspectionToday),
    'SiteInspection':     boolText_(r.SiteInspectionDoneToday),
    'FieldLevelHazard':   boolText_(r.FieldLevelHazardUpToDate),
    'NextToolboxMeeting': formatDate_(r.NextToolboxMeeting),
    'NotableEvents': r.NotableEvents || '',
    'TotalHours':    String(payload.totalHours),
    'Status':        r.Status,
    'GeneratedAt':   Utilities.formatDate(new Date(), 'America/Vancouver', 'yyyy-MM-dd HH:mm')
  };
  Object.keys(tokens).forEach(k => body.replaceText('<<' + k + '>>', String(tokens[k] || '')));

  fillTable_(body, '[[CREW_TABLE]]',           payload.timeEntries, ['PersonnelName', 'Hours', 'Notes']);
  fillTable_(body, '[[TRADES_TABLE]]',         payload.reportTrades, ['TradeName', 'WorkerCount', 'Notes']);
  fillTable_(body, '[[TASKS_STARTED_TABLE]]',  payload.tasksStartedToday, ['Description', 'StartDate']);
  fillTable_(body, '[[TASKS_INPROGRESS_TABLE]]', payload.tasksInProgress, ['Description', 'StartDate']);
  fillTable_(body, '[[TASKS_COMPLETED_TABLE]]', payload.tasksCompletedToday, ['Description', 'CompletedDate']);
  fillTable_(body, '[[EQUIPMENT_TABLE]]',      payload.equipment, ['EquipmentName', 'TradeName', 'Comments']);
  fillTable_(body, '[[RENTALS_TABLE]]',        payload.rentals, ['Description', 'PONumber', 'Supplier']);
  fillTable_(body, '[[VISITORS_TABLE]]',       payload.visitors, ['Company', 'Purpose', 'NumPeople']);
  fillTable_(body, '[[DELIVERIES_TABLE]]',     payload.deliveries, ['PONumber', 'Supplier', 'Description']);

  fillPhotos_(body, payload.photos);
}

function fillTable_(body, sentinel, rows, columns) {
  const found = body.findText(sentinel);
  if (!found) return;
  const para = found.getElement().getParent();
  // The table immediately follows the sentinel paragraph in the template.
  let tableEl = null;
  let next = para.getNextSibling();
  while (next) {
    if (next.getType() === DocumentApp.ElementType.TABLE) { tableEl = next; break; }
    next = next.getNextSibling();
  }
  if (!tableEl) return;

  // Row 0 = header, Row 1 = template row to clone for each data row.
  if (tableEl.getNumRows() < 2) return;
  const templateRow = tableEl.getRow(1).copy();
  // Drop the original template row; we'll re-add per-data clones.
  tableEl.removeRow(1);

  if (rows.length === 0) {
    const emptyRow = templateRow.copy();
    for (let c = 0; c < emptyRow.getNumCells(); c++) emptyRow.getCell(c).setText(c === 0 ? '— none —' : '');
    tableEl.appendTableRow(emptyRow);
  } else {
    rows.forEach(r => {
      const newRow = templateRow.copy();
      for (let c = 0; c < columns.length && c < newRow.getNumCells(); c++) {
        const v = r[columns[c]];
        const text = v instanceof Date ? formatDate_(v) : (v === null || v === undefined ? '' : String(v));
        newRow.getCell(c).setText(text);
      }
      tableEl.appendTableRow(newRow);
    });
  }

  // Strip the sentinel text from the heading paragraph.
  para.replaceText(sentinel, '');
}

function fillPhotos_(body, photos) {
  const found = body.findText('\\[\\[PHOTOS_GRID\\]\\]');
  if (!found) return;
  const para = found.getElement().getParent();
  para.replaceText('\\[\\[PHOTOS_GRID\\]\\]', '');
  if (!photos || photos.length === 0) {
    para.appendText(' — no photos this day —');
    return;
  }
  photos.forEach(ph => {
    if (!ph.Image) return;
    try {
      const blob = imageBlobFromAppSheetPath_(ph.Image);
      if (!blob) return;
      const insertedPara = body.appendParagraph('');
      insertedPara.appendInlineImage(blob);
      if (ph.Caption) body.appendParagraph(ph.Caption).editAsText().setItalic(true);
    } catch (e) {
      // Skip unreadable images silently — never fail the whole PDF for one bad photo.
    }
  });
}

function imageBlobFromAppSheetPath_(path) {
  // AppSheet stores image columns as a relative path inside its Drive folder.
  // The deploy guide tells the operator to ensure the AppSheet image folder
  // is shared with the Apps Script identity. Here we resolve by file name.
  const it = DriveApp.getFilesByName(String(path).split('/').pop());
  return it.hasNext() ? it.next().getBlob() : null;
}

function boolText_(v) {
  return (v === true || String(v).toUpperCase() === 'TRUE' || v === 'Yes') ? 'Yes' : 'No';
}

function writePdfUrlBack_(reportId, url) {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  const sh = ss.getSheetByName(CONFIG.TABS.DailyReports);
  const values = sh.getDataRange().getValues();
  const headers = values[0];
  const idCol = headers.indexOf('ReportID');
  const urlCol = headers.indexOf('PdfFileID');
  if (idCol < 0 || urlCol < 0) return;
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][idCol]) === String(reportId)) {
      sh.getRange(i + 1, urlCol + 1).setValue(url);
      return;
    }
  }
}

/** Minimal Web App entry so AppSheet can webhook in. */
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const url = generateReportPdf(body.reportId, !!body.dispatchEmail);
    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, url: url }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
