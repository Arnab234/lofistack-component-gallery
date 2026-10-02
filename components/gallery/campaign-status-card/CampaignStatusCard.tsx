"use client";

import { useEffect, useId, useImperativeHandle, useRef, useState, type KeyboardEvent, type ReactNode, type Ref } from "react";
import { MONTHS, cx } from "@/lib/format";

export const CAMPAIGN_STEPS = ["draft", "scheduled", "live", "paused", "completed"] as const;
export type CampaignLifecycle = (typeof CAMPAIGN_STEPS)[number];
export type CampaignAction = "schedule" | "launch" | "pause" | "resume" | "end";
export type CampaignLogAction = "created" | "scheduled" | "launched" | "paused" | "resumed" | "ended";
export type CampaignChannelType = "search" | "social" | "video" | "display" | "email";

export interface CampaignChannel {
  name: string;
  /** Picks the glyph. */
  type?: CampaignChannelType;
  spent?: number;
  leads?: number;
}

export interface CampaignLogEntry {
  action: CampaignLogAction;
  by?: string;
  /** "YYYY-MM-DDTHH:mm" (local time). */
  at?: string;
}

export interface CampaignStatusChangeDetail {
  from: CampaignLifecycle;
  to: CampaignLifecycle;
  action: CampaignAction;
  by: string;
  /** ISO timestamp of the change. */
  at: string;
}

/** Methods available through `ref`. */
export interface CampaignStatusHandle {
  /** True when the action is allowed from the current status. */
  can: (action: CampaignAction) => boolean;
  /** Run a lifecycle action, skipping the confirm step. Returns true when the state changed. */
  transition: (action: CampaignAction) => boolean;
  readonly status: CampaignLifecycle;
}

export interface CampaignStatusCardProps {
  name: string;
  client?: string;
  /** Campaign reference, shown in the eyebrow. */
  campaignId?: string;
  objective?: string;
  owner?: string;
  /** Status to show. Defaults to the state of the last log entry. Changing it later moves the card to that status. */
  status?: CampaignLifecycle;
  /** Date used for flight and pacing maths, YYYY-MM-DD. Defaults to the real date (set after mount). */
  today?: string;
  /** Flight dates, YYYY-MM-DD, both days included. */
  flight?: { start: string; end: string };
  budget?: number;
  spent?: number;
  currency?: string;
  locale?: string;
  channels?: CampaignChannel[];
  /** Past changes, oldest first. */
  log?: CampaignLogEntry[];
  /** Name recorded for changes made in the card. */
  user?: string;
  /** Fires after every lifecycle move. */
  onStatusChange?: (detail: CampaignStatusChangeDetail) => void;
  ref?: Ref<CampaignStatusHandle>;
  className?: string;
}

const STATE_LABEL: Record<CampaignLifecycle, string> = { draft: "Draft", scheduled: "Scheduled", live: "Live", paused: "Paused", completed: "Completed" };
const ACTIONS: Record<CampaignAction, { label: string; from: CampaignLifecycle[]; to: CampaignLifecycle; verb: CampaignLogAction; confirm?: boolean }> = {
  schedule: { label: "Schedule", from: ["draft"], to: "scheduled", verb: "scheduled" },
  launch: { label: "Launch now", from: ["draft", "scheduled"], to: "live", verb: "launched" },
  pause: { label: "Pause", from: ["live"], to: "paused", verb: "paused" },
  resume: { label: "Resume", from: ["paused"], to: "live", verb: "resumed" },
  end: { label: "End campaign", from: ["scheduled", "live", "paused"], to: "completed", verb: "ended", confirm: true },
};
const ACTION_KEYS = Object.keys(ACTIONS) as CampaignAction[];
const VERB_STATE: Record<CampaignLogAction, CampaignLifecycle> = {
  created: "draft",
  scheduled: "scheduled",
  launched: "live",
  paused: "paused",
  resumed: "live",
  ended: "completed",
};
const VERB_LABEL: Record<CampaignLogAction, string> = {
  created: "Created",
  scheduled: "Scheduled",
  launched: "Launched",
  paused: "Paused",
  resumed: "Resumed",
  ended: "Ended",
};
const PRIMARY: Partial<Record<CampaignLifecycle, CampaignAction>> = { draft: "schedule", scheduled: "launch", live: "pause", paused: "resume" };
const HINTS: Record<CampaignLifecycle, string> = {
  draft: "Drafts can be scheduled for the planned start date or launched straight away.",
  scheduled: "Goes live automatically on the start date. You can launch it early or cancel it.",
  live: "Delivering now. Pause to stop spend for a while, or end the campaign.",
  paused: "Spend is on hold. Resume to pick up where it left off, or end the campaign.",
  completed: "This campaign has ended. No more changes can be made.",
};
const CH_STATE: Record<CampaignLifecycle, string> = { draft: "Not started", scheduled: "Waiting to start", live: "Delivering", paused: "Paused", completed: "Ended" };
const STATUS_TONE: Record<CampaignLifecycle, string> = {
  draft: "[--csc-c:var(--csc-draft)] [--csc-c-bg:var(--csc-draft-bg)]",
  scheduled: "[--csc-c:var(--csc-scheduled)] [--csc-c-bg:var(--csc-scheduled-bg)]",
  live: "[--csc-c:var(--csc-live)] [--csc-c-bg:var(--csc-live-bg)]",
  paused: "[--csc-c:var(--csc-paused)] [--csc-c-bg:var(--csc-paused-bg)]",
  completed: "[--csc-c:var(--csc-completed)] [--csc-c-bg:var(--csc-completed-bg)]",
};
const DOT_TONE: Record<CampaignLifecycle, string> = {
  draft: "[--csc-dot:var(--csc-draft)]",
  scheduled: "[--csc-dot:var(--csc-scheduled)]",
  live: "[--csc-dot:var(--csc-live)]",
  paused: "[--csc-dot:var(--csc-paused)]",
  completed: "[--csc-dot:var(--csc-completed)]",
};

