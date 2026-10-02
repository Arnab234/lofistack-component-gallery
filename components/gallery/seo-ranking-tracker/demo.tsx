"use client";

import { useState, type ReactNode } from "react";
import { Segmented, StageBar } from "@/components/site/controls";
import type { DemoProps } from "@/lib/demos";
import { SeoRankingTracker } from "./SeoRankingTracker";
import { BRIGHTSIDE, CEDAR } from "./sample";

const CLIENTS = [
  { value: "brightside", label: "Brightside Dental" },
  { value: "cedar", label: "Cedar Fitness Co." },
] as const;

const DEFAULT_NOTE: ReactNode = (
  <>
    <b>Example data.</b> Fictional sites and rankings, not real client results.
  </>
);

export default function Demo({ embed }: DemoProps) {
  const [client, setClient] = useState<"brightside" | "cedar">("brightside");
  const [note, setNote] = useState<ReactNode>(DEFAULT_NOTE);
  const data = client === "cedar" ? CEDAR : BRIGHTSIDE;

  return (
    <>
      <SeoRankingTracker
        key={client}
        {...data}
        onKeywordSelect={(d) =>
          setNote(
            <>
              <b>
                “{d.keyword}” {d.expanded ? "opened" : "closed"}.
              </b>{" "}
              The tracker called onKeywordSelect. Example data, not real client results.
            </>
          )
        }
      />
      {!embed && (
        <StageBar maxWidth={980} note={<span aria-live="polite">{note}</span>}>
          <Segmented label="Client" value={client} options={CLIENTS} onChange={setClient} />
        </StageBar>
      )}
    </>
  );
}
