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
  type ReactNode,
  type Ref,
} from "react";
import { cx } from "@/lib/format";

export type AgentStatus = "running" | "idle" | "error" | "paused";
/** Live status: the four input statuses plus the short "restarting" phase. */
export type AgentLiveStatus = AgentStatus | "restarting";
export type AgentFilter = "all" | AgentStatus;
export type AgentAction = "start" | "pause" | "restart" | "retry";

export interface AgentError {
  code?: string;
  /** Time the error happened, e.g. "14:28". */
  at?: string;
  message: string;
}

export interface Agent {
  /** Agent key. */
  id: string;
  name: string;
  /** Model label, e.g. "Large model". */
  model?: string;
  status?: AgentStatus;
  /** What the agent is working on. */
  task?: string;
  /** Items waiting. */
  queue?: number;
  processed?: number;
  succeeded?: number;
  /** Simulation only: average items per update. */
  load?: number;
  /** Simulation only: share of items that fail (0–1). */
  failRate?: number;
  /** Shown when an error row is opened. */
  error?: AgentError;
}

export interface AgentActionEvent {
  id: string;
  name: string;
  action: AgentAction;
  from: AgentLiveStatus;
  to: AgentLiveStatus;
}

export interface AgentSnapshot {
  id: string;
  name: string;
  status: AgentLiveStatus;
  queue: number;
  processed: number;
  succeeded: number;
}

/** Imperative handle, the same API the custom element exposed. */
export interface AgentStatusPanelHandle {
  /** Change an agent from code. Returns false when the id or status is unknown. */
  setStatus: (id: string, status: AgentStatus, message?: string) => boolean;
  /** Current live state of every agent. */
  getAgents: () => AgentSnapshot[];
}

export interface AgentStatusPanelLabels {
  running: string;
  idle: string;
  error: string;
  paused: string;
  restarting: string;
  all: string;
  live: string;
  stopped: string;
  pauseLive: string;
  resumeLive: string;
  agentsRunning: string;
  queue: string;
  processed: string;
  success: string;
  throughput: string;
  perMin: string;
  task: string;
  agent: string;
  actions: string;
  start: string;
  pause: string;
  restart: string;
  retry: string;
  showError: string;
  hideError: string;
  waiting: string;
  restartingTask: string;
  filterLabel: string;
  hint: string;
  empty: string;
  log: string;
  tick: string;
  tickLine: string;
  noWork: string;
  actionLine: string;
  logStart: string;
  logPause: string;
  logRestart: string;
  logRetry: string;
  nowRunning: string;
  nowIdle: string;
  restarted: string;
  failed: string;
  announce: string;
  loaded: string;
}

export interface AgentStatusPanelProps {
  /** Breadcrumb-style path above the title. */
  path?: string;
  title?: string;
  subtitle?: string;
  agents: Agent[];
  /** Number that makes the simulated updates repeat the same way each time. */
  seed?: number;
  /** Milliseconds between live updates (minimum 500). */
  interval?: number;
  /** Controlled status filter. */
  filter?: AgentFilter;
  defaultFilter?: AgentFilter;
  onFilterChange?: (filter: AgentFilter) => void;
  /** Controlled live-updates pause. */
  paused?: boolean;
  defaultPaused?: boolean;
  onPausedChange?: (paused: boolean) => void;
  /** Fires on Start, Pause, Restart and Retry with the status before and after. */
  onAgentAction?: (detail: AgentActionEvent) => void;
  labels?: Partial<AgentStatusPanelLabels>;
  /** Number and time locale. */
  locale?: string;
  ref?: Ref<AgentStatusPanelHandle>;
  className?: string;
}

const LABELS: AgentStatusPanelLabels = {
  running: "Running",
  idle: "Idle",
  error: "Error",
  paused: "Paused",
  restarting: "Restarting",
  all: "All",
  live: "Live",
  stopped: "Paused",
  pauseLive: "Pause live updates",
  resumeLive: "Resume live updates",
  agentsRunning: "Running",
  queue: "Queue",
  processed: "Processed",
  success: "Success",
  throughput: "Throughput",
  perMin: "/min",
  task: "Current task",
  agent: "Agent",
  actions: "Actions",
  start: "Start",
  pause: "Pause",
  restart: "Restart",
  retry: "Retry now",
  showError: "Show error",
  hideError: "Hide error",
  waiting: "Waiting for new work",
  restartingTask: "Restarting…",
  filterLabel: "Filter by status",
  hint: "Updates every {s}s",
  empty: "No agents with this status.",
  log: "Event log",
  tick: "tick {n}",
  tickLine: "{n} processed · {f} failed · {q} queued",
  noWork: "no work processed · {q} queued",
  actionLine: "{name} · {action}",
  logStart: "started by you",
  logPause: "paused by you",
  logRestart: "restart requested",
  logRetry: "retry requested",
  nowRunning: "{name} picked up new work",
  nowIdle: "{name} queue empty, now idle",
  restarted: "{name} restarted",
  failed: "{name} failed: {message}",
  announce: "{name} is now {status}.",
  loaded: "{n} agents loaded",
};

const STATUSES: AgentStatus[] = ["running", "idle", "error", "paused"];
const FILTERS: AgentFilter[] = ["all", ...STATUSES];
const HISTORY = 14, FLEET = 28, RESTART_MS = 1400;

const COLOR: Record<AgentLiveStatus, string> = {
  running: "[--asp-c:var(--asp-run)]",
  idle: "[--asp-c:var(--asp-idle)]",
  error: "[--asp-c:var(--asp-err)]",
  paused: "[--asp-c:var(--asp-pause)]",
  restarting: "[--asp-c:var(--asp-restart)]",
};

