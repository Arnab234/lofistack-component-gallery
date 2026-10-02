import type { FormConversionCardProps } from "./FormConversionCard";

/** Example data used by the preview. Not real client results. */
export const SAMPLE: Omit<FormConversionCardProps, "className"> = {
  eyebrow: "Form analytics",
  title: "Home valuation request · Harbor & Pine Realty",
  subtitle: "Field-by-field completion, last 30 days",
  period: "1 – 30 Sep 2026",
  form: { title: "Book a free home valuation", button: "Request my valuation" },
  steps: [
    { id: "views", label: "Form views", type: "view" },
    { id: "started", label: "Started", type: "start" },
    { id: "name", label: "Full name", type: "field" },
    { id: "email", label: "Email", type: "field" },
    { id: "phone", label: "Phone", type: "field" },
    { id: "submitted", label: "Submitted", type: "submit" },
  ],
  segments: {
    all: { label: "All devices", counts: [4820, 2410, 2170, 1910, 1258, 1170], avgSeconds: 72 },
    desktop: { label: "Desktop", counts: [1980, 1090, 1032, 846, 772, 728], avgSeconds: 62 },
    mobile: { label: "Mobile", counts: [2840, 1320, 1138, 1064, 486, 442], avgSeconds: 88 },
  },
  tips: {
    name: "Use one Full name field instead of separate first and last names, and remove the Title dropdown. {rate} of people who reach it leave here.",
    email: "{rate} of people leave at Email. Check for strict validation, and suggest a fix for common typos (\"Did you mean…?\") instead of showing an error.",
    phone: "Make Phone optional, or say why you ask for it (\"So we can confirm your visit by text\"). {rate} of people who reach it leave here.",
  },
};

export const PROMPT = `Build component 22 for my LofiStack Component Gallery: a Form Conversion Card that shows where people give up on a lead form.

It should show:

* A header with an eyebrow, title, subtitle and an All devices / Desktop / Mobile switch
* Three figures: form conversion (submitted ÷ views), start-to-submit rate and average time to submit
* A mini form (title, one input per field, submit button) that switches between a desktop and a phone frame, with each field's pass rate as a badge
* Field-by-field bars from form views to submitted, each with the count, % of views, a striped "left at this step" segment and the drop-off ("−34.1% left here")
* The field that loses the most people highlighted in both the mini form and the bars, tagged "Biggest drop-off"
* Hovering or focusing a field on one side highlights it on the other; clicking selects it and shows its reached / completed / left numbers
* A "Show suggestions" panel with a tip for the worst field and an estimate of the extra submissions if it kept pace with the other fields

Requirements:

* React + TypeScript + Tailwind CSS. Every value comes in through typed props; nothing hardcoded. All rates are worked out from the counts.
* Bars glide and numbers count between devices. onFieldSelect and onDeviceChange callbacks.
* Fully responsive: mock form beside the bars on desktop, stacked on narrow containers, compact on phones.
* Light and dark themes through CSS variables.
* Hover, focus, pressed and expanded states; reduced-motion support.
* Accessible: every bar and field is a labelled button with a full text description, and the detail line is announced.
* Give it its own page in the gallery with a live preview, a props table and a usage example.`;
