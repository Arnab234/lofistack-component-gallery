"use client";

import {
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type Ref,
} from "react";
import { cx } from "@/lib/format";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

/** Any JSON value. Payloads and response bodies use this shape. */
export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue | undefined };

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | (string & {});
export type StatusClass = "2xx" | "4xx" | "5xx";
export type WebhookFilter = "all" | StatusClass;
export type InspectorTab = "payload" | "headers" | "response";

/** A delivery as you pass it in (via `events` or `addEvent`). Everything is optional. */
export interface WebhookEventInput {
  id?: string;
  /** Event name, e.g. "invoice.paid". */
  name?: string;
  method?: HttpMethod;
  /** Receiving path, e.g. "/hooks/payments". */
  path?: string;
  /** HTTP status the receiver answered with. */
  status?: number;
  /** Round-trip time in milliseconds. */
  latency?: number;
  /** Delivery time: a Date or an ISO string. Defaults to now. */
  at?: Date | string;
  /** Account name, added to generated payloads. */
  account?: string;
  /** Request body. Wrapped in an envelope `{ id, type, created_at, data }` unless it already has a `type`. */
  payload?: JsonValue;
  /** Response body. Derived from the status when left out. */
  response?: JsonValue;
  /** Request headers. Derived from the event when left out. */
  headers?: Record<string, string> | null;
  attempt?: number;
  /** Id of the delivery this one replays. */
  replayOf?: string | null;
}

/** A stored delivery. */
export interface WebhookEvent {
  id: string;
  name: string;
  method: string;
  path: string;
  status: number;
  latency: number;
  at: Date;
  account: string;
  payload: JsonValue;
  response: JsonValue;
  headers: Record<string, string> | null;
  attempt: number;
  replayOf: string | null;
  seq: number;
  /** Set for rows added after mount; used for the arrival flash. */
  born?: number;
}

export interface WebhookReplayDetail {
  name: string;
  original: { id: string; status: number };
  replay: { id: string; status: number; latency: number };
}

/** Imperative API, available through `ref`. */
export interface WebhookMonitorHandle {
  /** Add a delivery (real or simulated). Returns the stored event. */
  addEvent: (event: WebhookEventInput) => WebhookEvent;
  /** Add one simulated failing delivery right away. */
  simulateFailure: () => WebhookEvent;
  /** Select a delivery by id. */
  select: (id: string) => void;
  /** Re-send a delivery as a new row marked "replay". */
  replay: (id: string) => WebhookEvent | null;
  pause: () => void;
  resume: () => void;
  /** Current deliveries, newest first. */
  readonly events: WebhookEvent[];
}

export interface WebhookMonitorProps {
  /** Header text. */
  title?: string;
  /** Environment badge, e.g. "Production". Hidden when empty. */
  environment?: string;
  /** Base path shown in the header. */
  endpoint?: string;
  /** Seed for the repeatable simulation. */
  seed?: number;
  /** Simulated events to start with (0–60). */
  initial?: number;
  /** How many rows to keep (minimum 10). */
  max?: number;
  /** Account names used in simulated payloads. */
  accounts?: string[];
  /** Set to false to show only events you pass in or add. */
  simulate?: boolean;
  /** Average milliseconds between simulated events. */
  interval?: number;
  /** Optional starting events, newest first. Replaces the simulated backlog. */
  events?: WebhookEventInput[];
  /** Controlled paused state. Leave undefined to let the Pause button manage it. */
  paused?: boolean;
  /** Initial paused state when uncontrolled. Reduced-motion users always start paused. */
  defaultPaused?: boolean;
  /** Fires when Pause / Resume is pressed. */
  onStreamChange?: (paused: boolean) => void;
  /** Fires when a delivery is selected. */
  onSelect?: (event: { id: string; name: string; status: number }) => void;
  /** Fires after a replay with the original and the new delivery. */
  onReplay?: (detail: WebhookReplayDetail) => void;
  ref?: Ref<WebhookMonitorHandle>;
  className?: string;
}

/* ------------------------------------------------------------------ */
/* Simulation helpers                                                  */
/* ------------------------------------------------------------------ */

const STATUS_TEXT: Record<number, string> = {
  200: "OK", 201: "Created", 202: "Accepted", 204: "No Content", 400: "Bad Request", 401: "Unauthorized", 404: "Not Found",
  409: "Conflict", 422: "Unprocessable Entity", 429: "Too Many Requests", 500: "Internal Server Error", 502: "Bad Gateway",
  503: "Service Unavailable", 504: "Gateway Timeout",
};
const FIRST = ["Ava", "Noah", "Mia", "Liam", "Zoe", "Ethan", "Ruby", "Owen", "Isla", "Leo"];
const LAST = ["Thompson", "Nguyen", "Patel", "Garcia", "Okafor", "Kim", "Rossi", "Murphy", "Silva", "Novak"];

type Rnd = () => number;

