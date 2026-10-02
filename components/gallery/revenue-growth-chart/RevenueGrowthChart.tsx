"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { cx } from "@/lib/format";

export type RevenueRange = "6m" | "12m";

export interface RevenuePoint {
  /** Month as YYYY-MM, oldest first. */
  month: string;
  /** Revenue for that month. */
  revenue: number;
  /** Revenue for the same month a year earlier. */
  lastYear?: number | null;
}

export interface RevenueGrowthLabels {
  range: string;
  compare: string;
  cumulative: string;
  total: string;
  totalSub: string;
  latest: string;
  latestSub: string;
  avg: string;
  avgSub: string;
  thisYear: string;
  lastYear: string;
  running: string;
  change: string;
  hint: string;
  chart: string;
  caption: string;
  month: string;
  revenue: string;
  running2: string;
  noData: string;
}

export interface RevenueRangeChange {
  range: RevenueRange;
  total: number;
  growth: number | null;
}

export interface RevenueViewChange {
  compare: boolean;
  cumulative: boolean;
}

export interface RevenueGrowthChartProps {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  /** Any ISO currency code. */
  currency?: string;
  /** Monthly revenue, oldest first. */
  series: RevenuePoint[];
  /** Footer note, e.g. the data source. */
  source?: string;
  /** Controlled range. Leave out to let the range buttons manage it. */
  range?: RevenueRange;
  defaultRange?: RevenueRange;
  /** Controlled "compare to last year" toggle. */
  compare?: boolean;
  defaultCompare?: boolean;
  /** Controlled "cumulative" toggle. */
  cumulative?: boolean;
  defaultCumulative?: boolean;
  /** Fires when a range button is pressed, with the new range's total and growth. */
  onRangeChange?: (detail: RevenueRangeChange) => void;
  /** Fires when either toggle is pressed. */
  onViewChange?: (detail: RevenueViewChange) => void;
  /** Change this number to re-run the line-draw animation. */
  replayKey?: number;
  /** Override any built-in text. */
  labels?: Partial<RevenueGrowthLabels>;
  /** Number and date locale. */
  locale?: string;
  className?: string;
}

