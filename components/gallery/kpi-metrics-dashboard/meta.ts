import type { ComponentMeta } from "@/lib/types";
import { PROMPT } from "./sample";

export const meta: ComponentMeta = {
  slug: "kpi-metrics-dashboard",
  number: 5,
  week: 3,
  type: "dashboard",
  title: "KPI Metrics Dashboard",
  navLabel: "KPI Dashboard",
  componentName: "KpiDashboard",
  summary:
    "Six headline numbers in a bento grid, each with its change against the previous period and a sparkline. Switch between 7, 30 and 90 days, read any chart point by point, and click a tile to pin it into the large slot.",
  description:
    "Six headline numbers in one bento grid. Switch between 7, 30 and 90 days, read any sparkline point by point, and click a tile to move it into the large slot.",
  tags: ["Period switch", "Sparkline tooltips", "Pin to hero"],
  props: [
    { name: "metrics", type: "KpiMetric[]", required: true, description: "Each has id, label, format and per-period series and previous totals, or a ratio." },
    { name: "metrics[].format", type: '"int" | "currency" | "currency2" | "percent"', default: '"int"', description: "currency2 shows two decimals." },
    { name: "metrics[].series", type: "Record<periodId, number[]>", description: "Per period, the value of each point. The tile value is their sum." },
    { name: "metrics[].previous", type: "Record<periodId, number>", description: "Per period, the total for the period before. Drives the change badge." },
    { name: "metrics[].ratio", type: "{ of: string; per: string }", description: "Two other metric ids. The value is of ÷ per for every point and for the total." },
    { name: "metrics[].better", type: '"up" | "down"', default: '"up"', description: "Whether a rise is shown as good or bad." },
    { name: "metrics[].hidden", type: "boolean", description: "Keeps a metric out of the grid (e.g. spend, only used by a ratio)." },
    { name: "periods", type: "{ id, label?, days, bucket? }[]", default: "one 30-day period", description: "Period buttons. bucket is the number of days in each sparkline point (1 = daily)." },
    { name: "period · defaultPeriod", type: "string", description: "Controlled or starting period id (default: the first one)." },
    { name: "hero · defaultHero", type: "string", description: "Controlled or starting id of the metric in the large slot (default: the first visible metric)." },
    { name: "onPeriodChange", type: "(period: string) => void", description: "Fires when a period button is pressed." },
    { name: "onSelect", type: "(detail: KpiSelectDetail) => void", description: "Fires when a tile is clicked, with id, label, period, value and previous value." },
    { name: "end", type: "string", description: "Last day of the data, YYYY-MM-DD. Used for the date range and point labels." },
    { name: "eyebrow · title · subtitle", type: "string", description: "Optional header text." },
    { name: "currency · locale · source", type: "string", default: '"USD" · "en-US"', description: "Number formatting and an optional footer note." },
    { name: "labels", type: "Partial<KpiLabels>", description: "Override any UI text." },
  ],
  usage: `import { KpiDashboard } from "@/components/gallery/kpi-metrics-dashboard/KpiDashboard";

<KpiDashboard
  end="2026-09-30"
  periods={[{ id: "7d", label: "7D", days: 7, bucket: 1 }]}
  metrics={[
    {
      id: "leads",
      label: "Leads",
      format: "int",
      series: { "7d": [27, 25, 18, 19, 27, 28, 29] },
      previous: { "7d": 167 },
    },
    { id: "cpl", label: "Cost per lead", format: "currency2", better: "down", ratio: { of: "spend", per: "leads" } },
    { id: "spend", label: "Ad spend", format: "currency", hidden: true, series: { "7d": [604, 710, 632, 675, 633, 650, 638] } },
  ]}
  onSelect={(d) => console.log(d)}
/>`,
  usageNote:
    "Clicking a tile moves it into the large slot and calls onSelect. Focus a sparkline and use the arrow keys, Home and End to read each point.",
  prompt: PROMPT,
};
