import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  FILE_DID_NOT_RUN,
  baselineProblems,
  compare,
  failingTests,
  formatBaseline,
  main,
  parseBaseline,
} from "../vitest-ratchet.mjs";

const ROOT = path.resolve("/repo");

/** A vitest JSON report: { "<file>": { "<full name>": "passed" | "failed" } }. */
function report(files, fileStatus = {}) {
  const testResults = Object.entries(files).map(([file, tests]) => {
    const assertionResults = Object.entries(tests).map(([fullName, status]) => ({
      fullName,
      title: fullName,
      status,
    }));
    const failed = assertionResults.some((a) => a.status === "failed");
    return {
      name: path.join(ROOT, file),
      status: fileStatus[file] ?? (failed ? "failed" : "passed"),
      assertionResults,
    };
  });
  const all = testResults.flatMap((f) => f.assertionResults);
  return {
    numFailedTests: all.filter((a) => a.status === "failed").length,
    numPassedTests: all.filter((a) => a.status === "passed").length,
    numTotalTests: all.length,
    testResults,
  };
}

describe("failingTests", () => {
  it("names each failing test by repo-relative file and full name, sorted", () => {
    const r = report({
      "src/b.test.ts": { "B suite fails": "failed", "B suite passes": "passed" },
      "src/a.test.ts": { "A fails\n  across lines": "failed" },
    });
    expect(failingTests(r, ROOT)).toEqual([
      "src/a.test.ts > A fails across lines",
      "src/b.test.ts > B suite fails",
    ]);
  });

  it("counts a file that failed to run as one failure", () => {
    const r = report({ "src/broken.test.ts": {} }, { "src/broken.test.ts": "failed" });
    expect(failingTests(r, ROOT)).toEqual([`src/broken.test.ts > ${FILE_DID_NOT_RUN}`]);
  });
});

describe("compare", () => {
  const known = ["src/a.test.ts > old failure", "src/a.test.ts > fixed now"];

  it("reports a failure that is not in the baseline as new", () => {
    const r = compare(["src/a.test.ts > old failure", "src/b.test.ts > new failure"], known);
    expect(r.newFailures).toEqual(["src/b.test.ts > new failure"]);
  });

  it("reports a listed test that no longer fails as fixed, without calling it new", () => {
    const r = compare(["src/a.test.ts > old failure"], known);
    expect(r.newFailures).toEqual([]);
    expect(r.fixed).toEqual(["src/a.test.ts > fixed now"]);
  });

  it("reports nothing new or fixed when the failures are unchanged", () => {
    const r = compare([...known], known);
    expect(r).toEqual({ newFailures: [], fixed: [], stillFailing: known });
  });
});

describe("baseline file", () => {
  it("round-trips through format and parse, skipping the # header", () => {
    const text = formatBaseline(["src/b.test.ts > b", "src/a.test.ts > a", "src/a.test.ts > a"]);
    expect(text.startsWith("#")).toBe(true);
    expect(parseBaseline(text)).toEqual(["src/a.test.ts > a", "src/b.test.ts > b"]);
  });

  it("rejects lines added since the base branch's copy, and unsorted lines", () => {
    expect(baselineProblems(["a > 1", "b > 2"], ["a > 1", "b > 2"])).toEqual([]);
    expect(baselineProblems(["a > 1"], ["a > 1", "b > 2"])).toEqual([]);
    expect(baselineProblems(["a > 1", "c > 3"], ["a > 1"])).toEqual([
      "the list may only shrink, but 1 line(s) were added: c > 3",
    ]);
    expect(baselineProblems(["b > 2", "a > 1"])).toEqual([
      "lines are not sorted (run with --prune to rewrite the file sorted)",
    ]);
  });
});

describe("main", () => {
  let dir;
  let logs;
  const log = (line) => logs.push(line);
  const run = (args, env = {}) => main(args, { cwd: dir, env, log });

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), "vitest-ratchet-"));
    logs = [];
    writeFileSync(
      path.join(dir, "known-failures.txt"),
      formatBaseline(["src/a.test.ts > known", "src/a.test.ts > will be fixed"]),
    );
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  const writeReport = (tests) => {
    const r = report({ "src/a.test.ts": tests });
    for (const f of r.testResults) f.name = path.join(dir, "src/a.test.ts");
    writeFileSync(path.join(dir, "report.json"), JSON.stringify(r));
  };
  const args = ["--report", "report.json", "--baseline", "known-failures.txt", "--summary", "summary.md"];

  it("exits 1 on a new failure and lists it in the summary and $GITHUB_STEP_SUMMARY", () => {
    writeReport({ known: "failed", "will be fixed": "failed", "brand new": "failed" });
    const stepSummary = path.join(dir, "step-summary.md");
    expect(run(args, { GITHUB_STEP_SUMMARY: stepSummary })).toBe(1);
    const md = readFileSync(path.join(dir, "summary.md"), "utf8");
    expect(md).toContain("### :x: New failures (1)");
    expect(md).toContain("- `src/a.test.ts` › brand new");
    expect(readFileSync(stepSummary, "utf8")).toBe(md);
  });

  it("exits 0 when a known failure is fixed, and lists it as fixed", () => {
    writeReport({ known: "failed", "will be fixed": "passed" });
    expect(run(args)).toBe(0);
    const md = readFileSync(path.join(dir, "summary.md"), "utf8");
    expect(md).toContain("Listed but no longer failing (1)");
    expect(md).toContain("› will be fixed");
    expect(md).not.toContain("New failures");
  });

  it("exits 0 when the failures are exactly the known ones", () => {
    writeReport({ known: "failed", "will be fixed": "failed", other: "passed" });
    expect(run(args)).toBe(0);
    const md = readFileSync(path.join(dir, "summary.md"), "utf8");
    expect(md).toContain("## Vitest: 2 failed, 1 passed, 3 total");
    expect(md).toContain("**Ratchet passed:**");
    expect(md).toContain("Known failures, still failing (2)");
  });

  it("exits 1 when the report is missing, because the test run did not finish", () => {
    expect(run(args)).toBe(1);
    expect(readFileSync(path.join(dir, "summary.md"), "utf8")).toContain("no test report");
  });

  it("exits 1 when the baseline grew compared with the base branch", () => {
    writeReport({ known: "failed", "will be fixed": "failed" });
    writeFileSync(path.join(dir, "base.txt"), formatBaseline(["src/a.test.ts > known"]));
    expect(run([...args, "--previous-baseline", "base.txt"])).toBe(1);
    expect(readFileSync(path.join(dir, "summary.md"), "utf8")).toContain("may only shrink");
  });

  it("skips the growth check when the base branch has no baseline yet", () => {
    writeReport({ known: "failed", "will be fixed": "failed" });
    expect(run([...args, "--previous-baseline", "missing.txt"])).toBe(0);
  });

  it("--prune drops the fixed lines and keeps the rest", () => {
    writeReport({ known: "failed", "will be fixed": "passed" });
    expect(run([...args, "--prune"])).toBe(0);
    const text = readFileSync(path.join(dir, "known-failures.txt"), "utf8");
    expect(parseBaseline(text)).toEqual(["src/a.test.ts > known"]);
  });
});
