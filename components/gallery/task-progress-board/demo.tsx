"use client";

import { useState, type ReactNode } from "react";
import { DemoButton, StageBar } from "@/components/site/controls";
import type { DemoProps } from "@/lib/demos";
import { TaskProgressBoard, type TaskMoveDetail } from "./TaskProgressBoard";
import { SAMPLE } from "./sample";

const DEFAULT_NOTE: ReactNode = (
  <>
    <b>Example data.</b> Not real client work.
  </>
);
const NAMES: Record<string, string> = Object.fromEntries(SAMPLE.columns.map((c) => [c.id, c.label]));

export default function Demo({ embed }: DemoProps) {
  const [run, setRun] = useState(0);
  const [note, setNote] = useState<ReactNode>(DEFAULT_NOTE);

  const onMove = (d: TaskMoveDetail) =>
    setNote(
      <>
        <b>
          {d.id} → {NAMES[d.to] ?? d.to}
        </b>{" "}
        via {d.via}. The board fired onTaskMove (progress {d.progress}%). Example data, not real client work.
      </>
    );

  return (
    <>
      <TaskProgressBoard key={run} {...SAMPLE} onTaskMove={onMove} />
      {!embed && (
        <StageBar maxWidth={1000} note={<span aria-live="polite">{note}</span>}>
          <DemoButton
            onClick={() => {
              setRun((r) => r + 1);
              setNote(DEFAULT_NOTE);
            }}
          >
            Reset board
          </DemoButton>
        </StageBar>
      )}
    </>
  );
}
