// CLI and standalone skill bundles use the same source files.
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

export const SKILL_FILES = [
  'SKILL.md', 'ONBOARDING.md', 'WEB.md', 'README.md', 'README.en.md', 'LICENSE', 'LICENSE-CODE',
  'rules', 'dictionary', 'snippets', 'tools/meta.mjs', 'tools/cli.mjs',
  'tools/skill-files.mjs', 'tools/README.md', 'tools/check/src', 'tools/check/data',
  'tools/init/src', 'tools/hooks',
];

export function skillFiles(root) {
  const walk = (rel) => {
    const abs = join(root, rel);
    if (!existsSync(abs)) throw new Error(`Skill source is missing: ${rel}`);
    if (!statSync(abs).isDirectory()) return [rel];
    return readdirSync(abs).sort().flatMap((name) => walk(join(rel, name)));
  };
  return SKILL_FILES.flatMap(walk);
}
