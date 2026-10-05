#!/usr/bin/env node
// stc-lint：按 STC 规则和词表检查中文文字。
import { readFileSync } from 'node:fs';
import { lintText, loadDictionary, PROFILES } from '../src/core.js';

const HELP = `用法：stc-lint [选项] <文件...>
  不给文件时读标准输入。

选项：
  --profile <档位>   for-chat | for-document | for-web-dev | for-instruction-writing
                     不指定时按文件判断：AGENTS.md、CLAUDE.md、SKILL.md 用 for-instruction-writing，
                     代码文件用 for-web-dev（只查字符串和 JSX 文字），其余用 for-document
  --json             输出 JSON
  --max-errors <n>   错误超过 n 个时返回退出码 1，默认 0
  --no-warnings      只显示错误
  --help             显示本说明

跳过检查：在要跳过的那一行上方写一行含 stc-disable-next-line 的注释。
Markdown 里含“✗”的行（STC 文档里的反例）不检查。`;

function parseArgs(argv) {
  const opts = { files: [], json: false, maxErrors: 0, warnings: true };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--help' || a === '-h') opts.help = true;
    else if (a === '--json') opts.json = true;
    else if (a === '--no-warnings') opts.warnings = false;
    else if (a === '--profile') opts.profile = argv[++i];
    else if (a === '--max-errors') opts.maxErrors = Number(argv[++i]);
    else opts.files.push(a);
  }
  return opts;
}

const opts = parseArgs(process.argv.slice(2));
if (opts.help) {
  console.log(HELP);
  process.exit(0);
}
if (opts.profile && !PROFILES.includes(opts.profile)) {
  console.error(`未知档位：${opts.profile}。可选：${PROFILES.join('、')}`);
  process.exit(2);
}

const dictionary = loadDictionary();
const inputs = opts.files.length
  ? opts.files.map((path) => ({ path, text: readFileSync(path, 'utf8') }))
  : [{ path: 'stdin.md', text: readFileSync(0, 'utf8') }];

let errors = 0;
let warnings = 0;
const report = [];
for (const { path, text } of inputs) {
  const { profile, issues } = lintText(text, { path, profile: opts.profile, dictionary });
  const shown = opts.warnings ? issues : issues.filter((x) => x.level === 'error');
  errors += issues.filter((x) => x.level === 'error').length;
  warnings += issues.filter((x) => x.level === 'warning').length;
  report.push({ path, profile, issues: shown });
}

if (opts.json) {
  console.log(JSON.stringify({ errors, warnings, files: report }, null, 2));
} else {
  for (const { path, profile, issues } of report) {
    if (!issues.length) continue;
    console.log(`${path}（${profile}）`);
    for (const x of issues) {
      const level = x.level === 'error' ? '错误' : '警告';
      console.log(`  ${x.line}:${x.col}  ${level}  ${x.rule}  ${x.message}  “${x.match}”`);
    }
  }
  console.log(`共 ${errors} 个错误，${warnings} 个警告。`);
}
process.exit(errors > opts.maxErrors ? 1 : 0);
