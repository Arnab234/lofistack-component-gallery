import type { ComponentMeta } from "@/lib/types";
import { PROMPT } from "./sample";

export const meta: ComponentMeta = {
  slug: "lead-source-breakdown",
  number: 14,
  week: 7,
  type: "chart",
  title: "Lead Source Breakdown",
  navLabel: "Lead Sources",
  componentName: "LeadSourceBreakdown",
  summary:
    "A donut and legend table showing where leads come from, by leads, revenue or cost per lead. Hide a source and the other shares add back up to 100%.",
  description:
    "Where leads come from, as a share of leads, revenue or spend. Point at a ring segment or a legend row to see its numbers. Hide a source and the rest add back up to 100%.",
  tags: ["SVG donut", "Colour-blind-safe palette", "Hideable sources"],
  props: [
    {
      name: "sources",
      type: "LeadSource[]",
      required: true,
      description: '{ id, label, leads, revenue, spend, hidden? }. Up to six; any more are folded into "Other". hidden starts a source hidden.',
    },
    { name: "metric · defaultMetric", type: '"leads" | "revenue" | "cpl"', default: '"leads"', description: "Measure to show. Pass metric to control the switch." },
    { name: "eyebrow · title · period", type: "string", description: "Optional header text." },
    { name: "sourceNote", type: "string", description: "Optional footer note, e.g. where the data comes from." },
    { name: "currency · locale", type: "string", default: '"USD" · "en-US"', description: "ISO currency and number locale." },
    { name: "labels", type: "Partial<LeadSourceLabels>", description: 'Override any built-in text, e.g. { leads: "Enquiries" }.' },
    { name: "onMetricChange", type: "(metric) => void", description: "Fires when the switch changes." },
    { name: "onSourceToggle", type: "(detail: SourceToggleDetail) => void", description: "Fires with the source, whether it is visible, and the visible ids." },
    { name: "ref", type: "Ref<LeadSourceBreakdownHandle>", description: "toggleSource(id, visible?), showAll(), replay() and visibleSources." },
    { name: "className", type: "string", description: "Extra classes for the outer wrapper." },
  ],
  usage: `import { LeadSourceBreakdown } from "@/components/gallery/lead-source-breakdown/LeadSourceBreakdown";

<LeadSourceBreakdown
  title="Where leads came from"
  period="Q3 2026"
  sources={[
    { id: "search", label: "Paid search", leads: 412, revenue: 58400, spend: 14420 },
    { id: "email", label: "Email", leads: 118, revenue: 17300, spend: 590 },
  ]}
  onSourceToggle={(d) => console.log(d.id, d.visible)}
/>`,
  usageNote:
    "In Cost per lead view the ring shows each source's share of spend and the centre shows the blended cost per lead. Override --lsb-c1 … --lsb-c6 to change the source colours.",
  prompt: PROMPT,
};
