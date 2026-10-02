"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { cx } from "@/lib/format";

export type ClientHealthStatus = "healthy" | "at-risk" | "critical";
export type ClientOverviewTab = "overview" | "contacts" | "notes";

export interface ClientOwner {
  name: string;
  /** Defaults to "Account owner". */
  role?: string;
}

export interface ClientHealth {
  status?: ClientHealthStatus;
  /** 0–100. */
  score?: number;
  /** Shown in the Overview tab. */
  note?: string;
}

export interface ClientActivity {
  /** ISO date or date-time. */
  date: string;
  summary?: string;
}

export interface ClientOpportunity {
  name: string;
  stage?: string;
  value?: number;
  /** Expected close date, YYYY-MM-DD. */
  close?: string;
}

export interface ClientContact {
  name: string;
  role?: string;
  email?: string;
  phone?: string;
  primary?: boolean;
}

export interface ClientNote {
  author?: string;
  /** ISO date or date-time. */
  date?: string;
  text: string;
}

export interface ClientOverviewCardProps {
  /** Client name. */
  company: string;
  /** Avatar initials. Worked out from the company name when left out. */
  initials?: string;
  industry?: string;
  location?: string;
  website?: string;
  /** Plan or retainer name, shown in the kicker and Overview tab. */
  plan?: string;
  billing?: string;
  /** Renewal date, YYYY-MM-DD. */
  renewal?: string;
  owner?: ClientOwner;
  health?: ClientHealth;
  /** ISO currency code. */
  currency?: string;
  /** Number and date locale. */
  locale?: string;
  /** Monthly recurring revenue. */
  mrr?: number;
  /** Earlier MRR, used for the change. */
  mrrPrevious?: number;
  /** Names the earlier figure, e.g. "last quarter". */
  mrrCompareLabel?: string;
  /** YYYY-MM-DD. */
  clientSince?: string;
  /** Tenure and "days ago" are counted to this date (YYYY-MM-DD). Defaults to today, after mount. */
  asOf?: string;
  lastActivity?: ClientActivity;
  services?: string[];
  opportunities?: ClientOpportunity[];
  /** Stage order for the opportunity ticks. */
  stages?: string[];
  contacts?: ClientContact[];
  /** Starting notes, newest first. New notes are kept in component state. */
  notes?: ClientNote[];
  /** Who adds new notes. */
  noteAuthor?: string;
  /** Controlled tab. */
  tab?: ClientOverviewTab;
  /** Starting tab when uncontrolled. */
  defaultTab?: ClientOverviewTab;
  onTabChange?: (tab: ClientOverviewTab) => void;
  /** Controlled favourite state. */
  favourite?: boolean;
  defaultFavourite?: boolean;
  onFavouriteChange?: (favourite: boolean) => void;
  /** Fires after a note is added, with the note and the new count. */
  onNoteAdd?: (note: ClientNote, count: number) => void;
  /** Fires after an email is copied to the clipboard. */
  onEmailCopy?: (contact: ClientContact) => void;
  className?: string;
}

const TABS: ClientOverviewTab[] = ["overview", "contacts", "notes"];
const TAB_LABEL: Record<ClientOverviewTab, string> = { overview: "Overview", contacts: "Contacts", notes: "Notes" };
const STATUS_LABEL: Record<ClientHealthStatus, string> = { healthy: "Healthy", "at-risk": "At risk", critical: "Critical" };
const DEFAULT_STAGES = ["Discovery", "Proposal", "Negotiation", "Closing"];

/** Badge tone (text colour). */
const TONE: Record<ClientHealthStatus, string> = {
  healthy: "[--cov-tone:var(--cov-accent-strong)] [--cov-tone-soft:var(--cov-accent-soft)]",
  "at-risk": "[--cov-tone:var(--cov-warn)] [--cov-tone-soft:var(--cov-warn-soft)]",
  critical: "[--cov-tone:var(--cov-bad)] [--cov-tone-soft:var(--cov-bad-soft)]",
};
/** Note tone (border colour). */
const NOTE_TONE: Record<ClientHealthStatus, string> = {
  healthy: "[--cov-tone:var(--cov-accent)] [--cov-tone-soft:var(--cov-accent-soft)]",
  "at-risk": "[--cov-tone:var(--cov-warn)] [--cov-tone-soft:var(--cov-warn-soft)]",
  critical: "[--cov-tone:var(--cov-bad)] [--cov-tone-soft:var(--cov-bad-soft)]",
};

const sc = "[font-variant-caps:all-small-caps] tracking-[.07em] font-semibold";

export const initialsOf = (name?: string) =>
  String(name || "")
    .replace(/&/g, " ")
    .split(/\s+/)
    .filter((w) => /[A-Za-z0-9]/.test(w))
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("") || "?";

interface ParsedDate {
  d: Date;
  /** No timezone given: treated as UTC wall time so server and client agree. */
  naive: boolean;
  hasTime: boolean;
}

function parseDT(s?: string | null): ParsedDate | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(s);
  if (m) {
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] ?? 0), +(m[5] ?? 0), +(m[6] ?? 0)));
    return { d, naive: true, hasTime: m[4] != null };
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : { d, naive: false, hasTime: /T\d/.test(s) };
}

