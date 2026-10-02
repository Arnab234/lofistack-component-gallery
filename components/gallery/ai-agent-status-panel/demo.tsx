"use client";

import { useRef, useState, type ReactNode } from "react";
import { DemoButton, StageBar } from "@/components/site/controls";
import type { DemoProps } from "@/lib/demos";
import { AgentStatusPanel, type AgentStatusPanelHandle } from "./AgentStatusPanel";
import { SAMPLE, SAMPLE_AGENTS, SIMULATED_ERROR } from "./sample";

const DEFAULT_NOTE: ReactNode = (
  <>
    <b>Example data.</b> Simulated agents, not a real system.
  </>
);

export default function Demo({ embed }: DemoProps) {
  const panel = useRef<AgentStatusPanelHandle>(null);
  const [resetKey, setResetKey] = useState(0);
  const [note, setNote] = useState<ReactNode>(DEFAULT_NOTE);
  return (
    <>
      <AgentStatusPanel
        key={resetKey}
        ref={panel}
        {...SAMPLE}
        agents={SAMPLE_AGENTS}
        onAgentAction={(d) =>
          setNote(
            <>
              <b>
                {d.name}: {d.action}.
              </b>{" "}
              The panel fired onAgentAction ({d.from} → {d.to}). Simulated agents, not a real system.
            </>
          )
        }
      />
      {!embed && (
        <StageBar maxWidth={980} note={<span aria-live="polite">{note}</span>}>
          <DemoButton
            onClick={() => {
              const list = panel.current?.getAgents() ?? [];
              const pick = list.find((a) => a.status === "running") ?? list[0];
              if (!pick) return;
              panel.current?.setStatus(pick.id, "error", SIMULATED_ERROR);
              setNote(
                <>
                  <b>{pick.name} set to Error.</b> Open it with “Show error” and press Retry now. Simulated agents, not a real system.
                </>
              );
            }}
          >
            Simulate an error
          </DemoButton>
          <DemoButton
            onClick={() => {
              setResetKey((k) => k + 1);
              setNote(
                <>
                  <b>Demo reset.</b> Simulated agents, not a real system.
                </>
              );
            }}
          >
            Reset demo
          </DemoButton>
        </StageBar>
      )}
    </>
  );
}
