"use client";

import { useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { cx } from "@/lib/format";

export type TeamMetric = "deals" | "revenue" | "calls" | "response";

export interface TeamPeriodInfo {
  /** Button label, e.g. "This week". */
  label: string;
  /** Date range shown under the title. */
  range?: string;
  /** What the previous period is called, e.g. "last week". */
  compare?: string;
  /** Names for the points of each trend, oldest first. */
  axis?: string[];
}

export interface TeamMemberPeriod {
  /** Values oldest first. The last is the current period, the one before it the previous period. */
  deals?: number[];
  revenue?: number[];
  calls?: number[];
  /** Average first-reply time in minutes. Lower is better. */
  response?: number[];
  /** Targets for this period. Response is a maximum. */
  target?: Partial<Record<TeamMetric, number>>;
}

export interface TeamMember {
  id: string;
  name: string;
  role?: string;
  /** One entry per key of `periods`. */
  periods: Record<string, TeamMemberPeriod>;
}

export interface TeamPerformanceLabels {
  rankBy: string;
  period: string;
  deals: string;
  revenue: string;
  calls: string;
  response: string;
  dealsShort: string;
  revenueShort: string;
  callsShort: string;
  responseShort: string;
  rank: string;
  member: string;
  min: string;
  team: string;
  ofTarget: string;
  up: string;
  down: string;
  same: string;
  fresh: string;
  trend: string;
  target: string;
  goal: string;
  maxGoal: string;
  vs: string;
  rankChange: string;
  empty: string;
  footResponse: string;
  announce: string;
}

export interface TeamMemberSelectDetail {
  id: string;
  name: string;
  rank: number;
  metric: TeamMetric;
  period: string;
  value: number | null;
  expanded: boolean;
}

export interface TeamPerformanceProps {
  members: TeamMember[];
  /** Period definitions, keyed like members[].periods. */
  periods: Record<string, TeamPeriodInfo>;
  eyebrow?: string;
  title?: string;
  /** Team name, shown with the period range. */
  team?: string;
  /** Revenue currency. */
  currency?: string;
  /** Number locale. */
  locale?: string;
  /** Footer note (replaced by the response-time note when ranking by response). */
  footnote?: string;
  /** Controlled ranking metric. */
  metric?: TeamMetric;
  defaultMetric?: TeamMetric;
  onMetricChange?: (metric: TeamMetric, period: string) => void;
  /** Controlled period key. */
  period?: string;
  defaultPeriod?: string;
  onPeriodChange?: (period: string) => void;
  /** Fired when a person is opened or closed. */
  onMemberSelect?: (detail: TeamMemberSelectDetail) => void;
  labels?: Partial<TeamPerformanceLabels>;
  className?: string;
}

export const TEAM_PERFORMANCE_LABELS: TeamPerformanceLabels = {
  rankBy: "Rank by",
  period: "Period",
  deals: "Deals won",
  revenue: "Revenue",
  calls: "Calls",
  response: "Response time",
  dealsShort: "Deals",
  revenueShort: "Revenue",
  callsShort: "Calls",
  responseShort: "Response",
  rank: "#",
  member: "Member",
  min: "min",
  team: "Team",
  ofTarget: "{pct} of target",
  up: "Up {n} from {compare}",
  down: "Down {n} from {compare}",
  same: "Same rank as {compare}",
  fresh: "New",
  trend: "{metric} trend",
  target: "Target progress",
  goal: "Target",
  maxGoal: "≤ {v}",
  vs: "{delta} vs {compare}",
  rankChange: "▲▼ Rank change vs {compare}",
  empty: "No team members to show.",
  footResponse: "Response time is the average first reply to a new lead, in minutes. Lower is better.",
  announce: "Ranked by {metric}, {period}. {name} leads with {value}.",
};

const METRICS: TeamMetric[] = ["deals", "revenue", "calls", "response"];
const SHORT: Record<TeamMetric, keyof TeamPerformanceLabels> = { deals: "dealsShort", revenue: "revenueShort", calls: "callsShort", response: "responseShort" };
const fill = (s: string, vars: Record<string, string | number>) => String(s).replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ""));
const fin = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const initials = (name: string) =>
  String(name || "?")
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
const hue = (id: string) => {
  let h = 0;
  for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
};
const reduceMotion = () => typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

interface Row {
  id: string;
  name: string;
  role: string;
  series: Record<TeamMetric, Array<number | null>>;
  cur: (k: TeamMetric) => number | null;
  prev: (k: TeamMetric) => number | null;
  target: Partial<Record<TeamMetric, number>>;
  value: number | null;
  prevValue: number | null;
  rank: number;
  prevRank: number | null;
  move: number | null;
}

