"use client";

import { useEffect, useId, useMemo, useRef, useState, type FocusEvent, type PointerEvent, type ReactNode } from "react";
import { cx } from "@/lib/format";

export type FormStepType = "view" | "start" | "field" | "submit";

export interface FormStep {
  /** Unique key; also used to look up a tip. */
  id: string;
  /** Display name. */
  label: string;
  /** Only `field` steps appear as inputs in the mini form and can be the worst field. */
  type?: FormStepType;
}

export interface FormSegment {
  /** Switch label, e.g. "Mobile". */
  label: string;
  /** One number per step: how many people reached and completed it. */
  counts: number[];
  /** Average time to submit, in seconds. */
  avgSeconds?: number;
}

export interface FormMock {
  /** Heading of the mini form. */
  title?: string;
  /** Submit button text. */
  button?: string;
}

export interface FormFieldSelect {
  id: string;
  label: string;
  type: FormStepType;
  device: string;
  count: number;
  reached: number | null;
  lost: number;
  dropRate: number | null;
  worst: boolean;
}

export interface FormConversionLabels {
  device: string;
  conversion: string;
  conversionSub: string;
  completion: string;
  completionSub: string;
  time: string;
  timeSub: string;
  ofViews: string;
  didntStart: string;
  leftHere: string;
  leftSubmit: string;
  worst: string;
  reached: string;
  completed: string;
  left: string;
  retained: string;
  lost: string;
  show: string;
  hide: string;
  tipTitle: string;
  gain: string;
  tipFallback: string;
  noTip: string;
  selectHint: string;
  mobileNote: string;
  desktopNote: string;
  allNote: string;
}

export interface FormConversionCardProps {
  /** Small label above the title. */
  eyebrow?: string;
  /** Card title. */
  title?: string;
  /** Line under the title. */
  subtitle?: string;
  /** Date-range text in the footer. */
  period?: string;
  /** Mini form heading and button text. */
  form?: FormMock;
  /** Steps in order. */
  steps: FormStep[];
  /** Counts per device segment, keyed e.g. all / desktop / mobile. */
  segments: Record<string, FormSegment>;
  /** Suggestion shown when that field is the worst. {rate} and {lost} are filled in. */
  tips?: Record<string, string>;
  /** Controlled segment key. */
  device?: string;
  /** Initial segment key when uncontrolled. Defaults to the first segment. */
  defaultDevice?: string;
  onDeviceChange?: (device: string) => void;
  /** Called when a bar or a field in the mini form is selected. */
  onFieldSelect?: (detail: FormFieldSelect) => void;
  /** Start with the suggestion panel open. */
  defaultTipsOpen?: boolean;
  /** Override any built-in text. */
  labels?: Partial<FormConversionLabels>;
  /** Number locale. */
  locale?: string;
  className?: string;
}

const LABELS: FormConversionLabels = {
  device: "Device",
  conversion: "Form conversion",
  conversionSub: "{n} of {views} views submitted",
  completion: "Start to submit",
  completionSub: "of people who start, finish",
  time: "Avg. time to submit",
  timeSub: "for people who finished",
  ofViews: "{pct} of views",
  didntStart: "{pct} didn't start",
  leftHere: "−{pct} left here",
  leftSubmit: "−{pct} left at submit",
  worst: "Biggest drop-off",
  reached: "reached",
  completed: "completed",
  left: "left",
  retained: "Completed",
  lost: "Left at this step",
  show: "Show suggestions",
  hide: "Hide suggestions",
  tipTitle: "Start with the {field} field",
  gain: "If {field} kept pace with your other fields ({rate}), you could get about {extra} more submissions: {from} → {to} conversion. Estimate.",
  tipFallback: "{rate} of people who reach {field} leave there. Try making it optional, shorter, or easier to fill in.",
  noTip: "No field drop-off to fix.",
  selectHint: "Select a bar or a field to see its numbers.",
  mobileNote: "Showing the mobile layout",
  desktopNote: "Showing the desktop layout",
  allNote: "All devices combined",
};

const SKEL = [58, 66, 44, 52, 61];
const TYPES: FormStepType[] = ["view", "start", "field", "submit"];

