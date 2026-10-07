# STC (Simplified Technical Chinese) · 简明技术性中文

中文 | [English](README.en.md)

[快速开始](#快速开始) · [两种用法](#两种用法) · [更新版本](#更新版本)

STC 简明技术性中文是给 AI 用的中文写作规范。项目提供写作规则、词表和 agent 工具。目标是同一个意思只有一种写法，写出来的中文读不错、查得出。

名字里的 Simplified 指写法上的简化，不是简体字。

**English summary.** STC (Simplified Technical Chinese) is a Chinese writing specification for AI. It is for people and for AI agents. It has writing rules, a dictionary, and tools that let agents write and check Chinese text. "Simplified" refers to simplified writing, not to Simplified Chinese characters. STC follows the approach of ASD-STE100 Simplified Technical English. STC is an independent work and contains no text from ASD-STE100. Full English README: [README.en.md](README.en.md).

## 快速开始

把下面这段话贴给 Claude Code、Codex、Cursor 这类 agent：

```text
请在当前项目安装 STC 简明技术性中文：https://github.com/daimonia-ai/STC-Simplified-Technical-Chinese。
先运行 npm install -g @daimonia/stc@latest，再运行 stc init。
装好后读取安装目录中的 ONBOARDING.md：建议设为默认，询问我是否设置；再建议选一份文档体验审阅。文档可以由我指定，也可以由我授权你挑选。等我选择后再继续。
```

不用 agent 时，先装命令行工具，再在项目里运行，需要 Node.js 18 以上版本：

```bash
npm install -g @daimonia/stc@latest
stc init
```

也可以用 `npx --yes @daimonia/stc@latest init` 临时运行。`init` 安装 skill 和按需使用入口，`init --defaults` 设置默认输出规则，`check` 检查已有文字。使用示例见下一节[两种用法](#两种用法)，全部命令见 [`tools/README.md`](tools/README.md)。

## 两种用法

可以只用一种，也可以两种一起用。一起用时，默认输出规则让 agent 一开始就按 STC 写，审阅时再找出漏掉的问题。

### 用法一：设成 agent 的默认输出规则

把这段话直接贴给 agent：

```text
请在当前项目安装或更新 STC 简明技术性中文：https://github.com/daimonia-ai/STC-Simplified-Technical-Chinese，并设为默认中文输出规则，保留其他项目配置，完成后说明生效范围。
```

这段指令已授权设置默认规则。生效后可以直接提出写作任务，例如：

```text
请根据以下要点写一份项目进展说明：【粘贴要点】
```

手动配置时，按以下步骤操作：

在项目里运行 `stc init`，装好 skill、规则和词表。首次安装登记按需使用入口。

用户确认后，运行 `stc init --defaults`，将核心规则写入项目上下文。之后 agent 写中文时，先判断场景，再读取规则。

安装后的引导见 [Onboarding for Agents](ONBOARDING.md)。已启用默认规则的项目再次运行 `init` 时，会保留该状态。

也可以手动安装：将本仓库放入 agent 的技能目录，再按 [`snippets/agents-md.md`](snippets/agents-md.md) 配置默认规则。

### 用法二：让 agent 审阅并优化已有内容

安装后，把这段话和待处理文字一起贴给 agent：

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

对 agent 说“按 STC 审一下这份文档”。agent 会用 STC 的 skill 审阅用户指定或授权挑选的材料，给出问题、原因和改法。用户要求修改时，agent 再按授权修改。人也可以自己运行 `stc check <文件或目录>`。这条命令找出机器能判断的问题，每条问题带规则编号。发现错误时返回退出码 1，可以放进 CI。

机器判断不了的规则（比如事实有没有出处），由 agent 按 skill 审查，或由人审稿。不装任何东西也可以直接读 `rules/` 和 `dictionary/`，用来审稿、培训或自己写工具。

## 更新版本

更新分两步：先更新 npm 命令行包，再刷新项目里的 skill 和规则。

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
- 手动安装或技能管理器安装的全局 skill，须沿用原安装方式更新。npm 更新不会刷新这些副本。

临时运行最新版并刷新当前项目，也可以用：

```bash
npx --yes @daimonia/stc@latest init
```

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
| 核心规则片段 | 贴进 AGENTS.md 或 CLAUDE.md 的十来行规则 | [`snippets/agents-md.md`](snippets/agents-md.md) |
| skill | agent 写、改、审中文时加载的技能包 | [`SKILL.md`](SKILL.md) |
| 命令行工具 | `stc init` 把 STC 装进项目，`stc check` 找出机器能判断的问题 | [`tools/`](tools/) |

### 四个场景

写之前先判断在写哪类文字，再用“通用规则 + 对应场景的规则”。

| 场景 | 写的是什么 | 和其他场景的主要区别 |
|---|---|---|
| for chat | agent 在对话里回复人 | 可以用“我”“你”；第一句回答问题 |
| for document | 给人读的文字：报告、方案、手册、代码注释、提交说明 | 主语写名称，不写“我们”“你们” |
| for web dev | 网页和应用界面上给用户看的文字 | 不用复数人称和第三人称代词；按钮以动词开头 |
| for instruction writing | 写给 agent 执行的规则：系统提示词、AGENTS.md、skill | 要求的强度只用“必须、不得、宜、不宜、可、不必、能、不能” |

## 仓库结构

```
ONBOARDING.md   安装后建议默认使用，提供一次文档审阅体验
SKILL.md        skill 入口：判断场景，读规则和词表，写、改写、审查
rules/          规则：通用规则与四个场景
dictionary/     词表：推荐词、不推荐写法、项目术语表模板
snippets/       贴进 AGENTS.md / CLAUDE.md 的核心规则
tools/          命令行工具 stc：init 安装，check 检查
evals/          skill 的测试任务
```

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
