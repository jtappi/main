#!/usr/bin/env node
/**
 * scripts/log-test-run.js
 *
 * Reads Jest JSON output and appends a structured log entry to logs/test-runs.jsonl.
 * Called by CI after tests run (pass or fail).
 *
 * Usage:
 *   node scripts/log-test-run.js <path-to-jest-json>
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

const jestJsonPath = process.argv[2];
const REPO_ROOT    = path.resolve(__dirname, '..');
const LOG_FILE     = path.join(REPO_ROOT, 'logs', 'test-runs.jsonl');

// ---------------------------------------------------------------------------
// Parse Jest JSON — degrade gracefully if missing or malformed
// ---------------------------------------------------------------------------
let jestResults = null;

if (!jestJsonPath) {
  console.warn('[log-test-run] No jest results path provided — logging error entry.');
} else if (!fs.existsSync(jestJsonPath)) {
  console.warn(`[log-test-run] Jest results file not found: ${jestJsonPath} — logging error entry.`);
} else {
  try {
    jestResults = JSON.parse(fs.readFileSync(jestJsonPath, 'utf8'));
  } catch (err) {
    console.warn(`[log-test-run] Failed to parse Jest JSON: ${err.message} — logging error entry.`);
  }
}

// ---------------------------------------------------------------------------
// Categorise suites into unit vs integration
// ---------------------------------------------------------------------------
function summariseSuites(suiteList) {
  if (!suiteList || suiteList.length === 0) {
    return { status: 'skip', passed: 0, failed: 0, skipped: 0, duration_ms: 0, errors: [] };
  }

  let passed = 0, failed = 0, skipped = 0, duration_ms = 0;
  const errors = [];

  for (const suite of suiteList) {
    duration_ms += suite.perfStats
      ? (suite.perfStats.end - suite.perfStats.start)
      : 0;
    for (const test of suite.testResults || []) {
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

let unitSummary, integrationSummary;

if (jestResults) {
  const buckets = { unit: [], integration: [] };

  for (const suite of jestResults.testResults || []) {
    // Skip anything without a testFilePath (CI often produces these)
    if (!suite || !suite.testFilePath) {
      console.warn("Skipping suite with no testFilePath:", suite);
      continue;
    }

    const rel = suite.testFilePath
      .replace(REPO_ROOT, '')
      .replace(/\\/g, '/');

    if (rel.includes('/unit/')) {
      buckets.unit.push(suite);
    } else if (rel.includes('/integration/')) {
      buckets.integration.push(suite);
    }
  }

  unitSummary        = summariseSuites(buckets.unit);
  integrationSummary = summariseSuites(buckets.integration);

} else {
  const err = { status: 'error', passed: 0, failed: 0, skipped: 0, duration_ms: 0, errors: ['Jest results unavailable'] };
  unitSummary        = err;
  integrationSummary = err;
}

const totalPassed  = unitSummary.passed  + integrationSummary.passed;
const totalFailed  = unitSummary.failed  + integrationSummary.failed;
const totalSkipped = unitSummary.skipped + integrationSummary.skipped;
const totalMs      = unitSummary.duration_ms + integrationSummary.duration_ms;

// ---------------------------------------------------------------------------
// Build and append log entry
// ---------------------------------------------------------------------------
const entry = {
  runId:       crypto.randomUUID(),
  timestamp:   new Date().toISOString(),
  trigger:     process.env.GITHUB_EVENT_NAME || 'manual',
  branch:      process.env.GITHUB_REF_NAME  || 'unknown',
  commit:      (process.env.GITHUB_SHA || 'unknown').slice(0, 7),
  actor:       process.env.GITHUB_ACTOR     || 'unknown',
  suites: {
    unit:        unitSummary,
    integration: integrationSummary
  },
  overall:     !jestResults ? 'error' : totalFailed > 0 ? 'fail' : 'pass',
  totalPassed,
  totalFailed,
  totalSkipped,
  duration_ms: totalMs
};

try {
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n', 'utf8');
  console.log(`[log-test-run] Logged run ${entry.runId} — overall: ${entry.overall}`);
  console.log(`[log-test-run] unit: ${unitSummary.passed}p/${unitSummary.failed}f  integration: ${integrationSummary.passed}p/${integrationSummary.failed}f`);
} catch (err) {
  console.error('[log-test-run] Failed to write log entry:', err.message);
  process.exit(1);
}
