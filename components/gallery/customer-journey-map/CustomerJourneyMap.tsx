"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import { cx } from "@/lib/format";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type JourneyTone = "peach" | "butter" | "mint" | "sky" | "lilac";
export type TouchpointKind = "search" | "social" | "review" | "web" | "chat" | "phone" | "email" | "sms" | "visit";

export interface JourneyStage {
  id: string;
  label: string;
  /** Column colour. Cycles through the five tones when left out. */
  tone?: JourneyTone;
}

export interface JourneyTouchpoint {
  label: string;
  /** Picks the icon. Defaults to "web". */
  kind?: TouchpointKind;
}

export interface JourneyMetric {
  value: string;
  label?: string;
}

/** What one persona does, meets and feels at one stage. */
export interface JourneyStageEntry {
  goal?: string;
  touchpoints?: Array<JourneyTouchpoint | string>;
  pains?: string[];
  /** −2 (very unhappy) to 2 (very happy). */
  emotion?: number;
  /** One-word feeling. Worked out from the score when left out. */
  mood?: string;
  opportunity?: string;
  metric?: JourneyMetric | null;
  quote?: string;
}

export interface JourneyPersona {
  id: string;
  name: string;
  role?: string;
  summary?: string;
  /** Avatar colour. Picked from a palette when left out. */
  color?: string;
  /** Keyed by stage id. */
  stages: Record<string, JourneyStageEntry>;
}

export interface StageSelectDetail {
  stage: string | null;
  label: string | null;
  index: number;
  persona: string;
  emotion: number | null;
  mood: string | null;
}

/** Built-in text; override any key through `labels`. */
export const CJM_LABELS = {
  personas: "Persona",
  rowStage: "Stage",
  rowGoal: "Customer goal",
  rowTouch: "Touchpoints",
  rowPain: "Pain points",
  rowFeel: "Emotion",
  rowFeelSub: "Higher is happier",
  opportunity: "Opportunity",
  metric: "Number to watch",
  quote: "In their words",
  stageOf: "Stage {n} of {total}",
  prev: "Previous stage",
  next: "Next stage",
  close: "Clear stage focus",
  glance: "{name}'s journey at a glance",
  glanceText: "High point: {high} ({highMood}). Low point: {low} ({lowMood}). Pick a stage to see the opportunity, a key number and what {first} said.",
  showLow: "Show the low point",
  feeling: "Feeling",
  announce: "{stage}, stage {n} of {total}. {name} feels {mood}.",
  noPersona: "Add a persona to see the journey.",
};
export type JourneyLabels = typeof CJM_LABELS;

export interface CustomerJourneyMapProps {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  /** Stages in order. */
  stages: JourneyStage[];
  personas: JourneyPersona[];
  /** Controlled persona id. */
  persona?: string;
  /** Initial persona id when uncontrolled (default: the first). */
  defaultPersona?: string;
  /** Controlled focused stage id; null for none. */
  stage?: string | null;
  defaultStage?: string | null;
  onPersonaChange?: (detail: { persona: string; name: string }) => void;
  onStageSelect?: (detail: StageSelectDetail) => void;
  labels?: Partial<JourneyLabels>;
  className?: string;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const TONES: JourneyTone[] = ["peach", "butter", "mint", "sky", "lilac"];
const AVATARS = ["#B4532A", "#2F6F9F", "#6B4FB0", "#2E7D5B", "#A3336A"];
const TONE_VARS: Record<JourneyTone, string> = {
  peach: "[--cjm-c:var(--cjm-peach)] [--cjm-cs:var(--cjm-peach-strong)]",
  butter: "[--cjm-c:var(--cjm-butter)] [--cjm-cs:var(--cjm-butter-strong)]",
  mint: "[--cjm-c:var(--cjm-mint)] [--cjm-cs:var(--cjm-mint-strong)]",
  sky: "[--cjm-c:var(--cjm-sky)] [--cjm-cs:var(--cjm-sky-strong)]",
  lilac: "[--cjm-c:var(--cjm-lilac)] [--cjm-cs:var(--cjm-lilac-strong)]",
};
type Feel = "pos" | "neu" | "neg";
const FEEL_VARS: Record<Feel, string> = {
  pos: "[--cjm-f:var(--cjm-pos)]",
  neu: "[--cjm-f:var(--cjm-neu)]",
  neg: "[--cjm-f:var(--cjm-neg)]",
};
const MOUTH: Record<string, string> = {
  "2": "M-7,2 Q0,11 7,2",
  "1": "M-6,3 Q0,8.5 6,3",
  "0": "M-5.5,5 L5.5,5",
  "-1": "M-6,7.5 Q0,2.5 6,7.5",
  "-2": "M-7,8.5 Q0,-0.5 7,8.5",
};
const GLYPH: Record<TouchpointKind, ReactNode> = {
  search: <path d="M7 12.5a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11ZM11 11l3.5 3.5" />,
  social: <path d="M5.5 7.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM1.5 14c0-2.5 1.8-4 4-4s4 1.5 4 4M11 7a2 2 0 1 0 0-4M12 10c1.5.3 2.5 1.6 2.5 3.5" />,
  review: <path d="m8 1.8 1.9 3.9 4.2.6-3 3 .7 4.2L8 11.5l-3.8 2 .7-4.2-3-3 4.2-.6z" />,
  web: (
    <>
      <rect x="1.5" y="2.5" width="13" height="11" rx="2" />
      <path d="M1.5 5.5h13M4 4h.01M6 4h.01" />
    </>
  ),
  chat: <path d="M2 3.5A1.5 1.5 0 0 1 3.5 2h9A1.5 1.5 0 0 1 14 3.5v6a1.5 1.5 0 0 1-1.5 1.5H7l-3.5 3v-3h0A1.5 1.5 0 0 1 2 9.5z" />,
  phone: <path d="M3.2 1.8h2.4l1.2 3-1.6 1a8 8 0 0 0 5 5l1-1.6 3 1.2v2.4a1.4 1.4 0 0 1-1.5 1.4A12.5 12.5 0 0 1 1.8 3.3a1.4 1.4 0 0 1 1.4-1.5Z" />,
  email: (
    <>
      <rect x="1.5" y="3" width="13" height="10" rx="2" />
      <path d="m2 4 6 5 6-5" />
    </>
  ),
  sms: (
    <>
      <rect x="3.5" y="1.5" width="9" height="13" rx="2" />
      <path d="M6 4.5h4M6 7h4M6 9.5h2.5" />
    </>
  ),
  visit: <path d="M2 14.5V6.5L8 2l6 4.5v8M6 14.5v-4h4v4" />,
};

const fill = (s: string, vars: Record<string, string | number>) => String(s).replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ""));
const toNum = (v: unknown) => (v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));
const initials = (name?: string) =>
  String(name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] || "")
    .join("")
    .toUpperCase() || "?";
