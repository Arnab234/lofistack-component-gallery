"use client";

import { useState, type ReactNode } from "react";
import { Segmented, StageBar } from "@/components/site/controls";
import type { DemoProps } from "@/lib/demos";
import { WorkflowAutomationCard } from "./WorkflowAutomationCard";
import { CALL_WORKFLOW, LEAD_WORKFLOW } from "./sample";

const WORKFLOWS = [
  { value: "lead", label: "New lead follow-up" },
  { value: "call", label: "Missed-call text back" },
] as const;

const DEFAULT_NOTE: ReactNode = (
  <>
    <b>Example data.</b> Fictional workflow, contacts and numbers, not real client results.
  </>
);

export default function Demo({ embed }: DemoProps) {
  const [which, setWhich] = useState<"lead" | "call">("lead");
  const [note, setNote] = useState<ReactNode>(DEFAULT_NOTE);
  const data = which === "call" ? CALL_WORKFLOW : LEAD_WORKFLOW;
  return (
    <>
      <WorkflowAutomationCard
        {...data}
        onRun={(d) => {
          if (d.status !== "completed" && d.status !== "stopped") return;
          setNote(
            <>
              <b>{d.status === "completed" ? `Test run completed in ${d.totalMs.toLocaleString("en-US")} ms.` : `Test run stopped after ${d.step} steps.`}</b> The
              card fired onRun. Example data, not real client results.
            </>
          );
        }}
      />
      {!embed && (
        <StageBar maxWidth={980} note={<span aria-live="polite">{note}</span>}>
          <Segmented label="Workflow" value={which} options={WORKFLOWS} onChange={setWhich} />
        </StageBar>
      )}
    </>
  );
}
