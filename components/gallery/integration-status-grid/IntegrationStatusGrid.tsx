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
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from "react";
import { cx } from "@/lib/format";

export type IntegrationStatus = "connected" | "warning" | "disconnected";
export type IntegrationFilter = "all" | IntegrationStatus;
export type IntegrationIcon = "crm" | "card" | "calendar" | "mail" | "sms" | "chat" | "sheet" | "hub" | "plug";
export type IntegrationAction = "sync" | "reconnect";

export interface IntegrationHistoryEntry {
  /** Minutes before the grid was shown. */
  minutesAgo: number;
  result: "ok" | "fail";
  /** Events the sync brought in. */
  events?: number;
  note?: string;
}

export interface Integration {
  /** Unique key. */
  id: string;
  name: string;
  /** Built-in glyph. Unknown values fall back to "plug". */
  icon?: IntegrationIcon;
  description?: string;
  status: IntegrationStatus;
  /** What is wrong (warning / disconnected). */
  issue?: string;
  /** Whether Sync now or Reconnect clears the issue. Disconnected always needs reconnect. */
  fix?: IntegrationAction;
  /** Minutes since the last good sync. Shown as relative time and kept up to date. */
  lastSyncMinutes?: number;
  /** Events handled since midnight. */
  eventsToday?: number;
  /** Events per hour for the last 12 hours, oldest first. */
  activity?: number[];
  /** Shown in the details drawer. */
  account?: string;
  connectedSince?: string;
  interval?: string;
  scopes?: string[];
  history?: IntegrationHistoryEntry[];
}

export interface IntegrationLabels {
  connected: string;
  warning: string;
  disconnected: string;
  all: string;
  filterGroup: string;
  healthy: string;
  needs: string;
  allGood: string;
  eventsTotal: string;
  lastSync: string;
  events: string;
  never: string;
  syncNow: string;
  syncing: string;
  reconnect: string;
  reconnecting: string;
  details: string;
  syncAll: string;
  syncingAll: string;
  disconnect: string;
  close: string;
  justNow: string;
  minAgo: string;
  hAgo: string;
  dAgo: string;
  dAgo1: string;
  connection: string;
  account: string;
  since: string;
  interval: string;
  scopes: string;
  recent: string;
  syncOk: string;
  syncFail: string;
  reconnected: string;
  disconnectedNote: string;
  added: string;
  noEvents: string;
  empty: string;
  showAll: string;
  bars: string;
  announceSync: string;
  announceReconnect: string;
  announceFilter: string;
  detailsOf: string;
}

export interface IntegrationSyncDetail {
  id: string;
  name: string;
  action: IntegrationAction;
  status: IntegrationStatus;
  eventsAdded: number;
  eventsToday: number;
}

export interface IntegrationStatusGridHandle {
  sync: (id: string) => void;
  reconnect: (id: string) => void;
  syncAll: () => void;
  setStatus: (id: string, status: IntegrationStatus, issue?: string) => void;
}

export interface IntegrationStatusGridProps {
  integrations: Integration[];
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  footnote?: string;
  /** Controlled status filter. */
  filter?: IntegrationFilter;
  /** Initial filter when uncontrolled. */
  defaultFilter?: IntegrationFilter;
  onFilterChange?: (detail: { filter: IntegrationFilter; shown: number }) => void;
  /** Fired when a (simulated) sync or reconnect finishes. */
  onSync?: (detail: IntegrationSyncDetail) => void;
  /** Fired when the details drawer opens. */
  onOpen?: (detail: { id: string; name: string; status: IntegrationStatus }) => void;
  /** Number formatting locale. */
  locale?: string;
  labels?: Partial<IntegrationLabels>;
  /** Imperative handle: sync, reconnect, syncAll, setStatus. */
  ref?: Ref<IntegrationStatusGridHandle>;
  className?: string;
}

export const INTEGRATION_LABELS: IntegrationLabels = {
  connected: "Connected",
  warning: "Warning",
  disconnected: "Disconnected",
  all: "All",
  filterGroup: "Filter by status",
  healthy: "{ok} of {n} healthy",
  needs: "{n} need attention",
  allGood: "All integrations are working",
  eventsTotal: "{n} events today",
  lastSync: "Last sync",
  events: "Events today",
  never: "Never",
  syncNow: "Sync now",
  syncing: "Syncing…",
  reconnect: "Reconnect",
  reconnecting: "Reconnecting…",
  details: "Details",
  syncAll: "Sync all",
  syncingAll: "Syncing…",
  disconnect: "Disconnect",
  close: "Close details",
  justNow: "just now",
  minAgo: "{n} min ago",
  hAgo: "{n} h ago",
  dAgo: "{n} days ago",
  dAgo1: "1 day ago",
  connection: "Connection",
  account: "Account",
  since: "Connected since",
  interval: "Sync schedule",
  scopes: "Permissions",
  recent: "Recent syncs",
  syncOk: "Synced",
  syncFail: "Sync failed",
  reconnected: "Reconnected",
  disconnectedNote: "Disconnected",
  added: "{n} new events",
  noEvents: "No new events",
  empty: "No integrations with this status.",
  showAll: "Show all",
  bars: "Events per hour, last 12 hours: {v}",
  announceSync: "{name} synced. {n} new events.",
  announceReconnect: "{name} reconnected.",
  announceFilter: "{n} integrations shown",
  detailsOf: "Details for {name}",
};

const STATUSES: IntegrationStatus[] = ["connected", "warning", "disconnected"];
const FILTERS: IntegrationFilter[] = ["all", ...STATUSES];
const MIN = 60000;
const fill = (s: string, vars: Record<string, string | number>) => String(s).replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ""));
const hash = (s: string) => {
  let h = 2166136261;
  for (const c of String(s)) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
};
const reduceMotion = () => typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const toneVar = (s: IntegrationStatus | "ok" | "fail") =>
  s === "connected" || s === "ok" ? "var(--isg-ok)" : s === "warning" ? "var(--isg-warn)" : "var(--isg-bad)";
