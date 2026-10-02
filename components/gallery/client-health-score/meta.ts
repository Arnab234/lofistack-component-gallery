import type { ComponentMeta } from "@/lib/types";
import { PROMPT } from "./sample";

export const meta: ComponentMeta = {
  slug: "client-health-score",
  number: 20,
  week: 10,
  type: "gauge",
  title: "Client Health Score",
  navLabel: "Client Health",
  componentName: "ClientHealthScore",
  summary:
    "A 0–100 health dial with a Healthy / At risk / Critical band, built from five weighted factors. Drag the weight sliders and the score recalculates live, or switch to 90 days ago to compare.",
  description:
    "One number for how a client account is doing, built from five weighted factors. Change how much each factor counts and the score updates as you drag. Compare it with 90 days ago to see which way it is heading.",
  tags: ["Radial dial", "Weight sliders", "Period compare"],
  props: [
    { name: "client", type: "string", required: true, description: "Account name." },
    { name: "segment", type: "string", description: "Short line under the name." },
    { name: "asOf · compareDate", type: "string", description: "Dates for the two periods, YYYY-MM-DD. Shown as toggle tooltips." },
    { name: "compareLabel", type: "string", default: '"90 days ago"', description: "Toggle label for the earlier period." },
    { name: "factors", type: "HealthFactor[]", required: true, description: "Four to six factors work best." },
    { name: "factors[].key · name", type: "string", description: "Factor id and display name." },
    { name: "factors[].score · previous", type: "number", description: "0–100 scores now and for the earlier period." },
    { name: "factors[].weight", type: "number", default: "5", description: "Starting weight, 0–10. Weights are shared as percentages of their total." },
    { name: "factors[].about", type: "string", description: "What the factor measures. Shown when the row is hovered or focused." },
    { name: "factors[].note · previousNote", type: "string", description: "Optional evidence behind each period's score." },
    { name: "bands", type: "{ healthy?: number; risk?: number }", default: "{ healthy: 70, risk: 40 }", description: "Band thresholds. Below risk is Critical." },
    { name: "period · defaultPeriod · onPeriodChange", type: '"current" | "previous"', default: '— · "current"', description: "Controlled or uncontrolled period." },
    { name: "onScoreChange", type: "(detail: HealthScoreChange) => void", description: "Fires on period change, weight release and reset with { score, band, period, current, previous, weights, reason }." },
    { name: "labels", type: "Partial<HealthLabels>", description: "Override any built-in text." },
  ],
  usage: `import { ClientHealthScore } from "@/components/gallery/client-health-score/ClientHealthScore";

<ClientHealthScore
  client="Brightside Dental"
  segment="Growth plan · account owner Jordan Lee"
  factors={[
    { key: "engagement", name: "Engagement",
      weight: 5, score: 82, previous: 61,
      about: "Meetings, replies and logins." },
    { key: "results", name: "Results vs goal",
      weight: 5, score: 64, previous: 45 },
  ]}
  onScoreChange={(d) => console.log(d.score, d.band)}
/>`,
  usageNote:
    "The score is the weighted average of the factor scores, so each factor's share of the weights is exactly how much of the score it can move.",
  prompt: PROMPT,
};