/* ---------- icons ---------- */
const PlayIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" className={className}>
    <path d="M5 3.2v9.6c0 .5.5.8.9.5l7.2-4.8a.6.6 0 0 0 0-1L5.9 2.7c-.4-.3-.9 0-.9.5Z" />
  </svg>
);
const PauseIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" className={className}>
    <rect x="3.5" y="3" width="3" height="10" rx="1" />
    <rect x="9.5" y="3" width="3" height="10" rx="1" />
  </svg>
);
const RestartIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
    <path d="M13 8a5 5 0 1 1-1.6-3.7" />
    <path d="M13 2.5v3h-3" />
  </svg>
);
const ChevronIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
    <path d="m3 4.5 3 3 3-3" />
  </svg>
);

/* ---------- helpers ---------- */
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const fill = (s: string, vars: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ""));
const reduceMotion = () => typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/** Small deterministic PRNG (mulberry32) whose state lives in plain data. */
function rng(state: number) {
  let a = state | 0;
  return {
    next() {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    get state() {
      return a;
    },
  };
}

interface LiveAgent {
  id: string;
  name: string;
  model: string;
  status: AgentLiveStatus;
  task: string;
  queue: number;
  processed: number;
  succeeded: number;
  load: number;
  failRate: number;
  error: AgentError | null;
  expanded: boolean;
  history: number[];
}
interface LogLine {
  key: number;
  time: string | null;
  text: string;
  tone: "" | "good" | "bad" | "warn";
}
interface Sim {
  agents: LiveAgent[];
  fleet: number[];
  tick: number;
  rng: number;
  log: LogLine[];
  logKey: number;
  /** Ids to flash on the next paint. */
  flash: string[];
}

function load(agents: Agent[], seed: number | undefined, L: AgentStatusPanelLabels): Sim {
  const r = rng(isNum(seed) ? seed >>> 0 || 1 : 7);
  const list: LiveAgent[] = (Array.isArray(agents) ? agents : []).map((x, i) => {
    const processed = Math.max(0, isNum(x?.processed) ? x.processed : 0);
    const status: AgentStatus = x?.status && STATUSES.includes(x.status) ? x.status : "idle";
    const ld = Math.max(0, isNum(x?.load) ? x.load : 1);
    const a: LiveAgent = {
      id: String(x?.id || `agent-${i + 1}`),
      name: x?.name || `Agent ${i + 1}`,
      model: x?.model || "",
      status,
      task: x?.task || "",
      queue: Math.max(0, Math.round(isNum(x?.queue) ? x.queue : 0)),
      processed,
      succeeded: Math.min(processed, Math.max(0, isNum(x?.succeeded) ? x.succeeded : processed)),
      load: ld,
      failRate: Math.min(1, Math.max(0, isNum(x?.failRate) ? x.failRate : 0)),
      error: status === "error" ? { code: "", at: "", message: "Unknown error", ...(x?.error || {}) } : null,
      expanded: false,
      history: [],
    };
    for (let h = 0; h < HISTORY; h++) a.history.push(status === "running" ? Math.round(r.next() * ld * 2) : 0);
    return a;
  });
  const fleet: number[] = [];
  for (let h = 0; h < FLEET; h++) fleet.push(list.reduce((s, a) => s + (a.history[h % HISTORY] || 0), 0));
  return {
    agents: list,
    fleet,
    tick: 0,
    rng: r.state,
    log: [{ key: 1, time: null, text: fill(L.loaded, { n: list.length }), tone: "" }],
    logKey: 1,
    flash: [],
  };
}

const pushLog = (sim: Sim, text: string, tone: LogLine["tone"], time: string): Sim => {
  const key = sim.logKey + 1;
  return { ...sim, logKey: key, log: [...sim.log, { key, time, text, tone }].slice(-5) };
};

const mono = "font-(family-name:--asp-mono)";
const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--asp-accent)";

/**
 * An ops console for a team of AI agents with live status, queue, success
 * rate and throughput. Start, pause or restart agents, filter by status and
 * retry errors.
 */
