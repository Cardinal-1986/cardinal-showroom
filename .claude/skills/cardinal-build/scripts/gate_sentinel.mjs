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

/* The comparison, lifted out so the selftest can drive it with fabricated
   findings instead of real ones. That separation is the whole point: the first
   version of this control emptied the baseline and asserted the sweep came
   back RED, which quietly assumed THE APP WAS BROKEN. It passed while four OC
   Colors defects were live and went red the moment they were fixed — a control
   that fails when the thing it guards starts working. Now the rig's liveness
   and the gate's logic are checked separately, and neither depends on the app
   carrying a defect. */
export function classify(findings, base) {
  const seen = new Map();
  for (const f of findings) seen.set(keyOf(f), f);
  return {
    fresh:   [...seen.entries()].filter(([k, f]) => NEVER_BASELINE.has(f.id) || !(k in base)),
    carried: [...seen.keys()].filter(k => k in base && !NEVER_BASELINE.has(seen.get(k).id)),
    gone:    Object.keys(base).filter(k => !seen.has(k)),
  };
}

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
  let bad = 0;
  const t = (name, cond, detail) => {
    console.log((cond ? '  PASS  ' : '  FAIL  ') + name + (detail ? '  — ' + detail : ''));
    if (!cond) bad++;
  };

  /* 1. LIVENESS — the rig still drives the app. This is the only part that
     touches a browser, and it asserts nothing about findings, because a clean
     app must be allowed to be clean. */
  const res = sweep('index.html', '.claude/skills/cardinal-build/scripts/sentinel_setup_showroom.js');
  t('the sweep renders the app', res.ran >= 40, res.ran + ' render(s)');
  t('every declared state ran', Array.isArray(res.findings) &&
      !res.findings.some(f => f.id === 'RUN'),
    (res.findings.filter(f => f.id === 'RUN').length || 0) + ' state(s) threw');

  /* 2. LOGIC — fabricated findings, so this cannot be weakened by the app
     getting healthier or noisier. */
  const F = (id, detail) => ({ id, detail, at: ['selftest'] });
  const base = { [keyOf(F('INK', 'known debt'))]: 'a reason' };

  let c = classify([F('INK', 'known debt')], base);
  t('a baselined finding is carried, not reported', c.fresh.length === 0 && c.carried.length === 1);

  c = classify([F('INK', 'brand new')], base);
  t('a finding absent from the baseline is REPORTED', c.fresh.length === 1);

  c = classify([], base);
  t('a baselined finding that stopped reproducing is flagged for trimming', c.gone.length === 1);

  for (const id of NEVER_BASELINE) {
    const b2 = { [keyOf(F(id, 'x'))]: 'someone tried to baseline this' };
    const c2 = classify([F(id, 'x')], b2);
    t(id + ' cannot be silenced by a baseline entry', c2.fresh.length === 1);
  }

  console.log(bad ? 'GATE SELFTEST RED' : 'GATE SELFTEST GREEN');
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
