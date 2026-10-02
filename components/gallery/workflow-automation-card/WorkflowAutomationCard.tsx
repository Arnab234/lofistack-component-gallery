"use client";

import {
  Fragment,
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

export type WorkflowNodeType = "trigger" | "condition" | "action" | "wait";
export type WorkflowIcon = "form" | "bolt" | "branch" | "chat" | "user" | "mail" | "list" | "sms" | "clock" | "phone" | "task" | "bell" | "flow";

export interface WorkflowNode {
  /** Unique key. */
  id: string;
  type: WorkflowNodeType;
  title?: string;
  /** Short line under the title on the canvas. */
  detail?: string;
  icon?: WorkflowIcon;
  /** Shown in the side panel. */
  description?: string;
  /** Settings shown in the side panel, as { Label: Value }. */
  config?: Record<string, string>;
  /** Contacts that reached the step in the stats period. */
  runs?: number;
  /** Fixed test-run time in ms. Worked out from the id when left out. */
  testMs?: number;
  /** Condition only: label of the test switch that picks the branch. */
  test?: string;
  /** Condition only: starting value of the test switch. Defaults to true (yes). */
  testDefault?: boolean;
  /** Condition only: steps on the yes branch. Branches join again at the next step. */
  yes?: WorkflowNode[];
  /** Condition only: steps on the no branch. */
  no?: WorkflowNode[];
}

export interface WorkflowStats {
  period?: string;
  runs?: number;
  succeeded?: number;
  avgSeconds?: number;
  lastRun?: string;
}

export interface WorkflowTestContact {
  name?: string;
  note?: string;
}

export type WorkflowRunStatus = "started" | "paused" | "resumed" | "stopped" | "completed";

export interface WorkflowRunEvent {
  status: WorkflowRunStatus;
  workflow: string;
  step: number;
  steps: number;
  totalMs: number;
  /** Test switch values by condition id (true = yes branch). */
  branches: Record<string, boolean>;
  /** Ids of the steps finished so far. */
  path: string[];
}

export interface WorkflowNodeSelect {
  id: string;
  type: WorkflowNodeType;
  title: string;
  config: Record<string, string>;
}

export interface WorkflowAutomationLabels {
  on: string;
  off: string;
  onSub: string;
  offSub: string;
  switchLabel: string;
  runs: string;
  success: string;
  avg: string;
  last: string;
  trigger: string;
  condition: string;
  action: string;
  wait: string;
  yes: string;
  no: string;
  end: string;
  yesVal: string;
  noVal: string;
  tabNode: string;
  tabLog: string;
  reached: string;
  reachedSub: string;
  steps: string;
  testRun: string;
  runAgain: string;
  pause: string;
  resume: string;
  stop: string;
  idle: string;
  idleSub: string;
  running: string;
  runningSub: string;
  paused: string;
  pausedSub: string;
  done: string;
  doneSub: string;
  stopped: string;
  stoppedSub: string;
  emptyLog: string;
  waitSkip: string;
  branchTo: string;
  total: string;
  offNote: string;
  testContact: string;
}

/** Imperative handle: drive the test run from code. */
export interface WorkflowAutomationHandle {
  run: () => void;
  pause: () => void;
  stop: () => void;
}

export interface WorkflowAutomationCardProps {
  eyebrow?: string;
  /** Workflow name (the card title). */
  name: string;
  subtitle?: string;
  /** Reference code shown in the blueprint title block, e.g. "WF-0217". */
  refId?: string;
  /** Revision shown in the blueprint title block, e.g. "Rev 4". */
  revision?: string;
  stats?: WorkflowStats;
  testContact?: WorkflowTestContact;
  /** Steps in order. Conditions carry yes / no branches. */
  flow: WorkflowNode[];
  /** Controlled on/off state. */
  enabled?: boolean;
  /** Initial on/off state when uncontrolled. */
  defaultEnabled?: boolean;
  /** Fires when the on/off switch is pressed. */
  onToggle?: (enabled: boolean) => void;
  /** Fires when a step is opened. */
  onNodeSelect?: (detail: WorkflowNodeSelect) => void;
  /** Fires when a test run starts, pauses, resumes, stops or completes. */
  onRun?: (detail: WorkflowRunEvent) => void;
  labels?: Partial<WorkflowAutomationLabels>;
  /** Number locale. */
  locale?: string;
  ref?: Ref<WorkflowAutomationHandle>;
  className?: string;
}

const LABELS: WorkflowAutomationLabels = {
  on: "Active",
  off: "Off",
  onSub: "New contacts enter",
  offSub: "No new contacts enter",
  switchLabel: "Workflow on",
  runs: "Runs",
  success: "Success rate",
  avg: "Avg. run time",
  last: "Last run",
  trigger: "Trigger",
  condition: "If / else",
  action: "Action",
  wait: "Wait",
  yes: "If yes",
  no: "If no",
  end: "End",
  yesVal: "Yes",
  noVal: "No",
  tabNode: "Step",
  tabLog: "Test log",
  reached: "Reached this step",
  reachedSub: "{n} of {total} contacts · {pct}",
  steps: "{n} nodes",
  testRun: "Test run",
  runAgain: "Run again",
  pause: "Pause",
  resume: "Resume",
  stop: "Stop",
  idle: "Ready to test",
  idleSub: "Pick the test switches, then press Test run.",
  running: "Running",
  runningSub: "step {k} of {n}",
  paused: "Paused",
  pausedSub: "at step {k} of {n}",
  done: "Completed",
  doneSub: "{n} steps in {ms}",
  stopped: "Stopped",
  stoppedSub: "after {k} of {n} steps",
  emptyLog: "No test run yet. The run follows the branch set by the test switches and skips any waits.",
  waitSkip: "Skipped in test, live contacts wait {d}",
  branchTo: "→ {branch} branch",
  total: "Total",
  offNote: "The workflow is off, but test runs still work.",
  testContact: "Test contact",
};

/* ---------- icons ---------- */
const ICONS: Record<WorkflowIcon, ReactNode> = {
  form: (
    <>
      <path d="M6 3.5h8l3 3V20a.5.5 0 0 1-.5.5h-10A.5.5 0 0 1 6 20z" />
      <path d="M9 10h6M9 13.5h6M9 17h3.5" />
    </>
  ),
  bolt: <path d="M13 3 5.5 13.5H12L11 21l7.5-10.5H12z" />,
  branch: (
    <>
      <circle cx="7" cy="5.5" r="2" />
      <circle cx="7" cy="18.5" r="2" />
      <circle cx="17" cy="9" r="2" />
      <path d="M7 7.5v9M17 11c0 3-4 3.5-8.5 6" />
    </>
  ),
  chat: (
    <>
      <path d="M4.5 6.5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H11l-4 3.5V15.5H6.5a2 2 0 0 1-2-2z" />
      <path d="M9 10h.01M12 10h.01M15 10h.01" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" />
    </>
  ),
  mail: (
    <>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </>
  ),
  list: (
    <>
      <path d="M9 6.5h11M9 12h11M9 17.5h11" />
      <circle cx="5" cy="6.5" r="1" />
      <circle cx="5" cy="12" r="1" />
      <circle cx="5" cy="17.5" r="1" />
    </>
  ),
  sms: (
    <>
      <rect x="6.5" y="2.5" width="11" height="19" rx="2.5" />
      <path d="M10.5 18.5h3M9.5 8.5h5M9.5 11.5h3" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  phone: <path d="M6.5 3.5h3l1.5 4-2 1.5a10 10 0 0 0 6 6l1.5-2 4 1.5v3a2 2 0 0 1-2 2A15 15 0 0 1 4.5 5.5a2 2 0 0 1 2-2z" />,
  task: (
    <>
      <rect x="4.5" y="4.5" width="15" height="15" rx="3" />
      <path d="m8.5 12 2.5 2.5 4.5-5" />
    </>
  ),
  bell: (
    <>
      <path d="M6.5 16.5V11a5.5 5.5 0 0 1 11 0v5.5l1.5 2h-14z" />
      <path d="M10 20.5a2 2 0 0 0 4 0" />
    </>
  ),
  flow: (
    <>
      <rect x="3.5" y="3.5" width="7" height="5" rx="1.5" />
      <rect x="13.5" y="15.5" width="7" height="5" rx="1.5" />
      <path d="M7 8.5v4.5a2 2 0 0 0 2 2h4.5" />
    </>
  ),
};
const TYPE_ICON: Record<WorkflowNodeType, WorkflowIcon> = { trigger: "bolt", condition: "branch", action: "task", wait: "clock" };

function Icon({ name, className }: { name: WorkflowIcon; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      {ICONS[name] ?? ICONS.task}
    </svg>
  );
}
const CheckIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
    <path d="M2.5 6.3 5 8.6 9.6 3.6" />
  </svg>
);
const SkipIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
    <path d="m3 3 3 3-3 3M7 3l3 3-3 3" />
  </svg>
);
const StopIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 12 12" fill="currentColor" aria-hidden="true" className={className}>
    <rect x="3" y="3" width="6" height="6" rx="1" />
  </svg>
);
const PlayIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 12 12" fill="currentColor" aria-hidden="true" className={className}>
    <path d="M3 1.8v8.4L10 6z" />
  </svg>
);
const PauseIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 12 12" fill="currentColor" aria-hidden="true" className={className}>
    <rect x="2.5" y="2" width="2.6" height="8" rx=".6" />
    <rect x="6.9" y="2" width="2.6" height="8" rx=".6" />
  </svg>
);