export function AgentStatusPanel({
  path,
  title,
  subtitle,
  agents,
  seed,
  interval = 2000,
  filter: filterProp,
  defaultFilter = "all",
  onFilterChange,
  paused: pausedProp,
  defaultPaused = false,
  onPausedChange,
  onAgentAction,
  labels,
  locale = "en-GB",
  ref,
  className,
}: AgentStatusPanelProps) {
  const L = useMemo(() => ({ ...LABELS, ...labels }), [labels]);
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const every = Math.max(500, isNum(interval) ? interval : 2000);

  const int = (v: number) => Math.round(v).toLocaleString(locale);
  const pct = (v: number | null) => (v == null ? "—" : v.toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%");
  const now = useCallback(() => {
    try {
      return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(new Date());
    } catch {
      return new Date().toTimeString().slice(0, 8);
    }
  }, [locale]);

  const [filterState, setFilterState] = useState<AgentFilter>(defaultFilter);
  const filter = filterProp ?? filterState;
  const [pausedState, setPausedState] = useState(defaultPaused);
  const paused = pausedProp ?? pausedState;
  const live = !paused;

  /* ---------- simulation state ---------- */
  const [sim, setSim] = useState<Sim>(() => load(agents, seed, L));
  const simRef = useRef(sim);
  simRef.current = sim;
  const [simFor, setSimFor] = useState({ agents, seed });
  if (simFor.agents !== agents || simFor.seed !== seed) {
    setSimFor({ agents, seed });
    setSim(load(agents, seed, L));
  }
  const commit = (next: Sim) => {
    simRef.current = next;
    setSim(next);
  };

  const [say, setSay] = useState("");
  const [clock, setClock] = useState<string | null>(null);
  const announce = (a: LiveAgent) => setSay(fill(L.announce, { name: a.name, status: (L[a.status] || a.status).toLowerCase() }));

  // stamp the times that could not be known during server render
  useEffect(() => {
    const t = now();
    setClock(t);
    setSim((s) => (s.log.some((l) => l.time == null) ? { ...s, log: s.log.map((l) => (l.time == null ? { ...l, time: t } : l)) } : s));
  }, [now, simFor]);

  /* ---------- restart timers ---------- */
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const cancelRestart = (id: string) => {
    const t = timers.current.get(id);
    if (t) {
      clearTimeout(t);
      timers.current.delete(id);
    }
  };
  useEffect(() => {
    const map = timers.current;
    map.forEach((t) => clearTimeout(t));
    map.clear();
    return () => {
      map.forEach((t) => clearTimeout(t));
      map.clear();
    };
  }, [simFor]);

  const finishRestart = (id: string) => {
    timers.current.delete(id);
    const s = simRef.current;
    const a = s.agents.find((x) => x.id === id);
    if (!a || a.status !== "restarting") return;
    const na: LiveAgent = { ...a, error: null, status: a.queue > 0 ? "running" : "idle" };
    let next: Sim = { ...s, agents: s.agents.map((x) => (x.id === id ? na : x)), flash: [id] };
    next = pushLog(next, fill(L.restarted, { name: a.name }), "good", now());
    commit(next);
    announce(na);
  };
  const beginRestart = (a: LiveAgent): LiveAgent => {
    cancelRestart(a.id);
    timers.current.set(
      a.id,
      setTimeout(() => finishRestart(a.id), RESTART_MS)
    );
    return { ...a, status: "restarting", expanded: false };
  };

  /* ---------- live updates ---------- */
  const step = useCallback(() => {
    if (typeof document !== "undefined" && document.hidden) return;
    const s = simRef.current;
    const r = rng(s.rng);
    const time = now();
    let next: Sim = { ...s, tick: s.tick + 1 };
    let done = 0, failed = 0;
    const changed: LiveAgent[] = [];
    const lines: Array<[string, LogLine["tone"]]> = [];
    const list = s.agents.map((src) => {
      const a: LiveAgent = { ...src, history: [...src.history] };
      let k = 0;
      const arrive = () => Math.floor(r.next() * (a.load * 2 + 0.2));
      if (a.status === "running") {
        k = Math.min(a.queue, Math.round(r.next() * a.load * 2));
        let f = 0;
        for (let i = 0; i < k; i++) if (r.next() < a.failRate) f++;
        a.processed += k;
        a.succeeded += k - f;
        a.queue -= k;
        const add = arrive();
        a.queue += add;
        done += k;
        failed += f;
        if (a.queue === 0 && add === 0 && r.next() < 0.5) {
          a.status = "idle";
          lines.push([fill(L.nowIdle, { name: a.name }), ""]);
          changed.push(a);
        }
      } else if (a.status === "idle") {
        if (r.next() < 0.22) {
          a.queue += 1 + Math.floor(r.next() * 3);
          a.status = "running";
          lines.push([fill(L.nowRunning, { name: a.name }), "good"]);
          changed.push(a);
        }
      } else if (a.status === "paused" || a.status === "error") {
        if (r.next() < 0.3) a.queue += 1;
      }
      a.history.push(k);
      if (a.history.length > HISTORY) a.history.shift();
      return a;
    });
    const fleet = [...s.fleet, done].slice(-FLEET);
    next = { ...next, agents: list, fleet, rng: r.state, flash: [] };
    lines.forEach(([t, tone]) => (next = pushLog(next, t, tone, time)));
    const q = list.reduce((x, a) => x + a.queue, 0);
    next = pushLog(next, done ? fill(L.tickLine, { n: done, f: failed, q: int(q) }) : fill(L.noWork, { q: int(q) }), failed ? "warn" : "", time);
    commit(next);
    setClock(time);
    if (changed.length) announce(changed[changed.length - 1]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [L, now, locale]);

  useEffect(() => {
    if (!live) return;
    const t = setInterval(step, every);
    return () => clearInterval(t);
  }, [live, every, step]);

  /* ---------- actions ---------- */
  const rowRefs = useRef(new Map<string, HTMLLIElement>());
  const pendingFocus = useRef<{ id: string; sel: string[] } | null>(null);

  const act = (id: string, action: AgentAction, focusFrom?: AgentAction) => {
    const s = simRef.current;
    const a = s.agents.find((x) => x.id === id);
    if (!a) return;
    const from = a.status;
    let na: LiveAgent;
    if (action === "pause" && (from === "running" || from === "idle")) na = { ...a, status: "paused" };
    else if (action === "start" && from === "paused") na = { ...a, status: a.queue > 0 ? "running" : "idle" };
    else if ((action === "start" || action === "retry") && from === "error") {
      action = "retry";
      na = beginRestart(a);
    } else if (action === "restart" && from !== "restarting") na = beginRestart(a);
    else return;
    const verbs: Record<AgentAction, string> = { start: L.logStart, pause: L.logPause, restart: L.logRestart, retry: L.logRetry };
    let next: Sim = { ...s, agents: s.agents.map((x) => (x.id === id ? na : x)), flash: [id] };
    next = pushLog(next, fill(L.actionLine, { name: a.name, action: verbs[action] }), action === "pause" ? "warn" : "good", now());
    const active = typeof document !== "undefined" ? (document.activeElement as HTMLElement | null) : null;
    if (focusFrom && active?.dataset.act === focusFrom && rowRefs.current.get(id)?.contains(active)) pendingFocus.current = { id, sel: [focusFrom, "start", "pause", "restart"] };
    commit(next);
    announce(na);
    onAgentAction?.({ id: a.id, name: a.name, action, from, to: na.status });
  };

  const toggleExpand = (id: string) => {
    const s = simRef.current;
    const a = s.agents.find((x) => x.id === id);
    if (!a) return;
    const expanded = !a.expanded;
    if (expanded) pendingFocus.current = { id, sel: ["retry"] };
    commit({ ...s, agents: s.agents.map((x) => (x.id === id ? { ...x, expanded } : x)), flash: [] });
  };

  const setStatus = (id: string, status: AgentStatus, message?: string) => {
    const s = simRef.current;
    const a = s.agents.find((x) => x.id === id);
    if (!a || !STATUSES.includes(status)) return false;
    cancelRestart(id);
    const from = a.status;
    const na: LiveAgent = {
      ...a,
      status,
      error: status === "error" ? { code: "", at: now(), message: message || "Unknown error" } : null,
      queue: status === "running" && a.queue === 0 ? 1 : a.queue,
      expanded: status === "error" ? a.expanded : false,
    };
    let next: Sim = { ...s, agents: s.agents.map((x) => (x.id === id ? na : x)), flash: [id] };
    if (status === "error") next = pushLog(next, fill(L.failed, { name: a.name, message: na.error!.message }), "bad", now());
    commit(next);
    if (from !== status) announce(na);
    return true;
  };

  useImperativeHandle(ref, () => ({
    setStatus,
    getAgents: () =>
      simRef.current.agents.map((a) => ({ id: a.id, name: a.name, status: a.status, queue: a.queue, processed: a.processed, succeeded: a.succeeded })),
  }));

  /* ---------- paint-time effects: flash rows, bump queues, move focus ---------- */
  const lastQueue = useRef(new Map<string, number>());
  useIsoLayoutEffect(() => {
    const motion = !reduceMotion();
    sim.agents.forEach((a) => {
      const li = rowRefs.current.get(a.id);
      const prevQ = lastQueue.current.get(a.id);
      lastQueue.current.set(a.id, a.queue);
      if (!li || !motion) return;
      if (prevQ != null && prevQ !== a.queue) {
        const v = li.querySelector<HTMLElement>("[data-queue]");
        if (v) {
          v.style.color = "var(--asp-accent)";
          clearTimeout(Number(v.dataset.bumpT));
          v.dataset.bumpT = String(window.setTimeout(() => (v.style.color = ""), 500));
        }
      }
      if (sim.flash.includes(a.id)) {
        li.style.animation = "none";
        void li.offsetWidth;
        li.style.animation = "asp-flash .6s ease";
        li.addEventListener("animationend", () => (li.style.animation = ""), { once: true });
      }
    });
    const pf = pendingFocus.current;
    if (pf) {
      pendingFocus.current = null;
      const li = rowRefs.current.get(pf.id);
      for (const key of pf.sel) {
        const b = li?.querySelector<HTMLButtonElement>(`button[data-act="${key}"]`);
        if (b && !b.disabled) {
          if (document.activeElement !== b) b.focus({ preventScroll: true });
          break;
        }
      }
    }
  }, [sim]);

  /* ---------- derived ---------- */
  const A = sim.agents;
  const runCount = A.filter((a) => a.status === "running").length;
  const qTotal = A.reduce((s, a) => s + a.queue, 0);
  const pTotal = A.reduce((s, a) => s + a.processed, 0);
  const okTotal = A.reduce((s, a) => s + a.succeeded, 0);
  const perMinOf = (arr: number[]) => {
    const recent = arr.slice(-8);
    return (recent.reduce((x, y) => x + y, 0) / Math.max(1, recent.length)) * (60000 / every);
  };
  const fleetTop = Math.max(1, ...sim.fleet);
  const matches = (a: LiveAgent, f: AgentFilter) => f === "all" || a.status === f || (f === "running" && a.status === "restarting");
  const shown = A.filter((a) => matches(a, filter));
  const tickText = fill(L.tick, { n: String(sim.tick).padStart(4, "0") });

  const pickFilter = (f: AgentFilter) => {
    setFilterState(f);
    onFilterChange?.(f);
  };
  const togglePaused = () => {
    setPausedState(!paused);
    onPausedChange?.(!paused);
  };

  const statCls = (i: number) =>
    cx(
      "grid min-w-0 content-start gap-[7px] border-dashed border-(--asp-line) px-4 py-[13px] @max-[479px]:px-3 @max-[479px]:py-[11px]",
      i > 0 && "border-l",
      i === 4 && "@max-[759px]:col-span-full @max-[759px]:border-t @max-[759px]:border-l-0",
      i === 0 && "@max-[759px]:border-l-0",
      i === 2 && "@max-[479px]:border-l-0",
      i >= 2 && "@max-[479px]:border-t"
    );
  const dt = cx(mono, "text-[10px] leading-[1.2] font-medium tracking-[0.12em] text-(--asp-faint) uppercase");
  const dd = cx(mono, "m-0 flex items-baseline gap-1.5 text-xl leading-none font-semibold tracking-[-0.03em] tabular-nums @max-[479px]:text-lg");
  const label = cx(mono, "sr-only text-[10px] leading-none font-medium tracking-[0.12em] text-(--asp-faint) uppercase @max-[759px]:not-sr-only");
  const rowGrid =
    "grid grid-cols-[minmax(150px,1.25fr)_minmax(0,1.8fr)_62px_74px_128px_112px] items-center gap-x-4 [grid-template-areas:'agent_task_queue_succ_tp_act'] @max-[879px]:grid-cols-[minmax(140px,1.2fr)_minmax(0,1.5fr)_56px_68px_104px_112px] @max-[879px]:gap-x-3";

  return (
    <div className={cx("@container block w-full max-w-[980px] font-(family-name:--asp-mono) text-(--asp-ink)", className)}>
      <article
        className={cx(
          "relative grid gap-[18px] overflow-hidden rounded-[14px] border border-(--asp-line) bg-(--asp-bg) bg-[repeating-linear-gradient(to_bottom,var(--asp-scan)_0_1px,transparent_1px_3px)] px-6 pt-[22px] pb-[18px] shadow-[0_30px_60px_-44px_var(--asp-shadow),0_2px_6px_-4px_var(--asp-shadow)]",
          "before:absolute before:inset-x-0 before:top-0 before:h-0.5 before:bg-[linear-gradient(90deg,transparent,var(--asp-accent)_30%,var(--asp-accent)_70%,transparent)] before:opacity-55 before:content-['']",
          "@max-[759px]:px-[18px] @max-[759px]:pt-5 @max-[759px]:pb-4 @max-[479px]:gap-4 @max-[479px]:rounded-xl @max-[479px]:px-3.5 @max-[479px]:pt-[18px] @max-[479px]:pb-3.5"
        )}
      >
        {/* header */}
        <header className="flex flex-wrap items-start justify-between gap-x-5 gap-y-3.5 @max-[479px]:flex-col">
          <div className="grid min-w-0 gap-1.5">
            {path && (
              <span className={cx(mono, "text-[11px] leading-none font-medium tracking-[0.06em] text-(--asp-accent) before:opacity-70 before:content-['>_']")}>{path}</span>
            )}
            {title && <h2 className={cx(mono, "m-0 text-[clamp(20px,3.1cqi,25px)] leading-[1.15] font-semibold tracking-[-0.03em]")}>{title}</h2>}
            {subtitle && <p className={cx(mono, "m-0 text-[12.5px] leading-[1.4] text-(--asp-muted)")}>{subtitle}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2.5 @max-[479px]:w-full @max-[479px]:justify-between">
            <span
              className={cx(
                "inline-flex items-center gap-2 rounded-[7px] px-2.5 py-[7px] text-[11px] leading-none font-semibold tracking-[0.12em] uppercase",
                live
                  ? "bg-[color-mix(in_oklab,var(--asp-run)_10%,transparent)] text-(--asp-run) shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--asp-run)_30%,transparent)]"
                  : "bg-[color-mix(in_oklab,var(--asp-pause)_10%,transparent)] text-(--asp-pause) shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--asp-pause)_30%,transparent)]"
              )}
            >
              <i
                className={cx(
                  "size-[7px] rounded-full bg-current",
                  live && "animate-[asp-pulse_2s_ease-in-out_infinite] shadow-[0_0_8px_rgba(74,222,128,var(--asp-glow))] motion-reduce:animate-none"
                )}
              />
              <span>{live ? L.live : L.stopped}</span>
            </span>
            <span className="text-[11.5px] leading-none whitespace-nowrap text-(--asp-faint) tabular-nums">
              {tickText} · {clock ?? "--:--:--"}
            </span>
            <button
              type="button"
              aria-pressed={paused}
              onClick={togglePaused}
              className={cx(
                "inline-flex min-h-[34px] cursor-pointer appearance-none items-center justify-center gap-[7px] rounded-lg border border-(--asp-line) bg-(--asp-row) px-3 text-xs leading-none font-semibold text-(--asp-ink) transition-[background,border-color,color,transform] duration-200 hover:border-(--asp-accent) hover:text-(--asp-accent) active:translate-y-px aria-pressed:border-(--asp-accent) aria-pressed:bg-(--asp-accent) aria-pressed:text-(--asp-bg) motion-reduce:transition-none motion-reduce:active:translate-y-0 @max-[479px]:flex-[1_1_100%]",
                focusRing
              )}
            >
              {live ? <PauseIcon className="size-[13px] flex-none" /> : <PlayIcon className="size-[13px] flex-none" />}
              {live ? L.pauseLive : L.resumeLive}
            </button>
          </div>
        </header>

        {/* summary */}
        <dl className="m-0 grid grid-cols-[repeat(4,minmax(0,1fr))_minmax(0,1.5fr)] rounded-[10px] border border-(--asp-line) bg-(--asp-row) @max-[759px]:grid-cols-4 @max-[479px]:grid-cols-2">
          <div className={statCls(0)}>
            <dt className={dt}>{L.agentsRunning}</dt>
            <dd className={dd}>
              <span>{int(runCount)}</span>
              <small className="text-[11px] leading-none font-normal tracking-normal text-(--asp-faint)">/ {int(A.length)}</small>
            </dd>
          </div>
          <div className={statCls(1)}>
            <dt className={dt}>{L.queue}</dt>
            <dd className={dd}>{int(qTotal)}</dd>
          </div>
          <div className={statCls(2)}>
            <dt className={dt}>{L.processed}</dt>
            <dd className={dd}>{int(pTotal)}</dd>
          </div>
          <div className={statCls(3)}>
            <dt className={dt}>{L.success}</dt>
            <dd className={dd}>{pct(pTotal > 0 ? (okTotal / pTotal) * 100 : null)}</dd>
          </div>
          <div className={statCls(4)}>
            <dt className={dt}>{L.throughput}</dt>
            <dd className={cx(dd, "items-end justify-between")}>
              <span>
                ≈{int(perMinOf(sim.fleet))} <small className="text-[11px] leading-none font-normal tracking-normal text-(--asp-faint)">{L.perMin}</small>
              </span>
              <span aria-hidden="true" className="flex h-6 max-w-[150px] flex-1 items-end gap-0.5 @max-[759px]:max-w-none">
                {sim.fleet.map((v, i) => (
                  <span
                    key={i}
                    style={{ height: `max(2px, ${((v / fleetTop) * 100).toFixed(1)}%)` }}
                    className="min-w-0.5 flex-1 rounded-[1px] bg-(--asp-run) opacity-80 transition-[height] duration-350 ease-in-out last:opacity-100 last:shadow-[0_0_6px_rgba(74,222,128,var(--asp-glow))] motion-reduce:transition-none"
                  />
                ))}
              </span>
            </dd>
          </div>
        </dl>

        {/* filters */}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5">
          <div role="group" aria-label={L.filterLabel} className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => {
              const n = f === "all" ? A.length : A.filter((a) => matches(a, f)).length;
              return (
                <button
                  key={f}
                  type="button"
                  aria-pressed={filter === f}
                  onClick={() => pickFilter(f)}
                  className={cx(
                    "inline-flex cursor-pointer appearance-none items-center gap-2 rounded-[7px] border border-(--asp-line) bg-transparent px-2.5 py-[7px] text-xs leading-none font-medium text-(--asp-muted) transition-[background,color,border-color] duration-200 hover:border-(--asp-faint) hover:text-(--asp-ink) aria-pressed:border-(--asp-accent) aria-pressed:bg-(--asp-accent-soft) aria-pressed:text-(--asp-ink) motion-reduce:transition-none",
                    focusRing
                  )}
                >
                  {f !== "all" && <i className={cx("size-1.5 rounded-full bg-(--asp-c)", COLOR[f])} />}
                  <span>{L[f]}</span>
                  <b className="font-semibold text-(--asp-ink) tabular-nums">{int(n)}</b>
                </button>
              );
            })}
          </div>
          <span className="text-[11.5px] leading-[1.3] text-(--asp-faint) @max-[479px]:hidden">{fill(L.hint, { s: (every / 1000).toLocaleString(locale) })}</span>
        </div>

        {/* column heads */}
        <div aria-hidden="true" className={cx(rowGrid, "px-3.5 text-[10px] leading-none font-medium tracking-[0.12em] text-(--asp-faint) uppercase @max-[759px]:hidden")}>
          <span>{L.agent}</span>
          <span>{L.task}</span>
          <span className="text-right">{L.queue}</span>
          <span className="text-right">{L.success}</span>
          <span>{L.throughput}</span>
          <span className="text-right">{L.actions}</span>
        </div>

        {/* agents */}
        {shown.length > 0 && (
          <ul className="m-0 -mt-2.5 grid list-none gap-1.5 p-0 @max-[759px]:mt-0">
            {shown.map((a) => (
              <AgentRow
                key={a.id}
                a={a}
                L={L}
                uid={uid}
                live={live}
                rowGrid={rowGrid}
                label={label}
                int={int}
                pct={pct}
                perMin={perMinOf(a.history)}
                rowRef={(el) => {
                  if (!el) return;
                  rowRefs.current.set(a.id, el);
                  return () => {
                    if (rowRefs.current.get(a.id) === el) rowRefs.current.delete(a.id);
                  };
                }}
                onAct={(action) => act(a.id, action, action)}
                onExpand={() => toggleExpand(a.id)}
              />
            ))}
          </ul>
        )}
        {shown.length === 0 && (
          <p className="m-0 -mt-1.5 rounded-[10px] border border-dashed border-(--asp-line) p-[22px] text-center text-[12.5px] leading-[1.4] text-(--asp-faint)">{L.empty}</p>
        )}

        {/* event log */}
        <section className="grid gap-2 border-t border-dashed border-(--asp-line) pt-3.5">
          <h3 className="m-0 flex justify-between gap-2 text-[10px] leading-none font-medium tracking-[0.12em] text-(--asp-faint) uppercase">
            <span>{L.log}</span>
            <span>{tickText}</span>
          </h3>
          <ol className="m-0 grid min-h-[95px] list-none content-end gap-[3px] p-0">
            {sim.log.map((it) => (
              <li
                key={it.key}
                className="grid animate-[asp-in_.3s_ease] grid-cols-[66px_minmax(0,1fr)] gap-2.5 text-[11.5px] leading-4 text-(--asp-muted) last:text-(--asp-ink) motion-reduce:animate-none @max-[479px]:grid-cols-[58px_minmax(0,1fr)] @max-[479px]:gap-2 @max-[479px]:text-[11px]"
              >
                <span className="text-(--asp-faint) tabular-nums">{it.time ?? "--:--:--"}</span>
                <span
                  className={cx(
                    "truncate",
                    it.tone === "good" && "text-(--asp-run)",
                    it.tone === "bad" && "text-(--asp-err)",
                    it.tone === "warn" && "text-(--asp-pause)"
                  )}
                >
                  {it.text}
                </span>
              </li>
            ))}
          </ol>
        </section>
        <p className="sr-only" aria-live="polite">
          {say}
        </p>
      </article>
    </div>
  );
}

function AgentRow({
  a,
  L,
  uid,
  live,
  rowGrid,
  label,
  int,
  pct,
  perMin,
  rowRef,
  onAct,
  onExpand,
}: {
  a: LiveAgent;
  L: AgentStatusPanelLabels;
  uid: string;
  live: boolean;
  rowGrid: string;
  label: string;
  int: (v: number) => string;
  pct: (v: number | null) => string;
  perMin: number;
  rowRef: (el: HTMLLIElement | null) => void | (() => void);
  onAct: (action: AgentAction) => void;
  onExpand: () => void;
}) {
  const s = a.status;
  const isErr = s === "error" && !!a.error;
  const expanded = isErr && a.expanded;
  const detId = `${uid}-${a.id.replace(/[^\w-]/g, "")}-err`;
  const taskText = isErr
    ? `${a.error!.code ? "ERR " + a.error!.code + " · " : ""}${a.error!.message}`
    : s === "restarting"
      ? L.restartingTask
      : s === "idle" && a.queue === 0
        ? L.waiting
        : a.task || "—";
  const top = Math.max(1, Math.ceil(a.load * 2), ...a.history);
  const busy = s === "restarting";

  const iconBtn = (key: "start" | "pause" | "restart", disabled: boolean, icon: ReactNode, hover: string) => (
    <button
      type="button"
      data-act={key}
      data-tip={L[key]}
      aria-label={`${L[key]} ${a.name}`}
      disabled={disabled}
      onClick={() => onAct(key)}
      className={cx(
        "relative grid size-[34px] cursor-pointer appearance-none place-items-center rounded-lg border border-(--asp-line) bg-transparent text-(--asp-muted) transition-[background,color,border-color,transform] duration-200 enabled:hover:bg-(--asp-bg) enabled:active:translate-y-px disabled:cursor-default disabled:opacity-30 motion-reduce:transition-none motion-reduce:enabled:active:translate-y-0 @max-[479px]:h-9 @max-[479px]:w-10",
        "after:pointer-events-none after:absolute after:bottom-[calc(100%+7px)] after:left-1/2 after:z-[3] after:translate-x-[-50%] after:translate-y-[3px] after:rounded-[5px] after:bg-(--asp-ink) after:px-[7px] after:py-[5px] after:text-[10.5px] after:leading-none after:font-semibold after:whitespace-nowrap after:text-(--asp-bg) after:opacity-0 after:transition-[opacity,transform] after:duration-150 after:content-[attr(data-tip)] enabled:hover:after:translate-y-0 enabled:hover:after:opacity-100 focus-visible:after:translate-y-0 focus-visible:after:opacity-100 motion-reduce:after:transition-none",
        hover,
        focusRing
      )}
    >
      {icon}
    </button>
  );

  return (
    <li
      ref={rowRef}
      data-status={s}
      className={cx(
        rowGrid,
        "relative gap-y-2.5 rounded-[10px] border bg-(--asp-row) px-3.5 py-3 transition-[background,border-color] duration-300 hover:bg-(--asp-row-hover) motion-reduce:transition-none",
        "before:absolute before:top-2.5 before:bottom-2.5 before:-left-px before:w-[3px] before:rounded-r-[3px] before:bg-(--asp-c) before:opacity-90 before:content-['']",
        s === "error" ? "border-[color-mix(in_oklab,var(--asp-err)_40%,var(--asp-line))]" : "border-(--asp-line)",
        "@max-[759px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.4fr)_auto] @max-[759px]:gap-y-3 @max-[759px]:py-3.5 @max-[759px]:pr-3.5 @max-[759px]:pl-4 @max-[759px]:[grid-template-areas:'agent_agent_agent_act'_'task_task_task_task'_'queue_succ_tp_tp']",
        "@max-[479px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)] @max-[479px]:py-[13px] @max-[479px]:pr-3 @max-[479px]:pl-3.5 @max-[479px]:[grid-template-areas:'agent_agent_agent'_'act_act_act'_'task_task_task'_'queue_succ_tp']",
        COLOR[s]
      )}
    >
      <div className="flex min-w-0 items-center gap-[11px] [grid-area:agent]">
        <span
          aria-hidden="true"
          className={cx(
            "size-2.5 flex-none rounded-full bg-(--asp-c) shadow-[0_0_0_3px_color-mix(in_oklab,var(--asp-c)_18%,transparent),0_0_10px_color-mix(in_oklab,var(--asp-c)_calc(var(--asp-glow)*100%),transparent)]",
            s === "running" && live && "animate-[asp-pulse_2.4s_ease-in-out_infinite] motion-reduce:animate-none",
            s === "restarting" && "animate-[asp-pulse_.7s_linear_infinite] motion-reduce:animate-none"
          )}
        />
        <div className="grid min-w-0 gap-[5px]">
          <h3 className="m-0 truncate text-[13.5px] leading-[1.2] font-semibold tracking-[-0.02em]">{a.name}</h3>
          <span className="truncate text-[11px] leading-[1.2] text-(--asp-faint)">
            <span className="text-[10.5px] font-semibold tracking-[0.08em] text-(--asp-c) uppercase">{L[s]}</span>
            {` · ${a.id}${a.model ? " · " + a.model : ""}`}
          </span>
        </div>
      </div>

      <div className="grid min-w-0 gap-1 [grid-area:task]">
        <span className={label}>{L.task}</span>
        <span
          title={taskText}
          className={cx(
            "truncate font-(family-name:--asp-sans) text-[13px] leading-[1.35] @max-[759px]:whitespace-normal",
            s === "running" ? "text-(--asp-ink)" : s === "error" ? "text-(--asp-err)" : "text-(--asp-muted)"
          )}
        >
          {taskText}
        </span>
        {isErr && (
          <button
            type="button"
            data-act="expand"
            aria-expanded={expanded}
            aria-controls={detId}
            onClick={onExpand}
            className={cx(
              "inline-flex cursor-pointer appearance-none items-center gap-[5px] justify-self-start border-0 bg-transparent py-[3px] text-[11px] leading-none font-semibold tracking-[0.04em] text-(--asp-err) underline underline-offset-3",
              focusRing
            )}
          >
            {expanded ? L.hideError : L.showError}
            <ChevronIcon className={cx("size-2.5 transition-transform duration-250 ease-in-out motion-reduce:transition-none", expanded && "rotate-180")} />
          </button>
        )}
      </div>

      <div className="grid min-w-0 gap-1 text-right [grid-area:queue] @max-[759px]:self-stretch @max-[759px]:border-t @max-[759px]:border-dashed @max-[759px]:border-(--asp-line) @max-[759px]:pt-2.5 @max-[759px]:text-left">
        <span className={label}>{L.queue}</span>
        <span data-queue="" className="text-sm leading-none font-semibold tracking-[-0.02em] tabular-nums">
          {int(a.queue)}
        </span>
      </div>
      <div className="grid min-w-0 gap-1 text-right [grid-area:succ] @max-[759px]:self-stretch @max-[759px]:border-t @max-[759px]:border-dashed @max-[759px]:border-(--asp-line) @max-[759px]:pt-2.5 @max-[759px]:text-left">
        <span className={label}>{L.success}</span>
        <span className="text-sm leading-none font-semibold tracking-[-0.02em] tabular-nums">{pct(a.processed > 0 ? (a.succeeded / a.processed) * 100 : null)}</span>
      </div>
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-end gap-x-2 gap-y-1 [grid-area:tp] @max-[759px]:self-stretch @max-[759px]:border-t @max-[759px]:border-dashed @max-[759px]:border-(--asp-line) @max-[759px]:pt-2.5 @max-[479px]:grid-cols-[minmax(0,1fr)] @max-[479px]:gap-y-[5px]">
        <span className={cx(label, "@max-[759px]:col-span-full")}>{L.throughput}</span>
        <span aria-hidden="true" className="flex h-[22px] items-end gap-0.5 @max-[479px]:h-[18px]">
          {Array.from({ length: HISTORY }, (_, i) => (
            <span
              key={i}
              style={{ height: `max(2px, ${(((a.history[i] || 0) / top) * 100).toFixed(1)}%)` }}
              className={cx("min-w-0.5 flex-1 rounded-[1px] bg-(--asp-c) transition-[height] duration-350 ease-in-out motion-reduce:transition-none", s === "running" ? "opacity-75" : "opacity-30")}
            />
          ))}
        </span>
        <span className="text-[11.5px] leading-none font-medium tracking-[-0.02em] whitespace-nowrap text-(--asp-muted) tabular-nums">
          ≈{int(perMin)}
          {L.perMin}
        </span>
      </div>

      <div className="flex justify-end gap-1 [grid-area:act] @max-[479px]:justify-start">
        {iconBtn("start", !(s === "paused" || s === "error"), <PlayIcon className="size-3.5" />, "enabled:hover:border-(--asp-run) enabled:hover:text-(--asp-run)")}
        {iconBtn("pause", !(s === "running" || s === "idle"), <PauseIcon className="size-3.5" />, "enabled:hover:border-(--asp-pause) enabled:hover:text-(--asp-pause)")}
        {iconBtn("restart", busy, <RestartIcon className="size-3.5" />, "enabled:hover:border-(--asp-restart) enabled:hover:text-(--asp-restart)")}
      </div>

      {expanded && a.error && (
        <div
          id={detId}
          className="col-span-full grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 gap-y-3 rounded-lg border border-dashed border-[color-mix(in_oklab,var(--asp-err)_45%,transparent)] bg-[color-mix(in_oklab,var(--asp-err)_7%,var(--asp-bg))] px-3.5 py-3 @max-[479px]:grid-cols-1"
        >
          <pre className="m-0 font-(family-name:--asp-mono) text-xs leading-[1.6] [overflow-wrap:anywhere] whitespace-pre-wrap text-(--asp-ink)">
            <b className="font-semibold text-(--asp-err)">{`[${a.error.at || "--:--"}] ${a.error.code ? "ERR " + a.error.code : "ERROR"}`}</b>
            {`  ${a.id} · ${a.name}\n${a.error.message}`}
          </pre>
          <button
            type="button"
            data-act="retry"
            disabled={busy}
            onClick={() => onAct("retry")}
            className={cx(
              "inline-flex min-h-[34px] cursor-pointer appearance-none items-center justify-center gap-[7px] rounded-lg border border-(--asp-err) bg-(--asp-row) px-3 text-xs leading-none font-semibold text-(--asp-err) transition-[background,border-color,color,transform] duration-200 enabled:hover:bg-(--asp-err) enabled:hover:text-(--asp-bg) enabled:active:translate-y-px disabled:cursor-default disabled:opacity-45 motion-reduce:transition-none",
              focusRing
            )}
          >
            <RestartIcon className="size-[13px] flex-none" />
            {L.retry}
          </button>
        </div>
      )}
    </li>
  );
}

export default AgentStatusPanel;
