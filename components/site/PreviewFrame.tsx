"use client";

import { useEffect, useRef } from "react";

const PAGE_WIDTH = 1200;

/** Live preview of a component page, scaled down to fit its card. */
export function PreviewFrame({ slug, title }: { slug: string; title: string }) {
  const box = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const b = box.current;
    const f = frame.current;
    if (!b || !f) return;
    const fit = () => {
      if (!b.clientWidth) return;
      const s = b.clientWidth / PAGE_WIDTH;
      b.style.setProperty("--s", String(s));
      f.style.height = `${Math.ceil(b.clientHeight / s)}px`;
    };
    fit();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(fit);
    ro.observe(b);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={box}
      className="relative aspect-[16/10] max-w-full overflow-hidden border-b border-line bg-ground after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-[28%] after:bg-gradient-to-b after:from-transparent after:to-ground"
    >
      <iframe
        ref={frame}
        src={`/embed/${slug}`}
        title={`${title} preview`}
        loading="lazy"
        tabIndex={-1}
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-0 h-[750px] w-[1200px] origin-top-left scale-[var(--s,0.4)] border-0 transition-transform duration-[800ms] ease-out-soft group-hover:scale-[calc(var(--s,0.4)*1.025)]"
      />
    </div>
  );
}
