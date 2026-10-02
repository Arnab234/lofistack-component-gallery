import type { AppointmentDay } from "./AppointmentPipeline";

/** Example data used by the preview. Fictional clients and phone numbers. Not real bookings. */
export const SAMPLE_DAYS: AppointmentDay[] = [
  {
    date: "2026-09-28",
    appointments: [
      { id: "a01", time: "07:00", duration: 45, name: "Maya Rodriguez", service: "Intro session", staff: "Jess Lin", status: "showed", reminded: true, source: "Social Ads", phone: "(206) 555-0114" },
      { id: "a02", time: "08:30", duration: 30, name: "Daniel Okafor", service: "Body scan", staff: "Omar Baker", status: "showed", reminded: true, source: "Website form", phone: "(206) 555-0127" },
      { id: "a03", time: "10:00", duration: 45, name: "Hannah Weiss", service: "Intro session", staff: "Priya Nair", status: "noshow", reminded: true, source: "Social Ads", phone: "(206) 555-0131", note: "Didn't pick up the follow-up call." },
      { id: "a04", time: "12:15", duration: 30, name: "Luis Moreno", service: "Nutrition consult", staff: "Priya Nair", status: "showed", reminded: true, source: "Referral", phone: "(206) 555-0142" },
      { id: "a05", time: "17:30", duration: 45, name: "Grace Chen", service: "Intro session", staff: "Jess Lin", status: "showed", reminded: true, source: "Website form", phone: "(206) 555-0156" },
      { id: "a06", time: "18:30", duration: 45, name: "Tom Becker", service: "Intro session", staff: "Omar Baker", status: "showed", reminded: false, source: "Phone call", phone: "(206) 555-0163" },
    ],
   },
  {
    date: "2026-09-29",
    appointments: [
      { id: "b01", time: "07:30", duration: 45, name: "Aisha Khan", service: "Intro session", staff: "Jess Lin", status: "showed", reminded: true, source: "Social Ads", phone: "(206) 555-0170" },
      { id: "b02", time: "09:00", duration: 30, name: "Ben Carter", service: "Body scan", staff: "Omar Baker", status: "noshow", reminded: false, source: "Website form", phone: "(206) 555-0178", note: "Booked the same morning. No reminder went out." },
      { id: "b03", time: "12:00", duration: 45, name: "Sofia Rossi", service: "Intro session", staff: "Priya Nair", status: "showed", reminded: true, source: "Referral", phone: "(206) 555-0183" },
      { id: "b04", time: "17:00", duration: 30, name: "Marcus Lee", service: "Nutrition consult", staff: "Priya Nair", status: "noshow", reminded: false, source: "Social Ads", phone: "(206) 555-0189" },
      { id: "b05", time: "18:15", duration: 45, name: "Elena Petrova", service: "Intro session", staff: "Jess Lin", status: "showed", reminded: true, source: "Website form", phone: "(206) 555-0192" },
    ],
   },
  {
    date: "2026-09-30",
    appointments: [
      { id: "c01", time: "07:00", duration: 45, name: "Noah Williams", service: "Intro session", staff: "Omar Baker", status: "showed", reminded: true, source: "Social Ads", phone: "(206) 555-0105" },
      { id: "c02", time: "08:15", duration: 30, name: "Chloe Martin", service: "Body scan", staff: "Jess Lin", status: "showed", reminded: true, source: "Website form", phone: "(206) 555-0109" },
      { id: "c03", time: "09:30", duration: 45, name: "Ravi Shah", service: "Intro session", staff: "Priya Nair", status: "noshow", reminded: true, source: "Social Ads", phone: "(206) 555-0118" },
      { id: "c04", time: "12:30", duration: 30, name: "Emma Johansson", service: "Nutrition consult", staff: "Priya Nair", status: "confirmed", reminded: true, source: "Referral", phone: "(206) 555-0122" },
      { id: "c05", time: "16:00", duration: 45, name: "Lucas Silva", service: "Intro session", staff: "Jess Lin", status: "confirmed", reminded: true, source: "Website form", phone: "(206) 555-0136" },
      { id: "c06", time: "17:30", duration: 45, name: "Mia Thompson", service: "Intro session", staff: "Omar Baker", status: "booked", reminded: false, source: "Social Ads", phone: "(206) 555-0147", note: "First visit. Asked about parking." },
      { id: "c07", time: "18:45", duration: 30, name: "Jack Nguyen", service: "Body scan", staff: "Jess Lin", status: "booked", reminded: false, source: "Phone call", phone: "(206) 555-0151" },
    ],
   },
  {
    date: "2026-10-01",
    appointments: [
      { id: "d01", time: "07:30", duration: 45, name: "Olivia Brown", service: "Intro session", staff: "Jess Lin", status: "confirmed", reminded: true, source: "Website form", phone: "(206) 555-0159" },
      { id: "d02", time: "09:00", duration: 30, name: "Samuel Adeyemi", service: "Body scan", staff: "Omar Baker", status: "booked", reminded: false, source: "Social Ads", phone: "(206) 555-0166" },
      { id: "d03", time: "11:00", duration: 45, name: "Isla Murphy", service: "Intro session", staff: "Priya Nair", status: "confirmed", reminded: true, source: "Referral", phone: "(206) 555-0172" },
      { id: "d04", time: "13:00", duration: 30, name: "Kenji Watanabe", service: "Nutrition consult", staff: "Priya Nair", status: "booked", reminded: false, source: "Website form", phone: "(206) 555-0175" },
      { id: "d05", time: "17:00", duration: 45, name: "Zoe Fischer", service: "Intro session", staff: "Jess Lin", status: "confirmed", reminded: true, source: "Social Ads", phone: "(206) 555-0181" },
      { id: "d06", time: "18:30", duration: 45, name: "Ethan Clarke", service: "Intro session", staff: "Omar Baker", status: "booked", reminded: false, source: "Phone call", phone: "(206) 555-0186" },
    ],
   },
  {
    date: "2026-10-02",
    appointments: [
      { id: "e01", time: "07:00", duration: 45, name: "Lily Evans", service: "Intro session", staff: "Omar Baker", status: "confirmed", reminded: true, source: "Website form", phone: "(206) 555-0190" },
      { id: "e02", time: "08:30", duration: 30, name: "Adam Novak", service: "Body scan", staff: "Jess Lin", status: "booked", reminded: false, source: "Social Ads", phone: "(206) 555-0194" },
      { id: "e03", time: "10:30", duration: 45, name: "Nora Haddad", service: "Intro session", staff: "Priya Nair", status: "booked", reminded: false, source: "Referral", phone: "(206) 555-0197" },
      { id: "e04", time: "12:00", duration: 30, name: "Felix Wagner", service: "Nutrition consult", staff: "Priya Nair", status: "booked", reminded: false, source: "Website form", phone: "(206) 555-0102" },
      { id: "e05", time: "16:30", duration: 45, name: "Ruby Scott", service: "Intro session", staff: "Jess Lin", status: "booked", reminded: false, source: "Social Ads", phone: "(206) 555-0111" },
    ],
   },
];

