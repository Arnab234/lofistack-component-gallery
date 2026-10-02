import type { KpiMetric, KpiPeriod } from "./KpiDashboard";

/** Example data used by the preview. Not real client results. */
export const SAMPLE = {
  eyebrow: "Performance",
  title: "Growth dashboard",
  subtitle: "Brightside Dental · all channels",
  end: "2026-09-30",
  currency: "USD",
  source: "Source: CRM, ad accounts and website analytics",
};

export const SAMPLE_PERIODS: KpiPeriod[] = [
  { id: "7d", label: "7D", days: 7, bucket: 1 },
  { id: "30d", label: "30D", days: 30, bucket: 1 },
  { id: "90d", label: "90D", days: 90, bucket: 6 },
];

export const SAMPLE_METRICS: KpiMetric[] = [
  {
    id: "revenue",
    label: "Revenue",
    format: "currency",
    series: {
      "7d": [3940, 5280, 4030, 3660, 4230, 5120, 7050],
      "30d": [3790, 3660, 3880, 5560, 2840, 3820, 5260, 3690, 3600, 6140, 7020, 3690, 3870, 5450, 3850, 5410, 4190, 5730, 3640, 4230, 5320, 3860, 4790, 3940, 5280, 4030, 3660, 4230, 5120, 7050],
      "90d": [22980, 22530, 22870, 21600, 23600, 22580, 27320, 23400, 26650, 26150, 23550, 29400, 28500, 25780, 29370],
    },
    previous: { "7d": 31760, "30d": 126100, "90d": 293820 },
  },
  {
    id: "sessions",
    label: "Sessions",
    format: "int",
    series: {
      "7d": [726, 691, 535, 525, 752, 742, 701],
      "30d": [644, 670, 665, 703, 451, 463, 708, 660, 636, 748, 735, 507, 471, 686, 637, 753, 708, 682, 516, 558, 706, 665, 660, 726, 691, 535, 525, 752, 742, 701],
      "90d": [3546, 3515, 3647, 3552, 3896, 3710, 3888, 3754, 3709, 3814, 3596, 3994, 3937, 3831, 3946],
    },
    previous: { "7d": 4495, "30d": 18875, "90d": 49186 },
  },
  {
    id: "leads",
    label: "Leads",
    format: "int",
    series: {
      "7d": [27, 25, 18, 19, 27, 28, 29],
      "30d": [26, 24, 21, 26, 16, 18, 23, 23, 22, 30, 31, 20, 18, 27, 20, 27, 24, 25, 21, 22, 27, 21, 27, 27, 25, 18, 19, 27, 28, 29],
      "90d": [123, 119, 116, 122, 137, 126, 142, 124, 138, 141, 131, 149, 141, 145, 146],
    },
    previous: { "7d": 167, "30d": 671, "90d": 1588 },
  },
  {
    id: "booked",
    label: "Booked calls",
    format: "int",
    series: {
      "7d": [11, 12, 8, 8, 11, 13, 13],
      "30d": [11, 11, 9, 12, 7, 8, 10, 10, 10, 13, 14, 9, 8, 11, 10, 13, 10, 10, 9, 10, 11, 10, 11, 11, 12, 8, 8, 11, 13, 13],
      "90d": [56, 51, 51, 56, 60, 56, 62, 54, 60, 62, 58, 66, 62, 62, 65],
    },
    previous: { "7d": 71, "30d": 294, "90d": 701 },
  },
  { id: "cpl", label: "Cost per lead", format: "currency2", better: "down", ratio: { of: "spend", per: "leads" } },
  { id: "close", label: "Close rate", format: "percent", ratio: { of: "won", per: "booked" } },
  {
    id: "spend",
    label: "Ad spend",
    format: "currency",
    hidden: true,
    series: {
      "7d": [604, 710, 632, 675, 633, 650, 638],
      "30d": [684, 659, 624, 631, 695, 709, 674, 692, 701, 588, 614, 638, 713, 666, 637, 662, 617, 628, 671, 604, 635, 669, 722, 604, 710, 632, 675, 633, 650, 638],
      "90d": [3661, 3850, 3716, 3916, 3746, 3947, 3978, 3943, 3879, 3945, 4002, 3907, 3923, 3905, 3938],
    },
    previous: { "7d": 4546, "30d": 19692, "90d": 55436 },
  },
  {
    id: "won",
    label: "Deals won",
    format: "int",
    hidden: true,
    series: {
      "7d": [3, 4, 3, 3, 3, 4, 5],
      "30d": [3, 3, 3, 4, 2, 3, 4, 3, 3, 5, 5, 3, 3, 4, 3, 4, 3, 4, 3, 3, 4, 3, 4, 3, 4, 3, 3, 3, 4, 5],
      "90d": [18, 18, 17, 17, 18, 18, 21, 18, 20, 19, 18, 23, 21, 20, 22],
    },
    previous: { "7d": 24, "30d": 96, "90d": 227 },
  },
];

export const PROMPT = `Build component 05 for my LofiStack Component Gallery: a KPI Metrics Dashboard in a bento grid.

It should show:

* An optional eyebrow, title and subtitle, the date range, and a 7D / 30D / 90D period switch with a sliding thumb
* Six headline numbers (revenue, sessions, leads, booked calls, cost per lead, close rate) as tiles, one of them in a large hero slot
* For each tile: the total for the period, the % change (or points for rates) against the previous period with good/bad colouring, a note line and a sparkline
* Ratio metrics such as cost per lead (spend ÷ leads) and close rate (won ÷ booked) worked out point by point from hidden metrics
* In the hero tile: gridlines, a dashed previous-period average line, first and last dates, and the high and low points
* A sparkline tooltip I can read by hover, tap, or by focusing the chart and using the arrow keys, Home and End
* Clicking a tile (or pressing Enter) moves it into the hero slot with a smooth FLIP animation

Requirements:

* React + TypeScript + Tailwind CSS. Metrics, periods, labels and text come in through typed props; nothing hardcoded.
* Values and sparklines tween when the period changes; respect reduced motion.
* Controlled or uncontrolled period and hero, with onPeriodChange and onSelect callbacks.
* Fully responsive: three columns on desktop, two on tablets with the hero full width, one on phones where small tiles become compact rows.
* Light and dark themes through CSS variables.
* Hover, focus-visible and pressed states; screen-reader labels for each tile and live announcements for changes.
* Give it its own page in the gallery with a live preview, a reset-layout button, a props table and a usage example.`;
