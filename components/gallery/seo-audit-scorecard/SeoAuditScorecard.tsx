"use client";

import {
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from "react";
import { cx } from "@/lib/format";

export type SeoSeverity = "critical" | "warning" | "notice";
export type SeoSeverityFilter = "all" | SeoSeverity | "fixed";

export interface SeoAuditCategory {
  /** Unique key, referenced by issues[].category. */
  id: string;
  /** Display name, e.g. "Performance". */
  label: string;
  /** 0–100 score with every listed issue still open. */
  score: number;
  /** Weight in the overall average. Defaults to 1. */
  weight?: number;
}

export interface SeoAuditIssue {
  /** Unique key. */
  id: string;
  /** Short, plain description of the problem. */
  title: string;
  severity: SeoSeverity;
  /** Category id. Falls back to the first category. */
  category: string;
  /** Points fixing it adds back to its category. */
  impact: number;
  /** Pages affected. */
  pages?: number;
  /** "Why it matters" text. */
  why?: string;
  /** "How to fix" text. */
  fix?: string;
  /** A few example paths. */
  urls?: string[];
  /** Start the issue as fixed (and verified). */
  fixed?: boolean;
}

export interface SeoAuditLabels {
  all: string;
  critical: string;
  warning: string;
  notice: string;
  fixed: string;
  issues: string;
  filter: string;
  categories: string;
  overall: string;
  grade: string;
  /** Uses {score} and {grade}. */
  potential: string;
  maxed: string;
  /** Uses {n}. */
  pages: string;
  /** Uses {when}. */
  lastRun: string;
  justNow: string;
  open: string;
  openOne: string;
  none: string;
  gain: string;
  pagesAffected: string;
  pageAffected: string;
  pts: string;
  why: string;
  how: string;
  examples: string;
  more: string;
  markFixed: string;
  /** Uses <b>…</b>, {n} and {cat}. */
  fixHint: string;
  fixedHint: string;
  verified: string;
  empty: string;
  clearScope: string;
  rerun: string;
  scanning: string;
  scanTitle: string;
  /** Scan steps; {pages} is replaced with the page count. */
  steps: string[];
  done: string;
  doneNone: string;
  fixedSr: string;
  unfixedSr: string;
}

export interface SeoIssueFixDetail {
  id: string;
  fixed: boolean;
  issue: SeoAuditIssue;
  category: string;
  categoryScore: number;
  overall: number;
  grade: string;
}

export interface SeoAuditRunDetail {
  overall: number;
  grade: string;
  /** Ids of fixes verified by this run. */
  verified: string[];
  categories: Array<{ id: string; score: number }>;
}

export interface SeoAuditScorecardHandle {
  /** Mark an issue fixed or reopen it, exactly as the checkbox does. */
  setFixed: (id: string, fixed: boolean) => void;
  /** Run the scanning state and verify fixes. */
  rerun: () => void;
}

export interface SeoAuditScorecardProps {
  /** Small label above the title. */
  eyebrow?: string;
  /** Report title, usually the client or site name. */
  title?: string;
  /** Domain that was audited. */
  site?: string;
  /** Pages crawled. */
  pages?: number;
  /** When the audit last ran (any text). */
  lastRun?: string;
  categories: SeoAuditCategory[];
  issues: SeoAuditIssue[];
  /** Footer note. */
  source?: string;
  /** Overrides for any built-in text. */
  labels?: Partial<SeoAuditLabels>;
  /** Controlled severity filter. */
  severity?: SeoSeverityFilter;
  /** Initial severity filter when uncontrolled. */
  defaultSeverity?: SeoSeverityFilter;
  onSeverityChange?: (severity: SeoSeverityFilter) => void;
  /** Controlled category scope (a category id, or null for all). */
  category?: string | null;
  /** Initial category scope when uncontrolled. */
  defaultCategory?: string | null;
  onCategoryChange?: (category: string | null) => void;
  /** Fired when an issue is marked fixed or reopened. */
  onIssueFix?: (detail: SeoIssueFixDetail) => void;
  /** Fired when a re-run finishes. */
  onAuditRun?: (detail: SeoAuditRunDetail) => void;
  /** Imperative handle: setFixed(id, fixed) and rerun(). */
  ref?: Ref<SeoAuditScorecardHandle>;
  className?: string;
}

const SEVS: SeoSeverity[] = ["critical", "warning", "notice"];
const FILTERS: SeoSeverityFilter[] = ["all", "critical", "warning", "notice", "fixed"];

export const SEO_AUDIT_LABELS: SeoAuditLabels = {
  all: "All",
  critical: "Critical",
  warning: "Warning",
  notice: "Notice",
  fixed: "Fixed",
  issues: "Issues",
  filter: "Filter issues by severity",
  categories: "Category scores",
  overall: "Overall score",
  grade: "Grade",
  potential: "Fix everything to reach {score} · {grade}",
  maxed: "Every issue is fixed",
  pages: "{n} pages crawled",
  lastRun: "Last run {when}",
  justNow: "just now",
  open: "{n} open",
  openOne: "1 open",
  none: "No open issues",
  gain: "+{n} from fixes",
  pagesAffected: "{n} pages",
  pageAffected: "1 page",
  pts: "+{n} pts",
  why: "Why it matters",
  how: "How to fix",
  examples: "Example pages",
  more: "+{n} more",
  markFixed: "Mark as fixed",
  fixHint: "Adds <b>+{n}</b> to {cat}",
  fixedHint: "Added <b>+{n}</b> to {cat}",
  verified: "Verified on re-run",
  empty: "Nothing in this view. Nice work.",
  clearScope: "Show all categories",
  rerun: "Re-run audit",
  scanning: "Re-running audit",
  scanTitle: "Scanning {site}",
  steps: ["Fetching {pages} pages", "Checking performance", "Checking accessibility", "Checking best practices", "Checking on-page SEO", "Working out scores"],
  done: "Audit complete. {verified} fixes verified · overall {score} · grade {grade}.",
  doneNone: "Audit complete. No changes since the last run · overall {score} · grade {grade}.",
  fixedSr: "{title} marked as fixed. {cat} is now {score}. Overall {overall}, grade {grade}.",
  unfixedSr: "{title} reopened. {cat} is now {score}. Overall {overall}, grade {grade}.",
};

const GRADES: Array<[number, string]> = [[90, "A"], [80, "B"], [70, "C"], [60, "D"], [0, "F"]];
type Tone = "good" | "warn" | "bad";
const gradeOf = (s: number) => (GRADES.find((g) => s >= g[0]) ?? GRADES[4])[1];
const toneOf = (s: number): Tone => (s >= 90 ? "good" : s >= 50 ? "warn" : "bad");
const clamp = (v: number) => Math.max(0, Math.min(100, v));
const fill = (s: string, vars: Record<string, string | number>) => String(s).replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ""));
const reduceMotion = () => typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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

