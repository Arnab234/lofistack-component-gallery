import type { ComponentMeta } from "@/lib/types";
import { PROMPT } from "./sample";

export const meta: ComponentMeta = {
  slug: "lead-funnel-analytics",
  number: 4,
  week: 2,
  type: "chart",
  title: "Lead Funnel Analytics",
  navLabel: "Lead Funnel",
  componentName: "LeadFunnel",
  summary:
    "Visitors to leads to booked calls to sales. Each stage shows its count and conversion rate, and a summary picks out the overall rate and the biggest drop-off.",
  description:
    "How many people make it from visit to sale. Each stage shows its count and the share of visitors who reached it. The rate between stages shows where people drop off.",
  tags: ["Auto-calculated rates", "Hoverable stages", "Typed data"],
  props: [
    { name: "stages", type: "{ label: string; count: number }[]", required: true, description: "Stages in funnel order. Two or more; four is typical." },
    { name: "eyebrow · title · subtitle", type: "string", description: "Optional header text." },
    { name: "period", type: "string", description: "Date-range text, shown top right." },
    { name: "compare", type: "{ label?: string; stages: number[] }", description: "Previous period counts. Adds a change in points to the overall rate." },
    { name: "source", type: "string", description: "Footer note, e.g. where the data comes from." },
    { name: "scale", type: '"sqrt" | "linear"', default: '"sqrt"', description: "sqrt keeps small stages readable; linear draws bars exactly to scale." },
    { name: "locale", type: "string", default: '"en-US"', description: "Number formatting locale." },
    { name: "labels", type: "Partial<FunnelLabels>", description: 'Override any built-in text, e.g. { overall: "Win rate" }.' },
    { name: "replayKey", type: "number | string", description: "Change it to re-run the entry animation." },
  ],
  usage: `import { LeadFunnel } from "@/components/gallery/lead-funnel-analytics/LeadFunnel";

<LeadFunnel
  title="Inbound pipeline"
  period="1 Jul – 30 Sep 2026"
  scale="sqrt"
  stages={[
    { label: "Visitors", count: 8640 },
    { label: "Leads", count: 1296 },
    { label: "Booked", count: 544 },
    { label: "Converted", count: 196 },
  ]}
  compare={{ label: "last quarter", stages: [7910, 1107, 432, 147] }}
/>`,
  usageNote:
    "Every rate is worked out from the counts: each stage against the one before it, against the first stage, and overall. The summary picks out the biggest drop-off and the strongest step automatically.",
  prompt: PROMPT,
};
