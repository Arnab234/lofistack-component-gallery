import type { NotificationFooter, NotificationItem } from "./NotificationCenter";

/** Example data used by the preview. Fictional clients and teammates. */
export const SAMPLE_NOW = "2026-10-02T16:30:00";

export const SAMPLE_FOOTER: NotificationFooter = { label: "Notification settings" };

export const SAMPLE_ITEMS: NotificationItem[] = [
  {
    id: "m1", type: "mention", time: "2026-10-02T16:18:00", read: false,
    actor: "Maya Chen", text: "mentioned you in", target: "Brightside Dental · Q4 plan",
    body: "“Can you check the cost-per-lead target before Friday’s call?”",
  },
  {
    id: "s1", type: "system", icon: "payment", time: "2026-10-02T15:52:00", read: false,
    title: "Payment received", body: "Cedar Fitness Co. paid invoice #1043 · $1,850",
  },
  {
    id: "m2", type: "mention", time: "2026-10-02T14:40:00", read: false,
    actor: "Luis Ortega", text: "assigned you", target: "Proposal review", body: "Due Mon, Oct 5",
  },
  {
    id: "s2", type: "system", icon: "warning", time: "2026-10-02T13:05:00", read: false,
    title: "Calendar sync needs attention", body: "Reconnect it to keep booked calls flowing into the CRM.",
    action: { label: "Reconnect", done: "Reconnected" },
  },
  {
    id: "m3", type: "mention", time: "2026-10-02T11:20:00", read: true,
    actor: "Priya Shah", text: "replied to your comment on", target: "October search campaign",
    body: "“Budget moved. The new ad groups are live.”",
  },
  {
    id: "s3", type: "system", icon: "report", time: "2026-10-01T18:00:00", read: false,
    title: "Weekly report is ready", body: "Harbor & Pine Realty · Week 39",
  },
  {
    id: "m4", type: "mention", time: "2026-10-01T15:30:00", read: true,
    actor: "Maya Chen", text: "mentioned you in", target: "Team chat · #client-wins",
    body: "“Brightside renewed for another six months.”",
  },
  {
    id: "s4", type: "system", icon: "automation", time: "2026-10-01T09:00:00", read: true,
    title: "Workflow paused", body: "“Missed-call text back” reached its daily limit of 200 messages.",
  },
  {
    id: "m5", type: "mention", time: "2026-09-29T16:10:00", read: true,
    actor: "Luis Ortega", text: "shared a file with you:", target: "Q4-proposal.pdf",
  },
  {
    id: "s5", type: "system", icon: "integration", time: "2026-09-28T08:00:00", read: true,
    title: "Integration connected", body: "Spreadsheets sync is now on for Cedar Fitness Co.",
  },
];

/** Notifications the "Simulate new notification" button cycles through. */
export const SIMULATED: NotificationItem[] = [
  { type: "mention", actor: "Priya Shah", text: "mentioned you in", target: "Cedar Fitness Co. · Ad review", body: "“Two new creatives are ready for your sign-off.”" },
  { type: "system", icon: "payment", title: "Payment received", body: "Harbor & Pine Realty paid invoice #1044 · $2,400" },
  { type: "system", icon: "report", title: "Monthly report is ready", body: "Brightside Dental · September" },
  { type: "mention", actor: "Maya Chen", text: "replied to", target: "Q4 plan", body: "“Target confirmed: under $28 per lead.”" },
];

export const PROMPT = `Build component 19 for my LofiStack Component Gallery: a Notification Center for an agency app's top bar.

It should show:

* A bell button with an unread badge (9+ above nine) that rings when a new notification arrives
* A popover panel with a heading, an "N new" count and a "Mark all as read" button
* Tabs for All, Mentions and System, each with its own unread count
* Items grouped into Today, Yesterday and Earlier, with relative times ("12 min ago", "3 h ago")
* Mentions with an initials avatar ("Maya Chen mentioned you in Q4 plan") and system alerts with an icon (payment, warning, report, automation, integration)
* An optional quote or second line, and an optional inline action button (e.g. Reconnect → Reconnected)
* Opening an item marks it read; a dismiss button slides it out; an empty state per tab
* A footer link or button (e.g. Notification settings) and a total count

Requirements:

* React + TypeScript + Tailwind CSS. Every value comes in through typed props; nothing hardcoded. Callbacks for read, dismiss, action, footer and open changes; a ref with add(), show(), hide() and toggle().
* Controlled or uncontrolled open state and tab.
* Fully responsive: the panel stays inside the viewport with its caret pointing at the bell, and rows tighten on narrow panels.
* Light and dark themes through CSS variables.
* Hover, focus, unread, disabled and empty states; reduced-motion support.
* Accessible: dialog panel, proper tabs with arrow keys, Escape and click-outside to close, focus returned to the bell, screen-reader announcements.
* Give it its own page in the gallery with a live preview, simulate/reset controls, a props table and a usage example.`;
