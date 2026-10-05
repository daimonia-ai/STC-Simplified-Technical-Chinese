// Converts dictionary/*.yaml into data/*.json so the linter has no runtime dependencies.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const here = dirname(fileURLToPath(import.meta.url));
const dictionaryDir = join(here, '..', '..', '..', 'dictionary');
const outDir = join(here, '..', 'data');
mkdirSync(outDir, { recursive: true });

for (const name of ['avoid', 'recommended']) {
  const entries = parse(readFileSync(join(dictionaryDir, `${name}.yaml`), 'utf8'));
  writeFileSync(join(outDir, `${name}.json`), JSON.stringify(entries, null, 2) + '\n');
  console.log(`${name}.json：${entries.length} 条`);
}
