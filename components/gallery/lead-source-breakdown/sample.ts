import type { LeadSource } from "./LeadSourceBreakdown";

/** Example data used by the preview. Not real client results. */
export const SAMPLE = {
  eyebrow: "Lead sources",
  title: "Where this quarter's leads came from",
  period: "Q3 2026 · 1 Jul – 30 Sep",
  currency: "USD",
  sourceNote: "Source: CRM lead records and ad platform spend",
};

export const SAMPLE_Q3: LeadSource[] = [
  { id: "search", label: "Paid search", leads: 412, revenue: 58400, spend: 14420 },
  { id: "social", label: "Paid social", leads: 356, revenue: 41200, spend: 10680 },
  { id: "organic", label: "Organic search", leads: 268, revenue: 46900, spend: 4020 },
  { id: "referral", label: "Referrals", leads: 154, revenue: 39600, spend: 2310 },
  { id: "email", label: "Email", leads: 118, revenue: 17300, spend: 590 },
  { id: "events", label: "Events", leads: 72, revenue: 12800, spend: 5760 },
];

export const SAMPLE_Q2 = {
  title: "Where last quarter's leads came from",
  period: "Q2 2026 · 1 Apr – 30 Jun",
  sources: [
    { id: "search", label: "Paid search", leads: 365, revenue: 51100, spend: 13140 },
    { id: "social", label: "Paid social", leads: 330, revenue: 36300, spend: 10230 },
    { id: "organic", label: "Organic search", leads: 241, revenue: 41700, spend: 3856 },
    { id: "referral", label: "Referrals", leads: 139, revenue: 35200, spend: 2085 },
    { id: "email", label: "Email", leads: 126, revenue: 16900, spend: 630 },
    { id: "events", label: "Events", leads: 64, revenue: 10400, spend: 5248 },
  ] as LeadSource[],
};

export const PROMPT = `Build component 14 for my LofiStack Component Gallery: a Lead Source Breakdown with a donut chart and a legend table.

It should show:

* Eyebrow, title and period, with a Leads / Revenue / Cost per lead switch
* An SVG donut with one segment per source (up to six; more are folded into "Other"), with gaps between segments and an animated sweep
* A centre read-out: the total (or blended cost per lead), or the hovered source's value and share
* A legend table with a colour swatch toggle, the value and the share (with a small bar) for each source, plus a total row
* Hide a source from the legend and the remaining shares add back up to exactly 100%; "N hidden · Show all" brings them back
* Insights: largest share, cheapest leads, priciest leads and most revenue per lead
* An optional footer note for the data source

Requirements:

* React + TypeScript + Tailwind CSS. Every value comes in through typed props; nothing hardcoded. Shares, totals and cost per lead are worked out inside, with largest-remainder rounding.
* A colour-blind-checked six-colour palette as CSS variables; colour follows the source, not its rank.
* onMetricChange and onSourceToggle callbacks, plus toggleSource(), showAll() and replay() through a ref.
* Fully responsive: donut beside the table on desktop, a smaller donut on tablets, stacked on phones.
* Light and dark themes through CSS variables.
* Hovering or focusing a segment or row highlights both; arrow keys, Home, End and Escape on the ring; the legend is a real table; live announcements; reduced-motion support.
* Give it its own page in the gallery with a live preview, a quarter control, a replay button, a props table and a usage example.`;
