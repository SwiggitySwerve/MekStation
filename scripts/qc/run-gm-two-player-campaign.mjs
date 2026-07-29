import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { runCli } = require('./gm-two-player-campaign-core.cjs');
const repoRoot = fileURLToPath(new URL('../..', import.meta.url));
process.exit(await runCli(process.argv.slice(2), repoRoot));
