/**
 * Charts for the admin dashboard — hand-drawn SVG, not recharts, for the
 * bundle-size reason in StatusBand.tsx (recharts is imported by nothing else).
 *
 *   TrendChart  the dashboard's one large chart: an area over time with a
 *               crosshair and tooltip on hover (and arrow keys when focused).
 *   Sparkline   a tiny trend inside a card or row — no axes, no interaction;
 *               the number beside it is the figure, this is its shape.
 *
 * Colour follows the app's visualisation tokens (index.css): the series wears
 * --viz-brand, guides --viz-rule, the crosshair --viz-ink. The area fill is a
 * purple tint under a purple line — one datum, one hue — as on StatusBand.
 *
 * The curve is monotone cubic (Fritsch–Carlson): smooth, but it never
 * overshoots a data point, so it cannot draw a peak or a dip that is not in
 * the data.
 */
import React, { useEffect, useId, useRef, useState } from "react";
import { format } from "date-fns";

export type BucketKind = "day" | "week" | "month";

export interface TrendPoint {
  start: string; // ISO date the bucket begins
  value: number;
}

/** "4 Nov 2026" / "Week of 3 Nov" / "November 2026". */
export function bucketLabel(start: string, kind: BucketKind): string {
  const d = new Date(`${start}T00:00:00`);
  if (kind === "month") return format(d, "MMMM yyyy");
  if (kind === "week") return `Week of ${format(d, "d MMM")}`;
  return format(d, "d MMM yyyy");
}

function axisLabel(start: string, kind: BucketKind): string {
  const d = new Date(`${start}T00:00:00`);
  return kind === "month" ? format(d, "MMM") : format(d, "d MMM");
}

/** Width of the container, kept in step with resizes. */
function useWidth<T extends HTMLElement>(): [React.RefObject<T>, number] {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth);
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
}

/** A round number at or above `n`, so the top gridline lands on a readable value. */
function niceMax(n: number): number {
  if (n <= 0) return 1;
  const mag = 10 ** Math.floor(Math.log10(n));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * mag >= n) ?? 10;
  return step * mag;
}

/** Monotone cubic path through `pts` (Fritsch–Carlson), so it never overshoots. */
function monotonePath(pts: [number, number][]): string {
  const n = pts.length;
  if (n === 0) return "";
  if (n === 1) return `M${pts[0][0]},${pts[0][1]}`;
  const dx: number[] = [];
  const slope: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx.push(pts[i + 1][0] - pts[i][0]);
    slope.push((pts[i + 1][1] - pts[i][1]) / (dx[i] || 1));
  }
  const m: number[] = [slope[0]];
  for (let i = 1; i < n - 1; i++) {
    m.push(slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2);
  }
  m.push(slope[n - 2]);
  for (let i = 0; i < n - 1; i++) {
    if (slope[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / slope[i];
    const b = m[i + 1] / slope[i];
    const h = a * a + b * b;
    if (h > 9) {
      const t = 3 / Math.sqrt(h);
      m[i] = t * a * slope[i];
      m[i + 1] = t * b * slope[i];
    }
  }
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    const c = dx[i] / 3;
    d += `C${x0 + c},${y0 + m[i] * c} ${x1 - c},${y1 - m[i + 1] * c} ${x1},${y1}`;
  }
  return d;
}

const PAD = { top: 12, right: 12, bottom: 24, left: 44 };

