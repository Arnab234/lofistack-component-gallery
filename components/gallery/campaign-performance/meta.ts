import type { ComponentMeta } from "@/lib/types";
import { PROMPT } from "./sample";

export const meta: ComponentMeta = {
  slug: "campaign-performance",
  number: 2,
  week: 1,
  type: "card",
  title: "Campaign Performance Snapshot",
  navLabel: "Campaign Performance",
  componentName: "CampaignSnapshot",
  summary:
    "Ad performance at a glance. ROAS is set against spend, next to spend, leads, CPL/CPA and CTR, with a daily results chart you can hover.",
  description: "A reusable ad-campaign card: ROAS against spend, CPL/CPA, CTR and a daily results chart.",
  tags: ["Hoverable chart", "4 statuses", "Auto-calculated CPL"],
  props: [
    { name: "name", type: "string", required: true, description: "Campaign name." },
    { name: "platform", type: "string", required: true, description: "Ad platform. Its first letter becomes the badge." },
    { name: "status", type: '"active" | "learning" | "paused" | "ended"', default: '"active"', description: "Delivery status, shown on the dark panel." },
    { name: "start · end", type: "string", description: "Date range, YYYY-MM-DD." },
    { name: "currency", type: "string", default: '"USD"', description: "Any ISO currency code." },
    { name: "spend", type: "number", required: true, description: "Total spend." },
    { name: "results", type: "number", required: true, description: "Lead or conversion count." },
    { name: "resultLabel", type: "string", default: '"Conversions"', description: "What a result is called, e.g. Leads or Purchases." },
    { name: "cost · costLabel", type: "number · string", description: "Cost per result; worked out as spend ÷ results if omitted. Label is CPL for leads, CPA otherwise." },
    { name: "ctr", type: "number", description: "Click-through rate in percent." },
    { name: "roas", type: "number", description: "Return on ad spend as a multiple (4.2 = 4.2×). Revenue = spend × ROAS." },
    { name: "series", type: "number[]", default: "[]", description: "Daily results for the chart, oldest first." },
    { name: "deltas", type: "{ spend?, results?, cost?, ctr?, roas? }", description: "% change vs the previous period. A lower cost shows as good." },
  ],
  usage: `import { CampaignSnapshot } from "@/components/gallery/campaign-performance/CampaignSnapshot";

<CampaignSnapshot
  name="Campaign name"
  platform="Meta Ads"
  status="active"
  start="2026-09-01"
  end="2026-09-24"
  spend={12480}
  currency="USD"
  results={386}
  resultLabel="Leads"
  ctr={1.84}
  roas={4.2}
  series={[9, 11, 10, 13, 12, 14]}
  deltas={{ results: 14.3, cost: -7.3 }}
/>`,
  usageNote: "Hover or tap the chart, or focus it and use the arrow keys, Home and End to step through days.",
  prompt: PROMPT,
};
