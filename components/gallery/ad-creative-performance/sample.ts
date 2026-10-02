import type { AdCreative } from "./AdCreativePerformance";

/** Example campaign used by the preview. Not real client results. */
export const SAMPLE = {
  eyebrow: "Creative performance",
  title: "New-patient offer",
  subtitle: "Brightside Dental · Social Ads · conversions are booked consultations",
  period: "1 – 30 Sep 2026",
  currency: "USD",
  creatives: [
    { id: "smile-30", name: "Smile in 30 days", format: "video", duration: "0:15", copy: "A brighter smile before your next big day.", impressions: 182400, clicks: 3612, spend: 2140, conversions: 96, art: { pattern: "sun" } },
    { id: "free-consult", name: "Free whitening consult", format: "image", copy: "Book a free consult. No pressure, no catch.", impressions: 214900, clicks: 2794, spend: 1880, conversions: 71, art: { pattern: "type", text: "FREE", invert: true } },
    { id: "meet-dr", name: "Meet the team", format: "video", duration: "0:30", copy: "Say hello to the people behind your check-up.", impressions: 96300, clicks: 1541, spend: 1120, conversions: 52, art: { pattern: "arch", invert: true } },
    { id: "before-after", name: "Before & after", format: "carousel", slides: 5, copy: "Real smiles, real results. Swipe to see.", impressions: 158700, clicks: 3968, spend: 2460, conversions: 88, art: { pattern: "blocks" } },
    { id: "family-plans", name: "Family plans", format: "image", copy: "One plan for the whole household.", impressions: 121500, clicks: 1215, spend: 940, conversions: 31, art: { pattern: "dots" } },
    { id: "same-week", name: "Same-week appointments", format: "image", copy: "Seen this week, not next month.", impressions: 88200, clicks: 1764, spend: 760, conversions: 41, art: { pattern: "stripes" } },
    { id: "stories", name: "Patient stories", format: "carousel", slides: 4, copy: "Four patients, four first visits.", impressions: 132800, clicks: 2125, spend: 1410, conversions: 47, art: { pattern: "wave", invert: true } },
    { id: "gentle", name: "Gentle cleaning", format: "video", duration: "0:06", copy: "Nervous about the dentist? We get it.", impressions: 204600, clicks: 2455, spend: 1590, conversions: 38, art: { pattern: "type", text: "Ahh." } },
  ] satisfies AdCreative[],
  source: "CTR = clicks ÷ impressions. Cost per conversion = spend ÷ conversions.",
};

export const PROMPT = `Build component 09 for my LofiStack Component Gallery: an Ad Creative Performance gallery for one campaign.

It should show:

* A masthead with eyebrow, campaign title, subtitle and reporting period
* A summary strip: total spend, conversions, blended CPA and average CTR for the creatives in view, tweening when the filter changes
* A grid of creative tiles: stand-in artwork, format badge (image, video with length, carousel with slide dots), rank, the current sort metric on the artwork, and a crown on the leader
* Each tile's CTR, CPA, spend and conversions, with the sorted metric highlighted
* Sort buttons (CTR, CPA, Spend, Conversions) and format chips with counts
* A Compare button on each tile; picking two opens a head-to-head drawer with bars for CTR, cost per click, conversion rate, cost per conversion, conversions and spend, a winner per metric and an overall leader

Requirements:

* React + TypeScript + Tailwind CSS. Creatives come in as typed props with raw counts; CTR, CPC, conversion rate and CPA are worked out inside.
* Controlled or uncontrolled sort, format and comparison, with onSortChange and onCompare callbacks.
* Tiles glide to their new places when sorting or filtering (FLIP), respecting reduced motion.
* Fully responsive: four, three, then two tiles per row; one row per creative with artwork on the left on phones; the comparison stacks too.
* Light and dark themes through CSS variables.
* Hover, focus, pressed, disabled (two already picked) and empty states.
* Accessibility: pressed states on toggles, screen-reader rank and comparison text, live announcements.
* Give it its own page in the gallery with a live preview, "Compare top two" and reset buttons, a props table and a usage example.`;
