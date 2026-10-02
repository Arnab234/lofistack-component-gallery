"use client";

import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode, type Ref } from "react";
import { cx } from "@/lib/format";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface ReportChannel {
  name: string;
  spend: number;
  leads: number;
  booked: number;
}

export interface ReportChecklistItem {
  text: string;
  done?: boolean;
}

export interface ReportPrior {
  label: string;
  spend: number;
  leads: number;
  booked: number;
}

export interface ReportWeek {
  week: number;
  /** Date range, e.g. "14–20 Sep 2026". */
  range?: string;
  /** Issue number for the dateline. Defaults to the week number. */
  issue?: number;
  headline?: string;
  /** The lead story. The first letter becomes a drop cap. */
  lead?: string;
  /** Optional figures to compare the first week against. Later weeks compare with the week before. */
  prior?: ReportPrior;
  /** Key figures, cost per lead and booking rate are all worked out from these rows. */
  channels: ReportChannel[];
  highlights?: string[];
  lowlights?: string[];
  /** Checklist for the following week. */
  next?: ReportChecklistItem[];
}

/** Built-in text; override any key through `labels`. */
export const WMR_LABELS = {
  week: "Week {n}",
  weeks: "Report week",
  prev: "Previous week",
  next: "Next week",
  copy: "Copy summary",
  copied: "Copied",
  print: "Print",
  copiedMsg: "Summary copied to the clipboard.",
  fallbackMsg: "Copy blocked by the browser. The summary is selected below; press Ctrl+C or ⌘C.",
  issue: "Issue {n}",
  leadStory: "This week",
  leads: "Leads",
  booked: "Booked calls",
  cpl: "Cost per lead",
  cplShort: "Cost/lead",
  spend: "Ad spend",
  vs: "vs {label}",
  noCompare: "No earlier week to compare",
  highlights: "Highlights",
  lowlights: "Lowlights",
  channels: "By channel",
  nextWeek: "Next week",
  channel: "Channel",
  bookRate: "Book rate",
  total: "Total",
  tableNote: "Cost per lead counts paid channels only in each row; the total is spend over all leads.",
  progress: "{done} of {total} done",
  example: "Example data",
  summaryNext: "Next week",
  announce: "Showing week {n}, {range}.",
};
export type ReportLabels = typeof WMR_LABELS;

export interface ChecklistToggleDetail {
  week: number;
  index: number;
  text: string;
  done: boolean;
}

/** Imperative API, available through `ref`. */
export interface WeeklyMarketingReportHandle {
  /** Restore every week's checklist to the `done` values in the data. */
  resetChecklists: () => void;
  /** Copy the plain-text summary. Resolves true when the clipboard accepted it. */
  copySummary: () => Promise<boolean>;
}

export interface WeeklyMarketingReportProps {
  /** Masthead title. The last word is set in red. */
  publication?: string;
  client?: string;
  /** Top-line text opposite the client. */
  desk?: string;
  /** Footer credit. */
  preparedBy?: string;
  currency?: string;
  locale?: string;
  weeks: ReportWeek[];
  /** Controlled week number. */
  week?: number;
  /** Initial week when uncontrolled. Defaults to the last week. */
  defaultWeek?: number;
  onWeekChange?: (detail: { week: number; range: string; index: number }) => void;
  onChecklistToggle?: (detail: ChecklistToggleDetail) => void;
  onSummaryCopy?: (detail: { week: number; text: string }) => void;
  labels?: Partial<ReportLabels>;
  ref?: Ref<WeeklyMarketingReportHandle>;
  className?: string;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const fill = (s: string, vars: Record<string, string | number>) => String(s).replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ""));
const num = (v: unknown) => (v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));

interface Totals {
  rows: ReportChannel[];
  spend: number;
  leads: number;
  booked: number;
  cpl: number | null;
}
interface Compare {
  spend: number;
  leads: number;
  booked: number;
  cpl: number | null;
  label: string;
}

function totalsOf(w?: ReportWeek): Totals {
  const rows = (Array.isArray(w?.channels) ? w.channels : []).map((c, i) => ({
    name: c?.name || `Channel ${i + 1}`,
    spend: Math.max(0, num(c?.spend) ?? 0),
    leads: Math.max(0, num(c?.leads) ?? 0),
    booked: Math.max(0, num(c?.booked) ?? 0),
  }));
  const sum = (k: "spend" | "leads" | "booked") => rows.reduce((a, r) => a + r[k], 0);
  const spend = sum("spend");
  const leads = sum("leads");
  return { rows, spend, leads, booked: sum("booked"), cpl: leads > 0 ? spend / leads : null };
}

