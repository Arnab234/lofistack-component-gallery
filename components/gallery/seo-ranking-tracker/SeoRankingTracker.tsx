"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { cx } from "@/lib/format";

export type RankSortKey = "keyword" | "position" | "change" | "best" | "volume";
export type RankSortDir = "asc" | "desc";
export type RankFilter = "all" | "top3" | "top10" | "improved" | "declined";

export interface RankSort {
  key: RankSortKey;
  dir: RankSortDir;
}

export interface TrackedKeyword {
  /** The search term being tracked. */
  keyword: string;
  /** Weekly positions, oldest first. The last value is this week. null = not in the top 100. */
  history: (number | null)[];
  /** The page that ranks for the keyword. */
  url?: string;
  /** Average monthly searches. */
  volume?: number;
  /** All-time best. The lowest value in history is used if it is better. */
  best?: number;
  /** Optional tag, e.g. Local, Commercial, Brand. */
  intent?: string;
}

export interface KeywordSelectDetail {
  keyword: string;
  position: number | null;
  change: number | null;
  best: number | null;
  url: string;
  volume: number;
  expanded: boolean;
}

export interface SeoRankingTrackerProps {
  eyebrow?: string;
  title?: string;
  /** Site and search settings, shown under the title. */
  site?: string;
  /** Date text, top right. */
  period?: string;
  /** Labels for each history point, e.g. "Sep 25". */
  weeks?: string[];
  keywords?: TrackedKeyword[];
  /** Footer note. */
  source?: string;
  /** Number locale. */
  locale?: string;
  /** Controlled sort. */
  sort?: RankSort;
  defaultSort?: RankSort;
  onSortChange?: (sort: RankSort) => void;
  /** Controlled filter. */
  filter?: RankFilter;
  defaultFilter?: RankFilter;
  onFilterChange?: (detail: { filter: RankFilter; shown: number }) => void;
  /** Fires when a row is opened or closed. */
  onKeywordSelect?: (detail: KeywordSelectDetail) => void;
  className?: string;
}

const FILTERS: RankFilter[] = ["all", "top3", "top10", "improved", "declined"];
const FILTER_LABEL: Record<RankFilter, string> = { all: "All", top3: "Top 3", top10: "Top 10", improved: "Improved", declined: "Declined" };
const COLS: { key: RankSortKey | "trend"; label: string; dir: RankSortDir | null; th: string }[] = [
  { key: "keyword", label: "Keyword", dir: "asc", th: "" },
  { key: "position", label: "Position", dir: "asc", th: "w-24 text-right" },
  { key: "change", label: "Change", dir: "desc", th: "w-[92px] text-right" },
  { key: "best", label: "Best", dir: "asc", th: "w-[76px] text-right @max-[760px]:hidden" },
  { key: "volume", label: "Volume", dir: "desc", th: "w-24 text-right" },
  { key: "trend", label: "8-week trend", dir: null, th: "w-32 text-right @max-[760px]:w-28" },
];
const SORT_OPTIONS: [string, string][] = [
  ["position:asc", "Position · best first"],
  ["position:desc", "Position · worst first"],
  ["change:desc", "Change · biggest gain"],
  ["change:asc", "Change · biggest drop"],
  ["volume:desc", "Volume · highest"],
  ["best:asc", "Best position"],
  ["keyword:asc", "Keyword · A–Z"],
];

interface Row {
  id: number;
  keyword: string;
  url: string;
  intent: string;
  volume: number;
  history: (number | null)[];
  pos: number | null;
  prev: number | null;
  change: number | null;
  best: number | null;
  isNew: boolean;
  isLost: boolean;
  chgSort: number;
  trend: number;
  min: number | null;
  max: number | null;
}

const fin = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

function model(list: TrackedKeyword[]): Row[] {
  return list.map((k, i) => {
    const history = (Array.isArray(k?.history) ? k.history : []).map((v) => {
      const n = fin(v);
      return n != null && n >= 1 ? Math.round(n) : null;
    });
    const len = history.length;
    const pos = len ? history[len - 1] : null;
    const prev = len > 1 ? history[len - 2] : null;
    const ranked = history.filter((v): v is number => v != null);
    let best = fin(k?.best);
    if (ranked.length) best = best == null ? Math.min(...ranked) : Math.min(best, ...ranked);
    const isNew = pos != null && prev == null && len > 1;
    const isLost = pos == null && prev != null;
    const change = pos != null && prev != null ? prev - pos : null;
    const first = ranked.length ? (history.find((v) => v != null) ?? null) : null;
    return {
      id: i,
      keyword: String(k?.keyword || `Keyword ${i + 1}`),
      url: String(k?.url || ""),
      intent: k?.intent ? String(k.intent) : "",
      volume: Math.max(0, fin(k?.volume) ?? 0),
      history,
      pos,
      prev,
      change,
      best,
      isNew,
      isLost,
      chgSort: isNew ? 0.5 : isLost ? -1000 : (change ?? 0),
      trend: first != null && pos != null ? first - pos : 0,
      min: ranked.length ? Math.min(...ranked) : null,
      max: ranked.length ? Math.max(...ranked) : null,
    };
  });
}

function matches(r: Row, f: RankFilter) {
  if (f === "top3") return r.pos != null && r.pos <= 3;
  if (f === "top10") return r.pos != null && r.pos <= 10;
  if (f === "improved") return (r.change != null && r.change > 0) || r.isNew;
  if (f === "declined") return (r.change != null && r.change < 0) || r.isLost;
  return true;
}

const reduceMotion = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const mono = "font-(family-name:--srt-mono) uppercase";
const ring = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--srt-accent)";

/* ---------- icons ---------- */
const IconSearch = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true" className={className}>
    <circle cx="7" cy="7" r="4.5" />
    <path d="m10.5 10.5 3 3" />
  </svg>
);
const IconUp = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 10 10" fill="currentColor" aria-hidden="true" className={className}>
    <path d="M5 1.5 9 8H1z" />
  </svg>
);
const IconDown = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 10 10" fill="currentColor" aria-hidden="true" className={className}>
    <path d="M5 8.5 1 2h8z" />
  </svg>
);