const cVar = (s: IntegrationStatus | "ok" | "fail") => ({ "--c": toneVar(s) }) as CSSProperties;

/* ---------- glyphs ---------- */
const GLYPHS: Record<IntegrationIcon, ReactNode> = {
  crm: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <circle cx="9" cy="11" r="2.2" />
      <path d="M5.8 16c.6-1.6 1.8-2.4 3.2-2.4s2.6.8 3.2 2.4M14.5 10h3.5M14.5 13h2.5" />
    </>
  ),
  card: (
    <>
      <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
      <path d="M3 9.5h18M6.5 15h4" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" />
      <path d="M14.6 13.2a2.9 2.9 0 1 0 .3 2.6M14.9 11.6v1.8h-1.8" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
      <path d="m3.5 7 8.5 6.2L20.5 7" />
    </>
  ),
  sms: (
    <>
      <rect x="6" y="2.5" width="12" height="19" rx="2.6" />
      <path d="M10.5 18.5h3" />
      <path d="M9 7.5h6a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-3.5L9.5 14v-1.5H9a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1z" />
    </>
  ),
  chat: (
    <>
      <path d="M3.5 6.5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H9l-3.5 3v-3a2 2 0 0 1-2-2z" />
      <path d="M19 9.5a1.6 1.6 0 0 1 1.5 1.6v4.4a1.6 1.6 0 0 1-1.6 1.6H18v2.4l-3-2.4h-3.5" />
    </>
  ),
  sheet: (
    <>
      <rect x="3.5" y="4" width="17" height="16" rx="2.5" />
      <path d="M3.5 9h17M3.5 14h17M9.5 9v11" />
    </>
  ),
  hub: (
    <>
      <circle cx="12" cy="12" r="3" />
      <circle cx="5" cy="5.5" r="1.8" />
      <circle cx="19" cy="5.5" r="1.8" />
      <circle cx="5" cy="18.5" r="1.8" />
      <circle cx="19" cy="18.5" r="1.8" />
      <path d="m6.4 6.8 3.4 3.1M17.6 6.8l-3.4 3.1M6.4 17.2l3.4-3.1M17.6 17.2l-3.4-3.1" />
    </>
  ),
  plug: <path d="M9 3v4M15 3v4M7 7h10v4a5 5 0 0 1-10 0zM12 16v5" />,
};

function Glyph({ icon, className }: { icon?: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className ?? "size-[21px]"}>
      {GLYPHS[(icon as IntegrationIcon) in GLYPHS ? (icon as IntegrationIcon) : "plug"]}
    </svg>
  );
}

const SmallIcon = ({ kind, spin }: { kind: "sync" | "plug" | "spin" | "info" | "x" | "check"; spin?: boolean }) => {
  const p = { viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  const cls = cx("size-3.5 flex-none", spin && "animate-[isg-spin_.8s_linear_infinite] motion-reduce:animate-none");
  if (kind === "spin")
    return (
      <svg {...p} strokeWidth={1.8} className={cls}>
        <path d="M8 2a6 6 0 1 1-6 6" />
      </svg>
    );
  if (kind === "plug")
    return (
      <svg {...p} className={cls}>
        <path d="M6 2v3M10 2v3M4.5 5h7v2.5a3.5 3.5 0 0 1-7 0zM8 11v3" />
      </svg>
    );
  if (kind === "info")
    return (
      <svg {...p} className={cls}>
        <circle cx="8" cy="8" r="6" />
        <path d="M8 7.3v3.7M8 5h.01" />
      </svg>
    );
  if (kind === "x")
    return (
      <svg {...p} strokeWidth={1.7} className={cls}>
        <path d="m4 4 8 8M12 4l-8 8" />
      </svg>
    );
  if (kind === "check")
    return (
      <svg {...p} strokeWidth={1.8} className="mt-0.5 size-3.5 text-(--isg-ok)">
        <path d="m3.5 8.4 2.8 2.8 6.2-6.6" />
      </svg>
    );
  return (
    <svg {...p} className={cls}>
      <path d="M13.2 6.2A5.3 5.3 0 0 0 3.4 5M2.8 9.8A5.3 5.3 0 0 0 12.6 11" />
      <path d="M13.5 2.8v3.5H10M2.5 13.2V9.7H6" />
    </svg>
  );
};

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--isg-focus)";
const btnBase = cx(
  "inline-flex min-h-[34px] cursor-pointer items-center justify-center gap-[7px] rounded-[9px] border px-[13px] font-(family-name:--isg-sans) text-[12.5px] leading-none font-semibold whitespace-nowrap [transition:background_.2s,border-color_.2s,color_.2s,transform_.15s,opacity_.2s] enabled:active:scale-[.98] disabled:cursor-default disabled:opacity-60 motion-reduce:transition-none",
  focusRing
);
const BTN = {
  plain: "border-(--isg-line) bg-(--isg-tile) text-(--isg-ink) enabled:hover:border-(--isg-faint)",
  main: "border-(--isg-btn) bg-(--isg-btn) text-(--isg-btn-ink) enabled:hover:opacity-90",
  fix: "border-(--isg-bad) bg-(--isg-bad) text-(--isg-fix-ink) enabled:hover:opacity-90",
  ghost: "border-transparent bg-transparent text-(--isg-muted) enabled:hover:bg-(--isg-tint) enabled:hover:text-(--isg-ink)",
};

