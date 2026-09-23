/**
 * Google Apps Script — Google Sheet → NCERT Prep backend video sync
 *
 * Setup (Extensions → Apps Script → Project Settings → Script Properties):
 *   SYNC_URL      the backend's sync endpoint, e.g. https://your-domain.com/api/admin/sync-sheet
 *   SYNC_SECRET   shared secret — must match SHEET_SYNC_SECRET in the backend's .env
 *   SHEET_NAME    optional: tab to read (default: the first tab, never "whichever tab is open")
 * Credentials live in Script Properties, never in this source file.
 *
 * The backend (prep_ncert/backend/src/routes/sheet-sync.ts) does all the normalisation
 * (chapter-id spacing, video-title SEO-suffix trimming), change detection (content hash, so
 * unchanged rows are skipped) and moderation-flag preservation (isActive/isPremium/pyqAvailable
 * are never overwritten for existing videos). This script's only job is reading the sheet and
 * POSTing the raw rows as JSON — no Google Cloud service account or JWT signing needed.
 *
 * Header names are matched case-insensitively, column order does not matter, and every other
 * column in the sheet is ignored.
 *   Required: class | Class Numeral | subject | book | chapter | Chapter Title | YT Vid Title | YT Vid ID
 *   Optional: YT Vid Published   -> yt_public  (true only for "PUBLISH_OK…"; students never see the rest)
 *             url                -> pdf_url    (NCERT chapter PDF)
 *             Timestamps         -> timestamps ("mm:ss - topic" lines, shown as "What you'll learn")
 *             English Chapter Name is used as chapter_name when Chapter Title is empty.
 */

var COLUMN_MAP = {
  'class': 'class_display',
  'class numeral': 'class_sort',
  'subject': 'subject',
  'book': 'textbook',
  'chapter': 'chapter_id',
  'chapter title': 'chapter_name',
  'yt vid title': 'video_title',
  'yt vid id': 'youtube_id',
};
var OPTIONAL_COLUMN_MAP = {
  'yt vid published': 'published_raw',
  'url': 'pdf_url',
  'timestamps': 'timestamps',
  'english chapter name': 'english_chapter_name',
};
var BATCH_SIZE = 500;

function onOpen() {
  SpreadsheetApp.getUi().createMenu('NCERT Prep').addItem('Sync videos to backend', 'syncSheetToBackend').addToUi();
}

function syncSheetToBackend() {
  var config = getConfig_();
  var rows = readRows_();
  if (rows.length === 0) {
    Logger.log('No valid video rows found.');
    return;
  }

  var totals = { created: 0, updated: 0, skipped: 0, errors: [] };
  for (var i = 0; i < rows.length; i += BATCH_SIZE) {
    var result = postBatch_(config, rows.slice(i, i + BATCH_SIZE));
    totals.created += result.created;
    totals.updated += result.updated;
    totals.skipped += result.skipped;
    totals.errors = totals.errors.concat(result.errors || []);
  }

  Logger.log(
    'Sync complete: ' + rows.length + ' rows (' + totals.created + ' new, ' + totals.updated +
    ' updated, ' + totals.skipped + ' unchanged).'
  );
  if (totals.errors.length > 0) Logger.log('Errors: ' + totals.errors.join('; '));
}

function getConfig_() {
  var props = PropertiesService.getScriptProperties();
  var syncUrl = props.getProperty('SYNC_URL');
  var syncSecret = props.getProperty('SYNC_SECRET');
  if (!syncUrl || !syncSecret) {
    throw new Error('Set SYNC_URL and SYNC_SECRET in Script Properties.');
  }
  return { syncUrl: syncUrl, syncSecret: syncSecret };
}

function readRows_() {
  var book = SpreadsheetApp.getActiveSpreadsheet();
  var name = PropertiesService.getScriptProperties().getProperty('SHEET_NAME');
  var sheet = name ? book.getSheetByName(name) : book.getSheets()[0];
  if (!sheet) throw new Error('Sheet "' + name + '" not found. Fix SHEET_NAME in Script Properties.');
  var values = sheet.getDataRange().getDisplayValues();
  if (values.length < 2) return [];

  var headerIndex = {};
  values[0].forEach(function (header, idx) {
    var name = String(header).trim().replace(/\s+/g, ' ').toLowerCase();
    var key = COLUMN_MAP[name] || OPTIONAL_COLUMN_MAP[name];
    if (key && headerIndex[key] === undefined) headerIndex[key] = idx;
  });

  var missing = Object.keys(COLUMN_MAP)
    .filter(function (name) { return headerIndex[COLUMN_MAP[name]] === undefined; });
  if (missing.length > 0) {
    throw new Error('Missing sheet columns: ' + missing.join(', '));
  }

  var byId = {};
  var order = [];
  for (var r = 1; r < values.length; r++) {
    var row = {};
    Object.keys(headerIndex).forEach(function (key) {
      row[key] = String(values[r][headerIndex[key]] || '').trim();
    });

    if (!row.youtube_id) continue;
    if (!row.chapter_name && row.english_chapter_name) row.chapter_name = row.english_chapter_name;
    delete row.english_chapter_name;
    if (row.published_raw !== undefined) {
      row.yt_public = /^PUBLISH_OK/i.test(row.published_raw);
      delete row.published_raw;
    }
    // Validity, chapter-id spacing and title trimming are the backend's job now (sheet-sync.ts);
    // this script just forwards whatever the sheet says, keyed on youtube_id.
    if (!byId[row.youtube_id]) order.push(row.youtube_id);
    byId[row.youtube_id] = row; // last duplicate row wins
  }
  return order.map(function (id) { return byId[id]; });
}

function postBatch_(config, rows) {
  var response = UrlFetchApp.fetch(config.syncUrl, {
    method: 'post',
    contentType: 'application/json',
    headers: { 'X-Sync-Secret': config.syncSecret },
    payload: JSON.stringify(rows),
    muteHttpExceptions: true,
  });
  if (response.getResponseCode() !== 200) {
    throw new Error('Sync request failed (' + response.getResponseCode() + '): ' + response.getContentText());
  }
  return JSON.parse(response.getContentText());
}
