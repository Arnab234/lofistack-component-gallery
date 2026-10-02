import type { ComponentMeta } from "@/lib/types";
import { PROMPT } from "./sample";

export const meta: ComponentMeta = {
  slug: "appointment-pipeline",
  number: 16,
  week: 8,
  type: "board",
  title: "Appointment Pipeline",
  navLabel: "Appointments",
  componentName: "AppointmentPipeline",
  summary:
    "A week of bookings shown one day at a time, in Booked, Confirmed, Showed and No-show lanes. Move appointments between lanes and send reminders while the show rate updates.",
  description:
    "A week of bookings, one day at a time. Each appointment sits in a lane: Booked, Confirmed, Showed or No-show. Open one to move it to another lane or send a reminder, and the show rate updates as you go.",
  tags: ["Day tabs", "Status lanes", "Live show rate"],
  props: [
    { name: "days", type: "{ date: string; appointments: Appointment[] }[]", required: true, description: "One entry per day, date as YYYY-MM-DD. Weekday and date labels are worked out from it." },
    { name: "Appointment", type: "{ id, time, duration?, name, service?, staff?, status?, reminded?, source?, phone?, note? }", description: 'time is HH:MM (24-hour), duration in minutes, status "booked" | "confirmed" | "showed" | "noshow". Sorted by time inside each lane.' },
    { name: "day · defaultDay", type: "string", description: "Selected day (controlled) or the initial day. Defaults to today, then the first day." },
    { name: "today", type: "string", description: 'YYYY-MM-DD. Marks that day with a "Today" tag.' },
    { name: "eyebrow · title · subtitle", type: "string", description: "Optional header text." },
    { name: "source", type: "string", description: "Optional footer note." },
    { name: "onDayChange", type: "(day: string) => void", description: "Fires when a day tab is picked." },
    { name: "onAppointmentUpdate", type: "(d: AppointmentUpdate) => void", description: 'Fires on a lane move or reminder with the appointment, the day and what changed (action is "status" or "reminder").' },
    { name: "ref", type: "Ref<{ setStatus(id, status); remind(id) }>", description: "Do the same moves and reminders from code." },
    { name: "labels · locale", type: "Partial<AppointmentPipelineLabels> · string", default: '— · "en-US"', description: "Override built-in text, and the locale for dates." },
    { name: "className", type: "string", description: "Extra classes for the outer wrapper." },
  ],
  usage: `import { AppointmentPipeline } from "@/components/gallery/appointment-pipeline/AppointmentPipeline";

<AppointmentPipeline
  title="Downtown studio"
  today="2026-09-30"
  days={[
    {
      date: "2026-09-30",
      appointments: [
        { id: "c06", time: "17:30", duration: 45, name: "Mia Thompson",
          service: "Intro session", staff: "Omar Baker", status: "booked" },
      ],
    },
  ]}
  onAppointmentUpdate={(d) => console.log(d.action, d.appointment)}
/>`,
  usageNote: "Open an appointment to move it between lanes or send a reminder; use the arrow keys on the day tabs and Escape to close a card.",
  prompt: PROMPT,
};
