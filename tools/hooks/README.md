# Anti-Echo Stop hook

本 hook 检查最后一条中文回复中的 G20 疑点。发现疑点时，请求 Agent 再复核一次。支持 Codex 的 `last_assistant_message` 和 Claude Code 的本地会话记录。

使用全局 skill 时，命令为：

```bash
node "$HOME/.agents/skills/stc/tools/hooks/stop.mjs"
```

将下面的 `Stop` 项合并到 Codex 的 `~/.codex/hooks.json`，或 Claude Code 的 `~/.claude/settings.json`。保留已经配置的其他 hook。

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node \"$HOME/.agents/skills/stc/tools/hooks/stop.mjs\"",
            "timeout": 5
          }
        ]
      }
    ]
  }
}
```

项目内安装时，将命令路径改为实际 skill 目录。Codex 新增 hook 后须通过客户端的 hook 信任确认，配置文件存在不代表已启用。

每轮最多请求一次补审，使用 `stop_hook_active` 防止循环。补审仍由 Agent 判断句子是否必要。文件和网页使用 `stc check --anti-echo` 及对应的成品审阅；本 hook 只检查回复文字。

Codex 的 Stop 机制会发起一次继续执行，不能保证第一版回复尚未显示。接口依据见 [Codex Hooks](https://learn.chatgpt.com/docs/hooks#stop)。
