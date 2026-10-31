#!/usr/bin/env node
// Entry point of the stc command: init installs STC into a project, check checks Chinese text,
// update refreshes the CLI and installed skills.
import { CMD, HOMEPAGE, VERSION } from './meta.mjs';
import { runCheck } from './check/src/cli.mjs';
import { runInit } from './init/src/init.mjs';
import { runUpdate } from './update/src/update.mjs';

const HELP = `用法：${CMD} <命令> [选项]

命令：
  init     把 STC 装进当前项目
  check    检查文件、目录或标准输入里的中文文字
  update   更新命令行、全局 skill 和当前项目里的 skill

运行 ${CMD} <命令> --help，查看各命令的选项。
项目主页：${HOMEPAGE}`;

const [command, ...rest] = process.argv.slice(2);
const invocation = process.argv[1]?.endsWith('cli.mjs')
  ? `node ${JSON.stringify(process.argv[1])}`
  : CMD;
if (!command || command === '--help' || command === '-h') {
  console.log(HELP);
} else if (command === '--version' || command === '-v') {
  console.log(VERSION);
} else if (command === 'init') {
  process.exitCode = runInit(rest, { command: invocation });
} else if (command === 'update') {
  process.exitCode = runUpdate(rest);
} else if (command === 'check') {
  process.exitCode = runCheck(rest, { usage: `${CMD} check` });
} else {
  console.error(`未知命令：${command}\n\n${HELP}`);
  process.exitCode = 2;
}
