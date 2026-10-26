import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const html = await readFile(path.join(here, '..', 'index.html'), 'utf8');
const m = html.match(/<script>([\s\S]*?)<\/script>/);
if (!m){
  console.error('FAIL bootstrap: no <script> found in index.html');
  process.exit(1);
}

const api = new Function(
  m[1] +
  '\nreturn { parseISODate, addDays, daysBetween, todayISO, friendlyDate, shortestDate, nudgePlan, needsNudge, nudgeMessage, buildThankYou, PLATFORMS };'
)();
const {
  parseISODate, addDays, daysBetween, todayISO, friendlyDate, shortestDate,
  nudgePlan, needsNudge, nudgeMessage, buildThankYou
} = api;

let pass = 0;
let fail = 0;

function eq(actual, expected, label){
  const want = JSON.stringify(expected, function(k, v){
    if (v instanceof Date) return v.toISOString();
    return v;
  });
  const got = JSON.stringify(actual, function(k, v){
    if (v instanceof Date) return v.toISOString();
    return v;
  });
  if (got !== want){
    throw new Error(label + ' -> expected ' + want + ', got ' + got);
  }
}

function t(name, fn){
  try {
    fn();
    pass += 1;
    console.log('ok   ' + name);
  } catch (e){
    fail += 1;
    console.error('FAIL ' + name + ': ' + e.message);
  }
}

t('parseISODate keeps valid ISO date', () => {
  const d = parseISODate('2026-10-24');
  eq(d instanceof Date, true, 'instance');
  eq(d.toISOString(), '2026-10-24T00:00:00.000Z', 'utc midnight');
});

t('parseISODate rejects malformed input', () => {
  eq(parseISODate('2026-2-3'), null, 'unpadded');
  eq(parseISODate('2026-02-30'), null, 'impossible day');
  eq(parseISODate('2026-13-01'), null, 'impossible month');
  eq(parseISODate('2026-00-10'), null, 'zero month');
  eq(parseISODate(''), null, 'empty');
  eq(parseISODate('garbage'), null, 'garbage');
  eq(parseISODate(null), null, 'null');
  eq(parseISODate(24), null, 'number');
  eq(parseISODate(' 2026-10-24 ') !== null, true, 'trimmed value still parses');
});

t('parseISODate accepts padded valid leap day', () => {
  eq(parseISODate('2028-02-29') !== null, true, 'leap day exists');
  eq(parseISODate('2027-02-29'), null, 'non-leap feb 29 rejected');
});

t('addDays rolls months, years and leap years', () => {
  eq(addDays('2026-10-24', 0), '2026-10-24', 'zero');
  eq(addDays('2026-10-24', 1), '2026-10-25', 'plus one');
  eq(addDays('2026-10-24', -1), '2026-10-23', 'minus one');
  eq(addDays('2026-01-31', 1), '2026-02-01', 'month rollover');
  eq(addDays('2026-10-31', 1), '2026-11-01', 'oct to nov');
  eq(addDays('2026-12-31', 1), '2027-01-01', 'year rollover');
  eq(addDays('2028-02-28', 1), '2028-02-29', 'leap day');
  eq(addDays('2028-02-29', 1), '2028-03-01', 'leap day out');
  eq(addDays('2027-02-28', 1), '2027-03-01', 'non-leap out');
  eq(addDays('2026-11-01', -30), '2026-10-02', 'large backspan');
});

t('addDays rejects unusable input', () => {
  eq(addDays('2026-02-30', 1), null, 'impossible date');
  eq(addDays('later', 3), null, 'garbage');
  eq(addDays('', 5), null, 'empty');
  eq(addDays(null, 5), null, 'null');
  eq(addDays('2026-10-24', 'x'), null, 'non numeric n');
});

