import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
const cli = fileURLToPath(new URL('../cli.mjs', import.meta.url));
const run = (args, input) => spawnSync(process.execPath, [cli, 'check', ...args], { input, encoding: 'utf8' });
const text = '本周我们进行了大量优化。\n';

test('报告给出原句、原因和可执行改法，未知事实保持待补', () => {
  const result = run(['--format', 'markdown'], text);
  assert.equal(result.status, 1);
  assert.match(result.stdout, /^# STC 中文审查/);
  assert.match(result.stdout, /```text\n本周我们进行了大量优化/);
  assert.match(result.stdout, /删掉“进行”/);
  assert.match(result.stdout, /待补：具体事实/);
  assert.doesNotMatch(result.stdout, /120 名|从 3 秒/);
});

test('JSON 保留级别、位置和计数，同时提供报告字段', () => {
  const r = JSON.parse(run(['--json'], text).stdout);
  assert.equal(r.errors, 3); assert.equal(r.warnings, 1);
  const issue = r.files[0].issues.find((x) => x.rule === 'G4');
  assert.equal(issue.line, 1); assert.equal(issue.col, 5);
  assert.equal(issue.match, '进行');
  for (const key of ['message', 'title', 'reason', 'suggestion', 'context']) assert.ok(issue[key]);
});

test('检查只读，重复路径只检查一次，目录内的符号链接不扩大范围', () => {
  const dir = mkdtempSync(join(tmpdir(), 'stc-report-'));
  const docs = join(dir, 'docs'); mkdirSync(docs);
  const f = join(docs, 'a.md'); writeFileSync(f, text);
  const outside = join(dir, 'outside.md'); writeFileSync(outside, text);
  symlinkSync(outside, join(docs, 'linked.md'));
  symlinkSync(docs, join(docs, 'loop'));
  const r = JSON.parse(run([docs, f, '--json']).stdout);
  assert.equal(r.files.length, 1);
  assert.equal(readFileSync(f, 'utf8'), text);
});

test('无问题时不等同于全文质量认证，待确认项可筛选', () => {
  assert.match(run([], '本周上线了导出功能。').stdout, /事实准确性、术语一致性仍需/);
  const result = run(['--no-warnings'], '优化了页面。');
  assert.equal(result.status, 0);
  assert.match(result.stdout, /1 处待确认/);
  assert.doesNotMatch(result.stdout, /触发文字/);
});

test('格式和阈值参数错误时停止检查', () => {
  for (const args of [['--format'], ['--format', 'html'], ['--max-errors', '-1'], ['--max-errors'], ['--profile']]) {
    assert.equal(run(args, text).status, 2);
  }
});


test('报告引用的引号和空格反例不污染报告自检', () => {
  for (const input of ['点击「保存」。', '用AI生成。']) {
    const report = run(['--format', 'markdown'], input).stdout;
    const checked = JSON.parse(run(['--json'], report).stdout);
    assert.equal(checked.errors, 0);
    assert.equal(checked.warnings, 0);
  }
});
