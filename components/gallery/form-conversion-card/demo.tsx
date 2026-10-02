"use client";

import { useState, type ReactNode } from "react";
import { StageBar } from "@/components/site/controls";
import type { DemoProps } from "@/lib/demos";
import { FormConversionCard } from "./FormConversionCard";
import { SAMPLE } from "./sample";

export default function Demo({ embed }: DemoProps) {
  const [note, setNote] = useState<ReactNode>(
    <>
      <b>Example data.</b> Not real client results.
    </>
  );
  return (
    <>
      <FormConversionCard
        {...SAMPLE}
        onFieldSelect={(d) =>
          setNote(
            <>
              <b>
                {d.label} · {d.device}
              </b>{" "}
              selected. The card called onFieldSelect{d.dropRate != null ? ` (${(d.dropRate * 100).toFixed(1)}% left here)` : ""}. Example data, not real client results.
            </>
          )
        }
        onDeviceChange={(device) =>
          setNote(
            <>
              <b>Device: {device}</b> · onDeviceChange fired. Example data, not real client results.
            </>
          )
        }
      />
      {!embed && <StageBar maxWidth={960} note={<span aria-live="polite">{note}</span>} />}
    </>
  );
}