/** Calendar day number (days since epoch) in the date's own frame. */
const dayNum = (p: ParsedDate) =>
  p.naive
    ? Math.floor(p.d.getTime() / 864e5)
    : Math.floor(Date.UTC(p.d.getFullYear(), p.d.getMonth(), p.d.getDate()) / 864e5);

/* ---------- icons ---------- */
const svg = "size-[13px] flex-none";
const IconStar = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 20 20" aria-hidden="true" className={className}>
    <path d="M10 2.4l2.35 4.76 5.25.77-3.8 3.7.9 5.23L10 14.4l-4.7 2.46.9-5.23-3.8-3.7 5.25-.77z" strokeWidth="1.5" strokeLinejoin="round" stroke="currentColor" />
  </svg>
);
const IconPin = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true" className={cx(svg, "text-(--cov-faint)")}>
    <path d="M8 14.5s4.5-4.2 4.5-7.7a4.5 4.5 0 0 0-9 0c0 3.5 4.5 7.7 4.5 7.7z" />
    <circle cx="8" cy="6.8" r="1.6" />
  </svg>
);
const IconTag = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true" className={cx(svg, "text-(--cov-faint)")}>
    <path d="M2.5 3.5h5l6 6-4 4-6-6z" />
    <circle cx="5.5" cy="6" r="1" />
  </svg>
);
const HealthIcon = ({ status }: { status: ClientHealthStatus }) => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={svg}>
    {status === "healthy" && (
      <>
        <circle cx="8" cy="8" r="6.2" />
        <path d="M5.3 8.2 7.2 10l3.5-3.8" />
      </>
    )}
    {status === "at-risk" && (
      <>
        <path d="M8 2.2 14.3 13H1.7z" />
        <path d="M8 6.6v2.9M8 11.4v.1" />
      </>
    )}
    {status === "critical" && (
      <>
        <circle cx="8" cy="8" r="6.2" />
        <path d="M8 4.8v3.8M8 11v.1" />
      </>
    )}
  </svg>
);
const IconCopy = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true" className="size-[13px]">
    <rect x="5.5" y="5.5" width="8" height="8" rx="1.8" />
    <path d="M10.5 5.5V3.8a1.3 1.3 0 0 0-1.3-1.3H3.8a1.3 1.3 0 0 0-1.3 1.3v5.4a1.3 1.3 0 0 0 1.3 1.3h1.7" />
  </svg>
);
const IconCheck = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-[13px]">
    <path d="M3.5 8.4 6.6 11.3 12.5 4.9" />
  </svg>
);
const IconPlus = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className="size-[13px]">
    <path d="M8 3v10M3 8h10" />
  </svg>
);

/* ---------- pieces ---------- */
function Stat({ label, value, sub, i }: { label: string; value: string; sub?: ReactNode; i: number }) {
  return (
    <div
      className={cx(
        "m-0 grid min-w-0 content-start gap-1.5 px-[22px] py-[18px]",
        i === 0 && "pl-[30px]",
        i > 0 && "border-l border-(--cov-line)",
        i === 2 && "@max-[720px]:border-l-0",
        i >= 2 && "@max-[720px]:border-t @max-[720px]:border-(--cov-line)",
        "@max-[720px]:px-[22px] @max-[720px]:py-4 @max-[480px]:px-4 @max-[480px]:py-3.5"
      )}
    >
      <dt className={cx(sc, "text-[13px] leading-none text-(--cov-faint)")}>{label}</dt>
      <dd className="m-0 min-w-0 font-(family-name:--cov-display) text-[clamp(20px,3cqi,25px)] leading-[1.1] font-semibold tracking-[-0.015em] [overflow-wrap:anywhere] tabular-nums @max-[480px]:text-[19px]">
        {value}
      </dd>
      <dd className="m-0 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] leading-[1.35] text-(--cov-muted) tabular-nums">{sub}</dd>
    </div>
  );
}

function SectionHead({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <h3 className="m-0 mb-3 flex items-baseline justify-between gap-2.5 text-[13.5px] leading-none text-(--cov-faint)">
      <span className={sc}>{children}</span>
      {aside != null && <small className="text-[12.5px] leading-none font-medium text-(--cov-muted) tabular-nums">{aside}</small>}
    </h3>
  );
}

