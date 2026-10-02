import type { ComponentMeta } from "@/lib/types";
import { PROMPT } from "./sample";

export const meta: ComponentMeta = {
  slug: "ad-spend-budget-tracker",
  number: 21,
  week: 11,
  type: "tracker",
  title: "Ad Spend Budget Tracker",
  navLabel: "Ad Budget",
  componentName: "AdSpendBudgetTracker",
  summary:
    "Monthly ad spend per channel against today’s ideal pace, with projected month-end spend and over/under warnings. Edit a budget inline and the projections update.",
  description:
    "Is each ad channel spending on pace this month? Each bar shows spend so far against today's ideal pace and the monthly budget. Edit a budget and the projections update straight away.",
  tags: ["Pacing bars", "Inline editing", "Month-end projection"],
  props: [
    { name: "channels", type: "BudgetChannel[]", required: true, description: "{ id, label, budget, spent, icon }. Icon is search, social, video or display." },
    { name: "month", type: "string", description: "YYYY-MM. Sets the number of days in the month." },
    { name: "asOf", type: "string", description: "YYYY-MM-DD, the day spend is counted to. Defaults to today." },
    { name: "tolerance", type: "{ over?: number; under?: number }", default: "{ over: 0.05, under: 0.15 }", description: "Fractions of budget. Projected spend outside this band is flagged." },
    { name: "eyebrow · title", type: "string", description: "Optional header text." },
    { name: "currency · locale", type: "string", default: '"USD" · "en-US"', description: "ISO currency and number locale." },
    { name: "source", type: "string", description: "Optional footer note." },
    { name: "view · defaultView · onViewChange", type: '"spent" | "projected"', default: '— · "spent"', description: "Controlled or uncontrolled view." },
    { name: "sort · defaultSort · onSortChange", type: '"default" | "used"', default: '— · "default"', description: "Data order, or highest % of budget used first." },
    { name: "onBudgetChange", type: "(detail: BudgetChange) => void", description: "Fires after a budget is saved with { id, label, budget, previous, spent, projected, status }." },
    { name: "labels", type: "Partial<BudgetLabels>", description: "Override any built-in text." },
  ],
  usage: `import { AdSpendBudgetTracker } from "@/components/gallery/ad-spend-budget-tracker/AdSpendBudgetTracker";

<AdSpendBudgetTracker
  month="2026-09"
  asOf="2026-09-18"
  channels={[
    { id: "search", label: "Search Ads",
      icon: "search", budget: 12000, spent: 7480 },
    { id: "social", label: "Social Ads",
      icon: "social", budget: 8000, spent: 5620 },
  ]}
  onBudgetChange={(d) => console.log(d.id, d.budget)}
/>`,
  usageNote:
    "Click a budget to edit it: Enter saves, Escape cancels. Ideal pace = budget × days so far ÷ days in month; projected = spend so far ÷ days so far × days in month.",
  prompt: PROMPT,
};
