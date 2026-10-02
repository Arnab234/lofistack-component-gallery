"use client";

import {
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from "react";
import { cx, dayLabel, parseISODate } from "@/lib/format";

export type PromptMode = "template" | "preview";

export interface PromptVariable {
  /** Matches `{{key}}` in the text (letters, numbers, underscore). */
  key: string;
  label?: string;
  default?: string;
  placeholder?: string;
  /** Up to six quick-pick values shown as chips. */
  suggestions?: string[];
}

export interface PromptVersion {
  id: string;
  text: string;
  /** YYYY-MM-DD. */
  updated?: string;
  note?: string;
}

export interface PromptCopyDetail {
  version: string;
  text: string;
  chars: number;
  tokens: number;
  values: Record<string, string>;
  method: "clipboard" | "selection";
}

/** Every piece of UI text. `{name}` placeholders are filled in. */
export interface PromptLabels {
  versions: string;
  view: string;
  template: string;
  preview: string;
  variables: string;
  filled: string;
  uses: string;
  unused: string;
  reset: string;
  copy: string;
  copied: string;
  selected: string;
  chars: string;
  tokens: string;
  lines: string;
  edited: string;
  changed: string;
  latest: string;
  codeLabel: string;
  announceVersion: string;
  announceReset: string;
  announceCopy: string;
  announceSelect: string;
  undefinedNote: string;
  empty: string;
}

/** Imperative handle, passed back through `ref`. */
export interface AiPromptCardHandle {
  setVariable: (key: string, value: string) => void;
  resetVariables: () => void;
  copy: () => void;
  filledText: () => string;
  values: () => Record<string, string>;
}

export interface AiPromptCardProps {
  /** Prompt title, shown in the title bar. */
  name: string;
  /** One-line purpose. */
  description?: string;
  /** File path shown above the editor. */
  path?: string;
  /** Shown in the model chip. */
  model?: string;
  temperature?: number;
  variables?: PromptVariable[];
  /** Versions in order. Lines new since the previous version get a gutter mark. */
  versions: PromptVersion[];
  /** Controlled version id. */
  version?: string;
  /** Version shown first when uncontrolled (default: the last one). */
  defaultVersion?: string;
  onVersionChange?: (version: string) => void;
  /** Controlled view: `template` shows {{variables}}, `preview` fills them in. */
  mode?: PromptMode;
  defaultMode?: PromptMode;
  onModeChange?: (mode: PromptMode) => void;
  /** Fires on every input or chip change. */
  onVariableChange?: (key: string, value: string) => void;
  /** Fires after Copy, with the filled-in text and counts. */
  onCopy?: (detail: PromptCopyDetail) => void;
  /** Locale for the edited date. */
  locale?: string;
  labels?: Partial<PromptLabels>;
  ref?: Ref<AiPromptCardHandle>;
  className?: string;
}

export const DEFAULT_PROMPT_LABELS: PromptLabels = {
  versions: "Prompt versions",
  view: "View",
  template: "Template",
  preview: "Preview",
  variables: "Variables",
  filled: "{n} of {total} filled",
  uses: "{n}×",
  unused: "Not used in {version}",
  reset: "Reset variables",
  copy: "Copy prompt",
  copied: "Copied",
  selected: "Selected · press Ctrl+C",
  chars: "chars",
  tokens: "tokens",
  lines: "{n} lines",
  edited: "Edited {date}",
  changed: "New since {prev}",
  latest: "Latest version",
  codeLabel: "Prompt {version}, {mode} view",
  announceVersion: "Showing {version}",
  announceReset: "Variables reset to their defaults",
  announceCopy: "Prompt copied, {chars} characters",
  announceSelect: "Clipboard unavailable. Prompt text selected.",
  undefinedNote: "{list} appear in the text but have no input.",
  empty: "This version has no text yet.",
};

const VAR_SRC = "\\{\\{\\s*([A-Za-z_]\\w*)\\s*\\}\\}";
const fill = (s: string, vars: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ""));
const reduceMotion = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const validDefs = (vars?: PromptVariable[]) => (vars ?? []).filter((x) => x && /^[A-Za-z_]\w*$/.test(x.key || ""));
const defaultsOf = (vars?: PromptVariable[]) => Object.fromEntries(validDefs(vars).map((d) => [d.key, d.default == null ? "" : String(d.default)]));

const FileIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-[17px]">
    <path d="M11.5 2.5H6A1.5 1.5 0 0 0 4.5 4v12A1.5 1.5 0 0 0 6 17.5h8a1.5 1.5 0 0 0 1.5-1.5V6.5z" />
    <path d="M11.5 2.5v4h4M7.5 10.5l-1.5 1.5 1.5 1.5M12.5 10.5l1.5 1.5-1.5 1.5" />
  </svg>
);
const SparkIcon = () => (
  <svg viewBox="0 0 12 12" fill="currentColor" aria-hidden="true" className="size-3 text-(--apc-violet)">
    <path d="M6 .6 7.4 4.6 11.4 6 7.4 7.4 6 11.4 4.6 7.4.6 6l4-1.4z" />
  </svg>
);
const BracesIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true" className="size-[13px]">
    <path d="M5.5 2.5c-1.5 0-2 .6-2 2v1.6c0 .9-.5 1.4-1.5 1.9 1 .5 1.5 1 1.5 1.9v1.6c0 1.4.5 2 2 2M10.5 2.5c1.5 0 2 .6 2 2v1.6c0 .9.5 1.4 1.5 1.9-1 .5-1.5 1-1.5 1.9v1.6c0 1.4-.5 2-2 2" />
  </svg>
);
const EyeIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" className="size-[13px]">
    <path d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z" />
    <circle cx="8" cy="8" r="2" />
  </svg>
);
const CopyIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" className="size-3.5 flex-none">
    <rect x="5.5" y="5.5" width="8" height="8" rx="1.6" />
    <path d="M10.5 5.5V4A1.5 1.5 0 0 0 9 2.5H4A1.5 1.5 0 0 0 2.5 4v5A1.5 1.5 0 0 0 4 10.5h1.5" />
  </svg>
);
const CheckIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-3.5 flex-none">
    <path d="m3.5 8.4 3 3 6-6.4" />
  </svg>
);
const ResetIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-3.5 flex-none">
    <path d="M2.8 7.5A5.2 5.2 0 1 1 4.3 11.6" />
    <path d="M2.5 3.5v4h4" />
  </svg>
);

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--apc-violet)";
const btn = cx(
  "inline-flex min-h-[34px] cursor-pointer appearance-none items-center justify-center gap-[7px] rounded-lg border px-[13px] font-(family-name:--apc-sans) text-[12.5px] leading-none font-semibold transition-[background-color,border-color,color,transform] duration-200 active:scale-[.98] motion-reduce:transition-none motion-reduce:active:scale-100",
  focusRing
);

/**
 * A saved prompt shown like a file in a code editor, with version tabs and
 * highlighted variables. Fill in the variables, preview the finished prompt with
 * a rough token count, and copy it in one click.
 */
