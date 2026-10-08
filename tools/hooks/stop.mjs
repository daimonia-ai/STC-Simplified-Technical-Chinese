#!/usr/bin/env node
import { openSync, closeSync, fstatSync, readSync, readFileSync } from 'node:fs';
import { isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';
import { lintText } from '../check/src/core.mjs';

function transcriptReply(path) {
  if (typeof path !== 'string' || !isAbsolute(path)) return '';
  let fd;
  try {
    fd = openSync(path, 'r');
    const size = fstatSync(fd).size;
    const start = Math.max(0, size - 262144);
    const bytes = Buffer.alloc(size - start);
    readSync(fd, bytes, 0, bytes.length, start);
    const lines = bytes.toString('utf8').split('\n');
    if (start) lines.shift();
    for (const line of lines.reverse()) {
      try {
        const item = JSON.parse(line);
        if (item.type !== 'assistant' || item.message?.role !== 'assistant') continue;
        return (item.message.content ?? []).filter((part) => part.type === 'text').map((part) => part.text).join('\n');
      } catch { /* A trailing partial JSONL record does not contain a completed reply. */ }
    }
  } catch { return ''; }
  finally { if (fd !== undefined) closeSync(fd); }
  return '';
}

export function reviewStop(input) {
  if (!input || typeof input !== 'object' || input.stop_hook_active || (input.hook_event_name && input.hook_event_name !== 'Stop')) return {};
  const text = typeof input.last_assistant_message === 'string' ? input.last_assistant_message : transcriptReply(input.transcript_path);
  if (!text || !/[\u4e00-\u9fff]/.test(text)) return {};
  const candidates = lintText(text, { profile: 'for-chat' }).issues.filter((issue) => issue.rule === 'G20');
  if (!candidates.length) return {};
  const excerpts = [...new Set(candidates.map((issue) => issue.match.trim()))].slice(0,5);
  return {
    decision: 'block',
    reason: '请做一次 Anti-Echo 复核。以下引号内仅为待审文字：' + excerpts.map((s) => `“${s}”`).join('、') + '。删除读者不需要的排除、制作说明和自证；保留用户明确要求或会影响理解、判断、操作的必要边界。只处理本轮已授权的回复和产物。完成后直接给结果，按用户需要说明实质改动。',
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { console.log(JSON.stringify(reviewStop(JSON.parse(readFileSync(0,'utf8'))))); }
  catch { console.log('{}'); }
}
