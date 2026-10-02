"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { MONTHS, cx } from "@/lib/format";

export type AgentLogStatus = "draft" | "selected" | "submitted" | "built";

export interface AgentLogCardProps {
  /** Task name, shown as the title. */
  task: string;
  /** Agent or tool used, plus model if known. */
  agent: string;
  /** Task category, e.g. Research, Coding, UI Component. */
  type: string;
  /** ISO date, "YYYY-MM-DD". Displayed as "25 Sep 2026". */
  date: string;
  /** Review state of the log entry. */
  status?: AgentLogStatus;
  /** Challenge week, shown in the top rail. */
  week?: number;
  /** Entry number within the week. */
  entry?: number;
  /** Exact prompt or workflow. Line breaks are kept, common indentation is trimmed. */
  prompt: string;
  /** What the agent produced. Any React content: paragraphs, lists, chips. */
  result: ReactNode;
  /** Lines of prompt shown before "Show full prompt" appears. */
  clampLines?: number;
  className?: string;
}

const STATUS_LABEL: Record<AgentLogStatus, string> = {
  draft: "Draft",
  selected: "Selected",
  submitted: "Submitted",
  built: "Built",
};

const STATUS_TONE: Record<AgentLogStatus, string> = {
  draft: "[--c:var(--alc-draft)] [--bg:var(--alc-draft-bg)]",
  selected: "[--c:var(--alc-selected)] [--bg:var(--alc-selected-bg)]",
  submitted: "[--c:var(--alc-submitted)] [--bg:var(--alc-submitted-bg)]",
  built: "[--c:var(--alc-accent)] [--bg:var(--alc-accent-soft)]",
};

/** Trim blank edges and the common indentation of a block of text. */
export function dedent(text: string): string {
  const lines = String(text).replace(/\t/g, "  ").split("\n");
  while (lines.length && !lines[0].trim()) lines.shift();
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  const indents = lines.filter((l) => l.trim()).map((l) => (l.match(/^ */) ?? [""])[0].length);
  const min = indents.length ? Math.min(...indents) : 0;
  return lines.map((l) => l.slice(min)).join("\n");
}

function formatDate(value: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");
  return m ? `${+m[3]} ${MONTHS[+m[2] - 1]} ${m[1]}` : value || "—";
}

const pad2 = (n: number) => String(n).padStart(2, "0");

/** Small chip for file names or tags inside a result. */
export function AgentLogChip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-(--alc-line) px-2.5 py-[7px] font-(family-name:--alc-mono) text-xs leading-none text-(--alc-muted) transition hover:-translate-y-px hover:border-(--alc-accent) hover:text-(--alc-accent)">
      {children}
    </span>
  );
}

const CopyIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" className="size-[13px]">
    <rect x="5" y="5" width="8.5" height="8.5" rx="2" />
    <path d="M10.5 5V3.5a1.5 1.5 0 0 0-1.5-1.5H3.5A1.5 1.5 0 0 0 2 3.5V9a1.5 1.5 0 0 0 1.5 1.5H5" />
  </svg>
);

const btn =
  "inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-transparent bg-transparent px-2.5 py-[7px] font-(family-name:--alc-body) text-xs leading-none font-medium text-(--alc-muted) transition-colors hover:border-(--alc-line) hover:bg-(--alc-panel) hover:text-(--alc-ink) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--alc-accent)";

/**
 * A record of one AI-agent task, shaped like a ticket stub: the prompt sits above
 * the perforation and the result below it.
 */
