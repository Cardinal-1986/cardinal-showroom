#!/usr/bin/env node
/* Refuse a privileged Supabase key anywhere in this repository.
 *
 * ⚠ SCANS FOR THE VALUE SHAPE, NEVER FOR THE WORDS. The first version of this
 * check was `grep -r 'service_role' .` inside the workflow file — so it matched
 * THE FILE THAT DEFINED IT, failed on every push, and had never once passed.
 * Five commits shipped under a red tick nobody read.
 *
 * Naming a thing is not carrying it: `process.env.SUPABASE_SERVICE_ROLE_KEY`
 * is correct code and this very comment is not a leak. What cannot be forged
 * by prose is the value:
 *   - a JWT whose DECODED payload claims a privileged role
 *   - the `sb_secret_` prefix of the newer key format
 *
 * Exit 0 clean, 1 on a hit. `--selftest` proves it rejects a fabricated key,
 * because a scanner never seen to fail is not evidence.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const SKIP = new Set(['.git', 'node_modules']);
const JWT  = /\bey[A-Za-z0-9_-]{8,}\.([A-Za-z0-9_-]{8,})\.[A-Za-z0-9_-]{8,}\b/g;
const SB   = /\bsb_secret_[A-Za-z0-9_-]{8,}\b/;
const PRIV = /"role"\s*:\s*"(service_role|supabase_admin)"/;

function scan(root) {
  const hits = [];
  let files = 0;
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (SKIP.has(e.name)) continue;
      const f = path.join(d, e.name);
      if (e.isDirectory()) { walk(f); continue; }
      if (!e.isFile()) continue;
      if (fs.statSync(f).size > 8 * 1024 * 1024) continue;
      const buf = fs.readFileSync(f);
      if (buf.includes(0)) continue;                 // binary
      const s = buf.toString('utf8');
      files++;
      if (SB.test(s)) hits.push(f + ' carries an sb_secret_ key');
      for (const m of s.matchAll(JWT)) {
        let pay = '';
        try { pay = Buffer.from(m[1], 'base64url').toString('utf8'); } catch (_) { continue; }
        if (PRIV.test(pay)) hits.push(f + ' carries a JWT claiming a privileged role');
      }
    }
  })(root);
  return { hits: [...new Set(hits)], files };
}

if (process.argv.includes('--selftest')) {
  const os = require('os');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'scansec-'));
  // Built at runtime from its parts, so this file itself carries no key.
  const hdr = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const pay = Buffer.from(JSON.stringify({ role: ['service', 'role'].join('_'), iss: 'x' })).toString('base64url');
  fs.writeFileSync(path.join(dir, 'clean.txt'), 'process.env.SUPABASE_SERVICE_ROLE_KEY\nservice_role\n');
  const clean = scan(dir);
  fs.writeFileSync(path.join(dir, 'dirty.txt'), 'KEY=' + hdr + '.' + pay + '.aaaaaaaaaaaa\n');
  const dirty = scan(dir);
  fs.rmSync(dir, { recursive: true, force: true });

  let bad = 0;
  if (clean.hits.length) { bad++; console.error('SELFTEST FAIL: flagged a file that only NAMES the key'); }
  if (!dirty.hits.length) { bad++; console.error('SELFTEST FAIL: passed a fabricated privileged key'); }
  if (bad) process.exit(1);
  console.log('selftest 2/2: names pass, a forged key is rejected');
  process.exit(0);
}

const r = scan('.');
for (const h of r.hits) console.error('::error::' + h + ' - it must never be committed');
if (r.hits.length) process.exit(1);
console.log('no privileged key in ' + r.files + ' text files');
