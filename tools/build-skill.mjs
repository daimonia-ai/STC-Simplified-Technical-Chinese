#!/usr/bin/env node
// Build the downloadable skill from the same files used by stc init.
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { skillFiles } from './skill-files.mjs';
import { VERSION } from './meta.mjs';

const root = resolve(fileURLToPath(new URL('../', import.meta.url)));
const argv = process.argv.slice(2);
if (argv.length && (argv.length !== 2 || argv[0] !== '--out')) {
  console.error('Usage: node tools/build-skill.mjs [--out <directory>]');
  process.exit(2);
}
const out = resolve(argv[1] || join(root, 'dist'));
mkdirSync(out, { recursive: true });
const stage = mkdtempSync(join(out, '.stc-skill-'));
const name = `stc-skill-${VERSION}.zip`;
const archive = join(out, name);
try {
  for (const rel of skillFiles(root)) {
    const target = join(stage, 'stc', rel);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(join(root, rel), target);
  }
  rmSync(archive, { force: true });
  const result = spawnSync('zip', ['-q', '-r', archive, 'stc'], { cwd: stage, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.error?.message || result.stderr || 'zip failed');
  const sha = createHash('sha256').update(readFileSync(archive)).digest('hex');
  writeFileSync(join(out, 'SHA256SUMS'), `${sha}  ${name}\n`);
  console.log(archive);
} finally {
  rmSync(stage, { recursive: true, force: true });
}
