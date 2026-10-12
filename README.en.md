# STC (Simplified Technical Chinese)

[中文](README.md) | English

[Introduction video](#introduction-video) · [Requirements](#requirements) · [Quick start](#quick-start) · [Web chat](#web-chat-read-the-rules-from-a-link) · [Two ways to use STC](#two-ways-to-use-stc) · [Task receipts](#task-receipts) · [Update STC](#update-stc)

STC is a Chinese writing specification for AI. It provides writing rules, a dictionary, and tools for AI agents. Its default output is natural, concise, and precise, with one term for each meaning. Task results use three sections: completed work, user actions, and information for the user.

"Simplified" refers to simplified writing, not to Simplified Chinese characters. The rules and dictionary are in Chinese. This page explains how to use STC in English.

## Introduction video

[![STC introduction video](https://i.ytimg.com/vi/XWga_oiD_vs/hqdefault.jpg)](https://youtu.be/XWga_oiD_vs)

[Watch on YouTube (Chinese)](https://youtu.be/XWga_oiD_vs)

## Requirements

An agent reads the rules and dictionary to write, rewrite, and review Chinese.

| Use | Requirements |
|---|---|
| Use a link in web chat | A chat AI that can read web pages; paste or upload the text if reading fails |
| Install the skill manually, or read the rules directly | An agent that can read files; the rules and dictionary are plain text |
| Install the CLI (command-line interface) | Node.js 18+ and npm |
| Install the skill with `npx skills` | Node.js 22.20+ and npm; see the [installer requirements](https://github.com/vercel-labs/skills/blob/main/package.json) |
| Run machine checks from the CLI or the skill | Node.js 18+; checks work offline after installation |

The agent needs write access to the selected directory to install STC or enable default rules.

## Quick start

STC offers three ways to get started: the CLI, the standalone skill, or a web link.

Running `stc init` through the CLI installs the skill. The CLI also provides terminal checks. If you only need an agent to write and review Chinese, you can install the skill on its own. In web chat, you can [read the rules from a link](#web-chat-read-the-rules-from-a-link).

### Install the CLI with npm

```bash
npm install -g @daimonia/stc@latest
stc init
```

After installation, you can call STC when needed. See [two ways to use STC](#two-ways-to-use-stc) to enable default rules or request a review. You can also run the CLI temporarily with `npx --yes @daimonia/stc@latest init`.

Paste this prompt into your agent:

```text
Install STC in this project: https://github.com/daimonia-ai/STC-Simplified-Technical-Chinese. Install @daimonia/stc@latest with npm, then run stc init. Read ONBOARDING.md in the installed skill directory, recommend making STC the default Chinese output rules, and wait for my confirmation. I can also select material for a first review.
```

### Install only the skill

Choose your agent and installation scope when prompted:

```bash
npx skills add daimonia-ai/STC-Simplified-Technical-Chinese --skill stc
```

Use `--agent codex`, `--agent claude-code`, or `--agent hermes-agent` to select an agent. Add `--global` for your personal skill directory. See the [skill installer options](https://github.com/vercel-labs/skills#available-options).

You can also download `stc-skill-0.2.3.zip` from [GitHub Releases](https://github.com/daimonia-ai/STC-Simplified-Technical-Chinese/releases/latest). Put its `stc/` directory in your agent's skill directory.

Paste this prompt into your agent:

```text
Install the STC skill: https://github.com/daimonia-ai/STC-Simplified-Technical-Chinese. Use the skill directory for the current agent. Read ONBOARDING.md in the installed skill directory, recommend making STC the default Chinese output rules, and wait for my confirmation. Review only material that I select or authorize you to choose.
```

The skill contains the rules, dictionary, onboarding guide, and check scripts. Run a machine check with `node <skill-directory>/tools/cli.mjs check <file>`.

### Web chat: Read the rules from a link

Use this with ChatGPT, Claude, or another chat AI or cloud agent that can read web pages. Send this prompt:

```text
Read and use STC:
https://raw.githubusercontent.com/daimonia-ai/STC-Simplified-Technical-Chinese/main/WEB.md
Follow the Onboarding for Agents section to help me choose default use or a review.
```

The [web entry](WEB.md) contains onboarding, the full rules, and the dictionary. It is generated from the repository source files. After reading it, the AI explains where the rules apply and guides the first use.

If the raw-text link fails, use the [GitHub page](https://github.com/daimonia-ai/STC-Simplified-Technical-Chinese/blob/main/WEB.md). If the AI still cannot read it, paste or upload the text. The AI must identify missing content when it cannot complete the reading.

With this route, the AI writes and reviews Chinese using the text rules. Machine check commands require Node.js; see [requirements](#requirements).

## Two ways to use STC

You can use one way or both. When you use both, the default output rules make the agent write in STC from the start, and a review finds the problems that remain.

### Way 1: Make STC the default output rules of the agent

In web chat, send:

```text
Read STC:
https://raw.githubusercontent.com/daimonia-ai/STC-Simplified-Technical-Chinese/main/WEB.md
Use STC as the default rules for Chinese output in this conversation.
Select the profile for each task and tell me where the rules apply.
```

To reuse the rules across conversations, ask the AI to guide you through the settings the platform supports.

For CLI or skill use, send:

```text
Install or update STC in this project: https://github.com/daimonia-ai/STC-Simplified-Technical-Chinese. Enable STC as the default rules for natural, concise, and precise Chinese output. Preserve other project settings and tell me where the rules apply.
```

Once STC is the default, give the agent a writing task:

```text
Write a project progress report in Chinese from these notes: [paste notes].
```

If you installed through the CLI, you can also enable default rules by running this command in the project root:

```bash
stc init --defaults
```

For a standalone skill, follow [Onboarding for Agents](ONBOARDING.md) to configure default rules.

### Way 2: Let the agent review and improve existing text

In web chat, send:

```text
Read STC:
https://raw.githubusercontent.com/daimonia-ai/STC-Simplified-Technical-Chinese/main/WEB.md
Review and improve this Chinese text with STC. Preserve the facts, numbers, names, and meaning.
Return a revised version and briefly explain the main changes: [paste text].
```

After the rules are loaded, or with the CLI or skill installed, send:

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

Use `stc check <file or directory>` for terminal checks. Each finding includes a rule ID. The command returns exit code 1 when it finds errors, so it can be used in continuous integration (CI). An agent or a person must review questions that need context, such as whether facts have sources.

## Default expression

Each use of STC applies these principles:

- Use natural word order and complete sentences. Give the answer or result directly.
- Remove pleasantries, repetition, empty phrases, and explanations the reader does not need.
- Preserve facts, numbers, names, negation, permissions, and real uncertainty.
- Match the requested scope. Deliver full documents and detailed explanations when requested.

These principles are built into the skill and the default configuration. See G14, G15, G20, G21, G22, and the selected profile.

## Task receipts

Chinese task receipts use three sections in this order:

| Section | Content |
|---|---|
| 做完了 (Completed) | Completed results, deliverable links, and necessary verification |
| 需要你 (Your action) | Actions or decisions required from the user |
| 知会 (For your information) | Information that affects understanding or later use, with no action required |

Write “无” (None) when a section has no items.
Put detailed analysis in the deliverable and link to it from the receipt.
Keep ordinary answers and deliverable bodies in their own formats.
Follow another format when the user requests it.
See [C10](rules/for-chat.md#c10-任务回执分清结果用户动作和知会).

You can tell the agent:

```text
After completing this task, give me a Chinese STC task receipt. Separate completed results, actions I need to take, and information that requires no action.
```

## Anti-Echo review

Anti-Echo requires each sentence to help the current reader understand, decide, or act. Review unnecessary exclusions, production notes, and self-verification. Preserve relevant prices, permissions, and safety boundaries.

```bash
stc check document.md --profile for-document --anti-echo
```

The command returns 1 while G20 candidates remain unresolved. The agent must revise them or record a specific reason to keep them in context. It must also review content that patterns do not detect. See [review decisions and CI](tools/README.md#anti-echo-复核).

For ordinary chat, the agent checks its wording before it sends the reply. Documents and UI text use the command above. Version 0.2.2 retires the chat Stop review. See the [hook migration guide](tools/hooks/README.md) for existing installations.

## Update STC

### CLI installation

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


### Standalone skill installation

For a project skill installed by the skill manager, run this in the project root:

```bash
npx skills update stc
```

For a global skill, use `npx skills update stc --global`. For a downloaded archive, replace the installed skill directory with the new archive contents. Preserve project terms and existing default configuration.

Paste this update prompt into your agent:

```text
Update the STC skill with its original installation method. Verify its actual directory and version. Preserve default rules, project terms, and other configuration. Check the activation state with the updated ONBOARDING.md.
```

Verify the bundled version with `node <skill-directory>/tools/cli.mjs --version`. The skill and npm package are released from the same source files.

### Web link

Ask the AI to read the same web entry link again to get the current rules. Also replace any older text saved in project sources.

## Why STC

Chinese text from language models often has the same problems:

- Filler verbs and buzzwords, such as “进行” (conduct), “赋能” (empower), and “闭环” (closed loop). The sentence gets longer, but the information does not increase.
- Unclear pronouns, such as “我们” (we) and “你们” (you, plural). When the text is forwarded, the reader does not know who they refer to.
- Exclusions that the reader does not need, such as “西红柿炒鸡蛋（没有东坡肉）” ("stir-fried tomato and egg, with no braised pork"). The reader starts to think about something that is not there.
- Mixed strength words in rules for agents, such as “应” (should), “尽量” (try to), and “务必” (be sure to). The agent cannot tell which rule is a requirement.

English has ASD-STE100: 53 writing rules and a dictionary of about 900 approved words, each with one meaning. It was first released in 1986 for aerospace maintenance documentation. Chinese output needs clear writing rules too. STC is designed for AI agents from the start.

## Who STC helps

Anyone who uses AI for chat or documents can use STC to reduce unnecessary words and make Chinese easier to understand.

STC also supports these tasks:

- AI product and agent teams: system prompts, rule files, and agent output.
- Product writers and localization teams: buttons, prompts, errors, and explanations.
- Technical writers: documents and reports.
- Teams that need shared Chinese writing rules and machine checks.

## Contents

| Part | What it contains | Location |
|---|---|---|
| Rules | General rules, plus rules for each of four profiles | [`rules/`](rules/) |
| Dictionary | Recommended words (one meaning each), words to avoid (each with a replacement), and a template for a project term list | [`dictionary/`](dictionary/) |
| Core rules snippet | Core rules to paste into AGENTS.md or CLAUDE.md | [`snippets/agents-md.md`](snippets/agents-md.md) |
| Skill | A skill that agents load when they write, rewrite, or review Chinese | [`SKILL.md`](SKILL.md) |
| CLI | `stc init` installs STC in a project. `stc check` finds the problems that a machine can detect | [`tools/`](tools/) |
| Onboarding | Default configuration and a first document review | [`ONBOARDING.md`](ONBOARDING.md) |
| Web entry | Onboarding, full rules, and the dictionary in one readable page | [`WEB.md`](WEB.md) |
| Evaluation tasks | Tasks and expected results for evaluating the skill | [`evals/`](evals/) |

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
