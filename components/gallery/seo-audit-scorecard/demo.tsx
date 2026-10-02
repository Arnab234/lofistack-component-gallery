"use client";

import { useRef, useState, type ReactNode } from "react";
import { DemoButton, StageBar } from "@/components/site/controls";
import type { DemoProps } from "@/lib/demos";
import { SeoAuditScorecard, type SeoAuditScorecardHandle } from "./SeoAuditScorecard";
import { SAMPLE } from "./sample";

const DEFAULT_NOTE: ReactNode = (
  <>
    <b>Example data.</b> Fictional site, not a real audit.
  </>
);

export default function Demo({ embed }: DemoProps) {
  const card = useRef<SeoAuditScorecardHandle>(null);
  const [run, setRun] = useState(0);
  const [note, setNote] = useState<ReactNode>(DEFAULT_NOTE);

  const fixCritical = () => {
    SAMPLE.issues.filter((i) => i.severity === "critical").forEach((i) => card.current?.setFixed(i.id, true));
  };
  const reset = () => {
    setRun((r) => r + 1);
    setNote(DEFAULT_NOTE);
  };

  return (
    <>
      <SeoAuditScorecard
        key={run}
        ref={card}
        {...SAMPLE}
        onIssueFix={(d) =>
          setNote(
            <>
              <b>onIssueFix</b> fired: {d.fixed ? "fixed" : "reopened"} &ldquo;{d.issue.title}&rdquo;. Overall {d.overall}, grade {d.grade}. Example data.
            </>
          )
        }
        onAuditRun={(d) =>
          setNote(
            <>
              <b>onAuditRun</b> fired: overall {d.overall}, grade {d.grade}. Example data, not a real audit.
            </>
          )
        }
      />
      {!embed && (
        <StageBar maxWidth={940} note={<span aria-live="polite">{note}</span>}>
          <DemoButton onClick={fixCritical}>Fix all critical</DemoButton>
          <DemoButton onClick={reset}>Reset</DemoButton>
        </StageBar>
      )}
    </>
  );
}
