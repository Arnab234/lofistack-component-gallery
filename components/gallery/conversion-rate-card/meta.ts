import type { ComponentMeta } from "@/lib/types";
import { PROMPT } from "./sample";

export const meta: ComponentMeta = {
  slug: "conversion-rate-card",
  number: 11,
  week: 6,
  type: "gauge",
  title: "Conversion Rate Card",
  navLabel: "Conversion Rate",
  componentName: "ConversionRateCard",
  summary:
    "A gold-on-charcoal gauge that shows the conversion rate against its target for each channel. Drag the what-if slider to see how many more conversions would close the gap.",
  description:
    "A gauge that shows the conversion rate against its target, channel by channel. The what-if slider lets you try a different number of conversions and see how far it is from the target.",
  tags: ["SVG gauge", "What-if slider", "Per-channel targets"],
  props: [
    {
      name: "channels",
      type: "ConversionChannel[]",
      required: true,
      description: "{ id, label, visitors, conversions, target?, previous?: { visitors, conversions } }. Rates are worked out from the counts; previous adds the change in points.",
    },
    { name: "channel", type: "string", description: 'Selected channel id or "all". Pass it to control the switch.' },
    { name: "defaultChannel", type: "string", default: '"all"', description: "Starting channel when channel is not controlled." },
    { name: "target", type: "number", description: 'Target rate in percent for the combined "All" view and any channel without its own.' },
    { name: "targetOverride", type: "number", description: "A target rate in percent that overrides every channel's own target." },
    { name: "max", type: "number", description: "Top of the gauge scale in percent. Worked out from the data if left out." },
    { name: "eyebrow · title", type: "string", description: "Optional header text." },
    { name: "client · period", type: "string", description: "Optional text for the line under the title." },
    { name: "compareLabel", type: "string", default: '""', description: 'Name of the previous period, e.g. "Aug".' },
    { name: "showAll", type: "boolean", default: "true", description: 'Set to false to hide the combined "All" view.' },
    { name: "labels", type: "Partial<ConversionRateLabels>", description: "Override any built-in text." },
    { name: "locale", type: "string", default: '"en-US"', description: "Number locale." },
    { name: "onChannelChange", type: "(detail: ChannelChangeDetail) => void", description: "Fires with the channel, rate, target and counts when a channel is picked." },
    { name: "onWhatIfChange", type: "(detail: WhatIfChangeDetail) => void", description: "Fires when the slider is let go of, with the tested conversions, rate and gap to target." },
    { name: "className", type: "string", description: "Extra classes for the outer wrapper." },
  ],
  usage: `import { ConversionRateCard } from "@/components/gallery/conversion-rate-card/ConversionRateCard";

<ConversionRateCard
  title="Visitor to booked consultation"
  period="1–30 Sep 2026"
  target={4.8}
  channels={[
    { id: "organic", label: "Organic", visitors: 6420, conversions: 244, target: 4.0 },
    { id: "paid", label: "Paid", visitors: 4180, conversions: 196 },
  ]}
  onChannelChange={(d) => console.log(d.channel, d.rate)}
  onWhatIfChange={(d) => console.log(d.conversions, d.gap)}
/>`,
  usageNote: 'The "All" view adds the channels together, so every rate is worked out from the counts.',
  prompt: PROMPT,
};