/* ---------- icons ---------- */
const P: Record<string, ReactNode> = {
  schedule: (
    <>
      <rect x="2.5" y="3.5" width="11" height="10" rx="2" />
      <path d="M2.5 6.5h11M5.5 2v3M10.5 2v3" />
    </>
  ),
  launch: <path d="M5 3.2v9.6L12.5 8z" />,
  pause: <path d="M5.5 3.5v9M10.5 3.5v9" />,
  resume: <path d="M5 3.2v9.6L12.5 8z" />,
  end: <rect x="3.5" y="3.5" width="9" height="9" rx="1.5" />,
  check: <path d="m3.5 8.4 3 3 6-6.4" />,
  user: (
    <>
      <circle cx="8" cy="5.5" r="2.5" />
      <path d="M3 13.5c.7-2.3 2.6-3.5 5-3.5s4.3 1.2 5 3.5" />
    </>
  ),
  target: (
    <>
      <circle cx="8" cy="8" r="5.5" />
      <circle cx="8" cy="8" r="2" />
    </>
  ),
  search: (
    <>
      <circle cx="7" cy="7" r="4.2" />
      <path d="m10.2 10.2 3.3 3.3" />
    </>
  ),
  social: <path d="M2.5 4.5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v4.5a2 2 0 0 1-2 2H7l-3 2.5v-2.5h0a1.5 1.5 0 0 1-1.5-1.5z" />,
  video: (
    <>
      <rect x="2" y="3.5" width="12" height="9" rx="2" />
      <path d="M6.8 6v4l3.2-2z" />
    </>
  ),
  display: (
    <>
      <rect x="2" y="2.5" width="12" height="11" rx="2" />
      <path d="M2 6h12M5 9h3" />
    </>
  ),
  email: (
    <>
      <rect x="2" y="3.5" width="12" height="9" rx="2" />
      <path d="m2.5 4.5 5.5 4 5.5-4" />
    </>
  ),
  draft: <path d="M3 13h3l7-7-3-3-7 7z" />,
};
const STEP_ICON: Record<CampaignLifecycle, string> = { draft: "draft", scheduled: "schedule", live: "launch", paused: "pause", completed: "check" };
const Icon = ({ name, className }: { name: string; className: string }) => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
    {P[name] ?? P.display}
  </svg>
);

/* ---------- dates ---------- */
const parseDate = (s?: string | null): Date | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(s || "");
  return m ? new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0)) : null;
};
const dayOnly = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const daysBetween = (a: Date, b: Date) => Math.round((dayOnly(b).getTime() - dayOnly(a).getTime()) / 864e5);
const shortDate = (d: Date) => `${d.getDate()} ${MONTHS[d.getMonth()]}`;
const clock = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
const num = (v: unknown): number | null => (v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));

interface LogItem {
  action: CampaignLogAction;
  by: string;
  at: Date | null;
  isNew?: boolean;
}

type StepState = "current" | "done" | "skipped" | "upcoming";
type Tone = "good" | "warn" | "info" | null;

const reduceMotion = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const mono = "m-0 font-(family-name:--csc-mono) text-[10.5px] leading-none font-medium tracking-[0.1em] text-(--csc-faint) uppercase";
const btnBase =
  "inline-flex min-h-10 cursor-pointer items-center justify-center gap-[7px] rounded-[10px] border px-3 text-[13px] leading-none font-semibold transition-[background-color,border-color,color,opacity,scale] duration-200 not-disabled:active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--csc-accent) disabled:cursor-not-allowed disabled:opacity-45 motion-reduce:transition-none motion-reduce:active:scale-100";

function Badge({ tone, children }: { tone: Tone; children: ReactNode }) {
  if (!children) return null;
  const toneCls =
    tone === "good"
      ? "bg-(--csc-live-bg) text-(--csc-live)"
      : tone === "warn"
        ? "bg-(--csc-paused-bg) text-(--csc-paused)"
        : tone === "info"
          ? "bg-(--csc-scheduled-bg) text-(--csc-scheduled)"
          : "bg-(--csc-tint) text-(--csc-muted) shadow-[inset_0_0_0_1px_var(--csc-line)]";
  return <span className={cx("inline-flex items-center gap-[5px] rounded-full px-2 py-1 text-[11px] leading-none font-semibold whitespace-nowrap", toneCls)}>{children}</span>;
}

function loadLog(log?: CampaignLogEntry[]): LogItem[] {
  return (Array.isArray(log) ? log : [])
    .map((e) => ({ action: String(e?.action || "").toLowerCase() as CampaignLogAction, by: e?.by || "", at: parseDate(e?.at) }))
    .filter((e) => VERB_STATE[e.action]);
}
function initialStatus(status: CampaignLifecycle | undefined, log: LogItem[]): CampaignLifecycle {
  if (status && (CAMPAIGN_STEPS as readonly string[]).includes(status)) return status;
  return log.length ? VERB_STATE[log[log.length - 1].action] : "draft";
}

/**
 * A campaign's lifecycle from draft to completed, with flight-date progress, budget
 * pacing and channels. Launch, pause, resume or end it: only valid moves are allowed,
 * ending asks to confirm, and every change is logged.
 */
