"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { cx, dayLabel, formatMoney, formatNumber, MONTHS, parseISODate, trimZeros } from "@/lib/format";

export type CampaignStatus = "active" | "learning" | "paused" | "ended";

export interface CampaignDeltas {
  spend?: number;
  results?: number;
  cost?: number;
  ctr?: number;
  roas?: number;
}

export interface CampaignSnapshotProps {
  /** Campaign name. */
  name: string;
  /** Ad platform, e.g. "Meta Ads". Its first letter becomes the badge. */
  platform: string;
  status?: CampaignStatus;
  /** Start date, YYYY-MM-DD. */
  start?: string;
  /** End date, YYYY-MM-DD. */
  end?: string;
  /** Any ISO currency code. */
  currency?: string;
  /** Total spend. */
  spend: number;
  /** Lead or conversion count. */
  results: number;
  /** What a result is called, e.g. "Leads" or "Purchases". */
  resultLabel?: string;
  /** Cost per result. Worked out as spend ÷ results when left out. */
  cost?: number;
  /** Label for the cost metric. Defaults to CPL for leads, CPA otherwise. */
  costLabel?: string;
  /** Click-through rate in percent. */
  ctr?: number;
  /** Return on ad spend as a multiple (4.2 = 4.2×). */
  roas?: number;
  /** Daily results for the chart, oldest first. */
  series?: number[];
  /** % change vs the previous period. A lower cost shows as good. */
  deltas?: CampaignDeltas;
  className?: string;
}

const STATUS_LABEL: Record<CampaignStatus, string> = { active: "Active", learning: "Learning", paused: "Paused", ended: "Ended" };
const STATUS_COLOR: Record<CampaignStatus, string> = {
  active: "[--c:var(--cps-st-active)]",
  learning: "[--c:var(--cps-st-learning)]",
  paused: "[--c:var(--cps-st-paused)]",
  ended: "[--c:var(--cps-st-ended)]",
};
/** Which direction counts as an improvement (0 = neutral). */
const BETTER: Record<keyof CampaignDeltas, number> = { spend: 0, results: 1, cost: -1, ctr: 1, roas: 1 };

function formatRange(a: Date | null, b: Date | null): string {
  if (!a) return "";
  if (!b) return `From ${dayLabel(a)} ${a.getUTCFullYear()}`;
  const sameY = a.getUTCFullYear() === b.getUTCFullYear();
  const sameM = sameY && a.getUTCMonth() === b.getUTCMonth();
  if (sameM) return `${a.getUTCDate()}–${b.getUTCDate()} ${MONTHS[b.getUTCMonth()]} ${b.getUTCFullYear()}`;
  if (sameY) return `${dayLabel(a)} – ${dayLabel(b)} ${b.getUTCFullYear()}`;
  return `${dayLabel(a)} ${a.getUTCFullYear()} – ${dayLabel(b)} ${b.getUTCFullYear()}`;
}

const mono = "font-(family-name:--cps-mono) text-[10.5px] leading-[1.2] font-medium tracking-[0.09em] uppercase";

function Delta({ k, value, onHero }: { k: keyof CampaignDeltas; value?: number; onHero?: boolean }) {
  if (value == null || !Number.isFinite(value)) return null;
  const dir = Math.sign(value);
  const better = BETTER[k];
  const tone = !dir || !better ? "neutral" : dir === better ? "good" : "bad";
  const color = onHero
    ? { good: "text-(--cps-st-active)", bad: "text-[#ff9a8c]", neutral: "text-(--cps-hero-muted)" }[tone]
    : { good: "text-(--cps-good)", bad: "text-(--cps-bad)", neutral: "text-(--cps-faint)" }[tone];
  const arrow = dir > 0 ? "↑" : dir < 0 ? "↓" : "→";
  return (
    <dd
      className={cx("m-0 inline-flex items-baseline gap-[5px] text-xs leading-[1.2] font-medium tabular-nums", color, onHero && "text-[12.5px]")}
      aria-label={`${dir > 0 ? "Up" : dir < 0 ? "Down" : "Flat"} ${Math.abs(value)}% versus previous period`}
    >
      <span aria-hidden="true">{arrow}</span>
      <span>{trimZeros(Math.abs(value).toFixed(1))}%</span>
      <small className={cx("text-[11px] font-normal", onHero ? "text-(--cps-hero-muted)" : "text-(--cps-faint)")}>vs prev. period</small>
    </dd>
  );
}

