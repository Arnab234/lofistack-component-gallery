"use client";

import { useRef, useState } from "react";
import { DemoButton, StageBar } from "@/components/site/controls";
import type { DemoProps } from "@/lib/demos";
import { ActivityTimeline, type ActivityTimelineHandle } from "./ActivityTimeline";
import { SAMPLE, SAMPLE_EVENTS } from "./sample";

export default function Demo({ embed }: DemoProps) {
  const ref = useRef<ActivityTimelineHandle>(null);
  const [opened, setOpened] = useState<string | null>(null);
  return (
    <>
      <ActivityTimeline ref={ref} {...SAMPLE} events={SAMPLE_EVENTS} pageSize={7} onActivityOpen={(d) => setOpened(d.title)} />
      {!embed && (
        <StageBar
          maxWidth={940}
          note={
            <span aria-live="polite">
              {opened ? (
                <>
                  <b>{opened}</b> opened. The timeline called onActivityOpen. Example data, fictional client.
                </>
              ) : (
                <>
                  <b>Example data.</b> Fictional client and people, not a real account.
                </>
              )}
            </span>
          }
        >
          <DemoButton onClick={() => ref.current?.collapseAll()}>Collapse all</DemoButton>
        </StageBar>
      )}
    </>
  );
}
