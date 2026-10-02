import type { ComponentMeta } from "@/lib/types";
import { PROMPT } from "./sample";

export const meta: ComponentMeta = {
  slug: "task-progress-board",
  number: 8,
  week: 4,
  type: "board",
  title: "Task Progress Board",
  navLabel: "Task Board",
  componentName: "TaskProgressBoard",
  summary:
    "A kanban board with four columns, live column counts and a progress bar. Drag cards between columns, move them with the arrow keys or the Move menu, and filter by assignee.",
  description:
    "A kanban board for client work. Drag cards between columns, or focus a card and use the arrow keys. Column counts and the progress bar update as you go, and the chips filter the board by assignee.",
  tags: ["Drag and drop", "Keyboard moves", "Assignee filter"],
  props: [
    { name: "eyebrow · title · subtitle", type: "string", description: "Optional header text." },
    { name: "today", type: "string", description: "YYYY-MM-DD used to mark due dates as overdue, today or tomorrow. Defaults to the real date, read after mount." },
    { name: "locale", type: "string", default: '"en-US"', description: "Locale for due dates." },
    { name: "columns", type: "{ id, label, tone?, limit?, done? }[]", default: "To do · In progress · Review · Done", description: 'Board order. tone is "slate" | "blue" | "amber" | "green"; limit is a WIP limit; done marks the finished column (default: last).' },
    { name: "people", type: "{ id, name, color? }[]", default: "[]", description: "Assignees. Initials and avatar colours are worked out from the name." },
    { name: "tasks", type: "TaskItem[]", default: "[]", description: "Starting tasks: { id, title, status, assignee?, due?, priority?, checklist?: { done, total } }. Moves are kept in state." },
    { name: "assignee · defaultAssignee", type: "string", default: '"all"', description: "Controlled or starting filter: a person id or all." },
    { name: "onAssigneeChange", type: "(assignee: string) => void", description: "Fires when a filter chip is picked." },
    { name: "onTaskMove", type: "(detail: TaskMoveDetail) => void", description: "Fires after a move with id, title, from, to, index, via (drag | keyboard | menu | api), progress and the new tasks." },
    { name: "labels", type: "{ progress?, hint?, all?, empty?, emptyFiltered? }", description: "Override built-in text." },
    { name: "ref", type: "Ref<TaskProgressBoardHandle>", description: "Exposes moveTask(id, column, index?) and the current tasks." },
  ],
  usage: `import { TaskProgressBoard } from "@/components/gallery/task-progress-board/TaskProgressBoard";

<TaskProgressBoard
  title="Website relaunch"
  columns={[
    { id: "todo", label: "To do", tone: "slate" },
    { id: "done", label: "Done", tone: "green", done: true },
  ]}
  people={[{ id: "mc", name: "Maya Chen" }]}
  tasks={[
    { id: "BD-148", title: "Write FAQ copy", status: "todo", assignee: "mc",
      due: "2026-10-07", priority: "medium", checklist: { done: 0, total: 4 } },
  ]}
  onTaskMove={(d) => save(d.tasks)}
/>`,
  usageNote: "Focus a card and press ← or → to move it, ↑ or ↓ to step between cards, Enter for the Move menu. On touch, long-press a card or drag its grip.",
  prompt: PROMPT,
};
