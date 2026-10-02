import type { ComponentMeta } from "@/lib/types";
import { PROMPT } from "./sample";

export const meta: ComponentMeta = {
  slug: "ai-agent-status-panel",
  number: 18,
  week: 9,
  type: "panel",
  title: "AI Agent Status Panel",
  navLabel: "AI Agents",
  componentName: "AgentStatusPanel",
  summary:
    "An ops console for a team of AI agents with live status, queue, success rate and throughput. Start, pause or restart agents, filter by status and retry errors.",
  description:
    "An ops console for a team of AI agents. Each agent shows its status, current task, queue, success rate and recent throughput. You can start, pause or restart any agent, and open an error to retry it.",
  tags: ["Live updates", "Status filters", "Error retry"],
  props: [
    { name: "agents", type: "Agent[]", required: true, description: "One entry per agent: id, name, model, status, task, queue, processed, succeeded." },
    { name: "agents[].status", type: '"running" | "idle" | "error" | "paused"', default: '"idle"', description: "Starting status. Restart and Retry add a short Restarting phase." },
    { name: "agents[].load · failRate", type: "number", default: "1 · 0", description: "Simulation only: average items per update, and the share that fail." },
    { name: "agents[].error", type: "{ code?, at?, message }", description: "Shown when an error row is opened." },
    { name: "filter · defaultFilter", type: '"all" | AgentStatus', default: '"all"', description: "Status filter, controlled or initial. The filter buttons update it." },
    { name: "paused · defaultPaused", type: "boolean", default: "false", description: "Stops live updates. The Pause button toggles it." },
    { name: "interval", type: "number", default: "2000", description: "Milliseconds between live updates (minimum 500)." },
    { name: "seed", type: "number", default: "7", description: "Makes the simulated updates repeat the same way each time." },
    { name: "path · title · subtitle", type: "string", description: "Optional header text." },
    { name: "onAgentAction", type: "(d: { id, name, action, from, to }) => void", description: "Fires on Start, Pause, Restart and Retry." },
    { name: "onFilterChange · onPausedChange", type: "(value) => void", description: "Fire when the filter or the live-updates pause changes." },
    { name: "ref", type: "Ref<{ setStatus(id, status, message?); getAgents() }>", description: "Change an agent from code, or read the live state." },
    { name: "labels · locale", type: "Partial<AgentStatusPanelLabels> · string", default: '— · "en-GB"', description: "Override any built-in text; number and time locale." },
  ],
  usage: `import { AgentStatusPanel } from "@/components/gallery/ai-agent-status-panel/AgentStatusPanel";

<AgentStatusPanel
  title="Agent fleet"
  interval={2000}
  agents={[
    { id: "agt-01", name: "Lead Qualifier", status: "running", task: "Scoring leads",
      queue: 14, processed: 1286, succeeded: 1262, load: 3 },
  ]}
  onAgentAction={(d) => console.log(d.action, d.from, d.to)}
/>`,
  usageNote: "Live updates stop while the tab is hidden, and when you press Pause.",
  prompt: PROMPT,
};
