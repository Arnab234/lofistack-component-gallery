"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type FormEvent,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { cx } from "@/lib/format";

export type BudgetView = "spent" | "projected";
export type BudgetSort = "default" | "used";
export type BudgetStatus = "ok" | "over" | "under";
export type BudgetChannelIcon = "search" | "social" | "video" | "display";

export interface BudgetChannel {
  /** Unique key. Defaults to the label. */
  id?: string;
  /** Channel name. */
  label: string;
  /** Icon, or a plain dot when left out. */
  icon?: BudgetChannelIcon;
  /** Monthly budget. */
  budget: number;
  /** Spend so far this month. */
  spent: number;
}

export interface BudgetTolerance {
  /** Projected spend more than this fraction over budget is Overpacing. */
  over: number;
  /** Projected spend more than this fraction under budget is Underpacing. */
  under: number;
}

export interface BudgetChange {
  id: string;
  label: string;
  budget: number;
  previous: number;
  spent: number;
  projected: number;
  status: BudgetStatus;
}

export interface BudgetLabels {
  view: string;
  spent: string;
  projected: string;
  sort: string;
  sortOn: string;
  day: string;
  daysLeft: string;
  lastDay: string;
  monthAria: string;
  kBudget: string;
  kSpent: string;
  kProjected: string;
  kPace: string;
  usedOf: string;
  paceToday: string;
  channels: string;
  overBy: string;
  underBy: string;
  onBudget: string;
  ok: string;
  over: string;
  under: string;
  used: string;
  of: string;
  budget: string;
  ahead: string;
  behind: string;
  level: string;
  runsOut: string;
  perDay: string;
  need: string;
  spentAll: string;
  edit: string;
  inputLabel: string;
  save: string;
  cancel: string;
  invalid: string;
  announce: string;
  lgSpent: string;
  lgProjected: string;
  lgPace: string;
  lgBudget: string;
  lgOver: string;
  tipSpent: string;
  tipPace: string;
  tipBudget: string;
  tipProj: string;
}

export interface AdSpendBudgetTrackerProps {
  /** Small label above the title. */
  eyebrow?: string;
  /** Header title. */
  title?: string;
  /** YYYY-MM. Sets the number of days in the month. */
  month?: string;
  /** YYYY-MM-DD, the day spend is counted to. Defaults to today (after mount). */
  asOf?: string;
  /** Channels with their budgets and spend so far. */
  channels: BudgetChannel[];
  /** ISO currency code. */
  currency?: string;
  /** Number and date locale. */
  locale?: string;
  /** Projected spend outside this band of the budget is flagged. */
  tolerance?: Partial<BudgetTolerance>;
  /** Optional footer note, e.g. where the spend came from. */
  source?: string;
  /** Controlled view. */
  view?: BudgetView;
  /** Initial view when uncontrolled. */
  defaultView?: BudgetView;
  onViewChange?: (view: BudgetView) => void;
  /** Controlled sort. */
  sort?: BudgetSort;
  /** Initial sort when uncontrolled. */
  defaultSort?: BudgetSort;
  onSortChange?: (sort: BudgetSort) => void;
  /** Called after a budget is edited and saved. */
  onBudgetChange?: (detail: BudgetChange) => void;
  /** Override any built-in text. */
  labels?: Partial<BudgetLabels>;
  className?: string;
}

const LABELS: BudgetLabels = {
  view: "View",
  spent: "Spent",
  projected: "Projected",
  sort: "Sort by % used",
  sortOn: "Sorted by % used",
  day: "Day {d} of {n}",
  daysLeft: "{n} days left",
  lastDay: "Last day",
  monthAria: "{month}: day {d} of {n}",
  kBudget: "Total budget",
  kSpent: "Spent so far",
  kProjected: "Projected month-end",
  kPace: "Overall pace",
  usedOf: "{pct} of budget",
  paceToday: "Ideal today {v}",
  channels: "{n} channels",
  overBy: "{v} over budget",
  underBy: "{v} under budget",
  onBudget: "On budget",
  ok: "On track",
  over: "Overpacing",
  under: "Underpacing",
  used: "used",
  of: "of",
  budget: "Budget",
  ahead: "{pts} pts ahead of pace",
  behind: "{pts} pts behind pace",
  level: "Right on pace",
  runsOut: "Hits budget on {date}",
  perDay: "{v}/day now",
  need: "{v}/day to land on budget",
  spentAll: "Budget used up",
  edit: "Edit budget for {name}, currently {v}",
  inputLabel: "Monthly budget for {name}",
  save: "Save budget",
  cancel: "Cancel",
  invalid: "Enter a budget above zero.",
  announce: "{name} budget set to {v}. Projected {pct} of budget, {status}.",
  lgSpent: "Spend so far",
  lgProjected: "Projected spend",
  lgPace: "Ideal pace today",
  lgBudget: "Budget",
  lgOver: "Over budget",
  tipSpent: "Spent",
  tipPace: "Ideal today",
  tipBudget: "Budget",
  tipProj: "Projected",
};

