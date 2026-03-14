#!/usr/bin/env node
/**
 * scripts/log-test-run.js
 *
 * Reads test output and appends a structured log entry to logs/test-runs.jsonl.
 * Called by CI after tests run (pass or fail), once per project per test type.
 *
 * Usage:
 *   node scripts/log-test-run.js <path-to-json> --project=<slug> [--type=jest|e2e]
 *
 * --project  Required. Short lowercase slug: portal, trackmyweek, etc.
 * --type     Optional. 'jest' (default) or 'e2e' (Playwright JSON output).
 *
 * Adding a new project requires no dashboard code changes — it appears
 * automatically in the project filter once a run is logged.
 *
 * Environment variables read:
 *   GITHUB_SHA        - commit hash
 *   GITHUB_REF_NAME   - branch name
 *   GITHUB_ACTOR      - who triggered the run
 *   GITHUB_EVENT_NAME - push | pull_request | workflow_dispatch
 */

'use strict';

const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');

// ---------------------------------------------------------------------------
// Parse args
// ---------------------------------------------------------------------------
const args       = process.argv.slice(2);
const jsonPath   = args.find(a => !a.startsWith('--'));
const projectArg = args.find(a => a.startsWith('--project='));
const typeArg    = args.find(a => a.startsWith('--type='));
const project    = projectArg ? projectArg.split('=')[1].trim() : 'unknown';
const runType    = typeArg    ? typeArg.split('=')[1].trim()    : 'jest';

if (project === 'unknown') {
  console.warn('[log-test-run] WARNING: no --project flag provided. Entry will be tagged "unknown".');
  console.warn('[log-test-run] Usage: node scripts/log-test-run.js <json> --project=<slug> [--type=jest|e2e]');
}

const REPO_ROOT = path.resolve(__dirname, '..');
const LOG_FILE  = path.join(REPO_ROOT, 'logs', 'test-runs.jsonl');

// ---------------------------------------------------------------------------
// Load JSON file — degrade gracefully if missing or malformed
// ---------------------------------------------------------------------------
let rawResults = null;

if (!jsonPath) {
  console.warn('[log-test-run] No results path provided — logging error entry.');
} else if (!fs.existsSync(jsonPath)) {
  console.warn(`[log-test-run] Results file not found: ${jsonPath} — logging error entry.`);
} else {
  try {
    rawResults = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  } catch (err) {
    console.warn(`[log-test-run] Failed to parse JSON: ${err.message} — logging error entry.`);
  }
}

// ---------------------------------------------------------------------------
// Jest parser — categorises suites into unit vs integration
// ---------------------------------------------------------------------------
function summariseJestSuites(suiteList) {
  if (!suiteList || suiteList.length === 0) {
    return { status: 'skip', passed: 0, failed: 0, skipped: 0, duration_ms: 0, errors: [] };
  }

  let passed = 0, failed = 0, skipped = 0, duration_ms = 0;
  const errors = [];

  for (const suite of suiteList) {
    if (suite.perfStats) {
      duration_ms += (suite.perfStats.end - suite.perfStats.start);
    } else if (suite.endTime && suite.startTime) {
      duration_ms += (suite.endTime - suite.startTime);
    }

    const tests = suite.testResults || suite.assertionResults || [];
    for (const test of tests) {
      if (test.status === 'passed') {
        passed++;
      } else if (test.status === 'failed') {
        failed++;
        const msg = (test.failureMessages || []).join(' ').slice(0, 300);
        if (msg) errors.push({ test: test.fullName, message: msg });
      } else {
        skipped++;
      }
    }
  }

  return { status: failed > 0 ? 'fail' : 'pass', passed, failed, skipped, duration_ms, errors };
}

