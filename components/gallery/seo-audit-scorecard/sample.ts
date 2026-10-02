import type { SeoAuditScorecardProps } from "./SeoAuditScorecard";

/** Example data used by the preview. Fictional site, not a real audit. */
export const SAMPLE = {
  eyebrow: "SEO audit report",
  title: "Harbor & Pine Realty",
  site: "harborandpine.example",
  pages: 48,
  lastRun: "2 Oct 2026, 09:14",
  categories: [
    { id: "performance", label: "Performance", score: 46 },
    { id: "accessibility", label: "Accessibility", score: 78 },
    { id: "best", label: "Best practices", score: 91 },
    { id: "seo", label: "On-page SEO", score: 71 },
  ],
  issues: [
    {
      id: "img-weight",
      severity: "critical",
      category: "performance",
      pages: 6,
      impact: 18,
      title: "Hero photos are not compressed",
      why: "The home and listing pages load 2 to 3 MB photos before anything else. On mobile data that adds seconds before the page is usable, and slow pages rank lower.",
      fix: "Export photos as WebP or AVIF at the size they are shown, and set width and height so the layout doesn't jump.",
      urls: ["/", "/listings", "/listings/12-cove-road", "/about"],
    },
    {
      id: "render-block",
      severity: "critical",
      category: "performance",
      pages: 48,
      impact: 14,
      title: "Scripts block the first paint",
      why: "Three scripts in the page head must download and run before the browser can draw anything.",
      fix: "Add defer to the chat widget and analytics scripts, and inline only the CSS needed for the top of the page.",
      urls: ["/", "/listings", "/contact"],
    },
    {
      id: "alt-text",
      severity: "critical",
      category: "accessibility",
      pages: 23,
      impact: 9,
      title: "Images are missing alt text",
      why: "Screen readers read these images out as file names, and search engines can't tell what the photos show.",
      fix: "Write a short description for each listing photo, such as \"Kitchen with island and sea view\". Give purely decorative images an empty alt.",
      urls: ["/listings/12-cove-road", "/listings/4-pine-lane", "/team"],
    },
    {
      id: "broken-links",
      severity: "critical",
      category: "seo",
      pages: 6,
      impact: 8,
      title: "Internal links point to missing pages",
      why: "Six pages link to listings that were taken down. Visitors hit a 404 and crawlers waste time on dead ends.",
      fix: "Redirect sold listings to their area page, or remove the links from the \"Similar homes\" blocks.",
      urls: ["/listings/8-harbor-view", "/areas/bayside", "/blog/spring-market"],
    },
    {
      id: "meta-desc",
      severity: "warning",
      category: "seo",
      pages: 14,
      impact: 6,
      title: "Meta descriptions are missing",
      why: "Without one, search results show a random snippet from the page, which usually gets fewer clicks.",
      fix: "Write a 140 to 160 character summary for each page that says what is on it and who it is for.",
      urls: ["/areas/bayside", "/areas/old-town", "/sell", "/blog"],
    },
    {
      id: "contrast",
      severity: "warning",
      category: "accessibility",
      pages: 48,
      impact: 7,
      title: "Buttons have low colour contrast",
      why: "The pale grey \"Book a viewing\" text is hard to read for many visitors, especially on a phone outdoors.",
      fix: "Darken the button text or background until the contrast ratio is at least 4.5 to 1.",
      urls: ["/", "/listings", "/contact"],
    },
    {
      id: "dup-titles",
      severity: "warning",
      category: "seo",
      pages: 8,
      impact: 5,
      title: "Several pages share the same title",
      why: "Eight listing pages are all titled \"Home for sale\", so search engines can't tell them apart.",
      fix: "Put the street and area in each title, for example \"12 Cove Road, Bayside · 3 bed home\".",
      urls: ["/listings/12-cove-road", "/listings/4-pine-lane", "/listings/31-dune-street"],
    },
    {
      id: "caching",
      severity: "warning",
      category: "performance",
      pages: 48,
      impact: 8,
      title: "Static files are not cached",
      why: "Returning visitors download the same fonts, styles and logo again on every visit.",
      fix: "Set a long cache lifetime, such as one year, on versioned static files.",
      urls: ["/assets/site.css", "/assets/logo.svg", "/assets/fonts"],
    },
    {
      id: "insecure",
      severity: "warning",
      category: "best",
      pages: 3,
      impact: 4,
      title: "Some images load over an insecure connection",
      why: "Three pages pull photos from a non-HTTPS address, so browsers mark the page as not fully secure.",
      fix: "Serve those images over HTTPS, or move them onto the main site.",
      urls: ["/listings/2-quay-road", "/press", "/blog/open-house"],
    },
    {
      id: "console",
      severity: "notice",
      category: "best",
      pages: 1,
      impact: 3,
      title: "Console errors on the contact page",
      why: "The map script throws an error when it loads. Nothing breaks yet, but errors like this often hide real problems.",
      fix: "Update the map embed and remove the old key from the page.",
      urls: ["/contact"],
    },
    {
      id: "headings",
      severity: "notice",
      category: "accessibility",
      pages: 11,
      impact: 3,
      title: "Heading levels skip",
      why: "Pages jump from H2 straight to H4, which makes the outline confusing for screen-reader users.",
      fix: "Use headings in order and style them with CSS, rather than picking a level for its size.",
      urls: ["/sell", "/about", "/blog/spring-market"],
    },
    {
      id: "sitemap",
      severity: "notice",
      category: "seo",
      pages: 3,
      impact: 2,
      title: "Sitemap lists redirected URLs",
      why: "Crawlers read the sitemap first. Redirects there slow down how quickly the real pages are found.",
      fix: "Regenerate the sitemap so it only lists final URLs that load directly.",
      urls: ["/sitemap.xml"],
    },
    {
      id: "deprecated",
      severity: "notice",
      category: "best",
      pages: 2,
      impact: 2,
      title: "Uses a browser feature that is being removed",
      why: "An old photo gallery plugin relies on a feature browsers plan to drop.",
      fix: "Update the gallery plugin to its latest version.",
      urls: ["/listings/12-cove-road", "/listings/4-pine-lane"],
    },
  ],
  source: "Overall score is the average of the four categories. Fixing an issue adds its points to its category, up to 100.",
} satisfies Omit<SeoAuditScorecardProps, "ref">;

