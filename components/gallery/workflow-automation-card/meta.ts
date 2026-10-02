import type { ComponentMeta } from "@/lib/types";
import { PROMPT } from "./sample";

export const meta: ComponentMeta = {
  slug: "workflow-automation-card",
  number: 17,
  week: 9,
  type: "card",
  title: "Workflow Automation Card",
  navLabel: "Workflow Automation",
  componentName: "WorkflowAutomationCard",
  summary:
    "An automation drawn as a node graph on a blueprint grid: trigger, if / else branches, actions and a wait. Switch it on or off, open any step's settings, and watch a test contact run through it step by step with a timed log.",
  description:
    "An automation drawn as a flow: what starts it, the yes / no check, the actions on each side, the wait, and what happens last. Turn it on or off, open any step to see its settings, and run a test contact through it step by step.",
  tags: ["Node graph", "SVG connectors", "Step-by-step test run"],
  props: [
    { name: "name", type: "string", required: true, description: "Workflow name (the card title)." },
    { name: "flow", type: "WorkflowNode[]", required: true, description: "Steps in order. Each has id, type (trigger, condition, action, wait), title and detail." },
    { name: "flow[].yes · no", type: "WorkflowNode[]", description: "Condition only. The steps on each branch. Branches join again at the next step." },
    { name: "flow[].test · testDefault", type: "string · boolean", default: "— · true", description: "Condition only. Label and starting value of the test switch that picks the branch." },
    { name: "flow[].config · description · runs", type: "Record<string, string> · string · number", description: "Settings, text and contacts reached, shown in the side panel." },
    { name: "flow[].icon · testMs", type: "WorkflowIcon · number", description: "Optional: form, chat, user, mail, list, sms, clock, phone, task, bell; fixed test-run time in ms." },
    { name: "enabled · defaultEnabled", type: "boolean", default: "true", description: "On / off state, controlled or initial. Test runs work either way." },
    { name: "eyebrow · subtitle", type: "string", description: "Header text." },
    { name: "refId · revision", type: "string", description: "Shown in the blueprint title block." },
    { name: "stats", type: "{ period, runs, succeeded, avgSeconds, lastRun }", description: "Stats strip. Success rate is worked out from runs." },
    { name: "testContact", type: "{ name?, note? }", description: "Contact shown in the test run bar." },
    { name: "onToggle", type: "(enabled: boolean) => void", description: "Fires when the switch is pressed." },
    { name: "onNodeSelect", type: "(d: { id, type, title, config }) => void", description: "Fires when a step is opened." },
    { name: "onRun", type: "(d: WorkflowRunEvent) => void", description: "Fires when a test run starts, pauses, resumes, stops or completes." },
    { name: "ref", type: "Ref<{ run(); pause(); stop() }>", description: "Drive the test run from code." },
    { name: "labels · locale", type: "Partial<WorkflowAutomationLabels> · string", default: '— · "en-US"', description: "Override built-in text, and the number locale." },
  ],
  usage: `import { WorkflowAutomationCard } from "@/components/gallery/workflow-automation-card/WorkflowAutomationCard";

<WorkflowAutomationCard
  name="New lead follow-up"
  flow={[
    { id: "t", type: "trigger", title: "Form submitted" },
    {
      id: "c", type: "condition", title: "Has tag: VIP?", test: "Has VIP tag",
      yes: [{ id: "a", type: "action", title: "Notify team chat" }],
      no: [{ id: "b", type: "action", title: "Send welcome email" }],
    },
    { id: "w", type: "wait", title: "Wait 1 day" },
  ]}
  onRun={(d) => console.log(d.status, d.totalMs)}
/>`,
  usageNote:
    "The test run follows the branch picked by each test switch, skips waits and logs every step with its time.",
  prompt: PROMPT,
};
