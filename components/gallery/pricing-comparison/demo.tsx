"use client";

import { useState } from "react";
import { Segmented, StageBar } from "@/components/site/controls";
import type { DemoProps } from "@/lib/demos";
import { PricingComparison, type PlanSelectDetail } from "./PricingComparison";
import { SAMPLE, SAMPLE_TIERS } from "./sample";

const PLANS = [
  { value: "starter", label: "Starter" },
  { value: "growth", label: "Growth" },
  { value: "scale", label: "Scale" },
] as const;

type Plan = (typeof PLANS)[number]["value"];

export default function Demo({ embed }: DemoProps) {
  const [featured, setFeatured] = useState<Plan>("growth");
  const [picked, setPicked] = useState<PlanSelectDetail | null>(null);
  return (
    <>
      <PricingComparison {...SAMPLE} tiers={SAMPLE_TIERS} featured={featured} onPlanSelect={setPicked} />
      {!embed && (
        <StageBar
          maxWidth={980}
          note={
            <span aria-live="polite">
              {picked ? (
                <>
                  <b>
                    {picked.name} · {picked.billing}
                  </b>{" "}
                  selected. The card called onPlanSelect. Example plans, not real pricing.
                </>
              ) : (
                <>
                  <b>Example plans.</b> Not real pricing.
                </>
              )}
            </span>
          }
        >
          <Segmented label="Popular plan" value={featured} options={PLANS} onChange={setFeatured} />
        </StageBar>
      )}
    </>
  );
}