function ContactCard({
  contact,
  onCopied,
  announce,
}: {
  contact: ClientContact;
  onCopied?: (c: ClientContact) => void;
  announce: (msg: string) => void;
}) {
  const [state, setState] = useState<"idle" | "done" | "manual">("idle");
  const emRef = useRef<HTMLSpanElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const who = contact.name || contact.email || "";

  const finish = (ok: boolean) => {
    setState(ok ? "done" : "manual");
    announce(ok ? `Email for ${who} copied` : "Press Ctrl+C");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 1800);
    if (ok) onCopied?.(contact);
  };
  const select = () => {
    const el = emRef.current;
    const sel = window.getSelection();
    if (el && sel) {
      const r = document.createRange();
      r.selectNodeContents(el);
      sel.removeAllRanges();
      sel.addRange(r);
    }
    finish(false);
  };
  const copy = () => {
    if (!contact.email) return;
    try {
      navigator.clipboard.writeText(contact.email).then(() => finish(true), select);
    } catch {
      select();
    }
  };

  return (
    <li className="group/p grid grid-cols-[40px_minmax(0,1fr)] items-start gap-x-3 gap-y-1 rounded-xl border border-(--cov-line) p-3.5 transition-colors hover:border-[color-mix(in_oklab,var(--cov-accent)_35%,var(--cov-line))] motion-reduce:transition-none">
      <span
        aria-hidden="true"
        className={cx(
          "row-span-3 grid size-10 place-items-center rounded-xl font-(family-name:--cov-display) text-[13px] leading-none font-semibold",
          contact.primary
            ? "bg-(--cov-navy) text-(--cov-navy-ink)"
            : "bg-(--cov-tint) text-(--cov-ink) shadow-[inset_0_0_0_1px_var(--cov-line)]"
        )}
      >
        {initialsOf(contact.name)}
      </span>
      <div className="flex flex-wrap items-center gap-2 text-[14.5px] leading-[1.25] font-semibold">
        {contact.name || "Unnamed"}
        {contact.primary && (
          <span className={cx(sc, "rounded-full bg-(--cov-accent-soft) px-[7px] py-[3px] text-xs leading-none text-(--cov-accent-strong)")}>Primary</span>
        )}
      </div>
      <div className="text-[12.5px] text-(--cov-muted)">{[contact.role, contact.phone].filter(Boolean).join(" · ")}</div>
      {contact.email && (
        <div className="mt-1.5 flex min-w-0 items-center justify-between gap-2 @max-[480px]:flex-wrap">
          <span ref={emRef} className="min-w-0 font-(family-name:--cov-mono) text-[12.5px] leading-[1.4] [overflow-wrap:anywhere] text-(--cov-ink)">
            {contact.email}
          </span>
          <button
            type="button"
            onClick={copy}
            aria-label={`Copy email for ${who}`}
            data-state={state}
            className="inline-flex flex-none cursor-pointer items-center gap-1.5 rounded-lg border border-(--cov-line) bg-(--cov-card) px-[9px] py-1.5 text-xs leading-none font-semibold text-(--cov-muted) transition-colors hover:border-(--cov-faint) hover:text-(--cov-ink) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--cov-accent) data-[state=done]:border-[color-mix(in_oklab,var(--cov-accent)_50%,var(--cov-line))] data-[state=done]:bg-(--cov-accent-soft) data-[state=done]:text-(--cov-accent-strong) motion-reduce:transition-none"
          >
            {state === "done" ? <IconCheck /> : <IconCopy />}
            <span>{state === "done" ? "Copied" : state === "manual" ? "Press Ctrl+C" : "Copy"}</span>
          </button>
        </div>
      )}
    </li>
  );
}

interface NoteItem extends ClientNote {
  id: number;
  isNew?: boolean;
}

/**
 * One client at a glance: account health, monthly revenue, tenure and open
 * pipeline, with tabs for account details, contacts and a running set of notes.
 */
