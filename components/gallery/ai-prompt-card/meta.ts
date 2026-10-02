import type { ComponentMeta } from "@/lib/types";
import { PROMPT } from "./sample";

export const meta: ComponentMeta = {
  slug: "ai-prompt-card",
  number: 6,
  week: 3,
  type: "card",
  title: "AI Prompt Card",
  navLabel: "AI Prompt",
  componentName: "AiPromptCard",
  summary:
    "A saved prompt shown like a file in a code editor, with version tabs and highlighted variables. Fill in the variables, preview the finished prompt with a rough token count, and copy it in one click.",
  description:
    "A saved prompt shown like a file in a code editor. Switch between versions, fill in the variables, check the filled-in preview and its rough token count, then copy it.",
  tags: ["Version tabs", "Live variables", "One-click copy"],
  props: [
    { name: "name", type: "string", required: true, description: "Prompt title, shown in the title bar." },
    { name: "description", type: "string", description: "One-line purpose under the name." },
    { name: "path", type: "string", description: "File path shown above the editor." },
    { name: "model · temperature", type: "string · number", description: "Shown in the model chip." },
    { name: "versions", type: "{ id, text, updated?, note? }[]", required: true, description: "Versions in order. updated is YYYY-MM-DD. Lines new since the previous version get a gutter mark." },
    { name: "variables", type: "{ key, label?, default?, placeholder?, suggestions? }[]", default: "[]", description: "key matches {{key}} in the text (letters, numbers, underscore)." },
    { name: "version · defaultVersion", type: "string", description: "Controlled or starting version id (default: the last one)." },
    { name: "mode · defaultMode", type: '"template" | "preview"', default: '"template"', description: "template shows {{variables}}; preview fills them in." },
    { name: "onVersionChange · onModeChange", type: "(value) => void", description: "Fire when a tab or the view switch changes." },
    { name: "onVariableChange", type: "(key, value) => void", description: "Fires on every input or chip change." },
    { name: "onCopy", type: "(detail: PromptCopyDetail) => void", description: "Fires after Copy with the text, version, chars, tokens, values and method." },
    { name: "ref", type: "Ref<AiPromptCardHandle>", description: "setVariable(), resetVariables(), copy(), filledText() and values()." },
    { name: "locale", type: "string", description: "Locale for the edited date." },
    { name: "labels", type: "Partial<PromptLabels>", description: 'Override any built-in text, e.g. { copy: "Copy" }.' },
  ],
  usage: `import { AiPromptCard } from "@/components/gallery/ai-prompt-card/AiPromptCard";

<AiPromptCard
  name="Lead follow-up email"
  model="Large model"
  defaultMode="preview"
  variables={[{ key: "client_name", default: "Brightside Dental" }]}
  versions={[{ id: "v1", text: "Write for {{client_name}}." }]}
  onCopy={(d) => console.log(d.text)}
/>`,
  usageNote:
    "Copy puts the filled-in prompt on the clipboard (or selects it if the clipboard is blocked). The token count is a rough guide (characters ÷ 4).",
  prompt: PROMPT,
};
