"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { cx } from "@/lib/format";

export type KpiFormat = "int" | "currency" | "currency2" | "percent";

export interface KpiPeriod {
  id: string;
  /** Button text, e.g. "30D". */
  label?: string;
  /** Length of the period in days. */
  days: number;
  /** Days in each sparkline point (1 = daily). */
  bucket?: number;
}

export interface KpiMetric {
  id: string;
  label: string;
  format?: KpiFormat;
  /** Per period id, the value of each point. The tile value is their sum. */
  series?: Record<string, number[]>;
  /** Per period id, the total for the period before. Drives the change badge. */
  previous?: Record<string, number>;
  /** Worked out as `of ÷ per` (two other metric ids) for every point and the total. */
  ratio?: { of: string; per: string };
  /** Whether a rise is good (`up`, default) or bad (`down`). */
  better?: "up" | "down";
  /** Keep the metric out of the grid (e.g. spend, only used by a ratio). */
  hidden?: boolean;
}

export interface KpiSelectDetail {
  id: string;
  label: string;
  period: string;
  value: number | null;
  previous: number | null;
}

/** Every piece of UI text. `{name}` placeholders are filled in. */
export interface KpiLabels {
  period: string;
  periodBtn: string;
  vs: string;
  ratioNote: string;
  ratioPct: string;
  prevAvg: string;
  pinned: string;
  pin: string;
  high: string;
  low: string;
  pinHint: string;
  isHero: string;
  chart: string;
  day: string;
  block: string;
  pts: string;
  hint: string;
  announcePin: string;
  announcePeriod: string;
}

export interface KpiDashboardProps {
  metrics: KpiMetric[];
  /** Period buttons. Defaults to a single 30-day period. */
  periods?: KpiPeriod[];
  /** Controlled period id. */
  period?: string;
  /** Starting period id when uncontrolled (default: the first one). */
  defaultPeriod?: string;
  onPeriodChange?: (period: string) => void;
  /** Controlled id of the metric in the large slot. */
  hero?: string;
  /** Starting hero id when uncontrolled (default: the first visible metric). */
  defaultHero?: string;
  /** Fires when a tile is clicked to move it into the large slot. */
  onSelect?: (detail: KpiSelectDetail) => void;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  /** Last day of the data, YYYY-MM-DD. Used for the date range and point labels. */
  end?: string;
  currency?: string;
  locale?: string;
  /** Footer note. */
  source?: string;
  labels?: Partial<KpiLabels>;
  className?: string;
}

export const DEFAULT_KPI_LABELS: KpiLabels = {
  period: "Period",
  periodBtn: "Last {n} days",
  vs: "vs {prev} previous {n} days",
  ratioNote: "{of} ÷ {per}",
  ratioPct: "{of} of {per}",
  prevAvg: "Prev. avg {v}",
  pinned: "Pinned",
  pin: "Pin",
  high: "High",
  low: "Low",
  pinHint: "Move {label} into the main tile",
  isHero: "{label} is in the main tile",
  chart: "{label} by {unit}, {n} points. Use the arrow keys to read values.",
  day: "day",
  block: "{n}-day block",
  pts: "pts",
  hint: "Click a tile to pin it · arrow keys read a chart",
  announcePin: "{label} moved to the main tile",
  announcePeriod: "Showing the last {n} days",
};

const DEFAULT_PERIODS: KpiPeriod[] = [{ id: "30d", label: "30D", days: 30, bucket: 1 }];
const SAMPLES = 72;
const EASE = "cubic-bezier(.3,.8,.25,1)";

const fill = (s: string, vars: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ""));
const num = (v: unknown): number | null => (v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));
const sum = (a: number[]) => a.reduce((s, v) => s + (num(v) ?? 0), 0);
const ease = (t: number) => 1 - Math.pow(1 - t, 3);
const reduceMotion = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

function resample(ys: number[], n: number): number[] {
  if (!ys.length) return new Array(n).fill(36);
  if (ys.length === 1) return new Array(n).fill(ys[0]);
  return Array.from({ length: n }, (_, j) => {
    const t = (j / (n - 1)) * (ys.length - 1);
    const i = Math.floor(t);
    const f = t - i;
    return i >= ys.length - 1 ? ys[ys.length - 1] : ys[i] + (ys[i + 1] - ys[i]) * f;
  });
}

function pathOf(ys: number[]): { line: string; area: string } {
  const n = ys.length;
  if (!n) return { line: "", area: "" };
  const pts: Array<[number, number]> = n === 1 ? [[0, ys[0]], [100, ys[0]]] : ys.map((y, i) => [(i / (n - 1)) * 100, y]);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(" ");
  return { line, area: `${line} L100 40 L0 40 Z` };
}

interface Calc {
  points: number[];
  value: number | null;
  previous: number | null;
  parts?: { of: KpiMetric; per: KpiMetric; ofValue: number | null; perValue: number | null };
}

