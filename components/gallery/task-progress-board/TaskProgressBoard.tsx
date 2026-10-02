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
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type Ref,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { cx } from "@/lib/format";

export type TaskTone = "slate" | "blue" | "amber" | "green";
export type TaskPriority = "high" | "medium" | "low";
export type TaskMoveVia = "drag" | "keyboard" | "menu" | "api";

export interface TaskColumn {
  id: string;
  label: string;
  /** Colour of the column. Defaults by position. */
  tone?: TaskTone;
  /** Work-in-progress limit. The count turns red when the column goes over it. */
  limit?: number;
  /** Marks the column that counts as finished (default: the last column). */
  done?: boolean;
}

export interface TaskPerson {
  id: string;
  name: string;
  /** Avatar colour. Picked from a palette when left out. */
  color?: string;
}

export interface TaskItem {
  /** Task key, shown on the card. */
  id: string;
  title: string;
  /** The id of the column the task sits in. */
  status: string;
  /** A person id. */
  assignee?: string;
  /** YYYY-MM-DD. */
  due?: string;
  priority?: TaskPriority;
  checklist?: { done: number; total: number };
}

export interface TaskMoveDetail {
  id: string;
  title: string;
  from: string;
  to: string;
  /** New position among the visible cards of the column. */
  index: number;
  via: TaskMoveVia;
  /** % of visible tasks in the done column after the move. */
  progress: number;
  /** All tasks after the move, in board order. */
  tasks: TaskItem[];
}

export interface TaskProgressBoardHandle {
  /** Move a task to a column. index is the position among visible cards; omit to add at the end. */
  moveTask: (id: string, column: string, index?: number) => boolean;
  /** Current tasks, in board order. */
  readonly tasks: TaskItem[];
}

export interface TaskBoardLabels {
  progress?: string;
  hint?: string;
  all?: string;
  empty?: string;
  emptyFiltered?: string;
}

export interface TaskProgressBoardProps {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  /** YYYY-MM-DD used to mark due dates as overdue, today or tomorrow. Defaults to the real date after mount. */
  today?: string;
  /** Date locale for due dates. */
  locale?: string;
  /** Columns in board order. */
  columns?: TaskColumn[];
  people?: TaskPerson[];
  /** Starting tasks. Moves are kept in component state; read them from onTaskMove. */
  tasks?: TaskItem[];
  /** Controlled assignee filter: a person id or "all". */
  assignee?: string;
  defaultAssignee?: string;
  onAssigneeChange?: (assignee: string) => void;
  /** Fires after a card moves by drag, arrow key, the Move menu or moveTask(). */
  onTaskMove?: (detail: TaskMoveDetail) => void;
  /** Override built-in text. */
  labels?: TaskBoardLabels;
  ref?: Ref<TaskProgressBoardHandle>;
  className?: string;
}

const DEFAULT_COLUMNS: TaskColumn[] = [
  { id: "todo", label: "To do" },
  { id: "doing", label: "In progress" },
  { id: "review", label: "Review" },
  { id: "done", label: "Done", done: true },
];
const TONES: TaskTone[] = ["slate", "blue", "amber", "green"];
const TONE_VARS: Record<TaskTone, string> = {
  slate: "[--tpb-c:var(--tpb-slate)] [--tpb-c-ink:var(--tpb-slate-ink)] [--tpb-c-solid:var(--tpb-slate-solid)]",
  blue: "[--tpb-c:var(--tpb-blue)] [--tpb-c-ink:var(--tpb-blue-ink)] [--tpb-c-solid:var(--tpb-blue-solid)]",
  amber: "[--tpb-c:var(--tpb-amber)] [--tpb-c-ink:var(--tpb-amber-ink)] [--tpb-c-solid:var(--tpb-amber-solid)]",
  green: "[--tpb-c:var(--tpb-green)] [--tpb-c-ink:var(--tpb-green-ink)] [--tpb-c-solid:var(--tpb-green-solid)]",
};
const PRIO_LABEL: Record<TaskPriority, string> = { high: "High", medium: "Medium", low: "Low" };
const PRIO_DOT: Record<TaskPriority, string> = { high: "bg-(--tpb-high)", medium: "bg-(--tpb-medium)", low: "bg-(--tpb-low)" };
const AVATARS = ["#6D4FD1", "#B0482A", "#17705C", "#A3336A", "#2F5BD3", "#7A5B12", "#3F6B8F"];
const DAY = 864e5;
const CARD_HINT =
  "Press left or right arrow to move to another column, up or down to move between cards, Enter for the move menu.";

interface Col extends Required<Pick<TaskColumn, "id" | "label" | "done">> {
  tone: TaskTone;
  limit: number | null;
}
interface Person {
  id: string;
  name: string;
  initials: string;
  color: string;
}
interface Due {
  text: string;
  sr: string;
  tone: "" | "late" | "soon" | "done";
}

const initialsOf = (name: string) =>
  String(name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] || "")
    .join("")
    .toUpperCase() || "?";
const parseDay = (s?: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || "");
  return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : null;
};
const copyTask = (t: TaskItem): TaskItem => ({ ...t, checklist: t.checklist ? { ...t.checklist } : undefined });
const reduceMotion = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/* ---------- icons ---------- */
const IconCal = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" className="size-3 flex-none">
    <rect x="2.5" y="3.5" width="11" height="10" rx="2" />
    <path d="M2.5 6.5h11M5.5 2v3M10.5 2v3" />
  </svg>
);
const IconLate = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true" className="size-3 flex-none">
    <circle cx="8" cy="8" r="5.8" />
    <path d="M8 4.8V8.4M8 10.9v.1" />
  </svg>
);
const IconCheck = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-3 flex-none">
    <rect x="2" y="2" width="12" height="12" rx="3.5" />
    <path d="m5.2 8.2 2 2 3.8-4.2" />
  </svg>
);
const IconMove = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-[13px]">
    <path d="M5 4 2 7l3 3M11 6l3 3-3 3M2 7h7M14 9H7" />
  </svg>
);
const IconGrip = () => (
  <svg viewBox="0 0 10 14" fill="currentColor" aria-hidden="true" className="h-3.5 w-2.5">
    <circle cx="2.5" cy="2.5" r="1.3" />
    <circle cx="7.5" cy="2.5" r="1.3" />
    <circle cx="2.5" cy="7" r="1.3" />
    <circle cx="7.5" cy="7" r="1.3" />
    <circle cx="2.5" cy="11.5" r="1.3" />
    <circle cx="7.5" cy="11.5" r="1.3" />
  </svg>
);
const IconChev = ({ open }: { open: boolean }) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className={cx("size-3.5 transition-transform duration-250 motion-reduce:transition-none", !open && "-rotate-90")}
  >
    <path d="m4 6 4 4 4-4" />
  </svg>
);

