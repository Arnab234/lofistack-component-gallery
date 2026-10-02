import type { ComponentMeta } from "@/lib/types";
import { PROMPT } from "./sample";

export const meta: ComponentMeta = {
  slug: "customer-journey-map",
  number: 29,
  week: 15,
  type: "map",
  title: "Customer Journey Map",
  navLabel: "Customer Journey",
  componentName: "CustomerJourneyMap",
  summary:
    "Five journey stages with goals, touchpoints, pain points and an emotion curve. Switch between three personas and focus a stage to see its opportunity, a key number and a quote.",
  description:
    "Five stages from first search to referral, with the customer's goal, touchpoints and pain points at each step, and a curve showing how they feel. Switch personas to see how the same journey plays out for different people, and pick a stage for the details.",
  tags: ["Persona switcher", "Emotion curve", "Stage details"],
  props: [
    { name: "stages", type: "{ id, label, tone? }[]", required: true, description: 'Stages in order. tone is "peach", "butter", "mint", "sky" or "lilac".' },
    { name: "personas", type: "JourneyPersona[]", required: true, description: "{ id, name, role, summary, color?, stages }. Initials are worked out from the name." },
    { name: "…stages[id].goal", type: "string", description: "What the customer is trying to do at that stage." },
    { name: "…touchpoints", type: "({ label, kind? } | string)[]", description: "kind picks the icon: search, social, review, web, chat, phone, email, sms, visit." },
    { name: "…pains", type: "string[]", description: "Short pain-point strings." },
    { name: "…emotion · mood", type: "number · string", description: "A score from −2 (very unhappy) to 2 (very happy), and a one-word feeling." },
    { name: "…opportunity · metric · quote", type: "string · { value, label } · string", description: "Shown in the detail card." },
    { name: "persona · defaultPersona", type: "string", description: "Controlled or initial persona id (default: the first)." },
    { name: "stage · defaultStage", type: "string | null", default: "null", description: "Controlled or initial focused stage id." },
    { name: "onStageSelect", type: "(d: StageSelectDetail) => void", description: "Fires with the stage, label, index, persona, emotion and mood." },
    { name: "onPersonaChange", type: "(d: { persona, name }) => void", description: "Fires when a persona button is pressed." },
    { name: "eyebrow · title · subtitle", type: "string", description: "Optional header text." },
    { name: "labels", type: "Partial<JourneyLabels>", description: 'Override built-in text, e.g. { rowGoal: "Job to be done" }.' },
  ],
  usage: `import { CustomerJourneyMap } from "@/components/gallery/customer-journey-map/CustomerJourneyMap";

<CustomerJourneyMap
  title="New patient journey"
  stages={[{ id: "awareness", label: "Awareness", tone: "peach" }]}
  personas={[{
    id: "sam", name: "Sam Ortiz", role: "First-timer",
    stages: {
      awareness: {
        goal: "Find a dentist nearby",
        touchpoints: [{ label: "Search ad", kind: "search" }],
        pains: ["Prices are hard to find"],
        emotion: 0, mood: "Curious",
        opportunity: "Show prices in ads.",
        metric: { value: "3.1%", label: "Click-through rate" },
        quote: "What does a check-up cost?",
      },
    },
  }]}
  onStageSelect={(d) => console.log(d.stage, d.mood)}
/>`,
  usageNote:
    "Click a stage, or use the arrow keys on the stage buttons, to focus it; Esc clears the focus. Below 760px the stages stack into a vertical sequence with a sentiment meter on each.",
  prompt: PROMPT,
};