function calcMetric(m: KpiMetric, pid: string, byId: Map<string, KpiMetric>): Calc {
  if (m.ratio) {
    const a = byId.get(m.ratio.of);
    const b = byId.get(m.ratio.per);
    if (!a || !b || a.ratio || b.ratio) return { points: [], value: null, previous: null };
    const A = calcMetric(a, pid, byId);
    const B = calcMetric(b, pid, byId);
    const points = A.points.map((v, i) => (B.points[i] > 0 ? v / B.points[i] : null)).filter((v): v is number => v != null);
    return {
      points,
      value: B.value != null && B.value > 0 && A.value != null ? A.value / B.value : null,
      previous: A.previous != null && B.previous != null && B.previous > 0 ? A.previous / B.previous : null,
      parts: { of: a, per: b, ofValue: A.value, perValue: B.value },
    };
  }
  const raw = m.series && Array.isArray(m.series[pid]) ? m.series[pid] : [];
  const points = raw.map((v) => num(v) ?? 0);
  return { points, value: points.length ? sum(points) : null, previous: num(m.previous?.[pid]) };
}

interface Delta {
  r: number;
  text: string;
  tone: "good" | "bad" | "flat";
}

function deltaOf(m: KpiMetric, c: Calc, pts: string): Delta | null {
  if (c.value == null || c.previous == null) return null;
  const better = m.better === "down" ? -1 : 1;
  if (m.format === "percent") {
    const r = Math.round((c.value - c.previous) * 100 * 10) / 10;
    return { r, text: `${Math.abs(r).toFixed(1)} ${pts}`, tone: r === 0 ? "flat" : r * better > 0 ? "good" : "bad" };
  }
  if (!(c.previous > 0)) return null;
  const r = Math.round((c.value / c.previous - 1) * 100 * 10) / 10;
  return { r, text: `${Math.abs(r).toFixed(1)}%`, tone: r === 0 ? "flat" : r * better > 0 ? "good" : "bad" };
}

const UpIcon = () => (
  <svg viewBox="0 0 10 10" aria-hidden="true" className="size-[9px]">
    <path d="M5 1.5 9 8H1z" fill="currentColor" />
  </svg>
);
const DownIcon = () => (
  <svg viewBox="0 0 10 10" aria-hidden="true" className="size-[9px]">
    <path d="M5 8.5 1 2h8z" fill="currentColor" />
  </svg>
);
const PinIcon = () => (
  <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" aria-hidden="true" className="size-2.5">
    <path d="M4.2 1.5h3.6L7.3 4.6l2 1.9H2.7l2-1.9zM6 6.5v4" />
  </svg>
);

interface TileProps {
  m: KpiMetric;
  calc: Calc;
  ys: number[];
  prevAvg: number | null;
  /** Y position (0–40) of the previous-period average line. */
  prevY: number | null;
  hero: boolean;
  spanAll: boolean;
  value: string;
  path: { line: string; area: string };
  animating: boolean;
  delta: Delta | null;
  note: string;
  summary: string;
  unit: string;
  axis: [string, string];
  stats: Array<{ k: string; title: string; value: string; sub: string }>;
  L: KpiLabels;
  fmt: (m: KpiMetric, v: number | null) => string;
  pointLabel: (i: number, n: number) => string;
  onSelect: (id: string) => void;
  announce: (text: string) => void;
}

