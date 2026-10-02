"use client";

import { useRef, useState, type ReactNode } from "react";
import { DemoButton, StageBar } from "@/components/site/controls";
import type { DemoProps } from "@/lib/demos";
import { NotificationCenter, type NotificationCenterHandle } from "./NotificationCenter";
import { SAMPLE_FOOTER, SAMPLE_ITEMS, SAMPLE_NOW, SIMULATED } from "./sample";

const DEFAULT_NOTE = (
  <>
    <b>Example data.</b> Fictional clients and teammates.
  </>
);

export default function Demo({ embed }: DemoProps) {
  const ref = useRef<NotificationCenterHandle>(null);
  const [run, setRun] = useState(0);
  const [note, setNote] = useState<ReactNode>(DEFAULT_NOTE);
  const n = useRef(0);
  const say = (strong: string, rest: string) =>
    setNote(
      <>
        <b>{strong}</b>
        {rest}
      </>
    );

  return (
    <>
      {/* a mock app window the component sits in */}
      <div className="grid min-h-[640px] w-full max-w-[960px] grid-rows-[auto_1fr] rounded-[18px] border border-line bg-panel shadow-[0_30px_60px_-50px_var(--ntc-shadow)]">
        <div className="flex items-center gap-3.5 rounded-t-[18px] border-b border-line bg-(--ntc-panel) px-4 py-3 max-[560px]:gap-2.5 max-[560px]:px-3 max-[560px]:py-2.5">
          <div aria-hidden="true" className="flex min-w-0 items-center gap-2.5 text-sm leading-[1.2] font-semibold text-ink max-[560px]:mr-auto">
            <i className="size-7 flex-none rounded-lg bg-[linear-gradient(135deg,var(--ntc-accent),color-mix(in_oklab,var(--ntc-accent),#000_30%))]" />
            <span className="truncate">Agency workspace</span>
          </div>
          <div
            aria-hidden="true"
            className="ml-auto flex h-9 max-w-[360px] flex-1 items-center gap-2 rounded-[10px] border border-line bg-panel px-3 text-[13px] text-faint max-[560px]:hidden"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="size-3.5 flex-none">
              <circle cx="7" cy="7" r="4.5" />
              <path d="m10.5 10.5 3 3" />
            </svg>
            Search clients, campaigns…
          </div>

          <NotificationCenter
            key={run}
            ref={ref}
            items={SAMPLE_ITEMS}
            now={SAMPLE_NOW}
            footer={SAMPLE_FOOTER}
            defaultOpen
            listMaxHeight={392}
            onRead={(ids) => say(`${ids.length} marked read.`, " The panel called onRead. Example data.")}
            onDismiss={() => say("Dismissed.", " The panel called onDismiss. Example data.")}
            onAction={(_, action) => say(`${action} clicked.`, " The panel called onAction. Example data.")}
          />

          <div aria-hidden="true" className="grid size-[34px] flex-none place-items-center rounded-full bg-[color-mix(in_oklab,var(--ntc-accent)_14%,var(--ntc-panel))] text-xs leading-none font-[650] text-ink">
            JC
          </div>
        </div>

        <div aria-hidden="true" className="grid grid-cols-[180px_minmax(0,1fr)] gap-5 p-[22px] opacity-90 max-[760px]:grid-cols-1 max-[560px]:p-4">
          <div className="grid content-start gap-2.5 max-[760px]:hidden">
            {[70, 85, 60, 85, 100, 60, 100].map((w, i) => (
              <i
                key={i}
                style={{ width: `${w}%` }}
                className={i === 0 ? "block h-3 rounded-md bg-[color-mix(in_oklab,var(--ntc-accent)_22%,var(--lsg-line))]" : "block h-2.5 rounded-md bg-line"}
              />
            ))}
          </div>
          <div className="grid content-start gap-3.5">
            <div className="text-[22px] leading-[1.2] font-[650] tracking-[-0.02em] text-ink">Good afternoon</div>
            <div className="-mt-2 text-[13.5px] text-muted">Here is what changed across your clients today.</div>
            <div className="grid grid-cols-3 gap-3 max-[760px]:grid-cols-2 max-[560px]:grid-cols-1">
              {[
                ["Open tasks", "12"],
                ["Booked calls", "8"],
                ["Unpaid invoices", "3"],
              ].map(([label, value]) => (
                <div key={label} className="grid min-h-[92px] content-start gap-2.5 rounded-[14px] border border-line bg-(--ntc-panel) p-4">
                  <small className="text-xs text-muted">{label}</small>
                  <b className="text-[22px] leading-none font-[650] text-ink">{value}</b>
                  <i className="block h-2.5 w-4/5 rounded-md bg-line" />
                </div>
              ))}
              <div className="col-span-full grid min-h-[170px] content-start gap-2.5 rounded-[14px] border border-line bg-(--ntc-panel) p-4">
                {[80, 100, 80, 100].map((w, i) => (
                  <i key={i} style={{ width: `${w}%` }} className="block h-2.5 rounded-md bg-line" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {!embed && (
        <StageBar maxWidth={960} note={<span aria-live="polite">{note}</span>}>
          <DemoButton
            onClick={() => {
              ref.current?.add(SIMULATED[n.current++ % SIMULATED.length]);
              ref.current?.show(false);
            }}
          >
            Simulate new notification
          </DemoButton>
          <DemoButton
            onClick={() => {
              setRun((r) => r + 1);
              say("Demo reset.", " Example data, fictional clients and teammates.");
            }}
          >
            Reset demo
          </DemoButton>
        </StageBar>
      )}
    </>
  );
}
