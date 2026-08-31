#!/usr/bin/env node
/* gate_sentinel — the sentinel, ratcheted, so CI can run it every push.
 *
 *   node .claude/skills/cardinal-build/scripts/gate_sentinel.mjs
 *   node .../gate_sentinel.mjs --selftest      prove it can go red
 *   node .../gate_sentinel.mjs --update        rewrite the baseline (never automatic)
 *
 * ─────────────────────────────────────────────────────────────────────────
 * WHY A BASELINE AND NOT A BARE PASS/FAIL
 *
 * The Showroom's first real sweep found four things, and every one of them is
 * CARRIED DEBT relocated verbatim from Cardinal's cr-occ-* blocks — the same
 * rules are live in production today. A gate that fails on those is a gate
 * that is red from its first run, and this repository has already learned what
 * that costs: its secret check matched its own definition, failed on all five
 * pushes, and nobody read a single one of them. **A red tick nobody reads is
 * worse than no tick.** So known debt is written down, with a reason, and
 * blocks nothing; anything NEW is red the build it lands.
 *
 * The baseline may SHRINK and must never GROW. That is the same ratchet
 * gate_types / gate_dupes / gate_a11y run on in Cardinal.
 *
 * ⚠ FOUR IDS ARE NOT BASELINABLE AT ALL: RUN, RIG, PAGEERROR and CONSOLE.
 * They do not describe the app — they describe the SWEEP failing, and a sweep
 * that lost its states or never loaded the modules proves nothing about
 * anything. BUG_CLASSES 37: a control that crashes instead of reporting red
 * reads as "not green" when it is really "not measured". Those are hard
 * failures, always, and no --update will write them down.
 * ───────────────────────────────────────────────────────────────────────── */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { spawnSync } from 'child_process';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../../../..');
const BASELINE = join(HERE, 'sentinel_baseline.json');
const NEVER_BASELINE = new Set(['RUN', 'RIG', 'PAGEERROR', 'CONSOLE']);

const SELFTEST = process.argv.includes('--selftest');
const UPDATE   = process.argv.includes('--update');

/* Keyed WITHOUT the viewport list. The same bad ink appearing at a fourth
   width is the same defect, not a new one — and a key that moved every time a
   viewport was added would make the baseline unmaintainable. */
const keyOf = f => f.id + '|' + String(f.detail || '').slice(0, 200);

function sweep(file, setup) {
  const r = spawnSync(process.execPath, [
    join(HERE, 'sentinel.js'), file,
    '--setup', setup,
    '--viewports', '390x844,820x1180,1194x834,1440x900',
    '--themes', 'default', '--json'
  ], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const out = (r.stdout || '').trim();
  const i = out.indexOf('{');
  if (i === -1) {
    console.error('gate_sentinel: the sentinel printed no JSON — it did not run.');
    console.error((r.stderr || '').split('\n').slice(-12).join('\n'));
    process.exit(2);
  }
  return JSON.parse(out.slice(i));
}

/* ── selftest ────────────────────────────────────────────────────────────
   A gate never seen to fail is not a gate. Sweep the real app with an EMPTY
   baseline: the four carried findings must then come back as failures. If
   this prints "0 new" the comparison is not comparing anything. */
if (SELFTEST) {
  const res = sweep('index.html', '.claude/skills/cardinal-build/scripts/sentinel_setup_showroom.js');
  const keys = res.findings.map(keyOf);
  let bad = 0;
  if (!res.ran) { console.log('  FAIL  the sweep rendered nothing'); bad++; }
  else console.log('  PASS  the sweep rendered ' + res.ran + ' state(s)');
  if (!keys.length) { console.log('  FAIL  an empty baseline produced 0 findings — nothing is being compared'); bad++; }
  else console.log('  PASS  against an empty baseline the sweep is RED (' + keys.length + ' finding(s))');
  const blocked = res.findings.filter(f => NEVER_BASELINE.has(f.id));
  console.log('  PASS  ' + blocked.length + ' non-baselinable finding(s) present (RUN/RIG/PAGEERROR/CONSOLE)');
  process.exit(bad ? 1 : 0);
}

const base = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, 'utf8')) : {};
const res = sweep('index.html', '.claude/skills/cardinal-build/scripts/sentinel_setup_showroom.js');

if (!res.ran) {
  console.error('::error::gate_sentinel: the sweep rendered nothing — it proved nothing');
  process.exit(1);
}

const seen = new Map();
for (const f of res.findings) seen.set(keyOf(f), f);

const fresh = [...seen.entries()].filter(([k, f]) => NEVER_BASELINE.has(f.id) || !(k in base));
const carried = [...seen.keys()].filter(k => k in base && !NEVER_BASELINE.has(seen.get(k).id));
const goneKeys = Object.keys(base).filter(k => !seen.has(k));

if (UPDATE) {
  const next = {};
  for (const [k, f] of seen) {
    if (NEVER_BASELINE.has(f.id)) continue;
    next[k] = base[k] || 'TODO: say why this is carried, or fix it';
  }
  writeFileSync(BASELINE, JSON.stringify(next, null, 2) + '\n');
  console.log('baseline rewritten: ' + Object.keys(next).length + ' entry(ies). Give every TODO a reason.');
  process.exit(0);
}

console.log('SENTINEL GATE — ' + res.ran + ' render(s)');
/* Debt is never hidden. A gate that stops printing what it is carrying is a
   gate that lets the carried set grow unread. */
console.log('  carried: ' + carried.length + ' baselined finding(s)');
for (const k of carried) console.log('    · ' + k.split('|')[0] + ' — ' + base[k]);
if (goneKeys.length) {
  console.log('  ✓ ' + goneKeys.length + ' baselined finding(s) no longer reproduce — trim them from the baseline:');
  for (const k of goneKeys) console.log('    · ' + k);
}
if (fresh.length) {
  for (const [k, f] of fresh)
    console.error('::error::NEW ' + f.id + ' — ' + f.detail + '  [' + (f.at || []).join(', ') + ']');
  console.error('gate_sentinel: ' + fresh.length + ' NEW finding(s). Fix them, or baseline them WITH A REASON.');
  process.exit(1);
}
console.log('SENTINEL GATE GREEN — nothing new.');
