"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { cx } from "@/lib/format";

/** Visitor and conversion counts for one period. */
export interface ConversionCounts {
  visitors: number;
  conversions: number;
}

export interface ConversionChannel {
  /** Channel key, used by `channel` and in callbacks. */
  id: string;
  /** Button text. */
  label: string;
  /** Visitors in the period. */
  visitors: number;
  /** Conversions in the period. The rate is worked out from the counts. */
  conversions: number;
  /** Target rate in percent for this channel. Falls back to the card's `target`. */
  target?: number;
  /** Counts for the previous period. Adds the change in points. */
  previous?: ConversionCounts;
}

/** Every built-in piece of text. `{name}` placeholders are filled in. */
export interface ConversionRateLabels {
  all: string;
  allLong: string;
  channel: string;
  conversions: string;
  visitors: string;
  target: string;
  actual: string;
  whatif: string;
  rateLabel: string;
  whatifLabel: string;
  below: string;
  above: string;
  on: string;
  noTarget: string;
  need: string;
  spare: string;
  exact: string;
  same: string;
  result: string;
  vs: string;
  pts: string;
  byChannel: string;
  setTarget: string;
  reset: string;
  announce: string;
}

export interface ChannelChangeDetail {
  channel: string;
  label: string;
  rate: number | null;
  target: number | null;
  visitors: number;
  conversions: number;
}

export interface WhatIfChangeDetail {
  channel: string;
  /** Tested number of conversions. */
  conversions: number;
  /** Real number of conversions. */
  actual: number;
  rate: number;
  target: number | null;
  /** Tested rate minus target, in points. */
  gap: number | null;
}

export interface ConversionRateCardProps {
  /** The channels to compare. With more than one, a combined "All" view is added. */
  channels: ConversionChannel[];
  /** Selected channel id, or "all". Pass it to control the switch; leave it out to let the card manage it. */
  channel?: string;
  /** Starting channel when `channel` is not controlled. */
  defaultChannel?: string;
  /** Target rate in percent for the "All" view and any channel without its own. */
  target?: number;
  /** A target rate in percent that overrides every channel's own target. */
  targetOverride?: number;
  /** Top of the gauge scale in percent. Worked out from the data if left out. */
  max?: number;
  eyebrow?: string;
  title?: string;
  client?: string;
  period?: string;
  /** Name of the previous period, e.g. "Aug". */
  compareLabel?: string;
  /** Set to false to hide the combined "All" view. */
  showAll?: boolean;
  /** Override any built-in text. */
  labels?: Partial<ConversionRateLabels>;
  /** Number locale. */
  locale?: string;
  /** Fires when a channel is picked. */
  onChannelChange?: (detail: ChannelChangeDetail) => void;
  /** Fires when the what-if slider is let go of. */
  onWhatIfChange?: (detail: WhatIfChangeDetail) => void;
  className?: string;
}

export const CONVERSION_RATE_LABELS: ConversionRateLabels = {
  all: "All",
  allLong: "All channels",
  channel: "Channel",
  conversions: "Conversions",
  visitors: "Visitors",
  target: "Target",
  actual: "Actual",
  whatif: "What-if",
  rateLabel: "Conversion rate",
  whatifLabel: "If conversions were…",
  below: "{gap} pts below target",
  above: "{gap} pts above target",
  on: "On target",
  noTarget: "No target set",
  need: "{n} more at this traffic would reach the {target} target.",
  spare: "{n} above the minimum needed for the {target} target.",
  exact: "Exactly the number needed for the {target} target.",
  same: "Showing the actual result. Drag the slider to test a different number.",
  result: "That would be a rate of {rate}, {status}.",
  vs: "vs {label}",
  pts: "pts",
  byChannel: "By channel",
  setTarget: "Set to target",
  reset: "Reset",
  announce: "{label}: {rate} conversion rate, {status}.",
};

/* gauge geometry (viewBox units): centre 150,150 · radius 118 · half circle from left to right */
const CX = 150;
const CY = 150;
const R = 118;
const ARC = `M${CX - R} ${CY}A${R} ${R} 0 0 1 ${CX + R} ${CY}`;
const point = (f: number, r: number) => {
  const a = Math.PI * (1 - f);
  return [CX + r * Math.cos(a), CY - r * Math.sin(a)];
};

const num = (v: unknown): number | null => (v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));
const fill = (s: string, vars: Record<string, string>) => String(s).replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? "");
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

