/**
 * Clean, comprehensive E2E Test Suite Runner for GymFlow Mobile.
 * Executes tests across all 4 tiers, collects results, and outputs a formatted report.
 * Usage: node --experimental-strip-types tests/e2e/run-all.ts [--tier=1|2|3|4|all]
 */

import { readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { run } from 'node:test';

interface TierDef {
  name: string;
  dir: string;
  targetCount: number;
}

const TIERS: Record<string, TierDef> = {
  tier1: {
    name: 'Tier 1: Feature Coverage',
    dir: 'tier1_feature_coverage',
    targetCount: 115,
  },
  tier2: {
    name: 'Tier 2: Boundary & Corner Cases',
    dir: 'tier2_boundary_corner',
    targetCount: 115,
  },
  tier3: {
    name: 'Tier 3: Cross-Feature Interactions',
    dir: 'tier3_cross_feature',
    targetCount: 23,
  },
  tier4: {
    name: 'Tier 4: Real-World Application Scenarios',
    dir: 'tier4_application_scenarios',
    targetCount: 5,
  },
};

// ANSI escape codes for clean terminal reporting
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

async function main() {
  const args = process.argv.slice(2);
  const tierArg = args.find((a) => a.startsWith('--tier='))?.split('=')[1] || 'all';

  const baseDir = resolve('tests/e2e');
  console.log(`\n${BOLD}${CYAN}=================================================================${RESET}`);
  console.log(`${BOLD}${CYAN}          GYMFLOW MOBILE — OPAQUE-BOX E2E TEST RUNNER            ${RESET}`);
  console.log(`${BOLD}${CYAN}=================================================================${RESET}\n`);

  const activeTiers =
    tierArg === 'all'
      ? Object.entries(TIERS)
      : Object.entries(TIERS).filter(([key]) => key.endsWith(tierArg));

  let totalPass = 0;
  let totalFail = 0;
  let totalTests = 0;
  const startTime = Date.now();
  const tierResults: { name: string; pass: number; fail: number; total: number; durationMs: number }[] = [];

  for (const [key, tier] of activeTiers) {
    const tierDir = join(baseDir, tier.dir);
    const files = readdirSync(tierDir)
      .filter((f) => f.endsWith('.test.ts'))
      .map((f) => join(tierDir, f));

    console.log(`${BOLD}${YELLOW}► Running ${tier.name}...${RESET} (${files.length} test files)`);
    const tierStartTime = Date.now();
    let tierPass = 0;
    let tierFail = 0;

    const testStream = run({
      files,
      concurrency: 1, // Sequential for deterministic logging
    });

    for await (const event of testStream) {
      if (event.type === 'test:pass') {
        tierPass++;
        process.stdout.write(`${GREEN}.${RESET}`);
      } else if (event.type === 'test:fail') {
        tierFail++;
        process.stdout.write(`${RED}F${RESET}`);
        console.error(`\n  ${RED}✖ [FAIL]${RESET} ${event.data?.name}`);
        if (event.data?.details?.error) {
          console.error(`    ${event.data.details.error.message}`);
        }
      }
    }

    const tierDuration = Date.now() - tierStartTime;
    console.log(
      `\n  ${tierPass === tierPass + tierFail ? GREEN : RED}Result: ${tierPass}/${tierPass + tierFail} passed (${tierDuration}ms)${RESET}\n`
    );

    tierResults.push({
      name: tier.name,
      pass: tierPass,
      fail: tierFail,
      total: tierPass + tierFail,
      durationMs: tierDuration,
    });

    totalPass += tierPass;
    totalFail += tierFail;
    totalTests += tierPass + tierFail;
  }

  const totalDuration = Date.now() - startTime;

  // ── Print Final Summary Table ───────────────────────────────────────
  console.log(`${BOLD}${CYAN}-----------------------------------------------------------------${RESET}`);
  console.log(`${BOLD}                     E2E TEST EXECUTION SUMMARY                  ${RESET}`);
  console.log(`${BOLD}${CYAN}-----------------------------------------------------------------${RESET}`);
  console.log(` ${'Tier Name'.padEnd(42)} | ${'Pass'.padStart(5)} | ${'Fail'.padStart(5)} | ${'Status'.padStart(8)} `);
  console.log(`${CYAN}-----------------------------------------------------------------${RESET}`);

  for (const r of tierResults) {
    const status = r.fail === 0 && r.pass > 0 ? `${GREEN}PASS${RESET}` : `${RED}FAIL${RESET}`;
    console.log(
      ` ${r.name.padEnd(42)} | ${r.pass.toString().padStart(5)} | ${r.fail.toString().padStart(5)} | ${status.padStart(17)} `
    );
  }

  console.log(`${BOLD}${CYAN}-----------------------------------------------------------------${RESET}`);
  const passRate = totalTests > 0 ? Math.round((totalPass / totalTests) * 100) : 0;
  console.log(
    ` ${BOLD}${'TOTAL'.padEnd(42)}${RESET} | ${totalPass.toString().padStart(5)} | ${totalFail
      .toString()
      .padStart(5)} | ${BOLD}${passRate === 100 ? GREEN : RED}${passRate}% PASS${RESET} `
  );
  console.log(`${BOLD}${CYAN}=================================================================${RESET}`);
  console.log(` Execution finished in ${(totalDuration / 1000).toFixed(2)}s\n`);

  if (totalFail > 0) {
    console.error(`${BOLD}${RED}TEST RUN FAILED with ${totalFail} failure(s).${RESET}\n`);
    process.exit(1);
  } else {
    console.log(`${BOLD}${GREEN}ALL ${totalPass} E2E TESTS PASSED SUCCESSFULLY! (100% pass rate)${RESET}\n`);
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal runner error:', err);
  process.exit(1);
});