/** Rank everyone for a metric + period, and work out last period's rank too. */
function rankRows(members: TeamMember[], metric: TeamMetric, period: string): Row[] {
  const low = metric === "response";
  const rows: Row[] = members.filter(Boolean).map((m, i) => {
    const p = m.periods?.[period] ?? {};
    const series = Object.fromEntries(METRICS.map((k) => [k, (p[k] ?? []).map(fin)])) as Record<TeamMetric, Array<number | null>>;
    const cur = (k: TeamMetric) => (series[k].length ? series[k][series[k].length - 1] : null);
    const prev = (k: TeamMetric) => (series[k].length > 1 ? series[k][series[k].length - 2] : null);
    return {
      id: String(m.id || `m${i + 1}`),
      name: m.name || `Member ${i + 1}`,
      role: m.role || "",
      series,
      cur,
      prev,
      target: p.target ?? {},
      value: cur(metric),
      prevValue: prev(metric),
      rank: 0,
      prevRank: null,
      move: null,
    };
  });
  const cmp = (key: "cur" | "prev", a: Row, b: Row) => {
    const x = key === "cur" ? a.value : a.prevValue;
    const y = key === "cur" ? b.value : b.prevValue;
    if (x == null && y == null) return 0;
    if (x == null) return 1;
    if (y == null) return -1;
    if (x !== y) return low ? x - y : y - x;
    const rx = (key === "cur" ? a.cur("revenue") : a.prev("revenue")) || 0;
    const ry = (key === "cur" ? b.cur("revenue") : b.prev("revenue")) || 0;
    if (rx !== ry) return ry - rx;
    return a.name.localeCompare(b.name, "en-US");
  };
  [...rows].sort((a, b) => cmp("prev", a, b)).forEach((r, i) => (r.prevRank = r.prevValue == null ? null : i + 1));
  rows.sort((a, b) => cmp("cur", a, b)).forEach((r, i) => {
    r.rank = i + 1;
    r.move = r.prevRank == null ? null : r.prevRank - r.rank;
  });
  return rows;
}

const mono = "font-(family-name:--tmp-mono) uppercase";
const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--tmp-purple)";
const PLACE: Record<number, string> = {
  1: "[--m:var(--tmp-medal-1)] order-2",
  2: "[--m:var(--tmp-medal-2)] order-1",
  3: "[--m:var(--tmp-medal-3)] order-3",
};

function Avatar({ r, className, children }: { r: Row; className?: string; children?: ReactNode }) {
  return (
    <span
      aria-hidden="true"
      style={{ "--h": hue(r.id) } as CSSProperties}
      className={cx(
        "relative grid size-(--size) flex-none place-items-center rounded-full font-(family-name:--tmp-display) text-[calc(var(--size)*.36)] leading-none font-[650] tracking-[0.01em]",
        className ?? "[--size:40px] bg-[hsl(var(--h)_var(--tmp-av-sat)_var(--tmp-av-bg))] text-[hsl(var(--h)_55%_var(--tmp-av-fg))]"
      )}
    >
      {initials(r.name)}
      {children}
    </span>
  );
}

/**
 * A sales leaderboard with a top-three podium and a ranked list. Rank by deals,
 * revenue, calls or response time for a period, and open a person to see their
 * trend and target progress.
 */