/** One bento tile with its sparkline read-out. */
function KpiTile({
  m,
  calc,
  ys,
  prevAvg,
  prevY,
  hero,
  spanAll,
  value,
  path,
  animating,
  delta,
  note,
  summary,
  unit,
  axis,
  stats,
  L,
  fmt,
  pointLabel,
  onSelect,
  announce,
}: TileProps) {
  const plotRef = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState<number | null>(null);
  const [reading, setReading] = useState(false);
  const n = calc.points.length;
  const label = m.label || m.id;
  const i = idx != null && n ? Math.min(idx, n - 1) : null;
  const showing = reading && !animating && i != null;

  const read = (j: number) => {
    if (!n) return;
    setIdx(Math.max(0, Math.min(n - 1, j)));
    setReading(true);
  };
  const fromX = (e: PointerEvent<HTMLDivElement>) => {
    const r = plotRef.current?.getBoundingClientRect();
    if (!n || !r || !r.width) return 0;
    return Math.round(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * (n - 1));
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const cur = i ?? n - 1;
    const map: Record<string, number> = { ArrowLeft: cur - 1, ArrowDown: cur - 1, ArrowRight: cur + 1, ArrowUp: cur + 1, Home: 0, End: n - 1 };
    if (e.key in map) {
      e.preventDefault();
      if (!n) return;
      const j = Math.max(0, Math.min(n - 1, map[e.key]));
      read(j);
      announce(`${fmt(m, calc.points[j])}, ${pointLabel(j, n)}`);
    } else if ((e.key === "Enter" || e.key === " ") && !hero) {
      e.preventDefault();
      onSelect(m.id);
    }
  };

  const x = i == null ? 0 : n === 1 ? 50 : (i / (n - 1)) * 100;
  const y = i == null ? 0 : (ys[i] ?? 0);
  const tx = x < 18 ? "-12%" : x > 82 ? "-88%" : "-50%";

  return (
    <article
      data-kpi-id={m.id}
      className={cx(
        "group/tile relative flex min-w-0 flex-col rounded-[14px] border shadow-[0_1px_2px_-1px_var(--kpi-shadow)] transition-[border-color,box-shadow] duration-300 motion-reduce:transition-none",
        hero
          ? "col-span-2 row-span-2 border-[color-mix(in_oklab,var(--kpi-accent)_30%,var(--kpi-line))] bg-(--kpi-tile) bg-[radial-gradient(120%_70%_at_100%_0%,var(--kpi-accent-soft),transparent_60%)] px-[22px] pt-[22px] pb-4 @max-[761px]:col-span-full @max-[761px]:row-auto @max-[481px]:px-4 @max-[481px]:pt-[18px] @max-[481px]:pb-3.5"
          : "border-(--kpi-line) bg-(--kpi-tile) px-4 pt-4 pb-3 hover:border-[color-mix(in_oklab,var(--kpi-accent)_45%,var(--kpi-line))] hover:shadow-[0_14px_28px_-22px_var(--kpi-shadow)] @max-[481px]:px-3.5 @max-[481px]:py-3",
        spanAll && "@max-[761px]:col-span-full @max-[481px]:col-auto"
      )}
    >
      <div
        data-kpi-in=""
        className={cx(
          "min-h-0 flex-1",
          hero
            ? "grid grid-cols-[minmax(0,1fr)_auto] grid-rows-[auto_auto_auto_minmax(0,1fr)_auto] gap-x-6 [grid-template-areas:'top_top'_'fig_stats'_'note_stats'_'chart_chart'_'axis_axis'] @max-[481px]:grid-cols-[minmax(0,1fr)] @max-[481px]:grid-rows-none @max-[481px]:[grid-template-areas:'top'_'fig'_'note'_'chart'_'axis'_'stats']"
            : "flex flex-col @max-[481px]:grid @max-[481px]:grid-cols-[minmax(0,1fr)_42%] @max-[481px]:items-center @max-[481px]:gap-x-3 @max-[481px]:[grid-template-areas:'top_chart'_'fig_chart'_'note_chart']"
        )}
      >
        <div className="flex min-h-[22px] items-center justify-between gap-2 [grid-area:top]">
          <button
            type="button"
            aria-pressed={hero}
            aria-label={`${fill(hero ? L.isHero : L.pinHint, { label })}. ${summary}`}
            onClick={() => onSelect(m.id)}
            className={cx(
              "m-0 inline-flex min-w-0 appearance-none items-center gap-[7px] border-0 bg-none p-0 text-left font-(family-name:--kpi-sans) leading-[1.2] font-semibold after:absolute after:inset-0 after:rounded-[14px] after:content-[''] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-(--kpi-accent)",
              hero ? "cursor-default text-sm text-(--kpi-ink)" : "cursor-pointer text-[13px] text-(--kpi-muted)"
            )}
          >
            <span
              className={cx(
                "size-2 flex-none rounded-full transition-colors duration-250 motion-reduce:transition-none",
                hero ? "bg-(--kpi-accent) shadow-[0_0_0_3px_var(--kpi-accent-soft)]" : "bg-(--kpi-faint)"
              )}
            />
            <span>{label}</span>
          </button>
          <span
            aria-hidden="true"
            className={cx(
              "pointer-events-none inline-flex flex-none items-center gap-[5px] rounded-md px-[7px] py-[5px] font-(family-name:--kpi-mono) text-[10px] leading-none font-semibold tracking-[0.08em] uppercase transition-[opacity,transform] duration-200 motion-reduce:transition-none",
              hero
                ? "bg-(--kpi-accent-soft) text-(--kpi-accent-ink) opacity-100"
                : "-translate-y-0.5 bg-(--kpi-raise) text-(--kpi-faint) opacity-0 group-focus-within/tile:translate-y-0 group-focus-within/tile:opacity-100 group-hover/tile:translate-y-0 group-hover/tile:opacity-100 @max-[481px]:hidden"
            )}
          >
            <PinIcon />
            <span>{hero ? L.pinned : L.pin}</span>
          </span>
        </div>

        <div aria-hidden="true" className={cx("mt-2.5 flex flex-wrap items-baseline gap-x-2.5 gap-y-1.5 [grid-area:fig]", !hero && "@max-[481px]:mt-1.5")}>
          <span
            className={cx(
              "font-(family-name:--kpi-display) leading-none font-[650] whitespace-nowrap tabular-nums",
              hero ? "text-[clamp(40px,6.2cqi,56px)] tracking-[-0.04em] @max-[481px]:text-[40px]" : "text-[clamp(24px,3.4cqi,30px)] tracking-[-0.03em] @max-[481px]:text-[22px]"
            )}
          >
            {value}
          </span>
          {delta && (
            <span
              className={cx(
                "inline-flex items-center gap-[3px] rounded-md leading-none font-[650] whitespace-nowrap tabular-nums",
                hero ? "px-2 py-[5px] text-[13px]" : "px-1.5 py-[3px] text-[11.5px]",
                delta.tone === "good" && "bg-[color-mix(in_oklab,var(--kpi-good)_12%,transparent)] text-(--kpi-good)",
                delta.tone === "bad" && "bg-[color-mix(in_oklab,var(--kpi-bad)_12%,transparent)] text-(--kpi-bad)",
                delta.tone === "flat" && "bg-(--kpi-raise) text-(--kpi-muted)"
              )}
            >
              {delta.r > 0 ? <UpIcon /> : delta.r < 0 ? <DownIcon /> : null}
              {delta.text}
            </span>
          )}
        </div>
        {note && (
          <p
            aria-hidden="true"
            className={cx(
              "mt-1.5 mb-0 leading-[1.35] [overflow-wrap:anywhere] tabular-nums [grid-area:note]",
              hero ? "text-[13px] text-(--kpi-muted)" : "text-xs text-(--kpi-faint) @max-[481px]:mt-1"
            )}
          >
            {note}
          </p>
        )}

        {/* sparkline */}
        <div
          tabIndex={0}
          role="group"
          aria-roledescription="sparkline"
          aria-label={fill(L.chart, { label, unit, n })}
          onPointerMove={(e) => read(fromX(e))}
          onPointerDown={(e) => read(fromX(e))}
          onPointerLeave={(e) => document.activeElement !== e.currentTarget && setReading(false)}
          onFocus={() => read(i ?? n - 1)}
          onBlur={() => setReading(false)}
          onClick={() => !hero && onSelect(m.id)}
          onKeyDown={onKey}
          className={cx(
            "group/chart relative z-[1] flex-none cursor-crosshair touch-pan-y outline-none [grid-area:chart]",
            hero ? "mt-0 min-h-[118px] pt-4 @max-[761px]:h-[170px] @max-[481px]:h-[140px]" : "mt-auto h-12 pt-2.5 @max-[481px]:h-[52px] @max-[481px]:pt-0"
          )}
        >
          <div
            ref={plotRef}
            className="relative h-full rounded-md group-focus-visible/chart:outline-2 group-focus-visible/chart:outline-offset-4 group-focus-visible/chart:outline-(--kpi-accent)"
          >
            {hero &&
              [0, 1, 2].map((g) => (
                <span key={g} style={{ top: `${10 + g * 40}%` }} className="absolute inset-x-0 h-0 border-t border-dashed border-(--kpi-grid)" />
              ))}
            <svg viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true" className="absolute inset-0 size-full overflow-visible">
              <path d={path.area} className={hero ? "fill-(--kpi-accent-soft)" : "fill-[color-mix(in_oklab,var(--kpi-faint)_10%,transparent)]"} />
              <path
                d={path.line}
                fill="none"
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                className={cx(
                  "transition-[stroke] duration-250 motion-reduce:transition-none",
                  hero
                    ? "stroke-(--kpi-accent) stroke-[2.25]"
                    : "stroke-(--kpi-faint) stroke-[1.6] group-hover/tile:stroke-(--kpi-accent) group-focus-visible/chart:stroke-(--kpi-accent)"
                )}
              />
            </svg>
            {hero && prevAvg != null && (
              <span
                aria-hidden="true"
                style={{ top: `${((prevY ?? 0) / 40) * 100}%` }}
                className="absolute inset-x-0 h-0 border-t-[1.5px] border-dashed border-[color-mix(in_oklab,var(--kpi-faint)_70%,transparent)] transition-[top] duration-[450ms] ease-out-soft motion-reduce:transition-none"
              >
                <span className="absolute right-0 bottom-[3px] rounded bg-(--kpi-tile) px-1 py-0.5 font-(family-name:--kpi-mono) text-[10.5px] leading-none font-medium whitespace-nowrap text-(--kpi-faint) tabular-nums">
                  {fill(L.prevAvg, { v: fmt(m, prevAvg) })}
                </span>
              </span>
            )}
            <span
              style={{ left: `${x}%` }}
              className={cx(
                "pointer-events-none absolute inset-y-0 w-0 border-l border-[color-mix(in_oklab,var(--kpi-ink)_35%,transparent)] transition-opacity duration-150 motion-reduce:transition-none",
                showing ? "opacity-100" : "opacity-0"
              )}
            />
            <span
              style={{ left: `${x}%`, top: `${(y / 40) * 100}%` }}
              className={cx(
                "pointer-events-none absolute box-border rounded-full border-(--kpi-accent) bg-(--kpi-tile) transition-opacity duration-150 motion-reduce:transition-none",
                hero ? "-mt-1.5 -ml-1.5 size-3 border-[2.5px] shadow-[0_0_0_4px_var(--kpi-accent-soft)]" : "-mt-[4.5px] -ml-[4.5px] size-[9px] border-2",
                showing ? "opacity-100" : "opacity-0"
              )}
            />
            <span
              aria-hidden="true"
              style={{ left: `${x}%`, transform: `translate(${tx}, ${showing ? "0" : "3px"})` }}
              className={cx(
                "pointer-events-none absolute bottom-[calc(100%+6px)] z-[3] rounded-[7px] bg-(--kpi-tip-bg) px-2 py-1.5 text-[11.5px] leading-[1.25] font-medium whitespace-nowrap text-(--kpi-tip-ink) tabular-nums shadow-[0_10px_24px_-12px_var(--kpi-shadow)] transition-[opacity,transform] duration-150 motion-reduce:transition-none",
                showing ? "opacity-100" : "opacity-0"
              )}
            >
              {i != null && n > 0 && (
                <>
                  <b className="block text-[13px] font-[650]">{fmt(m, calc.points[i])}</b>
                  <small className="text-[10.5px] opacity-[.78]">{pointLabel(i, n)}</small>
                </>
              )}
            </span>
          </div>
        </div>

        {hero && (
          <>
            <div
              aria-hidden="true"
              className="mt-2 flex justify-between gap-2 font-(family-name:--kpi-mono) text-[10.5px] leading-none font-medium text-(--kpi-faint) tabular-nums [grid-area:axis]"
            >
              <span>{axis[0]}</span>
              <span>{axis[1]}</span>
            </div>
            <dl className="m-0 grid min-w-32 gap-3 self-end border-l border-(--kpi-line) pt-1 pb-0.5 pl-[18px] [grid-area:stats] @max-[481px]:mt-3.5 @max-[481px]:min-w-0 @max-[481px]:grid-cols-2 @max-[481px]:border-t @max-[481px]:border-l-0 @max-[481px]:px-0 @max-[481px]:pt-3 @max-[481px]:pb-0">
              {stats.map((s) => (
                <div key={s.k} className="grid min-w-0 gap-1">
                  <dt className="font-(family-name:--kpi-mono) text-[10px] leading-[1.2] font-medium tracking-[0.1em] text-(--kpi-faint) uppercase">{s.title}</dt>
                  <dd className="m-0 text-sm leading-[1.25] font-semibold [overflow-wrap:anywhere] tabular-nums">
                    {s.value}
                    {s.sub && <small className="block text-[11.5px] leading-[1.3] font-normal text-(--kpi-faint)">{s.sub}</small>}
                  </dd>
                </div>
              ))}
            </dl>
          </>
        )}
      </div>
    </article>
  );
}

