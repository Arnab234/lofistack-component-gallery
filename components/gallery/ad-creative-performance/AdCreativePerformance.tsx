"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { cx } from "@/lib/format";

export type CreativeFormat = "image" | "video" | "carousel";
export type CreativeSort = "ctr" | "cpa" | "spend" | "conversions";
export type CreativeFormatFilter = "all" | CreativeFormat;
export type CreativePattern = "sun" | "stripes" | "dots" | "arch" | "blocks" | "wave" | "type";

export interface CreativeArt {
  /** Abstract stand-in for the real thumbnail. */
  pattern?: CreativePattern;
  /** Swap paper and ink colours. */
  invert?: boolean;
  /** Text for the "type" pattern (up to 6 characters). */
  text?: string;
}

export interface AdCreative {
  /** Unique key. */
  id: string;
  name: string;
  format: CreativeFormat;
  /** Video length, e.g. "0:15". */
  duration?: string;
  /** Number of carousel slides. */
  slides?: number;
  /** Ad text, shown under the name. */
  copy?: string;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  art?: CreativeArt;
}

export interface CreativeMetrics {
  id: string;
  name: string;
  format: CreativeFormat;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  ctr: number | null;
  cpc: number | null;
  cvr: number | null;
  cpa: number | null;
}

export interface CreativeCompareDetail {
  ids: string[];
  creatives: CreativeMetrics[];
  /** Id of the creative that wins more metrics, or null when even / fewer than two. */
  winner: string | null;
  /** Metric wins per id, when two are picked. */
  wins: Record<string, number> | null;
}

export interface AdCreativePerformanceProps {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  /** Reporting period, shown as a pill. */
  period?: string;
  /** ISO currency code. */
  currency?: string;
  /** Number and money locale. */
  locale?: string;
  creatives?: AdCreative[];
  /** Footer note, e.g. how metrics are worked out. */
  source?: string;
  /** Controlled sort. */
  sort?: CreativeSort;
  defaultSort?: CreativeSort;
  /** Controlled format filter. */
  format?: CreativeFormatFilter;
  defaultFormat?: CreativeFormatFilter;
  /** Fires when the sort or format changes. */
  onSortChange?: (detail: { sort: CreativeSort; format: CreativeFormatFilter }) => void;
  /** Controlled comparison: up to two creative ids. */
  compare?: string[];
  defaultCompare?: string[];
  /** Fires when the comparison changes, with the picked creatives and the winner. */
  onCompare?: (detail: CreativeCompareDetail) => void;
  className?: string;
}

type Key = "ctr" | "cpa" | "sp" | "cv" | "cpc" | "cvr";
const SORTS: Record<CreativeSort, { key: Key; dir: number; label: string; crown: string }> = {
  ctr: { key: "ctr", dir: -1, label: "CTR", crown: "Best CTR" },
  cpa: { key: "cpa", dir: 1, label: "CPA", crown: "Lowest CPA" },
  spend: { key: "sp", dir: -1, label: "Spend", crown: "Top spend" },
  conversions: { key: "cv", dir: -1, label: "Conversions", crown: "Most conv." },
};
const FORMATS: CreativeFormatFilter[] = ["all", "image", "video", "carousel"];
const FORMAT_LABEL: Record<CreativeFormatFilter, string> = { all: "All", image: "Image", video: "Video", carousel: "Carousel" };
const KEY_LABEL: Record<"ctr" | "cpa" | "sp" | "cv", string> = { ctr: "CTR", cpa: "CPA", sp: "Spend", cv: "Conversions" };
const METRICS: { key: Key; label: string; better: number }[] = [
  { key: "ctr", label: "CTR", better: 1 },
  { key: "cpc", label: "Cost per click", better: -1 },
  { key: "cvr", label: "Conv. rate", better: 1 },
  { key: "cpa", label: "Cost per conversion", better: -1 },
  { key: "cv", label: "Conversions", better: 1 },
  { key: "sp", label: "Spend", better: 0 },
];

interface Item {
  id: string;
  raw: AdCreative;
  format: CreativeFormat;
  name: string;
  copy: string;
  imp: number;
  clk: number;
  sp: number;
  cv: number;
  ctr: number | null;
  cpc: number | null;
  cvr: number | null;
  cpa: number | null;
}

const n0 = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.max(0, v) : 0);

function prepare(creatives: AdCreative[]): Item[] {
  const seen = new Set<string>();
  return creatives.filter(Boolean).map((c, i) => {
    let id = String(c.id || `creative-${i + 1}`);
    while (seen.has(id)) id += `-${i}`;
    seen.add(id);
    const imp = n0(c.impressions), clk = n0(c.clicks), sp = n0(c.spend), cv = n0(c.conversions);
    const format: CreativeFormat = ["image", "video", "carousel"].includes(String(c.format)) ? c.format : "image";
    return {
      id,
      raw: c,
      format,
      name: c.name || `Creative ${i + 1}`,
      copy: c.copy || "",
      imp,
      clk,
      sp,
      cv,
      ctr: imp > 0 ? clk / imp : null,
      cpc: clk > 0 ? sp / clk : null,
      cvr: clk > 0 ? cv / clk : null,
      cpa: cv > 0 ? sp / cv : null,
    };
  });
}

function rank(items: Item[], sort: CreativeSort, format: CreativeFormatFilter): Item[] {
  const cfg = SORTS[sort];
  return items
    .filter((c) => format === "all" || c.format === format)
    .sort((a, b) => {
      const x = a[cfg.key], y = b[cfg.key];
      if (x == null && y == null) return a.name.localeCompare(b.name);
      if (x == null) return 1;
      if (y == null) return -1;
      return (x - y) * cfg.dir || a.name.localeCompare(b.name);
    });
}

