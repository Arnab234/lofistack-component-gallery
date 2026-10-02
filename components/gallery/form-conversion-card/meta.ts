import type { ComponentMeta } from "@/lib/types";
import { PROMPT } from "./sample";

export const meta: ComponentMeta = {
  slug: "form-conversion-card",
  number: 22,
  week: 11,
  type: "card",
  title: "Form Conversion Card",
  navLabel: "Form Conversion",
  componentName: "FormConversionCard",
  summary:
    "A mini form next to field-by-field completion bars, with the field that loses the most people highlighted in both. Switch devices and open a suggestion for the worst field.",
  description:
    "Where people give up on a form. The mini form on the left mirrors the field-by-field bars on the right, and the field that loses the most people is highlighted in both. Switch devices to compare desktop and mobile.",
  tags: ["Linked highlight", "Device switch", "Drop-off tips"],
  props: [
    { name: "steps", type: "FormStep[]", required: true, description: "{ id, label, type } in order. type is view, start, field or submit. Only field steps appear as inputs and can be the worst field." },
    { name: "segments", type: "Record<string, FormSegment>", required: true, description: "{ label, counts, avgSeconds } per device key. counts has one number per step: how many people reached and completed it." },
    { name: "tips", type: "Record<string, string>", description: "Suggestion shown when that field is the worst. {rate} and {lost} are filled in." },
    { name: "eyebrow · title · subtitle", type: "string", description: "Optional header text." },
    { name: "period", type: "string", description: "Optional date-range text in the footer." },
    { name: "form", type: "{ title?: string; button?: string }", description: "Heading and button text for the mini form." },
    { name: "device · defaultDevice · onDeviceChange", type: "string", default: "first segment", description: "Controlled or uncontrolled segment key (all, desktop, mobile)." },
    { name: "onFieldSelect", type: "(detail: FormFieldSelect) => void", description: "A bar or field was selected: { id, label, type, device, count, reached, lost, dropRate, worst }." },
    { name: "defaultTipsOpen", type: "boolean", default: "false", description: "Start with the suggestion panel open." },
    { name: "labels · locale", type: 'Partial<FormConversionLabels> · string', default: '— · "en-US"', description: "Override built-in text, and the number locale." },
  ],
  usage: `import { FormConversionCard } from "@/components/gallery/form-conversion-card/FormConversionCard";

<FormConversionCard
  title="Home valuation request"
  form={{ title: "Book a valuation", button: "Send" }}
  steps={[
    { id: "views", label: "Form views", type: "view" },
    { id: "email", label: "Email", type: "field" },
    { id: "submitted", label: "Submitted", type: "submit" },
  ]}
  segments={{
    all: { label: "All devices", counts: [900, 410, 380] },
  }}
  tips={{ email: "{rate} leave at Email." }}
  onFieldSelect={(d) => console.log(d.id, d.dropRate)}
/>`,
  usageNote:
    "Every rate is worked out from the counts. Clicking a bar or a field in the mini form selects it and calls onFieldSelect with the step, counts and drop-off.",
  prompt: PROMPT,
};
