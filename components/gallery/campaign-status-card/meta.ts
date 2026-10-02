import type { ComponentMeta } from "@/lib/types";
import { PROMPT } from "./sample";

export const meta: ComponentMeta = {
  slug: "campaign-status-card",
  number: 13,
  week: 7,
  type: "card",
  title: "Campaign Status Card",
  navLabel: "Campaign Status",
  componentName: "CampaignStatusCard",
  summary:
    "A campaign's lifecycle from draft to completed, with flight-date progress, budget pacing and channels. Launch, pause, resume or end it: only valid moves are allowed, ending asks to confirm, and every change is logged.",
  description:
    "Where a campaign is in its life, from draft to finished. It shows how far through its dates it is, whether spend is on pace, and every status change. The controls only allow moves that make sense right now.",
  tags: ["State machine", "Confirm dialog", "Budget pacing"],
  props: [
    { name: "name", type: "string", required: true, description: "Campaign name." },
    { name: "client · campaignId", type: "string", description: "Client name and campaign reference." },
    { name: "objective · owner", type: "string", description: "Optional details under the title." },
    {
      name: "status",
      type: '"draft" | "scheduled" | "live" | "paused" | "completed"',
      description: "Status to show. Defaults to the state of the last log entry; changing it later moves the card to that status.",
    },
    { name: "today", type: "string", description: "Date used for flight and pacing maths, YYYY-MM-DD. Defaults to the real date." },
    { name: "flight", type: "{ start: string; end: string }", description: "Flight dates, YYYY-MM-DD, both days included." },
    { name: "budget · spent", type: "number", default: "0", description: "Total budget and spend so far. Pacing compares spend with the budget share expected by today." },
    { name: "currency · locale", type: "string", default: '"USD" · "en-US"', description: "Money format." },
    { name: "channels", type: "CampaignChannel[]", default: "[]", description: "{ name, type?, spent?, leads? }. type picks the glyph: search, social, video, display, email." },
    { name: "log", type: "CampaignLogEntry[]", description: "Past changes, oldest first: { action, by?, at? }. Actions: created, scheduled, launched, paused, resumed, ended." },
    { name: "user", type: "string", default: '"you"', description: "Name recorded for changes made in the card." },
    { name: "onStatusChange", type: "(detail: CampaignStatusChangeDetail) => void", description: "Fires after every move with { from, to, action, by, at }." },
    { name: "ref", type: "Ref<CampaignStatusHandle>", description: "can(action), transition(action) (skips the confirm step) and the current status." },
    { name: "className", type: "string", description: "Extra classes for the outer wrapper." },
  ],
  usage: `import { CampaignStatusCard } from "@/components/gallery/campaign-status-card/CampaignStatusCard";

<CampaignStatusCard
  name="Fall Smile Makeover"
  client="Brightside Dental"
  status="live"
  flight={{ start: "2026-09-22", end: "2026-10-21" }}
  budget={12000}
  spent={4520}
  channels={[{ name: "Search Ads", type: "search", spent: 2080, leads: 61 }]}
  log={[{ action: "launched", by: "Scheduler", at: "2026-09-22T09:00" }]}
  onStatusChange={(d) => console.log(d.from, "→", d.to)}
/>`,
  usageNote:
    "Allowed moves: Draft → Scheduled or Live; Scheduled → Live; Live ⇄ Paused; any started state → Completed (asks to confirm first). Launching before the planned start moves the flight start to today.",
  prompt: PROMPT,
};