const num = (v: unknown) => (v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));
const fill = (s: string, vars: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ""));
const reduceMotion = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const ease = (t: number) => 1 - Math.pow(1 - t, 3);
const fmtTime = (s: number | null) => {
  if (s == null) return "—";
  const m = Math.floor(s / 60);
  const r = Math.round(s % 60);
  return m ? `${m}m ${String(r).padStart(2, "0")}s` : `${r}s`;
};

/* ---------- icons ---------- */
const st = { fill: "none", stroke: "currentColor", "aria-hidden": true } as const;
const DEVICE_ICON: Record<string, ReactNode> = {
  all: (
    <>
      <rect x="1.5" y="3" width="9" height="7" rx="1.5" />
      <rect x="11" y="5.5" width="3.5" height="7.5" rx="1" />
      <path d="M4 13h4" />
    </>
  ),
  desktop: (
    <>
      <rect x="1.5" y="2.5" width="13" height="8.5" rx="1.5" />
      <path d="M5.5 14h5M8 11v3" />
    </>
  ),
  mobile: (
    <>
      <rect x="4.5" y="1.5" width="7" height="13" rx="1.8" />
      <path d="M7 12.2h2" />
    </>
  ),
};
const BulbIcon = () => (
  <svg viewBox="0 0 20 20" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...st} className="size-[18px]">
    <path d="M7.5 15.5h5M8.3 18h3.4M10 2.2a5.6 5.6 0 0 0-3.4 10c.6.5.9 1.1.9 1.8v.2h5v-.2c0-.7.3-1.3.9-1.8A5.6 5.6 0 0 0 10 2.2Z" />
  </svg>
);

