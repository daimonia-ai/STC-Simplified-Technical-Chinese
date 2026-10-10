import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { skillFiles } from '../skill-files.mjs';
import { VERSION } from '../meta.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const run = (command, args, opts = {}) => {
  const result = spawnSync(command, args, { encoding: 'utf8', ...opts });
  assert.equal(result.status, 0, result.stderr || result.stdout || result.error?.message);
  return result;
};

test('standalone skill: full bundle, offline check, and default setup without a global stc command', () => {
  const temp = mkdtempSync(join(tmpdir(), 'stc-bundle-'));
  const out = join(temp, 'out');
  run(process.execPath, [join(root, 'tools/build-skill.mjs'), '--out', out]);
  const skill = join(temp, 'stc');
  run('unzip', ['-q', join(out, `stc-skill-${VERSION}.zip`), '-d', temp]);
  for (const file of skillFiles(root)) {
    assert.deepEqual(readFileSync(join(skill, file)), readFileSync(join(root, file)), file);
  }
  const project = join(temp, 'project');
  mkdirSync(project);
  writeFileSync(join(project, 'AGENTS.md'), '# Project\n\nKeep the existing settings.\n');
  const cli = join(skill, 'tools/cli.mjs');
  const env = { ...process.env, PATH: '' };
  const version = run(process.execPath, [cli, '--version'], { env });
  assert.equal(version.stdout.trim(), VERSION);
  const setup = run(process.execPath, [cli, 'init', '--dir', skill, '--defaults'], { cwd: project, env });
  assert.match(setup.stdout, /已启用默认输出规则/);
  assert.ok(!existsSync(join(project, '.claude')));
  const rules = readFileSync(join(project, 'AGENTS.md'), 'utf8');
  assert.ok(rules.startsWith('# Project\n\nKeep the existing settings.'));
  assert.ok(rules.includes(`${skill}/SKILL.md`));
  assert.ok(rules.includes('默认表达自然、简短、准确'));
  assert.match(rules, /stc:mode=default/);
  const check = run(process.execPath, [cli, 'check', '--profile', 'for-document'], {
    cwd: project, env, input: '报告页右上角有“导出”按钮。\n',
  });
  assert.match(check.stdout, /0 处需修改/);
  run(process.execPath, [cli, 'init', '--dir', skill], { cwd: project, env });
  assert.equal((readFileSync(join(project, 'AGENTS.md'), 'utf8').match(/stc:start/g) || []).length, 1);
  assert.match(readFileSync(join(project, 'AGENTS.md'), 'utf8'), /stc:mode=default/);
});
