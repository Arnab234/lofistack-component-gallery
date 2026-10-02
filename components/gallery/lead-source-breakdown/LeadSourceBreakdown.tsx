"use client";

import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
  type Ref,
} from "react";
import { cx } from "@/lib/format";

export type LeadSourceMetric = "leads" | "revenue" | "cpl";

export interface LeadSource {
  /** Unique key. */
  id: string;
  label: string;
  leads: number;
  revenue: number;
  spend: number;
  /** Start with this source hidden. */
  hidden?: boolean;
}

export interface LeadSourceLabels {
  metricGroup: string;
  leads: string;
  revenue: string;
  cpl: string;
  colSource: string;
  colShare: string;
  colShareSpend: string;
  totalLeads: string;
  totalRevenue: string;
  blended: string;
  ofSources: string;
  total: string;
  visible: string;
  shareOf: string;
  spendWord: string;
  leadsWord: string;
  revenueWord: string;
  ringLeads: string;
  ringRevenue: string;
  ringCpl: string;
  insTop: string;
  insRpl: string;
  insCheap: string;
  insPricey: string;
  perLead: string;
  hiddenN: string;
  showAll: string;
  keepOne: string;
  hidden: string;
  shown: string;
  other: string;
  chart: string;
  hint: string;
}

export interface SourceToggleDetail {
  id: string;
  label: string;
  visible: boolean;
  visibleIds: string[];
}

/** Methods available through `ref`. */
export interface LeadSourceBreakdownHandle {
  /** Hide or show a source (flips it when `visible` is left out). Returns false if it would hide the last one. */
  toggleSource: (id: string, visible?: boolean) => boolean;
  /** Show every hidden source. */
  showAll: () => void;
  /** Sweep the ring in again. */
  replay: () => void;
  readonly visibleSources: string[];
}

export interface LeadSourceBreakdownProps {
  /** Up to six sources; any more are folded into "Other". Colour follows the source, not its rank. */
  sources: LeadSource[];
  /** Measure to show. Pass it to control the switch. */
  metric?: LeadSourceMetric;
  /** Starting measure when `metric` is not controlled. */
  defaultMetric?: LeadSourceMetric;
  eyebrow?: string;
  title?: string;
  period?: string;
  /** Footer note, e.g. where the data comes from. */
  sourceNote?: string;
  currency?: string;
  locale?: string;
  /** Override any built-in text, e.g. { leads: "Enquiries" }. */
  labels?: Partial<LeadSourceLabels>;
  onMetricChange?: (metric: LeadSourceMetric) => void;
  onSourceToggle?: (detail: SourceToggleDetail) => void;
  ref?: Ref<LeadSourceBreakdownHandle>;
  className?: string;
}

export const LEAD_SOURCE_LABELS: LeadSourceLabels = {
  metricGroup: "Measure",
  leads: "Leads",
  revenue: "Revenue",
  cpl: "Cost per lead",
  colSource: "Source",
  colShare: "Share",
  colShareSpend: "Share of spend",
  totalLeads: "total leads",
  totalRevenue: "total revenue",
  blended: "blended cost per lead",
  ofSources: "{n} of {total} sources",
  total: "Total",
  visible: "Visible total",
  shareOf: "{pct} of {what}",
  spendWord: "spend",
  leadsWord: "leads",
  revenueWord: "revenue",
  ringLeads: "Ring: share of leads",
  ringRevenue: "Ring: share of revenue",
  ringCpl: "Ring: share of spend",
  insTop: "Largest share",
  insRpl: "Most revenue per lead",
  insCheap: "Cheapest leads",
  insPricey: "Priciest leads",
  perLead: "{v} per lead",
  hiddenN: "{n} hidden",
  showAll: "Show all",
  keepOne: "At least one source stays visible.",
  hidden: "{name} hidden",
  shown: "{name} shown",
  other: "Other",
  chart: "Share by source. Use the arrow keys to move between segments.",
  hint: "Select a source to hide or show it",
};

const METRICS: LeadSourceMetric[] = ["leads", "revenue", "cpl"];
const SLOTS = 6;
const TONE = ["[--c:var(--lsb-c1)]", "[--c:var(--lsb-c2)]", "[--c:var(--lsb-c3)]", "[--c:var(--lsb-c4)]", "[--c:var(--lsb-c5)]", "[--c:var(--lsb-c6)]"];
const SIZE = 260;
const CX = 130;
const CY = 130;
const R_OUT = 122;
const R_IN = 84;
const GAP = 2.5;
const START = -Math.PI / 2;