function mulberry(seed: number): Rnd {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clsOf = (s: number): StatusClass => (s >= 500 ? "5xx" : s >= 400 ? "4xx" : "2xx");
const pad = (n: number) => String(n).padStart(2, "0");
const pick = <T,>(rnd: Rnd, a: readonly T[]): T => a[Math.floor(rnd() * a.length)];
function randId(rnd: Rnd, prefix: string, len: number): string {
  let s = "";
  for (let i = 0; i < len; i++) s += "abcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(rnd() * 36)];
  return prefix + s;
}
const formatTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
const formatLatency = (ms: number) => (ms >= 1000 ? `${(ms / 1000).toFixed(ms >= 10000 ? 0 : 1)} s` : `${ms} ms`);

function generate(rnd: Rnd, accountList: string[], at: Date, force?: "fail"): WebhookEventInput {
  const r = rnd;
  const accounts = accountList.length ? accountList : ["Brightside Dental"];
  const account = pick(r, accounts);
  const person = `${pick(r, FIRST)} ${pick(r, LAST)}`;
  const email = person.toLowerCase().replace(" ", ".") + "@example.com";
  const iso = at.toISOString();
  const kinds: Array<[string, string, string, () => JsonValue]> = [
    ["contact.created", "POST", "/hooks/crm/contacts", () => ({ contact: { id: randId(r, "con_", 8), name: person, email, source: pick(r, ["Website form", "Social lead form", "Chat widget"]), tags: ["new-lead"] } })],
    ["form.submitted", "POST", "/hooks/forms/submissions", () => ({ form: { id: randId(r, "frm_", 6), name: pick(r, ["Free consultation", "Get a quote", "Book a tour"]) }, fields: { name: person, email, consent: true }, page: "/offers/fall" })],
    ["appointment.booked", "POST", "/hooks/calendar/appointments", () => ({ appointment: { id: randId(r, "apt_", 8), type: "Discovery call", starts_at: new Date(at.getTime() + (2 + Math.floor(r() * 5)) * 864e5).toISOString().slice(0, 16) + "Z", duration_minutes: 30, contact: { name: person, email } } })],
    ["invoice.paid", "POST", "/hooks/payments/invoices", () => ({ invoice: { id: randId(r, "inv_", 8), number: `INV-${1040 + Math.floor(r() * 60)}`, amount: Math.round(450 + r() * 2400), currency: "USD", paid_at: iso } })],
    ["payment.failed", "POST", "/hooks/payments/charges", () => ({ charge: { id: randId(r, "ch_", 10), amount: Math.round(99 + r() * 900), currency: "USD", failure_code: pick(r, ["card_declined", "insufficient_funds", "expired_card"]) }, retry_scheduled: true })],
    ["message.received", "POST", "/hooks/inbox/messages", () => ({ message: { id: randId(r, "msg_", 8), channel: pick(r, ["SMS", "Email", "Web chat"]), from: person, preview: pick(r, ["Is the offer still on?", "Can I move my booking?", "Thanks, see you Tuesday!"]) } })],
    ["opportunity.updated", "PUT", "/hooks/crm/opportunities", () => {
      const st = ["New", "Qualified", "Proposal", "Won"];
      const i = Math.floor(r() * 3);
      return { opportunity: { id: randId(r, "opp_", 8), name: `${account} · retainer`, stage: { from: st[i], to: st[i + 1] }, value: Math.round(1200 + r() * 6000) } };
    }],
    ["contact.deleted", "DELETE", "/hooks/crm/contacts", () => ({ contact: { id: randId(r, "con_", 8) }, reason: "Unsubscribed" })],
  ];
  const weights = [22, 20, 14, 12, 7, 14, 8, 3];
  let roll = r() * weights.reduce((a, b) => a + b, 0);
  let k = 0;
  while (roll > weights[k]) {
    roll -= weights[k];
    k++;
  }
  const [name, method, path, build] = kinds[Math.min(k, kinds.length - 1)];
  const s = force === "fail" ? 0.93 + r() * 0.07 : r();
  const status = s < 0.82 ? pick(r, [200, 200, 200, 200, 201, 202, 204]) : s < 0.92 ? pick(r, [400, 401, 404, 409, 422, 429]) : pick(r, [500, 502, 503, 504]);
  const latency =
    status === 504 ? 10000 : status >= 500 ? Math.round(700 + r() * 2300) : status >= 400 ? Math.round(18 + r() * 170) : Math.round(38 + r() * r() * 420);
  return { name, method, path, status, latency, at, account, payload: build() };
}

const RESPONSES: Record<number, JsonValue> = {
  200: { received: true },
  201: { received: true, stored: true },
  202: { queued: true },
  204: null,
  400: { error: "bad_request", message: "Payload is missing data.id" },
  401: { error: "invalid_signature", message: "Signature header did not match the shared secret" },
  404: { error: "not_found", message: "No handler is registered for this path" },
  409: { error: "duplicate", message: "This event id was already processed" },
  422: { error: "validation_failed", field: "data.contact.email" },
  429: { error: "rate_limited", retry_after_seconds: 30 },
  500: { error: "internal_error", message: "Handler threw an exception" },
  502: { error: "bad_gateway", message: "Upstream app server returned an invalid response" },
  503: { error: "unavailable", message: "Receiver is in maintenance mode" },
  504: { error: "timeout", message: "No response within 10 seconds" },
};

function normalise(e: WebhookEventInput, rnd: Rnd, seq: number): WebhookEvent {
  const parsed = e.at instanceof Date ? e.at : e.at ? new Date(e.at) : new Date();
  const at = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  const status = Math.round(Number(e.status)) || 200;
  const id = e.id || randId(rnd, "evt_", 12);
  const account = e.account || "";
  const raw = e.payload;
  const payload: JsonValue =
    raw && typeof raw === "object" && !Array.isArray(raw) && "type" in raw
      ? raw
      : { id, type: e.name || "event", created_at: at.toISOString(), ...(account ? { account: { name: account } } : {}), data: raw ?? {} };
  return {
    id,
    name: String(e.name || "event"),
    method: String(e.method || "POST").toUpperCase(),
    path: String(e.path || "/"),
    status,
    latency: Math.max(0, Math.round(Number(e.latency) || 0)),
    at,
    account,
    payload,
    attempt: e.attempt || 1,
    replayOf: e.replayOf || null,
    response: e.response !== undefined ? e.response : status in RESPONSES ? RESPONSES[status] : { status },
    headers: e.headers || null,
    seq,
  };
}

/** Request headers; the fake signature is derived from the id so it stays stable. */
function headersOf(ev: WebhookEvent): Record<string, string> {
  if (ev.headers) return ev.headers;
  let h = 2166136261;
  for (const c of ev.id) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  const rnd = mulberry(h >>> 0);
  let sig = "";
  for (let i = 0; i < 40; i++) sig += "0123456789abcdef"[Math.floor(rnd() * 16)];
  const out: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "LofiStack-Webhooks/2.4",
    "X-Webhook-Id": ev.id,
    "X-Webhook-Event": ev.name,
    "X-Webhook-Timestamp": String(Math.floor(ev.at.getTime() / 1000)),
    "X-Webhook-Signature": `sha256=${sig}`,
    "X-Webhook-Attempt": String(ev.attempt),
  };
  if (ev.replayOf) out["X-Webhook-Replay-Of"] = ev.replayOf;
  return out;
}

