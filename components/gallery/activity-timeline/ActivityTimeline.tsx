"use client";

import { useEffect, useId, useImperativeHandle, useMemo, useRef, useState, type ReactNode, type Ref } from "react";
import { cx } from "@/lib/format";

export const ACTIVITY_TYPES = ["call", "email", "form", "deal", "note"] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];
export type ActivitySort = "newest" | "oldest";

export interface ActivityEvent {
  /** Unique key. Used in callbacks and to remember which items are open. */
  id: string;
  /** Sets the icon, colour and filter. Unknown types show as notes. */
  type: ActivityType;
  /** ISO date-time. Events are grouped by day and sorted by this. */
  time: string;
  /** Who did it. Shown with initials. */
  actor?: string;
  /** Headline. */
  title?: string;
  /** One-line description. */
  summary?: string;
  /** Label/value pairs shown when the event is opened. */
  details?: Array<[string, string]>;
  /** Longer text, shown as a quote when opened. */
  note?: string;
}

export interface ActivityTimelineLabels {
  newest: string;
  oldest: string;
  sort: string;
  activities: string;
  activity: string;
  acrossDays: string;
  acrossDay: string;
  last: string;
  filterBy: string;
  all: string;
  clear: string;
  today: string;
  yesterday: string;
  justNow: string;
  minAgo: string;
  hAgo: string;
  showMore: string;
  showing: string;
  none: string;
  noneTitle: string;
  open: string;
  close: string;
  announce: string;
  filterAnnounce: string;
  events: string;
  event: string;
}

export interface ActivityOpenDetail {
  id: string;
  type: ActivityType;
  title: string;
  time: string;
  actor: string;
}

/** Methods available through `ref`. */
export interface ActivityTimelineHandle {
  /** Open an event, clearing filters or paging forward if it is hidden. */
  expand: (id: string) => void;
  /** Close every open event. */
  collapseAll: () => void;
}

export interface ActivityTimelineProps {
  events: ActivityEvent[];
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  /** ISO date-time used for "Today", "Yesterday" and "min ago". Defaults to the current time (set after mount). */
  now?: string;
  /** Sort order. Pass it to control the sort switch. */
  sort?: ActivitySort;
  /** Starting sort order when `sort` is not controlled. */
  defaultSort?: ActivitySort;
  /** How many events show before "Show more". */
  pageSize?: number;
  /** Active type filters (empty = all). Pass it to control the filters. */
  filter?: ActivityType[];
  /** Starting filters when `filter` is not controlled. */
  defaultFilter?: ActivityType[];
  /** Rename a type, e.g. { form: "Form fill" }. */
  types?: Partial<Record<ActivityType, string>>;
  /** Override any built-in text. */
  labels?: Partial<ActivityTimelineLabels>;
  /** Date and time formatting locale. */
  locale?: string;
  onActivityOpen?: (detail: ActivityOpenDetail) => void;
  onFilterChange?: (types: ActivityType[]) => void;
  onSortChange?: (sort: ActivitySort) => void;
  ref?: Ref<ActivityTimelineHandle>;
  className?: string;
}

export const ACTIVITY_TIMELINE_LABELS: ActivityTimelineLabels = {
  newest: "Newest",
  oldest: "Oldest",
  sort: "Sort order",
  activities: "activities",
  activity: "activity",
  acrossDays: "across {n} days",
  acrossDay: "on 1 day",
  last: "Last activity {when}",
  filterBy: "Filter by type",
  all: "All activity",
  clear: "Clear filters",
  today: "Today",
  yesterday: "Yesterday",
  justNow: "just now",
  minAgo: "{n} min ago",
  hAgo: "{n} h ago",
  showMore: "Show {n} more",
  showing: "Showing {shown} of {total}",
  none: "No activity matches these filters.",
  noneTitle: "Nothing here yet",
  open: "Show details",
  close: "Hide details",
  announce: "{n} events shown",
  filterAnnounce: "Showing {list}",
  events: "{n} events",
  event: "1 event",
};

