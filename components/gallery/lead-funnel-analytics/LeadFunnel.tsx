"use client";

import { useEffect, useRef, useState, type CSSProperties, type FocusEvent } from "react";
import { cx } from "@/lib/format";

export type FunnelScale = "sqrt" | "linear";

export interface FunnelStage {
  label: string;
  count: number;
}

/** The previous period, for the change in the overall rate. */
export interface FunnelCompare {
  /** e.g. "last quarter". */
  label?: string;
  /** Counts in the same stage order. */
  stages: number[];
}

/** Every piece of UI text. `{name}` placeholders are filled in. */
export interface FunnelLabels {
  overall: string;
  /** Uses {last}, {first}, {firstLabel}. */
  overallSub: string;
  drop: string;
  /** Uses {pct}. */
  dropSub: string;
  best: string;
  /** Uses {pct}. */
  bestSub: string;
  /** Uses {pct}, {firstLabel}. */
  share: string;
  moved: string;
  /** Uses {n}. */
  dropped: string;
  /** Uses {label}. */
  vs: string;
  pts: string;
  scaleSqrt: string;
  scaleLinear: string;
}

export interface LeadFunnelProps {
  /** Stages in funnel order. Two or more; four is typical. */
  stages: FunnelStage[];
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  /** Date-range text, shown top right. */
  period?: string;
  /** Previous period. Adds a change in points to the overall rate. */
  compare?: FunnelCompare;
  /** Footer note, e.g. where the data comes from. */
  source?: string;
  /** `sqrt` keeps small stages readable; `linear` draws bars exactly to scale. */
  scale?: FunnelScale;
  /** Number formatting locale. */
  locale?: string;
  /** Override any built-in text. */
  labels?: Partial<FunnelLabels>;
  /** Change this value to re-run the entry animation. */
  replayKey?: number | string;
  className?: string;
}

export const DEFAULT_FUNNEL_LABELS: FunnelLabels = {
  overall: "Overall conversion",
  overallSub: "{last} of {first} {firstLabel}",
  drop: "Biggest drop-off",
  dropSub: "{pct} didn't continue",
  best: "Strongest step",
  bestSub: "{pct} moved on",
  share: "{pct} of {firstLabel}",
  moved: "moved on",
  dropped: "{n} dropped",
  vs: "vs {label}",
  pts: "pts",
  scaleSqrt: "Bar widths use a square-root scale so smaller stages stay readable.",
  scaleLinear: "Bar widths are drawn to scale.",
};

const fill = (s: string, vars: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ""));
const reduceMotion = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const ease = (t: number) => 1 - Math.pow(1 - t, 3);

const CalendarIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true" className="size-[13px] text-(--lfa-faint)">
    <rect x="2.5" y="3.5" width="11" height="10" rx="2" />
    <path d="M2.5 6.5h11M5.5 2v3M10.5 2v3" />
  </svg>
);

const DownIcon = () => (
  <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-[11px] text-(--c)">
    <path d="M6 2v8M2.8 6.8 6 10l3.2-3.2" />
  </svg>
);

const kpiLabel = "font-(family-name:--lfa-mono) text-[10.5px] leading-[1.2] font-medium tracking-[0.09em] text-(--lfa-faint) uppercase";

/**
 * Visitors to leads to booked calls to sales. Each stage shows its count and
 * conversion rate; a summary picks out the overall rate and the biggest drop-off.
 */