/** The sparkline y scale; includes the previous-period average so the reference line always fits. */
function scaleFor(points: number[], prevAvg: number | null): (v: number) => number {
  const vals = prevAvg != null ? points.concat([prevAvg]) : points;
  let lo = vals.length ? Math.min(...vals) : 0;
  let hi = vals.length ? Math.max(...vals) : 1;
  if (hi === lo) {
    hi += 1;
    lo -= 1;
  }
  const pad = (hi - lo) * 0.08;
  lo -= pad;
  hi += pad;
  return (v: number) => 36 - ((v - lo) / (hi - lo)) * 32;
}

/**
 * Six headline numbers in a bento grid, each with its change against the
 * previous period and a sparkline. Switch periods, read any chart point by
 * point, and click a tile to pin it into the large slot.
 */
export function KpiDashboard({
  metrics,
  periods: periodsProp,
  period: periodProp,
  defaultPeriod,
  onPeriodChange,
  hero: heroProp,
  defaultHero,
  onSelect,
  eyebrow,
  title,
  subtitle,
  end,
  currency = "USD",
  locale = "en-US",
  source,
  labels,
  className,
}: KpiDashboardProps) {
  const L: KpiLabels = { ...DEFAULT_KPI_LABELS, ...labels };
  const periods = periodsProp?.filter((p) => p && p.id).length ? periodsProp.filter((p) => p && p.id) : DEFAULT_PERIODS;
  const all = useMemo(() => metrics.filter((m) => m && m.id), [metrics]);
  const byId = useMemo(() => new Map(all.map((m) => [m.id, m])), [all]);
  const visible = all.filter((m) => !m.hidden);

  const [innerPeriod, setInnerPeriod] = useState(defaultPeriod);
  const [innerHero, setInnerHero] = useState(defaultHero);
  const p = periods.find((x) => x.id === (periodProp ?? innerPeriod)) ?? periods[0];
  const pid = p.id;
  const heroId = (visible.find((m) => m.id === (heroProp ?? innerHero)) ?? visible[0])?.id;

  // tile order: hero first; a new hero swaps places with the old one
  const visKey = visible.map((m) => m.id).join("|");
  const [ord, setOrd] = useState(() => ({ key: visKey, hero: heroId, order: [heroId, ...visible.map((m) => m.id).filter((id) => id !== heroId)].filter(Boolean) as string[] }));
  let order = ord.order;
  if (ord.key !== visKey) {
    order = [heroId, ...visible.map((m) => m.id).filter((id) => id !== heroId)].filter(Boolean) as string[];
    setOrd({ key: visKey, hero: heroId, order });
  } else if (ord.hero !== heroId && heroId) {
    order = [...ord.order];
    const i = order.indexOf(heroId);
    if (i > 0) {
      order[i] = order[0];
      order[0] = heroId;
    }
    setOrd({ key: visKey, hero: heroId, order });
  }

  // "today" only when no end date is given, read on the client to keep SSR stable
  const [today, setToday] = useState<Date | null>(null);
  useEffect(() => {
    if (!end) {
      const d = new Date();
      setToday(new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())));
    }
  }, [end]);
  const endDate = useMemo(() => {
    const mm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(end ?? "");
    return mm ? new Date(Date.UTC(+mm[1], +mm[2] - 1, +mm[3])) : today;
  }, [end, today]);

  const day = useCallback((offset: number) => (endDate ? new Date(endDate.getTime() - offset * 864e5) : null), [endDate]);
  const span = useCallback(
    (a: Date, b: Date, year: boolean) => {
      try {
        const f = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", timeZone: "UTC", ...(year ? { year: "numeric" } : {}) });
        return typeof f.formatRange === "function" ? f.formatRange(a, b) : `${f.format(a)} – ${f.format(b)}`;
      } catch {
        return `${a.toDateString()} – ${b.toDateString()}`;
      }
    },
    [locale]
  );
  const pointLabel = useCallback(
    (i: number, n: number) => {
      const bucket = Math.max(1, num(p.bucket) || 1);
      const endOff = (n - 1 - i) * bucket;
      const a = day(endOff + bucket - 1);
      const b = day(endOff);
      if (!a || !b) return "";
      if (bucket === 1) return b.toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
      return span(a, b, false);
    },
    [p.bucket, day, span, locale]
  );

  const fmt = useCallback(
    (m: KpiMetric, v: number | null) => {
      if (v == null || !Number.isFinite(v)) return "—";
      const f = m.format || "int";
      try {
        if (f === "currency") return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(v);
        if (f === "currency2") return new Intl.NumberFormat(locale, { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
      } catch {
        return `${currency} ${v.toFixed(f === "currency2" ? 2 : 0)}`;
      }
      if (f === "percent") return `${(v * 100).toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
      return Math.round(v).toLocaleString(locale);
    },
    [locale, currency]
  );

  // per-tile numbers for the current period
  const tiles = useMemo(
    () =>
      visible.map((m) => {
        const calc = calcMetric(m, pid, byId);
        const pts = calc.points;
        const prevAvg = calc.previous == null ? null : m.ratio ? calc.previous : pts.length ? calc.previous / pts.length : null;
        const Y = scaleFor(pts, prevAvg);
        return { m, calc, prevAvg, prevY: prevAvg != null ? Y(prevAvg) : null, ys: pts.map(Y) };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visKey, all, pid, byId]
  );

  // tween values and sparklines when the period changes
  const shown = useRef<Map<string, { v: number | null; s: number[] }>>(new Map());
  const lastPid = useRef(pid);
  const raf = useRef(0);
  const [anim, setAnim] = useState<{ from: Map<string, { v: number | null; s: number[] }>; k: number } | null>(null);
  const [announcement, setAnnouncement] = useState("");

  useLayoutEffect(() => {
    const from = shown.current;
    shown.current = new Map(tiles.map((t) => [t.m.id, { v: t.calc.value, s: resample(t.ys, SAMPLES) }]));
    const changed = lastPid.current !== pid;
    lastPid.current = pid;
    if (!changed) return;
    setAnnouncement(fill(L.announcePeriod, { n: num(p.days) || 0 }));
    cancelAnimationFrame(raf.current);
    if (reduceMotion() || document.hidden) {
      setAnim(null);
      return;
    }
    const t0 = performance.now();
    setAnim({ from, k: 0 });
    const tick = (now: number) => {
      const k = ease(Math.min(1, (now - t0) / 460));
      if (k >= 1) {
        raf.current = 0;
        setAnim(null);
        return;
      }
      setAnim({ from, k });
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tiles]);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  // FLIP the tiles when the hero changes
  const gridRef = useRef<HTMLDivElement>(null);
  const rects = useRef<Map<string, { x: number; y: number; w: number; h: number }>>(new Map());
  const lastHero = useRef(heroId);
  const snapshot = useCallback(() => {
    const g = gridRef.current;
    if (!g) return;
    const gr = g.getBoundingClientRect();
    const next = new Map<string, { x: number; y: number; w: number; h: number }>();
    g.querySelectorAll<HTMLElement>("[data-kpi-id]").forEach((t) => {
      const r = t.getBoundingClientRect();
      next.set(t.dataset.kpiId ?? "", { x: r.left - gr.left, y: r.top - gr.top, w: r.width, h: r.height });
    });
    rects.current = next;
  }, []);

  useLayoutEffect(() => {
    const g = gridRef.current;
    const changed = lastHero.current !== heroId;
    lastHero.current = heroId;
    if (changed && heroId) {
      setAnnouncement(fill(L.announcePin, { label: byId.get(heroId)?.label || heroId }));
      if (g && !reduceMotion() && typeof Element.prototype.animate === "function") {
        const gr = g.getBoundingClientRect();
        g.querySelectorAll<HTMLElement>("[data-kpi-id]").forEach((t) => {
          const a = rects.current.get(t.dataset.kpiId ?? "");
          const r = t.getBoundingClientRect();
          if (!a || !r.width || !r.height) return;
          const dx = a.x - (r.left - gr.left);
          const dy = a.y - (r.top - gr.top);
          const sx = a.w / r.width;
          const sy = a.h / r.height;
          if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && Math.abs(sx - 1) < 0.01 && Math.abs(sy - 1) < 0.01) return;
          t.animate(
            [
              { transformOrigin: "0 0", transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` },
              { transformOrigin: "0 0", transform: "none" },
            ],
            { duration: 420, easing: "cubic-bezier(.2,.75,.2,1)" }
          );
          if (Math.abs(sx - 1) > 0.05 || Math.abs(sy - 1) > 0.05) {
            t.querySelector("[data-kpi-in]")?.animate([{ opacity: 0 }, { opacity: 0, offset: 0.35 }, { opacity: 1 }], { duration: 420, easing: "ease-out" });
          }
        });
      }
    }
    snapshot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heroId, order, pid]);

  useEffect(() => {
    const g = gridRef.current;
    if (!g || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => snapshot());
    ro.observe(g);
    g.querySelectorAll("[data-kpi-id]").forEach((t) => ro.observe(t));
    return () => ro.disconnect();
  }, [snapshot, visKey]);

  // period switch thumb
  const segRef = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState<{ w: number; x: number } | null>(null);
  const [ready, setReady] = useState(false);
  const place = useCallback(() => {
    const b = segRef.current?.querySelector<HTMLButtonElement>('button[aria-pressed="true"]');
    if (!b || !b.offsetWidth) return;
    setThumb({ w: b.offsetWidth, x: b.offsetLeft });
  }, []);
  useEffect(() => place(), [pid, place, periods.length]);
  useEffect(() => {
    const el = segRef.current;
    if (!el) return;
    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(place);
      ro.observe(el);
    }
    let r2 = 0;
    const r1 = requestAnimationFrame(() => {
      r2 = requestAnimationFrame(() => setReady(true));
    });
    return () => {
      ro?.disconnect();
      cancelAnimationFrame(r1);
      cancelAnimationFrame(r2);
    };
  }, [place]);

  const choosePeriod = (id: string) => {
    if (id === pid) return;
    if (periodProp == null) setInnerPeriod(id);
    onPeriodChange?.(id);
  };

  const select = (id: string) => {
    if (id === heroId) return;
    const m = byId.get(id);
    if (!m) return;
    if (heroProp == null) setInnerHero(id);
    const c = calcMetric(m, pid, byId);
    onSelect?.({ id, label: m.label || id, period: pid, value: c.value, previous: c.previous });
  };

  const days = num(p.days) || 0;
  const d0 = day(days - 1);
  const d1 = day(0);
  const range = days && d0 && d1 ? span(d0, d1, true) : "";
  const unit = (num(p.bucket) || 1) === 1 ? L.day : fill(L.block, { n: p.bucket ?? 1 });
  const tileById = new Map(tiles.map((t) => [t.m.id, t]));

  return (
    <div className={cx("@container block w-full max-w-[980px] font-(family-name:--kpi-sans) text-(--kpi-ink)", className)}>
      <section className="relative rounded-[20px] border border-(--kpi-line) bg-(--kpi-well) px-[22px] pt-[22px] pb-4 shadow-[0_30px_60px_-48px_var(--kpi-shadow)] @max-[761px]:rounded-[18px] @max-[761px]:px-4 @max-[761px]:pt-[18px] @max-[761px]:pb-3.5 @max-[481px]:rounded-2xl @max-[481px]:px-3 @max-[481px]:pt-3.5 @max-[481px]:pb-3">
        {/* header */}
        <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3.5 px-1 pt-0.5 pb-[18px] @max-[481px]:px-0.5 @max-[481px]:pb-3.5">
          <div className="grid min-w-0 gap-1.5">
            {eyebrow && (
              <span className="inline-flex items-center gap-2 font-(family-name:--kpi-mono) text-[10.5px] leading-none font-semibold tracking-[0.12em] text-(--kpi-accent-ink) uppercase before:size-[7px] before:rounded-[2px] before:bg-(--kpi-accent) before:shadow-[0_0_0_3px_var(--kpi-accent-soft)] before:content-['']">
                {eyebrow}
              </span>
            )}
            {title && <h2 className="m-0 font-(family-name:--kpi-display) text-[clamp(19px,3cqi,24px)] leading-[1.15] font-[650] tracking-[-0.02em]">{title}</h2>}
            {subtitle && <p className="m-0 text-[13.5px] text-(--kpi-muted)">{subtitle}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2.5 @max-[481px]:w-full @max-[481px]:justify-between">
            {range && <span className="text-[12.5px] leading-none font-medium whitespace-nowrap text-(--kpi-muted) tabular-nums">{range}</span>}
            <div ref={segRef} role="group" aria-label={L.period} className="relative inline-flex rounded-[10px] border border-(--kpi-line) bg-(--kpi-tile) p-[3px]">
              <span
                aria-hidden="true"
                className="absolute top-[3px] bottom-[3px] left-0 rounded-[7px] bg-(--kpi-ink) motion-reduce:transition-none!"
                style={{
                  width: thumb?.w ?? 0,
                  transform: `translateX(${thumb?.x ?? 0}px)`,
                  transition: ready ? `transform .35s ${EASE}, width .35s ${EASE}` : "none",
                }}
              />
              {periods.map((x) => (
                <button
                  key={x.id}
                  type="button"
                  aria-pressed={x.id === pid}
                  aria-label={x.days ? fill(L.periodBtn, { n: x.days }) : undefined}
                  onClick={() => choosePeriod(x.id)}
                  className={cx(
                    "relative min-w-[46px] cursor-pointer appearance-none rounded-[7px] border-0 bg-transparent px-3 py-2 font-(family-name:--kpi-mono) text-[12.5px] leading-none font-semibold tracking-[0.02em] text-(--kpi-muted) transition-colors duration-250 hover:text-(--kpi-ink) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--kpi-accent) aria-pressed:text-(--kpi-tile) aria-pressed:hover:text-(--kpi-tile) motion-reduce:transition-none",
                    !thumb && "aria-pressed:bg-(--kpi-ink)"
                  )}
                >
                  {x.label || x.id}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* bento grid */}
        <div
          ref={gridRef}
          className="grid auto-rows-[minmax(148px,auto)] grid-cols-3 gap-3 @max-[761px]:auto-rows-[minmax(150px,auto)] @max-[761px]:grid-cols-2 @max-[481px]:auto-rows-auto @max-[481px]:grid-cols-[minmax(0,1fr)] @max-[481px]:gap-2.5"
        >
          {order.map((id, idx) => {
            const t = tileById.get(id);
            if (!t) return null;
            const { m, calc, ys, prevAvg, prevY } = t;
            const isHero = id === heroId;
            const delta = deltaOf(m, calc, L.pts);
            const note = calc.parts
              ? fill(m.format === "percent" ? L.ratioPct : L.ratioNote, {
                  of: `${fmt(calc.parts.of, calc.parts.ofValue)} ${(calc.parts.of.label || "").toLowerCase()}`,
                  per: `${fmt(calc.parts.per, calc.parts.perValue)} ${(calc.parts.per.label || "").toLowerCase()}`,
                })
              : calc.previous != null
                ? fill(L.vs, { prev: fmt(m, calc.previous), n: days })
                : "";
            const summary = `${fmt(m, calc.value)}${delta ? `, ${delta.r > 0 ? "up" : delta.r < 0 ? "down" : "unchanged"} ${delta.text}` : ""}. ${note}`;

            // tweened value and path while the period switch animates
            let value = fmt(m, calc.value);
            let path = pathOf(ys);
            if (anim) {
              const from = anim.from.get(id);
              const toS = resample(ys, SAMPLES);
              const fromV = from ? from.v : calc.value;
              const fromS = from ? from.s : toS;
              const v = fromV != null && calc.value != null ? fromV + (calc.value - fromV) * anim.k : calc.value;
              value = fmt(m, v);
              path = pathOf(toS.map((y, j) => fromS[j] + (y - fromS[j]) * anim.k));
            }

            const n = calc.points.length;
            const pts = calc.points;
            const hiI = n ? pts.indexOf(Math.max(...pts)) : -1;
            const loI = n ? pts.indexOf(Math.min(...pts)) : -1;
            const stats = [
              { k: "high", title: `${L.high} · ${unit}`, value: fmt(m, hiI >= 0 ? pts[hiI] : null), sub: hiI >= 0 ? pointLabel(hiI, n) : "" },
              { k: "low", title: `${L.low} · ${unit}`, value: fmt(m, loI >= 0 ? pts[loI] : null), sub: loI >= 0 ? pointLabel(loI, n) : "" },
            ];

            return (
              <KpiTile
                key={id}
                m={m}
                calc={calc}
                ys={ys}
                prevAvg={prevAvg}
                prevY={prevY}
                hero={isHero}
                spanAll={!isHero && idx === order.length - 1 && (idx + 1) % 2 === 0}
                value={value}
                path={path}
                animating={anim != null}
                delta={delta}
                note={note}
                summary={summary}
                unit={unit}
                axis={[n ? pointLabel(0, n) : "", n > 1 ? pointLabel(n - 1, n) : ""]}
                stats={stats}
                L={L}
                fmt={fmt}
                pointLabel={pointLabel}
                onSelect={select}
                announce={setAnnouncement}
              />
            );
          })}
        </div>

        <footer className="flex flex-wrap justify-between gap-x-4 gap-y-1.5 px-1 pt-3.5 text-xs text-(--kpi-faint)">
          <span>{L.hint}</span>
          {source && <span>{source}</span>}
        </footer>
        <p className="sr-only" aria-live="polite">
          {announcement}
        </p>
      </section>
    </div>
  );
}

export default KpiDashboard;