export function TeamPerformance({
  members,
  periods,
  eyebrow,
  title,
  team,
  currency = "USD",
  locale = "en-US",
  footnote,
  metric: metricProp,
  defaultMetric = "revenue",
  onMetricChange,
  period: periodProp,
  defaultPeriod,
  onPeriodChange,
  onMemberSelect,
  labels,
  className,
}: TeamPerformanceProps) {
  const L = useMemo<TeamPerformanceLabels>(() => ({ ...TEAM_PERFORMANCE_LABELS, ...labels }), [labels]);
  const uid = useId();
  const root = useRef<HTMLElement>(null);

  const periodKeys = useMemo(() => {
    const k = Object.keys(periods ?? {});
    if (k.length) return k;
    const m = members[0];
    return m?.periods ? Object.keys(m.periods) : ["week"];
  }, [periods, members]);
  const pinfo = (key: string) => {
    const p = periods?.[key];
    return { label: p?.label || key, range: p?.range || "", compare: p?.compare || "", axis: p?.axis ?? [] };
  };

  const [metricInner, setMetricInner] = useState<TeamMetric>(defaultMetric);
  const rawMetric = metricProp ?? metricInner;
  const metric: TeamMetric = METRICS.includes(rawMetric) ? rawMetric : "revenue";
  const [periodInner, setPeriodInner] = useState<string>(defaultPeriod ?? periodKeys[0]);
  const rawPeriod = periodProp ?? periodInner;
  const period = periodKeys.includes(rawPeriod) ? rawPeriod : periodKeys[0];
  const info = pinfo(period);

  const [openId, setOpenId] = useState<string | null>(null);
  const [sr, setSr] = useState("");

  const rows = useMemo(() => rankRows(members, metric, period), [members, metric, period]);
  const open = openId && rows.some((r) => r.id === openId) ? openId : null;

  const fmt = (k: TeamMetric, v: number | null) => {
    if (v == null) return "—";
    if (k === "revenue") {
      try {
        return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(v);
      } catch {
        return Math.round(v).toLocaleString(locale);
      }
    }
    if (k === "response") return `${Math.round(v).toLocaleString(locale)} ${L.min}`;
    return Math.round(v).toLocaleString(locale);
  };

  /* FLIP: positions relative to the card, snapshotted after every layout */
  const rects = useRef(new Map<string, { x: number; y: number }>());
  const focusMid = useRef<string | null>(null);
  const changeKey = `${metric}|${period}`;
  const prevKey = useRef(changeKey);
  const prevMembers = useRef(members);
  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const base = el.getBoundingClientRect();
    const nodes = [...el.querySelectorAll<HTMLElement>("[data-mid]")];
    const animate = prevKey.current !== changeKey || prevMembers.current !== members;
    prevKey.current = changeKey;
    prevMembers.current = members;
    // a member that moved between podium and list gets its focus back
    if (focusMid.current && !el.contains(document.activeElement)) {
      el.querySelector<HTMLElement>(`[data-mid="${CSS.escape(focusMid.current)}"]`)?.focus({ preventScroll: true });
    }
    focusMid.current = null;
    if (animate && !reduceMotion() && typeof Element.prototype.animate === "function") {
      nodes.forEach((node, i) => {
        const mid = node.dataset.mid ?? "";
        const a = rects.current.get(mid);
        const b = node.getBoundingClientRect();
        if (!a) {
          node.animate([{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }], {
            duration: 360,
            delay: i * 25,
            easing: "cubic-bezier(.2,.7,.2,1)",
            fill: "backwards",
          });
          return;
        }
        const dx = a.x - (b.left - base.left);
        const dy = a.y - (b.top - base.top);
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
        node.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }], { duration: 480, easing: "cubic-bezier(.2,.7,.2,1)" });
      });
    }
    const next = new Map<string, { x: number; y: number }>();
    nodes.forEach((node) => {
      if (next.has(node.dataset.mid ?? "")) return;
      const r = node.getBoundingClientRect();
      next.set(node.dataset.mid ?? "", { x: r.left - base.left, y: r.top - base.top });
    });
    rects.current = next;
  });

  const noteFocus = () => {
    const ae = document.activeElement as HTMLElement | null;
    focusMid.current = ae && root.current?.contains(ae) ? (ae.dataset.mid ?? null) : null;
  };

  const announce = (m: TeamMetric, p: string) => {
    const top = rankRows(members, m, p)[0];
    if (top) setSr(fill(L.announce, { metric: L[m].toLowerCase(), period: pinfo(p).label.toLowerCase(), name: top.name, value: fmt(m, top.value) }));
  };

  const changeMetric = (m: TeamMetric) => {
    if (m === metric) return;
    noteFocus();
    if (metricProp === undefined) setMetricInner(m);
    announce(m, period);
    onMetricChange?.(m, period);
  };
  const changePeriod = (p: string) => {
    if (p === period) return;
    noteFocus();
    if (periodProp === undefined) setPeriodInner(p);
    announce(metric, p);
    onPeriodChange?.(p);
  };
  const toggle = (r: Row, el: HTMLElement) => {
    focusMid.current = el.dataset.mid ?? null;
    const expanded = open !== r.id;
    setOpenId(expanded ? r.id : null);
    onMemberSelect?.({ id: r.id, name: r.name, rank: r.rank, metric, period, value: r.value, expanded });
  };

  /* team total for the ranking metric */
  const vals = rows.map((r) => r.value).filter((v): v is number => v != null);
  const total = vals.length ? (metric === "response" ? vals.reduce((a, b) => a + b, 0) / vals.length : vals.reduce((a, b) => a + b, 0)) : null;
  const targets = rows.map((r) => fin(r.target[metric])).filter((v): v is number => v != null);
  const pct = total != null && targets.length === rows.length && metric !== "response" ? total / targets.reduce((a, b) => a + b, 0) : null;

  const best = Object.fromEntries(
    METRICS.map((k) => {
      const v = rows.map((r) => r.cur(k)).filter((x): x is number => x != null && x > 0);
      return [k, v.length ? (k === "response" ? Math.min(...v) : Math.max(...v)) : null];
    })
  ) as Record<TeamMetric, number | null>;

  const top3 = rows.slice(0, 3);
  const rest = rows.slice(3);
  const openTop = top3.find((r) => r.id === open);
  const podDetailId = `${uid}-pod-detail`;

  const chg = (r: Row, onPod?: boolean) => {
    const title =
      r.move == null ? L.fresh : fill(r.move > 0 ? L.up : r.move < 0 ? L.down : L.same, { n: Math.abs(r.move), compare: info.compare });
    const dir = r.move == null ? null : r.move > 0 ? "up" : r.move < 0 ? "down" : "same";
    const tone = onPod
      ? dir === "up"
        ? "bg-white/8 text-[#86EFAC]"
        : dir === "down"
          ? "bg-white/8 text-[#FDA4AF]"
          : "bg-white/8 text-(--tmp-pod-muted)"
      : dir === "up"
        ? "bg-[color-mix(in_oklab,var(--tmp-good)_11%,transparent)] text-(--tmp-good)"
        : dir === "down"
          ? "bg-[color-mix(in_oklab,var(--tmp-bad)_10%,transparent)] text-(--tmp-bad)"
          : "bg-(--tmp-tint) text-(--tmp-faint)";
    return {
      title,
      node: (
        <span
          title={r.move == null ? undefined : title}
          className={cx("inline-flex items-center gap-[3px] rounded-full px-[7px] py-1 text-[11px] leading-none font-semibold whitespace-nowrap tabular-nums", tone)}
        >
          {r.move == null ? L.fresh : r.move > 0 ? `▲ ${r.move}` : r.move < 0 ? `▼ ${-r.move}` : "–"}
        </span>
      ),
    };
  };

  const detail = (r: Row, id: string) => {
    const series = r.series[metric].filter((v): v is number => v != null);
    const diff = r.value != null && r.prevValue != null ? r.value - r.prevValue : null;
    const goal = fin(r.target[metric]);
    const W = 240;
    const H = 70;
    const pad = 6;
    const lo = Math.min(...series, goal ?? Infinity);
    const hi = Math.max(...series, goal ?? -Infinity);
    const span = hi - lo || 1;
    const x = (i: number) => (i / Math.max(1, series.length - 1)) * W;
    const y = (v: number) => pad + (1 - (v - lo) / span) * (H - pad * 2);
    const pts = series.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`);
    const names = info.axis.length === series.length ? info.axis : series.map((_, i) => String(i + 1));
    return (
      <div
        id={id}
        className="grid animate-[tmp-open_.32s_cubic-bezier(.2,.7,.2,1)] grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-x-[26px] gap-y-[18px] rounded-[14px] border border-(--tmp-line) bg-(--tmp-raise) px-5 py-[18px] shadow-[0_18px_36px_-30px_var(--tmp-shadow)] motion-reduce:animate-none @max-[760px]:grid-cols-1 @max-[520px]:p-3.5"
      >
        <div>
          <p className={cx(mono, "m-0 mb-2.5 flex flex-wrap justify-between gap-2.5 text-[10.5px] leading-[1.2] font-medium tracking-[0.1em] text-(--tmp-faint)")}>
            <span>{fill(L.trend, { metric: L[metric] })}</span>
            {diff != null && (
              <b className="font-semibold tracking-[0.04em] text-(--tmp-ink)">
                {fill(L.vs, { delta: (diff > 0 ? "+" : diff < 0 ? "−" : "±") + fmt(metric, Math.abs(diff)), compare: info.compare })}
              </b>
            )}
          </p>
          {series.length > 1 && (
            <>
              <div className="relative">
                <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true" focusable="false" className="block h-[86px] w-full overflow-visible">
                  <path d={`M0,${H} L${pts.join(" L")} L${W},${H} Z`} className="fill-(--tmp-purple-soft)" />
                  {goal != null && (
                    <line
                      x1="0"
                      x2={W}
                      y1={y(goal).toFixed(1)}
                      y2={y(goal).toFixed(1)}
                      strokeWidth="1.2"
                      strokeDasharray="4 4"
                      vectorEffect="non-scaling-stroke"
                      className="stroke-(--tmp-gold)"
                    />
                  )}
                  <polyline
                    points={pts.join(" ")}
                    fill="none"
                    strokeWidth="2.2"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                    className="stroke-(--tmp-purple)"
                  />
                </svg>
                {/* dots as HTML so they stay round when the chart stretches */}
                {series.map((v, i) => (
                  <span
                    key={i}
                    aria-hidden="true"
                    style={{ left: `${((x(i) / W) * 100).toFixed(2)}%`, top: `${((y(v) / H) * 86).toFixed(1)}px` }}
                    className={cx(
                      "absolute -mt-1 -ml-1 size-2 rounded-full border-[1.6px]",
                      i === series.length - 1
                        ? "border-(--tmp-gold) bg-(--tmp-gold) shadow-[0_0_0_3px_var(--tmp-gold-soft)]"
                        : "border-(--tmp-purple) bg-(--tmp-raise)"
                    )}
                  />
                ))}
              </div>
              <div aria-hidden="true" className="mt-1.5 flex justify-between font-(family-name:--tmp-mono) text-[10.5px] leading-none font-medium text-(--tmp-faint)">
                {names.map((n, i) => (
                  <span key={i} className={cx(i === names.length - 1 && "font-semibold text-(--tmp-ink)")}>
                    {n}
                  </span>
                ))}
              </div>
              <p className="m-0 mt-2 flex flex-wrap gap-3.5 text-xs text-(--tmp-muted)">
                <span className="inline-flex items-center gap-1.5">
                  <i className="h-0 w-3.5 border-t-2 border-(--tmp-purple)" />
                  {L[metric]}
                </span>
                {goal != null && (
                  <span className="inline-flex items-center gap-1.5">
                    <i className="h-0 w-3.5 border-t-2 border-dashed border-(--tmp-gold)" />
                    {L.goal} {metric === "response" ? fill(L.maxGoal, { v: fmt(metric, goal) }) : fmt(metric, goal)}
                  </span>
                )}
              </p>
              <p className="sr-only">
                {fill(L.trend, { metric: L[metric] })}: {series.map((v, i) => `${names[i]} ${fmt(metric, v)}`).join(", ")}.
              </p>
            </>
          )}
        </div>
        <div className="grid content-start gap-3">
          <p className={cx(mono, "m-0 flex flex-wrap justify-between gap-2.5 text-[10.5px] leading-[1.2] font-medium tracking-[0.1em] text-(--tmp-faint)")}>
            <span>{L.target}</span>
            <b className="font-semibold tracking-[0.04em] text-(--tmp-ink)">{info.label}</b>
          </p>
          {METRICS.map((k) => {
            const v = r.cur(k);
            const g = fin(r.target[k]);
            if (g == null || v == null) return null;
            const low = k === "response";
            const p = low ? (v <= 0 ? 1 : Math.min(1, g / v)) : Math.min(1, v / g);
            const met = low ? v <= g : v >= g;
            return (
              <div key={k} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-2.5 gap-y-1.5 text-[13px]">
                <span className={k === metric ? "font-semibold text-(--tmp-ink)" : "text-(--tmp-muted)"}>{L[k]}</span>
                <span className="text-[12.5px] text-(--tmp-muted) tabular-nums">
                  <b className="font-[650] text-(--tmp-ink)">{fmt(k, v)}</b> / {low ? fill(L.maxGoal, { v: fmt(k, g) }) : fmt(k, g)}
                  {!low && ` · ${Math.round((v / g) * 100)}%`}
                </span>
                <span aria-hidden="true" className="relative col-span-full h-[7px] overflow-hidden rounded-full bg-(--tmp-tint)">
                  <span
                    style={{ width: `${(p * 100).toFixed(1)}%` }}
                    className={cx(
                      "absolute inset-y-0 left-0 animate-[tmp-grow_.6s_cubic-bezier(.2,.7,.2,1)] rounded-[inherit] motion-reduce:animate-none",
                      met
                        ? "bg-[linear-gradient(90deg,color-mix(in_oklab,var(--tmp-gold)_70%,transparent),var(--tmp-gold))]"
                        : "bg-[linear-gradient(90deg,color-mix(in_oklab,var(--tmp-purple)_70%,transparent),var(--tmp-purple))]"
                    )}
                  />
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const segBtn = cx(
    "cursor-pointer rounded-lg border-0 bg-transparent px-[13px] py-[9px] text-[13px] leading-none font-semibold text-(--tmp-muted) [transition:background_.25s,color_.25s,box-shadow_.25s] hover:text-(--tmp-ink) aria-pressed:bg-(--tmp-raise) aria-pressed:text-(--tmp-purple) aria-pressed:shadow-[0_1px_3px_-1px_var(--tmp-shadow),0_0_0_1px_var(--tmp-line)] motion-reduce:transition-none @max-[520px]:flex-1 @max-[520px]:px-1.5",
    focusRing
  );
  const colHead = [L.rank, "", L.member, ...METRICS.map((k) => L[SHORT[k]]), ""];

  return (
    <div className={cx("@container block w-full max-w-[960px] font-(family-name:--tmp-sans) text-(--tmp-ink)", className)}>
      <article
        ref={root}
        className="relative grid gap-[18px] rounded-[22px] border border-(--tmp-line) bg-(--tmp-card) px-[26px] pt-[26px] pb-5 shadow-[0_32px_64px_-46px_var(--tmp-shadow),0_2px_6px_-4px_var(--tmp-shadow)] @max-[760px]:px-5 @max-[760px]:pt-[22px] @max-[760px]:pb-[18px] @max-[520px]:gap-4 @max-[520px]:rounded-[18px] @max-[520px]:px-3.5 @max-[520px]:pt-[18px] @max-[520px]:pb-3.5"
      >
        {/* header */}
        <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3.5 @max-[520px]:items-stretch">
          <div className="grid min-w-0 gap-1.5">
            {eyebrow && (
              <span className={cx(mono, "inline-flex items-center gap-[7px] text-[11px] leading-none font-semibold tracking-[0.1em] text-(--tmp-gold)")}>
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true" className="size-[13px]">
                  <path d="M5 2.5h6v3.5a3 3 0 0 1-6 0V2.5Z" />
                  <path d="M5 4H2.8a2 2 0 0 0 2.4 2.6M11 4h2.2a2 2 0 0 1-2.4 2.6M8 9v2.5M5.5 13.5h5" />
                </svg>
                {eyebrow}
              </span>
            )}
            {title && (
              <h2 className="m-0 font-(family-name:--tmp-display) text-[clamp(22px,3.4cqi,29px)] leading-[1.12] font-[650] tracking-[-0.025em] text-balance">{title}</h2>
            )}
            {(team || info.range) && <p className="m-0 text-[13.5px] text-(--tmp-muted)">{[team, info.range].filter(Boolean).join(" · ")}</p>}
          </div>
          <div role="group" aria-label={L.period} className="inline-flex flex-wrap gap-0.5 rounded-xl border border-(--tmp-line) bg-(--tmp-tint) p-1 @max-[520px]:w-full">
            {periodKeys.map((k) => (
              <button key={k} type="button" aria-pressed={k === period} onClick={() => changePeriod(k)} className={segBtn}>
                {pinfo(k).label}
              </button>
            ))}
          </div>
        </header>

        <div className="flex flex-wrap items-center justify-between gap-x-[18px] gap-y-2.5">
          <div className="flex flex-wrap items-center gap-2.5 @max-[520px]:w-full">
            <span className={cx(mono, "text-[10.5px] leading-none font-medium tracking-[0.1em] text-(--tmp-faint)")}>{L.rankBy}</span>
            <div
              role="group"
              aria-label={L.rankBy}
              className="inline-flex flex-wrap gap-0.5 rounded-xl border border-(--tmp-line) bg-(--tmp-tint) p-1 @max-[520px]:grid @max-[520px]:w-full @max-[520px]:grid-cols-2"
            >
              {METRICS.map((k) => (
                <button key={k} type="button" aria-pressed={k === metric} onClick={() => changeMetric(k)} className={segBtn}>
                  {L[k]}
                </button>
              ))}
            </div>
          </div>
          {total != null && (
            <p className="m-0 flex flex-wrap items-baseline gap-x-2.5 gap-y-1.5 text-[13px] text-(--tmp-muted) tabular-nums">
              <span>{`${L.team} ${metric === "response" ? "avg" : ""}`.trim()}</span>
              <b className="font-(family-name:--tmp-display) text-[15px] leading-none font-[650] text-(--tmp-ink)">{fmt(metric, total)}</b>
              {pct != null && (
                <span
                  className={cx(
                    "rounded-full px-2 py-1 text-[11.5px] leading-none font-semibold",
                    pct < 1 ? "bg-(--tmp-purple-soft) text-(--tmp-purple)" : "bg-(--tmp-gold-soft) text-(--tmp-gold)"
                  )}
                >
                  {fill(L.ofTarget, { pct: Math.round(pct * 100) + "%" })}
                </span>
              )}
            </p>
          )}
        </div>

        {/* podium */}
        {top3.length > 0 && (
          <section className="relative grid grid-cols-3 items-end gap-3.5 overflow-hidden rounded-[18px] [background:radial-gradient(42%_70%_at_50%_30%,rgba(251,191,36,0.20),transparent_70%),radial-gradient(90%_120%_at_50%_120%,var(--tmp-pod-2),transparent_70%),linear-gradient(180deg,var(--tmp-pod-2),var(--tmp-pod))] px-[26px] pt-[26px] text-(--tmp-pod-ink) shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] before:pointer-events-none before:absolute before:inset-0 before:[background:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.09)_1px,transparent_1.4px)_0_0/16px_16px] before:[mask-image:linear-gradient(to_bottom,#000,transparent_75%)] before:content-[''] @max-[760px]:gap-2 @max-[760px]:px-3.5 @max-[760px]:pt-5 @max-[520px]:grid-cols-1 @max-[520px]:gap-1.5 @max-[520px]:p-2.5">
            {top3.map((r) => {
              const c = chg(r, true);
              const first = r.rank === 1;
              return (
                <div key={r.id} className={cx("relative grid min-w-0 content-end justify-items-center @max-[520px]:order-none", PLACE[r.rank])}>
                  <button
                    type="button"
                    data-mid={r.id}
                    aria-expanded={open === r.id}
                    aria-controls={podDetailId}
                    aria-label={`${r.rank}. ${r.name}, ${L[metric]} ${fmt(metric, r.value)}. ${c.title}`}
                    onClick={(e) => toggle(r, e.currentTarget)}
                    className="relative z-[1] grid w-full min-w-0 cursor-pointer justify-items-center gap-1.5 rounded-2xl border-0 bg-transparent px-2 pt-3 pb-3.5 text-inherit transition-[background] duration-250 hover:bg-white/6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--m) aria-expanded:bg-white/10 aria-expanded:shadow-[inset_0_0_0_1px_rgba(251,191,36,0.45)] motion-reduce:transition-none @max-[520px]:grid-cols-[auto_minmax(0,1fr)_auto] @max-[520px]:items-center @max-[520px]:justify-items-start @max-[520px]:gap-x-3.5 @max-[520px]:gap-y-1 @max-[520px]:bg-white/5 @max-[520px]:p-3 @max-[520px]:text-left @max-[520px]:[grid-template-areas:'av_name_val'_'av_role_chg']"
                  >
                    <svg
                      viewBox="0 0 30 20"
                      fill="currentColor"
                      aria-hidden="true"
                      className={cx(
                        "-mb-1 w-[30px] text-(--tmp-medal-1) drop-shadow-[0_2px_6px_rgba(251,191,36,0.5)] @max-[520px]:hidden",
                        first ? "h-5" : "invisible h-3"
                      )}
                    >
                      <path d="M2 6.5 8.5 11 15 2l6.5 9L28 6.5 25.5 18h-21Z" />
                      <circle cx="2" cy="5.5" r="2" />
                      <circle cx="15" cy="2" r="2" />
                      <circle cx="28" cy="5.5" r="2" />
                    </svg>
                    <Avatar
                      r={r}
                      className={cx(
                        "bg-[hsl(var(--h)_62%_86%)] text-[hsl(var(--h)_55%_22%)] @max-[520px]:[--size:46px] @max-[520px]:[grid-area:av]",
                        first
                          ? "[--size:78px] shadow-[0_0_0_3px_var(--tmp-pod),0_0_0_6px_var(--m),0_0_34px_-2px_rgba(251,191,36,0.55)] @max-[760px]:[--size:64px]"
                          : "[--size:64px] shadow-[0_0_0_3px_var(--tmp-pod),0_0_0_5px_var(--m),0_10px_26px_-8px_rgba(0,0,0,0.6)] @max-[760px]:[--size:52px]"
                      )}
                    >
                      <span className="absolute -right-1 -bottom-1 grid size-6 place-items-center rounded-full bg-(--m) font-(family-name:--tmp-display) text-xs leading-none font-bold text-[#2A1406] shadow-[0_0_0_2px_var(--tmp-pod)]">
                        {r.rank}
                      </span>
                    </Avatar>
                    <span className="mt-2 max-w-full truncate font-(family-name:--tmp-display) text-[15px] leading-[1.2] font-[650] tracking-[-0.01em] @max-[520px]:m-0 @max-[520px]:[grid-area:name]">
                      {r.name}
                    </span>
                    <span className="max-w-full truncate text-xs text-(--tmp-pod-muted) @max-[520px]:[grid-area:role]">{r.role}</span>
                    <span
                      className={cx(
                        "mt-1 font-(family-name:--tmp-display) leading-none font-bold tracking-[-0.03em] tabular-nums @max-[520px]:m-0 @max-[520px]:justify-self-end @max-[520px]:text-[20px] @max-[520px]:[grid-area:val]",
                        first ? "text-[clamp(26px,4.4cqi,36px)] text-(--tmp-medal-1) [text-shadow:0_0_22px_rgba(251,191,36,0.35)]" : "text-[clamp(22px,3.6cqi,30px)]"
                      )}
                    >
                      {fmt(metric, r.value)}
                    </span>
                    <span className="@max-[520px]:justify-self-end @max-[520px]:[grid-area:chg]">{c.node}</span>
                  </button>
                  <div
                    aria-hidden="true"
                    className={cx(
                      "grid w-full items-start justify-items-center rounded-t-xl pt-2.5 font-(family-name:--tmp-display) text-[26px] leading-none font-bold @max-[520px]:hidden",
                      first
                        ? "h-[86px] bg-[linear-gradient(180deg,rgba(251,191,36,0.28),rgba(251,191,36,0.06))] text-[rgba(251,191,36,0.55)] shadow-[inset_0_1px_0_rgba(251,191,36,0.5)]"
                        : "bg-[linear-gradient(180deg,rgba(255,255,255,0.12),var(--tmp-pod-step))] text-white/22 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]",
                      r.rank === 2 && "h-[60px]",
                      r.rank === 3 && "h-[42px]"
                    )}
                  >
                    {r.rank}
                  </div>
                </div>
              );
            })}
          </section>
        )}
        {openTop ? detail(openTop, podDetailId) : <div id={podDetailId} hidden />}

        {/* ranked list */}
        {rest.length > 0 && (
          <div
            aria-hidden="true"
            className={cx(
              mono,
              "grid grid-cols-[34px_52px_minmax(0,1.6fr)_repeat(4,minmax(0,.8fr))_22px] items-center gap-x-3 px-3.5 text-[10.5px] leading-[1.2] font-medium tracking-[0.08em] text-(--tmp-faint) @max-[760px]:hidden"
            )}
          >
            {colHead.map((t, i) => (
              <span key={i} className={cx(i >= 3 && "text-right", i >= 3 && i <= 6 && METRICS[i - 3] === metric && "text-(--tmp-purple)")}>
                {t}
              </span>
            ))}
          </div>
        )}
        <ol start={4} className="m-0 -mt-2 grid list-none gap-1.5 p-0 @max-[760px]:mt-0">
          {rows.length === 0 && <li className="m-0 p-[26px] text-center text-[13px] text-(--tmp-faint)">{L.empty}</li>}
          {rest.map((r) => {
            const isOpen = open === r.id;
            const detId = `${uid}-d-${r.id}`;
            return (
              <li key={r.id} className="grid gap-1.5">
                <button
                  type="button"
                  data-mid={r.id}
                  aria-expanded={isOpen}
                  aria-controls={detId}
                  onClick={(e) => toggle(r, e.currentTarget)}
                  className={cx(
                    "group/row grid w-full cursor-pointer grid-cols-[34px_52px_minmax(0,1.6fr)_repeat(4,minmax(0,.8fr))_22px] items-center gap-x-3 rounded-[14px] border border-(--tmp-line) bg-transparent px-3.5 py-2.5 text-left text-inherit [transition:background_.2s,border-color_.2s,box-shadow_.2s] hover:border-[color-mix(in_oklab,var(--tmp-purple)_25%,var(--tmp-line))] hover:bg-(--tmp-raise) aria-expanded:border-(--tmp-purple) aria-expanded:bg-(--tmp-raise) aria-expanded:shadow-[0_0_0_3px_var(--tmp-purple-soft)] motion-reduce:transition-none @max-[760px]:grid-cols-[30px_50px_minmax(0,1fr)_minmax(0,auto)_18px] @max-[520px]:grid-cols-[22px_minmax(0,1fr)_minmax(0,auto)_16px] @max-[520px]:gap-x-2.5 @max-[520px]:px-3",
                    focusRing
                  )}
                >
                  <span className="font-(family-name:--tmp-display) text-[17px] leading-none font-bold text-(--tmp-faint) tabular-nums">{r.rank}</span>
                  <span className="@max-[520px]:hidden">{chg(r).node}</span>
                  <span className="flex min-w-0 items-center gap-[11px]">
                    <Avatar
                      r={r}
                      className="[--size:40px] bg-[hsl(var(--h)_var(--tmp-av-sat)_var(--tmp-av-bg))] text-[hsl(var(--h)_55%_var(--tmp-av-fg))] @max-[520px]:[--size:34px]"
                    />
                    <span className="grid min-w-0 gap-[3px]">
                      <span className="truncate font-(family-name:--tmp-display) text-[14.5px] leading-[1.2] font-semibold">{r.name}</span>
                      <span className="truncate text-xs text-(--tmp-faint)">{r.role}</span>
                    </span>
                  </span>
                  {METRICS.map((k) => {
                    const v = r.cur(k);
                    const b = best[k];
                    const p = v == null || !b ? 0 : k === "response" ? b / v : v / b;
                    const active = k === metric;
                    return (
                      <span
                        key={k}
                        className={cx(
                          "grid justify-items-end gap-[5px] leading-none tabular-nums",
                          active
                            ? "font-(family-name:--tmp-display) text-[15px] font-bold text-(--tmp-ink) @max-[760px]:min-w-[86px] @max-[520px]:min-w-0"
                            : "text-sm font-medium text-(--tmp-muted) @max-[760px]:hidden"
                        )}
                      >
                        <span className="sr-only">{L[k]}: </span>
                        {fmt(k, v)}
                        <span aria-hidden="true" className={cx("h-1 w-full max-w-[86px] overflow-hidden rounded-full bg-(--tmp-tint)", !active && "invisible")}>
                          <span
                            style={{ width: `${Math.max(2, Math.min(100, p * 100)).toFixed(1)}%` }}
                            className="block h-full rounded-[inherit] bg-(--tmp-purple) transition-[width] duration-450 ease-out-soft motion-reduce:transition-none"
                          />
                        </span>
                      </span>
                    );
                  })}
                  <svg
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    className={cx(
                      "size-4 justify-self-end [transition:transform_.3s_cubic-bezier(.2,.7,.2,1),color_.2s] motion-reduce:transition-none",
                      isOpen ? "rotate-180 text-(--tmp-purple)" : "text-(--tmp-faint)"
                    )}
                  >
                    <path d="m4 6 4 4 4-4" />
                  </svg>
                </button>
                {isOpen && detail(r, detId)}
              </li>
            );
          })}
        </ol>

        <p className="m-0 flex flex-wrap justify-between gap-x-4 gap-y-1.5 border-t border-dashed border-(--tmp-line) pt-3 text-xs text-(--tmp-faint)">
          <span>{metric === "response" ? L.footResponse : (footnote ?? "")}</span>
          {info.compare && <span>{fill(L.rankChange, { compare: info.compare })}</span>}
        </p>
        <p className="sr-only" aria-live="polite">
          {sr}
        </p>
      </article>
    </div>
  );
}

export default TeamPerformance;
