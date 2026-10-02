"use client";

import { useEffect, useId, useImperativeHandle, useMemo, useRef, useState, type FormEvent, type ReactNode, type Ref } from "react";
import { cx, parseISODate } from "@/lib/format";

export interface RevenueSale {
  /** Client name. Blank sales show as "Unnamed sale". */
  client?: string;
  amount: number;
  /** YYYY-MM-DD. */
  date?: string;
}

export interface RevenueGoalLabels {
  of: string;
  dayOf: string;
  ended: string;
  notStarted: string;
  onPace: string;
  behind: string;
  reached: string;
  pace: string;
  next: string;
  allHit: string;
  behindBy: string;
  aheadBy: string;
  runRate: string;
  current: string;
  needed: string;
  perDay: string;
  verdictBehind: string;
  verdictAhead: string;
  verdictDone: string;
  daysLeft: string;
  remaining: string;
  projected: string;
  ofGoal: string;
  days: string;
  day: string;
  log: string;
  client: string;
  clientPh: string;
  amount: string;
  add: string;
  toNext: string;
  recent: string;
  undo: string;
  fresh: string;
  errAmount: string;
  errBig: string;
  unnamed: string;
  toast: string;
  toastGoal: string;
  added: string;
  undone: string;
  close: string;
}

export interface RevenueGoalProgressDetail {
  kind: "add" | "undo";
  raised: number;
  goal: number;
  /** Percentage of goal, one decimal. */
  pct: number;
  sale: { client: string; amount: number; date: string };
  /** Milestones (percentages) this sale just crossed. */
  crossed: number[];
}

export interface RevenueGoalTrackerHandle {
  /** Log a sale. Returns false when the amount is not above zero. */
  addSale: (sale: { client?: string; amount: number; date?: string }) => boolean;
  /** Remove the last sale logged in this session. */
  undo: () => boolean;
}

export interface RevenueGoalTrackerProps {
  /** Target amount. */
  goal: number;
  /** First and last day of the goal period, YYYY-MM-DD. Both days count. */
  start?: string;
  end?: string;
  /** The day progress is measured on. Defaults to the real date (read after mount). */
  today?: string;
  /** Sales so far. Amount raised is the sum of these. */
  sales?: RevenueSale[];
  /** Percentages to mark on the meter. */
  milestones?: number[];
  eyebrow?: string;
  title?: string;
  currency?: string;
  locale?: string;
  /** How many sales to list. */
  recent?: number;
  /** Fired on every added or undone sale. */
  onProgress?: (detail: RevenueGoalProgressDetail) => void;
  labels?: Partial<RevenueGoalLabels>;
  /** Imperative handle: addSale(sale) and undo(). */
  ref?: Ref<RevenueGoalTrackerHandle>;
  className?: string;
}

export const REVENUE_GOAL_LABELS: RevenueGoalLabels = {
  of: "raised of {goal} goal",
  dayOf: "Day {n} of {total}",
  ended: "Period ended",
  notStarted: "Starts {date}",
  onPace: "On pace",
  behind: "Behind pace",
  reached: "Goal reached",
  pace: "Pace today {v}",
  next: "Next milestone {m}% · {left} to go",
  allHit: "Every milestone reached",
  behindBy: "{v} behind today's pace",
  aheadBy: "{v} ahead of today's pace",
  runRate: "Run-rate",
  current: "Current",
  needed: "Needed",
  perDay: "/day",
  verdictBehind: "Raise <b>{need}</b> a day from now on to hit the goal. At today's rate you'd finish near <b>{proj}</b> ({pct}).",
  verdictAhead: "At today's rate you'd finish near <b>{proj}</b> ({pct}). Keep above <b>{need}</b> a day to stay on track.",
  verdictDone: "The goal is met with <b>{days}</b> to spare. Everything from here is extra.",
  daysLeft: "Days left",
  remaining: "Remaining",
  projected: "Projected",
  ofGoal: "{pct} of goal",
  days: "{n} days",
  day: "1 day",
  log: "Log a sale",
  client: "Client",
  clientPh: "Optional",
  amount: "Amount",
  add: "Add sale",
  toNext: "To {m}%",
  recent: "Recent sales",
  undo: "Undo last sale",
  fresh: "New",
  errAmount: "Enter an amount greater than zero.",
  errBig: "That looks too large. Enter up to {max}.",
  unnamed: "Unnamed sale",
  toast: "<b>{m}% milestone reached</b> · {v} raised",
  toastGoal: "<b>Goal reached!</b> {v} raised",
  added: "Added {v}. Total {total}, {pct} of goal.",
  undone: "Removed {v} from {client}. Total {total}.",
  close: "Dismiss",
};

const CONFETTI = ["#2563EB", "#60A5FA", "#93C5FD", "#F59E0B", "#10B981", "#EC4899", "#818CF8"];
const MAX = 10000000;
const fill = (s: string, vars: Record<string, string | number>) => String(s).replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ""));
const reduceMotion = () => typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const dayDiff = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 864e5);
const isoDay = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;

