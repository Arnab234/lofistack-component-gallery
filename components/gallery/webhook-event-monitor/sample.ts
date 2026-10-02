/** Settings for the simulated stream used by the preview. Example data, not real client traffic. */
export const SAMPLE = {
  title: "Webhook events",
  environment: "Production",
  endpoint: "/hooks/lofistack",
  seed: 2041,
  initial: 18,
  max: 60,
  interval: 2400,
  accounts: ["Brightside Dental", "Harbor & Pine Realty", "Cedar Fitness Co."],
};

export const PROMPT = `Build component 27 for my LofiStack Component Gallery: a Webhook Event Monitor, a developer log of webhook deliveries.

It should show:

* A header with the stream title, environment badge, base endpoint and a Live / Paused indicator with a Pause / Resume button
* Stats: total deliveries, success rate, p95 latency and failed count, colour-coded by health
* Status filter chips (All, 2xx, 4xx, 5xx) with live counts, plus a search box for event name or id
* A table of deliveries, newest first: time, event name, method + endpoint, status code and latency (slow and timed-out calls highlighted)
* New rows arriving live with a short flash
* An inspector for the selected delivery: status, id, delivery time, request, response, attempt and a "replay of" link
* Payload, Headers and Response tabs with a syntax-highlighted JSON view
* Replay (re-sends the delivery as a new row marked "replay") and Copy payload buttons

Requirements:

* React + TypeScript + Tailwind CSS. Typed props for the stream settings and starting events; a ref API to add events, replay, select, pause and resume; callbacks for select, replay and stream changes.
* A repeatable seeded simulation, which can be switched off to show only real events.
* Fully responsive: the inspector moves below the stream on tablets, and rows become stacked cards on phones with no sideways scrolling.
* Light and dark themes through CSS variables.
* Keyboard support: arrow keys move through rows and tabs; copy falls back to selecting the text; screen-reader announcements for replays and pauses. Starts paused when reduced motion is on.
* Give it its own page in the gallery with a live preview, a "send a failing event" control, a props table and a usage example.`;