/* ------------------------------------------------------------------ */
/* Presentation helpers                                                */
/* ------------------------------------------------------------------ */

const P = ({ children }: { children: ReactNode }) => <span className="text-(--wem-j-p)">{children}</span>;

/** JSON pretty-printer that renders highlighted spans. */
function Json({ value, depth = 0 }: { value: JsonValue | undefined; depth?: number }): ReactNode {
  const ind = (n: number) => "  ".repeat(n);
  if (value === null || value === undefined) return <span className="text-(--wem-j-lit)">null</span>;
  if (typeof value === "boolean") return <span className="text-(--wem-j-lit)">{String(value)}</span>;
  if (typeof value === "number") return <span className="text-(--wem-j-num)">{String(value)}</span>;
  if (typeof value === "string") return <span className="text-(--wem-j-str)">{JSON.stringify(value)}</span>;
  if (Array.isArray(value)) {
    if (!value.length) return <P>[]</P>;
    return (
      <>
        <P>[</P>
        {"\n"}
        {value.map((x, i) => (
          <span key={i}>
            {ind(depth + 1)}
            <Json value={x} depth={depth + 1} />
            <P>{i < value.length - 1 ? "," : ""}</P>
            {"\n"}
          </span>
        ))}
        {ind(depth)}
        <P>]</P>
      </>
    );
  }
  const keys = Object.keys(value).filter((k) => value[k] !== undefined);
  if (!keys.length) return <P>{"{}"}</P>;
  return (
    <>
      <P>{"{"}</P>
      {"\n"}
      {keys.map((k, i) => (
        <span key={k}>
          {ind(depth + 1)}
          <span className="text-(--wem-j-key)">{JSON.stringify(k)}</span>
          <P>: </P>
          <Json value={value[k]} depth={depth + 1} />
          <P>{i < keys.length - 1 ? "," : ""}</P>
          {"\n"}
        </span>
      ))}
      {ind(depth)}
      <P>{"}"}</P>
    </>
  );
}

const Icon = ({ d, className }: { d: ReactNode; className?: string }) => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={cx("size-3.5 flex-none", className)}>
    {d}
  </svg>
);
const ICON = {
  hook: (
    <>
      <path d="M6 3.5a2.5 2.5 0 1 1 3.5 2.3L8 9.5" />
      <path d="M4.4 9.2A2.5 2.5 0 1 0 6.5 13h4" />
      <path d="M10.5 13a2.5 2.5 0 1 0-1-4.8" />
    </>
  ),
  pause: <path d="M5.5 3.5v9M10.5 3.5v9" />,
  play: <path d="M5 3.2v9.6L12.5 8z" />,
  search: (
    <>
      <circle cx="7" cy="7" r="4.2" />
      <path d="m10.2 10.2 3.3 3.3" />
    </>
  ),
  replay: (
    <>
      <path d="M2.8 7.5A5.2 5.2 0 1 1 4.3 11.6" />
      <path d="M2.5 3.5v4h4" />
    </>
  ),
  copy: (
    <>
      <rect x="5.5" y="5.5" width="8" height="8" rx="1.6" />
      <path d="M10.5 5.5V4A1.5 1.5 0 0 0 9 2.5H4A1.5 1.5 0 0 0 2.5 4v5A1.5 1.5 0 0 0 4 10.5h1.5" />
    </>
  ),
};

const ring = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--wem-accent)";
const btn = cx(
  "inline-flex min-h-8 cursor-pointer appearance-none items-center justify-center gap-1.5 rounded-md border border-(--wem-line) bg-(--wem-card) px-3 font-(family-name:--wem-sans) text-[12.5px] leading-none font-semibold text-(--wem-ink) shadow-[0_1px_0_rgba(31,35,40,0.04)] transition-[background-color,border-color,color] duration-150 enabled:hover:border-(--wem-faint) enabled:hover:bg-(--wem-hover) disabled:cursor-default disabled:opacity-50 motion-reduce:transition-none",
  ring
);
const btnPrimary =
  "border-(--wem-accent) bg-(--wem-accent) text-(--wem-card) enabled:hover:border-transparent enabled:hover:bg-[color-mix(in_oklab,var(--wem-accent),#000_14%)]";

const CODE_TONE: Record<StatusClass, string> = {
  "2xx": "text-(--wem-ok) bg-(--wem-ok-bg)",
  "4xx": "text-(--wem-warn) bg-(--wem-warn-bg)",
  "5xx": "text-(--wem-err) bg-(--wem-err-bg)",
};
const TONE_TEXT = { ok: "text-(--wem-ok)", warn: "text-(--wem-warn)", err: "text-(--wem-err)", "": "" } as const;

function StatusCode({ status, className }: { status: number; className?: string }) {
  return (
    <span
      title={STATUS_TEXT[status] || ""}
      className={cx(
        "inline-flex min-w-[38px] items-center justify-center rounded-[10px] px-1.5 py-[3px] font-(family-name:--wem-mono) text-[11.5px] leading-none font-semibold tabular-nums",
        CODE_TONE[clsOf(status)],
        className
      )}
    >
      {status}
    </span>
  );
}

