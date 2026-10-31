import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { lintText } from '../check/src/core.mjs';

const cli = fileURLToPath(new URL('../cli.mjs', import.meta.url));
const fixture = (t, text) => {
  const dir = mkdtempSync(join(tmpdir(), 'stc-json-'));
  const path = join(dir, 'zh-CN.json');
  writeFileSync(path, text);
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return { dir, path };
};

test('JSON syntax and keys are preserved while nested text values are checked', () => {
  const text = JSON.stringify({
    我们进行: '保存',
    marker: 'stc-disable-next-line',
    items: ['他们已加入', { 进行: '进行导出' }],
  }, null, 2);
  const { issues } = lintText(text, { path: 'zh-CN.json', profile: 'for-web-dev' });
  assert.deepEqual(issues.map(x => x.rule), ['W1', 'G4']);
  assert.equal(issues[0].line, 5);
  assert.equal(issues[1].line, 7);
  assert.equal(lintText('{"我们进行":"保存"}', { path: 'settings.json' }).profile, 'for-document');
  assert.deepEqual(lintText('{"我们进行":"保存"}', { path: 'settings.json' }).issues, []);
});

test('JSON escaped text reports physical source positions', () => {
  const text = '{\n  "message": "\\u4f60\\u4eec\\n\\u8fdb\\u884c更新"\n}';
  const issues = lintText(text, { path: 'zh.json', profile: 'for-web-dev' }).issues;
  const row = text.split('\n')[1];
  const pronoun = issues.find(x => x.rule === 'W1');
  const action = issues.find(x => x.rule === 'G4');
  assert.equal(pronoun.match, '你们');
  assert.deepEqual([pronoun.line, pronoun.col], [2, row.indexOf('\\u4f60') + 1]);
  assert.deepEqual([action.line, action.col], [2, row.indexOf('\\u8fdb') + 1]);
  assert.equal(issues.some(x => x.rule === 'G17'), false);
});

test('ASCII quotation marks inside JSON values still receive language advice', () => {
  const text = JSON.stringify({ message: '点击 "保存"。' });
  const issues = lintText(text, { path: 'zh.json', profile: 'for-web-dev' }).issues;
  const quotes = issues.filter(x => x.rule === 'G17');
  assert.equal(quotes.length, 1);
  assert.equal(quotes[0].match, '"保存"');
  assert.equal(quotes[0].col, text.indexOf('\\"') + 1);
});

test('directory checks include JSON files and do not write to them', (t) => {
  const text = '{"title":"你们进行了更新"}';
  const { dir, path } = fixture(t, text);
  const result = spawnSync(process.execPath, [cli, 'check', dir, '--profile', 'for-web-dev', '--json'], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  const report = JSON.parse(result.stdout);
  assert.equal(report.files.length, 1);
  assert.equal(report.files[0].path, path);
  assert.deepEqual(report.files[0].issues.map(x => x.rule), ['W1', 'G4']);
  assert.equal(readFileSync(path, 'utf8'), text);
  assert.deepEqual(JSON.parse(text), { title: '你们进行了更新' });
});

test('invalid JSON returns a format error without printing private values', (t) => {
  const text = '{"private":"PRIVATE_TEST_VALUE","title":}';
  const { path } = fixture(t, text);
  const result = spawnSync(process.execPath, [cli, 'check', path, '--json'], { encoding: 'utf8' });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /JSON 格式无效/);
  assert.doesNotMatch(result.stderr, /PRIVATE_TEST_VALUE|SyntaxError|at JSON\.parse/);
  assert.equal(readFileSync(path, 'utf8'), text);
});