/** A number that counts from its previous value to the new one. */
function CountUp({ value, format }: { value: number | null; format: (v: number | null) => string }) {
  const [shown, setShown] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    const from = prev.current;
    prev.current = value;
    if (value == null || from == null || from === value || reduceMotion()) {
      setShown(value);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const k = ease(Math.min(1, (now - t0) / 480));
      setShown(from + (value - from) * k);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{format(shown)}</>;
}

interface Row {
  id: string;
  label: string;
  type: FormStepType;
  i: number;
  count: number;
  prev: number | null;
  lost: number;
  dropRate: number | null;
  share: number | null;
}

const monoCap = "font-(family-name:--fcc-mono) font-semibold uppercase";
const ring = (c: "accent" | "worst") => (c === "accent" ? "shadow-[inset_0_0_0_1.5px_var(--fcc-accent)]" : "shadow-[inset_0_0_0_1.5px_var(--fcc-worst)]");

/**
 * A mini form next to field-by-field completion bars. The field that loses the
 * most people is highlighted in both; hovering one side highlights the other.
 */
export function FormConversionCard({
  eyebrow,
  title,
  subtitle,
  period,
  form,
  steps,
  segments,
  tips,
  device: deviceProp,
  defaultDevice,
  onDeviceChange,
  onFieldSelect,
  defaultTipsOpen = false,
  labels,
  locale = "en-US",
  className,
}: FormConversionCardProps) {
  const L = useMemo(() => ({ ...LABELS, ...labels }), [labels]);
  const uid = useId();
  const keys = Object.keys(segments || {});
  const [deviceState, setDeviceState] = useState(defaultDevice);
  const wanted = deviceProp ?? deviceState;
  const device = wanted && keys.includes(wanted) ? wanted : keys[0] || "all";

  const int = (v: number) => Math.round(v).toLocaleString(locale);
  const pct = (r: number | null | undefined) =>
    r == null || !Number.isFinite(r) ? "—" : `${(r * 100).toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

  /* ---------- model: one row per step, rates worked out from the counts ---------- */
  const m = useMemo(() => {
    const seg = segments?.[device];
    const counts = Array.isArray(seg?.counts) ? seg.counts : [];
    const rows: Row[] = (Array.isArray(steps) ? steps : []).map((s, i) => ({
      id: String(s?.id || `step-${i + 1}`),
      label: s?.label || `Step ${i + 1}`,
      type: s?.type && TYPES.includes(s.type) ? s.type : "field",
      i,
      count: Math.max(0, num(counts[i]) ?? 0),
      prev: null,
      lost: 0,
      dropRate: null,
      share: null,
    }));
    const views = rows.length ? rows[0].count : 0;
    rows.forEach((r, i) => {
      const prev = i > 0 ? rows[i - 1].count : null;
      r.prev = prev;
      r.lost = prev != null ? Math.max(0, prev - r.count) : 0;
      r.dropRate = prev != null && prev > 0 ? r.lost / prev : null;
      r.share = views > 0 ? r.count / views : null;
    });
    const fields = rows.filter((r) => r.type === "field" && r.dropRate != null);
    const worst = fields.reduce<Row | null>((a, r) => (!a || (r.dropRate ?? 0) > (a.dropRate ?? 0) ? r : a), null);
    const sub = rows.find((r) => r.type === "submit") || rows[rows.length - 1];
    const start = rows.find((r) => r.type === "start");
    return {
      rows,
      views,
      worst: worst && worst.lost > 0 ? worst : null,
      fields,
      submitted: sub ? sub.count : 0,
      started: start ? start.count : null,
      seg,
    };
  }, [segments, steps, device]);

  /* ---------- selection + linked highlight ---------- */
  const [selectedRaw, setSelected] = useState<string | null>(null);
  const selected = selectedRaw && m.rows.some((r) => r.id === selectedRaw) ? selectedRaw : null;
  const [hl, setHl] = useState<string | null>(null);
  const [tipOpen, setTipOpen] = useState(defaultTipsOpen);
  const segRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const select = (id: string | null) => {
    const r = id ? m.rows.find((x) => x.id === id) : undefined;
    setSelected(r ? r.id : null);
    if (r)
      onFieldSelect?.({
        id: r.id,
        label: r.label,
        type: r.type,
        device,
        count: r.count,
        reached: r.prev,
        lost: r.lost,
        dropRate: r.dropRate,
        worst: !!(m.worst && m.worst.id === r.id),
      });
  };
  const toggle = (id: string) => select(selected === id ? null : id);

  const chooseDevice = (k: string) => {
    if (k === device) return;
    if (deviceProp === undefined) setDeviceState(k);
    onDeviceChange?.(k);
    requestAnimationFrame(() => segRefs.current[k]?.focus());
  };

  const stepOf = (t: EventTarget | null) => ((t as HTMLElement | null)?.closest?.("[data-step]") as HTMLElement | null)?.dataset.step || null;
  const onOver = (e: PointerEvent<HTMLElement>) => {
    const id = stepOf(e.target);
    if (id) setHl(id);
  };
  const onOut = (e: PointerEvent<HTMLElement>) => {
    const t = (e.target as HTMLElement).closest?.("[data-step]");
    if (!t || t.contains(e.relatedTarget as Node | null)) return;
    const a = document.activeElement;
    setHl(a && e.currentTarget.contains(a) ? stepOf(a) : null);
  };
  const onFocusIn = (e: FocusEvent<HTMLElement>) => setHl(stepOf(e.target));
  const onFocusOut = (e: FocusEvent<HTMLElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHl(null);
  };

  /* ---------- figures ---------- */
  const conv = m.views > 0 ? m.submitted / m.views : null;
  const comp = m.started != null && m.started > 0 ? m.submitted / m.started : null;
  const isMobile = device === "mobile";
  const viewRow = m.rows.find((r) => r.type === "view");
  const startRow = m.rows.find((r) => r.type === "start");
  const subRow = m.rows.find((r) => r.type === "submit");
  const fieldRows = m.rows.filter((r) => r.type === "field");
  const detailRow = selected ? m.rows.find((x) => x.id === selected) : undefined;
  const tipId = `${uid}-tip`;

  // suggestion + estimate
  let tipBody: ReactNode = <p className="m-0 text-[13.5px] leading-[1.55] text-(--fcc-muted)">{L.noTip}</p>;
  const w = m.worst;
  if (w) {
    const vars = { rate: pct(w.dropRate), lost: int(w.lost), field: w.label };
    let gain: ReactNode = null;
    const others = m.fields.filter((r) => r !== w && (r.prev ?? 0) > 0);
    if (others.length && w.count > 0 && m.views > 0 && w.prev != null) {
      const rate = others.reduce((a, r) => a + r.count / (r.prev as number), 0) / others.length;
      const extra = Math.max(0, (w.prev * rate - w.count) * (m.submitted / w.count));
      const rounded = extra >= 100 ? Math.round(extra / 10) * 10 : Math.round(extra);
      if (rounded > 0) {
        const [a, b] = fill(L.gain, {
          field: w.label,
          rate: pct(rate),
          extra: "\u0000",
          from: pct(m.submitted / m.views),
          to: pct((m.submitted + rounded) / m.views),
        }).split("\u0000");
        gain = (
          <p className="mt-2 mb-0 text-[12.5px] text-(--fcc-ink) tabular-nums">
            {a}
            <b className="text-(--fcc-good)">{int(rounded)}</b>
            {b || ""}
          </p>
        );
      }
    }
    tipBody = (
      <>
        <p className="mt-0 mb-1 font-(family-name:--fcc-round) text-[14.5px] leading-[1.3] font-bold">{fill(L.tipTitle, vars)}</p>
        <p className="m-0 text-[13.5px] leading-[1.55] text-(--fcc-muted)">{fill(tips?.[w.id] || L.tipFallback, vars)}</p>
        {gain}
      </>
    );
  }

  /** shared classes for the clickable parts of the mini form */
  const mtarget = (id: string | undefined, worst = false) => {
    const on = !!id && hl === id;
    const pressed = !!id && selected === id;
    return cx(
      "m-0 grid w-full cursor-pointer gap-1.5 rounded-[10px] border-0 bg-transparent p-1.5 text-left text-inherit [font:inherit] transition-[background-color,box-shadow] duration-200 ease-in-out motion-reduce:transition-none",
      "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-(--fcc-accent) disabled:cursor-default",
      (on || pressed) && (worst ? "bg-(--fcc-worst-soft)" : "bg-(--fcc-accent-soft)"),
      pressed && ring(worst ? "worst" : "accent")
    );
  };
  const badge = "rounded-full px-1.5 py-[3px] font-(family-name:--fcc-mono) text-[10.5px] leading-none font-bold tabular-nums transition-[background-color,color] duration-250 motion-reduce:transition-none";

  return (
    <div className={cx("@container/fcc block w-full max-w-[960px] font-(family-name:--fcc-sans) text-(--fcc-ink)", className)}>
      <article
        onPointerOver={onOver}
        onPointerOut={onOut}
        onFocus={onFocusIn}
        onBlur={onFocusOut}
        className="relative rounded-[22px] border border-(--fcc-line) bg-(--fcc-card) px-[26px] pt-[26px] pb-[22px] shadow-[0_30px_60px_-46px_var(--fcc-shadow),0_2px_6px_-4px_var(--fcc-shadow)] @max-[759px]/fcc:px-5 @max-[759px]/fcc:pt-[22px] @max-[759px]/fcc:pb-[18px] @max-[419px]/fcc:rounded-[18px] @max-[419px]/fcc:px-3.5 @max-[419px]/fcc:pt-[18px] @max-[419px]/fcc:pb-3.5"
      >
        {/* header */}
        <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3.5">
          <div className="grid max-w-[48ch] min-w-0 gap-1.5">
            {eyebrow && <span className={cx(monoCap, "text-[10.5px] leading-none tracking-[0.1em] text-(--fcc-accent)")}>{eyebrow}</span>}
            {title && <h2 className="m-0 font-(family-name:--fcc-round) text-[clamp(19px,3cqi,24px)] leading-[1.18] font-bold tracking-[-0.015em] text-balance">{title}</h2>}
            {subtitle && <p className="m-0 text-[13.5px] text-(--fcc-muted)">{subtitle}</p>}
          </div>
          {keys.length > 1 && (
            <div role="group" aria-label={L.device} className="relative inline-flex rounded-xl border border-(--fcc-line) bg-(--fcc-tint) p-1 @max-[419px]/fcc:w-full">
              {keys.map((k) => (
                <button
                  key={k}
                  ref={(el) => {
                    segRefs.current[k] = el;
                  }}
                  type="button"
                  aria-pressed={k === device}
                  onClick={() => chooseDevice(k)}
                  className="inline-flex cursor-pointer items-center gap-[7px] rounded-lg border-0 bg-transparent px-3 py-2 text-[12.5px] leading-none font-semibold text-(--fcc-muted) transition-[background-color,color,box-shadow] duration-200 hover:text-(--fcc-ink) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--fcc-accent) aria-pressed:bg-(--fcc-card) aria-pressed:text-(--fcc-accent) aria-pressed:shadow-[0_1px_3px_-1px_var(--fcc-shadow),0_0_0_1px_var(--fcc-line)] motion-reduce:transition-none @max-[419px]/fcc:flex-1 @max-[419px]/fcc:justify-center @max-[419px]/fcc:px-1.5"
                >
                  {DEVICE_ICON[k] && (
                    <svg viewBox="0 0 16 16" strokeWidth="1.5" {...st} className="size-3.5 flex-none @max-[419px]/fcc:hidden">
                      {DEVICE_ICON[k]}
                    </svg>
                  )}
                  {segments[k]?.label || k}
                </button>
              ))}
            </div>
          )}
        </header>

        {/* KPI strip */}
        <dl className="mt-[22px] mb-0 grid grid-cols-3 gap-2.5 @max-[579px]/fcc:grid-cols-2">
          {[
            { main: true, label: L.conversion, value: <CountUp value={conv} format={pct} />, sub: fill(L.conversionSub, { n: int(m.submitted), views: int(m.views) }) },
            { main: false, label: L.completion, value: <CountUp value={comp} format={pct} />, sub: L.completionSub },
            { main: false, label: L.time, value: fmtTime(num(m.seg?.avgSeconds)), sub: L.timeSub },
          ].map((k) => (
            <div
              key={k.label}
              className={cx(
                "m-0 grid min-w-0 content-start gap-1.5 rounded-[14px] px-4 py-3.5 @max-[759px]/fcc:px-[13px] @max-[759px]/fcc:py-3 @max-[419px]/fcc:p-3",
                k.main ? "bg-(--fcc-accent) text-(--fcc-accent-ink) @max-[579px]/fcc:col-span-full" : "bg-(--fcc-tint)"
              )}
            >
              <dt className={cx(monoCap, "text-[10.5px] leading-[1.2] tracking-[0.08em]", k.main ? "text-inherit opacity-[0.82]" : "text-(--fcc-faint)")}>{k.label}</dt>
              <dd className="m-0 font-(family-name:--fcc-round) text-[clamp(24px,4cqi,32px)] leading-none font-bold tracking-[-0.02em] tabular-nums">{k.value}</dd>
              <dd className={cx("m-0 text-[12.5px] leading-[1.35] tabular-nums @max-[419px]/fcc:text-xs", k.main ? "text-inherit opacity-[0.86]" : "text-(--fcc-muted)")}>{k.sub}</dd>
            </div>
          ))}
        </dl>

        {/* body: mock form + step bars */}
        <div className="mt-[18px] grid grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] items-start gap-[22px] @max-[759px]/fcc:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] @max-[759px]/fcc:gap-4 @max-[579px]/fcc:grid-cols-1">
          <div className="grid content-start justify-items-center rounded-2xl bg-(--fcc-tint) bg-[radial-gradient(circle_at_1px_1px,var(--fcc-tint-2)_1px,transparent_1.4px)] bg-size-[14px_14px] px-[18px] py-5 @max-[759px]/fcc:px-2.5 @max-[759px]/fcc:py-3.5 @max-[579px]/fcc:px-3 @max-[579px]/fcc:py-4">
            <div
              className={cx(
                "w-full overflow-hidden border border-(--fcc-line) bg-(--fcc-card) shadow-[0_22px_40px_-30px_var(--fcc-shadow)] transition-[max-width,border-radius] duration-[450ms] ease-out-soft motion-reduce:transition-none",
                isMobile ? "max-w-[228px] rounded-[26px]" : "max-w-80 rounded-[14px]"
              )}
            >
              <div
                aria-hidden="true"
                className={cx("flex items-center gap-[5px] px-3", isMobile ? "h-6 justify-center border-b-0 bg-transparent" : "h-[26px] border-b border-(--fcc-line) bg-(--fcc-tint)")}
              >
                {!isMobile && [0, 1, 2].map((i) => <i key={i} className="size-[7px] rounded-full bg-(--fcc-skel)" />)}
                <b className={cx("rounded-full", isMobile ? "h-2.5 w-[54px] flex-none bg-(--fcc-ink) opacity-85" : "ml-2.5 h-2 max-w-[60%] flex-1 bg-(--fcc-skel)")} />
              </div>
              <div
                className={cx(
                  "grid gap-1 rounded-[10px] px-2.5 pt-2.5 pb-3 transition-shadow duration-200 ease-in-out motion-reduce:transition-none",
                  startRow && hl === startRow.id && "shadow-[inset_0_0_0_2px_var(--fcc-accent-soft)]"
                )}
              >
                <button
                  type="button"
                  data-step={viewRow?.id}
                  disabled={!viewRow}
                  aria-pressed={viewRow ? selected === viewRow.id : undefined}
                  aria-label={viewRow ? `${viewRow.label}: ${int(viewRow.count)}` : undefined}
                  onClick={() => viewRow && toggle(viewRow.id)}
                  className={cx(mtarget(viewRow?.id), "mb-1")}
                >
                  <span className="font-(family-name:--fcc-round) text-sm leading-[1.25] font-bold">{form?.title || title || "Form"}</span>
                  <span className="grid gap-[5px]">
                    <span className="h-1.5 rounded-full bg-(--fcc-skel)" />
                    <span className="h-1.5 w-[62%] rounded-full bg-(--fcc-skel)" />
                  </span>
                </button>

                {fieldRows.map((r, k) => {
                  const isWorst = !!(m.worst && m.worst.id === r.id);
                  return (
                    <button
                      key={r.id}
                      type="button"
                      data-step={r.id}
                      aria-pressed={selected === r.id}
                      aria-label={`${r.label} field: ${int(r.prev ?? 0)} ${L.reached}, ${int(r.count)} ${L.completed}, ${pct(r.dropRate)} ${L.left}${isWorst ? `. ${L.worst}` : ""}`}
                      onClick={() => toggle(r.id)}
                      className={mtarget(r.id, isWorst)}
                    >
                      <span className={cx("flex items-center justify-between gap-2 text-[11.5px] leading-[1.2] font-semibold", isWorst ? "text-(--fcc-worst)" : "text-(--fcc-muted)")}>
                        <span>{r.label}</span>
                        <span className={cx(badge, isWorst ? "bg-(--fcc-worst) text-(--fcc-card)" : "bg-(--fcc-tint) text-(--fcc-accent)")}>
                          {isWorst ? `−${Math.round((r.dropRate ?? 0) * 100)}%` : r.prev != null && r.prev > 0 ? `${Math.round((r.count / r.prev) * 100)}%` : "—"}
                        </span>
                      </span>
                      <span
                        className={cx(
                          "relative flex h-8 items-center rounded-lg border bg-(--fcc-card) px-2.5 transition-[border-color,box-shadow] duration-250 motion-reduce:transition-none",
                          isWorst ? "border-(--fcc-worst) shadow-[0_0_0_3px_var(--fcc-worst-soft)]" : "border-(--fcc-line)"
                        )}
                      >
                        <span style={{ width: `${SKEL[k % SKEL.length]}%` }} className="h-[7px] rounded-full bg-(--fcc-skel)" />
                      </span>
                    </button>
                  );
                })}

                <button
                  type="button"
                  data-step={subRow?.id}
                  disabled={!subRow}
                  aria-pressed={subRow ? selected === subRow.id : undefined}
                  aria-label={subRow ? `${subRow.label}: ${int(subRow.count)}, ${fill(L.ofViews, { pct: pct(subRow.share) })}` : undefined}
                  onClick={() => subRow && toggle(subRow.id)}
                  className={mtarget(subRow?.id)}
                >
                  <span className="mt-1 flex h-9 items-center justify-center gap-2 rounded-[9px] bg-(--fcc-accent) px-3 font-(family-name:--fcc-round) text-[12.5px] leading-none font-bold text-(--fcc-accent-ink)">
                    <span>{form?.button || "Submit"}</span>
                    {subRow && (
                      <span className={cx(badge, "bg-[color-mix(in_oklab,var(--fcc-accent-ink)_12%,transparent)] text-(--fcc-accent-ink)")}>
                        {pct(m.views > 0 ? subRow.count / m.views : null)}
                      </span>
                    )}
                  </span>
                </button>
              </div>
            </div>
            <p className="mt-3 mb-0 text-center text-[11.5px] text-(--fcc-faint)">{isMobile ? L.mobileNote : device === "desktop" ? L.desktopNote : L.allNote}</p>
          </div>

          {/* step bars */}
          <div>
            <ol className="m-0 grid list-none gap-1 p-0">
              {m.rows.map((r, i) => {
                const isWorst = !!(m.worst && m.worst.id === r.id);
                const pressed = selected === r.id;
                const on = hl === r.id;
                const dropText =
                  r.prev == null
                    ? ""
                    : r.type === "start"
                      ? fill(L.didntStart, { pct: pct(r.dropRate) })
                      : r.type === "submit"
                        ? fill(L.leftSubmit, { pct: pct(r.dropRate) })
                        : fill(L.leftHere, { pct: pct(r.dropRate) });
                const sr = [`${r.label}: ${int(r.count)}`];
                if (i > 0) sr.push(fill(L.ofViews, { pct: pct(r.share) }));
                if (dropText) sr.push(`${int(r.lost)} ${L.left} (${pct(r.dropRate)})`);
                if (isWorst) sr.push(L.worst);
                const wPct = m.views > 0 ? (r.count / m.views) * 100 : 0;
                const lPct = m.views > 0 ? (r.lost / m.views) * 100 : 0;
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      data-step={r.id}
                      aria-pressed={pressed}
                      onClick={() => toggle(r.id)}
                      className={cx(
                        "grid w-full cursor-pointer gap-[7px] rounded-xl border-0 bg-transparent px-3 py-2.5 text-left text-inherit [font:inherit] transition-[background-color,box-shadow] duration-200 ease-in-out motion-reduce:transition-none @max-[759px]/fcc:px-2.5 @max-[759px]/fcc:py-[9px]",
                        "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-(--fcc-accent)",
                        isWorst ? "bg-(--fcc-worst-soft)" : (on || pressed) && "bg-(--fcc-tint)",
                        pressed && ring(isWorst ? "worst" : "accent")
                      )}
                    >
                      <span aria-hidden="true" className="flex items-baseline justify-between gap-2.5">
                        <span className="inline-flex min-w-0 items-center gap-[9px] text-[13.5px] leading-[1.2] font-semibold">
                          <span
                            className={cx(
                              "flex-none rounded-[5px] px-[5px] py-1 font-(family-name:--fcc-mono) text-[10.5px] leading-none font-semibold text-(--fcc-faint)",
                              on || pressed ? "bg-(--fcc-card)" : "bg-(--fcc-tint)"
                            )}
                          >
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <span>{r.label}</span>
                          {isWorst && (
                            <span className="rounded-full bg-(--fcc-worst) px-1.5 py-1 font-(family-name:--fcc-mono) text-[9.5px] leading-none font-bold tracking-[0.06em] whitespace-nowrap text-(--fcc-card) uppercase">
                              {L.worst}
                            </span>
                          )}
                        </span>
                        <span className="font-(family-name:--fcc-round) text-lg leading-none font-bold tracking-[-0.01em] tabular-nums @max-[759px]/fcc:text-base">
                          <CountUp value={r.count} format={(v) => (v == null ? "—" : int(v))} />
                        </span>
                      </span>
                      <span aria-hidden="true" className="relative flex h-3 overflow-hidden rounded-full bg-(--fcc-skel)">
                        <span
                          style={{ width: `${wPct.toFixed(2)}%` }}
                          className="h-full rounded-l-full bg-[linear-gradient(90deg,var(--fcc-accent),var(--fcc-accent-2))] transition-[width] duration-[550ms] ease-out-soft motion-reduce:transition-none"
                        />
                        <span
                          style={{ width: `${lPct.toFixed(2)}%` }}
                          className={cx(
                            "h-full transition-[width] duration-[550ms] ease-out-soft motion-reduce:transition-none",
                            isWorst
                              ? "bg-[repeating-linear-gradient(-45deg,var(--fcc-worst)_0_3px,transparent_3px_6px)]"
                              : "bg-[repeating-linear-gradient(-45deg,color-mix(in_oklab,var(--fcc-muted)_45%,transparent)_0_3px,transparent_3px_6px)]"
                          )}
                        />
                      </span>
                      <span aria-hidden="true" className="flex flex-wrap justify-between gap-x-3 gap-y-1 text-xs text-(--fcc-muted) tabular-nums @max-[419px]/fcc:text-[11.5px]">
                        <span>{i === 0 ? "100%" : fill(L.ofViews, { pct: pct(r.share) })}</span>
                        <span className={cx("font-semibold", isWorst && "text-(--fcc-worst)")}>{dropText}</span>
                      </span>
                      <span className="sr-only">{sr.join(", ")}.</span>
                    </button>
                  </li>
                );
              })}
            </ol>
            <div aria-hidden="true" className="mx-3 mt-1.5 mb-0 flex flex-wrap gap-x-4 gap-y-1.5 text-[11.5px] text-(--fcc-faint)">
              <span className="inline-flex items-center gap-1.5">
                <i className="h-2 w-3.5 rounded-[3px] bg-[linear-gradient(90deg,var(--fcc-accent),var(--fcc-accent-2))]" />
                {L.retained}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <i className="h-2 w-3.5 rounded-[3px] bg-[repeating-linear-gradient(-45deg,color-mix(in_oklab,var(--fcc-muted)_55%,transparent)_0_2px,transparent_2px_4px)] shadow-[inset_0_0_0_1px_var(--fcc-line)]" />
                {L.lost}
              </span>
            </div>
            <p aria-live="polite" className="mx-3 mt-2.5 mb-0 min-h-[1.4em] text-[12.5px] text-(--fcc-muted) tabular-nums [&_b]:font-[650] [&_b]:text-(--fcc-ink)">
              {detailRow ? (
                <>
                  <b>{detailRow.label}</b> ·{" "}
                  {detailRow.prev != null
                    ? `${int(detailRow.prev)} ${L.reached} · ${int(detailRow.count)} ${L.completed} · ${int(detailRow.lost)} ${L.left} (${pct(detailRow.dropRate)})`
                    : int(detailRow.count)}
                </>
              ) : (
                L.selectHint
              )}
            </p>
          </div>
        </div>

        {/* suggestions */}
        <footer className="mt-[18px] grid gap-3 border-t border-dashed border-(--fcc-line) pt-4">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5">
            <button
              type="button"
              aria-expanded={tipOpen}
              aria-controls={tipId}
              onClick={() => setTipOpen((o) => !o)}
              className="group/tip inline-flex min-h-[38px] cursor-pointer items-center gap-2 rounded-[10px] border border-(--fcc-accent) bg-(--fcc-card) px-3.5 text-[13px] leading-none font-[650] text-(--fcc-accent) transition-colors duration-200 hover:bg-(--fcc-accent) hover:text-(--fcc-accent-ink) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--fcc-accent) motion-reduce:transition-none @max-[419px]/fcc:w-full @max-[419px]/fcc:justify-center"
            >
              <span>{tipOpen ? L.hide : L.show}</span>
              <svg
                viewBox="0 0 16 16"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                {...st}
                className="size-[15px] transition-transform duration-300 ease-out-soft group-aria-expanded/tip:rotate-180 motion-reduce:transition-none"
              >
                <path d="m4 6 4 4 4-4" />
              </svg>
            </button>
            {period && <span className="text-xs text-(--fcc-faint)">{period}</span>}
          </div>
          <div id={tipId} hidden={!tipOpen}>
            {tipOpen && (
              <div className="grid animate-[fcc-in_0.35s_cubic-bezier(.2,.7,.2,1)] grid-cols-[36px_minmax(0,1fr)] items-start gap-3.5 rounded-[14px] border border-[color-mix(in_oklab,var(--fcc-worst)_30%,transparent)] bg-(--fcc-worst-soft) px-[18px] py-4 motion-reduce:animate-none @max-[419px]/fcc:grid-cols-[minmax(0,1fr)] @max-[419px]/fcc:p-3.5">
                <span className="grid size-9 place-items-center rounded-[10px] bg-(--fcc-worst) text-(--fcc-card)">
                  <BulbIcon />
                </span>
                <div>{tipBody}</div>
              </div>
            )}
          </div>
        </footer>
      </article>
    </div>
  );
}

export default FormConversionCard;
