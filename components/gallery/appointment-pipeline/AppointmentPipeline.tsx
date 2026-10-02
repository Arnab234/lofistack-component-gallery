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
  type Ref,
} from "react";
import { cx } from "@/lib/format";

export type AppointmentStatus = "booked" | "confirmed" | "showed" | "noshow";

export interface Appointment {
  /** Unique key. */
  id: string;
  /** Start time, HH:MM (24-hour). */
  time: string;
  /** Length in minutes. */
  duration?: number;
  /** Client name. */
  name: string;
  /** Appointment type. */
  service?: string;
  /** Team member, shown as initials. */
  staff?: string;
  status?: AppointmentStatus;
  /** True once a reminder has gone out. */
  reminded?: boolean;
  /** Where the booking came from. Shown when the appointment is opened. */
  source?: string;
  phone?: string;
  note?: string;
}

export interface AppointmentDay {
  /** YYYY-MM-DD. Weekday and date labels are worked out from it. */
  date: string;
  /** One entry per booking, in any order. Sorted by time inside each lane. */
  appointments: Appointment[];
}

export interface AppointmentUpdate {
  action: "status" | "reminder";
  id: string;
  day: string | null;
  /** The appointment as passed in, with its live status and reminder flag. */
  appointment: Appointment;
  from?: AppointmentStatus;
  to?: AppointmentStatus;
  reminded?: boolean;
}

export interface AppointmentPipelineLabels {
  booked: string;
  confirmed: string;
  showed: string;
  noshow: string;
  bookedDesc: string;
  confirmedDesc: string;
  showedDesc: string;
  noshowDesc: string;
  weekRate: string;
  rateSub: string;
  noRate: string;
  appts: string;
  appt: string;
  dayRate: string;
  dayConfirmed: string;
  dayAppts: string;
  today: string;
  empty: string;
  time: string;
  staff: string;
  phone: string;
  via: string;
  moveTo: string;
  remind: string;
  reminded: string;
  remindedNow: string;
  remindNa: string;
  bulk: string;
  bulkOne: string;
  bulkNone: string;
  bulkDone: string;
  min: string;
  days: string;
  moved: string;
  remindedSr: string;
  legendShowed: string;
  legendNoshow: string;
}

/** Imperative handle, the same API the custom element exposed. */
export interface AppointmentPipelineHandle {
  setStatus: (id: string, status: AppointmentStatus) => void;
  remind: (id: string) => void;
}

export interface AppointmentPipelineProps {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  /** YYYY-MM-DD. Marks that day with a "Today" tag and is the default day. */
  today?: string;
  /** The week of bookings, one entry per day. */
  days: AppointmentDay[];
  /** Controlled selected day (a date from `days`). */
  day?: string;
  /** Initial day when uncontrolled. Falls back to `today`, then the first day. */
  defaultDay?: string;
  /** Fires when a day tab is picked. */
  onDayChange?: (day: string) => void;
  /** Fires when an appointment moves lane or gets a reminder. */
  onAppointmentUpdate?: (detail: AppointmentUpdate) => void;
  /** Footer note. */
  source?: string;
  labels?: Partial<AppointmentPipelineLabels>;
  /** Date locale. */
  locale?: string;
  ref?: Ref<AppointmentPipelineHandle>;
  className?: string;
}

const STATUSES: AppointmentStatus[] = ["booked", "confirmed", "showed", "noshow"];

const LABELS: AppointmentPipelineLabels = {
  booked: "Booked",
  confirmed: "Confirmed",
  showed: "Showed",
  noshow: "No-show",
  bookedDesc: "Waiting to confirm",
  confirmedDesc: "Said they're coming",
  showedDesc: "Came in",
  noshowDesc: "Missed it",
  weekRate: "Show rate · this week",
  rateSub: "{showed} showed · {noshow} no-shows · {upcoming} still to come",
  noRate: "No finished visits yet",
  appts: "{n} appointments",
  appt: "1 appointment",
  dayRate: "show rate",
  dayConfirmed: "of upcoming confirmed",
  dayAppts: "appointments",
  today: "Today",
  empty: "Nothing here",
  time: "Time",
  staff: "Coach",
  phone: "Phone",
  via: "Booked via",
  moveTo: "Move to",
  remind: "Send reminder",
  reminded: "Reminder sent",
  remindedNow: "Reminder sent · just now",
  remindNa: "Visit finished",
  bulk: "Send {n} reminders",
  bulkOne: "Send 1 reminder",
  bulkNone: "All reminded",
  bulkDone: "Sent {n} reminders.",
  min: "{n} min",
  days: "Choose a day",
  moved: "{name} moved to {lane}.",
  remindedSr: "Reminder sent to {name}.",
  legendShowed: "Showed",
  legendNoshow: "No-show",
};

