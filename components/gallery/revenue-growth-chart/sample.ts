import type { RevenuePoint } from "./RevenueGrowthChart";

/** Example data used by the preview. Not real client results. */
export const SAMPLE: {
  eyebrow: string;
  title: string;
  subtitle: string;
  currency: string;
  series: RevenuePoint[];
  source: string;
} = {
  eyebrow: "Revenue growth",
  title: "Membership revenue · Cedar Fitness Co.",
  subtitle: "Memberships and class packs, by month",
  currency: "USD",
  series: [
    { month: "2025-10", revenue: 31200, lastYear: 24800 },
    { month: "2025-11", revenue: 32850, lastYear: 25900 },
    { month: "2025-12", revenue: 30400, lastYear: 23700 },
    { month: "2026-01", revenue: 36900, lastYear: 29800 },
    { month: "2026-02", revenue: 38200, lastYear: 30500 },
    { month: "2026-03", revenue: 39750, lastYear: 31200 },
    { month: "2026-04", revenue: 41300, lastYear: 32400 },
    { month: "2026-05", revenue: 42100, lastYear: 33100 },
    { month: "2026-06", revenue: 40800, lastYear: 31900 },
    { month: "2026-07", revenue: 44600, lastYear: 34300 },
    { month: "2026-08", revenue: 47900, lastYear: 36200 },
    { month: "2026-09", revenue: 52400, lastYear: 38900 },
  ],
  source: "Source: billing system export",
};

export const PROMPT = `Build component 15 for my LofiStack Component Gallery: a Revenue Growth Chart.

It should show, for one business:

* An optional eyebrow, title and subtitle
* Monthly revenue as a smooth area line chart with a y-axis grid and month labels
* The total for the selected range, with a growth chip against the same months last year
* The latest month (with its change vs last year) and the monthly average (with the best month)
* A 6 / 12 month range switch, a "Compare to last year" toggle that adds a dashed line, and a "Cumulative" toggle that draws a running total
* A crosshair tooltip with this year, last year and the change, readable by hover, tap or the arrow keys
* A line-draw animation on first view and smooth tweens when the view changes

Requirements:

* React + TypeScript + Tailwind CSS. Every value comes in through typed props; nothing hardcoded.
* Work out the total, growth, latest change, average and best month from the series.
* Fire callbacks when the range or the view toggles change.
* Fully responsive down to phone width, with the stats and controls reflowing on narrow containers.
* Light and dark themes through CSS variables.
* Hover, focus, pressed and empty states; accessible chart (keyboard, live read-out and a screen-reader table).
* Give it its own page in the gallery with a live preview, a replay control, a props table and a usage example.`;