/* ---------- model ---------- */
interface HistItem {
  at: number;
  result: "ok" | "fail";
  events: number | null;
  note: string;
}
interface Model {
  id: string;
  name: string;
  icon: string;
  description: string;
  status: IntegrationStatus;
  issue: string;
  fix: IntegrationAction;
  /** ms relative to when the grid mounted (negative = before). */
  lastSync: number | null;
  events: number;
  activity: number[];
  account: string;
  since: string;
  interval: string;
  scopes: string[];
  history: HistItem[];
}

const fin = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

function load(list: Integration[]): Model[] {
  return list.filter(Boolean).map((x, i) => {
    const status = STATUSES.includes(x.status) ? x.status : "connected";
    const lastMin = fin(x.lastSyncMinutes);
    const activity = (x.activity ?? []).map((v) => Math.max(0, fin(v) ?? 0)).slice(-12);
    const id = String(x.id || `integration-${i + 1}`);
    let history: HistItem[] | null = Array.isArray(x.history)
      ? x.history.map((h) => ({ at: -(fin(h?.minutesAgo) ?? 0) * MIN, result: h?.result === "fail" ? "fail" : "ok", events: fin(h?.events), note: h?.note ? String(h.note) : "" }))
      : null;
    if (!history && lastMin != null) {
      const per = Math.max(5, (hash(id) % 15) + 5);
      history = [0, 1, 2].map((k) => ({
        at: -(lastMin + k * per) * MIN,
        result: "ok" as const,
        events: activity.length ? Math.max(1, Math.round(activity[activity.length - 1 - k] / 3 || 1)) : null,
        note: "",
      }));
    }
    return {
      id,
      name: String(x.name || `Integration ${i + 1}`),
      icon: x.icon || "plug",
      description: String(x.description || ""),
      status,
      issue: status === "connected" ? "" : String(x.issue || ""),
      fix: x.fix === "reconnect" || status === "disconnected" ? "reconnect" : "sync",
      lastSync: lastMin == null ? null : -lastMin * MIN,
      events: Math.max(0, fin(x.eventsToday) ?? 0),
      activity,
      account: x.account ? String(x.account) : "",
      since: x.connectedSince ? String(x.connectedSince) : "",
      interval: x.interval ? String(x.interval) : "",
      scopes: (x.scopes ?? []).map(String),
      history: history ?? [],
    };
  });
}

function StatusLight({ status, L, pulse, className }: { status: IntegrationStatus; L: IntegrationLabels; pulse?: boolean; className?: string }) {
  return (
    <span
      style={cVar(status)}
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full bg-[color-mix(in_oklab,var(--c)_11%,transparent)] py-[5px] pr-2 pl-[7px] text-[11px] leading-none font-semibold whitespace-nowrap text-(--c)",
        className
      )}
    >
      <i
        className={cx(
          "size-[7px] rounded-full bg-(--c) shadow-[0_0_0_3px_color-mix(in_oklab,var(--c)_22%,transparent)]",
          pulse && "animate-[isg-glow_2.4s_ease-in-out_infinite] motion-reduce:animate-none"
        )}
      />
      <span>{L[status]}</span>
    </span>
  );
}

/**
 * Every tool a workspace is connected to, in one grid: a status light, last
 * sync, events today and hourly activity, with filters, simulated Sync now /
 * Reconnect and a details drawer.
 */