/** Ids of the visible creatives in ranked order, e.g. to compare the top two. */
export function rankCreatives(creatives: AdCreative[], sort: CreativeSort = "ctr", format: CreativeFormatFilter = "all"): string[] {
  return rank(prepare(creatives), sort, format).map((c) => c.id);
}

function score(a: Item, b: Item) {
  const wins: Record<string, number> = { [a.id]: 0, [b.id]: 0 };
  const per: Partial<Record<Key, string | null>> = {};
  let total = 0;
  METRICS.forEach((m) => {
    if (!m.better) return;
    const x = a[m.key], y = b[m.key];
    if (x == null || y == null) return;
    total++;
    if (x === y) {
      per[m.key] = null;
      return;
    }
    const w = (x - y) * m.better > 0 ? a.id : b.id;
    per[m.key] = w;
    wins[w]++;
  });
  const winner = wins[a.id] === wins[b.id] ? null : wins[a.id] > wins[b.id] ? a.id : b.id;
  return { wins, per, total, winner };
}

const toMetrics = (c: Item): CreativeMetrics => ({
  id: c.id,
  name: c.name,
  format: c.format,
  impressions: c.imp,
  clicks: c.clk,
  spend: c.sp,
  conversions: c.cv,
  ctr: c.ctr,
  cpc: c.cpc,
  cvr: c.cvr,
  cpa: c.cpa,
});

const reduceMotion = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/* ---------- artwork ---------- */
/** Deterministic pseudo-random numbers from a string, so artwork is stable per creative. */
function seeded(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const P = "fill-(--acp-a-paper)";
const I = "fill-(--acp-a-ink)";
const LIME = "fill-(--acp-lime)";
const IS = "fill-none stroke-(--acp-a-ink)";
const LS = "fill-none stroke-(--acp-lime)";

function Pattern({ id, art }: { id: string; art: CreativeArt }) {
  const r = seeded(id + (art.pattern || ""));
  const out: ReactNode[] = [];
  switch (art.pattern) {
    case "sun": {
      const cx0 = 60 + r() * 80;
      out.push(<circle key="s" cx={cx0} cy={84} r={38} className={LIME} />);
      out.push(<rect key="p" x={0} y={84} width={200} height={70} className={P} />);
      for (let i = 0; i < 7; i++) out.push(<rect key={i} x={0} y={88 + i * 9} width={200} height={3.5 + i * 0.5} className={I} />);
      break;
    }
    case "stripes": {
      const off = r() * 20;
      for (let i = -6; i < 14; i++) out.push(<rect key={i} x={i * 24 + off} y={-60} width={10} height={280} className={I} transform="rotate(28 100 75)" />);
      out.push(<circle key="a" cx={150} cy={46} r={30} className={LIME} />);
      out.push(<circle key="b" cx={150} cy={46} r={30} className={IS} strokeWidth={4} />);
      break;
    }
    case "dots": {
      const lx = Math.floor(r() * 9) + 1, ly = Math.floor(r() * 6) + 1;
      for (let y = 0; y < 8; y++)
        for (let x = 0; x < 11; x++) {
          const t = (x / 10 + y / 7) / 2;
          const hit = x === lx && y === ly;
          out.push(<circle key={`${x}-${y}`} cx={10 + x * 18} cy={12 + y * 18} r={(hit ? 9 : 1.2 + t * 6.4).toFixed(2)} className={hit ? LIME : I} />);
        }
      break;
    }
    case "arch": {
      const cx0 = 70 + r() * 60;
      [128, 106, 84, 62].forEach((rad) => out.push(<circle key={rad} cx={cx0} cy={160} r={rad} className={IS} strokeWidth={7} />));
      out.push(<circle key="l" cx={cx0} cy={160} r={40} className={LIME} />);
      break;
    }
    case "wave": {
      const ph = r() * 6;
      for (let i = 0; i < 8; i++) {
        let d = "";
        for (let x = -10; x <= 210; x += 10) {
          const y = 22 + i * 16 + Math.sin(x / 26 + ph + i * 0.5) * 9;
          d += `${x === -10 ? "M" : "L"}${x} ${y.toFixed(1)} `;
        }
        out.push(<path key={i} d={d} className={i === 4 ? LS : IS} strokeWidth={i === 4 ? 6 : 3} strokeLinecap="round" />);
      }
      break;
    }
    case "type": {
      out.push(
        <text key="t" x={12} y={108} fontSize={82} className={cx(I, "font-(family-name:--acp-num) font-bold tracking-[-2px]")}>
          {String(art.text || "NEW").slice(0, 6)}
        </text>
      );
      out.push(<rect key="r" x={14} y={120} width={60 + r() * 50} height={9} className={LIME} />);
      out.push(<circle key="c" cx={178} cy={24} r={8} className={LIME} />);
      break;
    }
    default: {
      const w = 80 + r() * 30, h = 60 + r() * 20;
      out.push(<rect key="1" x={0} y={0} width={w} height={h} className={I} />);
      out.push(<rect key="2" x={w + 8} y={h + 8} width={200 - w - 8} height={150 - h - 8} className={LIME} />);
      out.push(<rect key="3" x={12} y={h + 20} width={w - 24} height={150 - h - 34} className={IS} strokeWidth={4} />);
      out.push(<rect key="4" x={w + 22} y={14} width={200 - w - 36} height={h - 28} className={IS} strokeWidth={4} />);
      out.push(<rect key="5" x={w} y={0} width={8} height={150} className={I} />);
      out.push(<rect key="6" x={0} y={h} width={200} height={8} className={I} />);
    }
  }
  return <g>{out}</g>;
}

function Art({ item, small, className, children }: { item: Item; small?: boolean; className?: string; children?: ReactNode }) {
  const art = item.raw.art || {};
  const dots = Math.min(8, Math.max(2, item.raw.slides || 3));
  return (
    <div
      className={cx(
        "relative overflow-hidden bg-(--acp-a-paper)",
        art.invert ? "[--acp-a-ink:var(--acp-art-paper)] [--acp-a-paper:var(--acp-art-ink)]" : "[--acp-a-ink:var(--acp-art-ink)] [--acp-a-paper:var(--acp-art-paper)]",
        className
      )}
    >
      <svg
        viewBox="0 0 200 150"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
        focusable="false"
        className={cx("absolute inset-0 block size-full", !small && "transition-transform duration-600 ease-out-soft group-hover/tile:scale-[1.035] motion-reduce:transition-none motion-reduce:group-hover/tile:scale-100")}
      >
        <rect x={0} y={0} width={200} height={150} className={P} />
        <Pattern id={item.id} art={art} />
      </svg>
      {!small && item.format === "video" && (
        <span className="pointer-events-none absolute top-[44%] left-1/2 -mt-[19px] -ml-[19px] grid size-[38px] place-items-center rounded-full bg-[rgba(11,11,10,.72)] text-white transition-transform duration-300 ease-out-soft group-hover/tile:scale-[1.08] motion-reduce:transition-none motion-reduce:group-hover/tile:scale-100 @max-[480px]:-mt-[15px] @max-[480px]:-ml-[15px] @max-[480px]:size-[30px]">
          <svg viewBox="0 0 12 12" fill="currentColor" aria-hidden="true" className="ml-0.5 size-3.5">
            <path d="M3 1.6v8.8L10.4 6z" />
          </svg>
        </span>
      )}
      {!small && item.format === "carousel" && (
        <span className="pointer-events-none absolute inset-x-0 bottom-[42px] flex justify-center gap-1 @max-[480px]:bottom-[34px]">
          {Array.from({ length: dots }, (_, i) => (
            <i
              key={i}
              className={cx(
                "h-[5px] rounded-full shadow-[0_0_0_1px_rgba(11,11,10,.35)]",
                i === 0 ? "w-3 rounded-[3px] bg-white" : "w-[5px] bg-[rgba(255,255,255,.55)]"
              )}
            />
          ))}
        </span>
      )}
      {children}
    </div>
  );
}

const FormatIcon = ({ format, className }: { format: CreativeFormat; className?: string }) =>
  format === "video" ? (
    <svg viewBox="0 0 12 12" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M3 2.2v7.6L9.6 6z" />
    </svg>
  ) : format === "carousel" ? (
    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true" className={className}>
      <rect x="3" y="2" width="6" height="8" rx="1" />
      <path d="M1 3.5v5M11 3.5v5" />
    </svg>
  ) : (
    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true" className={className}>
      <rect x="1.5" y="2" width="9" height="8" rx="1" />
      <path d="m2 9 3-3 2 2 1.5-1.5L10 8" />
    </svg>
  );

/** Tweens a number to its new value after the first render. */
function Tween({ value, format, animate }: { value: number | null; format: (v: number | null) => string; animate: boolean }) {
  const [shown, setShown] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    const from = prev.current;
    prev.current = value;
    if (!animate || reduceMotion() || document.hidden || from == null || value == null || from === value) {
      setShown(value);
      return;
    }
    const t0 = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / 420), e = 1 - Math.pow(1 - p, 3);
      setShown(p < 1 ? from + (value - from) * e : value);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, animate]);
  return <>{format(shown)}</>;
}