/* ---------- helpers ---------- */
const TYPES: WorkflowNodeType[] = ["trigger", "condition", "action", "wait"];
const typeOf = (n: WorkflowNode): WorkflowNodeType => (TYPES.includes(n.type) ? n.type : "action");
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const fill = (s: string, vars: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ""));
const reduceMotion = () => typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;
const hash = (s: string) => {
  let h = 2166136261;
  for (const c of String(s)) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
};
const testMs = (n: WorkflowNode) => {
  if (isNum(n.testMs)) return Math.max(0, Math.round(n.testMs));
  const h = hash(n.id || n.title || "");
  const t = typeOf(n);
  return t === "trigger" ? 40 + (h % 70) : t === "condition" ? 4 + (h % 14) : t === "wait" ? 0 : 120 + (h % 340);
};
const valid = (n: unknown): n is WorkflowNode => !!n && typeof n === "object";

interface Edge {
  from: string;
  to: string;
  kind: "line" | "split" | "merge";
  branch?: "yes" | "no";
}
const edgeKey = (e: { from: string; to: string }) => `${e.from}>${e.to}`;

/** Every node in walk order plus the connector edges between them. */
function buildGraph(flow: WorkflowNode[]) {
  const nodes: WorkflowNode[] = [];
  const edges: Edge[] = [];
  type Prev = { id: string; kind: Edge["kind"]; branch?: "yes" | "no" };
  const seq = (list: WorkflowNode[] | undefined, prev: Prev[]): Prev[] => {
    (Array.isArray(list) ? list : []).filter(valid).forEach((n) => {
      nodes.push(n);
      prev.forEach((p) => edges.push({ from: p.id, to: n.id, kind: p.kind, branch: p.branch }));
      if (typeOf(n) === "condition") {
        const ends: Prev[] = [];
        (["yes", "no"] as const).forEach((b) => {
          const branch = Array.isArray(n[b]) ? (n[b] as WorkflowNode[]) : [];
          const last = seq(branch, [{ id: n.id, kind: "split", branch: b }]);
          if (branch.length) ends.push(...last.map((x) => ({ id: x.id, kind: "merge" as const })));
          else ends.push({ id: n.id, kind: "line" });
        });
        prev = ends.filter((x, i, a) => a.findIndex((y) => y.id === x.id) === i);
      } else prev = [{ id: n.id, kind: "line" }];
    });
    return prev;
  };
  const last = seq(flow, []);
  last.forEach((p) => edges.push({ from: p.id, to: "__end", kind: p.kind === "merge" ? "merge" : "line" }));
  // de-duplicate edges with the same key
  const uniq = edges.filter((e, i, a) => a.findIndex((x) => edgeKey(x) === edgeKey(e)) === i);
  return { nodes, edges: uniq, hasEnd: last.length > 0 };
}

interface Step {
  node: WorkflowNode;
  edge: string | null;
  ms: number;
  branch?: "yes" | "no";
  skip?: string[];
}

function plan(flow: WorkflowNode[], tests: (id: string) => boolean) {
  const steps: Step[] = [];
  const skip = new Set<string>();
  const collect = (list?: WorkflowNode[]) =>
    (Array.isArray(list) ? list : []).filter(valid).forEach((n) => {
      skip.add(n.id);
      if (n.type === "condition") {
        collect(n.yes);
        collect(n.no);
      }
    });
  const walk = (list: WorkflowNode[] | undefined, from: string | null): string | null => {
    (Array.isArray(list) ? list : []).filter(valid).forEach((n) => {
      const step: Step = { node: n, edge: from ? `${from}>${n.id}` : null, ms: testMs(n) };
      steps.push(step);
      if (typeOf(n) === "condition") {
        const branch = tests(n.id) ? "yes" : "no";
        step.branch = branch;
        step.skip = [];
        const before = new Set(skip);
        collect(n[branch === "yes" ? "no" : "yes"]);
        skip.forEach((id) => {
          if (!before.has(id)) step.skip!.push(id);
        });
        const taken = Array.isArray(n[branch]) ? (n[branch] as WorkflowNode[]) : [];
        from = taken.length ? walk(taken, n.id) : n.id;
      } else from = n.id;
    });
    return from;
  };
  const last = walk(flow, null);
  return { steps, end: last ? `${last}>__end` : null };
}

type RunState = "running" | "paused" | "done" | "stopped";
interface LogItem {
  key: number;
  kind: "ok" | "skip" | "stop";
  title: string;
  sub: string;
  ms: number | null;
}
interface Run {
  plan: ReturnType<typeof plan>;
  i: number;
  phase: 0 | 1 | 2;
  state: RunState;
  total: number;
  log: LogItem[];
  /** Delay before the next tick. */
  wait: number;
  nodes: Record<string, "run" | "done" | "skip">;
  wires: Record<string, "live" | "done" | "skip">;
  pills: Record<string, "taken" | "skip">;
  endDone: boolean;
}

