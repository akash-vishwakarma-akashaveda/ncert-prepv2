// Runs the real Apps Script sync (scripts/google-apps-script-sync.js) against a small sheet fixture
// with stubbed Apps Script services, and checks the Firestore writes it would commit.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const SCRIPT = fs.readFileSync(new URL('../scripts/google-apps-script-sync.js', import.meta.url), 'utf8');
const HEADER = ['pdf url', 'class', 'subject', 'book', 'chapter', 'url', 'Chapter Title', 'English Chapter Name', 'Class Numeral', 'YT Vid Title', 'YT Vid ID', 'YT Vid Published', 'Timestamps'];

function runSync(rows, { existing = [], header = HEADER } = {}) {
  const writes = [];
  const ok = (json) => ({ getResponseCode: () => 200, getContentText: () => JSON.stringify(json) });
  const ctx = {
    Logger: { log: () => {} },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => ({ FIREBASE_PROJECT_ID: 'p', SA_CLIENT_EMAIL: 'e', SA_PRIVATE_KEY: 'k' })[k] ?? null }) },
    SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheets: () => [{ getDataRange: () => ({ getDisplayValues: () => [header, ...rows] }) }] }) },
    CacheService: { getScriptCache: () => ({ get: () => 'token', put: () => {} }) },
    UrlFetchApp: {
      fetch: (url, opts) => {
        const body = JSON.parse(opts.payload);
        if (url.endsWith(':batchGet')) {
          return ok(body.documents.map((name) => (existing.some((id) => name.endsWith('/' + id)) ? { found: { name } } : { missing: name })));
        }
        writes.push(...body.writes);
        return ok({});
      },
    },
  };
  vm.createContext(ctx);
  vm.runInContext(SCRIPT, ctx);
  vm.runInContext('syncSheetToFirestore()', ctx);
  return writes.map((w) => {
    const doc = { id: w.update.name.split('/').pop(), mask: w.updateMask.fieldPaths };
    for (const [k, v] of Object.entries(w.update.fields)) doc[k] = v.stringValue ?? v.booleanValue;
    return doc;
  });
}

const row = (o) => ['', o.cls || 'Class IX', o.subject || 'English', o.book || 'Beehive', o.chapter || 'Chapter 1', o.pdf ?? 'https://ncert.nic.in/a.pdf', o.title ?? 'The Fun They Had', o.en ?? '', o.num || 'Class 9', o.vt || 'The Fun They Had | Class IX | English | NCERT | Quick Revision', o.id, o.pub ?? 'PUBLISH_OK (public)', o.ts ?? '00:00 - Intro'];

test('maps sheet rows to video documents the app can group', () => {
  const docs = runSync([
    row({ id: 'AAAAAAAAAA1', chapter: 'Chapter1' }),
    row({ id: 'AAAAAAAAAA2', book: 'Moments Supplementary Reader', title: 'The Lost Child', vt: 'The Lost Child | Class IX' }),
    row({ id: 'AAAAAAAAAA3', pub: 'N' }),
    row({ id: 'AAAAAAAAAA4', title: '', en: 'English name used' }),
    row({ id: 'NA' }),
    row({ id: '' }),
  ]);
  assert.equal(docs.length, 4, 'invalid and empty IDs are skipped');
  const [a, b, c, d] = docs;
  assert.equal(a.chapter_id, 'Chapter 1', '"Chapter1" normalised');
  assert.equal(a.video_title, 'The Fun They Had', 'SEO suffix dropped');
  assert.equal(a.pdf_url, 'https://ncert.nic.in/a.pdf');
  assert.equal(a.timestamps, '00:00 - Intro');
  assert.equal(a.yt_public, true);
  assert.equal(c.yt_public, false, 'not published yet -> hidden from students');
  assert.equal(b.textbook, 'Moments Supplementary Reader', 'book kept so Chapter 1 of each book stays separate');
  assert.equal(d.chapter_name, 'English name used', 'falls back to English Chapter Name');
  assert.ok(a.isActive === true && a.mask.includes('isActive'), 'new docs start active');
});

test('never overwrites admin visibility on existing docs', () => {
  const [doc] = runSync([row({ id: 'AAAAAAAAAA1' })], { existing: ['AAAAAAAAAA1'] });
  assert.ok(!doc.mask.includes('isActive') && !doc.mask.includes('isPremium'));
  assert.ok(doc.mask.includes('yt_public'), 'publish state is sheet-owned and always refreshed');
});

test('optional columns missing from the sheet leave stored values alone', () => {
  const header = HEADER.filter((h) => !['url', 'Timestamps', 'YT Vid Published'].includes(h));
  const values = row({ id: 'AAAAAAAAAA1' }).filter((_, i) => !['url', 'Timestamps', 'YT Vid Published'].includes(HEADER[i]));
  const [doc] = runSync([values], { header });
  assert.ok(!doc.mask.includes('pdf_url') && !doc.mask.includes('timestamps') && !doc.mask.includes('yt_public'));
});