/** Daily results line chart with pointer and keyboard read-out. */
function ResultsChart({ series, start, resultLabel }: { series: number[]; start: Date | null; resultLabel: string }) {
  const plot = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 320, h: 96 });
  const [hi, setHi] = useState<number | null>(null);
  const [tipX, setTipX] = useState(0);
  const lower = resultLabel.toLowerCase();

  useEffect(() => {
    const el = plot.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth || 320, h: el.clientHeight || 96 });
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const day = (i: number) => (start ? dayLabel(new Date(start.getTime() + i * 864e5)) : `Day ${i + 1}`);
  const { w, h } = size;
  const n = series.length;
  const top = 20, bot = 5, px = 6;
  const max = Math.max(...series, 1);
  const X = (i: number) => (n === 1 ? w / 2 : px + (i * (w - 2 * px)) / (n - 1));
  const Y = (v: number) => top + (1 - v / max) * (h - top - bot);
  const base = h - bot;
  const line = series.map((v, i) => `${i ? "L" : "M"}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join("");
  const area = `${line}L${X(n - 1).toFixed(1)},${base}L${X(0).toFixed(1)},${base}Z`;
  const pk = series.indexOf(max);
  const pkX = X(pk);
  const anchor = pkX < 44 ? "start" : pkX > w - 44 ? "end" : "middle";
  const total = series.reduce((t, v) => t + v, 0);
  const lastDay = start && n ? new Date(start.getTime() + (n - 1) * 864e5) : null;

  // keep the tooltip inside the plot
  useEffect(() => {
    if (hi == null) return;
    const half = (tipRef.current?.offsetWidth ?? 0) / 2;
    setTipX(Math.max(half, Math.min(w - half, X(hi))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hi, w, n]);

  const idx = (e: PointerEvent<HTMLDivElement>) => {
    const x = e.clientX - e.currentTarget.getBoundingClientRect().left;
    return Math.max(0, Math.min(n - 1, Math.round(((x - px) / (w - 2 * px)) * (n - 1))));
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const cur = hi ?? n - 1;
    const next =
      e.key === "ArrowLeft" ? Math.max(0, cur - 1) : e.key === "ArrowRight" ? Math.min(n - 1, cur + 1) : e.key === "Home" ? 0 : e.key === "End" ? n - 1 : null;
    if (next != null) {
      e.preventDefault();
      setHi(next);
    }
  };

  return (
    <figure className="m-0 grid gap-2">
      <figcaption className="flex items-baseline justify-between gap-2.5">
        <span className={cx(mono, "text-(--cps-faint)")}>Daily {lower}</span>
        <span className="text-[12.5px] leading-none font-medium text-(--cps-muted) tabular-nums">
          {formatNumber(total)} across {n} days
        </span>
      </figcaption>
      <div
        ref={plot}
        tabIndex={0}
        role="img"
        aria-label={`Daily ${lower} chart. Use arrow keys to step through days.`}
        onPointerMove={(e) => setHi(idx(e))}
        onPointerDown={(e) => setHi(idx(e))}
        onPointerLeave={(e) => document.activeElement !== e.currentTarget && setHi(null)}
        onFocus={() => setHi(n - 1)}
        onBlur={() => setHi(null)}
        onKeyDown={onKey}
        className="relative h-24 cursor-crosshair touch-pan-y rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--cps-series)"
      >
        <svg aria-hidden="true" focusable="false" viewBox={`0 0 ${w} ${h}`} className="block size-full overflow-visible">
          <line x1="0" x2={w} y1={base} y2={base} className="stroke-(--cps-line)" strokeWidth="1" />
          <path d={area} className="fill-(--cps-series-soft)" />
          <path d={line} className="fill-none stroke-(--cps-series)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          {pk !== n - 1 && <circle cx={pkX} cy={Y(max)} r="3" className="fill-(--cps-card) stroke-(--cps-series)" strokeWidth="1.5" />}
          <text x={pkX} y={Y(max) - 9} textAnchor={anchor} className="fill-(--cps-muted) font-(family-name:--cps-mono) text-[10.5px] font-medium">
            Peak {max}
          </text>
          <circle cx={X(n - 1)} cy={Y(series[n - 1])} r="4.5" className="fill-(--cps-series) stroke-(--cps-card)" strokeWidth="2" />
          {hi != null && (
            <g>
              <line x1={X(hi)} x2={X(hi)} y1={top - 8} y2={base} className="stroke-(--cps-faint)" strokeWidth="1" strokeDasharray="2 3" />
              <circle cx={X(hi)} cy={Y(series[hi])} r="4.5" className="fill-(--cps-series) stroke-(--cps-card)" strokeWidth="2" />
            </g>
          )}
        </svg>
        {hi != null && (
          <div
            ref={tipRef}
            style={{ left: tipX }}
            className="pointer-events-none absolute -top-2 -translate-x-1/2 -translate-y-full rounded-md bg-(--cps-ink) px-[9px] py-[7px] text-xs leading-none font-medium whitespace-nowrap text-(--cps-card) tabular-nums shadow-[0_6px_16px_-8px_var(--cps-shadow)]"
          >
            {day(hi)} · <b className="font-[650]">{formatNumber(series[hi])}</b> {lower}
          </div>
        )}
      </div>
      <div className={cx(mono, "flex justify-between text-(--cps-faint)")}>
        <span>{start ? dayLabel(start) : "Day 1"}</span>
        <span>{lastDay ? dayLabel(lastDay) : `Day ${n}`}</span>
      </div>
      <table className="sr-only">
        <caption>Daily {lower}</caption>
        <tbody>
          {series.map((v, i) => (
            <tr key={i}>
              <th>{day(i)}</th>
              <td>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/**
 * Ad performance at a glance: ROAS set against spend, next to spend, results,
 * CPL/CPA and CTR, with a daily results chart you can hover or step through.
 */
export function CampaignSnapshot({
  name,
  platform,
  status = "active",
  start,
  end,
  currency = "USD",
  spend,
  results,
  resultLabel = "Conversions",
  cost: costProp,
  costLabel: costLabelProp,
  ctr,
  roas,
  series = [],
  deltas = {},
  className,
}: CampaignSnapshotProps) {
  const money = (v: number, d = 0) => formatMoney(v, currency, d);
  const costLabel = costLabelProp ?? (/^leads?$/i.test(resultLabel) ? "CPL" : "CPA");
  const cost = costProp ?? (results ? spend / results : undefined);
  const revenue = roas != null ? spend * roas : undefined;
  const s = useMemo(() => parseISODate(start), [start]);
  const e = useMemo(() => parseISODate(end), [end]);
  const days = s && e ? Math.round((e.getTime() - s.getTime()) / 864e5) + 1 : null;
  const barMax = revenue != null ? Math.max(spend, revenue) || 1 : 1;

  const metrics = [
    { k: "spend" as const, label: "Total spend", value: money(spend, spend >= 1000 ? 0 : 2) },
    { k: "results" as const, label: resultLabel, value: formatNumber(results) },
    { k: "cost" as const, label: costLabel, value: cost != null ? money(cost, 2) : "—" },
    { k: "ctr" as const, label: "CTR", value: ctr != null ? `${trimZeros(ctr.toFixed(2))}%` : "—" },
  ];

  return (
    <div className={cx("@container block w-full max-w-[900px] font-(family-name:--cps-sans) text-(--cps-ink)", className)}>
      <article className="grid grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] overflow-hidden rounded-[10px] border border-(--cps-line) bg-(--cps-card) shadow-[0_24px_48px_-34px_var(--cps-shadow),0_2px_6px_-4px_var(--cps-shadow)] transition-[box-shadow,transform] duration-400 ease-out-soft hover:-translate-y-0.5 hover:shadow-[0_34px_64px_-38px_var(--cps-shadow),0_4px_12px_-6px_var(--cps-shadow)] group/cps @max-[660px]:grid-cols-1">
        {/* hero (dark) panel */}
        <section className="group/hero relative flex flex-col gap-[22px] bg-(--cps-hero) bg-[radial-gradient(120%_70%_at_100%_0%,rgba(143,163,255,0.16),transparent_60%)] px-[26px] pt-[26px] pb-6 text-(--cps-hero-ink) @max-[400px]:px-[18px]">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <span className="inline-flex items-center gap-[9px] text-[13px] leading-none font-medium">
              <span
                aria-hidden="true"
                className="grid size-6 place-items-center rounded-md bg-(--cps-hero-line) font-(family-name:--cps-display) text-xs leading-none font-semibold shadow-[inset_0_0_0_1px_var(--cps-hero-line)] transition-transform duration-500 ease-out-soft group-hover/cps:-rotate-[8deg]"
              >
                {(platform || "?").charAt(0).toUpperCase()}
              </span>
              {platform || "Ad platform"}
            </span>
            <span
              className={cx(
                "inline-flex items-center gap-[7px] rounded-full bg-white/[0.07] py-1.5 pr-2.5 pl-[9px] text-xs leading-none font-medium shadow-[inset_0_0_0_1px_var(--cps-hero-line)]",
                STATUS_COLOR[status]
              )}
            >
              <span
                aria-hidden="true"
                className={cx(
                  "relative size-[7px] bg-(--c)",
                  status === "active" && "rounded-full",
                  status === "learning" && "rounded-full",
                  status === "paused" && "rounded-[1px] bg-[linear-gradient(to_right,var(--c)_0_35%,transparent_35%_65%,var(--c)_65%)] bg-transparent",
                  status === "ended" && "rounded-[2px]"
                )}
              >
                {status === "active" && <span className="absolute inset-0 animate-[cps-pulse_2.2s_ease-out_infinite] rounded-full bg-(--c)" />}
              </span>
              {STATUS_LABEL[status]}
            </span>
          </div>

          <h2 className="m-0 font-(family-name:--cps-display) text-[clamp(19px,3.1cqi,23px)] leading-[1.2] font-semibold tracking-[-0.012em] text-balance">
            {name || "Untitled campaign"}
          </h2>

          <dl className="m-0 mt-auto grid gap-1 @max-[660px]:mt-0">
            <dt className={cx(mono, "text-(--cps-hero-muted)")}>Return on ad spend</dt>
            <dd className="m-0 flex items-baseline gap-1 font-(family-name:--cps-display) text-[clamp(64px,12cqi,92px)] leading-[0.92] font-extralight tracking-[-0.045em] tabular-nums @max-[660px]:text-[clamp(60px,20cqi,84px)]">
              <span>{roas != null ? trimZeros(roas.toFixed(2)) : "—"}</span>
              <span
                aria-hidden="true"
                className="inline-block text-[0.55em] font-light tracking-normal text-(--cps-hero-series) transition-transform duration-500 ease-out-soft group-hover/hero:-translate-y-1 group-hover/hero:rotate-90"
              >
                ×
              </span>
            </dd>
            <Delta k="roas" value={deltas.roas} onHero />
          </dl>

          {/* spend → revenue bars */}
          <div className="grid gap-2.5 border-t border-(--cps-hero-line) pt-[18px]">
            {[
              { label: "Spend", value: spend, fill: "bg-(--cps-hero-spend)" },
              { label: "Revenue", value: revenue, fill: "bg-(--cps-hero-series)", breakEven: true },
            ].map((row) => (
              <div key={row.label} className="grid grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-2.5 @max-[400px]:grid-cols-[56px_minmax(0,1fr)_auto]">
                <span className={cx(mono, "text-(--cps-hero-muted)")}>{row.label}</span>
                <span className="relative h-2 rounded bg-(--cps-hero-track)">
                  <i
                    className={cx("absolute inset-y-0 left-0 rounded transition-[width] duration-700 ease-out-soft", row.fill)}
                    style={{ width: row.value != null && revenue != null ? `${(row.value / barMax) * 100}%` : "0%" }}
                  />
                  {row.breakEven && revenue != null && (
                    <i
                      aria-hidden="true"
                      style={{ left: `${(spend / barMax) * 100}%` }}
                      className="absolute -top-1 -bottom-1 -ml-[0.75px] w-[1.5px] bg-(--cps-hero-ink) opacity-55 after:absolute after:bottom-[calc(100%+4px)] after:left-1/2 after:-translate-x-1/2 after:translate-y-[3px] after:font-(family-name:--cps-mono) after:text-[9.5px] after:leading-none after:font-medium after:tracking-[0.06em] after:whitespace-nowrap after:text-(--cps-hero-muted) after:opacity-0 after:transition after:content-['break-even'] group-hover/hero:after:translate-y-0 group-hover/hero:after:opacity-100"
                    />
                  )}
                </span>
                <span className="min-w-16 text-right text-[13px] leading-none font-medium tabular-nums">{row.value != null ? money(row.value) : "—"}</span>
              </div>
            ))}
            {revenue != null && roas != null && (
              <p className="m-0 mt-0.5 text-[12.5px] text-(--cps-hero-muted) [&_b]:font-semibold [&_b]:text-(--cps-hero-ink)">
                Every <b>{money(1)}</b> spent returned <b>{money(roas, 2)}</b>
              </p>
            )}
          </div>
        </section>

        {/* body (light) panel */}
        <section className="grid min-w-0 content-start gap-[18px] px-[26px] pt-6 pb-[22px] @max-[400px]:px-[18px]">
          <header className="flex flex-wrap items-baseline justify-between gap-x-3.5 gap-y-1.5">
            <span className={cx(mono, "text-(--cps-faint)")}>Date range</span>
            <span className="text-sm leading-[1.3] font-medium tabular-nums">
              <time dateTime={[start, end].filter(Boolean).join("/")}>{formatRange(s, e) || "—"}</time>
              {days && <span className="ml-1.5 font-normal text-(--cps-faint)">· {days} days</span>}
            </span>
          </header>

          <dl className="m-0 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-(--cps-line) bg-(--cps-line)">
            {metrics.map((m) => (
              <div key={m.k} className="group/m grid gap-1.5 bg-(--cps-card) px-4 pt-3.5 pb-[13px] transition-colors hover:bg-(--cps-tint) @max-[400px]:px-3 @max-[400px]:pt-3 @max-[400px]:pb-[11px]">
                <dt className={cx(mono, "text-(--cps-faint)")}>{m.label}</dt>
                <dd className="m-0 font-(family-name:--cps-display) text-[clamp(20px,3.4cqi,25px)] leading-[1.05] font-semibold tracking-[-0.02em] [overflow-wrap:anywhere] tabular-nums transition-colors group-hover/m:text-(--cps-series)">
                  {m.value}
                </dd>
                <Delta k={m.k} value={deltas[m.k]} />
              </div>
            ))}
          </dl>

          {series.length > 0 && <ResultsChart series={series} start={s} resultLabel={resultLabel} />}
        </section>
      </article>
    </div>
  );
}

export default CampaignSnapshot;