/** Fill a template that may contain <b>…</b> markers, without innerHTML. */
function rich(tpl: string, vars: Record<string, string | number>): ReactNode {
  return String(tpl)
    .split(/(<b>.*?<\/b>)/)
    .filter(Boolean)
    .map((part, i) => {
      const m = /^<b>(.*)<\/b>$/.exec(part);
      return m ? <b key={i}>{fill(m[1], vars)}</b> : <span key={i}>{fill(part, vars)}</span>;
    });
}
/** Wrap a {key} placeholder in <b> before filling. */
const boldKey = (tpl: string, key: string) => tpl.replace(`{${key}}`, `<b>{${key}}</b>`);

interface Sale {
  id: string;
  client: string;
  amount: number;
  date: string;
  user: boolean;
}

interface Bit {
  id: number;
  left: number;
  color: string;
  round: boolean;
  dx: number;
  dy: number;
  rot: number;
  dur: number;
}

/** Animate a number from its previous value (700 ms, ease-out). */
function useTweened(value: number): number {
  const [shown, setShown] = useState(value);
  const shownRef = useRef(value);
  useEffect(() => {
    const from = shownRef.current;
    if (from === value) return;
    if (reduceMotion() || document.hidden) {
      shownRef.current = value;
      setShown(value);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / 700);
      const v = k >= 1 ? value : from + (value - from) * (1 - Math.pow(1 - k, 3));
      shownRef.current = v;
      setShown(v);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return shown;
}

/** One confetti piece; plays its flight once and removes itself. */
function ConfettiBit({ bit, onDone }: { bit: Bit; onDone: (id: number) => void }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof el.animate !== "function") {
      onDone(bit.id);
      return;
    }
    const a = el.animate(
      [
        { opacity: 1, transform: "translate(-50%, 0) rotate(0deg) scale(.6)" },
        { opacity: 1, transform: `translate(calc(-50% + ${bit.dx}px), ${bit.dy}px) rotate(${bit.rot / 2}deg) scale(1)`, offset: 0.45 },
        { opacity: 0, transform: `translate(calc(-50% + ${bit.dx * 1.25}px), ${bit.dy + 110}px) rotate(${bit.rot}deg) scale(.9)` },
      ],
      { duration: bit.dur, easing: "cubic-bezier(.2,.6,.35,1)", fill: "forwards" }
    );
    a.finished.then(
      () => onDone(bit.id),
      () => onDone(bit.id)
    );
    return () => a.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <span
      ref={ref}
      style={{ left: bit.left, background: bit.color }}
      className={cx("absolute top-10 opacity-0", bit.round ? "size-[7px] rounded-full" : "h-3 w-2 rounded-[2px]")}
    />
  );
}

const monoH = "m-0 font-(family-name:--rgt-mono) text-[10.5px] leading-none font-semibold tracking-[0.1em] text-(--rgt-faint) uppercase";
const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--rgt-accent)";

/**
 * Progress toward a revenue goal: milestones, today's pace and the daily
 * run-rate you have against the one you need. Log a sale and every number
 * updates, with a small celebration when a milestone is passed.
 */