/** Per-status colour variables (--apl-s dot/bar, --apl-s-ink text). */
const TONE: Record<AppointmentStatus, string> = {
  booked: "[--apl-s:var(--apl-booked)] [--apl-s-ink:var(--apl-booked-ink)]",
  confirmed: "[--apl-s:var(--apl-confirmed)] [--apl-s-ink:var(--apl-confirmed-ink)]",
  showed: "[--apl-s:var(--apl-showed)] [--apl-s-ink:var(--apl-showed-ink)]",
  noshow: "[--apl-s:var(--apl-noshow)] [--apl-s-ink:var(--apl-noshow-ink)]",
};

const NOSHOW_PIP =
  "bg-transparent bg-[linear-gradient(135deg,transparent_44%,var(--apl-noshow)_44%_56%,transparent_56%)] shadow-[inset_0_0_0_1.5px_var(--apl-noshow)]";
const EASE = "cubic-bezier(.2,.7,.2,1)";

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;
const fill = (s: string, vars: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ""));
const reduceMotion = () => typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const minutes = (t: string) => {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(t || ""));
  return m ? +m[1] * 60 + +m[2] : 0;
};
const clock = (mins: number) => {
  mins = ((mins % 1440) + 1440) % 1440;
  const h = Math.floor(mins / 60), m = mins % 60;
  return { hm: `${h % 12 || 12}:${String(m).padStart(2, "0")}`, ap: h < 12 ? "AM" : "PM" };
};
const initials = (s: string) =>
  String(s || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("") || "?";
const parseDate = (s: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ""));
  return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 12)) : null;
};
/** Re-run a CSS keyframe animation on an element. */
const replayAnimation = (el: HTMLElement | null | undefined, animation: string) => {
  if (!el || reduceMotion()) return;
  el.style.animation = "none";
  void el.offsetWidth;
  el.style.animation = animation;
  el.addEventListener("animationend", () => (el.style.animation = ""), { once: true });
};

interface NormAppt {
  id: string;
  raw: Appointment;
  name: string;
  service: string;
  staff: string;
  start: number;
  duration: number;
  status: AppointmentStatus;
  reminded: boolean;
  source: string;
  phone: string;
  note: string;
}
interface NormDay {
  date: string;
  appts: NormAppt[];
}
interface Live {
  status: AppointmentStatus;
  reminded: boolean;
  remindedNow: boolean;
}

function normalise(days: AppointmentDay[]): NormDay[] {
  const seen = new Set<string>();
  return (Array.isArray(days) ? days : [])
    .filter((x) => x && parseDate(x.date))
    .map((day) => ({
      date: day.date,
      appts: (Array.isArray(day.appointments) ? day.appointments : [])
        .filter(Boolean)
        .map((a, i) => {
          let id = String(a.id || `${day.date}-${i + 1}`);
          while (seen.has(id)) id += "-" + i;
          seen.add(id);
          return {
            id,
            raw: a,
            name: a.name || "Client",
            service: a.service || "",
            staff: a.staff || "",
            start: minutes(a.time),
            duration: Math.max(0, Number(a.duration) || 0),
            status: a.status && STATUSES.includes(a.status) ? a.status : "booked",
            reminded: !!a.reminded,
            source: a.source || "",
            phone: a.phone || "",
            note: a.note || "",
          };
        })
        .sort((x, y) => x.start - y.start),
    }));
}

const initialLive = (days: NormDay[]) => {
  const out: Record<string, Live> = {};
  days.forEach((d) => d.appts.forEach((a) => (out[a.id] = { status: a.status, reminded: a.reminded, remindedNow: false })));
  return out;
};

function BellIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d="M3.5 9.5V6.2a3.5 3.5 0 0 1 7 0v3.3l1 1.3h-9z" />
      <path d="M5.8 12.3a1.3 1.3 0 0 0 2.4 0" />
    </svg>
  );
}
function SendIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d="M12.5 1.5 6 8M12.5 1.5l-4 11-2.5-4.5L1.5 5.5z" />
    </svg>
  );
}

const mono = "font-(family-name:--apl-mono) uppercase";
const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--apl-coral-ink)";

/**
 * A week of bookings shown one day at a time, in Booked, Confirmed, Showed and
 * No-show lanes. Move appointments between lanes and send reminders while the
 * show rate updates.
 */