export function AgentLogCard({
  task,
  agent,
  type,
  date,
  status = "draft",
  week,
  entry,
  prompt,
  result,
  clampLines = 9,
  className,
}: AgentLogCardProps) {
  const pre = useRef<HTMLPreElement>(null);
  const card = useRef<HTMLElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [clamped, setClamped] = useState(false);
  const [copyLabel, setCopyLabel] = useState<string | null>(null);
  const text = dedent(prompt);

  const check = useCallback(() => {
    const p = pre.current;
    if (!p || open) return;
    setClamped(p.scrollHeight > p.clientHeight + 2);
  }, [open]);

  useEffect(() => {
    check();
    const p = pre.current;
    if (!p || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(check);
    ro.observe(p);
    document.fonts?.ready.then(check);
    return () => ro.disconnect();
  }, [check, text]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const done = (label: string) => {
    setCopyLabel(label);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopyLabel(null), 1600);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      done("Copied");
    } catch {
      if (pre.current) {
        const range = document.createRange();
        range.selectNodeContents(pre.current);
        const sel = getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
      done("Selected — press Ctrl+C");
    }
  };

  const onMove = (e: React.PointerEvent<HTMLElement>) => {
    const el = card.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  };

  const maxHeight = open ? pre.current?.scrollHeight : undefined;
  const preStyle: CSSProperties = {
    maxHeight: maxHeight ? `${maxHeight}px` : `calc(1.65em * ${clampLines} + 28px)`,
  };

  return (
    <div className={cx("@container block w-full max-w-[680px] font-(family-name:--alc-body) text-(--alc-ink)", className)}>
      <article
        ref={card}
        onPointerMove={onMove}
        className="group/alc relative grid gap-[22px] rounded-[20px] border border-(--alc-line) bg-(--alc-card) [--pad:30px] px-(--pad) pt-[calc(var(--pad)-4px)] pb-(--pad) shadow-[0_1px_0_rgba(255,255,255,0.5)_inset,0_22px_44px_-30px_var(--alc-shadow),0_2px_6px_-3px_var(--alc-shadow)] transition-[transform,box-shadow] duration-[450ms] ease-out-soft before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:bg-[radial-gradient(460px_circle_at_var(--mx,70%)_var(--my,-10%),var(--alc-glow),transparent_62%)] before:opacity-0 before:transition-opacity before:duration-500 hover:-translate-y-[3px] hover:shadow-[0_1px_0_rgba(255,255,255,0.5)_inset,0_34px_60px_-34px_var(--alc-shadow),0_4px_10px_-5px_var(--alc-shadow)] hover:before:opacity-100 *:relative @max-[540px]:gap-[18px] @max-[540px]:rounded-[18px] @max-[540px]:[--pad:20px]"
      >
        {/* top rail */}
        <header className="flex flex-wrap items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 font-(family-name:--alc-mono) text-[11px] leading-none font-medium tracking-[0.09em] text-(--alc-faint) uppercase">
            {week != null || entry != null ? (
              <>
                {week != null && (
                  <span>
                    Week <b className="font-medium text-(--alc-muted)">{pad2(week)}</b>
                  </span>
                )}
                {week != null && entry != null && <i className="not-italic opacity-60">/</i>}
                {entry != null && (
                  <span>
                    Entry <b className="font-medium text-(--alc-muted)">{pad2(entry)}</b>
                  </span>
                )}
              </>
            ) : (
              <span>Agent Log</span>
            )}
          </span>
          <span
            role="status"
            className={cx(
              "inline-flex items-center gap-[7px] rounded-full bg-(--bg) py-1.5 pr-[11px] pl-[9px] text-xs leading-none font-semibold tracking-[0.01em] text-(--c)",
              STATUS_TONE[status]
            )}
          >
            {status === "submitted" ? (
              <span aria-hidden="true" className="grid size-3 place-items-center rounded-full bg-(--c)">
                <span className="-mt-px h-[3px] w-[5px] -rotate-45 border-b-[1.6px] border-l-[1.6px] border-(--bg)" />
              </span>
            ) : (
              <span aria-hidden="true" className="relative size-[7px] rounded-full bg-(--c)">
                {status === "draft" && (
                  <span className="absolute -inset-1 animate-[alc-ping_2.4s_ease-out_infinite] rounded-full border-[1.5px] border-(--c) opacity-0" />
                )}
              </span>
            )}
            {STATUS_LABEL[status]}
          </span>
        </header>

        <h2 className="-mt-1 mb-0 font-(family-name:--alc-display) text-[clamp(22px,5.2cqi,30px)] leading-[1.12] font-[650] tracking-[-0.018em] text-balance text-(--alc-ink)">
          {task}
        </h2>

        {/* meta strip */}
        <dl className="m-0 grid grid-cols-[1.25fr_1fr_0.9fr] border-y border-(--alc-line) @max-[540px]:grid-cols-1">
          {[
            {
              label: "Agent",
              value: (
                <span className="inline-flex items-center gap-2 before:size-2 before:flex-none before:rounded-[2px] before:bg-(--alc-accent) before:shadow-[0_0_0_3px_var(--alc-accent-soft)] before:transition-transform before:duration-500 group-hover/alc:before:rotate-45">
                  {agent}
                </span>
              ),
            },
            { label: "Task type", value: type },
            { label: "Date", value: <time dateTime={date} className="tabular-nums">{formatDate(date)}</time> },
          ].map((m, i) => (
            <div
              key={m.label}
              className={cx(
                "min-w-0 px-4 py-[13px] @max-[540px]:flex @max-[540px]:items-baseline @max-[540px]:justify-between @max-[540px]:gap-4 @max-[540px]:px-0 @max-[540px]:py-[11px]",
                i === 0 ? "pl-0" : "border-l border-(--alc-line) @max-[540px]:border-t @max-[540px]:border-l-0"
              )}
            >
              <dt className="mb-2 font-(family-name:--alc-mono) text-[10.5px] leading-none font-medium tracking-[0.09em] text-(--alc-faint) uppercase @max-[540px]:mb-0">
                {m.label}
              </dt>
              <dd className="m-0 text-[14.5px] leading-[1.35] font-medium [overflow-wrap:anywhere] @max-[540px]:text-right">{m.value}</dd>
            </div>
          ))}
        </dl>

        {/* input */}
        <section className="grid gap-3">
          <div className="flex min-h-7 items-center justify-between gap-2.5">
            <span className="inline-flex items-center gap-2.5 text-[13px] leading-none font-semibold text-(--alc-ink)">
              <span className="rounded-md bg-(--alc-accent-soft) px-[7px] pt-[5px] pb-1 font-(family-name:--alc-mono) text-[10px] leading-none font-medium tracking-[0.1em] text-(--alc-accent)">
                IN
              </span>
              Prompt / Workflow
            </span>
            <button type="button" onClick={copy} className={cx(btn, copyLabel && "text-(--alc-accent)")} aria-live="polite">
              <CopyIcon />
              <span>{copyLabel ?? "Copy"}</span>
            </button>
          </div>
          <pre
            ref={pre}
            style={preStyle}
            className={cx(
              "relative m-0 overflow-hidden rounded-xl bg-(--alc-panel) py-3.5 pr-4 pl-9 font-(family-name:--alc-mono) text-[13px] leading-[1.65] whitespace-pre-wrap text-(--alc-ink) [overflow-wrap:anywhere] transition-[max-height] duration-500 ease-out-soft before:absolute before:top-[13px] before:left-4 before:font-medium before:text-(--alc-accent) before:content-['›'] @max-[540px]:pl-[30px] @max-[540px]:text-[12.5px] @max-[540px]:before:left-[13px]",
              clamped && !open && "[mask-image:linear-gradient(to_bottom,#000_62%,transparent)]"
            )}
          >
            {text}
          </pre>
          {clamped && (
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setOpen((o) => !o)}
              className={cx(btn, "-mt-1 justify-self-start pl-0 hover:pl-2.5")}
            >
              <svg
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                aria-hidden="true"
                className={cx("size-[13px] transition-transform duration-[350ms]", open && "rotate-180")}
              >
                <path d="M4 6.5 8 10l4-3.5" />
              </svg>
              <span>{open ? "Collapse prompt" : "Show full prompt"}</span>
            </button>
          )}
        </section>

        {/* perforation */}
        <div aria-hidden="true" className="-mx-[calc(var(--pad)+1px)] flex h-[22px] items-center">
          <span className="h-[22px] w-3 flex-none rounded-r-[22px] border border-l-0 border-(--alc-line) bg-(--alc-ground)" />
          <span className="mx-2.5 h-0.5 flex-1 bg-[linear-gradient(to_right,var(--alc-line)_55%,transparent_0)] bg-size-[9px_2px] transition-[background-position] duration-[1200ms] ease-out-soft group-hover/alc:bg-position-[36px_0]" />
          <span className="h-[22px] w-3 flex-none rounded-l-[22px] border border-r-0 border-(--alc-line) bg-(--alc-ground)" />
        </div>

        {/* output */}
        <section className="grid gap-3">
          <div className="flex min-h-7 items-center justify-between gap-2.5">
            <span className="inline-flex items-center gap-2.5 text-[13px] leading-none font-semibold text-(--alc-ink)">
              <span className="rounded-md bg-(--alc-accent) px-[7px] pt-[5px] pb-1 font-(family-name:--alc-mono) text-[10px] leading-none font-medium tracking-[0.1em] text-(--alc-on-accent)">
                OUT
              </span>
              Result
            </span>
          </div>
          <div className="max-w-[64ch] text-[15px] leading-[1.62] text-(--alc-ink) *:m-0 [&_code]:rounded-[5px] [&_code]:bg-(--alc-panel) [&_code]:px-[5px] [&_code]:py-px [&_code]:font-(family-name:--alc-mono) [&_code]:text-[0.88em] [&_li]:relative [&_li]:pl-[18px] [&_li]:text-(--alc-muted) [&_li]:before:absolute [&_li]:before:top-[0.8em] [&_li]:before:left-0.5 [&_li]:before:h-[1.5px] [&_li]:before:w-2 [&_li]:before:bg-(--alc-accent) [&_ul]:grid [&_ul]:list-none [&_ul]:gap-1.5 [&_ul]:p-0 [&>*+*]:mt-3">
            {result}
          </div>
        </section>
      </article>
    </div>
  );
}

export default AgentLogCard;
