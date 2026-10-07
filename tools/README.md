# 命令行工具 stc

`stc` 有两个命令：`init` 把 STC 装进项目，`check` 按 STC 的规则和词表检查中文文字。运行时不依赖第三方包，需要 Node.js 18 以上版本。

## 安装

不安装，直接运行：

```bash
npx @daimonia/stc init
```

装到本机后，直接用 `stc`：

```bash
npm install -g @daimonia/stc
stc init
```

`npx` 后面必须写完整的包名 `@daimonia/stc`。

## init

在项目根目录运行。`init` 安装 skill、规则、词表和离线命令，并写入按需使用入口。

用户确认默认使用后，运行：

```bash
stc init --defaults
```

STC 配置写在项目的 AGENTS.md 和 CLAUDE.md 中。两个文件都不存在时，新建 AGENTS.md；CLAUDE.md 用 `@AGENTS.md` 引用 AGENTS.md 时，只写 AGENTS.md。

配置位于 `<!-- stc:start -->` 与 `<!-- stc:end -->` 之间。再次安装只更新这一段。已启用的默认规则会保留，包括旧版安装。

| 选项 | 作用 |
|---|---|
| `--defaults` | 设置为当前项目的默认输出规则 |
| `--dir <目录>` | skill 安装位置，默认 `.claude/skills/stc` |
| `--dry-run` | 列出计划改动，不写入 |

安装后按 [`Onboarding for Agents`](../ONBOARDING.md) 引导用户：建议默认使用，并建议体验一次文档审阅。用户可以指定材料，也可以授权 agent 挑选一份。

## check

```bash
stc check README.md docs/
stc check src/pages/Settings.tsx
stc check AGENTS.md --profile for-instruction-writing
echo "本周我们进行了大量优化。" | stc check --profile for-document
```

| 选项 | 作用 |
|---|---|
| `--profile <场景>` | 指定场景：`for-chat`、`for-document`、`for-web-dev`、`for-instruction-writing` |
| `--format text` | 可读报告，按原句列出问题、原因和改法；默认格式 |
| `--format markdown` | Markdown 报告，可保存到用户指定的文件 |
| `--json` | 结构化问题，含位置、原句、原因和改法；保留原有字段 |
| `--max-errors <n>` | 错误超过 n 个时返回退出码 1，默认 0 |
| `--no-warnings` | 只显示错误 |

给目录时，逐层检查其中的 Markdown、文本和代码文件，跳过以“.”开头的目录和 `node_modules`、`dist`、`build` 等目录。

不指定场景时，按文件判断：AGENTS.md、CLAUDE.md、SKILL.md 用 for instruction writing；代码文件（`.ts`、`.tsx`、`.js`、`.jsx`、`.vue`、`.html` 等）用 for web dev，只检查字符串和 JSX 里的文字；其余文件用 for document。

### 报告怎么读

报告先给需修改项与待确认项的数量，再按原句分组。每条问题包含触发文字、原因和改法，规则编号用于查阅依据。待确认项必须结合上下文判断。

`check` 只读取用户指定的材料。目录中的符号链接不继续展开。原文缺少事实时，建议用“【待补：具体事实】”标明缺项。

用户确定材料和报告位置后，可以运行：

```bash
stc check 指定文档.md --format markdown > 审查报告.md
```

### 检查什么

| 编号 | 检查 | 级别 |
|---|---|---|
| G3 至 G7 | 词表里的不推荐写法 | 错误；“部分、优化、实现、相关”这类要看上下文的词是警告 |
| G12 | 一句超过 40 个字 | 警告 |
| G17 | 直角引号 | 错误 |
| G19 | 中文与英文、数字之间没有空格 | 警告 |
| C3 | 对话里的感叹号 | 错误 |
| D1 | 文档里的“他、她、它” | 错误 |
| W1 | 界面文字里的复数人称代词和第三人称代词 | 错误 |
| W2 | “你”和“您”混用 | 警告 |
| I1 | 规则文件里的非标准强度词 | 错误 |
| I2 | “必须”与“尽量、避免”这类词连用 | 错误 |

以下内容不检查：

- 引号“”‘’里的文字：视为引用或提到某个词，不查词表和代词
- 代码块、行内代码、链接地址、代码注释
- Markdown 里含“✗”的行（STC 文档里的反例）
- 注释 `stc-disable-next-line` 下面的那一行

检查命令只查机器能判断的项。“一句只讲一件事”“先写结论”这类规则，仍要靠写的人或 agent 自己检查。

## 开发

在仓库根目录运行：

```bash
npm install          # 只装生成数据用的 yaml 解析包
npm run build:data   # 从 dictionary/*.yaml 生成 tools/check/data/*.json
npm test
```

改了 `dictionary/` 里的词表后，必须重新运行 `npm run build:data`。
