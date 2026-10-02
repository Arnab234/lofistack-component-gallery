"use client";

import { useRef, useState, type ReactNode } from "react";
import { DemoButton, StageBar } from "@/components/site/controls";
import type { DemoProps } from "@/lib/demos";
import { IntegrationStatusGrid, type IntegrationStatusGridHandle } from "./IntegrationStatusGrid";
import { SAMPLE } from "./sample";

const DEFAULT_NOTE: ReactNode = (
  <>
    <b>Example data.</b> Generic tools and a fictional client. Syncs are simulated.
  </>
);

export default function Demo({ embed }: DemoProps) {
  const grid = useRef<IntegrationStatusGridHandle>(null);
  const [run, setRun] = useState(0);
  const [note, setNote] = useState<ReactNode>(DEFAULT_NOTE);

  return (
    <>
      <IntegrationStatusGrid
        key={run}
        ref={grid}
        {...SAMPLE}
        onSync={(d) =>
          setNote(
            <>
              <b>{d.action === "reconnect" ? `${d.name} reconnected.` : `${d.name} synced, ${d.eventsAdded} new events.`}</b> The grid called onSync. Syncs are
              simulated.
            </>
          )
        }
      />
      {!embed && (
        <StageBar maxWidth={980} note={<span aria-live="polite">{note}</span>}>
          <DemoButton onClick={() => grid.current?.setStatus("payments", "disconnected", "The payment provider rejected the saved key.")}>
            Simulate a payments outage
          </DemoButton>
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
