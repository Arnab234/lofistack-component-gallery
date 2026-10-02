/** Example data used by the preview. Not real client results. */
export const SAMPLE = {
  eyebrow: "Conversion rate",
  title: "Website visitor to booked consultation",
  client: "Brightside Dental",
  period: "1–30 Sep 2026",
  compareLabel: "Aug",
  target: 4.8,
  max: 8,
  channels: [
    { id: "organic", label: "Organic", visitors: 6420, conversions: 244, target: 4.0, previous: { visitors: 6010, conversions: 212 } },
    { id: "paid", label: "Paid", visitors: 4180, conversions: 196, target: 5.0, previous: { visitors: 3870, conversions: 190 } },
    { id: "email", label: "Email", visitors: 1560, conversions: 101, target: 6.0, previous: { visitors: 1420, conversions: 87 } },
  ],
};

export const PROMPT = `Build component 11 for my LofiStack Component Gallery: a Conversion Rate Card with a gauge and a what-if slider.

It should show, for one funnel (e.g. website visitor to booked consultation):

* Eyebrow, title, client and period
* A gold-on-charcoal half-circle gauge with ticks, the conversion rate as a big serif number and a marker for the target
* A status chip (below target, above target, on target) and the change in points vs the previous period
* A channel switch (All, Organic, Paid, Email…) with a sliding thumb; "All" adds the channels together
* A "By channel" list with a bar per channel, its target marker and its rate; clicking a row picks that channel
* Conversions, visitors and target figures for the selected channel
* A what-if slider: try a different number of conversions and see the new rate, the gap to target and how many more would reach it, with "Set to target" and "Reset" buttons

Requirements:

* React + TypeScript + Tailwind CSS. Every value comes in through typed props; nothing hardcoded. Rates, totals and the conversions needed are worked out from the counts.
* A target override prop, an optional gauge maximum, overridable labels and a number locale.
* onChannelChange and onWhatIfChange callbacks.
* Fully responsive: gauge and details side by side on desktop, stacked (title, switch, gauge, figures, what-if) on narrow containers.
* Light and dark themes through CSS variables; the gauge panel stays charcoal in both.
* Animated gauge and number, hover, focus, pressed and disabled states, keyboard-friendly slider, live announcements for screen readers, reduced-motion support.
* Give it its own page in the gallery with a live preview, a target control, a props table and a usage example.`;
