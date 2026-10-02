"use client";

import { useRef, useState, type ReactNode } from "react";
import { DemoButton, StageBar } from "@/components/site/controls";
import type { DemoProps } from "@/lib/demos";
import { WebhookMonitor, type WebhookMonitorHandle, type WebhookReplayDetail } from "./WebhookMonitor";
import { SAMPLE } from "./sample";

const DEFAULT_NOTE: ReactNode = (
  <>
    <b>Simulated events.</b> Example data, not real client traffic.
  </>
);

export default function Demo({ embed }: DemoProps) {
  const monitor = useRef<WebhookMonitorHandle>(null);
  const [note, setNote] = useState<ReactNode>(DEFAULT_NOTE);

  const sendFailure = () => {
    const m = monitor.current;
    if (!m) return;
    const ev = m.simulateFailure();
    m.select(ev.id);
    setNote(
      <>
        <b>
          {ev.name} returned {ev.status}.
        </b>{" "}
        Select Replay in the inspector to re-send it. Simulated events, not real traffic.
      </>
    );
  };

  const onReplay = (d: WebhookReplayDetail) =>
    setNote(
      <>
        <b>
          Replayed {d.name}: {d.original.status} → {d.replay.status}.
        </b>{" "}
        The monitor fired onReplay. Simulated events, not real traffic.
      </>
    );

  return (
    <>
      <WebhookMonitor ref={monitor} {...SAMPLE} onReplay={onReplay} />
      {!embed && (
        <StageBar maxWidth={980} note={<span aria-live="polite">{note}</span>}>
          <DemoButton onClick={sendFailure}>Send a failing event</DemoButton>
        </StageBar>
      )}
    </>
  );
}
