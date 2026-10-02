import type { ReactNode } from "react";

/** The dotted preview area with crop marks in each corner. */
export function Stage({ children }: { children: ReactNode }) {
  const crop = "pointer-events-none absolute size-3 border-faint/70";
  return (
    <section
      aria-label="Component preview"
      className="lsg-dots relative grid justify-items-center gap-5 rounded-[14px] border border-line bg-stage px-[clamp(12px,4vw,48px)] py-[clamp(24px,5vw,56px)]"
    >
      <span aria-hidden="true" className={`${crop} top-3 left-3 border-t border-l`} />
      <span aria-hidden="true" className={`${crop} top-3 right-3 border-t border-r`} />
      <span aria-hidden="true" className={`${crop} bottom-3 left-3 border-b border-l`} />
      <span aria-hidden="true" className={`${crop} right-3 bottom-3 border-r border-b`} />
      {children}
    </section>
  );
}