const mono = "font-(family-name:--acp-mono) uppercase";
const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--acp-accent)";

/**
 * Every ad creative in a campaign with its format and results: sort by CTR,
 * cost per conversion, spend or conversions, filter by format, and compare two head to head.
 */
export function AdCreativePerformance({
  eyebrow,
  title,
  subtitle,
  period,
  currency = "USD",
  locale = "en-US",
  creatives = [],
  source,
  sort: sortProp,
  defaultSort = "ctr",
  format: formatProp,
  defaultFormat = "all",
  onSortChange,
  compare: compareProp,
  defaultCompare = [],
  onCompare,
  className,
}: AdCreativePerformanceProps) {
  const [sortState, setSortState] = useState<CreativeSort>(defaultSort);
  const [formatState, setFormatState] = useState<CreativeFormatFilter>(defaultFormat);
  const [selState, setSelState] = useState<string[]>(defaultCompare.slice(0, 2));
  const [announce, setAnnounce] = useState("");
  const [interacted, setInteracted] = useState(false);
  const sort: CreativeSort = sortProp && SORTS[sortProp] ? sortProp : SORTS[sortState] ? sortState : "ctr";
  const format: CreativeFormatFilter = formatProp && FORMATS.includes(formatProp) ? formatProp : formatState;

  const items = useMemo(() => prepare(creatives), [creatives]);
  const known = useMemo(() => new Set(items.map((c) => c.id)), [items]);
  const sel = (compareProp ?? selState).filter((id) => known.has(id)).slice(0, 2);
  const cfg = SORTS[sort];
  const ordered = useMemo(() => rank(items, sort, format), [items, sort, format]);
  const best = ordered.length && ordered[0][cfg.key] != null ? ordered[0].id : null;
  const keyName = KEY_LABEL[cfg.key as "ctr" | "cpa" | "sp" | "cv"];

  /* ---------- formatting ---------- */
  const cur = currency.toUpperCase();
  const money = (v: number | null, digits: number) => {
    if (v == null) return "—";
    try {
      return new Intl.NumberFormat(locale, { style: "currency", currency: cur, minimumFractionDigits: digits, maximumFractionDigits: digits }).format(v);
    } catch {
      return `${cur} ${v.toFixed(digits)}`;
    }
  };
  const int = (v: number | null) => (v == null ? "—" : Math.round(v).toLocaleString(locale));
  const pct = (v: number | null) => (v == null ? "—" : `${(v * 100).toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`);
  const fmt = (key: Key, v: number | null) => (key === "ctr" || key === "cvr" ? pct(v) : key === "cpa" || key === "cpc" ? money(v, 2) : key === "sp" ? money(v, 0) : int(v));

  /* ---------- FLIP reflow ---------- */
  const tileRefs = useRef(new Map<string, HTMLLIElement>());
  const snapshot = useRef<Map<string, DOMRect> | null>(null);
  const takeSnapshot = () => {
    if (reduceMotion() || typeof Element === "undefined" || !("animate" in Element.prototype)) return;
    const m = new Map<string, DOMRect>();
    tileRefs.current.forEach((el, id) => m.set(id, el.getBoundingClientRect()));
    snapshot.current = m;
  };
  useLayoutEffect(() => {
    const before = snapshot.current;
    snapshot.current = null;
    if (!before) return;
    ordered.forEach((c, i) => {
      const el = tileRefs.current.get(c.id);
      if (!el) return;
      const a = before.get(c.id);
      const b = el.getBoundingClientRect();
      if (!a) {
        el.animate([{ opacity: 0, transform: "scale(.94)" }, { opacity: 1, transform: "none" }], {
          duration: 320,
          delay: 60 + i * 25,
          easing: "cubic-bezier(.2,.7,.2,1)",
          fill: "backwards",
        });
        return;
      }
      const dx = a.left - b.left, dy = a.top - b.top;
      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
        el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }], { duration: 440, easing: "cubic-bezier(.2,.7,.2,1)" });
      }
    });
  }, [ordered]);

  /* ---------- actions ---------- */
  const arrange = (next: { sort?: CreativeSort; format?: CreativeFormatFilter }) => {
    const s = next.sort ?? sort, f = next.format ?? format;
    if (s === sort && f === format) return;
    takeSnapshot();
    setInteracted(true);
    if (next.sort && sortProp == null) setSortState(next.sort);
    if (next.format && formatProp == null) setFormatState(next.format);
    const count = rank(items, s, f).length;
    setAnnounce(`Sorted by ${KEY_LABEL[SORTS[s].key as "ctr" | "cpa" | "sp" | "cv"]}. Showing ${count} creatives.`);
    onSortChange?.({ sort: s, format: f });
  };

  const setSel = (next: string[]) => {
    if (compareProp == null) setSelState(next);
    const picked = next.map((id) => items.find((c) => c.id === id)).filter((c): c is Item => !!c);
    const result = picked.length === 2 ? score(picked[0], picked[1]) : null;
    if (result) {
      const [a, b] = picked;
      setAnnounce(
        result.winner
          ? `${result.winner === a.id ? a.name : b.name} wins ${result.wins[result.winner]} of ${result.total} metrics`
          : `Even: each wins ${result.wins[a.id]} of ${result.total} metrics`
      );
    }
    onCompare?.({ ids: next.slice(), creatives: picked.map(toMetrics), winner: result?.winner ?? null, wins: result?.wins ?? null });
  };

  const toggle = (id: string) => {
    const i = sel.indexOf(id);
    if (i >= 0) setSel(sel.filter((x) => x !== id));
    else if (sel.length >= 2) setAnnounce("Two creatives are already picked. Remove one to add another.");
    else setSel([...sel, id]);
  };

  const gridRef = useRef<HTMLOListElement>(null);
  const clear = () => {
    setSel([]);
    requestAnimationFrame(() => gridRef.current?.querySelector<HTMLButtonElement>("[data-acp-cmp]")?.focus());
  };

  /* ---------- summary ---------- */
  const visibleItems = items.filter((c) => format === "all" || c.format === format);
  const tot = visibleItems.reduce((a, c) => ({ imp: a.imp + c.imp, clk: a.clk + c.clk, sp: a.sp + c.sp, cv: a.cv + c.cv }), { imp: 0, clk: 0, sp: 0, cv: 0 });
  const kpis = [
    { k: "spend", label: "Spend", v: tot.sp as number | null, f: (v: number | null) => money(v, 0) },
    { k: "conv", label: "Conversions", v: tot.cv as number | null, f: int },
    { k: "cpa", label: "Blended CPA", v: tot.cv > 0 ? tot.sp / tot.cv : null, f: (v: number | null) => money(v, 2) },
    { k: "ctr", label: "Avg. CTR", v: tot.imp > 0 ? tot.clk / tot.imp : null, f: pct },
  ];

  const picked = sel.map((id) => items.find((c) => c.id === id)).filter((c): c is Item => !!c);
  const result = picked.length === 2 ? score(picked[0], picked[1]) : null;
  const open = picked.length > 0;
  // remember the last pair so the drawer can animate closed with content
  const lastPicked = useRef<Item[]>([]);
  if (open) lastPicked.current = picked;
  const shownPicked = open ? picked : lastPicked.current;
  const shownResult = open ? result : shownPicked.length === 2 ? score(shownPicked[0], shownPicked[1]) : null;

  return (
    <div className={cx("@container block w-full max-w-[980px] font-(family-name:--acp-sans) text-(--acp-ink)", className)}>
      <article className="relative rounded-[4px] border border-t-4 border-(--acp-line) border-t-(--acp-rule) bg-(--acp-card) px-[26px] pt-6 pb-5 shadow-[0_30px_60px_-48px_var(--acp-shadow)] @max-[820px]:px-5 @max-[820px]:pt-[22px] @max-[820px]:pb-[18px] @max-[480px]:px-3.5 @max-[480px]:pt-[18px] @max-[480px]:pb-3.5">
        {/* masthead */}
        <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-(--acp-rule) pb-4 @max-[480px]:pb-3.5">
          <div className="grid min-w-0 gap-1.5">
            {eyebrow && <span className={cx(mono, "text-[10.5px] leading-none font-semibold tracking-[.14em] text-(--acp-accent)")}>{eyebrow}</span>}
            {title && (
              <h2 className="m-0 font-(family-name:--acp-num) text-[clamp(26px,4.6cqi,40px)] leading-[.95] font-bold tracking-[-0.01em] text-balance uppercase">{title}</h2>
            )}
            {subtitle && <p className="m-0 text-[13.5px] text-(--acp-muted)">{subtitle}</p>}
          </div>
          {period && (
            <span className="rounded-full border border-(--acp-line) px-2.5 py-[7px] font-(family-name:--acp-mono) text-[11.5px] leading-none font-medium tracking-[.04em] whitespace-nowrap text-(--acp-muted)">
              {period}
            </span>
          )}
        </header>

        {/* summary strip */}
        <dl className="m-0 grid grid-cols-4 border-b border-(--acp-line) @max-[820px]:grid-cols-2">
          {kpis.map((k, i) => (
            <div
              key={k.k}
              className={cx(
                "grid min-w-0 gap-1.5 py-3.5 pr-4",
                i > 0 && "border-l border-(--acp-line) pl-4",
                i === 2 && "@max-[820px]:border-l-0 @max-[820px]:pl-0",
                i < 2 && "@max-[820px]:border-b @max-[820px]:border-(--acp-line)",
                "@max-[480px]:py-3 @max-[480px]:pr-2.5",
                i > 0 && i !== 2 && "@max-[480px]:pl-2.5"
              )}
            >
              <dt className={cx(mono, "text-[10px] leading-none font-semibold tracking-[.12em] text-(--acp-faint)")}>{k.label}</dt>
              <dd className="m-0 font-(family-name:--acp-num) text-[clamp(22px,3.6cqi,30px)] leading-none font-semibold tracking-[-0.01em] [overflow-wrap:anywhere] tabular-nums">
                <Tween value={k.v} format={k.f} animate={interacted} />
              </dd>
            </div>
          ))}
        </dl>

        {/* toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-3 pt-3.5 pb-4 @max-[480px]:gap-2.5">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1 @max-[480px]:w-full">
            <span className={cx(mono, "text-[10px] leading-none font-semibold tracking-[.12em] text-(--acp-faint)")}>Sort</span>
            <div role="group" aria-label="Sort" className="flex flex-wrap gap-0.5">
              {(Object.keys(SORTS) as CreativeSort[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={k === sort}
                  onClick={() => arrange({ sort: k })}
                  className={cx(
                    "relative cursor-pointer rounded-[3px] border-0 bg-transparent px-[9px] pt-2 pb-[9px] text-[13px] leading-none font-semibold text-(--acp-muted) transition-colors duration-200 after:absolute after:inset-x-[9px] after:bottom-0.5 after:h-[3px] after:origin-left after:scale-x-0 after:bg-(--acp-lime) after:transition-transform after:duration-300 after:ease-out-soft after:content-[''] hover:text-(--acp-ink) aria-pressed:text-(--acp-ink) aria-pressed:after:scale-x-100 motion-reduce:transition-none motion-reduce:after:transition-none",
                    focusRing
                  )}
                >
                  {SORTS[k].label}
                  <span aria-hidden="true" className="ml-1 font-(family-name:--acp-mono) text-[10px] leading-none font-medium text-(--acp-faint)">
                    {SORTS[k].dir < 0 ? "↓" : "↑"}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1 @max-[480px]:w-full">
            <span className={cx(mono, "text-[10px] leading-none font-semibold tracking-[.12em] text-(--acp-faint)")}>Format</span>
            <div role="group" aria-label="Format" className="flex flex-wrap gap-0.5">
              {FORMATS.map((f) => {
                const n = f === "all" ? items.length : items.filter((c) => c.format === f).length;
                if (f !== "all" && n === 0) return null;
                return (
                  <button
                    key={f}
                    type="button"
                    aria-pressed={f === format}
                    onClick={() => arrange({ format: f })}
                    className={cx(
                      "group/chip inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-(--acp-line) bg-(--acp-card) px-2.5 py-[7px] text-[12.5px] leading-none font-semibold text-(--acp-muted) transition-[background-color,color,border-color] duration-200 hover:border-(--acp-ink) hover:text-(--acp-ink) aria-pressed:border-(--acp-ink) aria-pressed:bg-(--acp-ink) aria-pressed:text-(--acp-card) motion-reduce:transition-none",
                      focusRing
                    )}
                  >
                    {FORMAT_LABEL[f]}
                    <b className="font-(family-name:--acp-num) text-[11px] leading-none font-semibold text-(--acp-faint) tabular-nums group-aria-pressed/chip:text-(--acp-lime)">{n}</b>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* grid */}
        {ordered.length ? (
          <ol ref={gridRef} className="m-0 grid list-none grid-cols-4 gap-x-3.5 gap-y-[18px] p-0 @max-[820px]:grid-cols-3 @max-[620px]:grid-cols-2 @max-[480px]:grid-cols-1 @max-[480px]:gap-2.5">
            {ordered.map((c, i) => {
              const k = sel.indexOf(c.id);
              const isPicked = k >= 0;
              const limit = sel.length >= 2 && !isPicked;
              const ovText = fmt(cfg.key, c[cfg.key]);
              const extra = c.format === "video" ? c.raw.duration : c.format === "carousel" && c.raw.slides ? String(c.raw.slides) : "";
              return (
                <li
                  key={c.id}
                  ref={(el) => {
                    if (el) tileRefs.current.set(c.id, el);
                    else tileRefs.current.delete(c.id);
                  }}
                  className="group/tile relative min-w-0"
                >
                  <article
                    className={cx(
                      "grid h-full grid-rows-[auto_1fr] overflow-hidden rounded-[4px] border bg-(--acp-card) transition-[border-color,box-shadow,transform] duration-300 ease-out-soft motion-reduce:transition-none @max-[480px]:grid-cols-[112px_minmax(0,1fr)] @max-[480px]:grid-rows-none",
                      isPicked
                        ? "border-(--acp-ink) shadow-[0_0_0_2px_var(--acp-lime),0_18px_32px_-26px_var(--acp-shadow)]"
                        : "border-(--acp-line) group-hover/tile:border-(--acp-faint) group-hover/tile:shadow-[0_18px_32px_-26px_var(--acp-shadow)]"
                    )}
                  >
                    <Art item={c} className="aspect-[4/3] border-b border-(--acp-line) @max-[480px]:aspect-auto @max-[480px]:min-h-full @max-[480px]:border-r @max-[480px]:border-b-0">
                      <span className="absolute top-2 left-2 inline-flex items-center gap-[5px] rounded-[3px] bg-[#0B0B0A] px-[7px] py-[5px] font-(family-name:--acp-mono) text-[10px] leading-none font-semibold tracking-[.08em] text-[#F4F4F0] uppercase @max-[480px]:gap-0 @max-[480px]:p-[5px] @max-[480px]:text-[0px]">
                        <FormatIcon format={c.format} className="size-2.5" />
                        {FORMAT_LABEL[c.format]}
                        {extra && <span className="tracking-[.02em] text-[#A9A9A2] @max-[480px]:hidden">{extra}</span>}
                      </span>
                      {c.id === best && (
                        <span
                          key={sort}
                          className="absolute top-[34px] left-2 inline-flex animate-[acp-pop_.4s_cubic-bezier(.2,.7,.2,1)] items-center gap-[5px] rounded-[3px] bg-(--acp-lime) py-[5px] pr-2 pl-1.5 font-(family-name:--acp-mono) text-[10px] leading-none font-bold tracking-[.06em] text-(--acp-lime-ink) uppercase shadow-[0_6px_14px_-6px_rgba(0,0,0,.45)] motion-reduce:animate-none @max-[480px]:top-auto @max-[480px]:bottom-[34px] @max-[480px]:gap-0 @max-[480px]:p-[5px] @max-[480px]:text-[0px]"
                        >
                          <svg viewBox="0 0 12 12" fill="currentColor" aria-hidden="true" className="size-3">
                            <path d="M1.2 3.6 3.8 6 6 2.2 8.2 6l2.6-2.4-.9 5.6H2.1zM2.2 9.9h7.6v1H2.2z" />
                          </svg>
                          {cfg.crown}
                        </span>
                      )}
                      <span
                        aria-hidden="true"
                        className="absolute top-2 right-2 rounded-[3px] bg-[rgba(11,11,10,.82)] px-1.5 pt-1 pb-[3px] font-(family-name:--acp-num) text-[15px] leading-none font-bold text-[#F4F4F0] tabular-nums @max-[480px]:text-[13px]"
                      >
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div
                        aria-hidden="true"
                        className="absolute inset-x-0 bottom-0 flex items-baseline justify-between gap-2 bg-[linear-gradient(to_top,rgba(8,8,7,.86),rgba(8,8,7,.55)_60%,transparent)] px-2.5 pt-[18px] pb-2 text-[#F4F4F0] @max-[480px]:px-2 @max-[480px]:pt-3.5 @max-[480px]:pb-1.5"
                      >
                        <span className={cx(mono, "text-[9.5px] leading-none font-semibold tracking-[.12em] text-[#C9C9C2] @max-[480px]:hidden")}>{keyName}</span>
                        <span
                          key={interacted ? ovText : "static"}
                          className={cx(
                            "font-(family-name:--acp-num) text-2xl leading-none font-bold tracking-[-0.01em] text-[#A3E635] tabular-nums @max-[480px]:text-lg",
                            interacted && "animate-[acp-swap_.35s_cubic-bezier(.2,.7,.2,1)] motion-reduce:animate-none"
                          )}
                        >
                          {ovText}
                        </span>
                      </div>
                      <span className="sr-only">
                        Rank {i + 1} by {keyName}
                        {c.id === best ? `, ${cfg.crown}` : ""}.
                      </span>
                    </Art>

                    <div className="grid content-start gap-2.5 p-3 @max-[480px]:gap-2 @max-[480px]:p-2.5">
                      <h3 className="m-0 text-[14.5px] leading-[1.25] font-[650] tracking-[-0.005em] [overflow-wrap:anywhere]">{c.name}</h3>
                      {c.copy && <p className="m-0 -mt-1 text-[12.5px] leading-[1.4] [overflow-wrap:anywhere] text-(--acp-muted) italic @max-[480px]:hidden">{c.copy}</p>}
                      <dl className="m-0 grid grid-cols-2 border-t border-(--acp-line)">
                        {(["ctr", "cpa", "sp", "cv"] as const).map((key, j) => {
                          const on = key === cfg.key;
                          return (
                            <div
                              key={key}
                              className={cx(
                                "relative grid min-w-0 gap-[3px] border-b border-(--acp-line) pt-[7px] pb-1.5",
                                j % 2 === 1 && "border-l pl-2.5",
                                on && "before:absolute before:-top-px before:h-0.5 before:w-[22px] before:bg-(--acp-lime) before:content-['']",
                                on && (j % 2 === 1 ? "before:left-2.5" : "before:left-0")
                              )}
                            >
                              <dt className={cx(mono, "text-[9.5px] leading-[1.1] font-semibold tracking-[.08em] [overflow-wrap:anywhere]", on ? "text-(--acp-accent)" : "text-(--acp-faint)")}>
                                {KEY_LABEL[key]}
                              </dt>
                              <dd className="m-0 font-(family-name:--acp-num) text-base leading-none font-semibold tabular-nums @max-[480px]:text-[15px]">{fmt(key, c[key])}</dd>
                            </div>
                          );
                        })}
                      </dl>
                      <button
                        type="button"
                        data-acp-cmp=""
                        aria-pressed={isPicked}
                        aria-disabled={limit || undefined}
                        onClick={() => toggle(c.id)}
                        className={cx(
                          "group/cmp inline-flex cursor-pointer items-center gap-1.5 justify-self-start rounded-[3px] border border-(--acp-line) bg-transparent py-[7px] pr-2.5 pl-2 text-xs leading-none font-semibold text-(--acp-muted) transition-[background-color,color,border-color] duration-200 hover:border-(--acp-ink) hover:text-(--acp-ink) aria-pressed:border-(--acp-lime) aria-pressed:bg-(--acp-lime) aria-pressed:text-(--acp-lime-ink) aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:hover:border-(--acp-line) aria-disabled:hover:text-(--acp-muted) motion-reduce:transition-none",
                          focusRing
                        )}
                      >
                        <svg
                          viewBox="0 0 12 12"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          strokeLinecap="round"
                          aria-hidden="true"
                          className="size-3 transition-transform duration-300 ease-out-soft group-aria-pressed/cmp:rotate-45 motion-reduce:transition-none"
                        >
                          <path d="M6 2v8M2 6h8" />
                        </svg>
                        <span>{isPicked ? "Comparing" : "Compare"}</span>
                        <span className="sr-only"> {c.name}</span>
                      </button>
                    </div>
                  </article>
                  {isPicked && (
                    <span
                      aria-hidden="true"
                      className="absolute -top-2 -right-1.5 z-[1] grid size-[22px] animate-[acp-pop_.3s_cubic-bezier(.2,.7,.2,1)] place-items-center rounded-full bg-(--acp-ink) font-(family-name:--acp-num) text-[11px] leading-none font-bold text-(--acp-lime) motion-reduce:animate-none"
                    >
                      {k === 0 ? "A" : "B"}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="m-0 rounded-[4px] border border-dashed border-(--acp-line) py-9 text-center text-sm text-(--acp-muted)">No creatives match this format.</p>
        )}

        {/* comparison drawer */}
        <section
          aria-label="Creative comparison"
          aria-hidden={!open}
          inert={!open}
          className={cx(
            "grid transition-[grid-template-rows,margin] duration-[450ms] ease-out-soft motion-reduce:transition-none",
            open ? "mt-5 grid-rows-[1fr]" : "mt-0 grid-rows-[0fr]"
          )}
        >
          <div className="min-h-0 overflow-hidden">
            {shownPicked.length > 0 && (
              <div className="grid gap-3.5 rounded-[4px] border border-(--acp-drawer-line) bg-(--acp-drawer) px-5 pt-[18px] pb-4 text-(--acp-drawer-ink) @max-[480px]:px-3 @max-[480px]:pt-4 @max-[480px]:pb-3.5">
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5">
                  <h3 className="m-0 grid gap-[5px]">
                    <small className={cx(mono, "text-[10px] leading-none font-semibold tracking-[.14em] text-[#A3E635]")}>Head to head</small>
                    <span className="font-(family-name:--acp-num) text-xl leading-[1.1] font-bold uppercase">{shownPicked.map((c) => c.name).join(" vs ")}</span>
                  </h3>
                  <button
                    type="button"
                    onClick={clear}
                    className="cursor-pointer rounded-[3px] border border-(--acp-drawer-line) bg-transparent px-[11px] py-2 text-xs leading-none font-semibold text-(--acp-drawer-ink) transition-[border-color,background-color] duration-200 hover:border-(--acp-drawer-muted) hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A3E635] motion-reduce:transition-none"
                  >
                    Clear
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 @max-[480px]:gap-2">
                  {[0, 1].map((i) => {
                    const c = shownPicked[i];
                    if (!c)
                      return (
                        <div key={i} className="grid min-h-[58px] place-items-center rounded-[4px] border border-dashed border-(--acp-drawer-line) p-2 text-center text-[13px] text-(--acp-drawer-muted)">
                          Pick a second creative to compare
                        </div>
                      );
                    const right = i === 1;
                    return (
                      <div
                        key={c.id}
                        className={cx(
                          "grid min-w-0 items-center gap-2.5 rounded-[4px] border border-(--acp-drawer-line) p-2 @max-[480px]:grid-cols-1 @max-[480px]:text-left",
                          right ? "grid-cols-[minmax(0,1fr)_56px] text-right" : "grid-cols-[56px_minmax(0,1fr)]"
                        )}
                      >
                        <div aria-hidden="true" className={cx("relative aspect-[4/3] overflow-hidden rounded-[2px]", right && "order-2 @max-[480px]:order-none")}>
                          <Art item={c} small className="absolute inset-0" />
                        </div>
                        <div className="min-w-0">
                          <b className="block text-[13.5px] leading-[1.25] font-[650] [overflow-wrap:anywhere]">{c.name}</b>
                          <span className={cx(mono, "mt-[3px] block text-[10.5px] leading-[1.2] font-medium tracking-[.06em] text-(--acp-drawer-muted)")}>
                            {i === 0 ? "A" : "B"} · {FORMAT_LABEL[c.format]}
                          </span>
                          {shownResult?.winner === c.id && (
                            <em className={cx(mono, "mt-[5px] inline-block rounded-[2px] bg-[#A3E635] px-1.5 py-[3px] text-[10px] leading-none font-bold tracking-[.06em] text-[#1A2E05] not-italic")}>Leader</em>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {shownResult && shownPicked.length === 2 && (
                  <>
                    <ul className="m-0 grid list-none p-0">
                      {METRICS.map((m) => {
                        const [a, b] = shownPicked;
                        const x = a[m.key], y = b[m.key];
                        const max = Math.max(x || 0, y || 0);
                        const w = shownResult.per[m.key];
                        const side = (c: Item, v: number | null, isA: boolean) => {
                          const win = !!m.better && w === c.id;
                          return (
                            <div
                              aria-hidden="true"
                              className={cx(
                                "flex min-w-0 items-center gap-2.5",
                                isA ? "flex-row-reverse [grid-area:a] @max-[480px]:flex-row" : "[grid-area:b]"
                              )}
                            >
                              <span
                                className={cx(
                                  "min-w-[4.4em] flex-none font-(family-name:--acp-num) text-[17px] leading-none font-bold tabular-nums @max-[480px]:min-w-0 @max-[480px]:text-[15px]",
                                  isA && "text-right @max-[480px]:text-left",
                                  win ? "text-(--acp-drawer-ink)" : "text-(--acp-drawer-muted)"
                                )}
                              >
                                {win && isA && <span className="text-[13px] text-[#A3E635]">✓ </span>}
                                {fmt(m.key, v)}
                                {win && !isA && <span className="text-[13px] text-[#A3E635]"> ✓</span>}
                              </span>
                              <span className="relative h-2 min-w-5 flex-1">
                                <i
                                  className={cx(
                                    "absolute inset-y-0 rounded-[1px] transition-[width] duration-500 ease-out-soft motion-reduce:transition-none",
                                    isA ? "right-0 @max-[480px]:right-auto @max-[480px]:left-0" : "left-0",
                                    win ? "bg-[#A3E635]" : "bg-[#55554F]"
                                  )}
                                  style={{ width: `${max > 0 ? (((v || 0) / max) * 100).toFixed(1) : 0}%` }}
                                />
                              </span>
                            </div>
                          );
                        };
                        return (
                          <li
                            key={m.key}
                            className="grid grid-cols-[minmax(0,1fr)_150px_minmax(0,1fr)] items-center gap-3 border-t border-(--acp-drawer-line) py-2 [grid-template-areas:'a_m_b'] @max-[820px]:grid-cols-[minmax(0,1fr)_120px_minmax(0,1fr)] @max-[480px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] @max-[480px]:gap-y-1.5 @max-[480px]:[grid-template-areas:'m_m'_'a_b']"
                          >
                            {side(a, x, true)}
                            <div aria-hidden="true" className="grid gap-[3px] text-center [grid-area:m] @max-[480px]:flex @max-[480px]:items-baseline @max-[480px]:gap-2 @max-[480px]:text-left">
                              <b className="text-[12.5px] leading-[1.2] font-semibold">{m.label}</b>
                              <span className={cx(mono, "text-[9.5px] leading-none font-medium tracking-[.08em] text-(--acp-drawer-muted)")}>
                                {m.better > 0 ? "Higher wins" : m.better < 0 ? "Lower wins" : "No winner"}
                              </span>
                            </div>
                            {side(b, y, false)}
                            <span className="sr-only">
                              {`${m.label}: ${a.name} ${fmt(m.key, x)}, ${b.name} ${fmt(m.key, y)}.`}
                              {m.better ? (w ? ` ${w === a.id ? a.name : b.name} wins.` : " Even.") : ""}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                    <p className="m-0 text-[12.5px] text-(--acp-drawer-muted)">
                      {shownResult.winner ? (
                        <>
                          <b className="font-semibold text-[#A3E635]">{shownResult.winner === shownPicked[0].id ? shownPicked[0].name : shownPicked[1].name}</b> wins{" "}
                          {shownResult.wins[shownResult.winner]} of {shownResult.total} metrics
                        </>
                      ) : (
                        `Even: each wins ${shownResult.wins[shownPicked[0].id]} of ${shownResult.total} metrics`
                      )}
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        </section>

        {source && <p className="m-0 mt-4 border-t border-(--acp-line) pt-3 text-xs text-(--acp-faint)">{source}</p>}
        <p className="sr-only" aria-live="polite">
          {announce}
        </p>
      </article>
    </div>
  );
}

export default AdCreativePerformance;
