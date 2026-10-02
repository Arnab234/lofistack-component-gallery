import type { ClientHealthScoreProps } from "./ClientHealthScore";

type Sample = Pick<ClientHealthScoreProps, "client" | "segment" | "asOf" | "compareDate" | "factors">;

/** Example data used by the preview. Not real client results. */
export const BRIGHTSIDE: Sample = {
  client: "Brightside Dental",
  segment: "Growth plan · client since Mar 2025 · account owner Jordan Lee",
  asOf: "2026-10-02",
  compareDate: "2026-07-04",
  factors: [
    {
      key: "engagement", name: "Engagement", weight: 5, score: 82, previous: 61,
      about: "Meeting attendance, reply speed and portal logins over the last 30 days.",
      note: "Joined all 3 monthly reviews this quarter and replies within a day on average.",
      previousNote: "Missed 1 of 3 monthly reviews. Replies took about 3 days.",
    },
    {
      key: "results", name: "Results vs goal", weight: 5, score: 64, previous: 45,
      about: "Booked new patients this quarter as a share of the agreed goal.",
      note: "41 new patients booked against a goal of 64 (64%).",
      previousNote: "27 new patients booked against a goal of 60 (45%).",
    },
    {
      key: "payments", name: "Payments", weight: 3, score: 95, previous: 90,
      about: "Invoices paid in full and on time over the last 6 months.",
      note: "All 6 invoices paid. One was paid 4 days late.",
      previousNote: "All 6 invoices paid. Two were paid late.",
    },
    {
      key: "support", name: "Support tickets", weight: 3, score: 48, previous: 52,
      about: "Fewer open tickets and faster fixes score higher.",
      note: "5 tickets opened in the last 30 days and 2 are still open.",
      previousNote: "4 tickets opened in the 30 days before and 2 were still open.",
    },
    {
      key: "usage", name: "Product usage", weight: 4, score: 71, previous: 57,
      about: "How many of the 7 core features the team uses each week.",
      note: "Uses 5 of 7 core features weekly. The reporting dashboard is rarely opened.",
      previousNote: "Used 4 of 7 core features weekly.",
    },
  ],
};

export const HARBOR: Sample = {
  client: "Harbor & Pine Realty",
  segment: "Starter plan · client since Nov 2025 · account owner Priya Shah",
  asOf: "2026-10-02",
  compareDate: "2026-07-04",
  factors: [
    { key: "engagement", name: "Engagement", weight: 5, score: 38, previous: 55, about: "Meeting attendance, reply speed and portal logins over the last 30 days.", note: "Skipped the last 2 monthly reviews. Replies take about a week.", previousNote: "Joined 2 of 3 monthly reviews." },
    { key: "results", name: "Results vs goal", weight: 5, score: 30, previous: 48, about: "Qualified seller leads this quarter as a share of the agreed goal.", note: "12 qualified leads against a goal of 40 (30%).", previousNote: "19 qualified leads against a goal of 40 (48%)." },
    { key: "payments", name: "Payments", weight: 3, score: 70, previous: 85, about: "Invoices paid in full and on time over the last 6 months.", note: "One invoice is 21 days overdue.", previousNote: "All invoices paid, one a week late." },
    { key: "support", name: "Support tickets", weight: 3, score: 25, previous: 40, about: "Fewer open tickets and faster fixes score higher.", note: "9 tickets in the last 30 days and 6 are still open.", previousNote: "6 tickets, 4 still open." },
    { key: "usage", name: "Product usage", weight: 4, score: 41, previous: 52, about: "How many of the 7 core features the team uses each week.", note: "Uses 3 of 7 core features weekly, and weekly logins are down by half.", previousNote: "Used 4 of 7 core features, but not every week." },
  ],
};

export const PROMPT = `Build component 20 for my LofiStack Component Gallery: a Client Health Score card for agency client accounts.

It should show, for one client:

* Client name and a short segment line (plan, client since, account owner)
* A 270° radial dial with the 0–100 score, faint Critical / At risk / Healthy zones, tick labels at the band edges and a ghost tick for the other period
* A Healthy / At risk / Critical badge and the change vs 90 days ago (▲/▼)
* A Current / 90 days ago toggle that re-scores everything
* Five weighted factors, each with its score, change, share of the score, a zoned progress bar with a ghost marker, and a 0–10 weight slider showing how many points it adds
* An insight panel that names the biggest lift and biggest drag, and explains a factor (what it measures and the evidence) when I hover or focus it
* A Reset weights button and a footnote explaining the formula and bands

Requirements:

* React + TypeScript + Tailwind CSS. Every value comes in through typed props; nothing hardcoded. Band thresholds and labels are configurable.
* The score is the weighted average of the factor scores; shares are whole percentages that always add up to 100. The dial animates to new scores.
* Fully responsive: dial and factors side by side on desktop, dial and insight side by side on tablets, stacked on phones.
* Light and dark themes through CSS variables.
* Hover, focus, active and disabled states; reduced-motion support.
* Accessible: labelled sliders with value text, a dial with a text label, and a polite live region for score changes. An onScoreChange callback.
* Give it its own page in the gallery with a live preview, an example-client switch, a props table and a usage example.`;
