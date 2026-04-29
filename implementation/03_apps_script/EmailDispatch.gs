/**
 * EmailDispatch.gs — sends a generated PDF to PM/Director/Coordinator,
 * cc'ing the superintendent. Used by both Bot 1 (via webhook) and the
 * "Re-send Report Email" admin action.
 */

function sendReviewEmail(reportId, pdfFile) {
  const payload = buildReportPayload(reportId);
  const p = payload.project;
  if (!p) throw new Error('Project not found for report ' + reportId);

  const recipients = [p.PMEmail, p.DirectorEmail, p.CoordinatorEmail].filter(Boolean).join(',');
  const cc = p.SuperintendentEmail || '';

  const subject = `Daily Report — ${p.ProjectName} — ${formatDate_(payload.report.ReportDate)}`;
  const body = buildEmailBody_(payload);

  MailApp.sendEmail({
    to: recipients,
    cc: cc,
    subject: subject,
    body: body,
    name: CONFIG.EMAIL_FROM_NAME,
    replyTo: CONFIG.EMAIL_REPLY_TO,
    attachments: pdfFile ? [pdfFile.getAs('application/pdf')] : []
  });
}

function buildEmailBody_(payload) {
  const r = payload.report;
  const p = payload.project;
  return [
    'Hi team,',
    '',
    `Please find attached the daily site report for ${p.ProjectName} on ${formatDate_(r.ReportDate)}.`,
    '',
    `Submitted by:   ${r.PreparedByEmail}`,
    `Submitted at:   ${r.SubmittedAt ? Utilities.formatDate(new Date(r.SubmittedAt), 'America/Vancouver', 'yyyy-MM-dd HH:mm') : '—'}`,
    `Total crew hrs: ${payload.totalHours}`,
    `Status:         ${r.Status}`,
    '',
    'Open the report in the AppSheet app to review and mark it as Reviewed.',
    '',
    '— Mode Projects Daily Reports'
  ].join('\n');
}

function notifySuperintendentOnReviewed(reportId) {
  const payload = buildReportPayload(reportId);
  const p = payload.project;
  const r = payload.report;
  if (!p || !p.SuperintendentEmail) return;

  const subject = `Reviewed — ${p.ProjectName} — ${formatDate_(r.ReportDate)}`;
  const body = [
    `Your daily report for ${p.ProjectName} on ${formatDate_(r.ReportDate)} has been reviewed and marked complete by ${r.ReviewedByEmail || '—'} at ${r.ReviewedAt ? Utilities.formatDate(new Date(r.ReviewedAt), 'America/Vancouver', 'yyyy-MM-dd HH:mm') : '—'}.`,
    '',
    'This report is now locked and cannot be edited.',
    '',
    '— Mode Projects Daily Reports'
  ].join('\n');

  MailApp.sendEmail({
    to: p.SuperintendentEmail,
    subject: subject,
    body: body,
    name: CONFIG.EMAIL_FROM_NAME,
    replyTo: CONFIG.EMAIL_REPLY_TO
  });
}