export function LeadFunnel({
  stages: stagesProp,
  eyebrow,
  title,
  subtitle,
  period,
  compare,
  source,
  scale = "sqrt",
  locale = "en-US",
  labels,
  replayKey,
  className,
}: LeadFunnelProps) {
  const L: FunnelLabels = { ...DEFAULT_FUNNEL_LABELS, ...labels };
  const cardRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const firstRun = useRef(true);
  const [pending, setPending] = useState(true);
  const [snap, setSnap] = useState(false);
  const [k, setK] = useState<number | null>(null);
  const [active, setActive] = useState<number | null>(null);

  const int = (v: number) => Math.round(v).toLocaleString(locale);
  const pct = (r: number | null) => {
    if (r == null || !Number.isFinite(r)) return "—";
    const p = r * 100;
    return `${p === 100 || p === 0 ? String(p) : p.toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
  };

  // entry reveal: bars grow out from the centre, then the flows and rates fade in
  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    if (reduceMotion()) {
      setPending(false);
      setSnap(false);
      return;
    }
    let raf = 0;
    let io: IntersectionObserver | undefined;
    const countUp = () => {
      const t0 = performance.now();
      const tick = (now: number) => {
        const e = ease(Math.min(1, (now - t0) / 900));
        setK(e < 1 ? e : null);
        if (e < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    const go = () => {
      raf = requestAnimationFrame(() => {
        setSnap(false);
        setPending(false);
        countUp();
      });
    };
    if (firstRun.current) {
      firstRun.current = false;
      if (typeof IntersectionObserver === "undefined") go();
      else {
        io = new IntersectionObserver(
          (entries) => {
            if (entries.some((en) => en.isIntersecting)) {
              io?.disconnect();
              go();
            }
          },
          { threshold: 0.2 }
        );
        io.observe(card);
      }
    } else {
      // replay: snap back to the start without transitions, then run again
      setSnap(true);
      setPending(true);
      raf = requestAnimationFrame(() => {
        raf = requestAnimationFrame(go);
      });
    }
    return () => {
      io?.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [replayKey]);

  const stages = stagesProp.map((s, i) => ({ label: s?.label || `Stage ${i + 1}`, count: Math.max(0, Number.isFinite(s?.count) ? s.count : 0) }));
  const n = stages.length;
  const first = n ? stages[0].count : 0;
  const last = n ? stages[n - 1].count : 0;
  const firstLabel = n ? stages[0].label.toLowerCase() : "";

  // step conversion: each stage against the one before
  const steps = stages.slice(1).map((s, i) => {
    const prev = stages[i].count;
    return { from: stages[i].label, to: s.label, rate: prev > 0 ? s.count / prev : null, lost: Math.max(0, prev - s.count) };
  });

  const overall = first > 0 && n > 1 ? last / first : null;

  let delta: { tone: "good" | "bad" | "flat"; text: string } | null = null;
  const prev = compare && Array.isArray(compare.stages) ? compare.stages.map((v) => (Number.isFinite(v) ? v : null)) : null;
  if (overall != null && prev && prev.length === n && (prev[0] ?? 0) > 0 && prev[n - 1] != null) {
    const r = Math.round((overall - (prev[n - 1] as number) / (prev[0] as number)) * 100 * 10) / 10;
    delta = {
      tone: r > 0 ? "good" : r < 0 ? "bad" : "flat",
      text: `${r > 0 ? "▲" : r < 0 ? "▼" : "▶"} ${Math.abs(r).toFixed(1)} ${L.pts} ${fill(L.vs, { label: compare?.label || "" })}`.trim(),
    };
  }

  const rated = steps.filter((s): s is (typeof steps)[number] & { rate: number } => s.rate != null);
  const worst = rated.reduce<(typeof rated)[number] | null>((a, s) => (!a || s.rate < a.rate ? s : a), null);
  const best = rated.reduce<(typeof rated)[number] | null>((a, s) => (!a || s.rate > a.rate ? s : a), null);

  const width = (c: number) => {
    if (!(first > 0) || !(c > 0)) return 2;
    const r = c / first;
    // linear keeps a 1% sliver so tiny stages stay visible; sqrt floors at 4%
    return scale === "linear" ? Math.max(1, r * 100) : Math.max(4, Math.sqrt(r) * 100);
  };
  const widths = stages.map((s) => width(s.count));

  const counting = k != null;
  const bigText = overall == null ? "—" : pct(counting ? overall * (k as number) : overall);

  const onLeave = () => {
    const el = document.activeElement;
    const li = el instanceof HTMLElement && listRef.current?.contains(el) ? el.closest<HTMLElement>("[data-stage]") : null;
    setActive(li ? Number(li.dataset.stage) : null);
  };
  const onBlur = (e: FocusEvent<HTMLOListElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setActive(null);
  };

  return (
    <div className={cx("@container block w-full max-w-[900px] font-(family-name:--lfa-sans) text-(--lfa-ink)", className)}>
      <article
        ref={cardRef}
        className="relative overflow-hidden rounded-2xl border border-(--lfa-line) bg-(--lfa-card) px-7 pt-7 pb-[18px] shadow-[0_26px_52px_-40px_var(--lfa-shadow),0_2px_6px_-4px_var(--lfa-shadow)] before:absolute before:inset-x-0 before:top-0 before:h-[3px] before:bg-[linear-gradient(90deg,var(--lfa-from),var(--lfa-to))] before:content-[''] @max-[700px]:px-[22px] @max-[700px]:pt-6 @max-[700px]:pb-4 @max-[480px]:px-4 @max-[480px]:pt-[22px] @max-[480px]:pb-3.5"
      >
        {/* header */}
        <header className="flex flex-wrap items-start justify-between gap-x-5 gap-y-3">
          <div className="grid min-w-0 gap-1.5">
            {eyebrow && <span className="font-(family-name:--lfa-mono) text-[10.5px] leading-none font-medium tracking-[0.1em] text-(--lfa-accent) uppercase">{eyebrow}</span>}
            {title && <h2 className="m-0 text-[clamp(19px,3.2cqi,24px)] leading-[1.2] font-semibold tracking-[-0.012em] text-balance">{title}</h2>}
            {subtitle && <p className="m-0 text-[13.5px] text-(--lfa-muted)">{subtitle}</p>}
          </div>
          {period && (
            <span className="inline-flex flex-none items-center gap-2 rounded-lg border border-(--lfa-line) bg-(--lfa-tint) px-[11px] py-[7px] text-[12.5px] leading-none font-medium text-(--lfa-muted) tabular-nums">
              <CalendarIcon />
              {period}
            </span>
          )}
        </header>

        {/* performance summary */}
        <dl className="mt-[22px] mb-2 grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)] border-y border-(--lfa-line) py-4 @max-[700px]:grid-cols-2 @max-[700px]:gap-y-3.5 @max-[480px]:grid-cols-1">
          <div className="m-0 grid min-w-0 content-start gap-1.5 pr-5 @max-[700px]:col-span-full @max-[700px]:px-0">
            <dt className={kpiLabel}>{L.overall}</dt>
            <dd className="m-0 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
              <span className="font-(family-name:--lfa-num) text-[clamp(34px,6.4cqi,46px)] leading-none font-semibold tracking-[-0.02em] text-(--lfa-accent) tabular-nums">
                {bigText}
              </span>
              {delta && (
                <span
                  className={cx(
                    "inline-flex items-center gap-1 rounded-md px-[7px] py-1 text-[11.5px] leading-none font-semibold tabular-nums",
                    delta.tone === "good" && "bg-[color-mix(in_oklab,var(--lfa-good)_12%,transparent)] text-(--lfa-good)",
                    delta.tone === "bad" && "bg-[color-mix(in_oklab,var(--lfa-bad)_12%,transparent)] text-(--lfa-bad)",
                    delta.tone === "flat" && "bg-(--lfa-tint) text-(--lfa-muted)"
                  )}
                >
                  {delta.text}
                </span>
              )}
            </dd>
            {n > 1 && (
              <dd className="m-0 text-[12.5px] leading-[1.35] text-(--lfa-muted) tabular-nums">
                {fill(L.overallSub, { last: int(last), first: int(first), firstLabel })}
              </dd>
            )}
          </div>
          {[
            { k: L.drop, step: worst, sub: worst ? fill(L.dropSub, { pct: pct(1 - worst.rate) }) : "" },
            { k: L.best, step: best, sub: best ? fill(L.bestSub, { pct: pct(best.rate) }) : "" },
          ].map((item, i) => (
            <div
              key={i}
              className={cx(
                "m-0 grid min-w-0 content-start gap-1.5 border-l border-(--lfa-line) px-5 @max-[700px]:border-t @max-[700px]:pt-3.5 @max-[480px]:border-l-0 @max-[480px]:pl-0",
                i === 0 && "@max-[700px]:border-l-0 @max-[700px]:pl-0"
              )}
            >
              <dt className={kpiLabel}>{item.k}</dt>
              <dd className="m-0 text-[15px] leading-[1.3] font-semibold [overflow-wrap:anywhere]">{item.step ? `${item.step.from} → ${item.step.to}` : "—"}</dd>
              {item.sub && <dd className="m-0 text-[12.5px] leading-[1.35] text-(--lfa-muted) tabular-nums">{item.sub}</dd>}
            </div>
          ))}
        </dl>

        {/* funnel */}
        <ol ref={listRef} className="m-0 grid list-none p-0" onPointerLeave={onLeave} onBlur={onBlur}>
          {stages.map((s, i) => {
            const t = n > 1 ? (i / (n - 1)) * 100 : 100;
            const share = first > 0 ? s.count / first : null;
            const st = i > 0 ? steps[i - 1] : null;
            const isActive = active === i;
            const dim = active != null && !isActive;
            const parts = [`${s.label}: ${int(s.count)}`];
            if (i > 0) parts.push(fill(L.share, { pct: pct(share), firstLabel }));
            if (st) parts.push(`${pct(st.rate)} of ${st.from.toLowerCase()} ${L.moved}, ${fill(L.dropped, { n: int(st.lost) })}`);
            const a = i > 0 ? (100 - widths[i - 1]) / 2 : 0;
            const c = (100 - widths[i]) / 2;
            const style = { "--c": `color-mix(in oklab, var(--lfa-from), var(--lfa-to) ${t.toFixed(1)}%)`, "--i": i } as CSSProperties;

            return (
              <li
                key={i}
                data-stage={i}
                tabIndex={0}
                style={style}
                onPointerOver={() => setActive(i)}
                onFocus={() => setActive(i)}
                className={cx(
                  "group/stage grid grid-cols-[150px_minmax(0,1fr)_136px] items-center gap-x-5 rounded-xl outline-none [grid-template-areas:'._link_.'_'label_track_figs'] transition-opacity duration-300 motion-reduce:transition-none",
                  "@max-[700px]:grid-cols-[112px_minmax(0,1fr)_100px] @max-[700px]:gap-x-3.5",
                  "@max-[480px]:grid-cols-[minmax(0,1fr)_auto] @max-[480px]:gap-y-1.5 @max-[480px]:[grid-template-areas:'label_figs'_'link_link'_'track_track']",
                  i === 0 ? "pt-3.5" : "@max-[480px]:pt-3.5",
                  dim && "opacity-[.42]"
                )}
              >
                {st && (
                  <div aria-hidden="true" className="relative grid h-10 place-items-center [grid-area:link] @max-[480px]:h-[30px]">
                    <span
                      style={{ clipPath: `polygon(${a}% 0, ${100 - a}% 0, ${100 - c}% 100%, ${c}% 100%)` }}
                      className={cx(
                        "absolute inset-0 [transition:clip-path_.7s_cubic-bezier(.2,.7,.2,1),background-color_.3s_ease,opacity_.5s_ease_calc(var(--i)*90ms+250ms)] motion-reduce:transition-none",
                        isActive ? "bg-[color-mix(in_oklab,var(--c)_32%,transparent)]" : "bg-[color-mix(in_oklab,var(--c)_18%,transparent)]",
                        pending && "opacity-0 print:opacity-100",
                        snap && "transition-none!"
                      )}
                    />
                    <span
                      className={cx(
                        "relative inline-flex items-center gap-[5px] rounded-full bg-(--lfa-card) py-[5px] pr-[9px] pl-[7px] text-xs leading-none font-semibold whitespace-nowrap text-(--lfa-ink) tabular-nums shadow-[0_0_0_1px_var(--lfa-line),0_6px_14px_-10px_var(--lfa-shadow)] [transition:opacity_.4s_ease_calc(var(--i)*90ms+350ms),transform_.4s_ease_calc(var(--i)*90ms+350ms)] motion-reduce:transition-none",
                        pending && "translate-y-1 opacity-0 print:translate-y-0 print:opacity-100",
                        snap && "transition-none!"
                      )}
                    >
                      <DownIcon />
                      <b>{pct(st.rate)}</b>
                      <span
                        className={cx(
                          "inline-block overflow-hidden font-medium text-(--lfa-muted) [transition:max-width_.45s_cubic-bezier(.2,.7,.2,1),opacity_.3s_ease] motion-reduce:transition-none",
                          isActive ? "max-w-[18em] opacity-100" : "max-w-0 opacity-0"
                        )}
                      >
                        {` ${L.moved} · ${fill(L.dropped, { n: int(st.lost) })}`}
                      </span>
                    </span>
                  </div>
                )}

                <div aria-hidden="true" className={cx("flex min-w-0 items-center gap-2.5 [grid-area:label]", i === 0 && "@max-[480px]:mb-1")}>
                  <span
                    className={cx(
                      "flex-none rounded-md px-1.5 py-[5px] font-(family-name:--lfa-mono) text-[10.5px] leading-none font-medium transition-colors duration-300 motion-reduce:transition-none",
                      isActive ? "bg-[color-mix(in_oklab,var(--c)_22%,transparent)] text-(--lfa-ink) shadow-[inset_0_0_0_1px_var(--c)]" : "bg-(--lfa-tint) text-(--lfa-faint)"
                    )}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-[15px] leading-[1.2] font-semibold [overflow-wrap:anywhere]">{s.label}</span>
                </div>

                <div
                  aria-hidden="true"
                  className="relative flex h-[46px] items-center justify-center rounded-xl [grid-area:track] before:absolute before:inset-x-0 before:top-1/2 before:h-px before:bg-[linear-gradient(to_right,var(--lfa-line)_50%,transparent_0)] before:bg-size-[6px_1px] before:content-[''] group-focus-visible/stage:outline-2 group-focus-visible/stage:outline-offset-4 group-focus-visible/stage:outline-(--lfa-accent) @max-[480px]:h-[38px]"
                >
                  <span
                    style={{ width: `${widths[i].toFixed(2)}%` }}
                    className={cx(
                      "relative h-full rounded-[10px] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--c),#fff_16%),var(--c))] [transition:width_.7s_cubic-bezier(.2,.7,.2,1),transform_.9s_cubic-bezier(.2,.8,.2,1)_calc(var(--i)*90ms),opacity_.4s_ease_calc(var(--i)*90ms),box-shadow_.3s_ease,filter_.3s_ease] motion-reduce:transition-none",
                      isActive
                        ? "shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_10px_22px_-12px_var(--c)] saturate-[1.12] brightness-[1.04]"
                        : "shadow-[inset_0_1px_0_rgba(255,255,255,0.28)]",
                      pending && "scale-x-0 opacity-0 print:scale-x-100 print:opacity-100",
                      snap && "transition-none!"
                    )}
                  />
                </div>

                <div
                  aria-hidden="true"
                  className={cx(
                    "grid justify-items-end gap-[5px] text-right [grid-area:figs] @max-[480px]:grid-flow-col @max-[480px]:items-baseline @max-[480px]:gap-2",
                    i === 0 && "@max-[480px]:mb-1"
                  )}
                >
                  <span className="font-(family-name:--lfa-num) text-[26px] leading-none font-semibold tracking-[-0.01em] tabular-nums @max-[700px]:text-[22px] @max-[480px]:text-xl">
                    {int(counting ? s.count * (k as number) : s.count)}
                  </span>
                  <span className="text-xs leading-[1.2] text-(--lfa-muted) tabular-nums">{i === 0 ? "100%" : fill(L.share, { pct: pct(share), firstLabel })}</span>
                </div>

                <span className="sr-only">{`${parts.join(". ")}.`}</span>
              </li>
            );
          })}
        </ol>

        <footer className="mt-[18px] flex flex-wrap justify-between gap-x-4 gap-y-1.5 border-t border-dashed border-(--lfa-line) pt-3 text-xs text-(--lfa-faint)">
          <span>{scale === "linear" ? L.scaleLinear : L.scaleSqrt}</span>
          {source && <span>{source}</span>}
        </footer>
      </article>
    </div>
  );
}

export default LeadFunnel;
