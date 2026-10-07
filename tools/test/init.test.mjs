import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runInit, upsertBlock } from '../init/src/init.mjs';

const tmp = () => mkdtempSync(join(tmpdir(), 'stc-init-'));
const init = (cwd, argv = []) => runInit(argv, { cwd, log: () => {}, error: () => {} });
const read = (...parts) => readFileSync(join(...parts), 'utf8');
const blocks = (text) => text.split('<!-- stc:start -->').length - 1;

test('空项目：装好 skill 文件，新建 AGENTS.md，不建 CLAUDE.md', () => {
  const cwd = tmp();
  assert.equal(init(cwd), 0);
  for (const file of ['SKILL.md', 'LICENSE', 'rules/for-all.md', 'dictionary/avoid.yaml', 'tools/cli.mjs', 'tools/check/data/avoid.json']) {
    assert.ok(existsSync(join(cwd, '.claude/skills/stc', file)), file);
  }
  const agents = read(cwd, 'AGENTS.md');
  assert.equal(blocks(agents), 1);
  assert.match(agents, /完整规则见 `\.claude\/skills\/stc\/SKILL\.md`/);
  assert.ok(!existsSync(join(cwd, 'CLAUDE.md')));
});

test('再次运行不重复写入，原有内容保留', () => {
  const cwd = tmp();
  writeFileSync(join(cwd, 'AGENTS.md'), '# 项目规则\n\n提交前必须运行测试。\n');
  init(cwd);
  init(cwd);
  const agents = read(cwd, 'AGENTS.md');
  assert.equal(blocks(agents), 1);
  assert.ok(agents.startsWith('# 项目规则\n\n提交前必须运行测试。\n\n<!-- stc:start -->'));
});

test('只有 CLAUDE.md 时写进 CLAUDE.md，不新建 AGENTS.md', () => {
  const cwd = tmp();
  writeFileSync(join(cwd, 'CLAUDE.md'), '# 规则\n');
  init(cwd);
  assert.equal(blocks(read(cwd, 'CLAUDE.md')), 1);
  assert.ok(!existsSync(join(cwd, 'AGENTS.md')));
});

test('两个文件都有时都写；CLAUDE.md 引用 AGENTS.md 时只写 AGENTS.md', () => {
  const both = tmp();
  writeFileSync(join(both, 'AGENTS.md'), '# A\n');
  writeFileSync(join(both, 'CLAUDE.md'), '# C\n');
  init(both);
  assert.equal(blocks(read(both, 'AGENTS.md')), 1);
  assert.equal(blocks(read(both, 'CLAUDE.md')), 1);

  const imported = tmp();
  writeFileSync(join(imported, 'CLAUDE.md'), '@AGENTS.md\n');
  init(imported);
  assert.equal(blocks(read(imported, 'AGENTS.md')), 1);
  assert.equal(read(imported, 'CLAUDE.md'), '@AGENTS.md\n');
});

test('CLAUDE.md 是指向 AGENTS.md 的链接时只写一段', () => {
  const cwd = tmp();
  writeFileSync(join(cwd, 'AGENTS.md'), '# A\n');
  symlinkSync('AGENTS.md', join(cwd, 'CLAUDE.md'));
  init(cwd);
  assert.equal(blocks(read(cwd, 'AGENTS.md')), 1);
});

test('--dry-run 不写文件', () => {
  const cwd = tmp();
  assert.equal(init(cwd, ['--dry-run']), 0);
  assert.ok(!existsSync(join(cwd, '.claude')));
  assert.ok(!existsSync(join(cwd, 'AGENTS.md')));
});

test('--dir 指定目录，核心规则里的路径跟着变', () => {
  const cwd = tmp();
  init(cwd, ['--dir', 'docs/stc']);
  assert.ok(existsSync(join(cwd, 'docs/stc/SKILL.md')));
  assert.match(read(cwd, 'AGENTS.md'), /`docs\/stc\/SKILL\.md`/);
});

test('参数有误时返回 2', () => {
  assert.equal(init(tmp(), ['--unknown']), 2);
  assert.equal(init(tmp(), ['--dir']), 2);
});

test('装进项目的命令行工具能独立运行检查，项目声明 CommonJS 时也能运行', () => {
  const cwd = tmp();
  writeFileSync(join(cwd, 'package.json'), '{"type": "commonjs"}\n');
  init(cwd);
  writeFileSync(join(cwd, 'doc.md'), '本周我们进行了大量优化。\n');
  const cli = join(cwd, '.claude/skills/stc/tools/cli.mjs');
  const result = spawnSync(process.execPath, [cli, 'check', join(cwd, 'doc.md')], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stdout, /G4/);
});

test('已有 STC 段落时只替换这一段', () => {
  const block = '<!-- stc:start -->\n新\n<!-- stc:end -->';
  const before = '前\n\n<!-- stc:start -->\n旧\n<!-- stc:end -->\n后\n';
  assert.equal(upsertBlock(before, block), '前\n\n<!-- stc:start -->\n新\n<!-- stc:end -->\n后\n');
});


test('安装完成后等待用户选择材料，不附带业务审查', () => {
  const cwd = tmp();
  const source = '本周我们进行了大量优化。';
  writeFileSync(join(cwd, '业务文档.md'), source);
  const output = [];
  assert.equal(runInit([], { cwd, log: (s) => output.push(s), error: () => {} }), 0);
  assert.match(output.join('\n'), /第一份材料由用户选择/);
  assert.doesNotMatch(output.join('\n'), /G4|下一步：运行/);
  assert.equal(read(cwd, '业务文档.md'), source);
});
