"use client";

import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type Ref,
} from "react";
import { cx } from "@/lib/format";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type UsageMetric = "tokens" | "requests" | "cost";
export type UsageRange = 14 | 30;

/** A model tier, in stack order (bottom first). Up to three are shown. */
export interface UsageModel {
  id: string;
  label: string;
  /** Blended price per million tokens. Cost = tokens ÷ 1,000,000 × price. */
  pricePerMillion: number;
}

/** One number per day from `start`, per model. */
export interface UsageSeries {
  tokens?: number[];
  requests?: number[];
}

export interface UsageFilter {
  metric: UsageMetric;
  range: UsageRange;
  model: string | null;
}

/** Built-in text; any key can be overridden through `labels`. `{n}`, `{v}`, `{date}`, `{name}`, `{metric}` are placeholders. */
export const AUA_LABELS = {
  metricGroup: "Measure",
  rangeGroup: "Date range",
  tokens: "Tokens",
  requests: "Requests",
  cost: "Cost",
  range14: "14D",
  range30: "30D",
  kTotal: "Total · {n} days",
  kAvg: "Daily average",
  kPeak: "Peak day",
  weekdayAvg: "weekdays {v}",
  isolated: "{name} only",
  hint: "Select a model to show it alone",
  chart: "Daily {metric} by model, last {n} days. Use the left and right arrow keys to step through days.",
  total: "Total",
  day: "Day",
  quota: "Monthly token quota",
  through: "to {date}",
  resets: "Resets {date}",
  used: "Used",
  projected: "Forecast",
  ofQuota: "of quota",
  leftLabel: "Left this month",
  days: "{n} days",
  ofTokens: "of quota",
  costHead: "Cost estimate",
  mtd: "month to date",
  projectedCost: "Projected {v}",
  budget: "Budget {v}",
  under: "Under budget",
  over: "Over budget",
  byModel: "By model, this month",
  perM: "{v} per 1M tokens",
  noData: "No usage in this range.",
};
export type UsageLabels = typeof AUA_LABELS;

/** Imperative API, available through `ref`. */
export interface AiUsageAnalyticsHandle {
  /** Replay the bar animation. */
  replay: () => void;
  /** Show one model alone; the same id (or null) shows all. */
  isolate: (id: string | null) => void;
}

export interface AiUsageAnalyticsProps {
  /** Small label above the title. */
  eyebrow?: string;
  title?: string;
  /** Footer note, e.g. how usage is metered. */
  source?: string;
  /** ISO date of the first day in the series. */
  start?: string;
  /** ISO date of the last day in the series. */
  asOf?: string;
  /** ISO date the billing month began. Quota and cost count from here. Defaults to the 1st of the asOf month. */
  billingStart?: string;
  /** Monthly token allowance. */
  quota?: number;
  /** Optional monthly spend limit for the cost estimate. */
  budget?: number;
  currency?: string;
  /** Number and date locale. */
  locale?: string;
  /** Model tiers in stack order, bottom first. Up to three. */
  models: UsageModel[];
  /** `{ [model id]: { tokens: [], requests: [] } }` */
  series: Record<string, UsageSeries>;
  /** Controlled metric. */
  metric?: UsageMetric;
  defaultMetric?: UsageMetric;
  /** Controlled range in days. */
  range?: UsageRange;
  defaultRange?: UsageRange;
  /** Controlled isolated model id (null shows all). */
  model?: string | null;
  defaultModel?: string | null;
  /** Fires on every filter change (metric, range or isolated model). */
  onFilterChange?: (filter: UsageFilter) => void;
  /** Override any built-in text. */
  labels?: Partial<UsageLabels>;
  ref?: Ref<AiUsageAnalyticsHandle>;
  className?: string;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const METRICS: UsageMetric[] = ["tokens", "requests", "cost"];
const RANGES: UsageRange[] = [14, 30];
const GAP = 2;
const SLOT_COLOR = ["var(--aua-c1)", "var(--aua-c2)", "var(--aua-c3)"];

const num = (v: unknown) => (v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? 0 : Math.max(0, Number(v)));
const fill = (s: string, vars: Record<string, string | number>) => String(s).replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ""));
const parseDay = (s?: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || ""));
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
};
const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
function niceMax(v: number) {
  if (!(v > 0)) return { max: 1, step: 0.25 };
  const raw = v / 4;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((s) => s * mag).find((s) => s >= raw) || 10 * mag;
  return { max: step * Math.ceil(v / step), step };
}

interface PreparedModel {
  id: string;
  label: string;
  price: number;
  slot: number;
  tokens: number[];
  requests: number[];
  cost: number[];
}

