import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { renderWeb, writeWeb } from '../build-web.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const read = (path) => readFileSync(path, 'utf8');
const fixture = (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'stc-web-'));
  for (const file of ['SKILL.md', 'rules', 'dictionary', 'snippets', 'WEB.md']) {
    cpSync(join(root, file), join(dir, file), { recursive: true });
  }
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
};

test('web entry is current and includes every rule and complete dictionary data', () => {
  const web = read(join(root, 'WEB.md'));
  assert.equal(web, renderWeb(root));
  const profiles = ['for-all', 'for-chat', 'for-document', 'for-web-dev', 'for-instruction-writing'];
  const expected = profiles.flatMap((profile) => [...read(join(root, 'rules', `${profile}.md`)).matchAll(/^### ([GCDWI]\d+) /gm)].map((m) => m[1]));
  const actual = [...web.matchAll(/^#### ([GCDWI]\d+) /gm)].map((m) => m[1]);
  assert.deepEqual(actual.sort(), expected.sort());
  for (const file of ['avoid.yaml', 'recommended.yaml', 'terms.example.yaml']) {
    assert.ok(web.includes(`\`\`\`yaml\n${read(join(root, 'dictionary', file)).trimEnd()}\n\`\`\``), file);
  }
  assert.doesNotMatch(web, /\]\((?:\.\.?\/|rules\/|dictionary\/)/);
  assert.match(web, /\]\(#recommended-words\)/);
  assert.ok(web.trimEnd().endsWith('`STC_WEB_END`'));
});

test('source changes fail freshness checks without writing and rebuilds include the change', (t) => {
  const dir = fixture(t);
  const before = read(join(dir, 'WEB.md'));
  const source = join(dir, 'rules/for-document.md');
  writeFileSync(source, `${read(source)}\n### D99 Test fixture rule\n\nA changed source must reach the web entry.\n`);
  assert.throws(() => writeWeb(dir, { check: true }), /out of date/);
  assert.equal(read(join(dir, 'WEB.md')), before);
  writeWeb(dir);
  assert.ok(read(join(dir, 'WEB.md')).includes('A changed source must reach the web entry.'));
  assert.doesNotThrow(() => writeWeb(dir, { check: true }));
});

test('dictionary changes and manual edits cannot silently drift from the generated entry', (t) => {
  const dir = fixture(t);
  const source = join(dir, 'dictionary/terms.example.yaml');
  writeFileSync(source, `${read(source)}\n# New project term fixture\n`);
  assert.throws(() => writeWeb(dir, { check: true }), /out of date/);
  writeWeb(dir);
  assert.ok(read(join(dir, 'WEB.md')).includes('# New project term fixture'));
  writeFileSync(join(dir, 'WEB.md'), `${read(join(dir, 'WEB.md'))}\nUnexpected edit.\n`);
  assert.throws(() => writeWeb(dir, { check: true }), /out of date/);
});

test('missing source files or workflow sections stop generation before an incomplete entry is written', (t) => {
  const dir = fixture(t);
  const before = read(join(dir, 'WEB.md'));
  writeFileSync(join(dir, 'SKILL.md'), '# Incomplete skill\n');
  assert.throws(() => writeWeb(dir), /Missing SKILL.md section/);
  assert.equal(read(join(dir, 'WEB.md')), before);
  rmSync(join(dir, 'dictionary/avoid.yaml'));
  assert.throws(() => writeWeb(dir), /ENOENT/);
  assert.equal(read(join(dir, 'WEB.md')), before);
});
