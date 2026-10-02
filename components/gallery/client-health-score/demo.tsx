"use client";

import { useState, type ReactNode } from "react";
import { Segmented, StageBar } from "@/components/site/controls";
import type { DemoProps } from "@/lib/demos";
import { ClientHealthScore, type HealthBand } from "./ClientHealthScore";
import { BRIGHTSIDE, HARBOR } from "./sample";

const CLIENTS = [
  { value: "brightside", label: "Brightside Dental" },
  { value: "harbor", label: "Harbor & Pine Realty" },
] as const;

const BAND_NAME: Record<HealthBand, string> = { healthy: "Healthy", risk: "At risk", critical: "Critical" };

export default function Demo({ embed }: DemoProps) {
  const [client, setClient] = useState<"brightside" | "harbor">("brightside");
  const [note, setNote] = useState<ReactNode>(
    <>
      <b>Example data.</b> Not real client results.
    </>
  );
  return (
    <>
      <ClientHealthScore
        {...(client === "harbor" ? HARBOR : BRIGHTSIDE)}
        onScoreChange={(d) =>
          setNote(
            <>
              <b>
                Score {d.score} · {BAND_NAME[d.band]}.
              </b>{" "}
              The card called onScoreChange. Example data, not real client results.
            </>
          )
        }
      />
      {!embed && (
        <StageBar maxWidth={960} note={<span aria-live="polite">{note}</span>}>
          <Segmented label="Client" value={client} options={CLIENTS} onChange={setClient} />
        </StageBar>
      )}
    </>
  );
}
