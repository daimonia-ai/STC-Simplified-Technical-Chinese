import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { VERSION } from '../meta.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const CLI = join(here, '..', 'cli.mjs');
const run = (args, input) => spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8', input });

test('meta.js 的版本号与 package.json 一致', () => {
  const pkg = JSON.parse(readFileSync(join(here, '..', '..', 'package.json'), 'utf8'));
  assert.equal(VERSION, pkg.version);
});

test('--version 输出版本号；未知命令返回 2', () => {
  assert.equal(run(['--version']).stdout.trim(), VERSION);
  assert.equal(run(['unknown']).status, 2);
});

test('check 检查目录：跳过 node_modules 和以“.”开头的目录', () => {
  const dir = mkdtempSync(join(tmpdir(), 'stc-cli-'));
  for (const sub of ['docs', 'node_modules/pkg', '.cache']) mkdirSync(join(dir, sub), { recursive: true });
  const text = '本周我们进行了大量优化。\n';
  writeFileSync(join(dir, 'docs', 'a.md'), text);
  writeFileSync(join(dir, 'node_modules', 'pkg', 'b.md'), text);
  writeFileSync(join(dir, '.cache', 'c.md'), text);
  const result = run(['check', dir]);
  assert.equal(result.status, 1);
  assert.match(result.stdout, /a\.md/);
  assert.doesNotMatch(result.stdout, /b\.md|c\.md/);
  assert.match(result.stdout, /检查了 1 个文件/);
});

test('check 找不到路径时返回 2', () => {
  assert.equal(run(['check', join(tmpdir(), 'stc-missing', 'a.md')]).status, 2);
});

test('check 读标准输入', () => {
  assert.equal(run(['check', '--profile', 'for-document'], '本周上线了导出功能。\n').status, 0);
  assert.equal(run(['check', '--profile', 'for-document'], '本周我们进行了大量优化。\n').status, 1);
});
