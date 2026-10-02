import type { ComponentMeta } from "@/lib/types";
import { PROMPT } from "./sample";

export const meta: ComponentMeta = {
  slug: "ad-creative-performance",
  number: 9,
  week: 5,
  type: "grid",
  title: "Ad Creative Performance",
  navLabel: "Ad Creatives",
  componentName: "AdCreativePerformance",
  summary:
    "A gallery of ad creatives with format badges and results. Sort by CTR, CPA, spend or conversions, filter by format, and compare two creatives head to head.",
  description:
    "Every ad creative in a campaign, with its format and results. Sort the gallery by CTR, cost per conversion, spend or conversions, filter by format, and pick two creatives to see which one wins on each metric.",
  tags: ["Sort & filter", "Head-to-head compare", "FLIP reflow"],
  props: [
    { name: "eyebrow · title · subtitle · period", type: "string", description: "Optional header text." },
    { name: "currency · locale", type: "string", default: '"USD" · "en-US"', description: "Money and number formatting." },
    { name: "creatives", type: "AdCreative[]", default: "[]", required: true, description: "{ id, name, format, duration?, slides?, copy?, impressions, clicks, spend, conversions, art? }. CTR, CPC, conversion rate and CPA are worked out from the counts." },
    { name: "creatives[].format", type: '"image" | "video" | "carousel"', description: "Video takes duration, carousel takes slides." },
    { name: "creatives[].art", type: "{ pattern?, invert?, text? }", description: "Stand-in thumbnail: sun, stripes, dots, arch, blocks, wave or type." },
    { name: "source", type: "string", description: "Footer note." },
    { name: "sort · defaultSort", type: '"ctr" | "cpa" | "spend" | "conversions"', default: '"ctr"', description: "Controlled or starting sort." },
    { name: "format · defaultFormat", type: '"all" | "image" | "video" | "carousel"', default: '"all"', description: "Controlled or starting format filter." },
    { name: "onSortChange", type: "({ sort, format }) => void", description: "Fires when the sort buttons or format chips change." },
    { name: "compare · defaultCompare", type: "string[]", default: "[]", description: "Controlled or starting comparison: up to two creative ids." },
    { name: "onCompare", type: "(detail: CreativeCompareDetail) => void", description: "Fires with the picked ids, each one's metrics, the overall winner and the wins per id." },
  ],
  usage: `import { AdCreativePerformance } from "@/components/gallery/ad-creative-performance/AdCreativePerformance";

<AdCreativePerformance
  title="New-patient offer"
  currency="USD"
  creatives={[
    { id: "smile-30", name: "Smile in 30 days", format: "video", duration: "0:15",
      impressions: 182400, clicks: 3612, spend: 2140, conversions: 96,
      art: { pattern: "sun" } },
  ]}
  onCompare={(d) => console.log(d.winner)}
/>`,
  usageNote: "rankCreatives(creatives, sort, format) returns the ranked ids, e.g. to compare the top two from outside.",
  prompt: PROMPT,
};
