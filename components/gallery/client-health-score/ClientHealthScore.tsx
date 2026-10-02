"use client";

import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type FocusEvent, type ReactNode } from "react";
import { cx, MONTHS } from "@/lib/format";

export type HealthPeriod = "current" | "previous";
export type HealthBand = "healthy" | "risk" | "critical";

export interface HealthFactor {
  /** Factor id. */
  key: string;
  /** Display name. */
  name: string;
  /** 0–100 score now. */
  score: number;
  /** 0–100 score for the earlier period. Defaults to `score`. */
  previous?: number;
  /** Starting weight, 0–10. Weights are shared as percentages of their total. */
  weight?: number;
  /** What the factor measures. Shown when the row is hovered or focused. */
  about?: string;
  /** Evidence behind the current score. */
  note?: string;
  /** Evidence behind the earlier score. */
  previousNote?: string;
}

export interface HealthBands {
  /** Scores at or above this are Healthy. */
  healthy: number;
  /** Scores at or above this (and below `healthy`) are At risk; below it is Critical. */
  risk: number;
}

export interface HealthScoreChange {
  score: number;
  band: HealthBand;
  period: HealthPeriod;
  current: number;
  previous: number;
  /** Each factor's whole-number share of the score, by key. */
  weights: Record<string, number>;
  reason: "period" | "weight" | "reset";
}

export interface HealthLabels {
  current: string;
  previous: string;
  period: string;
  factors: string;
  factorsNote: string;
  reset: string;
  weight: string;
  of100: string;
  healthy: string;
  risk: string;
  critical: string;
  vsPrev: string;
  vsNow: string;
  same: string;
  pts: string;
  ofScore: string;
  now: string;
  hintTitle: string;
  allZero: string;
  foot: string;
  dial: string;
}

export interface ClientHealthScoreProps {
  /** Account name. */
  client: string;
  /** Short line under the name. */
  segment?: string;
  /** Date of the current period, YYYY-MM-DD (shown as the toggle's tooltip). */
  asOf?: string;
  /** Date of the earlier period, YYYY-MM-DD. */
  compareDate?: string;
  /** Toggle label for the earlier period. */
  compareLabel?: string;
  /** Four to six factors work best. */
  factors: HealthFactor[];
  /** Band thresholds. */
  bands?: Partial<HealthBands>;
  /** Controlled period. */
  period?: HealthPeriod;
  /** Initial period when uncontrolled. */
  defaultPeriod?: HealthPeriod;
  onPeriodChange?: (period: HealthPeriod) => void;
  /** Called when the period changes, a weight is released or the weights are reset. */
  onScoreChange?: (detail: HealthScoreChange) => void;
  /** Override any built-in text. */
  labels?: Partial<HealthLabels>;
  className?: string;
}

const LABELS: HealthLabels = {
  current: "Current",
  previous: "90 days ago",
  period: "Compare period",
  factors: "Score factors",
  factorsNote: "Drag a weight to change how much each factor counts.",
  reset: "Reset weights",
  weight: "Weight",
  of100: "/100",
  healthy: "Healthy",
  risk: "At risk",
  critical: "Critical",
  vsPrev: "{delta} vs {label}",
  vsNow: "{delta} to now",
  same: "No change vs {label}",
  pts: "{pts} pts",
  ofScore: "of score",
  now: "Now {n}",
  hintTitle: "What's driving this score",
  allZero: "All weights are at 0, so every factor counts equally.",
  foot: "Score = weighted average of the factor scores. Bands: Healthy {h}+, At risk {r}–{h1}, Critical below {r}.",
  dial: "Health score {score} out of 100, {band}.",
};

const R = 96;
const C = 2 * Math.PI * R;
const ARC = C * 0.75;
const START = 135; // 270° dial opening at the bottom

