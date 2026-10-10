# 命令行工具 stc

`stc` 有两个命令：`init` 把 STC 装进项目，`check` 按 STC 的规则和词表检查中文文字。运行时不依赖第三方包，需要 Node.js 18 以上版本。

## 安装

安装命令行工具，再在项目根目录运行：

```bash
npm install -g @daimonia/stc@latest
stc init
```

也可以临时运行最新版：

```bash
npx --yes @daimonia/stc@latest init
```

`npx` 后面必须写完整的包名 `@daimonia/stc`。

单独 skill 的安装入口见 [README](../README.md#单独安装-skill)。该路径使用同一套规则、词表和检查脚本。

只装 skill 时，按实际安装路径运行：

```bash
node <skill目录>/tools/cli.mjs check <文件>
node <skill目录>/tools/cli.mjs init --dir <skill目录> --defaults
```

第二条命令在项目根目录执行，并保留原技能位置。启用默认规则以用户已有授权为准。

## 更新

在已安装 STC 的项目根目录运行：

```bash
npm install -g @daimonia/stc@latest
stc --version
stc init
node .claude/skills/stc/tools/cli.mjs --version
```

第一条命令更新本机 CLI。`init` 刷新当前项目的 skill 和规则，并保留默认使用状态。每个项目须分别刷新，两条版本命令的结果须一致。

自定义安装目录时，须继续使用原来的 `--dir <目录>`。核对 skill 版本时，也须改为实际路径。`--dir` 只改变 skill 的位置，项目配置仍写在当前目录。

全局 skill 若由手动安装或技能管理器安装，须沿用原方式更新。给 agent 的更新提示词见 [README](../README.md#更新版本)。

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
| `--anti-echo` | 未复核的 G20 疑点会使检查返回 1 |
| `--review-decisions <文件>` | 读取与原文绑定的保留理由，与 `--anti-echo` 一起用 |

给目录时，逐层检查其中的 Markdown、文本和代码文件，跳过以“.”开头的目录和 `node_modules`、`dist`、`build` 等目录。

不指定场景时，按文件判断：AGENTS.md、CLAUDE.md、SKILL.md 用 for instruction writing；代码文件（`.ts`、`.tsx`、`.js`、`.jsx`、`.vue`、`.html` 等）用 for web dev，只检查字符串和 JSX 里的文字；其余文件用 for document。

### 报告怎么读

报告先给需修改项与待确认项的数量，再按原句分组。每条问题包含触发文字、原因和改法，规则编号用于查阅依据。待确认项必须结合上下文判断。

`check` 只读取用户指定的材料。目录中的符号链接不继续展开。原文缺少事实时，建议用“【待补：具体事实】”标明缺项。

用户确定材料和报告位置后，可以运行：

```bash
stc check 指定文档.md --format markdown > 审查报告.md
```

### Anti-Echo 复核

交付检查使用：

```bash
stc check 指定文档.md --anti-echo --json
```

报告的 `antiEcho.pending` 包含待复核的原文、位置和 `id`。Agent 必须结合读者与用途判断。无用说明直接删掉，再运行检查。必要边界可以保留，并将具体理由写进复核文件：

```json
{
  "version": 1,
  "decisions": [
    {
      "id": "从当前报告复制完整的 id",
      "decision": "keep",
      "reason": "报价单必须说明税费范围，避免客户按含税价格判断。"
    }
  ]
}
```

```bash
stc check 指定文档.md --anti-echo --review-decisions 审阅决定.json
```

保留理由与文件路径、完整文件校验值、位置、原文和触发文字绑定。文件改动后须重新核对，旧记录不会豁免新文字。复核文件留在开发或审稿资料中。

普通检查保留原有的错误与警告分类。加 `--anti-echo` 后，即使使用 `--no-warnings` 或放宽错误数量，未复核的 G20 疑点仍会返回 1。返回 0 表示通过机器检查及已有记录核对，内容是否必要仍须由 Agent 按 G20、W9 审阅。

项目已有内容提取脚本时，可从 `tools/check/src/anti-echo.mjs` 导入 `reviewAntiEcho(files, decisions)`。`files` 中每项包含 `path`、`issues` 和原文件的 SHA-256 `contentHash`；每条问题须提供原文 `context`。函数返回 `pending` 和 `accepted`，CI 须在 `pending` 非空时失败。

### 检查什么

| 编号 | 检查 | 级别 |
|---|---|---|
| G3 至 G7 | 词表里的不推荐写法 | 错误；“部分、优化、实现、相关”这类要看上下文的词是警告 |
| G12 | 一句超过 40 个字 | 警告 |
| G17 | 直角引号 | 错误 |
| G19 | 中文与英文、数字之间没有空格 | 警告 |
| G20 | 排除说明、自证，以及界面中的制作标签 | 待复核；`--anti-echo` 阻止未处理项通过 |
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