const OkIcon = () => (
  <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-[13px]">
    <circle cx="7" cy="7" r="5.6" />
    <path d="M4.6 7.2 6.3 8.8 9.4 5.4" />
  </svg>
);
const WarnIcon = () => (
  <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-[13px]">
    <path d="M7 1.8 12.8 12H1.2z" />
    <path d="M7 5.6v2.8M7 10.2v.1" />
  </svg>
);

const mono = "font-(family-name:--aua-mono) text-[10.5px] leading-[1.2] font-semibold tracking-[0.08em] uppercase";
const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--aua-focus)";
const segBtn = cx(
  "cursor-pointer appearance-none rounded-full border-0 bg-transparent px-[13px] py-2 font-(family-name:--aua-sans) text-[12.5px] leading-none font-semibold text-(--aua-muted) transition-[background-color,color,box-shadow] duration-200 hover:text-(--aua-ink) aria-pressed:bg-(--aua-card) aria-pressed:text-(--aua-lilac) aria-pressed:shadow-[0_0_0_1px_color-mix(in_oklab,var(--aua-lilac)_35%,transparent),0_4px_10px_-6px_var(--aua-shadow)] motion-reduce:transition-none @max-[519px]:flex-1 @max-[519px]:px-1.5",
  focusRing
);

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

/**
 * Daily AI usage stacked by model tier as tokens, requests or cost, with a
 * monthly quota ring and a month-end cost estimate.
 */