const Svg = ({ children, className, sw = 1.8, box = 16 }: { children: ReactNode; className?: string; sw?: number; box?: number }) => (
  <svg viewBox={`0 0 ${box} ${box}`} fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
    {children}
  </svg>
);
const CopyIcon = () => (
  <Svg sw={1.5} className="size-3.5">
    <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
    <path d="M10.5 5.5V3.8A1.3 1.3 0 0 0 9.2 2.5H3.8a1.3 1.3 0 0 0-1.3 1.3v5.4a1.3 1.3 0 0 0 1.3 1.3h1.7" />
  </Svg>
);
const PrintIcon = () => (
  <Svg sw={1.5} className="size-3.5">
    <path d="M4.5 6V2.5h7V6" />
    <rect x="2" y="6" width="12" height="5.5" rx="1.2" />
    <path d="M4.5 9.5h7v4h-7z" />
  </Svg>
);
const Tick = ({ className }: { className?: string }) => (
  <Svg sw={2} box={12} className={className}>
    <path d="M2.5 6.3 5 8.6 9.6 3.6" />
  </Svg>
);

const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--wmr-red)";
const ctrl =
  "cursor-pointer appearance-none border-0 bg-transparent font-(family-name:--wmr-sans) text-[12.5px] leading-none font-semibold tracking-[0.01em] text-(--wmr-muted) transition-[background-color,color,box-shadow,border-color] duration-200 motion-reduce:transition-none";
const act = cx(
  ctrl,
  "inline-flex items-center gap-[7px] rounded-full border border-solid border-(--wmr-hair) bg-(--wmr-paper) px-[13px] py-[9px] text-(--wmr-ink) hover:border-(--wmr-ink) disabled:cursor-default disabled:opacity-50 @max-[519px]:flex-[1_1_0] @max-[519px]:justify-center",
  focus
);
const secH =
  "m-0 flex items-baseline justify-between gap-2.5 border-b border-(--wmr-rule) pb-1.5 font-(family-name:--wmr-serif) text-[19px] leading-[1.15] font-bold tracking-[-0.01em]";
const secSmall = "font-(family-name:--wmr-sans) text-[10px] leading-none font-semibold tracking-[0.14em] text-(--wmr-faint) uppercase";
const thCls = "pb-2 pl-2.5 text-right font-(family-name:--wmr-sans) text-[9.5px] leading-[1.2] font-bold tracking-[0.12em] whitespace-nowrap text-(--wmr-muted) uppercase first:pl-0 first:text-left";
const tdBox =
  "py-[9px] @max-[519px]:box-border @max-[519px]:flex @max-[519px]:w-full @max-[519px]:justify-between @max-[519px]:gap-2 @max-[519px]:border-0 @max-[519px]:py-[3px] @max-[519px]:pl-0";
const tdLabel =
  "@max-[519px]:before:text-left @max-[519px]:before:font-(family-name:--wmr-sans) @max-[519px]:before:text-[9.5px] @max-[519px]:before:leading-[1.6] @max-[519px]:before:font-bold @max-[519px]:before:tracking-[0.12em] @max-[519px]:before:text-(--wmr-muted) @max-[519px]:before:uppercase @max-[519px]:before:content-[attr(data-label)]";
const tdCls = cx(tdBox, tdLabel, "border-t border-(--wmr-hair) pl-2.5 text-right whitespace-nowrap");
const tdFoot = cx(tdBox, "border-t-2 border-(--wmr-rule) font-bold");
const tdFootNum = cx(tdFoot, tdLabel, "pl-2.5 text-right whitespace-nowrap");
const PRINT_TOKENS =
  "print:max-w-none print:[--wmr-faint:#555555] print:[--wmr-grain:transparent] print:[--wmr-hair:#BBBBBB] print:[--wmr-ink:#000000] print:[--wmr-muted:#333333] print:[--wmr-paper-2:#FFFFFF] print:[--wmr-paper:#FFFFFF] print:[--wmr-red:#B91C1C] print:[--wmr-rule:#000000] print:[--wmr-shadow:transparent]";

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

/**
 * A one-page weekly report laid out like a newspaper, with key figures, highlights,
 * a channel table and a checklist. Switch weeks, copy a plain-text summary or print it.
 */
