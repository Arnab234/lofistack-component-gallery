"use client";

import { useState } from "react";
import { Segmented, StageBar } from "@/components/site/controls";
import type { DemoProps } from "@/lib/demos";
import { AgentLogCard, AgentLogChip, type AgentLogStatus } from "./AgentLogCard";
import { SAMPLE_PROMPT } from "./sample";



const STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "selected", label: "Selected" },
  { value: "submitted", label: "Submitted" },
] as const;

export default function Demo({ embed }: DemoProps) {
  const [status, setStatus] = useState<AgentLogStatus>("draft");
  return (
    <>
      <AgentLogCard
        task="Build the Agent Log Card for the LofiStack Component Gallery"
        agent="Claude Code · Opus 5.5"
        type="UI Component"
        date="2026-09-25"
        status={status}
        week={1}
        entry={1}
        prompt={SAMPLE_PROMPT}
        result={
          <>
            <p>
              A reusable <code>{"<AgentLogCard />"}</code> React component with typed props, published as its own page in the gallery.
            </p>
            <ul>
              <li>Short fields are props; the prompt is plain text and the result takes any React content.</li>
              <li>Stacks to a single column at phone width; light and dark themes.</li>
              <li>Draft, Selected and Submitted states; copy button and expandable prompt.</li>
            </ul>
            <div className="flex flex-wrap gap-1.5">
              <AgentLogChip>AgentLogCard.tsx</AgentLogChip>
              <AgentLogChip>TypeScript</AgentLogChip>
              <AgentLogChip>Tailwind CSS</AgentLogChip>
            </div>
          </>
        }
      />
      {!embed && (
        <StageBar maxWidth={680} note="Sample content: the real prompt and output from building this component with Claude Code on 25 Sep 2026.">
          <Segmented label="Status" value={status} options={STATUSES} onChange={setStatus} />
        </StageBar>
      )}
    </>
  );
}