t('daysBetween counts whole days both directions', () => {
  eq(daysBetween('2026-10-24', '2026-10-24'), 0, 'same day');
  eq(daysBetween('2026-10-24', '2026-10-26'), 2, 'forward');
  eq(daysBetween('2026-10-26', '2026-10-24'), -2, 'backward');
  eq(daysBetween('2026-09-30', '2026-10-01'), 1, 'month boundary');
  eq(daysBetween('2026-12-31', '2027-01-01'), 1, 'year boundary');
  eq(daysBetween('2028-02-28', '2028-03-01'), 2, 'across leap day');
  eq(daysBetween('2027-02-28', '2027-03-01'), 1, 'across non-leap feb');
  eq(daysBetween('2026-01-01', '2026-12-31'), 364, 'whole year');
  eq(daysBetween('bad', '2026-10-24'), null, 'bad from');
  eq(daysBetween('2026-10-24', 'bad'), null, 'bad to');
});

t('todayISO is a plain ISO date and reparses', () => {
  eq(/^\d{4}-\d{2}-\d{2}$/.test(todayISO()), true, 'shape');
  eq(parseISODate(todayISO()) !== null, true, 'reparses');
});

t('friendlyDate formats readable output', () => {
  eq(friendlyDate('2026-10-24'), 'Oct 24, 2026', 'full');
  eq(shortestDate('2026-10-24'), 'Oct 24', 'short');
  eq(friendlyDate('not-a-date'), '—', 'invalid safe');
});

t('nudgePlan states by distance to due date', () => {
  eq(nudgePlan('2026-11-01', '2026-10-24').state, 'waiting', 'far out');
  eq(nudgePlan('2026-10-28', '2026-10-24').state, 'waiting', 'four days out');
  eq(nudgePlan('2026-10-27', '2026-10-24').state, 'due-soon', 'three days out');
  eq(nudgePlan('2026-10-25', '2026-10-24').state, 'due-soon', 'one day out');
  eq(nudgePlan('2026-10-24', '2026-10-24').state, 'due-today', 'due today');
  eq(nudgePlan('2026-10-23', '2026-10-24').state, 'overdue', 'a day late');
  eq(nudgePlan('2026-10-16', '2026-10-24').state, 'overdue', 'eight days late');
});

t('nudgePlan tier selection', () => {
  eq(nudgePlan('2026-11-01', '2026-10-24').tier, null, 'no tier far out');
  eq(nudgePlan('2026-10-27', '2026-10-24').tier, 'heads-up', 'near due');
  eq(nudgePlan('2026-10-24', '2026-10-24').tier, 'due-today', 'due date');
  eq(nudgePlan('2026-10-23', '2026-10-24').tier, 'overdue-early', '1 day late');
  eq(nudgePlan('2026-10-17', '2026-10-24').tier, 'overdue-early', '7 days late boundary');
  eq(nudgePlan('2026-10-16', '2026-10-24').tier, 'overdue-late', '8 days late boundary');
});

t('nudgePlan first nudge date and counts', () => {
  const p = nudgePlan('2026-10-24', '2026-10-01');
  eq(p.firstNudgeISO, '2026-10-21', 'first nudge is due minus 3');
  eq(p.daysToDue, 23, 'days to due');
  eq(p.daysOverdue, 0, 'not overdue');
  const q = nudgePlan('2026-10-20', '2026-10-24');
  eq(q.daysOverdue, 4, 'overdue count');
  eq(q.daysToDue, -4, 'negative days to due');
});

t('nudgePlan handles leap-year margins', () => {
  const p = nudgePlan('2028-03-01', '2028-02-01');
  eq(p.firstNudgeISO, '2028-02-27', 'minus three across leap day');
});

t('nudgePlan marks invalid date sources', () => {
  eq(nudgePlan('2026-02-30', '2026-10-24').state, 'invalid', 'bad due');
  eq(nudgePlan('2026-10-24', 'later').state, 'invalid', 'bad today');
});

const today = '2026-10-24';
function arcOf(dueISO, status, sent){
  return { id: 'a', readerId: 'r', book: 'B', format: 'F', sentISO: '2026-10-01', dueISO, status: status || 'waiting', nudgesSent: sent || [] };
}

t('needsNudge only for waiting ARCs', () => {
  eq(needsNudge(arcOf('2026-10-20', 'posted'), today), null, 'posted arc');
  eq(needsNudge(arcOf('2026-10-20', 'archived'), today), null, 'archived arc');
  eq(needsNudge(null, today), null, 'missing arc');
});

