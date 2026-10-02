"use client";

import { useState } from "react";
import { Segmented, StageBar } from "@/components/site/controls";
import type { DemoProps } from "@/lib/demos";
import { ConversionRateCard } from "./ConversionRateCard";
import { SAMPLE } from "./sample";

const TARGETS = [
  { value: "", label: "Per channel" },
  { value: "4.5", label: "4.5%" },
  { value: "5.5", label: "5.5%" },
] as const;

type TargetValue = (typeof TARGETS)[number]["value"];

export default function Demo({ embed }: DemoProps) {
  const [target, setTarget] = useState<TargetValue>("");
  const [note, setNote] = useState<{ strong: string; rest: string } | null>(null);
  const rest = "Example data, not real client results.";
  return (
    <>
      <ConversionRateCard
        {...SAMPLE}
        targetOverride={target ? Number(target) : undefined}
        onChannelChange={(d) => setNote({ strong: `${d.label} selected.`, rest: `The card called onChannelChange. ${rest}` })}
        onWhatIfChange={(d) =>
          setNote({ strong: `What-if: ${d.conversions.toLocaleString("en-US")} conversions.`, rest: `The card called onWhatIfChange. ${rest}` })
        }
      />
      {!embed && (
        <StageBar
          maxWidth={960}
          note={
            <span aria-live="polite">
              {note ? (
                <>
                  <b>{note.strong}</b> {note.rest}
                </>
              ) : (
                <>
                  <b>Example data.</b> Not real client results.
                </>
              )}
            </span>
          }
        >
          <Segmented label="Target" value={target} options={TARGETS} onChange={setTarget} />
        </StageBar>
      )}
    </>
  );
}
