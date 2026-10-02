import type { TaskColumn, TaskItem, TaskPerson } from "./TaskProgressBoard";

/** Example sprint used by the preview. Not real client work. */
export const SAMPLE = {
  eyebrow: "Sprint board",
  title: "Website relaunch · Brightside Dental",
  subtitle: "Sprint 14 · 29 Sep – 10 Oct 2026",
  today: "2026-10-02",
  columns: [
    { id: "todo", label: "To do", tone: "slate" },
    { id: "doing", label: "In progress", tone: "blue", limit: 3 },
    { id: "review", label: "Review", tone: "amber" },
    { id: "done", label: "Done", tone: "green", done: true },
  ] satisfies TaskColumn[],
  people: [
    { id: "mc", name: "Maya Chen" },
    { id: "jo", name: "Jonah Okafor" },
    { id: "pr", name: "Priya Raman" },
    { id: "lb", name: "Leo Brandt" },
  ] satisfies TaskPerson[],
  tasks: [
    { id: "BD-148", title: "Write FAQ copy for the clear aligners page", status: "todo", assignee: "pr", due: "2026-10-07", priority: "medium", checklist: { done: 0, total: 4 } },
    { id: "BD-151", title: "Set up call-tracking numbers", status: "todo", assignee: "lb", due: "2026-10-09", priority: "low", checklist: { done: 0, total: 3 } },
    { id: "BD-152", title: "Collect six new patient testimonials", status: "todo", assignee: "mc", due: "2026-10-06", priority: "medium", checklist: { done: 1, total: 6 } },
    { id: "BD-139", title: "Rebuild the booking form as three short steps", status: "doing", assignee: "jo", due: "2026-10-03", priority: "high", checklist: { done: 3, total: 5 } },
    { id: "BD-143", title: "Compress hero images and lazy-load the gallery", status: "doing", assignee: "lb", due: "2026-10-01", priority: "high", checklist: { done: 2, total: 4 } },
    { id: "BD-146", title: "Draft the October email newsletter", status: "doing", assignee: "pr", due: "2026-10-05", priority: "medium", checklist: { done: 1, total: 3 } },
    { id: "BD-135", title: "Location pages for Eastside and Midtown", status: "review", assignee: "mc", due: "2026-10-02", priority: "high", checklist: { done: 5, total: 6 } },
    { id: "BD-141", title: "Refresh the map listing photos", status: "review", assignee: "jo", due: "2026-10-04", priority: "low", checklist: { done: 4, total: 4 } },
    { id: "BD-128", title: "Move blog posts to the new CMS", status: "done", assignee: "lb", due: "2026-09-29", priority: "medium", checklist: { done: 8, total: 8 } },
    { id: "BD-130", title: "New colour palette and type scale", status: "done", assignee: "mc", due: "2026-09-30", priority: "medium", checklist: { done: 5, total: 5 } },
    { id: "BD-132", title: "Update the cookie banner and privacy page", status: "done", assignee: "jo", due: "2026-09-30", priority: "low", checklist: { done: 3, total: 3 } },
    { id: "BD-136", title: "Track booking-form submissions as conversions", status: "done", assignee: "pr", due: "2026-10-01", priority: "high", checklist: { done: 4, total: 4 } },
  ] satisfies TaskItem[],
};

export const PROMPT = `Build component 08 for my LofiStack Component Gallery: a Task Progress Board, a kanban board for client work.

It should show:

* A header with eyebrow, board title and sprint dates
* A progress bar split by column, the % of tasks done and a per-column legend
* Assignee filter chips with avatars and task counts; the progress label follows the filter
* Four coloured columns (To do, In progress, Review, Done) with live counts and an optional work-in-progress limit that turns the count red
* Task cards with key, priority dot, title, checklist bar, assignee avatar and a due date marked Overdue, Today or Tomorrow

Requirements:

* React + TypeScript + Tailwind CSS. Columns, people and tasks come in through typed props; nothing hardcoded.
* Move cards by drag and drop (mouse, or long-press / grip on touch, with a placeholder, a tilted ghost and edge auto-scroll), by arrow keys, or with a Move menu.
* An onTaskMove callback with the task, old and new column, position, method and progress; an onAssigneeChange callback; a moveTask() handle.
* Fully responsive: four columns on desktop, two on tablet, one stacked column with collapsible sections on phones.
* Light and dark themes through CSS variables.
* Hover, focus, pressed, drop-target, empty and landed states that respect reduced motion.
* Accessibility: descriptive card labels, keyboard moves, a roving menu with arrow keys and Escape, live announcements, a labelled progressbar.
* Give it its own page in the gallery with a live preview, a reset button, a props table and a usage example.`;
