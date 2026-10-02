import type { Agent } from "./AgentStatusPanel";

/** Example data used by the preview. Simulated agents, not a real system. */
export const SAMPLE = {
  path: "studio / agents",
  title: "Agent fleet",
  subtitle: "6 agents · shared workspace",
  seed: 42,
  interval: 2000,
};

export const SAMPLE_AGENTS: Agent[] = [
  {
    id: "agt-01",
    name: "Lead Qualifier",
    model: "Large model",
    status: "running",
    task: "Scoring new form leads · Brightside Dental",
    queue: 14,
    processed: 1286,
    succeeded: 1262,
    load: 3,
    failRate: 0.02,
  },
  {
    id: "agt-02",
    name: "Inbox Triage",
    model: "Fast model",
    status: "running",
    task: "Sorting the support inbox · Cedar Fitness Co.",
    queue: 31,
    processed: 2410,
    succeeded: 2391,
    load: 4,
    failRate: 0.01,
  },
  {
    id: "agt-03",
    name: "Ad Copy Writer",
    model: "Large model",
    status: "idle",
    task: "Writing ad variations for the October offer",
    queue: 0,
    processed: 148,
    succeeded: 141,
    load: 1,
    failRate: 0.04,
  },
  {
    id: "agt-04",
    name: "Appointment Setter",
    model: "Fast model",
    status: "error",
    task: "Booking consultations · Harbor & Pine Realty",
    queue: 9,
    processed: 612,
    succeeded: 577,
    load: 2,
    failRate: 0.03,
    error: { code: "409", at: "14:28", message: "Calendar sync rejected the booking. The 2:30 pm slot on 2 Oct is already taken. Stopped after 3 retries." },
  },
  {
    id: "agt-05",
    name: "Report Builder",
    model: "Large model",
    status: "paused",
    task: "Weekly report · Harbor & Pine Realty",
    queue: 3,
    processed: 88,
    succeeded: 88,
    load: 1,
    failRate: 0,
  },
  {
    id: "agt-06",
    name: "Review Responder",
    model: "Fast model",
    status: "running",
    task: "Drafting replies to new reviews · Cedar Fitness Co.",
    queue: 6,
    processed: 734,
    succeeded: 719,
    load: 2,
    failRate: 0.02,
  },
];

export const SIMULATED_ERROR = "Request to the CRM timed out after 30 s. The item was put back in the queue.";

export const PROMPT = `Build component 18 for my LofiStack Component Gallery: an AI Agent Status Panel, an ops console for a team of AI agents.

It should show:

* An optional path, title and subtitle, a Live / Paused beacon with a tick counter and clock, and a button to pause or resume live updates
* A summary strip: agents running out of the total, total queue, items processed, overall success rate and fleet throughput per minute with a small bar chart
* Status filters (All, Running, Idle, Error, Paused) with counts, and a hint showing the update interval
* One row per agent: status light, name, status, id and model, current task, queue, success rate, a throughput sparkline with items per minute, and Start / Pause / Restart buttons with tooltips
* Error rows that open to show the error code, time and message, with a "Retry now" button
* A short event log of the latest five events (ticks, status changes and actions)
* Simulated live updates on a timer that process the queue, change statuses and stop while the tab is hidden or paused; a seed makes them repeat the same way

Requirements:

* React + TypeScript + Tailwind CSS. Every value comes in through typed props; nothing hardcoded.
* Work out the success rates, totals and throughput from the data, and keep them updating live.
* Fire callbacks for every agent action (with the status before and after), filter change and pause; expose setStatus(id, status, message) through a ref.
* Fully responsive: a table-like grid on desktop, two-line agent cards with labelled figures on tablets, stacked actions on phones.
* Light and dark themes through CSS variables.
* Hover, focus, pressed, disabled, restarting and empty states, with row flashes, pulsing status lights and reduced-motion support.
* Accessible: real buttons with labels, pressed states on filters, keyboard focus kept in the row after an action, and a live region announcing status changes.
* Give it its own page in the gallery with a live preview, "Simulate an error" and reset controls, a props table and a usage example.`;