const TONE: Record<WorkflowNodeType, string> = {
  trigger: "[--wac-t:var(--wac-amber)]",
  condition: "[--wac-t:var(--wac-teal)]",
  action: "[--wac-t:var(--wac-cyan)]",
  wait: "[--wac-t:var(--wac-peri)]",
};
const monoK = "font-(family-name:--wac-mono) uppercase";
const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--wac-cyan)";

/**
 * An automation drawn as a node graph on a blueprint grid: trigger, if / else
 * branches, actions and a wait. Switch it on or off, open any step's settings,
 * and run a test contact through it step by step with a timed log.
 */
export function WorkflowAutomationCard({
  eyebrow,
  name,
  subtitle,
  refId,
  revision,
  stats = {},
  testContact = {},
  flow,
  enabled: enabledProp,
  defaultEnabled = true,
  onToggle,
  onNodeSelect,
  onRun,
  labels,
  locale = "en-US",
  ref,
  className,
}: WorkflowAutomationCardProps) {
  const L = useMemo(() => ({ ...LABELS, ...labels }), [labels]);
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const int = (v: number) => Math.round(v).toLocaleString(locale);
  const graph = useMemo(() => buildGraph(flow), [flow]);
  const all = graph.nodes;

  const [enabledState, setEnabledState] = useState(defaultEnabled);
  const enabled = enabledProp ?? enabledState;

  const [testsState, setTests] = useState<Record<string, boolean>>({});
  const testOf = useCallback(
    (id: string) => {
      if (id in testsState) return testsState[id];
      const n = all.find((x) => x.id === id);
      return n ? n.testDefault !== false : true;
    },
    [testsState, all]
  );

  const [sel, setSel] = useState<string | null>(all[0]?.id ?? null);
  const [tab, setTab] = useState<"node" | "log">("node");
  const [run, setRun] = useState<Run | null>(null);
  const [live, setLive] = useState("");
  const logKey = useRef(0);

  // new data: back to the first step, clear the run
  const [graphFor, setGraphFor] = useState(graph);
  if (graphFor !== graph) {
    setGraphFor(graph);
    setSel(all[0]?.id ?? null);
    setTab("node");
    setRun(null);
  }
  const selected = all.find((n) => n.id === sel) ?? all[0] ?? null;

  const busy = !!run && (run.state === "running" || run.state === "paused");
  const planSteps = useMemo(() => plan(flow, testOf).steps.length, [flow, testOf]);

  const snapshot = (r: Run | null, status: WorkflowRunStatus): WorkflowRunEvent => {
    const branches: Record<string, boolean> = {};
    all.filter((n) => typeOf(n) === "condition").forEach((n) => (branches[n.id] = testOf(n.id)));
    return {
      status,
      workflow: name || "",
      step: r ? r.i : 0,
      steps: r ? r.plan.steps.length : 0,
      totalMs: r ? r.total : 0,
      branches,
      path: r ? r.plan.steps.slice(0, r.i).map((s) => s.node.id) : [],
    };
  };

  /* ---------- run engine ---------- */
  const delay = (base: number) => (reduceMotion() ? Math.min(160, base) : base);

  const advance = useCallback(
    (r: Run): Run => {
      if (r.i >= r.plan.steps.length) {
        const wires = { ...r.wires };
        if (r.plan.end) wires[r.plan.end] = "done";
        return { ...r, wires, endDone: true, state: "done" };
      }
      const step = r.plan.steps[r.i];
      const id = step.node.id;
      if (r.phase === 0) {
        const wires = step.edge ? { ...r.wires, [step.edge]: "live" as const } : r.wires;
        return { ...r, wires, phase: 1, wait: step.edge ? delay(380) : 0 };
      }
      if (r.phase === 1) {
        const wires = step.edge ? { ...r.wires, [step.edge]: "done" as const } : r.wires;
        const t = typeOf(step.node);
        return {
          ...r,
          wires,
          nodes: { ...r.nodes, [id]: "run" },
          phase: 2,
          wait: delay(t === "wait" ? 700 : Math.max(420, Math.min(900, step.ms * 2))),
        };
      }
      const n = step.node, t = typeOf(n);
      const nodes = { ...r.nodes, [id]: "done" as const };
      const wires = { ...r.wires };
      const pills = { ...r.pills };
      let sub = n.detail || "";
      if (t === "condition" && step.branch) {
        sub = fill(L.branchTo, { branch: step.branch === "yes" ? L.yesVal : L.noVal });
        pills[`${n.id}:yes`] = step.branch === "yes" ? "taken" : "skip";
        pills[`${n.id}:no`] = step.branch === "no" ? "taken" : "skip";
        (step.skip ?? []).forEach((sid) => {
          nodes[sid] = "skip";
          graph.edges
            .filter((e) => e.from === sid || e.to === sid)
            .forEach((e) => {
              const k = edgeKey(e);
              if (wires[k] !== "done") wires[k] = "skip";
            });
        });
      }
      if (t === "wait") sub = fill(L.waitSkip, { d: n.config?.Duration || (n.title || "").replace(/^wait\s*/i, "") });
      const log: LogItem[] = [...r.log, { key: ++logKey.current, kind: t === "wait" ? "skip" : "ok", title: n.title || L[t], sub, ms: step.ms }];
      return { ...r, nodes, wires, pills, log, total: r.total + step.ms, i: r.i + 1, phase: 0, wait: delay(160) };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [L, graph]
  );

  // the clock: each running state schedules the next tick
  useEffect(() => {
    if (!run || run.state !== "running") return;
    const t = setTimeout(() => setRun((r) => (r && r.state === "running" ? advance(r) : r)), run.wait);
    return () => clearTimeout(t);
  }, [run, advance]);

  // completion
  const lastState = useRef<RunState | null>(null);
  useEffect(() => {
    const s = run?.state ?? null;
    if (s === "done" && lastState.current !== "done" && run) {
      setLive(`${L.done}. ${fill(L.doneSub, { n: run.plan.steps.length, ms: int(run.total) + " ms" })}`);
      onRun?.(snapshot(run, "completed"));
    }
    lastState.current = s;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run?.state]);

  const start = () => {
    const p = plan(flow, testOf);
    if (!p.steps.length) return;
    const r: Run = { plan: p, i: 0, phase: 0, state: "running", total: 0, log: [], wait: 0, nodes: {}, wires: {}, pills: {}, endDone: false };
    lastState.current = "running";
    setRun(r);
    setTab("log");
    setLive(`${L.running}: ${testContact.name || "Test contact"}` + (enabled ? "" : `. ${L.offNote}`));
    onRun?.(snapshot(r, "started"));
  };
  const pause = () => {
    if (!run || run.state !== "running") return;
    const r = { ...run, state: "paused" as const };
    setRun(r);
    setLive(L.paused);
    onRun?.(snapshot(r, "paused"));
  };
  const resume = () => {
    if (!run || run.state !== "paused") return;
    const r = { ...run, state: "running" as const, wait: 0 };
    setRun(r);
    onRun?.(snapshot(r, "resumed"));
  };
  const stop = () => {
    if (!run || !(run.state === "running" || run.state === "paused")) return;
    const nodes = Object.fromEntries(Object.entries(run.nodes).filter(([, v]) => v !== "run"));
    const wires = Object.fromEntries(Object.entries(run.wires).filter(([, v]) => v !== "live"));
    const r: Run = {
      ...run,
      state: "stopped",
      nodes,
      wires,
      log: [...run.log, { key: ++logKey.current, kind: "stop", title: L.stopped, sub: fill(L.stoppedSub, { k: run.i, n: run.plan.steps.length }), ms: null }],
    };
    setRun(r);
    setLive(L.stopped);
    onRun?.(snapshot(r, "stopped"));
  };
  const runOrPause = () => {
    const s = run?.state;
    if (s === "running") pause();
    else if (s === "paused") resume();
    else start();
  };

  useImperativeHandle(ref, () => ({
    run: () => {
      if (run?.state === "paused") resume();
      else if (!run || run.state !== "running") start();
    },
    pause,
    stop,
  }));

  /* ---------- interactions ---------- */
  const toggleEnabled = () => {
    const next = !enabled;
    setEnabledState(next);
    onToggle?.(next);
    setLive(next ? `${L.on}. ${L.onSub}` : `${L.off}. ${L.offSub}`);
  };
  const select = (n: WorkflowNode) => {
    setSel(n.id);
    setTab("node");
    onNodeSelect?.({ id: n.id, type: typeOf(n), title: n.title || "", config: n.config || {} });
  };
  const flipTest = (id: string) => {
    if (busy) return;
    setTests((t) => ({ ...t, [id]: !testOf(id) }));
    if (run && (run.state === "done" || run.state === "stopped")) setRun(null);
  };

  const flowRef = useRef<HTMLDivElement>(null);
  const els = useRef(new Map<string, HTMLElement>());
  const tabRefs = useRef(new Map<"node" | "log", HTMLButtonElement>());
  const setEl = (id: string) => (el: HTMLElement | null) => {
    if (!el) return;
    els.current.set(id, el);
    return () => {
      if (els.current.get(id) === el) els.current.delete(id);
    };
  };

  const onFlowKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const list = [...(flowRef.current?.querySelectorAll<HTMLButtonElement>("button[data-node]") ?? [])];
    const i = list.indexOf(document.activeElement as HTMLButtonElement);
    if (i < 0) return;
    e.preventDefault();
    list[Math.max(0, Math.min(list.length - 1, i + (e.key === "ArrowDown" ? 1 : -1)))]?.focus();
  };
  const onTabsKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
    e.preventDefault();
    const names = ["node", "log"] as const;
    const i = names.indexOf(tab);
    const j = e.key === "Home" ? 0 : e.key === "End" ? names.length - 1 : (i + (e.key === "ArrowRight" ? 1 : -1) + names.length) % names.length;
    setTab(names[j]);
    tabRefs.current.get(names[j])?.focus();
  };

  /* ---------- connector layout ---------- */
  const [wires, setWires] = useState<{ w: number; h: number; d: Record<string, string> }>({ w: 0, h: 0, d: {} });
  const layout = useCallback(() => {
    const flowEl = flowRef.current;
    if (!flowEl) return;
    const box = flowEl.getBoundingClientRect();
    if (!box.width) return;
    const pt = (el: HTMLElement, top: boolean) => {
      const r = el.getBoundingClientRect();
      return { x: r.left - box.left + r.width / 2, y: (top ? r.top : r.bottom) - box.top };
    };
    const d: Record<string, string> = {};
    graph.edges.forEach((e) => {
      const a = els.current.get(e.from), b = els.current.get(e.to);
      if (!a || !b) return;
      const A = pt(a, false), B = pt(b, true);
      if (Math.abs(A.x - B.x) < 1.5) d[edgeKey(e)] = `M${A.x} ${A.y} V${B.y}`;
      else {
        const mid = e.kind === "split" ? A.y + 20 : e.kind === "merge" ? B.y - 20 : (A.y + B.y) / 2;
        const dir = B.x > A.x ? 1 : -1;
        const r = Math.max(0, Math.min(10, Math.abs(B.x - A.x) / 2, mid - A.y, B.y - mid));
        d[edgeKey(e)] = `M${A.x} ${A.y} V${mid - r} Q${A.x} ${mid} ${A.x + dir * r} ${mid} H${B.x - dir * r} Q${B.x} ${mid} ${B.x} ${mid + r} V${B.y}`;
      }
    });
    setWires({ w: flowEl.offsetWidth, h: flowEl.offsetHeight, d });
  }, [graph]);

  useIsoLayoutEffect(() => {
    layout();
  }, [layout]);
  useEffect(() => {
    const el = flowRef.current;
    if (!el) return;
    let cancelled = false;
    document.fonts?.ready.then(() => !cancelled && layout());
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => layout());
    ro.observe(el);
    return () => {
      cancelled = true;
      ro.disconnect();
    };
  }, [layout]);

  /* ---------- derived ---------- */
  const runs = isNum(stats.runs) ? stats.runs : null;
  const ok = isNum(stats.succeeded) ? stats.succeeded : null;
  const avg = isNum(stats.avgSeconds) ? stats.avgSeconds : null;
  const statItems: Array<{ k: string; v: string; small?: string }> = [];
  if (runs != null) statItems.push({ k: L.runs, v: int(runs), small: stats.period || "" });
  if (runs && ok != null) statItems.push({ k: L.success, v: ((ok / runs) * 100).toFixed(1) + "%", small: `${int(ok)}/${int(runs)}` });
  if (avg != null) statItems.push({ k: L.avg, v: avg.toFixed(1) + " s" });
  if (stats.lastRun) statItems.push({ k: L.last, v: String(stats.lastRun) });

  const cname = testContact.name || "Test contact";
  const avatar = cname
    .split(/\s+/)
    .map((w) => w[0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const conditions = all.filter((n) => typeOf(n) === "condition");
  const stamp = [refId, revision, all.length ? fill(L.steps, { n: all.length }) : null].filter(Boolean) as string[];

  const state: RunState | "idle" = run ? run.state : "idle";
  const nSteps = run ? run.plan.steps.length : planSteps;
  const k = run ? run.i : 0;
  const rsTitle = { idle: L.idle, running: L.running, paused: L.paused, done: L.done, stopped: L.stopped }[state];
  const rsSub =
    state === "idle"
      ? L.idleSub
      : state === "running"
        ? fill(L.runningSub, { k: Math.min(k + 1, nSteps), n: nSteps })
        : state === "paused"
          ? fill(L.pausedSub, { k: Math.min(k + 1, nSteps), n: nSteps })
          : state === "done"
            ? fill(L.doneSub, { n: nSteps, ms: int(run!.total) + " ms" })
            : fill(L.stoppedSub, { k, n: nSteps });
  const logCount = run && run.log.length ? run.log.filter((x) => x.kind !== "stop").length : 0;
  const progress = nSteps ? (k / nSteps) * 100 : 0;

  const total = runs ?? (isNum(all[0]?.runs) ? (all[0].runs as number) : null);

  /* ---------- rendering pieces ---------- */
  const renderNode = (n: WorkflowNode, inBranch: boolean) => {
    const t = typeOf(n);
    const ns = run?.nodes[n.id];
    const pressed = selected?.id === n.id;
    return (
      <button
        key={n.id}
        ref={setEl(n.id)}
        type="button"
        data-node={n.id}
        aria-pressed={pressed}
        aria-controls={`${uid}-pn`}
        onClick={() => select(n)}
        className={cx(
          "group/node relative z-[1] box-border grid w-full max-w-[268px] cursor-pointer appearance-none grid-cols-[36px_minmax(0,1fr)] items-center gap-[11px] rounded-xl border bg-(--wac-node) bg-[linear-gradient(180deg,rgba(255,255,255,0.035),transparent)] py-2.5 pr-3 pl-2.5 text-left text-inherit transition-[border-color,background-color,box-shadow,opacity] duration-300 hover:border-(--wac-t) hover:bg-(--wac-node-hi) motion-reduce:transition-none",
          "before:absolute before:-top-[5px] before:left-1/2 before:-ml-[4.5px] before:size-[7px] before:rounded-full before:border-[1.5px] before:border-[color-mix(in_oklab,var(--wac-t)_70%,transparent)] before:bg-(--wac-bg) before:content-['']",
          "after:absolute after:-bottom-[5px] after:left-1/2 after:-ml-[4.5px] after:size-[7px] after:rounded-full after:border-[1.5px] after:border-[color-mix(in_oklab,var(--wac-t)_70%,transparent)] after:bg-(--wac-bg) after:content-['']",
          "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--wac-cyan)",
          t === "trigger" && "before:hidden",
          ns === "done"
            ? "border-[color-mix(in_oklab,var(--wac-ok)_70%,transparent)]"
            : ns === "run" || pressed
              ? "border-(--wac-t)"
              : "border-[color-mix(in_oklab,var(--wac-t)_45%,transparent)]",
          ns === "run"
            ? "shadow-[0_0_0_4px_color-mix(in_oklab,var(--wac-t)_22%,transparent),0_0_28px_-4px_color-mix(in_oklab,var(--wac-t)_60%,transparent)]"
            : pressed
              ? "shadow-[0_0_0_3px_color-mix(in_oklab,var(--wac-t)_24%,transparent),0_14px_30px_-18px_#000]"
              : "shadow-[0_12px_26px_-18px_#000]",
          ns === "skip" && "opacity-[0.32]",
          inBranch
            ? "@max-[479px]:grid-cols-1 @max-[479px]:justify-items-start @max-[479px]:gap-1.5 @max-[479px]:p-[9px] @max-[479px]:pb-2.5"
            : "@max-[479px]:grid-cols-[30px_minmax(0,1fr)] @max-[479px]:gap-1.5 @max-[479px]:p-[9px] @max-[479px]:pb-2.5",
          TONE[t]
        )}
      >
        <span
          className={cx(
            "grid size-9 place-items-center rounded-[9px] bg-[color-mix(in_oklab,var(--wac-t)_15%,transparent)] text-(--wac-t) shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--wac-t)_28%,transparent)] @max-[479px]:size-7 @max-[479px]:rounded-lg",
            ns === "run" && "animate-[wac-pulse_1s_ease-in-out_infinite] motion-reduce:animate-none"
          )}
        >
          <Icon name={n.icon || TYPE_ICON[t]} className="size-[18px] @max-[479px]:size-[15px]" />
        </span>
        <span className="grid min-w-0 gap-[3px]">
          <span className={cx(monoK, "text-[9.5px] leading-none font-semibold tracking-[0.12em] text-(--wac-t)")}>{L[t]}</span>
          <span className="text-[13.5px] leading-[1.25] font-semibold [overflow-wrap:anywhere] @max-[479px]:text-[12.5px]">{n.title || L[t]}</span>
          {n.detail && (
            <span className={cx("text-[11.5px] leading-[1.3] text-(--wac-muted) [overflow-wrap:anywhere]", inBranch && "@max-[479px]:hidden")}>{n.detail}</span>
          )}
        </span>
        <span
          className={cx(
            "absolute -top-[9px] -right-[9px] grid size-5 place-items-center rounded-full bg-(--wac-ok) text-[#052E16] transition-transform duration-300 ease-[cubic-bezier(.3,.8,.25,1)] motion-reduce:transition-none",
            ns === "done" ? "scale-100" : "scale-0"
          )}
        >
          <CheckIcon className="size-[11px]" />
        </span>
        <span className="sr-only">{ns === "done" ? `, ${L.done}` : ""}</span>
      </button>
    );
  };

  const renderSeq = (list: WorkflowNode[] | undefined, inBranch: boolean): ReactNode[] =>
    (Array.isArray(list) ? list : []).filter(valid).map((n) => {
      if (typeOf(n) !== "condition") return renderNode(n, inBranch);
      return (
        <Fragment key={n.id}>
          {renderNode(n, inBranch)}
          <div className="relative z-[1] grid w-full max-w-[580px] grid-cols-2 gap-x-7 @max-[479px]:gap-x-2.5">
            {(["yes", "no"] as const).map((b) => {
              const ps = run?.pills[`${n.id}:${b}`];
              return (
                <div key={b} className="grid min-w-0 content-start justify-items-center gap-10 @max-[479px]:gap-[34px]">
                  <span
                    className={cx(
                      monoK,
                      "relative z-[1] -mb-4 rounded-full border px-[9px] py-[5px] text-[10px] leading-none font-semibold tracking-[0.1em] transition-[color,border-color,opacity] duration-300 motion-reduce:transition-none",
                      ps === "taken"
                        ? "border-(--wac-teal) bg-[#0F3240] text-(--wac-ink)"
                        : cx("border-(--wac-line-strong) bg-(--wac-bg)", b === "yes" ? "text-(--wac-teal)" : "text-(--wac-muted)"),
                      ps === "skip" && "opacity-40"
                    )}
                  >
                    {L[b]}
                  </span>
                  {renderSeq(n[b], true)}
                </div>
              );
            })}
          </div>
        </Fragment>
      );
    });

  const wireCls = (key: string) => {
    const s = run?.wires[key];
    return cx(
      "fill-none stroke-(--wac-wire) [stroke-linecap:round] [stroke-width:1.6] transition-[stroke,opacity] duration-300 motion-reduce:transition-none",
      s === "live" && "animate-[wac-flow_.6s_linear_infinite] stroke-(--wac-cyan) [stroke-dasharray:6_6] [stroke-width:2] motion-reduce:animate-none motion-reduce:[stroke-dasharray:none]",
      s === "done" && "stroke-(--wac-cyan) [stroke-width:2] drop-shadow-[0_0_4px_rgba(34,211,238,0.55)]",
      s === "skip" && "opacity-[0.22] [stroke-dasharray:3_5]"
    );
  };

  const selT = selected ? typeOf(selected) : "action";
  const selRuns = selected && isNum(selected.runs) ? selected.runs : null;
  const pct = selRuns != null && total ? Math.min(100, (selRuns / total) * 100) : null;
  const tabCls =
    "relative inline-flex cursor-pointer appearance-none items-center gap-[7px] border-0 bg-transparent px-2.5 pt-3.5 pb-[13px] text-[12.5px] leading-none font-semibold text-(--wac-faint) transition-colors duration-200 after:absolute after:right-2 after:-bottom-px after:left-2 after:h-0.5 after:scale-x-0 after:rounded-xs after:bg-(--wac-cyan) after:transition-transform after:duration-300 after:ease-out-soft after:content-[''] hover:text-(--wac-ink) aria-selected:text-(--wac-ink) aria-selected:after:scale-x-100 focus-visible:rounded-md focus-visible:outline-2 focus-visible:-outline-offset-3 focus-visible:outline-(--wac-cyan) motion-reduce:transition-none motion-reduce:after:transition-none";
  const btnCls = cx(
    "inline-flex min-h-[38px] cursor-pointer appearance-none items-center justify-center gap-2 rounded-[10px] border border-(--wac-line-strong) bg-transparent px-[15px] text-[13px] leading-none font-semibold text-inherit transition-[background,border-color,color,transform,opacity] duration-200 enabled:hover:border-(--wac-cyan) enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none @max-[479px]:flex-1",
    focusRing
  );

  return (
    <div className={cx("@container block w-full max-w-[980px] font-(family-name:--wac-sans) text-(--wac-ink)", className)}>
      <article
        data-on={enabled}
        className="group/wac relative overflow-hidden rounded-2xl border border-[rgba(34,211,238,0.28)] bg-(--wac-bg) shadow-[0_0_0_1px_rgba(2,8,20,0.4),0_36px_64px_-42px_var(--wac-shadow),inset_0_1px_0_rgba(255,255,255,0.05)] [color-scheme:dark]"
      >
        {/* header */}
        <header className="flex flex-wrap items-start justify-between gap-x-5 gap-y-3.5 px-6 pt-[22px] pb-4 @max-[759px]:px-[18px] @max-[759px]:pt-5 @max-[759px]:pb-3.5 @max-[479px]:px-3.5 @max-[479px]:pt-[18px] @max-[479px]:pb-3">
          <div className="grid min-w-0 gap-1.5">
            {eyebrow && (
              <span className={cx(monoK, "inline-flex items-center gap-2 text-[10.5px] leading-none font-semibold tracking-[0.12em] text-(--wac-cyan)")}>
                <Icon name="flow" className="size-[13px]" />
                {eyebrow}
              </span>
            )}
            <h2 className="m-0 font-(family-name:--wac-display) text-[clamp(19px,3cqi,23px)] leading-[1.2] font-semibold tracking-[-0.01em] text-balance">{name}</h2>
            {subtitle && <p className="m-0 text-[12.5px] text-(--wac-muted)">{subtitle}</p>}
          </div>
          <div className="box-border flex flex-none items-center gap-3 rounded-xl border border-(--wac-line) bg-white/[0.02] py-1.5 pr-1.5 pl-3 @max-[479px]:w-full @max-[479px]:justify-between">
            <span className="grid gap-1 text-right @max-[479px]:text-left">
              <b
                className={cx(
                  "inline-flex items-center justify-end gap-[7px] text-[13px] leading-none font-semibold before:size-[7px] before:rounded-full before:transition-[background,box-shadow] before:duration-300 before:content-[''] @max-[479px]:justify-start",
                  enabled ? "before:bg-(--wac-ok) before:shadow-[0_0_0_3px_rgba(74,222,128,0.18)]" : "before:bg-(--wac-faint)"
                )}
              >
                {enabled ? L.on : L.off}
              </b>
              <small className="text-[11px] leading-[1.2] text-(--wac-faint)">{enabled ? L.onSub : L.offSub}</small>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              aria-label={L.switchLabel}
              onClick={toggleEnabled}
              className={cx(
                "relative h-[30px] w-[52px] flex-none cursor-pointer appearance-none rounded-full border border-(--wac-line-strong) bg-[#0A1830] p-0 transition-[background,border-color] duration-300 aria-checked:border-(--wac-cyan) aria-checked:bg-(--wac-cyan) motion-reduce:transition-none",
                "after:absolute after:top-[3px] after:left-[3px] after:size-[22px] after:rounded-full after:bg-(--wac-muted) after:shadow-[0_2px_6px_rgba(0,0,0,.4)] after:transition-[transform,background] after:duration-300 after:ease-[cubic-bezier(.3,.8,.25,1)] after:content-[''] aria-checked:after:translate-x-[22px] aria-checked:after:bg-white motion-reduce:after:transition-none",
                focusRing
              )}
            />
          </div>
        </header>

        {/* stats */}
        {statItems.length > 0 && (
          <dl className="m-0 grid grid-cols-4 px-6 pb-[18px] @max-[759px]:grid-cols-2 @max-[759px]:gap-y-3.5 @max-[759px]:px-[18px] @max-[759px]:pb-4 @max-[479px]:px-3.5 @max-[479px]:pb-3.5">
            {statItems.map((s) => (
              <div
                key={s.k}
                className="m-0 grid min-w-0 gap-1.5 border-l border-(--wac-line) px-4 first:border-l-0 first:pl-0 @max-[759px]:nth-3:border-l-0 @max-[759px]:nth-3:pl-0 @max-[479px]:px-2.5 @max-[479px]:first:pl-0 @max-[479px]:nth-3:pl-0"
              >
                <dt className={cx(monoK, "text-[10px] leading-[1.2] font-medium tracking-[0.1em] text-(--wac-faint)")}>{s.k}</dt>
                <dd className="m-0 font-(family-name:--wac-mono) text-lg leading-[1.1] font-semibold tracking-[-0.02em] tabular-nums [overflow-wrap:anywhere] @max-[479px]:text-base">
                  {s.v}
                  {s.small && <small className="ml-1.5 font-(family-name:--wac-sans) text-[11px] leading-none font-medium tracking-normal text-(--wac-faint)">{s.small}</small>}
                </dd>
              </div>
            ))}
          </dl>
        )}

        {/* body */}
        <div className="grid grid-cols-[minmax(0,1fr)_320px] border-t border-(--wac-line) @max-[759px]:grid-cols-1">
          <div
            className={cx(
              "relative min-w-0 bg-(--wac-bg) bg-[linear-gradient(var(--wac-grid-major)_1px,transparent_1px),linear-gradient(90deg,var(--wac-grid-major)_1px,transparent_1px),linear-gradient(var(--wac-grid)_1px,transparent_1px),linear-gradient(90deg,var(--wac-grid)_1px,transparent_1px)] bg-size-[120px_120px,120px_120px,24px_24px,24px_24px] bg-position-[-1px_-1px] transition-[filter] duration-400 ease-in-out motion-reduce:transition-none",
              "before:pointer-events-none before:absolute before:top-2.5 before:left-2.5 before:size-3.5 before:border-t before:border-l before:border-[rgba(103,232,249,0.5)] before:content-['']",
              "after:pointer-events-none after:absolute after:right-2.5 after:bottom-2.5 after:size-3.5 after:border-r after:border-b after:border-[rgba(103,232,249,0.5)] after:content-['']",
              !enabled && "brightness-92 saturate-45"
            )}
          >
            <span aria-hidden="true" className={cx(monoK, "absolute top-3 right-3.5 z-[2] text-[10px] leading-none font-medium tracking-[0.1em] text-(--wac-faint) @max-[479px]:hidden")}>
              {fill(L.steps, { n: all.length })}
            </span>
            <div
              ref={flowRef}
              onKeyDown={onFlowKey}
              className="relative grid justify-items-center gap-10 px-6 pt-[38px] pb-12 @max-[479px]:gap-[34px] @max-[479px]:px-2.5 @max-[479px]:pt-[34px] @max-[479px]:pb-[46px]"
            >
              <svg aria-hidden="true" width={wires.w} height={wires.h} viewBox={`0 0 ${wires.w || 1} ${wires.h || 1}`} className="pointer-events-none absolute top-0 left-0 z-0 overflow-visible">
                {graph.edges.map((e) => {
                  const key = edgeKey(e);
                  return wires.d[key] ? <path key={key} d={wires.d[key]} className={wireCls(key)} /> : null;
                })}
              </svg>
              {renderSeq(flow, false)}
              {graph.hasEnd && (
                <span
                  ref={setEl("__end")}
                  className={cx(
                    monoK,
                    "relative z-[1] inline-flex items-center gap-[7px] rounded-full border bg-(--wac-bg) px-[11px] py-1.5 text-[10px] leading-none font-semibold tracking-[0.12em] transition-[color,border-color] duration-300 before:size-[7px] before:rounded-xs before:bg-current before:content-[''] motion-reduce:transition-none",
                    run?.endDone ? "border-solid border-(--wac-ok) text-(--wac-ok)" : "border-dashed border-(--wac-line-strong) text-(--wac-faint)"
                  )}
                >
                  {L.end}
                </span>
              )}
            </div>
            {stamp.length > 0 && (
              <div aria-hidden="true" className={cx(monoK, "absolute bottom-3 left-3.5 z-[2] flex border border-(--wac-line-strong) text-[9.5px] leading-none font-medium tracking-[0.08em] text-(--wac-faint)")}>
                {stamp.map((s, i) => (
                  <span key={i} className={cx("px-[7px] py-[5px]", i > 0 && "border-l border-(--wac-line-strong)")}>
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* side panel */}
          <aside className="grid min-w-0 grid-rows-[auto_minmax(0,1fr)] border-l border-(--wac-line) bg-(--wac-panel) @max-[759px]:border-t @max-[759px]:border-l-0">
            <div role="tablist" onKeyDown={onTabsKey} className="flex gap-0.5 border-b border-(--wac-line) px-3.5">
              {(["node", "log"] as const).map((name) => (
                <button
                  key={name}
                  ref={(el) => {
                    if (el) tabRefs.current.set(name, el);
                  }}
                  type="button"
                  role="tab"
                  id={`${uid}-t-${name}`}
                  aria-controls={`${uid}-p${name === "node" ? "n" : "l"}`}
                  aria-selected={tab === name}
                  tabIndex={tab === name ? 0 : -1}
                  onClick={() => setTab(name)}
                  className={tabCls}
                >
                  {name === "node" ? (
                    L.tabNode
                  ) : (
                    <>
                      <span>{L.tabLog}</span>
                      {logCount > 0 && (
                        <span className="rounded-[5px] bg-white/[0.07] px-[5px] py-[3px] font-(family-name:--wac-mono) text-[10px] leading-none font-semibold text-(--wac-muted)">{logCount}</span>
                      )}
                    </>
                  )}
                </button>
              ))}
            </div>

            <section
              role="tabpanel"
              id={`${uid}-pn`}
              aria-labelledby={`${uid}-t-node`}
              hidden={tab !== "node"}
              className="grid min-w-0 content-start gap-4 px-[18px] pt-[18px] pb-5 @max-[479px]:px-3.5 @max-[479px]:pt-4 @max-[479px]:pb-[18px]"
            >
              {selected && (
                <>
                  <div className={cx("grid grid-cols-[40px_minmax(0,1fr)] items-center gap-3", TONE[selT])}>
                    <span className="grid size-10 place-items-center rounded-[10px] bg-[color-mix(in_oklab,var(--wac-t)_15%,transparent)] text-(--wac-t) shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--wac-t)_28%,transparent)]">
                      <Icon name={selected.icon || TYPE_ICON[selT]} className="size-[18px]" />
                    </span>
                    <div className="grid min-w-0 gap-[3px]">
                      <span className={cx(monoK, "text-[9.5px] leading-none font-semibold tracking-[0.12em] text-(--wac-t)")}>{L[selT]}</span>
                      <h3 className="m-0 font-(family-name:--wac-display) text-base leading-[1.25] font-semibold [overflow-wrap:anywhere]">{selected.title || L[selT]}</h3>
                    </div>
                  </div>
                  {selected.description && <p className="m-0 text-[13px] leading-[1.55] text-(--wac-muted)">{selected.description}</p>}
                  {selected.config && Object.keys(selected.config).length > 0 && (
                    <dl className="m-0 grid gap-2">
                      {Object.entries(selected.config).map(([ck, cv]) => (
                        <div key={ck} className="grid gap-[5px]">
                          <dt className={cx(monoK, "text-[10px] leading-[1.2] font-medium tracking-[0.1em] text-(--wac-faint)")}>{ck}</dt>
                          <dd className="m-0 rounded-lg border border-(--wac-line) bg-[rgba(2,10,24,0.45)] px-2.5 py-2 font-(family-name:--wac-mono) text-[12.5px] leading-[1.45] font-medium text-(--wac-ink) [overflow-wrap:anywhere]">
                            {cv == null ? "—" : String(cv)}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  )}
                  {pct != null && selRuns != null && total != null && (
                    <div className="grid gap-2 border-t border-dashed border-(--wac-line-strong) pt-3.5">
                      <div className={cx(monoK, "flex items-baseline justify-between gap-2.5 text-[10px] leading-[1.2] font-medium tracking-[0.1em] text-(--wac-faint)")}>
                        <span>{stats.period ? `${L.reached} · ${stats.period}` : L.reached}</span>
                        <b className="font-(family-name:--wac-mono) text-[13px] leading-none font-semibold tracking-normal text-(--wac-ink) normal-case">{int(selRuns)}</b>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                        <span
                          style={{ width: `${pct.toFixed(1)}%` }}
                          className="block h-full rounded-[inherit] bg-[linear-gradient(90deg,var(--wac-teal),var(--wac-cyan))] transition-[width] duration-450 ease-out-soft motion-reduce:transition-none"
                        />
                      </div>
                      <p className="m-0 text-xs text-(--wac-muted) tabular-nums">{fill(L.reachedSub, { n: int(selRuns), total: int(total), pct: pct.toFixed(1) + "%" })}</p>
                    </div>
                  )}
                </>
              )}
            </section>

            <section
              role="tabpanel"
              id={`${uid}-pl`}
              aria-labelledby={`${uid}-t-log`}
              hidden={tab !== "log"}
              className="grid min-w-0 content-start gap-4 px-[18px] pt-[18px] pb-5 @max-[479px]:px-3.5 @max-[479px]:pt-4 @max-[479px]:pb-[18px]"
            >
              <div className="flex items-center gap-2.5 rounded-[10px] border border-(--wac-line) bg-[rgba(2,10,24,0.35)] px-3 py-2.5 text-[12.5px] text-(--wac-muted)">
                <span
                  className={cx(
                    "size-2 flex-none rounded-full",
                    state === "running" && "animate-[wac-blink_1s_ease-in-out_infinite] bg-(--wac-cyan) motion-reduce:animate-none",
                    state === "paused" && "bg-(--wac-amber)",
                    state === "done" && "bg-(--wac-ok)",
                    state === "stopped" && "bg-(--wac-stop)",
                    state === "idle" && "bg-(--wac-faint)"
                  )}
                />
                <span>
                  <b className="font-semibold text-(--wac-ink)">{rsTitle}</b>
                  {" · " + rsSub + (state !== "idle" && !enabled ? ` ${L.offNote}` : "")}
                </span>
              </div>
              {!(run && run.log.length) && <p className="m-0 text-[13px] leading-[1.55] text-(--wac-muted)">{L.emptyLog}</p>}
              {run && run.log.length > 0 && (
                <ol className="m-0 grid list-none p-0">
                  {run.log.map((item) => (
                    <li
                      key={item.key}
                      className="grid animate-[wac-in_.35s_cubic-bezier(.2,.7,.2,1)_both] grid-cols-[20px_minmax(0,1fr)_auto] items-start gap-2.5 border-b border-(--wac-line) py-[9px] text-[12.5px] leading-[1.4] motion-reduce:animate-none"
                    >
                      <span
                        className={cx(
                          "mt-px grid size-[18px] place-items-center rounded-full",
                          item.kind === "skip"
                            ? "bg-[rgba(165,180,252,0.16)] text-(--wac-peri)"
                            : item.kind === "stop"
                              ? "bg-[rgba(251,113,133,0.16)] text-(--wac-stop)"
                              : "bg-[rgba(74,222,128,0.16)] text-(--wac-ok)"
                        )}
                      >
                        {item.kind === "stop" ? <StopIcon className="size-2.5" /> : item.kind === "skip" ? <SkipIcon className="size-2.5" /> : <CheckIcon className="size-2.5" />}
                      </span>
                      <span className="grid min-w-0 gap-0.5">
                        <b className="font-semibold text-(--wac-ink) [overflow-wrap:anywhere]">{item.title}</b>
                        {item.sub && <small className="text-[11.5px] text-(--wac-muted) [overflow-wrap:anywhere]">{item.sub}</small>}
                      </span>
                      <span className="font-(family-name:--wac-mono) text-[11.5px] leading-[1.4] font-semibold whitespace-nowrap text-(--wac-cyan) tabular-nums">
                        {item.ms == null ? "" : `${int(item.ms)} ms`}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
              {run && (state === "done" || state === "stopped") && (
                <p className="m-0 flex justify-between gap-2.5 font-(family-name:--wac-mono) text-xs leading-none font-semibold text-(--wac-ink)">
                  <span>{L.total}</span>
                  <span>{int(run.total)} ms</span>
                </p>
              )}
            </section>
          </aside>
        </div>

        {/* run bar */}
        <footer className="relative flex flex-wrap items-center justify-between gap-x-[18px] gap-y-3 border-t border-(--wac-line) bg-[rgba(3,12,28,0.35)] px-6 py-3.5 @max-[759px]:px-[18px] @max-[479px]:px-3.5">
          <div aria-hidden="true" className="absolute -top-px right-0 left-0 h-0.5">
            <span style={{ width: `${progress}%` }} className="block h-full bg-(--wac-cyan) shadow-[0_0_10px_var(--wac-cyan)] transition-[width] duration-400 ease-in-out motion-reduce:transition-none" />
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2.5">
            <div className="flex min-w-0 items-center gap-2.5">
              <span
                aria-hidden="true"
                className="grid size-8 flex-none place-items-center rounded-full bg-[#173A63] font-(family-name:--wac-mono) text-[11.5px] leading-none font-semibold text-(--wac-ink) shadow-[inset_0_0_0_1px_var(--wac-line-strong)]"
              >
                {avatar}
              </span>
              <span className="grid min-w-0 gap-[3px]">
                <small className={cx(monoK, "text-[9.5px] leading-none font-medium tracking-[0.1em] text-(--wac-faint)")}>{testContact.note || L.testContact}</small>
                <b className="text-[13px] leading-[1.2] font-semibold [overflow-wrap:anywhere]">{cname}</b>
              </span>
            </div>
            {conditions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {conditions.map((n) => {
                  const v = testOf(n.id);
                  return (
                    <button
                      key={n.id}
                      type="button"
                      role="switch"
                      aria-checked={v}
                      disabled={busy}
                      onClick={() => flipTest(n.id)}
                      className={cx(
                        "group/tsw inline-flex cursor-pointer appearance-none items-center gap-[9px] rounded-full border border-(--wac-line-strong) bg-transparent py-1.5 pr-[11px] pl-[7px] text-left text-[12.5px] leading-[1.2] font-medium text-inherit transition-[border-color,background,opacity] duration-200 enabled:hover:border-(--wac-teal) disabled:cursor-not-allowed disabled:opacity-55 motion-reduce:transition-none",
                        focusRing
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className="relative h-[18px] w-[30px] flex-none rounded-full bg-white/[0.12] transition-[background] duration-250 after:absolute after:top-0.5 after:left-0.5 after:size-3.5 after:rounded-full after:bg-(--wac-muted) after:transition-[transform,background] after:duration-250 after:ease-[cubic-bezier(.3,.8,.25,1)] after:content-[''] group-aria-checked/tsw:bg-(--wac-teal) group-aria-checked/tsw:after:translate-x-3 group-aria-checked/tsw:after:bg-white motion-reduce:transition-none motion-reduce:after:transition-none"
                      />
                      <span>{n.test || n.title || "Condition"}</span>
                      <span className={cx(monoK, "text-[10.5px] leading-none font-semibold tracking-[0.06em] text-(--wac-faint) group-aria-checked/tsw:text-(--wac-teal)")}>
                        {v ? L.yesVal : L.noVal}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2 @max-[479px]:w-full">
            <button
              type="button"
              disabled={!nSteps}
              onClick={runOrPause}
              className={cx(btnCls, "border-(--wac-cyan) bg-(--wac-cyan) text-(--wac-on-accent) shadow-[0_10px_22px_-12px_var(--wac-cyan)] enabled:hover:border-[#67E8F9] enabled:hover:bg-[#67E8F9]")}
            >
              {state === "running" ? <PauseIcon className="size-[13px]" /> : <PlayIcon className="size-[13px]" />}
              {state === "running" ? L.pause : state === "paused" ? L.resume : state === "idle" ? L.testRun : L.runAgain}
            </button>
            <button type="button" disabled={!busy} onClick={stop} className={btnCls}>
              <StopIcon className="size-[13px]" />
              {L.stop}
            </button>
          </div>
        </footer>
        <p className="sr-only" aria-live="polite">
          {live}
        </p>
      </article>
    </div>
  );
}

export default WorkflowAutomationCard;
