import type { PromptVariable, PromptVersion } from "./AiPromptCard";

export interface PromptSample {
  name: string;
  description: string;
  path: string;
  model: string;
  temperature: number;
  activeVersion?: string;
  variables: PromptVariable[];
  versions: PromptVersion[];
}

/** Example prompt used by the preview. Fictional client, not a real campaign. */
export const EMAIL_PROMPT: PromptSample = {
  name: "Lead follow-up email",
  description: "Nudges new form leads to book a discovery call",
  path: "prompts/sales/lead-follow-up",
  model: "Large model",
  temperature: 0.7,
  activeVersion: "v3",
  variables: [
    { key: "client_name", label: "Client name", default: "Brightside Dental" },
    { key: "tone", label: "Tone of voice", default: "warm and reassuring", suggestions: ["warm and reassuring", "direct", "upbeat"] },
    { key: "offer", label: "Current offer", default: "a free whitening consultation this month" },
  ],
  versions: [
    {
      id: "v1",
      updated: "2026-09-12",
      note: "First draft",
      text: "You are writing a follow-up email for {{client_name}}.\n\nThe lead filled in our contact form but has not booked a call.\nWrite a short email in a {{tone}} tone that mentions {{offer}} and asks them to book.",
    },
    {
      id: "v2",
      updated: "2026-09-19",
      note: "Split into role, task and guidelines",
      text: '# Role\nYou are an account manager writing on behalf of {{client_name}}.\n\n# Task\nWrite a follow-up email to a lead who filled in the contact form but has not booked a call yet.\n\n# Guidelines\n- Keep the tone {{tone}}.\n- Mention the current offer: {{offer}}.\n- Sign off as "The {{client_name}} team".',
    },
    {
      id: "v3",
      updated: "2026-09-28",
      note: "Word limit and a closing question",
      text: '# Role\nYou are an account manager writing on behalf of {{client_name}}.\n\n# Task\nWrite a follow-up email to a lead who filled in the contact form but has not booked a call yet.\n\n# Guidelines\n- Keep the tone {{tone}}.\n- Mention the current offer: {{offer}}.\n- Stay under 120 words and use short paragraphs.\n- End with one clear question that invites them to book a call.\n- Sign off as "The {{client_name}} team".\n\n# Output\nReturn a subject line on the first line, then the email body.',
    },
  ],
};

/** Second example, loaded from the preview controls. */
export const AD_PROMPT: PromptSample = {
  name: "Social ad copy",
  description: "Three short ad variations for a local offer",
  path: "prompts/ads/social-variations",
  model: "Fast model",
  temperature: 0.9,
  variables: [
    { key: "client_name", label: "Client name", default: "Cedar Fitness Co." },
    { key: "offer", label: "Offer", default: "your first week free" },
    { key: "audience", label: "Audience", default: "busy parents within 5 miles", suggestions: ["busy parents within 5 miles", "students", "new movers"] },
    { key: "tone", label: "Tone of voice", default: "upbeat", suggestions: ["upbeat", "calm", "bold"] },
  ],
  versions: [
    {
      id: "v1",
      updated: "2026-09-21",
      note: "First draft",
      text: "Write 3 social ad captions for {{client_name}} promoting {{offer}}.\nThe audience is {{audience}}.",
    },
    {
      id: "v2",
      updated: "2026-09-30",
      note: "Added format rules",
      text: "# Task\nWrite 3 social ad captions for {{client_name}} promoting {{offer}}.\n\n# Audience\n{{audience}}\n\n# Rules\n- Keep the tone {{tone}}.\n- Each caption is under 90 characters.\n- Open with a question or a number.\n- End with one call to action.\n\n# Output\nA numbered list, one caption per line.",
    },
  ],
};

export const PROMPT = `Build component 06 for my LofiStack Component Gallery: an AI Prompt Card that shows a saved prompt like a file in a code editor.

It should show:

* A title bar with a file icon, the prompt name and purpose, a model chip with temperature, and version tabs (the latest marked with a dot)
* A file path, a Template / Preview switch, and the prompt text with line numbers, highlighted headings, bullets and numbers
* {{variables}} as amber pills; in Preview they are replaced with the filled-in values, empty ones turn red, and undefined ones get a wavy underline
* A gutter mark on every line that is new since the previous version
* A variables panel with one input per variable, its label, how many times it is used, quick-pick suggestion chips, a filled count and a reset button; hovering or focusing a variable links its input and its pills
* A status bar with characters, a rough token count (characters ÷ 4), lines, the edit date and note, and a Copy prompt button

Requirements:

* React + TypeScript + Tailwind CSS. Name, model, variables, versions and labels come in through typed props; nothing hardcoded.
* Copy puts the filled-in prompt on the clipboard, or switches to Preview and selects the text when the clipboard is blocked, with a Copied / Selected confirmation.
* Callbacks for version, mode, variable changes and copy; an imperative handle for setVariable, resetVariables, copy and filledText.
* Version tabs follow the ARIA tabs pattern with arrow keys, Home and End.
* Fully responsive: variables beside the editor on desktop, under it on tablets, and full-width controls on phones.
* The editor stays dark in both light and dark themes, through CSS variables.
* Hover, focus-visible, pressed and reduced-motion states; live announcements for version switches, resets and copies.
* Give it its own page in the gallery with a live preview, a control to load a second example prompt, a props table and a usage example.`;
