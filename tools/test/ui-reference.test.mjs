import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderUiReference, writeUiReference } from '../build-ui-reference.mjs';
import { runInit } from '../init/src/init.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const read = (base, path) => readFileSync(join(base, path), 'utf8');
const fixture = (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'stc-ui-reference-'));
  for (const name of ['rules', 'dictionary']) cpSync(join(root, name), join(dir, name), { recursive: true });
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
};

test('UI reference preserves every rule and the complete original dictionary', () => {
  const output = renderUiReference(root);
  const rules = read(root, 'rules/for-web-dev.md').replace('[`recommended.yaml`](../dictionary/recommended.yaml)', '[推荐词表](#recommended-words)');
  assert.ok(output.includes(rules.trimEnd()));
  assert.ok(output.includes('```yaml\n' + read(root, 'dictionary/recommended.yaml').trimEnd() + '\n```'));
  assert.doesNotThrow(() => writeUiReference(root, { check: true }));
  assert.match(read(root, 'SKILL.md'), /`rules\/web-dev-reference\.md`/);
});

test('UI reference includes the canonical G20 dependency without unrelated general rules', () => {
  const general = read(root, 'rules/for-all.md');
  const start = general.indexOf('### G20 ');
  const end = general.indexOf('\n### ', start + 1);
  const section = general.slice(start, end < 0 ? undefined : end).trim();
  const output = renderUiReference(root);
  assert.ok(section.length > 100);
  assert.ok(output.includes(section));
  assert.doesNotMatch(output, /^### G(?:19|21) /m);
});

test('G20 edits invalidate the reference and a missing dependency cannot overwrite it', (t) => {
  const dir = fixture(t);
  writeUiReference(dir);
  const path = join(dir, 'rules/for-all.md');
  const original = read(dir, 'rules/for-all.md');
  writeFileSync(path, original.replace('### G20 ', '### G20 Changed '));
  assert.throws(() => writeUiReference(dir, { check: true }), /out of date/);
  writeUiReference(dir);
  const before = read(dir, 'rules/web-dev-reference.md');
  writeFileSync(path, original.replace('### G20 ', '### G99 '));
  assert.throws(() => writeUiReference(dir), /Missing G20/);
  assert.equal(read(dir, 'rules/web-dev-reference.md'), before);
});

test('rule or dictionary edits invalidate the bundle until it is rebuilt', (t) => {
  const dir = fixture(t);
  writeUiReference(dir);
  for (const path of ['rules/for-web-dev.md', 'dictionary/recommended.yaml']) {
    const before = read(dir, 'rules/web-dev-reference.md');
    writeFileSync(join(dir, path), read(dir, path) + '\n# A changed source\n');
    assert.throws(() => writeUiReference(dir, { check: true }), /out of date/);
    assert.equal(read(dir, 'rules/web-dev-reference.md'), before);
    writeUiReference(dir);
    assert.doesNotThrow(() => writeUiReference(dir, { check: true }));
  }
});

test('missing dictionary leaves the previous complete bundle untouched', (t) => {
  const dir = fixture(t);
  writeUiReference(dir);
  const before = read(dir, 'rules/web-dev-reference.md');
  rmSync(join(dir, 'dictionary/recommended.yaml'));
  assert.throws(() => writeUiReference(dir), /ENOENT/);
  assert.equal(read(dir, 'rules/web-dev-reference.md'), before);
});

test('custom skill install includes the UI bundle and routes to it', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'stc-ui-install-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  assert.equal(runInit(['--defaults', '--dir', 'config/skills/stc'], { cwd: dir, log() {}, error() {} }), 0);
  const installed = join(dir, 'config/skills/stc');
  assert.match(read(installed, 'SKILL.md'), /`rules\/web-dev-reference\.md`/);
  assert.equal(read(installed, 'rules/web-dev-reference.md'), renderUiReference(root));
});
