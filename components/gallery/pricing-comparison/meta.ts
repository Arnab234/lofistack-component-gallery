import type { ComponentMeta } from "@/lib/types";
import { PROMPT } from "./sample";

export const meta: ComponentMeta = {
  slug: "pricing-comparison",
  number: 3,
  week: 2,
  type: "card",
  title: "Pricing Comparison Card",
  navLabel: "Pricing Comparison",
  componentName: "PricingComparison",
  summary:
    "Three plans side by side, with a monthly / yearly switch and one highlighted plan. Prices change smoothly when you switch, and every plan, price and feature comes from typed props.",
  description:
    "Three plans side by side, with a switch between monthly and yearly billing. One plan is highlighted as the recommended choice. Every plan, price and feature comes from typed props.",
  tags: ["Monthly / yearly", "Highlighted plan", "Typed data"],
  props: [
    { name: "tiers", type: "PricingTier[]", required: true, description: "The plans. Each has id, name, description, price, cta, features and optional badge." },
    {
      name: "tiers[].price",
      type: "{ monthly, yearly } | number | null",
      description: "Both per month; yearly is the per-month price when billed yearly. Use null with priceLabel (e.g. \"Custom\") for quote-only plans.",
    },
    { name: "tiers[].priceNote", type: "string", description: "Replaces the billing line under the price." },
    { name: "tiers[].cta", type: "{ label?, href? }", description: "Button label. With an href it renders a link." },
    { name: "tiers[].features", type: "(string | { text, included? })[]", description: "Strings are included. { text, included: false } shows as not included." },
    { name: "tiers[].badge", type: "string", default: '"Most popular"', description: "Label on the highlighted plan." },
    { name: "featured", type: "string", description: "The id of the plan to highlight. Falls back to a tier with featured: true." },
    { name: "billing · defaultBilling", type: '"monthly" | "yearly"', default: '"monthly"', description: "Controlled or starting billing period." },
    { name: "onBillingChange", type: "(billing) => void", description: "Fires when the switch changes." },
    { name: "onPlanSelect", type: "(detail: PlanSelectDetail) => void", description: "Fires when a plan's button is clicked, with id, name, billing, price and currency." },
    { name: "currency · locale", type: "string", default: '"USD" · "en-US"', description: "Any ISO currency code, and the locale for price formatting." },
    { name: "eyebrow · title · subtitle", type: "string", description: "Optional header text." },
    { name: "footnote", type: "string", description: "Optional line under the plans." },
    { name: "labels", type: "Partial<PricingLabels>", description: "Override any UI text, e.g. the toggle, billing lines or save badge." },
  ],
  usage: `import { PricingComparison } from "@/components/gallery/pricing-comparison/PricingComparison";

<PricingComparison
  title="Plans that grow with you"
  currency="USD"
  featured="growth"
  tiers={[
    {
      id: "growth",
      name: "Growth",
      description: "For small teams.",
      price: { monthly: 79, yearly: 64 },
      cta: { label: "Choose Growth", href: "/signup" },
      features: ["5 workspaces", { text: "SSO", included: false }],
    },
  ]}
  onPlanSelect={(plan) => console.log(plan)}
/>`,
  usageNote: "The yearly \"Save\" badge is worked out from the plan prices. onPlanSelect receives the plan, billing period and price.",
  prompt: PROMPT,
};