interface Row {
  id: string;
  label: string;
  long: string;
  visitors: number;
  conversions: number;
  target: number | null;
  prev: ConversionCounts | null;
  rate: number | null;
  prevRate: number | null;
  needed: number | null;
}

type Tone = "bad" | "good" | "on" | "";

const TargetIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" className="size-[13px]">
    <circle cx="8" cy="8" r="5.5" />
    <circle cx="8" cy="8" r="2" />
  </svg>
);
const ResetIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-[13px]">
    <path d="M3 8a5 5 0 1 0 1.6-3.7" />
    <path d="M3 2.5v3h3" />
  </svg>
);

const mono = "font-(family-name:--crc-mono) leading-none font-medium uppercase";
const btnBase =
  "inline-flex cursor-pointer items-center gap-[7px] rounded-[10px] border px-[13px] py-[9px] text-[12.5px] leading-none font-semibold transition-[background-color,border-color,color,scale] duration-200 not-disabled:active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--crc-gold) disabled:cursor-default disabled:opacity-50 motion-reduce:transition-none motion-reduce:active:scale-100";
const btnPlain = `${btnBase} border-(--crc-line) bg-(--crc-raise) text-(--crc-ink) not-disabled:hover:border-(--crc-gold) not-disabled:hover:text-(--crc-gold-ink)`;
const btnGold = `${btnBase} border-(--crc-ink) bg-(--crc-ink) text-(--crc-card) not-disabled:hover:border-(--crc-gold-ink) not-disabled:hover:bg-(--crc-gold-ink)`;

/**
 * A gold-on-charcoal gauge that shows the conversion rate against its target for
 * each channel, with a what-if slider that shows the gap to target.
 */
