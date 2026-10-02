"use client";

import { useState } from "react";
import { DemoButton, Segmented, StageBar } from "@/components/site/controls";
import type { DemoProps } from "@/lib/demos";
import { CampaignStatusCard } from "./CampaignStatusCard";
import { SAMPLE, SAMPLE_DRAFT } from "./sample";

const STARTS = [
  { value: "live", label: "Live" },
  { value: "draft", label: "Draft" },
] as const;

export default function Demo({ embed }: DemoProps) {
  const [start, setStart] = useState<"live" | "draft">("live");
  const [run, setRun] = useState(0);
  const [change, setChange] = useState<string | null>(null);
  const reset = (s = start) => {
    setStart(s);
    setRun((r) => r + 1);
    setChange(null);
  };
  return (
    <>
      <CampaignStatusCard
        key={`${start}-${run}`}
        {...(start === "draft" ? SAMPLE_DRAFT : SAMPLE)}
        onStatusChange={(d) => setChange(`${d.from} → ${d.to}.`)}
      />
      {!embed && (
        <StageBar
          maxWidth={960}
          note={
            <span aria-live="polite">
              {change ? (
                <>
                  <b>{change}</b> The card called onStatusChange. Example data, not real client results.
                </>
              ) : (
                <>
                  <b>Example data.</b> Not real client results.
                </>
              )}
            </span>
          }
        >
          <Segmented label="Start from" value={start} options={STARTS} onChange={(v) => reset(v)} />
          <DemoButton onClick={() => reset()}>Reset demo</DemoButton>
        </StageBar>
      )}
    </>
  );
}
