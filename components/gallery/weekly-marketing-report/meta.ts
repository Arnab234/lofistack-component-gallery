import type { ComponentMeta } from "@/lib/types";
import { PROMPT } from "./sample";

export const meta: ComponentMeta = {
  slug: "weekly-marketing-report",
  number: 30,
  week: 15,
  type: "report",
  title: "Weekly Marketing Report",
  navLabel: "Weekly Report",
  componentName: "WeeklyMarketingReport",
  summary:
    "A one-page weekly report laid out like a newspaper, with key figures, highlights, a channel table and a checklist. Switch weeks, copy a plain-text summary or print it.",
  description:
    "A one-page weekly report laid out like a newspaper. It has a short summary, four key figures, highlights and lowlights, a channel table and a checklist for next week. Switch weeks, copy a plain-text summary or print it.",
  tags: ["Print stylesheet", "Copy summary", "Week switcher"],
  props: [
    { name: "weeks", type: "ReportWeek[]", required: true, description: "One entry per week, oldest first." },
    { name: "weeks[].week · range · issue", type: "number · string · number", description: "Week number, its date range and an optional issue number." },
    { name: "weeks[].headline · lead", type: "string", description: "The lead story. The first letter becomes a drop cap." },
    { name: "weeks[].channels", type: "{ name, spend, leads, booked }[]", required: true, description: "The four key figures, cost per lead and booking rate are all worked out from these rows." },
    { name: "weeks[].prior", type: "{ label, spend, leads, booked }", description: "Optional figures to compare the first week against. Later weeks compare with the week before." },
    { name: "weeks[].highlights · lowlights", type: "string[]", description: "Lists of short sentences." },
    { name: "weeks[].next", type: "{ text, done? }[]", description: "Checklist for the following week." },
    { name: "week · defaultWeek", type: "number", description: "Controlled or initial week number. Defaults to the last week." },
    { name: "publication · client", type: "string", default: '"Weekly Report"', description: "Masthead title (last word in red) and the client name." },
    { name: "desk · preparedBy", type: "string", description: "Optional text for the top line and the footer." },
    { name: "currency · locale", type: "string", default: '"USD" · "en-US"', description: "Money and number format." },
    { name: "onWeekChange", type: "({ week, range, index }) => void", description: "Fires when the week changes." },
    { name: "onChecklistToggle", type: "({ week, index, text, done }) => void", description: "Fires when a checklist item is ticked or unticked." },
    { name: "onSummaryCopy", type: "({ week, text }) => void", description: "Fires after the plain-text summary is copied." },
    { name: "labels", type: "Partial<ReportLabels>", description: "Override any built-in text." },
    { name: "ref", type: "Ref<WeeklyMarketingReportHandle>", description: "resetChecklists() and copySummary()." },
  ],
  usage: `import { WeeklyMarketingReport } from "@/components/gallery/weekly-marketing-report/WeeklyMarketingReport";

<WeeklyMarketingReport
  publication="Weekly Marketing Report"
  client="Cedar Fitness Co."
  defaultWeek={38}
  weeks={[{
    week: 38, range: "14–20 Sep 2026",
    headline: "Newsletter lifts leads",
    lead: "Leads reached 200…",
    channels: [{ name: "Search Ads", spend: 1310, leads: 58, booked: 17 }],
    highlights: ["…"], lowlights: ["…"],
    next: [{ text: "Launch the new form" }],
  }]}
  onWeekChange={(d) => console.log(d.week, d.range)}
/>`,
  usageNote:
    "Copy summary writes a plain-text version to the clipboard (or selects it in a text box if blocked). The Print button uses print styles that hide the controls.",
  prompt: PROMPT,
};