function Avatar({ person, title }: { person: Person; title?: boolean }) {
  return (
    <span
      aria-hidden="true"
      title={title ? person.name : undefined}
      style={{ ["--tpb-av" as string]: person.color }}
      className="grid size-6 flex-none place-items-center rounded-full bg-(--tpb-av) text-[9.5px] leading-none font-bold tracking-[.02em] text-white shadow-[0_0_0_2px_var(--tpb-card)]"
    >
      {person.initials}
    </span>
  );
}

const colDot = "size-2 flex-none rounded-full bg-(--tpb-c-solid)";

/* ---------- card ---------- */
interface CardProps {
  task: TaskItem;
  col: Col;
  cols: Col[];
  person?: Person;
  due: Due | null;
  hintId?: string;
  ghost?: boolean;
  lifted?: boolean;
  landed?: number;
  menuOpen?: boolean;
  onToggleMenu?: () => void;
  onCloseMenu?: (refocus: boolean) => void;
  onMenuMove?: (colId: string) => void;
  onKeyDown?: (e: KeyboardEvent<HTMLLIElement>) => void;
  onPointerDown?: (e: ReactPointerEvent<HTMLLIElement>) => void;
  onLandedEnd?: () => void;
}

function MoveMenu({
  task,
  cols,
  onMove,
  onClose,
  moveBtn,
}: {
  task: TaskItem;
  cols: Col[];
  onMove: (colId: string) => void;
  onClose: (refocus: boolean) => void;
  moveBtn: HTMLButtonElement | null;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const uid = useId();
  const [up, setUp] = useState(false);

  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const r = m.getBoundingClientRect();
    const card = m.parentElement?.getBoundingClientRect();
    if (r.bottom > window.innerHeight - 8 && card && card.top > r.height + 16) setUp(true);
    m.querySelector<HTMLButtonElement>('[role="menuitem"]:not([aria-disabled="true"])')?.focus();
  }, []);

  useEffect(() => {
    const outside = (e: PointerEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t) || moveBtn?.contains(t)) return;
      onClose(false);
    };
    document.addEventListener("pointerdown", outside, true);
    return () => document.removeEventListener("pointerdown", outside, true);
  }, [onClose, moveBtn]);

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const enabled = Array.from(ref.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not([aria-disabled="true"])') ?? []);
    const i = enabled.indexOf(document.activeElement as HTMLButtonElement);
    const n = enabled.length;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (n) enabled[(i + (e.key === "ArrowDown" ? 1 : -1) + n) % n].focus();
    } else if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      if (n) enabled[e.key === "Home" ? 0 : n - 1].focus();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose(true);
    } else if (e.key === "Tab") {
      onClose(false);
    }
    e.stopPropagation();
  };

  return (
    <div
      ref={ref}
      id={`${uid}-menu`}
      role="menu"
      aria-label="Move to…"
      onKeyDown={onKey}
      onPointerDown={(e) => e.stopPropagation()}
      className={cx(
        "absolute right-2 z-10 grid min-w-44 cursor-default gap-0.5 rounded-xl border border-(--tpb-line) bg-(--tpb-card) p-1.5 shadow-[0_22px_40px_-18px_var(--tpb-shadow),0_2px_6px_-2px_var(--tpb-shadow-sm)] animate-[tpb-pop_.18s_cubic-bezier(.2,.7,.2,1)] motion-reduce:animate-none",
        up ? "bottom-[calc(100%-30px)]" : "top-[calc(100%-6px)]"
      )}
    >
      <p aria-hidden="true" className="m-0 px-2 pt-1.5 pb-1 font-(family-name:--tpb-mono) text-[10px] leading-none font-medium tracking-[.09em] text-(--tpb-faint) uppercase">
        Move to
      </p>
      {cols.map((c) => {
        const current = c.id === task.status;
        return (
          <button
            key={c.id}
            type="button"
            role="menuitem"
            tabIndex={-1}
            aria-disabled={current || undefined}
            onClick={(e) => {
              e.stopPropagation();
              if (!current) onMove(c.id);
            }}
            className={cx(
              "flex cursor-pointer items-center gap-[9px] rounded-lg border-0 bg-transparent p-2 text-left text-[13px] leading-[1.2] font-medium text-(--tpb-ink) hover:bg-(--tpb-tint) focus-visible:bg-(--tpb-tint) focus-visible:shadow-[inset_0_0_0_2px_var(--tpb-accent)] focus-visible:outline-none aria-disabled:cursor-default aria-disabled:text-(--tpb-faint)",
              TONE_VARS[c.tone]
            )}
          >
            <span aria-hidden="true" className={colDot} />
            {c.label}
            {current && (
              <small className="ml-auto font-(family-name:--tpb-mono) text-[10px] leading-none font-medium tracking-[.06em] text-(--tpb-faint) uppercase">Current</small>
            )}
          </button>
        );
      })}
    </div>
  );
}

