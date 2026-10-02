export const site = {
  name: "LofiStack Component Gallery",
  author: "Arnab Biswas",
  url: "https://lofistack-component-gallery.vercel.app",
  repo: "https://github.com/Arnab234/lofistack-component-gallery",
  branch: "main",
};

/** GitHub link to a component's folder. */
export const sourceUrl = (slug: string) => `${site.repo}/tree/${site.branch}/components/gallery/${slug}`;