const TONE: Record<Tone, string> = {
  good: "[--sas-c:var(--sas-good)] [--sas-c-soft:var(--sas-good-soft)]",
  warn: "[--sas-c:var(--sas-warn)] [--sas-c-soft:var(--sas-warn-soft)]",
  bad: "[--sas-c:var(--sas-bad)] [--sas-c-soft:var(--sas-bad-soft)]",
};
const SEV_TONE: Record<SeoSeverity | "fixed", string> = {
  critical: TONE.bad,
  warning: TONE.warn,
  notice: "[--sas-c:var(--sas-note)] [--sas-c-soft:var(--sas-note-soft)]",
  fixed: TONE.good,
};
const HI_TONE: Record<Tone, string> = {
  good: "[--sas-c-hi:var(--sas-good-hi)]",
  warn: "[--sas-c-hi:var(--sas-warn-hi)]",
  bad: "[--sas-c-hi:var(--sas-bad-hi)]",
};

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--sas-violet)";
const ease = "ease-out-soft";
const monoLabel = "font-(family-name:--sas-mono) font-semibold uppercase leading-none";

/* ---------- icons ---------- */
const SevIcon = ({ sev }: { sev: SeoSeverity | "fixed" }) => {
  const common = { viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", strokeLinecap: "round" as const, "aria-hidden": true, className: "size-3.5" };
  if (sev === "critical")
    return (
      <svg {...common} strokeWidth="1.7" strokeLinejoin="round">
        <path d="M8 1.8 15 14H1z" />
        <path d="M8 6.4v3.4M8 11.9v.1" />
      </svg>
    );
  if (sev === "warning")
    return (
      <svg {...common} strokeWidth="1.7">
        <circle cx="8" cy="8" r="6.2" />
        <path d="M8 4.8v3.7M8 10.9v.1" />
      </svg>
    );
  if (sev === "notice")
    return (
      <svg {...common} strokeWidth="1.7">
        <circle cx="8" cy="8" r="6.2" />
        <path d="M8 7.4v3.8M8 4.9v.1" />
      </svg>
    );
  return (
    <svg {...common} strokeWidth="1.9" strokeLinejoin="round">
      <path d="m3.2 8.4 3 3 6.6-6.8" />
    </svg>
  );
};

/** Score ring: a 0–100 arc drawn with pathLength=100. */
function Ring({ value, width, className }: { value: number; width: number; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false" className="block size-full -rotate-90">
      <circle cx="50" cy="50" r="42" strokeWidth={width} className={cx("fill-none", className ? "stroke-white/14" : "stroke-(--sas-track)")} />
      <circle
        cx="50"
        cy="50"
        r="42"
        strokeWidth={width}
        pathLength={100}
        strokeDasharray="100"
        strokeLinecap="round"
        style={{ strokeDashoffset: 100 - value }}
        className={cx(
          "fill-none [transition:stroke-dashoffset_.7s_cubic-bezier(.2,.7,.2,1),stroke_.4s_ease] motion-reduce:transition-none",
          className ?? "stroke-(--sas-c)"
        )}
      />
    </svg>
  );
}

/** Animate a number from its previous value to the new one (650 ms, ease-out). */
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
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / 650);
      const v = Math.round(from + (value - from) * (1 - Math.pow(1 - p, 3)));
      shownRef.current = v;
      setShown(v);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return shown;
}

/** True once a value has differed from its first render (so entry animations skip the first paint). */
function useHasChanged<T>(value: T): boolean {
  const [initial] = useState(value);
  const [changed, setChanged] = useState(false);
  if (!changed && value !== initial) setChanged(true);
  return changed || value !== initial;
}

interface IssueState {
  fixed: boolean;
  verified: boolean;
}

interface NormIssue extends SeoAuditIssue {
  urls: string[];
}

interface CatScore {
  id: string;
  label: string;
  weight: number;
  score: number;
  gained: number;
  max: number;
  open: number;
}

function computeScores(cats: Array<{ id: string; label: string; base: number; weight: number }>, issues: NormIssue[], st: Record<string, IssueState>) {
  const out: CatScore[] = cats.map((c) => {
    const mine = issues.filter((i) => i.category === c.id);
    const gained = mine.filter((i) => st[i.id]?.fixed).reduce((s, i) => s + i.impact, 0);
    const left = mine.filter((i) => !st[i.id]?.fixed).reduce((s, i) => s + i.impact, 0);
    return {
      id: c.id,
      label: c.label,
      weight: c.weight,
      score: Math.round(clamp(c.base + gained)),
      gained: Math.round(Math.min(gained, 100 - c.base)),
      max: Math.round(clamp(c.base + gained + left)),
      open: mine.filter((i) => !st[i.id]?.fixed).length,
    };
  });
  const w = out.reduce((s, c) => s + c.weight, 0) || 1;
  const overall = Math.round(out.reduce((s, c) => s + c.score * c.weight, 0) / w);
  const potential = Math.round(out.reduce((s, c) => s + c.max * c.weight, 0) / w);
  return { cats: out, overall, potential, grade: gradeOf(overall), potentialGrade: gradeOf(potential) };
}