export function CampaignStatusCard({
  name,
  client,
  campaignId,
  objective,
  owner,
  status: statusProp,
  today: todayProp,
  flight,
  budget: budgetProp,
  spent: spentProp,
  currency = "USD",
  locale = "en-US",
  channels = [],
  log: logProp,
  user = "you",
  onStatusChange,
  ref,
  className,
}: CampaignStatusCardProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");

  /* ---------- state ---------- */
  const [log, setLog] = useState<LogItem[]>(() => loadLog(logProp));
  const [status, setStatus] = useState<CampaignLifecycle>(() => initialStatus(statusProp, loadLog(logProp)));
  const [flightStart, setFlightStart] = useState<Date | null>(null);
  const [endedDay, setEndedDay] = useState<number | null>(null);
  const [sr, setSr] = useState("");
  const [tick, setTick] = useState(0);

  /* reload when the data changes; follow a new `status` prop */
  const [prev, setPrev] = useState({ logProp, flight, statusProp });
  if (prev.logProp !== logProp || prev.flight !== flight || prev.statusProp !== statusProp) {
    setPrev({ logProp, flight, statusProp });
    if (prev.logProp !== logProp || prev.flight !== flight) {
      const l = loadLog(logProp);
      setLog(l);
      setStatus(initialStatus(statusProp, l));
      setFlightStart(null);
      setEndedDay(null);
    } else if (statusProp && (CAMPAIGN_STEPS as readonly string[]).includes(statusProp)) {
      setStatus(statusProp);
    }
  }

  /* real time, only after mount (keeps SSR output stable) */
  const [nowMs, setNowMs] = useState<number | null>(null);
  useEffect(() => {
    setNowMs(Date.now());
    const t = window.setInterval(() => setNowMs(Date.now()), 30000);
    return () => window.clearInterval(t);
  }, []);

  const today = parseDate(todayProp) ?? (nowMs != null ? dayOnly(new Date(nowMs)) : (parseDate(flight?.start) ?? new Date(2000, 0, 1)));
  const flightInfo = (() => {
    const start = flightStart ?? parseDate(flight?.start);
    const end = parseDate(flight?.end);
    if (!start || !end || end < start) return null;
    return { start, end, total: daysBetween(start, end) + 1 };
  })();
  const dayOf = (f = flightInfo, t = today) => (f ? Math.max(0, Math.min(f.total, daysBetween(f.start, t) + 1)) : 0);

  const money = (v: number) => {
    try {
      return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(v);
    } catch {
      return `${currency} ${Math.round(v)}`;
    }
  };
  const int = (v: number) => Math.round(v).toLocaleString(locale);
  const when = (at: Date | null) => {
    if (!at) return "";
    if (nowMs != null) {
      const diff = (nowMs - at.getTime()) / 6e4;
      if (diff >= -1 && diff < 1) return "just now";
      if (diff >= 1 && diff < 60) return `${Math.floor(diff)} min ago`;
    }
    return `${shortDate(at)}, ${clock(at)}`;
  };

  const can = (action: CampaignAction, s = status) => !!ACTIONS[action] && ACTIONS[action].from.includes(s);

  /* ---------- transitions ---------- */
  const nowRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  const logRef = useRef<HTMLOListElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef<HTMLButtonElement | null>(null);
  const focusAfter = useRef<"auto" | "now" | null>(null);
  const statusRef = useRef(status);
  statusRef.current = status;

  const transition = (action: CampaignAction): boolean => {
    const from = statusRef.current;
    if (!can(action, from)) return false;
    const a = ACTIONS[action];
    const at = new Date();
    if (action === "launch" && flightInfo && today < flightInfo.start) setFlightStart(dayOnly(today));
    if (action === "end") setEndedDay(dayOf());
    statusRef.current = a.to;
    setStatus(a.to);
    setLog((l) => [...l, { action: a.verb, by: user, at, isNew: true }]);
    setSr("");
    requestAnimationFrame(() => setSr(`${VERB_LABEL[a.verb]}. Campaign is now ${STATE_LABEL[a.to].toLowerCase()}.`));
    setTick((t) => t + 1);
    onStatusChange?.({ from, to: a.to, action, by: user, at: at.toISOString() });
    return true;
  };

  const latest = useRef({ can, transition });
  latest.current = { can, transition };
  useImperativeHandle(
    ref,
    () => ({
      can: (a: CampaignAction) => latest.current.can(a),
      transition: (a: CampaignAction) => latest.current.transition(a),
      get status() {
        return statusRef.current;
      },
    }),
    []
  );

  /* pill pop, new log row, focus repair — after each move */
  const lastLogLen = useRef(log.length);
  useEffect(() => {
    if (!tick) return;
    const motion = !reduceMotion();
    if (motion) {
      pillRef.current?.animate?.([{ transform: "scale(.94)", opacity: 0.4 }, { transform: "none", opacity: 1 }], { duration: 320, easing: "cubic-bezier(.2,.7,.2,1)" });
      const first = logRef.current?.firstElementChild as HTMLElement | null;
      if (first && log.length > lastLogLen.current) {
        first.animate?.([{ opacity: 0, transform: "translateY(-6px)" }, { opacity: 1, transform: "none" }], { duration: 320, easing: "cubic-bezier(.2,.7,.2,1)" });
      }
    }
    lastLogLen.current = log.length;
    if (logRef.current) logRef.current.scrollTop = 0;
    const mode = focusAfter.current;
    focusAfter.current = null;
    if (mode === "now") nowRef.current?.focus();
    else if (mode === "auto") {
      const active = document.activeElement as HTMLButtonElement | null;
      if (!active || active === document.body || active.disabled) {
        const box = actionsRef.current;
        const next = box?.querySelector<HTMLButtonElement>('button[data-primary="true"]:not(:disabled)') ?? box?.querySelector<HTMLButtonElement>("button:not(:disabled)");
        (next ?? nowRef.current)?.focus();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  /* ---------- confirm dialog ---------- */
  const budget = num(budgetProp) || 0;
  const spent = Math.max(0, num(spentProp) || 0);
  const chs = (Array.isArray(channels) ? channels : []).filter(Boolean);
  const leftBudget = Math.max(0, budget - spent);
  const dlgText =
    status === "scheduled"
      ? `“${name || "This campaign"}” will be cancelled before it starts. The full ${money(leftBudget)} budget is released. This can't be undone.`
      : `All ${chs.length} channel${chs.length === 1 ? "" : "s"} stop delivering right away and ${money(leftBudget)} of unspent budget is released. This can't be undone.`;

  const confirmEnd = (btn: HTMLButtonElement) => {
    const dlg = dialogRef.current;
    returnFocus.current = btn;
    if (dlg && typeof dlg.showModal === "function") {
      dlg.returnValue = "";
      dlg.showModal();
      dlg.querySelector<HTMLButtonElement>("[data-cancel]")?.focus();
    } else if (window.confirm(dlgText)) {
      focusAfter.current = "now";
      transition("end");
    }
  };
  const onDialogClose = () => {
    const ok = dialogRef.current?.returnValue === "confirm";
    if (ok) {
      focusAfter.current = "now";
      transition("end");
    } else returnFocus.current?.focus();
    returnFocus.current = null;
  };
  const trapTab = (e: KeyboardEvent<HTMLDialogElement>) => {
    if (e.key !== "Tab") return;
    const f = [...e.currentTarget.querySelectorAll("button")];
    const i = f.indexOf(document.activeElement as HTMLButtonElement);
    if (e.shiftKey && i <= 0) {
      e.preventDefault();
      f[f.length - 1]?.focus();
    } else if (!e.shiftKey && i === f.length - 1) {
      e.preventDefault();
      f[0]?.focus();
    }
  };

  const onAction = (k: CampaignAction, btn: HTMLButtonElement) => {
    if (!can(k)) return;
    if (ACTIONS[k].confirm) return confirmEnd(btn);
    focusAfter.current = "auto";
    transition(k);
  };

  /* ---------- derived: header ---------- */
  const sinceEntry = [...log].reverse().find((e) => VERB_STATE[e.action] === status) ?? null;
  const sinceText = sinceEntry?.at ? `Since ${when(sinceEntry.at)}` : "";

  /* ---------- derived: stepper ---------- */
  const cur = CAMPAIGN_STEPS.indexOf(status);
  const visited = new Set<CampaignLifecycle>(log.map((e) => VERB_STATE[e.action]));
  visited.add(status);
  const counts: Partial<Record<CampaignLogAction, number>> = {};
  log.forEach((e) => (counts[e.action] = (counts[e.action] || 0) + 1));
  const lastAt = (st: CampaignLifecycle) => {
    for (let i = log.length - 1; i >= 0; i--) if (VERB_STATE[log[i].action] === st && log[i].at) return log[i].at;
    return null;
  };
  const states: StepState[] = CAMPAIGN_STEPS.map((st, i) => {
    if (st === status) return "current";
    if (visited.has(st)) return "done";
    if (i < cur && st !== "paused") return "skipped";
    if (st === "paused" && status === "completed") return "skipped";
    return "upcoming";
  });
  const reached = (s: StepState) => s === "current" || s === "done";
  const stepMeta = (st: CampaignLifecycle, state: StepState) => {
    const at = lastAt(st);
    const f = flightInfo;
    if (st === "paused" && counts.paused && at) return counts.paused > 1 ? `${counts.paused}×, last ${shortDate(at)}` : shortDate(at);
    if (state === "skipped") return "Skipped";
    if (at && (state === "done" || state === "current")) return shortDate(at);
    if (st === "scheduled" && f) return `For ${shortDate(f.start)}`;
    if (st === "live" && f) return `From ${shortDate(f.start)}`;
    if (st === "paused") return "If needed";
    if (st === "completed" && f) return `Ends ${shortDate(f.end)}`;
    return "";
  };

  /* ---------- derived: flight ---------- */
  const flightTile = (() => {
    const f = flightInfo;
    if (!f) return { big: <>No dates</>, sub: "", badge: "", tone: null as Tone, v: 0, label: "No flight dates", start: "", end: "" };
    const day = dayOf();
    const started = status === "live" || status === "paused" || (status === "completed" && log.some((e) => e.action === "launched"));
    let shownDay = started ? (status === "completed" && endedDay != null ? endedDay : day) : 0;
    if (status === "completed" && endedDay == null && started) shownDay = daysBetween(f.start, today) + 1 >= f.total ? f.total : day;
    const v = (shownDay / f.total) * 100;
    const base = { v, label: `${shownDay} of ${f.total} flight days elapsed`, start: shortDate(f.start), end: shortDate(f.end) };
    if (!started) {
      const until = daysBetween(today, f.start);
      return {
        ...base,
        big: <>{until > 0 ? `In ${plural(until, "day")}` : "Today"}</>,
        sub: status === "completed" ? "Cancelled before it started." : `${f.total}-day flight, ${shortDate(f.start)} to ${shortDate(f.end)}.`,
        badge: status === "completed" ? "Cancelled" : status === "scheduled" ? "Scheduled" : "Not started",
        tone: (status === "scheduled" ? "info" : null) as Tone,
      };
    }
    const left = Math.max(0, f.total - shownDay);
    const big = (
      <>
        Day {shownDay} <small className="font-(family-name:--csc-sans) text-[13px] leading-none font-medium tracking-normal text-(--csc-muted)">of {f.total}</small>
      </>
    );
    if (status === "completed")
      return { ...base, big, sub: shownDay >= f.total ? `Ran all ${f.total} days.` : `Ended early, ${plural(left, "day")} before the planned end.`, badge: "Ended", tone: null as Tone };
    if (status === "paused") return { ...base, big, sub: `${plural(left, "day")} left. The end date doesn't move while paused.`, badge: "On hold", tone: "warn" as Tone };
    return { ...base, big, sub: `${plural(left, "day")} left, ends ${shortDate(f.end)}.`, badge: `${Math.round(v)}% through`, tone: "good" as Tone };
  })();

  /* ---------- derived: budget ---------- */
  const budgetTile = (() => {
    const f = flightInfo;
    const v = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
    const day = dayOf();
    const running = (status === "live" || status === "paused") && !!f && day > 0 && budget > 0;
    const leftLabel = `${budget > 0 ? Math.round((spent / budget) * 100) : 0}% spent`;
    if (running && f) {
      const expected = (budget * day) / f.total;
      const pace = expected > 0 ? spent / expected : 0;
      const perDay = spent / day;
      const projected = perDay * f.total;
      const diff = ((projected - budget) / budget) * 100;
      let badge = "On pace";
      let tone: Tone = "good";
      let warnFill = false;
      if (spent === 0 && status === "live") {
        badge = "Just started";
        tone = "info";
      } else if (status === "paused") {
        badge = "On hold";
        tone = "warn";
        warnFill = true;
      } else if (pace > 1.1) {
        badge = "Overspending";
        tone = "warn";
        warnFill = true;
      } else if (pace < 0.9) {
        badge = "Underspending";
        tone = "info";
      }
      const sub: ReactNode =
        spent === 0 ? (
          `No spend recorded yet. About ${money(budget / f.total)} a day keeps it on pace.`
        ) : (
          <>
            <b className="font-semibold text-(--csc-ink)">{Math.round(pace * 100)}%</b> of expected spend. ≈ {money(perDay)}/day, projected {money(projected)} ({diff >= 0 ? "+" : "−"}
            {Math.abs(diff).toFixed(1)}%).
          </>
        );
      return {
        v,
        mark: Math.min(100, (expected / budget) * 100),
        l: leftLabel,
        r: `Expected ${money(expected)}`,
        badge,
        tone,
        warnFill,
        sub,
        label: `${money(spent)} spent of ${money(budget)}. Expected by today: ${money(expected)}.`,
      };
    }
    return {
      v,
      mark: null,
      l: leftLabel,
      r: `${money(leftBudget)} left`,
      badge: status === "completed" ? "Closed" : "Not spending",
      tone: null as Tone,
      warnFill: false,
      sub: status === "completed" ? `${money(leftBudget)} unspent and released.` : "Spend starts when the campaign goes live.",
      label: `${money(spent)} spent of ${money(budget)}.`,
    };
  })();

  /* ---------- derived: channels ---------- */
  const chTotal = chs.reduce((a, c) => a + (num(c.spent) || 0), 0);
  const chLeads = chs.reduce((a, c) => a + (num(c.leads) || 0), 0);
  const logItems = [...log].reverse();

  const meta: Array<[string, string | undefined]> = [
    ["target", client],
    ["launch", objective],
    ["user", owner],
  ];

  return (
    <div className={cx("@container block w-full max-w-[960px] font-(family-name:--csc-sans) text-(--csc-ink)", className)}>
      <article
        data-status={status}
        className={cx(
          "relative overflow-hidden rounded-[18px] border border-(--csc-line) bg-(--csc-card) shadow-[0_30px_60px_-46px_var(--csc-shadow),0_2px_6px_-4px_var(--csc-shadow)] @max-[519px]:rounded-2xl",
          STATUS_TONE[status]
        )}
      >
        {/* ---------- header band ---------- */}
        <div className="grid gap-[22px] border-b border-(--csc-line) bg-[linear-gradient(180deg,var(--csc-band),var(--csc-card))] px-[26px] pt-6 pb-[22px] @max-[759px]:px-5 @max-[759px]:pt-[22px] @max-[759px]:pb-5 @max-[519px]:gap-[18px] @max-[519px]:px-4 @max-[519px]:py-[18px]">
          <header className="flex flex-wrap items-start justify-between gap-x-5 gap-y-3.5">
            <div className="grid min-w-0 flex-[1_1_320px] gap-1.5">
              <div className="flex flex-wrap items-center gap-2 font-(family-name:--csc-mono) text-[10.5px] leading-none font-medium tracking-[0.1em] text-(--csc-accent-ink) uppercase">
                <span>Campaign</span>
                {campaignId && (
                  <>
                    <i className="text-(--csc-faint) not-italic">·</i>
                    <span>{campaignId}</span>
                  </>
                )}
              </div>
              <h2 className="m-0 font-(family-name:--csc-display) text-[clamp(20px,3.4cqi,26px)] leading-[1.15] font-[650] tracking-[-0.018em] text-balance [overflow-wrap:anywhere]">
                {name || "Untitled campaign"}
              </h2>
              <p className="m-0 flex flex-wrap gap-x-3.5 gap-y-1 text-[13px] text-(--csc-muted)">
                {meta
                  .filter(([, t]) => t)
                  .map(([ico, t]) => (
                    <span key={ico} className="inline-flex items-center gap-1.5">
                      <Icon name={ico} className="size-[13px] text-(--csc-faint)" />
                      {t}
                    </span>
                  ))}
              </p>
            </div>
            <div
              ref={nowRef}
              tabIndex={-1}
              aria-label={`Status: ${STATE_LABEL[status]}. ${sinceText}`}
              className="grid flex-none justify-items-end gap-[7px] rounded-xl outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--csc-accent) @max-[519px]:w-full @max-[519px]:justify-items-start"
            >
              <span
                ref={pillRef}
                className="inline-flex items-center gap-2.5 rounded-full bg-(--csc-c-bg) py-2.5 pr-[18px] pl-3.5 font-(family-name:--csc-display) text-[17px] leading-none font-[650] tracking-[-0.005em] text-(--csc-c) shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--csc-c)_28%,transparent)] transition-[background-color,color,box-shadow] duration-[350ms] motion-reduce:transition-none @max-[519px]:text-base"
              >
                <span
                  aria-hidden="true"
                  className={cx(
                    "relative size-2.5 flex-none",
                    status === "paused" ? "rounded-[1px] bg-transparent shadow-[inset_3px_0_currentColor,inset_-3px_0_currentColor]" : "rounded-full bg-current",
                    status === "live" &&
                      "after:absolute after:-inset-1 after:animate-[csc-ping_1.8s_cubic-bezier(.2,.7,.2,1)_infinite] after:rounded-full after:border-2 after:border-current after:opacity-0 motion-reduce:after:animate-none"
                  )}
                />
                <span>{STATE_LABEL[status]}</span>
              </span>
              <span className="text-right text-[12.5px] text-(--csc-muted) tabular-nums @max-[519px]:text-left">{sinceText}</span>
            </div>
          </header>

          <ol aria-label="Campaign lifecycle" className="m-0 grid list-none grid-cols-5 p-0 @max-[519px]:grid-cols-1">
            {CAMPAIGN_STEPS.map((st, i) => {
              const state = states[i];
              const linked = i < CAMPAIGN_STEPS.length - 1 && reached(state) && reached(states[i + 1]);
              return (
                <li
                  key={st}
                  aria-current={state === "current" ? "step" : undefined}
                  className={cx(
                    "relative grid justify-items-center gap-1.5 px-1 text-center",
                    "after:absolute after:top-[15px] after:right-[calc(-50%+21px)] after:left-[calc(50%+21px)] after:h-0.5 after:rounded-[2px] after:bg-(--csc-line-strong) after:bg-[linear-gradient(90deg,var(--csc-accent)_50%,transparent_0)] after:bg-size-[200%_100%] after:transition-[background-position] after:duration-500 after:ease-out-soft last:after:hidden motion-reduce:after:transition-none",
                    linked ? "after:bg-position-[0_0]" : "after:bg-position-[100%_0]",
                    "@max-[519px]:grid-cols-[32px_minmax(0,1fr)] @max-[519px]:grid-rows-[auto_auto] @max-[519px]:justify-items-start @max-[519px]:gap-x-3 @max-[519px]:gap-y-0.5 @max-[519px]:px-0 @max-[519px]:pt-0 @max-[519px]:pb-3 @max-[519px]:text-left",
                    "@max-[519px]:after:top-9 @max-[519px]:after:right-auto @max-[519px]:after:bottom-0 @max-[519px]:after:left-[15px] @max-[519px]:after:h-auto @max-[519px]:after:w-0.5 @max-[519px]:after:bg-[linear-gradient(180deg,var(--csc-accent)_50%,transparent_0)] @max-[519px]:after:bg-size-[100%_200%]",
                    linked ? "@max-[519px]:after:bg-position-[0_0]" : "@max-[519px]:after:bg-position-[0_100%]"
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cx(
                      "grid size-8 place-items-center rounded-full font-(family-name:--csc-mono) text-xs leading-none font-semibold transition-[background-color,color,box-shadow,scale] duration-[350ms] ease-out-soft motion-reduce:transition-none @max-[519px]:row-span-2",
                      state === "done" && "bg-(--csc-accent) text-(--csc-card)",
                      state === "current" && "scale-[1.08] bg-(--csc-c) text-(--csc-card) shadow-[0_0_0_5px_var(--csc-c-bg)] motion-reduce:scale-100 @max-[519px]:scale-100",
                      state === "skipped" && "bg-(--csc-tint) text-(--csc-faint) shadow-[inset_0_0_0_2px_var(--csc-line)]",
                      state === "upcoming" && "bg-(--csc-card) text-(--csc-faint) shadow-[inset_0_0_0_2px_var(--csc-line-strong)]"
                    )}
                  >
                    <Icon name={state === "done" ? "check" : STEP_ICON[st]} className="size-3.5" />
                  </span>
                  <span
                    className={cx(
                      "text-[13px] leading-[1.2] font-semibold @max-[519px]:self-end @max-[519px]:pt-0.5",
                      state === "current" || state === "done" ? "text-(--csc-ink)" : state === "skipped" ? "text-(--csc-faint)" : "text-(--csc-muted)",
                      state === "skipped" && "line-through decoration-(--csc-line-strong)"
                    )}
                  >
                    {STATE_LABEL[st]}
                  </span>
                  <span className={cx("min-h-[1.3em] text-[11.5px] leading-[1.3] text-(--csc-faint) tabular-nums", state === "skipped" && "line-through decoration-(--csc-line-strong)")}>
                    {stepMeta(st, state)}
                  </span>
                  <span className="sr-only">, {{ current: "current step", done: "done", skipped: "skipped", upcoming: "not yet" }[state]}</span>
                </li>
              );
            })}
          </ol>
        </div>

        {/* ---------- body ---------- */}
        <div className="grid grid-cols-[minmax(0,1fr)_300px] @max-[759px]:grid-cols-1">
          <div className="grid min-w-0 content-start gap-[22px] px-[26px] pt-[22px] pb-6 @max-[759px]:p-5 @max-[519px]:gap-[18px] @max-[519px]:p-4">
            <div className="grid grid-cols-2 gap-3.5 @max-[519px]:grid-cols-1">
              {/* flight */}
              <section aria-label="Flight dates" className="grid min-w-0 content-start gap-2.5 rounded-[14px] border border-(--csc-line) px-4 pt-4 pb-[15px]">
                <div className="flex items-center justify-between gap-2">
                  <h3 className={mono}>Flight</h3>
                  <Badge tone={flightTile.tone}>{flightTile.badge}</Badge>
                </div>
                <div className="font-(family-name:--csc-display) text-[26px] leading-[1.05] font-[650] tracking-[-0.02em] tabular-nums">{flightTile.big}</div>
                <div role="img" aria-label={flightTile.label} className="relative h-2.5 rounded-full bg-(--csc-line)">
                  <span
                    className="absolute inset-y-0 left-0 rounded-[inherit] bg-(--csc-accent) transition-[width,background-color] duration-[600ms] ease-out-soft motion-reduce:transition-none"
                    style={{ width: `${flightTile.v.toFixed(2)}%` }}
                  />
                </div>
                <div className="flex justify-between gap-2 text-[11.5px] text-(--csc-faint) tabular-nums">
                  <span>{flightTile.start}</span>
                  <span>{flightTile.end}</span>
                </div>
                {flightTile.sub && <p className="m-0 text-[12.5px] leading-[1.45] text-(--csc-muted) tabular-nums">{flightTile.sub}</p>}
              </section>

              {/* budget */}
              <section aria-label="Budget pacing" className="grid min-w-0 content-start gap-2.5 rounded-[14px] border border-(--csc-line) px-4 pt-4 pb-[15px]">
                <div className="flex items-center justify-between gap-2">
                  <h3 className={mono}>Budget pacing</h3>
                  <Badge tone={budgetTile.tone}>{budgetTile.badge}</Badge>
                </div>
                <div className="font-(family-name:--csc-display) text-[26px] leading-[1.05] font-[650] tracking-[-0.02em] tabular-nums">
                  {money(spent)} <small className="font-(family-name:--csc-sans) text-[13px] leading-none font-medium tracking-normal text-(--csc-muted)">of {money(budget)}</small>
                </div>
                <div role="img" aria-label={budgetTile.label} className="relative h-2.5 rounded-full bg-(--csc-line)">
                  <span
                    className={cx(
                      "absolute inset-y-0 left-0 rounded-[inherit] transition-[width,background-color] duration-[600ms] ease-out-soft motion-reduce:transition-none",
                      budgetTile.warnFill ? "bg-(--csc-paused)" : "bg-(--csc-accent)"
                    )}
                    style={{ width: `${budgetTile.v.toFixed(2)}%` }}
                  />
                  {budgetTile.mark != null && (
                    <span
                      className="absolute -top-1 -bottom-1 -ml-px w-0.5 rounded-[2px] bg-(--csc-ink) transition-[left] duration-[600ms] ease-out-soft motion-reduce:transition-none"
                      style={{ left: `${budgetTile.mark.toFixed(2)}%` }}
                    />
                  )}
                </div>
                <div className="flex justify-between gap-2 text-[11.5px] text-(--csc-faint) tabular-nums">
                  <span>{budgetTile.l}</span>
                  <span>{budgetTile.r}</span>
                </div>
                <p className="m-0 text-[12.5px] leading-[1.45] text-(--csc-muted) tabular-nums">{budgetTile.sub}</p>
              </section>
            </div>

            {/* channels */}
            <section aria-label="Channels">
              <div className="mb-2.5 flex items-baseline justify-between gap-2.5">
                <h3 className={mono}>Channels</h3>
                {chs.length > 0 && (
                  <span className="text-xs text-(--csc-faint) tabular-nums">
                    {int(chLeads)} leads · {chLeads > 0 ? money(chTotal / chLeads) : "—"} per lead
                  </span>
                )}
              </div>
              <ul className="m-0 grid list-none p-0">
                {chs.map((c, i) => {
                  const sp = num(c.spent) || 0;
                  const ld = num(c.leads) || 0;
                  const share = chTotal > 0 ? (sp / chTotal) * 100 : 0;
                  return (
                    <li
                      key={`${c.name}-${i}`}
                      className={cx(
                        "grid grid-cols-[34px_minmax(0,1.3fr)_minmax(0,1.4fr)_92px] items-center gap-3.5 py-[11px] @max-[519px]:grid-cols-[34px_minmax(0,1fr)_auto] @max-[519px]:gap-y-2.5 @max-[519px]:[grid-template-areas:'ico_name_leads'_'spend_spend_spend']",
                        i > 0 && "border-t border-(--csc-line)"
                      )}
                    >
                      <span aria-hidden="true" className="grid size-[34px] place-items-center rounded-[10px] bg-(--csc-accent-soft) text-(--csc-accent-ink) @max-[519px]:[grid-area:ico]">
                        <Icon name={c.type && P[c.type] ? c.type : "display"} className="size-[17px]" />
                      </span>
                      <div className="grid min-w-0 gap-[3px] @max-[519px]:[grid-area:name]">
                        <b className="text-sm leading-[1.2] font-semibold [overflow-wrap:anywhere]">{c.name || "Channel"}</b>
                        <span className="inline-flex items-center gap-1.5 text-xs text-(--csc-muted) before:size-[7px] before:rounded-full before:bg-(--csc-c) before:transition-colors before:duration-[350ms] motion-reduce:before:transition-none">
                          {CH_STATE[status]}
                        </span>
                      </div>
                      <div className="grid min-w-0 gap-1.5 @max-[519px]:[grid-area:spend]">
                        <div className="flex justify-between gap-2 text-[12.5px] text-(--csc-muted) tabular-nums">
                          <b className="font-semibold text-(--csc-ink)">{money(sp)}</b>
                          <span>{Math.round(share)}% of spend</span>
                        </div>
                        <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-(--csc-line)">
                          <span
                            className="block h-full rounded-[inherit] bg-(--csc-accent) transition-[width] duration-[600ms] ease-out-soft motion-reduce:transition-none"
                            style={{ width: `${share.toFixed(1)}%` }}
                          />
                        </div>
                      </div>
                      <div className="grid justify-items-end gap-0.5 text-right tabular-nums @max-[519px]:[grid-area:leads]">
                        <b className="font-(family-name:--csc-display) text-[17px] leading-none font-[650]">{int(ld)}</b>
                        <span className="text-[11.5px] text-(--csc-faint)">{ld > 0 ? `leads · ${money(sp / ld)}` : "leads"}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>

          {/* ---------- side panel ---------- */}
          <aside className="grid min-w-0 content-start gap-[22px] border-l border-(--csc-line) bg-(--csc-tint) px-[22px] pt-[22px] pb-6 @max-[759px]:grid-cols-2 @max-[759px]:gap-x-6 @max-[759px]:gap-y-5 @max-[759px]:border-t @max-[759px]:border-l-0 @max-[759px]:p-5 @max-[519px]:grid-cols-1 @max-[519px]:p-4">
            <section aria-label="Campaign controls" className="grid gap-3">
              <h3 className={mono}>Controls</h3>
              <p className="m-0 text-[12.5px] leading-[1.45] text-(--csc-muted)">{HINTS[status]}</p>
              <div ref={actionsRef} className="grid grid-cols-2 gap-2">
                {ACTION_KEYS.map((k) => {
                  const ok = can(k);
                  const primary = ok && PRIMARY[status] === k;
                  return (
                    <button
                      key={k}
                      type="button"
                      data-primary={primary || undefined}
                      disabled={!ok}
                      title={ok ? undefined : `Not available while ${STATE_LABEL[status].toLowerCase()}`}
                      onClick={(e) => onAction(k, e.currentTarget)}
                      className={cx(
                        btnBase,
                        k === "end"
                          ? "col-span-full border-(--csc-line-strong) bg-(--csc-card) text-(--csc-danger) not-disabled:hover:border-(--csc-danger) not-disabled:hover:bg-[color-mix(in_oklab,var(--csc-danger)_7%,var(--csc-card))]"
                          : primary
                            ? "border-(--csc-primary) bg-(--csc-primary) text-(--csc-primary-ink) shadow-[0_10px_20px_-14px_var(--csc-accent)] not-disabled:hover:border-(--csc-primary-hover) not-disabled:hover:bg-(--csc-primary-hover)"
                            : "border-(--csc-line-strong) bg-(--csc-card) text-(--csc-ink) not-disabled:hover:border-(--csc-accent) not-disabled:hover:text-(--csc-accent-ink)"
                      )}
                    >
                      <Icon name={k} className="size-3.5 flex-none" />
                      <span>{ACTIONS[k].label}</span>
                    </button>
                  );
                })}
              </div>
            </section>
            <section aria-label="Activity">
              <div className="mb-2.5 flex items-baseline justify-between gap-2.5">
                <h3 className={mono}>Activity</h3>
                <span className="text-xs text-(--csc-faint) tabular-nums">{plural(logItems.length, "change")}</span>
              </div>
              <ol ref={logRef} className="m-0 grid max-h-[260px] list-none overflow-y-auto p-0 [scrollbar-width:thin]">
                {logItems.map((e, i) => (
                  <li
                    key={logItems.length - i}
                    className={cx(
                      "relative grid grid-cols-[18px_minmax(0,1fr)] gap-2.5 pb-3.5",
                      "before:absolute before:top-4 before:bottom-0 before:left-2 before:w-0.5 before:bg-(--csc-line) last:before:hidden",
                      DOT_TONE[VERB_STATE[e.action]]
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cx("mt-1 ml-1 size-2.5 rounded-full shadow-[inset_0_0_0_2px_var(--csc-dot,var(--csc-faint))]", e.isNew ? "bg-(--csc-dot)" : "bg-(--csc-card)")}
                    />
                    <div className="grid min-w-0 gap-0.5">
                      <b className="text-[13px] leading-[1.35] font-semibold [overflow-wrap:anywhere]">{e.by ? `${VERB_LABEL[e.action]} by ${e.by}` : VERB_LABEL[e.action]}</b>
                      <span className="text-xs text-(--csc-faint) tabular-nums">{when(e.at)}</span>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          </aside>
        </div>

        {/* ---------- confirm dialog ---------- */}
        <dialog
          ref={dialogRef}
          aria-labelledby={`${uid}-dlg-t`}
          aria-describedby={`${uid}-dlg-d`}
          onClose={onDialogClose}
          onKeyDown={trapTab}
          className="m-auto box-border w-[min(420px,calc(100vw-32px))] rounded-[18px] border-0 bg-(--csc-card) p-0 font-(family-name:--csc-sans) text-(--csc-ink) shadow-[0_0_0_1px_var(--csc-line),0_40px_80px_-30px_rgba(0,0,0,0.45)] backdrop:bg-[rgba(8,20,34,0.45)] backdrop:backdrop-blur-[3px] open:animate-[csc-pop_.26s_cubic-bezier(.2,.7,.2,1)] motion-reduce:open:animate-none"
        >
          <form method="dialog" className="m-0 grid gap-3 p-6 @max-[519px]:p-5">
            <span className="grid size-10 place-items-center rounded-xl bg-[color-mix(in_oklab,var(--csc-danger)_12%,transparent)] text-(--csc-danger)">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-5">
                <path d="M10 3 2.5 16.5h15z" />
                <path d="M10 8.5v3.5M10 14.5v.01" />
              </svg>
            </span>
            <h3 id={`${uid}-dlg-t`} className="mt-1 mb-0 font-(family-name:--csc-display) text-[19px] leading-[1.25] font-[650] tracking-[-0.01em]">
              End this campaign?
            </h3>
            <p id={`${uid}-dlg-d`} className="m-0 text-sm leading-[1.55] text-(--csc-muted)">
              {dlgText}
            </p>
            <div className="mt-2 flex flex-wrap justify-end gap-2">
              <button
                type="submit"
                value="cancel"
                data-cancel=""
                className={cx(
                  btnBase,
                  "min-w-32 border-(--csc-line-strong) bg-(--csc-card) text-(--csc-ink) not-disabled:hover:border-(--csc-accent) not-disabled:hover:text-(--csc-accent-ink) @max-[519px]:min-w-0 @max-[519px]:flex-1"
                )}
              >
                Keep running
              </button>
              <button
                type="submit"
                value="confirm"
                className={cx(
                  btnBase,
                  "min-w-32 border-(--csc-danger) bg-(--csc-danger) text-(--csc-danger-ink) not-disabled:hover:border-transparent not-disabled:hover:bg-[color-mix(in_oklab,var(--csc-danger),#000_12%)] @max-[519px]:min-w-0 @max-[519px]:flex-1"
                )}
              >
                End campaign
              </button>
            </div>
          </form>
        </dialog>

        <p className="sr-only" aria-live="polite">
          {sr}
        </p>
      </article>
    </div>
  );
}

export default CampaignStatusCard;
