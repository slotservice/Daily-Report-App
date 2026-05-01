/**
 * WeatherFetch.gs — auto-fill WeatherTemp + WeatherConditions on a new
 * DailyReports row from the project's Latitude / Longitude using the
 * Open-Meteo public API (https://open-meteo.com — no API key, free for
 * non-commercial low-volume use, ~10 km grid resolution).
 *
 * Trigger: AppSheet Bot 4 calls doPost() via the webhook URL stored in
 * CONFIG.WEATHER_WEBHOOK_URL (set after deployment as a web app).
 *
 * Payload (POST JSON body from AppSheet):
 *   { "reportId": "RPT-2026-05-01-PRJ-002", "projectId": "PRJ-002" }
 *
 * Behavior:
 *   1. Looks up the project's Latitude/Longitude from the Projects sheet.
 *   2. Calls Open-Meteo for current temperature + WMO weather code.
 *   3. Maps the WMO code to one of the WeatherConditions enum values.
 *   4. Writes WeatherTemp + WeatherConditions back to the DailyReports
 *      row IF and ONLY IF those fields are still blank (so a manual
 *      edit by the super always wins the race).
 *
 * Manual override invariant:
 *   The "only write if blank" check is what allows the super to type
 *   their own values offline / on a slow connection without us
 *   stomping on them when sync eventually fires the bot.
 */

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    const reportId = body.reportId;
    const projectId = body.projectId;

    if (!reportId || !projectId) {
      return jsonResponse_({ ok: false, error: 'reportId and projectId required' });
    }

    const result = fetchAndApplyWeather(reportId, projectId);
    return jsonResponse_(result);
  } catch (err) {
    console.error('WeatherFetch doPost failed:', err);
    return jsonResponse_({ ok: false, error: String(err) });
  }
}

function fetchAndApplyWeather(reportId, projectId) {
  const project = readProjectRow_(projectId);
  if (!project) return { ok: false, error: 'Project not found: ' + projectId };

  const lat = parseFloat(project.Latitude);
  const lon = parseFloat(project.Longitude);
  if (!isFinite(lat) || !isFinite(lon)) {
    return { ok: false, error: 'Project ' + projectId + ' missing Latitude/Longitude' };
  }

  const weather = fetchOpenMeteoCurrent_(lat, lon);
  if (!weather.ok) return weather;

  const writeResult = writeWeatherToReportIfBlank_(reportId, weather.tempC, weather.conditions);
  return {
    ok: true,
    reportId: reportId,
    projectId: projectId,
    tempC: weather.tempC,
    conditions: weather.conditions,
    weatherCode: weather.weatherCode,
    written: writeResult.written,
    skippedReason: writeResult.skippedReason || null
  };
}

function fetchOpenMeteoCurrent_(lat, lon) {
  const url = 'https://api.open-meteo.com/v1/forecast'
    + '?latitude=' + encodeURIComponent(lat)
    + '&longitude=' + encodeURIComponent(lon)
    + '&current=temperature_2m,weather_code'
    + '&timezone=America%2FVancouver';

  const resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  const code = resp.getResponseCode();
  if (code !== 200) {
    return { ok: false, error: 'Open-Meteo HTTP ' + code + ': ' + resp.getContentText().slice(0, 200) };
  }
  const data = JSON.parse(resp.getContentText());
  const cur = data && data.current;
  if (!cur || typeof cur.temperature_2m !== 'number') {
    return { ok: false, error: 'Open-Meteo response missing current.temperature_2m' };
  }
  return {
    ok: true,
    tempC: Math.round(cur.temperature_2m * 10) / 10,
    weatherCode: cur.weather_code,
    conditions: mapWmoToConditions_(cur.weather_code)
  };
}

/**
 * WMO weather interpretation codes → DailyReports.WeatherConditions enum.
 * Reference: https://open-meteo.com/en/docs (Weather variable definitions).
 *
 * Enum values: Sunny, Cloudy, Overcast, Light Rain, Heavy Rain, Snow, Wind, Fog
 * (Wind is intentionally omitted — wind speed isn't in this API call;
 *  super can override if it's a windy day.)
 */
function mapWmoToConditions_(code) {
  if (code === 0 || code === 1) return 'Sunny';
  if (code === 2)               return 'Cloudy';
  if (code === 3)               return 'Overcast';
  if (code === 45 || code === 48) return 'Fog';
  if ([51, 53, 55, 56, 57, 61, 63, 80, 81].indexOf(code) >= 0) return 'Light Rain';
  if ([65, 66, 67, 82, 95, 96, 99].indexOf(code) >= 0)         return 'Heavy Rain';
  if ([71, 73, 75, 77, 85, 86].indexOf(code) >= 0)             return 'Snow';
  return 'Cloudy';
}

function readProjectRow_(projectId) {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.TABS.Projects);
  if (!sheet) throw new Error('Projects tab not found in master sheet');
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idCol = headers.indexOf('ProjectID');
  if (idCol < 0) throw new Error('ProjectID header not found on Projects tab');
  for (let i = 1; i < values.length; i++) {
    if (values[i][idCol] === projectId) {
      const row = {};
      headers.forEach((h, j) => row[h] = values[i][j]);
      return row;
    }
  }
  return null;
}

function writeWeatherToReportIfBlank_(reportId, tempC, conditions) {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.TABS.DailyReports);
  if (!sheet) throw new Error('DailyReports tab not found in master sheet');
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idCol   = headers.indexOf('ReportID');
  const tempCol = headers.indexOf('WeatherTemp');
  const condCol = headers.indexOf('WeatherConditions');
  if (idCol < 0 || tempCol < 0 || condCol < 0) {
    throw new Error('DailyReports headers missing one of: ReportID, WeatherTemp, WeatherConditions');
  }
  for (let i = 1; i < values.length; i++) {
    if (values[i][idCol] === reportId) {
      const rowNum = i + 1;
      const existingTemp = values[i][tempCol];
      const existingCond = values[i][condCol];
      const tempIsBlank = (existingTemp === '' || existingTemp === null || existingTemp === undefined);
      const condIsBlank = (existingCond === '' || existingCond === null || existingCond === undefined);

      if (!tempIsBlank && !condIsBlank) {
        return { written: false, skippedReason: 'both fields already filled (manual override wins)' };
      }
      if (tempIsBlank) sheet.getRange(rowNum, tempCol + 1).setValue(tempC);
      if (condIsBlank) sheet.getRange(rowNum, condCol + 1).setValue(conditions);
      SpreadsheetApp.flush();
      return { written: true };
    }
  }
  return { written: false, skippedReason: 'report row not found yet (sync race) — bot will retry on next data change' };
}

function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
