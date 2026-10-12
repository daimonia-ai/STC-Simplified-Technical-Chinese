# STC (Simplified Technical Chinese) · 简明技术性中文

中文 | [English](README.en.md)

[介绍视频](#介绍视频) · [环境要求](#环境要求) · [快速开始](#快速开始) · [网页聊天](#网页聊天直接读取规则) · [两种用法](#两种用法) · [任务回执](#任务回执) · [更新版本](#更新版本)

STC 简明技术性中文是给 AI 用的中文写作规范。项目提供写作规则、词表和 Agent 工具。默认表达自然、简短、准确，同一个意思只用一个词。任务结果按“做完了／需要你／知会”三段汇报。

名字里的 Simplified 指写法上的简化，不是简体字。

**English:** STC helps AI agents write and review clear, consistent Chinese. [Read the English guide](README.en.md).

## 介绍视频

[![STC 介绍视频封面](https://i.ytimg.com/vi/XWga_oiD_vs/hqdefault.jpg)](https://youtu.be/XWga_oiD_vs)

[在 YouTube 观看](https://youtu.be/XWga_oiD_vs)

## 环境要求

Agent 读取规则和词表后，可生成、改写和审阅中文。

| 使用方式 | 环境要求 |
|---|---|
| 通过链接接入网页聊天 | 能读取网页的聊天 AI；读取失败时可粘贴或上传文本 |
| 手动安装 skill（Agent 技能），或直接读取规则 | 能读取文件的 Agent；规则和词表是纯文本 |
| 安装 CLI（命令行工具） | Node.js 18+ 和 npm |
| 用 `npx skills` 安装 skill | Node.js 22.20+ 和 npm，见[安装器声明](https://github.com/vercel-labs/skills/blob/main/package.json) |
| 运行 CLI 或 skill 中的机器检查 | Node.js 18+；安装后可离线运行 |

自动安装和默认配置需要 Agent 能写入选定目录。

## 快速开始

STC 提供三种接入方式：CLI、独立 skill、网页链接。

通过 CLI 运行 `stc init`，会安装 skill，并可使用终端检查命令。只需要 Agent 写作和审阅时，可以单独安装 skill。网页聊天可以[直接读取规则](#网页聊天直接读取规则)。

### npm 安装 CLI

```bash
npm install -g @daimonia/stc@latest
stc init
```

安装后可按需调用 STC。设为默认和内容审阅见[两种用法](#两种用法)。也可以用 `npx --yes @daimonia/stc@latest init` 临时运行。

给 Agent 粘贴的安装指令：

```text
请在当前项目安装 STC：https://github.com/daimonia-ai/STC-Simplified-Technical-Chinese。使用 npm 安装 @daimonia/stc@latest，再运行 stc init。装好后读取技能目录中的 ONBOARDING.md，建议设为默认中文输出规则，等我确认；也可以由我指定材料体验一次审阅。
```

### 单独安装 skill

使用技能安装器，按提示选择 Agent 和项目范围：

```bash
npx skills add daimonia-ai/STC-Simplified-Technical-Chinese --skill stc
```

可用 `--agent codex`、`--agent claude-code` 或 `--agent hermes-agent` 指定入口，`--global` 安装到个人技能目录。[技能安装器文档](https://github.com/vercel-labs/skills#available-options)说明其他选项。

也可以从 [GitHub Releases](https://github.com/daimonia-ai/STC-Simplified-Technical-Chinese/releases/latest) 下载 `stc-skill-0.2.2.zip`，将包里的 `stc/` 放到 Agent 的技能目录。

给 Agent 粘贴的安装指令：

```text
请单独安装 STC skill：https://github.com/daimonia-ai/STC-Simplified-Technical-Chinese。为当前 Agent 选择合适的技能目录。装好后读取技能目录中的 ONBOARDING.md，建议设为默认中文输出规则，等我确认；审阅材料由我指定或授权挑选。
```

skill 包含规则、词表、引导与检查脚本。运行机器检查可用 `node <skill目录>/tools/cli.mjs check <文件>`。

### 网页聊天：直接读取规则

适用于能读取网页的 ChatGPT、Claude 等聊天 AI，以及云端 Agent。把下面这段话发给 AI：

```text
请读取并使用 STC：
https://raw.githubusercontent.com/daimonia-ai/STC-Simplified-Technical-Chinese/main/WEB.md
读取后，按页内的 Onboarding for Agents 引导我选择默认使用或审阅。
```

[网页入口](WEB.md)包含引导、完整规则和词表，由仓库源文件自动生成。AI 读取后，会说明实际生效范围，再引导首次使用。

纯文本链接无法读取时，可以换用 [GitHub 页面](https://github.com/daimonia-ai/STC-Simplified-Technical-Chinese/blob/main/WEB.md)。AI 仍无法读取时，再粘贴正文或上传文本。读取未完成时，AI 必须说明缺少的内容。

通过链接使用时，由 AI 按文本规则写作和审阅。机器检查命令需要 Node.js，见[环境要求](#环境要求)。

## 两种用法

可以只用一种，也可以两种一起用。一起用时，默认输出规则让 agent 一开始就按 STC 写，审阅时再找出漏掉的问题。

### 用法一：设成 agent 的默认输出规则

网页聊天可以直接发送：

```text
请读取 STC：
https://raw.githubusercontent.com/daimonia-ai/STC-Simplified-Technical-Chinese/main/WEB.md
在本次对话中默认按 STC 输出中文。
按任务选择对应场景，完成后说明生效范围。
```

需要跨对话使用时，让 AI 按平台实际提供的保存功能引导设置。

CLI 或 skill 用户可以发送：

```text
请在当前项目安装或更新 STC 简明技术性中文：https://github.com/daimonia-ai/STC-Simplified-Technical-Chinese，并设为默认中文输出规则，让表达自然、简短、准确。保留其他项目配置，完成后说明生效范围。
```

设为默认后，直接提出写作任务：

```text
请根据以下要点写一份项目进展说明：【粘贴要点】
```

已用 CLI 安装时，也可以在项目根目录运行以下命令，启用默认规则：

```bash
stc init --defaults
```

单独安装 skill 时，按 [Onboarding for Agents](ONBOARDING.md) 配置默认规则。

### 用法二：让 agent 审阅并优化已有内容

网页聊天可以直接发送：

```text
请读取 STC：
https://raw.githubusercontent.com/daimonia-ai/STC-Simplified-Technical-Chinese/main/WEB.md
按 STC 审阅并优化以下中文，保留事实、数字、名称和原意。
给出改写稿并简要说明主要改动：【粘贴文字】
```

已加载规则，或已安装 CLI、skill 时，可以直接发送：

```text
请按 STC 审阅并优化以下中文，保留事实、数字、名称和原意，给出改写稿并简要说明主要改动：【粘贴文字】
```

审阅项目文件时，可以这样说：

```text
请按 STC 审阅【文件路径】，列出主要问题和具体改法，保留源文件。
```

需要 agent 挑选首次体验的材料时，可以直接授权：

```text
请从当前项目挑选一份中文文档，说明选择理由，再按 STC 做一次只读审阅并给出具体改法。
```

此用法可按需调用，无须启用默认输出规则。

终端检查用 `stc check <文件或目录>`，每条问题带规则编号。发现错误时返回退出码 1，可接入 CI（持续集成）。事实出处等需要结合上下文的问题，由 Agent 或人复核。

## 默认表达

每次使用 STC，都会同时执行这套表达原则：

- 用自然语序和完整句子，直接给出答案或结果。
- 删除客套、重复、空话和读者不需要的解释。
- 保留事实、数字、名称、否定词、权限和真实不确定性。
- 按任务需要展开，完整文稿和详细解释必须满足请求。

自然表达和精简方法已内置于 skill 与默认配置。具体规则见 G14、G15、G20、G21、G22 和场景规则。

## 任务回执

使用 STC 汇报任务结果时，默认按三段组织：

| 段落 | 内容 |
|---|---|
| 做完了 | 已完成的结果、交付物和必要的验证结论 |
| 需要你 | 用户要执行的动作或决定的事项 |
| 知会 | 不需要用户动作、但影响理解或后续使用的信息 |

空段写“无”。详细分析放在文档中，回执给出摘要和入口。普通问答、成品正文和用户指定的其他格式按各自要求处理。具体规则见 [C10](rules/for-chat.md#c10-任务回执分清结果用户动作和知会)。

可以直接对 Agent 说：

```text
完成这个任务后，按 STC 给我任务回执。分清已经做完的结果、需要我处理的事和只需知晓的信息。
```

## Anti-Echo 交付检查

Anti-Echo 要求每句话服务当前读者，覆盖多余排除、制作说明和结尾自证。必要的价格范围、权限限制和安全提示必须保留。

```bash
stc check 文档.md --profile for-document --anti-echo
```

命令发现未复核的 G20 疑点时返回 1。Agent 必须改写，或结合上下文记录具体保留理由；语义复核还须检查规则未匹配到的内容。[复核文件与 CI 用法](tools/README.md#anti-echo-复核)。

普通聊天在发出回复前按 STC 自查。文档和界面使用上面的检查命令。0.2.2 起停用聊天 Stop 补审；旧安装的迁移方式见 [hook 升级说明](tools/hooks/README.md)。

## 更新版本

按安装方式更新。

### CLI 安装

先更新 npm 命令行包，再刷新项目里的 skill 和规则。

把这段话贴给 agent：

```text
请把 STC 的 npm 命令行工具更新到最新版，并刷新当前项目实际引用的 STC skill 和规则，保留已启用的默认规则、其他项目配置和项目术语，最后核对两处版本。
```

手动更新时，在已安装 STC 的项目根目录运行：

```bash
npm install -g @daimonia/stc@latest
stc --version
stc init
node .claude/skills/stc/tools/cli.mjs --version
```

`npm install` 更新本机 CLI。`stc init` 将新版文件复制到当前项目，并保留已有的默认设置。两条版本命令的结果须一致。

- 每个已安装 STC 的项目都需要运行一次 `stc init`。
- 安装时用了 `--dir`，更新时须使用相同目录。第二条版本命令也须改为该目录。
- `--dir` 只改变 skill 的位置；项目配置仍写在当前目录。
- 手动安装或通过技能安装器安装的全局 skill，按原方式更新。

临时运行最新版并刷新当前项目，也可以用：

```bash
npx --yes @daimonia/stc@latest init
```

### 单独 skill 安装

用技能安装器安装的项目 skill，在项目根目录运行：

```bash
npx skills update stc
```

全局 skill 使用 `npx skills update stc --global`。手动安装的 skill，下载新包后替换原技能目录。更新时保留项目术语和现有默认配置。

给 Agent 粘贴的更新指令：

```text
请按原来的安装方式更新 STC skill，核对实际技能目录和版本，保留已有默认规则、项目术语及其他配置。使用新的 ONBOARDING.md 核对启用状态。
```

skill 的检查脚本可用 `node <skill目录>/tools/cli.mjs --version` 核对版本。技能与 npm 从同一份源文件发布。

### 网页链接接入

让 AI 重新读取同一条网页入口链接，即可取得当前规则。已保存到项目资料中的文本，需要同时替换为新版。

## 为什么做

大模型写中文，常见的问题是写得多、写法散。同一个东西换着叫法，程度词代替数字。“进行优化”“赋能”“闭环”这类词把句子撑长，代词也指代不清。还常加读者不需要的说明，比如“西红柿炒鸡蛋（没有东坡肉）”。读的人要花时间猜，agent 之间传话也会走样。

英文有 ASD-STE100：53 条写作规则，加一本约 900 个许可词的词典，每个词只有一个意思、一个词性。ASD-STE100 在 1986 年首次发布，用于航空维修手册，现行版本是 2025 年发布的第 9 版。中文输出也需要这样的表达规范。

STC 给中文补上这一套，从一开始就按 AI agent 能直接使用来设计。

## 对谁有用

日常使用 AI 聊天、写文档的人可以用 STC。回复少些废话，文档把意思讲清楚。

也可用于这些专业工作：

- 开发 AI 产品、编写 agent 的团队：系统提示词、规则文件、agent 的输出
- 写产品界面文字的人：按钮、提示、报错、说明
- 写技术文档、报告的人
- 需要一份中文写作标准、并且要求机器能检查的团队

## 组成

| 组成 | 内容 | 位置 |
|---|---|---|
| 规则 | 通用规则，加四个场景各自的规则 | [`rules/`](rules/) |
| 词表 | 推荐词（一个词一个意思）、不推荐写法（附推荐写法）、项目术语表模板 | [`dictionary/`](dictionary/) |
| 核心规则片段 | 可粘贴到 AGENTS.md 或 CLAUDE.md 的核心规则 | [`snippets/agents-md.md`](snippets/agents-md.md) |
| skill | agent 写、改、审中文时加载的技能包 | [`SKILL.md`](SKILL.md) |
| 命令行工具 | `stc init` 把 STC 装进项目，`stc check` 找出机器能判断的问题 | [`tools/`](tools/) |
| 安装引导 | 默认使用的设置方法和首次文档审阅体验 | [`ONBOARDING.md`](ONBOARDING.md) |
| 网页入口 | 可通过链接读取的引导、完整规则和词表 | [`WEB.md`](WEB.md) |
| 测试任务 | 用于评估 skill 的任务和预期结果 | [`evals/`](evals/) |

### 四个场景

写之前先判断在写哪类文字，再用“通用规则 + 对应场景的规则”。

| 场景 | 写的是什么 | 和其他场景的主要区别 |
|---|---|---|
| for chat | agent 在对话里回复人 | 可以用“我”“你”；第一句回答问题 |
| for document | 给人读的文字：报告、方案、手册、代码注释、提交说明 | 主语写名称，不写“我们”“你们” |
| for web dev | 网页和应用界面上给用户看的文字 | 不用复数人称和第三人称代词；按钮以动词开头 |
| for instruction writing | 写给 agent 执行的规则：系统提示词、AGENTS.md、skill | 要求的强度只用“必须、不得、宜、不宜、可、不必、能、不能” |

## 词表怎么定

词条按真实的 AI 中文输出中的出现次数排定先后。例句使用通用名称，不含可识别的个人或企业信息。

## 和 ASD-STE100 的关系

STC 参考 ASD-STE100 的结构：写作规则、词义明确的词表、允许项目自建术语表。规则和词条由 STC 独立编写，不翻译、不摘抄 ASD-STE100 的正文、规则原文或词典条目。针对大模型输出中文的常见问题，STC 补充了表达规则和词表。例如 G20 要求删掉读者不需要的排除说明。

ASD-STE100 的版权归 ASD（Aerospace, Security and Defence Industries Association of Europe）所有，“ASD-STE100 Simplified Technical English”是 ASD 的欧盟注册商标。STC 不是 ASD-STE100 的官方中文版本，本仓库不分发 ASD-STE100 的文本。需要原文请到官网免费申请：<https://www.asd-ste100.org/>

英文写作可以直接使用 ASD-STE100。

## 其他参考

<!-- stc-disable-next-line -->
- GB/T 1.1—2020《标准化工作导则 第 1 部分：标准化文件的结构和起草规则》：条款的助动词
- GB/T 15834—2011《标点符号用法》
- GB/T 15835—2011《出版物上数字用法》

## 同类项目

- [lemonhall/asd-ste100-skill-zh](https://github.com/lemonhall/asd-ste100-skill-zh)：中文改写 skill 与检查脚本
- [RinStel/cste-zh](https://github.com/RinStel/cste-zh)：中文写作 skill

STC 和这两个项目的差别：STC 以词表为核心，并按 for chat、for document、for web dev、for instruction writing 四个场景分别给出规则。

## 许可

- 规则与词表：[CC BY 4.0](LICENSE)，可以复制、修改、商用，必须注明出处
- 代码（命令行工具、skill、配置示例）：[MIT](LICENSE-CODE)

## 维护

由 [代梦智能（Daimonia）](https://daimonia.ai/zh/?utm_source=github&utm_medium=readme&utm_campaign=stc) 发起并维护。STC 是开源项目，欢迎一起共建：提交词条、规则和 issue 都可以。