export function RevenueGoalTracker({
  goal: goalProp,
  start,
  end,
  today: todayProp,
  sales: salesProp = [],
  milestones: milestonesProp = [25, 50, 75, 100],
  eyebrow,
  title,
  currency = "USD",
  locale = "en-US",
  recent = 4,
  onProgress,
  labels,
  ref,
  className,
}: RevenueGoalTrackerProps) {
  const L = useMemo<RevenueGoalLabels>(() => ({ ...REVENUE_GOAL_LABELS, ...labels }), [labels]);
  const uid = useId();
  const amountRef = useRef<HTMLInputElement>(null);
  const confettiRef = useRef<HTMLDivElement>(null);
  const toastTimer = useRef<number | undefined>(undefined);
  const saleSeq = useRef(0);
  const bitSeq = useRef(0);

  const goal = Math.max(0, Number.isFinite(goalProp) ? goalProp : 0);
  const cur = currency.toUpperCase();
  const ms = useMemo(() => [...new Set(milestonesProp.filter((v) => Number.isFinite(v) && v > 0 && v <= 100))].sort((a, b) => a - b), [milestonesProp]);

  const [sales, setSales] = useState<Sale[]>(() =>
    salesProp.filter((s) => s && Number.isFinite(s.amount) && s.amount > 0).map((s, i) => ({ id: `d${i}`, client: s.client || "", amount: +s.amount, date: s.date || "", user: false }))
  );
  const salesRef = useRef(sales);
  const commit = (next: Sale[]) => {
    salesRef.current = next;
    setSales(next);
  };
  const [freshId, setFreshId] = useState<string | null>(null);
  const [client, setClient] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ m: number; show: boolean } | null>(null);
  const [bits, setBits] = useState<Bit[]>([]);
  const [sr, setSr] = useState("");

  // the real date is only read after mount, so server and client render the same
  const [realToday, setRealToday] = useState<string | null>(null);
  useEffect(() => {
    if (!todayProp) setRealToday(isoDay(new Date(Date.now() - new Date().getTimezoneOffset() * 60000)));
  }, [todayProp]);
  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  /* ---------- formatting ---------- */
  const money = (v: number, compact?: boolean) => {
    try {
      const opts: Intl.NumberFormatOptions = { style: "currency", currency: cur, maximumFractionDigits: 0 };
      if (compact) Object.assign(opts, { notation: "compact", minimumFractionDigits: 0, maximumFractionDigits: v >= 100000 ? 0 : 1 });
      else if (v % 1 && Math.abs(v) < 1000) opts.minimumFractionDigits = opts.maximumFractionDigits = 2;
      return new Intl.NumberFormat(locale, opts).format(v);
    } catch {
      return cur + " " + Math.round(v);
    }
  };
  const symbol = useMemo(() => {
    try {
      return new Intl.NumberFormat(locale, { style: "currency", currency: cur }).formatToParts(0).find((x) => x.type === "currency")?.value || "$";
    } catch {
      return "$";
    }
  }, [locale, cur]);
  const dshort = (d: Date) => d.toLocaleDateString(locale, { month: "short", day: "numeric", timeZone: "UTC" });
  const pctOf = (v: number) => (goal > 0 ? (v / goal) * 100 : 0);
  const pctText = (p: number) => p.toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%";

  /* ---------- time maths ---------- */
  const s0 = parseISODate(start);
  const e0 = parseISODate(end);
  const range = s0 && e0 && e0 >= s0 ? { start: s0, end: e0, total: dayDiff(s0, e0) + 1 } : null;
  const today = parseISODate(todayProp ?? realToday) ?? range?.start ?? null;
  let elapsed = 0;
  let left = 0;
  let total = 0;
  let rawDay = 0;
  if (range && today) {
    total = range.total;
    rawDay = dayDiff(range.start, today) + 1;
    elapsed = Math.max(0, Math.min(total, rawDay));
    left = total - elapsed;
  }

  const raised = sales.reduce((a, x) => a + x.amount, 0);
  const pct = pctOf(raised);
  const runRate = elapsed > 0 ? raised / elapsed : 0;
  const remaining = Math.max(0, goal - raised);
  const need = left > 0 ? remaining / left : remaining;
  const projected = elapsed > 0 ? runRate * total : raised;
  const paceAmt = total ? (goal * elapsed) / total : 0;
  const done = goal > 0 && raised >= goal;
  const onPace = done || raised >= paceAmt;
  const pacePct = total ? (elapsed / total) * 100 : 0;
  const showPace = total > 0 && elapsed > 0 && elapsed < total;
  const nextM = ms.find((m) => pct < m);
  const maxRate = Math.max(runRate, need, 1);
  const projPct = goal > 0 ? (projected / goal) * 100 : 0;
  const daysTxt = left === 1 ? L.day : fill(L.days, { n: left });
  const shownRaised = useTweened(raised);
  const userSales = sales.filter((s) => s.user);

  /* ---------- actions ---------- */
  const celebrate = (m: number) => {
    setToast({ m, show: true });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast((t) => (t ? { ...t, show: false } : t)), 4800);
    if (reduceMotion() || typeof Element.prototype.animate !== "function") return;
    const w = confettiRef.current?.clientWidth ?? 0;
    const x0 = (w * Math.min(100, m)) / 100;
    const next: Bit[] = [];
    for (let i = 0; i < 34; i++) {
      const ang = ((-90 + (Math.random() * 130 - 65)) * Math.PI) / 180;
      const dist = 70 + Math.random() * 90;
      next.push({
        id: ++bitSeq.current,
        left: x0,
        color: CONFETTI[i % CONFETTI.length],
        round: i % 3 === 0,
        dx: Math.cos(ang) * dist,
        dy: Math.sin(ang) * dist,
        rot: (Math.random() * 720 - 360) | 0,
        dur: 1100 + Math.random() * 500,
      });
    }
    setBits((b) => [...b, ...next]);
  };
  const hideToast = () => {
    window.clearTimeout(toastTimer.current);
    setToast((t) => (t ? { ...t, show: false } : t));
  };

  const emit = (sale: Sale, crossed: number[], kind: "add" | "undo", list: Sale[]) => {
    const r = list.reduce((a, x) => a + x.amount, 0);
    onProgress?.({ kind, raised: r, goal, pct: Math.round(pctOf(r) * 10) / 10, sale: { client: sale.client, amount: sale.amount, date: sale.date }, crossed });
  };

  const addSale = (sale: { client?: string; amount: number; date?: string }) => {
    const amt = Number(sale?.amount);
    if (!(Number.isFinite(amt) && amt > 0)) return false;
    const before = pctOf(salesRef.current.reduce((a, x) => a + x.amount, 0));
    const s: Sale = {
      id: `u${++saleSeq.current}`,
      client: (sale.client || "").trim() || L.unnamed,
      amount: Math.round(amt * 100) / 100,
      date: sale.date || (today ? isoDay(today) : ""),
      user: true,
    };
    const next = [...salesRef.current, s];
    commit(next);
    setFreshId(s.id);
    const r = next.reduce((a, x) => a + x.amount, 0);
    const crossed = ms.filter((m) => before < m && pctOf(r) >= m);
    setSr(fill(L.added, { v: money(s.amount), total: money(r), pct: pctText(pctOf(r)) }));
    if (crossed.length) celebrate(crossed[crossed.length - 1]);
    emit(s, crossed, "add", next);
    return true;
  };

  const undo = () => {
    const list = salesRef.current;
    const idx = list.map((x) => x.user).lastIndexOf(true);
    if (idx < 0) return false;
    const s = list[idx];
    const next = list.filter((x) => x !== s);
    commit(next);
    setFreshId(null);
    setSr(fill(L.undone, { v: money(s.amount), client: s.client, total: money(next.reduce((a, x) => a + x.amount, 0)) }));
    emit(s, [], "undo", next);
    return true;
  };

  useImperativeHandle(ref, () => ({ addSale, undo }));

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const raw = amount.replace(/[\s,]/g, "").replace(/^[^\d.-]+/, "");
    const v = raw === "" ? NaN : Number(raw);
    let err = "";
    if (!(Number.isFinite(v) && v > 0)) err = L.errAmount;
    else if (v > MAX) err = fill(L.errBig, { max: money(MAX) });
    setError(err);
    amountRef.current?.focus();
    if (err) return;
    addSale({ client, amount: v });
    setAmount("");
    setClient("");
  };

  const quick: Array<[string, number]> = [];
  if (nextM != null) {
    const gap = Math.ceil((goal * nextM) / 100 - raised);
    if (gap > 0) quick.push([fill(L.toNext, { m: nextM }) + " · " + money(gap), gap]);
  }
  [1000, 2500].forEach((v) => quick.push(["+" + money(v), v]));

  const recentSales = sales
    .map((s, i) => ({ s, i }))
    .sort((a, b) => (b.s.date > a.s.date ? 1 : b.s.date < a.s.date ? -1 : b.i - a.i))
    .slice(0, Math.max(1, recent || 4));

  const errId = `${uid}-err`;
  const pillTone = done
    ? "bg-(--rgt-accent) text-(--rgt-on-accent)"
    : onPace
      ? "text-(--rgt-good) bg-[color-mix(in_oklab,var(--rgt-good)_12%,transparent)]"
      : "text-(--rgt-warn) bg-[color-mix(in_oklab,var(--rgt-warn)_12%,transparent)]";

  return (
    <div className={cx("@container block w-full max-w-[960px] font-(family-name:--rgt-sans) text-(--rgt-ink)", className)}>
      <article className="relative overflow-hidden rounded-3xl border border-(--rgt-line) [background:radial-gradient(60%_80%_at_0%_0%,var(--rgt-mesh-1),transparent_60%),radial-gradient(45%_60%_at_100%_0%,var(--rgt-mesh-2),transparent_65%),radial-gradient(50%_50%_at_70%_110%,var(--rgt-mesh-3),transparent_70%),var(--rgt-card)] px-[30px] pt-7 pb-[26px] shadow-[0_40px_70px_-54px_var(--rgt-shadow),0_2px_6px_-4px_var(--rgt-shadow)] @max-[760px]:rounded-[22px] @max-[760px]:px-[22px] @max-[760px]:pt-6 @max-[760px]:pb-[22px] @max-[480px]:rounded-[20px] @max-[480px]:px-4 @max-[480px]:pt-5 @max-[480px]:pb-[18px]">
        {/* header */}
        <header className="flex flex-wrap items-start justify-between gap-x-5 gap-y-3">
          <div className="grid min-w-0 gap-1.5">
            {eyebrow && (
              <span className="inline-flex items-center gap-2 font-(family-name:--rgt-mono) text-[10.5px] leading-none font-semibold tracking-[0.12em] text-(--rgt-accent-ink) uppercase">
                <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" className="size-[13px]">
                  <circle cx="7" cy="7" r="5.5" />
                  <circle cx="7" cy="7" r="2.5" />
                  <circle cx="7" cy="7" r=".6" fill="currentColor" />
                </svg>
                {eyebrow}
              </span>
            )}
            {title && <h2 className="m-0 font-(family-name:--rgt-display) text-[clamp(19px,3cqi,24px)] leading-[1.2] font-[650] tracking-[-0.02em] text-balance">{title}</h2>}
          </div>
          {range && (
            <span className="inline-flex flex-none items-center gap-2 rounded-full border border-(--rgt-line) bg-[color-mix(in_oklab,var(--rgt-card)_70%,transparent)] px-3 py-2 text-[12.5px] leading-none font-medium text-(--rgt-muted) tabular-nums backdrop-blur-[6px] @max-[480px]:w-full @max-[480px]:justify-center">
              {dshort(range.start)} – {dshort(range.end)}
              <i className="size-1 rounded-full bg-(--rgt-faint) opacity-60" />
              {rawDay < 1 ? (
                fill(L.notStarted, { date: dshort(range.start) })
              ) : (
                <b className="font-[650] text-(--rgt-ink)">{rawDay > total ? L.ended : fill(L.dayOf, { n: elapsed, total })}</b>
              )}
            </span>
          )}
        </header>

        {/* hero figures */}
        <div className="mt-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-2.5 @max-[480px]:mt-[18px]">
          <div className="grid min-w-0 gap-1.5">
            <span className="font-(family-name:--rgt-display) text-[clamp(44px,8.4cqi,72px)] leading-[.95] font-bold tracking-[-0.045em] tabular-nums @max-[480px]:text-[44px]">
              {money(shownRaised)}
            </span>
            <span className="text-sm text-(--rgt-muted) [&_b]:font-[650] [&_b]:text-(--rgt-ink) [&_b]:tabular-nums">{rich(boldKey(L.of, "goal"), { goal: money(goal) })}</span>
          </div>
          <div className="grid justify-items-end gap-1.5 @max-[480px]:auto-cols-max @max-[480px]:grid-flow-col @max-[480px]:items-center @max-[480px]:justify-items-start @max-[480px]:gap-2.5">
            <span className="font-(family-name:--rgt-display) text-[clamp(30px,5cqi,42px)] leading-none font-[650] tracking-[-0.03em] text-(--rgt-accent-ink) tabular-nums">
              {pctText(pctOf(shownRaised))}
            </span>
            <span
              className={cx(
                "inline-flex items-center gap-1.5 rounded-full px-[9px] py-[5px] text-[11.5px] leading-none font-[650] whitespace-nowrap before:size-1.5 before:rounded-full before:bg-current before:content-['']",
                pillTone
              )}
            >
              {done ? L.reached : onPace ? L.onPace : L.behind}
            </span>
          </div>
        </div>

        {/* meter */}
        <div className="relative mt-[46px] pb-11 @max-[760px]:mt-[42px] @max-[480px]:pb-8">
          <div
            role="meter"
            aria-valuemin={0}
            aria-valuemax={goal}
            aria-valuenow={Math.min(raised, goal)}
            aria-valuetext={`${money(raised)} of ${money(goal)}, ${pctText(pct)}`}
            aria-label={title || "Revenue goal"}
            className="relative h-[22px] rounded-full bg-(--rgt-track) shadow-[inset_0_1px_2px_color-mix(in_oklab,var(--rgt-shadow)_60%,transparent)] @max-[480px]:h-[18px]"
          >
            <div
              style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
              className="absolute inset-y-0 left-0 overflow-hidden rounded-[inherit] bg-[linear-gradient(90deg,var(--rgt-accent-2),var(--rgt-accent)_70%,color-mix(in_oklab,var(--rgt-accent),#1E1B4B_25%))] shadow-[0_8px_22px_-8px_var(--rgt-accent),inset_0_1px_0_rgba(255,255,255,0.35)] transition-[width] duration-800 ease-[cubic-bezier(.2,.75,.2,1)] after:absolute after:inset-0 after:-translate-x-full after:animate-[rgt-shine_3.6s_ease-in-out_1.2s_infinite] after:bg-[linear-gradient(100deg,transparent_20%,rgba(255,255,255,0.38)_45%,transparent_70%)] after:content-[''] motion-reduce:transition-none motion-reduce:after:animate-none"
            />
            {showPace && (
              <div
                aria-hidden="true"
                style={{ left: `${pacePct}%` }}
                className="absolute -top-[30px] bottom-full w-0 transition-[left] duration-600 ease-out-soft before:absolute before:top-5 before:-bottom-[22px] before:-left-px before:w-0.5 before:rounded-[2px] before:bg-(--rgt-ink) before:opacity-70 before:content-[''] motion-reduce:transition-none"
              >
                <span className="absolute top-0 left-0 -translate-x-1/2 rounded-md bg-(--rgt-ink) px-[7px] py-1 font-(family-name:--rgt-mono) text-[10.5px] leading-none font-semibold whitespace-nowrap text-(--rgt-card) tabular-nums">
                  {fill(L.pace, { v: money(paceAmt, true) })}
                </span>
              </div>
            )}
            <div aria-hidden="true">
              {ms.map((m, i) => {
                const hit = pct >= m;
                const isNext = m === nextM;
                const last = i === ms.length - 1;
                return (
                  <div key={m} style={{ left: `${m}%` }} className="absolute top-0 h-[22px] w-0 @max-[480px]:h-[18px]">
                    <span
                      className={cx(
                        "absolute top-1/2 left-0 -mt-2 -ml-2 grid size-4 place-items-center rounded-full border-2 bg-(--rgt-card) [transition:background_.35s,border-color_.35s,color_.35s,transform_.35s_cubic-bezier(.2,.7,.2,1)] motion-reduce:transition-none",
                        hit
                          ? "scale-[1.12] border-(--rgt-card) text-(--rgt-accent) shadow-[0_2px_6px_-2px_var(--rgt-shadow)]"
                          : isNext
                            ? "animate-[rgt-pulse_2.2s_ease-in-out_infinite] border-(--rgt-accent) text-transparent motion-reduce:animate-none"
                            : "border-[color-mix(in_oklab,var(--rgt-faint)_55%,var(--rgt-track))] text-transparent"
                      )}
                    >
                      <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="size-[9px]">
                        <path d="m2.6 6.3 2.3 2.3 4.6-5" />
                      </svg>
                    </span>
                    <span
                      className={cx(
                        "absolute top-[34px] left-0 grid gap-[3px] whitespace-nowrap @max-[480px]:top-7",
                        last ? "-translate-x-full justify-items-end" : "-translate-x-1/2 justify-items-center"
                      )}
                    >
                      <b className={cx("text-xs leading-none font-[650] tabular-nums", hit ? "text-(--rgt-accent-ink)" : "text-(--rgt-muted)")}>{m}%</b>
                      <span className="font-(family-name:--rgt-mono) text-[11px] leading-none font-medium text-(--rgt-faint) tabular-nums @max-[480px]:hidden">
                        {money((goal * m) / 100, true)}
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          <div ref={confettiRef} aria-hidden="true" className="pointer-events-none absolute inset-x-0 -top-10 bottom-0 z-[3] overflow-visible">
            {bits.map((b) => (
              <ConfettiBit key={b.id} bit={b} onDone={(id) => setBits((all) => all.filter((x) => x.id !== id))} />
            ))}
          </div>
        </div>

        {/* caption */}
        <div className="flex flex-wrap justify-between gap-x-4 gap-y-1.5 text-[13px] text-(--rgt-muted) [&_b]:font-[650] [&_b]:text-(--rgt-ink) [&_b]:tabular-nums">
          <span>{nextM != null ? rich(boldKey(L.next, "left"), { m: nextM, left: money(Math.max(0, (goal * nextM) / 100 - raised)) }) : <b>{L.allHit}</b>}</span>
          {total > 0 && elapsed > 0 && !done && <span>{rich(boldKey(raised - paceAmt >= 0 ? L.aheadBy : L.behindBy, "v"), { v: money(Math.abs(raised - paceAmt)) })}</span>}
        </div>

        {/* lower grid */}
        <div className="mt-[22px] grid grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)] gap-4 @max-[760px]:grid-cols-1">
          {/* run-rate */}
          <section className="flex min-w-0 flex-col rounded-[18px] border border-(--rgt-line) bg-[color-mix(in_oklab,var(--rgt-raise)_88%,transparent)] px-[18px] pt-[18px] pb-4 backdrop-blur-[8px] @max-[480px]:px-3.5 @max-[480px]:pt-4 @max-[480px]:pb-3.5">
            <div className="mb-3.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
              <h3 className={monoH}>{L.runRate}</h3>
            </div>
            <div className="grid gap-3">
              {[
                { label: L.current, v: runRate, needRow: false },
                { label: L.needed, v: done ? 0 : need, needRow: true },
              ].map((row) => (
                <div key={row.label} className="grid grid-cols-[82px_minmax(0,1fr)_auto] items-center gap-3 @max-[480px]:grid-cols-[minmax(0,1fr)_auto]">
                  <span className="text-[12.5px] text-(--rgt-muted)">{row.label}</span>
                  <span aria-hidden="true" className="h-2.5 overflow-hidden rounded-full bg-(--rgt-track) @max-[480px]:col-span-full @max-[480px]:row-start-2">
                    <i
                      style={{ width: `${(row.v / maxRate) * 100}%` }}
                      className={cx(
                        "block h-full rounded-[inherit] transition-[width] duration-600 ease-out-soft motion-reduce:transition-none",
                        row.needRow
                          ? "bg-[repeating-linear-gradient(135deg,var(--rgt-ink)_0_3px,color-mix(in_oklab,var(--rgt-ink)_60%,transparent)_3px_6px)] opacity-55"
                          : "bg-(--rgt-accent)"
                      )}
                    />
                  </span>
                  <span className="min-w-[82px] text-right text-[15px] leading-none font-[650] whitespace-nowrap tabular-nums">
                    {money(row.v)}
                    <small className="text-[11px] leading-none font-medium text-(--rgt-faint)">{L.perDay}</small>
                  </span>
                </div>
              ))}
            </div>
            <p className="m-0 mt-3.5 rounded-xl bg-(--rgt-tint) px-3 py-2.5 text-[13px] leading-[1.45] text-(--rgt-muted) [&_b]:font-[650] [&_b]:text-(--rgt-ink)">
              {rich(done ? L.verdictDone : onPace ? L.verdictAhead : L.verdictBehind, { need: money(need), proj: money(projected), pct: pctText(projPct), days: daysTxt })}
            </p>
            <dl className="m-0 mt-auto grid grid-cols-3 gap-2.5 pt-3.5 @max-[480px]:grid-cols-2">
              {[
                { k: L.daysLeft, v: String(left), sub: range ? dshort(range.end) : "" },
                { k: L.remaining, v: money(remaining), sub: fill(L.ofGoal, { pct: pctText(goal ? (remaining / goal) * 100 : 0) }) },
                { k: L.projected, v: money(projected), sub: fill(L.ofGoal, { pct: pctText(projPct) }) },
              ].map((st, i) => (
                <div key={st.k} className={cx("grid min-w-0 gap-[5px] border-t border-(--rgt-line) pt-3", i === 2 && "@max-[480px]:col-span-full")}>
                  <dt className="font-(family-name:--rgt-mono) text-[10px] leading-[1.2] font-medium tracking-[0.09em] text-(--rgt-faint) uppercase">{st.k}</dt>
                  <dd className="m-0 font-(family-name:--rgt-display) text-lg leading-[1.1] font-[650] tracking-[-0.01em] [overflow-wrap:anywhere] tabular-nums">
                    {st.v}
                    {st.sub && <small className="mt-[3px] block font-(family-name:--rgt-sans) text-[11.5px] leading-[1.2] font-medium tracking-normal text-(--rgt-faint)">{st.sub}</small>}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          {/* log a sale */}
          <section className="flex min-w-0 flex-col rounded-[18px] border border-(--rgt-line) bg-[color-mix(in_oklab,var(--rgt-raise)_88%,transparent)] px-[18px] pt-[18px] pb-4 backdrop-blur-[8px] @max-[480px]:px-3.5 @max-[480px]:pt-4 @max-[480px]:pb-3.5">
            <div className="mb-3.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
              <h3 className={monoH}>{L.log}</h3>
            </div>
            <form noValidate onSubmit={onSubmit} className="grid grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)_auto] items-end gap-2 @max-[480px]:grid-cols-2">
              <div className="grid min-w-0 gap-1.5">
                <label htmlFor={`${uid}-client`} className="text-[11.5px] leading-none font-medium text-(--rgt-muted)">
                  {L.client}
                </label>
                <div className="relative flex h-[42px] items-center rounded-[11px] border border-(--rgt-line) bg-(--rgt-card) [transition:border-color_.2s,box-shadow_.2s] focus-within:border-(--rgt-accent) focus-within:shadow-[0_0_0_3px_var(--rgt-accent-soft)] motion-reduce:transition-none">
                  <input
                    id={`${uid}-client`}
                    type="text"
                    autoComplete="off"
                    maxLength={60}
                    placeholder={L.clientPh}
                    value={client}
                    onChange={(e) => setClient(e.target.value)}
                    className="h-full w-full min-w-0 appearance-none rounded-[11px] border-0 bg-transparent px-[11px] text-sm leading-none font-medium text-(--rgt-ink) tabular-nums placeholder:text-(--rgt-faint) placeholder:opacity-80 focus-visible:outline-none"
                  />
                </div>
              </div>
              <div className="grid min-w-0 gap-1.5">
                <label htmlFor={`${uid}-amount`} className="text-[11.5px] leading-none font-medium text-(--rgt-muted)">
                  {L.amount}
                </label>
                <div
                  className={cx(
                    "relative flex h-[42px] items-center rounded-[11px] border bg-(--rgt-card) [transition:border-color_.2s,box-shadow_.2s] motion-reduce:transition-none",
                    error
                      ? "border-(--rgt-bad) shadow-[0_0_0_3px_color-mix(in_oklab,var(--rgt-bad)_14%,transparent)]"
                      : "border-(--rgt-line) focus-within:border-(--rgt-accent) focus-within:shadow-[0_0_0_3px_var(--rgt-accent-soft)]"
                  )}
                >
                  <span aria-hidden="true" className="pl-[11px] text-sm leading-none font-semibold text-(--rgt-faint)">
                    {symbol}
                  </span>
                  <input
                    ref={amountRef}
                    id={`${uid}-amount`}
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder="0"
                    value={amount}
                    aria-invalid={!!error}
                    aria-describedby={errId}
                    onChange={(e) => {
                      setAmount(e.target.value);
                      if (error) setError("");
                    }}
                    className="h-full w-full min-w-0 appearance-none rounded-[11px] border-0 bg-transparent pr-[11px] pl-1 text-sm leading-none font-medium text-(--rgt-ink) tabular-nums placeholder:text-(--rgt-faint) placeholder:opacity-80 focus-visible:outline-none"
                  />
                </div>
              </div>
              <button
                type="submit"
                className={cx(
                  "inline-flex h-[42px] cursor-pointer items-center gap-[7px] rounded-[11px] border border-(--rgt-accent) bg-(--rgt-accent) px-4 text-[13.5px] leading-none font-[650] text-(--rgt-on-accent) shadow-[0_10px_20px_-12px_var(--rgt-accent)] [transition:background_.2s,transform_.15s,box-shadow_.2s] hover:bg-[color-mix(in_oklab,var(--rgt-accent),#000_12%)] active:scale-[.97] motion-reduce:transition-none motion-reduce:active:scale-100 @max-[480px]:col-span-full @max-[480px]:justify-center",
                  focusRing
                )}
              >
                <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className="size-3.5">
                  <path d="M7 2.5v9M2.5 7h9" />
                </svg>
                {L.add}
              </button>
              <div className="col-span-full flex flex-wrap gap-1.5">
                {quick.map(([label, v]) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => {
                      setAmount(String(v));
                      setError("");
                      amountRef.current?.focus();
                    }}
                    className={cx(
                      "cursor-pointer rounded-full border border-dashed border-[color-mix(in_oklab,var(--rgt-accent)_45%,var(--rgt-line))] bg-transparent px-2.5 py-1.5 text-xs leading-none font-semibold text-(--rgt-accent-ink) tabular-nums [transition:background_.2s,border-style_.2s] hover:border-solid hover:bg-(--rgt-accent-soft) motion-reduce:transition-none",
                      focusRing
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p id={errId} aria-live="assertive" className={cx("col-span-full m-0 text-[12.5px] text-(--rgt-bad)", !error && "hidden")}>
                {error}
              </p>
            </form>
            <div className="mt-4 mb-1.5 flex items-center justify-between gap-2 border-t border-(--rgt-line) pt-3.5">
              <h4 className={monoH}>{L.recent}</h4>
              <button
                type="button"
                disabled={userSales.length === 0}
                onClick={() => {
                  undo();
                  if (salesRef.current.every((x) => !x.user)) amountRef.current?.focus();
                }}
                className={cx(
                  "inline-flex cursor-pointer items-center gap-1.5 rounded-[7px] border-0 bg-transparent px-1.5 py-[5px] text-[12.5px] leading-none font-semibold text-(--rgt-accent-ink) [transition:background_.2s,color_.2s] enabled:hover:bg-(--rgt-accent-soft) disabled:cursor-default disabled:text-(--rgt-faint) disabled:opacity-60 motion-reduce:transition-none",
                  focusRing
                )}
              >
                <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-[13px]">
                  <path d="M4.5 3 2 5.5 4.5 8" />
                  <path d="M2.5 5.5h6a3.5 3.5 0 0 1 0 7H6" />
                </svg>
                {L.undo}
              </button>
            </div>
            <ul className="m-0 grid list-none p-0">
              {recentSales.map(({ s }) => {
                const d = parseISODate(s.date);
                return (
                  <li
                    key={s.id}
                    className={cx(
                      "grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 gap-y-0.5 border-b border-dashed border-(--rgt-line) py-2 last:border-b-0",
                      s.id === freshId && "animate-[rgt-in_.45s_cubic-bezier(.2,.7,.2,1)] motion-reduce:animate-none"
                    )}
                  >
                    <span className="flex flex-wrap items-center gap-[7px] text-[13.5px] leading-[1.3] font-[550] [overflow-wrap:anywhere]">
                      {s.client || L.unnamed}
                      {s.user && (
                        <em className="rounded-[5px] bg-(--rgt-accent) px-[5px] py-[3px] font-(family-name:--rgt-mono) text-[9.5px] leading-none font-[650] tracking-[0.08em] text-(--rgt-on-accent) uppercase not-italic">
                          {L.fresh}
                        </em>
                      )}
                    </span>
                    <span className="text-[13.5px] leading-[1.3] font-[650] tabular-nums">{money(s.amount)}</span>
                    <span className="col-span-full text-[11.5px] text-(--rgt-faint)">
                      {d ? d.toLocaleDateString(locale, { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }) : ""}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        {/* toast */}
        <div
          role="status"
          className={cx(
            "absolute top-[18px] left-1/2 z-[5] flex max-w-[calc(100%-32px)] items-center gap-3 rounded-[14px] bg-(--rgt-ink) py-2.5 pr-2.5 pl-3.5 text-[13.5px] leading-[1.35] text-(--rgt-card) shadow-[0_22px_40px_-18px_var(--rgt-shadow)] motion-reduce:transition-none @max-[480px]:right-4 @max-[480px]:left-4 @max-[480px]:max-w-none [&_b]:font-[650]",
            toast?.show
              ? "visible -translate-x-1/2 translate-y-0 opacity-100 [transition:opacity_.25s,transform_.3s_cubic-bezier(.2,.7,.2,1),visibility_0s] @max-[480px]:translate-x-0"
              : "invisible -translate-x-1/2 -translate-y-3 opacity-0 [transition:opacity_.25s,transform_.3s_cubic-bezier(.2,.7,.2,1),visibility_0s_linear_.3s] @max-[480px]:translate-x-0"
          )}
        >
          <span className="grid size-7 flex-none place-items-center rounded-full bg-(--rgt-accent) text-(--rgt-on-accent)">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-[15px]">
              <path d="M3.5 14V2.5M3.5 3h8l-1.6 2.8L11.5 8.5h-8" />
            </svg>
          </span>
          <span>{toast && rich(toast.m >= 100 ? L.toastGoal : L.toast, { m: toast.m, v: money((goal * toast.m) / 100) })}</span>
          <button
            type="button"
            aria-label={L.close}
            onClick={hideToast}
            tabIndex={toast?.show ? 0 : -1}
            className="grid size-7 flex-none cursor-pointer place-items-center rounded-lg border-0 bg-transparent text-inherit opacity-75 hover:bg-[color-mix(in_oklab,var(--rgt-card)_14%,transparent)] hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--rgt-accent)"
          >
            <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true" className="size-3">
              <path d="m3 3 6 6M9 3 3 9" />
            </svg>
          </button>
        </div>
        <p className="sr-only" aria-live="polite">
          {sr}
        </p>
      </article>
    </div>
  );
}

export default RevenueGoalTracker;