/* ---------- sparkline ---------- */
function Spark({ r }: { r: Row }) {
  const W = 100, H = 28, P = 4;
  const pts = r.history, n = pts.length;
  const tone = r.trend > 0 ? "[--c:var(--srt-up)]" : r.trend < 0 ? "[--c:var(--srt-down)]" : "[--c:var(--srt-flat)]";
  let d = "";
  if (n && r.min != null && r.max != null) {
    const lo = r.min, hi = r.max === r.min ? r.min + 1 : r.max;
    const x = (i: number) => (n > 1 ? P + (i * (W - P * 2)) / (n - 1) : W / 2);
    const y = (v: number) => (r.max === r.min ? H / 2 : P + ((v - lo) / (hi - lo)) * (H - P * 2));
    let pen = false;
    pts.forEach((v, i) => {
      if (v == null) {
        pen = false;
        return;
      }
      d += `${pen ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)} `;
      pen = true;
    });
    const last = pts[n - 1];
    return (
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`8-week trend: ${pts.map((v) => (v == null ? "–" : v)).join(", ")}`} className={cx("ml-auto block h-7 w-[100px] overflow-visible @max-[540px]:h-[26px] @max-[540px]:w-16", tone)}>
        <line x1={0} x2={W} y1={H - 1} y2={H - 1} className="stroke-(--srt-line)" strokeWidth={1} strokeDasharray="2 3" />
        <path d={d.trim()} className="fill-none stroke-(--c)" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
        {last != null && <circle cx={x(n - 1).toFixed(1)} cy={y(last).toFixed(1)} r={2.6} className="fill-(--c) stroke-(--srt-card)" strokeWidth={1.5} />}
      </svg>
    );
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`8-week trend: ${pts.map((v) => (v == null ? "–" : v)).join(", ")}`} className="ml-auto block h-7 w-[100px] overflow-visible @max-[540px]:h-[26px] @max-[540px]:w-16">
      <line x1={0} x2={W} y1={H - 1} y2={H - 1} className="stroke-(--srt-line)" strokeWidth={1} strokeDasharray="2 3" />
    </svg>
  );
}

function Change({ r }: { r: Row }) {
  const base = "inline-flex items-center gap-1 font-(family-name:--srt-mono) text-[13px] leading-none font-semibold";
  if (r.isNew)
    return <span className={cx(mono, "inline-flex rounded-[5px] bg-(--srt-accent-soft) px-1.5 py-1 text-[10px] leading-none font-semibold tracking-[.07em] text-(--srt-accent)")}>New</span>;
  if (r.isLost)
    return (
      <span className={cx(base, "text-(--srt-down)")}>
        <IconDown className="size-[9px]" />
        Lost
      </span>
    );
  if (r.change == null || r.change === 0)
    return (
      <span className={cx(base, "text-(--srt-flat)")}>
        —{r.change === 0 && <span className="sr-only">no change</span>}
      </span>
    );
  const up = r.change > 0;
  return (
    <span className={cx(base, up ? "text-(--srt-up)" : "text-(--srt-down)")}>
      {up ? <IconUp className="size-[9px]" /> : <IconDown className="size-[9px]" />}
      {Math.abs(r.change)}
      <span className="sr-only"> {up ? "up" : "down"}</span>
    </span>
  );
}

