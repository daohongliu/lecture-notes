// Runs the Claude Code binary that ships with the Agent SDK, e.g. `npm run login` → `claude auth login`.
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const pkg = `@anthropic-ai/claude-agent-sdk-${process.platform}-${process.arch}`;
let bin;
try { bin = path.join(path.dirname(require.resolve(pkg + '/package.json')), 'claude'); }
catch { console.error(`Couldn't find ${pkg}. Run npm install first.`); process.exit(1); }
const r = spawnSync(bin, process.argv.slice(2), { stdio: 'inherit' });
process.exit(r.status ?? 1);
