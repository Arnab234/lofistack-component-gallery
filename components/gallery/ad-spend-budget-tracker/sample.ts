import type { AdSpendBudgetTrackerProps } from "./AdSpendBudgetTracker";

/** Example data used by the preview. Fictional client, not real spend. */
export const SAMPLE: Omit<AdSpendBudgetTrackerProps, "className"> = {
  eyebrow: "Ad spend pacing",
  title: "Brightside Dental · paid media",
  month: "2026-09",
  asOf: "2026-09-18",
  currency: "USD",
  tolerance: { over: 0.05, under: 0.15 },
  channels: [
    { id: "search", label: "Search Ads", icon: "search", budget: 12000, spent: 7480 },
    { id: "social", label: "Social Ads", icon: "social", budget: 8000, spent: 5620 },
    { id: "video", label: "Video Ads", icon: "video", budget: 5000, spent: 2140 },
    { id: "display", label: "Display", icon: "display", budget: 3000, spent: 1770 },
  ],
  source: "Spend synced from ad accounts · 18 Sep, 09:00",
};

export const PROMPT = `Build component 21 for my LofiStack Component Gallery: an Ad Spend Budget Tracker for one client's paid media this month.

It should show:

* A header with an eyebrow, title, a Spent / Projected switch and a "Sort by % used" button
* A month strip with one cell per day (past, today, future), "Day 18 of 30" and days left
* Summary figures: total budget, spent so far (% of budget and ideal spend today), projected month-end (over/under by how much) and an overall On track / Overpacing / Underpacing pill
* One row per channel (search, social, video, display) with an icon, status pill, a pacing bar with the budget marker, a dashed "ideal pace today" marker and a striped over-budget segment
* % used or projected spend, "spent of budget", and notes like "4.2 pts ahead of pace", "$415/day now", "$377/day to land on budget" or "Hits budget on 26 Sep"
* A budget I can click to edit inline (Enter saves, Escape cancels, invalid values are rejected) and the projections update straight away
* A hover tooltip on each bar, a legend and a source note

Requirements:

* React + TypeScript + Tailwind CSS. Every value comes in through typed props; nothing hardcoded. Ideal pace = budget × days so far ÷ days in month; projected = spend ÷ days so far × days in month; tolerance is configurable.
* Callbacks for budget, view and sort changes. Rows slide into their new order when sorting.
* Fully responsive: three-column rows on desktop, the bar full width under the name on tablets, a compact layout on phones.
* Light and dark themes through CSS variables.
* Hover, focus, pressed, invalid and editing states; reduced-motion support.
* Accessible: labelled controls, a text summary per row for screen readers and a live announcement after a budget is saved.
* Give it its own page in the gallery with a live preview, a reset control, a props table and a usage example.`;
