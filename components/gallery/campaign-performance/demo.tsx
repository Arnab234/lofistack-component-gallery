"use client";

import { useState } from "react";
import { Segmented, StageBar } from "@/components/site/controls";
import type { DemoProps } from "@/lib/demos";
import { CampaignSnapshot, type CampaignStatus } from "./CampaignSnapshot";
import { SAMPLE } from "./sample";

const STATUSES = [
  { value: "active", label: "Active" },
  { value: "learning", label: "Learning" },
  { value: "paused", label: "Paused" },
  { value: "ended", label: "Ended" },
] as const;

const GOALS = [
  { value: "Leads", label: "Leads" },
  { value: "Purchases", label: "Purchases" },
] as const;

export default function Demo({ embed }: DemoProps) {
  const [status, setStatus] = useState<CampaignStatus>("active");
  const [goal, setGoal] = useState<"Leads" | "Purchases">("Leads");
  return (
    <>
      <CampaignSnapshot {...SAMPLE} status={status} resultLabel={goal} />
      {!embed && (
        <StageBar note={<><b>Example figures.</b> Not real campaign data.</>}>
          <Segmented label="Status" value={status} options={STATUSES} onChange={setStatus} />
          <Segmented label="Goal" value={goal} options={GOALS} onChange={setGoal} />
        </StageBar>
      )}
    </>
  );
}