export function ConversionRateCard({
  channels,
  channel,
  defaultChannel = "all",
  target,
  targetOverride,
  max,
  eyebrow,
  title,
  client,
  period,
  compareLabel = "",
  showAll = true,
  labels,
  locale = "en-US",
  onChannelChange,
  onWhatIfChange,
  className,
}: ConversionRateCardProps) {
  const L = useMemo(() => ({ ...CONVERSION_RATE_LABELS, ...labels }), [labels]);
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const fmtInt = (v: number) => Math.round(v).toLocaleString(locale);
  const fix = (v: number, d = 2) => v.toLocaleString(locale, { minimumFractionDigits: d, maximumFractionDigits: d });
  const pct = (v: number | null) => (v == null ? "—" : `${fix(v)}%`);

  /* ---------- data ---------- */
  const list = useMemo<Row[]>(() => {
    const over = num(targetOverride);
    const base = num(target);
    const rows = (Array.isArray(channels) ? channels : []).map((c, i) => {
      const visitors = Math.max(0, num(c?.visitors) ?? 0);
      const conversions = clamp(num(c?.conversions) ?? 0, 0, visitors || Infinity);
      const pv = num(c?.previous?.visitors);
      const prev = c?.previous && pv != null && pv > 0 ? { visitors: pv, conversions: Math.max(0, num(c.previous.conversions) ?? 0) } : null;
      const label = c?.label || `Channel ${i + 1}`;
      return { id: String(c?.id || `channel-${i + 1}`), label, long: label, visitors, conversions, target: num(c?.target) ?? base, prev };
    });
    if (rows.length > 1 && showAll) {
      const prevOk = rows.every((c) => c.prev);
      rows.unshift({
        id: "all",
        label: L.all,
        long: L.allLong,
        visitors: rows.reduce((a, c) => a + c.visitors, 0),
        conversions: rows.reduce((a, c) => a + c.conversions, 0),
        target: base,
        prev: prevOk
          ? {
              visitors: rows.reduce((a, c) => a + (c.prev?.visitors ?? 0), 0),
              conversions: rows.reduce((a, c) => a + (c.prev?.conversions ?? 0), 0),
            }
          : null,
      });
    }
    return rows.map((c) => {
      const t = over != null ? over : c.target;
      return {
        ...c,
        target: t,
        rate: c.visitors > 0 ? (c.conversions / c.visitors) * 100 : null,
        prevRate: c.prev ? (c.prev.conversions / c.prev.visitors) * 100 : null,
        needed: t != null && c.visitors > 0 ? Math.ceil((t / 100) * c.visitors - 1e-9) : null,
      };
    });
  }, [channels, target, targetOverride, showAll, L.all, L.allLong]);

  const scale = useMemo(() => {
    const m = num(max);
    if (m != null && m > 0) return m;
    const top = Math.max(1, ...list.map((c) => Math.max(c.rate || 0, c.target || 0)));
    return Math.ceil((top * 1.25) / 2) * 2;
  }, [max, list]);

  const [innerId, setInnerId] = useState(defaultChannel);
  const selectedId = channel ?? innerId;
  const c = list.find((r) => r.id === selectedId) ?? list[0] ?? null;

  /* what-if value, reset whenever the channel or its numbers change */
  const resetKey = c ? `${c.id}|${c.visitors}|${c.conversions}|${c.target}` : "";
  const [wi, setWi] = useState<{ key: string; value: number }>({ key: resetKey, value: c?.conversions ?? 0 });
  const conv = wi.key === resetKey ? wi.value : (c?.conversions ?? 0);
  const setConv = (value: number) => setWi({ key: resetKey, value });

  const [ready, setReady] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [announce, setAnnounce] = useState("");

  useEffect(() => {
    let a = 0;
    const b = requestAnimationFrame(() => {
      a = requestAnimationFrame(() => setReady(true));
    });
    return () => {
      cancelAnimationFrame(b);
      cancelAnimationFrame(a);
    };
  }, []);

  /* ---------- derived ---------- */
  const visitors = c?.visitors ?? 0;
  const rate = c && visitors > 0 ? (conv / visitors) * 100 : 0;
  const isWhat = !!c && conv !== c.conversions;
  const f = clamp(rate / scale, 0, 1);
  const top = c ? Math.max(c.conversions, Math.ceil((c.visitors * scale) / 100), c.needed || 0) : 0;
  const rangeMax = top || 1;

  const statusText = (r: number | null, t: number | null) => {
    if (r == null || t == null) return L.noTarget;
    const gap = Math.round((r - t) * 100) / 100;
    if (gap === 0) return L.on;
    return fill(gap < 0 ? L.below : L.above, { gap: fix(Math.abs(gap)) });
  };
  const gap = c?.target == null ? null : Math.round((rate - c.target) * 100) / 100;
  const tone: Tone = gap == null ? "" : gap < 0 ? "bad" : gap > 0 ? "good" : "on";
  const status = c ? statusText(rate, c.target) : "";

  let delta = "";
  if (c && !isWhat && c.prevRate != null && c.rate != null) {
    const dp = Math.round((c.rate - c.prevRate) * 100) / 100;
    const arrow = dp > 0 ? "▲" : dp < 0 ? "▼" : "▶";
    delta = `${arrow} ${fix(Math.abs(dp))} ${L.pts} ${fill(L.vs, { label: compareLabel })}`.trim();
  } else if (c && isWhat) {
    delta = `${L.actual} ${pct(c.rate)}`;
  }

  /* ---------- rate tween ---------- */
  const [tween, setTween] = useState<number | null>(null);
  const shownRef = useRef(rate);
  const instantRef = useRef(true);
  const shown = tween ?? rate;
  useEffect(() => {
    const from = shownRef.current;
    const to = rate;
    const instant = instantRef.current || dragging;
    instantRef.current = false;
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (instant || reduce || Math.abs(to - from) < 0.005) {
      shownRef.current = to;
      setTween(null);
      return;
    }
    const t0 = performance.now();
    const dur = 600;
    let raf = 0;
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - k, 3);
      const v = from + (to - from) * e;
      shownRef.current = k < 1 ? v : to;
      setTween(k < 1 ? v : null);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rate]);

  /* ---------- announce channel / target changes ---------- */
  const announcedKey = useRef(resetKey);
  useEffect(() => {
    if (announcedKey.current === resetKey) return;
    announcedKey.current = resetKey;
    if (!c) return;
    setAnnounce(fill(L.announce, { label: c.long, rate: pct(c.rate), status: statusText(c.rate, c.target) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  /* ---------- sliding thumb in the switch ---------- */
  const segRef = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState({ x: 0, w: 0 });
  useLayoutEffect(() => {
    const seg = segRef.current;
    if (!seg) return;
    const place = () => {
      const b = seg.querySelector<HTMLButtonElement>('button[aria-pressed="true"]');
      setThumb(b && b.offsetWidth ? { x: b.offsetLeft, w: b.offsetWidth } : { x: 0, w: 0 });
    };
    place();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(place);
    ro.observe(seg);
    return () => ro.disconnect();
  }, [c?.id, list]);

  /* ---------- what-if commit (native change event = slider let go) ---------- */
  const rangeRef = useRef<HTMLInputElement>(null);
  const latest = useRef({ c, conv, onWhatIfChange });
  latest.current = { c, conv, onWhatIfChange };
  useEffect(() => {
    const el = rangeRef.current;
    if (!el) return;
    const onCommit = () => {
      setDragging(false);
      const { c: cur, conv: v, onWhatIfChange: cb } = latest.current;
      if (!cur || !cb) return;
      const r = cur.visitors > 0 ? (v / cur.visitors) * 100 : 0;
      cb({ channel: cur.id, conversions: v, actual: cur.conversions, rate: r, target: cur.target, gap: cur.target == null ? null : r - cur.target });
    };
    el.addEventListener("change", onCommit);
    return () => el.removeEventListener("change", onCommit);
  }, []);

  const pick = (id: string) => {
    if (!c || id === c.id) return;
    setInnerId(id);
    const next = list.find((r) => r.id === id);
    if (next) {
      onChannelChange?.({ channel: next.id, label: next.long, rate: next.rate, target: next.target, visitors: next.visitors, conversions: next.conversions });
    }
  };

  const setTo = (v: number) => {
    setDragging(false);
    setConv(v);
  };

  /* ---------- gauge ticks ---------- */
  const steps = Math.round(scale * 2);
  const ticks: Array<{ x1: number; y1: number; x2: number; y2: number; major: boolean }> = [];
  for (let i = 0; i <= steps; i++) {
    const tf = i / steps;
    const major = i % 2 === 0;
    const [x1, y1] = point(tf, R + 11);
    const [x2, y2] = point(tf, R + (major ? 20 : 15));
    ticks.push({ x1, y1, x2, y2, major });
  }

  const rotTransition = ready ? "transition-[transform,opacity] duration-[620ms] ease-out-soft motion-reduce:transition-none" : "";
  const arcTransition = ready
    ? dragging
      ? "transition-[stroke-dashoffset,opacity] duration-100 ease-linear motion-reduce:transition-none"
      : "transition-[stroke-dashoffset,opacity] duration-[620ms] ease-out-soft motion-reduce:transition-none"
    : "";
  const pointerTransition = ready
    ? dragging
      ? "transition-transform duration-100 ease-linear motion-reduce:transition-none"
      : rotTransition
    : "";

  const statusColor = { bad: "text-(--crc-dial-bad)", good: "text-(--crc-dial-good)", on: "text-(--crc-dial-gold)", "": "text-(--crc-dial-ink)" }[tone];
  const resultTone = { bad: "text-(--crc-bad)", good: "text-(--crc-good)", on: "", "": "" }[tone];
  const meta = [client, period].filter(Boolean).join(" · ");

  let resultLine: ReactNode = null;
  if (c) {
    const head: ReactNode = !isWhat ? (
      L.same
    ) : (
      <>
        {fill(L.result, { rate: "\u0000", status: "\u0001" })
          .split(/(\u0000|\u0001)/)
          .map((p, i) =>
            p === "\u0000" ? (
              <b key={i} className="font-semibold text-(--crc-ink)">
                {pct(rate)}
              </b>
            ) : p === "\u0001" ? (
              <b key={i} className={cx("font-semibold", resultTone || "text-(--crc-ink)")}>
                {status}
              </b>
            ) : (
              p
            )
          )}
      </>
    );
    let tail = "";
    if (c.needed != null && c.target != null) {
      const diff = c.needed - conv;
      const tgt = `${fix(c.target)}%`;
      tail =
        diff > 0
          ? fill(L.need, { n: fmtInt(diff), target: tgt })
          : diff < 0
            ? fill(L.spare, { n: fmtInt(-diff), target: tgt })
            : fill(L.exact, { target: tgt });
    }
    resultLine = (
      <>
        {head}
        {tail && ` ${tail}`}
      </>
    );
  }

  return (
    <div className={cx("@container block w-full max-w-[960px] font-(family-name:--crc-sans) text-(--crc-ink)", className)}>
      <article className="relative grid grid-cols-[minmax(0,1.04fr)_minmax(0,1fr)] gap-3.5 rounded-[26px] border border-(--crc-line) bg-(--crc-card) p-3.5 shadow-[0_1px_0_rgba(255,255,255,0.5)_inset,0_34px_70px_-48px_var(--crc-shadow),0_2px_8px_-5px_var(--crc-shadow)] @max-[759px]:grid-cols-1 @max-[759px]:rounded-[22px] @max-[519px]:gap-2.5 @max-[519px]:rounded-[20px] @max-[519px]:p-2.5">
        {/* ---------- gauge panel ---------- */}
        <section className="relative grid content-start gap-4 overflow-hidden rounded-[18px] bg-[radial-gradient(70%_55%_at_50%_58%,var(--crc-halo),transparent_70%),linear-gradient(160deg,var(--crc-dial-2),var(--crc-dial)_62%)] px-6 pt-[22px] pb-5 text-(--crc-dial-ink) shadow-[inset_0_1px_0_rgba(255,255,255,0.06),inset_0_0_0_1px_rgba(255,255,255,0.04)] *:relative *:z-[1] after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:bg-[repeating-linear-gradient(115deg,rgba(255,255,255,0.018)_0_2px,transparent_2px_7px)] @max-[759px]:order-2 @max-[759px]:px-[22px] @max-[759px]:pb-[18px] @max-[519px]:px-4 @max-[519px]:pt-[18px] @max-[519px]:pb-4">
          <div className="flex items-center justify-between gap-2.5">
            <span className={cx(mono, "text-[10.5px] tracking-[0.12em] text-(--crc-dial-muted)")}>{c ? `${c.long} · ${L.rateLabel}` : L.rateLabel}</span>
            <span
              className={cx(
                mono,
                "rounded-full px-2 py-[5px] text-[10px] font-semibold tracking-[0.12em] transition-[color,background-color,box-shadow] duration-300 motion-reduce:transition-none",
                isWhat ? "bg-(--crc-dial-gold) text-(--crc-dial)" : "text-(--crc-dial-muted) shadow-[inset_0_0_0_1px_var(--crc-dial-line)]"
              )}
            >
              {isWhat ? L.whatif : L.actual}
            </span>
          </div>

          <div className="@container/gauge relative w-full max-w-[380px] justify-self-center @max-[759px]:max-w-[400px]">
            <svg viewBox="0 0 300 168" aria-hidden="true" focusable="false" className="block h-auto w-full overflow-visible">
              <defs>
                <linearGradient id={`${uid}-g`} gradientUnits="userSpaceOnUse" x1={CX - R} y1="0" x2={CX + R} y2="0">
                  <stop offset="0" style={{ stopColor: "var(--crc-arc-from)" }} />
                  <stop offset="1" style={{ stopColor: "var(--crc-arc-to)" }} />
                </linearGradient>
              </defs>
              <g>
                {ticks.map((t, i) => (
                  <line
                    key={i}
                    x1={t.x1.toFixed(2)}
                    y1={t.y1.toFixed(2)}
                    x2={t.x2.toFixed(2)}
                    y2={t.y2.toFixed(2)}
                    className={cx("stroke-(--crc-dial-muted)", t.major ? "opacity-75" : "opacity-35")}
                    strokeWidth={t.major ? 1.4 : 1}
                  />
                ))}
                <text x={CX - R} y="166" textAnchor="middle" className="fill-(--crc-dial-muted) font-(family-name:--crc-mono) text-[9.5px] font-medium tracking-[0.04em]">
                  0%
                </text>
                <text x={CX + R} y="166" textAnchor="middle" className="fill-(--crc-dial-muted) font-(family-name:--crc-mono) text-[9.5px] font-medium tracking-[0.04em]">
                  {fix(scale, Number.isInteger(scale) ? 0 : 1)}%
                </text>
              </g>
              <path d={ARC} pathLength={100} fill="none" strokeWidth="14" strokeLinecap="round" className="stroke-(--crc-dial-track)" />
              <path
                d={ARC}
                pathLength={100}
                fill="none"
                stroke={`url(#${uid}-g)`}
                strokeWidth="14"
                strokeLinecap="round"
                strokeDasharray="100 200"
                style={{ strokeDashoffset: 100 - f * 100 }}
                className={cx("drop-shadow-[0_0_7px_var(--crc-halo)]", isWhat && "opacity-[0.78]", arcTransition)}
              />
              {c?.target != null && (
                <g
                  className={cx("origin-[150px_150px] [transform-box:view-box]", rotTransition)}
                  style={{ transform: `rotate(${clamp(c.target / scale, 0, 1) * 180}deg)` }}
                >
                  <line x1={CX - R - 15} y1={CY} x2={CX - R + 13} y2={CY} strokeWidth="2.4" strokeLinecap="round" className="stroke-(--crc-dial-ink)" />
                  <circle cx={CX - R - 17} cy={CY} r="2.6" className="fill-(--crc-dial-ink)" />
                </g>
              )}
              <g
                className={cx(
                  "origin-[150px_150px] transition-opacity duration-300 [transform-box:view-box] motion-reduce:transition-none",
                  isWhat ? "opacity-100" : "opacity-0",
                  rotTransition
                )}
                style={{ transform: `rotate(${clamp((c?.rate || 0) / scale, 0, 1) * 180}deg)` }}
              >
                <circle cx={CX - R} cy={CY} r="4.5" strokeWidth="2" className="fill-(--crc-dial-ink) stroke-(--crc-dial)" />
              </g>
              <g className={cx("origin-[150px_150px] [transform-box:view-box]", pointerTransition)} style={{ transform: `rotate(${f * 180}deg)` }}>
                <line x1={CX - R + 22} y1={CY} x2={CX - R + 40} y2={CY} strokeWidth="2.4" strokeLinecap="round" className="stroke-(--crc-dial-gold) opacity-85" />
                <circle cx={CX - R} cy={CY} r="9" strokeWidth="3" className="fill-(--crc-dial) stroke-(--crc-dial-gold)" />
                <circle cx={CX - R} cy={CY} r="3" className="fill-(--crc-dial-gold)" />
              </g>
            </svg>
            <div className="pointer-events-none absolute inset-x-0 bottom-[9%] grid justify-items-center gap-0.5">
              <span className={cx(mono, "text-[max(9.5px,2.9cqi)] tracking-[0.14em] text-(--crc-dial-muted)")}>{isWhat ? L.whatif : L.actual}</span>
              <span className="inline-flex items-start font-(family-name:--crc-serif) text-[19cqi] leading-none font-normal tracking-[-0.035em] text-(--crc-dial-gold) tabular-nums lining-nums [text-shadow:0_0_26px_var(--crc-halo)]">
                <span>{c ? fix(shown) : "—"}</span>
                <span className="mt-[0.16em] ml-[0.06em] text-[0.42em] tracking-normal text-(--crc-dial-muted)">%</span>
              </span>
            </div>
          </div>

          <div className="-mt-1 flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
            {status && (
              <span
                className={cx(
                  "inline-flex items-center gap-[7px] rounded-full bg-[rgba(245,240,230,0.07)] py-[7px] pr-3 pl-2.5 text-[12.5px] leading-none font-semibold tabular-nums shadow-[inset_0_0_0_1px_var(--crc-dial-line)] before:size-[7px] before:rounded-full before:bg-current",
                  statusColor
                )}
              >
                {status}
              </span>
            )}
            {delta && <span className="text-xs leading-none font-medium text-(--crc-dial-muted) tabular-nums">{delta}</span>}
          </div>

          <div className="grid gap-2 border-t border-(--crc-dial-line) pt-3.5">
            <h3 className={cx(mono, "m-0 text-[10.5px] tracking-[0.12em] text-(--crc-dial-muted)")}>{L.byChannel}</h3>
            <div role="group" aria-label={L.byChannel} className="grid gap-0.5 @max-[759px]:grid-cols-2 @max-[759px]:gap-x-7 @max-[519px]:grid-cols-1">
              {list.map((r) => {
                const pressed = c?.id === r.id;
                const st = r.rate == null ? "" : `, ${statusText(r.rate, r.target)}`;
                return (
                  <button
                    key={r.id}
                    type="button"
                    aria-pressed={pressed}
                    aria-label={`${r.long}: ${pct(r.rate)}${st}`}
                    onClick={() => pick(r.id)}
                    className="group/ch -mx-2.5 grid cursor-pointer grid-cols-[74px_minmax(0,1fr)_56px] items-center gap-3 rounded-[10px] border-0 bg-transparent px-2.5 py-2 text-left text-[13px] leading-none font-medium text-inherit transition-colors duration-[250ms] hover:bg-[rgba(245,240,230,0.05)] focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-(--crc-dial-gold) aria-pressed:bg-[rgba(240,192,90,0.10)] motion-reduce:transition-none @max-[519px]:grid-cols-[62px_minmax(0,1fr)_50px] @max-[519px]:gap-2.5"
                  >
                    <span className="truncate leading-[1.35] text-(--crc-dial-muted) transition-colors duration-[250ms] group-aria-pressed/ch:text-(--crc-dial-ink) motion-reduce:transition-none">
                      {r.label}
                    </span>
                    <span aria-hidden="true" className="relative h-1.5 rounded-full bg-(--crc-dial-track)">
                      <span
                        className="absolute inset-y-0 left-0 rounded-[inherit] bg-[linear-gradient(90deg,var(--crc-arc-from),var(--crc-arc-to))] opacity-55 transition-[width,opacity] duration-[600ms] ease-out-soft group-hover/ch:opacity-100 group-aria-pressed/ch:opacity-100 motion-reduce:transition-none"
                        style={{ width: `${clamp(((r.rate || 0) / scale) * 100, 0, 100).toFixed(2)}%` }}
                      />
                      {r.target != null && (
                        <span
                          className="absolute -top-1 -bottom-1 -ml-px w-0.5 rounded-[2px] bg-(--crc-dial-ink) opacity-80"
                          style={{ left: `${clamp((r.target / scale) * 100, 0, 100).toFixed(2)}%` }}
                        />
                      )}
                    </span>
                    <span className="text-right font-(family-name:--crc-serif) text-[15px] leading-none font-normal text-(--crc-dial-ink) tabular-nums">{pct(r.rate)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* ---------- details column ---------- */}
        <section className="grid min-w-0 content-start gap-[22px] pt-3.5 pr-3.5 pb-2.5 pl-2 @max-[759px]:contents">
          {(eyebrow || title || meta) && (
            <header className="grid gap-2 @max-[759px]:order-0 @max-[759px]:px-2 @max-[759px]:pt-2.5 @max-[759px]:pb-1 @max-[519px]:px-1.5 @max-[519px]:pt-2 @max-[519px]:pb-0.5">
              {eyebrow && <span className={cx(mono, "text-[11px] tracking-[0.12em] text-(--crc-gold-ink)")}>{eyebrow}</span>}
              {title && (
                <h2 className="m-0 font-(family-name:--crc-serif) text-[clamp(23px,3.4cqi,30px)] leading-[1.12] font-normal tracking-[-0.015em] text-balance">{title}</h2>
              )}
              {meta && <p className="m-0 text-[13.5px] text-(--crc-muted)">{meta}</p>}
            </header>
          )}

          <div ref={segRef} role="group" aria-label={L.channel} className="relative flex rounded-[14px] border border-(--crc-line) bg-(--crc-tint) p-1 @max-[759px]:order-1">
            <span
              aria-hidden="true"
              className={cx(
                "absolute top-1 bottom-1 left-0 rounded-[10px] bg-(--crc-raise) shadow-[0_1px_2px_var(--crc-shadow),0_0_0_1px_var(--crc-line),inset_0_-2px_0_var(--crc-gold)]",
                ready && "transition-[transform,width] duration-[420ms] ease-[cubic-bezier(.3,.8,.25,1)] motion-reduce:transition-none"
              )}
              style={{ width: thumb.w, transform: `translateX(${thumb.x}px)` }}
            />
            {list.map((r) => (
              <button
                key={r.id}
                type="button"
                aria-pressed={c?.id === r.id}
                onClick={() => pick(r.id)}
                className="relative min-w-0 flex-1 basis-0 cursor-pointer rounded-[10px] border-0 bg-transparent p-2.5 text-[13px] leading-none font-semibold text-(--crc-muted) transition-colors duration-[250ms] hover:text-(--crc-ink) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--crc-gold) aria-pressed:text-(--crc-ink) motion-reduce:transition-none @max-[519px]:px-1 @max-[519px]:text-[12.5px]"
              >
                {r.label}
              </button>
            ))}
          </div>

          <dl className="m-0 grid grid-cols-3 border-y border-(--crc-line) @max-[759px]:order-3 @max-[759px]:mx-2 @max-[519px]:mx-1.5">
            {[
              { k: L.conversions, v: c ? fmtInt(c.conversions) : "—" },
              { k: L.visitors, v: c ? fmtInt(c.visitors) : "—" },
              { k: L.target, v: c?.target == null ? "—" : `${fix(c.target)}%` },
            ].map((s, i) => (
              <div
                key={i}
                className={cx(
                  "grid min-w-0 gap-2 py-4 pr-4 pl-0 @max-[519px]:gap-1.5 @max-[519px]:py-3.5 @max-[519px]:pr-2",
                  i > 0 && "border-l border-(--crc-line) pl-4 @max-[519px]:pl-2.5"
                )}
              >
                <dt className={cx(mono, "text-[10.5px] leading-[1.2] tracking-[0.1em] text-(--crc-faint)")}>{s.k}</dt>
                <dd className="m-0 font-(family-name:--crc-serif) text-[clamp(22px,3.3cqi,28px)] leading-none font-normal tracking-[-0.02em] [overflow-wrap:anywhere] tabular-nums lining-nums @max-[519px]:text-[20px]">
                  {s.v}
                </dd>
              </div>
            ))}
          </dl>

          <div
            className={cx(
              "grid gap-3 rounded-2xl border bg-[linear-gradient(180deg,var(--crc-raise),var(--crc-card))] px-[18px] pt-[18px] pb-4 transition-[border-color,box-shadow] duration-300 motion-reduce:transition-none @max-[759px]:order-4 @max-[519px]:px-3.5 @max-[519px]:pt-4 @max-[519px]:pb-3.5",
              isWhat ? "border-[color-mix(in_oklab,var(--crc-gold)_55%,var(--crc-line))] shadow-[0_0_0_4px_var(--crc-gold-soft)]" : "border-(--crc-line)"
            )}
          >
            <div className="flex items-baseline justify-between gap-2.5">
              <label htmlFor={`${uid}-r`} className="text-sm leading-[1.3] font-semibold">
                {L.whatifLabel}
              </label>
              <output htmlFor={`${uid}-r`} className="font-(family-name:--crc-serif) text-[26px] leading-none font-normal tracking-[-0.02em] text-(--crc-gold-ink) tabular-nums @max-[519px]:text-[22px]">
                {fmtInt(conv)}
              </output>
            </div>
            <input
              ref={rangeRef}
              id={`${uid}-r`}
              type="range"
              min={0}
              max={rangeMax}
              step={1}
              value={conv}
              disabled={!c || !(visitors > 0)}
              aria-valuetext={`${fmtInt(conv)} conversions, ${pct(rate)}`}
              onChange={(e) => {
                setDragging(true);
                setConv(Math.round(Number(e.currentTarget.value)));
              }}
              onPointerUp={() => setDragging(false)}
              onBlur={() => setDragging(false)}
              style={{ "--p": `${((conv / rangeMax) * 100).toFixed(2)}%` } as CSSProperties}
              className="m-0 h-[26px] w-full cursor-pointer appearance-none bg-transparent focus:outline-none focus-visible:rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--crc-gold) disabled:cursor-default disabled:opacity-50 [&::-moz-range-progress]:h-1.5 [&::-moz-range-progress]:rounded-full [&::-moz-range-progress]:bg-(--crc-gold) [&::-moz-range-thumb]:size-[18px] [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-solid [&::-moz-range-thumb]:border-(--crc-gold) [&::-moz-range-thumb]:bg-(--crc-raise) [&::-moz-range-thumb]:shadow-[0_2px_6px_-1px_var(--crc-shadow),0_0_0_4px_var(--crc-gold-soft)] [&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-(--crc-line) [&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-[linear-gradient(90deg,var(--crc-gold)_var(--p),var(--crc-line)_var(--p))] [&::-webkit-slider-thumb]:-mt-2 [&::-webkit-slider-thumb]:size-[22px] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-solid [&::-webkit-slider-thumb]:border-(--crc-gold) [&::-webkit-slider-thumb]:bg-(--crc-raise) [&::-webkit-slider-thumb]:shadow-[0_2px_6px_-1px_var(--crc-shadow),0_0_0_4px_var(--crc-gold-soft)] [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:duration-150 motion-reduce:[&::-webkit-slider-thumb]:transition-none active:[&::-webkit-slider-thumb]:scale-110 motion-reduce:active:[&::-webkit-slider-thumb]:scale-100"
            />
            <div aria-hidden="true" className="-mt-1.5 flex justify-between font-(family-name:--crc-mono) text-[11px] leading-none font-medium text-(--crc-faint) tabular-nums">
              <span>0</span>
              <span>{fmtInt(top)}</span>
            </div>
            <p className="m-0 min-h-[2.9em] text-[13.5px] leading-normal text-(--crc-muted)">
              {resultLine}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!c || c.needed == null || conv === c.needed}
                onClick={() => c && c.needed != null && setTo(clamp(c.needed, 0, rangeMax))}
                className={btnGold}
              >
                <TargetIcon />
                {L.setTarget}
              </button>
              <button type="button" disabled={!isWhat} onClick={() => c && setTo(c.conversions)} className={btnPlain}>
                <ResetIcon />
                {L.reset}
              </button>
            </div>
          </div>
        </section>

        <p className="sr-only" aria-live="polite">
          {announce}
        </p>
      </article>
    </div>
  );
}

export default ConversionRateCard;