const TONE: Record<BudgetStatus, string> = {
  ok: "[--abt-tone:var(--abt-ok)] [--abt-tone-ink:var(--abt-ok-ink)] [--abt-tone-soft:var(--abt-ok-soft)]",
  over: "[--abt-tone:var(--abt-over)] [--abt-tone-ink:var(--abt-over-ink)] [--abt-tone-soft:var(--abt-over-soft)]",
  under: "[--abt-tone:var(--abt-under)] [--abt-tone-ink:var(--abt-under-ink)] [--abt-tone-soft:var(--abt-under-soft)]",
};
const EASE = "ease-[cubic-bezier(.2,.7,.2,1)]";
const OVER_STRIPES = "bg-[repeating-linear-gradient(135deg,var(--abt-over)_0_3px,color-mix(in_oklab,var(--abt-over)_45%,var(--abt-card))_3px_6px)]";

const num = (v: unknown) => (v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));
const fill = (s: string, vars: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ""));
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const reduceMotion = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/* ---------- icons ---------- */
const s = { fill: "none", stroke: "currentColor", "aria-hidden": true } as const;
const CHANNEL_ICON: Record<BudgetChannelIcon | "dot", ReactNode> = {
  search: (
    <svg viewBox="0 0 20 20" strokeWidth="1.7" strokeLinecap="round" {...s}>
      <circle cx="8.6" cy="8.6" r="5.1" />
      <path d="m12.4 12.4 4.1 4.1" />
    </svg>
  ),
  social: (
    <svg viewBox="0 0 20 20" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...s}>
      <path d="M3 13.6V5.8A2.3 2.3 0 0 1 5.3 3.5h7.4A2.3 2.3 0 0 1 15 5.8v4.5a2.3 2.3 0 0 1-2.3 2.3H6.6L3 15.5z" />
      <path d="M17 8.2v6.2l-2.4-1.7" />
    </svg>
  ),
  video: (
    <svg viewBox="0 0 20 20" strokeWidth="1.6" strokeLinejoin="round" {...s}>
      <rect x="2.5" y="4" width="15" height="12" rx="2.6" />
      <path d="m8.4 7.4 4.4 2.6-4.4 2.6z" fill="currentColor" />
    </svg>
  ),
  display: (
    <svg viewBox="0 0 20 20" strokeWidth="1.6" strokeLinejoin="round" {...s}>
      <rect x="2.5" y="3.5" width="15" height="13" rx="2" />
      <path d="M2.5 7.5h15M8 7.5v9" />
    </svg>
  ),
  dot: (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="10" r="4" fill="currentColor" />
    </svg>
  ),
};
const STATUS_ICON: Record<BudgetStatus, ReactNode> = {
  ok: <path d="M2.4 6.3 4.9 8.6 9.6 3.6" />,
  over: <path d="M6 9.8V2.4M2.9 5.4 6 2.3l3.1 3.1" />,
  under: <path d="M6 2.2v7.4M2.9 6.6 6 9.7l3.1-3.1" />,
};

function Pill({ status, L }: { status: BudgetStatus; L: BudgetLabels }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full bg-(--abt-tone-soft) py-[5px] pr-[9px] pl-[7px] text-xs leading-none font-semibold whitespace-nowrap text-(--abt-tone-ink) transition-[color,background-color] duration-300 motion-reduce:transition-none",
        TONE[status]
      )}
    >
      <svg viewBox="0 0 12 12" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...s} className="size-3 flex-none">
        {STATUS_ICON[status]}
      </svg>
      {L[status]}
    </span>
  );
}

interface Channel {
  id: string;
  label: string;
  icon: BudgetChannelIcon | "dot";
  budget: number;
  spent: number;
  order: number;
}

interface Calendar {
  y: number;
  m: number;
  n: number;
  day: number;
  frac: number;
}

function calendar(month?: string, asOf?: string, today?: Date | null): Calendar {
  let y = today ? today.getFullYear() : 1970;
  let m = today ? today.getMonth() + 1 : 1;
  let day = today ? today.getDate() : 0;
  const mm = /^(\d{4})-(\d{2})/.exec(String(month || ""));
  const aa = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(asOf || ""));
  if (aa) {
    y = +aa[1];
    m = +aa[2];
    day = +aa[3];
  } else if (!today && mm) {
    // before mount with no asOf: show the month, nothing counted yet
    y = +mm[1];
    m = +mm[2];
    day = 0;
  }
  let n = new Date(y, m, 0).getDate();
  if (mm && (+mm[1] !== y || +mm[2] !== m)) {
    // the "as of" day sits outside the month: the month is either complete or not started
    const after = y * 12 + m > +mm[1] * 12 + +mm[2];
    y = +mm[1];
    m = +mm[2];
    n = new Date(y, m, 0).getDate();
    day = after ? n : 0;
  }
  day = clamp(day, 0, n);
  return { y, m, n, day, frac: n ? day / n : 0 };
}

