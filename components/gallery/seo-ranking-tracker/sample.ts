import type { TrackedKeyword } from "./SeoRankingTracker";

const WEEKS = ["Aug 14", "Aug 21", "Aug 28", "Sep 4", "Sep 11", "Sep 18", "Sep 25", "Oct 2"];

/** Fictional sites and rankings used by the preview. Not real client results. */
export const BRIGHTSIDE = {
  eyebrow: "Rank tracking",
  title: "Organic keyword positions",
  site: "brightside-dental.example · local results, desktop",
  period: "Week of 2 Oct 2026 · vs 25 Sep",
  weeks: WEEKS,
  source: "Weekly position checks, top 100 results",
  keywords: [
    { keyword: "emergency dentist near me", url: "/emergency-dental", intent: "Local", volume: 6600, best: 3, history: [14, 12, 11, 9, 8, 6, 5, 4] },
    { keyword: "teeth whitening cost", url: "/teeth-whitening", intent: "Commercial", volume: 2900, best: 3, history: [9, 9, 8, 8, 7, 7, 6, 3] },
    { keyword: "clear aligners near me", url: "/clear-aligners", intent: "Local", volume: 1900, best: 2, history: [5, 4, 4, 3, 3, 2, 2, 2] },
    { keyword: "dental implants price", url: "/dental-implants", intent: "Commercial", volume: 4400, history: [22, 19, 18, 16, 15, 13, 12, 11] },
    { keyword: "family dentist brightside", url: "/", intent: "Brand", volume: 880, history: [1, 1, 1, 1, 1, 1, 1, 1] },
    { keyword: "root canal specialist", url: "/root-canal", intent: "Commercial", volume: 1300, best: 5, history: [6, 7, 7, 8, 9, 9, 8, 11] },
    { keyword: "kids dentist", url: "/pediatric-dentistry", intent: "Local", volume: 2400, history: [18, 17, 15, 14, 12, 10, 9, 8] },
    { keyword: "sedation dentistry", url: "/sedation", intent: "Informational", volume: 720, best: 9, history: [11, 11, 10, 12, 13, 14, 15, 17] },
    { keyword: "dentist open saturday", url: "/hours", intent: "Local", volume: 1600, history: [3, 3, 2, 2, 2, 1, 1, 1] },
    { keyword: "veneers before and after", url: "/veneers", intent: "Informational", volume: 3600, history: [31, 28, 27, 25, 24, 22, 21, 19] },
    { keyword: "gum disease treatment", url: "/periodontics", intent: "Commercial", volume: 1000, best: 7, history: [8, 8, 9, 9, 10, 11, 11, 13] },
    { keyword: "same day crowns", url: "/crowns", intent: "Commercial", volume: 590, history: [15, 14, 13, 10, 9, 7, 7, 6] },
    { keyword: "dental bonding cost", url: "/cosmetic-bonding", intent: "Commercial", volume: 480, history: [null, null, 48, 41, 36, 30, 27, 24] },
  ] satisfies TrackedKeyword[],
};

export const CEDAR = {
  eyebrow: "Rank tracking",
  title: "Organic keyword positions",
  site: "cedarfitness.example · local results, mobile",
  period: "Week of 2 Oct 2026 · vs 25 Sep",
  weeks: WEEKS,
  source: "Weekly position checks, top 100 results",
  keywords: [
    { keyword: "gym near me", url: "/", intent: "Local", volume: 9900, history: [24, 22, 21, 19, 18, 18, 16, 15] },
    { keyword: "personal trainer near me", url: "/personal-training", intent: "Local", volume: 2900, history: [7, 7, 6, 6, 5, 5, 4, 4] },
    { keyword: "hiit classes", url: "/classes/hiit", intent: "Local", volume: 1300, history: [12, 10, 9, 9, 8, 7, 7, 5] },
    { keyword: "24 hour gym", url: "/membership", intent: "Commercial", volume: 5400, best: 8, history: [9, 9, 10, 11, 11, 12, 13, 15] },
    { keyword: "beginner yoga class", url: "/classes/yoga", intent: "Local", volume: 1000, history: [3, 3, 3, 2, 2, 2, 1, 1] },
    { keyword: "gym membership prices", url: "/pricing", intent: "Commercial", volume: 2400, best: 4, history: [6, 6, 5, 5, 6, 6, 5, 6] },
    { keyword: "spin class schedule", url: "/classes/cycle", intent: "Local", volume: 720, best: 1, history: [2, 2, 2, 3, 3, 4, 4, 4] },
    { keyword: "strength training program", url: "/blog/strength-101", intent: "Informational", volume: 1900, history: [null, null, null, 62, 44, 38, 31, 28] },
    { keyword: "kettlebell class", url: "/classes/kettlebell", intent: "Local", volume: 390, history: [null, null, null, null, null, null, null, 37] },
  ] satisfies TrackedKeyword[],
};

export const PROMPT = `Build component 10 for my LofiStack Component Gallery: an SEO Ranking Tracker for a site's tracked keywords.

It should show:

* A header with eyebrow, title, site and search settings, and the week being reported
* Summary stats: average position with the change vs last week, keywords in the top 3 and top 10, and how many moved up or down this week
* A position spread bar (1–3, 4–10, 11–20, 21–100, not ranking) with a legend
* A sortable table: keyword with ranking URL and intent tag, this week's position (top 3 and top 10 highlighted), weekly change (with New and Lost), best position, monthly search volume and an eight-week rank sparkline
* Search, filter chips (All, Top 3, Top 10, Improved, Declined) with counts, and an empty state with Clear filters
* Rows that open to a full history chart (top-10 band, best-position line, hover or arrow-key tooltip) next to key facts

Requirements:

* React + TypeScript + Tailwind CSS. Keywords come in as typed props with weekly history; change, best, range and the summary are worked out inside.
* Controlled or uncontrolled sort and filter, with onSortChange, onFilterChange and onKeywordSelect callbacks.
* Fully responsive: the Best column hides on tablet; on phones rows become stacked cards with labels and a sort dropdown replaces the column headers.
* Light and dark themes through CSS variables.
* Hover, focus, pressed, open, empty and animated row states that respect reduced motion.
* Accessibility: aria-sort on headers, expandable rows with aria-expanded, keyboard chart, screen-reader tables and live announcements.
* Give it its own page in the gallery with a live preview, a client switcher, a props table and a usage example.`;
