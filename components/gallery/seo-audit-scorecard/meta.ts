import type { ComponentMeta } from "@/lib/types";
import { PROMPT } from "./sample";

export const meta: ComponentMeta = {
  slug: "seo-audit-scorecard",
  number: 23,
  week: 12,
  type: "report",
  title: "SEO Audit Scorecard",
  navLabel: "SEO Audit",
  componentName: "SeoAuditScorecard",
  summary:
    "A site audit shown as a report card: a letter grade, four category scores and issues grouped by severity. Mark issues as fixed to see the grade recompute, then re-run the audit.",
  description:
    "A site audit as a report card: one letter grade, four category scores and every issue grouped by how serious it is. Open an issue to see why it matters and how to fix it. Mark it fixed and the scores update.",
  tags: ["Score rings", "Severity filters", "Live regrading"],
  props: [
    { name: "eyebrow · title · site", type: "string", description: "Header text. site is the domain that was audited." },
    { name: "pages · lastRun", type: "number · string", description: "Pages crawled and when the audit last ran (any text)." },
    { name: "categories", type: "SeoAuditCategory[]", required: true, description: "{ id, label, score, weight? }. Score is 0–100 with every listed issue still open. Weight defaults to 1." },
    { name: "issues", type: "SeoAuditIssue[]", required: true, description: "{ id, title, severity, category, impact, pages?, urls?, why?, fix?, fixed? }. impact is the points fixing it adds back; fixed starts it as fixed." },
    { name: "severity · defaultSeverity", type: '"all" | "critical" | "warning" | "notice" | "fixed"', default: '"all"', description: "Issue filter, controlled or initial. onSeverityChange fires when it changes." },
    { name: "category · defaultCategory", type: "string | null", default: "null", description: "Category id to show only that category's issues. Clicking a score card sets it; onCategoryChange fires." },
    { name: "onIssueFix", type: "(detail: SeoIssueFixDetail) => void", description: "Fires on Mark as fixed / reopen with the issue, its new category score, the overall score and the grade." },
    { name: "onAuditRun", type: "(detail: SeoAuditRunDetail) => void", description: "Fires when a re-run finishes, with the overall score, grade, verified issue ids and category scores." },
    { name: "ref", type: "Ref<SeoAuditScorecardHandle>", description: "setFixed(id, fixed) and rerun() from code, exactly like the checkbox and button." },
    { name: "source · labels", type: "string · Partial<SeoAuditLabels>", description: "Optional footer note, and overrides for any built-in text." },
    { name: "className", type: "string", description: "Extra classes for the outer wrapper." },
  ],
  usage: `import { SeoAuditScorecard } from "@/components/gallery/seo-audit-scorecard/SeoAuditScorecard";

<SeoAuditScorecard
  site="harborandpine.example"
  pages={48}
  categories={[{ id: "seo", label: "On-page SEO", score: 71 }]}
  issues={[
    {
      id: "meta-desc",
      severity: "warning",
      category: "seo",
      impact: 6,
      pages: 14,
      title: "Meta descriptions are missing",
      why: "…",
      fix: "…",
    },
  ]}
  onIssueFix={(d) => console.log(d.overall, d.grade)}
/>`,
  usageNote:
    "Re-run audit shows a short scanning state, marks fixed issues as verified and then calls onAuditRun. Change the component's key to load a fresh audit.",
  prompt: PROMPT,
};