/* ---------- detail: history chart + facts ---------- */
function Detail({ r, weeks, int, announce }: { r: Row; weeks: string[]; int: (v: number) => string; announce: (s: string) => void }) {
  const wk = (i: number) => (weeks[i] != null ? String(weeks[i]) : `W${i + 1}`);
  const pts = r.history, n = pts.length;
  const [active, setActive] = useState(-1);
  const chartRef = useRef<HTMLDivElement>(null);

  const vals = pts.filter((v): v is number => v != null);
  if (r.best != null) vals.push(r.best);
  const lo = vals.length ? Math.max(1, Math.min(...vals) - 1) : 1;
  let hi = vals.length ? Math.max(...vals) + 1 : 10;
  if (hi - lo < 4) hi = lo + 4;
  const xp = (i: number) => (n > 1 ? 3 + (i * 94) / (n - 1) : 50);
  const yp = (v: number) => 6 + ((v - lo) / (hi - lo)) * 88;
  const range = hi - lo, step = range <= 6 ? 1 : range <= 12 ? 2 : range <= 30 ? 5 : 10;
  const ticks: number[] = [];
  if (lo === 1) ticks.push(1);
  for (let t = Math.ceil(lo / step) * step; t <= hi; t += step) if (!ticks.includes(t) && t >= lo) ticks.push(t);
  const bestY = r.best != null ? yp(r.best) : null;

  const segs: number[][] = [];
  let cur: number[] = [];
  pts.forEach((v, i) => {
    if (v == null) {
      if (cur.length) segs.push(cur);
      cur = [];
    } else cur.push(i);
  });
  if (cur.length) segs.push(cur);

  const show = (i: number) => {
    setActive(i);
    if (i < 0) return;
    const v = pts[i], p = i > 0 ? pts[i - 1] : null;
    let line = "";
    if (v != null && p != null) {
      const c = p - v;
      line = c === 0 ? "no change" : `${c > 0 ? "▲" : "▼"} ${Math.abs(c)} vs previous week`;
    }
    announce(`${wk(i)}: ${v == null ? "Not in the top 100" : `position ${v}`}${line ? `, ${line}` : ""}`);
  };
  const tipLine = (i: number) => {
    const v = pts[i], p = i > 0 ? pts[i - 1] : null;
    if (v == null || p == null) return "";
    const c = p - v;
    return c === 0 ? "no change" : `${c > 0 ? "▲" : "▼"} ${Math.abs(c)} vs previous week`;
  };

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const rel = ((e.clientX - box.left) / box.width) * 100;
    let b = 0, bd = Infinity;
    pts.forEach((_, i) => {
      const dd = Math.abs(xp(i) - rel);
      if (dd < bd) {
        bd = dd;
        b = i;
      }
    });
    if (b !== active) show(b);
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!n) return;
    let i = active < 0 ? n - 1 : active;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") i = Math.min(n - 1, i + 1);
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") i = Math.max(0, i - 1);
    else if (e.key === "Home") i = 0;
    else if (e.key === "End") i = n - 1;
    else return;
    e.preventDefault();
    show(i);
  };

  const firstIdx = pts.findIndex((v) => v != null);
  let moved = "—";
  let movedTone = "";
  if (firstIdx >= 0 && r.pos != null) {
    const m = (pts[firstIdx] as number) - r.pos;
    movedTone = m > 0 ? "text-(--srt-up)" : m < 0 ? "text-(--srt-down)" : "";
    moved = m === 0 ? "no change" : `${m > 0 ? "▲" : "▼"} ${Math.abs(m)} ${Math.abs(m) === 1 ? "position" : "positions"}`;
    if (firstIdx > 0) moved += ` (${wk(firstIdx)})`;
  }
  const facts: { k: string; v: string; wide?: boolean; mono?: boolean; tone?: string }[] = [
    { k: "Ranking URL", v: r.url || "—", wide: true, mono: true },
    { k: "This week", v: r.pos == null ? "Not in the top 100" : `#${r.pos}` },
    { k: "Best position", v: r.best == null ? "—" : `#${r.best}` },
    { k: "8-week range", v: r.min == null ? "—" : r.min === r.max ? `#${r.min}` : `#${r.min} – #${r.max}` },
    { k: "Over 8 weeks", v: moved, tone: movedTone },
    { k: "Monthly searches", v: int(r.volume) },
  ];

  const av = active >= 0 ? pts[active] : null;
  const label = "absolute font-(family-name:--srt-mono) text-[10.5px] leading-none font-medium whitespace-nowrap text-(--srt-faint) pointer-events-none";

  return (
    <div className="grid grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)] gap-x-[26px] gap-y-[18px] pt-1.5 pr-[18px] pb-5 pl-11 @max-[760px]:grid-cols-1 @max-[760px]:px-4 @max-[760px]:pt-1 @max-[760px]:pb-[18px] @max-[540px]:px-3 @max-[540px]:pt-0 @max-[540px]:pb-3.5">
      <div
        ref={chartRef}
        tabIndex={0}
        role="group"
        aria-label={`Rank history: ${r.keyword}. Use the left and right arrow keys to step through the weeks.`}
        onFocus={() => show(active >= 0 ? active : n - 1)}
        onBlur={() => setActive(-1)}
        onKeyDown={onKey}
        className="relative min-w-0 rounded-[10px] border border-(--srt-line) bg-(--srt-card) pt-3.5 pr-4 pb-[30px] pl-11 focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-(--srt-accent) @max-[540px]:pt-3 @max-[540px]:pr-2.5 @max-[540px]:pb-7 @max-[540px]:pl-[34px]"
      >
        <p aria-hidden="true" className={cx(mono, "m-0 mb-3 -ml-7 flex flex-wrap justify-between gap-2.5 text-[10.5px] leading-[1.2] font-medium tracking-[.08em] text-(--srt-faint) @max-[540px]:-ml-[22px]")}>
          <span>Rank history</span>
          <span>
            {wk(0)} – {wk(n - 1)}
          </span>
        </p>
        <div
          aria-hidden="true"
          onPointerMove={onMove}
          onPointerLeave={() => document.activeElement !== chartRef.current && setActive(-1)}
          className="relative h-[164px] cursor-crosshair touch-pan-y @max-[540px]:h-[140px]"
        >
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
            {lo <= 10 && <rect x={0} y={0} width={100} height={yp(Math.min(10.5, hi))} className="fill-(--srt-band)" />}
            {ticks.map((t) => (
              <line key={t} x1={0} x2={100} y1={yp(t)} y2={yp(t)} className="stroke-(--srt-line)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
            ))}
            {r.best != null && (
              <line x1={0} x2={100} y1={yp(r.best)} y2={yp(r.best)} className="stroke-(--srt-accent) opacity-70" strokeWidth={1} strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
            )}
            {segs.map((seg, k) => {
              const dLine = seg.map((i, j) => `${j ? "L" : "M"}${xp(i)} ${yp(pts[i] as number)}`).join(" ");
              return (
                <g key={k}>
                  {seg.length > 1 && <path d={`${dLine} L${xp(seg[seg.length - 1])} 100 L${xp(seg[0])} 100 Z`} className="fill-(--srt-accent) opacity-8" />}
                  <path d={dLine} className="fill-none stroke-(--srt-accent)" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                </g>
              );
            })}
            <line
              x1={active >= 0 ? xp(active) : 0}
              x2={active >= 0 ? xp(active) : 0}
              y1={0}
              y2={100}
              className={cx("stroke-(--srt-faint) transition-opacity duration-150 motion-reduce:transition-none", active >= 0 ? "opacity-80" : "opacity-0")}
              strokeWidth={1}
              strokeDasharray="2 3"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          {lo <= 10 && (bestY == null || bestY > 26) && (
            <span className={cx(label, "top-0.5 right-0.5 font-semibold tracking-[.04em] text-(--srt-accent) opacity-85")}>Top 10</span>
          )}
          {ticks.map((t) => (
            <span key={t} className={cx(label, "-left-2.5 -translate-x-full -translate-y-1/2")} style={{ top: `${yp(t)}%` }}>
              #{t}
            </span>
          ))}
          {r.best != null && bestY != null && (
            <span className={cx(label, "left-1.5 font-semibold tracking-[.04em] text-(--srt-accent)", bestY < 20 ? "translate-y-[35%]" : "-translate-y-[120%]")} style={{ top: `${bestY}%` }}>
              Best #{r.best}
            </span>
          )}
          {pts.map((v, i) => (
            <span key={`x${i}`} className={cx(label, "-bottom-5 -translate-x-1/2", n > 6 && (n - 1 - i) % 2 === 1 && "@max-[540px]:hidden")} style={{ left: `${xp(i)}%` }}>
              {wk(i)}
            </span>
          ))}
          {pts.map((v, i) =>
            v == null ? null : (
              <span
                key={`d${i}`}
                className={cx(
                  "pointer-events-none absolute -mt-[4.5px] -ml-[4.5px] size-[9px] rounded-full transition-[transform,background-color] duration-[180ms] motion-reduce:transition-none",
                  i === active
                    ? "scale-[1.45] bg-(--srt-accent) shadow-[0_0_0_4px_var(--srt-accent-soft)]"
                    : cx("shadow-[inset_0_0_0_2px_var(--srt-accent)]", i === n - 1 ? "bg-(--srt-accent)" : "bg-(--srt-card)")
                )}
                style={{ left: `${xp(i)}%`, top: `${yp(v)}%` }}
              />
            )
          )}
          <div
            className={cx(
              "pointer-events-none absolute z-[2] min-w-24 rounded-lg bg-(--srt-ink) px-2.5 py-2 text-xs leading-[1.35] font-medium whitespace-nowrap text-(--srt-card) shadow-[0_12px_24px_-12px_var(--srt-shadow)] transition-opacity duration-150 motion-reduce:transition-none",
              active >= 0 ? "opacity-100" : "opacity-0",
              av != null && yp(av) < 45 ? "translate-x-[-50%] translate-y-3.5" : "translate-x-[-50%] translate-y-[calc(-100%-12px)]"
            )}
            style={{
              left: `${Math.min(Math.max(xp(Math.max(active, 0)), 12), 88)}%`,
              top: `${active >= 0 ? (av == null ? 50 : yp(av)) : 50}%`,
            }}
          >
            {active >= 0 && (
              <>
                <small className="block font-(family-name:--srt-mono) text-[11px] leading-[1.3] font-normal opacity-75">{wk(active)}</small>
                <b className="block font-(family-name:--srt-mono) text-[15px] leading-[1.2] font-[650]">{av == null ? "Not ranking" : `#${av}`}</b>
                {tipLine(active) && <small className="block font-(family-name:--srt-mono) text-[11px] leading-[1.3] font-normal opacity-75">{tipLine(active)}</small>}
              </>
            )}
          </div>
        </div>
        <table className="sr-only">
          <caption>Rank history: {r.keyword}</caption>
          <tbody>
            {pts.map((v, i) => (
              <tr key={i}>
                <th>{wk(i)}</th>
                <td>{v == null ? "Not in the top 100" : `#${v}`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dl className="m-0 grid grid-cols-2 content-start border-t border-(--srt-line)">
        {facts.map((f, i) => (
          <div key={f.k} className={cx("m-0 grid min-w-0 gap-[5px] border-b border-(--srt-line) py-[11px]", f.wide && "col-span-full", !f.wide && i % 2 === 1 && "pr-3")}>
            <dt className={cx(mono, "text-[10px] leading-[1.2] font-medium tracking-[.08em] text-(--srt-faint)")}>{f.k}</dt>
            <dd
              className={cx(
                "m-0 [overflow-wrap:anywhere] tabular-nums",
                f.mono ? "font-(family-name:--srt-mono) text-[12.5px] leading-[1.4] font-medium" : "text-sm leading-[1.3] font-semibold @max-[540px]:text-[13.5px]",
                f.tone
              )}
            >
              {f.v}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** Detail row that animates its height open and closed. */
function DetailRow({ id, open, colSpan, children }: { id: string; open: boolean; colSpan: number; children: () => ReactNode }) {
  const [shown, setShown] = useState(open);
  const inner = useRef<HTMLDivElement>(null);
  const first = useRef(true);

  useLayoutEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (open) setShown(true);
    else if (shown) {
      const el = inner.current;
      if (!el || reduceMotion() || !("animate" in el)) {
        setShown(false);
        return;
      }
      const a = el.animate(
        [
          { height: `${el.offsetHeight}px`, opacity: 1, overflow: "hidden" },
          { height: "0px", opacity: 0, overflow: "hidden" },
        ],
        { duration: 220, easing: "ease-in" }
      );
      a.onfinish = () => setShown(false);
      return () => {
        a.onfinish = null;
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useLayoutEffect(() => {
    if (!shown || !open) return;
    const el = inner.current;
    if (!el || reduceMotion() || !("animate" in el)) return;
    const h = el.offsetHeight;
    el.animate(
      [
        { height: "0px", opacity: 0, overflow: "hidden" },
        { height: `${h}px`, opacity: 1, overflow: "hidden" },
      ],
      { duration: 320, easing: "cubic-bezier(.2,.7,.2,1)" }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown]);

  return (
    <tr id={id} hidden={!shown} className="@max-[540px]:block">
      <td colSpan={colSpan} className="border-t-0 bg-(--srt-tint) p-0 @max-[540px]:block">
        {shown && <div ref={inner}>{children()}</div>}
      </td>
    </tr>
  );
}

/**
 * Where a site ranks for each tracked keyword this week, how far it moved and an
 * eight-week history. Sort any column, search, filter by rank or movement, and open a row.
 */
export function SeoRankingTracker({
  eyebrow,
  title,
  site,
  period,
  weeks = [],
  keywords = [],
  source,
  locale = "en-US",
  sort: sortProp,
  defaultSort = { key: "position", dir: "asc" },
  onSortChange,
  filter: filterProp,
  defaultFilter = "all",
  onFilterChange,
  onKeywordSelect,
  className,
}: SeoRankingTrackerProps) {
  const uid = useId();
  const [sortState, setSortState] = useState<RankSort>(defaultSort);
  const [filterState, setFilterState] = useState<RankFilter>(defaultFilter);
  const sort = sortProp ?? sortState;
  const filter = filterProp && FILTERS.includes(filterProp) ? filterProp : filterState;
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Set<number>>(() => new Set());
  const [live, setLive] = useState("");
  const [ver, setVer] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const liveT = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(liveT.current), []);

  const rows = useMemo(() => model(keywords), [keywords]);
  // a new data set closes any open rows
  useEffect(() => setOpen(new Set()), [keywords]);

  const int = (v: number) => Math.round(v).toLocaleString(locale);
  const total = rows.length;

  const visibleFor = (f: RankFilter, q: string, s: RankSort) => {
    const qq = q.trim().toLowerCase();
    const val = (r: Row): number | string =>
      s.key === "keyword" ? r.keyword.toLowerCase() : s.key === "position" ? (r.pos ?? 999) : s.key === "change" ? r.chgSort : s.key === "best" ? (r.best ?? 999) : r.volume;
    return rows
      .filter((r) => matches(r, f) && (!qq || r.keyword.toLowerCase().includes(qq) || r.url.toLowerCase().includes(qq)))
      .sort((a, b) => {
        const va = val(a), vb = val(b);
        let c = typeof va === "string" ? va.localeCompare(vb as string) : (va as number) - (vb as number);
        if (s.dir === "desc") c = -c;
        return c || (a.pos ?? 999) - (b.pos ?? 999) || a.keyword.localeCompare(b.keyword);
      });
  };
  const visible = visibleFor(filter, query, sort);

  /* ---------- summary ---------- */
  const now = rows.filter((r) => r.pos != null), before = rows.filter((r) => r.prev != null);
  const avg = now.length ? now.reduce((a, r) => a + (r.pos as number), 0) / now.length : null;
  const avgPrev = before.length ? before.reduce((a, r) => a + (r.prev as number), 0) / before.length : null;
  let delta: { text: string; tone: string } | null = null;
  if (avg != null && avgPrev != null) {
    const diff = Math.round((avgPrev - avg) * 10) / 10;
    delta = {
      tone: diff > 0 ? "up" : diff < 0 ? "down" : "flat",
      text: diff === 0 ? "no change" : `${diff > 0 ? "▲" : "▼"} ${Math.abs(diff).toFixed(1)} ${diff > 0 ? "better" : "worse"}`,
    };
  }
  const count = (f: RankFilter) => rows.filter((r) => matches(r, f)).length;
  const buckets = [
    { label: "1–3", c: "[--c:var(--srt-d1)]", n: rows.filter((r) => r.pos != null && r.pos <= 3).length },
    { label: "4–10", c: "[--c:var(--srt-d2)]", n: rows.filter((r) => r.pos != null && r.pos > 3 && r.pos <= 10).length },
    { label: "11–20", c: "[--c:var(--srt-d3)]", n: rows.filter((r) => r.pos != null && r.pos > 10 && r.pos <= 20).length },
    { label: "21–100", c: "[--c:var(--srt-d4)]", n: rows.filter((r) => r.pos != null && r.pos > 20).length },
    { label: "Not ranking", c: "[--c:var(--srt-d5)]", n: rows.filter((r) => r.pos == null).length },
  ];

  /* ---------- actions ---------- */
  const setSort = (s: RankSort) => {
    if (sortProp == null) setSortState(s);
    setVer((v) => v + 1);
    const col = COLS.find((c) => c.key === s.key);
    setLive(`Sorted by ${col?.label ?? s.key}, ${s.dir === "asc" ? "ascending" : "descending"}`);
    onSortChange?.(s);
  };
  const setFilter = (f: RankFilter) => {
    if (f === filter) return;
    if (filterProp == null) setFilterState(f);
    setVer((v) => v + 1);
    const shown = visibleFor(f, query, sort).length;
    setLive(`${shown} keywords shown`);
    onFilterChange?.({ filter: f, shown });
  };
  const onHeader = (key: RankSortKey, dir: RankSortDir) => setSort({ key, dir: sort.key === key ? (sort.dir === "asc" ? "desc" : "asc") : dir });
  const onSearch = (q: string) => {
    setQuery(q);
    clearTimeout(liveT.current);
    liveT.current = setTimeout(() => setLive(`${visibleFor(filter, q, sort).length} keywords shown`), 500);
  };
  const toggle = (r: Row) => {
    const isOpen = !open.has(r.id);
    setOpen((s) => {
      const n = new Set(s);
      if (isOpen) n.add(r.id);
      else n.delete(r.id);
      return n;
    });
    onKeywordSelect?.({ keyword: r.keyword, position: r.pos, change: r.change, best: r.best, url: r.url, volume: r.volume, expanded: isOpen });
  };
  const clearFilters = () => {
    setQuery("");
    if (filter !== "all") setFilter("all");
    searchRef.current?.focus();
  };
  const animateRows = ver > 0 && !reduceMotion();
  const sortValue = `${sort.key}:${sort.dir}`;
  const selValue = SORT_OPTIONS.find(([v]) => v === sortValue)?.[0] ?? SORT_OPTIONS.find(([v]) => v.startsWith(`${sort.key}:`))?.[0] ?? SORT_OPTIONS[0][0];

  const tdBase = "px-3.5 py-[11px] align-middle tabular-nums @max-[540px]:block @max-[540px]:border-0 @max-[540px]:p-0 @max-[540px]:text-left";
  const tdLabel =
    "@max-[540px]:before:mb-1.5 @max-[540px]:before:block @max-[540px]:before:font-(family-name:--srt-mono) @max-[540px]:before:text-[9.5px] @max-[540px]:before:leading-none @max-[540px]:before:font-medium @max-[540px]:before:tracking-[.08em] @max-[540px]:before:text-(--srt-faint) @max-[540px]:before:uppercase @max-[540px]:before:content-[attr(data-label)]";

  return (
    <div className={cx("@container block w-full max-w-[980px] font-(family-name:--srt-sans) text-(--srt-ink)", className)}>
      <section className="relative rounded-[14px] border border-(--srt-line) bg-(--srt-card) px-7 pt-[26px] pb-[18px] shadow-[0_28px_56px_-44px_var(--srt-shadow),0_2px_5px_-3px_var(--srt-shadow)] @max-[760px]:px-5 @max-[760px]:pt-[22px] @max-[760px]:pb-4 @max-[540px]:rounded-xl @max-[540px]:px-3.5 @max-[540px]:pt-5 @max-[540px]:pb-3.5">
        {/* header */}
        <header className="flex flex-wrap items-start justify-between gap-x-5 gap-y-3">
          <div className="grid min-w-0 gap-1.5">
            {eyebrow && (
              <span className={cx(mono, "inline-flex items-center gap-[7px] text-[10.5px] leading-none font-semibold tracking-[.1em] text-(--srt-accent)")}>
                <IconSearch className="size-[13px]" />
                {eyebrow}
              </span>
            )}
            {title && <h2 className="m-0 text-[clamp(19px,3.1cqi,23px)] leading-[1.2] font-[650] tracking-[-0.015em] text-balance">{title}</h2>}
            {site && <p className="m-0 font-(family-name:--srt-mono) text-[12.5px] leading-[1.4] [overflow-wrap:anywhere] text-(--srt-muted)">{site}</p>}
          </div>
          {period && (
            <span className="inline-flex flex-none items-center gap-2 rounded-lg border border-(--srt-line) bg-(--srt-tint) px-[11px] py-[7px] text-xs leading-none font-medium text-(--srt-muted) tabular-nums">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true" className="size-[13px] text-(--srt-faint)">
                <rect x="2.5" y="3.5" width="11" height="10" rx="2" />
                <path d="M2.5 6.5h11M5.5 2v3M10.5 2v3" />
              </svg>
              {period}
            </span>
          )}
        </header>

        {/* summary */}
        <dl className="m-0 mt-5 grid grid-cols-[minmax(0,1.25fr)_repeat(3,minmax(0,1fr))] rounded-t-xl border border-b-0 border-(--srt-line) p-0 @max-[760px]:grid-cols-2">
          {[
            {
              k: "Avg. position",
              v: (
                <>
                  <span className="font-(family-name:--srt-mono) text-[30px] leading-none font-semibold tracking-[-0.04em] tabular-nums @max-[540px]:text-[26px]">{avg == null ? "—" : avg.toFixed(1)}</span>
                  {delta && (
                    <span
                      className={cx(
                        "inline-flex items-center gap-1 rounded-md px-[7px] py-1 text-[11.5px] leading-none font-semibold tabular-nums",
                        delta.tone === "up" ? "bg-(--srt-accent-soft) text-(--srt-up)" : delta.tone === "down" ? "bg-(--srt-down-soft) text-(--srt-down)" : "bg-(--srt-tint) text-(--srt-muted)"
                      )}
                    >
                      {delta.text}
                    </span>
                  )}
                </>
              ),
            },
            {
              k: "In top 3",
              v: (
                <>
                  <span className="font-(family-name:--srt-mono) text-[30px] leading-none font-semibold tracking-[-0.04em] tabular-nums @max-[540px]:text-[26px]">{count("top3")}</span>
                  <span className="font-(family-name:--srt-mono) text-xs leading-none font-medium text-(--srt-faint)">/ {total}</span>
                </>
              ),
            },
            {
              k: "In top 10",
              v: (
                <>
                  <span className="font-(family-name:--srt-mono) text-[30px] leading-none font-semibold tracking-[-0.04em] tabular-nums @max-[540px]:text-[26px]">{count("top10")}</span>
                  <span className="font-(family-name:--srt-mono) text-xs leading-none font-medium text-(--srt-faint)">/ {total}</span>
                </>
              ),
            },
            {
              k: "Moved this week",
              v: (
                <span className="inline-flex items-baseline gap-3 [&>span]:inline-flex [&>span]:items-baseline [&>span]:gap-[5px] [&>span]:font-(family-name:--srt-mono) [&>span]:text-[22px] [&>span]:leading-none [&>span]:font-semibold [&>span]:tabular-nums">
                  <span className="text-(--srt-up)">
                    <IconUp className="size-[11px] self-center" />
                    {count("improved")}
                    <small className="font-(family-name:--srt-sans) text-[11px] leading-none font-medium text-(--srt-faint)">up</small>
                  </span>
                  <span className="text-(--srt-down)">
                    <IconDown className="size-[11px] self-center" />
                    {count("declined")}
                    <small className="font-(family-name:--srt-sans) text-[11px] leading-none font-medium text-(--srt-faint)">down</small>
                  </span>
                </span>
              ),
            },
          ].map((s, i) => (
            <div
              key={s.k}
              className={cx(
                "m-0 grid min-w-0 content-start gap-[7px] px-[18px] pt-3.5 pb-3 @max-[540px]:px-3 @max-[540px]:pt-3 @max-[540px]:pb-[11px]",
                i > 0 && "border-l border-(--srt-line)",
                i === 2 && "@max-[760px]:border-l-0",
                i >= 2 && "@max-[760px]:border-t @max-[760px]:border-(--srt-line)"
              )}
            >
              <dt className={cx(mono, "text-[10.5px] leading-[1.2] font-medium tracking-[.08em] text-(--srt-faint)")}>{s.k}</dt>
              <dd className="m-0 flex flex-wrap items-baseline gap-x-[9px] gap-y-1">{s.v}</dd>
            </div>
          ))}
        </dl>

        {/* distribution */}
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-2 rounded-b-xl border border-(--srt-line) bg-(--srt-tint) px-[18px] pt-[11px] pb-3 @max-[540px]:grid-cols-1 @max-[540px]:px-3">
          <span className={cx(mono, "text-[10.5px] leading-none font-medium tracking-[.08em] text-(--srt-faint)")}>Position spread</span>
          <div className="grid min-w-0 gap-2">
            <div aria-hidden="true" className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-(--srt-d5)">
              {buckets.map(
                (b) =>
                  b.n > 0 && (
                    <span key={b.label} className={cx("h-full min-w-0 shrink grow-(--n) basis-0 bg-(--c) transition-[flex-grow] duration-[450ms] ease-out-soft motion-reduce:transition-none", b.c)} style={{ ["--n" as string]: b.n }} />
                  )
              )}
            </div>
            <ul className="m-0 flex list-none flex-wrap gap-x-3.5 gap-y-1 p-0 text-[11.5px] leading-[1.2] font-medium text-(--srt-muted)">
              {buckets
                .filter((b, i) => b.n > 0 || i < 4)
                .map((b) => (
                  <li key={b.label} className={cx("inline-flex items-center gap-1.5", b.c)}>
                    <i className="size-2 rounded-[2px] bg-(--c) shadow-[inset_0_0_0_1px_rgba(0,0,0,.06)]" />
                    {b.label} <b className="font-(family-name:--srt-mono) text-[11.5px] leading-none font-semibold text-(--srt-ink)">{b.n}</b>
                  </li>
                ))}
            </ul>
          </div>
        </div>

        {/* toolbar */}
        <div className="mt-[18px] flex flex-wrap items-center justify-between gap-x-3.5 gap-y-2.5">
          <label className="relative max-w-[300px] flex-[1_1_220px] @max-[760px]:max-w-none @max-[760px]:basis-full">
            <span className="sr-only">Search keywords</span>
            <IconSearch className="pointer-events-none absolute top-1/2 left-[11px] size-3.5 -translate-y-1/2 text-(--srt-faint)" />
            <input
              ref={searchRef}
              type="search"
              autoComplete="off"
              spellCheck={false}
              placeholder="Filter keywords or URLs"
              value={query}
              onChange={(e) => onSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape" && query) {
                  e.preventDefault();
                  setQuery("");
                }
              }}
              className="box-border h-9 w-full rounded-[9px] border border-(--srt-line) bg-(--srt-card) pr-3 pl-[33px] text-[13.5px] leading-none text-(--srt-ink) transition-[border-color,box-shadow] duration-200 placeholder:text-(--srt-faint) focus:border-(--srt-accent) focus:shadow-[0_0_0_3px_var(--srt-accent-soft)] focus:outline-none motion-reduce:transition-none"
            />
          </label>
          <div role="group" aria-label="Filter keywords" className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={f === filter}
                onClick={() => setFilter(f)}
                className={cx(
                  "group/chip inline-flex h-8 cursor-pointer items-center gap-[7px] rounded-full border border-(--srt-line) bg-(--srt-card) px-[11px] text-[12.5px] leading-none font-medium text-(--srt-muted) transition-[background-color,color,border-color] duration-200 hover:border-(--srt-faint) hover:text-(--srt-ink) aria-pressed:border-(--srt-ink) aria-pressed:bg-(--srt-ink) aria-pressed:text-(--srt-card) motion-reduce:transition-none",
                  ring
                )}
              >
                {FILTER_LABEL[f]}{" "}
                <b className="rounded-[5px] bg-(--srt-tint) px-[5px] py-[3px] font-(family-name:--srt-mono) text-[11px] leading-none font-semibold text-(--srt-muted) transition-colors duration-200 group-aria-pressed/chip:bg-[rgba(127,127,127,.28)] group-aria-pressed/chip:text-(--srt-card) motion-reduce:transition-none">
                  {count(f)}
                </b>
              </button>
            ))}
          </div>
          <label className={cx(mono, "hidden w-full items-center gap-2 text-[10.5px] leading-none font-medium tracking-[.08em] text-(--srt-faint) @max-[540px]:flex")}>
            <span>Sort</span>
            <select
              value={selValue}
              onChange={(e) => {
                const [k, d] = e.target.value.split(":") as [RankSortKey, RankSortDir];
                setSort({ key: k, dir: d });
              }}
              className={cx("h-[34px] min-w-0 flex-1 rounded-lg border border-(--srt-line) bg-(--srt-card) px-2.5 text-[13px] leading-none font-medium tracking-normal text-(--srt-ink) normal-case", ring)}
            >
              {SORT_OPTIONS.map(([v, t]) => (
                <option key={v} value={v}>
                  {t}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* table */}
        <div className="mt-3 overflow-hidden rounded-xl border border-(--srt-line)">
          <table className="w-full border-collapse text-sm @max-[540px]:block">
            <thead className="@max-[540px]:absolute @max-[540px]:size-px @max-[540px]:overflow-hidden @max-[540px]:[clip:rect(0_0_0_0)]">
              <tr>
                {COLS.map((c) => {
                  const active = c.dir && sort.key === c.key;
                  return (
                    <th
                      key={c.key}
                      scope="col"
                      aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : undefined}
                      className={cx(
                        mono,
                        "border-b border-(--srt-line) bg-(--srt-head) p-0 text-left align-middle text-[10.5px] leading-none font-semibold tracking-[.07em] whitespace-nowrap text-(--srt-faint)",
                        c.th,
                        !c.dir && "px-3.5 py-3"
                      )}
                    >
                      {c.dir ? (
                        <button
                          type="button"
                          onClick={() => onHeader(c.key as RankSortKey, c.dir as RankSortDir)}
                          className={cx(
                            "group/sort flex w-full cursor-pointer items-center gap-1.5 border-0 bg-transparent px-3.5 py-3 text-inherit uppercase transition-colors duration-200 [font:inherit] [letter-spacing:inherit] hover:text-(--srt-ink) focus-visible:rounded-md focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--srt-accent) motion-reduce:transition-none",
                            c.th.includes("text-right") && "justify-end",
                            active && "text-(--srt-ink)"
                          )}
                        >
                          <span>{c.label}</span>
                          <svg
                            viewBox="0 0 9 11"
                            fill="currentColor"
                            aria-hidden="true"
                            className={cx(
                              "h-[11px] w-[9px] flex-none transition-[transform,opacity] duration-250 motion-reduce:transition-none",
                              active ? "text-(--srt-accent) opacity-100" : "opacity-45",
                              active && sort.dir === "desc" && "rotate-180"
                            )}
                          >
                            <path d="M4.5 0 9 5H0z" />
                            <path d="M4.5 11 0 6h9z" opacity=".35" />
                          </svg>
                        </button>
                      ) : (
                        c.label
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="@max-[540px]:block">
              {visible.flatMap((r, i) => {
                const isOpen = open.has(r.id);
                const detailId = `${uid}-d${r.id}`;
                const tier = r.pos == null ? "none" : r.pos <= 3 ? "top3" : r.pos <= 10 ? "top10" : "rest";
                const td = cx(tdBase, i > 0 && "border-t border-(--srt-line)");
                return [
                  <tr
                    key={`${r.id}-${ver}`}
                    style={animateRows ? { animationDelay: `${Math.min(i, 12) * 18}ms` } : undefined}
                    className={cx(
                      "transition-colors duration-200 hover:bg-(--srt-hover) motion-reduce:transition-none @max-[540px]:grid @max-[540px]:grid-cols-4 @max-[540px]:gap-x-2 @max-[540px]:gap-y-3 @max-[540px]:px-3 @max-[540px]:py-3.5",
                      i > 0 && "@max-[540px]:border-t @max-[540px]:border-(--srt-line)",
                      isOpen && "bg-(--srt-tint)",
                      animateRows && "animate-[srt-in_.35s_cubic-bezier(.2,.7,.2,1)_both] motion-reduce:animate-none"
                    )}
                  >
                    <td className={cx(td, "@max-[540px]:col-span-3")}>
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        aria-controls={detailId}
                        aria-label={`Show history for ${r.keyword}`}
                        onClick={() => toggle(r)}
                        className={cx(
                          "group/kw -my-0.5 grid w-full cursor-pointer grid-cols-[18px_minmax(0,1fr)] items-start gap-2 rounded-[7px] border-0 bg-transparent py-0.5 pr-1 pl-0 text-left text-inherit",
                          ring
                        )}
                      >
                        <span className="mt-px grid size-[18px] place-items-center rounded-[5px] bg-(--srt-tint) text-(--srt-faint) transition-[transform,background-color,color] duration-300 ease-out-soft group-hover/kw:text-(--srt-accent) group-aria-expanded/kw:rotate-90 group-aria-expanded/kw:bg-(--srt-accent) group-aria-expanded/kw:text-(--srt-accent-ink) motion-reduce:transition-none">
                          <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-2.5">
                            <path d="m3.5 2 3 3-3 3" />
                          </svg>
                        </span>
                        <span className="grid min-w-0 gap-1">
                          <span className="text-sm leading-[1.3] font-semibold [overflow-wrap:anywhere] decoration-(--srt-line) underline-offset-[3px] group-hover/kw:underline">{r.keyword}</span>
                          {(r.url || r.intent) && (
                            <span className="flex flex-wrap items-center gap-1.5 font-(family-name:--srt-mono) text-[11.5px] leading-[1.3] [overflow-wrap:anywhere] text-(--srt-muted)">
                              {r.url && <span>{r.url}</span>}
                              {r.intent && (
                                <span className={cx(mono, "rounded-[4px] border border-(--srt-line) px-[5px] py-[3px] text-[9.5px] leading-none font-semibold tracking-[.06em] text-(--srt-faint)")}>{r.intent}</span>
                              )}
                            </span>
                          )}
                        </span>
                      </button>
                    </td>
                    <td data-label="Position" className={cx(td, tdLabel, "text-right")}>
                      <span
                        title={r.pos == null ? "Not in the top 100" : undefined}
                        className={cx(
                          "box-border inline-grid h-7 min-w-[38px] place-items-center rounded-lg px-2 font-(family-name:--srt-mono) text-[15px] leading-none font-[650] tracking-[-0.02em] @max-[540px]:h-[26px] @max-[540px]:min-w-[34px] @max-[540px]:text-sm",
                          tier === "top3" && "bg-(--srt-accent) text-(--srt-accent-ink)",
                          tier === "top10" && "bg-(--srt-accent-soft) text-(--srt-accent)",
                          tier === "rest" && "bg-(--srt-tint) text-(--srt-ink)",
                          tier === "none" && "bg-transparent text-xs text-(--srt-faint) shadow-[inset_0_0_0_1px_var(--srt-line)] @max-[540px]:text-xs"
                        )}
                      >
                        {r.pos == null ? "—" : r.pos}
                      </span>
                    </td>
                    <td data-label="Change" className={cx(td, tdLabel, "text-right")}>
                      <Change r={r} />
                    </td>
                    <td data-label="Best" className={cx(td, tdLabel, "text-right @max-[760px]:hidden @max-[540px]:block")}>
                      <span className="font-(family-name:--srt-mono) text-[13px] leading-none font-medium text-(--srt-muted)">
                        {r.best != null ? (
                          <>
                            #<b className="font-semibold text-(--srt-ink)">{r.best}</b>
                          </>
                        ) : (
                          "—"
                        )}
                      </span>
                    </td>
                    <td data-label="Volume" className={cx(td, tdLabel, "text-right")}>
                      <span className="font-(family-name:--srt-mono) text-[13px] leading-none font-medium text-(--srt-muted)">{int(r.volume)}</span>
                    </td>
                    <td className={cx(td, "text-right @max-[540px]:col-start-4 @max-[540px]:row-start-1 @max-[540px]:self-start")}>
                      <Spark r={r} />
                    </td>
                  </tr>,
                  <DetailRow key={`d${r.id}`} id={detailId} open={isOpen} colSpan={COLS.length}>
                    {() => <Detail r={r} weeks={weeks} int={int} announce={setLive} />}
                  </DetailRow>,
                ];
              })}
            </tbody>
          </table>
          {!visible.length && (
            <div className="grid justify-items-center gap-3 px-4 py-[30px] text-center text-[13.5px] text-(--srt-muted)">
              <span>No keywords match these filters.</span>
              <button
                type="button"
                onClick={clearFilters}
                className={cx("cursor-pointer rounded-lg border border-(--srt-line) bg-(--srt-card) px-3 py-2 text-[12.5px] leading-none font-semibold text-(--srt-ink) hover:border-(--srt-accent) hover:text-(--srt-accent)", ring)}
              >
                Clear filters
              </button>
            </div>
          )}
        </div>

        <footer className="mt-3 flex flex-wrap justify-between gap-x-4 gap-y-1.5 text-xs text-(--srt-faint)">
          <span>
            Showing {visible.length} of {total} keywords
          </span>
          {source && <span>{source}</span>}
        </footer>
        <p className="sr-only" aria-live="polite">
          {live}
        </p>
      </section>
    </div>
  );
}

export default SeoRankingTracker;
