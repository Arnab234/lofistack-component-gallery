import type { CampaignStatusCardProps } from "./CampaignStatusCard";

/** Example data used by the preview. Not real client results. */
export const SAMPLE: CampaignStatusCardProps = {
  campaignId: "CMP-2041",
  name: "Fall Smile Makeover",
  client: "Brightside Dental",
  objective: "Lead generation",
  owner: "Maya Ortiz",
  status: "live",
  today: "2026-10-02",
  flight: { start: "2026-09-22", end: "2026-10-21" },
  budget: 12000,
  spent: 4520,
  currency: "USD",
  channels: [
    { name: "Search Ads", type: "search", spent: 2080, leads: 61 },
    { name: "Social Ads", type: "social", spent: 1690, leads: 79 },
    { name: "Video Ads", type: "video", spent: 750, leads: 12 },
  ],
  log: [
    { action: "created", by: "Maya Ortiz", at: "2026-09-14T10:12" },
    { action: "scheduled", by: "Maya Ortiz", at: "2026-09-18T16:40" },
    { action: "launched", by: "Scheduler", at: "2026-09-22T09:00" },
  ],
};

/** The same campaign before it has started. */
export const SAMPLE_DRAFT: CampaignStatusCardProps = {
  ...SAMPLE,
  status: "draft",
  spent: 0,
  flight: { start: "2026-10-06", end: "2026-11-04" },
  channels: SAMPLE.channels?.map((c) => ({ ...c, spent: 0, leads: 0 })),
  log: [{ action: "created", by: "Maya Ortiz", at: "2026-09-29T14:05" }],
};

export const PROMPT = `Build component 13 for my LofiStack Component Gallery: a Campaign Status Card that runs a campaign's lifecycle.

It should show, for one campaign:

* Campaign reference, name, client, objective and owner
* A big status pill (Draft, Scheduled, Live, Paused, Completed) with "Since …" and a pulsing dot while live
* A five-step lifecycle stepper with done, current, skipped and upcoming steps and a date or note under each
* A flight tile: days until start or "Day N of M", a progress bar and what is left
* A budget pacing tile: spend vs budget, a marker for the spend expected by today, a pace badge (on pace, under-, overspending) and the projected total
* Channels with spend, share of spend, leads and cost per lead
* Controls for Schedule, Launch now, Pause, Resume and End campaign, with a hint for the current state
* An activity log of every status change, newest first

Requirements:

* React + TypeScript + Tailwind CSS. Every value comes in through typed props; nothing hardcoded. Pacing, projections and flight days are worked out inside.
* A real state machine: only valid moves are enabled (Draft → Scheduled or Live, Scheduled → Live, Live ⇄ Paused, any started state → Completed). Launching early moves the flight start to today.
* Ending asks to confirm in an accessible modal dialog (focus trapped, Escape closes, focus returns).
* Every move adds a log entry and calls onStatusChange with { from, to, action, by, at }; can() and transition() through a ref.
* Fully responsive: side panel beside the main column on desktop, below it on tablets, vertical stepper and stacked tiles on phones.
* Light and dark themes through CSS variables.
* Hover, focus, disabled and status states, live announcements for screen readers, reduced-motion support.
* Give it its own page in the gallery with a live preview, a starting-state control, a reset button, a props table and a usage example.`;
