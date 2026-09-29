// npx tsx scripts/check-reminders.ts — self-check for the reminder slot maths (IST = UTC+5:30).
import assert from 'node:assert/strict';
import { istSlot, isDue } from '../src/jobs/reminders.js';

// 13:30 UTC Sat = 19:00 IST Sat
let s = istSlot(new Date('2026-10-03T13:30:00Z'));
assert.deepEqual([s.hour, s.isSunday], [19, false]);
assert.equal(s.dayStart.toISOString(), '2026-10-02T18:30:00.000Z'); // midnight IST
assert.equal(isDue({ reminderFrequency: 'daily', reminderHour: null }, s), true); // default 7 PM
assert.equal(isDue({ reminderFrequency: 'daily', reminderHour: 8 }, s), false);
assert.equal(isDue({ reminderFrequency: 'weekly', reminderHour: 19 }, s), false); // not Sunday

// 19:00 UTC Sat = 00:30 IST Sun: the IST day has already rolled over
s = istSlot(new Date('2026-10-03T19:00:00Z'));
assert.deepEqual([s.hour, s.isSunday], [0, true]);

// 12:30 UTC Sun = 18:00 IST Sun → weekly default fires
s = istSlot(new Date('2026-10-04T12:30:00Z'));
assert.equal(isDue({ reminderFrequency: 'weekly', reminderHour: null }, s), true);
console.log('reminder slot checks passed');
