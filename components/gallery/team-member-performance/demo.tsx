"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Segmented, StageBar } from "@/components/site/controls";
import type { DemoProps } from "@/lib/demos";
import { TeamPerformance } from "./TeamPerformance";
import { SAMPLE } from "./sample";

const SIZES = [
  { value: "5", label: "5 people" },
  { value: "8", label: "8 people" },
] as const;

const DEFAULT_NOTE: ReactNode = (
  <>
    <b>Example data.</b> Fictional team, not real results.
  </>
);

export default function Demo({ embed }: DemoProps) {
  const [size, setSize] = useState<"5" | "8">("8");
  const [note, setNote] = useState<ReactNode>(DEFAULT_NOTE);
  const members = useMemo(() => SAMPLE.members.slice(0, Number(size)), [size]);

  return (
    <>
      <TeamPerformance
        {...SAMPLE}
        members={members}
        onMemberSelect={(d) =>
          setNote(
            <>
              <b>
                {d.name} · #{d.rank}
              </b>{" "}
              {d.expanded ? "opened" : "closed"}. The card called onMemberSelect. Fictional team, not real results.
            </>
          )
        }
      />
      {!embed && (
        <StageBar maxWidth={960} note={<span aria-live="polite">{note}</span>}>
          <Segmented label="Team size" value={size} options={SIZES} onChange={setSize} />
        </StageBar>
      )}
    </>
  );
}
