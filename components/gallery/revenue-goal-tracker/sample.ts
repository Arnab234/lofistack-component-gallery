import type { RevenueGoalTrackerProps } from "./RevenueGoalTracker";

/** Example data used by the preview. Fictional clients, not real revenue. */
export const SAMPLE = {
  eyebrow: "Q3 2026 revenue goal",
  title: "New retainer revenue",
  goal: 120000,
  currency: "USD",
  start: "2026-07-01",
  end: "2026-09-30",
  today: "2026-08-19",
  milestones: [25, 50, 75, 100],
  sales: [
    { client: "Brightside Dental", amount: 4800, date: "2026-07-03" },
    { client: "Cedar Fitness Co.", amount: 2400, date: "2026-07-07" },
    { client: "Harbor & Pine Realty", amount: 6500, date: "2026-07-10" },
    { client: "Maple Street Bakery", amount: 1850, date: "2026-07-14" },
    { client: "Northgate Auto Care", amount: 3200, date: "2026-07-17" },
    { client: "Lumen Yoga Studio", amount: 2250, date: "2026-07-22" },
    { client: "Riverbend Vet Clinic", amount: 5400, date: "2026-07-28" },
    { client: "Oakline Roofing", amount: 7800, date: "2026-08-02" },
    { client: "Summit Physio", amount: 3600, date: "2026-08-05" },
    { client: "Bluebird Florist", amount: 1500, date: "2026-08-09" },
    { client: "Brightside Dental", amount: 4800, date: "2026-08-12" },
    { client: "Cedar Fitness Co.", amount: 2400, date: "2026-08-14" },
    { client: "Harbor & Pine Realty", amount: 6500, date: "2026-08-17" },
    { client: "Greenway Landscaping", amount: 4350, date: "2026-08-18" },
  ],
} satisfies Omit<RevenueGoalTrackerProps, "ref">;

export const PROMPT = `Build component 26 for my LofiStack Component Gallery: a Revenue Goal Tracker for a quarterly revenue target.

It should show:

* The goal name, the period dates and which day of the period it is
* The amount raised (animating when it changes), the goal, the % reached and an On pace / Behind pace / Goal reached pill
* A progress meter with milestone markers (25/50/75/100% by default, the next one pulsing) and a "pace today" marker for where you should be by now
* How far to the next milestone and how far ahead of or behind today's pace you are
* A run-rate panel: current daily run-rate against the daily rate you now need, a plain-language verdict, days left, remaining and projected total
* A "Log a sale" form (client + amount, quick-fill chips, validation) with a recent sales list and Undo
* A toast and a small burst of confetti when a sale crosses a milestone

Requirements:

* React + TypeScript + Tailwind CSS. Every value comes in through typed props; nothing hardcoded. A callback on every added or undone sale, plus addSale() and undo() on a ref.
* Work out run-rate (raised ÷ days so far), required rate (remaining ÷ days left), projected total and pace from the dates and sales.
* Fully responsive: two panels side by side on desktop, stacked on tablets, compact form and stats on phones.
* Light and dark themes through CSS variables.
* Hover, focus, invalid, disabled and celebration states; respects reduced motion (no confetti or number tweening).
* Accessible: a labelled meter with value text, labelled inputs with error messages, screen-reader announcements for every change.
* Give it its own page in the gallery with a live preview, a reset control, a props table and a usage example.`;
