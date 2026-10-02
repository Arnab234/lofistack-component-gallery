"use client";

import { useState } from "react";
import { DemoButton, StageBar } from "@/components/site/controls";
import type { DemoProps } from "@/lib/demos";
import { KpiDashboard, type KpiSelectDetail } from "./KpiDashboard";
import { SAMPLE, SAMPLE_METRICS, SAMPLE_PERIODS } from "./sample";

const INITIAL_HERO = "revenue";

export default function Demo({ embed }: DemoProps) {
  const [hero, setHero] = useState(INITIAL_HERO);
  const [picked, setPicked] = useState<KpiSelectDetail | null>(null);
  return (
    <>
      <KpiDashboard
        {...SAMPLE}
        periods={SAMPLE_PERIODS}
        metrics={SAMPLE_METRICS}
        defaultPeriod="30d"
        hero={hero}
        onSelect={(d) => {
          setHero(d.id);
          setPicked(d);
        }}
      />
      {!embed && (
        <StageBar
          maxWidth={980}
          note={
            <span aria-live="polite">
              {picked ? (
                <>
                  <b>
                    {picked.label} · {picked.period.toUpperCase()}
                  </b>{" "}
                  pinned. The dashboard called onSelect. Example data, not real client results.
                </>
              ) : (
                <>
                  <b>Example data.</b> Not real client results.
                </>
              )}
            </span>
          }
        >
          <DemoButton onClick={() => setHero(INITIAL_HERO)}>Reset layout</DemoButton>
        </StageBar>
      )}
    </>
  );
}
