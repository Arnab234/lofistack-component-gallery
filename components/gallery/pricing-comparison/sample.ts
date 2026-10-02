import type { PricingTier } from "./PricingComparison";

/** Example plans used by the preview. Not real pricing. */
export const SAMPLE = {
  eyebrow: "Pricing",
  title: "Plans that grow with your client list",
  subtitle: "Start small and move up when you need more. Change or cancel your plan at any time.",
  currency: "USD",
  footnote: "Prices in USD, before tax.",
};

export const SAMPLE_TIERS: PricingTier[] = [
  {
    id: "starter",
    name: "Starter",
    description: "For solo operators getting their first automations live.",
    price: { monthly: 29, yearly: 24 },
    cta: { label: "Start with Starter" },
    features: [
      "1 workspace",
      "Up to 2,500 contacts",
      "10 active workflows",
      "Email support",
      { text: "Custom reporting", included: false },
      { text: "API & webhooks", included: false },
    ],
  },
  {
    id: "growth",
    name: "Growth",
    description: "For small teams running campaigns for several clients.",
    price: { monthly: 79, yearly: 64 },
    cta: { label: "Choose Growth" },
    features: ["5 workspaces", "Up to 25,000 contacts", "Unlimited workflows", "Priority email & chat support", "Custom reporting", "API & webhooks"],
  },
  {
    id: "scale",
    name: "Scale",
    description: "For agencies managing many client accounts at once.",
    price: { monthly: 199, yearly: 159 },
    cta: { label: "Choose Scale" },
    features: ["Unlimited workspaces", "Up to 250,000 contacts", "Unlimited workflows", "Dedicated success manager", "Custom reporting", "API & webhooks"],
  },
];

export const PROMPT = `Build component 03 for my LofiStack Component Gallery: a Pricing Comparison Card for SaaS or agency plans.

It should show:

* An optional eyebrow, title and subtitle above the plans
* A monthly / yearly billing switch with a sliding thumb and a "Save X%" badge worked out from the plan prices
* Three plans side by side, each with a name, one-line description, price, billing line and a call-to-action button
* One highlighted plan with a raised panel, an accent outline and a "Most popular" badge
* A feature list per plan with included and not-included items
* On yearly billing, the yearly total and how much the plan saves
* An optional footnote under the plans

Requirements:

* React + TypeScript + Tailwind CSS. Every plan, price, feature and label comes in through typed props; nothing hardcoded.
* Work out the saving badge and yearly totals from the prices; support quote-only plans with a custom price label.
* Prices animate in when the billing period changes, and screen readers hear which prices are shown.
* Callbacks for billing changes and plan selection (plan id, name, period, price, currency).
* Fully responsive: rows line up across plans on desktop, one plan per row with features beside the details on tablets, stacked on phones.
* Light and dark themes through CSS variables.
* Hover, focus-visible, pressed and reduced-motion states; accessible toggle and feature list.
* Give it its own page in the gallery with a live preview, a highlighted-plan control, a props table and a usage example.`;