const TYPE_LABELS: Record<ActivityType, string> = { call: "Call", email: "Email", form: "Form", deal: "Deal", note: "Note" };
const TYPE_TONE: Record<ActivityType | "all", string> = {
  call: "[--atl-tc:var(--atl-c-call)]",
  email: "[--atl-tc:var(--atl-c-email)]",
  form: "[--atl-tc:var(--atl-c-form)]",
  deal: "[--atl-tc:var(--atl-c-deal)]",
  note: "[--atl-tc:var(--atl-c-note)]",
  all: "[--atl-tc:var(--atl-accent)]",
};

const svgProps = { viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;
const ICONS: Record<ActivityType | "all", ReactNode> = {
  call: <path d="M3.2 2.5h2.3l1.1 3-1.5 1a7.4 7.4 0 0 0 3.4 3.4l1-1.5 3 1.1v2.3a1.4 1.4 0 0 1-1.5 1.4A10.6 10.6 0 0 1 1.8 4a1.4 1.4 0 0 1 1.4-1.5z" />,
  email: (
    <>
      <rect x="2" y="3.5" width="12" height="9" rx="2" />
      <path d="m2.6 4.6 5.4 4.1 5.4-4.1" />
    </>
  ),
  form: (
    <>
      <rect x="3" y="2" width="10" height="12" rx="2" />
      <path d="M5.6 5.5h4.8M5.6 8h4.8M5.6 10.5h2.6" />
    </>
  ),
  deal: (
    <>
      <path d="M2 9.2 5 6.4l2.4 2.2L12 4" />
      <path d="M9.2 4H12v2.8" />
      <path d="M2.5 13h11" />
    </>
  ),
  note: (
    <>
      <path d="M3 13.2V2.8h7.2L13 5.6v7.6z" />
      <path d="M10 2.8v3h3M5.4 8.4h5.2M5.4 10.8h3.4" />
    </>
  ),
  all: <path d="M3 4h10M3 8h10M3 12h10" />,
};
const TypeIcon = ({ type, className }: { type: ActivityType | "all"; className: string }) => (
  <svg {...svgProps} className={className}>
    {ICONS[type]}
  </svg>
);
const small = { viewBox: "0 0 12 12", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;

const fill = (s: string, vars: Record<string, string | number>) => String(s).replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ""));
const initials = (s?: string) =>
  String(s || "?")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("") || "?";
const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

interface Ev extends ActivityEvent {
  d: Date;
}

/**
 * Calls, emails, form fills, deal changes and notes on a client account, grouped
 * by day on a vertical timeline, with type filters, expandable events, sorting and paging.
 */