export function ClientOverviewCard({
  company,
  initials,
  industry,
  location,
  website,
  plan,
  billing,
  renewal,
  owner,
  health = {},
  currency = "USD",
  locale = "en-GB",
  mrr,
  mrrPrevious,
  mrrCompareLabel,
  clientSince,
  asOf,
  lastActivity,
  services = [],
  opportunities = [],
  stages: stagesProp,
  contacts = [],
  notes: notesProp = [],
  noteAuthor = "You",
  tab: tabProp,
  defaultTab = "overview",
  onTabChange,
  favourite: favProp,
  defaultFavourite = false,
  onFavouriteChange,
  onNoteAdd,
  onEmailCopy,
  className,
}: ClientOverviewCardProps) {
  const uid = useId();
  const [tabState, setTabState] = useState<ClientOverviewTab>(defaultTab);
  const tab = tabProp ?? tabState;
  const [favState, setFavState] = useState(defaultFavourite);
  const favourite = favProp ?? favState;
  const [pop, setPop] = useState(0);
  const [entering, setEntering] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [draft, setDraft] = useState("");
  const nextId = useRef(0);
  const [notes, setNotes] = useState<NoteItem[]>(() => notesProp.filter((n) => n && n.text).map((n) => ({ ...n, id: nextId.current++ })));
  const [today, setToday] = useState<ParsedDate | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // "today" is only known on the client; read it after mount to keep SSR stable
  useEffect(() => {
    const n = new Date();
    setToday({ d: new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate())), naive: true, hasTime: false });
  }, []);

  const status: ClientHealthStatus = health.status && STATUS_LABEL[health.status] ? health.status : "healthy";
  const stages = stagesProp?.length ? stagesProp : DEFAULT_STAGES;
  const asOfDate = parseDT(asOf) ?? today;

  const money = useCallback(
    (v: number) => {
      try {
        return new Intl.NumberFormat(locale, { style: "currency", currency: currency.toUpperCase(), currencyDisplay: "narrowSymbol", maximumFractionDigits: 0 }).format(v);
      } catch {
        return `$${Math.round(v).toLocaleString("en-US")}`;
      }
    },
    [locale, currency]
  );
  const fmtDate = (p: ParsedDate | null, withTime = false) => {
    if (!p) return "";
    const o: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric", timeZone: p.naive ? "UTC" : undefined };
    if (withTime) Object.assign(o, { hour: "2-digit", minute: "2-digit" });
    try {
      return new Intl.DateTimeFormat(locale, o).format(p.d);
    } catch {
      return p.d.toDateString();
    }
  };

  /* ---------- stats ---------- */
  const mrrDelta = useMemo(() => {
    if (mrr == null || mrrPrevious == null || !(mrrPrevious > 0)) return null;
    const r = Math.round(((mrr - mrrPrevious) / mrrPrevious) * 1000) / 10;
    return { r, tone: r > 0 ? "good" : r < 0 ? "bad" : "flat" };
  }, [mrr, mrrPrevious]);

  const since = parseDT(clientSince);
  let tenure = "";
  if (since && asOfDate) {
    const a = asOfDate.d, s = since.d;
    let months = (a.getUTCFullYear() - s.getUTCFullYear()) * 12 + (a.getUTCMonth() - s.getUTCMonth());
    if (a.getUTCDate() < s.getUTCDate()) months--;
    months = Math.max(0, months);
    const y = Math.floor(months / 12), mo = months % 12;
    tenure = [y ? `${y} yr` : "", mo || !y ? `${mo} mo` : ""].filter(Boolean).join(" ");
  }
  let sinceTxt = "—";
  if (since) {
    try {
      sinceTxt = new Intl.DateTimeFormat(locale, { month: "short", year: "numeric", timeZone: "UTC" }).format(since.d);
    } catch {
      sinceTxt = String(clientSince);
    }
  }

  const opps = opportunities.filter(Boolean);
  const pipeline = opps.reduce((t, o) => t + (Number.isFinite(o.value) ? (o.value as number) : 0), 0);

  const la = parseDT(lastActivity?.date);
  let rel = "—";
  if (la && asOfDate) {
    const days = dayNum(la) - dayNum(asOfDate);
    try {
      rel = new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(days, "day");
    } catch {
      rel = `${Math.abs(days)} days ago`;
    }
    rel = rel.charAt(0).toUpperCase() + rel.slice(1);
  }

  /* ---------- tabs ---------- */
  const tabRefs = useRef<Record<ClientOverviewTab, HTMLButtonElement | null>>({ overview: null, contacts: null, notes: null });
  const tablistRef = useRef<HTMLDivElement>(null);
  const [bar, setBar] = useState({ x: 0, w: 0 });
  const [barReady, setBarReady] = useState(false);

  const placeBar = useCallback(() => {
    const b = tabRefs.current[tab];
    if (!b || !b.offsetWidth) return;
    setBar({ x: b.offsetLeft + 8, w: b.offsetWidth - 16 });
  }, [tab]);

  useLayoutEffect(() => {
    placeBar();
  }, [placeBar, notes.length, contacts.length]);

  useEffect(() => {
    const el = tablistRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => placeBar());
    ro.observe(el);
    return () => ro.disconnect();
  }, [placeBar]);

  useEffect(() => {
    let a = 0;
    const b = requestAnimationFrame(() => {
      a = requestAnimationFrame(() => setBarReady(true));
    });
    return () => {
      cancelAnimationFrame(b);
      cancelAnimationFrame(a);
    };
  }, []);

  const select = (t: ClientOverviewTab, focus: boolean) => {
    if (focus) tabRefs.current[t]?.focus();
    if (t === tab) return;
    setEntering(true);
    if (tabProp == null) setTabState(t);
    onTabChange?.(t);
  };
  const onTabKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = TABS.indexOf(tab);
    let n: number | null = null;
    if (e.key === "ArrowRight") n = (i + 1) % TABS.length;
    else if (e.key === "ArrowLeft") n = (i - 1 + TABS.length) % TABS.length;
    else if (e.key === "Home") n = 0;
    else if (e.key === "End") n = TABS.length - 1;
    if (n == null) return;
    e.preventDefault();
    select(TABS[n], true);
  };

  /* ---------- favourite ---------- */
  const toggleFav = () => {
    const on = !favourite;
    if (favProp == null) setFavState(on);
    if (on) setPop((p) => p + 1);
    onFavouriteChange?.(on);
  };

  /* ---------- notes ---------- */
  const addNote = (e?: FormEvent) => {
    e?.preventDefault();
    const text = draft.trim();
    if (!text) return;
    const note: NoteItem = { author: noteAuthor, date: new Date().toISOString(), text, id: nextId.current++, isNew: true };
    const next = [note, ...notes.map((n) => ({ ...n, isNew: false }))];
    setNotes(next);
    setDraft("");
    setAnnouncement("Note added");
    textareaRef.current?.focus();
    onNoteAdd?.({ author: note.author, date: note.date, text: note.text }, next.length);
  };

  const counts: Partial<Record<ClientOverviewTab, number>> = { contacts: contacts.length, notes: notes.length };
  const panelId = (t: ClientOverviewTab) => `${uid}-panel-${t}`;
  const tabId = (t: ClientOverviewTab) => `${uid}-tab-${t}`;

  return (
    <div className={cx("@container block w-full max-w-[920px] font-(family-name:--cov-sans) text-(--cov-ink)", className)}>
      <article className="relative overflow-hidden rounded-[18px] border border-(--cov-line) bg-(--cov-card) shadow-[0_30px_60px_-46px_var(--cov-shadow),0_2px_6px_-4px_var(--cov-shadow)] @max-[480px]:rounded-2xl">
        {/* header band */}
        <header className="relative grid grid-cols-[minmax(0,1fr)_auto] gap-x-6 gap-y-3.5 border-b border-(--cov-line) bg-(--cov-band) bg-[radial-gradient(120%_140%_at_100%_0%,color-mix(in_oklab,var(--cov-accent)_11%,transparent),transparent_55%),repeating-linear-gradient(135deg,transparent_0_11px,color-mix(in_oklab,var(--cov-line)_55%,transparent)_11px_12px)] px-[30px] pt-7 pb-[22px] [grid-template-areas:'id_actions'_'owner_actions'] @max-[720px]:px-[22px] @max-[720px]:pt-6 @max-[720px]:pb-5 @max-[480px]:grid-cols-[minmax(0,1fr)] @max-[480px]:gap-3.5 @max-[480px]:px-4 @max-[480px]:pt-5 @max-[480px]:pb-4 @max-[480px]:[grid-template-areas:'id'_'owner'_'actions']">
          <div className="flex min-w-0 items-center gap-[18px] [grid-area:id] @max-[480px]:items-start @max-[480px]:gap-3.5">
            <span
              aria-hidden="true"
              className="grid size-16 flex-none place-items-center rounded-2xl bg-[linear-gradient(150deg,color-mix(in_oklab,var(--cov-navy),#fff_10%),var(--cov-navy))] font-(family-name:--cov-display) text-[22px] leading-none font-semibold tracking-[.02em] text-(--cov-navy-ink) shadow-[0_0_0_4px_var(--cov-card),0_14px_26px_-16px_var(--cov-shadow)] @max-[480px]:size-[50px] @max-[480px]:rounded-[13px] @max-[480px]:text-lg"
            >
              {initials || initialsOf(company)}
            </span>
            <div className="grid min-w-0 gap-[5px]">
              <p className={cx(sc, "m-0 text-[13px] leading-none text-(--cov-accent-strong)")}>{["Client", plan].filter(Boolean).join(" · ")}</p>
              <h2 className="m-0 font-(family-name:--cov-display) text-[clamp(22px,3.6cqi,30px)] leading-[1.1] font-semibold tracking-[-0.02em] [overflow-wrap:anywhere] text-balance">
                {company || "Untitled client"}
              </h2>
              {(industry || location) && (
                <p className="m-0 flex flex-wrap gap-x-3.5 gap-y-1 text-[13.5px] text-(--cov-muted)">
                  {industry && (
                    <span className="inline-flex items-center gap-1.5">
                      <IconTag />
                      {industry}
                    </span>
                  )}
                  {location && (
                    <span className="inline-flex items-center gap-1.5">
                      <IconPin />
                      {location}
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>

          {owner?.name && (
            <div className="flex items-center gap-2.5 pl-[82px] text-[13px] text-(--cov-muted) [grid-area:owner] @max-[480px]:pl-0">
              <span
                aria-hidden="true"
                className="grid size-[26px] flex-none place-items-center rounded-full bg-(--cov-accent-soft) text-[10.5px] leading-none font-bold text-(--cov-accent-strong) shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--cov-accent)_35%,transparent)]"
              >
                {initialsOf(owner.name)}
              </span>
              <span>
                {owner.role || "Account owner"} · <b className="font-semibold text-(--cov-ink)">{owner.name}</b>
              </span>
            </div>
          )}

          <div className="flex flex-col items-end justify-between gap-3 [grid-area:actions] @max-[480px]:flex-row @max-[480px]:flex-wrap @max-[480px]:items-center">
            <span
              className={cx(
                "inline-flex items-center gap-2 rounded-full bg-(--cov-tone-soft) py-[7px] pr-3 pl-2.5 text-[12.5px] leading-none font-semibold text-(--cov-tone) tabular-nums shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--cov-tone)_28%,transparent)] transition-[color,background-color,box-shadow] duration-300 motion-reduce:transition-none",
                TONE[status]
              )}
            >
              <HealthIcon status={status} />
              <span className="sr-only">Health: </span>
              <span>{STATUS_LABEL[status]}</span>
              {health.score != null && Number.isFinite(health.score) && (
                <span className="font-medium opacity-85">
                  · {Math.round(health.score)}
                  <span className="sr-only"> out of 100</span>
                </span>
              )}
            </span>
            <button
              type="button"
              aria-pressed={favourite}
              aria-label={favourite ? "Remove favourite" : "Mark as favourite"}
              onClick={toggleFav}
              className="group/fav inline-flex cursor-pointer items-center gap-2 rounded-[10px] border border-(--cov-line) bg-(--cov-card) py-2 pr-3 pl-2.5 text-[12.5px] leading-none font-semibold text-(--cov-muted) transition-colors hover:border-[color-mix(in_oklab,var(--cov-faint)_60%,var(--cov-line))] hover:text-(--cov-ink) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--cov-accent) aria-pressed:border-[color-mix(in_oklab,var(--cov-star)_45%,var(--cov-line))] aria-pressed:bg-[color-mix(in_oklab,var(--cov-star)_9%,var(--cov-card))] aria-pressed:text-(--cov-ink) motion-reduce:transition-none"
            >
              <IconStar
                key={pop}
                className={cx(
                  "size-4 flex-none transition-[transform,color] duration-350 ease-out-soft group-aria-pressed/fav:text-(--cov-star) [&_path]:fill-transparent [&_path]:transition-[fill] [&_path]:duration-250 group-aria-pressed/fav:[&_path]:fill-current motion-reduce:transition-none motion-reduce:[&_path]:transition-none",
                  favourite && pop > 0 && "animate-[cov-pop_.42s_cubic-bezier(.2,.7,.2,1)] motion-reduce:animate-none"
                )}
              />
              <span>Favourite</span>
            </button>
          </div>
        </header>

        {/* stats */}
        <dl className="m-0 grid grid-cols-4 border-b border-(--cov-line) @max-[720px]:grid-cols-2">
          <Stat
            i={0}
            label="Monthly revenue"
            value={mrr == null ? "—" : money(mrr)}
            sub={
              mrrDelta && (
                <>
                  <span
                    className={cx(
                      "inline-flex items-center gap-[3px] font-semibold",
                      mrrDelta.tone === "good" ? "text-(--cov-accent-strong)" : mrrDelta.tone === "bad" ? "text-(--cov-bad)" : "text-(--cov-muted)"
                    )}
                  >
                    {mrrDelta.r > 0 ? "▲" : mrrDelta.r < 0 ? "▼" : "▶"} {Math.abs(mrrDelta.r).toFixed(1)}%
                  </span>
                  {mrrCompareLabel && `vs ${mrrCompareLabel}`}
                </>
              )
            }
          />
          <Stat i={1} label="Client since" value={sinceTxt} sub={tenure} />
          <Stat i={2} label="Open opportunities" value={String(opps.length)} sub={opps.length ? `${money(pipeline)} pipeline` : "None open"} />
          <Stat i={3} label="Last activity" value={rel} sub={lastActivity?.summary} />
        </dl>

        {/* tabs */}
        <div
          ref={tablistRef}
          role="tablist"
          aria-label="Client details"
          onKeyDown={onTabKey}
          className="relative flex gap-1 border-b border-(--cov-line) px-[22px] @max-[720px]:px-3.5 @max-[480px]:gap-0 @max-[480px]:px-1.5"
        >
          {TABS.map((t) => {
            const on = t === tab;
            return (
              <button
                key={t}
                ref={(el) => {
                  tabRefs.current[t] = el;
                }}
                type="button"
                role="tab"
                id={tabId(t)}
                aria-controls={panelId(t)}
                aria-selected={on}
                tabIndex={on ? 0 : -1}
                onClick={() => select(t, false)}
                className="group/tab relative inline-flex cursor-pointer items-center justify-center gap-2 rounded-t-lg border-0 bg-transparent px-3 pt-[15px] pb-3.5 text-sm leading-none font-semibold text-(--cov-muted) transition-colors hover:bg-[color-mix(in_oklab,var(--cov-tint)_70%,transparent)] hover:text-(--cov-ink) focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-(--cov-accent) aria-selected:text-(--cov-ink) motion-reduce:transition-none @max-[480px]:flex-1 @max-[480px]:gap-1.5 @max-[480px]:px-1.5 @max-[480px]:pt-3.5 @max-[480px]:pb-[13px] @max-[480px]:text-[13.5px]"
              >
                <span>{TAB_LABEL[t]}</span>
                {counts[t] != null && (
                  <span className="min-w-5 rounded-full bg-(--cov-tint) px-1.5 py-[3px] text-center text-[11px] leading-none font-semibold text-(--cov-muted) tabular-nums shadow-[inset_0_0_0_1px_var(--cov-line)] transition-colors duration-250 group-aria-selected/tab:bg-(--cov-accent-soft) group-aria-selected/tab:text-(--cov-accent-strong) group-aria-selected/tab:shadow-none motion-reduce:transition-none">
                    {counts[t]}
                  </span>
                )}
              </button>
            );
          })}
          <span
            aria-hidden="true"
            style={{ width: bar.w, transform: `translateX(${bar.x}px)` }}
            className={cx(
              "absolute -bottom-px left-0 h-0.5 rounded-t-[2px] bg-(--cov-accent)",
              barReady && "transition-[transform,width] duration-[380ms] ease-[cubic-bezier(.3,.8,.25,1)] motion-reduce:transition-none"
            )}
          />
        </div>

        {/* panels */}
        {TABS.map((t) => (
          <section
            key={t}
            id={panelId(t)}
            role="tabpanel"
            aria-labelledby={tabId(t)}
            tabIndex={0}
            hidden={t !== tab}
            className={cx(
              "px-[30px] pt-6 pb-7 outline-none focus-visible:shadow-[inset_0_0_0_2px_var(--cov-accent)] @max-[720px]:px-[22px] @max-[720px]:pt-[22px] @max-[720px]:pb-6 @max-[480px]:px-4 @max-[480px]:pt-[18px] @max-[480px]:pb-5",
              t === tab && entering && "animate-[cov-in_.32s_cubic-bezier(.2,.7,.2,1)] motion-reduce:animate-none"
            )}
          >
            {t === tab && t === "overview" && (
              <div className="grid grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] gap-7 @max-[720px]:grid-cols-1 @max-[720px]:gap-6">
                <div>
                  <SectionHead aside={`${opps.length} open`}>Open opportunities</SectionHead>
                  {!opps.length ? (
                    <p className="m-0 rounded-xl border border-dashed border-(--cov-line) p-[22px] text-center text-[13.5px] text-(--cov-muted)">No open opportunities.</p>
                  ) : (
                    <>
                      <ul className="m-0 grid list-none gap-2 p-0">
                        {opps.map((o, k) => {
                          const si = Math.max(0, stages.findIndex((s) => s.toLowerCase() === String(o.stage || "").toLowerCase()));
                          const close = parseDT(o.close);
                          return (
                            <li
                              key={k}
                              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3.5 gap-y-2 rounded-xl border border-(--cov-line) bg-(--cov-card) px-3.5 py-[13px] transition-[border-color,transform,box-shadow] duration-250 ease-out-soft hover:-translate-y-px hover:border-[color-mix(in_oklab,var(--cov-accent)_40%,var(--cov-line))] hover:shadow-[0_12px_22px_-18px_var(--cov-shadow)] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                            >
                              <span className="text-sm leading-[1.3] font-semibold [overflow-wrap:anywhere]">{o.name || "Untitled"}</span>
                              <span className="text-right font-(family-name:--cov-display) text-[15px] leading-none font-semibold tabular-nums">
                                {o.value == null ? "—" : money(o.value)}
                              </span>
                              <div className="col-span-full flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 text-[12.5px] text-(--cov-muted) tabular-nums">
                                <span className="inline-flex items-center gap-2">
                                  <span aria-hidden="true" className="inline-flex gap-[3px]">
                                    {stages.map((_, j) => (
                                      <i key={j} className={cx("h-1 w-4 rounded-[2px]", j <= si ? "bg-(--cov-accent)" : "bg-(--cov-line)")} />
                                    ))}
                                  </span>
                                  <span>{o.stage || stages[si]}</span>
                                  <span className="sr-only">
                                    , stage {si + 1} of {stages.length}
                                  </span>
                                </span>
                                {close && <span>closes {fmtDate(close)}</span>}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                      <div className="mt-3 flex justify-between gap-2.5 border-t border-dashed border-(--cov-line) pt-3 text-[13px] text-(--cov-muted) tabular-nums">
                        <span>{opps.length} open</span>
                        <b className="font-semibold text-(--cov-ink)">{money(pipeline)} pipeline</b>
                      </div>
                    </>
                  )}
                </div>

                <div>
                  <SectionHead>Account</SectionHead>
                  <dl className="m-0 grid">
                    {[
                      { k: "Plan", v: plan },
                      { k: "Renewal", v: fmtDate(parseDT(renewal)) },
                      { k: "Billing", v: billing },
                      { k: "Website", v: website },
                      {
                        k: "Services",
                        v: services.length ? (
                          <div className="flex flex-wrap gap-1.5">
                            {services.map((s) => (
                              <span key={s} className="rounded-[7px] bg-(--cov-tint) px-[9px] py-[5px] text-[12.5px] leading-none text-(--cov-ink) shadow-[inset_0_0_0_1px_var(--cov-line)]">
                                {s}
                              </span>
                            ))}
                          </div>
                        ) : null,
                      },
                    ]
                      .filter((f) => f.v != null && f.v !== "")
                      .map((f, j) => (
                        <div
                          key={f.k}
                          className={cx(
                            "grid grid-cols-[110px_minmax(0,1fr)] gap-3 py-2.5 text-[13.5px] @max-[480px]:grid-cols-1 @max-[480px]:gap-1",
                            j === 0 ? "pt-0.5" : "border-t border-(--cov-line)"
                          )}
                        >
                          <dt className={cx(sc, "text-[13px] text-(--cov-faint)")}>{f.k}</dt>
                          <dd className="m-0 min-w-0 [overflow-wrap:anywhere] tabular-nums">{f.v}</dd>
                        </div>
                      ))}
                  </dl>
                  {health.note && (
                    <p
                      className={cx(
                        "m-0 mt-4 rounded-[10px] border-l-[3px] border-(--cov-tone) bg-(--cov-tone-soft) px-3.5 py-3 text-[13px] leading-normal text-(--cov-ink)",
                        NOTE_TONE[status]
                      )}
                    >
                      {health.note}
                    </p>
                  )}
                </div>
              </div>
            )}

            {t === tab && t === "contacts" &&
              (contacts.length ? (
                <ul className="m-0 grid list-none grid-cols-2 gap-2.5 p-0 @max-[720px]:grid-cols-1">
                  {contacts.filter(Boolean).map((c, k) => (
                    <ContactCard key={`${c.email ?? ""}-${k}`} contact={c} onCopied={onEmailCopy} announce={setAnnouncement} />
                  ))}
                </ul>
              ) : (
                <p className="m-0 rounded-xl border border-dashed border-(--cov-line) p-[22px] text-center text-[13.5px] text-(--cov-muted)">No contacts yet.</p>
              ))}

            {t === tab && t === "notes" && (
              <>
                <form onSubmit={addNote} className="grid gap-2.5 rounded-[14px] border border-(--cov-line) bg-(--cov-tint) p-3.5">
                  <label htmlFor={`${uid}-note`} className={cx(sc, "text-[13.5px] leading-none text-(--cov-faint)")}>
                    Add a note
                  </label>
                  <textarea
                    ref={textareaRef}
                    id={`${uid}-note`}
                    rows={3}
                    maxLength={1000}
                    placeholder="What happened, what's next…"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                        e.preventDefault();
                        addNote();
                      }
                    }}
                    className="box-border min-h-[76px] w-full resize-y rounded-[10px] border border-(--cov-line) bg-(--cov-card) px-[13px] py-[11px] text-sm leading-normal text-(--cov-ink) transition-[border-color,box-shadow] placeholder:text-(--cov-faint) focus:border-(--cov-accent) focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--cov-accent)_22%,transparent)] focus:outline-none motion-reduce:transition-none"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2.5">
                    <span className="text-[12.5px] text-(--cov-muted) [&_kbd]:rounded-[4px] [&_kbd]:bg-(--cov-card) [&_kbd]:px-[5px] [&_kbd]:py-[3px] [&_kbd]:font-(family-name:--cov-mono) [&_kbd]:text-[11px] [&_kbd]:leading-none [&_kbd]:font-medium [&_kbd]:shadow-[inset_0_0_0_1px_var(--cov-line)]">
                      <kbd>Ctrl</kbd> + <kbd>Enter</kbd> to add
                    </span>
                    <button
                      type="submit"
                      disabled={!draft.trim()}
                      className="inline-flex cursor-pointer items-center gap-[7px] rounded-[10px] border-0 bg-(--cov-navy) px-[15px] py-2.5 text-[13px] leading-none font-semibold text-(--cov-navy-ink) transition-[background-color,opacity,transform] duration-200 not-disabled:hover:bg-[color-mix(in_oklab,var(--cov-navy),#000_18%)] not-disabled:active:scale-[.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--cov-accent) disabled:cursor-not-allowed disabled:opacity-45 motion-reduce:transition-none motion-reduce:active:scale-100"
                    >
                      <IconPlus />
                      Add note
                    </button>
                  </div>
                </form>
                <ol aria-label="Notes" className="m-0 mt-[18px] grid list-none p-0">
                  {!notes.length ? (
                    <li className="rounded-xl border border-dashed border-(--cov-line) p-[22px] text-center text-[13.5px] text-(--cov-muted)">
                      No notes yet. Add the first one above.
                    </li>
                  ) : (
                    notes.map((n, k) => {
                      const p = parseDT(n.date);
                      const author = n.author || noteAuthor;
                      const fresh = n.isNew && k === 0;
                      const justNow = n.isNew && p && Date.now() - p.d.getTime() < 6e4;
                      return (
                        <li
                          key={n.id}
                          className={cx(
                            "relative grid grid-cols-[30px_minmax(0,1fr)] gap-x-3 gap-y-0.5 py-3.5",
                            k > 0 && "border-t border-(--cov-line)",
                            fresh && "animate-[cov-note-in_.45s_cubic-bezier(.2,.7,.2,1)] motion-reduce:animate-none"
                          )}
                        >
                          <span
                            aria-hidden="true"
                            className={cx(
                              "row-span-2 grid size-[30px] place-items-center rounded-full text-[10.5px] leading-none font-bold",
                              fresh ? "bg-(--cov-navy) text-(--cov-navy-ink)" : "bg-(--cov-accent-soft) text-(--cov-accent-strong)"
                            )}
                          >
                            {initialsOf(author)}
                          </span>
                          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 text-[13px]">
                            <b className="font-semibold">{author}</b>
                            {p && (
                              <time dateTime={p.d.toISOString()} className="text-[12.5px] text-(--cov-muted) tabular-nums">
                                {justNow ? `Just now · ${fmtDate(p, true)}` : fmtDate(p, p.hasTime)}
                              </time>
                            )}
                          </div>
                          <p className="m-0 mt-1 text-sm leading-[1.55] [overflow-wrap:anywhere] whitespace-pre-wrap">{n.text}</p>
                        </li>
                      );
                    })
                  )}
                </ol>
              </>
            )}
          </section>
        ))}
        <p className="sr-only" aria-live="polite">
          {announcement}
        </p>
      </article>
    </div>
  );
}

export default ClientOverviewCard;