export const PROMPT = `Build component 23 for my LofiStack Component Gallery: an SEO Audit Scorecard that shows a site audit as a report card.

It should show, for one audited site:

* A dark report header with the client name, domain, pages crawled, when the audit last ran and a "Re-run audit" button
* A letter grade (A–F) in a score ring, the overall score out of 100 and the score you would reach if every issue were fixed
* Four category score cards (Performance, Accessibility, Best practices, On-page SEO) with score rings, open-issue counts and points gained from fixes; clicking one scopes the issue list to that category
* Every issue grouped by severity (Critical, Warning, Notice, Fixed), with a filter bar that shows live counts
* Expandable issues with "Why it matters", "How to fix", example pages and a "Mark as fixed" checkbox that adds its points back and recomputes the scores and grade with animated numbers
* A short scanning state when re-running the audit that verifies fixed issues and reports the new grade

Requirements:

* React + TypeScript + Tailwind CSS. Every value comes in through typed props; nothing hardcoded. Callbacks for issue fixes and audit runs, plus setFixed() and rerun() on a ref.
* Work out category scores, the weighted overall score, the potential score and the grade from the data.
* Fully responsive: four score cards on desktop, two on tablets, compact cards and stacked issue rows on phones.
* Light and dark themes through CSS variables.
* Hover, pressed, expanded, fixed, verified, empty and scanning states; respects reduced motion.
* Accessible: real buttons with aria-pressed and aria-expanded, Escape closes an open issue, focus follows a fixed issue, screen-reader announcements.
* Give it its own page in the gallery with a live preview, "Fix all critical" and "Reset" controls, a props table and a usage example.`;