export function ActivityTimeline({
  events,
  eyebrow,
  title,
  subtitle,
  now: nowProp,
  sort: sortProp,
  defaultSort = "newest",
  pageSize = 8,
  filter: filterProp,
  defaultFilter = [],
  types: typeNames,
  labels,
  locale = "en-US",
  onActivityOpen,
  onFilterChange,
  onSortChange,
  ref,
  className,
}: ActivityTimelineProps) {
  const L = useMemo(() => ({ ...ACTIVITY_TIMELINE_LABELS, ...labels }), [labels]);
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const typeLabel = (t: ActivityType) => typeNames?.[t] || TYPE_LABELS[t] || t;
  const page = Math.max(1, Math.floor(pageSize) || 8);

  const evs = useMemo<Ev[]>(
    () =>
      (Array.isArray(events) ? events : [])
        .filter((e) => e && e.time && !isNaN(new Date(e.time).getTime()))
        .map((e, i) => ({
          ...e,
          id: e.id != null ? String(e.id) : `ev-${i}`,
          type: (ACTIVITY_TYPES as readonly string[]).includes(e.type) ? e.type : "note",
          d: new Date(e.time),
        })),
    [events]
  );

  /* "now": from the prop, or the real time once mounted (falls back to the latest event so SSR matches) */
  const [clientNow, setClientNow] = useState<Date | null>(null);
  useEffect(() => {
    if (!nowProp) setClientNow(new Date());
  }, [nowProp]);
  const now = useMemo(() => {
    const p = nowProp ? new Date(nowProp) : null;
    if (p && !isNaN(p.getTime())) return p;
    if (clientNow) return clientNow;
    return evs.reduce<Date>((a, e) => (e.d > a ? e.d : a), new Date(0));
  }, [nowProp, clientNow, evs]);

  /* ---------- state ---------- */
  const [innerSort, setInnerSort] = useState<ActivitySort>(defaultSort);
  const sort: ActivitySort = (sortProp ?? innerSort) === "oldest" ? "oldest" : "newest";
  const [innerTypes, setInnerTypes] = useState<ActivityType[]>(defaultFilter);
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  const [shown, setShown] = useState(0);
  const [anim, setAnim] = useState<{ gen: number; from: number | null; on: boolean }>({ gen: 0, from: null, on: false });
  const [sr, setSr] = useState("");
  const allChip = useRef<HTMLButtonElement>(null);
  const toggles = useRef(new Map<string, HTMLButtonElement>());
  const [focusId, setFocusId] = useState<string | null>(null);

  /* reset when the data or page size changes */
  const [prev, setPrev] = useState({ evs, page, sort });
  if (prev.evs !== evs || prev.page !== page || prev.sort !== sort) {
    const dataChanged = prev.evs !== evs;
    setPrev({ evs, page, sort });
    if (dataChanged) setOpen(new Set());
    if (dataChanged || prev.page !== page) setShown(0);
    if (!dataChanged) setAnim((a) => ({ gen: a.gen + 1, from: null, on: true }));
  }

  const counts = useMemo(() => {
    const c = Object.fromEntries(ACTIVITY_TYPES.map((t) => [t, 0])) as Record<ActivityType, number>;
    evs.forEach((e) => c[e.type]++);
    return c;
  }, [evs]);
  const present = ACTIVITY_TYPES.filter((t) => counts[t] > 0);
  const active = new Set((filterProp ?? innerTypes).filter((t) => counts[t] > 0));

  const sorted = (set: Set<ActivityType>) =>
    evs.filter((e) => !set.size || set.has(e.type)).sort((a, b) => (sort === "oldest" ? a.d.getTime() - b.d.getTime() : b.d.getTime() - a.d.getTime()));
  const list = sorted(active);
  const limit = shown || page;
  const visible = list.slice(0, limit);
  const left = list.length - visible.length;
  const countText = list.length ? fill(L.showing, { shown: visible.length, total: list.length }) : "";

  /* ---------- time labels ---------- */
  const yesterdayOf = (d: Date) => {
    const y = new Date(d);
    y.setDate(y.getDate() - 1);
    return y;
  };
  const relative = (d: Date, long: boolean) => {
    const mins = Math.round((now.getTime() - d.getTime()) / 60000);
    if (mins >= 0 && mins < 1) return L.justNow;
    if (mins >= 0 && mins < 60) return fill(L.minAgo, { n: mins });
    if (mins >= 0 && mins < 12 * 60 && dayKey(now) === dayKey(d)) return fill(L.hAgo, { n: Math.floor(mins / 60) });
    const time = d.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });
    if (!long) return time;
    if (dayKey(yesterdayOf(now)) === dayKey(d)) return `${L.yesterday.toLowerCase()}, ${time}`;
    return `${d.toLocaleDateString(locale, { month: "short", day: "numeric" })}, ${time}`;
  };
  const dayLabel = (d: Date): [string, string] => {
    const date = d.toLocaleDateString(locale, { weekday: "short", month: "short", day: "numeric" });
    if (dayKey(d) === dayKey(now)) return [L.today, date];
    if (dayKey(d) === dayKey(yesterdayOf(now))) return [L.yesterday, date];
    return [d.toLocaleDateString(locale, { weekday: "long" }), d.toLocaleDateString(locale, { month: "short", day: "numeric" })];
  };
  const fullTime = (d: Date) => d.toLocaleString(locale, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

  /* ---------- summary ---------- */
  const days = new Set(evs.map((e) => dayKey(e.d))).size;
  const latest = evs.reduce<Ev | null>((a, e) => (!a || e.d > a.d ? e : a), null);

  /* ---------- actions ---------- */
  const setTypes = (next: ActivityType[]) => {
    const clean = next.filter((t) => (ACTIVITY_TYPES as readonly string[]).includes(t));
    setInnerTypes(clean);
    setShown(0);
    setAnim((a) => ({ gen: a.gen + 1, from: null, on: true }));
    const set = new Set(clean);
    const n = sorted(set);
    const names = clean.length ? clean.map(typeLabel).join(", ") : L.all.toLowerCase();
    setSr(`${fill(L.filterAnnounce, { list: names })}. ${n.length ? fill(L.showing, { shown: Math.min(page, n.length), total: n.length }) : ""}`);
    onFilterChange?.(clean);
  };

  const pickSort = (s: ActivitySort) => {
    if (s === sort) return;
    setInnerSort(s);
    onSortChange?.(s);
  };

  const toggle = (id: string, force?: boolean) => {
    const key = String(id);
    const on = force != null ? force : !open.has(key);
    const ev = evs.find((e) => e.id === key);
    if (on && !ev) return;
    setOpen((o) => {
      const n = new Set(o);
      if (on) n.add(key);
      else n.delete(key);
      return n;
    });
    if (!on || !ev) return;
    if (!visible.some((e) => e.id === key)) {
      // make sure the event is visible: add its type to the filters and page forward
      const set = new Set(active);
      if (set.size && !set.has(ev.type)) {
        set.add(ev.type);
        setInnerTypes([...set]);
        onFilterChange?.([...set]);
      }
      const idx = sorted(set).findIndex((e) => e.id === key);
      setShown(Math.max(limit, Math.ceil((idx + 1) / page) * page));
      setAnim((a) => ({ gen: a.gen, from: Infinity, on: true }));
    }
    onActivityOpen?.({ id: ev.id, type: ev.type, title: ev.title || "", time: ev.time, actor: ev.actor || "" });
  };

  const showMore = () => {
    const before = limit;
    const next = before + page;
    setShown(next);
    setAnim((a) => ({ gen: a.gen, from: before, on: true }));
    const first = list[before];
    if (first) setFocusId(first.id);
    setSr(fill(L.announce, { n: Math.min(next, list.length) }));
  };

  useEffect(() => {
    if (!focusId) return;
    toggles.current.get(focusId)?.focus();
    setFocusId(null);
  }, [focusId]);

  const latestToggle = useRef(toggle);
  latestToggle.current = toggle;
  useImperativeHandle(
    ref,
    () => ({
      expand: (id: string) => latestToggle.current(id, true),
      collapseAll: () => setOpen(new Set()),
    }),
    []
  );

  /* ---------- groups ---------- */
  const groups: Array<{ key: string; d: Date; items: Ev[] }> = [];
  visible.forEach((e) => {
    const k = dayKey(e.d);
    const g = groups[groups.length - 1];
    if (g && g.key === k) g.items.push(e);
    else groups.push({ key: k, d: e.d, items: [e] });
  });
  const perDay = list.reduce<Record<string, number>>((m, e) => {
    const k = dayKey(e.d);
    m[k] = (m[k] || 0) + 1;
    return m;
  }, {});
  let runIdx = 0;

  const chips: Array<{ type: ActivityType | "all"; label: string; n: number; on: boolean }> = [
    { type: "all", label: L.all, n: evs.length, on: active.size === 0 },
    ...present.map((t) => ({ type: t, label: typeLabel(t), n: counts[t], on: active.has(t) })),
  ];

  return (
    <div className={cx("@container block w-full max-w-[940px] font-(family-name:--atl-sans) text-(--atl-ink)", className)}>
      <article className="relative rounded-[22px] border border-(--atl-line) bg-(--atl-card) px-7 pt-[26px] pb-[22px] shadow-[0_34px_64px_-50px_var(--atl-shadow),0_1px_3px_-2px_var(--atl-shadow)] @max-[720px]:rounded-[20px] @max-[720px]:px-5 @max-[720px]:pt-[22px] @max-[720px]:pb-[18px] @max-[480px]:rounded-[18px] @max-[480px]:px-3.5 @max-[480px]:pt-[18px] @max-[480px]:pb-3.5">
        {/* header */}
        <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3.5 border-b border-(--atl-line) pb-5 @max-[480px]:pb-4">
          {(eyebrow || title || subtitle) && (
            <div className="grid min-w-0 gap-1.5">
              {eyebrow && (
                <span className="font-(family-name:--atl-mono) text-[10.5px] leading-none font-semibold tracking-[0.12em] text-(--atl-accent) uppercase">{eyebrow}</span>
              )}
              {title && (
                <h2 className="m-0 font-(family-name:--atl-display) text-[clamp(20px,3.2cqi,26px)] leading-[1.15] font-semibold tracking-[-0.02em]">{title}</h2>
              )}
              {subtitle && <p className="m-0 text-[13.5px] text-(--atl-muted)">{subtitle}</p>}
            </div>
          )}
          <div role="group" aria-label={L.sort} className="inline-flex rounded-full border border-(--atl-line) bg-(--atl-tint) p-[3px] @max-[480px]:w-full">
            {(["newest", "oldest"] as const).map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={sort === s}
                onClick={() => pickSort(s)}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border-0 bg-transparent px-3 py-[7px] text-[12.5px] leading-none font-semibold text-(--atl-muted) transition-[background-color,color,box-shadow] duration-[250ms] hover:text-(--atl-ink) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--atl-accent) aria-pressed:bg-(--atl-raise) aria-pressed:text-(--atl-ink) aria-pressed:shadow-[0_1px_3px_-1px_var(--atl-shadow),0_0_0_1px_var(--atl-line)] motion-reduce:transition-none @max-[480px]:flex-1 @max-[480px]:justify-center"
              >
                <svg {...small} className="size-3">
                  {s === "newest" ? <path d="M6 2v8M3 7l3 3 3-3" /> : <path d="M6 10V2M3 5l3-3 3 3" />}
                </svg>
                {s === "newest" ? L.newest : L.oldest}
              </button>
            ))}
          </div>
        </header>

        <div className="grid grid-cols-[220px_minmax(0,1fr)] gap-7 pt-[22px] @max-[720px]:grid-cols-[minmax(0,1fr)] @max-[720px]:gap-[18px]">
          {/* side panel */}
          <aside className="sticky top-20 grid content-start gap-5 self-start @max-[720px]:static @max-[720px]:grid-cols-[auto_minmax(0,1fr)] @max-[720px]:items-end @max-[720px]:gap-x-5 @max-[720px]:gap-y-3.5 @max-[480px]:grid-cols-[minmax(0,1fr)]">
            <div className="grid gap-1">
              <span className="font-(family-name:--atl-display) text-[38px] leading-none font-semibold tracking-[-0.03em] tabular-nums @max-[720px]:text-[30px]">
                {evs.length.toLocaleString(locale)}
              </span>
              <span className="text-[13px] text-(--atl-muted)">
                {evs.length === 1 ? L.activity : L.activities} {days === 1 ? L.acrossDay : fill(L.acrossDays, { n: days })}
              </span>
              {latest && <span className="text-xs text-(--atl-faint)">{fill(L.last, { when: relative(latest.d, true) })}</span>}
            </div>
            <div aria-hidden="true" className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-(--atl-tint) @max-[720px]:col-start-2 @max-[720px]:self-center @max-[480px]:col-start-auto">
              {present.map((t) => (
                <span
                  key={t}
                  style={{ flexGrow: counts[t] }}
                  className={cx(
                    "min-w-1 bg-(--atl-tc) transition-[flex-grow,opacity] duration-[350ms] motion-reduce:transition-none",
                    TYPE_TONE[t],
                    active.size > 0 && !active.has(t) && "opacity-25"
                  )}
                />
              ))}
            </div>
            <div role="group" aria-label={L.filterBy} className="@max-[720px]:col-span-full">
              <p className="m-0 mb-2 font-(family-name:--atl-mono) text-[10.5px] leading-none font-medium tracking-[0.1em] text-(--atl-faint) uppercase @max-[720px]:hidden">
                {L.filterBy}
              </p>
              <ul className="m-0 grid list-none gap-1 p-0 @max-[720px]:flex @max-[720px]:flex-wrap @max-[720px]:gap-1.5">
                {chips.map((ch) => (
                  <li key={ch.type}>
                    <button
                      ref={ch.type === "all" ? allChip : undefined}
                      type="button"
                      aria-pressed={ch.on}
                      aria-label={`${ch.label}, ${ch.n === 1 ? L.event : fill(L.events, { n: ch.n })}`}
                      onClick={() => {
                        if (ch.type === "all") return setTypes([]);
                        const next = new Set(active);
                        if (next.has(ch.type)) next.delete(ch.type);
                        else next.add(ch.type);
                        setTypes([...next]);
                      }}
                      className={cx(
                        "group/chip grid w-full cursor-pointer grid-cols-[26px_minmax(0,1fr)_auto] items-center gap-2.5 rounded-[11px] border border-transparent bg-transparent py-1.5 pr-2.5 pl-1.5 text-left text-[13.5px] leading-[1.2] font-medium text-(--atl-ink) transition-[background-color,border-color,color] duration-200 hover:bg-(--atl-tint) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--atl-accent) aria-pressed:border-[color-mix(in_oklab,var(--atl-tc)_45%,var(--atl-line))] aria-pressed:bg-(--atl-raise) aria-pressed:shadow-[0_6px_16px_-12px_var(--atl-shadow)] motion-reduce:transition-none @max-[720px]:w-auto @max-[720px]:grid-cols-[22px_auto_auto] @max-[720px]:gap-[7px] @max-[720px]:rounded-full @max-[720px]:border-(--atl-line) @max-[720px]:py-1 @max-[720px]:pr-2 @max-[720px]:pl-1 @max-[720px]:text-[13px]",
                        TYPE_TONE[ch.type]
                      )}
                    >
                      <span className="grid size-[26px] place-items-center rounded-lg bg-[color-mix(in_oklab,var(--atl-tc)_14%,transparent)] text-[color-mix(in_oklab,var(--atl-tc)_82%,var(--atl-ink))] transition-colors duration-200 group-aria-pressed/chip:bg-(--atl-tc) group-aria-pressed/chip:text-(--atl-node-ink) motion-reduce:transition-none @max-[720px]:size-[22px] @max-[720px]:rounded-full">
                        <TypeIcon type={ch.type} className="size-3.5 @max-[720px]:size-3" />
                      </span>
                      <span>{ch.label}</span>
                      <span className="rounded-full bg-(--atl-tint) px-[7px] py-1 font-(family-name:--atl-mono) text-[11.5px] leading-none font-semibold text-(--atl-faint) tabular-nums transition-colors duration-200 group-aria-pressed/chip:bg-[color-mix(in_oklab,var(--atl-tc)_16%,transparent)] group-aria-pressed/chip:text-[color-mix(in_oklab,var(--atl-tc)_78%,var(--atl-ink))] motion-reduce:transition-none">
                        {ch.n}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              {active.size > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setTypes([]);
                    allChip.current?.focus();
                  }}
                  className="mt-1 cursor-pointer border-0 bg-transparent px-0 py-1 text-xs leading-none font-semibold text-(--atl-accent) underline underline-offset-[3px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--atl-accent)"
                >
                  {L.clear}
                </button>
              )}
            </div>
          </aside>

          {/* feed */}
          <div className="min-w-0">
            <div key={anim.gen}>
              {!list.length ? (
                <div className="grid justify-items-center gap-1.5 px-3 py-9 text-center text-[13.5px] text-(--atl-muted)">
                  <b className="text-[15px] text-(--atl-ink)">{L.noneTitle}</b>
                  <span>{L.none}</span>
                </div>
              ) : (
                groups.map((g, gi) => {
                  const hid = `${uid}-d-${g.key}`;
                  const [main, sub] = dayLabel(g.d);
                  const n = perDay[g.key];
                  return (
                    <section key={g.key} aria-labelledby={hid} className={cx(gi > 0 && "mt-2.5")}>
                      <h3
                        id={hid}
                        className="m-0 mb-1.5 flex items-baseline justify-between gap-2.5 py-1.5 pl-[50px] font-(family-name:--atl-mono) text-xs leading-[1.2] font-semibold tracking-[0.06em] text-(--atl-muted) uppercase @max-[480px]:pl-9"
                      >
                        <span>
                          {main} <small className="text-[11px] leading-none font-medium tracking-[0.04em] text-(--atl-faint) normal-case">· {sub}</small>
                        </span>
                        <small className="text-[11px] leading-none font-medium tracking-[0.04em] text-(--atl-faint) normal-case">
                          {n === 1 ? L.event : fill(L.events, { n })}
                        </small>
                      </h3>
                      <ol className="relative m-0 list-none p-0 before:absolute before:top-1.5 before:bottom-1.5 before:left-[17px] before:w-0.5 before:rounded-[2px] before:bg-[linear-gradient(to_bottom,var(--atl-rail),color-mix(in_oklab,var(--atl-rail)_40%,transparent))] @max-[480px]:before:left-[13px]">
                        {g.items.map((e) => {
                          const idx = visible.indexOf(e);
                          const isNew = anim.on && (anim.from == null || idx >= anim.from);
                          const delay = anim.from == null ? runIdx++ : idx - anim.from;
                          const on = open.has(e.id);
                          const full = fullTime(e.d);
                          const did = `${uid}-x-${e.id}`;
                          return (
                            <li
                              key={e.id}
                              style={isNew ? { animationDelay: `${delay * 45}ms` } : undefined}
                              className={cx(
                                "group/item relative grid grid-cols-[36px_minmax(0,1fr)] gap-3.5 py-1.5 @max-[480px]:grid-cols-[28px_minmax(0,1fr)] @max-[480px]:gap-2",
                                TYPE_TONE[e.type],
                                isNew && "animate-[atl-in_.42s_cubic-bezier(.2,.7,.2,1)_both] motion-reduce:animate-none"
                              )}
                            >
                              <span
                                aria-hidden="true"
                                className={cx(
                                  "relative z-[1] grid size-9 place-items-center rounded-xl bg-(--atl-tc) text-(--atl-node-ink) shadow-[0_0_0_4px_var(--atl-card),0_8px_16px_-10px_var(--atl-tc)] transition-transform duration-[250ms] ease-out-soft group-hover/item:scale-[1.06] group-hover/item:-rotate-4 motion-reduce:transition-none motion-reduce:group-hover/item:scale-100 motion-reduce:group-hover/item:rotate-0 @max-[480px]:size-7 @max-[480px]:rounded-[9px] @max-[480px]:shadow-[0_0_0_3px_var(--atl-card)]",
                                  on && "scale-[1.06] -rotate-4 motion-reduce:scale-100 motion-reduce:rotate-0"
                                )}
                              >
                                <TypeIcon type={e.type} className="size-[17px] @max-[480px]:size-3.5" />
                              </span>
                              <div
                                className={cx(
                                  "min-w-0 rounded-[14px] border transition-[background-color,border-color,box-shadow] duration-300 motion-reduce:transition-none",
                                  on
                                    ? "border-(--atl-line) bg-(--atl-raise) shadow-[0_16px_34px_-26px_var(--atl-shadow)]"
                                    : "border-transparent group-hover/item:bg-(--atl-tint)"
                                )}
                              >
                                <button
                                  ref={(el) => {
                                    if (el) toggles.current.set(e.id, el);
                                    else toggles.current.delete(e.id);
                                  }}
                                  type="button"
                                  aria-expanded={on}
                                  aria-controls={did}
                                  aria-label={`${e.title || ""}. ${e.summary || ""} ${full}. ${on ? L.close : L.open}`}
                                  onClick={() => toggle(e.id)}
                                  className="group/tg grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3.5 gap-y-1 rounded-[14px] border-0 bg-transparent px-3 pt-2 pb-2.5 text-left text-inherit focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-(--atl-accent) @max-[480px]:grid-cols-[minmax(0,1fr)] @max-[480px]:gap-0.5 @max-[480px]:px-2 @max-[480px]:pt-1 @max-[480px]:pb-2"
                                >
                                  <span className="grid min-w-0 gap-[5px]">
                                    <span className="text-[14.5px] leading-[1.35] font-semibold [overflow-wrap:anywhere] @max-[480px]:text-sm">{e.title || typeLabel(e.type)}</span>
                                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[12.5px] text-(--atl-muted)">
                                      <span className="font-(family-name:--atl-mono) text-[10.5px] leading-none font-semibold tracking-[0.06em] text-[color-mix(in_oklab,var(--atl-tc)_78%,var(--atl-ink))] uppercase">
                                        {typeLabel(e.type)}
                                      </span>
                                      <span className="size-[3px] rounded-full bg-(--atl-faint) opacity-60" />
                                      <span
                                        aria-hidden="true"
                                        className="inline-grid size-5 flex-none place-items-center rounded-full bg-(--atl-accent-soft) text-[9px] leading-none font-[650] tracking-[0.02em] text-(--atl-accent) shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--atl-accent)_25%,transparent)]"
                                      >
                                        {initials(e.actor)}
                                      </span>
                                      <span>{e.actor || ""}</span>
                                    </span>
                                    {e.summary && <span className="mt-0.5 text-[13.5px] leading-normal text-(--atl-muted) [overflow-wrap:anywhere]">{e.summary}</span>}
                                  </span>
                                  <span className="grid justify-items-end gap-2 pt-px @max-[480px]:row-start-1 @max-[480px]:flex @max-[480px]:items-center @max-[480px]:justify-between @max-[480px]:gap-1.5 @max-[480px]:pt-0">
                                    <time dateTime={e.time} title={full} className="text-xs leading-[1.2] font-medium whitespace-nowrap text-(--atl-faint) tabular-nums">
                                      {relative(e.d, false)}
                                    </time>
                                    <span
                                      className={cx(
                                        "grid size-6 place-items-center rounded-lg bg-transparent transition-[rotate,background-color,color] duration-300 ease-out-soft group-hover/tg:bg-(--atl-card) group-hover/tg:text-(--atl-ink) motion-reduce:transition-none @max-[480px]:size-[22px]",
                                        on ? "rotate-180 text-(--atl-accent)" : "text-(--atl-faint)"
                                      )}
                                    >
                                      <svg {...small} strokeWidth={1.7} className="size-[13px]">
                                        <path d="m3 4.6 3 3 3-3" />
                                      </svg>
                                    </span>
                                  </span>
                                </button>
                                <div
                                  id={did}
                                  aria-hidden={!on}
                                  className={cx(
                                    "grid transition-[grid-template-rows] duration-[320ms] ease-out-soft motion-reduce:transition-none",
                                    on ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                                  )}
                                >
                                  <div
                                    className={cx(
                                      "overflow-hidden transition-[visibility] motion-reduce:transition-none",
                                      on ? "visible delay-0" : "invisible delay-[320ms]"
                                    )}
                                  >
                                    <div className="mx-3 mb-3 grid gap-3 border-t border-dashed border-(--atl-line) pt-3 @max-[480px]:mx-2 @max-[480px]:mb-2.5">
                                      {!!e.details?.length && (
                                        <dl className="m-0 grid grid-cols-3 gap-x-4 gap-y-2.5 @max-[720px]:grid-cols-2 @max-[480px]:grid-cols-1 @max-[480px]:gap-2">
                                          {e.details
                                            .filter((p) => Array.isArray(p) && p.length >= 2)
                                            .map(([k, v], i) => (
                                              <div key={i} className="grid min-w-0 gap-1">
                                                <dt className="font-(family-name:--atl-mono) text-[10px] leading-[1.2] font-medium tracking-[0.09em] text-(--atl-faint) uppercase">{k}</dt>
                                                <dd className="m-0 text-[13px] leading-[1.35] font-semibold [overflow-wrap:anywhere]">{v}</dd>
                                              </div>
                                            ))}
                                        </dl>
                                      )}
                                      {e.note && (
                                        <p className="m-0 rounded-[10px] border-l-[3px] border-(--atl-tc) bg-(--atl-tint) px-3 py-2.5 text-[13px] leading-normal text-(--atl-ink)">{e.note}</p>
                                      )}
                                      <span className="font-(family-name:--atl-mono) text-[11px] leading-none font-medium text-(--atl-faint)">
                                        {full}
                                        {e.actor ? ` · ${e.actor}` : ""}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ol>
                    </section>
                  );
                })
              )}
            </div>
            <footer className="mt-3.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5 border-t border-(--atl-line) pt-3.5 pl-[50px] @max-[480px]:pl-0">
              <span className="text-[12.5px] text-(--atl-faint) tabular-nums">{countText}</span>
              {left > 0 && (
                <button
                  type="button"
                  onClick={showMore}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-(--atl-line) bg-(--atl-raise) px-3.5 py-[9px] text-[13px] leading-none font-semibold text-(--atl-ink) transition-[border-color,background-color,scale] duration-200 hover:border-(--atl-accent) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--atl-accent) active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100 @max-[480px]:w-full @max-[480px]:justify-center"
                >
                  <svg {...small} strokeWidth={1.7} className="size-[13px] text-(--atl-accent)">
                    <path d="M6 2.5v7M2.5 6h7" />
                  </svg>
                  {fill(L.showMore, { n: Math.min(page, left) })}
                </button>
              )}
            </footer>
          </div>
        </div>
        <p className="sr-only" aria-live="polite">
          {sr}
        </p>
      </article>
    </div>
  );
}

export default ActivityTimeline;