// ---------------------------------------------------------------------------
// Playwright parser — flattens suites[].specs[].tests[].results[]
// ---------------------------------------------------------------------------
function summarisePlaywright(pw) {
  if (!pw || !pw.suites) {
    return { status: 'error', passed: 0, failed: 0, skipped: 0, duration_ms: 0, errors: ['Playwright results unavailable'] };
  }

  let passed = 0, failed = 0, skipped = 0, duration_ms = 0;
  const errors = [];

  // Playwright JSON: top-level suites = files; nested suites = describe blocks
  function walkSuite(suite) {
    for (const spec of suite.specs || []) {
      for (const test of spec.tests || []) {
        // Each test can have multiple results (retries) — use the last one
        const results = test.results || [];
        const last    = results[results.length - 1];
        if (!last) continue;

        duration_ms += last.duration || 0;

        if (test.status === 'expected') {
          passed++;
        } else if (test.status === 'skipped' || test.status === 'pending') {
          skipped++;
        } else {
          failed++;
          const msg = (last.errors || []).map(e => e.message || '').join(' ').slice(0, 300);
          errors.push({ test: spec.title, message: msg || test.status });
        }
      }
    }
    for (const child of suite.suites || []) {
      walkSuite(child);
    }
  }

  for (const suite of pw.suites) {
    walkSuite(suite);
  }

  return { status: failed > 0 ? 'fail' : 'pass', passed, failed, skipped, duration_ms, errors };
}

// ---------------------------------------------------------------------------
// Build the suites object and totals based on --type
// ---------------------------------------------------------------------------
let suites, totalPassed, totalFailed, totalSkipped, totalMs, overall;

if (runType === 'e2e') {
  const e2eSummary = rawResults ? summarisePlaywright(rawResults) : {
    status: 'error', passed: 0, failed: 0, skipped: 0, duration_ms: 0,
    errors: ['Playwright results unavailable']
  };

  suites       = { e2e: e2eSummary };
  totalPassed  = e2eSummary.passed;
  totalFailed  = e2eSummary.failed;
  totalSkipped = e2eSummary.skipped;
  totalMs      = e2eSummary.duration_ms;
  overall      = !rawResults ? 'error' : totalFailed > 0 ? 'fail' : 'pass';

  console.log(`[log-test-run] e2e: ${e2eSummary.passed}p/${e2eSummary.failed}f/${e2eSummary.skipped}s`);

} else {
  // Jest mode (default)
  let unitSummary, integrationSummary;

  if (rawResults) {
    const buckets = { unit: [], integration: [] };

    for (const suite of rawResults.testResults || []) {
      if (!suite) continue;
      const suitePath = suite.testFilePath || suite.name;
      if (!suitePath) continue;
      const rel = suitePath.replace(REPO_ROOT, '').replace(/\\/g, '/');
      if      (rel.includes('/unit/'))        buckets.unit.push(suite);
      else if (rel.includes('/integration/')) buckets.integration.push(suite);
    }

    unitSummary        = summariseJestSuites(buckets.unit);
    integrationSummary = summariseJestSuites(buckets.integration);
  } else {
    const err = { status: 'error', passed: 0, failed: 0, skipped: 0, duration_ms: 0, errors: ['Jest results unavailable'] };
    unitSummary        = err;
    integrationSummary = err;
  }

  suites       = { unit: unitSummary, integration: integrationSummary };
  totalPassed  = unitSummary.passed  + integrationSummary.passed;
  totalFailed  = unitSummary.failed  + integrationSummary.failed;
  totalSkipped = unitSummary.skipped + integrationSummary.skipped;
  totalMs      = unitSummary.duration_ms + integrationSummary.duration_ms;
  overall      = !rawResults ? 'error' : totalFailed > 0 ? 'fail' : 'pass';

  console.log(`[log-test-run] unit: ${unitSummary.passed}p/${unitSummary.failed}f  integration: ${integrationSummary.passed}p/${integrationSummary.failed}f`);
}

// ---------------------------------------------------------------------------
// Build and append log entry
// ---------------------------------------------------------------------------
const entry = {
  runId:       crypto.randomUUID(),
  timestamp:   new Date().toISOString(),
  project,
  runType,
  trigger:     process.env.GITHUB_EVENT_NAME || 'manual',
  branch:      process.env.GITHUB_REF_NAME   || 'unknown',
  commit:      (process.env.GITHUB_SHA || 'unknown').slice(0, 7),
  actor:       process.env.GITHUB_ACTOR      || 'unknown',
  suites,
  overall,
  totalPassed,
  totalFailed,
  totalSkipped,
  duration_ms: totalMs,
};

try {
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n', 'utf8');
  console.log(`[log-test-run] project=${project} type=${runType} run=${entry.runId} overall=${entry.overall}`);
} catch (err) {
  console.error('[log-test-run] Failed to write log entry:', err.message);
  process.exit(1);
}
