"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";

export interface NavItem {
  href: string;
  label: string;
  number: number;
}

export function Nav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const ref = useRef<HTMLElement>(null);

  // Keep the current link in view, fade edges with more links behind them,
  // and let a vertical mouse wheel scroll the list sideways.
  useEffect(() => {
    const nav = ref.current;
    if (!nav) return;
    const current = nav.querySelector<HTMLAnchorElement>('a[aria-current="page"]');
    if (current && current.getAttribute("href") !== "/") {
      nav.scrollLeft = current.offsetLeft - (nav.clientWidth - current.offsetWidth) / 2;
    }
    const edges = () => {
      const max = nav.scrollWidth - nav.clientWidth;
      const start = nav.scrollLeft <= 1;
      const end = nav.scrollLeft >= max - 1;
      nav.dataset.scroll = max <= 1 ? "none" : start ? "start" : end ? "end" : "middle";
    };
    const wheel = (e: WheelEvent) => {
      if (e.ctrlKey || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      const max = nav.scrollWidth - nav.clientWidth;
      const atEdge = (e.deltaY < 0 && nav.scrollLeft <= 0) || (e.deltaY > 0 && nav.scrollLeft >= max - 1);
      if (max <= 1 || atEdge) return;
      e.preventDefault();
      nav.scrollLeft += e.deltaY;
    };
    edges();
    nav.addEventListener("scroll", edges, { passive: true });
    nav.addEventListener("wheel", wheel, { passive: false });
    window.addEventListener("resize", edges);
    return () => {
      nav.removeEventListener("scroll", edges);
      nav.removeEventListener("wheel", wheel);
      window.removeEventListener("resize", edges);
    };
  }, [pathname]);

  const link =
    "inline-flex items-center gap-[7px] whitespace-nowrap rounded-[7px] px-2.5 py-2 text-[13px] leading-none font-medium text-muted transition-colors hover:bg-hover hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent aria-[current=page]:bg-surface aria-[current=page]:text-ink aria-[current=page]:shadow-[0_0_0_1px_var(--lsg-line)]";

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-[var(--lsg-nav-bg)] pt-[env(safe-area-inset-top)] backdrop-blur-[14px] backdrop-saturate-[1.4]">
      <div className="mx-auto flex min-h-[58px] max-w-[1080px] flex-wrap items-center justify-between gap-x-5 gap-y-1.5 px-5 max-sm:py-1.5">
        <Link
          href="/"
          aria-label="LofiStack Components home"
          className="group inline-flex items-center gap-2.5 rounded-lg py-2 font-display text-[15px] leading-none font-semibold tracking-[-0.01em] text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <Logo className="size-[22px] flex-none transition-transform duration-500 ease-out-soft group-hover:-translate-y-px group-hover:-rotate-6" />
          LofiStack
          <small className="font-mono text-[10.5px] font-medium tracking-[0.09em] text-faint uppercase">Components</small>
        </Link>
        <div className="flex min-w-0 max-w-full flex-1 items-center justify-end gap-2 max-sm:order-3 max-sm:w-full max-sm:flex-none">
          <nav
            ref={ref}
            aria-label="Components"
            className="lsg-links relative flex min-w-0 gap-0.5 overflow-x-auto overscroll-x-contain max-sm:-mx-2.5 max-sm:pb-1"
          >
            <Link href="/" aria-current={pathname === "/" ? "page" : undefined} className={link}>
              Gallery
            </Link>
            {items.map((it) => (
              <Link key={it.href} href={it.href} aria-current={pathname === it.href ? "page" : undefined} className={link}>
                <span className="font-mono text-[10.5px] font-medium text-faint">{String(it.number).padStart(2, "0")}</span>
                {it.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="max-sm:order-2">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
