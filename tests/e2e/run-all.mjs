/**
 * Convenience ESM entry point for running the GymFlow Mobile E2E Test Suite.
 * Usage: node tests/e2e/run-all.mjs [--tier=1|2|3|4|all]
 */

import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

const runnerTs = resolve('tests/e2e/run-all.ts');
const args = ['--experimental-strip-types', runnerTs, ...process.argv.slice(2)];

const child = spawn(process.execPath, args, {
  stdio: 'inherit',
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
