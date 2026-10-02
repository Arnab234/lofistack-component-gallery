import type { ComponentMeta } from "@/lib/types";
import { PROMPT } from "./sample";

export const meta: ComponentMeta = {
  slug: "webhook-event-monitor",
  number: 27,
  week: 14,
  type: "monitor",
  title: "Webhook Event Monitor",
  navLabel: "Webhooks",
  componentName: "WebhookMonitor",
  summary:
    "A developer log of webhook deliveries arriving live, with status, method, endpoint and latency. Filter by status class or event name, inspect headers and a highlighted JSON payload, and replay a failed delivery.",
  description:
    "A log of webhook deliveries as they arrive. Filter by status or search by event name, open any delivery to read its headers, payload and response, and replay one that failed.",
  tags: ["Live stream", "JSON inspector", "Replay"],
  props: [
    { name: "title · environment", type: "string", default: '"Webhook events" · —', description: "Header text and the environment badge (hidden when empty)." },
    { name: "endpoint", type: "string", default: '""', description: "Base path shown in the header." },
    { name: "interval", type: "number", default: "2400", description: "Average milliseconds between simulated events (minimum 600)." },
    { name: "seed · initial · max", type: "number", default: "2041 · 18 · 60", description: "Seed for the repeatable simulation, events to start with, and how many rows to keep." },
    { name: "accounts", type: "string[]", default: "[]", description: "Account names used in simulated payloads." },
    { name: "simulate", type: "boolean", default: "true", description: "Set to false to show only events you pass in or add." },
    { name: "events", type: "WebhookEventInput[]", description: "Optional starting events, newest first: { id, name, method, path, status, latency, at, payload, response, headers }." },
    { name: "paused · defaultPaused", type: "boolean", default: "— · false", description: "Controlled or initial paused state. Starts paused when reduced motion is on." },
    { name: "onStreamChange", type: "(paused: boolean) => void", description: "Fires when Pause or Resume is pressed." },
    { name: "onSelect", type: "({ id, name, status }) => void", description: "Fires when a delivery is selected." },
    { name: "onReplay", type: "(detail: WebhookReplayDetail) => void", description: "Fires after a replay with the original and the new delivery." },
    { name: "ref", type: "Ref<WebhookMonitorHandle>", description: "addEvent(), simulateFailure(), select(id), replay(id), pause(), resume() and events." },
    { name: "className", type: "string", description: "Extra classes for the outer wrapper." },
  ],
  usage: `import { WebhookMonitor, type WebhookMonitorHandle } from "@/components/gallery/webhook-event-monitor/WebhookMonitor";

const monitor = useRef<WebhookMonitorHandle>(null);

<WebhookMonitor
  ref={monitor}
  endpoint="/hooks/lofistack"
  environment="Production"
  interval={2400}
  onReplay={(d) => console.log(d.original, d.replay)}
/>

// feed it real deliveries:
monitor.current?.addEvent({
  name: "invoice.paid", method: "POST", path: "/hooks/payments",
  status: 200, latency: 84, payload: { invoice: { id: "inv_1042" } },
});`,
  usageNote:
    "Replay re-sends the selected delivery as a new row marked \"replay\" and calls onReplay. The stream starts paused when reduced motion is on, and skips ticks while the tab is hidden.",
  prompt: PROMPT,
};