t('needsNudge silent when far from due', () => {
  eq(needsNudge(arcOf('2026-11-01'), today), null, 'a week out');
});

t('needsNudge heads-up within 3 days', () => {
  const nn = needsNudge(arcOf('2026-10-27'), today);
  eq(nn && nn.tier, 'heads-up', 'tier');
});

t('needsNudge covered by a nudge logged after the window opened', () => {
  eq(needsNudge(arcOf('2026-10-27', 'waiting', ['2026-10-24']), today), null, 'logged on window open day');
  eq(needsNudge(arcOf('2026-10-27', 'waiting', ['2026-10-25']), today), null, 'logged inside window');
  eq(needsNudge(arcOf('2026-10-27', 'waiting', ['2026-10-23']), today) !== null, true, 'logged before window still nudges');
});

t('needsNudge due today', () => {
  eq(needsNudge(arcOf('2026-10-24'), today).tier, 'due-today', 'no nudges yet');
  eq(needsNudge(arcOf('2026-10-24', 'waiting', ['2026-10-21']), today), null, 'covered inside window');
});

t('needsNudge overdue cadence every 7 days', () => {
  eq(needsNudge(arcOf('2026-10-19'), today).tier, 'overdue-early', 'freshly overdue');
  eq(needsNudge(arcOf('2026-10-19', 'waiting', ['2026-10-22']), today), null, 'recent nudge holds');
  eq(needsNudge(arcOf('2026-10-16', 'waiting', ['2026-10-15']), today).tier, 'overdue-late', 'nudged once long ago, nudges again late');
  eq(needsNudge(arcOf('2026-10-13', 'waiting', ['2026-10-21']), today), null, 'nudged three days ago rests');
  eq(needsNudge(arcOf('2026-10-13', 'waiting', ['2026-10-08']), today).tier, 'overdue-late', 'late tier past interval');
});

t('needsNudge ignores malformed nudge logs', () => {
  eq(needsNudge(arcOf('2026-10-19', 'waiting', ['nonsense']), today).tier, 'overdue-early', 'junk log ignored');
});

t('nudge messages carry name, book and due date', () => {
  const ctx = { name: 'Mara', book: 'The AI Manual', due: 'Oct 24, 2026', platform: 'Goodreads' };
  const msgs = [
    nudgeMessage('heads-up', ctx),
    nudgeMessage('due-today', ctx),
    nudgeMessage('overdue-early', ctx),
    nudgeMessage('overdue-late', ctx)
  ];
  for (const msg of msgs){
    eq(msg.indexOf('Mara') !== -1, true, 'name present');
    eq(msg.indexOf('The AI Manual') !== -1, true, 'book present');
  }
  eq(msgs[0].indexOf('Oct 24, 2026') !== -1, true, 'due date present');
  eq(nudgeMessage('totally-unknown-tier', ctx), '', 'unknown tier empty');
  eq(nudgeMessage('heads-up', {}).length > 20, true, 'fallbacks keep message warm');
});

t('thanks drafts mention reader, book and optional quote', () => {
  const base = buildThankYou({ name: 'Jenna', book: 'The AI Manual' });
  eq(base.indexOf('Jenna') !== -1, true, 'name');
  eq(base.indexOf('The AI Manual') !== -1, true, 'book');
  const quoted = buildThankYou({ name: 'Jenna', book: 'The AI Manual', quote: 'patient friend' });
  eq(quoted.indexOf('patient friend') !== -1, true, 'quote line');
  const signed = buildThankYou({ name: 'Jenna', book: 'The AI Manual', author: 'Dylan' });
  eq(signed.startsWith('Hi Jenna'), true, 'greeting first');
});

t('platform constants are stable', () => {
  eq(api.PLATFORMS.indexOf('Amazon') !== -1, true, 'amazon');
  eq(api.PLATFORMS.indexOf('The StoryGraph') !== -1, true, 'storygraph');
});

console.log('');
console.log(pass + ' passed, ' + fail + ' failed');
process.exitCode = fail ? 1 : 0;