export const SAMPLE = {
  eyebrow: "Appointment pipeline",
  title: "Cedar Fitness Co. · Downtown studio",
  subtitle: "Intro sessions, body scans and nutrition consults · week of 28 Sep 2026",
  today: "2026-09-30",
  source: "Show rate = showed ÷ (showed + no-shows).",
};

export const PROMPT = `Build component 16 for my LofiStack Component Gallery: an Appointment Pipeline for a week of bookings.

It should show:

* An optional eyebrow, title and subtitle
* The week's show rate (showed ÷ (showed + no-shows)) as a big number, with one pip per finished visit and a showed / no-show / still-to-come summary
* A row of day tabs: weekday, date, "Today" tag, appointment count and a mini bar of each day's status mix
* For the selected day: the appointment count, day show rate, share of upcoming visits confirmed, and a "Send N reminders" bulk button
* Four lanes (Booked, Confirmed, Showed, No-show), each with a count, a short description and its appointments sorted by time
* Appointment cards with time, client, service, staff initials, duration and a reminder bell; opening one shows the time range, coach, phone, source and note, "Move to" lane buttons and a "Send reminder" button

Requirements:

* React + TypeScript + Tailwind CSS. Every value comes in through typed props; nothing hardcoded.
* Work out every count, rate and bar from the live statuses, and update them as appointments move or get reminders.
* Fire callbacks when the day changes and when an appointment moves lane or gets a reminder; expose setStatus(id, status) and remind(id) through a ref.
* Fully responsive: four lanes on desktop, a 2 × 2 grid on tablets, stacked lanes and compact day chips on phones.
* Light and dark themes through CSS variables.
* Hover, focus, selected, pressed, disabled and empty states, with smooth card moves, count bumps and an expanding detail panel.
* Accessible: day tabs with arrow-key navigation, expandable cards, Escape to close, and a live region announcing changes.
* Give it its own page in the gallery with a live preview, a reset control, a props table and a usage example.`;
