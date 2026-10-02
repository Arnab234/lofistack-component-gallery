import type { ComponentMeta } from "@/lib/types";
import { PROMPT } from "./sample";

export const meta: ComponentMeta = {
  slug: "ai-usage-analytics",
  number: 28,
  week: 14,
  type: "chart",
  title: "AI Usage Analytics",
  navLabel: "AI Usage",
  componentName: "AiUsageAnalytics",
  summary:
    "Daily AI usage stacked by model tier as tokens, requests or cost, with a monthly quota ring and a month-end cost estimate. Isolate a model or switch between 14 and 30 days.",
  description:
    "Daily AI usage by model tier, shown as tokens, requests or cost. The side panel tracks the monthly token quota and estimates the month-end bill at the current rate.",
  tags: ["Stacked bar chart", "Quota ring", "Cost forecast"],
  props: [
    { name: "models", type: "{ id, label, pricePerMillion }[]", required: true, description: "Model tiers in stack order, bottom first. Up to three." },
    { name: "series", type: "Record<string, { tokens?: number[]; requests?: number[] }>", required: true, description: "One number per day from start, keyed by model id." },
    { name: "start · asOf", type: "string", description: "ISO dates of the first and last day in the series." },
    { name: "billingStart", type: "string", description: "ISO date the billing month began. Quota and cost count from here." },
    { name: "quota", type: "number", default: "0", description: "Monthly token allowance." },
    { name: "budget", type: "number", default: "0", description: "Optional monthly spend limit for the cost estimate." },
    { name: "metric · defaultMetric", type: '"tokens" | "requests" | "cost"', default: '"tokens"', description: "Controlled or initial measure." },
    { name: "range · defaultRange", type: "14 | 30", default: "30", description: "Controlled or initial number of days, ending on asOf." },
    { name: "model · defaultModel", type: "string | null", default: "null", description: "A model id to show alone; null shows all." },
    { name: "onFilterChange", type: "(f: { metric, range, model }) => void", description: "Fires on every metric, range or isolated-model change." },
    { name: "currency · locale", type: "string", default: '"USD" · "en-US"', description: "ISO currency and number/date locale." },
    { name: "eyebrow · title · source", type: "string", description: "Optional header and footer text." },
    { name: "labels", type: "Partial<UsageLabels>", description: "Override any built-in text." },
    { name: "ref", type: "Ref<AiUsageAnalyticsHandle>", description: "replay() re-runs the bar animation; isolate(id) shows one model." },
  ],
  usage: `import { AiUsageAnalytics } from "@/components/gallery/ai-usage-analytics/AiUsageAnalytics";

<AiUsageAnalytics
  start="2026-08-26"
  asOf="2026-09-24"
  billingStart="2026-09-01"
  quota={400_000_000}
  budget={300}
  models={[{ id: "large", label: "Large model", pricePerMillion: 6 }]}
  series={{ large: { tokens: [1003000, 1126000], requests: [932, 909] } }}
  onFilterChange={(f) => console.log(f.metric, f.range, f.model)}
/>`,
  usageNote:
    "Cost is tokens ÷ 1,000,000 × pricePerMillion; month-end figures assume the daily rate so far holds. Focus the chart and use the arrow keys to step through days.",
  prompt: PROMPT,
};
