# STC (Simplified Technical Chinese) · 受控中文

> 状态：v0.1 草稿，编写中。

STC 是一套受控中文：写作规则、词表，以及让 AI agent 直接使用的工具。目标是同一个意思只有一种写法，写出来的中文读不错、查得出。

名字里的 Simplified 指写法上的简化，不是简体字。

**English summary.** STC (Simplified Technical Chinese) is a controlled natural language for written Chinese. It is for people and for AI agents. It has writing rules, a dictionary, and tools that let agents write and check Chinese text. "Simplified" refers to simplified writing, not to Simplified Chinese characters. STC follows the approach of ASD-STE100 Simplified Technical English. STC is an independent work and contains no text from ASD-STE100.

## 为什么做

大模型写中文，常见的问题是写得多、写法散：同一个东西换着叫法，程度词代替数字，「进行优化」「赋能」「闭环」这类词把句子撑长，代词指代不清。读的人要花时间猜，agent 之间传话也会走样。

英文有 ASD-STE100：53 条写作规则，加一本约 900 个许可词的词典，每个词只有一个意思、一个词性。ASD-STE100 在 1986 年首次发布，用于航空维修手册，2025 年成为国际标准。中文没有对应的国家标准或行业标准。

STC 给中文补上这一套，从一开始就按 AI agent 能直接使用来设计。

## 给谁用

- 开发 AI 产品、编写 agent 的团队：系统提示词、规则文件、agent 的输出
- 写产品界面文字的人：按钮、提示、报错、说明
- 写技术文档、报告的人
- 需要一份中文写作标准、并且要求机器能检查的团队

## 组成

| 部分 | 内容 | 位置 |
|---|---|---|
| 规则 | 通用规则，加四个档位各自的规则 | [`rules/`](rules/) |
| 词表 | 推荐词（一个词一个意思）、不推荐写法（附推荐写法）、项目术语表模板 | [`dictionary/`](dictionary/) |
| 核心规则片段 | 贴进 AGENTS.md 或 CLAUDE.md 的十来行规则 | [`snippets/agents-md.md`](snippets/agents-md.md) |
| skill | agent 写、改、审中文时加载的技能包 | 计划中 |
| 检查脚本 | 读词表和规则，找出机器能判断的问题 | 计划中，npm 包 |

### 四个档位

写之前先判断在写哪类文字，再用「通用规则 + 对应档位的规则」。

| 档位 | 写的是什么 | 和其他档位的主要区别 |
|---|---|---|
| chat | agent 在对话里回复人 | 可以用「我」「你」；第一句回答问题 |
| document | 给人读的文字：报告、方案、手册、代码注释、提交说明 | 主语写名称，不写「我们」「你们」 |
| web dev | 网页和应用界面上给用户看的文字 | 不用复数人称和第三人称代词；按钮以动词开头 |
| instruction | 写给 agent 执行的规则：系统提示词、AGENTS.md、skill | 要求的强度只用「应、宜、可、能」及其否定 |

## 怎么用

| 方式 | 做法 | 作用 |
|---|---|---|
| 核心规则 | 把 [`snippets/agents-md.md`](snippets/agents-md.md) 的内容贴进 AGENTS.md 或 CLAUDE.md | 每次会话都带着，agent 不用记得去调用 |
| skill | 装进 agent 的技能目录（计划中） | agent 写中文时按需加载全套规则和词表 |
| 检查脚本 | 在 CI 里运行，发现问题时返回非零退出码（计划中） | 机器能判断的规则自动检查 |
| 原文 | 直接读 `rules/` 和 `dictionary/` | 审稿、培训、自己写工具 |

## 仓库结构

```
rules/          规则：通用规则与四个档位
dictionary/     词表：推荐词、不推荐写法、项目术语表模板
snippets/       贴进 AGENTS.md / CLAUDE.md 的核心规则
```

## v0.1 范围

- 规则：通用规则与四个档位，约 50 条
- 推荐词：约 200 条
- 不推荐写法：约 300 条
- 核心规则片段、skill、检查脚本

词条按真实的 AI 中文输出中的出现次数排定先后。例句使用通用名称，不含可识别的个人或企业信息。

## 和 ASD-STE100 的关系

STC 参考 ASD-STE100 的结构：写作规则、受控词典、允许项目自建术语表。规则和词条由 STC 独立编写，不翻译、不摘抄 ASD-STE100 的正文、规则原文或词典条目。

ASD-STE100 的版权归 ASD（Aerospace, Security and Defence Industries Association of Europe）所有，「ASD-STE100 Simplified Technical English」是 ASD 的欧盟注册商标。STC 不是 ASD-STE100 的官方中文版本，本仓库不分发 ASD-STE100 的文本。需要原文请到官网免费申请：<https://www.asd-ste100.org/>

英文写作可以直接使用 ASD-STE100。

## 其他参考

- GB/T 1.1—2020《标准化工作导则 第 1 部分：标准化文件的结构和起草规则》：条款的助动词
- GB/T 15834—2011《标点符号用法》
- GB/T 15835—2011《出版物上数字用法》

## 同类项目

- [lemonhall/asd-ste100-skill-zh](https://github.com/lemonhall/asd-ste100-skill-zh)：受控中文改写 skill 与检查脚本
- [RinStel/cste-zh](https://github.com/RinStel/cste-zh)：受控简明技术中文 skill

STC 和这两个项目的差别：STC 以词表为核心，并按 chat、document、web dev、instruction 四个档位分别给出规则。

## 许可

- 规则与词表：[CC BY 4.0](LICENSE)，可以复制、修改、商用，须注明出处
- 代码（检查脚本、skill、配置示例）：[MIT](LICENSE-CODE)

## 维护

由 [Daimonia（代梦智能）](https://daimonia.ai) 编写和维护。Daimonia 的产品界面、内部文档和 agent 按 STC 写作。
