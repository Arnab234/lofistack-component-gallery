"use client";

import { useState, type ReactNode } from "react";
import { DemoButton, StageBar } from "@/components/site/controls";
import type { DemoProps } from "@/lib/demos";
import { RevenueGrowthChart } from "./RevenueGrowthChart";
import { SAMPLE } from "./sample";

const DEFAULT_NOTE: ReactNode = (
  <>
    <b>Example data.</b> Not real client results.
  </>
);

export default function Demo({ embed }: DemoProps) {
  const [replay, setReplay] = useState(0);
  const [note, setNote] = useState<ReactNode>(DEFAULT_NOTE);
  return (
    <>
      <RevenueGrowthChart
        {...SAMPLE}
        defaultRange="12m"
        defaultCompare
        replayKey={replay}
        onRangeChange={({ range, growth }) =>
          setNote(
            <>
              <b>Range: {range.toUpperCase()}</b> · onRangeChange fired (growth {growth == null ? "n/a" : `${(growth * 100).toFixed(1)}%`}). Example data, not
              real client results.
            </>
          )
        }
        onViewChange={({ compare, cumulative }) =>
          setNote(
            <>
              <b>
                Compare {compare ? "on" : "off"} · cumulative {cumulative ? "on" : "off"}
              </b>{" "}
              · onViewChange fired. Example data, not real client results.
            </>
          )
        }
      />
      {!embed && (
        <StageBar maxWidth={980} note={<span aria-live="polite">{note}</span>}>
          <DemoButton onClick={() => setReplay((r) => r + 1)}>Replay animation</DemoButton>
        </StageBar>
      )}
    </>
  );
}
