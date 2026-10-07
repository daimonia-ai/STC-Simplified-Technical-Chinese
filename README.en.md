# STC (Simplified Technical Chinese)

[中文](README.md) | English

STC is a Chinese writing specification for AI. It gives each meaning one way to write it. It has writing rules, a dictionary, and tools that AI agents can use directly. "Simplified" refers to simplified writing, not to Simplified Chinese characters.

STC is for anyone who wants AI to write clear Chinese with fewer unnecessary words and consistent terms. It also helps developers who build Chinese AI products, localization teams, and engineers who check Chinese output from language models. The rules and the dictionary are in Chinese. This page explains them in English.

## Quick start

Paste this prompt into Claude Code, Codex, Cursor, or a similar agent. After installation, the user chooses the first material to review.

```text
Install STC (Simplified Technical Chinese) in this project from https://github.com/daimonia-ai/STC-Simplified-Technical-Chinese.
1. State the installation location and configuration changes, then install within the current authorization.
2. Report which features are enabled and tell me that STC is ready.
3. Wait for me to paste text or name a file before reviewing it. Do not select project documents, run a review demo, or rewrite business files on your own.
```

Without an agent, install the CLI, then run it in your project. You need Node.js 18 or later:

```bash
npm install -g @daimonia/stc
stc init
```

To run the CLI without installing it, use `npx @daimonia/stc init`. `init` makes STC the default output rules of the agent. `check` checks existing text. The next section explains the two ways. See [`tools/README.md`](tools/README.md) (in Chinese) for all options.

## Two ways to use STC

You can use one way or both. When you use both, the default output rules make the agent write in STC from the start, and a review finds the problems that remain.

### Way 1: Make STC the default output rules of the agent

In your project, run `stc init`. The command does two things:

1. It writes the core rules into the AGENTS.md or CLAUDE.md of the project. The agent reads these rules at the start of each session. The rules start with an instruction: identify the type of text before you write, then apply the rules of that profile.
2. It puts the skill in `.claude/skills/stc/`. The agent loads the full rules and the dictionary when it writes, rewrites, or reviews Chinese.

You can also do these steps manually. Paste the contents of [`snippets/agents-md.md`](snippets/agents-md.md) into AGENTS.md or CLAUDE.md. Then put this repository in the skills directory of the agent, for example `~/.claude/skills/stc/`.

### Way 2: Let the agent review and improve existing text

Tell the agent "Review this document with STC". The agent uses the STC skill to review the material selected by the user. It explains each problem and gives a proposed change. It edits the material when the user requests that action. You can also run `stc check <file or directory>` yourself. The command finds the problems that a machine can detect, and it shows the rule ID for each problem. It returns exit code 1 when it finds errors, so you can use it in CI.

A machine cannot check all rules, for example whether a fact has a source. For these rules, the agent reviews the text with the skill, or a person reviews it.

## Why STC

Chinese text from language models often has the same problems:

- Filler verbs and buzzwords, such as 进行 (conduct), 赋能 (empower), and 闭环 (closed loop). The sentence gets longer, but the information does not increase.
- Unclear pronouns, such as 我们 (we) and 你们 (you, plural). When the text is forwarded, the reader does not know who they refer to.
- Exclusions that the reader does not need, such as 西红柿炒鸡蛋（没有东坡肉） ("stir-fried tomato and egg, with no braised pork"). The reader starts to think about something that is not there.
- Mixed strength words in rules for agents, such as 应 (should), 尽量 (try to), and 务必 (be sure to). The agent cannot tell which rule is a requirement.

English has ASD-STE100: 53 writing rules and a dictionary of about 900 approved words, each with one meaning. It was first released in 1986 for aerospace maintenance documentation. Chinese has no equivalent national or industry standard. STC fills this gap, and it is designed for AI agents from the start.

## Contents

| Part | What it contains | Location |
|---|---|---|
| Rules | General rules, plus rules for each of four profiles | [`rules/`](rules/) |
| Dictionary | Recommended words (one meaning each), words to avoid (each with a replacement), and a template for a project term list | [`dictionary/`](dictionary/) |
| Core rules snippet | About ten lines to paste into AGENTS.md or CLAUDE.md | [`snippets/agents-md.md`](snippets/agents-md.md) |
| Skill | A skill that agents load when they write, rewrite, or review Chinese | [`SKILL.md`](SKILL.md) |
| CLI | `stc init` installs STC in a project. `stc check` finds the problems that a machine can detect | [`tools/`](tools/) |

### Four profiles

Before you write, identify the type of text. Then apply the general rules and the rules of that profile.

| Profile | Text type | Main difference |
|---|---|---|
| for chat | An agent replies to a person in a conversation | "I" and "you" are allowed. The first sentence answers the question |
| for document | Text for people to read: reports, proposals, manuals, code comments, commit messages | Use names as subjects, not "we" or "you" |
| for web dev | Text that users see in a web page or an app | No plural or third-person pronouns. Buttons start with a verb |
| for instruction writing | Rules for agents: system prompts, AGENTS.md, skills | Strength words are limited to four fixed pairs (must/must not, should/should not, may/need not, can/cannot) |

## How the dictionary is ordered

Entries are ordered by how often they occur in real Chinese output from AI models. Example sentences use generic names and contain no information that identifies a person or a company.

## Relation to ASD-STE100

STC follows the structure of ASD-STE100: writing rules, a dictionary with defined word meanings, and project term lists. The STC rules and entries are written independently. They do not translate or copy the text, rules, or dictionary entries of ASD-STE100. STC also adds rules that solve the additional problems in Chinese text from language models. For example, rule G20 tells writers not to add exclusions that the reader does not need. ASD-STE100 has no specific rule for this problem.

ASD-STE100 is copyright of ASD (Aerospace, Security and Defence Industries Association of Europe), and "ASD-STE100 Simplified Technical English" is a registered EU trademark of ASD. STC is not an official Chinese version of ASD-STE100. To get the specification, request it from <https://www.asd-ste100.org/>.

## Other references

- GB/T 1.1-2020, Directives for standardization, Part 1: Rules for the structure and drafting of standardizing documents (modal verbs in provisions)
- GB/T 15834-2011, General rules for punctuation
- GB/T 15835-2011, General rules for writing numerals in publications

## License

- Rules and dictionary: [CC BY 4.0](LICENSE). You can copy, change, and use them commercially. You must give attribution.
- Code (CLI, skill, configuration examples): [MIT](LICENSE-CODE)

## Maintainers

STC is an open-source project started and maintained by [Daimonia](https://daimonia.ai/?utm_source=github&utm_medium=readme&utm_campaign=stc). Contributions are welcome: you can submit dictionary entries, rules, and issues.
