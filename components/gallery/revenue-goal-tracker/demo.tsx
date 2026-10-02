"use client";

import { useState, type ReactNode } from "react";
import { DemoButton, StageBar } from "@/components/site/controls";
import type { DemoProps } from "@/lib/demos";
import { RevenueGoalTracker } from "./RevenueGoalTracker";
import { SAMPLE } from "./sample";

const DEFAULT_NOTE: ReactNode = (
  <>
    <b>Example data.</b> Fictional clients, not real revenue.
  </>
);

export default function Demo({ embed }: DemoProps) {
  const [run, setRun] = useState(0);
  const [note, setNote] = useState<ReactNode>(DEFAULT_NOTE);

  return (
    <>
      <RevenueGoalTracker
        key={run}
        {...SAMPLE}
        onProgress={(d) =>
          setNote(
            <>
              <b>
                {d.kind === "undo" ? "Undone" : "Sale logged"} · {d.pct}% of goal.
              </b>{" "}
              The tracker called onProgress. Example data, fictional clients.
            </>
          )
        }
      />
      {!embed && (
        <StageBar maxWidth={960} note={<span aria-live="polite">{note}</span>}>
          <DemoButton
            onClick={() => {
              setRun((r) => r + 1);
              setNote(DEFAULT_NOTE);
            }}
          >
            Reset demo
          </DemoButton>
        </StageBar>
      )}
    </>
  );
}
