import type { ComponentMeta } from "@/lib/types";
import { PROMPT } from "./sample";

export const meta: ComponentMeta = {
  slug: "client-overview-card",
  number: 7,
  week: 4,
  type: "card",
  title: "Client Overview Card",
  navLabel: "Client Overview",
  componentName: "ClientOverviewCard",
  summary:
    "A CRM profile for one client: health, monthly revenue, tenure and open pipeline at a glance. Switch tabs to see account details, copy a contact’s email or add a note.",
  description:
    "One client at a glance: account health, monthly revenue, tenure and open pipeline. Tabs hold the account details, the people you talk to, and a running set of notes.",
  tags: ["Accessible tabs", "Notes", "Copy email"],
  props: [
    { name: "company · initials", type: "string", required: true, description: "Client name. Initials are worked out from the name if left out." },
    { name: "industry · location · website", type: "string", description: "Optional details under the name and in the Overview tab." },
    { name: "plan · billing · renewal", type: "string", description: "Plan name, billing text and renewal date (YYYY-MM-DD)." },
    { name: "owner", type: "{ name, role? }", description: "Account owner. Role defaults to “Account owner”." },
    { name: "health", type: '{ status?: "healthy" | "at-risk" | "critical", score?, note? }', default: '{ status: "healthy" }', description: "Health badge, 0–100 score and the note shown in Overview." },
    { name: "mrr · mrrPrevious", type: "number", description: "Monthly recurring revenue and the earlier figure for the % change." },
    { name: "mrrCompareLabel", type: "string", description: "Names the earlier figure, e.g. “last quarter”." },
    { name: "currency · locale", type: "string", default: '"USD" · "en-GB"', description: "ISO currency and number/date locale." },
    { name: "clientSince · asOf", type: "string", description: "YYYY-MM-DD. Tenure and “days ago” are counted to asOf (default: today, read after mount)." },
    { name: "lastActivity", type: "{ date, summary? }", description: "Most recent touchpoint; shown as a relative day." },
    { name: "services", type: "string[]", default: "[]", description: "Shown as chips in Overview." },
    { name: "opportunities", type: "{ name, stage?, value?, close? }[]", default: "[]", description: "Open deals with stage ticks, value and close date." },
    { name: "stages", type: "string[]", default: '["Discovery", "Proposal", "Negotiation", "Closing"]', description: "Stage order for the ticks." },
    { name: "contacts", type: "{ name, role?, email?, phone?, primary? }[]", default: "[]", description: "People at the client; emails get a copy button." },
    { name: "notes · noteAuthor", type: "{ author?, date?, text }[] · string", default: '[] · "You"', description: "Starting notes, newest first, and who adds new ones. New notes are kept in state." },
    { name: "tab · defaultTab", type: '"overview" | "contacts" | "notes"', default: '"overview"', description: "Controlled or starting tab." },
    { name: "favourite · defaultFavourite", type: "boolean", default: "false", description: "Controlled or starting state of the star button." },
    { name: "onTabChange · onFavouriteChange", type: "(value) => void", description: "Fire when the tabs or the star change." },
    { name: "onNoteAdd", type: "(note, count) => void", description: "Fires after a note is added. Save it from here." },
    { name: "onEmailCopy", type: "(contact) => void", description: "Fires after an email is copied to the clipboard." },
  ],
  usage: `import { ClientOverviewCard } from "@/components/gallery/client-overview-card/ClientOverviewCard";

<ClientOverviewCard
  company="Harbor & Pine Realty"
  plan="Growth retainer"
  owner={{ name: "Maya Okafor" }}
  health={{ status: "healthy", score: 82 }}
  mrr={4800}
  mrrPrevious={4200}
  clientSince="2024-03-11"
  contacts={[{ name: "Dana Whitfield", email: "dana@harborandpine.example" }]}
  notes={[]}
  onNoteAdd={(note, count) => save(note)}
/>`,
  usageNote: "Notes live in component state only; save them from onNoteAdd. Use the arrow keys, Home and End to move between tabs, and Ctrl + Enter to add a note.",
  prompt: PROMPT,
};
