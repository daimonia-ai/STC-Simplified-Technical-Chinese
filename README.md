# STC (Simplified Technical Chinese) · 简明技术性中文

中文 | [English](README.en.md)

![STC 价值总览：简短表达、删除废话、自然语句、统一术语、清楚指代、保留原意、界面文案和任务回执](https://raw.githubusercontent.com/daimonia-ai/STC-Simplified-Technical-Chinese/main/assets/stc-overview-v2.png)

**STC 是给 AI 用的开源中文写作规范。** STC 提供表达规则、词表和检查工具，供 AI 生成、审阅和改写中文。

### 主要亮点

| 价值 | 具体做法 |
|---|---|
| ✂️ **输出更简短** | 先给答案或结果，按任务需要展开。 |
| 🧹 **废话更少** | 删除客套、重复结论和无关解释，包括读者不需要的排除说明。 |
| 💬 **少些 AI 腔** | 用熟悉的词和自然完整的句子，删掉套话、口号和空泛修饰。 |
| 📚 **术语一致** | 同一个意思固定一种叫法，产品名和功能名遵循项目术语表。 |
| 🎯 **指代清楚** | 说清对象、条件和动作，避免读者猜“他们”“它”指什么。 |
| 🛡️ **保留原意** | 保留事实、数字、否定词、权限和真实不确定性。 |
| 🖥️ **界面更易懂** | 按钮写明动作，提示和报错说清发生了什么、下一步能做什么。 |
| 📋 **回执更清楚** | 按“做完了／需要你／知会”区分结果、用户动作和必要信息。 |

### 规则和工具

- **四类场景**：对话、文档、产品界面、Agent 指令，按任务选择对应规则。
- **词表和项目术语**：提供推荐词、不推荐写法与术语表模板，统一团队用词。
- **生成与审阅**：可设为默认输出规则，也可按需审阅并优化已有内容。
- **三种接入方式**：命令行工具（CLI）、独立 skill（Agent 技能）、网页聊天。
- **文件检查**：命令列出可自动识别的问题、具体改法和规则编号。上下文含义由 Agent 或人工复核。

## 介绍视频

| V0.2 介绍 | V0.1.0 介绍 |
|---|---|
| <video controls width="360" height="320" src="https://github.com/user-attachments/assets/72d55cce-e840-4121-bf64-1954cb1ad08a"></video> | <video controls width="360" height="320" src="https://github.com/user-attachments/assets/924fcc11-db33-4900-ae43-0f904a8393e7"></video> |
| [YouTube](https://www.youtube.com/shorts/Wmr1ZwhSiPI) | [YouTube](https://youtu.be/XWga_oiD_vs) |

[快速开始](#快速开始) · [两种用法](#两种用法) · [任务回执](#任务回执) · [手动安装与检查](#手动安装与检查) · [更新版本](#更新版本) · [环境要求](#环境要求)

## 快速开始

### Agent 使用

在 Claude Code、Codex、Hermes 等能安装工具的 Agent 中，发送下面这段话：

```text
请在当前项目安装 STC：
https://github.com/daimonia-ai/STC-Simplified-Technical-Chinese
使用 npm 安装 @daimonia/stc@latest，再运行 stc init。
安装后读取技能目录中的 ONBOARDING.md。
设置默认规则前先让我确认；
审阅材料由我指定或授权挑选。
```

CLI 安装会同时装入 skill。需要单独安装 skill 时，见[手动安装](#单独安装-skill)。

<a id="网页聊天直接读取规则"></a>

### 网页聊天

在能读取外链的 ChatGPT、Claude 等聊天 AI 中，发送：

```text
请读取并使用 STC：
https://raw.githubusercontent.com/daimonia-ai/STC-Simplified-Technical-Chinese/main/WEB.md
读取后，按页内的 Onboarding for Agents 引导，
让我选择默认使用或审阅。
```

[网页入口](WEB.md)包含引导、完整规则和词表。纯文本链接无法读取时，换用 [GitHub 页面](https://github.com/daimonia-ai/STC-Simplified-Technical-Chinese/blob/main/WEB.md)；仍无法读取时，再粘贴正文或上传文本。

## 两种用法

完成[快速开始](#快速开始)后，使用以下提示词。

### 用法一：设成 Agent 的默认输出规则

**Agent：**

```text
请将 STC 设为当前项目的默认中文输出规则。
保留其他项目配置，完成后说明生效范围。
```

**网页聊天：**

```text
请在本次对话中默认按 STC 输出中文。
按任务选择对应场景，完成后说明生效范围。
```

需要跨对话使用时，让 AI 按平台实际提供的保存功能引导设置。

写作示例：

```text
请根据以下要点写一份项目进展说明：【粘贴要点】
```

### 用法二：让 Agent 审阅并优化已有内容

Agent 和网页聊天使用同一段提示词：

```text
请按 STC 审阅并优化以下中文，保留事实、数字、名称和原意。
给出改写稿并简要说明主要改动：【粘贴文字】
```

只需要审阅项目文件时，可以说：

```text
请按 STC 审阅【文件路径】，列出主要问题和具体改法，保留源文件。
```

审阅可按需调用，无须设为默认。也可以授权 Agent 从当前项目挑选一份文档，体验一次只读审阅。

## 默认表达

- 用自然语序和完整句子，直接给出答案或结果。
- 删除客套、重复、空话和读者不需要的解释。
- 保留事实、数字、名称、否定词、权限和真实不确定性。
- 按任务需要展开，完整文稿和详细解释必须满足请求。

规则见 G14、G15、G20、G21、G22 和[场景规则](rules/README.md)。

## 任务回执

使用 STC 汇报任务结果时，默认按三段组织：

| 段落 | 内容 |
|---|---|
| 做完了 | 已完成的结果、交付物和必要的验证结论 |
| 需要你 | 用户要执行的动作或决定的事项 |
| 知会 | 不需要用户动作、但影响理解或后续使用的信息 |

空段写“无”。详细分析放在文档中，回执给出摘要和入口。普通问答、成品正文和用户指定的其他格式按各自要求处理。规则见 [C10](rules/for-chat.md#c10-任务回执分清结果用户动作和知会)。

可以直接对 Agent 说：

```text
完成这个任务后，按 STC 给我任务回执。
分清已经做完的结果、需要我处理的事和只需知晓的信息。
```

## 手动安装与检查

以下命令供手动操作使用。[环境要求](#环境要求)列出对应的 Node.js 版本。

### npm 安装 CLI

安装 CLI，再在项目根目录初始化：

```bash
npm install -g @daimonia/stc@latest
stc init
```

安装后可按需调用。需要设为当前项目的默认规则时，运行：

```bash
stc init --defaults
```

也可以临时运行最新版 CLI：

```bash
npx --yes @daimonia/stc@latest init
```

### 单独安装 skill

使用技能安装器，按提示选择 Agent 和项目范围：

```bash
npx skills add \
  daimonia-ai/STC-Simplified-Technical-Chinese \
  --skill stc
```

可用 `--agent codex`、`--agent claude-code` 或 `--agent hermes-agent` 指定 Agent，`--global` 安装到个人技能目录。其他选项见[安装器文档](https://github.com/vercel-labs/skills#available-options)。

手动安装时，从 [GitHub Releases](https://github.com/daimonia-ai/STC-Simplified-Technical-Chinese/releases/latest) 下载 `stc-skill-0.2.3.zip`，将包里的 `stc/` 放到 Agent 的技能目录。默认规则的配置方法见 [Onboarding for Agents](ONBOARDING.md)。

### 检查文件

```bash
stc check 文档.md --profile for-document --anti-echo
```

命令列出问题、改法和规则编号。发现错误或未复核的 Anti-Echo 疑点时，返回退出码 1，可接入 CI（持续集成）。

事实出处和上下文含义，由 Agent 或人工复核。

只装 skill 时，用实际技能路径运行 `node <skill目录>/tools/cli.mjs check <文件>`。更多选项见[命令行文档](tools/README.md)。

<a id="anti-echo-交付检查"></a>

Anti-Echo 要求每句话帮助当前读者理解、判断或操作。疑点由 Agent 结合上下文改写，或记录具体保留理由；必要的价格、权限和安全边界必须保留。[复核文件与 CI 用法](tools/README.md#anti-echo-复核)。

普通聊天在回复前自查。0.2.2 起停用聊天 Stop 补审；旧安装的迁移方法见 [hook 升级说明](tools/hooks/README.md)。

## 更新版本

让 Agent 更新时，可以发送：

```text
请按原来的安装方式更新 STC，刷新当前项目实际引用的 skill 和规则。
保留已启用的默认规则、其他项目配置和项目术语，最后核对实际使用的版本。
```

### CLI 安装

在已安装 STC 的项目根目录运行：

```bash
npm install -g @daimonia/stc@latest
stc --version
stc init
node .claude/skills/stc/tools/cli.mjs --version
```

`npm install` 更新本机 CLI，`stc init` 刷新项目中的 skill 和规则。两条版本命令的结果须一致。

- 每个已安装 STC 的项目都需要运行一次 `stc init`。
- 安装时用了 `--dir`，更新时须使用相同目录，并修改版本检查命令中的路径。
- `--dir` 只改变 skill 的位置；项目配置仍写在当前目录。
- 全局 skill 按原安装方式更新。

### 单独 skill 安装

用技能安装器安装的项目 skill，在项目根目录运行：

```bash
npx skills update stc
```

全局 skill 使用 `npx skills update stc --global`。手动安装的 skill，下载新包后替换原技能目录。更新时保留项目术语和现有默认配置。

用 `node <skill目录>/tools/cli.mjs --version` 核对 skill 版本。skill 和 npm 包从同一份源文件发布。

### 网页链接接入

让 AI 重新读取[网页入口](WEB.md)，取得当前规则。已保存到项目资料中的文本，需要同时替换为新版。

## 环境要求

| 使用方式 | 环境要求 |
|---|---|
| 通过链接接入网页聊天 | 能读取网页的聊天 AI；读取失败时可粘贴或上传文本 |
| 手动安装 skill，或直接读取规则 | 能读取文件的 Agent；规则和词表是纯文本 |
| 安装 CLI | Node.js 18+ 和 npm |
| 用 `npx skills` 安装 skill | Node.js 22.20+ 和 npm，见[安装器声明](https://github.com/vercel-labs/skills/blob/main/package.json) |
| 运行机器检查 | Node.js 18+；安装后可离线运行 |

安装到项目或写入项目配置时，Agent 需要选定目录的写入权限。

## 为什么做

大模型写中文，常见的问题是写得多、写法散。同一个东西换着叫法，程度词代替数字。“进行优化”“赋能”“闭环”这类词把句子撑长，代词也指代不清。还常加读者不需要的说明，比如“西红柿炒鸡蛋（没有东坡肉）”。读的人要花时间猜，agent 之间传话也会走样。

英文有 ASD-STE100：53 条写作规则，加一本约 900 个许可词的词典，每个词只有一个意思、一个词性。ASD-STE100 在 1986 年首次发布，用于航空维修手册，现行版本是 2025 年发布的第 9 版。中文输出也需要这样的表达规范。

STC 给中文补上这一套，从一开始就按 AI agent 能直接使用来设计。

名字里的 Simplified 指写法上的简化，不是简体字。

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

## 参考与致谢

- [Caveman](https://github.com/JuliusBrussee/caveman)：精简表达的参考。STC 借鉴 Lite 模式中删除冗词、保留完整句子和技术信息的做法。
- **Daimonia humanize**：自然表达、具体用词、事实保留和朗读检查，已纳入 STC 的默认表达规则。

<!-- stc-disable-next-line -->
- GB/T 1.1—2020《标准化工作导则 第 1 部分：标准化文件的结构和起草规则》：条款的助动词
- GB/T 15834—2011《标点符号用法》
- GB/T 15835—2011《出版物上数字用法》

## 相关开源项目

- [blader/humanizer](https://github.com/blader/humanizer)：识别并改写常见的模型写作套话
- [lemonhall/asd-ste100-skill-zh](https://github.com/lemonhall/asd-ste100-skill-zh)：中文改写 skill 与检查脚本
- [RinStel/cste-zh](https://github.com/RinStel/cste-zh)：中文写作 skill

## 许可

- 规则与词表：[CC BY 4.0](LICENSE)，可以复制、修改、商用，必须注明出处
- 代码（命令行工具、skill、配置示例）：[MIT](LICENSE-CODE)

## 维护

由 [代梦智能（Daimonia）](https://daimonia.ai/zh/?utm_source=github&utm_medium=readme&utm_campaign=stc) 发起并维护。STC 是开源项目，欢迎一起共建：提交词条、规则和 issue 都可以。
