import Link from "next/link";
import { AgentLogCard } from "@/components/gallery/agent-log-card/AgentLogCard";
import { PreviewFrame } from "@/components/site/PreviewFrame";
import { agentLogs } from "@/lib/agent-logs";
import { components } from "@/lib/registry";
import { site } from "@/lib/site";

const pad = (n: number) => String(n).padStart(2, "0");

export default function Home() {
  const weeks = Math.max(...components.map((c) => c.week));
  return (
    <main id="main" className="mx-auto grid max-w-[1080px] gap-12 px-5 pt-[60px] pb-[72px]">
      <section className="grid gap-[18px]">
        <div className="flex flex-wrap gap-2.5 font-mono text-[11px] leading-none font-medium tracking-[0.1em] text-faint uppercase">
          <span>LofiStack</span>
          <span>/</span>
          <span>Component Gallery</span>
        </div>
        <h1 className="m-0 max-w-[15ch] font-display text-[clamp(38px,6.4vw,68px)] leading-none font-semibold tracking-[-0.038em] text-balance">
          Reusable UI, <em className="text-faint not-italic">one component at a time.</em>
        </h1>
        <p className="m-0 max-w-[58ch] text-[16.5px] text-muted">
          Every component here is a typed React component styled with Tailwind CSS, with its own page. Open one to see it working, try its states, read
          its props and copy the usage into your own project.
        </p>
        <ul className="m-0 mt-1.5 flex list-none flex-wrap gap-2 p-0">
          {[
            [String(components.length), "components"],
            ["Next.js", "+ TypeScript"],
            ["Tailwind", "CSS"],
            ["Light", "& dark"],
            ["Mobile", "ready"],
          ].map(([b, rest]) => (
            <li key={b} className="rounded-full border border-line bg-surface px-[11px] py-2 font-mono text-xs leading-none font-medium text-muted">
              <b className="font-semibold text-ink">{b}</b> {rest}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="all-components" className="grid gap-6">
        <div className="flex items-baseline justify-between gap-3 border-b border-line pb-3">
          <h2 id="all-components" className="m-0 font-mono text-[13px] leading-none font-semibold tracking-[0.08em] text-muted uppercase">
            All components
          </h2>
          <span className="font-mono text-xs leading-none font-medium text-faint">
            {components.length} total · {weeks} weeks
          </span>
        </div>
        <div className="grid grid-cols-2 gap-6 max-[780px]:grid-cols-1">
          {components.map((c) => (
            <article
              key={c.slug}
              className="group relative grid overflow-hidden rounded-2xl border border-line bg-surface transition-[transform,box-shadow,border-color] duration-[450ms] ease-out-soft hover:-translate-y-1 hover:border-faint hover:shadow-[0_34px_56px_-40px_var(--lsg-shadow)] has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-accent"
            >
              <PreviewFrame slug={c.slug} title={c.title} />
              <div className="grid gap-2.5 px-[22px] pt-5 pb-[22px]">
                <div className="flex items-baseline justify-between gap-2.5 font-mono text-[11.5px] leading-none font-medium text-faint">
                  <b className="font-medium tracking-[0.06em] text-muted">
                    {pad(c.number)} · Week {pad(c.week)}
                  </b>
                  <span className="truncate">/components/{c.slug}</span>
                </div>
                <h3 className="m-0 font-display text-[21px] leading-[1.2] font-semibold tracking-[-0.015em]">
                  <Link
                    href={`/components/${c.slug}`}
                    className="text-inherit no-underline outline-none after:absolute after:inset-0 after:rounded-[inherit] after:content-['']"
                  >
                    {c.title}
                  </Link>
                </h3>
                <p className="m-0 max-w-[52ch] text-[14.5px] text-muted">{c.summary}</p>
                <ul className="m-0 mt-1 flex list-none flex-wrap gap-1.5 p-0">
                  {[c.type, ...c.tags].map((t) => (
                    <li key={t} className="rounded-md bg-ground px-[9px] py-1.5 font-mono text-[11.5px] leading-none text-muted">
                      {t}
                    </li>
                  ))}
                </ul>
                <span className="mt-1.5 inline-flex items-center gap-2 text-[13.5px] leading-none font-semibold text-accent">
                  Open component
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" className="size-3.5 transition-transform duration-[350ms] ease-out-soft group-hover:translate-x-1">
                    <path d="M3 8h10M9 4l4 4-4 4" />
                  </svg>
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>

      {agentLogs.map((log) => (
        <section key={`${log.week}-${log.entry}`} aria-labelledby={`week-${log.week}-log`} className="grid gap-6">
          <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line pb-3">
            <h2 id={`week-${log.week}-log`} className="m-0 font-mono text-[13px] leading-none font-semibold tracking-[0.08em] text-muted uppercase">
              Week {pad(log.week)} Agent Log
            </h2>
            <span className="font-mono text-xs leading-none font-medium text-faint">{log.range}</span>
          </div>
          <AgentLogCard
            task={log.task}
            agent={log.agent}
            type={log.type}
            date={log.date}
            status={log.status}
            week={log.week}
            entry={log.entry}
            prompt={log.prompt}
            result={log.result}
            className="[--alc-ground:var(--lsg-bg)]"
          />
        </section>
      ))}

      <footer className="flex flex-wrap justify-between gap-x-4 gap-y-2 border-t border-line pt-[18px] text-[12.5px] text-faint">
        <span>
          LofiStack Component Gallery · {site.author}
        </span>
        <a href={site.repo} className="text-muted underline-offset-2 hover:text-ink hover:underline">
          Source on GitHub
        </a>
      </footer>
    </main>
  );
}
