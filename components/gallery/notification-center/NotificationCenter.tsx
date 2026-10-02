"use client";

import {
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type Ref,
} from "react";
import { cx } from "@/lib/format";

export type NotificationType = "mention" | "system";
export type NotificationTab = "all" | NotificationType;
export type NotificationIcon = "payment" | "warning" | "report" | "automation" | "integration";
export type NotificationReadSource = "click" | "action" | "all";

export interface NotificationAction {
  /** Button text. */
  label: string;
  /** Text shown once the action has been clicked. Defaults to `label`. */
  done?: string;
}

export interface NotificationItem {
  /** Unique key. Generated when left out. */
  id?: string;
  /** `mention` or `system`; sets which tab the item shows in. */
  type?: NotificationType;
  /** ISO date-time. Defaults to `now`. */
  time?: string;
  /** Whether it has been read. */
  read?: boolean;
  /** Mentions: who did it, e.g. "Maya Chen". */
  actor?: string;
  /** Mentions: what they did, e.g. "mentioned you in". */
  text?: string;
  /** Mentions: what it was about, e.g. "Q4 plan". */
  target?: string;
  /** System alerts: heading. */
  title?: string;
  /** System alerts: icon. */
  icon?: NotificationIcon;
  /** Optional second line or quote. */
  body?: string;
  /** Optional inline action button. */
  action?: NotificationAction;
}

export interface NotificationFooter {
  label: string;
  /** Without an href the footer is a button that calls `onFooterClick`. */
  href?: string;
}

export interface NotificationLabels {
  title: string;
  bell: string;
  bellUnread: string;
  markAll: string;
  tabs: string;
  all: string;
  mention: string;
  system: string;
  today: string;
  yesterday: string;
  earlier: string;
  justNow: string;
  minAgo: string;
  hAgo: string;
  dismiss: string;
  unread: string;
  newItem: string;
  readAll: string;
  dismissed: string;
  emptyAll: string;
  emptyAllSub: string;
  emptyMention: string;
  emptyMentionSub: string;
  emptySystem: string;
  emptySystemSub: string;
}

/** Imperative controls, reachable through `ref`. */
export interface NotificationCenterHandle {
  /** Add a notification at the top. It rings the bell and is announced to screen readers. */
  add: (item: NotificationItem) => void;
  /** Open the panel. `focus` moves focus to the selected tab (default true). */
  show: (focus?: boolean) => void;
  /** Close the panel and return focus to the bell. */
  hide: () => void;
  toggle: () => void;
  /** Current unread count. */
  unread: () => number;
}

export interface NotificationCenterProps {
  /** Notifications. A new array replaces the current list. */
  items: NotificationItem[];
  /** Panel heading. */
  title?: string;
  /** ISO date-time used for "Today" and "min ago". Defaults to the current time (after mount). */
  now?: string;
  /** Optional link or button at the bottom of the panel. */
  footer?: NotificationFooter;
  /** Controlled open state. */
  open?: boolean;
  /** Initial open state when uncontrolled. */
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Controlled tab. */
  tab?: NotificationTab;
  /** Initial tab when uncontrolled. */
  defaultTab?: NotificationTab;
  onTabChange?: (tab: NotificationTab) => void;
  /** Called when items are marked read: by opening one, by its action, or with "Mark all as read". */
  onRead?: (ids: string[], source: NotificationReadSource) => void;
  /** Called after an item is dismissed. */
  onDismiss?: (id: string) => void;
  /** Called when an item's action button is clicked. */
  onAction?: (id: string, action: string) => void;
  /** Called when the footer is a button and gets clicked. */
  onFooterClick?: () => void;
  /** Override any built-in text. `{n}` and `{text}` are filled in. */
  labels?: Partial<NotificationLabels>;
  /** Date formatting locale. */
  locale?: string;
  /** Panel width in px; it never grows wider than the viewport minus 24px. */
  panelWidth?: number;
  /** Max height of the scrolling list in px. */
  listMaxHeight?: number;
  ref?: Ref<NotificationCenterHandle>;
  className?: string;
}

const LABELS: NotificationLabels = {
  title: "Notifications",
  bell: "Notifications",
  bellUnread: "Notifications, {n} unread",
  markAll: "Mark all as read",
  tabs: "Notification type",
  all: "All",
  mention: "Mentions",
  system: "System",
  today: "Today",
  yesterday: "Yesterday",
  earlier: "Earlier",
  justNow: "just now",
  minAgo: "{n} min ago",
  hAgo: "{n} h ago",
  dismiss: "Dismiss",
  unread: "Unread",
  newItem: "New notification: {text}",
  readAll: "{n} notifications marked as read",
  dismissed: "Notification dismissed",
  emptyAll: "You're all caught up",
  emptyAllSub: "New mentions and alerts will show up here.",
  emptyMention: "No mentions",
  emptyMentionSub: "When a teammate mentions you, you'll see it here.",
  emptySystem: "No system alerts",
  emptySystemSub: "Payments, reports and sync issues will appear here.",
};

