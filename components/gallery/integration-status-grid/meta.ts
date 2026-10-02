import type { ComponentMeta } from "@/lib/types";
import { PROMPT } from "./sample";

export const meta: ComponentMeta = {
  slug: "integration-status-grid",
  number: 24,
  week: 12,
  type: "grid",
  title: "Integration Status Grid",
  navLabel: "Integrations",
  componentName: "IntegrationStatusGrid",
  summary:
    "Eight connected tools with a status light, last sync time, events today and hourly activity. Filter by status, sync one or all, reconnect a dropped tool, and open a details drawer with permissions and sync history.",
  description:
    "Every tool a workspace is connected to, in one grid: whether it is working, when it last synced and how many events it has handled today. Filter by status, sync a tool now, reconnect one that dropped, or open its details.",
  tags: ["Status tiles", "Simulated sync", "Details drawer"],
  props: [
    { name: "integrations", type: "Integration[]", required: true, description: "One entry per tool: { id, name, icon?, description?, status, issue?, fix?, lastSyncMinutes?, eventsToday?, activity?, … }." },
    { name: "integrations[].icon", type: '"crm" | "card" | "calendar" | "mail" | "sms" | "chat" | "sheet" | "hub" | "plug"', default: '"plug"', description: "Built-in glyph." },
    { name: "integrations[].status · issue · fix", type: '"connected" | "warning" | "disconnected" · string · "sync" | "reconnect"', description: "Health, what is wrong, and whether Sync now or Reconnect clears it." },
    { name: "integrations[].lastSyncMinutes · eventsToday", type: "number", description: "Minutes since the last good sync (shown as relative time, kept up to date) and events since midnight." },
    { name: "integrations[].activity", type: "number[]", description: "Events per hour for the last 12 hours, oldest first." },
    { name: "integrations[].account · connectedSince · interval · scopes · history", type: "string · string · string · string[] · IntegrationHistoryEntry[]", description: "Shown in the details drawer. history is { minutesAgo, result, events?, note? }." },
    { name: "eyebrow · title · subtitle · footnote", type: "string", description: "Optional header and footer text." },
    { name: "filter · defaultFilter", type: '"all" | "connected" | "warning" | "disconnected"', default: '"all"', description: "Status filter, controlled or initial. onFilterChange fires with { filter, shown }." },
    { name: "onSync", type: "(detail: IntegrationSyncDetail) => void", description: "Fires when a simulated sync or reconnect finishes, with the action, new status and events added." },
    { name: "onOpen", type: "(detail: { id, name, status }) => void", description: "Fires when the details drawer opens." },
    { name: "ref", type: "Ref<IntegrationStatusGridHandle>", description: "sync(id), reconnect(id), syncAll() and setStatus(id, status, issue?) from code." },
    { name: "locale · labels", type: "string · Partial<IntegrationLabels>", default: '"en-US"', description: "Number formatting locale and overrides for any built-in text." },
    { name: "className", type: "string", description: "Extra classes for the outer wrapper." },
  ],
  usage: `import { IntegrationStatusGrid } from "@/components/gallery/integration-status-grid/IntegrationStatusGrid";

<IntegrationStatusGrid
  title="Connected tools"
  integrations={[
    { id: "crm", name: "CRM", icon: "crm", status: "connected", lastSyncMinutes: 4, eventsToday: 1284 },
    { id: "sms", name: "SMS gateway", icon: "sms", status: "disconnected", fix: "reconnect", issue: "Sign-in expired." },
  ]}
  onSync={(d) => console.log(d.name, d.status, d.eventsAdded)}
/>`,
  usageNote: "Sync now and Reconnect are simulated with a short delay. Open a tile's details, then press Escape or click outside to close the drawer.",
  prompt: PROMPT,
};
