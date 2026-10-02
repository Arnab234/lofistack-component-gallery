"use client";

import { useRef, useState } from "react";
import { DemoButton, Segmented, StageBar } from "@/components/site/controls";
import type { DemoProps } from "@/lib/demos";
import { LeadSourceBreakdown, type LeadSourceBreakdownHandle } from "./LeadSourceBreakdown";
import { SAMPLE, SAMPLE_Q2, SAMPLE_Q3 } from "./sample";

const QUARTERS = [
  { value: "q2", label: "Q2" },
  { value: "q3", label: "Q3" },
] as const;

export default function Demo({ embed }: DemoProps) {
  const ref = useRef<LeadSourceBreakdownHandle>(null);
  const [quarter, setQuarter] = useState<"q2" | "q3">("q3");
  const [note, setNote] = useState<{ strong: string; rest: string } | null>(null);
  const data = quarter === "q2" ? { ...SAMPLE, ...SAMPLE_Q2 } : { ...SAMPLE, sources: SAMPLE_Q3 };
  return (
    <>
      <LeadSourceBreakdown
        ref={ref}
        {...data}
        onSourceToggle={(d) =>
          setNote({ strong: "onSourceToggle", rest: `fired. ${d.label} is now ${d.visible ? "shown" : "hidden"}; ${d.visibleIds.length} sources visible.` })
        }
        onMetricChange={(m) => setNote({ strong: "onMetricChange", rest: `fired. Showing ${m === "cpl" ? "cost per lead" : m}.` })}
      />
      {!embed && (
        <StageBar
          maxWidth={940}
          note={
            <span aria-live="polite">
              {note ? (
                <>
                  <b>{note.strong}</b> {note.rest} Example data, not real client results.
                </>
              ) : (
                <>
                  <b>Example data.</b> Not real client results.
                </>
              )}
            </span>
          }
        >
          <Segmented label="Quarter" value={quarter} options={QUARTERS} onChange={setQuarter} />
          <DemoButton onClick={() => ref.current?.replay()}>Replay animation</DemoButton>
        </StageBar>
      )}
    </>
  );
}
