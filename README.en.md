# STC (Simplified Technical Chinese)

[中文](README.md) | English

[Quick start](#quick-start) · [Two ways to use STC](#two-ways-to-use-stc) · [Update STC](#update-stc)

STC is a Chinese writing specification for AI. It gives each meaning one way to write it. It has writing rules, a dictionary, and tools that AI agents can use directly. "Simplified" refers to simplified writing, not to Simplified Chinese characters.

STC is for anyone who wants AI to write clear Chinese with fewer unnecessary words and consistent terms. It also helps developers who build Chinese AI products, localization teams, and engineers who check Chinese output from language models. The rules and the dictionary are in Chinese. This page explains them in English.

## Quick start

Paste this prompt into Claude Code, Codex, Cursor, or a similar agent:

```text
Install STC (Simplified Technical Chinese) in this project: https://github.com/daimonia-ai/STC-Simplified-Technical-Chinese.
Run npm install -g @daimonia/stc@latest, then stc init.
Read ONBOARDING.md in the installed skill. Recommend enabling the default output rules and ask whether I want that. Suggest a first document review: I can name a file or authorize you to choose one. Wait for my choice before continuing.
```

Without an agent, install the CLI, then run it in your project. You need Node.js 18 or later:

```bash
npm install -g @daimonia/stc@latest
stc init
```

To run the latest CLI temporarily, use `npx --yes @daimonia/stc@latest init`. `init` installs the skill and its on-demand entry. `init --defaults` enables default output rules. `check` checks existing text. The next section explains the two ways. See [`tools/README.md`](tools/README.md) (in Chinese) for all options.

## Two ways to use STC

You can use one way or both. When you use both, the default output rules make the agent write in STC from the start, and a review finds the problems that remain.

### Way 1: Make STC the default output rules of the agent

Paste this prompt into your agent:

```text
Install or update STC in this project: https://github.com/daimonia-ai/STC-Simplified-Technical-Chinese. Enable STC as the default rules for Chinese output, preserve other project settings, and tell me where the rules apply.
```

This request authorizes the agent to enable the default rules. Then give the agent a writing task, for example:

```text
Write a project progress report in Chinese from these notes: [paste notes].
```

To configure STC manually, follow these steps:

Run `stc init` in your project to install the skill, rules, and dictionary. A fresh installation registers the skill for on-demand use.

After the user agrees, run `stc init --defaults` to put the core writing rules in the project context. The agent then identifies the writing profile and reads the rules before writing Chinese.

[Onboarding for Agents](ONBOARDING.md) defines the next steps. Running `init` again preserves default rules that are already enabled, including installations from earlier releases.

For manual installation, put this repository in the agent's skill directory and use [`snippets/agents-md.md`](snippets/agents-md.md) to enable default rules.

### Way 2: Let the agent review and improve existing text

After installation, paste this prompt and the text into your agent:

```text
Review and improve this Chinese text with STC. Preserve the facts, numbers, names, and meaning. Return a revised version and briefly explain the main changes: [paste text].
```

For a project file, use:

```text
Review [file path] with STC and explain the main problems and specific fixes. Keep the source file unchanged.
```

To let the agent choose material for a first review, authorize that selection:

```text
Choose one Chinese document from this project, explain the choice, and give a read-only STC review with specific suggested changes.
```

You can request a review without enabling default output rules.

Tell the agent "Review this document with STC". The agent uses the STC skill to review the material selected by the user or chosen with the user's permission. It explains each problem and gives a proposed change. It edits the material when the user requests that action. You can also run `stc check <file or directory>` yourself. The command finds the problems that a machine can detect, and it shows the rule ID for each problem. It returns exit code 1 when it finds errors, so you can use it in CI.

A machine cannot check all rules, for example whether a fact has a source. For these rules, the agent reviews the text with the skill, or a person reviews it.

## Update STC

Update the npm CLI package, then refresh the skill and rules copied into each project.

Paste this prompt into your agent:

```text
Update the STC npm CLI to the latest version and refresh the STC skill and rules that this project uses. Preserve enabled default rules, other project settings, and project terms. Verify the CLI version and the installed skill version.
```

To update manually, run these commands from the root of a project that uses STC:

```bash
npm install -g @daimonia/stc@latest
stc --version
stc init
node .claude/skills/stc/tools/cli.mjs --version
```

`npm install` updates the CLI on your computer. `stc init` copies the new files into the current project and preserves the existing default mode. The two version commands must return the same version.

- Run `stc init` in each project that has an STC installation.
- If you installed with `--dir`, use the same directory for the update and the second version command.
- `--dir` changes only the skill location. Project configuration is still written in the current directory.
- Update global skills installed manually or through a skill manager with their original installation method. An npm update does not refresh those copies.

You can also run the latest CLI temporarily to refresh the current project:

```bash
npx --yes @daimonia/stc@latest init
```

## Why STC

Chinese text from language models often has the same problems:

- Filler verbs and buzzwords, such as 进行 (conduct), 赋能 (empower), and 闭环 (closed loop). The sentence gets longer, but the information does not increase.
- Unclear pronouns, such as 我们 (we) and 你们 (you, plural). When the text is forwarded, the reader does not know who they refer to.
- Exclusions that the reader does not need, such as 西红柿炒鸡蛋（没有东坡肉） ("stir-fried tomato and egg, with no braised pork"). The reader starts to think about something that is not there.
- Mixed strength words in rules for agents, such as 应 (should), 尽量 (try to), and 务必 (be sure to). The agent cannot tell which rule is a requirement.

English has ASD-STE100: 53 writing rules and a dictionary of about 900 approved words, each with one meaning. It was first released in 1986 for aerospace maintenance documentation. Chinese output needs clear writing rules too. STC is designed for AI agents from the start.

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

STC follows the structure of ASD-STE100: writing rules, a dictionary with defined word meanings, and project term lists. The STC rules and entries are written independently. They do not translate or copy the text, rules, or dictionary entries of ASD-STE100. STC adds writing rules and dictionary entries for common problems in Chinese model output. For example, rule G20 tells writers not to add exclusions that the reader does not need. ASD-STE100 has no specific rule for this problem.

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