const num = (v: unknown) => (v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? 0 : Math.max(0, Number(v)));
const fill = (s: string, vars: Record<string, string | number>) => String(s).replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ""));
const ease = (t: number) => 1 - Math.pow(1 - t, 3);
const reduceMotion = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/* annular sector with a constant-width gap on both edges */
const pt = (r: number, a: number) => [CX + r * Math.cos(a), CY + r * Math.sin(a)];
function arc(a0: number, a1: number): string {
  const span = a1 - a0;
  if (span <= 0.0005) return "";
  if (span >= Math.PI * 2 - 1e-6) {
    const o = R_OUT;
    const i = R_IN;
    return (
      `M${CX - o} ${CY}A${o} ${o} 0 1 1 ${CX + o} ${CY}A${o} ${o} 0 1 1 ${CX - o} ${CY}Z` +
      `M${CX - i} ${CY}A${i} ${i} 0 1 0 ${CX + i} ${CY}A${i} ${i} 0 1 0 ${CX - i} ${CY}Z`
    );
  }
  const go = GAP / 2 / R_OUT;
  const gi = GAP / 2 / R_IN;
  if (span <= gi * 2 + 0.002) return "";
  const large = span - go * 2 > Math.PI ? 1 : 0;
  const [x0, y0] = pt(R_OUT, a0 + go);
  const [x1, y1] = pt(R_OUT, a1 - go);
  const [x2, y2] = pt(R_IN, a1 - gi);
  const [x3, y3] = pt(R_IN, a0 + gi);
  const f = (n: number) => n.toFixed(2);
  return `M${f(x0)} ${f(y0)}A${R_OUT} ${R_OUT} 0 ${large} 1 ${f(x1)} ${f(y1)}L${f(x2)} ${f(y2)}A${R_IN} ${R_IN} 0 ${large} 0 ${f(x3)} ${f(y3)}Z`;
}

/* largest-remainder rounding so the shown shares add up to exactly 100.0 */
function shares(values: number[]): number[] {
  const total = values.reduce((a, v) => a + v, 0);
  if (!(total > 0)) return values.map(() => 0);
  const raw = values.map((v) => (v / total) * 1000);
  const base = raw.map(Math.floor);
  let left = 1000 - base.reduce((a, v) => a + v, 0);
  raw
    .map((v, i) => [v - base[i], i] as const)
    .sort((a, b) => b[0] - a[0])
    .forEach(([, i]) => {
      if (left > 0 && values[i] > 0) {
        base[i]++;
        left--;
      }
    });
  return base.map((v) => v / 10);
}

interface Item {
  id: string;
  label: string;
  leads: number;
  revenue: number;
  spend: number;
  hidden: boolean;
  tone: string;
  color: string;
}

type Angles = Record<string, [number, number]>;

function normalise(sources: LeadSource[], otherLabel: string): Item[] {
  let items = (Array.isArray(sources) ? sources : []).filter(Boolean).map((s, i) => ({
    id: String(s.id || s.label || `source-${i + 1}`),
    label: s.label || `Source ${i + 1}`,
    leads: num(s.leads),
    revenue: num(s.revenue),
    spend: num(s.spend),
    hidden: !!s.hidden,
  }));
  if (items.length > SLOTS) {
    const keep = items.slice(0, SLOTS - 1);
    const rest = items.slice(SLOTS - 1);
    keep.push({
      id: "other",
      label: otherLabel,
      leads: rest.reduce((a, s) => a + s.leads, 0),
      revenue: rest.reduce((a, s) => a + s.revenue, 0),
      spend: rest.reduce((a, s) => a + s.spend, 0),
      hidden: false,
    });
    items = keep;
  }
  return items.map((s, i) => ({ ...s, tone: TONE[i], color: `var(--lsb-c${i + 1})` }));
}

const CheckIcon = () => (
  <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="absolute inset-px size-3">
    <path d="M2.6 6.2 5 8.5 9.4 3.7" />
  </svg>
);

const mono = "font-(family-name:--lsb-mono) font-semibold uppercase";