const LABELS: RevenueGrowthLabels = {
  range: "Date range",
  compare: "Compare to last year",
  cumulative: "Cumulative",
  total: "Revenue · last {n} months",
  totalSub: "vs {prev} in the same months last year",
  latest: "Latest month",
  latestSub: "{chg} vs {month} last year",
  avg: "Monthly average",
  avgSub: "Best month: {month} · {value}",
  thisYear: "This year",
  lastYear: "Last year",
  running: "running total",
  change: "Change",
  hint: "Hover the chart or use ← → to read each month",
  chart: "Revenue chart, {from} to {to}. Use the left and right arrow keys to read each month.",
  caption: "Monthly revenue, {from} to {to}",
  month: "Month",
  revenue: "Revenue",
  running2: "Running total",
  noData: "No revenue data to show.",
};

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;
const fill = (s: string, vars: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ""));
const ease = (t: number) => 1 - Math.pow(1 - t, 3);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const reduceMotion = () => typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/** Monotone cubic (Fritsch–Carlson): smooth, never overshoots the data. */
function smooth(pts: Array<[number, number]>): string {
  const n = pts.length;
  if (!n) return "";
  if (n === 1) return `M${pts[0][0]},${pts[0][1]}`;
  const dx: number[] = [], m: number[] = [], t: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = pts[i + 1][0] - pts[i][0];
    m[i] = (pts[i + 1][1] - pts[i][1]) / (dx[i] || 1);
  }
  t[0] = m[0];
  t[n - 1] = m[n - 2];
  for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) {
      t[i] = 0;
      t[i + 1] = 0;
      continue;
    }
    const a = t[i] / m[i], b = t[i + 1] / m[i], s = a * a + b * b;
    if (s > 9) {
      const k = 3 / Math.sqrt(s);
      t[i] = k * a * m[i];
      t[i + 1] = k * b * m[i];
    }
  }
  let d = `M${pts[0][0].toFixed(2)},${pts[0][1].toFixed(2)}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += `C${(pts[i][0] + h).toFixed(2)},${(pts[i][1] + t[i] * h).toFixed(2)} ${(pts[i + 1][0] - h).toFixed(2)},${(pts[i + 1][1] - t[i + 1] * h).toFixed(2)} ${pts[i + 1][0].toFixed(2)},${pts[i + 1][1].toFixed(2)}`;
  }
  return d;
}

function niceTicks(max: number): number[] {
  if (!(max > 0)) return [0, 1];
  const raw = max / 4, p = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((f) => f * p).find((s) => s >= raw) || 10 * p;
  const top = Math.ceil(max / step) * step;
  const out: number[] = [];
  for (let v = 0; v <= top + step / 2; v += step) out.push(Math.round(v * 1e6) / 1e6);
  return out;
}

interface ChartState {
  pts: Array<{ month: string; revenue: number; lastYear: number | null }>;
  cur: number[];
  prev: number[];
  hasPrev: boolean;
  showPrev: boolean;
  cum: boolean;
  ticks: number[];
  yMax: number;
  total: number;
  prevTotal: number | null;
  growth: number | null;
}

function computeState(series: RevenuePoint[], range: RevenueRange, cum: boolean, compare: boolean): ChartState {
  const all = series
    .filter((p) => p && isNum(p.revenue))
    .map((p) => ({ month: String(p.month || ""), revenue: Math.max(0, p.revenue), lastYear: isNum(p.lastYear) ? p.lastYear : null }));
  const pts = all.slice(-(range === "6m" ? 6 : 12));
  let a = 0, b = 0;
  const cur = pts.map((p) => (cum ? (a += p.revenue) : p.revenue));
  const hasPrev = pts.length > 0 && pts.every((p) => p.lastYear != null);
  const prev = hasPrev ? pts.map((p) => (cum ? (b += p.lastYear as number) : (p.lastYear as number))) : [];
  const showPrev = compare && hasPrev;
  const max = Math.max(1, ...cur, ...(showPrev ? prev : []));
  const ticks = niceTicks(max);
  const total = pts.reduce((x, p) => x + p.revenue, 0);
  const prevTotal = hasPrev ? pts.reduce((x, p) => x + (p.lastYear as number), 0) : null;
  const growth = prevTotal != null && prevTotal > 0 ? total / prevTotal - 1 : null;
  return { pts, cur, prev, hasPrev, showPrev, cum, ticks, yMax: ticks[ticks.length - 1], total, prevTotal, growth };
}

function geo(width: number) {
  const W = Math.max(240, Math.round(width || 600));
  const H = W > 700 ? 300 : W > 460 ? 260 : 220;
  const left = W > 460 ? 54 : 44, right = 12, top = 14, bottom = 30;
  return { W, H, left, right, top, bottom, pw: W - left - right, ph: H - top - bottom };
}

interface Frame {
  cur: number[];
  prev: number[];
  yMax: number;
}

const mono = "font-(family-name:--rgc-mono) text-[10.5px] leading-[1.2] font-medium tracking-[0.09em] uppercase";

/**
 * Monthly revenue as an area chart with the total and the change against the
 * same months last year, a 6/12 month range, last-year comparison, a running
 * total view and a crosshair tooltip.
 */
export function RevenueGrowthChart({
  eyebrow,
  title,
  subtitle,
  currency = "USD",
  series,
  source,
  range: rangeProp,
  defaultRange = "12m",
  compare: compareProp,
  defaultCompare = false,
  cumulative: cumulativeProp,
  defaultCumulative = false,
  onRangeChange,
  onViewChange,
  replayKey,
  labels,
  locale = "en-US",
  className,
}: RevenueGrowthChartProps) {
  const L = useMemo(() => ({ ...LABELS, ...labels }), [labels]);
  const cur = currency.toUpperCase();
  const gradId = `rgc-grad-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  const [rangeState, setRangeState] = useState<RevenueRange>(defaultRange);
  const [compareState, setCompareState] = useState(defaultCompare);
  const [cumState, setCumState] = useState(defaultCumulative);
  const range = rangeProp ?? rangeState;
  const compare = compareProp ?? compareState;
  const cumulative = cumulativeProp ?? cumState;

  const money = useCallback(
    (v: number, compact = false) => {
      try {
        return new Intl.NumberFormat(
          locale,
          compact
            ? { style: "currency", currency: cur, notation: "compact", minimumFractionDigits: 0, maximumFractionDigits: v >= 1e6 ? 2 : 1 }
            : { style: "currency", currency: cur, maximumFractionDigits: 0 }
        ).format(v);
      } catch {
        return `${cur} ${Math.round(v).toLocaleString("en-US")}`;
      }
    },
    [cur, locale]
  );
  const pct = (r: number | null, signed = false) => {
    if (r == null || !Number.isFinite(r)) return "—";
    const s = (Math.abs(r) * 100).toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%";
    return signed ? (r > 0 ? "+" : r < 0 ? "−" : "") + s : s;
  };
  const monthLabel = (m: string, style?: "long" | "mid") => {
    const r = /^(\d{4})-(\d{2})/.exec(m || "");
    if (!r) return String(m || "");
    const d = Date.UTC(+r[1], +r[2] - 1, 1);
    const opt: Intl.DateTimeFormatOptions =
      style === "long" ? { month: "long", year: "numeric" } : style === "mid" ? { month: "short", year: "numeric" } : { month: "short" };
    try {
      return new Intl.DateTimeFormat(locale, { timeZone: "UTC", ...opt }).format(d);
    } catch {
      return m;
    }
  };

  const s = useMemo(() => computeState(series, range, cumulative, compare), [series, range, cumulative, compare]);
  const n = s.pts.length;

  /* ---------- size ---------- */
  const plotRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<SVGPathElement>(null);
  const prevRef = useRef<SVGPathElement>(null);
  const areaRef = useRef<SVGPathElement>(null);
  const endRef = useRef<SVGCircleElement>(null);
  const [width, setWidth] = useState(600);
  const g = geo(width);

  useEffect(() => {
    const el = plotRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      if (w) setWidth(w);
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* ---------- frame (animated values) ---------- */
  const [frame, setFrame] = useState<Frame>(() => ({ cur: s.cur.slice(), prev: s.prev.slice(), yMax: s.yMax }));
  const frameRef = useRef(frame);
  frameRef.current = frame;
  const rafRef = useRef(0);
  const lastRef = useRef({ range, series, first: true });

  /* ---------- intro (line draw) ---------- */
  const intro = useCallback((quick: boolean) => {
    const els = [lineRef.current, prevRef.current, areaRef.current, endRef.current];
    els.forEach((el) => el && (el.style.opacity = ""));
    if (reduceMotion() || typeof Element === "undefined" || !("animate" in Element.prototype)) return;
    const dur = quick ? 650 : 1200;
    const opts: KeyframeAnimationOptions = { duration: dur, easing: "cubic-bezier(.45,.05,.25,1)", fill: "backwards" };
    const line = lineRef.current;
    if (line) {
      let len = 0;
      try {
        len = line.getTotalLength();
      } catch {
        len = 0;
      }
      if (len) {
        line.style.strokeDasharray = `${len} ${len}`;
        const a = line.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], opts);
        a.onfinish = a.oncancel = () => {
          line.style.strokeDasharray = "";
        };
      }
    }
    if (prevRef.current && prevRef.current.dataset.on === "true") {
      prevRef.current.animate([{ opacity: 0 }, { opacity: 1 }], { ...opts, duration: dur * 0.7, delay: dur * 0.3 + 120 });
    }
    areaRef.current?.animate([{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "none" }], { ...opts, duration: dur * 0.8, delay: dur * 0.25 });
    endRef.current?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, delay: dur, fill: "backwards" });
  }, []);

  // first-view reveal
  useIsoLayoutEffect(() => {
    if (reduceMotion()) return;
    const els = [lineRef.current, prevRef.current, areaRef.current, endRef.current];
    els.forEach((el) => el && (el.style.opacity = "0"));
    const card = plotRef.current;
    if (!card || typeof IntersectionObserver === "undefined") {
      intro(false);
      return;
    }
    let raf = 0;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          raf = requestAnimationFrame(() => intro(false));
        }
      },
      { threshold: 0.25 }
    );
    io.observe(card);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      els.forEach((el) => el && (el.style.opacity = ""));
    };
  }, [intro]);

  // replay on demand
  const replayFirst = useRef(true);
  useEffect(() => {
    if (replayFirst.current) {
      replayFirst.current = false;
      return;
    }
    intro(false);
  }, [replayKey, intro]);

  // follow state changes: redraw (range/data) or tween (toggles)
  useIsoLayoutEffect(() => {
    const last = lastRef.current;
    lastRef.current = { range, series, first: false };
    if (last.first) return;
    cancelAnimationFrame(rafRef.current);
    const target: Frame = { cur: s.cur.slice(), prev: s.prev.slice(), yMax: s.yMax };
    const a = frameRef.current;
    if (last.range !== range || last.series !== series || a.cur.length !== target.cur.length || reduceMotion()) {
      setFrame(target);
      if (last.range !== range || last.series !== series) requestAnimationFrame(() => intro(true));
      return;
    }
    const fromPrev = a.prev.length === target.cur.length ? a.prev : target.prev;
    const start = { cur: a.cur.slice(), prev: fromPrev.slice(), yMax: a.yMax };
    const t0 = performance.now(), dur = 460;
    const tick = (now: number) => {
      const k = ease(Math.min(1, (now - t0) / dur));
      setFrame({
        cur: start.cur.map((v, i) => lerp(v, target.cur[i], k)),
        prev: target.prev.map((v, i) => lerp(start.prev[i] ?? v, v, k)),
        yMax: lerp(start.yMax, target.yMax, k),
      });
      if (k < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [s]);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  /* ---------- headline total tween ---------- */
  const [shownTotal, setShownTotal] = useState(s.total);
  const shownRef = useRef(s.total);
  useEffect(() => {
    const from = shownRef.current;
    const to = s.total;
    if (from === to) return;
    if (reduceMotion()) {
      shownRef.current = to;
      setShownTotal(to);
      return;
    }
    const t0 = performance.now(), dur = 520;
    let raf = 0;
    const tick = (now: number) => {
      const k = ease(Math.min(1, (now - t0) / dur));
      const v = lerp(from, to, k);
      shownRef.current = v;
      setShownTotal(v);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [s.total]);

  /* ---------- crosshair ---------- */
  const [active, setActive] = useState<number | null>(null);
  const [live, setLive] = useState("");
  const [tipLeft, setTipLeft] = useState(0);
  const act = active != null && n ? Math.min(active, n - 1) : null;

  // Displayed frame: fall back to the target while a frame of another length is pending.
  const f: Frame = frame.cur.length === n ? frame : { cur: s.cur, prev: s.prev, yMax: s.yMax };
  const x = (i: number) => g.left + (n > 1 ? (i * g.pw) / (n - 1) : g.pw / 2);
  const y = (v: number) => g.top + g.ph - (v / (f.yMax || 1)) * g.ph;
  const showPrevDot = s.showPrev && f.prev.length === n;

  const announce = (i: number) => {
    const p = s.pts[i];
    const curV = s.cur[i], prevV = s.hasPrev ? s.prev[i] : null;
    const chg = prevV != null && prevV > 0 ? curV / prevV - 1 : null;
    const parts = [`${monthLabel(p.month, "long")}: ${money(curV)}`];
    if (prevV != null) parts.push(`${L.lastYear.toLowerCase()} ${money(prevV)}`, `${L.change.toLowerCase()} ${pct(chg, true)}`);
    setLive(parts.join(", ") + ".");
  };
  const place = (i: number | null, say: boolean) => {
    if (i == null || !n) {
      setActive(null);
      return;
    }
    const ni = Math.max(0, Math.min(n - 1, i));
    if (say && ni !== act) announce(ni);
    setActive(ni);
  };

  // tooltip position: beside the crosshair, flipped near the right edge
  useIsoLayoutEffect(() => {
    if (act == null) return;
    const tw = tipRef.current?.offsetWidth ?? 0;
    const pw = plotRef.current?.clientWidth ?? g.W;
    const px = x(act) * (pw / g.W);
    let left = px + 14;
    if (left + tw > pw) left = px - 14 - tw;
    setTipLeft(Math.round(Math.max(0, left)));
  });

  const indexAt = (clientX: number) => {
    const svg = svgRef.current;
    if (!svg || !n) return null;
    const r = svg.getBoundingClientRect();
    const sx = (clientX - r.left) * (g.W / (r.width || 1));
    const step = n > 1 ? g.pw / (n - 1) : 1;
    return Math.max(0, Math.min(n - 1, Math.round((sx - g.left) / step)));
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!n) return;
    const i = act == null ? n - 1 : act;
    let ni: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") ni = i + 1;
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") ni = i - 1;
    else if (e.key === "Home") ni = 0;
    else if (e.key === "End") ni = n - 1;
    else if (e.key === "Escape") {
      setActive(null);
      return;
    }
    if (ni == null) return;
    e.preventDefault();
    place(ni, true);
  };

  /* ---------- controls ---------- */
  const pickRange = (r: RevenueRange) => {
    if (r === range) return;
    setRangeState(r);
    const ns = computeState(series, r, cumulative, compare);
    onRangeChange?.({ range: r, total: ns.total, growth: ns.growth });
  };
  const toggle = (opt: "compare" | "cumulative") => {
    const next = { compare, cumulative, [opt]: !(opt === "compare" ? compare : cumulative) };
    if (opt === "compare") setCompareState(next.compare);
    else setCumState(next.cumulative);
    onViewChange?.(next);
  };

  /* ---------- derived text ---------- */
  const last = s.pts[n - 1];
  const lyChg = last && last.lastYear != null && last.lastYear > 0 ? last.revenue / last.lastYear - 1 : null;
  const best = s.pts.reduce<ChartState["pts"][number] | null>((a, p) => (!a || p.revenue > a.revenue ? p : a), null);
  const from = n ? monthLabel(s.pts[0].month, "long") : "";
  const to = n ? monthLabel(last.month, "long") : "";
  const growthTone = s.growth == null ? null : s.growth >= 0 ? "good" : "bad";

  // y grid
  const ticks = s.ticks.filter((v) => v <= f.yMax * 1.001);
  // x labels (thin them out when space is tight; the last month always shows)
  const every = g.pw / Math.max(1, n - 1) < 40 ? 2 : 1;
  const roomy = (every * g.pw) / Math.max(1, n - 1) >= 60;

  const line = smooth(f.cur.map((v, i) => [x(i), y(v)] as [number, number]));
  const area = n ? `${line}L${x(n - 1).toFixed(2)},${g.top + g.ph}L${x(0).toFixed(2)},${g.top + g.ph}Z` : "";
  const prevLine = f.prev.length === n ? smooth(f.prev.map((v, i) => [x(i), y(v)] as [number, number])) : "";

  // tooltip values
  const tip =
    act != null
      ? (() => {
          const curV = s.cur[act], prevV = s.hasPrev ? s.prev[act] : null;
          const chg = prevV != null && prevV > 0 ? curV / prevV - 1 : null;
          return { month: monthLabel(s.pts[act].month, "long"), curV, prevV, chg };
        })()
      : null;

  const toggleCls =
    "group/t inline-flex cursor-pointer appearance-none items-center gap-2 rounded-[10px] border border-(--rgc-line) bg-(--rgc-card) py-[7px] pr-3 pl-2 text-[12.5px] leading-none font-medium text-(--rgc-muted) transition-[color,border-color] duration-200 hover:border-(--rgc-faint) hover:text-(--rgc-ink) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--rgc-accent) aria-pressed:text-(--rgc-ink) motion-reduce:transition-none @max-[479px]:flex-[1_1_0] @max-[479px]:justify-center @max-[479px]:px-2";
  const switchCls =
    "relative h-4 w-[26px] flex-none rounded-full bg-(--rgc-grid) shadow-[inset_0_0_0_1px_var(--rgc-line)] transition-[background] duration-250 after:absolute after:top-0.5 after:left-0.5 after:size-3 after:rounded-full after:bg-(--rgc-card) after:shadow-[0_1px_2px_var(--rgc-shadow)] after:transition-transform after:duration-250 after:ease-out-soft after:content-[''] group-aria-pressed/t:bg-(--rgc-accent) group-aria-pressed/t:shadow-none group-aria-pressed/t:after:translate-x-2.5 motion-reduce:transition-none motion-reduce:after:transition-none";
  const statSub = "m-0 text-[12.5px] leading-[1.4] text-(--rgc-muted) tabular-nums";
  const statVal = "m-0 font-(family-name:--rgc-display) text-[21px] leading-[1.15] font-[650] tracking-[-0.01em] tabular-nums @max-[479px]:text-lg";

  return (
    <div className={cx("@container block w-full max-w-[980px] font-(family-name:--rgc-sans) text-(--rgc-ink)", className)}>
      <article className="relative rounded-[18px] border border-(--rgc-line) bg-(--rgc-card) bg-[radial-gradient(70%_60%_at_100%_0%,var(--rgc-accent-soft),transparent_70%)] px-7 pt-7 pb-[18px] shadow-[0_32px_60px_-46px_var(--rgc-shadow),0_2px_6px_-4px_var(--rgc-shadow)] @max-[759px]:px-[22px] @max-[759px]:pt-6 @max-[759px]:pb-4 @max-[479px]:rounded-2xl @max-[479px]:px-3.5 @max-[479px]:pt-5 @max-[479px]:pb-3.5">
        {/* header */}
        <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
          <div className="grid max-w-[46ch] min-w-0 gap-1.5">
            {eyebrow && (
              <span className="inline-flex items-center gap-2 font-(family-name:--rgc-mono) text-[10.5px] leading-none font-medium tracking-[0.1em] text-(--rgc-accent) uppercase before:h-0.5 before:w-3.5 before:rounded-sm before:bg-current before:content-['']">
                {eyebrow}
              </span>
            )}
            {title && (
              <h2 className="m-0 font-(family-name:--rgc-display) text-[clamp(19px,3cqi,24px)] leading-[1.2] font-[650] tracking-[-0.015em] text-balance">{title}</h2>
            )}
            {subtitle && <p className="m-0 text-[13.5px] text-(--rgc-muted)">{subtitle}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-2 @max-[479px]:w-full">
            <div role="group" aria-label={L.range} className="inline-flex rounded-[10px] border border-(--rgc-line) bg-(--rgc-tint) p-[3px] @max-[479px]:flex-[1_1_100%]">
              {(["6m", "12m"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  aria-pressed={range === r}
                  onClick={() => pickRange(r)}
                  className="min-w-[46px] cursor-pointer appearance-none rounded-[7px] border-0 bg-transparent px-3 py-2 text-[12.5px] leading-none font-semibold text-(--rgc-muted) tabular-nums transition-[background,color,box-shadow] duration-200 hover:text-(--rgc-ink) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--rgc-accent) aria-pressed:bg-(--rgc-card) aria-pressed:text-(--rgc-ink) aria-pressed:shadow-[0_1px_3px_-1px_var(--rgc-shadow),0_0_0_1px_var(--rgc-line)] motion-reduce:transition-none @max-[479px]:flex-1"
                >
                  {r.toUpperCase()}
                </button>
              ))}
            </div>
            <button type="button" aria-pressed={compare} onClick={() => toggle("compare")} className={toggleCls}>
              <span aria-hidden="true" className={switchCls} />
              <span>{L.compare}</span>
            </button>
            <button type="button" aria-pressed={cumulative} onClick={() => toggle("cumulative")} className={toggleCls}>
              <span aria-hidden="true" className={switchCls} />
              <span>{L.cumulative}</span>
            </button>
          </div>
        </header>

        {/* headline stats */}
        <dl className="m-0 mt-6 grid grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)] @max-[759px]:grid-cols-2 @max-[759px]:gap-y-4 @max-[479px]:grid-cols-1">
          <div className="m-0 grid min-w-0 content-start gap-1.5 pr-[22px] @max-[759px]:col-span-full @max-[759px]:p-0">
            <dt className={cx(mono, "text-(--rgc-faint)")}>{fill(L.total, { n })}</dt>
            <dd className="m-0 flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <span className="font-(family-name:--rgc-display) text-[clamp(32px,5.4cqi,46px)] leading-none font-[650] tracking-[-0.03em] tabular-nums">{money(shownTotal)}</span>
              {s.growth != null && (
                <span
                  className={cx(
                    "inline-flex items-center gap-1 rounded-full px-2 py-[5px] text-xs leading-none font-[650] tabular-nums",
                    growthTone === "good"
                      ? "bg-[color-mix(in_oklab,var(--rgc-good)_13%,transparent)] text-(--rgc-good)"
                      : "bg-[color-mix(in_oklab,var(--rgc-bad)_12%,transparent)] text-(--rgc-bad)"
                  )}
                >
                  {s.growth >= 0 ? "▲" : "▼"} {pct(s.growth)}
                </span>
              )}
            </dd>
            {s.prevTotal != null && <dd className={statSub}>{fill(L.totalSub, { prev: money(s.prevTotal) })}</dd>}
          </div>
          <div className="m-0 grid min-w-0 content-start gap-1.5 border-l border-(--rgc-line) px-[22px] @max-[759px]:border-t @max-[759px]:border-l-0 @max-[759px]:pt-3.5 @max-[759px]:pl-0">
            <dt className={cx(mono, "text-(--rgc-faint)")}>{L.latest}</dt>
            <dd className={statVal}>{last ? `${monthLabel(last.month, "mid")} · ${money(last.revenue)}` : "—"}</dd>
            {lyChg != null && <dd className={statSub}>{fill(L.latestSub, { chg: pct(lyChg, true), month: monthLabel(last.month) })}</dd>}
          </div>
          <div className="m-0 grid min-w-0 content-start gap-1.5 border-l border-(--rgc-line) px-[22px] @max-[759px]:border-t @max-[759px]:pt-3.5 @max-[479px]:border-l-0 @max-[479px]:pl-0">
            <dt className={cx(mono, "text-(--rgc-faint)")}>{L.avg}</dt>
            <dd className={statVal}>{n ? money(s.total / n) : "—"}</dd>
            {best && <dd className={statSub}>{fill(L.avgSub, { month: monthLabel(best.month), value: money(best.revenue, true) })}</dd>}
          </div>
        </dl>

        {/* legend */}
        <div aria-hidden="true" className="mt-[22px] mb-1.5 flex flex-wrap items-center gap-x-[18px] gap-y-1.5 text-[12.5px] text-(--rgc-muted)">
          <span className="inline-flex items-center gap-2">
            <i className="h-0 w-[18px] rounded-sm border-t-[2.5px] border-(--rgc-accent)" />
            <span>{s.cum ? `${L.thisYear} · ${L.running}` : L.thisYear}</span>
          </span>
          <span
            className={cx(
              "inline-flex items-center gap-2 transition-[opacity,transform] duration-300 ease-in-out motion-reduce:transition-none",
              !s.showPrev && "pointer-events-none -translate-x-1 opacity-0"
            )}
          >
            <i className="h-0 w-[18px] rounded-sm border-t-2 border-dashed border-(--rgc-prev)" />
            <span>{L.lastYear}</span>
          </span>
          <span className="ml-auto text-xs text-(--rgc-faint) @max-[759px]:hidden">{L.hint}</span>
        </div>

        {/* plot */}
        <div
          ref={plotRef}
          tabIndex={0}
          role="group"
          aria-roledescription="chart"
          aria-label={fill(L.chart, { from, to })}
          onPointerMove={(e: PointerEvent<HTMLDivElement>) => place(indexAt(e.clientX), false)}
          onPointerDown={(e: PointerEvent<HTMLDivElement>) => place(indexAt(e.clientX), false)}
          onPointerLeave={(e: PointerEvent<HTMLDivElement>) => {
            if (e.pointerType !== "touch" && document.activeElement !== e.currentTarget) setActive(null);
          }}
          onFocus={() => {
            if (act == null && n) place(n - 1, true);
          }}
          onBlur={() => setActive(null)}
          onKeyDown={onKey}
          className="relative cursor-crosshair touch-pan-y rounded-[10px] outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--rgc-accent)"
        >
          <svg
            ref={svgRef}
            aria-hidden="true"
            focusable="false"
            viewBox={`0 0 ${g.W} ${g.H}`}
            width={g.W}
            height={g.H}
            className="block h-auto w-full overflow-visible"
          >
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" className="[stop-color:var(--rgc-area-top)]" />
                <stop offset="1" className="[stop-color:var(--rgc-area-bottom)]" />
              </linearGradient>
            </defs>
            <g>
              {ticks.map((v, i) => {
                const yy = Math.round(y(v)) + 0.5;
                return (
                  <g key={v}>
                    <line
                      x1={g.left}
                      x2={g.W - g.right}
                      y1={yy}
                      y2={yy}
                      strokeWidth="1"
                      shapeRendering="crispEdges"
                      className={i === 0 ? "stroke-(--rgc-line)" : "stroke-(--rgc-grid)"}
                    />
                    <text x={g.left - 10} y={yy + 4} textAnchor="end" className="fill-(--rgc-faint) text-[11px] leading-none font-medium tabular-nums">
                      {v === 0 ? money(0) : money(v, true)}
                    </text>
                  </g>
                );
              })}
              {!n && (
                <text x={g.W / 2} y={g.H / 2} textAnchor="middle" className="fill-(--rgc-faint) text-[13px] leading-none font-medium">
                  {L.noData}
                </text>
              )}
            </g>
            <path ref={areaRef} d={area} fill={`url(#${gradId})`} />
            <path
              ref={prevRef}
              d={prevLine}
              data-on={s.showPrev}
              strokeWidth="2"
              strokeDasharray="5 5"
              strokeLinecap="round"
              className={cx("fill-none stroke-(--rgc-prev) transition-opacity duration-350 ease-in-out motion-reduce:transition-none", !s.showPrev && "opacity-0")}
            />
            <path ref={lineRef} d={line} strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round" className="fill-none stroke-(--rgc-accent)" />
            <g>
              {s.pts.map((p, i) => {
                if ((n - 1 - i) % every) return null;
                const first = n > 1 && i === 0, lastI = n > 1 && i === n - 1;
                return (
                  <text
                    key={p.month + i}
                    x={x(i) + (first ? -4 : lastI ? 4 : 0)}
                    y={g.H - 8}
                    textAnchor={first ? "start" : lastI ? "end" : "middle"}
                    className={cx(
                      "text-[11px] leading-none tabular-nums",
                      i === act ? "fill-(--rgc-ink) font-[650]" : "fill-(--rgc-faint) font-medium"
                    )}
                  >
                    {roomy && (i === 0 || /-01$/.test(p.month)) ? monthLabel(p.month, "mid") : monthLabel(p.month)}
                  </text>
                );
              })}
            </g>
            <g className={cx("pointer-events-none transition-opacity duration-150 ease-in-out motion-reduce:transition-none", act == null ? "opacity-0" : "opacity-100")}>
              {act != null && (
                <>
                  <line x1={x(act)} x2={x(act)} y1={g.top} y2={g.top + g.ph} strokeWidth="1" strokeDasharray="3 3" className="stroke-(--rgc-ink) [stroke-opacity:0.35]" />
                  {showPrevDot && <circle cx={x(act)} cy={y(f.prev[act])} r="4" strokeWidth="2" className="fill-(--rgc-card) stroke-(--rgc-prev)" />}
                  <circle cx={x(act)} cy={y(f.cur[act])} r="5.5" strokeWidth="2.6" className="fill-(--rgc-card) stroke-(--rgc-accent)" />
                </>
              )}
            </g>
            {n > 0 && (
              <circle
                ref={endRef}
                cx={x(n - 1)}
                cy={y(f.cur[n - 1])}
                r="4.5"
                strokeWidth="8"
                className={cx(
                  "fill-(--rgc-accent) stroke-(--rgc-accent-soft) [paint-order:stroke] transition-opacity duration-250 motion-reduce:transition-none",
                  act != null && "opacity-0"
                )}
              />
            )}
          </svg>
          <div
            ref={tipRef}
            aria-hidden="true"
            style={{ transform: `translateX(${tipLeft}px)` }}
            className={cx(
              "pointer-events-none absolute top-1 left-0 z-[2] min-w-[176px] rounded-[10px] bg-(--rgc-tip-bg) px-3 py-2.5 text-[12.5px] leading-[1.3] text-(--rgc-tip-ink) tabular-nums shadow-[0_18px_32px_-16px_var(--rgc-shadow)] transition-opacity duration-150 ease-in-out motion-reduce:transition-none @max-[479px]:min-w-[150px] @max-[479px]:px-2.5 @max-[479px]:py-2 @max-[479px]:text-xs",
              tip ? "opacity-100" : "opacity-0"
            )}
          >
            {tip && (
              <>
                <p className="m-0 mb-2 text-[12.5px] leading-[1.2] font-[650]">
                  {tip.month}
                  {s.cum ? ` · ${L.running}` : ""}
                </p>
                <div className="grid grid-cols-[14px_minmax(0,1fr)_auto] items-center gap-2 py-0.5">
                  <i className="h-0 w-3 border-t-[2.5px] border-(--rgc-accent)" />
                  <span className="text-(--rgc-tip-muted)">{L.thisYear}</span>
                  <b className="font-[650]">{money(tip.curV)}</b>
                </div>
                {showPrevDot && (
                  <div className="grid grid-cols-[14px_minmax(0,1fr)_auto] items-center gap-2 py-0.5">
                    <i className="h-0 w-3 border-t-2 border-dashed border-(--rgc-tip-muted)" />
                    <span className="text-(--rgc-tip-muted)">{L.lastYear}</span>
                    <b className="font-[650]">{tip.prevV != null ? money(tip.prevV) : "—"}</b>
                  </div>
                )}
                {tip.chg != null && (
                  <div className="mt-1.5 grid grid-cols-[14px_minmax(0,1fr)_auto] items-center gap-2 border-t border-[color-mix(in_oklab,var(--rgc-tip-muted)_40%,transparent)] pt-1.5 pb-0.5">
                    <i />
                    <span className="text-(--rgc-tip-muted)">{L.change}</span>
                    <b className={cx("font-[650]", tip.chg >= 0 ? "text-(--rgc-tip-good)" : "text-(--rgc-tip-bad)")}>{pct(tip.chg, true)}</b>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="sr-only">
          <table className="border-collapse">
            <caption>{fill(L.caption, { from, to })}</caption>
            <thead>
              <tr>
                <th scope="col">{L.month}</th>
                <th scope="col">{s.cum ? L.running2 : L.revenue}</th>
                {s.hasPrev && <th scope="col">{L.lastYear}</th>}
                {s.hasPrev && <th scope="col">{L.change}</th>}
              </tr>
            </thead>
            <tbody>
              {s.pts.map((p, i) => (
                <tr key={p.month + i}>
                  <th scope="row">{monthLabel(p.month, "long")}</th>
                  <td>{money(s.cur[i])}</td>
                  {s.hasPrev && <td>{money(s.prev[i])}</td>}
                  {s.hasPrev && <td>{pct(s.prev[i] > 0 ? s.cur[i] / s.prev[i] - 1 : null, true)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <footer className="mt-3.5 flex flex-wrap justify-between gap-x-4 gap-y-1.5 border-t border-dashed border-(--rgc-line) pt-3 text-xs text-(--rgc-faint)">
          {source && <span>{source}</span>}
        </footer>
        <p className="sr-only" aria-live="polite">
          {live}
        </p>
      </article>
    </div>
  );
}

export default RevenueGrowthChart;
