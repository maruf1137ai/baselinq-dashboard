/**
 * Empty states stay one shape.
 *
 * `EmptyState` already fixes the type scale — `text-sm font-medium
 * text-foreground` for the title, `text-xs text-muted-foreground` for the
 * description — so anything that looks different is a call site that either
 * bypassed the component or fed it too much text. A sweep found both:
 *
 *   - `chatSidebar` hand-rolled its own from two bare `<p>`s inside a
 *     `text-muted-foreground text-sm` wrapper, so "No channels yet" rendered
 *     grey and regular-weight next to every other empty state's near-black
 *     medium. That is the "different colour and boldness".
 *
 *   - 32 of 70 descriptions ran past 110 characters, four past 150 and one to
 *     205. At `max-w-sm` that is three and four lines of centred prose, which
 *     is what made three empty regions on three pages look like three
 *     different components.
 *
 *   - 15 rendered with no icon at all while 54 had one, so the blocks were
 *     different heights before a word was read.
 *
 * These assertions read the source rather than the DOM: what is being checked
 * IS the call site, and rendering each of seventy in a router and a query
 * client would test the harness, not the rule.
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
const files = walk(SRC)
  .filter((f) => !f.includes("__tests__"))
  .map((f) => ({ name: f.replace(SRC + "/", ""), src: readFileSync(f, "utf8") }));

/**
 * One sentence. 110 characters is roughly two lines at `max-w-sm`, which is
 * as much as a block whose whole job is "there is nothing here" should take.
 */
const MAX_DESCRIPTION = 110;

const withEmptyState = files.filter((f) => f.src.includes("<EmptyState"));

describe("EmptyState call sites", () => {
  it("finds the call sites", () => {
    // Guards against the walk matching nothing and everything below passing
    // vacuously.
    expect(withEmptyState.length).toBeGreaterThan(20);
  });

  it("keeps every description to one sentence", () => {
    const tooLong: string[] = [];
    for (const f of withEmptyState) {
      /*
        BOTH quote styles, and every string inside a `description={…}`
        expression — not just the first double-quoted one.

        The first version of this matched double quotes only. Finance's cost
        ledger writes its copy as a single-quoted ternary, so a 165-character
        description sat on the page while this test reported the rule as
        held. A guard that cannot see half the call sites is worse than none,
        because it is believed.
      */
      const re = /description=(?:"([^"]+)"|'([^']+)'|\{([\s\S]{0,400}?)\})/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(f.src))) {
        const literal = m[1] ?? m[2];
        const candidates = literal
          ? [literal]
          : [...(m[3] ?? "").matchAll(/["']([^"']{40,})["']/g)].map((x) => x[1]);
        for (const d of candidates) {
          if (d.length > MAX_DESCRIPTION) {
            tooLong.push(`${f.name}: ${d.length} chars — "${d.slice(0, 60)}…"`);
          }
        }
      }
    }
    expect(tooLong).toEqual([]);
  });

  it("gives every empty state an icon", () => {
    const bare: string[] = [];
    for (const f of withEmptyState) {
      for (const m of f.src.matchAll(/<EmptyState\b[\s\S]*?\/>/g)) {
        if (!m[0].includes("icon=")) bare.push(f.name);
      }
    }
    expect(bare).toEqual([]);
  });
});
