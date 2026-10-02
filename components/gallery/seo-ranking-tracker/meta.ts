import type { ComponentMeta } from "@/lib/types";
import { PROMPT } from "./sample";

export const meta: ComponentMeta = {
  slug: "seo-ranking-tracker",
  number: 10,
  week: 5,
  type: "table",
  title: "SEO Ranking Tracker",
  navLabel: "SEO Rankings",
  componentName: "SeoRankingTracker",
  summary:
    "Tracked keywords with this week's position, weekly change, best position, search volume and an eight-week rank sparkline. Sort any column, search, filter by rank or movement, and open a row for its full history chart.",
  description:
    "Where a site ranks in search for each tracked keyword this week, how far it moved, and an eight-week history line. Sort any column, search, filter by rank, and open a row to see its full history.",
  tags: ["Sortable table", "Sparklines", "History chart"],
  props: [
    { name: "keywords", type: "TrackedKeyword[]", default: "[]", required: true, description: "{ keyword, history, url?, volume?, best?, intent? }." },
    { name: "keywords[].history", type: "(number | null)[]", description: "Weekly positions, oldest first. The last value is this week, the one before is last week. null = not in the top 100." },
    { name: "keywords[].best", type: "number", description: "All-time best. The lowest value in history is used if it is better." },
    { name: "weeks", type: "string[]", default: "[]", description: 'Labels for each history point, e.g. "Sep 25".' },
    { name: "eyebrow · title · site", type: "string", description: "Optional header text." },
    { name: "period · source", type: "string", description: "Date text (top right) and footer note." },
    { name: "locale", type: "string", default: '"en-US"', description: "Number locale." },
    { name: "sort · defaultSort", type: '{ key: "keyword" | "position" | "change" | "best" | "volume", dir: "asc" | "desc" }', default: '{ key: "position", dir: "asc" }', description: "Controlled or starting sort." },
    { name: "filter · defaultFilter", type: '"all" | "top3" | "top10" | "improved" | "declined"', default: '"all"', description: "Controlled or starting filter." },
    { name: "onSortChange", type: "(sort) => void", description: "Fires when a column header or the phone sort menu changes the sort." },
    { name: "onFilterChange", type: "({ filter, shown }) => void", description: "Fires when a filter chip is picked." },
    { name: "onKeywordSelect", type: "(detail) => void", description: "Fires when a row opens or closes, with keyword, position, change, best, url, volume and expanded." },
  ],
  usage: `import { SeoRankingTracker } from "@/components/gallery/seo-ranking-tracker/SeoRankingTracker";

<SeoRankingTracker
  title="Organic keyword positions"
  weeks={["Sep 18", "Sep 25", "Oct 2"]}
  keywords={[
    { keyword: "emergency dentist near me", url: "/emergency-dental",
      volume: 6600, history: [6, 5, 4] },
  ]}
  onKeywordSelect={(d) => console.log(d.keyword, d.expanded)}
/>`,
  usageNote: "Change, best position and the summary are all worked out from history. Focus an open row's chart and use the arrow keys, Home and End to step through weeks.",
  prompt: PROMPT,
};
