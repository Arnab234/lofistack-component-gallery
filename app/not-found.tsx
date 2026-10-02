import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto grid max-w-[640px] gap-3.5 px-5 py-24">
      <h1 className="m-0 font-display text-[clamp(32px,6vw,48px)] leading-[1.05] font-semibold tracking-[-0.03em]">Component not found</h1>
      <p className="m-0 text-muted">That page doesn’t exist. Every component lives at /components/&lt;name&gt;.</p>
      <Link href="/" className="font-semibold text-accent">
        ← Back to all components
      </Link>
    </main>
  );
}
