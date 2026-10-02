import type { ComponentMeta } from "@/lib/types";
import { PROMPT } from "./sample";

export const meta: ComponentMeta = {
  slug: "activity-timeline",
  number: 12,
  week: 6,
  type: "timeline",
  title: "Activity Timeline",
  navLabel: "Activity Timeline",
  componentName: "ActivityTimeline",
  summary:
    "Calls, emails, form fills, deal changes and notes on a client account, grouped by day on a vertical timeline. Filter by type, open an event for its details, flip the order and load older activity.",
  description:
    "Everything that happened on a client account, newest first and grouped by day. Filter by type, open any event for its details, flip the order and load more as you scroll back.",
  tags: ["Type filters", "Expandable events", "Grouped by day"],
  props: [
    {
      name: "events",
      type: "ActivityEvent[]",
      required: true,
      description:
        '{ id, type: "call" | "email" | "form" | "deal" | "note", time (ISO), actor?, title?, summary?, details?: [label, value][], note? }. Grouped by day and sorted by time.',
    },
    { name: "eyebrow · title · subtitle", type: "string", description: "Optional header text." },
    { name: "now", type: "string", description: 'ISO date-time used for "Today", "Yesterday" and "min ago". Defaults to the current time.' },
    { name: "sort · defaultSort", type: '"newest" | "oldest"', default: '"newest"', description: "Sort order. Pass sort to control the switch." },
    { name: "pageSize", type: "number", default: "8", description: 'How many events show before "Show more".' },
    { name: "filter · defaultFilter", type: "ActivityType[]", default: "[]", description: "Active type filters; empty shows everything. Pass filter to control it." },
    { name: "types", type: "Partial<Record<ActivityType, string>>", description: 'Rename a type, e.g. { form: "Form fill" }.' },
    { name: "labels", type: "Partial<ActivityTimelineLabels>", description: "Override any built-in text." },
    { name: "locale", type: "string", default: '"en-US"', description: "Date and time formatting locale." },
    { name: "onActivityOpen", type: "(detail: ActivityOpenDetail) => void", description: "Fires with the id, type, title, time and actor when an event is opened." },
    { name: "onFilterChange", type: "(types: ActivityType[]) => void", description: "Fires when the type filters change." },
    { name: "onSortChange", type: '(sort: "newest" | "oldest") => void', description: "Fires when the sort switch changes." },
    { name: "ref", type: "Ref<ActivityTimelineHandle>", description: "expand(id) opens an event (showing it if it is filtered out or paged away); collapseAll() closes them all." },
    { name: "className", type: "string", description: "Extra classes for the outer wrapper." },
  ],
  usage: `import { ActivityTimeline } from "@/components/gallery/activity-timeline/ActivityTimeline";

<ActivityTimeline
  title="Brightside Dental"
  pageSize={8}
  events={[
    {
      id: "a19",
      type: "call",
      time: "2026-10-02T14:05:00",
      actor: "Luis Ortega",
      title: "Discovery call",
      summary: "Goals for new-patient bookings.",
      details: [["Duration", "24 min"]],
    },
  ]}
  onActivityOpen={(e) => console.log(e.id, e.title)}
/>`,
  usageNote: "Use a ref for expand(id) and collapseAll(); the sort switch and filters can be controlled or left to the component.",
  prompt: PROMPT,
};
