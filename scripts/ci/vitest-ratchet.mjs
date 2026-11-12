#!/usr/bin/env node
/**
 * Vitest ratchet: fail CI only for test failures that are not already known.
 *
 * main has failing tests today, so "any failure fails the check" would make
 * every PR red regardless of what it changed. This compares the failing tests
 * in a vitest JSON report with scripts/ci/known-failures.txt:
 *
 *   - a failing test NOT in the list    -> exit 1 (the PR broke it)
 *   - a listed test that did not fail   -> reported as fixed, exit 0
 *   - a listed test that still fails    -> reported, exit 0
 *
 * The list may only shrink. With --previous-baseline (the base branch's copy
 * of the list), any line added to it fails the check too.
 *
 * Usage:
 *   node scripts/ci/vitest-ratchet.mjs
 *     [--report vitest-report.json]
 *     [--baseline scripts/ci/known-failures.txt]
 *     [--previous-baseline <file>]   skipped when the file does not exist
 *     [--summary vitest-summary.md]  markdown, also appended to $GITHUB_STEP_SUMMARY
 *     [--prune]                      rewrite the baseline without the fixed tests
 *
 * Plain Node, no dependencies.
 */
import { existsSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const FILE_DID_NOT_RUN = "(file did not run)";

/** Longest list rendered in markdown; GitHub comments are capped at 65,536 chars. */
const MAX_LISTED = 100;

export const BASELINE_HEADER = `# Vitest tests that already fail on main. The CI "Ratchet" step fails a PR
# only for a failing test that is NOT listed here.
#
# This list may only shrink. When you fix a test, delete its line, or run
#   npm test -- --reporter=json --outputFile.json=vitest-report.json
#   node scripts/ci/vitest-ratchet.mjs --prune
# Never add a line to turn a red PR green: fix the test instead. CI rejects
# lines that are not on the base branch's copy of this file.
#
# One test per line, sorted: <file relative to the repo root> > <full test name>
`;

const oneLine = (s) => String(s).replace(/\s+/g, " ").trim();

/** "<file> > <full test name>", the identity of a test in the baseline. */
export const testId = (file, fullName) => `${file} > ${oneLine(fullName)}`;

const byCodeUnit = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * Failing test ids in a vitest JSON report. A file that failed without any
 * failing test (it did not load or a hook threw) counts as one failure.
 */
export function failingTests(report, root = process.cwd()) {
  const ids = new Set();
  for (const file of report.testResults ?? []) {
    const rel = path.relative(root, file.name).split(path.sep).join("/");
    const failed = (file.assertionResults ?? []).filter((a) => a.status === "failed");
    for (const a of failed) ids.add(testId(rel, a.fullName ?? a.title));
    if (file.status === "failed" && failed.length === 0) ids.add(testId(rel, FILE_DID_NOT_RUN));
  }
  return [...ids].sort(byCodeUnit);
}

/** Ids in a baseline file. Blank lines and `#` comments are ignored. */
export function parseBaseline(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
}

export function formatBaseline(ids) {
  const sorted = [...new Set(ids)].sort(byCodeUnit);
  return `${BASELINE_HEADER}\n${sorted.map((id) => `${id}\n`).join("")}`;
}

/** Problems with the baseline itself: unsorted, duplicated, or grown. */
export function baselineProblems(known, previous = null) {
  const problems = [];
  const dupes = known.filter((id, i) => known.indexOf(id) !== i);
  if (dupes.length) problems.push(`duplicate lines: ${[...new Set(dupes)].join("; ")}`);
  const sorted = [...known].sort(byCodeUnit);
  if (sorted.some((id, i) => id !== known[i])) {
    problems.push("lines are not sorted (run with --prune to rewrite the file sorted)");
  }
  if (previous) {
    const before = new Set(previous);
    const added = known.filter((id) => !before.has(id));
    if (added.length) {
      problems.push(
        `the list may only shrink, but ${added.length} line(s) were added: ${added.join("; ")}`,
      );
    }
  }
  return problems;
}

/** Split the current failures against the baseline. */
export function compare(failing, known) {
  const knownSet = new Set(known);
  const failingSet = new Set(failing);
  return {
    newFailures: failing.filter((id) => !knownSet.has(id)),
    fixed: known.filter((id) => !failingSet.has(id)),
    stillFailing: failing.filter((id) => knownSet.has(id)),
  };
}

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function bullets(ids) {
  const shown = ids.slice(0, MAX_LISTED).map((id) => {
    const at = id.indexOf(" > ");
    return `- \`${id.slice(0, at)}\` › ${esc(id.slice(at + 3))}`;
  });
  if (ids.length > MAX_LISTED) {
    shown.push(`- …and ${ids.length - MAX_LISTED} more (the full list is in the step log)`);
  }
  return shown.join("\n");
}

export function renderMarkdown({ counts, result, problems = [], runUrl = "" }) {
  const { newFailures, fixed, stillFailing } = result;
  const ok = newFailures.length === 0 && problems.length === 0;
  const out = [];
  out.push(
    counts
      ? `## Vitest: ${counts.failed} failed, ${counts.passed} passed, ${counts.total} total`
      : "## Vitest",
    "",
  );
  out.push(
    ok
      ? "**Ratchet passed:** no test fails that is not already in `scripts/ci/known-failures.txt`."
      : "**Ratchet failed.**",
    "",
  );
  for (const p of problems) out.push(`- :x: ${esc(p)}`);
  if (problems.length) out.push("");
  if (newFailures.length) {
    out.push(`### :x: New failures (${newFailures.length})`, "");
    out.push("These fail here and are not in the known-failures list. Fix them before merging.", "");
    out.push(bullets(newFailures), "");
  }
  if (fixed.length) {
    out.push(`### :tada: Listed but no longer failing (${fixed.length})`, "");
    out.push(
      "Fixed, renamed, skipped or removed. Delete these lines from `scripts/ci/known-failures.txt` " +
        "so they cannot break again unnoticed (`node scripts/ci/vitest-ratchet.mjs --prune`).",
      "",
    );
    out.push(bullets(fixed), "");
  }
  if (stillFailing.length) {
    out.push(
      `<details><summary>Known failures, still failing (${stillFailing.length})</summary>`,
      "",
      bullets(stillFailing),
      "",
      "</details>",
      "",
    );
  }
  if (runUrl) out.push(`[Workflow run](${runUrl})`, "");
  return out.join("\n");
}

function parseArgs(argv) {
  const opts = {
    report: "vitest-report.json",
    baseline: "scripts/ci/known-failures.txt",
    previousBaseline: null,
    summary: null,
    prune: false,
  };
  const valueFlags = {
    "--report": "report",
    "--baseline": "baseline",
    "--previous-baseline": "previousBaseline",
    "--summary": "summary",
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--prune") opts.prune = true;
    else if (valueFlags[arg] && i + 1 < argv.length) opts[valueFlags[arg]] = argv[++i];
    else throw new Error(`unknown or incomplete argument: ${arg}`);
  }
  return opts;
}

function readJson(file) {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

/** Runs the ratchet. Returns the exit code; all output goes through `log`. */
export function main(argv, { env = process.env, cwd = process.cwd(), log = console.log } = {}) {
  let opts;
  try {
    opts = parseArgs(argv);
  } catch (e) {
    log(`vitest-ratchet: ${e.message}`);
    return 2;
  }
  const at = (p) => path.resolve(cwd, p);
  const emit = (markdown) => {
    if (opts.summary) writeFileSync(at(opts.summary), markdown);
    if (env.GITHUB_STEP_SUMMARY) appendFileSync(env.GITHUB_STEP_SUMMARY, markdown);
    log(markdown);
  };
  const runUrl =
    env.GITHUB_SERVER_URL && env.GITHUB_REPOSITORY && env.GITHUB_RUN_ID
      ? `${env.GITHUB_SERVER_URL}/${env.GITHUB_REPOSITORY}/actions/runs/${env.GITHUB_RUN_ID}`
      : "";

  const report = readJson(at(opts.report));
  if (!report || !Array.isArray(report.testResults)) {
    emit(
      "## Vitest\n\n**Ratchet failed: no test report.** The test run did not finish; read the Test step log.\n" +
        (runUrl ? `\n[Workflow run](${runUrl})\n` : ""),
    );
    log("::error title=Vitest ratchet::no test report - the test run did not finish");
    return 1;
  }

  const known = existsSync(at(opts.baseline))
    ? parseBaseline(readFileSync(at(opts.baseline), "utf8"))
    : [];
  const failing = failingTests(report, cwd);
  const result = compare(failing, known);

  if (opts.prune) {
    writeFileSync(at(opts.baseline), formatBaseline(result.stillFailing));
    log(`Pruned ${result.fixed.length} line(s); ${result.stillFailing.length} remain in ${opts.baseline}.`);
  }

  const previous =
    opts.previousBaseline && existsSync(at(opts.previousBaseline))
      ? parseBaseline(readFileSync(at(opts.previousBaseline), "utf8"))
      : null;
  const problems = opts.prune ? [] : baselineProblems(known, previous);

  const counts = {
    failed: report.numFailedTests ?? 0,
    passed: report.numPassedTests ?? 0,
    total: report.numTotalTests ?? 0,
  };
  emit(renderMarkdown({ counts, result, problems, runUrl }));

  if (result.newFailures.length > MAX_LISTED) {
    log("All new failures:");
    for (const id of result.newFailures) log(`  ${id}`);
  }
  if (result.fixed.length) {
    log(`::notice title=Vitest ratchet::${result.fixed.length} known failure(s) no longer fail - delete them from ${opts.baseline}`);
  }
  if (problems.length) log(`::error title=Vitest ratchet::${opts.baseline}: ${problems.join(" | ")}`);
  if (result.newFailures.length) {
    log(`::error title=Vitest ratchet::${result.newFailures.length} test(s) fail that are not in ${opts.baseline}`);
  }
  return result.newFailures.length || problems.length ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