const TABS: NotificationTab[] = ["all", "mention", "system"];
const HUES = ["#E11D48", "#7C3AED", "#0891B2", "#D97706", "#059669", "#2563EB"];
const EASE = "cubic-bezier(.2,.7,.2,1)";

interface Item extends NotificationItem {
  id: string;
  type: NotificationType;
  read: boolean;
  d: Date;
  done?: boolean;
}

const fill = (s: string, vars: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ""));
const initials = (s?: string) =>
  String(s || "?")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("") || "?";
const hueFor = (s: string) => {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return HUES[h % HUES.length];
};
const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const pad = (n: number) => String(n).padStart(2, "0");
/** Local ISO date-time without a zone, so it parses back to the same wall clock. */
const localISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
const parseTime = (s?: string) => {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
};
const plain = (i: Item) =>
  i.type === "system" ? `${i.title || ""}. ${i.body || ""}` : `${i.actor || ""} ${i.text || ""} ${i.target || ""}. ${i.body || ""}`;
const reduceMotion = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/* ---------- icons ---------- */
const svgBase = { fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;

const BellIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 20 20" strokeWidth="1.7" {...svgBase} className={className}>
    <path d="M5 8.2a5 5 0 0 1 10 0c0 3.6 1.4 5.1 2 5.8H3c.6-.7 2-2.2 2-5.8z" />
    <path d="M8.2 16.6a2 2 0 0 0 3.6 0" />
  </svg>
);
const ChecksIcon = () => (
  <svg viewBox="0 0 16 16" strokeWidth="1.6" {...svgBase} className="size-3.5">
    <path d="m1.5 8.6 2.8 2.8L10 5.6" />
    <path d="m7.8 11 .4.4L14 5.6" />
  </svg>
);
const XIcon = () => (
  <svg viewBox="0 0 12 12" strokeWidth="1.7" {...svgBase} className="size-3">
    <path d="m3 3 6 6M9 3 3 9" />
  </svg>
);
const AtIcon = () => (
  <svg viewBox="0 0 12 12" strokeWidth="1.6" {...svgBase} className="size-[9px]">
    <circle cx="6" cy="6" r="2" />
    <path d="M8 6v.8a1.4 1.4 0 0 0 2.8 0V6A4.8 4.8 0 1 0 8.6 10" />
  </svg>
);
const GearIcon = () => (
  <svg viewBox="0 0 16 16" strokeWidth="1.5" {...svgBase} className="size-[13px]">
    <circle cx="8" cy="8" r="2.2" />
    <path d="M8 1.8v1.6M8 12.6v1.6M14.2 8h-1.6M3.4 8H1.8M12.4 3.6l-1.1 1.1M4.7 11.3l-1.1 1.1M12.4 12.4l-1.1-1.1M4.7 4.7 3.6 3.6" />
  </svg>
);

const SYS: Record<NotificationIcon, { hue: string; paths: ReactNode }> = {
  payment: {
    hue: "var(--ntc-ok)",
    paths: (
      <>
        <rect x="2" y="4" width="14" height="10" rx="2" />
        <path d="M2 7.5h14M5 11h3" />
      </>
    ),
  },
  warning: {
    hue: "var(--ntc-warn)",
    paths: (
      <>
        <path d="M9 2.5 16 15H2z" />
        <path d="M9 7.5v3.2M9 12.9v.1" />
      </>
    ),
  },
  report: {
    hue: "var(--ntc-info)",
    paths: (
      <>
        <path d="M3 15V3M3 15h12" />
        <path d="M6.5 12V9M10 12V6M13.5 12V8" />
      </>
    ),
  },
  automation: { hue: "var(--ntc-accent)", paths: <path d="M10 2 4 10h5l-1 6 6-8H9z" /> },
  integration: {
    hue: "var(--ntc-info)",
    paths: (
      <>
        <path d="M7 4.5V2.5M11 4.5V2.5M5.5 4.5h7v3a3.5 3.5 0 0 1-7 0z" />
        <path d="M9 11v4.5" />
      </>
    ),
  },
};

