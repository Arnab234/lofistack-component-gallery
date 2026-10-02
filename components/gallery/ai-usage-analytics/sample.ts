import type { AiUsageAnalyticsProps } from "./AiUsageAnalytics";

/** Example data: generic model tiers and made-up prices, not a real bill. */
export const SAMPLE: AiUsageAnalyticsProps = {
  eyebrow: "AI usage",
  title: "Workspace usage · Cedar Fitness Co.",
  start: "2026-08-26",
  asOf: "2026-09-24",
  billingStart: "2026-09-01",
  quota: 400000000,
  budget: 300,
  currency: "USD",
  models: [
    { id: "large", label: "Large model", pricePerMillion: 6.0 },
    { id: "fast", label: "Fast model", pricePerMillion: 0.6 },
    { id: "embed", label: "Embeddings", pricePerMillion: 0.1 },
  ],
  series: {
    large: {
      tokens: [1003000, 1126000, 1308000, 697000, 749000, 1169000, 1196000, 1067000, 1388000, 1249000, 653000, 767000, 1432000, 1207000, 1117000, 1337000, 1442000, 610000, 771000, 1265000, 1376000, 1355000, 1156000, 1186000, 828000, 690000, 1522000, 1464000, 1433000, 1384000],
      requests: [932, 909, 825, 478, 503, 857, 854, 856, 821, 846, 505, 518, 903, 907, 915, 871, 1016, 495, 523, 1034, 1045, 1003, 1026, 1061, 580, 569, 1006, 984, 1079, 1021],
    },
    fast: {
      tokens: [3138000, 3628000, 3262000, 2113000, 1968000, 3800000, 3926000, 3554000, 3369000, 3431000, 2020000, 2043000, 3816000, 3931000, 3254000, 3605000, 4096000, 1772000, 2156000, 3305000, 3213000, 3508000, 4021000, 3390000, 2419000, 2362000, 3700000, 3541000, 4404000, 4253000],
      requests: [4805, 5175, 5376, 3031, 2917, 5077, 5344, 5324, 5178, 5143, 2815, 3000, 5195, 5913, 5062, 5662, 6045, 2783, 2945, 5669, 6169, 5424, 6020, 6022, 3500, 3160, 6039, 5703, 5599, 6521],
    },
    embed: {
      tokens: [6306000, 6264000, 6326000, 2930000, 3734000, 5444000, 6533000, 6003000, 6488000, 5966000, 3859000, 3464000, 6490000, 5618000, 7348000, 5732000, 6973000, 3701000, 4008000, 10626000, 5990000, 6063000, 6675000, 7506000, 4007000, 3435000, 7301000, 7854000, 7191000, 6889000],
      requests: [2365, 2428, 2166, 1319, 1432, 2323, 2619, 2298, 2672, 2439, 1358, 1430, 2444, 2695, 2405, 2778, 2460, 1348, 1356, 3684, 2879, 2680, 2412, 2427, 1455, 1458, 2627, 3001, 2545, 2586],
    },
  },
  source: "Usage metered hourly · prices are blended per million tokens",
};

export const PROMPT = `Build component 28 for my LofiStack Component Gallery: an AI Usage Analytics card for a workspace's AI spend.

It should show:

* Daily usage as a stacked bar chart by model tier (up to three), switchable between tokens, requests and cost
* A 14-day / 30-day range switch
* KPIs: total for the range, daily average (with the weekday average) and the peak day
* A legend with each model's total that isolates a model when clicked
* A hover / tap / keyboard tooltip with each model's value and the day total; weekends shaded
* A dark side panel with a monthly token quota ring (used plus forecast), tokens used, forecast and days left
* A month-to-date cost estimate with the projected month-end bill against an optional budget (under / over budget) and cost by model

Requirements:

* React + TypeScript + Tailwind CSS. Models, daily series, dates, quota, budget, currency and labels come in through typed props; nothing hardcoded.
* Work out cost (tokens ÷ 1M × price per million) and month-end forecasts from the daily rate so far.
* Fire a callback on every filter change; controlled or uncontrolled metric, range and model.
* Fully responsive: side panel moves under the chart on tablets and stacks on phones.
* Light and dark themes through CSS variables. Bars grow in when the chart scrolls into view; reduced motion respected.
* Accessible chart: arrow keys, Home / End and Escape, live announcements and a screen-reader table.
* Give it its own page in the gallery with a live preview, a quota control, a replay-animation button, a props table and a usage example.`;