export function WeeklyMarketingReport({
  publication = "Weekly Report",
  client,
  desk,
  preparedBy,
  currency = "USD",
  locale = "en-US",
  weeks: weeksProp,
  week: weekProp,
  defaultWeek,
  onWeekChange,
  onChecklistToggle,
  onSummaryCopy,
  labels,
  ref,
  className,
}: WeeklyMarketingReportProps) {
  const L = useMemo(() => ({ ...WMR_LABELS, ...labels }), [labels]);
  const weeks = useMemo(() => (Array.isArray(weeksProp) ? weeksProp : []).filter(Boolean), [weeksProp]);
  const [weekState, setWeekState] = useState<number | undefined>(defaultWeek);
  const want = weekProp ?? weekState;
  const found = want == null ? -1 : weeks.findIndex((w) => num(w.week) === want);
  const idx = found > -1 ? found : weeks.length - 1;
  const w: ReportWeek | undefined = weeks[idx];

  /* checklist state per week, seeded from the data */
  const [checks, setChecks] = useState<Record<string, boolean[]>>({});
  useEffect(() => setChecks({}), [weeks]);
  const state = w ? (checks[String(w.week)] ?? (w.next || []).map((n) => !!n?.done)) : [];

  /* formatting */
  const money = useCallback(
    (v: number, digits: number) => {
      try {
        return new Intl.NumberFormat(locale, { style: "currency", currency, minimumFractionDigits: digits, maximumFractionDigits: digits }).format(v);
      } catch {
        return v.toFixed(digits);
      }
    },
    [locale, currency]
  );
  const int = (v: number) => Math.round(v).toLocaleString(locale);
  const pct = (v: number, d = 1) => v.toLocaleString(locale, { minimumFractionDigits: d, maximumFractionDigits: d }) + "%";

  const t = useMemo(() => totalsOf(w), [w]);
  const c: Compare | null = useMemo(() => {
    if (idx > 0) {
      const pt = totalsOf(weeks[idx - 1]);
      return { ...pt, label: fill(L.week, { n: weeks[idx - 1].week }) };
    }
    const p = w?.prior;
    if (!p) return null;
    const spend = num(p.spend) ?? 0;
    const leads = num(p.leads) ?? 0;
    return { spend, leads, booked: num(p.booked) ?? 0, cpl: leads > 0 ? spend / leads : null, label: p.label || "" };
  }, [idx, weeks, w, L.week]);

  /* week switching */
  const weeksRef = useRef<HTMLDivElement>(null);
  const [animKey, setAnimKey] = useState(0);
  const [srText, setSrText] = useState("");
  const go = (i: number) => {
    if (i < 0 || i >= weeks.length || i === idx) return;
    const nw = weeks[i];
    if (weekProp === undefined) setWeekState(nw.week);
    setAnimKey((k) => k + 1);
    setSrText(fill(L.announce, { n: nw.week, range: nw.range || "" }));
    onWeekChange?.({ week: nw.week, range: nw.range || "", index: i });
  };
  // keep focus in the switcher when a step button becomes disabled
  useEffect(() => {
    const el = weeksRef.current;
    const a = document.activeElement as HTMLButtonElement | null;
    if (el && a && el.contains(a) && a.disabled) el.querySelector<HTMLButtonElement>('[aria-pressed="true"]')?.focus({ preventScroll: true });
  }, [idx]);
  const onWeeksKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    go(idx + (e.key === "ArrowLeft" ? -1 : 1));
  };

  const toggle = (i: number, done: boolean) => {
    if (!w) return;
    const next = state.slice();
    next[i] = done;
    setChecks((m) => ({ ...m, [String(w.week)]: next }));
    onChecklistToggle?.({ week: w.week, index: i, text: w.next?.[i]?.text || "", done });
  };

  /* plain-text summary + copy */
  const summary = () => {
    if (!w) return "";
    const chg = (a: number, b?: number | null) => (c && b ? ` (${a >= b ? "+" : "−"}${pct(Math.abs(((a - b) / b) * 100))} ${fill(L.vs, { label: c.label })})` : "");
    const lines: string[] = [];
    lines.push(`${publication} — ${fill(L.week, { n: w.week })}${w.range ? ", " + w.range : ""}${client ? " · " + client : ""}`);
    lines.push("");
    if (w.headline) lines.push(w.headline.toUpperCase());
    if (w.lead) lines.push(w.lead);
    lines.push("");
    lines.push(`${L.leads}: ${int(t.leads)}${chg(t.leads, c?.leads)}`);
    lines.push(`${L.booked}: ${int(t.booked)}${chg(t.booked, c?.booked)}`);
    if (t.cpl != null) lines.push(`${L.cpl}: ${money(t.cpl, 2)}${c?.cpl ? chg(t.cpl, c.cpl) : ""}`);
    lines.push(`${L.spend}: ${money(t.spend, 0)}${chg(t.spend, c?.spend)}`);
    const block = (title: string, items?: string[]) => {
      if (!items || !items.length) return;
      lines.push("");
      lines.push(title + ":");
      items.forEach((s) => lines.push(`- ${s}`));
    };
    block(L.highlights, w.highlights);
    block(L.lowlights, w.lowlights);
    if (Array.isArray(w.next) && w.next.length) {
      lines.push("");
      lines.push(L.summaryNext + ":");
      w.next.forEach((n, i) => lines.push(`[${state[i] ? "x" : " "}] ${n?.text || ""}`));
    }
    return lines.join("\n");
  };

  const [status, setStatus] = useState("");
  const [copied, setCopied] = useState(false);
  const [fallbackText, setFallbackText] = useState<string | null>(null);
  const copyTimer = useRef<number | undefined>(undefined);
  const fallbackRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => () => window.clearTimeout(copyTimer.current), []);
  useEffect(() => {
    if (fallbackText != null && fallbackRef.current) {
      fallbackRef.current.focus();
      fallbackRef.current.select();
    }
  }, [fallbackText]);

  const summaryRef = useRef(summary);
  const weekRef = useRef(w);
  useEffect(() => {
    summaryRef.current = summary;
    weekRef.current = w;
  });

  const copySummary = useCallback(async (): Promise<boolean> => {
    const text = summaryRef.current();
    const cur = weekRef.current;
    if (!text || !cur) return false;
    setFallbackText(null);
    try {
      await navigator.clipboard.writeText(text);
      setStatus(L.copiedMsg);
      setCopied(true);
      window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => {
        setCopied(false);
        setStatus("");
      }, 2200);
      onSummaryCopy?.({ week: cur.week, text });
      return true;
    } catch {
      setFallbackText(text);
      setStatus(L.fallbackMsg);
      return false;
    }
  }, [L.copiedMsg, L.fallbackMsg, onSummaryCopy]);

  useImperativeHandle(ref, () => ({ resetChecklists: () => setChecks({}), copySummary }), [copySummary]);

  /* masthead name: last word in red */
  const words = publication.split(" ");
  const change = (cur: number, prev: number) => (prev ? ((cur - prev) / prev) * 100 : null);
  const kpis = w
    ? [
        { k: L.leads, v: int(t.leads), d: c ? change(t.leads, c.leads) : null, better: "up" },
        { k: L.booked, v: int(t.booked), d: c ? change(t.booked, c.booked) : null, better: "up" },
        { k: L.cpl, v: t.cpl == null ? "—" : money(t.cpl, 2), d: c && c.cpl != null && t.cpl != null ? change(t.cpl, c.cpl) : null, better: "down" },
        { k: L.spend, v: money(t.spend, 0), d: c ? change(t.spend, c.spend) : null, better: "none" },
      ]
    : [];
  const rates = t.rows.map((r) => (r.leads > 0 ? r.booked / r.leads : 0));
  const bestRate = Math.max(0, ...rates);
  const dash = <span className="text-(--wmr-faint)">—</span>;
  const rate = (r: number, best: boolean) => (
    <span className="inline-flex items-center gap-2">
      <i
        aria-hidden="true"
        style={{ "--p": (r * 100).toFixed(1) } as CSSProperties}
        className={cx(
          "inline-block h-[5px] w-[30px]",
          best ? "bg-[linear-gradient(90deg,var(--wmr-red)_calc(var(--p,0)*1%),var(--wmr-hair)_0)]" : "bg-[linear-gradient(90deg,var(--wmr-ink)_calc(var(--p,0)*1%),var(--wmr-hair)_0)]"
        )}
      />
      <b className={cx("font-bold", best && "text-(--wmr-red)")}>{pct(r * 100, 0)}</b>
    </span>
  );
  const doneCount = state.filter(Boolean).length;

  return (
    <div className={cx("@container block w-full max-w-[940px] font-(family-name:--wmr-serif) text-(--wmr-ink)", PRINT_TOKENS, className)}>
      <div className="grid gap-3.5">
        {/* toolbar (hidden when printing) */}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5 print:hidden @max-[519px]:flex-col @max-[519px]:items-stretch">
          <div
            ref={weeksRef}
            role="group"
            aria-label={L.weeks}
            onKeyDown={onWeeksKey}
            className="inline-flex items-center gap-0.5 rounded-full border border-(--wmr-hair) bg-(--wmr-paper) p-[3px] @max-[519px]:justify-between"
          >
            <button type="button" aria-label={L.prev} disabled={idx <= 0} onClick={() => go(idx - 1)} className={cx(ctrl, "grid h-[30px] w-8 place-items-center rounded-full p-0 enabled:hover:text-(--wmr-ink) disabled:cursor-default disabled:opacity-35", focus)}>
              <Svg className="size-3.5">
                <path d="M10 3.5 5.5 8l4.5 4.5" />
              </Svg>
            </button>
            {weeks.map((x, i) => (
              <span key={x.week} className="contents">
                {i > 0 && (
                  <span aria-hidden="true" className="font-(family-name:--wmr-sans) text-xs leading-none text-(--wmr-faint) @max-[519px]:hidden">
                    ·
                  </span>
                )}
                <button
                  type="button"
                  aria-pressed={i === idx}
                  onClick={() => go(i)}
                  className={cx(ctrl, "rounded-full px-3 py-2 whitespace-nowrap hover:text-(--wmr-ink) aria-pressed:bg-(--wmr-ink) aria-pressed:text-(--wmr-paper) @max-[519px]:px-[9px]", focus)}
                >
                  {fill(L.week, { n: x.week })}
                </button>
              </span>
            ))}
            <button
              type="button"
              aria-label={L.next}
              disabled={idx >= weeks.length - 1}
              onClick={() => go(idx + 1)}
              className={cx(ctrl, "grid h-[30px] w-8 place-items-center rounded-full p-0 enabled:hover:text-(--wmr-ink) disabled:cursor-default disabled:opacity-35", focus)}
            >
              <Svg className="size-3.5">
                <path d="M6 3.5 10.5 8 6 12.5" />
              </Svg>
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" disabled={!w} onClick={() => void copySummary()} className={cx(act, copied && "border-(--wmr-red) text-(--wmr-red) hover:border-(--wmr-red)")}>
              {copied ? <Tick className="size-3.5" /> : <CopyIcon />}
              {copied ? L.copied : L.copy}
            </button>
            <button type="button" onClick={() => window.print()} className={act}>
              <PrintIcon />
              {L.print}
            </button>
          </div>
        </div>
        <p aria-live="polite" className="m-0 min-h-[1em] font-(family-name:--wmr-sans) text-xs leading-[1.3] font-medium text-(--wmr-faint) empty:hidden print:hidden">
          {status}
        </p>
        {fallbackText != null && (
          <textarea
            ref={fallbackRef}
            readOnly
            value={fallbackText}
            aria-label={L.copy}
            className="box-border min-h-[140px] w-full resize-y rounded-[10px] border border-(--wmr-hair) bg-(--wmr-paper) p-3 font-(family-name:--wmr-mono) text-[12.5px] leading-[1.55] text-(--wmr-ink) print:hidden"
          />
        )}

        {/* the sheet */}
        <article className="relative rounded-[4px] border border-(--wmr-hair) bg-[radial-gradient(var(--wmr-grain)_1px,transparent_1.2px),radial-gradient(120%_80%_at_50%_0%,var(--wmr-paper),var(--wmr-paper-2))] bg-size-[4px_4px,auto] px-9 pt-[30px] pb-[22px] shadow-[0_1px_0_rgba(255,255,255,0.5)_inset,0_26px_50px_-36px_var(--wmr-shadow),0_2px_5px_-3px_var(--wmr-shadow)] after:absolute after:top-2 after:-right-2 after:-bottom-2 after:left-2 after:-z-[1] after:rounded-[4px] after:border after:border-(--wmr-hair) after:bg-(--wmr-paper-2) after:content-[''] print:border-0 print:bg-white print:bg-none print:p-0 print:shadow-none print:after:hidden @max-[759px]:px-6 @max-[759px]:pt-6 @max-[759px]:pb-[18px] @max-[519px]:px-4 @max-[519px]:pt-5 @max-[519px]:pb-4 @max-[519px]:after:top-1.5 @max-[519px]:after:-right-[5px] @max-[519px]:after:-bottom-1.5 @max-[519px]:after:left-[5px]">
          {/* masthead */}
          <header className="grid gap-2.5 text-center">
            <div className="flex flex-wrap justify-between gap-x-4 gap-y-1.5 font-(family-name:--wmr-sans) text-[10.5px] leading-[1.2] font-semibold tracking-[0.14em] text-(--wmr-muted) uppercase @max-[519px]:justify-center">
              <span>{client || ""}</span>
              <span>{desk || ""}</span>
            </div>
            <h2 className="m-0 font-(family-name:--wmr-display) text-[clamp(30px,6.6cqi,58px)] leading-[0.98] font-semibold tracking-[-0.02em] text-balance [font-variant:small-caps]">
              {words.length > 1 ? (
                <>
                  {words.slice(0, -1).join(" ")} <span className="text-(--wmr-red)">{words[words.length - 1]}</span>
                </>
              ) : (
                publication
              )}
            </h2>
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 [border-top:3px_double_var(--wmr-rule)] [border-bottom:1px_solid_var(--wmr-rule)] py-[7px] font-(family-name:--wmr-serif) text-[12.5px] leading-[1.2] font-medium text-(--wmr-muted) italic @max-[519px]:justify-center @max-[519px]:text-center">
              <b className="font-bold tracking-[0.02em] text-(--wmr-ink) not-italic">{w ? fill(L.week, { n: w.week }) : ""}</b>
              <span>{w?.range || ""}</span>
              <span>{w ? fill(L.issue, { n: w.issue || w.week }) : ""}</span>
            </div>
          </header>

          {w && (
            <div key={animKey} className={cx("mt-[22px] grid gap-6", animKey > 0 && "animate-[wmr-rise_320ms_cubic-bezier(0.2,0.7,0.2,1)] motion-reduce:animate-none")}>
              {/* lead story */}
              <section className="grid gap-3">
                <span className="font-(family-name:--wmr-sans) text-[10.5px] leading-none font-bold tracking-[0.16em] text-(--wmr-red) uppercase">{L.leadStory}</span>
                <h3 className="m-0 max-w-[26ch] font-(family-name:--wmr-serif) text-[clamp(26px,4.6cqi,40px)] leading-[1.06] font-bold tracking-[-0.02em] text-balance">{w.headline || ""}</h3>
                <p className="m-0 columns-2 gap-x-[34px] text-justify font-(family-name:--wmr-serif) text-base leading-[1.62] text-pretty text-(--wmr-ink) hyphens-auto [column-rule:1px_solid_var(--wmr-hair)] first-letter:float-left first-letter:mt-1.5 first-letter:mr-2 first-letter:font-(family-name:--wmr-display) first-letter:text-[3.5em] first-letter:leading-[0.8] first-letter:font-bold first-letter:text-(--wmr-red) @max-[759px]:columns-1 @max-[759px]:text-left @max-[519px]:text-[15.5px]">
                  {w.lead || ""}
                </p>
              </section>

              {/* key figures */}
              <dl className="m-0 grid grid-cols-4 border-t-2 border-b border-(--wmr-rule) print:break-inside-avoid @max-[759px]:grid-cols-2">
                {kpis.map((x, i) => {
                  const r = x.d == null ? null : Math.round(x.d * 10) / 10;
                  const good = r == null ? null : x.better === "up" ? r > 0 : x.better === "down" ? r < 0 : null;
                  const bad = good === false && r !== 0;
                  return (
                    <div
                      key={x.k}
                      className={cx(
                        "grid min-w-0 content-start gap-1.5 px-[18px] py-3.5 @max-[519px]:py-3 @max-[519px]:pr-2.5",
                        i === 0 && "pl-0",
                        i > 0 && "border-l border-(--wmr-hair)",
                        i === 2 && "@max-[759px]:border-l-0 @max-[759px]:pl-0",
                        i >= 2 && "@max-[759px]:border-t @max-[759px]:border-t-(--wmr-hair)",
                        i % 2 === 0 ? "@max-[519px]:pl-0" : "@max-[519px]:pl-3"
                      )}
                    >
                      <dt className="font-(family-name:--wmr-sans) text-[10px] leading-[1.2] font-bold tracking-[0.14em] text-(--wmr-muted) uppercase">{x.k}</dt>
                      <dd className="m-0">
                        <span className="block font-(family-name:--wmr-serif) text-[clamp(28px,4.4cqi,38px)] leading-none font-bold tracking-[-0.025em] tabular-nums lining-nums @max-[519px]:text-[27px]">{x.v}</span>
                        <span className="mt-1.5 block font-(family-name:--wmr-serif) text-[12.5px] leading-[1.3] font-medium text-(--wmr-muted) italic tabular-nums">
                          {r == null || !c ? (
                            L.noCompare
                          ) : (
                            <>
                              <b className={cx("font-bold not-italic", bad ? "text-(--wmr-red)" : "text-(--wmr-ink)")}>
                                {r > 0 ? "▲" : r < 0 ? "▼" : "▶"} {pct(Math.abs(r))}
                              </b>{" "}
                              {fill(L.vs, { label: c.label })}
                            </>
                          )}
                        </span>
                      </dd>
                    </div>
                  );
                })}
              </dl>

              {/* highlights / lowlights */}
              <div className="grid grid-cols-2 @max-[519px]:grid-cols-1 @max-[519px]:gap-y-[22px]">
                {[
                  { title: L.highlights, items: w.highlights, tag: "▲", up: true },
                  { title: L.lowlights, items: w.lowlights, tag: "▼", up: false },
                ].map((s, i) => (
                  <section
                    key={s.title}
                    className={cx(
                      "grid min-w-0 content-start gap-2.5 print:break-inside-avoid",
                      i === 0 ? "pr-6 @max-[519px]:pr-0" : "border-l border-(--wmr-hair) pl-6 @max-[519px]:border-l-0 @max-[519px]:pl-0"
                    )}
                  >
                    <h3 className={secH}>
                      {s.title}
                      <small className={secSmall}>{s.tag}</small>
                    </h3>
                    <ul className="m-0 grid list-none gap-[9px] p-0">
                      {(s.items || []).map((p, k) => (
                        <li
                          key={k}
                          className={cx(
                            "relative pl-5 font-(family-name:--wmr-serif) text-[14.5px] leading-normal before:absolute before:top-[0.6em] before:left-0.5 before:size-2 before:content-['']",
                            s.up ? "before:bg-(--wmr-ink) before:[clip-path:polygon(50%_0,100%_100%,0_100%)]" : "before:bg-(--wmr-red) before:[clip-path:polygon(0_0,100%_0,50%_100%)]"
                          )}
                        >
                          {String(p)}
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>

              {/* channel table + checklist */}
              <div className="grid grid-cols-[minmax(0,2.1fr)_minmax(0,1fr)] @max-[759px]:grid-cols-1 @max-[759px]:gap-y-6">
                <section className="grid min-w-0 content-start gap-2.5 pr-6 print:break-inside-avoid @max-[759px]:pr-0">
                  <h3 className={secH}>
                    {L.channels}
                    <small className={secSmall}>{w.range || ""}</small>
                  </h3>
                  <table className="w-full border-collapse font-(family-name:--wmr-serif) text-sm leading-[1.3] tabular-nums lining-nums @max-[519px]:block">
                    <caption className="sr-only">
                      {L.channels}, {fill(L.week, { n: w.week })}
                    </caption>
                    <thead className="@max-[519px]:hidden">
                      <tr>
                        {[L.channel, L.spend, L.leads, L.cplShort, L.booked, L.bookRate].map((h) => (
                          <th key={h} scope="col" className={thCls}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="@max-[519px]:block">
                      {t.rows.map((r, i) => {
                        const best = rates[i] === bestRate && bestRate > 0;
                        return (
                          <tr
                            key={r.name + i}
                            className="transition-[background-color] duration-200 hover:bg-(--wmr-red-soft) print:break-inside-avoid motion-reduce:transition-none @max-[519px]:box-border @max-[519px]:grid @max-[519px]:w-full @max-[519px]:grid-cols-2 @max-[519px]:gap-x-3.5 @max-[519px]:border-t @max-[519px]:border-(--wmr-hair) @max-[519px]:py-2.5"
                          >
                            <th
                              scope="row"
                              className="border-t border-(--wmr-hair) py-[9px] text-left font-(family-name:--wmr-serif) text-sm leading-[1.3] font-bold text-(--wmr-ink) @max-[519px]:col-span-full @max-[519px]:block @max-[519px]:border-0 @max-[519px]:pt-0 @max-[519px]:pb-1 @max-[519px]:text-[15px]"
                            >
                              {r.name}
                            </th>
                            <td data-label={L.spend} className={tdCls}>
                              {r.spend > 0 ? money(r.spend, 0) : dash}
                            </td>
                            <td data-label={L.leads} className={tdCls}>
                              {int(r.leads)}
                            </td>
                            <td data-label={L.cplShort} className={tdCls}>
                              {r.spend > 0 && r.leads > 0 ? money(r.spend / r.leads, 2) : dash}
                            </td>
                            <td data-label={L.booked} className={tdCls}>
                              {int(r.booked)}
                            </td>
                            <td data-label={L.bookRate} className={tdCls}>
                              {r.leads > 0 ? rate(rates[i], best) : dash}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="@max-[519px]:block">
                      <tr className="@max-[519px]:box-border @max-[519px]:grid @max-[519px]:w-full @max-[519px]:grid-cols-2 @max-[519px]:gap-x-3.5 @max-[519px]:border-t-2 @max-[519px]:border-(--wmr-rule) @max-[519px]:py-2.5">
                        <td
                          data-label={L.channel}
                          className={cx(tdFoot, "pl-0 text-left whitespace-normal @max-[519px]:col-span-full @max-[519px]:pb-1 @max-[519px]:text-[15px]")}
                        >
                          {L.total}
                        </td>
                        <td data-label={L.spend} className={tdFootNum}>
                          {money(t.spend, 0)}
                        </td>
                        <td data-label={L.leads} className={tdFootNum}>
                          {int(t.leads)}
                        </td>
                        <td data-label={L.cplShort} className={tdFootNum}>
                          {t.cpl == null ? dash : money(t.cpl, 2)}
                        </td>
                        <td data-label={L.booked} className={tdFootNum}>
                          {int(t.booked)}
                        </td>
                        <td data-label={L.bookRate} className={tdFootNum}>
                          {t.leads > 0 ? rate(t.booked / t.leads, false) : dash}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                  <p className="m-0 font-(family-name:--wmr-serif) text-xs leading-[1.4] text-(--wmr-faint) italic">{L.tableNote}</p>
                </section>

                <section className="grid min-w-0 content-start gap-2.5 border-l border-(--wmr-hair) pl-6 print:break-inside-avoid @max-[759px]:border-l-0 @max-[759px]:pl-0">
                  <h3 className={secH}>
                    {L.nextWeek}
                    <small className={secSmall}>{fill(L.progress, { done: doneCount, total: state.length })}</small>
                  </h3>
                  <ul className="m-0 grid list-none gap-1 p-0">
                    {(w.next || []).map((n, i) => (
                      <li key={i}>
                        <label className="group/check grid cursor-pointer grid-cols-[20px_minmax(0,1fr)] items-start gap-2.5 py-1.5 font-(family-name:--wmr-serif) text-[14.5px] leading-[1.45]">
                          <input type="checkbox" checked={!!state[i]} onChange={(e) => toggle(i, e.target.checked)} className="peer absolute m-0 size-px opacity-0" />
                          <span
                            aria-hidden="true"
                            className="mt-px box-border grid size-[18px] place-items-center border-[1.5px] border-(--wmr-ink) bg-transparent text-(--wmr-paper) transition-[background-color,border-color] duration-200 group-hover/check:border-(--wmr-red) peer-checked:border-(--wmr-red) peer-checked:bg-(--wmr-red) peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-(--wmr-red) motion-reduce:transition-none"
                          >
                            <Tick className="size-3 scale-[0.6] opacity-0 transition-[opacity,transform] duration-[250ms] ease-out-soft group-has-[:checked]/check:scale-100 group-has-[:checked]/check:opacity-100 motion-reduce:transition-none" />
                          </span>
                          <span className="bg-[linear-gradient(var(--wmr-red),var(--wmr-red))] bg-size-[0_1.5px] bg-position-[0_55%] bg-no-repeat transition-[background-size,color] duration-[350ms] ease-out-soft [box-decoration-break:clone] [-webkit-box-decoration-break:clone] peer-checked:bg-size-[100%_1.5px] peer-checked:text-(--wmr-faint) motion-reduce:transition-none">
                            {n?.text || ""}
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            </div>
          )}

          <footer className="mt-[22px] flex flex-wrap justify-between gap-x-4 gap-y-1 border-t border-(--wmr-rule) pt-2 font-(family-name:--wmr-serif) text-[11.5px] leading-[1.4] text-(--wmr-faint) italic">
            <span>{preparedBy || ""}</span>
            <span>{[client, L.example].filter(Boolean).join(" · ")}</span>
          </footer>
        </article>
        <p className="sr-only" aria-live="polite">
          {srText}
        </p>
      </div>
    </div>
  );
}

export default WeeklyMarketingReport;