const FILTERS: Array<{ value: WebhookFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "2xx", label: "2xx" },
  { value: "4xx", label: "4xx" },
  { value: "5xx", label: "5xx" },
];
const TABS: Array<{ value: InspectorTab; label: string }> = [
  { value: "payload", label: "Payload" },
  { value: "headers", label: "Headers" },
  { value: "response", label: "Response" },
];

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

/**
 * A developer log of webhook deliveries arriving live. Filter by status class or
 * event name, inspect headers and a highlighted JSON payload, and replay a failed delivery.
 */
export function WebhookMonitor({
  title = "Webhook events",
  environment,
  endpoint = "",
  seed = 2041,
  initial = 18,
  max = 60,
  accounts = [],
  simulate = true,
  interval = 2400,
  events: initialEvents,
  paused: pausedProp,
  defaultPaused = false,
  onStreamChange,
  onSelect,
  onReplay,
  ref,
  className,
}: WebhookMonitorProps) {
  const uid = useId();
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [selected, setSelected] = useState<WebhookEvent | null>(null);
  const [ready, setReady] = useState(false);
  const [filter, setFilter] = useState<WebhookFilter>("all");
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<InspectorTab>("payload");
  const [pausedState, setPausedState] = useState(defaultPaused);
  const [copyLabel, setCopyLabel] = useState<string | null>(null);
  const [live, setLive] = useState("");
  const paused = pausedProp ?? pausedState;

  const rnd = useRef<Rnd>(mulberry(seed));
  const seq = useRef(0);
  const eventsRef = useRef<WebhookEvent[]>([]);
  const selectedRef = useRef<WebhookEvent | null>(null);
  const cfg = useRef({ max, accounts, onSelect, onReplay, onStreamChange });
  const rowBtns = useRef(new Map<string, HTMLButtonElement>());
  const preRef = useRef<HTMLPreElement>(null);
  const copyTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    cfg.current = { max, accounts, onSelect, onReplay, onStreamChange };
  });
  useEffect(() => {
    eventsRef.current = events;
  }, [events]);
  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);
  useEffect(() => () => window.clearTimeout(copyTimer.current), []);

  const say = useCallback((t: string) => {
    setLive("");
    requestAnimationFrame(() => setLive(t));
  }, []);

  // reduced motion: start paused
  useEffect(() => {
    if (pausedProp === undefined && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) setPausedState(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // build the starting backlog on the client (times are local, so never during SSR)
  const resetKey = JSON.stringify({ seed, initial, simulate, accounts, initialEvents });
  useEffect(() => {
    rnd.current = mulberry(seed || 2041);
    seq.current = 0;
    const r = rnd.current;
    let list: WebhookEvent[] = [];
    if (initialEvents && initialEvents.length) {
      list = initialEvents.map((e) => normalise(e, r, ++seq.current));
    } else if (simulate) {
      const n = Math.max(0, Math.min(initial, 60));
      let t = Date.now() - 1500;
      for (let i = 0; i < n; i++) {
        list.push(normalise(generate(r, accounts, new Date(t)), r, ++seq.current));
        t -= Math.round(6000 + r() * 22000);
      }
    }
    eventsRef.current = list;
    const first = list.find((e) => e.status >= 500) || list[0] || null;
    selectedRef.current = first;
    setEvents(list);
    setSelected(first);
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  const addEvent = useCallback((input: WebhookEventInput): WebhookEvent => {
    const ev = normalise(input, rnd.current, ++seq.current);
    ev.born = Date.now();
    const cap = Math.max(10, cfg.current.max || 60);
    const next = [ev, ...eventsRef.current].slice(0, cap);
    eventsRef.current = next;
    setEvents(next);
    if (!selectedRef.current) {
      selectedRef.current = ev;
      setSelected(ev);
    }
    return ev;
  }, []);

  const select = useCallback((id: string) => {
    const ev = eventsRef.current.find((x) => x.id === id);
    if (!ev) return;
    selectedRef.current = ev;
    setSelected(ev);
    cfg.current.onSelect?.({ id: ev.id, name: ev.name, status: ev.status });
  }, []);

  const replay = useCallback(
    (id: string): WebhookEvent | null => {
      const orig = eventsRef.current.find((x) => x.id === id) || (selectedRef.current?.id === id ? selectedRef.current : null);
      if (!orig) return null;
      const r = rnd.current;
      const transient = orig.status >= 500 || orig.status === 429;
      const status = transient ? 200 : orig.status;
      const ev = addEvent({
        name: orig.name,
        method: orig.method,
        path: orig.path,
        payload: orig.payload,
        account: orig.account,
        status,
        latency: Math.round(status < 300 ? 40 + r() * r() * 380 : 20 + r() * 160),
        replayOf: orig.id,
        attempt: (orig.attempt || 1) + 1,
      });
      selectedRef.current = ev;
      setSelected(ev);
      say(`Replayed ${orig.name}. New delivery returned ${status} ${STATUS_TEXT[status] || ""}.`);
      cfg.current.onReplay?.({
        name: orig.name,
        original: { id: orig.id, status: orig.status },
        replay: { id: ev.id, status: ev.status, latency: ev.latency },
      });
      return ev;
    },
    [addEvent, say]
  );

  const setPaused = useCallback(
    (next: boolean) => {
      if (pausedProp === undefined) setPausedState(next);
      say(next ? "Live updates paused." : "Live updates resumed.");
      cfg.current.onStreamChange?.(next);
    },
    [pausedProp, say]
  );

  const simulateFailure = useCallback(
    () => addEvent(generate(rnd.current, cfg.current.accounts, new Date(), "fail")),
    [addEvent]
  );

  useImperativeHandle(
    ref,
    () => ({
      addEvent,
      simulateFailure,
      select,
      replay,
      pause: () => paused || setPaused(true),
      resume: () => paused && setPaused(false),
      get events() {
        return eventsRef.current.slice();
      },
    }),
    [addEvent, simulateFailure, select, replay, paused, setPaused]
  );

  // the simulated stream; skips ticks while the tab is hidden
  useEffect(() => {
    if (!ready || paused || !simulate) return;
    let timer: number | undefined;
    const base = Math.max(600, interval || 2400);
    const tick = () => {
      const wait = Math.round(base * (0.6 + rnd.current() * 0.8));
      timer = window.setTimeout(() => {
        if (!document.hidden) addEvent(generate(rnd.current, cfg.current.accounts, new Date()));
        tick();
      }, wait);
    };
    tick();
    return () => window.clearTimeout(timer);
  }, [ready, paused, simulate, interval, addEvent]);

  /* derived values */
  const q = query.trim().toLowerCase();
  const matchesQuery = useCallback((e: WebhookEvent) => !q || e.name.toLowerCase().includes(q) || e.id.toLowerCase().includes(q), [q]);
  const searched = useMemo(() => events.filter(matchesQuery), [events, matchesQuery]);
  const visible = useMemo(() => searched.filter((e) => filter === "all" || clsOf(e.status) === filter), [searched, filter]);
  const counts = useMemo(() => {
    const c: Record<WebhookFilter, number> = { all: searched.length, "2xx": 0, "4xx": 0, "5xx": 0 };
    searched.forEach((e) => c[clsOf(e.status)]++);
    return c;
  }, [searched]);

  const n = events.length;
  const ok = events.filter((e) => e.status < 400).length;
  const fail = n - ok;
  const rate = n ? (ok / n) * 100 : 0;
  const lats = events.map((e) => e.latency).sort((a, b) => a - b);
  const p95 = lats.length ? lats[Math.min(lats.length - 1, Math.ceil(lats.length * 0.95) - 1)] : 0;
  const stats: Array<{ label: string; value: string; unit?: string; tone: keyof typeof TONE_TEXT }> = [
    { label: "Deliveries", value: n.toLocaleString("en-US"), tone: "" },
    { label: "Success rate", value: n ? (rate === 100 ? "100" : rate.toFixed(1)) : "—", unit: n ? "%" : "", tone: !n ? "" : rate >= 95 ? "ok" : rate >= 85 ? "warn" : "err" },
    {
      label: "p95 latency",
      value: lats.length ? (p95 >= 1000 ? (p95 / 1000).toFixed(1) : String(p95)) : "—",
      unit: lats.length ? (p95 >= 1000 ? "s" : "ms") : "",
      tone: p95 >= 3000 ? "err" : p95 >= 1000 ? "warn" : "",
    },
    { label: "Failed", value: String(fail), unit: `of ${n}`, tone: fail ? "err" : "ok" },
  ];

  const headers = selected ? headersOf(selected) : null;
  const panelId = `${uid}-panel`;
  const tabId = (t: InspectorTab) => `${uid}-tab-${t}`;
  const now = Date.now();

  /* handlers */
  const onRowsKey = (e: KeyboardEvent<HTMLTableSectionElement>) => {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
    const ids = visible.map((v) => v.id);
    const i = ids.findIndex((id) => rowBtns.current.get(id) === document.activeElement);
    if (i < 0) return;
    e.preventDefault();
    const next = e.key === "Home" ? 0 : e.key === "End" ? ids.length - 1 : Math.max(0, Math.min(ids.length - 1, i + (e.key === "ArrowDown" ? 1 : -1)));
    rowBtns.current.get(ids[next])?.focus();
    select(ids[next]);
  };

  const onRowClick = (e: MouseEvent<HTMLTableRowElement>, id: string) => {
    select(id);
    if (!(e.target as HTMLElement).closest("button")) rowBtns.current.get(id)?.focus({ preventScroll: true });
  };

  const onTabsKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const i = TABS.findIndex((t) => t.value === tab);
    const next = TABS[(i + (e.key === "ArrowRight" ? 1 : -1) + TABS.length) % TABS.length].value;
    setTab(next);
    document.getElementById(tabId(next))?.focus();
  };

  const copyDone = (label: string) => {
    setCopyLabel(label);
    window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopyLabel(null), 1600);
  };
  const copyPayload = async () => {
    if (!selected) return;
    const text = JSON.stringify(selected.payload, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      copyDone("Copied");
      say("Payload copied.");
    } catch {
      setTab("payload");
      requestAnimationFrame(() => {
        if (!preRef.current) return;
        const range = document.createRange();
        range.selectNodeContents(preRef.current);
        const sel = getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      });
      copyDone("Selected");
      say("Clipboard unavailable. Payload text selected.");
    }
  };

  const th = "sticky top-0 z-[1] border-b border-(--wem-line) bg-(--wem-canvas) px-2.5 py-2 text-left font-(family-name:--wem-sans) text-[11px] leading-[1.2] font-semibold whitespace-nowrap text-(--wem-faint)";
  const td =
    "h-[38px] overflow-hidden border-b border-(--wem-line-soft) px-2.5 align-middle text-ellipsis whitespace-nowrap @max-[519px]:block @max-[519px]:h-auto @max-[519px]:w-auto @max-[519px]:border-0 @max-[519px]:p-0";

  return (
    <div className={cx("@container block w-full max-w-[980px] font-(family-name:--wem-sans) text-(--wem-ink)", className)}>
      <div className="relative overflow-hidden rounded-xl border border-(--wem-line) bg-(--wem-card) shadow-[0_24px_50px_-40px_var(--wem-shadow),0_1px_3px_-1px_var(--wem-shadow)] @max-[519px]:rounded-[10px]">
        {/* top bar */}
        <header className="flex flex-wrap items-center justify-between gap-x-[18px] gap-y-3 border-b border-(--wem-line) bg-(--wem-canvas) px-[18px] py-3.5 @max-[519px]:px-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-[34px] flex-none place-items-center rounded-lg bg-(--wem-card) text-(--wem-accent) shadow-[inset_0_0_0_1px_var(--wem-line)]">
              <Icon d={ICON.hook} className="size-[18px]" />
            </span>
            <div className="grid min-w-0 gap-1">
              <h2 className="m-0 text-[15px] leading-[1.2] font-semibold">{title}</h2>
              <p className="m-0 flex flex-wrap items-center gap-2 font-(family-name:--wem-mono) text-xs leading-[1.2] text-(--wem-muted)">
                {environment && (
                  <span className="rounded px-1.5 py-0.5 font-(family-name:--wem-mono) text-[10.5px] leading-[1.3] font-semibold tracking-[0.04em] text-(--wem-accent) uppercase bg-(--wem-accent-soft)">
                    {environment}
                  </span>
                )}
                <span>{endpoint}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 @max-[519px]:w-full @max-[519px]:justify-between">
            <span className={cx("inline-flex items-center gap-[7px] text-xs leading-none font-semibold", paused ? "text-(--wem-muted)" : "text-(--wem-ok)")}>
              <i
                aria-hidden="true"
                className={cx(
                  "relative size-2 rounded-full",
                  paused
                    ? "bg-(--wem-faint)"
                    : "bg-(--wem-ok) after:absolute after:-inset-1 after:animate-[wem-ping_1.6s_ease-out_infinite] after:rounded-full after:border-2 after:border-(--wem-ok) after:opacity-0 after:content-[''] motion-reduce:after:animate-none"
                )}
              />
              <span>{paused ? "Paused" : "Live"}</span>
            </span>
            <button type="button" className={btn} onClick={() => setPaused(!paused)} aria-label={paused ? "Resume live updates" : "Pause live updates"}>
              <Icon d={paused ? ICON.play : ICON.pause} />
              <span>{paused ? "Resume" : "Pause"}</span>
            </button>
          </div>
        </header>

        {/* stats */}
        <dl className="m-0 grid grid-cols-4 border-b border-(--wem-line) @max-[759px]:grid-cols-2">
          {stats.map((s, i) => (
            <div
              key={s.label}
              className={cx(
                "grid min-w-0 gap-[5px] px-[18px] py-3 @max-[519px]:px-3 @max-[519px]:py-2.5",
                i > 0 && "border-l border-(--wem-line-soft)",
                i === 2 && "@max-[759px]:border-l-0",
                i >= 2 && "@max-[759px]:border-t @max-[759px]:border-(--wem-line-soft)"
              )}
            >
              <dt className="text-[11px] leading-[1.2] font-medium text-(--wem-faint)">{s.label}</dt>
              <dd
                className={cx(
                  "m-0 font-(family-name:--wem-mono) text-lg leading-[1.1] font-semibold tracking-[-0.01em] tabular-nums @max-[519px]:text-base",
                  TONE_TEXT[s.tone]
                )}
              >
                {s.value}
                {s.unit && <small className="ml-[3px] font-(family-name:--wem-mono) text-[11.5px] leading-none font-medium tracking-normal text-(--wem-faint)">{s.unit}</small>}
              </dd>
            </div>
          ))}
        </dl>

        {/* filters */}
        <div className="flex flex-wrap items-center justify-between gap-x-3.5 gap-y-2.5 border-b border-(--wem-line) px-[18px] py-2.5 @max-[519px]:px-3">
          <div role="group" aria-label="Filter by status" className="inline-flex overflow-hidden rounded-md border border-(--wem-line) @max-[519px]:w-full">
            {FILTERS.map((f, i) => (
              <button
                key={f.value}
                type="button"
                aria-pressed={filter === f.value}
                onClick={() => setFilter(f.value)}
                className={cx(
                  "inline-flex cursor-pointer appearance-none items-center gap-[7px] border-0 bg-(--wem-card) px-[11px] py-[7px] font-(family-name:--wem-sans) text-xs leading-none font-semibold text-(--wem-muted) transition-[background-color,color] duration-150 hover:bg-(--wem-hover) hover:text-(--wem-ink) aria-pressed:bg-(--wem-sel) aria-pressed:text-(--wem-ink) aria-pressed:shadow-[inset_0_-2px_0_var(--wem-accent)] motion-reduce:transition-none @max-[519px]:flex-1 @max-[519px]:justify-center @max-[519px]:gap-[5px] @max-[519px]:px-1.5",
                  i > 0 && "border-l border-solid border-(--wem-line)",
                  ring
                )}
              >
                {f.label}
                <b
                  className={cx(
                    "rounded-[10px] px-[5px] py-0.5 font-(family-name:--wem-mono) text-[11px] leading-none font-semibold tabular-nums",
                    f.value === "all" ? "bg-(--wem-line-soft) text-(--wem-muted)" : CODE_TONE[f.value]
                  )}
                >
                  {counts[f.value]}
                </b>
              </button>
            ))}
          </div>
          <label className="relative flex min-w-0 flex-[0_1_260px] items-center @max-[519px]:basis-full">
            <Icon d={ICON.search} className="pointer-events-none absolute left-[9px] text-(--wem-faint)" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by event name"
              aria-label="Filter by event name"
              autoComplete="off"
              spellCheck={false}
              className="box-border min-h-8 w-full rounded-md border border-(--wem-line) bg-(--wem-canvas) py-1.5 pr-2.5 pl-[30px] font-(family-name:--wem-mono) text-[12.5px] leading-[1.2] text-(--wem-ink) transition-[border-color,box-shadow,background-color] duration-150 placeholder:text-(--wem-faint) focus:border-(--wem-accent) focus:bg-(--wem-card) focus:shadow-[0_0_0_3px_var(--wem-accent-soft)] focus:outline-none motion-reduce:transition-none"
            />
          </label>
        </div>

        {/* stream + inspector */}
        <div className="grid min-h-0 grid-cols-[minmax(0,1fr)_340px] @max-[759px]:grid-cols-1">
          <div className="relative min-h-[300px] min-w-0 border-r border-(--wem-line) @max-[759px]:min-h-0 @max-[759px]:border-r-0 @max-[759px]:border-b">
            <div className="absolute inset-0 overflow-auto [scrollbar-width:thin] @max-[759px]:static @max-[759px]:max-h-[340px] @max-[519px]:max-h-[360px]">
              <table className="w-full table-fixed border-separate border-spacing-0 font-(family-name:--wem-mono) text-[12.5px] leading-[1.3] @max-[519px]:block">
                <caption className="sr-only">Webhook deliveries, newest first</caption>
                <thead className="@max-[519px]:absolute @max-[519px]:size-px @max-[519px]:overflow-hidden @max-[519px]:[clip:rect(0_0_0_0)]">
                  <tr>
                    <th scope="col" className={cx(th, "w-[62px] pl-4")}>Time</th>
                    <th scope="col" className={th}>Event</th>
                    <th scope="col" className={cx(th, "w-[31%] @max-[759px]:w-[40%]")}>Method · endpoint</th>
                    <th scope="col" className={cx(th, "w-12")}>Status</th>
                    <th scope="col" className={cx(th, "w-14 pr-4 text-right!")}>Latency</th>
                  </tr>
                </thead>
                <tbody onKeyDown={onRowsKey} className="@max-[519px]:block">
                  {visible.map((ev) => {
                    const isSel = selected?.id === ev.id;
                    const isNew = ev.born != null && now - ev.born < 1200;
                    return (
                      <tr
                        key={ev.id}
                        onClick={(e) => onRowClick(e, ev.id)}
                        className={cx(
                          "cursor-pointer transition-[background-color] duration-200 motion-reduce:transition-none @max-[519px]:grid @max-[519px]:grid-cols-[minmax(0,1fr)_auto] @max-[519px]:gap-x-2.5 @max-[519px]:gap-y-1 @max-[519px]:border-b @max-[519px]:border-(--wem-line-soft) @max-[519px]:px-3 @max-[519px]:py-2.5 @max-[519px]:[grid-template-areas:'event_status'_'path_path'_'time_lat']",
                          isSel ? "bg-(--wem-sel) @max-[519px]:shadow-[inset_3px_0_0_var(--wem-accent)]" : "hover:bg-(--wem-hover)",
                          isNew && "animate-[wem-flash_1.4s_ease-out] motion-reduce:animate-none"
                        )}
                      >
                        <td
                          title={ev.at.toISOString()}
                          className={cx(
                            td,
                            "pl-4 text-(--wem-faint) tabular-nums @max-[519px]:text-[11.5px] @max-[519px]:[grid-area:time]",
                            isSel && "shadow-[inset_3px_0_0_var(--wem-accent)] @max-[519px]:shadow-none"
                          )}
                        >
                          {formatTime(ev.at)}
                        </td>
                        <td className={cx(td, "@max-[519px]:[grid-area:event]")}>
                          <button
                            type="button"
                            ref={(el) => {
                              if (el) rowBtns.current.set(ev.id, el);
                              else rowBtns.current.delete(ev.id);
                            }}
                            aria-current={isSel ? "true" : undefined}
                            aria-label={`${ev.name}${ev.replayOf ? " (replay)" : ""}, ${ev.status} ${STATUS_TEXT[ev.status] || ""}, ${formatLatency(ev.latency)}, at ${formatTime(ev.at)}`}
                            className={cx(
                              "m-0 inline-flex max-w-full cursor-pointer appearance-none items-center gap-[7px] overflow-hidden rounded-[3px] border-0 bg-transparent p-0 text-left font-(family-name:--wem-mono) text-[12.5px] leading-[1.3] font-medium text-(--wem-ink)",
                              ring
                            )}
                          >
                            <span className="overflow-hidden text-ellipsis">{ev.name}</span>
                            {ev.replayOf && (
                              <span className="flex-none rounded px-[5px] py-px font-(family-name:--wem-sans) text-[10px] leading-[1.4] font-semibold tracking-[0.03em] text-(--wem-accent) uppercase bg-(--wem-accent-soft)">
                                replay
                              </span>
                            )}
                          </button>
                        </td>
                        <td title={`${ev.method} ${ev.path}`} className={cx(td, "text-(--wem-muted) @max-[519px]:text-[11.5px] @max-[519px]:[grid-area:path]")}>
                          <span className="mr-1.5 inline-block min-w-[3.4em] font-(family-name:--wem-mono) text-[11px] leading-none font-semibold text-(--wem-accent)">{ev.method}</span>
                          {ev.path}
                        </td>
                        <td className={cx(td, "@max-[519px]:justify-self-end @max-[519px]:[grid-area:status]")}>
                          <StatusCode status={ev.status} />
                        </td>
                        <td className={cx(td, "pr-4 text-right tabular-nums @max-[519px]:text-left @max-[519px]:text-[11.5px] @max-[519px]:[grid-area:lat]")}>
                          <span className={ev.latency >= 10000 ? "text-(--wem-err)" : ev.latency >= 1000 ? "text-(--wem-warn)" : undefined}>{formatLatency(ev.latency)}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {visible.length === 0 && (
                <p className="m-0 px-[18px] py-9 text-center text-[13px] text-(--wem-muted)">
                  {events.length ? "No deliveries match these filters." : "Waiting for the first delivery…"}
                </p>
              )}
            </div>
          </div>

          {/* inspector */}
          <aside aria-label="Delivery details" className="grid min-w-0 grid-rows-[auto_auto_auto_1fr_auto] bg-(--wem-card)">
            <div className="grid gap-1.5 border-b border-(--wem-line-soft) px-4 pt-3.5 pb-3 @max-[519px]:px-3">
              <div className="flex min-w-0 items-center gap-2">
                {selected && <StatusCode status={selected.status} />}
                <h3 className="m-0 font-(family-name:--wem-mono) text-sm leading-[1.3] font-semibold [overflow-wrap:anywhere]">{selected ? selected.name : "No delivery selected"}</h3>
              </div>
              <span className="font-(family-name:--wem-mono) text-[11.5px] leading-[1.3] text-(--wem-faint) [overflow-wrap:anywhere]">{selected?.id ?? ""}</span>
            </div>
            <dl className="m-0 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3.5 gap-y-1.5 border-b border-(--wem-line-soft) px-4 py-2.5 text-xs empty:hidden @max-[519px]:px-3">
              {selected && (
                <>
                  {[
                    ["Delivered", `${selected.at.getFullYear()}-${pad(selected.at.getMonth() + 1)}-${pad(selected.at.getDate())} ${formatTime(selected.at)}`],
                    ["Request", `${selected.method} ${selected.path}`],
                    ["Response", `${selected.status} ${STATUS_TEXT[selected.status] || ""} · ${formatLatency(selected.latency)}`],
                    ["Attempt", String(selected.attempt)],
                  ].map(([k, v]) => (
                    <MetaRow key={k} label={k}>
                      {v}
                    </MetaRow>
                  ))}
                  {selected.replayOf && (
                    <MetaRow label="Replay of">
                      <button
                        type="button"
                        disabled={!events.some((x) => x.id === selected.replayOf)}
                        onClick={() => selected.replayOf && select(selected.replayOf)}
                        className={cx(
                          "cursor-pointer appearance-none rounded-[2px] border-0 bg-transparent p-0 font-[inherit] text-(--wem-accent) underline underline-offset-2 disabled:cursor-default disabled:text-(--wem-faint) disabled:no-underline",
                          ring
                        )}
                      >
                        {selected.replayOf}
                      </button>
                    </MetaRow>
                  )}
                </>
              )}
            </dl>
            <div role="tablist" aria-label="Delivery details" onKeyDown={onTabsKey} className="flex gap-0.5 border-b border-(--wem-line) px-3">
              {TABS.map((t) => (
                <button
                  key={t.value}
                  id={tabId(t.value)}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.value}
                  aria-controls={panelId}
                  tabIndex={tab === t.value ? 0 : -1}
                  onClick={() => setTab(t.value)}
                  className={cx(
                    "relative cursor-pointer appearance-none border-0 bg-transparent px-2 pt-2.5 pb-[9px] font-(family-name:--wem-sans) text-xs leading-none font-semibold text-(--wem-muted) transition-colors duration-150 hover:text-(--wem-ink) aria-selected:text-(--wem-ink) aria-selected:after:absolute aria-selected:after:right-1.5 aria-selected:after:-bottom-px aria-selected:after:left-1.5 aria-selected:after:h-0.5 aria-selected:after:rounded-[2px] aria-selected:after:bg-(--wem-accent) aria-selected:after:content-[''] motion-reduce:transition-none",
                    ring
                  )}
                >
                  {t.label}
                  {t.value === "headers" && headers && <b className="ml-1 font-(family-name:--wem-mono) text-[10.5px] leading-none font-semibold text-(--wem-faint)">{Object.keys(headers).length}</b>}
                </button>
              ))}
            </div>
            <div
              id={panelId}
              role="tabpanel"
              tabIndex={0}
              aria-labelledby={tabId(tab)}
              className={cx("h-[214px] min-h-0 overflow-auto bg-(--wem-canvas) [scrollbar-width:thin] @max-[759px]:h-auto @max-[759px]:max-h-[300px]", ring)}
            >
              <pre
                ref={preRef}
                className="m-0 px-4 pt-3 pb-3.5 font-(family-name:--wem-mono) text-xs leading-[1.65] whitespace-pre-wrap text-(--wem-ink) [overflow-wrap:anywhere] [tab-size:2] @max-[519px]:px-3"
              >
                {!selected ? (
                  <P>Select a delivery to inspect it.</P>
                ) : tab === "headers" && headers ? (
                  Object.keys(headers).map((k, i) => (
                    <span key={k}>
                      {i > 0 && "\n"}
                      <span className="text-(--wem-j-key)">{k}</span>
                      <P>: </P>
                      {headers[k]}
                    </span>
                  ))
                ) : tab === "response" ? (
                  <>
                    <span className="text-(--wem-j-lit)">{`HTTP/1.1 ${selected.status} ${STATUS_TEXT[selected.status] || ""}`}</span>
                    {"\n"}
                    {selected.response == null ? (
                      <P>(empty body)</P>
                    ) : (
                      <>
                        <span className="text-(--wem-j-key)">Content-Type</span>
                        <P>: </P>
                        {"application/json\n\n"}
                        <Json value={selected.response} />
                      </>
                    )}
                  </>
                ) : (
                  <Json value={selected.payload} />
                )}
              </pre>
            </div>
            <div className="flex flex-wrap gap-2 border-t border-(--wem-line) px-4 py-3 @max-[519px]:px-3">
              <button type="button" disabled={!selected} onClick={() => selected && replay(selected.id)} className={cx(btn, btnPrimary, "flex-1")}>
                <Icon d={ICON.replay} />
                <span>Replay</span>
              </button>
              <button
                type="button"
                disabled={!selected}
                onClick={copyPayload}
                className={cx(btn, "flex-1", copyLabel && "border-(--wem-ok) text-(--wem-ok)")}
              >
                <Icon d={ICON.copy} />
                <span>{copyLabel ?? "Copy payload"}</span>
              </button>
            </div>
          </aside>
        </div>
        <p className="sr-only" aria-live="polite">
          {live}
        </p>
      </div>
    </div>
  );
}

function MetaRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-(--wem-faint)">{label}</dt>
      <dd className="m-0 font-(family-name:--wem-mono) text-xs leading-[1.35] text-(--wem-ink) [overflow-wrap:anywhere] tabular-nums">{children}</dd>
    </>
  );
}

export default WebhookMonitor;
