/** Example data used by the preview. Fictional client and people, not a real account. */
import type { ActivityEvent } from "./ActivityTimeline";

export const SAMPLE = {
  eyebrow: "Account activity",
  title: "Brightside Dental",
  subtitle: "Calls, emails, form fills, deals and notes from the last 5 days",
  now: "2026-10-02T16:30:00",
};

export const SAMPLE_EVENTS: ActivityEvent[] = [
  {
    id: "a21",
    type: "deal",
    time: "2026-10-02T16:02:00",
    actor: "Luis Ortega",
    title: "Deal moved to Proposal sent",
    summary: "Spring whitening retainer · $4,800 per month",
    details: [["Stage", "Discovery → Proposal sent"], ["Value", "$4,800 / mo"], ["Expected close", "Oct 16"]],
  },
  {
    id: "a20",
    type: "email",
    time: "2026-10-02T15:20:00",
    actor: "Luis Ortega",
    title: "Proposal emailed to Dr. Elena Brooks",
    summary: "Q4 growth proposal with three package options.",
    details: [["Opens", "2"], ["Attachment", "Q4-proposal.pdf"], ["Reply", "None yet"]],
  },
  {
    id: "a19",
    type: "call",
    time: "2026-10-02T14:05:00",
    actor: "Luis Ortega",
    title: "Discovery call with Dr. Elena Brooks",
    summary: "Goals for new-patient bookings and current ad spend.",
    details: [["Duration", "24 min"], ["Outcome", "Proposal requested"], ["Next step", "Send proposal today"]],
    note: "Wants roughly 40 more new patients a month before spring. Open to a longer retainer if reporting stays weekly.",
  },
  {
    id: "a18",
    type: "form",
    time: "2026-10-02T11:42:00",
    actor: "Website form",
    title: "New lead from “Book a cleaning”",
    summary: "Jordan Miles asked for a weekday morning appointment.",
    details: [["Source", "Search Ads"], ["Page", "/book-cleaning"], ["First reply", "6 min"]],
  },
  {
    id: "a17",
    type: "note",
    time: "2026-10-02T09:15:00",
    actor: "Maya Chen",
    title: "Internal note",
    summary: "Reception is short-staffed on Fridays. Route calls to Sam until 1 PM.",
  },
  {
    id: "a16",
    type: "email",
    time: "2026-10-01T17:30:00",
    actor: "Maya Chen",
    title: "September report sent",
    summary: "712 leads in September; cost per lead down 5.8%.",
    details: [["Opens", "1"], ["Attachment", "September-report.pdf"], ["Recipients", "2"]],
  },
  {
    id: "a15",
    type: "call",
    time: "2026-10-01T15:10:00",
    actor: "Maya Chen",
    title: "Check-in call with Sam Patel",
    summary: "Went through new ad copy for the October campaign.",
    details: [["Duration", "11 min"], ["Outcome", "Copy approved"]],
  },
  {
    id: "a14",
    type: "form",
    time: "2026-10-01T13:48:00",
    actor: "Website form",
    title: "New lead from “Free consultation”",
    summary: "Ana Ruiz asked about clear aligners.",
    details: [["Source", "Social Ads"], ["Page", "/consultation"], ["First reply", "14 min"]],
  },
  {
    id: "a13",
    type: "deal",
    time: "2026-10-01T10:20:00",
    actor: "Luis Ortega",
    title: "Deal created: Spring whitening retainer",
    summary: "Opened from the September report conversation.",
    details: [["Stage", "Discovery"], ["Value", "$4,800 / mo"], ["Owner", "Luis Ortega"]],
  },
  {
    id: "a12",
    type: "note",
    time: "2026-10-01T09:02:00",
    actor: "Priya Shah",
    title: "Internal note",
    summary: "Paused the weakest video ad set and moved its budget to search.",
  },
  {
    id: "a11",
    type: "email",
    time: "2026-09-30T16:40:00",
    actor: "Elena Brooks",
    title: "Reply from Dr. Elena Brooks",
    summary: "“Happy with September. Can we talk about spring?”",
    details: [["Thread", "September results"], ["Replied after", "2 h 10 min"]],
  },
  {
    id: "a10",
    type: "form",
    time: "2026-09-30T14:15:00",
    actor: "Website form",
    title: "New lead from “Book a cleaning”",
    summary: "Chris Novak prefers Saturday appointments.",
    details: [["Source", "Search Ads"], ["Page", "/book-cleaning"], ["First reply", "9 min"]],
  },
  {
    id: "a09",
    type: "call",
    time: "2026-09-30T11:05:00",
    actor: "Maya Chen",
    title: "Missed call from Sam Patel",
    summary: "Voicemail about Saturday opening hours. Called back at 11:20.",
    details: [["Duration", "Voicemail · 0:48"], ["Outcome", "Called back"]],
  },
  {
    id: "a08",
    type: "note",
    time: "2026-09-30T09:30:00",
    actor: "Priya Shah",
    title: "Internal note",
    summary: "Launched the October search campaign with three new ad groups.",
  },
  {
    id: "a07",
    type: "deal",
    time: "2026-09-29T15:55:00",
    actor: "Luis Ortega",
    title: "Deal won: Ad management renewal",
    summary: "Renewed for another six months.",
    details: [["Stage", "Negotiation → Won"], ["Value", "$2,400 / mo"], ["Term", "6 months"]],
  },
  {
    id: "a06",
    type: "email",
    time: "2026-09-29T13:30:00",
    actor: "Maya Chen",
    title: "Invoice #1042 sent",
    summary: "Monthly ad management fee.",
    details: [["Amount", "$2,400"], ["Due", "Oct 13"], ["Opens", "1"]],
  },
  {
    id: "a05",
    type: "form",
    time: "2026-09-29T10:10:00",
    actor: "Website form",
    title: "New lead from “Free consultation”",
    summary: "Morgan Lee asked about dental implants.",
    details: [["Source", "Organic search"], ["Page", "/consultation"], ["First reply", "21 min"]],
  },
  {
    id: "a04",
    type: "call",
    time: "2026-09-28T16:20:00",
    actor: "Maya Chen",
    title: "Strategy call with Dr. Elena Brooks",
    summary: "Agreed lead and cost targets for Q4.",
    details: [["Duration", "32 min"], ["Outcome", "Targets agreed"], ["Next step", "Share September report"]],
    note: "Q4 targets: 750 leads a month and cost per lead under $28.",
  },
  {
    id: "a03",
    type: "note",
    time: "2026-09-28T14:00:00",
    actor: "Maya Chen",
    title: "Internal note",
    summary: "Added Q4 targets to the account plan.",
  },
  {
    id: "a02",
    type: "email",
    time: "2026-09-28T11:30:00",
    actor: "Priya Shah",
    title: "Welcome sequence updated",
    summary: "Two new emails added to the new-patient welcome sequence.",
    details: [["Sequence", "New patient welcome"], ["Emails", "5 → 7"]],
  },
  {
    id: "a01",
    type: "form",
    time: "2026-09-28T09:45:00",
    actor: "Website form",
    title: "New lead from “Book a cleaning”",
    summary: "Riley Owens asked for a family appointment.",
    details: [["Source", "Social Ads"], ["Page", "/book-cleaning"], ["First reply", "12 min"]],
  },
];

