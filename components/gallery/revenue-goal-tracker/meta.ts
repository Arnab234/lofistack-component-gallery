import type { ComponentMeta } from "@/lib/types";
import { PROMPT } from "./sample";

export const meta: ComponentMeta = {
  slug: "revenue-goal-tracker",
  number: 26,
  week: 13,
  type: "tracker",
  title: "Revenue Goal Tracker",
  navLabel: "Revenue Goal",
  componentName: "RevenueGoalTracker",
  summary:
    "Progress toward a revenue goal with milestones, today's pace, and the daily run-rate you have against the one you need. Log a sale and every number updates, with a small celebration when you pass a milestone.",
  description:
    "How close the team is to its revenue goal, and whether the current pace will get there. Log a sale and every number updates: progress, milestones, days left and the daily run-rate you now need.",
  tags: ["Milestones", "Run-rate", "Log a sale"],
  props: [
    { name: "goal", type: "number", required: true, description: "Target amount." },
    { name: "start · end", type: "string", description: "First and last day of the goal period, YYYY-MM-DD. Both days count." },
    { name: "today", type: "string", description: "The day progress is measured on. Defaults to the real date, read after mount and kept inside the period." },
    { name: "sales", type: "RevenueSale[]", default: "[]", description: "{ client?, amount, date? }. Amount raised is the sum of these." },
    { name: "milestones", type: "number[]", default: "[25, 50, 75, 100]", description: "Percentages to mark on the meter." },
    { name: "eyebrow · title", type: "string", description: "Optional header text." },
    { name: "currency · locale", type: "string", default: '"USD" · "en-US"', description: "Money and date formatting." },
    { name: "recent", type: "number", default: "4", description: "How many sales to list." },
    { name: "onProgress", type: "(detail: RevenueGoalProgressDetail) => void", description: "Fires on every added or undone sale with the new total, percentage, the sale and any milestones just crossed." },
    { name: "ref", type: "Ref<RevenueGoalTrackerHandle>", description: "addSale({ client, amount, date? }) and undo() from code." },
    { name: "labels", type: "Partial<RevenueGoalLabels>", description: "Overrides for any built-in text." },
    { name: "className", type: "string", description: "Extra classes for the outer wrapper." },
  ],
  usage: `import { RevenueGoalTracker } from "@/components/gallery/revenue-goal-tracker/RevenueGoalTracker";

<RevenueGoalTracker
  title="New retainer revenue"
  goal={120000}
  start="2026-07-01"
  end="2026-09-30"
  sales={[{ client: "Brightside Dental", amount: 4800, date: "2026-07-03" }]}
  onProgress={(d) => console.log(d.raised, d.pct, d.crossed)}
/>`,
  usageNote:
    "Run-rate is the amount raised divided by the days so far; the required rate is what is left divided by the days left; projected is the current run-rate across the whole period.",
  prompt: PROMPT,
};
