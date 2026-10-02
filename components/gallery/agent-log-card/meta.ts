import type { ComponentMeta } from "@/lib/types";
import { SAMPLE_PROMPT } from "./sample";

export const meta: ComponentMeta = {
  slug: "agent-log-card",
  number: 1,
  week: 1,
  type: "card",
  title: "Agent Log Card",
  navLabel: "Agent Log Card",
  componentName: "AgentLogCard",
  summary:
    "A record of one AI-agent task, shaped like a ticket stub. The prompt sits above the perforation and the result below it, with the agent, task type, date and status alongside.",
  description:
    "A record of one AI-agent task: what was asked, which agent did it, and what came back. The prompt sits above the perforation and the result below it, like a ticket stub.",
  tags: ["Copy & expand", "3 statuses", "Pointer glow"],
  props: [
    { name: "task", type: "string", required: true, description: "Task name, shown as the title." },
    { name: "agent", type: "string", required: true, description: "Agent or tool used, plus model if known." },
    { name: "type", type: "string", required: true, description: "Task category, e.g. Research, Coding, UI Component." },
    { name: "date", type: "string", required: true, description: "ISO date YYYY-MM-DD; displayed as 25 Sep 2026." },
    { name: "status", type: '"draft" | "selected" | "submitted" | "built"', default: '"draft"', description: "Review state, shown as a coloured pill." },
    { name: "week", type: "number", description: "Challenge week, shown in the top rail." },
    { name: "entry", type: "number", description: "Entry number within the week." },
    { name: "prompt", type: "string", required: true, description: "Exact prompt or workflow. Line breaks are kept; indentation is trimmed." },
    { name: "result", type: "ReactNode", required: true, description: "What the agent produced: paragraphs, lists, <AgentLogChip> tags." },
    { name: "clampLines", type: "number", default: "9", description: "Prompt lines shown before the Show full prompt button appears." },
    { name: "className", type: "string", description: "Extra classes for the outer wrapper." },
  ],
  usage: `import { AgentLogCard, AgentLogChip } from "@/components/gallery/agent-log-card/AgentLogCard";

<AgentLogCard
  task="Task name"
  agent="Agent · Model"
  type="Task type"
  date="2026-09-25"
  status="draft"
  week={1}
  entry={1}
  prompt={\`The exact prompt or workflow…\`}
  result={
    <>
      <p>What the agent produced…</p>
      <AgentLogChip>file.tsx</AgentLogChip>
    </>
  }
/>`,
  usageNote: "Override the --alc-* CSS variables to re-theme the card. It stacks to one column when its container is narrower than 540px.",
  prompt: SAMPLE_PROMPT,
};