const BAND_VARS: Record<HealthBand, string> = {
  healthy: "[--chs-c:var(--chs-good)] [--chs-c-bg:var(--chs-good-bg)] [--chs-c-fill:var(--chs-good-fill)]",
  risk: "[--chs-c:var(--chs-warn)] [--chs-c-bg:var(--chs-warn-bg)] [--chs-c-fill:var(--chs-warn-fill)]",
  critical: "[--chs-c:var(--chs-bad)] [--chs-c-bg:var(--chs-bad-bg)] [--chs-c-fill:var(--chs-bad-fill)]",
};

const fill = (s: string, vars: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ""));
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const num = (v: unknown, d: number) => (v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? d : Number(v));
const fmtDate = (s?: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || "");
  return m ? `${+m[3]} ${MONTHS[+m[2] - 1]} ${m[1]}` : undefined;
};
const polar = (v: number, r: number) => {
  const a = ((START + (270 * v) / 100) * Math.PI) / 180;
  return [120 + r * Math.cos(a), 120 + r * Math.sin(a)] as const;
};
const reduceMotion = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

interface Factor {
  key: string;
  name: string;
  score: number;
  previous: number;
  weight: number;
  about: string;
  note: string;
  previousNote: string;
}

function normalise(list: HealthFactor[]): Factor[] {
  return (Array.isArray(list) ? list : []).filter(Boolean).map((f, i) => ({
    key: String(f.key || `f${i + 1}`),
    name: f.name || `Factor ${i + 1}`,
    score: clamp(num(f.score, 0), 0, 100),
    previous: clamp(num(f.previous, num(f.score, 0)), 0, 100),
    weight: clamp(Math.round(num(f.weight, 5)), 0, 10),
    about: f.about || "",
    note: f.note || "",
    previousNote: f.previousNote || "",
  }));
}

const baseWeights = (fs: Factor[]) => Object.fromEntries(fs.map((f) => [f.key, f.weight])) as Record<string, number>;

/** Shares of the total weight, plus whole-number percentages that always add up to 100. */
function shares(fs: Factor[], w: Record<string, number>) {
  const total = fs.reduce((a, f) => a + (w[f.key] || 0), 0);
  const raw = fs.map((f) => (total > 0 ? (w[f.key] || 0) / total : 1 / Math.max(1, fs.length)));
  const pct = raw.map((r) => Math.floor(r * 100));
  let left = 100 - pct.reduce((a, b) => a + b, 0);
  raw
    .map((r, i) => [r * 100 - pct[i], i] as const)
    .sort((a, b) => b[0] - a[0])
    .forEach(([, i]) => {
      if (left > 0) {
        pct[i]++;
        left--;
      }
    });
  return { raw, pct, zero: total === 0 };
}

const calc = (fs: Factor[], raw: number[], p: HealthPeriod) => fs.reduce((a, f, i) => a + (p === "previous" ? f.previous : f.score) * raw[i], 0);

const capCls = "text-xs leading-none font-semibold tracking-[0.09em] text-(--chs-faint) [font-variant:all-small-caps]";
const toneCls = (t: number) => (t > 0 ? "text-(--chs-good)" : t < 0 ? "text-(--chs-bad)" : "text-(--chs-muted)");

const RANGE = cx(
  "m-0 h-[22px] w-full cursor-pointer appearance-none bg-transparent focus:outline-none",
  "[&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-[linear-gradient(90deg,var(--chs-ink)_0_calc(var(--chs-p,0)*1%),var(--chs-line)_calc(var(--chs-p,0)*1%)_100%)]",
  "[&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-(--chs-line)",
  "[&::-moz-range-progress]:h-1.5 [&::-moz-range-progress]:rounded-full [&::-moz-range-progress]:bg-(--chs-ink)",
  "[&::-webkit-slider-thumb]:-mt-1.5 [&::-webkit-slider-thumb]:size-[18px] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-solid [&::-webkit-slider-thumb]:border-(--chs-ink) [&::-webkit-slider-thumb]:bg-(--chs-raise) [&::-webkit-slider-thumb]:shadow-[0_2px_6px_-2px_var(--chs-shadow)] [&::-webkit-slider-thumb]:transition-[scale] [&::-webkit-slider-thumb]:duration-150 motion-reduce:[&::-webkit-slider-thumb]:transition-none",
  "hover:[&::-webkit-slider-thumb]:scale-[1.12] motion-reduce:hover:[&::-webkit-slider-thumb]:scale-100",
  "focus-visible:[&::-webkit-slider-thumb]:shadow-[0_0_0_4px_var(--chs-good-bg),0_0_0_6px_var(--chs-good)]",
  "[&::-moz-range-thumb]:size-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-solid [&::-moz-range-thumb]:border-(--chs-ink) [&::-moz-range-thumb]:bg-(--chs-raise) [&::-moz-range-thumb]:shadow-[0_2px_6px_-2px_var(--chs-shadow)]",
  "focus-visible:[&::-moz-range-thumb]:shadow-[0_0_0_4px_var(--chs-good-bg),0_0_0_6px_var(--chs-good)]"
);

const ResetIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-[13px]">
    <path d="M2.8 7.5A5.2 5.2 0 1 1 4.3 11.6" />
    <path d="M2.5 3.5v4h4" />
  </svg>
);

/** A 0–100 client health dial with a risk band, built from weighted factors you can re-weight live. */
export function ClientHealthScore({
  client,
  segment,
  asOf,
  compareDate,
  compareLabel,
  factors,
  bands: bandsProp,
  period: periodProp,
  defaultPeriod = "current",
  onPeriodChange,
  onScoreChange,
  labels,
  className,
}: ClientHealthScoreProps) {
  const L = useMemo(() => ({ ...LABELS, ...labels, ...(compareLabel ? { previous: compareLabel } : null) }), [labels, compareLabel]);
  const uid = useId();
  const fs = useMemo(() => normalise(factors), [factors]);
  const b = { healthy: num(bandsProp?.healthy, 70), risk: num(bandsProp?.risk, 40) };
  const bandOf = (v: number): HealthBand => {
    const r = Math.round(v);
    return r >= b.healthy ? "healthy" : r >= b.risk ? "risk" : "critical";
  };

  /* ---------- state ---------- */
  const [weights, setWeights] = useState<Record<string, number>>(() => baseWeights(fs));
  const [active, setActive] = useState<string | null>(null);
  const [srcFs, setSrcFs] = useState(fs);
  if (srcFs !== fs) {
    setSrcFs(fs);
    setWeights(baseWeights(fs));
    setActive(null);
  }
  const [periodState, setPeriodState] = useState<HealthPeriod>(defaultPeriod);
  const p: HealthPeriod = periodProp === "previous" || periodProp === "current" ? periodProp : periodState;

  const sh = shares(fs, weights);
  const v = calc(fs, sh.raw, p);
  const other = calc(fs, sh.raw, p === "current" ? "previous" : "current");
  const band = bandOf(v);
  const rounded = Math.round(v);
  const otherR = Math.round(other);
  const diff = p === "current" ? rounded - otherR : otherR - rounded;
  const sign = diff > 0 ? "▲ " : diff < 0 ? "▼ " : "";
  const prevLower = L.previous.toLowerCase();
  const deltaText =
    diff === 0 ? fill(L.same, { label: prevLower }) : fill(p === "current" ? L.vsPrev : L.vsNow, { delta: sign + Math.abs(diff), label: prevLower });
  const base = baseWeights(fs);
  const unchanged = fs.every((f) => weights[f.key] === base[f.key]);

  const emit = (reason: HealthScoreChange["reason"], w: Record<string, number>, period: HealthPeriod) => {
    if (!onScoreChange) return;
    const s = shares(fs, w);
    const val = Math.round(calc(fs, s.raw, period));
    onScoreChange({
      score: val,
      band: bandOf(val),
      period,
      current: Math.round(calc(fs, s.raw, "current")),
      previous: Math.round(calc(fs, s.raw, "previous")),
      weights: Object.fromEntries(fs.map((f, i) => [f.key, s.pct[i]])),
      reason,
    });
  };

  const choosePeriod = (next: HealthPeriod) => {
    if (next === p) return;
    if (periodProp === undefined) setPeriodState(next);
    onPeriodChange?.(next);
    emit("period", weights, next);
  };
  const reset = () => {
    const w = baseWeights(fs);
    setWeights(w);
    emit("reset", w, p);
  };

  // emit on release (native "change"), not on every input
  const latest = useRef({ weights, p, emit });
  latest.current = { weights, p, emit };
  const listRef = useRef<HTMLUListElement>(null);
  useEffect(() => {
    const ul = listRef.current;
    if (!ul) return;
    const onChange = (e: Event) => {
      if (!(e.target as HTMLElement).matches?.("input[type=range]")) return;
      const { weights: w, p: per, emit: em } = latest.current;
      em("weight", w, per);
    };
    ul.addEventListener("change", onChange);
    return () => ul.removeEventListener("change", onChange);
  }, []);

  /* ---------- dial animation ---------- */
  const target = clamp(v, 0, 100);
  const [shown, setShown] = useState(0);
  const shownRef = useRef(0);
  const animateNext = useRef(true);
  useEffect(() => {
    const from = shownRef.current;
    const set = (x: number) => {
      shownRef.current = x;
      setShown(x);
    };
    const animate = animateNext.current;
    animateNext.current = true;
    if (!animate || reduceMotion() || Math.abs(target - from) < 0.05) {
      set(target);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const dur = 520;
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);
    const tick = (now: number) => {
      const k = ease(Math.min(1, (now - t0) / dur));
      set(from + (target - from) * k);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  /* ---------- screen-reader announcement (debounced) ---------- */
  const [announce, setAnnounce] = useState("");
  const lastAnnounced = useRef<number | null>(null);
  useEffect(() => {
    if (lastAnnounced.current === rounded) return;
    const first = lastAnnounced.current === null;
    lastAnnounced.current = rounded;
    if (first) return;
    const t = setTimeout(() => setAnnounce(fill(L.dial, { score: rounded, band: L[band] })), 500);
    return () => clearTimeout(t);
  }, [rounded, band, L]);

  /* ---------- insight panel ---------- */
  const [swapN, setSwapN] = useState(0);
  const activate = (key: string | null) => {
    if (key === active) return;
    setActive(key);
    if (!reduceMotion()) setSwapN((n) => n + 1);
  };
  const onListLeave = () => {
    const el = document.activeElement?.closest?.("[data-key]") as HTMLElement | null;
    activate(el && listRef.current?.contains(el) ? el.dataset.key ?? null : null);
  };
  const onListBlur = (e: FocusEvent<HTMLUListElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) activate(null);
  };

  const af = fs.find((f) => f.key === active);
  let insight: { band?: HealthBand; name: string; val: string; about: ReactNode; note: ReactNode };
  if (af) {
    const s = p === "previous" ? af.previous : af.score;
    insight = { band: bandOf(s), name: af.name, val: `${Math.round(s)} · ${L[bandOf(s)]}`, about: af.about, note: (p === "previous" ? af.previousNote : af.note) || "" };
  } else {
    const gaps = fs.map((x, i) => {
      const s = p === "previous" ? x.previous : x.score;
      return { f: x, lost: (100 - s) * sh.raw[i], gain: s * sh.raw[i] };
    });
    const lift = gaps.slice().sort((a, c) => c.gain - a.gain)[0];
    const drag = gaps.filter((g) => gaps.length < 2 || g !== lift).sort((a, c) => c.lost - a.lost)[0];
    insight = {
      name: L.hintTitle,
      val: "",
      about: lift && (
        <>
          Biggest lift: <b>{lift.f.name}</b> adds {lift.gain.toFixed(1)} pts.
        </>
      ),
      note: drag && (
        <>
          Biggest drag: <b>{drag.f.name}</b> costs {drag.lost.toFixed(1)} pts. Hover or focus a factor for details.
        </>
      ),
    };
  }

  /* ---------- dial geometry ---------- */
  const ring = (from: number, to: number) => ({
    cx: 120,
    cy: 120,
    r: R,
    strokeDasharray: `${Math.max(0, ((to - from) / 100) * ARC)} ${C}`,
    strokeDashoffset: `${(-from / 100) * ARC}`,
    transform: `rotate(${START} 120 120)`,
  });
  const [kx, ky] = polar(shown, R);
  const og = clamp(other, 0, 100);
  const [g1x, g1y] = polar(og, R - 12);
  const [g2x, g2y] = polar(og, R + 12);

  const periods: { value: HealthPeriod; label: string; title?: string }[] = [
    { value: "current", label: L.current, title: fmtDate(asOf) },
    { value: "previous", label: L.previous, title: fmtDate(compareDate) },
  ];

  return (
    <div className={cx("@container/chs block w-full max-w-[960px] font-(family-name:--chs-sans) text-(--chs-ink)", className)}>
      <article className="relative overflow-hidden rounded-[22px] border border-(--chs-line) bg-(--chs-card) shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_32px_60px_-46px_var(--chs-shadow),0_2px_6px_-4px_var(--chs-shadow)] @max-[499px]/chs:rounded-[18px]">
        {/* header */}
        <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3.5 border-b border-(--chs-line) px-7 pt-6 pb-5 @max-[759px]/chs:px-[22px] @max-[759px]/chs:pt-[22px] @max-[759px]/chs:pb-[18px] @max-[499px]/chs:px-4 @max-[499px]/chs:pt-[18px] @max-[499px]/chs:pb-4">
          <div className="grid min-w-0 gap-1.5">
            <span className={capCls}>Client health</span>
            <h2 className="m-0 font-(family-name:--chs-display) text-[clamp(21px,3.4cqi,27px)] leading-[1.12] font-[650] tracking-[-0.02em] [overflow-wrap:anywhere]">
              {client || "Client"}
            </h2>
            {segment && <p className="m-0 text-[13px] text-(--chs-muted)">{segment}</p>}
          </div>
          <div role="group" aria-label={L.period} className="inline-flex rounded-full bg-(--chs-tint) p-[3px] shadow-[inset_0_0_0_1px_var(--chs-line)] @max-[499px]/chs:w-full">
            {periods.map((o) => (
              <button
                key={o.value}
                type="button"
                title={o.title}
                aria-pressed={o.value === p}
                onClick={() => choosePeriod(o.value)}
                className="cursor-pointer rounded-full border-0 bg-transparent px-3.5 py-2 text-[12.5px] leading-none font-semibold text-(--chs-muted) transition-[background-color,color,box-shadow] duration-250 ease-in-out hover:text-(--chs-ink) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--chs-good) aria-pressed:bg-(--chs-raise) aria-pressed:text-(--chs-ink) aria-pressed:shadow-[0_1px_3px_-1px_var(--chs-shadow),0_0_0_1px_var(--chs-line)] motion-reduce:transition-none @max-[499px]/chs:flex-1"
              >
                {o.label}
              </button>
            ))}
          </div>
        </header>

        {/* body */}
        <div className="grid grid-cols-[332px_minmax(0,1fr)] @max-[759px]/chs:grid-cols-1">
          <div
            className={cx(
              "grid content-start gap-5 border-r border-(--chs-line) bg-[linear-gradient(180deg,var(--chs-raise),var(--chs-card))] px-[26px] pt-6 pb-[26px]",
              "@max-[759px]/chs:grid-cols-[220px_minmax(0,1fr)] @max-[759px]/chs:items-center @max-[759px]/chs:gap-x-6 @max-[759px]/chs:gap-y-4 @max-[759px]/chs:border-r-0 @max-[759px]/chs:border-b @max-[759px]/chs:p-[22px]",
              "@max-[499px]/chs:grid-cols-1 @max-[499px]/chs:px-4 @max-[499px]/chs:py-[18px]",
              BAND_VARS[band]
            )}
          >
            {/* dial */}
            <div
              role="img"
              aria-label={`${fill(L.dial, { score: rounded, band: L[band] })} ${deltaText}.`}
              className="relative mx-auto aspect-square w-60 max-w-full @max-[759px]/chs:row-span-2 @max-[759px]/chs:w-[220px] @max-[499px]/chs:row-auto @max-[499px]/chs:w-[210px]"
            >
              <svg viewBox="0 0 240 240" aria-hidden="true" className="block size-full overflow-visible">
                <circle {...ring(0, 100)} fill="none" strokeWidth="16" strokeLinecap="round" className="stroke-(--chs-line)" />
                <circle {...ring(0, b.risk - 0.6)} fill="none" strokeWidth="16" opacity="0.3" className="stroke-(--chs-bad-fill)" />
                <circle {...ring(b.risk + 0.6, b.healthy - 0.6)} fill="none" strokeWidth="16" opacity="0.3" className="stroke-(--chs-warn-fill)" />
                <circle {...ring(b.healthy + 0.6, 100)} fill="none" strokeWidth="16" opacity="0.3" className="stroke-(--chs-good-fill)" />
                <circle
                  {...ring(0, 0)}
                  strokeDasharray={`${Math.max(0.001, (shown / 100) * ARC)} ${C}`}
                  fill="none"
                  strokeWidth="16"
                  strokeLinecap="round"
                  className="stroke-(--chs-c-fill) transition-[stroke] duration-350 ease-in-out motion-reduce:transition-none"
                />
                {[0, b.risk, b.healthy, 100].map((t) => {
                  const [x, y] = polar(t, R + 20);
                  return (
                    <text key={t} x={x.toFixed(1)} y={(y + 3.5).toFixed(1)} textAnchor="middle" className="fill-(--chs-faint) font-(family-name:--chs-mono) text-[10px] leading-none font-semibold">
                      {t}
                    </text>
                  );
                })}
                <line x1={g1x.toFixed(2)} y1={g1y.toFixed(2)} x2={g2x.toFixed(2)} y2={g2y.toFixed(2)} strokeWidth="2.5" strokeLinecap="round" opacity="0.55" className="stroke-(--chs-ink)" />
                <circle
                  r="9"
                  cx={kx.toFixed(2)}
                  cy={ky.toFixed(2)}
                  strokeWidth="4"
                  className="fill-(--chs-raise) stroke-(--chs-c-fill) transition-[stroke] duration-350 ease-in-out motion-reduce:transition-none"
                />
              </svg>
              <div aria-hidden="true" className="absolute inset-0 grid place-content-center justify-items-center gap-1.5 pt-1.5 text-center">
                <span className="font-(family-name:--chs-display) text-[64px] leading-[0.9] font-light tracking-[-0.04em] tabular-nums @max-[499px]/chs:text-[56px]">
                  <span>{Math.round(shown)}</span>
                  <small className="ml-0.5 font-(family-name:--chs-sans) text-sm leading-none font-medium tracking-normal text-(--chs-faint)">{L.of100}</small>
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-(--chs-c-bg) px-2.5 py-[5px] text-[12.5px] leading-none font-[650] text-(--chs-c) transition-[color,background-color] duration-350 ease-in-out before:size-[7px] before:rounded-full before:bg-current before:content-[''] motion-reduce:transition-none">
                  {L[band]}
                </span>
                <span className={cx("text-xs leading-[1.2] font-semibold tabular-nums", toneCls(diff))}>{deltaText}</span>
              </div>
            </div>

            <ul
              aria-hidden="true"
              className="m-0 -mt-1.5 flex list-none flex-wrap justify-center gap-x-3.5 gap-y-1.5 p-0 text-[11.5px] text-(--chs-muted) @max-[759px]/chs:m-0 @max-[759px]/chs:justify-start @max-[499px]/chs:justify-center"
            >
              {(
                [
                  ["healthy", `${L.healthy} ${b.healthy}+`],
                  ["risk", `${L.risk} ${b.risk}–${b.healthy - 1}`],
                  ["critical", `${L.critical} <${b.risk}`],
                ] as const
              ).map(([k, text]) => (
                <li key={k} className={cx("inline-flex items-center gap-1.5", BAND_VARS[k])}>
                  <i className="size-[9px] rounded-[3px] bg-(--chs-c-fill)" />
                  <span>{text}</span>
                </li>
              ))}
            </ul>

            <section
              key={swapN}
              className={cx(
                "grid min-h-[118px] content-start gap-2 rounded-2xl bg-(--chs-tint) px-4 pt-4 pb-[15px] shadow-[inset_0_0_0_1px_var(--chs-line)]",
                insight.band && BAND_VARS[insight.band],
                swapN > 0 && "animate-[chs-fade_0.3s_ease] motion-reduce:animate-none"
              )}
            >
              <div className="flex items-baseline justify-between gap-2.5">
                <h3 className="m-0 font-(family-name:--chs-display) text-[15px] leading-[1.25] font-[650]">{insight.name}</h3>
                {insight.val && <span className="text-[13px] leading-none font-semibold whitespace-nowrap text-(--chs-c) tabular-nums">{insight.val}</span>}
              </div>
              <p className="m-0 text-[13px] leading-normal text-(--chs-muted) [&_b]:font-semibold [&_b]:text-(--chs-ink)">{insight.about}</p>
              <p className="m-0 text-[13px] leading-normal text-(--chs-muted) [&_b]:font-semibold [&_b]:text-(--chs-ink)">{insight.note}</p>
            </section>
          </div>

          {/* factors */}
          <div className="grid min-w-0 content-start gap-1 px-7 pt-[22px] pb-6 @max-[759px]/chs:px-[22px] @max-[759px]/chs:pt-[18px] @max-[759px]/chs:pb-[22px] @max-[499px]/chs:px-4 @max-[499px]/chs:pt-3.5 @max-[499px]/chs:pb-[18px]">
            <div className="flex flex-wrap items-center justify-between gap-x-3.5 gap-y-2.5 pb-2.5">
              <div className="grid gap-[5px]">
                <h3 className="m-0 font-(family-name:--chs-display) text-base leading-[1.2] font-[650]">{L.factors}</h3>
                <span className="text-[12.5px] text-(--chs-muted)">{sh.zero ? L.allZero : L.factorsNote}</span>
              </div>
              <button
                type="button"
                onClick={reset}
                disabled={unchanged}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-(--chs-line) bg-(--chs-raise) px-3 py-2 text-xs leading-none font-semibold text-(--chs-muted) transition-[color,border-color,opacity] duration-200 ease-in-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--chs-good) enabled:hover:border-(--chs-faint) enabled:hover:text-(--chs-ink) disabled:cursor-default disabled:opacity-50 motion-reduce:transition-none"
              >
                <ResetIcon />
                <span>{L.reset}</span>
              </button>
            </div>

            <ul
              ref={listRef}
              onPointerLeave={onListLeave}
              onBlur={onListBlur}
              className="m-0 grid list-none p-0"
            >
              {fs.map((f, i) => {
                const s = p === "previous" ? f.previous : f.score;
                const o = p === "previous" ? f.score : f.previous;
                const fb = bandOf(s);
                const dd = Math.round(f.score) - Math.round(f.previous);
                const w = weights[f.key] ?? 0;
                const isActive = active === f.key;
                const hideLine = i === 0 || isActive || active === fs[i - 1]?.key;
                const id = `${uid}-w-${f.key}`;
                return (
                  <li
                    key={f.key}
                    data-key={f.key}
                    onPointerOver={() => activate(f.key)}
                    onFocus={() => activate(f.key)}
                    className={cx(
                      "relative -mx-3.5 grid gap-[9px] rounded-[14px] px-3.5 pt-3.5 pb-[13px] transition-[background-color] duration-250 ease-in-out motion-reduce:transition-none",
                      "before:absolute before:top-0 before:right-3.5 before:left-3.5 before:h-px before:bg-(--chs-line) before:content-['']",
                      "@max-[499px]/chs:-mx-2.5 @max-[499px]/chs:px-2.5 @max-[499px]/chs:pt-[13px] @max-[499px]/chs:pb-3 @max-[499px]/chs:before:right-2.5 @max-[499px]/chs:before:left-2.5",
                      hideLine && "before:opacity-0",
                      isActive && "bg-(--chs-tint)",
                      BAND_VARS[fb]
                    )}
                  >
                    <div className="flex items-baseline justify-between gap-2.5">
                      <div className="flex min-w-0 flex-wrap items-baseline gap-2">
                        <b className="text-[14.5px] leading-[1.25] font-semibold">{f.name}</b>
                        <span className="font-(family-name:--chs-mono) text-[11px] leading-none font-semibold text-(--chs-faint) tabular-nums">{sh.pct[i]}%</span>
                      </div>
                      <div className="flex flex-none items-baseline gap-[9px] tabular-nums">
                        <span className={cx("min-w-[3.4em] text-right text-[11.5px] leading-none font-semibold", p === "current" ? toneCls(dd) : "text-(--chs-muted)")}>
                          {p === "current" ? (dd === 0 ? "±0" : `${dd > 0 ? "▲" : "▼"} ${Math.abs(dd)}`) : fill(L.now, { n: Math.round(f.score) })}
                        </span>
                        <span className="font-(family-name:--chs-display) text-[19px] leading-none font-[650] text-(--chs-c) transition-colors duration-300 ease-in-out motion-reduce:transition-none">
                          {Math.round(s)}
                        </span>
                      </div>
                    </div>
                    <div
                      aria-hidden="true"
                      className="relative h-2 overflow-hidden rounded-full bg-[linear-gradient(90deg,var(--chs-bad-bg)_0_40%,var(--chs-warn-bg)_40%_70%,var(--chs-good-bg)_70%_100%)]"
                    >
                      <span
                        style={{ width: `${s.toFixed(1)}%` }}
                        className="absolute inset-y-0 left-0 rounded-[inherit] bg-(--chs-c-fill) transition-[width,background-color] duration-[450ms,350ms] ease-out-soft motion-reduce:transition-none"
                      />
                      <span
                        style={{ left: `${o.toFixed(1)}%` }}
                        className="absolute inset-y-0 -ml-px w-0.5 bg-(--chs-ink) opacity-50 transition-[left] duration-[450ms] ease-out-soft motion-reduce:transition-none"
                      />
                    </div>
                    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 @max-[499px]/chs:grid-cols-[minmax(0,1fr)_auto] @max-[499px]/chs:gap-y-1">
                      <label
                        htmlFor={id}
                        className="text-[11.5px] leading-none font-semibold tracking-[0.08em] whitespace-nowrap text-(--chs-faint) [font-variant:all-small-caps] @max-[499px]/chs:col-span-full"
                      >
                        {L.weight}
                      </label>
                      <input
                        id={id}
                        type="range"
                        min={0}
                        max={10}
                        step={1}
                        value={w}
                        aria-label={`${L.weight} for ${f.name}`}
                        aria-valuetext={`${w} of 10, ${sh.pct[i]}% of the score`}
                        onChange={(e) => {
                          const next = clamp(Math.round(Number(e.target.value)), 0, 10);
                          animateNext.current = false;
                          setWeights((prev) => ({ ...prev, [f.key]: next }));
                        }}
                        style={{ "--chs-p": String(w * 10) } as CSSProperties}
                        className={RANGE}
                      />
                      <span className="min-w-[9.5em] text-right text-xs leading-none font-medium whitespace-nowrap text-(--chs-muted) tabular-nums @max-[499px]/chs:min-w-0">
                        <b className="font-[650] text-(--chs-ink)">{fill(L.pts, { pts: (s * sh.raw[i]).toFixed(1) })}</b> {L.ofScore}
                      </span>
                    </div>
                    <span className="sr-only">
                      {f.name}: {Math.round(s)} out of 100, {L[fb]}. Counts for {sh.pct[i]}% of the score.
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-2 mb-0 text-xs leading-[1.45] text-(--chs-faint)">{fill(L.foot, { h: b.healthy, r: b.risk, h1: b.healthy - 1 })}</p>
          </div>
        </div>
        <p className="sr-only" aria-live="polite">
          {announce}
        </p>
      </article>
    </div>
  );
}

export default ClientHealthScore;