function TaskCard({
  task,
  col,
  cols,
  person,
  due,
  hintId,
  ghost,
  lifted,
  landed,
  menuOpen,
  onToggleMenu,
  onCloseMenu,
  onMenuMove,
  onKeyDown,
  onPointerDown,
  onLandedEnd,
}: CardProps) {
  const moveRef = useRef<HTMLButtonElement>(null);
  const prio = task.priority && PRIO_LABEL[task.priority] ? task.priority : null;
  const ck =
    task.checklist && task.checklist.total > 0
      ? { done: Math.max(0, Math.min(task.checklist.done || 0, task.checklist.total)), total: task.checklist.total }
      : null;
  const parts = [task.title || task.id];
  if (prio) parts.push(`${PRIO_LABEL[prio]} priority`);
  if (person) parts.push(`Assigned to ${person.name}`);
  if (due) parts.push(due.sr);
  if (ck) parts.push(`Checklist ${ck.done} of ${ck.total}`);
  parts.push(`In ${col.label}`);

  const close = useCallback((refocus: boolean) => {
    onCloseMenu?.(refocus);
    if (refocus) moveRef.current?.focus();
  }, [onCloseMenu]);

  return (
    <li
      data-tpb-card={ghost ? undefined : task.id}
      tabIndex={ghost ? undefined : 0}
      aria-hidden={ghost || undefined}
      aria-label={ghost ? undefined : parts.join(". ") + "."}
      aria-describedby={ghost ? undefined : hintId}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onAnimationEnd={(e) => e.target === e.currentTarget && onLandedEnd?.()}
      key={landed}
      className={cx(
        "group/card relative grid cursor-grab list-none gap-[9px] rounded-xl border border-(--tpb-line) bg-(--tpb-card) px-3 pt-[11px] pb-2.5 text-(--tpb-ink) outline-none select-none [-webkit-touch-callout:none] [-webkit-user-select:none]",
        ghost
          ? "pointer-events-none fixed top-0 left-0 z-[1000] m-0 cursor-grabbing font-(family-name:--tpb-sans) opacity-96 shadow-[0_28px_44px_-20px_var(--tpb-shadow),0_0_0_1px_var(--tpb-line)]"
          : "shadow-[0_1px_2px_var(--tpb-shadow-sm),0_8px_16px_-14px_var(--tpb-shadow)] transition-[transform,box-shadow,border-color] duration-200 ease-out-soft hover:-translate-y-px hover:border-[color-mix(in_oklab,var(--tpb-c-solid)_50%,var(--tpb-line))] hover:shadow-[0_1px_2px_var(--tpb-shadow-sm),0_14px_22px_-16px_var(--tpb-shadow)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--tpb-accent) motion-reduce:transition-none motion-reduce:hover:translate-y-0",
        ghost && TONE_VARS[col.tone],
        menuOpen && "z-[5]",
        lifted && "hidden",
        landed != null && landed > 0 && "animate-[tpb-land_.7s_cubic-bezier(.2,.7,.2,1)] motion-reduce:animate-none"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] leading-none font-semibold text-(--tpb-muted)">
          {prio && (
            <>
              <i aria-hidden="true" className={cx("size-2 rounded-full", PRIO_DOT[prio])} />
              {PRIO_LABEL[prio]}
            </>
          )}
        </span>
        <span className="inline-flex items-center gap-1.5 font-(family-name:--tpb-mono) text-[10.5px] leading-none font-medium text-(--tpb-faint)">
          {task.id}
          <span
            data-tpb-grip=""
            aria-hidden="true"
            className="-my-1 -mr-1.5 ml-0 grid size-[18px] cursor-grab touch-none place-items-center rounded-[5px] text-(--tpb-faint) group-hover/card:bg-(--tpb-tint) group-hover/card:text-(--tpb-muted)"
          >
            <IconGrip />
          </span>
        </span>
      </div>
      <h4 className={cx("m-0 text-[13.5px] leading-[1.35] font-semibold [overflow-wrap:anywhere]", col.done && "text-(--tpb-muted)")}>{task.title || task.id}</h4>
      {ck && (
        <div
          aria-hidden="true"
          className={cx(
            "flex items-center gap-2 font-(family-name:--tpb-mono) text-[11px] leading-none font-medium tabular-nums",
            ck.done === ck.total ? "text-(--tpb-green-ink)" : "text-(--tpb-muted)"
          )}
        >
          <IconCheck />
          <span className="h-1 flex-1 overflow-hidden rounded-full bg-(--tpb-tint)">
            <span
              className="block h-full rounded-[inherit] bg-(--tpb-c-solid) transition-[width] duration-400 motion-reduce:transition-none"
              style={{ width: `${((ck.done / ck.total) * 100).toFixed(1)}%` }}
            />
          </span>
          <span>
            {ck.done}/{ck.total}
          </span>
        </div>
      )}
      <div className="flex min-h-[26px] items-center gap-2">
        {person && <Avatar person={person} title />}
        {due && (
          <span
            aria-hidden="true"
            className={cx(
              "inline-flex items-center gap-[5px] text-[11.5px] leading-none font-medium whitespace-nowrap tabular-nums",
              due.tone === "late" ? "font-[650] text-(--tpb-late)" : due.tone === "soon" ? "font-[650] text-(--tpb-soon)" : due.tone === "done" ? "text-(--tpb-faint)" : "text-(--tpb-muted)"
            )}
          >
            {due.tone === "late" ? <IconLate /> : <IconCal />}
            {due.text}
          </span>
        )}
        <button
          ref={moveRef}
          type="button"
          tabIndex={ghost ? -1 : undefined}
          aria-haspopup="menu"
          aria-expanded={!!menuOpen}
          aria-label={`Move ${task.title || task.id}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleMenu?.();
          }}
          className="ml-auto inline-flex h-[26px] cursor-pointer items-center gap-1 rounded-[7px] border border-transparent bg-transparent px-2 text-[11px] leading-none font-semibold text-(--tpb-faint) transition-colors hover:border-(--tpb-line) hover:bg-(--tpb-tint) hover:text-(--tpb-ink) focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-(--tpb-accent) aria-expanded:border-(--tpb-line) aria-expanded:bg-(--tpb-tint) aria-expanded:text-(--tpb-ink) motion-reduce:transition-none"
        >
          <IconMove />
          <span>Move</span>
        </button>
      </div>
      {menuOpen && onMenuMove && <MoveMenu task={task} cols={cols} onMove={onMenuMove} onClose={close} moveBtn={moveRef.current} />}
    </li>
  );
}

/* ---------- board ---------- */
interface DragView {
  id: string;
  col: string | null;
  index: number;
  width: number;
  height: number;
}
interface Press {
  id: string;
  card: HTMLElement;
  x: number;
  y: number;
  lx: number;
  ly: number;
  pid: number;
  type: string;
  started: boolean;
  timer: ReturnType<typeof setTimeout> | undefined;
  dx: number;
  dy: number;
}

/**
 * A kanban board for client work: drag cards between columns, or focus a card
 * and use the arrow keys. Counts and progress update live; chips filter by assignee.
 */
export function TaskProgressBoard({
  eyebrow,
  title,
  subtitle,
  today: todayProp,
  locale = "en-US",
  columns,
  people: peopleProp = [],
  tasks: tasksProp = [],
  assignee: assigneeProp,
  defaultAssignee = "all",
  onAssigneeChange,
  onTaskMove,
  labels = {},
  ref,
  className,
}: TaskProgressBoardProps) {
  const uid = useId();
  const hintId = `${uid}-hint`;
  const rootRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLLIElement>(null);
  const [tasks, setTasksState] = useState<TaskItem[]>(() => tasksProp.filter((t) => t && t.id != null).map(copyTask));
  const tasksRef = useRef(tasks);
  const setTasks = (next: TaskItem[]) => {
    tasksRef.current = next;
    setTasksState(next);
  };
  const [assigneeState, setAssigneeState] = useState(defaultAssignee);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [landed, setLanded] = useState<{ id: string; n: number } | null>(null);
  const [live, setLive] = useState("");
  const [now, setNow] = useState<number | null>(null);
  const [drag, setDrag] = useState<DragView | null>(null);
  const dragRef = useRef<DragView | null>(null);
  const pressRef = useRef<Press | null>(null);
  const rafRef = useRef(0);
  const focusId = useRef<string | null>(null);

  const L = {
    progress: labels.progress ?? "Board progress",
    hint: labels.hint ?? "Drag cards, or focus one and press",
    all: labels.all ?? "Everyone",
    empty: labels.empty ?? "No tasks here yet. Drop a card to move it.",
    emptyFiltered: labels.emptyFiltered ?? "No tasks for this person here.",
  };

  useEffect(() => {
    const n = new Date();
    setNow(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()));
  }, []);
  const today = parseDay(todayProp) ?? now;

  const cols: Col[] = useMemo(() => {
    const raw = columns?.length ? columns : DEFAULT_COLUMNS;
    const out = raw.map((c, i) => ({
      id: String(c.id || `col-${i + 1}`),
      label: c.label || `Column ${i + 1}`,
      tone: c.tone && TONES.includes(c.tone) ? c.tone : TONES[Math.min(i, TONES.length - 1)],
      limit: c.limit != null && c.limit > 0 ? c.limit : null,
      done: !!c.done,
    }));
    if (!out.some((c) => c.done)) out[out.length - 1].done = true;
    return out;
  }, [columns]);
  const doneCol = cols.find((c) => c.done) as Col;

  const people = useMemo(() => {
    const map = new Map<string, Person>();
    peopleProp.forEach((p, i) => {
      if (p && p.id != null) map.set(String(p.id), { id: String(p.id), name: p.name || String(p.id), initials: initialsOf(p.name || p.id), color: p.color || AVATARS[i % AVATARS.length] });
    });
    return map;
  }, [peopleProp]);

  const rawWho = assigneeProp ?? assigneeState;
  const who = rawWho !== "all" && people.has(rawWho) ? rawWho : "all";
  const whoRef = useRef(who);
  whoRef.current = who;
  const visibleFor = (t: TaskItem, w: string) => w === "all" || String(t.assignee) === w;

  const say = useCallback((text: string) => {
    setLive("");
    requestAnimationFrame(() => setLive(text));
  }, []);

  const dueOf = (t: TaskItem, isDone: boolean): Due | null => {
    const due = parseDay(t.due);
    if (due == null) return null;
    let text: string;
    try {
      text = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", timeZone: "UTC" }).format(due);
    } catch {
      text = String(t.due);
    }
    if (isDone) return { text, sr: text, tone: "done" };
    if (today == null) return { text, sr: `Due ${text}`, tone: "" };
    const diff = Math.round((due - today) / DAY);
    if (diff < 0) return { text: `Overdue · ${text}`, sr: `Overdue, due ${text}`, tone: "late" };
    if (diff === 0) return { text: "Today", sr: "Due today", tone: "soon" };
    if (diff === 1) return { text: "Tomorrow", sr: "Due tomorrow", tone: "soon" };
    return { text, sr: `Due ${text}`, tone: "" };
  };

  /* ---------- moving ---------- */
  const move = useCallback(
    (id: string, toCol: string, index: number, via: TaskMoveVia, focus: boolean): boolean => {
      const cur = tasksRef.current;
      const w = whoRef.current;
      const t = cur.find((x) => String(x.id) === String(id));
      const col = cols.find((c) => c.id === String(toCol));
      setMenuFor(null);
      if (!t || !col) return false;
      const from = String(t.status);
      const sig = (arr: TaskItem[]) => arr.map((x) => `${x.id}:${x.status}`).join("|");
      const rest = cur.filter((x) => x !== t);
      const peers = rest.filter((x) => String(x.status) === col.id && visibleFor(x, w));
      const moved = { ...t, status: col.id };
      const out = [...rest];
      const refTask = peers[Math.max(0, index)];
      if (refTask) out.splice(out.indexOf(refTask), 0, moved);
      else if (peers.length) out.splice(out.indexOf(peers[peers.length - 1]) + 1, 0, moved);
      else out.push(moved);
      const changed = sig(out) !== sig(cur);
      if (focus) focusId.current = t.id;
      if (!changed) {
        if (focus) requestAnimationFrame(() => rootRef.current?.querySelector<HTMLElement>(`[data-tpb-card="${CSS.escape(t.id)}"]`)?.focus());
        return false;
      }
      setTasks(out);
      setLanded((l) => ({ id: t.id, n: (l?.n ?? 0) + 1 }));
      const colTasks = out.filter((x) => String(x.status) === col.id && visibleFor(x, w));
      say(`Moved ${t.title || t.id} to ${col.label}. ${col.label} now has ${colTasks.length} tasks.`);
      const vis = out.filter((x) => visibleFor(x, w));
      const dc = cols.find((c) => c.done) as Col;
      onTaskMove?.({
        id: t.id,
        title: t.title || "",
        from,
        to: col.id,
        index: colTasks.indexOf(moved),
        via,
        progress: vis.length ? Math.round((vis.filter((x) => String(x.status) === dc.id).length / vis.length) * 100) : 0,
        tasks: out.map(copyTask),
      });
      return true;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cols, onTaskMove, say]
  );

  useImperativeHandle(
    ref,
    () => ({
      moveTask: (id, column, index) => move(id, column, index == null ? Infinity : index, "api", false),
      get tasks() {
        return tasksRef.current.map(copyTask);
      },
    }),
    [move]
  );

  // restore focus after a keyboard / menu move
  useEffect(() => {
    if (focusId.current == null) return;
    const el = rootRef.current?.querySelector<HTMLElement>(`[data-tpb-card="${CSS.escape(focusId.current)}"]`);
    focusId.current = null;
    if (el) {
      el.focus({ preventScroll: true });
      el.scrollIntoView({ block: "nearest", behavior: reduceMotion() ? "auto" : "smooth" });
    }
  }, [tasks]);

  /* ---------- keyboard ---------- */
  const onCardKey = (t: TaskItem) => (e: KeyboardEvent<HTMLLIElement>) => {
    if (e.target !== e.currentTarget || dragRef.current) return;
    const ci = cols.findIndex((c) => c.id === String(t.status));
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      const ni = ci + (e.key === "ArrowRight" ? 1 : -1);
      if (ni < 0 || ni >= cols.length) {
        say(`${t.title || t.id} is already in ${cols[ci]?.label ?? ""}.`);
        return;
      }
      move(t.id, cols[ni].id, Infinity, "keyboard", true);
    } else if (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "Home" || e.key === "End") {
      const list = e.currentTarget.parentElement;
      const cards = Array.from(list?.querySelectorAll<HTMLElement>("[data-tpb-card]") ?? []);
      const i = cards.indexOf(e.currentTarget);
      const ni = e.key === "Home" ? 0 : e.key === "End" ? cards.length - 1 : i + (e.key === "ArrowDown" ? 1 : -1);
      if (cards[ni]) {
        e.preventDefault();
        cards[ni].focus();
      }
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setMenuFor(t.id);
    }
  };

  /* ---------- pointer drag ---------- */
  const setDragView = (v: DragView | null) => {
    dragRef.current = v;
    setDrag(v);
  };

  const placeGhost = (x: number, y: number) => {
    const p = pressRef.current;
    const g = ghostRef.current;
    if (!p || !g) return;
    g.style.transform = `translate(${x - p.dx}px, ${y - p.dy}px)` + (reduceMotion() ? "" : " rotate(1.6deg)");
  };

  const dragTo = (x: number, y: number) => {
    const d = dragRef.current;
    if (!d) return;
    placeGhost(x, y);
    const hit = document.elementFromPoint(x, y) as HTMLElement | null;
    const colEl = hit?.closest<HTMLElement>("[data-tpb-col]");
    if (colEl && rootRef.current?.contains(colEl)) {
      const cards = Array.from(colEl.querySelectorAll<HTMLElement>("[data-tpb-card]")).filter((c) => c.dataset.tpbCard !== d.id);
      let index = cards.length;
      for (let i = 0; i < cards.length; i++) {
        const r = cards[i].getBoundingClientRect();
        if (y < r.top + r.height / 2) {
          index = i;
          break;
        }
      }
      const colId = colEl.dataset.tpbCol ?? null;
      if (colId !== d.col || index !== d.index) setDragView({ ...d, col: colId, index });
    }
    // auto-scroll near the viewport edges (stacked phone layout)
    const edge = 64;
    const v = y < edge ? -1 : y > window.innerHeight - edge ? 1 : 0;
    if (v && !rafRef.current) {
      const step = () => {
        const p = pressRef.current;
        if (!dragRef.current || !p) {
          rafRef.current = 0;
          return;
        }
        const vv = p.ly < edge ? -1 : p.ly > window.innerHeight - edge ? 1 : 0;
        if (!vv) {
          rafRef.current = 0;
          return;
        }
        window.scrollBy(0, vv * 9);
        dragTo(p.lx, p.ly);
        rafRef.current = requestAnimationFrame(step);
      };
      rafRef.current = requestAnimationFrame(step);
    }
  };

  const startDrag = () => {
    const p = pressRef.current;
    if (!p || p.started) return;
    p.started = true;
    clearTimeout(p.timer);
    setMenuFor(null);
    const r = p.card.getBoundingClientRect();
    p.dx = p.x - r.left;
    p.dy = p.y - r.top;
    const colId = p.card.closest<HTMLElement>("[data-tpb-col]")?.dataset.tpbCol ?? null;
    const cards = Array.from(p.card.parentElement?.querySelectorAll<HTMLElement>("[data-tpb-card]") ?? []);
    const index = cards.indexOf(p.card);
    setDragView({ id: p.id, col: colId, index: Math.max(0, index), width: r.width, height: r.height });
    if (p.type === "touch" && typeof navigator.vibrate === "function") {
      try {
        navigator.vibrate(12);
      } catch {
        /* ignore */
      }
    }
    const t = tasksRef.current.find((x) => String(x.id) === p.id);
    say(`Picked up ${t?.title || p.id}.`);
    requestAnimationFrame(() => dragTo(p.lx, p.ly));
  };

  const endDrag = (cancel: boolean) => {
    const d = dragRef.current;
    const p = pressRef.current;
    if (p) clearTimeout(p.timer);
    pressRef.current = null;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    setDragView(null);
    if (d && !cancel && d.col) move(d.id, d.col, d.index, "drag", false);
  };

  // window listeners while a press is active (latest closures via ref)
  const handlers = useRef({ move: (_e: PointerEvent) => {}, up: (_e: PointerEvent) => {} });
  handlers.current.move = (e: PointerEvent) => {
    const p = pressRef.current;
    if (!p || e.pointerId !== p.pid) return;
    p.lx = e.clientX;
    p.ly = e.clientY;
    if (!p.started) {
      const dist = Math.hypot(e.clientX - p.x, e.clientY - p.y);
      if (p.type === "touch") {
        if (dist > 10) release(); // the page is scrolling
        return;
      }
      if (dist < 6) return;
      startDrag();
      return;
    }
    e.preventDefault();
    dragTo(e.clientX, e.clientY);
  };
  handlers.current.up = (e: PointerEvent) => {
    const p = pressRef.current;
    if (!p || e.pointerId !== p.pid) return;
    if (dragRef.current) endDrag(e.type === "pointercancel");
    else release();
  };

  const onWinMove = useCallback((e: PointerEvent) => handlers.current.move(e), []);
  const onWinUp = useCallback((e: PointerEvent) => handlers.current.up(e), []);
  const listen = useCallback(
    (on: boolean) => {
      const f = (on ? window.addEventListener : window.removeEventListener).bind(window);
      f("pointermove", onWinMove as EventListener);
      f("pointerup", onWinUp as EventListener);
      f("pointercancel", onWinUp as EventListener);
    },
    [onWinMove, onWinUp]
  );
  function release() {
    const p = pressRef.current;
    if (p) clearTimeout(p.timer);
    pressRef.current = null;
    if (!dragRef.current) listen(false);
  }
  useEffect(() => {
    if (!drag) listen(pressRef.current != null);
  }, [drag, listen]);
  useEffect(() => () => {
    listen(false);
    cancelAnimationFrame(rafRef.current);
    clearTimeout(pressRef.current?.timer);
  }, [listen]);

  // block page scroll and the long-press menu while dragging on touch
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const tm = (e: TouchEvent) => {
      if (dragRef.current) e.preventDefault();
    };
    const cm = (e: Event) => {
      if (dragRef.current || pressRef.current?.type === "touch") e.preventDefault();
    };
    el.addEventListener("touchmove", tm, { passive: false });
    el.addEventListener("contextmenu", cm);
    return () => {
      el.removeEventListener("touchmove", tm);
      el.removeEventListener("contextmenu", cm);
    };
  }, []);

  const onCardPointerDown = (t: TaskItem) => (e: ReactPointerEvent<HTMLLIElement>) => {
    if (dragRef.current || (e.pointerType === "mouse" && e.button !== 0)) return;
    const target = e.target as HTMLElement;
    if (target.closest("button, [role='menu']")) return;
    release();
    const grip = !!target.closest("[data-tpb-grip]");
    pressRef.current = {
      id: t.id,
      card: e.currentTarget,
      x: e.clientX,
      y: e.clientY,
      lx: e.clientX,
      ly: e.clientY,
      pid: e.pointerId,
      type: e.pointerType,
      started: false,
      timer: undefined,
      dx: 0,
      dy: 0,
    };
    listen(true);
    if (e.pointerType === "touch") {
      if (grip) startDrag();
      else
        pressRef.current.timer = setTimeout(() => {
          if (pressRef.current && !pressRef.current.started) startDrag();
        }, 320);
    }
  };

  /* ---------- filter ---------- */
  const pick = (w: string) => {
    if (w === who) return;
    setMenuFor(null);
    if (assigneeProp == null) setAssigneeState(w);
    onAssigneeChange?.(w);
  };

  const closeMenu = useCallback(() => setMenuFor(null), []);

  /* ---------- derived ---------- */
  const visible = tasks.filter((t) => visibleFor(t, who));
  const total = visible.filter((t) => cols.some((c) => c.id === String(t.status))).length;
  const countIn = (id: string) => visible.filter((t) => String(t.status) === id).length;
  const done = countIn(doneCol.id);
  const pct = total ? Math.round((done / total) * 100) : 0;
  const progLabel = who === "all" ? L.progress : `${people.get(who)?.name.split(" ")[0]}'s progress`;
  const progSub = `${done} of ${total} tasks done`;
  const segOrder = [doneCol, ...cols.filter((c) => !c.done).reverse()];
  const dragTask = drag ? tasks.find((t) => t.id === drag.id) : undefined;
  const dragCol = dragTask ? cols.find((c) => c.id === dragTask.status) : undefined;

  const chipBase =
    "inline-flex min-h-8 cursor-pointer items-center gap-[7px] rounded-full border border-(--tpb-line) bg-(--tpb-card) py-1 pr-[11px] text-[12.5px] leading-none font-medium text-(--tpb-muted) transition-[background-color,color,border-color,box-shadow] duration-200 hover:border-(--tpb-faint) hover:text-(--tpb-ink) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--tpb-accent) aria-pressed:border-(--tpb-accent) aria-pressed:text-(--tpb-ink) aria-pressed:shadow-[0_0_0_3px_var(--tpb-accent-soft)] motion-reduce:transition-none @max-[520px]:pr-[9px]";
  const chipName = "@max-[520px]:max-w-[9ch] @max-[520px]:overflow-hidden @max-[520px]:text-ellipsis @max-[520px]:whitespace-nowrap";
  const chipCount = "font-(family-name:--tpb-mono) text-[11px] leading-none font-semibold text-(--tpb-faint) tabular-nums";

  return (
    <div className={cx("@container block w-full max-w-[1000px] font-(family-name:--tpb-sans) text-(--tpb-ink)", className)}>
      <div
        ref={rootRef}
        className="relative rounded-[20px] border border-(--tpb-line) bg-(--tpb-board) bg-[radial-gradient(var(--tpb-dots)_1px,transparent_1.2px)] bg-[length:16px_16px] px-6 pt-[26px] pb-[22px] shadow-[0_30px_60px_-48px_var(--tpb-shadow),0_2px_6px_-4px_var(--tpb-shadow-sm)] @max-[760px]:rounded-[18px] @max-[760px]:px-[18px] @max-[760px]:pt-[22px] @max-[760px]:pb-[18px] @max-[520px]:px-3 @max-[520px]:pt-[18px] @max-[520px]:pb-3.5"
      >
        {/* header */}
        <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-[18px] @max-[760px]:items-stretch">
          <div className="grid max-w-[52ch] min-w-0 gap-1.5">
            {eyebrow && <span className="font-(family-name:--tpb-mono) text-[10.5px] leading-none font-medium tracking-[.1em] text-(--tpb-accent) uppercase">{eyebrow}</span>}
            {title && (
              <h2 className="m-0 font-(family-name:--tpb-display) text-[clamp(20px,3.2cqi,26px)] leading-[1.15] font-[650] tracking-[-0.018em] text-balance">{title}</h2>
            )}
            {subtitle && <p className="m-0 text-[13.5px] text-(--tpb-muted)">{subtitle}</p>}
          </div>
          <div className="grid min-w-60 flex-[0_1_320px] gap-2 @max-[760px]:basis-full @max-[520px]:min-w-0">
            <div className="flex items-baseline justify-between gap-2.5">
              <span className="font-(family-name:--tpb-mono) text-[10.5px] leading-[1.2] font-medium tracking-[.09em] text-(--tpb-faint) uppercase">{progLabel}</span>
              <span className="font-(family-name:--tpb-display) text-[28px] leading-none font-[650] tracking-[-0.02em] tabular-nums">{pct}%</span>
            </div>
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={pct}
              aria-label={progLabel}
              aria-valuetext={`${pct}%, ${progSub}`}
              className="flex h-2.5 overflow-hidden rounded-full bg-(--tpb-tint) shadow-[inset_0_0_0_1px_var(--tpb-line)]"
            >
              {segOrder.map((c, i) => (
                <span
                  key={c.id}
                  className={cx(
                    "h-full bg-(--tpb-c-solid) transition-[width] duration-500 ease-out-soft motion-reduce:transition-none",
                    i > 0 && "shadow-[-1px_0_0_var(--tpb-card)]",
                    TONE_VARS[c.tone]
                  )}
                  style={{ width: `${total ? (countIn(c.id) / total) * 100 : 0}%` }}
                />
              ))}
            </div>
            <p className="m-0 flex flex-wrap gap-x-3 gap-y-1 text-xs text-(--tpb-muted) tabular-nums">
              <span>{progSub}</span>
              {cols
                .filter((c) => !c.done)
                .reverse()
                .map((c) => (
                  <span key={c.id} className={cx("inline-flex items-center gap-[5px]", TONE_VARS[c.tone])}>
                    <i aria-hidden="true" className="size-[7px] rounded-[2px] bg-(--tpb-c-solid)" />
                    {countIn(c.id)} {c.label.toLowerCase()}
                  </span>
                ))}
            </p>
          </div>
        </header>

        {/* toolbar */}
        <div className="mt-5 mb-4 flex flex-wrap items-center justify-between gap-x-[18px] gap-y-2.5">
          <div role="group" aria-label="Filter by assignee" className="flex flex-wrap gap-1.5">
            <button type="button" aria-pressed={who === "all"} onClick={() => pick("all")} className={cx(chipBase, "pl-[11px]")}>
              <span className={chipName}>{L.all}</span>
              <b className={chipCount}>{tasks.length}</b>
            </button>
            {Array.from(people.values()).map((p) => (
              <button key={p.id} type="button" aria-pressed={who === p.id} onClick={() => pick(p.id)} className={cx(chipBase, "pl-1")}>
                <Avatar person={p} />
                <span className={chipName}>{p.name}</span>
                <b className={chipCount}>{tasks.filter((t) => String(t.assignee) === p.id).length}</b>
              </button>
            ))}
          </div>
          <p className="m-0 inline-flex items-center gap-2 text-xs text-(--tpb-faint) @max-[520px]:hidden [&_kbd]:rounded-[4px] [&_kbd]:border [&_kbd]:border-b-2 [&_kbd]:border-(--tpb-line) [&_kbd]:bg-(--tpb-card) [&_kbd]:px-[5px] [&_kbd]:py-[3px] [&_kbd]:font-(family-name:--tpb-mono) [&_kbd]:text-[10.5px] [&_kbd]:leading-none [&_kbd]:font-semibold [&_kbd]:text-(--tpb-muted)">
            <span>{L.hint}</span>
            <kbd aria-hidden="true">←</kbd>
            <kbd aria-hidden="true">→</kbd>
          </p>
        </div>

        {/* columns */}
        <div
          className="grid grid-cols-[repeat(var(--tpb-n),minmax(0,1fr))] items-start gap-3 @max-[760px]:grid-cols-2 @max-[520px]:grid-cols-1 @max-[520px]:gap-2.5"
          style={{ ["--tpb-n" as string]: Math.max(cols.length, 1) }}
        >
          {cols.map((c) => {
            const colTasks = visible.filter((t) => String(t.status) === c.id);
            const isCollapsed = collapsed.has(c.id);
            const over = c.limit != null && colTasks.length > c.limit;
            const hid = `${uid}-${c.id}`;
            const hasPh = drag?.col === c.id;
            const nonLifted = colTasks.filter((t) => t.id !== drag?.id);
            const phBefore = hasPh ? nonLifted[drag.index]?.id ?? null : undefined;
            const ph = drag && (
              <li key="__ph" aria-hidden="true" className="list-none rounded-xl border-[1.5px] border-dashed border-(--tpb-c-solid) bg-[color-mix(in_oklab,var(--tpb-c-solid)_10%,transparent)]" style={{ height: drag.height }} />
            );
            const listEmpty = !colTasks.length && !hasPh;
            return (
              <section
                key={c.id}
                data-tpb-col={c.id}
                data-over={hasPh || undefined}
                aria-labelledby={`${hid}-h`}
                className={cx(
                  "grid min-w-0 content-start rounded-2xl border border-[color-mix(in_oklab,var(--tpb-c-solid)_18%,transparent)] bg-[color-mix(in_oklab,var(--tpb-c)_60%,var(--tpb-board))] px-1.5 pt-1.5 pb-2 transition-[box-shadow,background-color] duration-200 data-over:shadow-[0_0_0_2px_var(--tpb-c-solid),0_14px_28px_-20px_var(--tpb-c-solid)] motion-reduce:transition-none",
                  isCollapsed && "@max-[520px]:pb-1.5",
                  TONE_VARS[c.tone]
                )}
              >
                <header className={cx("mb-1.5 flex items-center gap-2 rounded-[11px] bg-(--tpb-c) py-2 pr-2 pl-2.5 text-(--tpb-c-ink)", isCollapsed && "@max-[520px]:mb-0")}>
                  <h3 id={`${hid}-h`} className="m-0 flex min-w-0 flex-1 items-center gap-2 text-[13.5px] leading-[1.2] font-[650]">
                    <span aria-hidden="true" className={cx(colDot, "shadow-[0_0_0_3px_color-mix(in_oklab,var(--tpb-c-solid)_25%,transparent)]")} />
                    {c.label}
                  </h3>
                  <span
                    aria-label={`${colTasks.length} tasks${over ? `, over the limit of ${c.limit}` : ""}`}
                    className={cx(
                      "rounded-full px-[7px] py-1 font-(family-name:--tpb-mono) text-[11.5px] leading-none font-semibold tabular-nums transition-colors motion-reduce:transition-none",
                      over ? "bg-(--tpb-late) text-(--tpb-card)" : "bg-(--tpb-card) text-(--tpb-c-ink)"
                    )}
                  >
                    {c.limit != null ? `${colTasks.length}/${c.limit}` : colTasks.length}
                  </span>
                  <button
                    type="button"
                    aria-expanded={!isCollapsed}
                    aria-controls={`${hid}-l`}
                    aria-label={`${isCollapsed ? "Expand" : "Collapse"} ${c.label}`}
                    onClick={() =>
                      setCollapsed((s) => {
                        const n = new Set(s);
                        if (n.has(c.id)) n.delete(c.id);
                        else n.add(c.id);
                        return n;
                      })
                    }
                    className="hidden size-7 cursor-pointer place-items-center rounded-lg border-0 bg-transparent text-(--tpb-c-ink) focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-(--tpb-accent) @max-[520px]:grid"
                  >
                    <IconChev open={!isCollapsed} />
                  </button>
                </header>
                <ol
                  id={`${hid}-l`}
                  className={cx("m-0 grid list-none content-start gap-2 p-0", listEmpty ? "min-h-0" : "min-h-16", isCollapsed && "@max-[520px]:hidden")}
                >
                  {colTasks.map((t) => (
                    <FragmentWithPh key={t.id} ph={phBefore === t.id ? ph : null}>
                      <TaskCard
                        task={t}
                        col={c}
                        cols={cols}
                        person={t.assignee != null ? people.get(String(t.assignee)) : undefined}
                        due={dueOf(t, c.done)}
                        hintId={hintId}
                        lifted={drag?.id === t.id}
                        landed={landed?.id === t.id ? landed.n : 0}
                        onLandedEnd={() => setLanded(null)}
                        menuOpen={menuFor === t.id}
                        onToggleMenu={() => setMenuFor((m) => (m === t.id ? null : t.id))}
                        onCloseMenu={closeMenu}
                        onMenuMove={(colId) => move(t.id, colId, Infinity, "menu", true)}
                        onKeyDown={onCardKey(t)}
                        onPointerDown={onCardPointerDown(t)}
                      />
                    </FragmentWithPh>
                  ))}
                  {hasPh && phBefore === null && ph}
                </ol>
                {listEmpty && (
                  <p
                    className={cx(
                      "m-0 rounded-xl border-[1.5px] border-dashed border-[color-mix(in_oklab,var(--tpb-c-solid)_45%,transparent)] px-2.5 py-[18px] text-center text-xs text-(--tpb-muted)",
                      isCollapsed && "@max-[520px]:hidden"
                    )}
                  >
                    {who === "all" ? L.empty : L.emptyFiltered}
                  </p>
                )}
              </section>
            );
          })}
        </div>

        <p className="sr-only" aria-live="polite">
          {live}
        </p>
        <p id={hintId} className="sr-only" hidden>
          {CARD_HINT}
        </p>
      </div>

      {drag &&
        dragTask &&
        dragCol &&
        typeof document !== "undefined" &&
        createPortal(
          <ul className="m-0 list-none p-0" aria-hidden="true">
            <GhostCard ghostRef={ghostRef} width={drag.width} onPlace={() => pressRef.current && placeGhost(pressRef.current.lx, pressRef.current.ly)}>
              <TaskCard task={dragTask} col={dragCol} cols={cols} person={dragTask.assignee != null ? people.get(String(dragTask.assignee)) : undefined} due={dueOf(dragTask, dragCol.done)} ghost />
            </GhostCard>
          </ul>,
          document.body
        )}
    </div>
  );
}

function FragmentWithPh({ ph, children }: { ph: ReactNode; children: ReactNode }) {
  return (
    <>
      {ph}
      {children}
    </>
  );
}

/** Positions the drag ghost; the board moves it through the ref without re-rendering. */
function GhostCard({
  ghostRef,
  width,
  onPlace,
  children,
}: {
  ghostRef: RefObject<HTMLLIElement | null>;
  width: number;
  onPlace: () => void;
  children: ReactNode;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const li = wrap.current?.firstElementChild as HTMLLIElement | null;
    ghostRef.current = li;
    if (li) li.style.width = `${width}px`;
    onPlace();
    return () => {
      ghostRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ghostRef, width]);
  return (
    <div ref={wrap} className="contents">
      {children}
    </div>
  );
}

export default TaskProgressBoard;
