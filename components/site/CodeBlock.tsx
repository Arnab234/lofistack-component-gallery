"use client";

import { useRef, useState } from "react";
import { highlight } from "./highlight";

const COLOR: Record<string, string> = {
  tag: "text-accent",
  attr: "text-muted",
  str: "text-[#15804a] dark:text-[#5ee59a]",
  comment: "text-faint italic",
  kw: "text-[#a23bb3] dark:text-[#e3a1f0]",
  num: "text-[#b25a00] dark:text-[#f4c261]",
};

export interface CodeBlockProps {
  code: string;
  /** Heading shown above the block. */
  title: string;
  /** Colour the code as TSX. Turn off for prose prompts. */
  syntax?: boolean;
  /** Wrap long lines instead of scrolling sideways. */
  wrap?: boolean;
  /** Collapse very long content behind a "Show all" button. */
  collapsible?: boolean;
}

export function CodeBlock({ code, title, syntax = true, wrap = false, collapsible = false }: CodeBlockProps) {
  const [label, setLabel] = useState("Copy");
  const [open, setOpen] = useState(!collapsible);
  const pre = useRef<HTMLPreElement>(null);

  const done = (t: string) => {
    setLabel(t);
    window.setTimeout(() => setLabel("Copy"), 1600);
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      done("Copied");
    } catch {
      if (pre.current) {
        const r = document.createRange();
        r.selectNodeContents(pre.current);
        const s = getSelection();
        s?.removeAllRanges();
        s?.addRange(r);
      }
      done("Selected");
    }
  };

  return (
    <div className="grid min-w-0 content-start gap-3.5">
      <div className="flex items-center justify-between gap-2.5">
        <h2 className="m-0 font-display text-[17px] leading-tight font-semibold tracking-[-0.01em]">{title}</h2>
        <button
          type="button"
          onClick={copy}
          aria-live="polite"
          className="cursor-pointer rounded-[7px] border border-line bg-surface px-[11px] py-[7px] text-xs leading-none font-medium text-muted transition-colors hover:border-faint hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[0.97]"
        >
          {label}
        </button>
      </div>
      <div className={`relative overflow-x-auto rounded-lg bg-tint ${open ? "" : "max-h-56 overflow-y-hidden"}`}>
        <pre
          ref={pre}
          className={`m-0 px-[18px] py-4 font-mono text-[12.5px] leading-[1.7] text-ink ${wrap ? "whitespace-pre-wrap break-words" : "whitespace-pre"}`}
        >
          <code>
            {syntax
              ? highlight(code).map((t, i) =>
                  t.kind ? (
                    <span key={i} className={COLOR[t.kind]}>
                      {t.text}
                    </span>
                  ) : (
                    t.text
                  )
                )
              : code}
          </code>
        </pre>
        {!open && (
          <div className="absolute inset-x-0 bottom-0 flex justify-center bg-gradient-to-b from-transparent to-tint pt-12 pb-3">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="cursor-pointer rounded-[7px] border border-line bg-surface px-3 py-2 text-xs font-medium text-ink hover:border-faint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Show full prompt
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
