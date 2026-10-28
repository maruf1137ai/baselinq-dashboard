/**
 * One hue per meaning.
 *
 * `badge.tsx` codified the status ramp — 50 fill / 200 border / 700 ink, with
 * green for success, amber for warning, red for danger, blue for info — after
 * 31 call sites had hand-rolled their own. The ramp held; the HUES did not. A
 * sweep of the source found seventeen distinct palette hues in use, including
 * five straight duplicates of a meaning that already had a colour:
 *
 *   emerald  73 uses, on the identical 50/200/700 ramp as green
 *   orange   47 uses, on the identical ramp as amber
 *   slate    20 uses, gray
 *   rose      6 uses, red
 *   yellow    3 uses, amber
 *
 * That is why a Risk Forecast severity chip and a status badge two panels
 * away could be the same severity in two different greens. The duplicates are
 * merged; this keeps them merged.
 *
 * NOT banned, and deliberately: `cyan`, `teal`, `pink`, `stone` and `violet`
 * in `DocumentTable`. Those encode DOCUMENT TYPE, which is a categorical
 * scale — a categorical scale needs hues distinguishable from each other, and
 * reusing the four semantic hues for it would make a drawing look like a
 * warning. They stay on the same 50/200/700 ramp, which is what makes them
 * read as part of the same system.
 *
 * `indigo` and `purple` are also left: they are the AI accents and sit near
 * `--primary` (#6c5ce7). They should become the primary token rather than a
 * near-miss hue, but that is a change to what they MEAN, not a rename, so it
 * is not something a regex should do quietly.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? walk(join(dir, e.name))
      : e.name.endsWith(".tsx")
        ? [join(dir, e.name)]
        : [],
  );
}

const SRC = join(process.cwd(), "src");
/*
  Files holding a CATEGORICAL scale, exempt by name.

  `DocumentTable` maps thirteen disciplines to thirteen swatches. Green there
  does not mean "good", it means "Mechanical" — so it needs more hues than
  the four semantic ones, and merging its duplicates is actively wrong: doing
  exactly that collapsed Mechanical onto Environmental and Health & Safety
  onto Architectural, rendering two pairs of disciplines identically.
*/
const CATEGORICAL = new Set(["components/documents/DocumentTable.tsx"]);

const files = walk(SRC)
  .map((f) => ({ name: f.replace(SRC + "/", ""), src: readFileSync(f, "utf8") }))
  .filter((f) => !CATEGORICAL.has(f.name));

/** Retired hue -> the hue that already carries that meaning. */
const RETIRED: Record<string, string> = {
  emerald: "green",
  orange: "amber",
  yellow: "amber",
  rose: "red",
  slate: "gray",
};

describe("colour palette", () => {
  it("has files to check", () => {
    // Guards against the walk silently matching nothing, which would make
    // every assertion below pass vacuously.
    expect(files.length).toBeGreaterThan(50);
  });

  it.each(Object.entries(RETIRED))(
    "uses no %s — that meaning is carried by %s",
    (retired, canonical) => {
      const pattern = new RegExp(
        `(?:bg|text|border|ring|fill|stroke|from|to)-${retired}-\\d{2,3}`,
      );
      const offenders = files.filter((f) => pattern.test(f.src)).map((f) => f.name);
      expect(offenders, `use ${canonical} instead of ${retired}`).toEqual([]);
    },
  );
});
