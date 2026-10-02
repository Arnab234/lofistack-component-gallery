"use client";

import { useState, type ReactNode } from "react";
import { DemoButton, Segmented, StageBar } from "@/components/site/controls";
import type { DemoProps } from "@/lib/demos";
import { ClientOverviewCard, type ClientHealthStatus, type ClientOverviewTab } from "./ClientOverviewCard";
import { SAMPLE } from "./sample";

const HEALTH = [
  { value: "healthy", label: "Healthy" },
  { value: "at-risk", label: "At risk" },
  { value: "critical", label: "Critical" },
] as const;

const DEFAULT_NOTE: ReactNode = (
  <>
    <b>Example data.</b> Fictional client, not real results.
  </>
);

export default function Demo({ embed }: DemoProps) {
  const [health, setHealth] = useState<ClientHealthStatus>("healthy");
  const [tab, setTab] = useState<ClientOverviewTab>("overview");
  const [favourite, setFavourite] = useState(false);
  const [run, setRun] = useState(0);
  const [note, setNote] = useState<ReactNode>(DEFAULT_NOTE);

  const say = (strong: string, rest: string) =>
    setNote(
      <>
        <b>{strong}</b> {rest} Example data, not real results.
      </>
    );

  const reset = () => {
    setHealth("healthy");
    setTab("overview");
    setFavourite(false);
    setRun((r) => r + 1);
    say("Demo reset.", "Notes and favourite are back to the start.");
  };

  return (
    <>
      <ClientOverviewCard
        key={run}
        {...SAMPLE}
        health={{ ...SAMPLE.health, status: health }}
        tab={tab}
        onTabChange={setTab}
        favourite={favourite}
        onFavouriteChange={(on) => {
          setFavourite(on);
          say("onFavouriteChange", on ? "fired. Marked as a favourite." : "fired. Removed from favourites.");
        }}
        onNoteAdd={(_, count) => say("onNoteAdd", `fired. The client now has ${count} notes.`)}
        onEmailCopy={(c) => say("onEmailCopy", `fired for ${c.name}.`)}
      />
      {!embed && (
        <StageBar maxWidth={920} note={<span aria-live="polite">{note}</span>}>
          <Segmented label="Health" value={health} options={HEALTH} onChange={setHealth} />
          <DemoButton onClick={reset}>Reset demo</DemoButton>
        </StageBar>
      )}
    </>
  );
}
