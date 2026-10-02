import type { ComponentMeta } from "@/lib/types";
import { PROMPT } from "./sample";

export const meta: ComponentMeta = {
  slug: "team-member-performance",
  number: 25,
  week: 13,
  type: "board",
  title: "Team Member Performance",
  navLabel: "Team Performance",
  componentName: "TeamPerformance",
  summary:
    "A sales leaderboard with a top-three podium and a ranked list. Rank by deals, revenue, calls or response time, and open a person to see their trend and targets.",
  description:
    "A sales leaderboard with a top-three podium and a ranked list. Rank the team by deals won, revenue, calls or response time, for this week or this month. Open a person to see their trend and how close they are to each target.",
  tags: ["Animated sort", "Trend sparklines", "Top-three podium"],
  props: [
    { name: "members", type: "TeamMember[]", required: true, description: "{ id, name, role?, periods }. Initials and avatar colour are made from the name and id." },
    { name: "members[].periods.<key>", type: "TeamMemberPeriod", description: "Arrays for deals, revenue, calls and response (minutes), oldest first, plus target { deals, revenue, calls, response }. Response is a maximum." },
    { name: "periods", type: "Record<string, TeamPeriodInfo>", required: true, description: "{ label, range?, compare?, axis? } per period key. axis names the points of each trend, oldest first." },
    { name: "metric · defaultMetric", type: '"deals" | "revenue" | "calls" | "response"', default: '"revenue"', description: "Ranking metric, controlled or initial. onMetricChange fires when the Rank by switch changes it." },
    { name: "period · defaultPeriod", type: "string", default: "first key of periods", description: "Period key, controlled or initial. onPeriodChange fires when it changes." },
    { name: "onMemberSelect", type: "(detail: TeamMemberSelectDetail) => void", description: "Fires when a person is opened or closed, with id, name, rank, metric, period, value and expanded." },
    { name: "eyebrow · title · team · footnote", type: "string", description: "Optional header and footer text." },
    { name: "currency · locale", type: "string", default: '"USD" · "en-US"', description: "Revenue currency and number locale." },
    { name: "labels", type: "Partial<TeamPerformanceLabels>", description: "Overrides for any built-in text." },
    { name: "className", type: "string", description: "Extra classes for the outer wrapper." },
  ],
  usage: `import { TeamPerformance } from "@/components/gallery/team-member-performance/TeamPerformance";

<TeamPerformance
  title="Team performance"
  periods={{ week: { label: "This week", compare: "last week", axis: ["W38", "W39"] } }}
  members={[
    {
      id: "mo",
      name: "Maya Okafor",
      periods: {
        week: {
          deals: [6, 5],
          revenue: [14750, 11250],
          calls: [60, 68],
          response: [14, 16],
          target: { revenue: 12000 },
        },
      },
    },
  ]}
  onMemberSelect={(d) => console.log(d.name, d.rank)}
/>`,
  usageNote: "Ranks and the ▲▼ change come from comparing the last two values of each series.",
  prompt: PROMPT,
};
