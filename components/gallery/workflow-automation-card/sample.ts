import type { WorkflowAutomationCardProps } from "./WorkflowAutomationCard";

type WorkflowSample = Pick<WorkflowAutomationCardProps, "eyebrow" | "name" | "subtitle" | "refId" | "revision" | "stats" | "testContact" | "flow">;

/** Example workflows used by the preview. Fictional workflow, contacts and numbers, not real client results. */
export const LEAD_WORKFLOW: WorkflowSample = {
  eyebrow: "Automation",
  name: "New lead follow-up",
  subtitle: "Brightside Dental · edited 2 days ago",
  refId: "WF-0217",
  revision: "Rev 4",
  stats: { period: "7 days", runs: 248, succeeded: 242, avgSeconds: 1.4, lastRun: "12 min ago" },
  testContact: { name: "Dana Reyes", note: "Test contact" },
  flow: [
    {
      id: "trigger",
      type: "trigger",
      icon: "form",
      title: "Form submitted",
      detail: "Book a consultation",
      runs: 248,
      description: "Starts when someone sends the Book a consultation form on the website.",
      config: { Form: "Book a consultation", Source: "Website", "Re-entry": "Once per contact" },
    },
    {
      id: "vip",
      type: "condition",
      title: "Has tag: VIP?",
      detail: "Contact tag check",
      runs: 248,
      test: "Has VIP tag",
      testDefault: true,
      description: "Sends VIP contacts to the front desk straight away. Everyone else gets the welcome email.",
      config: { Field: "Contact tags", Rule: "contains", Value: "VIP" },
      yes: [
        {
          id: "notify",
          type: "action",
          icon: "chat",
          title: "Notify team chat",
          detail: "#front-desk channel",
          runs: 61,
          description: "Posts the new request to the front-desk channel so someone calls within the hour.",
          config: { Channel: "#front-desk", Message: "New VIP consult request from {{contact.first_name}}" },
        },
        {
          id: "owner",
          type: "action",
          icon: "user",
          title: "Assign owner",
          detail: "Senior coordinator",
          runs: 61,
          description: "Makes the senior coordinator the contact owner.",
          config: { Owner: "Senior coordinator", "Notify owner": "Yes, by email" },
        },
      ],
      no: [
        {
          id: "welcome",
          type: "action",
          icon: "mail",
          title: "Send welcome email",
          detail: "Template · Consult welcome",
          runs: 187,
          description: "Sends the welcome email with what to expect at the first visit.",
          config: { Template: "Consult welcome", From: "Front desk", Subject: "Your consultation request" },
        },
        {
          id: "nurture",
          type: "action",
          icon: "list",
          title: "Add to nurture list",
          detail: "New patient nurture",
          runs: 187,
          description: "Adds the contact to the new-patient email series.",
          config: { List: "New patient nurture", "Double opt-in": "Not needed" },
        },
      ],
    },
    {
      id: "wait",
      type: "wait",
      icon: "clock",
      title: "Wait 1 day",
      detail: "Weekdays only",
      runs: 248,
      description: "Pauses the contact for one day. Test runs skip the wait.",
      config: { Duration: "1 day", "Resume at": "9:00 am, contact's time zone", Skip: "Saturdays and Sundays" },
    },
    {
      id: "sms",
      type: "action",
      icon: "sms",
      title: "Send SMS reminder",
      detail: "Only if not booked yet",
      runs: 203,
      description: "Texts a booking link to anyone who has not booked yet. 45 contacts booked during the wait and left the workflow.",
      config: { Message: "Hi {{contact.first_name}}, pick a time that suits you: {{booking_link}}", "Send window": "9 am – 7 pm" },
    },
  ],
};