/**
 * A donut and legend table showing where leads come from, by leads, revenue or cost
 * per lead. Hide a source and the other shares add back up to 100%.
 */
export function LeadSourceBreakdown({
  sources,
  metric: metricProp,
  defaultMetric = "leads",
  eyebrow,
  title,
  period,
  sourceNote,
  currency = "USD",
  locale = "en-US",
  labels,
  onMetricChange,
  onSourceToggle,
  ref,
  className,
}: LeadSourceBreakdownProps) {
  const L = useMemo(() => ({ ...LEAD_SOURCE_LABELS, ...labels }), [labels]);
  const items = useMemo(() => normalise(sources, L.other), [sources, L.other]);

  /* ---------- state ---------- */
  const [innerMetric, setInnerMetric] = useState<LeadSourceMetric>(defaultMetric);
  const m: LeadSourceMetric = METRICS.includes((metricProp ?? innerMetric) as LeadSourceMetric) ? (metricProp ?? innerMetric) : "leads";
  const [off, setOff] = useState<Set<string>>(() => {
    const s = new Set(items.filter((x) => x.hidden).map((x) => x.id));
    if (s.size >= items.length && items.length) s.delete(items[0].id);
    return s;
  });
  const [prevItems, setPrevItems] = useState(items);
  if (prevItems !== items) {
    setPrevItems(items);
    const ids = new Set(items.map((s) => s.id));
    const next = new Set([...off].filter((id) => ids.has(id)));
    if (next.size >= items.length && items.length) next.delete(items[0].id);
    setOff(next);
  }
  const [active, setActiveState] = useState<string | null>(null);
  const [tabId, setTabId] = useState<string | null>(null);
  const [live, setLive] = useState("");
  const svgRef = useRef<SVGSVGElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const segRefs = useRef(new Map<string, SVGPathElement>());
  const toggleRefs = useRef(new Map<string, HTMLButtonElement>());

  /* ---------- formatting ---------- */
  const money = (v: number, opts?: Intl.NumberFormatOptions) => {
    try {
      return new Intl.NumberFormat(locale, { style: "currency", currency: currency.toUpperCase(), maximumFractionDigits: 0, ...opts }).format(v);
    } catch {
      return `$${Math.round(v).toLocaleString("en-US")}`;
    }
  };
  const fmt = (metric: LeadSourceMetric, v: number | null, compact?: boolean) => {
    if (metric === "leads") return Math.round(v ?? 0).toLocaleString(locale);
    if (metric === "cpl") return v == null ? "—" : money(v, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return compact && (v ?? 0) >= 100000 ? money(v ?? 0, { notation: "compact", minimumFractionDigits: 0, maximumFractionDigits: 1 }) : money(v ?? 0);
  };
  const pct = (p: number) => `${p.toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

  /* ---------- computed ---------- */
  const vis = items.filter((s) => !off.has(s.id));
  const ringKey = m === "cpl" ? "spend" : m;
  const ringVals = items.map((s) => (off.has(s.id) ? 0 : s[ringKey]));
  const sh = shares(ringVals);
  const totLeads = vis.reduce((a, s) => a + s.leads, 0);
  const totRev = vis.reduce((a, s) => a + s.revenue, 0);
  const totSpend = vis.reduce((a, s) => a + s.spend, 0);
  const ringTotal = ringVals.reduce((a, v) => a + v, 0);
  const rows = items.map((s, i) => ({
    s,
    share: sh[i],
    ring: ringVals[i],
    off: off.has(s.id),
    value: m === "leads" ? s.leads : m === "revenue" ? s.revenue : s.leads > 0 ? s.spend / s.leads : null,
  }));
  const total = m === "leads" ? totLeads : m === "revenue" ? totRev : totLeads > 0 ? totSpend / totLeads : null;
  const what = m === "cpl" ? L.spendWord : m === "revenue" ? L.revenueWord : L.leadsWord;

  const targets = useMemo<Angles>(() => {
    const t: Angles = {};
    let a = START;
    rows.forEach((r) => {
      const span = ringTotal > 0 ? (r.ring / ringTotal) * Math.PI * 2 : 0;
      t[r.s.id] = [a, a + span];
      a += span;
    });
    return t;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(ringVals), items]);

  /* ---------- ring tween ---------- */
  const [angles, setAngles] = useState<Angles>(targets);
  const anglesRef = useRef<Angles>(targets);
  const raf = useRef(0);
  const tween = useCallback((to: Angles, animate: boolean) => {
    cancelAnimationFrame(raf.current);
    const ids = Object.keys(to);
    const from: Angles = {};
    ids.forEach((id) => (from[id] = anglesRef.current[id] ?? [to[id][0], to[id][0]]));
    const paint = (k: number) => {
      const next: Angles = {};
      ids.forEach((id) => {
        const f = from[id];
        const t = to[id];
        next[id] = [f[0] + (t[0] - f[0]) * k, f[1] + (t[1] - f[1]) * k];
      });
      anglesRef.current = next;
      setAngles(next);
    };
    if (!animate || reduceMotion()) return paint(1);
    const t0 = performance.now();
    const dur = 520;
    const step = (now: number) => {
      const k = ease(Math.min(1, (now - t0) / dur));
      paint(k);
      if (k < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  }, []);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  /* reveal: start collapsed, sweep in when first seen */
  const revealed = useRef(false);
  const targetsRef = useRef(targets);
  targetsRef.current = targets;
  useLayoutEffect(() => {
    if (reduceMotion()) {
      revealed.current = true;
      return;
    }
    const collapsed: Angles = {};
    Object.keys(targetsRef.current).forEach((k) => (collapsed[k] = [START, START]));
    anglesRef.current = collapsed;
    setAngles(collapsed);
    const go = () => {
      revealed.current = true;
      tween(targetsRef.current, true);
    };
    const el = svgRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      go();
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          go();
        }
      },
      { threshold: 0.25 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [tween]);

  const firstTargets = useRef(true);
  useEffect(() => {
    if (firstTargets.current) {
      firstTargets.current = false;
      return;
    }
    if (revealed.current) tween(targets, true);
  }, [targets, tween]);

  /* ---------- actions ---------- */
  const visibleIds = (set: Set<string>) => items.filter((s) => !set.has(s.id)).map((s) => s.id);
  const offRef = useRef(off);
  offRef.current = off;

  const toggleSource = (id: string, visible?: boolean): boolean => {
    const s = items.find((x) => x.id === id);
    if (!s) return false;
    const cur = offRef.current;
    const want = visible == null ? cur.has(id) : !!visible;
    if (want === !cur.has(id)) return true;
    if (!want && visibleIds(cur).length <= 1) {
      setLive(L.keepOne);
      return false;
    }
    const next = new Set(cur);
    if (want) next.delete(id);
    else next.add(id);
    offRef.current = next;
    setOff(next);
    if (!want && active === id) setActiveState(null);
    setLive(fill(want ? L.shown : L.hidden, { name: s.label }));
    onSourceToggle?.({ id, label: s.label, visible: want, visibleIds: visibleIds(next) });
    return true;
  };

  const showAll = () => {
    const was = [...offRef.current];
    if (!was.length) return;
    const next = new Set<string>();
    offRef.current = next;
    setOff(next);
    was.forEach((id) => {
      const s = items.find((x) => x.id === id);
      onSourceToggle?.({ id, label: s ? s.label : id, visible: true, visibleIds: visibleIds(next) });
    });
  };

  const replay = () => {
    if (reduceMotion()) return;
    anglesRef.current = {};
    tween(targetsRef.current, true);
  };

  const latest = useRef({ toggleSource, showAll, replay });
  latest.current = { toggleSource, showAll, replay };
  useImperativeHandle(
    ref,
    () => ({
      toggleSource: (id: string, v?: boolean) => latest.current.toggleSource(id, v),
      showAll: () => latest.current.showAll(),
      replay: () => latest.current.replay(),
      get visibleSources() {
        return items.filter((s) => !offRef.current.has(s.id)).map((s) => s.id);
      },
    }),
    [items]
  );

  const pickMetric = (next: LeadSourceMetric) => {
    if (next === m) return;
    setInnerMetric(next);
    onMetricChange?.(next);
  };

  /* ---------- hover / focus linking ---------- */
  const setActive = (id: string | null) => setActiveState(id && !off.has(id) ? id : null);
  const idFrom = (t: EventTarget | null) => {
    const n = (t as Element | null)?.closest?.("[data-id]");
    return n && rootRef.current?.contains(n) ? (n as HTMLElement).dataset.id ?? null : null;
  };
  const focusId = () => idFrom(document.activeElement);
  const onOver = (e: PointerEvent) => setActive(idFrom(e.target));
  const onLeave = () => setActive(focusId());
  const onFocusIn = (e: FocusEvent) => {
    const id = idFrom(e.target);
    if (id) setActive(id);
  };
  const onFocusOut = (e: FocusEvent) => {
    const rt = e.relatedTarget as Element | null;
    if (!rt || !rootRef.current?.contains(rt) || !rt.closest("[data-id]")) setActive(null);
  };

  const visIds = vis.map((s) => s.id);
  const rovingId = tabId && visIds.includes(tabId) ? tabId : (visIds[0] ?? null);
  const onSegKey = (e: KeyboardEvent<SVGGElement>) => {
    const cur = visIds.indexOf(idFrom(e.target) ?? "");
    if (cur < 0) return;
    let n: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") n = (cur + 1) % visIds.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") n = (cur - 1 + visIds.length) % visIds.length;
    else if (e.key === "Home") n = 0;
    else if (e.key === "End") n = visIds.length - 1;
    else if (e.key === "Escape") {
      setActiveState(null);
      return;
    }
    if (n == null) return;
    e.preventDefault();
    setTabId(visIds[n]);
    segRefs.current.get(visIds[n])?.focus();
  };

  const act = active && !off.has(active) ? rows.find((r) => r.s.id === active) : null;
  const hasActive = !!act;

  /* ---------- insights ---------- */
  type R = (typeof rows)[number];
  const visRows = rows.filter((r) => !r.off);
  const by = (f: (r: R) => number | null, dir: number) =>
    visRows.filter((r) => f(r) != null).reduce<R | null>((a, r) => (!a || (dir > 0 ? f(r)! > f(a)! : f(r)! < f(a)!) ? r : a), null);
  const insights: Array<{ label: string; r: R | null; value: string }> = [];
  if (m === "cpl") {
    const cheap = by((r) => r.value, -1);
    const pricey = by((r) => r.value, 1);
    insights.push({ label: L.insCheap, r: cheap, value: cheap ? fill(L.perLead, { v: fmt("cpl", cheap.value) }) : "" });
    insights.push({ label: L.insPricey, r: pricey, value: pricey ? fill(L.perLead, { v: fmt("cpl", pricey.value) }) : "" });
  } else {
    const top = by((r) => r.share, 1);
    insights.push({ label: L.insTop, r: top, value: top ? fill(L.shareOf, { pct: pct(top.share), what: m === "revenue" ? L.revenueWord : L.leadsWord }) : "" });
    const cheap = by((r) => (r.s.leads > 0 ? r.s.spend / r.s.leads : null), -1);
    insights.push({ label: L.insCheap, r: cheap, value: cheap ? fill(L.perLead, { v: fmt("cpl", cheap.s.spend / cheap.s.leads) }) : "" });
  }
  const rpl = by((r) => (r.s.leads > 0 ? r.s.revenue / r.s.leads : null), 1);
  insights.push({ label: L.insRpl, r: rpl, value: rpl ? fill(L.perLead, { v: money(rpl.s.revenue / rpl.s.leads) }) : "" });

  const hiddenCount = off.size;

  return (
    <div
      ref={rootRef}
      onFocus={onFocusIn}
      onBlur={onFocusOut}
      className={cx("@container block w-full max-w-[940px] font-(family-name:--lsb-sans) text-(--lsb-ink)", className)}
    >
      <article className="relative rounded-[20px] border border-(--lsb-line) bg-(--lsb-card) px-7 pt-[26px] pb-5 shadow-[0_28px_56px_-44px_var(--lsb-shadow),0_2px_6px_-4px_var(--lsb-shadow)] @max-[719px]:px-5 @max-[719px]:pt-[22px] @max-[719px]:pb-[18px] @max-[499px]:rounded-[18px] @max-[499px]:px-3.5 @max-[499px]:pt-5 @max-[499px]:pb-4">
        {/* header */}
        <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
          <div className="grid min-w-0 gap-1.5">
            <span className={cx(mono, "flex items-center gap-2 text-[11px] leading-none tracking-[0.1em] text-(--lsb-faint)")}>
              <span aria-hidden="true" className="inline-flex gap-[3px]">
                {[1, 2, 3].map((i) => (
                  <i key={i} className={cx("size-1.5 rounded-full bg-(--c)", TONE[i - 1])} />
                ))}
              </span>
              {eyebrow && <span>{eyebrow}</span>}
            </span>
            {title && <h2 className="m-0 font-(family-name:--lsb-display) text-[clamp(20px,3.2cqi,25px)] leading-[1.15] font-semibold tracking-[-0.018em] text-balance">{title}</h2>}
            {period && <p className="m-0 text-[13.5px] text-(--lsb-muted) tabular-nums">{period}</p>}
          </div>
          <div role="group" aria-label={L.metricGroup} className="inline-flex flex-none rounded-[11px] border border-(--lsb-line) bg-(--lsb-tint) p-[3px] @max-[499px]:w-full">
            {METRICS.map((k) => (
              <button
                key={k}
                type="button"
                aria-pressed={m === k}
                onClick={() => pickMetric(k)}
                className="cursor-pointer rounded-lg border-0 bg-transparent px-[13px] py-[9px] text-[13px] leading-none font-semibold text-(--lsb-muted) transition-[background-color,color,box-shadow] duration-[250ms] hover:text-(--lsb-ink) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--lsb-focus) aria-pressed:bg-(--lsb-strong) aria-pressed:text-(--lsb-strong-ink) aria-pressed:shadow-[0_6px_14px_-8px_var(--lsb-shadow)] motion-reduce:transition-none @max-[499px]:flex-1 @max-[499px]:px-1.5 @max-[499px]:text-[12.5px]"
              >
                {L[k]}
              </button>
            ))}
          </div>
        </header>

        {/* body */}
        <div className="mt-6 grid grid-cols-[300px_minmax(0,1fr)] items-center gap-8 @max-[719px]:grid-cols-[220px_minmax(0,1fr)] @max-[719px]:gap-[22px] @max-[499px]:grid-cols-1 @max-[499px]:gap-[18px]">
          <div className="relative grid justify-items-center gap-2.5">
            <div className="relative w-full max-w-[300px] @max-[719px]:max-w-[220px] @max-[499px]:max-w-[230px]">
              <svg ref={svgRef} viewBox={`0 0 ${SIZE} ${SIZE}`} role="group" aria-label={L.chart} className="block h-auto w-full overflow-visible focus:outline-none">
                <circle cx={CX} cy={CY} r={(R_OUT + R_IN) / 2} strokeWidth={R_OUT - R_IN} className="fill-none stroke-(--lsb-track)" />
                <g onPointerOver={onOver} onPointerLeave={onLeave} onKeyDown={onSegKey}>
                  {rows.map((r) => {
                    const a = angles[r.s.id];
                    const on = act?.s.id === r.s.id;
                    const t = targets[r.s.id];
                    const mid = t ? (t[0] + t[1]) / 2 : 0;
                    return (
                      <path
                        key={r.s.id}
                        ref={(el) => {
                          if (el) segRefs.current.set(r.s.id, el);
                          else segRefs.current.delete(r.s.id);
                        }}
                        data-id={r.s.id}
                        d={a ? arc(a[0], a[1]) : ""}
                        role="img"
                        tabIndex={!r.off && rovingId === r.s.id ? 0 : -1}
                        aria-label={`${r.s.label}: ${fmt(m, r.value)}${m === "cpl" ? " per lead" : ""}, ${fill(L.shareOf, { pct: pct(r.share), what })}`}
                        onClick={() => setActive(r.s.id)}
                        onFocus={() => setTabId(r.s.id)}
                        style={on ? { transform: `translate(${(Math.cos(mid) * 5).toFixed(2)}px, ${(Math.sin(mid) * 5).toFixed(2)}px)` } : undefined}
                        className={cx(
                          "origin-center cursor-pointer fill-(--c) outline-none transition-[opacity,transform,filter] duration-300 ease-out-soft [transform-box:view-box] focus-visible:stroke-(--lsb-focus) focus-visible:stroke-[2.5px] focus-visible:[paint-order:stroke] motion-reduce:transition-none",
                          r.s.tone,
                          r.off && "hidden",
                          hasActive && !on && "opacity-32",
                          on && "brightness-[1.03] saturate-[1.08]"
                        )}
                      />
                    );
                  })}
                </g>
              </svg>
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 grid place-items-center">
                <div className="grid max-w-[150px] justify-items-center gap-1 text-center @max-[719px]:max-w-[116px]">
                  <span className={cx(mono, "inline-flex items-center gap-1.5 text-[11px] leading-[1.2] tracking-[0.08em] text-(--lsb-faint)")}>
                    {act && <i className={cx("size-2 flex-none rounded-[2px] bg-(--c)", act.s.tone)} />}
                    <span>{act ? act.s.label : vis.length < items.length ? fill(L.ofSources, { n: vis.length, total: items.length }) : L[m]}</span>
                  </span>
                  <span className="font-(family-name:--lsb-display) text-[clamp(26px,4.4cqi,34px)] leading-none font-[650] tracking-[-0.025em] tabular-nums @max-[719px]:text-[25px]">
                    {act ? fmt(m, act.value, true) : fmt(m, total, true)}
                  </span>
                  <span className="text-[12.5px] leading-[1.3] text-(--lsb-muted) tabular-nums">
                    {act
                      ? m === "cpl"
                        ? `${fill(L.perLead, { v: "" }).trim()} · ${fill(L.shareOf, { pct: pct(act.share), what })}`
                        : fill(L.shareOf, { pct: pct(act.share), what })
                      : m === "leads"
                        ? L.totalLeads
                        : m === "revenue"
                          ? L.totalRevenue
                          : L.blended}
                  </span>
                </div>
              </div>
            </div>
            <p className="m-0 text-center text-xs text-(--lsb-faint)">{m === "leads" ? L.ringLeads : m === "revenue" ? L.ringRevenue : L.ringCpl}</p>
          </div>

          {/* legend table */}
          <div className="min-w-0">
            <table className="w-full border-collapse text-sm tabular-nums @max-[499px]:text-[13.5px]">
              <caption className="sr-only">{`${title || L.colSource}${period ? `, ${period}` : ""}. ${L.hint}.`}</caption>
              <thead>
                <tr className="[&>th]:border-b [&>th]:border-(--lsb-line) [&>th]:px-2.5 [&>th]:pb-2.5 [&>th]:text-right [&>th]:font-(family-name:--lsb-mono) [&>th]:text-[10.5px] [&>th]:leading-[1.2] [&>th]:font-semibold [&>th]:tracking-[0.08em] [&>th]:text-(--lsb-faint) [&>th]:uppercase @max-[499px]:[&>th]:px-1.5">
                  <th scope="col" className="pl-0! text-left!">
                    {L.colSource}
                  </th>
                  <th scope="col">{L[m]}</th>
                  <th scope="col" className="pr-0!">
                    {m === "cpl" ? L.colShareSpend : L.colShare}
                  </th>
                </tr>
              </thead>
              <tbody onPointerOver={onOver} onPointerLeave={onLeave}>
                {rows.map((r) => {
                  const on = act?.s.id === r.s.id;
                  const dim = hasActive && !on ? "[&>*]:opacity-55" : r.off ? "[&>*]:opacity-50" : "";
                  return (
                    <tr
                      key={r.s.id}
                      data-id={r.s.id}
                      className={cx(
                        "[&>*]:h-[46px] [&>*]:border-b [&>*]:border-(--lsb-line) [&>*]:px-2.5 [&>*]:text-right [&>*]:transition-[background-color,opacity] [&>*]:duration-300 motion-reduce:[&>*]:transition-none [&>:last-child]:pr-0 [&>th]:p-0 [&>th]:text-left [&>th]:font-[inherit] @max-[499px]:[&>td]:px-1.5",
                        r.s.tone,
                        on && "[&>*]:bg-[color-mix(in_oklab,var(--lsb-tint)_85%,transparent)] [&>th]:shadow-[inset_3px_0_0_var(--c)]",
                        dim
                      )}
                    >
                      <th scope="row">
                        <button
                          ref={(el) => {
                            if (el) toggleRefs.current.set(r.s.id, el);
                            else toggleRefs.current.delete(r.s.id);
                          }}
                          type="button"
                          aria-pressed={!r.off}
                          onClick={() => toggleSource(r.s.id)}
                          className="group/tg flex min-h-11 w-full cursor-pointer items-center gap-[11px] rounded-lg border-0 bg-transparent py-0 pr-0 pl-2.5 text-left text-sm leading-[1.25] font-semibold text-(--lsb-ink) focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--lsb-focus) @max-[499px]:gap-[9px] @max-[499px]:pl-1.5 @max-[499px]:text-[13.5px]"
                        >
                          <span className="relative size-3.5 flex-none rounded-[4px] bg-(--c) text-white shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)] transition-[background-color,box-shadow] duration-[250ms] group-aria-[pressed=false]/tg:bg-transparent group-aria-[pressed=false]/tg:shadow-[inset_0_0_0_1.5px_var(--c)] motion-reduce:transition-none [&>svg]:transition-opacity [&>svg]:duration-200 group-aria-[pressed=false]/tg:[&>svg]:opacity-0">
                            <CheckIcon />
                          </span>
                          <span className="min-w-0 [overflow-wrap:anywhere]">{r.s.label}</span>
                        </button>
                      </th>
                      <td>
                        <span className={cx("font-semibold whitespace-nowrap", r.off && "line-through decoration-(--lsb-faint)")}>{fmt(m, r.value)}</span>
                      </td>
                      <td className="w-[34%] @max-[719px]:w-auto">
                        <div className="flex items-center justify-end gap-2.5">
                          <span aria-hidden="true" className="h-1.5 max-w-[120px] flex-1 overflow-hidden rounded-[3px] bg-(--lsb-track) @max-[719px]:hidden">
                            <i
                              className="block h-full rounded-[3px] bg-(--c) transition-[width] duration-[450ms] ease-out-soft motion-reduce:transition-none"
                              style={{ width: `${r.off ? 0 : r.share}%` }}
                            />
                          </span>
                          <span className={cx("min-w-[46px] whitespace-nowrap text-(--lsb-muted)", r.off && "line-through decoration-(--lsb-faint)")}>{r.off ? "—" : pct(r.share)}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="[&>td]:border-0 [&>td]:px-2.5 [&>td]:pt-3 [&>td]:pb-0 [&>td]:text-right [&>td]:font-semibold">
                  <td className="pl-0! text-left! text-[13px] font-medium! text-(--lsb-muted)">
                    {hiddenCount ? L.visible : L.total}
                    {hiddenCount > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          showAll();
                          toggleRefs.current.get(items[0]?.id)?.focus();
                        }}
                        className="ml-2 cursor-pointer border-0 bg-transparent px-0 py-0.5 text-[13px] leading-none font-semibold text-(--lsb-focus) underline underline-offset-[3px] focus-visible:rounded-[3px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--lsb-focus)"
                      >
                        {fill(L.hiddenN, { n: hiddenCount })} · {L.showAll}
                      </button>
                    )}
                  </td>
                  <td>{fmt(m, total)}</td>
                  <td className="pr-0! font-medium! text-(--lsb-muted)">{vis.length ? "100.0%" : "—"}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* insights */}
        <dl className="m-0 mt-[22px] grid grid-cols-3 gap-x-5 gap-y-3 border-t border-dashed border-(--lsb-line) pt-4 @max-[719px]:grid-cols-2 @max-[499px]:grid-cols-1">
          {insights.map((ins, i) => (
            <div key={ins.label} className={cx("m-0 grid min-w-0 gap-[5px]", i === insights.length - 1 && "@max-[719px]:col-span-full @max-[499px]:col-auto")}>
              <dt className={cx(mono, "text-[10.5px] leading-[1.2] tracking-[0.08em] text-(--lsb-faint)")}>{ins.label}</dt>
              <dd className="m-0 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm font-semibold tabular-nums">
                {ins.r ? (
                  <>
                    <i aria-hidden="true" className={cx("size-[9px] flex-none self-center rounded-[2px] bg-(--c)", ins.r.s.tone)} />
                    {ins.r.s.label}
                  </>
                ) : (
                  "—"
                )}
                {ins.value && <span className="text-[13px] font-medium text-(--lsb-muted)">{ins.value}</span>}
              </dd>
            </div>
          ))}
        </dl>

        {sourceNote && (
          <footer className="mt-3.5 flex flex-wrap justify-between gap-x-4 gap-y-1.5 text-xs text-(--lsb-faint)">
            <span>{sourceNote}</span>
          </footer>
        )}
        <p className="sr-only" aria-live="polite">
          {live}
        </p>
      </article>
    </div>
  );
}

export default LeadSourceBreakdown;
