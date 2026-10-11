#!/usr/bin/env node
// Compatibility entrypoint for existing hook registrations. Chat review happens before delivery.
import { readFileSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export function reviewStop() { return {}; }

let direct = false;
try { direct = !!process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url); }
catch { /* Imports from stdin or an eval have no entrypoint file. */ }

if (direct) {
  try { readFileSync(0, 'utf8'); } catch { /* Drain the hook input when stdin is available. */ }
  console.log('{}');
}
