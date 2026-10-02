/** Example figures used by the preview. Not real campaign data. */
export const SAMPLE = {
  name: "Autumn Lead Gen — Retargeting",
  platform: "Meta Ads",
  start: "2026-09-01",
  end: "2026-09-24",
  currency: "USD",
  spend: 12480,
  results: 386,
  ctr: 1.84,
  roas: 4.2,
  series: [9, 11, 10, 13, 12, 14, 11, 15, 16, 14, 17, 15, 18, 19, 16, 17, 20, 18, 21, 19, 22, 20, 23, 16],
  deltas: { spend: 6.0, results: 14.3, cost: -7.3, ctr: 3.9, roas: 9.8 },
};

export const PROMPT = `Build component 02 for my LofiStack Component Gallery: a Campaign Performance Snapshot card for ad campaigns.

It should show, for one campaign:

* Campaign name, ad platform and status (Active, Learning, Paused, Ended)
* Date range and number of days
* ROAS as the hero number, with spend vs revenue bars and a break-even marker
* Total spend, results (leads or purchases), CPL/CPA and CTR
* % change vs the previous period for each metric (a lower CPL/CPA counts as good)
* A daily results line chart I can hover, tap, or step through with the arrow keys

Requirements:

* React + TypeScript + Tailwind CSS. Every value comes in through typed props; nothing hardcoded.
* Work out cost per result (spend ÷ results) and revenue (spend × ROAS) when they are not passed in.
* Fully responsive: two panels side by side on desktop, stacked on narrow containers.
* Light and dark themes through CSS variables.
* Hover, focus and status states, accessible chart (keyboard + screen-reader table).
* Give it its own page in the gallery with a live preview, status/goal controls, a props table and a usage example.`;
