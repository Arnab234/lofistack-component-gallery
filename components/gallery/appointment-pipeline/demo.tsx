"use client";

import { useState, type ReactNode } from "react";
import { DemoButton, StageBar } from "@/components/site/controls";
import type { DemoProps } from "@/lib/demos";
import { AppointmentPipeline } from "./AppointmentPipeline";
import { SAMPLE, SAMPLE_DAYS } from "./sample";

const DEFAULT_NOTE: ReactNode = (
  <>
    <b>Example data.</b> Fictional clients and phone numbers. Not real bookings.
  </>
);

export default function Demo({ embed }: DemoProps) {
  const [resetKey, setResetKey] = useState(0);
  const [note, setNote] = useState<ReactNode>(DEFAULT_NOTE);
  return (
    <>
      <AppointmentPipeline
        key={resetKey}
        {...SAMPLE}
        days={SAMPLE_DAYS}
        defaultDay={SAMPLE.today}
        onAppointmentUpdate={(d) =>
          setNote(
            <>
              <b>onAppointmentUpdate</b>{" "}
              {d.action === "status"
                ? `fired: ${d.appointment.name} moved from ${d.from} to ${d.to}. Example data.`
                : `fired: reminder sent to ${d.appointment.name}. Example data.`}
            </>
          )
        }
        onDayChange={(day) =>
          setNote(
            <>
              <b>onDayChange</b> fired: {day}. Example data, not real bookings.
            </>
          )
        }
      />
      {!embed && (
        <StageBar maxWidth={980} note={<span aria-live="polite">{note}</span>}>
          <DemoButton
            onClick={() => {
              setResetKey((k) => k + 1);
              setNote(DEFAULT_NOTE);
            }}
          >
            Reset demo
          </DemoButton>
        </StageBar>
      )}
    </>
  );
}
