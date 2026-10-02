"use client";

import type { ReactNode } from "react";

/** Row under the preview: a short note on the left, preview controls on the right. */
export function StageBar({ note, children, maxWidth = 900 }: { note?: ReactNode; children?: ReactNode; maxWidth?: number }) {
  return (
    <div className="flex w-full flex-wrap items-center justify-between gap-x-[18px] gap-y-3" style={{ maxWidth }}>
      {note ? (
        <p className="m-0 -ml-2 rounded-md bg-stage px-2 py-1 text-[12.5px] text-muted [&_b]:font-semibold [&_b]:text-ink">{note}</p>
      ) : (
        <span />
      )}
      {children && <div className="flex flex-wrap gap-x-4 gap-y-2.5">{children}</div>}
    </div>
  );
}

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedProps<T extends string> {
  label: string;
  value: T;
  options: ReadonlyArray<SegmentedOption<T>>;
  onChange: (value: T) => void;
}

/** A labelled group of toggle buttons; exactly one is pressed. */
export function Segmented<T extends string>({ label, value, options, onChange }: SegmentedProps<T>) {
  return (
    <div className="inline-flex flex-wrap items-center gap-2">
      <span className="font-mono text-[10.5px] leading-none font-medium tracking-[0.08em] text-faint uppercase">{label}</span>
      <div role="group" aria-label={`Preview ${label.toLowerCase()}`} className="inline-flex flex-wrap rounded-lg border border-line bg-ground p-[3px]">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={o.value === value}
            onClick={() => onChange(o.value)}
            className="cursor-pointer rounded-md px-[11px] py-2 text-[12.5px] leading-none font-medium text-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent aria-pressed:bg-surface aria-pressed:text-ink aria-pressed:shadow-[0_1px_3px_-1px_var(--lsg-shadow)]"
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** A small on/off switch for preview options. */
export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 select-none">
      <span className="font-mono text-[10.5px] leading-none font-medium tracking-[0.08em] text-faint uppercase">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="relative h-6 w-10 cursor-pointer rounded-full border border-line bg-ground transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent aria-checked:border-accent aria-checked:bg-accent"
      >
        <span
          aria-hidden="true"
          className={`absolute top-[3px] left-[3px] size-4 rounded-full bg-surface shadow transition-transform duration-200 ${checked ? "translate-x-4" : ""}`}
        />
      </button>
    </label>
  );
}

/** A plain action button for demos (reset, add item, simulate…). */
export function DemoButton({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="cursor-pointer rounded-lg border border-line bg-surface px-3 py-2 text-[12.5px] leading-none font-medium text-muted transition-colors hover:border-faint hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}