const EmptyArt = () => (
  <svg viewBox="0 0 80 80" fill="none" aria-hidden="true" className="mb-1.5 size-[76px]">
    <circle cx="40" cy="40" r="34" className="fill-(--ntc-tint)" />
    <path
      d="M27 37a13 13 0 0 1 26 0c0 9 3.4 12.7 5 14.5H22c1.6-1.8 5-5.5 5-14.5z"
      className="fill-(--ntc-panel) stroke-(--ntc-faint)"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <path d="M35.5 57a5 5 0 0 0 9 0" className="stroke-(--ntc-faint)" strokeWidth="2" strokeLinecap="round" />
    <circle cx="55" cy="25" r="9" className="fill-(--ntc-accent)" />
    <path d="m51 25 2.8 2.8L59 22.6" className="stroke-(--ntc-on-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ntc-accent)";

/**
 * A bell with an unread badge that opens a panel of mentions and system alerts,
 * with tabs, mark as read, dismiss and an empty state.
 */
export function NotificationCenter({
  items,
  title,
  now,
  footer,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  tab: tabProp,
  defaultTab = "all",
  onTabChange,
  onRead,
  onDismiss,
  onAction,
  onFooterClick,
  labels,
  locale = "en-US",
  panelWidth = 400,
  listMaxHeight = 430,
  ref,
  className,
}: NotificationCenterProps) {
  const L = useMemo(() => ({ ...LABELS, ...labels }), [labels]);
  const heading = title || L.title;
  const uid = useId();
  const seq = useRef(0);

  /* ---------- clock (SSR-safe: no Date.now() in render) ---------- */
  const fixedNow = useMemo(() => parseTime(now), [now]);
  const [clientNow, setClientNow] = useState<Date | null>(null);
  useEffect(() => {
    if (!fixedNow) setClientNow(new Date());
  }, [fixedNow]);
  const nowDate = fixedNow ?? clientNow;

  /* ---------- items ---------- */
  const normalise = useCallback(
    (list: NotificationItem[], fallback: Date | null): Item[] =>
      (Array.isArray(list) ? list : []).filter(Boolean).map((i) => ({
        ...i,
        id: i.id != null ? String(i.id) : `ntc-auto-${++seq.current}`,
        type: i.type === "system" ? "system" : "mention",
        read: !!i.read,
        d: parseTime(i.time) ?? fallback ?? new Date(0),
      })),
    []
  );
  const [list, setList] = useState<Item[]>(() => normalise(items, fixedNow));
  const [srcItems, setSrcItems] = useState(items);
  if (srcItems !== items) {
    setSrcItems(items);
    setList(normalise(items, nowDate));
  }

  /* ---------- open / tab (controlled or not) ---------- */
  const [openState, setOpenState] = useState(defaultOpen);
  const isOpen = openProp ?? openState;
  const [tabState, setTabState] = useState<NotificationTab>(defaultTab);
  const tab: NotificationTab = TABS.includes(tabProp as NotificationTab) ? (tabProp as NotificationTab) : tabState;

  const rootRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Partial<Record<NotificationTab, HTMLButtonElement | null>>>({});
  const focusTabOnOpen = useRef(false);

  const [announce, setAnnounce] = useState("");
  const [ringN, setRingN] = useState(0);
  const [ringing, setRinging] = useState(false);
  const [bumpN, setBumpN] = useState(0);
  const [fresh, setFresh] = useState<string | null>(null);
  const [leaving, setLeaving] = useState<string[]>([]);
  const [focusReq, setFocusReq] = useState<string | null>(null);
  const [pos, setPos] = useState<{ width: number; left: number; ox: number } | null>(null);
  const ringT = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const freshT = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const setOpen = useCallback(
    (v: boolean) => {
      if (openProp === undefined) setOpenState(v);
      if (v !== isOpen) onOpenChange?.(v);
    },
    [openProp, isOpen, onOpenChange]
  );
  const setTab = (t: NotificationTab) => {
    if (t === tab) return;
    if (tabProp === undefined) setTabState(t);
    onTabChange?.(t);
  };

  const visible = useMemo(
    () => list.filter((i) => tab === "all" || i.type === tab).sort((a, b) => b.d.getTime() - a.d.getTime()),
    [list, tab]
  );
  const unread = list.filter((i) => !i.read).length;
  const unreadIn = (t: NotificationTab) => list.filter((i) => !i.read && (t === "all" || i.type === t)).length;

  /* ---------- time labels ---------- */
  const relative = (d: Date) => {
    if (!nowDate) return d.toLocaleDateString(locale, { weekday: "short", month: "short", day: "numeric" });
    const mins = Math.round((nowDate.getTime() - d.getTime()) / 60000);
    if (mins < 1) return L.justNow;
    if (mins < 60) return fill(L.minAgo, { n: mins });
    if (mins < 24 * 60 && dayKey(nowDate) === dayKey(d)) return fill(L.hAgo, { n: Math.floor(mins / 60) });
    const y = new Date(nowDate);
    y.setDate(y.getDate() - 1);
    if (dayKey(y) === dayKey(d)) return d.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });
    return d.toLocaleDateString(locale, { weekday: "short", month: "short", day: "numeric" });
  };
  const group = (d: Date) => {
    if (!nowDate) return L.earlier;
    const y = new Date(nowDate);
    y.setDate(y.getDate() - 1);
    if (dayKey(d) === dayKey(nowDate)) return L.today;
    if (dayKey(d) === dayKey(y)) return L.yesterday;
    return L.earlier;
  };
  const groups = useMemo(() => {
    const out: { label: string; items: Item[] }[] = [];
    visible.forEach((i) => {
      const g = group(i.d);
      const last = out[out.length - 1];
      if (last && last.label === g) last.items.push(i);
      else out.push({ label: g, items: [i] });
    });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, nowDate, L]);

  /* ---------- motion ---------- */
  const bump = (ring: boolean) => {
    if (reduceMotion()) return;
    setBumpN((n) => n + 1);
    if (ring) {
      setRingN((n) => n + 1);
      setRinging(true);
      clearTimeout(ringT.current);
      ringT.current = setTimeout(() => setRinging(false), 800);
    }
  };
  useEffect(
    () => () => {
      clearTimeout(ringT.current);
      clearTimeout(freshT.current);
    },
    []
  );

  /* ---------- actions ---------- */
  const markRead = (ids: string[], source: NotificationReadSource, focusId?: string) => {
    const changed = list.filter((i) => ids.includes(i.id) && !i.read).map((i) => i.id);
    setList((prev) => prev.map((i) => (ids.includes(i.id) ? { ...i, read: true } : i)));
    if (focusId) setFocusReq(focusId);
    if (changed.length) {
      bump(false);
      onRead?.(changed, source);
    }
  };

  const markAll = (e: MouseEvent<HTMLButtonElement>) => {
    const ids = visible.filter((i) => !i.read).map((i) => i.id);
    if (!ids.length) return;
    markRead(ids, "all");
    setAnnounce(fill(L.readAll, { n: ids.length }));
    // the button disables itself, so move focus somewhere sensible
    if (document.activeElement === e.currentTarget || !rootRef.current?.contains(document.activeElement)) setFocusReq("_tabs");
  };

  const dismiss = (id: string, li: HTMLLIElement | null) => {
    const idx = visible.findIndex((i) => i.id === id);
    const next = visible[idx + 1] || visible[idx - 1];
    const finish = () => {
      setList((prev) => prev.filter((i) => i.id !== id));
      setLeaving((prev) => prev.filter((x) => x !== id));
      setFocusReq(next ? next.id : "_tabs");
      setAnnounce(L.dismissed);
      onDismiss?.(id);
    };
    if (reduceMotion() || !li || typeof li.animate !== "function") return finish();
    setLeaving((prev) => [...prev, id]);
    const h = li.getBoundingClientRect().height;
    li.style.overflow = "hidden";
    li.animate(
      [
        { height: `${h}px`, opacity: 1, transform: "none", paddingTop: "10px", paddingBottom: "10px" },
        { height: `${h}px`, opacity: 0, transform: "translateX(24px)", offset: 0.45 },
        { height: "0px", opacity: 0, transform: "translateX(24px)", paddingTop: "0px", paddingBottom: "0px" },
      ],
      { duration: 340, easing: EASE, fill: "forwards" }
    ).finished.then(finish, finish);
  };

  const show = useCallback(
    (focus = true) => {
      focusTabOnOpen.current = focus;
      setOpen(true);
    },
    [setOpen]
  );
  const hide = useCallback(
    (returnFocus = true) => {
      if (!isOpen) return;
      const inside = !!rootRef.current?.contains(document.activeElement);
      setOpen(false);
      if (returnFocus || inside) bellRef.current?.focus();
    },
    [isOpen, setOpen]
  );
  const toggle = useCallback(() => (isOpen ? hide() : show()), [isOpen, hide, show]);

  const add = (item: NotificationItem) => {
    const base = nowDate ?? new Date();
    const [it] = normalise([{ time: localISO(base), read: false, ...item }], base);
    if (!it) return;
    setList((prev) => [it, ...prev]);
    setFresh(it.id);
    clearTimeout(freshT.current);
    freshT.current = setTimeout(() => setFresh(null), 600);
    setAnnounce(fill(L.newItem, { text: plain(it) }));
    bump(true);
  };

  useImperativeHandle(ref, () => ({ add, show, hide: () => hide(true), toggle, unread: () => unread }));

  /* ---------- effects ---------- */
  // focus after list changes (dismiss, action, mark all)
  useEffect(() => {
    if (!focusReq) return;
    const target =
      focusReq === "_tabs" ? null : listRef.current?.querySelector<HTMLElement>(`[data-id="${CSS.escape(focusReq)}"] [data-open]`);
    (target || tabRefs.current[tab])?.focus();
    setFocusReq(null);
  }, [focusReq, list, tab]);

  // open: place the panel, focus the selected tab
  const place = useCallback(() => {
    const bell = bellRef.current;
    if (!bell) return;
    const vw = document.documentElement.clientWidth;
    const host = bell.getBoundingClientRect();
    const w = Math.min(panelWidth, vw - 24);
    let left = host.right + 8 - w;
    left = Math.max(12, Math.min(left, vw - 12 - w));
    setPos({ width: w, left: left - host.left, ox: Math.max(18, Math.min(w - 18, host.left + host.width / 2 - left)) });
  }, [panelWidth]);

  useEffect(() => {
    if (!isOpen) return;
    place();
    let raf = 0;
    if (focusTabOnOpen.current) {
      focusTabOnOpen.current = false;
      raf = requestAnimationFrame(() => tabRefs.current[tab]?.focus());
    }
    const onDoc = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) hide(false);
    };
    document.addEventListener("pointerdown", onDoc);
    window.addEventListener("resize", place);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("pointerdown", onDoc);
      window.removeEventListener("resize", place);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, place, hide]);

  const onRootKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape" && isOpen) {
      e.preventDefault();
      hide(true);
    }
  };
  const onTabsKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = TABS.indexOf(tab);
    const map: Record<string, number> = { ArrowRight: (i + 1) % TABS.length, ArrowLeft: (i - 1 + TABS.length) % TABS.length, Home: 0, End: TABS.length - 1 };
    if (e.key in map) {
      e.preventDefault();
      const t = TABS[map[e.key]];
      setTab(t);
      tabRefs.current[t]?.focus();
    }
  };

  const panelId = `${uid}-panel`;
  const listId = `${uid}-list`;
  const empty = {
    all: [L.emptyAll, L.emptyAllSub],
    mention: [L.emptyMention, L.emptyMentionSub],
    system: [L.emptySystem, L.emptySystemSub],
  }[tab];
  const panelStyle = {
    ...(pos ? { width: pos.width, left: pos.left, right: "auto", "--ntc-ox": `${pos.ox}px` } : null),
  } as CSSProperties;

  return (
    <div
      ref={rootRef}
      onKeyDown={onRootKey}
      className={cx("relative inline-block text-left font-(family-name:--ntc-sans) leading-[1.4] text-(--ntc-ink)", className)}
    >
      {/* bell */}
      <button
        ref={bellRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={panelId}
        aria-label={unread ? fill(L.bellUnread, { n: unread }) : L.bell}
        onClick={toggle}
        className={cx(
          "relative grid size-[42px] cursor-pointer place-items-center rounded-xl border border-(--ntc-line) bg-(--ntc-bell) text-(--ntc-ink) shadow-[0_1px_2px_-1px_var(--ntc-shadow)] transition-[background-color,border-color,box-shadow] duration-200 motion-reduce:transition-none",
          "hover:border-[color-mix(in_oklab,var(--ntc-accent)_40%,var(--ntc-line))]",
          "aria-expanded:border-[color-mix(in_oklab,var(--ntc-accent)_45%,var(--ntc-line))] aria-expanded:bg-(--ntc-accent-soft) aria-expanded:text-(--ntc-accent-ink)",
          focusRing
        )}
      >
        <BellIcon
          key={ringN}
          className={cx(
            "size-5 origin-[50%_8%]",
            ringing && "animate-[ntc-ring_0.7s_cubic-bezier(.36,.07,.19,.97)] motion-reduce:animate-none"
          )}
        />
        <span
          key={bumpN}
          aria-hidden="true"
          className={cx(
            "absolute -top-1.5 -right-1.5 box-border grid h-5 min-w-5 place-items-center rounded-full bg-(--ntc-accent) px-[5px] text-[11px] leading-none font-bold text-(--ntc-on-accent) tabular-nums shadow-[0_0_0_2.5px_var(--ntc-bell-ring,var(--ntc-panel))] transition-[scale,opacity] duration-250 ease-out-soft motion-reduce:transition-none",
            unread === 0 && "scale-0 opacity-0",
            bumpN > 0 && "animate-[ntc-bump_0.38s_cubic-bezier(.2,.7,.2,1)] motion-reduce:animate-none"
          )}
        >
          {unread > 9 ? "9+" : unread}
        </span>
      </button>

      {/* panel */}
      <section
        id={panelId}
        role="dialog"
        aria-modal="false"
        aria-label={heading}
        aria-hidden={!isOpen}
        inert={!isOpen}
        style={panelStyle}
        className={cx(
          "@container/ntc absolute top-[calc(100%_+_12px)] -right-2 z-40 w-(--ntc-width) max-w-[calc(100vw_-_24px)] origin-[var(--ntc-ox,calc(100%_-_28px))_-10px] rounded-[18px] border border-(--ntc-line) bg-(--ntc-panel) text-left shadow-[0_30px_70px_-28px_var(--ntc-shadow),0_8px_18px_-12px_var(--ntc-shadow)]",
          "before:absolute before:-top-[7px] before:left-[var(--ntc-ox,calc(100%_-_28px))] before:-ml-1.5 before:size-3 before:rotate-45 before:rounded-tl-[3px] before:border-t before:border-l before:border-(--ntc-line) before:bg-(--ntc-panel) before:content-['']",
          isOpen
            ? "visible translate-y-0 scale-100 opacity-100 [transition:opacity_.2s_ease,translate_.24s_cubic-bezier(.2,.7,.2,1),scale_.24s_cubic-bezier(.2,.7,.2,1),visibility_0s_linear_0s]"
            : "invisible -translate-y-1.5 scale-[0.97] opacity-0 [transition:opacity_.2s_ease,translate_.24s_cubic-bezier(.2,.7,.2,1),scale_.24s_cubic-bezier(.2,.7,.2,1),visibility_0s_linear_.24s]",
          "motion-reduce:translate-y-0 motion-reduce:scale-100 motion-reduce:transition-none"
        )}
      >
        <header className="flex items-center justify-between gap-2.5 pt-4 pr-4 pb-2.5 pl-[18px] @max-[380px]/ntc:pt-3.5 @max-[380px]/ntc:pr-3 @max-[380px]/ntc:pb-2 @max-[380px]/ntc:pl-3.5">
          <h2 className="m-0 flex items-center gap-2 font-(family-name:--ntc-display) text-base leading-[1.2] font-[650] tracking-[-0.01em]">
            <span>{heading}</span>
            {unread > 0 && (
              <span aria-hidden="true" className="rounded-full bg-(--ntc-accent-soft) px-[7px] py-1 font-(family-name:--ntc-sans) text-[11px] leading-none font-[650] text-(--ntc-accent-ink) tabular-nums">
                {unread} new
              </span>
            )}
          </h2>
          <button
            type="button"
            onClick={markAll}
            disabled={!visible.some((i) => !i.read)}
            aria-label={L.markAll}
            className={cx(
              "inline-flex cursor-pointer items-center gap-1.5 rounded-lg border-0 bg-transparent px-2 py-[7px] text-[12.5px] leading-none font-semibold text-(--ntc-accent-ink) transition-colors duration-200 motion-reduce:transition-none",
              "enabled:hover:bg-(--ntc-accent-soft) disabled:cursor-default disabled:text-(--ntc-faint) disabled:opacity-70",
              focusRing
            )}
          >
            <ChecksIcon />
            <span className="@max-[320px]/ntc:hidden">{L.markAll}</span>
          </button>
        </header>

        <div
          role="tablist"
          aria-label={L.tabs}
          onKeyDown={onTabsKey}
          className="relative flex gap-0.5 border-b border-(--ntc-line) px-3 @max-[380px]/ntc:px-2"
        >
          {TABS.map((t) => {
            const n = unreadIn(t);
            const on = t === tab;
            return (
              <button
                key={t}
                ref={(el) => {
                  tabRefs.current[t] = el;
                }}
                type="button"
                role="tab"
                id={`${uid}-tab-${t}`}
                aria-selected={on}
                aria-controls={listId}
                tabIndex={on ? 0 : -1}
                aria-label={n ? `${L[t]}, ${n} ${L.unread.toLowerCase()}` : L[t]}
                onClick={() => setTab(t)}
                className={cx(
                  "group/tab -mb-px inline-flex cursor-pointer items-center gap-[7px] border-0 border-b-2 border-transparent bg-transparent px-2 pt-2.5 pb-3 text-[13px] leading-none font-semibold text-(--ntc-muted) transition-colors duration-200 hover:text-(--ntc-ink) motion-reduce:transition-none",
                  "aria-selected:border-b-(--ntc-accent) aria-selected:text-(--ntc-ink)",
                  "focus-visible:rounded-md focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--ntc-accent)",
                  "@max-[380px]/ntc:px-1.5 @max-[380px]/ntc:pt-2.5 @max-[380px]/ntc:pb-[11px] @max-[380px]/ntc:text-[12.5px]"
                )}
              >
                <span>{L[t]}</span>
                {n > 0 && (
                  <span className="box-border inline-grid h-[18px] min-w-[18px] place-items-center rounded-full bg-(--ntc-tint) px-[5px] text-[10.5px] leading-none font-[650] text-(--ntc-muted) tabular-nums transition-colors duration-200 group-aria-selected/tab:bg-(--ntc-accent) group-aria-selected/tab:text-(--ntc-on-accent) motion-reduce:transition-none @max-[320px]/ntc:hidden">
                    {n}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div
          ref={listRef}
          id={listId}
          role="tabpanel"
          tabIndex={-1}
          aria-labelledby={`${uid}-tab-${tab}`}
          style={{ maxHeight: listMaxHeight }}
          className="overflow-y-auto overscroll-contain pt-1 pb-2 [scrollbar-width:thin] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--ntc-accent)"
        >
          {visible.length === 0 ? (
            <div className="grid justify-items-center gap-1.5 px-6 pt-[34px] pb-[30px] text-center">
              <EmptyArt />
              <b className="font-(family-name:--ntc-display) text-[15px] leading-[1.3] font-[650]">{empty[0]}</b>
              <span className="max-w-[28ch] text-[13px] text-(--ntc-muted)">{empty[1]}</span>
            </div>
          ) : (
            groups.map((g, gi) => (
              <div key={`${g.label}-${gi}`}>
                <h3
                  id={`${uid}-g-${gi}`}
                  className="m-0 px-[18px] pt-3 pb-1.5 font-(family-name:--ntc-mono) text-[10.5px] leading-none font-semibold tracking-[0.1em] text-(--ntc-faint) uppercase @max-[380px]/ntc:px-3.5 @max-[380px]/ntc:pt-2.5"
                >
                  {g.label}
                </h3>
                <ul aria-labelledby={`${uid}-g-${gi}`} className="m-0 grid list-none gap-0.5 px-2 py-0 @max-[380px]/ntc:px-1.5">
                  {g.items.map((i) => (
                    <Row
                      key={i.id}
                      item={i}
                      L={L}
                      locale={locale}
                      when={relative(i.d)}
                      fresh={fresh === i.id}
                      leaving={leaving.includes(i.id)}
                      onOpen={() => markRead([i.id], "click")}
                      onAct={() => {
                        if (i.action) onAction?.(i.id, i.action.label);
                        setList((prev) => prev.map((x) => (x.id === i.id ? { ...x, done: true } : x)));
                        markRead([i.id], "action", i.id);
                      }}
                      onDismiss={(li) => dismiss(i.id, li)}
                    />
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>

        <footer className="flex items-center justify-between gap-2.5 border-t border-(--ntc-line) pt-2.5 pr-4 pb-3 pl-[18px] text-xs text-(--ntc-faint) @max-[380px]/ntc:pr-3 @max-[380px]/ntc:pl-3.5">
          {footer?.label ? (
            footer.href ? (
              <a href={footer.href} className={footBtn}>
                <GearIcon />
                {footer.label}
              </a>
            ) : (
              <button type="button" onClick={onFooterClick} className={footBtn}>
                <GearIcon />
                {footer.label}
              </button>
            )
          ) : (
            <span />
          )}
          <span className="tabular-nums">{list.length} total</span>
        </footer>
      </section>
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
    </div>
  );
}

const footBtn =
  "inline-flex cursor-pointer items-center gap-1.5 rounded-md border-0 bg-transparent px-1 py-1.5 text-[12.5px] leading-none font-semibold text-(--ntc-ink) no-underline hover:text-(--ntc-accent-ink) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ntc-accent)";

interface RowProps {
  item: Item;
  L: NotificationLabels;
  locale: string;
  when: string;
  fresh: boolean;
  leaving: boolean;
  onOpen: () => void;
  onAct: () => void;
  onDismiss: (li: HTMLLIElement | null) => void;
}

function Row({ item: i, L, locale, when, fresh, leaving, onOpen, onAct, onDismiss }: RowProps) {
  const liRef = useRef<HTMLLIElement>(null);
  const sys = i.type === "system";
  const s = SYS[i.icon ?? "report"] ?? SYS.report;
  const hue = sys ? s.hue : hueFor(i.actor || "");
  const unread = !i.read;
  const full = i.d.toLocaleString(locale, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

  return (
    <li
      ref={liRef}
      data-id={i.id}
      className={cx(
        "group/item relative grid grid-cols-[38px_minmax(0,1fr)_26px] items-start gap-3 rounded-xl p-2.5 transition-[background-color] duration-250 ease-in-out motion-reduce:transition-none",
        unread ? "bg-(--ntc-unread) hover:bg-[color-mix(in_oklab,var(--ntc-unread),var(--ntc-accent)_5%)]" : "hover:bg-(--ntc-tint)",
        fresh && "animate-[ntc-new_0.5s_cubic-bezier(.2,.7,.2,1)] motion-reduce:animate-none",
        "@max-[380px]/ntc:grid-cols-[32px_minmax(0,1fr)_24px] @max-[380px]/ntc:gap-2.5 @max-[380px]/ntc:px-2 @max-[380px]/ntc:py-[9px]",
        "@max-[320px]/ntc:grid-cols-[minmax(0,1fr)_24px]"
      )}
    >
      <span
        aria-hidden="true"
        style={{ "--ntc-hue": hue } as CSSProperties}
        className={cx(
          "relative grid size-[38px] place-items-center text-[12.5px] leading-none font-[650] tracking-[0.02em] text-(--ntc-ink) @max-[380px]/ntc:size-8 @max-[380px]/ntc:text-[11px] @max-[320px]/ntc:hidden",
          "bg-[color-mix(in_oklab,var(--ntc-hue,var(--ntc-accent))_16%,var(--ntc-panel))] shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--ntc-hue,var(--ntc-accent))_28%,transparent)]",
          sys ? "rounded-[11px]" : "rounded-full"
        )}
      >
        {sys ? (
          <svg viewBox="0 0 18 18" strokeWidth="1.6" {...svgBase} className="size-[18px] text-[var(--ntc-hue,var(--ntc-accent))] @max-[380px]/ntc:size-4">
            {s.paths}
          </svg>
        ) : (
          <>
            {initials(i.actor)}
            <span className="absolute -right-[5px] -bottom-1 grid size-4 place-items-center rounded-full bg-(--ntc-accent) text-(--ntc-on-accent) shadow-[0_0_0_2px_var(--ntc-panel)]">
              <AtIcon />
            </span>
          </>
        )}
      </span>

      <div className="grid min-w-0 gap-1">
        <button
          type="button"
          data-open=""
          disabled={leaving}
          onClick={onOpen}
          aria-label={`${unread ? `${L.unread}: ` : ""}${plain(i)} ${when}`}
          className={cx(
            "m-0 cursor-pointer border-0 bg-transparent p-0 text-left text-[13.5px] leading-[1.42] [overflow-wrap:anywhere] @max-[380px]/ntc:text-[13px]",
            "after:absolute after:inset-0 after:rounded-xl after:content-[''] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-(--ntc-accent)",
            unread ? "text-inherit [&_b]:font-[650]" : "text-(--ntc-muted) [&_b]:font-semibold [&_b]:text-(--ntc-ink)"
          )}
        >
          {sys ? (
            <b>{i.title || ""}</b>
          ) : (
            <>
              <b>{i.actor || ""}</b> {i.text || ""} {i.target && <b>{i.target}</b>}
            </>
          )}
        </button>
        {i.body && <span className="text-[13px] leading-[1.45] [overflow-wrap:anywhere] text-(--ntc-muted)">{i.body}</span>}
        <span
          aria-hidden="true"
          className="flex flex-wrap items-center gap-1.5 text-xs text-(--ntc-faint) tabular-nums [&>*+*]:before:mr-1.5 [&>*+*]:before:content-['·']"
        >
          <time dateTime={i.time} title={full} suppressHydrationWarning>
            {when}
          </time>
          <span>{L[i.type]}</span>
        </span>
        {i.action?.label && (
          <button
            type="button"
            disabled={!!i.done || leaving}
            onClick={onAct}
            className={cx(
              "relative z-[1] mt-1 cursor-pointer justify-self-start rounded-lg border px-[11px] py-1.5 text-xs leading-none font-semibold transition-colors duration-200 motion-reduce:transition-none",
              focusRing,
              i.done
                ? "cursor-default border-[color-mix(in_oklab,var(--ntc-ok)_40%,var(--ntc-line))] bg-transparent text-(--ntc-ok)"
                : "border-[color-mix(in_oklab,var(--ntc-accent)_40%,var(--ntc-line))] bg-(--ntc-raise) text-(--ntc-accent-ink) hover:border-(--ntc-accent) hover:bg-(--ntc-accent) hover:text-(--ntc-on-accent)"
            )}
          >
            {i.done ? i.action.done || i.action.label : i.action.label}
          </button>
        )}
      </div>

      <div className="relative grid h-full justify-items-center gap-2 pt-0.5">
        <button
          type="button"
          disabled={leaving}
          onClick={() => onDismiss(liRef.current)}
          aria-label={`${L.dismiss}: ${sys ? i.title || "" : `${i.actor || ""} ${i.text || ""} ${i.target || ""}`}`.trim()}
          className={cx(
            "relative z-[1] grid size-[26px] cursor-pointer place-items-center rounded-lg border-0 bg-transparent text-(--ntc-faint) opacity-0 transition-[opacity,background-color,color] duration-200 motion-reduce:transition-none",
            "group-focus-within/item:opacity-100 group-hover/item:opacity-100 hover:bg-(--ntc-panel) hover:text-(--ntc-ink) hover:shadow-[0_0_0_1px_var(--ntc-line)] focus-visible:opacity-100 [@media(hover:none)]:opacity-100",
            "@max-[380px]/ntc:size-6 @max-[380px]/ntc:opacity-100",
            focusRing
          )}
        >
          <XIcon />
        </button>
        <span
          aria-hidden="true"
          className={cx(
            "mt-[5px] size-2 rounded-full bg-(--ntc-accent) shadow-[0_0_0_3px_var(--ntc-accent-soft)] transition-[scale,opacity] duration-250 ease-in-out motion-reduce:transition-none",
            !unread && "scale-0 opacity-0"
          )}
        />
      </div>
    </li>
  );
}

export default NotificationCenter;