export function IntegrationStatusGrid({
  integrations,
  eyebrow,
  title,
  subtitle,
  footnote,
  filter: filterProp,
  defaultFilter = "all",
  onFilterChange,
  onSync,
  onOpen,
  locale = "en-US",
  labels,
  ref,
  className,
}: IntegrationStatusGridProps) {
  const L = useMemo<IntegrationLabels>(() => ({ ...INTEGRATION_LABELS, ...labels }), [labels]);
  const uid = useId();
  const int = useCallback((v: number) => Math.round(v).toLocaleString(locale), [locale]);

  const rootRef = useRef<HTMLElement>(null);
  const gridRef = useRef<HTMLUListElement>(null);
  const showAllRef = useRef<HTMLButtonElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const footRef = useRef<HTMLDivElement>(null);
  const timers = useRef(new Set<number>());
  const mountedAt = useRef(0);

  const [items, setItems] = useState<Model[]>(() => load(integrations));
  const itemsRef = useRef(items);
  const commit = (next: Model[]) => {
    itemsRef.current = next;
    setItems(next);
  };
  const [busy, setBusy] = useState<Record<string, IntegrationAction>>({});
  const busyRef = useRef(busy);
  const setBusyNow = (next: Record<string, IntegrationAction>) => {
    busyRef.current = next;
    setBusy(next);
  };
  const [allIds, setAllIds] = useState<string[]>([]);
  const [now, setNow] = useState(0);
  const [flash, setFlash] = useState<Record<string, boolean>>({});
  const [fresh, setFresh] = useState<Record<string, boolean>>({});
  const [live, setLive] = useState("");
  const [lastHist, setLastHist] = useState<string | null>(null);

  const [filterInner, setFilterInner] = useState<IntegrationFilter>(defaultFilter);
  const rawFilter = filterProp ?? filterInner;
  const filter: IntegrationFilter = FILTERS.includes(rawFilter) ? rawFilter : "all";

  // replay the tile entry animation when the filter changes (not on first paint)
  const [anim, setAnim] = useState({ filter, n: 0 });
  if (anim.filter !== filter) {
    setAnim({ filter, n: anim.n + 1 });
    setFlash({});
  }

  const elapsed = () => Date.now() - mountedAt.current;
  const later = useCallback((fn: () => void, ms: number) => {
    const t = window.setTimeout(() => {
      timers.current.delete(t);
      fn();
    }, ms);
    timers.current.add(t);
    return t;
  }, []);

  // relative times: a clock that ticks every 30 s
  useEffect(() => {
    mountedAt.current = Date.now();
    const set = timers.current;
    const clock = window.setInterval(() => setNow(Date.now() - mountedAt.current), 30000);
    return () => {
      window.clearInterval(clock);
      set.forEach((t) => window.clearTimeout(t));
      set.clear();
    };
  }, []);

  const ago = (t: number | null) => {
    if (t == null) return L.never;
    const m = Math.floor((now - t) / MIN);
    if (m < 1) return L.justNow;
    if (m < 60) return fill(L.minAgo, { n: m });
    const h = Math.floor(m / 60);
    if (h < 24) return fill(L.hAgo, { n: h });
    const d = Math.floor(h / 24);
    return d === 1 ? L.dAgo1 : fill(L.dAgo, { n: d });
  };

  /* focus hand-off when a focused tile leaves the current view */
  const pendingFocus = useRef(false);
  const noteFocus = (id: string) => {
    const tile = gridRef.current?.querySelector(`[data-tile="${CSS.escape(id)}"]`);
    if (tile && tile.contains(document.activeElement)) pendingFocus.current = true;
  };
  useLayoutEffect(() => {
    if (!pendingFocus.current) return;
    pendingFocus.current = false;
    const grid = gridRef.current;
    if (grid && grid.contains(document.activeElement)) return;
    const first = grid?.querySelector<HTMLButtonElement>("button:not(:disabled)");
    (first ?? showAllRef.current)?.focus();
  }, [items, filter]);

  const update = (id: string, fn: (m: Model) => Model) => {
    noteFocus(id);
    commit(itemsRef.current.map((m) => (m.id === id ? fn(m) : m)));
  };

  const act = (id: string, action: IntegrationAction) => {
    if (busyRef.current[id]) return;
    const it0 = itemsRef.current.find((m) => m.id === id);
    if (!it0) return;
    setBusyNow({ ...busyRef.current, [id]: action });
    later(() => {
      if (!busyRef.current[id]) return;
      const { [id]: _done, ...rest } = busyRef.current;
      void _done;
      setBusyNow(rest);
      setAllIds((a) => a.filter((x) => x !== id));
      const t = elapsed();
      const it = itemsRef.current.find((m) => m.id === id);
      if (!it) return;
      let added: number;
      const next: Model = { ...it, history: [...it.history], activity: [...it.activity] };
      if (action === "reconnect") {
        next.status = "connected";
        next.issue = "";
        next.fix = "sync";
        added = 1 + (hash(it.id + t) % 6);
        next.history.unshift({ at: t, result: "ok", events: added, note: L.reconnected });
        setLive(fill(L.announceReconnect, { name: it.name }));
      } else {
        added = 2 + (hash(it.id + it.events + t) % (it.events > 500 ? 40 : 12));
        if (it.status === "warning" && it.fix === "sync") {
          next.status = "connected";
          next.issue = "";
        }
        next.history.unshift({ at: t, result: "ok", events: added, note: "" });
        setLive(fill(L.announceSync, { name: it.name, n: added }));
      }
      next.history = next.history.slice(0, 6);
      next.lastSync = t;
      next.events += added;
      if (next.activity.length) next.activity[next.activity.length - 1] += added;
      setLastHist(`${id}:${t}`);
      setNow(t);
      update(id, () => next);
      if (!reduceMotion()) {
        setFlash((f) => ({ ...f, [id]: true }));
        later(() => setFlash((f) => ({ ...f, [id]: false })), 900);
      }
      setFresh((f) => ({ ...f, [id]: true }));
      later(() => setFresh((f) => ({ ...f, [id]: false })), 2400);
      onSync?.({ id, name: it.name, action, status: next.status, eventsAdded: added, eventsToday: next.events });
    }, action === "reconnect" ? 1700 : 1100 + (hash(id) % 500));
  };

  const syncAll = () => {
    const list = itemsRef.current.filter((it) => it.status !== "disconnected" && !busyRef.current[it.id]);
    if (!list.length) return;
    setAllIds(list.map((it) => it.id));
    list.forEach((it, i) => later(() => act(it.id, "sync"), i * 140));
  };

  const setStatus = (id: string, status: IntegrationStatus, issue?: string) => {
    if (!STATUSES.includes(status) || !itemsRef.current.some((m) => m.id === id)) return;
    const t = elapsed();
    update(id, (it) => {
      const nextIssue = status === "connected" ? "" : issue || it.issue || "";
      return {
        ...it,
        status,
        issue: nextIssue,
        fix: status === "disconnected" ? "reconnect" : it.fix || "sync",
        history: status !== "connected" ? [{ at: t, result: "fail" as const, events: null, note: nextIssue || L.syncFail }, ...it.history] : it.history,
      };
    });
    setNow(t);
  };

  const disconnect = (id: string) => {
    const t = elapsed();
    update(id, (it) => ({
      ...it,
      status: "disconnected",
      fix: "reconnect",
      issue: L.disconnectedNote + ".",
      history: [{ at: t, result: "fail", events: null, note: L.disconnectedNote }, ...it.history],
    }));
    setNow(t);
    requestAnimationFrame(() => footRef.current?.querySelector<HTMLButtonElement>("button")?.focus());
  };

  const changeFilter = (f: IntegrationFilter) => {
    if (f === filter) return;
    if (filterProp === undefined) setFilterInner(f);
    const n = f === "all" ? itemsRef.current.length : itemsRef.current.filter((it) => it.status === f).length;
    setLive(fill(L.announceFilter, { n }));
    onFilterChange?.({ filter: f, shown: n });
  };

  useImperativeHandle(ref, () => ({
    sync: (id) => {
      const it = itemsRef.current.find((m) => m.id === id);
      if (it && it.status !== "disconnected") act(id, "sync");
    },
    reconnect: (id) => act(id, "reconnect"),
    syncAll,
    setStatus,
  }));

  /* ---------- drawer ---------- */
  const [openId, setOpenId] = useState<string | null>(null);
  const [drawerShown, setDrawerShown] = useState(false);
  const [drawerBox, setDrawerBox] = useState<{ id: string; top: number; height: number } | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const openSeq = useRef(0);
  const openItem = drawerBox ? items.find((m) => m.id === drawerBox.id) : undefined;

  const openDrawer = (id: string, from: HTMLElement) => {
    const it = itemsRef.current.find((m) => m.id === id);
    const root = rootRef.current;
    if (!it || !root) return;
    opener.current = from;
    openSeq.current += 1;
    // keep the drawer inside the part of the card that is on screen
    const box = root.getBoundingClientRect();
    const full = root.clientHeight;
    const vh = window.innerHeight || full;
    const visTop = Math.max(0, -box.top);
    const visBottom = Math.min(full, vh - box.top);
    let top = visTop;
    let h = visBottom - visTop;
    if (h < 360) {
      h = Math.min(full, Math.max(360, vh));
      top = Math.max(0, Math.min(visTop, full - h));
    }
    setDrawerBox({ id, top, height: h });
    setOpenId(id);
    const show = () => {
      setDrawerShown(true);
      titleRef.current?.focus({ preventScroll: true });
    };
    if (reduceMotion()) requestAnimationFrame(show);
    else requestAnimationFrame(() => requestAnimationFrame(show));
    onOpen?.({ id: it.id, name: it.name, status: it.status });
  };

  const closeDrawer = () => {
    if (!openId) return;
    const id = openId;
    setOpenId(null);
    setDrawerShown(false);
    const seq = openSeq.current;
    if (reduceMotion()) setDrawerBox(null);
    else later(() => openSeq.current === seq && setDrawerBox(null), 380);
    if (opener.current?.isConnected) opener.current.focus();
    else gridRef.current?.querySelector<HTMLElement>(`[data-tile="${CSS.escape(id)}"] [data-act="details"]`)?.focus();
  };

  const onDrawerKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      closeDrawer();
      return;
    }
    if (e.key !== "Tab" || !drawerRef.current) return;
    const f = [...drawerRef.current.querySelectorAll<HTMLElement>("button:not(:disabled), [tabindex='0']")].filter((x) => x.offsetParent !== null);
    if (!f.length) return;
    const first = f[0];
    const last = f[f.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === titleRef.current)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  /* ---------- derived ---------- */
  const count = (s: IntegrationStatus) => items.filter((it) => it.status === s).length;
  const ok = count("connected");
  const warn = count("warning");
  const bad = count("disconnected");
  const n = items.length;
  const segs = (
    [
      ["ok", ok],
      ["warn", warn],
      ["bad", bad],
    ] as const
  ).filter((x) => x[1] > 0);
  const totalEvents = items.reduce((a, it) => a + it.events, 0);
  const busyAll = allIds.length > 0;
  const syncable = items.some((it) => it.status !== "disconnected");
  const shown = items.filter((it) => filter === "all" || it.status === filter);
  const drawerOpen = openId !== null;
  const drawerMounted = drawerBox !== null;

  const mainBtn = (it: Model, inDrawer?: boolean) => {
    const b = busy[it.id];
    const needsReconnect = it.status === "disconnected" || (it.status === "warning" && it.fix === "reconnect");
    const action: IntegrationAction = b ?? (needsReconnect ? "reconnect" : "sync");
    const variant = action === "reconnect" && it.status === "disconnected" ? BTN.fix : BTN.main;
    return (
      <button
        type="button"
        data-act={action}
        aria-busy={!!b}
        disabled={!!b}
        aria-describedby={inDrawer ? undefined : `${uid}-n-${it.id}`}
        onClick={() => act(it.id, action)}
        className={cx(btnBase, variant, "flex-1")}
      >
        <SmallIcon kind={b ? "spin" : action === "reconnect" ? "plug" : "sync"} spin={!!b} />
        {b ? (b === "reconnect" ? L.reconnecting : L.syncing) : action === "reconnect" ? L.reconnect : L.syncNow}
      </button>
    );
  };

  return (
    <div className={cx("@container block w-full max-w-[980px] font-(family-name:--isg-sans) text-(--isg-ink)", className)}>
      <section
        ref={rootRef}
        className="relative overflow-hidden rounded-[18px] border border-(--isg-line) bg-(--isg-canvas) px-6 pt-6 pb-5 shadow-[0_30px_60px_-48px_var(--isg-shadow)] @max-[760px]:px-[18px] @max-[760px]:pt-5 @max-[760px]:pb-4 @max-[480px]:rounded-2xl @max-[480px]:px-3 @max-[480px]:pt-[18px] @max-[480px]:pb-3.5"
      >
        <div inert={drawerOpen}>
          {/* header */}
          <header className="flex flex-wrap items-start justify-between gap-x-5 gap-y-3.5">
            <div className="grid min-w-0 gap-1.5">
              {eyebrow && <span className="text-[11px] leading-none font-semibold tracking-[0.14em] text-(--isg-faint) uppercase">{eyebrow}</span>}
              {title && (
                <h2 className="m-0 font-(family-name:--isg-display) text-[clamp(20px,3.2cqi,25px)] leading-[1.15] font-[650] tracking-[-0.02em] text-balance">{title}</h2>
              )}
              {subtitle && <p className="m-0 text-[13px] text-(--isg-muted)">{subtitle}</p>}
            </div>
            <button type="button" onClick={syncAll} aria-busy={busyAll} disabled={busyAll || !syncable} className={cx(btnBase, BTN.plain, "@max-[480px]:w-full")}>
              <SmallIcon kind={busyAll ? "spin" : "sync"} spin={busyAll} />
              {busyAll ? L.syncingAll : L.syncAll}
            </button>
          </header>

          {/* summary + filters */}
          <div className="mt-[18px] grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-5 gap-y-3 rounded-[14px] border border-(--isg-line) bg-(--isg-tile) px-4 py-3.5 @max-[760px]:grid-cols-1 @max-[480px]:p-3">
            <div className="grid min-w-0 gap-[9px]">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
                <span className="font-(family-name:--isg-display) text-[22px] leading-none font-[650] tracking-[-0.02em] tabular-nums">{fill(L.healthy, { ok, n })}</span>
                <span className="text-[12.5px] text-(--isg-muted) tabular-nums">{warn + bad ? fill(L.needs, { n: warn + bad }) : L.allGood}</span>
              </div>
              <div aria-hidden="true" className="flex h-1.5 gap-[3px]">
                {segs.map(([k, v]) => (
                  <span
                    key={k}
                    style={{ flexGrow: v, background: `var(--isg-${k})` }}
                    className="min-w-0 shrink basis-0 rounded-full transition-[flex-grow] duration-500 ease-out-soft motion-reduce:transition-none"
                  />
                ))}
              </div>
            </div>
            <div
              role="group"
              aria-label={L.filterGroup}
              className="flex flex-wrap gap-1 rounded-[11px] border border-(--isg-line) bg-(--isg-tint) p-[3px] @max-[760px]:justify-self-start @max-[480px]:grid @max-[480px]:w-full @max-[480px]:grid-cols-2"
            >
              {FILTERS.map((f) => (
                <button
                  key={f}
                  type="button"
                  data-filter={f}
                  aria-pressed={f === filter}
                  onClick={() => changeFilter(f)}
                  className={cx(
                    "group/f inline-flex cursor-pointer items-center gap-[7px] rounded-lg border-0 bg-transparent px-2.5 py-2 text-[12.5px] leading-none font-semibold text-(--isg-muted) [transition:background_.2s,color_.2s,box-shadow_.2s] hover:text-(--isg-ink) aria-pressed:bg-(--isg-tile) aria-pressed:text-(--isg-ink) aria-pressed:shadow-[0_1px_3px_-1px_var(--isg-shadow),0_0_0_1px_var(--isg-line)] motion-reduce:transition-none @max-[480px]:justify-center @max-[480px]:gap-[5px] @max-[480px]:px-1 @max-[480px]:text-xs",
                    focusRing
                  )}
                >
                  {f !== "all" && <span style={cVar(f)} className="size-[7px] rounded-full bg-(--c)" />}
                  {L[f]}{" "}
                  <b className="text-[11.5px] leading-none font-semibold text-(--isg-faint) tabular-nums group-aria-pressed/f:text-(--isg-ink)">{f === "all" ? n : count(f)}</b>
                </button>
              ))}
            </div>
          </div>

          {/* tiles */}
          <ul
            key={anim.n}
            ref={gridRef}
            hidden={shown.length === 0}
            className="m-0 mt-4 grid list-none grid-cols-4 gap-3 p-0 @max-[760px]:grid-cols-2 @max-[480px]:grid-cols-1 @max-[480px]:gap-2.5"
          >
            {shown.map((it, i) => {
              const nameId = `${uid}-n-${it.id}`;
              const max = Math.max(1, ...it.activity);
              const disc = it.status === "disconnected";
              return (
                <li
                  key={it.id}
                  data-tile={it.id}
                  aria-labelledby={nameId}
                  style={{ ...cVar(it.status), "--i": i } as CSSProperties}
                  className={cx(
                    "relative flex min-w-0 flex-col rounded-[14px] border bg-(--isg-tile) px-4 pt-4 pb-3.5 shadow-[0_1px_0_rgba(255,255,255,0.5)_inset,0_10px_24px_-22px_var(--isg-shadow)] [transition:transform_.35s_cubic-bezier(.2,.7,.2,1),box-shadow_.35s_ease,border-color_.3s] hover:shadow-[0_18px_32px_-24px_var(--isg-shadow)] motion-safe:hover:-translate-y-0.5 motion-reduce:transition-none",
                    "@max-[480px]:grid @max-[480px]:grid-cols-[40px_minmax(0,1fr)] @max-[480px]:gap-x-3 @max-[480px]:px-3.5 @max-[480px]:pt-3.5 @max-[480px]:pb-3",
                    disc ? "border-dashed border-[color-mix(in_oklab,var(--isg-bad)_45%,var(--isg-line))]" : "border-(--isg-line)",
                    it.status !== "connected" && "before:absolute before:inset-x-4 before:-top-px before:h-0.5 before:rounded-b-[2px] before:bg-(--c) before:content-['']",
                    flash[it.id]
                      ? "animate-[isg-flash_.9s_ease] motion-reduce:animate-none"
                      : flash[it.id] === undefined &&
                          anim.n > 0 && "animate-[isg-in_.35s_cubic-bezier(.2,.7,.2,1)_both] [animation-delay:calc(var(--i,0)*30ms)] motion-reduce:animate-none"
                  )}
                >
                  <div className="flex items-start justify-between gap-2 @max-[480px]:contents">
                    <span
                      className={cx(
                        "grid size-10 flex-none place-items-center rounded-[11px] bg-(--isg-tint) shadow-[inset_0_0_0_1px_var(--isg-line)] @max-[480px]:col-start-1 @max-[480px]:row-span-2 @max-[480px]:row-start-1",
                        disc ? "text-(--isg-faint)" : "text-(--isg-glyph)"
                      )}
                    >
                      <Glyph icon={it.icon} />
                    </span>
                    <StatusLight status={it.status} L={L} pulse={it.status === "connected"} className="@max-[480px]:col-start-2 @max-[480px]:row-start-1 @max-[480px]:justify-self-start" />
                  </div>
                  <h3
                    id={nameId}
                    className="m-0 mt-3.5 font-(family-name:--isg-display) text-[15.5px] leading-[1.25] font-[650] tracking-[-0.01em] [overflow-wrap:anywhere] @max-[480px]:col-start-2 @max-[480px]:row-start-2 @max-[480px]:mt-2"
                  >
                    {it.name}
                  </h3>
                  {it.description && <p className="m-0 mt-[3px] text-[12.5px] leading-[1.4] text-(--isg-muted) [overflow-wrap:anywhere] @max-[480px]:col-span-full">{it.description}</p>}
                  {it.issue && (
                    <p className="m-0 mt-2.5 rounded-lg border-l-2 border-(--c) bg-[color-mix(in_oklab,var(--c)_10%,transparent)] px-[9px] py-[7px] text-xs leading-[1.4] text-(--isg-ink) @max-[480px]:col-span-full">
                      {it.issue}
                    </p>
                  )}
                  {it.activity.length > 0 && (
                    <div role="img" aria-label={fill(L.bars, { v: it.activity.join(", ") })} className="mt-auto flex h-[34px] items-end gap-0.5 pt-3.5 @max-[480px]:hidden">
                      {it.activity.map((v, k) => {
                        const lastBar = k === it.activity.length - 1;
                        return (
                          <span
                            key={k}
                            style={{ height: `${Math.max((v / max) * 100, 4)}%` }}
                            className={cx(
                              "min-w-0 flex-1 rounded-t-[2px] rounded-b-[1px] [transition:height_.4s_cubic-bezier(.2,.7,.2,1),background_.3s] motion-reduce:transition-none",
                              lastBar && !disc ? "bg-(--isg-glyph) opacity-75" : "bg-(--isg-line)"
                            )}
                          />
                        );
                      })}
                    </div>
                  )}
                  <dl
                    className={cx(
                      "m-0 grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-2 border-t border-(--isg-line) pt-2.5 @max-[480px]:col-span-full",
                      it.activity.length ? "mt-2.5" : "mt-auto"
                    )}
                  >
                    <div className="grid min-w-0 gap-1">
                      <dt className="text-[10.5px] leading-[1.2] font-medium tracking-[0.04em] text-(--isg-faint)">{L.lastSync}</dt>
                      <dd className={cx("m-0 text-[13px] leading-[1.2] font-semibold [overflow-wrap:anywhere] tabular-nums transition-colors duration-300 motion-reduce:transition-none", fresh[it.id] && "text-(--isg-ok)")}>
                        {ago(it.lastSync)}
                      </dd>
                    </div>
                    <div className="grid min-w-0 gap-1">
                      <dt className="text-[10.5px] leading-[1.2] font-medium tracking-[0.04em] text-(--isg-faint)">{L.events}</dt>
                      <dd className="m-0 text-[13px] leading-[1.2] font-semibold [overflow-wrap:anywhere] tabular-nums">{int(it.events)}</dd>
                    </div>
                  </dl>
                  <div className="mt-3 flex gap-1.5 @max-[480px]:col-span-full">
                    {mainBtn(it)}
                    <button
                      type="button"
                      data-act="details"
                      aria-haspopup="dialog"
                      aria-label={fill(L.detailsOf, { name: it.name })}
                      onClick={(e) => openDrawer(it.id, e.currentTarget)}
                      className={cx(btnBase, BTN.ghost)}
                    >
                      <SmallIcon kind="info" />
                      {L.details}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
          {shown.length === 0 && (
            <div className="mt-4 grid justify-items-center gap-3 rounded-[14px] border border-dashed border-(--isg-line) px-4 py-[34px] text-center text-[13.5px] text-(--isg-muted)">
              <span>{L.empty}</span>
              <button
                ref={showAllRef}
                type="button"
                onClick={() => {
                  changeFilter("all");
                  rootRef.current?.querySelector<HTMLElement>('[data-filter="all"]')?.focus();
                }}
                className={cx(btnBase, BTN.plain)}
              >
                {L.showAll}
              </button>
            </div>
          )}
          <footer className="mt-3.5 flex flex-wrap justify-between gap-x-4 gap-y-1.5 text-xs text-(--isg-faint)">
            <span>{fill(L.eventsTotal, { n: int(totalEvents) })}</span>
            {footnote && <span>{footnote}</span>}
          </footer>
        </div>

        {/* details drawer */}
        {drawerMounted && (
          <div
            aria-hidden="true"
            onClick={closeDrawer}
            className={cx("absolute inset-0 z-[4] bg-(--isg-scrim) transition-opacity duration-300 motion-reduce:transition-none", drawerShown ? "opacity-100" : "opacity-0")}
          />
        )}
        <div
          ref={drawerRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${uid}-dt`}
          hidden={!drawerMounted}
          onKeyDown={onDrawerKey}
          style={drawerBox ? { top: drawerBox.top, height: drawerBox.height, bottom: "auto" } : undefined}
          className={cx(
            "absolute top-0 right-0 bottom-0 z-[5] grid w-[min(380px,100%)] grid-rows-[auto_minmax(0,1fr)_auto] border-l border-(--isg-line) bg-(--isg-tile) shadow-[-24px_0_48px_-32px_var(--isg-shadow)] transition-transform duration-[380ms] ease-out-soft motion-reduce:transition-none @max-[480px]:w-full @max-[480px]:border-l-0",
            drawerShown ? "translate-x-0" : "translate-x-[104%]"
          )}
        >
          {openItem && (
            <>
              <div className="grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 border-b border-(--isg-line) px-[18px] pt-[18px] pb-4 @max-[480px]:px-3.5 @max-[480px]:pt-4 @max-[480px]:pb-3.5">
                <span className={cx("grid size-11 place-items-center rounded-[11px] bg-(--isg-tint) shadow-[inset_0_0_0_1px_var(--isg-line)]", openItem.status === "disconnected" ? "text-(--isg-faint)" : "text-(--isg-glyph)")}>
                  <Glyph icon={openItem.icon} />
                </span>
                <div>
                  <h3
                    ref={titleRef}
                    id={`${uid}-dt`}
                    tabIndex={-1}
                    className="m-0 font-(family-name:--isg-display) text-[17px] leading-[1.2] font-[650] tracking-[-0.01em] [overflow-wrap:anywhere] focus:outline-none"
                  >
                    {openItem.name}
                  </h3>
                  <StatusLight status={openItem.status} L={L} className="mt-1.5 justify-self-start" />
                </div>
                <button type="button" aria-label={L.close} onClick={closeDrawer} className={cx(btnBase, BTN.ghost, "w-[34px] self-start px-0")}>
                  <SmallIcon kind="x" />
                </button>
              </div>

              <div className="grid content-start gap-[18px] overflow-y-auto px-[18px] py-4 @max-[480px]:p-3.5">
                {openItem.issue && (
                  <p
                    style={cVar(openItem.status === "warning" ? "warning" : "disconnected")}
                    className="m-0 rounded-lg border-l-2 border-(--c) bg-[color-mix(in_oklab,var(--c)_10%,transparent)] px-[9px] py-[7px] text-xs leading-[1.4] text-(--isg-ink)"
                  >
                    {openItem.issue}
                  </p>
                )}
                <section className="grid gap-2.5">
                  <h4 className="m-0 text-[10.5px] leading-none font-semibold tracking-[0.12em] text-(--isg-faint) uppercase">{L.connection}</h4>
                  <dl className="m-0 grid grid-cols-2 gap-px overflow-hidden rounded-[10px] border border-(--isg-line) bg-(--isg-line)">
                    {[
                      openItem.account && { k: L.account, v: openItem.account, wide: true },
                      { k: L.lastSync, v: ago(openItem.lastSync) },
                      { k: L.events, v: int(openItem.events) },
                      openItem.interval && { k: L.interval, v: openItem.interval },
                      openItem.since && { k: L.since, v: openItem.since },
                    ]
                      .filter((x): x is { k: string; v: string; wide?: boolean } => !!x)
                      .map((f) => (
                        <div key={f.k} className={cx("grid min-w-0 gap-1 bg-(--isg-tile) px-[11px] py-2.5", f.wide && "col-span-full")}>
                          <dt className="text-[11px] text-(--isg-faint)">{f.k}</dt>
                          <dd className="m-0 text-[13px] leading-[1.3] font-semibold [overflow-wrap:anywhere] tabular-nums">{f.v}</dd>
                        </div>
                      ))}
                  </dl>
                </section>
                {openItem.scopes.length > 0 && (
                  <section className="grid gap-2.5">
                    <h4 className="m-0 text-[10.5px] leading-none font-semibold tracking-[0.12em] text-(--isg-faint) uppercase">{L.scopes}</h4>
                    <ul className="m-0 grid list-none gap-[7px] p-0">
                      {openItem.scopes.map((s) => (
                        <li key={s} className="grid grid-cols-[16px_minmax(0,1fr)] gap-2 text-[13px] leading-[1.4]">
                          <SmallIcon kind="check" />
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
                {openItem.history.length > 0 && (
                  <section className="grid gap-2.5">
                    <h4 className="m-0 text-[10.5px] leading-none font-semibold tracking-[0.12em] text-(--isg-faint) uppercase">{L.recent}</h4>
                    <ol className="m-0 grid list-none p-0">
                      {openItem.history.slice(0, 5).map((h, k) => {
                        const sub = h.result === "ok" ? (h.events ? fill(L.added, { n: int(h.events) }) : h.events === 0 ? L.noEvents : "") : h.note;
                        return (
                          <li
                            key={`${h.at}-${k}`}
                            className={cx(
                              "relative grid grid-cols-[14px_minmax(0,1fr)_auto] items-start gap-2.5 pb-3 text-[12.5px] leading-[1.35] before:absolute before:top-3.5 before:bottom-0 before:left-1.5 before:w-px before:bg-(--isg-line) before:content-[''] last:before:hidden",
                              k === 0 && lastHist === `${openItem.id}:${h.at}` && "animate-[isg-in_.35s_cubic-bezier(.2,.7,.2,1)_both] motion-reduce:animate-none"
                            )}
                          >
                            <i
                              style={cVar(h.result)}
                              className="mt-[3px] ml-0.5 size-[9px] rounded-full bg-(--c) shadow-[0_0_0_3px_color-mix(in_oklab,var(--c)_18%,transparent)]"
                            />
                            <div>
                              <b className="block font-semibold">{h.note && h.result === "ok" ? h.note : h.result === "ok" ? L.syncOk : L.syncFail}</b>
                              {sub && <small className="block text-xs [overflow-wrap:anywhere] text-(--isg-muted)">{sub}</small>}
                            </div>
                            <em className="text-xs whitespace-nowrap text-(--isg-faint) not-italic tabular-nums">{ago(h.at)}</em>
                          </li>
                        );
                      })}
                    </ol>
                  </section>
                )}
              </div>

              <div ref={footRef} className="flex flex-wrap gap-2 border-t border-(--isg-line) bg-(--isg-tint) px-[18px] py-3.5 @max-[480px]:px-3.5 @max-[480px]:py-3">
                {mainBtn(openItem, true)}
                {openItem.status !== "disconnected" && (
                  <button type="button" data-act="disconnect" disabled={!!busy[openItem.id]} onClick={() => disconnect(openItem.id)} className={cx(btnBase, BTN.ghost)}>
                    {L.disconnect}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
        <p className="sr-only" aria-live="polite">
          {live}
        </p>
      </section>
    </div>
  );
}

export default IntegrationStatusGrid;
