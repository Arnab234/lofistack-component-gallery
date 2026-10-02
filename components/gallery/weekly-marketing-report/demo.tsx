"use client";

import { useRef, useState, type ReactNode } from "react";
import { DemoButton, StageBar } from "@/components/site/controls";
import type { DemoProps } from "@/lib/demos";
import { WeeklyMarketingReport, type ChecklistToggleDetail, type WeeklyMarketingReportHandle } from "./WeeklyMarketingReport";
import { SAMPLE, WEEKS } from "./sample";

const DEFAULT_NOTE: ReactNode = (
  <>
    <b>Example data.</b> Fictional client, not real results.
  </>
);

export default function Demo({ embed }: DemoProps) {
  const report = useRef<WeeklyMarketingReportHandle>(null);
  const [note, setNote] = useState<ReactNode>(DEFAULT_NOTE);

  const say = (strong: string, rest: string) =>
    setNote(
      <>
        <b>{strong}</b> {rest}
      </>
    );

  const onChecklistToggle = (d: ChecklistToggleDetail) =>
    say(d.done ? "Ticked off." : "Unticked.", `“${d.text}” · onChecklistToggle fired. Fictional client, not real results.`);

  return (
    <>
      <WeeklyMarketingReport
        ref={report}
        {...SAMPLE}
        weeks={WEEKS}
        defaultWeek={38}
        onWeekChange={(d) => say(`Week ${d.week}.`, "The report fired onWeekChange. Fictional client, not real results.")}
        onChecklistToggle={onChecklistToggle}
      />
      {!embed && (
        <StageBar maxWidth={940} note={<span aria-live="polite">{note}</span>}>
          <DemoButton
            onClick={() => {
              report.current?.resetChecklists();
              say("Checklists reset.", "Fictional client, not real results.");
            }}
          >
            Reset checklists
          </DemoButton>
        </StageBar>
      )}
    </>
  );
}
