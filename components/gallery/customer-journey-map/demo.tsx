"use client";

import { useState, type ReactNode } from "react";
import { StageBar } from "@/components/site/controls";
import type { DemoProps } from "@/lib/demos";
import { CustomerJourneyMap, type StageSelectDetail } from "./CustomerJourneyMap";
import { PERSONAS, SAMPLE, STAGES } from "./sample";

const DEFAULT_NOTE: ReactNode = (
  <>
    <b>Example data.</b> Fictional personas, not real client research.
  </>
);

export default function Demo({ embed }: DemoProps) {
  const [note, setNote] = useState<ReactNode>(DEFAULT_NOTE);

  const onStageSelect = (d: StageSelectDetail) =>
    setNote(
      d.stage ? (
        <>
          <b>
            {d.label} · {d.mood}
          </b>{" "}
          · onStageSelect fired. Fictional personas, not real client research.
        </>
      ) : (
        <>
          <b>Stage focus cleared.</b> Fictional personas, not real client research.
        </>
      )
    );

  const onPersonaChange = (d: { persona: string; name: string }) =>
    setNote(
      <>
        <b>Persona: {d.name}</b> · onPersonaChange fired. Fictional personas, not real client research.
      </>
    );

  return (
    <>
      <CustomerJourneyMap {...SAMPLE} stages={STAGES} personas={PERSONAS} defaultPersona="sam" onStageSelect={onStageSelect} onPersonaChange={onPersonaChange} />
      {!embed && <StageBar maxWidth={1000} note={<span aria-live="polite">{note}</span>} />}
    </>
  );
}
