// Guards the SSRF boundary of /api/textbooks/pdf. Run: npx tsx scripts/check-textbook-proxy.ts
import assert from 'node:assert/strict';
import { allowedUpstream } from '../src/routes/textbooks.js';

const ok = 'https://ncert.nic.in/textbook/pdf/lebt101.pdf';
assert.equal(allowedUpstream(ok)?.href, ok);
assert.ok(allowedUpstream('https://www.ncert.nic.in/textbook/pdf/A.PDF'));

for (const bad of [
  undefined,
  42,
  'not a url',
  'http://ncert.nic.in/textbook/pdf/a.pdf', // plain http
  'https://evil.com/a.pdf', // other host
  'https://ncert.nic.in.evil.com/a.pdf', // suffix trick
  'https://evil.com/?x=ncert.nic.in/a.pdf',
  'https://ncert.nic.in/textbook/index.html', // not a pdf
  'https://169.254.169.254/latest/meta-data', // instance metadata
  'file:///etc/passwd',
  `https://ncert.nic.in/${'a'.repeat(600)}.pdf`, // over length cap
]) {
  assert.equal(allowedUpstream(bad), null, `should reject ${String(bad)}`);
}

console.log('textbook proxy allow-list: ok');
