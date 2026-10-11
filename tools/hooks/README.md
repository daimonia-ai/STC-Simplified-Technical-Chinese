# 聊天 Stop hook 升级说明

STC 0.2.2 起，普通聊天在发出回复前自查。自动追加补审已停用。

`stop.mjs` 保留为旧配置的兼容入口。命令始终返回空结果，允许本轮结束；对话记录不会被读取。文档和界面继续使用 `stc check --anti-echo`，由 Agent 结合上下文处理疑点。

## 升级旧安装

1. 按 [更新版本](../../README.md#更新版本) 刷新实际使用的 skill 目录。
2. 在 Codex 的 `~/.codex/hooks.json` 或 Claude Code 的 `~/.claude/settings.json` 中，删除命令指向 `stc/tools/hooks/stop.mjs` 的 Stop 项。其他 hook 必须保留。

已更新 skill、但仍保留注册项时，旧命令会执行兼容入口并正常结束。仅更新全局 npm 包时，已复制到项目或个人目录的旧 skill 还须刷新。

## 文档和界面检查

```bash
stc check 文档.md --profile for-document --anti-echo
stc check 界面.tsx --profile for-web-dev --anti-echo
```

机器命中仅表示待复核。按 G20 检查全文，保留事实差异和必要边界，删除读者不需要的说明。复核方式见 [检查工具](../README.md#anti-echo-复核)。
