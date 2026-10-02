"use client";

import { useState } from "react";
import { DemoButton, Segmented, StageBar } from "@/components/site/controls";
import type { DemoProps } from "@/lib/demos";
import { LeadFunnel, type FunnelScale } from "./LeadFunnel";
import { SAMPLE, SAMPLE_COMPARE, SAMPLE_STAGES } from "./sample";

const SCALES = [
  { value: "sqrt", label: "Square root" },
  { value: "linear", label: "Linear" },
] as const;

export default function Demo({ embed }: DemoProps) {
  const [scale, setScale] = useState<FunnelScale>("sqrt");
  const [replay, setReplay] = useState(0);
  return (
    <>
      <LeadFunnel {...SAMPLE} stages={SAMPLE_STAGES} compare={SAMPLE_COMPARE} scale={scale} replayKey={replay} />
      {!embed && (
        <StageBar note={<><b>Example figures.</b> Not real client data.</>}>
          <Segmented label="Bar scale" value={scale} options={SCALES} onChange={setScale} />
          <DemoButton onClick={() => setReplay((r) => r + 1)}>Replay animation</DemoButton>
        </StageBar>
      )}
    </>
  );
}
