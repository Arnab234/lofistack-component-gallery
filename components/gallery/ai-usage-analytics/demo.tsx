"use client";

import { useRef, useState, type ReactNode } from "react";
import { DemoButton, Segmented, StageBar } from "@/components/site/controls";
import type { DemoProps } from "@/lib/demos";
import { AiUsageAnalytics, type AiUsageAnalyticsHandle, type UsageFilter } from "./AiUsageAnalytics";
import { SAMPLE } from "./sample";

const QUOTAS = [
  { value: "300000000", label: "300M" },
  { value: "400000000", label: "400M" },
  { value: "600000000", label: "600M" },
] as const;
type Quota = (typeof QUOTAS)[number]["value"];

const DEFAULT_NOTE: ReactNode = (
  <>
    <b>Example data.</b> Generic model tiers and made-up prices, not a real bill.
  </>
);

export default function Demo({ embed }: DemoProps) {
  const chart = useRef<AiUsageAnalyticsHandle>(null);
  const [quota, setQuota] = useState<Quota>("400000000");
  const [note, setNote] = useState<ReactNode>(DEFAULT_NOTE);

  const onFilterChange = (f: UsageFilter) =>
    setNote(
      <>
        <b>onFilterChange</b> fired: {f.metric}, {f.range} days, {f.model ? `${f.model} only` : "all models"}. Example data, not a real bill.
      </>
    );

  return (
    <>
      <AiUsageAnalytics ref={chart} {...SAMPLE} quota={Number(quota)} onFilterChange={onFilterChange} />
      {!embed && (
        <StageBar maxWidth={980} note={<span aria-live="polite">{note}</span>}>
          <Segmented label="Monthly quota" value={quota} options={QUOTAS} onChange={setQuota} />
          <DemoButton onClick={() => chart.current?.replay()}>Replay animation</DemoButton>
        </StageBar>
      )}
    </>
  );
}