function metrics(ch: Channel, cal: Calendar, tol: BudgetTolerance) {
  const budget = ch.budget > 0 ? ch.budget : 0;
  const daily = cal.day > 0 ? ch.spent / cal.day : 0;
  const projected = cal.day > 0 ? daily * cal.n : ch.spent;
  const usedRatio = budget > 0 ? ch.spent / budget : 0;
  const projRatio = budget > 0 ? projected / budget : 0;
  const status: BudgetStatus = projRatio > 1 + tol.over ? "over" : projRatio < 1 - tol.under ? "under" : "ok";
  const paceDiff = (usedRatio - cal.frac) * 100;
  const leftDays = cal.n - cal.day;
  const need = leftDays > 0 ? Math.max(0, budget - ch.spent) / leftDays : 0;
  const runOutDay = daily > 0 ? Math.ceil(budget / daily) : null;
  return { budget, daily, projected, usedRatio, projRatio, status, paceDiff, leftDays, need, runOutDay };
}
type Metrics = ReturnType<typeof metrics>;

const PenIcon = () => (
  <svg viewBox="0 0 12 12" strokeWidth="1.4" strokeLinejoin="round" {...s} className="size-[11px] text-(--abt-faint)">
    <path d="M2 10l.5-2.3L8 2.2 9.8 4 4.3 9.5z" />
  </svg>
);
const miniBtn =
  "grid size-7 cursor-pointer place-items-center rounded-[7px] border border-(--abt-line) bg-(--abt-card) text-(--abt-muted) hover:border-(--abt-tick) hover:text-(--abt-ink) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--abt-focus)";
const monoCap = "font-(family-name:--abt-mono) font-semibold tracking-[0.08em] uppercase text-(--abt-faint)";
const numCls = "font-(family-name:--abt-num) tabular-nums tracking-normal";

/**
 * Monthly ad spend per channel against today's ideal pace, with projected
 * month-end spend, over/under warnings and inline budget editing.
 */
