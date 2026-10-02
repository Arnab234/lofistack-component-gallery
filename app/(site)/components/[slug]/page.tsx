import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CodeBlock } from "@/components/site/CodeBlock";
import { PropsTable } from "@/components/site/PropsTable";
import { Stage } from "@/components/site/Stage";
import { demos } from "@/lib/demos";
import { components, getComponent } from "@/lib/registry";
import { site, sourceUrl } from "@/lib/site";

const pad = (n: number) => String(n).padStart(2, "0");

export const dynamicParams = false;

export function generateStaticParams() {
  return components.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const c = getComponent((await params).slug);
  if (!c) return {};
  return {
    title: c.title,
    description: c.description,
    openGraph: { title: `${c.title} · LofiStack Components`, description: c.description },
    alternates: { canonical: `/components/${c.slug}` },
  };
}

export default async function ComponentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const meta = getComponent(slug);
  const Demo = demos[slug];
  if (!meta || !Demo) notFound();

  const i = components.indexOf(meta);
  const prev = components[i - 1];
  const next = components[i + 1];
  const panel = "grid min-w-0 content-start gap-3.5 rounded-xl border border-line bg-panel p-[22px]";

  return (
    <>
      <main id="main" className="mx-auto grid max-w-[1040px] gap-7 px-5 pt-11 pb-[72px] max-sm:px-4">
        <header className="grid gap-2.5">
          <div className="flex flex-wrap gap-2.5 font-mono text-[11px] leading-none font-medium tracking-[0.1em] text-faint uppercase">
            <span>LofiStack</span>
            <span>/</span>
            <span>Component gallery</span>
            <span>/</span>
            <span className="text-accent">Component {pad(meta.number)}</span>
          </div>
          <h1 className="m-0 font-display text-[clamp(30px,5vw,44px)] leading-[1.05] font-[650] tracking-[-0.025em] text-balance">{meta.title}</h1>
          <p className="m-0 max-w-[62ch] text-muted">{meta.description}</p>
          <ul className="m-0 mt-1 flex list-none flex-wrap gap-1.5 p-0">
            {[`Week ${pad(meta.week)}`, `Type: ${meta.type}`, `<${meta.componentName} />`, "React · TypeScript · Tailwind"].map((t) => (
              <li key={t} className="rounded-md border border-line bg-surface px-[9px] py-1.5 font-mono text-[11.5px] leading-none text-muted">
                {t}
              </li>
            ))}
          </ul>
        </header>

        <Stage>
          <Demo />
        </Stage>

        <section className="grid grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] gap-5 max-[820px]:grid-cols-1" aria-label="Documentation">
          <div className={panel}>
            <PropsTable props={meta.props} />
          </div>
          <div className={panel}>
            <CodeBlock title="Usage" code={meta.usage} />
            {meta.usageNote && <p className="m-0 text-[13px] text-muted">{meta.usageNote}</p>}
            <a
              href={sourceUrl(meta.slug)}
              className="inline-flex items-center gap-1.5 justify-self-start text-[13px] font-semibold text-accent underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              View full source on GitHub
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" className="size-3">
                <path d="M6 3h7v7M13 3 4 12" />
              </svg>
            </a>
          </div>
        </section>

        <section className={panel} aria-label="Build prompt">
          <CodeBlock title="Build prompt" code={meta.prompt} syntax={false} wrap collapsible={meta.prompt.length > 900} />
        </section>
      </main>

      <footer className="border-t border-line text-muted">
        <div className="mx-auto grid max-w-[1080px] grid-cols-2 gap-3 px-5 pt-7 pb-[calc(40px+env(safe-area-inset-bottom))] max-[560px]:grid-cols-1">
          {[
            prev
              ? { href: `/components/${prev.slug}`, small: `← Previous · ${pad(prev.number)}`, title: prev.title }
              : { href: "/", small: "← Back to", title: "All components" },
            next
              ? { href: `/components/${next.slug}`, small: `Next · ${pad(next.number)} →`, title: next.title, right: true }
              : { href: "/", small: "Back to →", title: "All components", right: true },
          ].map((p) => (
            <Link
              key={p.small}
              href={p.href}
              className={`grid gap-[7px] rounded-xl border border-line bg-surface px-[18px] py-4 text-ink no-underline transition-[transform,border-color,box-shadow] duration-[350ms] ease-out-soft hover:-translate-y-0.5 hover:border-faint hover:shadow-[0_18px_32px_-26px_var(--lsg-shadow)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${p.right ? "text-right max-[560px]:text-left" : ""}`}
            >
              <small className="font-mono text-[10.5px] leading-none font-medium tracking-[0.09em] text-faint uppercase">{p.small}</small>
              <strong className="font-display text-[15px] leading-tight font-semibold">{p.title}</strong>
            </Link>
          ))}
          <div className="col-span-full flex flex-wrap justify-between gap-x-4 gap-y-2 pt-2.5 text-[12.5px] text-faint">
            <span>LofiStack Component Gallery · {site.author}</span>
            <span>
              Component {pad(meta.number)} of {components.length}
            </span>
          </div>
        </div>
      </footer>
    </>
  );
}
