# STC (Simplified Technical Chinese) · 简明技术性中文

中文 | [English](README.en.md)

STC 简明技术性中文是给 AI 用的中文写作规范：一套写作规则、一份词表，以及让 AI agent 直接使用的工具。目标是同一个意思只有一种写法，写出来的中文读不错、查得出。

名字里的 Simplified 指写法上的简化，不是简体字。

**English summary.** STC (Simplified Technical Chinese) is a Chinese writing specification for AI. It is for people and for AI agents. It has writing rules, a dictionary, and tools that let agents write and check Chinese text. "Simplified" refers to simplified writing, not to Simplified Chinese characters. STC follows the approach of ASD-STE100 Simplified Technical English. STC is an independent work and contains no text from ASD-STE100. Full English README: [README.en.md](README.en.md).

## 快速开始

把下面这段话贴给 Claude Code、Codex、Cursor 这类 agent。安装完成后，由用户选择第一份材料。

```text
请在当前项目里安装 STC 简明技术性中文（https://github.com/daimonia-ai/STC-Simplified-Technical-Chinese）。
1. 说明安装位置和将修改的配置，再按当前授权运行安装命令。
2. 安装完成后，说明已启用的功能，并提示可以使用了。
3. 等我粘贴文字或指定文件，再开始审阅。不得自行挑选项目文档、运行演示审查或改写业务文件。
```

不用 agent 时，先装命令行工具，再在项目里运行，需要 Node.js 18 以上版本：

```bash
npm install -g @daimonia/stc
stc init
```

不想装到本机，也可以用 `npx @daimonia/stc init` 直接运行。`init` 把 STC 设成 agent 的默认输出规则，`check` 检查已有的文字，两者的区别见下一节[两种用法](#两种用法)。命令的完整说明见 [`tools/README.md`](tools/README.md)。

## 两种用法

可以只用一种，也可以两种一起用。一起用时，默认输出规则让 agent 一开始就按 STC 写，审阅时再找出漏掉的问题。

### 用法一：设成 agent 的默认输出规则

在项目里运行 `stc init`。这条命令做两件事：

1. 把核心规则写进项目的 AGENTS.md 或 CLAUDE.md。agent 每次会话都会读到这一段。这一段开头要求 agent 动笔前先判断在写哪类文字，再按对应场景写。
2. 把 skill 放进 `.claude/skills/stc/`。agent 写、改、审中文时，加载全套规则和词表。

也可以手动装：把 [`snippets/agents-md.md`](snippets/agents-md.md) 的内容贴进 AGENTS.md 或 CLAUDE.md，再把本仓库放进 agent 的技能目录，比如 `~/.claude/skills/stc/`。

### 用法二：让 agent 审阅并优化已有内容

对 agent 说“按 STC 审一下这份文档”。agent 会用 STC 的 skill 审阅用户指定的材料，给出问题、原因和改法。用户要求修改时，agent 再按授权修改。人也可以自己运行 `stc check <文件或目录>`。这条命令找出机器能判断的问题，每条问题带规则编号。发现错误时返回退出码 1，可以放进 CI。

机器判断不了的规则（比如事实有没有出处），由 agent 按 skill 审查，或由人审稿。不装任何东西也可以直接读 `rules/` 和 `dictionary/`，用来审稿、培训或自己写工具。

## 为什么做

大模型写中文，常见的问题是写得多、写法散。同一个东西换着叫法，程度词代替数字。“进行优化”“赋能”“闭环”这类词把句子撑长，代词也指代不清。还常加读者不需要的说明，比如“西红柿炒鸡蛋（没有东坡肉）”。读的人要花时间猜，agent 之间传话也会走样。

英文有 ASD-STE100：53 条写作规则，加一本约 900 个许可词的词典，每个词只有一个意思、一个词性。ASD-STE100 在 1986 年首次发布，用于航空维修手册，现行版本是 2025 年发布的第 9 版。中文没有对应的国家标准或行业标准。

STC 给中文补上这一套，从一开始就按 AI agent 能直接使用来设计。

## 适合谁用

STC 适合所有希望 AI 好好说话、减少废话、保持用词一致的人。日常对话、写文档、写界面文字时都可以用。

也适合这些专业使用者：

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

STC 参考 ASD-STE100 的结构：写作规则、词义明确的词表、允许项目自建术语表。规则和词条由 STC 独立编写，不翻译、不摘抄 ASD-STE100 的正文、规则原文或词典条目。STC 另外加了规则，解决大模型写中文时额外出现的问题，比如 G20 不写读者不需要的排除说明；ASD-STE100 没有专门管这个问题的规则。

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
