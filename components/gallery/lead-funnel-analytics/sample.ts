import type { FunnelCompare, FunnelStage } from "./LeadFunnel";

/** Example figures used by the preview. Not real client data. */
export const SAMPLE = {
  eyebrow: "Lead funnel",
  title: "Inbound pipeline · all channels",
  subtitle: "Website visit to closed sale",
  period: "1 Jul – 30 Sep 2026",
  source: "Source: CRM and website analytics",
};

export const SAMPLE_STAGES: FunnelStage[] = [
  { label: "Visitors", count: 8640 },
  { label: "Leads", count: 1296 },
  { label: "Booked", count: 544 },
  { label: "Converted", count: 196 },
];

export const SAMPLE_COMPARE: FunnelCompare = { label: "last quarter", stages: [7910, 1107, 432, 147] };

export const PROMPT = `Build component 04 for my LofiStack Component Gallery: a Lead Funnel Analytics card.

It should show, for one funnel (visitors → leads → booked calls → sales):

* An optional eyebrow, title, subtitle and date-range chip
* The overall conversion rate as the hero number, with "X of Y visitors" and the change in points vs the previous period
* The biggest drop-off and the strongest step, picked out automatically
* One row per stage with its number, name, a centred bar, the count and its share of the first stage
* Between stages, a tapered flow shape and a chip with the step conversion rate; hovering or focusing a stage highlights it, dims the others and shows how many moved on and dropped
* A footer with the bar-scale note and the data source

Requirements:

* React + TypeScript + Tailwind CSS. Stages, comparison, labels and text come in through typed props; nothing hardcoded.
* Work out every rate from the counts: step-to-step, against the first stage, and overall.
* Square-root or linear bar scale, with a minimum width so tiny stages stay visible.
* Entry animation when the card scrolls into view: bars grow from the centre, flows and chips fade in, numbers count up; it can be replayed and respects reduced motion.
* Fully responsive: three columns on desktop, tighter columns on tablets, and on phones the name and figures share a line with the bar full width beneath.
* Light and dark themes through CSS variables.
* Keyboard-focusable stages with a visible focus ring and a screen-reader sentence per stage.
* Give it its own page in the gallery with a live preview, a bar-scale control, a replay button, a props table and a usage example.`;
