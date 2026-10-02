"use client";

import { useState } from "react";
import { Segmented, StageBar } from "@/components/site/controls";
import type { DemoProps } from "@/lib/demos";
import { AiPromptCard, type PromptCopyDetail } from "./AiPromptCard";
import { AD_PROMPT, EMAIL_PROMPT } from "./sample";

const EXAMPLES = [
  { value: "email", label: "Follow-up email" },
  { value: "ad", label: "Social ad copy" },
] as const;

export default function Demo({ embed }: DemoProps) {
  const [example, setExample] = useState<"email" | "ad">("email");
  const [copied, setCopied] = useState<PromptCopyDetail | null>(null);
  const { activeVersion, ...data } = example === "ad" ? AD_PROMPT : EMAIL_PROMPT;
  return (
    <>
      <AiPromptCard {...data} defaultVersion={activeVersion} onCopy={setCopied} />
      {!embed && (
        <StageBar
          maxWidth={960}
          note={
            <span aria-live="polite">
              {copied ? (
                <>
                  <b>
                    {copied.version} {copied.method === "clipboard" ? "copied" : "selected"} · {copied.chars.toLocaleString("en-US")} chars, ≈{copied.tokens} tokens.
                  </b>{" "}
                  The card called onCopy. Example prompt, fictional client.
                </>
              ) : (
                <>
                  <b>Example prompt.</b> Fictional client, not a real campaign.
                </>
              )}
            </span>
          }
        >
          <Segmented label="Load prompt" value={example} options={EXAMPLES} onChange={setExample} />
        </StageBar>
      )}
    </>
  );
}