export const PROMPT = `Build component 12 for my LofiStack Component Gallery: an Activity Timeline for a client account.

It should show:

* Eyebrow, title and subtitle, plus a Newest / Oldest sort switch
* A side panel with the number of activities, how many days they cover, when the last one happened and a colour mix bar by type
* Type filters (All, Call, Email, Form, Deal, Note) with counts; several can be on at once, with a "Clear filters" link
* A vertical timeline grouped by day ("Today", "Yesterday", weekday), each day with its event count
* Each event with a coloured icon node, title, type, actor initials and name, summary and a relative time ("12 min ago", "2 h ago", "4:02 PM")
* Click an event to expand its details (label/value pairs, an optional quoted note and the full date and actor)
* "Show N more" paging with a "Showing X of Y" count

Requirements:

* React + TypeScript + Tailwind CSS. Every value comes in through typed props; nothing hardcoded. Counts, grouping and relative times are worked out from the events.
* Optional fixed "now", page size, renamed types, overridable labels and a date locale.
* onActivityOpen, onFilterChange and onSortChange callbacks, plus expand(id) and collapseAll() through a ref.
* Fully responsive: side panel on the left on desktop, filters as a chip row above the feed on tablets, compact rows on phones.
* Light and dark themes through CSS variables.
* Hover, focus, pressed and expanded states, staggered entrance animation for new items, live announcements for screen readers, reduced-motion support.
* Give it its own page in the gallery with a live preview, a "Collapse all" control, a props table and a usage example.`;