export function AppointmentPipeline({
  eyebrow,
  title,
  subtitle,
  today,
  days,
  day: dayProp,
  defaultDay,
  onDayChange,
  onAppointmentUpdate,
  source,
  labels,
  locale = "en-US",
  ref,
  className,
}: AppointmentPipelineProps) {
  const L = useMemo(() => ({ ...LABELS, ...labels }), [labels]);
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const norm = useMemo(() => normalise(days), [days]);

  // live statuses, reset whenever new data comes in
  const [live, setLive] = useState(() => initialLive(norm));
  const [liveFor, setLiveFor] = useState(norm);
  if (liveFor !== norm) {
    setLiveFor(norm);
    setLive(initialLive(norm));
  }
  const liveRef = useRef(live);
  liveRef.current = live;

  const [dayState, setDayState] = useState(defaultDay);
  const want = dayProp ?? dayState ?? today;
  const current = norm.find((d) => d.date === want) || norm[0] || null;

  const [open, setOpen] = useState<string | null>(null);
  const [say, setSay] = useState("");
  const sayT = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const announce = (t: string) => {
    setSay("");
    clearTimeout(sayT.current);
    sayT.current = setTimeout(() => setSay(t), 60);
  };
  useEffect(() => () => clearTimeout(sayT.current), []);

  // close the open card when the day changes
  const [openFor, setOpenFor] = useState(current?.date);
  if (openFor !== current?.date) {
    setOpenFor(current?.date);
    setOpen(null);
  }

  const st = (a: NormAppt): Live => live[a.id] ?? { status: a.status, reminded: a.reminded, remindedNow: false };

  /* ---------- refs for focus + motion ---------- */
  const cardRefs = useRef(new Map<string, HTMLLIElement>());
  const laneNRefs = useRef(new Map<AppointmentStatus, HTMLSpanElement>());
  const tabRefs = useRef(new Map<string, HTMLButtonElement>());
  const pending = useRef<{
    flip?: { id: string; rect: DOMRect; fromUi: boolean };
    focus?: { id: string; sel: string };
    bump?: AppointmentStatus[];
  }>({});

  useIsoLayoutEffect(() => {
    const p = pending.current;
    pending.current = {};
    if (p.focus) {
      const li = cardRefs.current.get(p.focus.id);
      const el = li?.querySelector<HTMLElement>(p.focus.sel);
      el?.focus({ preventScroll: true });
    }
    if (p.flip) {
      const li = cardRefs.current.get(p.flip.id);
      if (li) {
        const r1 = li.getBoundingClientRect();
        if (!reduceMotion() && "animate" in li) {
          li.animate([{ transform: `translate(${p.flip.rect.left - r1.left}px, ${p.flip.rect.top - r1.top}px)` }, { transform: "none" }], {
            duration: 420,
            easing: EASE,
          });
          replayAnimation(li, "apl-flash .9s ease");
        }
        if (p.flip.fromUi && (r1.top < 0 || r1.bottom > window.innerHeight)) {
          li.scrollIntoView({ block: "nearest", behavior: reduceMotion() ? "auto" : "smooth" });
        }
      }
    }
    p.bump?.forEach((s) => replayAnimation(laneNRefs.current.get(s), `apl-bump .45s ${EASE}`));
  });

  /* ---------- actions ---------- */
  const find = (id: string) => {
    for (const d of norm) {
      const a = d.appts.find((x) => x.id === id);
      if (a) return { a, d };
    }
    return null;
  };
  const snapshot = (a: NormAppt, l: Live): Appointment => ({ ...a.raw, status: l.status, reminded: l.reminded });

  const move = useCallback(
    (id: string, status: AppointmentStatus, fromUi: boolean) => {
      const hit = find(id);
      if (!hit) return;
      const { a, d } = hit;
      const prev = liveRef.current[id] ?? { status: a.status, reminded: a.reminded, remindedNow: false };
      if (prev.status === status) return;
      const li = cardRefs.current.get(id);
      const visible = d === current && li && li.isConnected;
      if (visible && li) {
        pending.current.flip = { id, rect: li.getBoundingClientRect(), fromUi };
        const active = document.activeElement as HTMLElement | null;
        if (active && li.contains(active)) {
          pending.current.focus = { id, sel: active.dataset.status ? `[data-status="${active.dataset.status}"]` : "button[aria-expanded]" };
        }
      }
      if (visible) pending.current.bump = [prev.status, status];
      const next = { ...prev, status };
      setLive((l) => ({ ...l, [id]: next }));
      announce(fill(L.moved, { name: a.name, lane: L[status] }));
      onAppointmentUpdate?.({ action: "status", id, day: d.date, appointment: snapshot(a, next), from: prev.status, to: status });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [norm, current, L, onAppointmentUpdate]
  );

  const remind = useCallback(
    (ids: string[], focusId?: string) => {
      const todo = ids
        .map((id) => find(id))
        .filter((h): h is { a: NormAppt; d: NormDay } => {
          if (!h) return false;
          const l = liveRef.current[h.a.id];
          return !!l && !l.reminded && (l.status === "booked" || l.status === "confirmed");
        });
      if (!todo.length) return;
      if (focusId) pending.current.focus = { id: focusId, sel: 'button[aria-pressed="true"]' };
      setLive((l) => {
        const out = { ...l };
        todo.forEach(({ a }) => (out[a.id] = { ...out[a.id], reminded: true, remindedNow: true }));
        return out;
      });
      announce(todo.length === 1 ? fill(L.remindedSr, { name: todo[0].a.name }) : fill(L.bulkDone, { n: todo.length }));
      todo.forEach(({ a, d }) => {
        const l = liveRef.current[a.id];
        onAppointmentUpdate?.({ action: "reminder", id: a.id, day: d.date, appointment: snapshot(a, { ...l, reminded: true }), reminded: true });
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [norm, L, onAppointmentUpdate]
  );

  useImperativeHandle(
    ref,
    () => ({
      setStatus: (id, status) => {
        if (STATUSES.includes(status)) move(id, status, false);
      },
      remind: (id) => remind([id]),
    }),
    [move, remind]
  );

  const pickDay = (date: string, focus: boolean) => {
    if (focus) tabRefs.current.get(date)?.focus();
    if (date === current?.date) return;
    setDayState(date);
    onDayChange?.(date);
  };
  const onTabsKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = norm.findIndex((d) => tabRefs.current.get(d.date) === document.activeElement);
    if (i < 0) return;
    const n = norm.length;
    let j: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") j = (i + 1) % n;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") j = (i - 1 + n) % n;
    else if (e.key === "Home") j = 0;
    else if (e.key === "End") j = n - 1;
    if (j == null) return;
    e.preventDefault();
    pickDay(norm[j].date, true);
  };
  const onLanesKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Escape" || !open) return;
    const id = open;
    setOpen(null);
    cardRefs.current.get(id)?.querySelector<HTMLButtonElement>("button[aria-expanded]")?.focus();
  };

  /* ---------- derived numbers ---------- */
  const counts = (appts: NormAppt[]) => {
    const c: Record<AppointmentStatus, number> = { booked: 0, confirmed: 0, showed: 0, noshow: 0 };
    appts.forEach((a) => c[st(a).status]++);
    return c;
  };
  const all = norm.flatMap((d) => d.appts);
  const wk = counts(all);
  const done = wk.showed + wk.noshow;
  const rate = done > 0 ? Math.round((wk.showed / done) * 100) : null;
  const pips = all.filter((a) => st(a).status === "showed" || st(a).status === "noshow");

  const dayAppts = current ? current.appts : [];
  const c = counts(dayAppts);
  const fin = c.showed + c.noshow, up = c.booked + c.confirmed;
  const toRemind = dayAppts.filter((a) => {
    const l = st(a);
    return (l.status === "booked" || l.status === "confirmed") && !l.reminded;
  });

  const fmtDow = (d: Date) => new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" }).format(d);
  const fmtLong = (d: Date) => new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(d);
  const panelId = `${uid}-panel`;

  return (
    <div className={cx("@container block w-full max-w-[980px] font-(family-name:--apl-sans) text-(--apl-ink)", className)}>
      <article className="relative rounded-[18px] border border-(--apl-line) bg-(--apl-card) px-6 pt-6 pb-[18px] shadow-[0_28px_56px_-44px_var(--apl-shadow),0_2px_6px_-4px_var(--apl-shadow)] @max-[759px]:px-[18px] @max-[759px]:pt-[22px] @max-[759px]:pb-4 @max-[479px]:rounded-2xl @max-[479px]:px-3 @max-[479px]:pt-[18px] @max-[479px]:pb-3.5">
        {/* header */}
        <header className="flex flex-wrap items-start justify-between gap-x-7 gap-y-4">
          <div className="grid min-w-0 flex-[1_1_280px] gap-1.5">
            {eyebrow && (
              <span className={cx(mono, "inline-flex items-center gap-2 text-[11px] leading-none font-semibold tracking-[0.1em] text-(--apl-coral-ink) before:size-2 before:rounded-full before:bg-(--apl-coral) before:shadow-[0_0_0_3px_var(--apl-coral-soft)] before:content-['']")}>
                {eyebrow}
              </span>
            )}
            {title && (
              <h2 className="m-0 font-(family-name:--apl-display) text-[clamp(21px,3.4cqi,27px)] leading-[1.15] font-[650] tracking-[-0.018em] text-balance">{title}</h2>
            )}
            {subtitle && <p className="m-0 text-[13.5px] text-(--apl-muted)">{subtitle}</p>}
          </div>
          <div className="grid min-w-0 flex-[0_1_360px] grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3.5 gap-y-1 rounded-[14px] bg-(--apl-well) px-4 py-3 @max-[759px]:basis-full @max-[479px]:gap-x-3 @max-[479px]:p-3">
            <span
              aria-label={rate != null ? `${rate}%` : L.noRate}
              className="row-span-2 font-(family-name:--apl-display) text-[40px] leading-none font-[650] tracking-[-0.03em] text-(--apl-coral-ink) tabular-nums @max-[479px]:text-[34px]"
            >
              {rate != null ? (
                <>
                  {rate}
                  <small className="ml-px text-[0.5em] tracking-normal">%</small>
                </>
              ) : (
                "—"
              )}
            </span>
            <span className={cx(mono, "text-[10.5px] leading-[1.2] font-semibold tracking-[0.09em] text-(--apl-faint)")}>{L.weekRate}</span>
            <span aria-hidden="true" className="flex flex-wrap gap-[3px]">
              {pips.map((a) => (
                <i
                  key={a.id}
                  className={cx(
                    "h-3.5 w-[9px] rounded-[3px] transition-[background,box-shadow] duration-300 ease-in-out motion-reduce:transition-none",
                    st(a).status === "noshow" ? NOSHOW_PIP : "bg-(--apl-showed)"
                  )}
                />
              ))}
            </span>
            <p className="col-span-full m-0 mt-1 text-[12.5px] text-(--apl-muted) tabular-nums">
              {done > 0 ? fill(L.rateSub, { showed: wk.showed, noshow: wk.noshow, upcoming: wk.booked + wk.confirmed }) : L.noRate}
            </p>
          </div>
        </header>

        {/* day picker */}
        <div
          role="tablist"
          aria-label={L.days}
          onKeyDown={onTabsKey}
          className="mt-5 grid gap-2 @max-[479px]:gap-1"
          style={{ gridTemplateColumns: `repeat(${Math.max(1, Math.min(7, norm.length))}, minmax(0, 1fr))` }}
        >
          {norm.map((d) => {
            const dt = parseDate(d.date) as Date;
            const on = !!current && d.date === current.date;
            const dc = counts(d.appts), n = d.appts.length;
            const cnt = n === 1 ? L.appt : fill(L.appts, { n });
            const parts = STATUSES.filter((s) => dc[s])
              .map((s) => `${dc[s]} ${L[s].toLowerCase()}`)
              .join(", ");
            const isToday = today === d.date;
            return (
              <button
                key={d.date}
                ref={(el) => {
                  if (!el) return;
                  tabRefs.current.set(d.date, el);
                  return () => {
                    if (tabRefs.current.get(d.date) === el) tabRefs.current.delete(d.date);
                  };
                }}
                type="button"
                role="tab"
                id={`${uid}-tab-${d.date}`}
                aria-controls={panelId}
                aria-selected={on}
                tabIndex={on ? 0 : -1}
                aria-label={`${fmtDow(dt)} ${dt.getUTCDate()}${isToday ? ", " + L.today : ""}: ${cnt}${parts ? " (" + parts + ")" : ""}`}
                onClick={() => pickDay(d.date, false)}
                className={cx(
                  "group/day relative grid min-w-0 cursor-pointer appearance-none gap-1 rounded-xl border border-(--apl-line) bg-(--apl-card) px-3 py-2.5 text-left text-(--apl-ink) transition-[border-color,background,box-shadow,transform] duration-200 ease-out-soft hover:-translate-y-px hover:border-(--apl-line-strong) motion-reduce:transition-none motion-reduce:hover:translate-y-0",
                  "aria-selected:border-(--apl-coral) aria-selected:bg-(--apl-coral-soft) aria-selected:shadow-[0_0_0_1px_var(--apl-coral),0_12px_22px_-16px_var(--apl-coral)]",
                  "@max-[479px]:justify-items-center @max-[479px]:rounded-[10px] @max-[479px]:px-1 @max-[479px]:pt-2 @max-[479px]:pb-[7px] @max-[479px]:text-center",
                  focusRing
                )}
              >
                <span className="flex items-center justify-between gap-1.5 @max-[479px]:justify-center">
                  <span className={cx(mono, "text-[11px] leading-none font-semibold tracking-[0.08em] text-(--apl-muted) group-aria-selected/day:text-(--apl-coral-ink)")}>{fmtDow(dt)}</span>
                  {isToday && (
                    <span
                      className={cx(
                        mono,
                        "rounded px-[5px] py-[3px] text-[9.5px] leading-none font-bold tracking-[0.06em] text-(--apl-on-coral) bg-(--apl-coral-ink)",
                        "@max-[479px]:absolute @max-[479px]:top-1.5 @max-[479px]:right-1.5 @max-[479px]:size-1.5 @max-[479px]:rounded-full @max-[479px]:p-0 @max-[479px]:text-[0px]"
                      )}
                    >
                      {L.today}
                    </span>
                  )}
                </span>
                <span className="font-(family-name:--apl-display) text-2xl leading-none font-[650] tracking-[-0.02em] tabular-nums @max-[759px]:text-[21px] @max-[479px]:text-lg">
                  {dt.getUTCDate()}
                </span>
                <span
                  data-n={String(n)}
                  className="text-xs text-(--apl-muted) tabular-nums @max-[479px]:text-[0px] @max-[479px]:after:text-[11px] @max-[479px]:after:content-[attr(data-n)]"
                >
                  {cnt}
                </span>
                <span aria-hidden="true" className="mt-1 flex h-[5px] gap-0.5 overflow-hidden rounded-[3px] bg-(--apl-line) @max-[479px]:w-full">
                  {STATUSES.map((s) =>
                    dc[s] ? (
                      <i
                        key={s}
                        style={{ flexGrow: dc[s] }}
                        className={cx("min-w-0 shrink basis-0 bg-(--apl-s) transition-[flex-grow] duration-400 ease-out-soft motion-reduce:transition-none", TONE[s])}
                      />
                    ) : null
                  )}
                </span>
              </button>
            );
          })}
        </div>

        {/* selected day */}
        <div role="tabpanel" id={panelId} aria-labelledby={current ? `${uid}-tab-${current.date}` : undefined}>
          <div className="mt-[18px] flex flex-wrap items-center justify-between gap-x-[18px] gap-y-2.5 @max-[479px]:mt-3.5">
            <h3 className="m-0 font-(family-name:--apl-display) text-base leading-[1.2] font-[650] tracking-[-0.01em]">
              {current ? fmtLong(parseDate(current.date) as Date) + (today === current.date ? ` · ${L.today}` : "") : ""}
            </h3>
            <dl className="m-0 flex flex-wrap gap-1.5">
              {[
                { v: String(dayAppts.length), k: L.dayAppts },
                { v: fin ? Math.round((c.showed / fin) * 100) + "%" : "—", k: L.dayRate },
                { v: up ? Math.round((c.confirmed / up) * 100) + "%" : "—", k: L.dayConfirmed },
              ].map((x) => (
                <div key={x.k} className="inline-flex items-baseline gap-1.5 rounded-full bg-(--apl-well) px-2.5 py-1.5 text-[12.5px] text-(--apl-muted)">
                  <dt className="order-2">{x.k}</dt>
                  <dd className="m-0 font-[650] text-(--apl-ink) tabular-nums">{x.v}</dd>
                </div>
              ))}
            </dl>
            <button
              type="button"
              disabled={toRemind.length === 0}
              onClick={() => current && remind(current.appts.map((a) => a.id))}
              className={cx(
                "inline-flex cursor-pointer appearance-none items-center gap-[7px] rounded-full border border-(--apl-coral-ink) bg-transparent px-3 py-2 text-[12.5px] leading-none font-semibold text-(--apl-coral-ink) transition-[background,color] duration-200 enabled:hover:bg-(--apl-coral-ink) enabled:hover:text-(--apl-on-coral) disabled:cursor-default disabled:border-(--apl-line-strong) disabled:text-(--apl-muted) disabled:opacity-55 motion-reduce:transition-none @max-[479px]:w-full @max-[479px]:justify-center",
                focusRing
              )}
            >
              <SendIcon className="size-[13px]" />
              {toRemind.length === 0 ? L.bulkNone : toRemind.length === 1 ? L.bulkOne : fill(L.bulk, { n: toRemind.length })}
            </button>
          </div>

          {/* lanes */}
          <div onKeyDown={onLanesKey} className="mt-3.5 grid grid-cols-4 items-start gap-2.5 @max-[759px]:grid-cols-2 @max-[479px]:grid-cols-1">
            {STATUSES.map((s) => {
              const items = dayAppts.filter((a) => st(a).status === s);
              const headId = `${uid}-lane-${s}`;
              return (
                <section key={s} aria-labelledby={headId} className={cx("grid min-w-0 content-start gap-2 rounded-[14px] bg-(--apl-well) p-2.5 @max-[479px]:p-2", TONE[s])}>
                  <div className="flex items-center gap-2 px-1 pt-0.5 pb-1">
                    <span className="size-2 flex-none rounded-full bg-(--apl-s)" />
                    <h4 id={headId} className="m-0 text-[13px] leading-[1.2] font-[650]">
                      {L[s]}
                    </h4>
                    <span
                      ref={(el) => {
                        if (!el) return;
                        laneNRefs.current.set(s, el);
                        return () => {
                          if (laneNRefs.current.get(s) === el) laneNRefs.current.delete(s);
                        };
                      }}
                      className="ml-auto min-w-[22px] rounded-full bg-(--apl-card) px-[7px] py-[3px] text-center text-[11.5px] leading-none font-[650] text-(--apl-s-ink) tabular-nums shadow-[inset_0_0_0_1px_var(--apl-line)]"
                    >
                      {c[s]}
                    </span>
                  </div>
                  <p className="mx-1 -mt-1.5 mb-0.5 text-[11.5px] text-(--apl-faint)">{L[`${s}Desc` as const]}</p>
                  <ol className="m-0 grid list-none gap-2 p-0">
                    {items.map((a) => (
                      <AppointmentCard
                        key={a.id}
                        a={a}
                        live={st(a)}
                        open={open === a.id}
                        L={L}
                        uid={uid}
                        cardRef={(el) => {
                          if (!el) return;
                          cardRefs.current.set(a.id, el);
                          return () => {
                            if (cardRefs.current.get(a.id) === el) cardRefs.current.delete(a.id);
                          };
                        }}
                        onToggle={() => setOpen((o) => (o === a.id ? null : a.id))}
                        onMove={(to) => move(a.id, to, true)}
                        onRemind={() => remind([a.id], a.id)}
                      />
                    ))}
                  </ol>
                  {items.length === 0 && (
                    <p className="m-0 rounded-[10px] border border-dashed border-(--apl-line-strong) px-2 py-3.5 text-center text-[12.5px] text-(--apl-faint)">{L.empty}</p>
                  )}
                </section>
              );
            })}
          </div>
        </div>

        <footer className="mt-4 flex flex-wrap justify-between gap-x-4 gap-y-1.5 border-t border-(--apl-line) pt-3 text-xs text-(--apl-faint)">
          <span aria-hidden="true" className="flex flex-wrap gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-1.5">
              <i className="h-3 w-[9px] rounded-xs bg-(--apl-showed)" />
              {L.legendShowed}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <i className={cx("h-3 w-[9px] rounded-xs", NOSHOW_PIP)} />
              {L.legendNoshow}
            </span>
          </span>
          {source && <span>{source}</span>}
        </footer>
        <p className="sr-only" aria-live="polite">
          {say}
        </p>
      </article>
    </div>
  );
}

function AppointmentCard({
  a,
  live,
  open,
  L,
  uid,
  cardRef,
  onToggle,
  onMove,
  onRemind,
}: {
  a: NormAppt;
  live: Live;
  open: boolean;
  L: AppointmentPipelineLabels;
  uid: string;
  cardRef: (el: HTMLLIElement | null) => void | (() => void);
  onToggle: () => void;
  onMove: (s: AppointmentStatus) => void;
  onRemind: () => void;
}) {
  const detId = `${uid}-det-${a.id.replace(/[^\w-]/g, "")}`;
  const t = clock(a.start), end = clock(a.start + a.duration);
  const finished = live.status === "showed" || live.status === "noshow";
  const off = live.reminded || finished;
  const facts: Array<[string, string]> = (
    [
      [L.time, a.duration ? `${t.hm}${t.ap !== end.ap ? " " + t.ap : ""} – ${end.hm} ${end.ap}` : `${t.hm} ${t.ap}`],
      [L.staff, a.staff],
      [L.phone, a.phone],
      [L.via, a.source],
    ] as Array<[string, string]>
  ).filter((r) => r[1]);

  return (
    <li
      ref={cardRef}
      data-status={live.status}
      className={cx(
        "relative rounded-[10px] bg-(--apl-card) transition-shadow duration-250 ease-in-out motion-reduce:transition-none",
        "before:absolute before:top-2 before:bottom-2 before:left-0 before:w-[3px] before:rounded-r-[3px] before:bg-(--apl-s) before:transition-[background] before:duration-300 before:content-['']",
        open
          ? "shadow-[0_0_0_1.5px_var(--apl-coral),0_16px_28px_-18px_var(--apl-shadow)]"
          : "shadow-[0_0_0_1px_var(--apl-line),0_6px_14px_-12px_var(--apl-shadow)] hover:shadow-[0_0_0_1px_var(--apl-line-strong),0_10px_20px_-14px_var(--apl-shadow)]",
        TONE[live.status]
      )}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={detId}
        onClick={onToggle}
        className={cx(
          "grid w-full cursor-pointer appearance-none grid-cols-[auto_minmax(0,1fr)] gap-x-2.5 gap-y-1 rounded-[10px] border-0 bg-transparent py-2.5 pr-2.5 pl-[13px] text-left text-inherit",
          focusRing
        )}
      >
        <span className="grid min-w-11 content-start gap-0.5">
          <b className="text-sm leading-none font-[650] tabular-nums">{t.hm}</b>
          <small className="font-(family-name:--apl-mono) text-[9.5px] leading-none font-semibold tracking-[0.06em] text-(--apl-faint)">{t.ap}</small>
        </span>
        <span className="grid min-w-0 gap-[3px]">
          <span className="text-[13.5px] leading-[1.25] font-semibold [overflow-wrap:anywhere]">{a.name}</span>
          <span className="text-xs leading-[1.3] text-(--apl-muted) [overflow-wrap:anywhere]">{a.service}</span>
        </span>
        <span className="col-start-2 mt-[3px] flex flex-wrap items-center gap-1.5">
          <span
            title={a.staff}
            aria-label={a.staff}
            className="inline-grid size-[22px] place-items-center rounded-full bg-(--apl-well) text-[9.5px] leading-none font-[650] text-(--apl-muted) shadow-[inset_0_0_0_1px_var(--apl-line)]"
          >
            {initials(a.staff)}
          </span>
          {a.duration > 0 && <span className="text-[11px] leading-none font-medium text-(--apl-faint) tabular-nums">{fill(L.min, { n: a.duration })}</span>}
          {live.reminded && (
            <span
              className={cx(
                "inline-flex items-center gap-[3px] rounded-full bg-(--apl-coral-soft) py-[3px] pr-1.5 pl-1 text-[10.5px] leading-none font-semibold text-(--apl-coral-ink)",
                live.remindedNow && "animate-[apl-in_.4s_cubic-bezier(.2,.7,.2,1)] motion-reduce:animate-none"
              )}
            >
              <BellIcon className="size-[11px]" />
              <span className="sr-only">{L.reminded}</span>
            </span>
          )}
        </span>
      </button>

      <div id={detId} className={cx("grid transition-[grid-template-rows] duration-300 ease-out-soft motion-reduce:transition-none", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
        <div inert={!open} className="min-h-0 overflow-hidden">
          <div className="mx-2.5 mb-2.5 ml-[13px] grid gap-2.5 border-t border-dashed border-(--apl-line-strong) pt-2.5">
            <dl className="m-0 grid gap-[5px] text-xs">
              {facts.map(([k, v]) => (
                <div key={k} className="grid grid-cols-[64px_minmax(0,1fr)] gap-2">
                  <dt className="text-(--apl-faint)">{k}</dt>
                  <dd className="m-0 text-(--apl-ink) tabular-nums [overflow-wrap:anywhere]">{v}</dd>
                </div>
              ))}
            </dl>
            {a.note && <p className="m-0 rounded-lg bg-(--apl-well) px-[9px] py-[7px] text-xs leading-[1.4] text-(--apl-muted)">{a.note}</p>}
            <p className="m-0 -mb-1 font-(family-name:--apl-mono) text-[10px] leading-none font-semibold tracking-[0.09em] text-(--apl-faint) uppercase">{L.moveTo}</p>
            <div role="group" aria-label={L.moveTo} className="grid grid-cols-2 gap-1">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  data-status={s}
                  aria-pressed={s === live.status}
                  onClick={() => onMove(s)}
                  className={cx(
                    "inline-flex min-w-0 cursor-pointer appearance-none items-center gap-1.5 rounded-[7px] border border-(--apl-line) bg-(--apl-card) px-2 py-[7px] text-[11.5px] leading-[1.1] font-semibold text-(--apl-muted) transition-[background,border-color,color] duration-200 before:size-[7px] before:flex-none before:rounded-full before:bg-(--apl-s) before:content-[''] hover:border-(--apl-s) hover:text-(--apl-ink) motion-reduce:transition-none",
                    "aria-pressed:cursor-default aria-pressed:border-(--apl-s) aria-pressed:bg-[color-mix(in_oklab,var(--apl-s)_12%,var(--apl-card))] aria-pressed:text-(--apl-s-ink)",
                    TONE[s],
                    focusRing
                  )}
                >
                  {L[s]}
                </button>
              ))}
            </div>
            <button
              type="button"
              disabled={off}
              onClick={onRemind}
              className={cx(
                "inline-flex cursor-pointer appearance-none items-center justify-center gap-[7px] rounded-lg border-0 bg-(--apl-coral-ink) px-2.5 py-[9px] text-[12.5px] leading-none font-semibold text-(--apl-on-coral) transition-[filter,background,color] duration-200 enabled:hover:brightness-108 disabled:cursor-default disabled:bg-(--apl-well) disabled:text-(--apl-muted) disabled:shadow-[inset_0_0_0_1px_var(--apl-line)] motion-reduce:transition-none",
                focusRing
              )}
            >
              {live.reminded ? <BellIcon className="size-[13px]" /> : <SendIcon className="size-[13px]" />}
              {live.reminded ? (live.remindedNow ? L.remindedNow : L.reminded) : finished ? L.remindNa : L.remind}
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}

export default AppointmentPipeline;