export function AiUsageAnalytics({
  eyebrow,
  title,
  source,
  start,
  asOf,
  billingStart,
  quota: quotaProp = 0,
  budget: budgetProp = 0,
  currency = "USD",
  locale = "en-US",
  models: modelsProp,
  series,
  metric: metricProp,
  defaultMetric = "tokens",
  range: rangeProp,
  defaultRange = 30,
  model: modelProp,
  defaultModel = null,
  onFilterChange,
  labels,
  ref,
  className,
}: AiUsageAnalyticsProps) {
  const L = useMemo(() => ({ ...AUA_LABELS, ...labels }), [labels]);
  const [metricState, setMetricState] = useState<UsageMetric>(defaultMetric);
  const [rangeState, setRangeState] = useState<UsageRange>(defaultRange);
  const [modelState, setModelState] = useState<string | null>(defaultModel);
  const metric = metricProp ?? metricState;
  const range = rangeProp ?? rangeState;

  /* formatting */
  const money = useCallback(
    (v: number, dp = 2) => {
      try {
        return new Intl.NumberFormat(locale, { style: "currency", currency: currency.toUpperCase(), minimumFractionDigits: dp, maximumFractionDigits: dp }).format(v);
      } catch {
        return "$" + v.toFixed(dp);
      }
    },
    [locale, currency]
  );
  const compact = useCallback((v: number, dp = 1) => new Intl.NumberFormat(locale, { notation: "compact", minimumFractionDigits: 0, maximumFractionDigits: dp }).format(v), [locale]);
  const fmt = useCallback(
    (m: UsageMetric, v: number, short?: boolean) => {
      if (m === "cost") return short && v >= 1000 ? "$" + compact(v) : money(v, v >= 100 && short ? 0 : 2);
      if (m === "tokens") return compact(v, v >= 1e8 ? 0 : 1);
      return short ? compact(v) : Math.round(v).toLocaleString(locale);
    },
    [compact, money, locale]
  );
  const date = useCallback(
    (d: Date, o: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }) => {
      try {
        return new Intl.DateTimeFormat(locale, o).format(d);
      } catch {
        return d.toDateString();
      }
    },
    [locale]
  );
  const longDay = (d: Date) => date(d, { weekday: "short", month: "short", day: "numeric" });

  /* normalise: days[], per model per metric arrays */
  const { models, days } = useMemo(() => {
    const ms = (modelsProp || []).filter(Boolean).slice(0, 3);
    const len = Math.max(0, ...ms.map((m) => Math.max((series[m.id]?.tokens || []).length, (series[m.id]?.requests || []).length)));
    let s = parseDay(start);
    const a = parseDay(asOf);
    if (!s && a) s = addDays(a, -(len - 1));
    if (!s) s = addDays(new Date(), -(len - 1));
    const first = s;
    const dayList = Array.from({ length: len }, (_, i) => addDays(first, i));
    const prepared: PreparedModel[] = ms.map((m, i) => {
      const sr = series[m.id] || {};
      const tokens = dayList.map((_, k) => num((sr.tokens || [])[k]));
      const price = num(m.pricePerMillion);
      return {
        id: String(m.id || `model-${i + 1}`),
        label: m.label || `Model ${i + 1}`,
        price,
        slot: i,
        tokens,
        requests: dayList.map((_, k) => num((sr.requests || [])[k])),
        cost: tokens.map((t) => (t / 1e6) * price),
      };
    });
    return { models: prepared, days: dayList };
  }, [modelsProp, series, start, asOf]);

  const rawModel = modelProp !== undefined ? modelProp : modelState;
  const model = rawModel && models.some((m) => m.id === rawModel) ? rawModel : null;

  const emit = (next: Partial<UsageFilter>) => onFilterChange?.({ metric, range, model, ...next });
  const setMetric = (m: UsageMetric) => {
    if (m === metric) return;
    if (metricProp === undefined) setMetricState(m);
    emit({ metric: m });
  };
  const setRange = (r: UsageRange) => {
    if (r === range) return;
    if (rangeProp === undefined) setRangeState(r);
    emit({ range: r });
  };
  const isolate = useCallback(
    (id: string | null) => {
      const next = id && id !== model ? id : null;
      if (modelProp === undefined) setModelState(next);
      onFilterChange?.({ metric, range, model: next });
    },
    [model, modelProp, metric, range, onFilterChange]
  );

  /* window + totals */
  const n = Math.min(range, days.length);
  const from = days.length - n;
  const wDays = days.slice(from);
  const vis = models.filter((m) => !model || m.id === model);
  const totals = wDays.map((_, i) => vis.reduce((a, m) => a + m[metric][from + i], 0));
  const total = totals.reduce((a, v) => a + v, 0);
  const avg = n ? total / n : 0;
  const wk = totals.filter((_, i) => {
    const g = wDays[i].getDay();
    return g !== 0 && g !== 6;
  });
  const wkAvg = wk.length ? wk.reduce((a, v) => a + v, 0) / wk.length : 0;
  let peak = -1;
  totals.forEach((v, i) => {
    if (peak < 0 || v > totals[peak]) peak = i;
  });
  const isoM = model ? models.find((m) => m.id === model) : undefined;
  const kpis = [
    { k: fill(L.kTotal, { n }), v: fmt(metric, total), s: isoM ? fill(L.isolated, { name: isoM.label }) : L[metric] },
    { k: L.kAvg, v: fmt(metric, avg), s: fill(L.weekdayAvg, { v: fmt(metric, wkAvg) }) },
    { k: L.kPeak, v: peak >= 0 ? fmt(metric, totals[peak]) : "—", s: peak >= 0 ? longDay(wDays[peak]) : "" },
  ];

  /* side panel */
  const lastDay = days.length ? days[days.length - 1] : null;
  const side = useMemo(() => {
    const asOfD = lastDay ?? new Date();
    const bStart = parseDay(billingStart) || new Date(asOfD.getFullYear(), asOfD.getMonth(), 1);
    const bEnd = new Date(bStart.getFullYear(), bStart.getMonth() + 1, bStart.getDate());
    const monthDays = Math.round((bEnd.getTime() - bStart.getTime()) / 864e5);
    const idx = days.map((d, i) => (d >= bStart && d < bEnd ? i : -1)).filter((i) => i >= 0);
    const elapsed = Math.max(1, Math.round((asOfD.getTime() - bStart.getTime()) / 864e5) + 1);
    const left = Math.max(0, monthDays - elapsed);
    const sum = (m: PreparedModel, k: "tokens" | "cost") => idx.reduce((a, i) => a + m[k][i], 0);
    const usedTok = models.reduce((a, m) => a + sum(m, "tokens"), 0);
    const projTok = (usedTok / elapsed) * monthDays;
    const costs = models.map((m) => ({ m, v: sum(m, "cost") }));
    const mtd = costs.reduce((a, c) => a + c.v, 0);
    const projCost = (mtd / elapsed) * monthDays;
    return { bEnd, left, usedTok, projTok, costs, mtd, projCost };
  }, [days, models, billingStart, lastDay]);
  const quota = num(quotaProp);
  const budget = num(budgetProp);
  const C = 2 * Math.PI * 52;
  const usedR = quota > 0 ? Math.min(1, side.usedTok / quota) : 0;
  const projR = quota > 0 ? Math.min(1, side.projTok / quota) : 0;
  const pct = quota > 0 ? Math.round((side.usedTok / quota) * 100) + "%" : "—";
  const over = budget > 0 && side.projCost > budget;
  const scaleTo = Math.max(budget, side.projCost) || 1;

  /* chart geometry */
  const plotRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const [plotW, setPlotW] = useState(640);
  const [active, setActive] = useState<number | null>(null);
  const [tipPos, setTipPos] = useState({ left: 0, top: 0 });
  const [live, setLive] = useState("");

  useEffect(() => {
    const el = plotRef.current;
    if (!el) return;
    const measure = () => setPlotW(Math.round(el.clientWidth || 640));
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const W = Math.max(260, plotW);
  const H = W < 420 ? 210 : 250;
  const pad = { l: 44, r: 6, t: 12, b: 26 };
  const pw = W - pad.l - pad.r;
  const ph = H - pad.t - pad.b;
  const { max, step } = niceMax(Math.max(0, ...totals));
  const y = (v: number) => pad.t + ph - (v / max) * ph;
  const band = n ? pw / n : pw;
  const bw = Math.max(3, Math.min(24, band * 0.64));
  const labelEvery = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(pw / 58))));
  const gridLines: number[] = [];
  for (let v = 0; v <= max + step / 2; v += step) gridLines.push(v);
  const activeIdx = active != null && active < n ? active : null;

  /* bars grow in the first time the chart scrolls into view, and on every filter change */
  const [pending, setPending] = useState(false);
  const [anim, setAnim] = useState(false);
  const [animKey, setAnimKey] = useState(0);
  const animT = useRef<number | undefined>(undefined);
  const reduce = useRef(false);
  const nRef = useRef(n);
  useEffect(() => {
    nRef.current = n;
  });

  const play = useCallback(() => {
    if (reduce.current) return;
    setAnimKey((k) => k + 1);
    setAnim(true);
    window.clearTimeout(animT.current);
    animT.current = window.setTimeout(() => setAnim(false), 500 + nRef.current * 14 + 60);
  }, []);

  useEffect(() => {
    reduce.current = !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const el = plotRef.current;
    if (reduce.current || !el || typeof IntersectionObserver === "undefined") return;
    setPending(true);
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        setPending(false);
        play();
      },
      { threshold: 0.2 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      setPending(false);
      window.clearTimeout(animT.current);
    };
  }, [play]);

  const dataSig = `${metric}|${range}|${model}|${quota}|${budget}`;
  const firstSig = useRef(dataSig);
  useEffect(() => {
    if (dataSig === firstSig.current) return;
    firstSig.current = dataSig;
    play();
  }, [dataSig, play]);

  useImperativeHandle(ref, () => ({ replay: play, isolate }), [play, isolate]);

  /* tooltip position: above the column, kept inside the plot */
  useEffect(() => {
    if (activeIdx == null) return;
    const el = plotRef.current;
    const tw = tipRef.current?.offsetWidth || 180;
    const pwPx = el?.clientWidth || W;
    const scale = pwPx / W;
    const cxp = (pad.l + band * activeIdx + band / 2) * scale;
    let left = cxp + 14;
    if (left + tw > pwPx) left = cxp - tw - 14;
    setTipPos({ left: Math.max(0, left), top: pad.t * scale + 4 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIdx, W, band, metric, model]);

  const announce = (i: number) => {
    const d = days[from + i];
    const t = vis.reduce((a, m) => a + m[metric][from + i], 0);
    setLive(
      `${date(d, { weekday: "long", month: "long", day: "numeric" })}: ` +
        vis.map((m) => `${m.label} ${fmt(metric, m[metric][from + i])}`).join(", ") +
        (vis.length > 1 ? `. ${L.total} ${fmt(metric, t)}.` : ".")
    );
  };

  const idxAt = (e: PointerEvent<HTMLDivElement>) => {
    if (!n) return null;
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / (r.width / W);
    const i = Math.floor((x - pad.l) / band);
    return i >= 0 && i < n ? i : null;
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!n) return;
    let i = activeIdx ?? n - 1;
    if (e.key === "ArrowRight") i = Math.min(n - 1, i + 1);
    else if (e.key === "ArrowLeft") i = Math.max(0, i - 1);
    else if (e.key === "Home") i = 0;
    else if (e.key === "End") i = n - 1;
    else if (e.key === "Escape") {
      setActive(null);
      return;
    } else return;
    e.preventDefault();
    setActive(i);
    announce(i);
  };

  const chartLabel = fill(L.chart, { metric: L[metric].toLowerCase(), n });
  const barStyle = (i: number) => ({ "--i": i }) as CSSProperties;

  return (
    <div className={cx("@container block w-full max-w-[980px] font-(family-name:--aua-sans) text-(--aua-ink)", className)}>
      <article className="relative grid grid-cols-[minmax(0,1fr)_290px] overflow-hidden rounded-[22px] border border-(--aua-line) bg-(--aua-card) shadow-[0_30px_60px_-46px_var(--aua-shadow),0_2px_6px_-4px_var(--aua-shadow)] @max-[779px]:grid-cols-1 @max-[519px]:rounded-[18px]">
        {/* main */}
        <div className="grid min-w-0 content-start gap-[18px] px-[26px] pt-6 pb-5 @max-[779px]:px-5 @max-[779px]:pt-[22px] @max-[779px]:pb-[18px] @max-[519px]:gap-4 @max-[519px]:px-3.5 @max-[519px]:pt-[18px] @max-[519px]:pb-4">
          <header className="flex flex-wrap items-start justify-between gap-x-[18px] gap-y-3">
            <div className="grid min-w-0 gap-1.5">
              {eyebrow && (
                <span className="inline-flex items-center gap-2 font-(family-name:--aua-mono) text-[11px] leading-none font-semibold tracking-[0.1em] text-(--aua-lilac) uppercase">
                  <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" className="size-3.5">
                    <path d="M8 1.5 9.4 6.6 14.5 8 9.4 9.4 8 14.5 6.6 9.4 1.5 8 6.6 6.6z" />
                  </svg>
                  <span>{eyebrow}</span>
                </span>
              )}
              {title && <h2 className="m-0 font-(family-name:--aua-display) text-[clamp(19px,3cqi,24px)] leading-[1.15] font-[650] tracking-[-0.015em] text-balance">{title}</h2>}
            </div>
            <div className="flex flex-wrap gap-2 @max-[519px]:w-full">
              <div role="group" aria-label={L.metricGroup} className="inline-flex rounded-full border border-(--aua-line) bg-(--aua-tint) p-[3px] @max-[519px]:w-full">
                {METRICS.map((m) => (
                  <button key={m} type="button" aria-pressed={metric === m} onClick={() => setMetric(m)} className={segBtn}>
                    {L[m]}
                  </button>
                ))}
              </div>
              <div role="group" aria-label={L.rangeGroup} className="inline-flex rounded-full border border-(--aua-line) bg-(--aua-tint) p-[3px] @max-[519px]:w-full">
                {RANGES.map((r) => (
                  <button key={r} type="button" aria-pressed={range === r} onClick={() => setRange(r)} className={segBtn}>
                    {L[r === 14 ? "range14" : "range30"]}
                  </button>
                ))}
              </div>
            </div>
          </header>

          {/* kpis */}
          <dl className="m-0 grid grid-cols-3 @max-[519px]:grid-cols-2 @max-[519px]:gap-y-3">
            {kpis.map((k, i) => (
              <div
                key={i}
                className={cx(
                  "m-0 grid min-w-0 content-start gap-[5px] px-4",
                  i === 0 && "pl-0",
                  i > 0 && "border-l border-(--aua-line)",
                  i === 2 && "@max-[519px]:col-span-full @max-[519px]:border-t @max-[519px]:border-l-0 @max-[519px]:pt-3 @max-[519px]:pl-0"
                )}
              >
                <dt className={cx(mono, "text-(--aua-faint)")}>{k.k}</dt>
                <dd className="m-0 min-w-0 font-(family-name:--aua-display) text-[clamp(22px,3.4cqi,28px)] leading-[1.05] font-[650] tracking-[-0.02em] tabular-nums">{k.v}</dd>
                <dd className="m-0 min-w-0 text-[12.5px] text-(--aua-muted) tabular-nums">{k.s}</dd>
              </div>
            ))}
          </dl>

          {/* legend */}
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
              {models.map((m) => {
                const on = model === m.id;
                const sum = m[metric].slice(from).reduce((a, v) => a + v, 0);
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => isolate(m.id)}
                      className={cx(
                        "inline-flex cursor-pointer appearance-none items-center gap-2 rounded-full border border-(--aua-line) bg-(--aua-card) py-[7px] pr-[11px] pl-[9px] font-(family-name:--aua-sans) text-[12.5px] leading-none font-semibold text-(--aua-ink) tabular-nums transition-[opacity,border-color,background-color] duration-200 hover:border-(--aua-axis) aria-pressed:border-[color-mix(in_oklab,var(--aua-lilac)_45%,transparent)] aria-pressed:bg-(--aua-lilac-soft) motion-reduce:transition-none",
                        model && !on && "opacity-50",
                        focusRing
                      )}
                    >
                      <i aria-hidden="true" className="size-2.5 flex-none rounded-[3px]" style={{ background: SLOT_COLOR[m.slot] }} />
                      {m.label}
                      <span className="font-medium text-(--aua-muted)">{fmt(metric, sum, true)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <span className="ml-1 self-center text-xs text-(--aua-faint) @max-[519px]:mx-0 @max-[519px]:mt-0.5 @max-[519px]:basis-full">{L.hint}</span>
          </div>

          {/* chart */}
          <div
            ref={plotRef}
            tabIndex={0}
            role="group"
            aria-label={chartLabel}
            onPointerMove={(e) => setActive(idxAt(e))}
            onPointerDown={(e) => setActive(idxAt(e))}
            onPointerLeave={(e) => {
              if (e.pointerType === "touch") return;
              if (document.activeElement !== e.currentTarget) setActive(null);
            }}
            onFocus={() => {
              if (activeIdx == null && n) {
                setActive(n - 1);
                announce(n - 1);
              }
            }}
            onBlur={() => setActive(null)}
            onKeyDown={onKey}
            className="relative touch-pan-y rounded-xl outline-none focus-visible:shadow-[0_0_0_2px_var(--aua-focus)]"
          >
            <svg aria-hidden="true" focusable="false" viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="block w-full overflow-visible">
              <g>
                {gridLines.map((v) => {
                  const yy = Math.round(y(v)) + 0.5;
                  return (
                    <g key={v}>
                      <line x1={pad.l} x2={W - pad.r} y1={yy} y2={yy} strokeWidth="1" shapeRendering="crispEdges" className={v === 0 ? "stroke-(--aua-axis)" : "stroke-(--aua-grid)"} />
                      <text x={pad.l - 8} y={yy + 4} textAnchor="end" className="fill-(--aua-faint) font-(family-name:--aua-sans) text-[11px] font-medium tabular-nums">
                        {v === 0 ? "0" : fmt(metric, v, true)}
                      </text>
                    </g>
                  );
                })}
              </g>
              <g key={animKey}>
                {wDays.map((day, i) => {
                  const cxp = pad.l + band * i + band / 2;
                  const wd = day.getDay();
                  const weekend = wd === 0 || wd === 6;
                  const isActive = activeIdx === i;
                  let acc = 0;
                  const parts = vis.map((m) => ({ m, v: m[metric][from + i] })).filter((p) => p.v > 0);
                  return (
                    <g key={i} className={cx("transition-opacity duration-200 motion-reduce:transition-none", activeIdx != null && !isActive && "opacity-40")}>
                      <rect
                        x={(pad.l + band * i + 0.5).toFixed(2)}
                        y={pad.t}
                        width={Math.max(1, band - 1).toFixed(2)}
                        height={ph}
                        rx="4"
                        className={
                          isActive
                            ? weekend
                              ? "fill-[color-mix(in_oklab,var(--aua-lilac)_9%,transparent)]"
                              : "fill-[color-mix(in_oklab,var(--aua-lilac)_7%,transparent)]"
                            : weekend
                              ? "fill-[color-mix(in_oklab,var(--aua-tint)_70%,transparent)]"
                              : "fill-transparent"
                        }
                      />
                      <g
                        style={barStyle(i)}
                        className={cx(
                          "origin-bottom [transform-box:fill-box]",
                          pending && "scale-y-0",
                          anim && "animate-[aua-grow_0.5s_cubic-bezier(0.2,0.7,0.2,1)_both] [animation-delay:calc(var(--i)*14ms)]"
                        )}
                      >
                        {parts.map((p, k) => {
                          const y0 = y(acc);
                          const y1 = y(acc + p.v);
                          acc += p.v;
                          const top = k === parts.length - 1;
                          const yTop = top ? y1 : y1 + GAP;
                          const h = y0 - yTop;
                          if (h <= 0.4) return null;
                          const x0 = cxp - bw / 2;
                          const r = top ? Math.min(4, bw / 2, h) : 0;
                          const d = r
                            ? `M${x0} ${y0}V${yTop + r}Q${x0} ${yTop} ${x0 + r} ${yTop}H${x0 + bw - r}Q${x0 + bw} ${yTop} ${x0 + bw} ${yTop + r}V${y0}Z`
                            : `M${x0} ${y0}V${yTop}H${x0 + bw}V${y0}Z`;
                          return <path key={p.m.id} d={d} fill={SLOT_COLOR[p.m.slot]} />;
                        })}
                      </g>
                    </g>
                  );
                })}
              </g>
              <g>
                {wDays.map((day, i) =>
                  i % labelEvery === (n - 1) % labelEvery ? (
                    <text
                      key={i}
                      x={pad.l + band * i + band / 2}
                      y={H - 8}
                      textAnchor="middle"
                      className={cx(
                        "font-(family-name:--aua-sans) text-[11px] tabular-nums",
                        activeIdx === i ? "fill-(--aua-ink) font-[650]" : "fill-(--aua-faint) font-medium"
                      )}
                    >
                      {date(day)}
                    </text>
                  ) : null
                )}
              </g>
            </svg>
            {n === 0 && <p className="absolute inset-0 m-0 grid place-items-center text-[13px] text-(--aua-muted)">{L.noData}</p>}
            <div
              ref={tipRef}
              aria-hidden="true"
              style={{ left: tipPos.left, top: tipPos.top }}
              className={cx(
                "pointer-events-none absolute z-[2] min-w-[170px] rounded-xl bg-(--aua-tip) px-3 py-2.5 text-[12.5px] leading-[1.5] text-(--aua-tip-ink) tabular-nums shadow-[0_18px_32px_-16px_var(--aua-shadow)] transition-[opacity,translate] duration-150 motion-reduce:transition-none",
                activeIdx != null ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
              )}
            >
              {activeIdx != null && (
                <>
                  <strong className="mb-1 block text-[12.5px]">{longDay(days[from + activeIdx])}</strong>
                  {vis
                    .slice()
                    .reverse()
                    .map((m) => (
                      <div key={m.id} className="grid grid-cols-[10px_minmax(0,1fr)_auto] items-center gap-2">
                        <i className="size-[9px] rounded-[2px]" style={{ background: SLOT_COLOR[m.slot] }} />
                        <span>{m.label}</span>
                        <b className="font-semibold">{fmt(metric, m[metric][from + activeIdx])}</b>
                      </div>
                    ))}
                  {vis.length > 1 && (
                    <div className="mt-[5px] flex justify-between gap-3 border-t border-[color-mix(in_oklab,var(--aua-tip-ink)_22%,transparent)] pt-[5px] font-[650]">
                      <span>{L.total}</span>
                      <span>{fmt(metric, totals[activeIdx])}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          <table className="sr-only">
            <caption>{chartLabel.split(".")[0]}</caption>
            <thead>
              <tr>
                <th>{L.day}</th>
                {vis.map((m) => (
                  <th key={m.id}>{m.label}</th>
                ))}
                <th>{L.total}</th>
              </tr>
            </thead>
            <tbody>
              {wDays.map((d, i) => (
                <tr key={i}>
                  <th scope="row">{longDay(d)}</th>
                  {vis.map((m) => (
                    <td key={m.id}>{fmt(metric, m[metric][from + i])}</td>
                  ))}
                  <td>{fmt(metric, totals[i])}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {source && <p className="m-0 text-xs text-(--aua-faint)">{source}</p>}
        </div>

        {/* charcoal side panel */}
        <aside className="grid content-start gap-[18px] bg-(--aua-panel) bg-[radial-gradient(120%_60%_at_100%_0%,color-mix(in_oklab,var(--aua-ring)_16%,transparent),transparent_60%)] px-[22px] pt-6 pb-[22px] text-(--aua-panel-ink) [--aua-c1:var(--aua-pc1)] [--aua-c2:var(--aua-pc2)] [--aua-c3:var(--aua-pc3)] @max-[779px]:grid-cols-2 @max-[779px]:gap-x-6 @max-[779px]:gap-y-0 @max-[779px]:px-5 @max-[779px]:py-[22px] @max-[519px]:grid-cols-1 @max-[519px]:gap-[18px] @max-[519px]:px-3.5 @max-[519px]:py-5">
          <section className="grid gap-3">
            <h3 className={cx(mono, "m-0 flex items-baseline justify-between gap-2 text-(--aua-panel-muted)")}>
              <span>{L.quota}</span>
              <span className="font-(family-name:--aua-sans) text-xs leading-none font-medium tracking-normal normal-case">{fill(L.resets, { date: date(side.bEnd) })}</span>
            </h3>
            <div className="grid grid-cols-[112px_minmax(0,1fr)] items-center gap-4 @max-[519px]:grid-cols-[108px_minmax(0,1fr)]">
              <div
                role="img"
                aria-label={`${L.quota}: ${pct} used, ${compact(side.usedTok)} of ${compact(quota, 0)} tokens. ${L.projected} ${compact(side.projTok)}.`}
                className="relative size-28 @max-[519px]:size-[108px]"
              >
                <svg viewBox="0 0 124 124" aria-hidden="true" className="size-full -rotate-90">
                  <circle cx="62" cy="62" r="52" fill="none" strokeWidth="12" className="stroke-(--aua-ring-track)" />
                  <circle
                    cx="62"
                    cy="62"
                    r="52"
                    fill="none"
                    strokeWidth="12"
                    className="stroke-(--aua-ring) opacity-[0.32] transition-[stroke-dasharray] duration-800 ease-out-soft motion-reduce:transition-none"
                    style={{ strokeDasharray: `${(projR * C).toFixed(1)} ${C.toFixed(1)}` }}
                  />
                  <circle
                    cx="62"
                    cy="62"
                    r="52"
                    fill="none"
                    strokeWidth="12"
                    strokeLinecap="round"
                    className="stroke-(--aua-ring) transition-[stroke-dasharray] duration-800 ease-out-soft motion-reduce:transition-none"
                    style={{ strokeDasharray: `${(usedR * C).toFixed(1)} ${C.toFixed(1)}` }}
                  />
                </svg>
                <div className="absolute inset-0 grid place-content-center gap-[3px] text-center">
                  <b className="font-(family-name:--aua-display) text-[26px] leading-none font-[650] tracking-[-0.02em] tabular-nums">{pct}</b>
                  <span className="text-[11px] text-(--aua-panel-muted)">{L.ofTokens}</span>
                </div>
              </div>
              <dl className="m-0 grid gap-[9px] text-[12.5px] tabular-nums">
                {[
                  { k: L.used, v: `${compact(side.usedTok)} / ${compact(quota, 0)}` },
                  { k: L.projected, v: compact(side.projTok), sm: quota > 0 ? `${Math.round((side.projTok / quota) * 100)}% ${L.ofQuota}` : "" },
                  { k: L.leftLabel, v: fill(L.days, { n: side.left }), sm: fill(L.through, { date: date(addDays(side.bEnd, -1)) }) },
                ].map((f) => (
                  <div key={f.k} className="grid gap-0.5">
                    <dt className="text-(--aua-panel-muted)">{f.k}</dt>
                    <dd className="m-0 font-semibold">
                      {f.v}
                      {f.sm && (
                        <>
                          {" "}
                          <small className="text-xs font-medium text-(--aua-panel-muted)">{f.sm}</small>
                        </>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>

          <section className="grid gap-3 border-t border-(--aua-panel-line) pt-[18px] @max-[779px]:border-t-0 @max-[779px]:border-l @max-[779px]:pt-0 @max-[779px]:pl-6 @max-[519px]:border-t @max-[519px]:border-l-0 @max-[519px]:pt-[18px] @max-[519px]:pl-0">
            <h3 className={cx(mono, "m-0 text-(--aua-panel-muted)")}>{L.costHead}</h3>
            <div className="flex flex-wrap items-baseline gap-2">
              <b className="font-(family-name:--aua-display) text-[30px] leading-none font-[650] tracking-[-0.02em] tabular-nums">{money(side.mtd)}</b>
              <span className="text-[12.5px] text-(--aua-panel-muted)">{L.mtd}</span>
            </div>
            <div className="grid gap-1.5 text-[12.5px] text-(--aua-panel-muted) tabular-nums">
              <div aria-hidden="true" className="relative h-2 overflow-hidden rounded bg-(--aua-ring-track)">
                <i
                  className={cx(
                    "absolute inset-y-0 left-0 rounded transition-[width] duration-800 ease-out-soft motion-reduce:transition-none",
                    over
                      ? "bg-[repeating-linear-gradient(135deg,color-mix(in_oklab,var(--aua-warn)_60%,transparent)_0_3px,transparent_3px_6px)]"
                      : "bg-[repeating-linear-gradient(135deg,color-mix(in_oklab,var(--aua-mint)_55%,transparent)_0_3px,transparent_3px_6px)]"
                  )}
                  style={{ width: `${((side.projCost / scaleTo) * 100).toFixed(1)}%` }}
                />
                <i
                  className={cx("absolute inset-y-0 left-0 rounded transition-[width] duration-800 ease-out-soft motion-reduce:transition-none", over ? "bg-(--aua-warn)" : "bg-(--aua-mint)")}
                  style={{ width: `${((side.mtd / scaleTo) * 100).toFixed(1)}%` }}
                />
              </div>
              <div className="flex flex-wrap justify-between gap-2.5">
                <span>
                  <b className="font-semibold text-(--aua-panel-ink)">{fill(L.projectedCost, { v: money(side.projCost) })}</b>
                  {budget > 0 && ` · ${fill(L.budget, { v: money(budget, 0) })}`}
                </span>
                {budget > 0 && (
                  <span className={cx("inline-flex items-center gap-1.5 font-semibold", over ? "text-(--aua-warn)" : "text-(--aua-mint)")}>
                    {over ? <WarnIcon /> : <OkIcon />}
                    {over ? L.over : L.under}
                  </span>
                )}
              </div>
            </div>
            <h4 className={cx(mono, "m-0 mt-1.5 text-(--aua-panel-muted)")}>{L.byModel}</h4>
            <ul className="m-0 grid list-none gap-2 p-0">
              {side.costs.map((c) => {
                const share = side.mtd > 0 ? Math.round((c.v / side.mtd) * 100) : 0;
                return (
                  <li key={c.m.id} className="grid grid-cols-[10px_minmax(0,1fr)_auto] items-center gap-x-2.5 gap-y-1 text-[13px] tabular-nums">
                    <i aria-hidden="true" className="size-2.5 rounded-[3px]" style={{ background: SLOT_COLOR[c.m.slot] }} />
                    <span>{c.m.label}</span>
                    <b className="font-semibold">{money(c.v)}</b>
                    <small className="col-[2/-1] text-[11.5px] text-(--aua-panel-muted)">
                      {share}% · {fill(L.perM, { v: money(c.m.price) })}
                    </small>
                  </li>
                );
              })}
            </ul>
          </section>
        </aside>
        <p className="sr-only" aria-live="polite">
          {live}
        </p>
      </article>
    </div>
  );
}

export default AiUsageAnalytics;
