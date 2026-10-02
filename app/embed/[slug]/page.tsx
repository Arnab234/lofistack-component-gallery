import { notFound } from "next/navigation";
import { demos } from "@/lib/demos";
import { components } from "@/lib/registry";

export const dynamicParams = false;

export function generateStaticParams() {
  return components.map((c) => ({ slug: c.slug }));
}

export const metadata = { robots: { index: false } };

/** Chrome-free preview used by the homepage cards. */
export default async function Embed({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const Demo = demos[slug];
  if (!Demo) notFound();
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: 'document.documentElement.classList.add("lsg-embed")' }} />
      <main className="grid min-h-screen justify-items-center gap-5 p-7">
        <Demo embed />
      </main>
    </>
  );
}
