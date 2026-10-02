import type { ComponentMeta } from "@/lib/types";
import { PROMPT } from "./sample";

export const meta: ComponentMeta = {
  slug: "revenue-growth-chart",
  number: 15,
  week: 8,
  type: "chart",
  title: "Revenue Growth Chart",
  navLabel: "Revenue Growth",
  componentName: "RevenueGrowthChart",
  summary:
    "Monthly revenue as an area chart with the total and growth against last year. Switch between 6 and 12 months, add last year as a dashed line, or show a running total.",
  description:
    "Monthly revenue as an area chart, with the total and the change against the same months last year. Switch between 6 and 12 months, add last year as a dashed line, or show a running total. Hover the chart, or focus it and use the arrow keys, to read each month.",
  tags: ["SVG chart", "Crosshair tooltip", "6M / 12M range"],
  props: [
    { name: "series", type: "{ month: string; revenue: number; lastYear?: number }[]", required: true, description: "Monthly revenue, oldest first. Month as YYYY-MM; lastYear drives the growth figures and the dashed line." },
    { name: "range · defaultRange", type: '"6m" | "12m"', default: '"12m"', description: "Months shown. Pass range to control it, or defaultRange to let the range buttons manage it." },
    { name: "compare · defaultCompare", type: "boolean", default: "false", description: "Shows last year as a dashed line with a legend." },
    { name: "cumulative · defaultCumulative", type: "boolean", default: "false", description: "Draws a running total instead of monthly values." },
    { name: "eyebrow · title · subtitle", type: "string", description: "Optional header text." },
    { name: "currency", type: "string", default: '"USD"', description: "Any ISO currency code." },
    { name: "source", type: "string", description: "Optional footer note." },
    { name: "onRangeChange", type: "(d: { range, total, growth }) => void", description: "Fires when a range button is pressed." },
    { name: "onViewChange", type: "(d: { compare, cumulative }) => void", description: "Fires when either toggle is pressed." },
    { name: "replayKey", type: "number", description: "Change it to re-run the line-draw animation." },
    { name: "labels · locale", type: "Partial<RevenueGrowthLabels> · string", default: '— · "en-US"', description: "Override built-in text, and the number and date locale." },
    { name: "className", type: "string", description: "Extra classes for the outer wrapper." },
  ],
  usage: `import { RevenueGrowthChart } from "@/components/gallery/revenue-growth-chart/RevenueGrowthChart";

<RevenueGrowthChart
  title="Membership revenue"
  currency="USD"
  defaultRange="12m"
  defaultCompare
  series={[
    { month: "2026-08", revenue: 47900, lastYear: 36200 },
    { month: "2026-09", revenue: 52400, lastYear: 38900 },
  ]}
  onRangeChange={({ range, total, growth }) => console.log(range, total, growth)}
/>`,
  usageNote:
    "The total, growth and averages are worked out from the series. A hidden table carries every value for screen readers.",
  prompt: PROMPT,
};