/* ---------- category score card ---------- */
function CategoryCard({ c, pressed, L, onClick }: { c: CatScore; pressed: boolean; L: SeoAuditLabels; onClick: () => void }) {
  const shown = useTweened(c.score);
  const gain = c.gained > 0 ? fill(L.gain, { n: c.gained }) : "";
  const animateGain = useHasChanged(gain);
  return (
    <button
      type="button"
      data-cat={c.id}
      aria-pressed={pressed}
      onClick={onClick}
      className={cx(
        "grid min-w-0 cursor-pointer grid-cols-[62px_minmax(0,1fr)] items-center gap-x-3 gap-y-1 rounded-[14px] border border-(--sas-line) bg-(--sas-card) p-3 text-left text-(--sas-ink) [transition:border-color_.2s,background_.2s,box-shadow_.25s,transform_.25s_cubic-bezier(.2,.7,.2,1)] motion-safe:hover:-translate-y-px hover:border-[color-mix(in_oklab,var(--sas-violet)_40%,var(--sas-line))] aria-pressed:border-(--sas-violet) aria-pressed:bg-(--sas-violet-soft) aria-pressed:shadow-[0_0_0_1px_var(--sas-violet)] motion-reduce:transition-none @max-[480px]:grid-cols-1 @max-[480px]:justify-items-center @max-[480px]:px-2 @max-[480px]:py-2.5 @max-[480px]:text-center",
        focusRing
      )}
    >
      <span aria-hidden="true" className={cx("relative row-span-2 size-[62px] @max-[480px]:row-span-1 @max-[480px]:size-14", TONE[toneOf(c.score)])}>
        <Ring value={c.score} width={9} />
        <span className="absolute inset-0 grid place-items-center font-(family-name:--sas-display) text-[19px] leading-none font-[650] tracking-[-0.02em] text-(--sas-c) tabular-nums">
          {shown}
        </span>
      </span>
      <span className="self-end text-[13.5px] leading-[1.2] font-semibold [overflow-wrap:anywhere]">{c.label}</span>
      <span className="flex flex-wrap gap-x-2 gap-y-0.5 self-start text-xs text-(--sas-muted) tabular-nums @max-[480px]:justify-center">
        <span>{c.open === 0 ? L.none : c.open === 1 ? L.openOne : fill(L.open, { n: c.open })}</span>
        {gain && (
          <span key={gain} className={cx("font-semibold text-(--sas-good)", animateGain && `animate-[sas-rise_.45s_cubic-bezier(.2,.7,.2,1)] motion-reduce:animate-none`)}>
            {gain}
          </span>
        )}
      </span>
      <span className="sr-only">, score {c.score} out of 100</span>
    </button>
  );
}