const clampScore = (v: number | null) => Math.max(-2, Math.min(2, v == null ? 0 : v));
const feelOf = (s: number): Feel => (s >= 0.5 ? "pos" : s <= -0.5 ? "neg" : "neu");
const signed = (s: number) => (s > 0 ? "+" + s : s < 0 ? "−" + Math.abs(s) : "0");
const ease = (t: number) => 1 - Math.pow(1 - t, 3);

interface Entry {
  goal: string;
  pains: string[];
  touch: JourneyTouchpoint[];
  score: number;
  mood: string;
  opportunity: string;
  metric: JourneyMetric | null;
  quote: string;
}

function entryOf(p: JourneyPersona | null, s: JourneyStage): Entry {
  const e: JourneyStageEntry = p?.stages?.[s.id] ?? {};
  const score = clampScore(toNum(e.emotion));
  return {
    goal: e.goal || "",
    pains: Array.isArray(e.pains) ? e.pains : [],
    touch: (Array.isArray(e.touchpoints) ? e.touchpoints : []).map((t) => (typeof t === "string" ? { label: t, kind: "web" as const } : t)),
    score,
    mood: e.mood || (score > 0 ? "Positive" : score < 0 ? "Negative" : "Neutral"),
    opportunity: e.opportunity || "",
    metric: e.metric || null,
    quote: e.quote || "",
  };
}

/** Face parts centred on 0,0. Colour comes from --cjm-f on an ancestor. */
function FaceParts({ score }: { score: number }) {
  const s = Math.round(clampScore(score));
  return (
    <>
      <circle r="15" strokeWidth="2.5" className="fill-(--cjm-card) stroke-(--cjm-f)" />
      <circle cx="-5" cy="-3.5" r="1.7" className="fill-(--cjm-ink)" />
      <circle cx="5" cy="-3.5" r="1.7" className="fill-(--cjm-ink)" />
      <path d={MOUTH[String(s)]} fill="none" strokeWidth="1.8" strokeLinecap="round" className="stroke-(--cjm-ink)" />
    </>
  );
}
function FaceSvg({ score, className }: { score: number; className?: string }) {
  return (
    <svg viewBox="-18 -18 36 36" aria-hidden="true" focusable="false" className={cx(FEEL_VARS[feelOf(Math.round(clampScore(score)))], className)}>
      <FaceParts score={score} />
    </svg>
  );
}

const Svg = ({ children, className, sw = 1.8 }: { children: ReactNode; className?: string; sw?: number }) => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
    {children}
  </svg>
);

const label10 = "font-(family-name:--cjm-mono) text-[10px] leading-[1.2] font-medium tracking-[0.09em] uppercase text-(--cjm-faint)";
const iconBtn =
  "grid size-[34px] cursor-pointer appearance-none place-items-center rounded-[10px] border border-(--cjm-line) bg-(--cjm-card) text-(--cjm-ink) transition-[border-color,background-color] duration-200 enabled:hover:border-(--cjm-ink) disabled:cursor-default disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--cjm-ink) motion-reduce:transition-none";
const fade = "animate-[cjm-fade_0.35s_ease_both] motion-reduce:animate-none";