export function AiPromptCard({
  name,
  description,
  path,
  model,
  temperature,
  variables,
  versions: versionsProp,
  version: versionProp,
  defaultVersion,
  onVersionChange,
  mode: modeProp,
  defaultMode = "template",
  onModeChange,
  onVariableChange,
  onCopy,
  locale,
  labels,
  ref,
  className,
}: AiPromptCardProps) {
  const L: PromptLabels = { ...DEFAULT_PROMPT_LABELS, ...labels };
  const uid = useId();
  const versions = (versionsProp ?? []).filter(Boolean).map((v, i) => ({ ...v, id: String(v.id || `v${i + 1}`) }));
  const defs = validDefs(variables);
  const defKeys = new Set(defs.map((d) => d.key));

  // new data resets the values and the uncontrolled version (like setting el.data)
  const [values, setValues] = useState<Record<string, string>>(() => defaultsOf(variables));
  const [innerVersion, setInnerVersion] = useState(defaultVersion);
  const [seenVars, setSeenVars] = useState(variables);
  const [seenVersions, setSeenVersions] = useState(versionsProp);
  if (seenVars !== variables) {
    setSeenVars(variables);
    setValues(defaultsOf(variables));
  }
  if (seenVersions !== versionsProp) {
    setSeenVersions(versionsProp);
    setInnerVersion(defaultVersion);
  }

  const [innerMode, setInnerMode] = useState<PromptMode>(defaultMode);
  const mode: PromptMode = modeProp ?? innerMode;
  const want = versionProp ?? innerVersion;
  const idx = (() => {
    const hit = versions.findIndex((v) => v.id === want);
    return hit >= 0 ? hit : versions.length - 1;
  })();
  const current = idx >= 0 ? versions[idx] : null;
  const vid = current?.id ?? "";

  const [focusKey, setFocusKey] = useState<string | null>(null);
  const [hoverKey, setHoverKey] = useState<string | null | undefined>(undefined);
  const linked = hoverKey === undefined ? focusKey : (hoverKey ?? focusKey);

  const [copyLabel, setCopyLabel] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const copyTimer = useRef<number | undefined>(undefined);
  const codeRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);

  const announce = useCallback((t: string) => {
    setAnnouncement("");
    requestAnimationFrame(() => setAnnouncement(t));
  }, []);

  const text = current ? String(current.text || "") : "";
  const filledText = useCallback(
    () => text.replace(new RegExp(VAR_SRC, "g"), (m, k: string) => (defKeys.has(k) && String(values[k] || "").trim() ? values[k] : m)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [text, values, variables]
  );
  const filled = filledText();

  // version switch: announce and fade the editor in
  const lastVid = useRef(vid);
  useLayoutEffect(() => {
    if (lastVid.current === vid) return;
    lastVid.current = vid;
    announce(fill(L.announceVersion, { version: vid }));
    if (!reduceMotion() && codeRef.current && typeof codeRef.current.animate === "function") {
      codeRef.current.animate([{ opacity: 0, transform: "translateY(5px)" }, { opacity: 1, transform: "none" }], { duration: 260, easing: "cubic-bezier(.2,.7,.2,1)" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vid]);

  useEffect(() => () => window.clearTimeout(copyTimer.current), []);

  const setMode = (m: PromptMode) => {
    if (m === mode) return;
    if (modeProp == null) setInnerMode(m);
    onModeChange?.(m);
  };

  const selectTab = (id: string) => {
    if (id === vid) return;
    if (versionProp == null) setInnerVersion(id);
    onVersionChange?.(id);
  };

  const setVariable = useCallback(
    (key: string, value: string) => {
      if (!defKeys.has(key)) return;
      setValues((v) => ({ ...v, [key]: value == null ? "" : String(value) }));
      onVariableChange?.(key, value);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [variables, onVariableChange]
  );

  const resetVariables = useCallback(() => {
    setValues(defaultsOf(variables));
    announce(L.announceReset);
  }, [variables, announce, L.announceReset]);

  const flash = (label: string) => {
    setCopyLabel(label);
    window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopyLabel(null), 1800);
  };

  const copy = useCallback(() => {
    const t = filledText();
    const base = { version: vid, text: t, chars: t.length, tokens: Math.ceil(t.length / 4), values: { ...values } };
    const done = (method: "clipboard" | "selection") => {
      flash(method === "clipboard" ? L.copied : L.selected);
      announce(method === "clipboard" ? fill(L.announceCopy, { chars: t.length.toLocaleString("en-US") }) : L.announceSelect);
      onCopy?.({ ...base, method });
    };
    const select = () => {
      if (mode !== "preview") setMode("preview");
      // wait for the preview to render, then select the editor text
      requestAnimationFrame(() => {
        const el = codeRef.current;
        if (el) {
          const r = document.createRange();
          r.selectNodeContents(el);
          const s = getSelection();
          s?.removeAllRanges();
          s?.addRange(r);
        }
        done("selection");
      });
    };
    try {
      navigator.clipboard.writeText(t).then(() => done("clipboard"), select);
    } catch {
      select();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filledText, vid, values, mode, onCopy, announce]);

  useImperativeHandle(ref, () => ({ setVariable, resetVariables, copy, filledText, values: () => ({ ...values }) }), [setVariable, resetVariables, copy, filledText, values]);

  const onTabKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const tabs = Array.from(tabsRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? []);
    const i = tabs.indexOf(document.activeElement as HTMLButtonElement);
    if (i < 0) return;
    let n: number | null = null;
    if (e.key === "ArrowRight") n = (i + 1) % tabs.length;
    else if (e.key === "ArrowLeft") n = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") n = 0;
    else if (e.key === "End") n = tabs.length - 1;
    if (n == null) return;
    e.preventDefault();
    tabs[n].focus();
    selectTab(versions[n].id);
  };

  // gutter marks: lines that did not exist in the previous version
  const prevSet = idx > 0 ? new Set(String(versions[idx - 1].text || "").split(/\r?\n/).map((s) => s.trim())) : null;
  const lines = text ? text.split(/\r?\n/) : [];
  let changedCount = 0;
  const isNew = lines.map((line) => {
    const nw = !!prevSet && !!line.trim() && !prevSet.has(line.trim());
    if (nw) changedCount++;
    return nw;
  });

  // uses per variable in this version, plus variables with no input
  const used: Record<string, number> = {};
  for (const m of text.matchAll(new RegExp(VAR_SRC, "g"))) used[m[1]] = (used[m[1]] || 0) + 1;
  const undef = Object.keys(used).filter((k) => !defKeys.has(k));
  const filledN = defs.filter((d) => String(values[d.key] || "").trim()).length;
  const preview = mode === "preview";

  const dateText = (s?: string) => {
    const d = parseISODate(s);
    if (!d) return s || "";
    return locale ? d.toLocaleDateString(locale, { day: "numeric", month: "short", timeZone: "UTC" }) : dayLabel(d);
  };
  const vmeta = current?.updated ? `${fill(L.edited, { date: dateText(current.updated) })}${current.note ? ` · ${current.note}` : ""}` : current?.note || "";

  const varPill = (k: string, heading: boolean, key: string) => {
    const def = defKeys.has(k);
    const val = String(values[k] || "");
    const empty = def && !val.trim();
    const bad = !def || (preview && empty);
    return (
      <span
        key={key}
        data-key={k}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHoverKey(k);
        }}
        className={cx(
          "mx-px inline rounded-[5px] px-[5px] py-px [box-decoration-break:clone] transition-[background-color,box-shadow,color] duration-200 motion-reduce:transition-none",
          heading ? "font-semibold" : "font-medium",
          bad
            ? "bg-(--apc-red-bg) text-(--apc-red) shadow-[inset_0_0_0_1px_rgba(253,164,175,0.45)]"
            : linked === k
              ? "bg-[rgba(251,191,36,0.28)] text-(--apc-amber) shadow-[inset_0_0_0_1px_var(--apc-amber),0_0_0_3px_rgba(251,191,36,0.12)]"
              : "bg-(--apc-amber-bg) text-(--apc-amber) shadow-[inset_0_0_0_1px_var(--apc-amber-line)]",
          !def && "underline decoration-[rgba(253,164,175,0.7)] decoration-wavy underline-offset-[3px]",
          preview && def && !empty && "font-(family-name:--apc-sans) text-[.97em]"
        )}
      >
        {preview && def && !empty ? val : `{{${k}}}`}
      </span>
    );
  };

  const plain = (s: string, heading: boolean, key: string): ReactNode[] =>
    heading
      ? [s]
      : s
          .split(/(\b\d+\b)/)
          .map((part, i) => (!part ? null : i % 2 ? <span key={`${key}-${i}`} className="text-[#7DD3FC]">{part}</span> : part))
          .filter((x) => x != null);

  const tokenize = (line: string): { heading: boolean; nodes: ReactNode[] } => {
    let rest = line;
    const nodes: ReactNode[] = [];
    const h = /^(#{1,6})(\s.*)?$/.exec(line);
    const b = !h ? /^(\s*)([-*•]|\d+[.)])(\s+)/.exec(line) : null;
    if (h) {
      nodes.push(
        <span key="h" className="mr-[.1em] font-normal text-(--apc-faint)">
          {h[1]}
        </span>
      );
      rest = h[2] || "";
    } else if (b) {
      if (b[1]) nodes.push(b[1]);
      nodes.push(
        <span key="b" className="text-(--apc-violet)">
          {b[2]}
        </span>,
        b[3]
      );
      rest = line.slice(b[0].length);
    }
    let last = 0;
    let n = 0;
    for (const m of rest.matchAll(new RegExp(VAR_SRC, "g"))) {
      const at = m.index ?? 0;
      if (at > last) nodes.push(...plain(rest.slice(last, at), !!h, `p${n}`));
      nodes.push(varPill(m[1], !!h, `v${n}`));
      last = at + m[0].length;
      n++;
    }
    if (last < rest.length) nodes.push(...plain(rest.slice(last), !!h, "pz"));
    return { heading: !!h, nodes };
  };

  const panelId = `${uid}-panel`;
  const tabId = (i: number) => `${uid}-tab-${i}`;

  return (
    <div className={cx("@container block w-full max-w-[960px] font-(family-name:--apc-sans) text-(--apc-text) [color-scheme:dark]", className)}>
      <div className="relative overflow-hidden rounded-2xl bg-(--apc-bg) shadow-[0_0_0_1px_var(--apc-edge),0_1px_0_rgba(255,255,255,0.05)_inset,0_40px_70px_-44px_var(--apc-shadow),0_4px_12px_-6px_var(--apc-shadow)] before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-[linear-gradient(90deg,transparent,var(--apc-violet),transparent)] before:opacity-55 before:content-[''] @max-[480px]:rounded-[14px]">
        {/* title bar */}
        <header className="flex flex-wrap items-center justify-between gap-x-5 gap-y-3 border-b border-(--apc-line) bg-(--apc-bar) px-[18px] py-3.5 @max-[480px]:px-3.5 @max-[480px]:py-3">
          <div className="flex min-w-0 flex-[1_1_320px] items-center gap-3 @max-[480px]:basis-full @max-[480px]:flex-wrap">
            <span className="grid size-[34px] flex-none place-items-center rounded-[9px] bg-(--apc-violet-soft) text-(--apc-violet) shadow-[inset_0_0_0_1px_rgba(167,139,250,0.32)]">
              <FileIcon />
            </span>
            <div className="grid min-w-0 gap-[3px] @max-[480px]:flex-[1_1_calc(100%-46px)]">
              <h2 className="m-0 font-(family-name:--apc-display) text-[15.5px] leading-[1.2] font-semibold tracking-[-0.01em] [overflow-wrap:anywhere] text-(--apc-text)">
                {name || "Untitled prompt"}
              </h2>
              {description && <span className="text-[12.5px] leading-[1.35] text-(--apc-muted)">{description}</span>}
            </div>
            {model && (
              <span className="inline-flex flex-none items-center gap-1.5 rounded-full bg-(--apc-raise) px-[9px] py-1.5 font-(family-name:--apc-mono) text-[11.5px] leading-none font-medium text-(--apc-text) shadow-[inset_0_0_0_1px_var(--apc-line)] @max-[480px]:ml-[46px]">
                <SparkIcon />
                {model}
                {temperature != null && Number.isFinite(temperature) && <i className="text-(--apc-muted) not-italic">{` · temp ${temperature.toFixed(1)}`}</i>}
              </span>
            )}
          </div>
          {versions.length >= 2 && (
            <div
              ref={tabsRef}
              role="tablist"
              aria-label={L.versions}
              onKeyDown={onTabKey}
              className="inline-flex gap-0.5 rounded-[10px] bg-(--apc-bg) p-[3px] shadow-[inset_0_0_0_1px_var(--apc-line)] @max-[480px]:w-full"
            >
              {versions.map((v, i) => {
                const on = v.id === vid;
                const latest = i === versions.length - 1;
                return (
                  <button
                    key={v.id}
                    type="button"
                    role="tab"
                    id={tabId(i)}
                    aria-controls={panelId}
                    aria-selected={on}
                    tabIndex={on ? 0 : -1}
                    onClick={() => selectTab(v.id)}
                    className={cx(
                      "relative inline-flex cursor-pointer appearance-none items-center gap-1.5 rounded-[7px] border-0 px-3 py-[7px] font-(family-name:--apc-mono) text-[12.5px] leading-none font-semibold transition-[background-color,color] duration-200 motion-reduce:transition-none @max-[480px]:flex-1 @max-[480px]:justify-center",
                      focusRing,
                      on
                        ? "bg-(--apc-violet-strong) text-white shadow-[0_6px_16px_-8px_var(--apc-violet-strong)]"
                        : "bg-transparent text-(--apc-muted) hover:bg-(--apc-line-soft) hover:text-(--apc-text)"
                    )}
                  >
                    <span>{v.id}</span>
                    {latest && (
                      <>
                        <span title={L.latest} aria-hidden="true" className="size-[5px] rounded-full bg-(--apc-green)" />
                        <span className="sr-only">, {L.latest}</span>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </header>

        {/* body: editor + variables */}
        <div className="grid grid-cols-[minmax(0,1fr)_292px] @max-[760px]:grid-cols-1">
          <div className="grid min-w-0 grid-rows-[auto_1fr]">
            <div className="flex flex-wrap items-center justify-between gap-x-3.5 gap-y-2.5 border-b border-(--apc-line-soft) py-2.5 pr-3.5 pl-[18px] @max-[480px]:px-3">
              <span className="flex min-w-0 items-center gap-1.5 font-(family-name:--apc-mono) text-xs leading-[1.3] [overflow-wrap:anywhere] text-(--apc-faint)">
                {(path || current) && (
                  <span>
                    {path ? path.replace(/\/?$/, "/") : ""}
                    <b className="font-medium text-(--apc-text)">{`${vid}.md`}</b>
                  </span>
                )}
              </span>
              <div role="group" aria-label={L.view} className="inline-flex rounded-lg bg-(--apc-bar) p-0.5 shadow-[inset_0_0_0_1px_var(--apc-line)] @max-[480px]:w-full">
                {(["template", "preview"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={mode === m}
                    onClick={() => setMode(m)}
                    className={cx(
                      "inline-flex cursor-pointer appearance-none items-center gap-1.5 rounded-md border-0 bg-transparent px-2.5 py-1.5 font-(family-name:--apc-sans) text-xs leading-none font-medium text-(--apc-muted) transition-[background-color,color] duration-200 hover:text-(--apc-text) aria-pressed:bg-(--apc-raise) aria-pressed:text-(--apc-text) aria-pressed:shadow-[inset_0_0_0_1px_var(--apc-line)] motion-reduce:transition-none @max-[480px]:flex-1 @max-[480px]:justify-center",
                      focusRing
                    )}
                  >
                    {m === "template" ? <BracesIcon /> : <EyeIcon />}
                    <span>{m === "template" ? L.template : L.preview}</span>
                  </button>
                ))}
              </div>
            </div>
            <div
              ref={codeRef}
              id={panelId}
              role="tabpanel"
              tabIndex={0}
              aria-labelledby={versions.length >= 2 && idx >= 0 ? tabId(idx) : undefined}
              aria-label={fill(L.codeLabel, { version: vid, mode: preview ? L.preview.toLowerCase() : L.template.toLowerCase() })}
              onPointerOver={() => setHoverKey(null)}
              onPointerLeave={() => setHoverKey(undefined)}
              className={cx(
                "relative max-h-[430px] overflow-auto pt-3.5 pb-[18px] font-(family-name:--apc-mono) text-[13px] leading-[1.75] text-(--apc-text) outline-none [scrollbar-color:var(--apc-line)_transparent] [scrollbar-width:thin] @max-[760px]:max-h-[380px] @max-[480px]:pt-2.5 @max-[480px]:text-xs",
                focusRing
              )}
            >
              {lines.length ? (
                lines.map((line, i) => {
                  const { heading, nodes } = tokenize(line);
                  return (
                    <div
                      key={i}
                      className="grid min-h-[1.75em] grid-cols-[52px_minmax(0,1fr)] transition-colors duration-250 hover:bg-[rgba(255,255,255,0.025)] motion-reduce:transition-none @max-[480px]:grid-cols-[34px_minmax(0,1fr)]"
                    >
                      <span
                        aria-hidden="true"
                        className={cx(
                          "relative pr-4 text-right tabular-nums select-none @max-[480px]:pr-2.5",
                          isNew[i]
                            ? "text-(--apc-muted) before:absolute before:top-[3px] before:bottom-[3px] before:left-0 before:w-[3px] before:rounded-r-[3px] before:bg-(--apc-violet) before:content-['']"
                            : "text-(--apc-faint)"
                        )}
                      >
                        {i + 1}
                      </span>
                      <span className={cx("pr-[18px] [overflow-wrap:anywhere] whitespace-pre-wrap @max-[480px]:pr-3", heading && "font-semibold text-(--apc-violet)")}>
                        {nodes}
                        {i === lines.length - 1 && (
                          <span
                            aria-hidden="true"
                            className="ml-0.5 inline-block h-[1.15em] w-0.5 animate-[apc-blink_1.1s_steps(1)_infinite] bg-(--apc-violet) align-[-0.2em] motion-reduce:animate-none"
                          />
                        )}
                      </span>
                    </div>
                  );
                })
              ) : (
                <p className="m-0 px-[18px] py-6 font-(family-name:--apc-sans) text-[13px] leading-normal text-(--apc-muted)">{L.empty}</p>
              )}
            </div>
          </div>

          {/* variables panel */}
          <aside className="grid min-w-0 content-start gap-3.5 border-l border-(--apc-line) bg-(--apc-panel) px-[18px] pt-4 pb-[18px] @max-[760px]:border-t @max-[760px]:border-l-0 @max-[480px]:px-3 @max-[480px]:py-3.5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="m-0 font-(family-name:--apc-mono) text-[11px] leading-none font-semibold tracking-[0.1em] text-(--apc-muted) uppercase">{L.variables}</h3>
              {defs.length > 0 && (
                <span
                  className={cx(
                    "inline-flex items-center gap-1.5 text-[11.5px] leading-none font-medium text-(--apc-muted) tabular-nums before:size-[7px] before:rounded-full before:content-['']",
                    filledN < defs.length ? "before:bg-(--apc-red)" : "before:bg-(--apc-green)"
                  )}
                >
                  {fill(L.filled, { n: filledN, total: defs.length })}
                </span>
              )}
            </div>
            <div
              className="grid gap-3 @max-[760px]:grid-cols-[repeat(auto-fit,minmax(190px,1fr))]"
              onPointerLeave={() => setHoverKey(undefined)}
              onFocus={(e) => setFocusKey((e.target as HTMLElement).closest<HTMLElement>("[data-field]")?.dataset.field ?? null)}
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocusKey(null);
              }}
            >
              {defs.map((def) => {
                const id = `${uid}-var-${def.key}`;
                const n = used[def.key] || 0;
                const val = values[def.key] ?? "";
                return (
                  <div
                    key={def.key}
                    data-field={def.key}
                    onPointerOver={() => setHoverKey(def.key)}
                    className={cx(
                      "grid gap-[7px] rounded-[11px] bg-(--apc-bg) px-3 pt-[11px] pb-3 transition-[box-shadow,background-color] duration-250 motion-reduce:transition-none",
                      linked === def.key ? "shadow-[inset_0_0_0_1px_var(--apc-amber-line),0_0_0_3px_rgba(251,191,36,0.08)]" : "shadow-[inset_0_0_0_1px_var(--apc-line-soft)]",
                      !n && "opacity-[.62]"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <label htmlFor={id} className="font-(family-name:--apc-mono) text-xs leading-none font-medium [overflow-wrap:anywhere] text-(--apc-amber)">
                        {`{{${def.key}}}`}
                      </label>
                      <span className="flex-none rounded-[5px] bg-(--apc-line-soft) px-1.5 py-[3px] font-(family-name:--apc-mono) text-[10.5px] leading-none font-medium text-(--apc-faint)">
                        {n ? fill(L.uses, { n }) : fill(L.unused, { version: vid })}
                      </span>
                    </div>
                    {def.label && (
                      <span id={`${id}-l`} className="text-[12.5px] text-(--apc-muted)">
                        {def.label}
                      </span>
                    )}
                    <input
                      id={id}
                      type="text"
                      autoComplete="off"
                      spellCheck={false}
                      value={val}
                      placeholder={def.placeholder || def.label || def.key}
                      aria-describedby={def.label ? `${id}-l` : undefined}
                      onChange={(e) => setVariable(def.key, e.target.value)}
                      className="box-border min-h-9 w-full rounded-lg border border-(--apc-line) bg-(--apc-raise) px-2.5 py-[7px] font-(family-name:--apc-sans) text-[13.5px] leading-[1.35] text-(--apc-text) transition-[border-color,box-shadow] duration-200 placeholder:text-(--apc-faint) hover:border-[#34376A] focus:border-(--apc-violet) focus:shadow-[0_0_0_3px_var(--apc-violet-soft)] focus:outline-none motion-reduce:transition-none"
                    />
                    {def.suggestions && def.suggestions.length > 0 && (
                      <div role="group" aria-label={`${def.label || def.key} suggestions`} className="flex flex-wrap gap-[5px]">
                        {def.suggestions.slice(0, 6).map((s) => {
                          const on = val === String(s);
                          return (
                            <button
                              key={s}
                              type="button"
                              aria-pressed={on}
                              onClick={() => setVariable(def.key, String(s))}
                              className={cx(
                                "cursor-pointer appearance-none rounded-full border-0 px-2 py-[5px] font-(family-name:--apc-sans) text-[11.5px] leading-none font-medium transition-[background-color,color] duration-200 motion-reduce:transition-none",
                                focusRing,
                                on
                                  ? "bg-(--apc-amber-bg) text-(--apc-amber) shadow-[inset_0_0_0_1px_var(--apc-amber-line)]"
                                  : "bg-(--apc-line-soft) text-(--apc-muted) hover:bg-(--apc-line) hover:text-(--apc-text)"
                              )}
                            >
                              {s}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {undef.length > 0 && (
              <p className="m-0 text-xs leading-[1.45] text-(--apc-faint)">{fill(L.undefinedNote, { list: undef.map((k) => `{{${k}}}`).join(", ") })}</p>
            )}
            <button type="button" onClick={resetVariables} className={cx(btn, "justify-self-start border-(--apc-line) bg-transparent text-(--apc-muted) hover:border-[#3A3D74] hover:bg-[#22244A] hover:text-(--apc-text)")}>
              <ResetIcon />
              <span>{L.reset}</span>
            </button>
          </aside>
        </div>

        {/* status bar */}
        <footer className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5 border-t border-(--apc-line) bg-(--apc-bar) py-2.5 pr-3.5 pl-[18px] @max-[480px]:p-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 font-(family-name:--apc-mono) text-[11.5px] leading-[1.3] text-(--apc-muted) tabular-nums [&_b]:font-semibold [&_b]:text-(--apc-text)">
            <span>
              <b>{filled.length.toLocaleString("en-US")}</b> {L.chars}
            </span>
            <span>
              ≈ <b>{Math.ceil(filled.length / 4).toLocaleString("en-US")}</b> {L.tokens}
            </span>
            <span aria-hidden="true" className="h-3 w-px bg-(--apc-line)" />
            <span>{fill(L.lines, { n: lines.length })}</span>
            {vmeta && <span className="text-(--apc-faint)">{vmeta}</span>}
            {changedCount > 0 && idx > 0 && (
              <span className="inline-flex items-center gap-1.5 text-(--apc-faint) before:h-[11px] before:w-[3px] before:rounded-[2px] before:bg-(--apc-violet) before:content-['']">
                {fill(L.changed, { prev: versions[idx - 1].id })}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2 @max-[480px]:w-full">
            <button
              type="button"
              onClick={copy}
              className={cx(
                btn,
                "@max-[480px]:w-full @max-[480px]:flex-1",
                copyLabel
                  ? "border-[#1E6A52] bg-[#0F3B2E] text-(--apc-green) shadow-none"
                  : "border-(--apc-violet-strong) bg-(--apc-violet-strong) text-white shadow-[0_10px_22px_-12px_var(--apc-violet-strong)] hover:border-(--apc-violet-deep) hover:bg-(--apc-violet-deep)"
              )}
            >
              {copyLabel ? <CheckIcon /> : <CopyIcon />}
              <span>{copyLabel ?? L.copy}</span>
            </button>
          </div>
        </footer>
        <p className="sr-only" aria-live="polite">
          {announcement}
        </p>
      </div>
    </div>
  );
}

export default AiPromptCard;
