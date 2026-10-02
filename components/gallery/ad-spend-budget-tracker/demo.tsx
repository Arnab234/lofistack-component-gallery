"use client";

import { useState, type ReactNode } from "react";
import { DemoButton, StageBar } from "@/components/site/controls";
import type { DemoProps } from "@/lib/demos";
import { AdSpendBudgetTracker, type BudgetStatus } from "./AdSpendBudgetTracker";
import { SAMPLE } from "./sample";

const STATUS_TEXT: Record<BudgetStatus, string> = { ok: "on track", over: "overpacing", under: "underpacing" };
const fmt = (v: number) => `$${Math.round(v).toLocaleString("en-US")}`;

export default function Demo({ embed }: DemoProps) {
  const [run, setRun] = useState(0);
  const [note, setNote] = useState<ReactNode>(
    <>
      <b>Example data.</b> Fictional client, not real spend.
    </>
  );
  const say = (strong: string, rest: string) =>
    setNote(
      <>
        <b>{strong}</b> {rest} Example data, not real spend.
      </>
    );

  return (
    <>
      <AdSpendBudgetTracker
        key={run}
        {...SAMPLE}
        onBudgetChange={(d) =>
          say("onBudgetChange", `fired. ${d.label}: ${fmt(d.previous)} → ${fmt(d.budget)}, projected ${fmt(d.projected)} (${STATUS_TEXT[d.status]}).`)
        }
        onViewChange={(v) => say("onViewChange", `fired. Showing ${v} spend.`)}
        onSortChange={(s) => say("onSortChange", s === "used" ? "fired. Highest % used first." : "fired. Back to the original order.")}
      />
      {!embed && (
        <StageBar maxWidth={940} note={<span aria-live="polite">{note}</span>}>
          <DemoButton
            onClick={() => {
              setRun((r) => r + 1);
              say("Budgets reset.", "Back to the starting figures.");
            }}
          >
            Reset budgets
          </DemoButton>
        </StageBar>
      )}
    </>
  );
}
