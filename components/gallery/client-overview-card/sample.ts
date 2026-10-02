import type { ClientOverviewCardProps } from "./ClientOverviewCard";

/** Fictional client used by the preview. Not real results. */
export const SAMPLE = {
  company: "Harbor & Pine Realty",
  initials: "HP",
  industry: "Residential real estate",
  location: "Portland, Maine",
  website: "harborandpine.example",
  plan: "Growth retainer",
  owner: { name: "Maya Okafor", role: "Account owner" },
  health: {
    status: "healthy",
    score: 82,
    note: "Lead volume is up and invoices are paid on time. Renewal talk is due in early March.",
  },
  currency: "USD",
  mrr: 4800,
  mrrPrevious: 4200,
  mrrCompareLabel: "last quarter",
  clientSince: "2024-03-11",
  renewal: "2027-03-11",
  billing: "Monthly, paid by card",
  asOf: "2026-10-02",
  lastActivity: { date: "2026-09-30T15:20", summary: "Call with Dana Whitfield" },
  services: ["Paid social", "Search ads", "Email nurture", "Landing pages"],
  opportunities: [
    { name: "Second office launch", stage: "Discovery", value: 9200, close: "2026-12-15" },
    { name: "Spring listings campaign", stage: "Proposal", value: 6500, close: "2026-10-20" },
    { name: "Video tour add-on", stage: "Negotiation", value: 1800, close: "2026-10-09" },
  ],
  contacts: [
    { name: "Dana Whitfield", role: "Managing broker", email: "dana@harborandpine.example", phone: "(207) 555-0142", primary: true },
    { name: "Luis Moreno", role: "Marketing coordinator", email: "luis@harborandpine.example", phone: "(207) 555-0187" },
    { name: "Priya Raman", role: "Office manager", email: "priya@harborandpine.example", phone: "(207) 555-0119" },
    { name: "Tom Becker", role: "Lead agent, Falmouth", email: "tom@harborandpine.example", phone: "(207) 555-0163" },
  ],
  notes: [
    { author: "Maya Okafor", date: "2026-09-30T15:40", text: "Dana wants the spring listings plan by 14 Oct. She asked for a short video tour test first." },
    { author: "Jon Ellis", date: "2026-09-22T10:05", text: "Swapped the seller-lead form to two steps. Form completions up from 3.1% to 4.4% in the first week." },
  ],
} satisfies ClientOverviewCardProps;

export const PROMPT = `Build component 07 for my LofiStack Component Gallery: a Client Overview Card, a CRM profile for one client.

It should show:

* Client name, initials avatar, plan, industry and location, plus the account owner
* An account health badge (Healthy, At risk, Critical) with a 0–100 score
* A favourite (star) toggle
* Four stats: monthly revenue with % change vs an earlier period, client since with tenure, open opportunities with total pipeline, and last activity as "days ago"
* Accessible tabs with counts: Overview (opportunities with stage ticks and close dates, account facts, service chips, health note), Contacts (primary badge, copy-email button with a Press Ctrl+C fallback) and Notes (add a note with a button or Ctrl + Enter, newest first)

Requirements:

* React + TypeScript + Tailwind CSS. Every value comes in through typed props; nothing hardcoded.
* Work out initials, MRR change, tenure, pipeline total and relative activity date inside the component.
* Callbacks for tab change, favourite change, note added and email copied.
* Fully responsive: four stats on desktop, two on tablet, stacked header and full-width tabs on phones.
* Light and dark themes through CSS variables.
* Hover, focus, pressed, disabled and empty states; animated tab indicator and new-note highlight that respect reduced motion.
* Accessibility: tablist with arrow keys, Home and End; live announcements; screen-reader text for scores and stages.
* Give it its own page in the gallery with a live preview, health controls, a reset button, a props table and a usage example.`;
