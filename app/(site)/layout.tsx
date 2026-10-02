import type { ReactNode } from "react";
import { Nav } from "@/components/site/Nav";
import { components } from "@/lib/registry";

export default function SiteLayout({ children }: { children: ReactNode }) {
  const items = components.map((c) => ({ href: `/components/${c.slug}`, label: c.navLabel, number: c.number }));
  return (
    <>
      <a
        href="#main"
        className="sr-only z-[60] rounded-md bg-surface px-3 py-2 text-sm font-medium text-ink focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to content
      </a>
      <Nav items={items} />
      {children}
    </>
  );
}