export function AdSpendBudgetTracker({
  eyebrow,
  title,
  month,
  asOf,
  channels,
  currency = "USD",
  locale = "en-US",
  tolerance,
  source,
  view: viewProp,
  defaultView = "spent",
  onViewChange,
  sort: sortProp,
  defaultSort = "default",
  onSortChange,
  onBudgetChange,
  labels,
  className,
}: AdSpendBudgetTrackerProps) {
  const L = useMemo(() => ({ ...LABELS, ...labels }), [labels]);
  const uid = useId();
  const tol: BudgetTolerance = { over: num(tolerance?.over) ?? 0.05, under: num(tolerance?.under) ?? 0.15 };

  const money = (v: number, dp = 0) => {
    try {
      return new Intl.NumberFormat(locale, { style: "currency", currency: currency.toUpperCase(), maximumFractionDigits: dp, minimumFractionDigits: dp }).format(v);
    } catch {
      return `$${Math.round(v).toLocaleString("en-US")}`;
    }
  };
  const pct = (v: number, dp = 1) => `${v.toLocaleString(locale, { minimumFractionDigits: dp, maximumFractionDigits: dp })}%`;

  /* ---------- calendar (today only after mount) ---------- */
  const [today, setToday] = useState<Date | null>(null);
  useEffect(() => {
    if (!asOf) setToday(new Date());
  }, [asOf]);
  const cal = useMemo(() => calendar(month, asOf, asOf ? null : today), [month, asOf, today]);
  const monthName = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(new Date(cal.y, cal.m - 1, 1));
    } catch {
      return `${cal.y}-${cal.m}`;
    }
  }, [cal, locale]);
  const dayLabel = (day: number) => {
    try {
      return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(new Date(cal.y, cal.m - 1, day));
    } catch {
      return `day ${day}`;
    }
  };

  /* ---------- channels + budgets ---------- */
  const base = useMemo<Channel[]>(
    () =>
      (Array.isArray(channels) ? channels : []).filter(Boolean).map((c, i) => ({
        id: String(c.id || c.label || `channel-${i + 1}`),
        label: c.label || `Channel ${i + 1}`,
        icon: c.icon && c.icon in CHANNEL_ICON ? c.icon : "dot",
        budget: Math.max(0, num(c.budget) || 0),
        spent: Math.max(0, num(c.spent) || 0),
        order: i,
      })),
    [channels]
  );
  const [budgets, setBudgets] = useState<Record<string, number>>({});
  const [srcBase, setSrcBase] = useState(base);
  if (srcBase !== base) {
    setSrcBase(base);
    setBudgets({});
  }
  const list = base.map((c) => ({ ...c, budget: budgets[c.id] ?? c.budget }));

  /* ---------- view / sort ---------- */
  const [viewState, setViewState] = useState<BudgetView>(defaultView);
  const view: BudgetView = viewProp === "projected" || viewProp === "spent" ? viewProp : viewState;
  const [sortState, setSortState] = useState<BudgetSort>(defaultSort);
  const sort: BudgetSort = sortProp === "used" || sortProp === "default" ? sortProp : sortState;

  /* ---------- FLIP reorder ---------- */
  const rowRefs = useRef<Record<string, HTMLLIElement | null>>({});
  const flip = useRef<{ tops: Map<string, number>; focused: Element | null } | null>(null);
  const captureFlip = () => {
    if (reduceMotion()) return;
    const tops = new Map<string, number>();
    Object.entries(rowRefs.current).forEach(([id, el]) => el && tops.set(id, el.getBoundingClientRect().top));
    flip.current = { tops, focused: document.activeElement };
  };

  const setView = (v: BudgetView) => {
    if (v === view) return;
    if (viewProp === undefined) setViewState(v);
    onViewChange?.(v);
  };
  const toggleSort = () => {
    const next: BudgetSort = sort === "used" ? "default" : "used";
    captureFlip();
    if (sortProp === undefined) setSortState(next);
    onSortChange?.(next);
  };

  const ms = list.map((ch) => ({ ch, m: metrics(ch, cal, tol) }));
  const maxRatio = Math.max(1, ...ms.map((x) => (view === "projected" ? x.m.projRatio : x.m.usedRatio)));
  const domain = maxRatio > 1 ? maxRatio * 1.04 : 1;
  const sorted = ms.slice().sort((a, b) => {
    if (sort !== "used") return a.ch.order - b.ch.order;
    const ra = a.ch.budget > 0 ? a.ch.spent / a.ch.budget : 0;
    const rb = b.ch.budget > 0 ? b.ch.spent / b.ch.budget : 0;
    return rb - ra || a.ch.order - b.ch.order;
  });
  // after any render that followed a captured layout, slide rows from their old place
  useLayoutEffect(() => {
    const f = flip.current;
    flip.current = null;
    if (!f) return;
    if (f.focused && f.focused !== document.activeElement && f.focused instanceof HTMLElement && f.focused.isConnected) f.focused.focus();
    Object.entries(rowRefs.current).forEach(([id, li]) => {
      if (!li) return;
      const before = f.tops.get(id);
      if (before == null) return;
      const dy = before - li.getBoundingClientRect().top;
      if (!dy) return;
      li.animate([{ transform: `translateY(${dy}px)` }, { transform: "none" }], { duration: 420, easing: "cubic-bezier(.2,.7,.2,1)" });
    });
  });

  /* ---------- inline budget editing ---------- */
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState(false);
  const [announce, setAnnounce] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const editBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const refocus = useRef<string | null>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    } else if (refocus.current) {
      editBtnRefs.current[refocus.current]?.focus();
      refocus.current = null;
    }
  }, [editing]);

  const startEdit = (ch: Channel) => {
    setEditing(ch.id);
    setDraft(String(ch.budget));
    setError(false);
  };
  const finish = (ch: Channel, commit: boolean, keepFocus = false) => {
    if (commit) {
      const v = num(draft);
      if (v == null || v <= 0) {
        setError(true);
        inputRef.current?.focus();
        return;
      }
      const next = Math.round(v * 100) / 100;
      if (next !== ch.budget) {
        if (sort === "used") captureFlip();
        setBudgets((prev) => ({ ...prev, [ch.id]: next }));
        const m = metrics({ ...ch, budget: next }, cal, tol);
        setAnnounce(fill(L.announce, { name: ch.label, v: money(next), pct: pct(m.projRatio * 100, 1), status: L[m.status].toLowerCase() }));
        onBudgetChange?.({ id: ch.id, label: ch.label, budget: next, previous: ch.budget, spent: ch.spent, projected: Math.round(m.projected), status: m.status });
      }
    }
    if (!keepFocus) refocus.current = ch.id;
    setEditing(null);
    setError(false);
  };

  /* ---------- tooltip ---------- */
  const cardRef = useRef<HTMLElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<{ id: string; x: number; y: number } | null>(null);
  const onListMove = (e: PointerEvent<HTMLUListElement>) => {
    const bar = (e.target as HTMLElement).closest?.("[data-bar]") as HTMLElement | null;
    if (!bar || e.pointerType === "touch" || !cardRef.current) return setTip(null);
    const id = bar.dataset.bar!;
    const host = cardRef.current.getBoundingClientRect();
    const w = tipRef.current?.offsetWidth || 180;
    const h = tipRef.current?.offsetHeight || 100;
    let x = e.clientX - host.left + 14;
    let y = e.clientY - host.top - h - 12;
    if (x + w > host.width - 8) x = e.clientX - host.left - w - 14;
    if (y < 8) y = e.clientY - host.top + 18;
    setTip({ id, x: clamp(x, 8, Math.max(8, host.width - w - 8)), y });
  };
  const tipData = tip ? ms.find((x) => x.ch.id === tip.id) : undefined;

  /* ---------- summary ---------- */
  const totBudget = ms.reduce((a, x) => a + x.m.budget, 0);
  const totSpent = ms.reduce((a, x) => a + x.ch.spent, 0);
  const totProj = ms.reduce((a, x) => a + x.m.projected, 0);
  const ratio = totBudget > 0 ? totProj / totBudget : 0;
  const totStatus: BudgetStatus = ratio > 1 + tol.over ? "over" : ratio < 1 - tol.under ? "under" : "ok";
  const totDiff = totProj - totBudget;
  const counts = (["over", "under"] as const).map((st) => [st, ms.filter((x) => x.m.status === st).length] as const).filter((x) => x[1]);
  const paceSub = counts.length
    ? counts.map(([st, n]) => `${n} ${L[st].toLowerCase()}`).join(" · ")
    : `${fill(L.channels, { n: ms.length })} · ${L.ok.toLowerCase()}`;
  const kpis: { label: string; big: ReactNode; sub: string }[] = [
    { label: L.kBudget, big: money(totBudget), sub: fill(L.channels, { n: ms.length }) },
    {
      label: L.kSpent,
      big: money(totSpent),
      sub: `${fill(L.usedOf, { pct: pct(totBudget > 0 ? (totSpent / totBudget) * 100 : 0) })} · ${fill(L.paceToday, { v: money(totBudget * cal.frac) })}`,
    },
    {
      label: L.kProjected,
      big: money(totProj),
      sub: Math.abs(totDiff) < 0.5 ? L.onBudget : fill(totDiff > 0 ? L.overBy : L.underBy, { v: money(Math.abs(totDiff)) }),
    },
    { label: L.kPace, big: <Pill status={totStatus} L={L} />, sub: paceSub },
  ];

  const left = cal.n - cal.day;
  const projected = view === "projected";

  const budgetControl = (ch: Channel) => {
    if (editing === ch.id) {
      const errId = `${uid}-err-${ch.id}`;
      return (
        <form
          noValidate
          className="inline-flex flex-wrap items-center justify-end gap-1"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            finish(ch, true);
          }}
          onBlur={(e: FocusEvent<HTMLFormElement>) => {
            if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
            // clicking away with an unchanged value simply closes the editor
            if (num(draft) === ch.budget) finish(ch, false, true);
          }}
        >
          <input
            ref={inputRef}
            type="number"
            min="0"
            step="50"
            inputMode="decimal"
            value={draft}
            aria-label={fill(L.inputLabel, { name: ch.label })}
            aria-invalid={error || undefined}
            aria-describedby={errId}
            onChange={(e) => {
              setDraft(e.target.value);
              setError(false);
            }}
            onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
              if (e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation();
                finish(ch, false);
              }
            }}
            className={cx(
              "box-border w-24 rounded-[7px] border bg-(--abt-card) px-2 py-1.5 text-right text-sm leading-none font-semibold text-(--abt-ink) focus:outline-none",
              numCls,
              error
                ? "border-(--abt-over) shadow-[0_0_0_3px_color-mix(in_oklab,var(--abt-over)_22%,transparent)]"
                : "border-(--abt-focus) shadow-[0_0_0_3px_color-mix(in_oklab,var(--abt-focus)_22%,transparent)]"
            )}
          />
          <button type="submit" aria-label={L.save} className={cx(miniBtn, "border-(--abt-budget) bg-(--abt-budget) text-(--abt-card) hover:border-(--abt-budget) hover:text-(--abt-card)")}>
            <svg viewBox="0 0 12 12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...s} className="size-[13px]">
              <path d="M2.4 6.3 4.9 8.6 9.6 3.6" />
            </svg>
          </button>
          <button type="button" aria-label={L.cancel} onClick={() => finish(ch, false)} className={miniBtn}>
            <svg viewBox="0 0 12 12" strokeWidth="1.8" strokeLinecap="round" {...s} className="size-[13px]">
              <path d="M3 3l6 6M9 3 3 9" />
            </svg>
          </button>
          <span id={errId} aria-live="polite" className={cx("basis-full text-xs text-(--abt-over-ink)", !error && "hidden")}>
            {error ? L.invalid : ""}
          </span>
        </form>
      );
    }
    return (
      <button
        ref={(el) => {
          editBtnRefs.current[ch.id] = el;
        }}
        type="button"
        onClick={() => startEdit(ch)}
        aria-label={fill(L.edit, { name: ch.label, v: money(ch.budget) })}
        className={cx(
          "-mx-0.5 -my-1 inline-flex cursor-pointer items-center gap-[5px] rounded-[7px] border border-dashed border-(--abt-tick) bg-transparent px-[7px] py-1 text-[13px] leading-none font-semibold text-(--abt-ink) transition-[background-color,border-color] duration-200 hover:border-solid hover:bg-(--abt-track) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--abt-focus) motion-reduce:transition-none",
          numCls
        )}
      >
        {money(ch.budget)}
        <PenIcon />
      </button>
    );
  };

  const legend: { key: string; cls: string; text: string; hide?: boolean }[] = [
    { key: "fill", cls: "h-2 w-4 rounded bg-(--abt-ok)", text: projected ? L.lgProjected : L.lgSpent },
    { key: "pace", cls: "h-3.5 w-0 border-l-2 border-dashed border-(--abt-ink) opacity-70", text: L.lgPace, hide: projected },
    { key: "budget", cls: "h-3.5 w-[3px] rounded-[2px] bg-(--abt-budget)", text: L.lgBudget },
    { key: "over", cls: cx("h-2 w-4 rounded-r", OVER_STRIPES), text: L.lgOver },
  ];

  return (
    <div className={cx("@container/abt block w-full max-w-[940px] font-(family-name:--abt-sans) text-(--abt-ink)", className)}>
      <article
        ref={cardRef}
        className="relative overflow-hidden rounded-[14px] border border-(--abt-line) bg-(--abt-card) shadow-[0_26px_52px_-40px_var(--abt-shadow),0_2px_6px_-4px_var(--abt-shadow)] @max-[479px]/abt:rounded-xl"
      >
        {/* header */}
        <header className="grid gap-[18px] border-b border-(--abt-line) bg-(--abt-head) px-[26px] pt-[22px] pb-5 @max-[719px]/abt:px-5 @max-[719px]/abt:pt-5 @max-[719px]/abt:pb-[18px] @max-[479px]/abt:gap-4 @max-[479px]/abt:px-3.5 @max-[479px]/abt:pt-[18px] @max-[479px]/abt:pb-4">
          <div className="flex flex-wrap items-start justify-between gap-x-[22px] gap-y-3.5">
            <div className="grid min-w-0 gap-1.5">
              {eyebrow && <span className={cx(monoCap, "text-[11px] leading-none tracking-[0.1em]")}>{eyebrow}</span>}
              {title && <h2 className="m-0 text-[clamp(19px,3cqi,23px)] leading-[1.2] font-semibold tracking-[-0.012em] text-balance">{title}</h2>}
            </div>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 @max-[479px]/abt:w-full">
              <div role="group" aria-label={L.view} className="inline-flex rounded-[9px] border border-(--abt-line) bg-(--abt-card) p-[3px] @max-[479px]/abt:flex-1">
                {(["spent", "projected"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={v === view}
                    onClick={() => setView(v)}
                    className="cursor-pointer rounded-md border-0 bg-transparent px-3 py-2 text-[12.5px] leading-none font-semibold text-(--abt-muted) transition-colors duration-200 hover:text-(--abt-ink) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--abt-focus) aria-pressed:bg-(--abt-budget) aria-pressed:text-(--abt-card) motion-reduce:transition-none @max-[479px]/abt:flex-1"
                  >
                    {L[v]}
                  </button>
                ))}
              </div>
              <button
                type="button"
                aria-pressed={sort === "used"}
                onClick={toggleSort}
                className="group/sort inline-flex cursor-pointer items-center gap-[7px] rounded-[9px] border border-(--abt-line) bg-(--abt-card) px-3 py-[9px] text-[12.5px] leading-none font-semibold text-(--abt-muted) transition-colors duration-200 hover:text-(--abt-ink) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--abt-focus) aria-pressed:border-(--abt-tick) aria-pressed:text-(--abt-ink) motion-reduce:transition-none"
              >
                <svg
                  viewBox="0 0 14 14"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  {...s}
                  className={cx("size-[13px] transition-transform duration-300 group-aria-pressed/sort:-scale-y-100 motion-reduce:transition-none", EASE)}
                >
                  <path d="M2.5 3.5h9M2.5 7h6M2.5 10.5h3" />
                </svg>
                {sort === "used" ? L.sortOn : L.sort}
              </button>
            </div>
          </div>

          {/* month progress */}
          <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 text-[13px] text-(--abt-muted) @max-[719px]/abt:grid-cols-[minmax(0,1fr)_auto]">
            <span>
              <b className="font-semibold text-(--abt-ink)">{monthName}</b> · {fill(L.day, { d: cal.day, n: cal.n })}
            </span>
            <div
              role="img"
              aria-label={fill(L.monthAria, { month: monthName, d: cal.day, n: cal.n })}
              className="grid h-2.5 auto-cols-[minmax(0,1fr)] grid-flow-col gap-0.5 @max-[719px]/abt:col-span-full @max-[719px]/abt:row-start-2"
            >
              {Array.from({ length: cal.n }, (_, i) => (
                <i
                  key={i}
                  className={cx(
                    "rounded-[2px]",
                    i + 1 < cal.day
                      ? "bg-[color-mix(in_oklab,var(--abt-budget)_72%,var(--abt-card))]"
                      : i + 1 === cal.day
                        ? "bg-(--abt-budget) shadow-[0_0_0_2px_var(--abt-head),0_0_0_3px_var(--abt-budget)]"
                        : "bg-(--abt-track) shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--abt-tick)_22%,transparent)]"
                  )}
                />
              ))}
            </div>
            <span className="whitespace-nowrap tabular-nums">{left > 0 ? fill(L.daysLeft, { n: left }) : L.lastDay}</span>
          </div>

          {/* summary */}
          <dl className="m-0 grid grid-cols-4 border-t border-(--abt-line) pt-4 @max-[719px]/abt:grid-cols-2 @max-[719px]/abt:gap-y-3.5">
            {kpis.map((k) => (
              <div
                key={k.label}
                className="m-0 grid min-w-0 content-start gap-1.5 px-[18px] not-first:border-l not-first:border-(--abt-line) first:pl-0 @max-[719px]/abt:nth-3:border-l-0 @max-[719px]/abt:nth-3:pl-0 @max-[479px]/abt:px-3 @max-[479px]/abt:first:pl-0 @max-[479px]/abt:nth-3:pl-0"
              >
                <dt className={cx(monoCap, "text-[10.5px] leading-[1.2]")}>{k.label}</dt>
                <dd className="m-0 min-w-0">
                  {typeof k.big === "string" ? (
                    <span className={cx(numCls, "text-[clamp(24px,4cqi,32px)] leading-none font-semibold tracking-[-0.01em] @max-[479px]/abt:text-[23px]")}>{k.big}</span>
                  ) : (
                    k.big
                  )}
                </dd>
                <dd className="m-0 text-[12.5px] leading-[1.35] text-(--abt-muted) tabular-nums">{k.sub}</dd>
              </div>
            ))}
          </dl>
        </header>

        {/* channel rows */}
        <ul
          onPointerMove={onListMove}
          onPointerLeave={() => setTip(null)}
          className="m-0 list-none px-[26px] pt-1.5 pb-1 @max-[719px]/abt:px-5 @max-[719px]/abt:py-1 @max-[479px]/abt:px-3.5 @max-[479px]/abt:py-0.5"
        >
          {sorted.map(({ ch, m }) => (
            <Row
              key={ch.id}
              ch={ch}
              m={m}
              L={L}
              cal={cal}
              domain={domain}
              projected={projected}
              money={money}
              pct={pct}
              dayLabel={dayLabel}
              budgetControl={budgetControl(ch)}
              liRef={(el) => {
                rowRefs.current[ch.id] = el;
              }}
            />
          ))}
        </ul>

        {/* legend + footer */}
        <footer className="flex flex-wrap items-center justify-between gap-x-[18px] gap-y-2 border-t border-(--abt-line) px-[26px] pt-3.5 pb-[18px] text-xs text-(--abt-faint) @max-[719px]/abt:px-5 @max-[719px]/abt:pb-4 @max-[479px]/abt:px-3.5 @max-[479px]/abt:pt-3 @max-[479px]/abt:pb-3.5">
          <ul className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1.5 p-0 text-(--abt-muted)">
            {legend
              .filter((x) => !x.hide)
              .map((x) => (
                <li key={x.key} className="inline-flex items-center gap-[7px]">
                  <span aria-hidden="true" className={cx("inline-block flex-none", x.cls)} />
                  {x.text}
                </li>
              ))}
          </ul>
          {source && <span>{source}</span>}
        </footer>

        {/* tooltip */}
        <div
          ref={tipRef}
          aria-hidden="true"
          style={tip ? { left: tip.x, top: tip.y } : undefined}
          className={cx(
            "pointer-events-none absolute top-0 left-0 z-[3] min-w-[170px] rounded-[10px] bg-(--abt-tip) px-3 py-2.5 text-[12.5px] leading-normal text-(--abt-tip-ink) tabular-nums shadow-[0_16px_30px_-16px_var(--abt-shadow)] transition-[opacity,translate] duration-150 motion-reduce:transition-none",
            "[&_span]:flex [&_span]:justify-between [&_span]:gap-4 [&_em]:not-italic [&_em]:opacity-75",
            tip ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
          )}
        >
          {tipData && (
            <>
              <strong className="mb-1 block text-[13px]">{tipData.ch.label}</strong>
              <span>
                <em>{L.tipSpent}</em>
                {money(tipData.ch.spent)} · {pct(tipData.m.usedRatio * 100)}
              </span>
              <span>
                <em>{L.tipPace}</em>
                {money(tipData.m.budget * cal.frac)}
              </span>
              <span>
                <em>{L.tipBudget}</em>
                {money(tipData.m.budget)}
              </span>
              <span>
                <em>{L.tipProj}</em>
                {money(tipData.m.projected)} · {pct(tipData.m.projRatio * 100)}
              </span>
            </>
          )}
        </div>
        <p className="sr-only" aria-live="polite">
          {announce}
        </p>
      </article>
    </div>
  );
}