function Block({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cx("grid min-w-0 content-start gap-1.5 rounded-xl bg-(--cjm-card) p-3.5", className)}>
      <span className={label10}>{label}</span>
      {children}
    </div>
  );
}
function MetricBlock({ L, metric, className }: { L: JourneyLabels; metric: JourneyMetric | null; className?: string }) {
  return (
    <Block label={L.metric} className={className}>
      <span className="font-(family-name:--cjm-display) text-[30px] leading-none font-bold tracking-[-0.02em] text-(--cjm-cs) tabular-nums">{metric?.value || "—"}</span>
      {metric?.label && <span className="text-[12.5px] leading-[1.35] text-(--cjm-muted)">{metric.label}</span>}
    </Block>
  );
}
function QuoteBlock({ L, quote, name, className }: { L: JourneyLabels; quote: string; name: string; className?: string }) {
  return (
    <figure className={cx("m-0 grid min-w-0 content-start gap-1.5 rounded-xl bg-(--cjm-card) p-3.5", className)}>
      <span className={label10}>{L.quote}</span>
      <blockquote className="m-0 font-(family-name:--cjm-serif) text-[15px] leading-[1.45] italic">“{quote}”</blockquote>
      <figcaption className="mt-2 text-xs text-(--cjm-muted)">— {name}</figcaption>
    </figure>
  );
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

/**
 * Journey stages with goals, touchpoints, pain points and an emotion curve.
 * Switch personas and focus a stage to see its opportunity, a key number and a quote.
 */
export function CustomerJourneyMap({
  eyebrow,
  title,
  subtitle,
  stages: stagesProp,
  personas: personasProp,
  persona: personaProp,
  defaultPersona,
  stage: stageProp,
  defaultStage = null,
  onPersonaChange,
  onStageSelect,
  labels,
  className,
}: CustomerJourneyMapProps) {
  const L = useMemo(() => ({ ...CJM_LABELS, ...labels }), [labels]);
  const stages = useMemo(
    () =>
      (stagesProp || []).map((s, i) => ({
        id: String(s?.id || `stage-${i + 1}`),
        label: s?.label || `Stage ${i + 1}`,
        tone: s?.tone && TONES.includes(s.tone) ? s.tone : TONES[i % TONES.length],
      })),
    [stagesProp]
  );
  const personas = useMemo(
    () => (personasProp || []).filter((p) => p && p.id != null).map((p, i) => ({ ...p, id: String(p.id), color: p.color || AVATARS[i % AVATARS.length] })),
    [personasProp]
  );

  const [personaState, setPersonaState] = useState(defaultPersona);
  const [stageState, setStageState] = useState<string | null>(defaultStage);
  const rawPersona = personaProp ?? personaState;
  const p = personas.find((x) => x.id === rawPersona) || personas[0] || null;
  const personaId = p?.id ?? "";
  const rawStage = stageProp !== undefined ? stageProp : stageState;
  const on = rawStage && stages.some((s) => s.id === rawStage) ? rawStage : "";
  const onIdx = stages.findIndex((s) => s.id === on);

  const entries = useMemo(() => stages.map((s) => entryOf(p, s)), [stages, p]);
  const scores = useMemo(() => entries.map((e) => e.score), [entries]);

  const mapRef = useRef<HTMLDivElement>(null);
  const curveRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const colRefs = useRef<Array<HTMLDivElement | null>>([]);
  const btnRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [live, setLive] = useState("");
  const [cellAnim, setCellAnim] = useState(0); // bumps on persona change to replay cell fades

  /* ---------- emotion curve geometry + tween ---------- */
  const [geom, setGeom] = useState<{ w: number; h: number; xs: number[] } | null>(null);
  const [shown, setShown] = useState<number[]>(scores);
  const shownRef = useRef(scores);
  const raf = useRef(0);

  const measure = useCallback(() => {
    const box = curveRef.current;
    if (!box) return;
    const w = box.clientWidth;
    const h = box.clientHeight;
    if (!w || !h) {
      setGeom(null);
      return;
    }
    const br = box.getBoundingClientRect();
    const xs = colRefs.current.slice(0, stages.length).map((c) => {
      if (!c) return 0;
      const r = c.getBoundingClientRect();
      return r.left + r.width / 2 - br.left;
    });
    setGeom({ w, h, xs });
  }, [stages.length]);

  useEffect(() => {
    measure();
    const map = mapRef.current;
    if (!map || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(map);
    return () => ro.disconnect();
  }, [measure]);

  useEffect(() => {
    const from = shownRef.current;
    const to = scores;
    cancelAnimationFrame(raf.current);
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || from.length !== to.length || from.every((v, i) => v === to[i])) {
      shownRef.current = to;
      setShown(to);
      return;
    }
    const t0 = performance.now();
    const dur = 480;
    const tick = (now: number) => {
      const k = ease(Math.min(1, (now - t0) / dur));
      const cur = to.map((v, i) => from[i] + (v - from[i]) * k);
      shownRef.current = cur;
      setShown(cur);
      if (k < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [scores]);

  /* ---------- selection ---------- */
  const select = (id: string | null, focusBtn: boolean) => {
    const next = id && stages.some((s) => s.id === id) ? id : "";
    if (next === on) return;
    if (stageProp === undefined) setStageState(next || null);
    const i = stages.findIndex((s) => s.id === next);
    if (focusBtn && next && !mapRef.current?.contains(document.activeElement)) btnRefs.current[i]?.focus({ preventScroll: true });
    const e = i >= 0 ? entries[i] : null;
    if (next && e) setLive(fill(L.announce, { stage: stages[i].label, n: i + 1, total: stages.length, name: p?.name || "", mood: e.mood.toLowerCase() }));
    onStageSelect?.({ stage: next || null, label: i >= 0 ? stages[i].label : null, index: i, persona: personaId, emotion: e ? e.score : null, mood: e ? e.mood : null });
  };

  const choosePersona = (id: string) => {
    if (id === personaId) return;
    if (personaProp === undefined) setPersonaState(id);
    setCellAnim((k) => k + 1);
    const np = personas.find((x) => x.id === id);
    onPersonaChange?.({ persona: id, name: np?.name || "" });
  };

  const onColClick = (e: MouseEvent<HTMLDivElement>, id: string, i: number) => {
    const vertical = (hostRef.current?.getBoundingClientRect().width ?? 1000) < 760;
    const isBtn = !!(e.target as HTMLElement).closest("button");
    if (vertical && !isBtn) return;
    select(on === id ? null : id, false);
    if (isBtn) btnRefs.current[i]?.focus();
  };

  const onStageKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    let ni: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") ni = Math.min(stages.length - 1, i + 1);
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") ni = Math.max(0, i - 1);
    else if (e.key === "Home") ni = 0;
    else if (e.key === "End") ni = stages.length - 1;
    else if (e.key === "Escape") {
      if (on) {
        e.preventDefault();
        select(null, false);
      }
      return;
    }
    if (ni == null) return;
    e.preventDefault();
    e.stopPropagation();
    select(stages[ni].id, false);
    btnRefs.current[ni]?.focus();
  };

  const focusIdx = Math.max(0, onIdx);
  const hasOn = !!on;
  const animate = cellAnim > 0;

  /* ---------- curve path ---------- */
  let curve: ReactNode = null;
  if (geom && geom.xs.length === stages.length) {
    const { w, h, xs } = geom;
    const top = 26;
    const bottom = 52;
    const y = (s: number) => top + ((2 - s) / 4) * (h - top - bottom);
    const pts = xs.map((x, i) => [x, y(shown[i] ?? 0)] as const);
    let d = "";
    pts.forEach((pt, i) => {
      if (!i) {
        d = `M${pt[0].toFixed(1)},${pt[1].toFixed(1)}`;
        return;
      }
      const p0 = pts[i - 2] || pts[i - 1];
      const p1 = pts[i - 1];
      const p2 = pt;
      const p3 = pts[i + 1] || pt;
      const t = 0.18;
      const c1 = [p1[0] + (p2[0] - p0[0]) * t, p1[1] + (p2[1] - p0[1]) * t];
      const c2 = [p2[0] - (p3[0] - p1[0]) * t, p2[1] - (p3[1] - p1[1]) * t];
      d += `C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
    });
    curve = (
      <svg focusable="false" viewBox={`0 0 ${w} ${h}`} className="absolute inset-0 size-full overflow-visible">
        <line x1="0" x2={w} y1={y(0)} y2={y(0)} strokeWidth="1" strokeDasharray="2 4" className="stroke-(--cjm-curve) [stroke-opacity:0.22]" />
        {pts.length > 1 && (
          <>
            <path d={`${d}L${pts[pts.length - 1][0].toFixed(1)},${h - bottom + 14}L${pts[0][0].toFixed(1)},${h - bottom + 14}Z`} className="fill-(--cjm-curve) [fill-opacity:0.045]" />
            <path d={d} fill="none" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="stroke-(--cjm-curve)" />
          </>
        )}
        {pts.map((pt, i) => {
          const s = Math.round(clampScore(scores[i]));
          const isOn = stages[i]?.id === on;
          return (
            <g
              key={stages[i]?.id ?? i}
              transform={`translate(${pt[0].toFixed(1)},${pt[1].toFixed(1)})`}
              className={cx(FEEL_VARS[feelOf(s)], "transition-opacity duration-300 motion-reduce:transition-none", hasOn && !isOn && "opacity-40")}
            >
              <circle r="24" className={cx("fill-(--cjm-f) transition-[fill-opacity] duration-300 motion-reduce:transition-none", isOn ? "[fill-opacity:0.22]" : "[fill-opacity:0]")} />
              <FaceParts score={s} />
            </g>
          );
        })}
      </svg>
    );
  }

  /* ---------- detail card ---------- */
  let detail: ReactNode = null;
  if (p && stages.length) {
    if (onIdx < 0) {
      let hi = 0;
      let lo = 0;
      entries.forEach((e, k) => {
        if (e.score > entries[hi].score) hi = k;
        if (e.score < entries[lo].score) lo = k;
      });
      const first = String(p.name || "").split(" ")[0];
      detail = (
        <div key={`glance-${personaId}`} className={cx("flex flex-wrap items-center gap-3.5", fade)}>
          <span aria-hidden="true" className="grid size-10 flex-none place-items-center rounded-full text-[13px] leading-none font-bold tracking-[0.02em] text-white" style={{ background: p.color }}>
            {initials(p.name)}
          </span>
          <div className="grid min-w-0 flex-[1_1_260px] gap-[3px]">
            <b className="font-(family-name:--cjm-display) text-[14.5px] leading-[1.3] font-[650]">{fill(L.glance, { name: first })}</b>
            <span className="text-[13px] leading-[1.45] text-(--cjm-muted)">
              {fill(L.glanceText, { high: stages[hi].label, highMood: entries[hi].mood.toLowerCase(), low: stages[lo].label, lowMood: entries[lo].mood.toLowerCase(), first })}
            </span>
          </div>
          <button
            type="button"
            onClick={() => select(stages[lo].id, true)}
            className="min-h-9 cursor-pointer appearance-none rounded-[10px] border border-(--cjm-ink) bg-(--cjm-ink) px-3.5 font-(family-name:--cjm-sans) text-[12.5px] leading-none font-[650] text-(--cjm-card) transition-opacity duration-200 hover:opacity-[0.88] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--cjm-ink) motion-reduce:transition-none"
          >
            {L.showLow}
          </button>
        </div>
      );
    } else {
      const s = stages[onIdx];
      const e = entries[onIdx];
      detail = (
        <>
          <div key={`top-${on}-${personaId}`} className={cx("flex flex-wrap items-center gap-x-4 gap-y-2.5", fade)}>
            <div className="grid min-w-0 flex-auto gap-1">
              <span className="font-(family-name:--cjm-mono) text-[10.5px] leading-[1.2] font-medium tracking-[0.08em] text-(--cjm-faint) uppercase">
                {fill(L.stageOf, { n: onIdx + 1, total: stages.length })} · {p.name || ""}
              </span>
              <h3 className="m-0 font-(family-name:--cjm-display) text-xl leading-[1.15] font-bold tracking-[-0.015em]">{s.label}</h3>
            </div>
            <span
              className={cx(
                "inline-flex items-center gap-2 rounded-full bg-(--cjm-card) py-[5px] pr-3 pl-[5px] text-[12.5px] leading-none font-[650] tabular-nums shadow-[inset_0_0_0_1.5px_var(--cjm-f)]",
                FEEL_VARS[feelOf(e.score)]
              )}
            >
              <FaceSvg score={e.score} className="size-6" />
              {e.mood} · {signed(Math.round(e.score))}
            </span>
            <div className="inline-flex gap-1.5">
              <button type="button" aria-label={L.prev} disabled={onIdx === 0} onClick={() => select(stages[onIdx - 1].id, true)} className={iconBtn}>
                <Svg className="size-[15px]">
                  <path d="M10 3 5 8l5 5" />
                </Svg>
              </button>
              <button type="button" aria-label={L.next} disabled={onIdx === stages.length - 1} onClick={() => select(stages[onIdx + 1].id, true)} className={iconBtn}>
                <Svg className="size-[15px]">
                  <path d="m6 3 5 5-5 5" />
                </Svg>
              </button>
              <button type="button" aria-label={L.close} onClick={() => select(null, true)} className={iconBtn}>
                <Svg className="size-[15px]">
                  <path d="m4 4 8 8M12 4l-8 8" />
                </Svg>
              </button>
            </div>
          </div>
          <div key={`grid-${on}-${personaId}`} className={cx("grid grid-cols-[minmax(0,1.2fr)_minmax(0,0.7fr)_minmax(0,1.1fr)] gap-3", fade)}>
            <Block label={L.opportunity}>
              <p className="m-0 text-[13.5px] leading-normal">{e.opportunity || "—"}</p>
            </Block>
            <MetricBlock L={L} metric={e.metric} />
            {e.quote && <QuoteBlock L={L} quote={e.quote} name={p.name || ""} />}
          </div>
        </>
      );
    }
  }

  const detailTone = onIdx >= 0 ? cx(TONE_VARS[stages[onIdx].tone], FEEL_VARS[feelOf(entries[onIdx].score)]) : "";
  const rows: Array<[string, string?]> = [[L.rowStage], [L.rowGoal], [L.rowTouch], [L.rowPain], [L.rowFeel, L.rowFeelSub]];
  const cellBase =
    "min-w-0 border-t border-dashed border-[color-mix(in_oklab,var(--cjm-cs)_28%,transparent)] p-3 @max-[759px]:grid @max-[759px]:content-start @max-[759px]:gap-[7px]";
  const cellLabel =
    "sr-only @max-[759px]:not-sr-only @max-[759px]:font-(family-name:--cjm-mono) @max-[759px]:text-[10px] @max-[759px]:leading-[1.2] @max-[759px]:font-medium @max-[759px]:tracking-[0.08em] @max-[759px]:text-(--cjm-faint) @max-[759px]:uppercase";
  const cellStyle = (i: number, k: number): CSSProperties | undefined => (animate ? { animationDelay: `${i * 40 + k * 25}ms` } : undefined);
  const cellFade = animate && "animate-[cjm-fade_320ms_ease-out_backwards] motion-reduce:animate-none";

  return (
    <div ref={hostRef} className={cx("@container block w-full max-w-[1000px] font-(family-name:--cjm-sans) text-(--cjm-ink)", className)}>
      <article className="relative rounded-[22px] border border-(--cjm-line) bg-(--cjm-card) px-6 pt-[26px] pb-[22px] shadow-[0_30px_60px_-46px_var(--cjm-shadow),0_2px_6px_-4px_var(--cjm-shadow)] @max-[759px]:px-[18px] @max-[759px]:pt-[22px] @max-[759px]:pb-[18px] @max-[479px]:rounded-[18px] @max-[479px]:px-3 @max-[479px]:pt-[18px] @max-[479px]:pb-3.5">
        {/* header */}
        <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
          <div className="grid max-w-[46ch] min-w-0 gap-1.5">
            {eyebrow && <span className="font-(family-name:--cjm-mono) text-[10.5px] leading-none font-medium tracking-[0.1em] text-(--cjm-peach-strong) uppercase">{eyebrow}</span>}
            {title && <h2 className="m-0 font-(family-name:--cjm-display) text-[clamp(20px,3.1cqi,26px)] leading-[1.15] font-bold tracking-[-0.02em] text-balance">{title}</h2>}
            {subtitle && <p className="m-0 text-[13.5px] text-(--cjm-muted)">{subtitle}</p>}
          </div>
          {personas.length > 1 && (
            <div role="group" aria-label={L.personas} className="flex flex-wrap gap-1.5 @max-[479px]:grid @max-[479px]:w-full @max-[479px]:grid-cols-1">
              {personas.map((x) => (
                <button
                  key={x.id}
                  type="button"
                  aria-pressed={x.id === personaId}
                  onClick={() => choosePersona(x.id)}
                  className="inline-flex cursor-pointer appearance-none items-center gap-[9px] rounded-full border border-(--cjm-line) bg-(--cjm-card) py-[5px] pr-3 pl-[5px] text-left font-(family-name:--cjm-sans) text-xs leading-[1.15] font-medium text-(--cjm-muted) transition-[border-color,box-shadow,color,background-color] duration-200 hover:border-(--cjm-faint) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--cjm-ink) aria-pressed:border-(--cjm-ink) aria-pressed:bg-(--cjm-tint) aria-pressed:shadow-[0_0_0_3px_color-mix(in_oklab,var(--cjm-ink)_12%,transparent)] motion-reduce:transition-none @max-[479px]:rounded-[14px]"
                >
                  <span aria-hidden="true" className="grid size-[30px] flex-none place-items-center rounded-full text-[11px] leading-none font-bold tracking-[0.02em] text-white" style={{ background: x.color }}>
                    {initials(x.name)}
                  </span>
                  <span>
                    <b className="block text-[12.5px] leading-[1.15] font-[650] text-(--cjm-ink)">{x.name || x.id}</b>
                    <small className="text-[11px] text-(--cjm-faint)">{x.role || ""}</small>
                  </span>
                </button>
              ))}
            </div>
          )}
        </header>

        <p className="mt-3.5 mb-0 text-[13.5px] text-(--cjm-muted)">
          {p ? (
            <>
              <b className="font-[650] text-(--cjm-ink)">
                {p.name || ""}
                {p.role ? ` · ${p.role}` : ""}
              </b>
              {p.summary ? `  ${p.summary}` : ""}
            </>
          ) : (
            L.noPersona
          )}
        </p>

        {/* the map: row labels + one column per stage (subgrid keeps rows aligned) */}
        <div
          ref={mapRef}
          style={{ "--cjm-n": Math.max(stages.length, 1) } as CSSProperties}
          className="relative mt-5 grid grid-cols-[96px_repeat(var(--cjm-n),minmax(0,1fr))] grid-rows-[auto_auto_auto_auto_156px] gap-x-2 @max-[759px]:grid-cols-[minmax(0,1fr)] @max-[759px]:grid-rows-none @max-[759px]:gap-y-3"
        >
          {rows.map(([text, sub], i) => (
            <div
              key={text}
              aria-hidden="true"
              style={{ gridRow: String(i + 1) }}
              className={cx(
                "col-[1] pr-2 font-(family-name:--cjm-mono) text-[10px] leading-[1.3] font-medium tracking-[0.08em] text-(--cjm-faint) uppercase @max-[759px]:hidden",
                i === 0 ? "self-center py-0" : "border-t border-dashed border-(--cjm-line) pt-3.5 pb-3"
              )}
            >
              {text}
              {sub && <small className="mt-1.5 block font-(family-name:--cjm-sans) text-[11px] leading-[1.35] tracking-normal text-(--cjm-faint) normal-case">{sub}</small>}
            </div>
          ))}

          {stages.map((s, i) => {
            const e = entries[i];
            const isOn = s.id === on;
            const sc = Math.round(e.score);
            const last = i === stages.length - 1;
            return (
              <div
                key={s.id}
                ref={(el) => {
                  colRefs.current[i] = el;
                }}
                onClick={(ev) => onColClick(ev, s.id, i)}
                style={{ "--cjm-col": String(i + 2) } as CSSProperties}
                className={cx(
                  TONE_VARS[s.tone],
                  FEEL_VARS[feelOf(e.score)],
                  "relative col-(--cjm-col) row-[1/span_5] grid min-w-0 cursor-pointer grid-rows-subgrid rounded-2xl bg-(--cjm-c) transition-[opacity,filter,box-shadow,transform] duration-300 ease-out-soft hover:shadow-[0_0_0_1.5px_color-mix(in_oklab,var(--cjm-cs)_45%,transparent)] motion-reduce:transition-none",
                  "@max-[759px]:col-[1] @max-[759px]:row-auto @max-[759px]:cursor-default @max-[759px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] @max-[759px]:grid-rows-none @max-[759px]:[grid-template-areas:'head_head'_'goal_feel'_'touch_pain'_'extra_extra']",
                  "@max-[479px]:grid-cols-[minmax(0,1fr)] @max-[479px]:[grid-template-areas:'head'_'feel'_'goal'_'touch'_'pain'_'extra']",
                  !last && "@max-[759px]:after:absolute @max-[759px]:after:-bottom-[13px] @max-[759px]:after:left-7 @max-[759px]:after:h-3 @max-[759px]:after:w-0.5 @max-[759px]:after:bg-(--cjm-line) @max-[759px]:after:content-['']",
                  hasOn && !isOn && "opacity-[0.42] saturate-[0.55] @max-[759px]:opacity-70 @max-[759px]:saturate-100",
                  isOn && "-translate-y-0.5 shadow-[0_0_0_2px_var(--cjm-cs),0_22px_36px_-24px_var(--cjm-shadow)] hover:shadow-[0_0_0_2px_var(--cjm-cs),0_22px_36px_-24px_var(--cjm-shadow)] motion-reduce:translate-y-0 @max-[759px]:translate-y-0"
                )}
              >
                {/* head */}
                <div className="min-w-0 p-1.5 @max-[759px]:[grid-area:head]">
                  <button
                    ref={(el) => {
                      btnRefs.current[i] = el;
                    }}
                    type="button"
                    aria-pressed={isOn}
                    tabIndex={i === focusIdx ? 0 : -1}
                    onKeyDown={(ev) => onStageKey(ev, i)}
                    className="flex w-full cursor-pointer appearance-none items-center gap-2 rounded-[11px] border-0 bg-[color-mix(in_oklab,var(--cjm-card)_55%,transparent)] px-2 py-2.5 text-left font-(family-name:--cjm-display) text-sm leading-[1.15] font-bold tracking-[-0.01em] text-(--cjm-ink) transition-[background-color] duration-200 hover:bg-(--cjm-card) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--cjm-cs) motion-reduce:transition-none"
                  >
                    <span className="grid size-[22px] flex-none place-items-center rounded-[7px] bg-(--cjm-cs) font-(family-name:--cjm-mono) text-[10.5px] leading-none font-bold text-(--cjm-card)">{i + 1}</span>
                    <span className="min-w-0 [overflow-wrap:anywhere]">{s.label}</span>
                    <Svg className={cx("ml-auto hidden size-4 text-(--cjm-muted) transition-transform duration-[250ms] motion-reduce:transition-none @max-[759px]:block", isOn && "rotate-180")}>
                      <path d="m4 6 4 4 4-4" />
                    </Svg>
                    <span className="sr-only">
                      , {fill(L.stageOf, { n: i + 1, total: stages.length })}, {L.feeling.toLowerCase()} {e.mood.toLowerCase()}
                    </span>
                  </button>
                </div>

                <div key={`goal-${cellAnim}`} style={cellStyle(i, 0)} className={cx(cellBase, cellFade, "@max-[759px]:[grid-area:goal]")}>
                  <span className={cellLabel}>{L.rowGoal}</span>
                  <p className="m-0 text-[13px] leading-[1.45]">{e.goal || "—"}</p>
                </div>

                <div key={`touch-${cellAnim}`} style={cellStyle(i, 1)} className={cx(cellBase, cellFade, "@max-[759px]:[grid-area:touch]")}>
                  <span className={cellLabel}>{L.rowTouch}</span>
                  <ul className="m-0 flex list-none flex-wrap gap-[5px] p-0">
                    {e.touch.map((t, k) => (
                      <li
                        key={k}
                        className="inline-flex max-w-full items-center gap-[5px] rounded-full bg-[color-mix(in_oklab,var(--cjm-card)_70%,transparent)] py-1 pr-2 pl-1.5 text-[11.5px] leading-[1.2] font-medium text-(--cjm-ink)"
                      >
                        <Svg sw={1.5} className="size-3 flex-none text-(--cjm-cs)">
                          {GLYPH[t.kind ?? "web"] ?? GLYPH.web}
                        </Svg>
                        {t.label || ""}
                      </li>
                    ))}
                  </ul>
                </div>

                <div key={`pain-${cellAnim}`} style={cellStyle(i, 2)} className={cx(cellBase, cellFade, "@max-[759px]:border-l @max-[759px]:[grid-area:pain] @max-[479px]:border-l-0")}>
                  <span className={cellLabel}>{L.rowPain}</span>
                  <ul className="m-0 grid list-none gap-1.5 p-0">
                    {e.pains.map((x, k) => (
                      <li
                        key={k}
                        className="grid grid-cols-[12px_minmax(0,1fr)] gap-1.5 text-[12.5px] leading-[1.4] text-(--cjm-muted) before:mt-[5px] before:size-[7px] before:rotate-45 before:rounded-[2px] before:bg-(--cjm-neg) before:content-['']"
                      >
                        {x}
                      </li>
                    ))}
                  </ul>
                </div>

                <div
                  key={`feel-${cellAnim}`}
                  style={cellStyle(i, 3)}
                  className={cx(cellBase, cellFade, "flex flex-col justify-end pb-2.5 @max-[759px]:justify-start @max-[759px]:border-l @max-[759px]:pb-3 @max-[759px]:[grid-area:feel] @max-[479px]:border-l-0")}
                >
                  <span className={cellLabel}>{L.rowFeel}</span>
                  <div className="text-center text-[12.5px] leading-[1.2] font-[650] @max-[759px]:hidden">
                    {e.mood}
                    <span className="mt-0.5 block font-(family-name:--cjm-mono) text-[10.5px] leading-none font-medium text-(--cjm-muted) tabular-nums">{signed(sc)}</span>
                  </div>
                  <div className="hidden grid-cols-[30px_minmax(0,1fr)] items-center gap-x-2.5 gap-y-1 @max-[759px]:grid">
                    <FaceSvg score={e.score} className="row-span-2 size-[30px]" />
                    <b className="text-[13px] leading-[1.2] font-[650]">
                      {e.mood} · {signed(sc)}
                    </b>
                    <span className="grid grid-cols-5 gap-[3px]">
                      {[-2, -1, 0, 1, 2].map((k) => {
                        const lit = sc === 0 ? k === 0 : sc > 0 ? k > 0 && k <= sc : k < 0 && k >= sc;
                        return <i key={k} className={cx("h-1.5 rounded-[2px]", lit ? "bg-(--cjm-f)" : "bg-[color-mix(in_oklab,var(--cjm-ink)_12%,transparent)]")} />;
                      })}
                    </span>
                  </div>
                </div>

                {/* stacked layout: details open inside the focused stage */}
                <div
                  className={cx(
                    "hidden",
                    isOn && "@max-[759px]:grid @max-[759px]:animate-[cjm-fade_0.3s_ease_both] @max-[759px]:gap-2.5 @max-[759px]:px-2.5 @max-[759px]:pb-3 @max-[759px]:[grid-area:extra] motion-reduce:animate-none"
                  )}
                >
                  {isOn && (
                    <>
                      <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,0.6fr)] gap-2.5 @max-[479px]:grid-cols-[minmax(0,1fr)]">
                        <Block label={L.opportunity} className="bg-[color-mix(in_oklab,var(--cjm-card)_82%,transparent)]">
                          <p className="m-0 text-[13.5px] leading-normal">{e.opportunity || "—"}</p>
                        </Block>
                        <MetricBlock L={L} metric={e.metric} className="bg-[color-mix(in_oklab,var(--cjm-card)_82%,transparent)]" />
                      </div>
                      {e.quote && <QuoteBlock L={L} quote={e.quote} name={p?.name || ""} className="bg-[color-mix(in_oklab,var(--cjm-card)_82%,transparent)]" />}
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {/* emotion curve overlay */}
          <div ref={curveRef} aria-hidden="true" className="pointer-events-none relative z-[2] col-[2/-1] row-[5] min-w-0 @max-[759px]:hidden">
            {curve}
          </div>
        </div>

        {/* detail card (wide layout) */}
        {detail && (
          <section
            className={cx(
              "mt-4 grid gap-3.5 rounded-2xl border px-5 py-[18px] @max-[759px]:hidden",
              onIdx >= 0
                ? cx(detailTone, "border-[color-mix(in_oklab,var(--cjm-cs)_35%,transparent)] bg-[color-mix(in_oklab,var(--cjm-c)_55%,var(--cjm-card))]")
                : "border-(--cjm-line) bg-(--cjm-tint)"
            )}
          >
            {detail}
          </section>
        )}
        <p className="sr-only" aria-live="polite">
          {live}
        </p>
      </article>
    </div>
  );
}

export default CustomerJourneyMap;