/* ---------- one issue row ---------- */
function IssueRow({
  it,
  st,
  open,
  catLabel,
  L,
  onToggle,
  onFix,
}: {
  it: NormIssue;
  st: IssueState;
  open: boolean;
  catLabel: string;
  L: SeoAuditLabels;
  onToggle: () => void;
  onFix: (fixed: boolean) => void;
}) {
  const detId = useId();
  const sev = st.fixed ? "fixed" : it.severity;
  const shownUrls = it.urls.slice(0, 4);
  const rest = (it.pages ?? it.urls.length) - shownUrls.length;
  return (
    <li
      data-issue={it.id}
      data-open={open}
      className={cx(
        "rounded-xl border bg-(--sas-card) [transition:border-color_.25s,box-shadow_.25s] motion-reduce:transition-none",
        SEV_TONE[sev],
        open
          ? "border-[color-mix(in_oklab,var(--sas-c)_55%,var(--sas-line))] shadow-[0_14px_26px_-22px_var(--sas-shadow)]"
          : "border-(--sas-line) hover:border-[color-mix(in_oklab,var(--sas-c)_35%,var(--sas-line))]"
      )}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={detId}
        onClick={onToggle}
        className={cx(
          "grid w-full cursor-pointer grid-cols-[28px_minmax(0,1fr)_auto_18px] items-center gap-x-3 gap-y-1 rounded-xl border-0 bg-transparent py-[11px] pr-3.5 pl-3 text-left text-inherit @max-[480px]:grid-cols-[28px_minmax(0,1fr)_18px] @max-[480px]:gap-x-2.5 @max-[480px]:p-2.5",
          focusRing
        )}
      >
        <span className="grid size-7 place-items-center rounded-lg bg-(--sas-c-soft) text-(--sas-c)">
          <SevIcon sev={sev} />
        </span>
        <span className="grid min-w-0 gap-1">
          <span className="sr-only">{L[sev]}: </span>
          <span
            className={cx(
              "text-sm leading-[1.3] font-semibold [overflow-wrap:anywhere]",
              st.fixed && "text-(--sas-muted) line-through decoration-[color-mix(in_oklab,var(--sas-good)_60%,transparent)] decoration-[1.5px]"
            )}
          >
            {it.title}
          </span>
          <span className="flex flex-wrap gap-x-2.5 gap-y-[3px] text-xs text-(--sas-muted)">
            <span className="rounded-[5px] bg-(--sas-tint) px-[7px] py-0.5 font-medium shadow-[inset_0_0_0_1px_var(--sas-line)]">{catLabel}</span>
            {it.pages != null && <span>{it.pages === 1 ? L.pageAffected : fill(L.pagesAffected, { n: it.pages })}</span>}
            {st.fixed && st.verified && <span className="font-semibold text-(--sas-good)">{L.verified}</span>}
          </span>
        </span>
        <span className="rounded-[7px] bg-(--sas-c-soft) px-2 py-1.5 text-[13px] leading-none font-[650] whitespace-nowrap text-(--sas-c) tabular-nums @max-[480px]:col-start-2 @max-[480px]:row-start-2 @max-[480px]:justify-self-start @max-[480px]:px-1.5 @max-[480px]:py-1 @max-[480px]:text-xs">
          {fill(L.pts, { n: it.impact })}
        </span>
        <svg
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={cx(
            "size-[18px] text-(--sas-faint) transition-transform duration-300 motion-reduce:transition-none @max-[480px]:col-start-3 @max-[480px]:row-start-1",
            ease,
            open && "rotate-180"
          )}
        >
          <path d="m4 6 4 4 4-4" />
        </svg>
      </button>

      <div
        id={detId}
        className={cx("grid transition-[grid-template-rows] duration-350 motion-reduce:transition-none", ease, open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}
      >
        <div className="min-h-0 overflow-hidden" inert={!open}>
          <div className="mx-3.5 mb-3.5 ml-[52px] grid grid-cols-2 gap-x-[22px] gap-y-3.5 border-t border-dashed border-(--sas-line) pt-3 @max-[760px]:ml-3.5 @max-[620px]:grid-cols-1 @max-[480px]:mx-2.5 @max-[480px]:mb-2.5">
            {it.why && (
              <div className="grid content-start gap-[5px]">
                <h5 className={cx(monoLabel, "m-0 text-[10.5px] tracking-[0.1em] text-(--sas-faint)")}>{L.why}</h5>
                <p className="m-0 text-[13.5px] leading-normal text-(--sas-ink)">{it.why}</p>
              </div>
            )}
            {it.fix && (
              <div className="grid content-start gap-[5px]">
                <h5 className={cx(monoLabel, "m-0 text-[10.5px] tracking-[0.1em] text-(--sas-faint)")}>{L.how}</h5>
                <p className="m-0 text-[13.5px] leading-normal text-(--sas-ink)">{it.fix}</p>
              </div>
            )}
            {shownUrls.length > 0 && (
              <ul aria-label={L.examples} className="col-span-full m-0 flex list-none flex-wrap gap-1.5 p-0">
                {shownUrls.map((u, i) => (
                  <li key={i} className="rounded-md bg-(--sas-tint) px-[7px] py-[5px] font-(family-name:--sas-mono) text-[11.5px] leading-none font-medium text-(--sas-muted) [overflow-wrap:anywhere]">
                    {u}
                  </li>
                ))}
                {rest > 0 && (
                  <li className="rounded-md px-[7px] py-[5px] font-(family-name:--sas-mono) text-[11.5px] leading-none font-medium text-(--sas-muted) shadow-[inset_0_0_0_1px_var(--sas-line)]">
                    {fill(L.more, { n: rest })}
                  </li>
                )}
              </ul>
            )}
            <div className="col-span-full flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5 rounded-[10px] bg-(--sas-tint) px-3 py-2.5">
              <label className="inline-flex cursor-pointer items-center gap-2.5 text-[13.5px] leading-[1.2] font-semibold">
                <input
                  type="checkbox"
                  checked={st.fixed}
                  onChange={(e) => onFix(e.target.checked)}
                  className={cx(
                    "m-0 grid size-5 flex-none cursor-pointer appearance-none place-items-center rounded-md border-[1.5px] border-(--sas-faint) bg-(--sas-card) [transition:background_.2s,border-color_.2s] after:-mt-[3px] after:h-1.5 after:w-2.5 after:scale-0 after:-rotate-45 after:border-0 after:border-b-2 after:border-l-2 after:border-solid after:border-(--sas-card) after:transition-transform after:duration-250 after:content-[''] checked:border-(--sas-good) checked:bg-(--sas-good) checked:after:scale-100 motion-reduce:transition-none motion-reduce:after:transition-none",
                    focusRing
                  )}
                />
                <span>{L.markFixed}</span>
              </label>
              <span className="text-xs text-(--sas-muted) tabular-nums [&_b]:font-semibold [&_b]:text-(--sas-good)">
                {rich(st.fixed ? L.fixedHint : L.fixHint, { n: it.impact, cat: catLabel })}
              </span>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}

/**
 * A site audit as a report card: one letter grade, four category scores and
 * every issue grouped by severity. Mark issues fixed to recompute the grade,
 * then re-run the audit to verify them.
 */
export function SeoAuditScorecard({
  eyebrow,
  title,
  site,
  pages,
  lastRun,
  categories,
  issues,
  source,
  labels,
  severity: severityProp,
  defaultSeverity = "all",
  onSeverityChange,
  category: categoryProp,
  defaultCategory = null,
  onCategoryChange,
  onIssueFix,
  onAuditRun,
  ref,
  className,
}: SeoAuditScorecardProps) {
  const L = useMemo<SeoAuditLabels>(() => ({ ...SEO_AUDIT_LABELS, ...labels }), [labels]);
  const uid = useId();
  const root = useRef<HTMLElement>(null);
  const rerunBtn = useRef<HTMLButtonElement>(null);
  const timers = useRef<number[]>([]);

  /* normalise data: unique ids, known categories */
  const cats = useMemo(() => {
    const seen = new Set<string>();
    return categories.filter(Boolean).map((c, i) => {
      let id = String(c.id || `cat-${i + 1}`);
      while (seen.has(id)) id += "-" + i;
      seen.add(id);
      return { id, label: c.label || id, base: clamp(Number.isFinite(c.score) ? c.score : 0), weight: Math.max(0, c.weight ?? 1) };
    });
  }, [categories]);
  const list = useMemo<NormIssue[]>(() => {
    const ids = new Set(cats.map((c) => c.id));
    const seen = new Set<string>();
    return issues.filter(Boolean).map((x, i) => {
      let id = String(x.id || `issue-${i + 1}`);
      while (seen.has(id)) id += "-" + i;
      seen.add(id);
      return {
        ...x,
        id,
        title: x.title || "Issue",
        severity: SEVS.includes(x.severity) ? x.severity : "notice",
        category: ids.has(x.category) ? x.category : (cats[0]?.id ?? ""),
        impact: Math.max(0, Number.isFinite(x.impact) ? x.impact : 0),
        urls: (x.urls ?? []).map(String),
      };
    });
  }, [issues, cats]);

  /* issue state (fixed / verified), mirrored in a ref so imperative calls see the latest */
  const [st, setSt] = useState<Record<string, IssueState>>(() =>
    Object.fromEntries(issues.map((x) => [x.id, { fixed: !!x.fixed, verified: !!x.fixed }]))
  );
  const stRef = useRef(st);
  const commit = (next: Record<string, IssueState>) => {
    stRef.current = next;
    setSt(next);
  };
  const stateOf = (id: string): IssueState => st[id] ?? { fixed: false, verified: false };

  /* filters (controlled or not) */
  const [sevInner, setSevInner] = useState<SeoSeverityFilter>(defaultSeverity);
  const severity = FILTERS.includes(severityProp ?? sevInner) ? (severityProp ?? sevInner) : "all";
  const setSeverity = (v: SeoSeverityFilter) => {
    if (severityProp === undefined) setSevInner(v);
    onSeverityChange?.(v);
  };
  const [catInner, setCatInner] = useState<string | null>(defaultCategory);
  const rawCat = categoryProp !== undefined ? categoryProp : catInner;
  const category = rawCat && cats.some((c) => c.id === rawCat) ? rawCat : null;
  const setCategory = (v: string | null) => {
    if (categoryProp === undefined) setCatInner(v);
    onCategoryChange?.(v);
  };

  const [openId, setOpenId] = useState<string | null>(null);
  const [runLabel, setRunLabel] = useState(lastRun ?? "");
  const [scanStep, setScanStep] = useState<number | null>(null);
  const [done, setDone] = useState<{ msg: string; n: number } | null>(null);
  const [sr, setSr] = useState("");
  const scanning = scanStep !== null;

  const S = useMemo(() => computeScores(cats, list, st), [cats, list, st]);
  const overallShown = useTweened(S.overall);
  const animateGrade = useHasChanged(S.grade);

  const later = useCallback((fn: () => void, ms: number) => {
    const t = window.setTimeout(() => {
      timers.current = timers.current.filter((x) => x !== t);
      fn();
    }, ms);
    timers.current.push(t);
  }, []);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const say = useCallback(
    (t: string) => {
      setSr("");
      later(() => setSr(t), 60);
    },
    [later]
  );

  /* FLIP + focus hand-off after an issue moves between groups */
  const pending = useRef<Array<{ id: string; top: number | null; hadFocus: boolean; fromUi: boolean; target: SeoSeverityFilter }>>([]);
  useLayoutEffect(() => {
    const el = root.current;
    const jobs = pending.current;
    pending.current = [];
    if (!el || !jobs.length) return;
    for (const job of jobs) {
      const li = el.querySelector<HTMLElement>(`[data-issue="${CSS.escape(job.id)}"]`);
      if (li) {
        if (job.hadFocus) li.querySelector("input")?.focus({ preventScroll: true });
        if (job.top != null && !reduceMotion() && typeof li.animate === "function") {
          const after = li.getBoundingClientRect();
          li.animate([{ transform: `translateY(${job.top - after.top}px)`, opacity: 0.6 }, { transform: "none", opacity: 1 }], {
            duration: 450,
            easing: "cubic-bezier(.2,.7,.2,1)",
          });
        }
        if (job.fromUi) {
          const r = li.getBoundingClientRect();
          if (r.top < 0 || r.bottom > window.innerHeight) li.scrollIntoView({ block: "nearest", behavior: reduceMotion() ? "auto" : "smooth" });
        }
      } else if (job.hadFocus) {
        // the issue left the current view: hand focus to the filter that now holds it
        const b = el.querySelector<HTMLElement>(`[data-filter="${job.target}"]`) ?? el.querySelector<HTMLElement>("[data-filter]");
        b?.focus();
      }
    }
  }, [st]);

  const setFixed = (id: string, fixed: boolean, fromUi: boolean) => {
    const it = list.find((i) => i.id === id);
    const cur = stRef.current[id] ?? { fixed: false, verified: false };
    if (!it || cur.fixed === fixed) return;
    const li = root.current?.querySelector<HTMLElement>(`[data-issue="${CSS.escape(id)}"]`) ?? null;
    pending.current.push({
      id,
      top: li ? li.getBoundingClientRect().top : null,
      hadFocus: !!li && li.contains(document.activeElement),
      fromUi,
      target: fixed ? "fixed" : it.severity,
    });
    const next = { ...stRef.current, [id]: { fixed, verified: fixed ? cur.verified : false } };
    commit(next);
    const scores = computeScores(cats, list, next);
    const c = scores.cats.find((x) => x.id === it.category);
    say(fill(fixed ? L.fixedSr : L.unfixedSr, { title: it.title, cat: c?.label ?? "", score: c?.score ?? 0, overall: scores.overall, grade: scores.grade }));
    const { urls, ...rest } = it;
    onIssueFix?.({
      id,
      fixed,
      issue: { ...rest, urls, fixed },
      category: it.category,
      categoryScore: c?.score ?? 0,
      overall: scores.overall,
      grade: scores.grade,
    });
  };

  const rerun = () => {
    if (scanStep !== null) return;
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    const steps = (Array.isArray(L.steps) ? L.steps : SEO_AUDIT_LABELS.steps).map((s) =>
      fill(s, { pages: pages ?? "" }).replace(/\s+/g, " ").trim()
    );
    const quick = reduceMotion();
    const stepMs = quick ? 160 : 340;
    setDone(null);
    setScanStep(0);
    say(L.scanning);
    steps.forEach((_, i) => later(() => setScanStep(i + 1), stepMs * (i + 1)));
    later(() => {
      const cur = stRef.current;
      const verified = list.filter((i) => cur[i.id]?.fixed && !cur[i.id]?.verified).map((i) => i.id);
      const next = { ...cur };
      verified.forEach((id) => (next[id] = { fixed: true, verified: true }));
      commit(next);
      setRunLabel(L.justNow);
      setScanStep(null);
      const scores = computeScores(cats, list, next);
      const msg = fill(verified.length ? L.done : L.doneNone, { verified: verified.length, score: scores.overall, grade: scores.grade });
      setDone((d) => ({ msg, n: (d?.n ?? 0) + 1 }));
      say(msg);
      onAuditRun?.({ overall: scores.overall, grade: scores.grade, verified, categories: scores.cats.map((c) => ({ id: c.id, score: c.score })) });
    }, stepMs * (steps.length + 1) + (quick ? 0 : 200));
  };

  // focus the re-run button again when scanning ends
  const wasScanning = useRef(false);
  useEffect(() => {
    if (wasScanning.current && !scanning) rerunBtn.current?.focus({ preventScroll: true });
    wasScanning.current = scanning;
  }, [scanning]);

  useImperativeHandle(ref, () => ({ setFixed: (id, fixed) => setFixed(id, !!fixed, false), rerun }));

  const steps = (Array.isArray(L.steps) ? L.steps : SEO_AUDIT_LABELS.steps).map((s) => fill(s, { pages: pages ?? "" }).replace(/\s+/g, " ").trim());
  const progress = scanStep !== null ? Math.round((scanStep / steps.length) * 100) : 0;
  const stepText = scanStep !== null ? steps[Math.min(scanStep, steps.length - 1)] + (scanStep < steps.length ? "…" : "") : "";

  /* issue groups */
  const inCat = list.filter((i) => !category || i.category === category);
  const count = (f: SeoSeverityFilter) =>
    f === "all" ? inCat.length : f === "fixed" ? inCat.filter((i) => stateOf(i.id).fixed).length : inCat.filter((i) => !stateOf(i.id).fixed && i.severity === f).length;
  const groupKeys: Array<SeoSeverity | "fixed"> = severity === "all" ? [...SEVS, "fixed"] : [severity];
  const groups = groupKeys
    .map((k) => ({
      k,
      items: inCat
        .filter((i) => (k === "fixed" ? stateOf(i.id).fixed : !stateOf(i.id).fixed && i.severity === k))
        .sort((a, b) => b.impact - a.impact || a.title.localeCompare(b.title, "en-US")),
    }))
    .filter((g) => g.items.length > 0);
  const scopeCat = category ? cats.find((c) => c.id === category) : null;

  const onGroupsKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Escape" || !openId) return;
    const id = openId;
    setOpenId(null);
    root.current?.querySelector<HTMLElement>(`[data-issue="${CSS.escape(id)}"] button`)?.focus();
  };

  const sealTone = toneOf(S.overall);

  return (
    <div className={cx("@container block w-full max-w-[940px] font-(family-name:--sas-sans) text-(--sas-ink)", className)}>
      <article
        ref={root}
        aria-busy={scanning || undefined}
        className="relative overflow-hidden rounded-[20px] border border-(--sas-line) bg-(--sas-card) shadow-[0_30px_60px_-46px_var(--sas-shadow),0_2px_6px_-4px_var(--sas-shadow)] @max-[480px]:rounded-2xl"
      >
        {/* report header band */}
        <header className="relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-7 gap-y-[18px] [background:radial-gradient(70%_120%_at_100%_0%,color-mix(in_oklab,var(--sas-head-2)_90%,transparent),transparent_60%),linear-gradient(var(--sas-head-line)_1px,transparent_1px)_0_0/100%_24px,var(--sas-head)] px-7 pt-[26px] pb-6 text-(--sas-head-ink) @max-[760px]:px-5 @max-[760px]:py-[22px] @max-[620px]:grid-cols-1 @max-[480px]:px-3.5 @max-[480px]:py-[18px]">
          <div className="grid min-w-0 gap-2">
            {eyebrow && <span className={cx(monoLabel, "text-[11px] tracking-[0.12em] text-(--sas-head-muted)")}>{eyebrow}</span>}
            {title && (
              <h2 className="m-0 font-(family-name:--sas-display) text-[clamp(22px,3.8cqi,30px)] leading-[1.1] font-[650] tracking-[-0.02em] [overflow-wrap:anywhere]">
                {title}
              </h2>
            )}
            {site && (
              <span className="inline-flex items-center gap-[7px] font-(family-name:--sas-mono) text-[13px] leading-[1.2] font-medium text-(--sas-head-muted) [overflow-wrap:anywhere]">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true" className="size-[13px] flex-none">
                  <circle cx="8" cy="8" r="6.3" />
                  <path d="M1.8 8h12.4M8 1.7c2 2 2 10.6 0 12.6M8 1.7c-2 2-2 10.6 0 12.6" />
                </svg>
                {site}
              </span>
            )}
            <ul className="m-0 mt-1 flex list-none flex-wrap gap-x-4 gap-y-1.5 p-0 text-[12.5px] text-(--sas-head-muted) tabular-nums [&_b]:font-semibold [&_b]:text-(--sas-head-ink)">
              {pages != null && <li>{rich(fill(L.pages, { n: "<b>" + pages.toLocaleString("en-US") + "</b>" }), {})}</li>}
              {runLabel && <li>{rich(fill(L.lastRun, { when: "<b>" + runLabel + "</b>" }), {})}</li>}
            </ul>
            <button
              ref={rerunBtn}
              type="button"
              onClick={rerun}
              disabled={scanning}
              className="group/rr mt-2 inline-flex cursor-pointer items-center gap-2 justify-self-start rounded-[10px] border border-white/28 bg-white/8 py-[9px] pr-3.5 pl-3 font-(family-name:--sas-sans) text-[13px] leading-none font-semibold text-(--sas-head-ink) [transition:background_.2s,border-color_.2s] enabled:hover:border-white/45 enabled:hover:bg-white/16 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--sas-head-ink) disabled:cursor-progress disabled:opacity-70 motion-reduce:transition-none"
            >
              <svg
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className={cx("size-3.5 transition-transform duration-500 motion-reduce:transition-none", ease, !scanning && "motion-safe:group-hover/rr:-rotate-[120deg]")}
              >
                <path d="M13.5 8a5.5 5.5 0 1 1-1.7-4" />
                <path d="M13.6 2.2v3.4h-3.4" />
              </svg>
              {L.rerun}
            </button>
          </div>

          <div className="grid grid-cols-[auto_auto] items-center gap-x-[18px] gap-y-1.5 @max-[620px]:row-start-1 @max-[620px]:justify-start @max-[480px]:gap-x-3.5">
            <div
              role="img"
              aria-label={`${L.grade} ${S.grade}, ${L.overall.toLowerCase()} ${S.overall} / 100`}
              className={cx("relative size-32 @max-[620px]:size-[104px] @max-[480px]:size-[92px]", HI_TONE[sealTone])}
            >
              <Ring value={S.overall} width={7} className="stroke-(--sas-c-hi)" />
              <div aria-hidden="true" className="absolute inset-0 grid place-items-center content-center gap-0.5">
                <b
                  key={S.grade}
                  className={cx(
                    "font-(family-name:--sas-display) text-[52px] leading-[0.9] font-[750] tracking-[-0.04em] text-(--sas-head-ink) @max-[620px]:text-[42px] @max-[480px]:text-[38px]",
                    animateGrade && "animate-[sas-pop_.45s_cubic-bezier(.2,.7,.2,1)] motion-reduce:animate-none"
                  )}
                >
                  {S.grade}
                </b>
                <small className={cx(monoLabel, "text-[10px] tracking-[0.1em] text-(--sas-head-muted)")}>{L.grade}</small>
              </div>
            </div>
            <div className="grid gap-1">
              <span className={cx(monoLabel, "text-[10.5px] tracking-[0.1em] text-(--sas-head-muted)")}>{L.overall}</span>
              <span className="font-(family-name:--sas-display) text-[40px] leading-none font-[650] tracking-[-0.03em] tabular-nums @max-[480px]:text-[32px]">
                {overallShown}
                <small className="ml-[3px] text-[0.42em] tracking-normal text-(--sas-head-muted)">/ 100</small>
              </span>
              <span className="max-w-[18ch] text-[12.5px] leading-[1.35] text-(--sas-head-muted) [&_b]:font-semibold [&_b]:text-(--sas-good-hi)">
                {S.potential > S.overall ? rich(L.potential.replace("{score} · {grade}", "<b>{score} · {grade}</b>"), { score: S.potential, grade: S.potentialGrade }) : L.maxed}
              </span>
            </div>
          </div>
        </header>

        {/* body */}
        <div className="relative px-7 pt-[22px] pb-5 @max-[760px]:px-5 @max-[760px]:pt-5 @max-[760px]:pb-[18px] @max-[480px]:px-3 @max-[480px]:pt-4 @max-[480px]:pb-3.5">
          {done && (
            <div
              key={done.n}
              className="mb-3.5 flex animate-[sas-rise_.4s_cubic-bezier(.2,.7,.2,1)] items-center gap-2 rounded-[10px] bg-(--sas-good-soft) px-3 py-2.5 text-[13px] text-(--sas-ink) motion-reduce:animate-none"
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-[15px] flex-none text-(--sas-good)">
                <circle cx="8" cy="8" r="6.3" />
                <path d="m5.2 8.2 2 2 3.8-4" />
              </svg>
              {done.msg}
            </div>
          )}

          <div role="group" aria-label={L.categories} inert={scanning} className="grid grid-cols-4 gap-2.5 @max-[760px]:grid-cols-2 @max-[480px]:gap-2">
            {S.cats.map((c) => (
              <CategoryCard key={c.id} c={c} L={L} pressed={c.id === category} onClick={() => setCategory(category === c.id ? null : c.id)} />
            ))}
          </div>

          <div className="mt-[22px] flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5">
            <h3 inert={scanning} className="m-0 flex flex-wrap items-center gap-2.5 font-(family-name:--sas-display) text-[17px] leading-[1.2] font-[650] tracking-[-0.01em]">
              <span>{L.issues}</span>
              {scopeCat && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-(--sas-violet-soft) py-1 pr-1.5 pl-2.5 font-(family-name:--sas-sans) text-xs leading-none font-semibold text-(--sas-violet)">
                  {scopeCat.label}
                  <button
                    type="button"
                    aria-label={L.clearScope}
                    onClick={() => {
                      setCategory(null);
                      root.current?.querySelector<HTMLElement>("[data-cat]")?.focus();
                    }}
                    className={cx("grid size-[18px] cursor-pointer place-items-center rounded-full border-0 bg-transparent text-inherit hover:bg-[color-mix(in_oklab,var(--sas-violet)_18%,transparent)]", focusRing)}
                  >
                    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true" className="size-2.5">
                      <path d="m3 3 6 6M9 3 3 9" />
                    </svg>
                  </button>
                </span>
              )}
            </h3>
            <div role="group" aria-label={L.filter} inert={scanning} className="flex flex-wrap gap-1 rounded-[11px] border border-(--sas-line) bg-(--sas-tint) p-[3px] @max-[480px]:w-full">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  type="button"
                  data-filter={f}
                  aria-pressed={f === severity}
                  onClick={() => f !== severity && setSeverity(f)}
                  className={cx(
                    "group/sev inline-flex cursor-pointer items-center gap-1.5 rounded-lg border-0 bg-transparent px-2.5 py-[7px] text-[12.5px] leading-none font-semibold text-(--sas-muted) [transition:background_.2s,color_.2s,box-shadow_.2s] hover:text-(--sas-ink) aria-pressed:bg-(--sas-card) aria-pressed:text-(--sas-ink) aria-pressed:shadow-[0_1px_3px_-1px_var(--sas-shadow),0_0_0_1px_var(--sas-line)] motion-reduce:transition-none @max-[480px]:flex-auto @max-[480px]:justify-center @max-[480px]:px-1.5",
                    f !== "all" && SEV_TONE[f],
                    focusRing
                  )}
                >
                  {f !== "all" && <i aria-hidden="true" className="size-[7px] rounded-full bg-(--sas-c)" />}
                  {L[f]}
                  <b className="font-semibold text-(--sas-faint) tabular-nums group-aria-pressed/sev:text-(--sas-ink)">{count(f)}</b>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3.5 grid gap-[18px]" inert={scanning} onKeyDown={onGroupsKey}>
            {groups.map((g) => {
              const hid = `${uid}-g-${g.k}`;
              return (
                <section key={g.k} aria-labelledby={hid} className={cx("grid gap-2", SEV_TONE[g.k])}>
                  <h4
                    id={hid}
                    className={cx(
                      monoLabel,
                      "m-0 flex items-center gap-2 text-[11px] tracking-[0.1em] text-(--sas-c) after:order-1 after:h-px after:flex-1 after:bg-(--sas-line) after:content-['']"
                    )}
                  >
                    {L[g.k]}
                    <span className="order-2 ml-auto tracking-[0.04em] text-(--sas-faint)">{g.items.length}</span>
                  </h4>
                  <ul className="m-0 grid list-none gap-1.5 p-0">
                    {g.items.map((it) => (
                      <IssueRow
                        key={it.id}
                        it={it}
                        st={stateOf(it.id)}
                        open={openId === it.id}
                        catLabel={cats.find((c) => c.id === it.category)?.label ?? ""}
                        L={L}
                        onToggle={() => setOpenId((o) => (o === it.id ? null : it.id))}
                        onFix={(fx) => setFixed(it.id, fx, true)}
                      />
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
          {groups.length === 0 && (
            <p className="m-0 rounded-xl border border-dashed border-(--sas-line) p-[22px] text-center text-[13.5px] text-(--sas-muted)">{L.empty}</p>
          )}
          {source && <p className="m-0 mt-[18px] border-t border-(--sas-line) pt-3 text-xs text-(--sas-faint)">{source}</p>}

          {/* scanning overlay */}
          <div
            aria-hidden={!scanning}
            className={cx(
              "absolute inset-0 z-[2] grid place-items-start justify-center bg-[color-mix(in_oklab,var(--sas-card)_82%,transparent)] px-5 pt-[70px] pb-5 backdrop-blur-[3px] motion-reduce:transition-none",
              scanning ? "visible opacity-100 [transition:opacity_.3s_ease]" : "invisible opacity-0 [transition:opacity_.3s_ease,visibility_0s_linear_.3s]"
            )}
          >
            <div className="grid w-[min(360px,100%)] gap-3 rounded-2xl border border-(--sas-line) bg-(--sas-card) p-5 shadow-[0_24px_48px_-30px_var(--sas-shadow)]">
              <div className="flex items-baseline justify-between gap-2.5">
                <span className="font-(family-name:--sas-display) text-[15px] leading-[1.25] font-[650]">{fill(L.scanTitle, { site: site ?? "" }).trim()}</span>
                <span className="font-(family-name:--sas-mono) text-[13px] leading-none font-semibold text-(--sas-violet) tabular-nums">{progress}%</span>
              </div>
              <div className="relative h-[34px] overflow-hidden rounded-lg bg-[repeating-linear-gradient(90deg,var(--sas-tint)_0_10px,transparent_10px_14px)] after:absolute after:inset-y-0 after:w-[40%] after:animate-[sas-sweep_1.1s_linear_infinite] after:bg-[linear-gradient(90deg,transparent,color-mix(in_oklab,var(--sas-violet)_30%,transparent),transparent)] after:content-[''] motion-reduce:after:animate-none" />
              <div className="h-1.5 overflow-hidden rounded-[3px] bg-(--sas-track)">
                <i
                  className="block h-full rounded-[inherit] bg-[linear-gradient(90deg,var(--sas-head-2),var(--sas-violet))] transition-[width] duration-350 ease-in-out motion-reduce:transition-none"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="m-0 min-h-[1.4em] text-[13px] text-(--sas-muted)">{stepText}</p>
            </div>
          </div>
        </div>
        <p className="sr-only" aria-live="polite">
          {sr}
        </p>
      </article>
    </div>
  );
}

export default SeoAuditScorecard;