export function TrendChart({
  label,
  points,
  kind,
  formatValue = (n) => n.toLocaleString(),
  formatAxis = formatValue,
  height = 240,
}: {
  label: string;
  points: TrendPoint[];
  kind: BucketKind;
  formatValue?: (n: number) => string;
  formatAxis?: (n: number) => string;
  height?: number;
}) {
  const gradientId = useId();
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);

  const n = points.length;
  const top = niceMax(Math.max(0, ...points.map((p) => p.value)));
  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const plotH = height - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (n > 1 ? (i / (n - 1)) * plotW : plotW / 2);
  const y = (v: number) => PAD.top + plotH - (Math.max(0, v) / top) * plotH;
  const pts = points.map((p, i) => [x(i), y(p.value)] as [number, number]);
  const line = monotonePath(pts);
  const area = n ? `${line}L${x(n - 1)},${PAD.top + plotH}L${x(0)},${PAD.top + plotH}Z` : "";
  const grid = [0, 0.5, 1].map((f) => top * f);
  const ticks = n > 2 ? [0, Math.floor((n - 1) / 2), n - 1] : points.map((_, i) => i);

  const pick = (clientX: number) => {
    const box = ref.current?.getBoundingClientRect();
    if (!box || n === 0) return;
    const rel = clientX - box.left - PAD.left;
    setActive(Math.min(n - 1, Math.max(0, Math.round((rel / (plotW || 1)) * (n - 1)))));
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") setActive((a) => Math.min(n - 1, (a ?? -1) + 1));
    if (e.key === "ArrowLeft") setActive((a) => Math.max(0, (a ?? n) - 1));
  };

  const shown = active !== null ? points[active] : null;
  const tipLeft = active !== null ? Math.min(Math.max(x(active), 80), width - 80) : 0;

  return (
    <div
      ref={ref}
      className="relative outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
      style={{ height }}
      tabIndex={0}
      role="img"
      aria-label={`${label}, ${points.length} periods. Use the left and right arrow keys to read each value.`}
      onMouseMove={(e) => pick(e.clientX)}
      onMouseLeave={() => setActive(null)}
      onKeyDown={onKey}
      onBlur={() => setActive(null)}
    >
      {width > 0 && (
        <svg width={width} height={height} className="block" aria-hidden="true">
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" style={{ stopColor: "hsl(var(--viz-brand))", stopOpacity: 0.22 }} />
              <stop offset="100%" style={{ stopColor: "hsl(var(--viz-brand))", stopOpacity: 0 }} />
            </linearGradient>
          </defs>

          {grid.map((v) => (
            <g key={v}>
              <line x1={PAD.left} x2={width - PAD.right} y1={y(v)} y2={y(v)}
                style={{ stroke: "hsl(var(--viz-rule))" }} strokeDasharray={v === 0 ? undefined : "2 4"} />
              <text x={PAD.left - 8} y={y(v) + 3} textAnchor="end" className="text-[10px] tabular-nums"
                style={{ fill: "hsl(var(--muted-foreground))" }}>
                {formatAxis(v)}
              </text>
            </g>
          ))}

          {n > 0 && <path d={area} style={{ fill: `url(#${gradientId})` }} />}
          {n > 0 && <path d={line} fill="none" style={{ stroke: "hsl(var(--viz-brand))" }} strokeWidth={2} strokeLinejoin="round" />}

          {ticks.map((i) =>
            points[i] ? (
              <text key={i} x={x(i)} y={height - 6}
                textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"}
                className="text-[10px]" style={{ fill: "hsl(var(--muted-foreground))" }}>
                {axisLabel(points[i].start, kind)}
              </text>
            ) : null,
          )}

          {active !== null && (
            <>
              <line x1={x(active)} x2={x(active)} y1={PAD.top} y2={PAD.top + plotH}
                style={{ stroke: "hsl(var(--viz-ink))" }} strokeDasharray="3 3" />
              <circle cx={x(active)} cy={y(points[active].value)} r={5}
                style={{ fill: "hsl(var(--viz-brand))", stroke: "hsl(var(--card))" }} strokeWidth={2} />
            </>
          )}
        </svg>
      )}

      {shown && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 rounded-lg border border-border bg-card px-3 py-2 shadow-md"
          style={{ left: tipLeft, top: 0 }}
        >
          <p className="text-[11px] text-muted-foreground whitespace-nowrap">{bucketLabel(shown.start, kind)}</p>
          <p className="text-sm text-foreground tabular-nums whitespace-nowrap">{formatValue(shown.value)}</p>
        </div>
      )}

      <table className="sr-only">
        <caption>{label}</caption>
        <tbody>
          {points.map((p) => (
            <tr key={p.start}>
              <th scope="row">{bucketLabel(p.start, kind)}</th>
              <td>{formatValue(p.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * A tiny trend, for a card or a row. `area` for something that accumulates or
 * flows, `bars` for counts of separate events. Decorative — the figure beside
 * it is what a screen reader gets.
 */
export function Sparkline({
  values,
  variant = "area",
  height = 32,
}: {
  values: number[];
  variant?: "area" | "bars";
  height?: number;
}) {
  const gradientId = useId();
  const [ref, width] = useWidth<HTMLDivElement>();
  const n = values.length;
  const max = Math.max(0, ...values);

  if (max === 0 || width === 0) {
    return (
      <div ref={ref} style={{ height }} className="flex items-end" aria-hidden="true">
        {width > 0 && <div className="h-px w-full" style={{ background: "hsl(var(--viz-rule))" }} />}
      </div>
    );
  }

  const y = (v: number) => height - 2 - (Math.max(0, v) / max) * (height - 4);

  if (variant === "bars") {
    const gap = 1;
    const w = Math.max(1, (width - gap * (n - 1)) / n);
    return (
      <div ref={ref} style={{ height }} aria-hidden="true">
        <svg width={width} height={height} className="block">
          {values.map((v, i) => {
            const h = height - 2 - y(v);
            return h > 0 ? (
              <rect key={i} x={i * (w + gap)} y={y(v)} width={w} height={h + 2} rx={Math.min(1.5, w / 2)}
                style={{ fill: "hsl(var(--viz-brand))", opacity: 0.85 }} />
            ) : (
              <rect key={i} x={i * (w + gap)} y={height - 1} width={w} height={1}
                style={{ fill: "hsl(var(--viz-rule))" }} />
            );
          })}
        </svg>
      </div>
    );
  }

  const pts = values.map((v, i) => [n > 1 ? (i / (n - 1)) * width : width / 2, y(v)] as [number, number]);
  const line = monotonePath(pts);
  return (
    <div ref={ref} style={{ height }} aria-hidden="true">
      <svg width={width} height={height} className="block overflow-visible">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style={{ stopColor: "hsl(var(--viz-brand))", stopOpacity: 0.2 }} />
            <stop offset="100%" style={{ stopColor: "hsl(var(--viz-brand))", stopOpacity: 0 }} />
          </linearGradient>
        </defs>
        <path d={`${line}L${width},${height}L0,${height}Z`} style={{ fill: `url(#${gradientId})` }} />
        <path d={line} fill="none" style={{ stroke: "hsl(var(--viz-brand))" }} strokeWidth={1.5} strokeLinejoin="round" />
      </svg>
    </div>
  );
}
