# stc-lint

按 STC 的规则和词表检查中文文字。运行时不依赖第三方包，需要 Node.js 18 以上版本。

## 用法

```bash
node tools/lint/bin/stc-lint.js README.md docs/*.md
node tools/lint/bin/stc-lint.js src/pages/Settings.tsx
node tools/lint/bin/stc-lint.js AGENTS.md --profile for-instruction-writing
echo "本周我们进行了大量优化。" | node tools/lint/bin/stc-lint.js --profile for-document
```

| 选项 | 作用 |
|---|---|
| `--profile <档位>` | 指定档位：`for-chat`、`for-document`、`for-web-dev`、`for-instruction-writing` |
| `--json` | 输出 JSON |
| `--max-errors <n>` | 错误超过 n 个时返回退出码 1，默认 0 |
| `--no-warnings` | 只显示错误 |

不指定档位时，按文件判断：AGENTS.md、CLAUDE.md、SKILL.md 用 for instruction writing；代码文件（`.ts`、`.tsx`、`.js`、`.jsx`、`.vue`、`.html` 等）用 for web dev，只检查字符串和 JSX 里的文字；其余文件用 for document。

## 检查什么

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

检查脚本只查机器能判断的项。“一句只讲一件事”“先写结论”这类规则，仍要靠写的人或 agent 自己检查。

## 开发

```bash
cd tools/lint
npm install          # 只装生成数据用的 yaml 解析包
npm run build:data   # 从 dictionary/*.yaml 生成 data/*.json
npm test
```

改了 `dictionary/` 里的词表后，必须重新运行 `npm run build:data`。