interface RowProps {
  ch: Channel;
  m: Metrics;
  L: BudgetLabels;
  cal: Calendar;
  domain: number;
  projected: boolean;
  money: (v: number, dp?: number) => string;
  pct: (v: number, dp?: number) => string;
  dayLabel: (day: number) => string;
  budgetControl: ReactNode;
  liRef: (el: HTMLLIElement | null) => void;
}

function Row({ ch, m, L, cal, domain, projected, money, pct, dayLabel, budgetControl, liRef }: RowProps) {
  const shown = projected ? m.projRatio : m.usedRatio;
  const inBudget = Math.min(shown, 1);
  const over = Math.max(0, shown - 1);
  const w = (inBudget / domain) * 100;
  const b = (1 / domain) * 100;
  const o = (over / domain) * 100;
  const p = (cal.frac / domain) * 100;
  const move = "duration-500 ease-[cubic-bezier(.2,.7,.2,1)] motion-reduce:transition-none";

  let notes: ReactNode[];
  if (projected) {
    const diff = m.projected - m.budget;
    notes = [
      <b key="a">{Math.abs(diff) < 0.5 ? L.onBudget : fill(diff > 0 ? L.overBy : L.underBy, { v: money(Math.abs(diff)) })}</b>,
      m.status === "over" && m.runOutDay && m.runOutDay <= cal.n ? (
        <span key="b">{fill(L.runsOut, { date: dayLabel(m.runOutDay) })}</span>
      ) : (
        <span key="b">{fill(L.perDay, { v: money(m.daily) })}</span>
      ),
    ];
  } else {
    const pts = Math.round(m.paceDiff * 10) / 10;
    notes = [
      <b key="a">{Math.abs(pts) < 0.05 ? L.level : fill(pts > 0 ? L.ahead : L.behind, { pts: Math.abs(pts).toFixed(1) })}</b>,
      <span key="b">{fill(L.perDay, { v: money(m.daily) })}</span>,
    ];
    if (m.leftDays > 0) notes.push(<span key="c">{ch.spent >= m.budget ? L.spentAll : fill(L.need, { v: money(m.need) })}</span>);
  }

  return (
    <li
      ref={liRef}
      className={cx(
        "relative grid grid-cols-[210px_minmax(0,1fr)_180px] items-center gap-x-6 gap-y-2 border-b border-(--abt-line) py-[18px] [grid-template-areas:'name_bar_figs'_'name_note_figs'] last:border-b-0",
        "@max-[719px]/abt:grid-cols-[minmax(0,1fr)_auto] @max-[719px]/abt:gap-y-2.5 @max-[719px]/abt:[grid-template-areas:'name_figs'_'bar_bar'_'note_note']",
        "@max-[479px]/abt:gap-x-3",
        TONE[m.status]
      )}
    >
      <div className="flex min-w-0 items-center gap-3 [grid-area:name] @max-[479px]/abt:gap-2.5">
        <span className="grid size-[38px] flex-none place-items-center rounded-[10px] bg-(--abt-track) text-(--abt-budget) [&_svg]:size-[18px] @max-[479px]/abt:size-8 @max-[479px]/abt:rounded-[9px] @max-[479px]/abt:[&_svg]:size-4">
          {CHANNEL_ICON[ch.icon]}
        </span>
        <div className="grid min-w-0 justify-items-start gap-1.5">
          <span className="text-[15px] leading-[1.2] font-semibold [overflow-wrap:anywhere] @max-[479px]/abt:text-sm">{ch.label}</span>
          <Pill status={m.status} L={L} />
        </div>
      </div>

      <div data-bar={ch.id} aria-hidden="true" className="relative flex h-[30px] items-center [grid-area:bar]">
        <div className="relative h-3 w-full rounded-md bg-(--abt-track)">
          <span style={{ width: `${w.toFixed(2)}%` }} className={cx("absolute inset-y-0 left-0 rounded-md bg-(--abt-tone) transition-[width,background-color]", move)} />
          <span
            style={{ left: `${b.toFixed(2)}%`, width: `${o.toFixed(2)}%` }}
            className={cx("absolute inset-y-0 rounded-r-md transition-[width,left,opacity]", OVER_STRIPES, move)}
          />
          <span
            style={{ left: `${b.toFixed(2)}%` }}
            className={cx("pointer-events-none absolute top-1/2 h-[26px] w-[3px] -translate-1/2 rounded-[2px] bg-(--abt-budget) transition-[left,opacity]", move)}
          />
          <span
            style={{ left: `${p.toFixed(2)}%` }}
            className={cx(
              "pointer-events-none absolute top-1/2 h-6 w-0 -translate-1/2 border-l-2 border-dashed border-(--abt-ink) transition-[left,opacity]",
              "after:absolute after:-top-[5px] after:-left-1.5 after:size-0 after:border-x-[5px] after:border-t-[6px] after:border-x-transparent after:border-t-(--abt-ink) after:border-solid after:content-['']",
              projected ? "opacity-0" : "opacity-70",
              move
            )}
          />
        </div>
      </div>

      <div className="grid justify-items-end gap-1.5 text-right [grid-area:figs]">
        <div className={cx(numCls, "text-[28px] leading-none font-semibold @max-[479px]/abt:text-[23px]")}>
          {projected ? (
            money(m.projected)
          ) : (
            <>
              {pct(m.usedRatio * 100)}
              <small className="ml-1 font-(family-name:--abt-sans) text-[12.5px] leading-none font-medium text-(--abt-muted) @max-[479px]/abt:mx-0 @max-[479px]/abt:mt-1 @max-[479px]/abt:block">
                {L.used}
              </small>
            </>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-x-1.5 gap-y-1 text-[13px] text-(--abt-muted) tabular-nums">
          <b className="font-semibold text-(--abt-ink)">{projected ? pct(m.projRatio * 100) : money(ch.spent)}</b> {L.of} {budgetControl}
        </div>
      </div>

      <div className="flex flex-wrap gap-x-3.5 gap-y-[3px] text-[12.5px] text-(--abt-muted) tabular-nums [grid-area:note] [&_b]:font-semibold [&_b]:text-(--abt-tone-ink)">
        {notes}
      </div>

      <span className="sr-only">
        {`${ch.label}: ${L[m.status]}. ${L.tipSpent} ${money(ch.spent)} ${L.of.toLowerCase()} ${money(m.budget)} (${pct(m.usedRatio * 100)}). ${L.tipPace} ${money(m.budget * cal.frac)}. ${L.tipProj} ${money(m.projected)} (${pct(m.projRatio * 100)}).`}
      </span>
    </li>
  );
}

export default AdSpendBudgetTracker;