export const CALL_WORKFLOW: WorkflowSample = {
  eyebrow: "Automation",
  name: "Missed-call text back",
  subtitle: "Harbor & Pine Realty · edited 5 days ago",
  refId: "WF-0342",
  revision: "Rev 2",
  stats: { period: "7 days", runs: 96, succeeded: 95, avgSeconds: 0.9, lastRun: "38 min ago" },
  testContact: { name: "Sam Okafor", note: "Test contact" },
  flow: [
    {
      id: "call",
      type: "trigger",
      icon: "phone",
      title: "Missed call",
      detail: "Main office line",
      runs: 96,
      description: "Starts when a call to the main office line is not answered.",
      config: { Line: "Main office", "Counts as missed": "No answer after 25 seconds" },
    },
    {
      id: "hours",
      type: "condition",
      title: "During office hours?",
      detail: "Mon–Fri, 9 am – 6 pm",
      runs: 96,
      test: "Called in office hours",
      testDefault: false,
      description: "Checks when the call came in, using the office time zone.",
      config: { Schedule: "Mon–Fri, 9:00 am – 6:00 pm", "Time zone": "Office" },
      yes: [
        {
          id: "sorry",
          type: "action",
          icon: "sms",
          title: "Send SMS",
          detail: "Sorry we missed you",
          runs: 58,
          config: { Message: "Sorry we missed your call! An agent will call you back shortly." },
        },
        {
          id: "task",
          type: "action",
          icon: "task",
          title: "Create task",
          detail: "Call back within 1 hour",
          runs: 58,
          config: { Assign: "Agent on duty", Due: "In 1 hour" },
        },
      ],
      no: [
        {
          id: "closed",
          type: "action",
          icon: "sms",
          title: "Send SMS",
          detail: "Closed, with booking link",
          runs: 38,
          config: { Message: "We're closed right now. Book a call back: {{booking_link}}" },
        },
      ],
    },
    {
      id: "wait2",
      type: "wait",
      icon: "clock",
      title: "Wait 2 hours",
      detail: "Exit if they reply",
      runs: 96,
      config: { Duration: "2 hours", "Exit early": "Contact replies or books" },
    },
    {
      id: "owner",
      type: "action",
      icon: "bell",
      title: "Notify owner",
      detail: "If no reply yet",
      runs: 41,
      description: "Lets the office owner know about callers who have not replied. 55 contacts replied or booked during the wait.",
      config: { Notify: "Office owner", Channel: "Email and app" },
    },
  ],
};

export const PROMPT = `Build component 17 for my LofiStack Component Gallery: a Workflow Automation Card that draws an automation as a node graph.

It should show, for one workflow:

* An eyebrow, the workflow name and a subtitle, with an on / off switch and its state ("Active · New contacts enter")
* A stats strip: runs in the period, success rate (worked out from runs and succeeded), average run time and last run
* The flow on a blueprint grid: trigger, an if / else condition with yes and no branches that join again, actions and a wait, linked by SVG connectors, ending in an End marker, with a reference / revision title block
* A side panel with two tabs: Step (the selected step's description, settings and a "reached this step" bar) and Test log
* A test run bar: test contact, one Yes / No switch per condition, Test run / Pause / Resume / Run again and Stop buttons, and a progress line
* A step-by-step test run that animates the connectors, highlights the running step, ticks off finished steps, fades the skipped branch and logs every step with its time

Requirements:

* React + TypeScript + Tailwind CSS. Every value comes in through typed props; nothing hardcoded.
* Work out the connector paths from the rendered nodes and re-draw them on resize.
* Fire callbacks when the switch is pressed, when a step is opened, and when a test run starts, pauses, resumes, stops or completes; expose run(), pause() and stop() through a ref.
* Fully responsive: side panel beside the canvas on desktop, underneath on tablets, compact nodes and a stacked run bar on phones.
* Blueprint-dark in both themes, themed through CSS variables.
* Hover, focus, selected, running, done, skipped, disabled and off states; reduced-motion support.
* Accessible: real buttons for nodes (arrow keys move between them), tabs with arrow keys, switches with role="switch", and a live region for run updates.
* Give it its own page in the gallery with a live preview, a workflow picker, a props table and a usage example.`;
