import type { ComponentMeta } from "@/lib/types";
import { PROMPT } from "./sample";

export const meta: ComponentMeta = {
  slug: "notification-center",
  number: 19,
  week: 10,
  type: "panel",
  title: "Notification Center",
  navLabel: "Notifications",
  componentName: "NotificationCenter",
  summary:
    "A bell with an unread badge that opens a panel of mentions and system alerts. Switch tabs, open an item to mark it read, dismiss what you don't need or mark everything read at once.",
  description:
    "A bell with an unread count that opens a panel of mentions and system alerts. Switch tabs, open an item to mark it read, dismiss what you don't need, or clear everything at once.",
  tags: ["Popover panel", "Tabs", "Mark as read"],
  props: [
    { name: "items", type: "NotificationItem[]", required: true, description: "Notifications. A new array replaces the current list." },
    { name: "items[].id · type", type: 'string · "mention" | "system"', description: "Unique key, and which tab it belongs to." },
    { name: "items[].time · read", type: "string · boolean", description: "ISO date-time, and whether it has been read." },
    { name: "items[].actor · text · target", type: "string", description: "Mentions: “Maya Chen mentioned you in Q4 plan”." },
    { name: "items[].title · icon", type: 'string · "payment" | "warning" | "report" | "automation" | "integration"', description: "System alerts: heading and icon." },
    { name: "items[].body", type: "string", description: "Optional second line or quote." },
    { name: "items[].action", type: "{ label: string; done?: string }", description: "Optional button. Calls onAction and marks the item read." },
    { name: "title", type: "string", default: '"Notifications"', description: "Panel heading." },
    { name: "now", type: "string", description: "ISO date-time used for “Today” and “min ago”. Defaults to the current time." },
    { name: "footer", type: "{ label: string; href?: string }", description: "Optional link at the bottom. Without href it is a button that calls onFooterClick." },
    { name: "open · defaultOpen · onOpenChange", type: "boolean · boolean · (open) => void", default: "— · false", description: "Controlled or uncontrolled panel state. The bell, Escape and clicking outside change it." },
    { name: "tab · defaultTab · onTabChange", type: '"all" | "mention" | "system"', default: '— · "all"', description: "Controlled or uncontrolled tab." },
    { name: "onRead", type: '(ids: string[], source: "click" | "action" | "all") => void', description: "Items were marked read." },
    { name: "onDismiss · onAction · onFooterClick", type: "callbacks", description: "An item was dismissed, its action clicked, or the footer button clicked." },
    { name: "labels · locale", type: 'Partial<NotificationLabels> · string', default: '— · "en-US"', description: "Override any built-in text; date formatting locale." },
    { name: "panelWidth · listMaxHeight", type: "number", default: "400 · 430", description: "Panel width and list max height in px." },
    { name: "ref", type: "Ref<NotificationCenterHandle>", description: "add(item), show(focus?), hide(), toggle() and unread()." },
  ],
  usage: `import { NotificationCenter } from "@/components/gallery/notification-center/NotificationCenter";

<NotificationCenter
  items={[
    { id: "m1", type: "mention", read: false,
      time: "2026-10-02T16:18:00",
      actor: "Maya Chen", text: "mentioned you in", target: "Q4 plan" },
    { id: "s1", type: "system", icon: "payment",
      time: "2026-10-02T15:52:00",
      title: "Payment received", body: "Invoice #1043" },
  ]}
  footer={{ label: "Notification settings", href: "/settings" }}
  onRead={(ids) => console.log(ids)}
/>

// from code:
ref.current?.add({ type: "system", icon: "report", title: "Report ready" });`,
  usageNote:
    "Opening an item marks it read and calls onRead with its id; “Mark all as read” calls it once with every unread id in the current tab. Use ref.current.show(), hide(), toggle() and add() from code.",
  prompt: PROMPT,
};
