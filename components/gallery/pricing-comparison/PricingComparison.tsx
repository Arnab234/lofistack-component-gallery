"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { cx } from "@/lib/format";

export type BillingPeriod = "monthly" | "yearly";

/** A feature line. `included: false` shows it as not included. */
export interface PricingFeatureItem {
  text: string;
  included?: boolean;
}

/** A plain string counts as an included feature. */
export type PricingFeature = string | PricingFeatureItem;

/** Per-month prices. `yearly` is the per-month price when billed yearly. */
export interface PricingPrice {
  monthly?: number | null;
  yearly?: number | null;
}

export interface PricingCta {
  label?: string;
  /** With an href the button renders as a link. */
  href?: string;
}

export interface PricingTier {
  /** Plan key, used by `featured`. Defaults to `plan-<n>`. */
  id?: string;
  name: string;
  /** One-line summary of who the plan is for. */
  description?: string;
  /** `{ monthly, yearly }`, a single number for both, or `null` for quote-only plans. */
  price: PricingPrice | number | null;
  /** Shown instead of a price when there is none (default "Custom"). */
  priceLabel?: string;
  /** Replaces the billing line under the price. */
  priceNote?: string;
  /** Unit after the price (default "/mo"). */
  per?: string;
  cta?: PricingCta;
  features?: PricingFeature[];
  /** Label on the highlighted plan (default "Most popular"). */
  badge?: string;
  /** Heading above the feature list (default "What's included"). */
  includesLabel?: string;
  /** Highlight this plan when `featured` is not set. */
  featured?: boolean;
}

/** Every piece of UI text. `{name}` placeholders are filled in. */
export interface PricingLabels {
  toggle: string;
  monthly: string;
  yearly: string;
  per: string;
  billedMonthly: string;
  /** Uses {total}. */
  billedYearly: string;
  /** Uses {amount}. */
  save: string;
  /** Uses {pct}. */
  saveBadge: string;
  /** Uses {pct}. */
  saveBadgeUpTo: string;
  badge: string;
  includes: string;
  excluded: string;
  /** Uses {period}. */
  announce: string;
}

export interface PlanSelectDetail {
  id: string;
  name: string;
  billing: BillingPeriod;
  price: number | null;
  currency: string;
}

export interface PricingComparisonProps {
  /** The plans, shown side by side. */
  tiers: PricingTier[];
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  /** Line under the plans. */
  footnote?: string;
  /** Any ISO currency code. */
  currency?: string;
  /** Locale for the price format. */
  locale?: string;
  /** The `id` of the plan to highlight. */
  featured?: string;
  /** Controlled billing period. */
  billing?: BillingPeriod;
  /** Starting billing period when uncontrolled. */
  defaultBilling?: BillingPeriod;
  /** Fires when the switch changes. */
  onBillingChange?: (billing: BillingPeriod) => void;
  /** Fires when a plan's button is clicked. */
  onPlanSelect?: (detail: PlanSelectDetail) => void;
  /** Override any UI text. */
  labels?: Partial<PricingLabels>;
  className?: string;
}

export const DEFAULT_PRICING_LABELS: PricingLabels = {
  toggle: "Billing period",
  monthly: "Monthly",
  yearly: "Yearly",
  per: "/mo",
  billedMonthly: "Billed monthly",
  billedYearly: "{total} billed yearly",
  save: "save {amount}",
  saveBadge: "Save {pct}%",
  saveBadgeUpTo: "Save up to {pct}%",
  badge: "Most popular",
  includes: "What's included",
  excluded: "Not included",
  announce: "Showing {period} prices",
};

const fill = (s: string, vars: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ""));
const num = (v: unknown): number | null => (v === null || v === undefined || v === "" ? null : Number.isFinite(Number(v)) ? Number(v) : null);

function prices(t: PricingTier): { m: number | null; y: number | null } {
  const p = t.price;
  if (p != null && typeof p === "object") return { m: num(p.monthly), y: num(p.yearly) };
  const n = num(p);
  return { m: n, y: n };
}

function moneyParts(v: number, currency: string, locale: string): Intl.NumberFormatPart[] {
  const digits = Number.isInteger(v) ? 0 : 2;
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).formatToParts(v);
  } catch {
    return [
      { type: "currency", value: `${currency} ` },
      { type: "integer", value: v.toFixed(digits) },
    ];
  }
}

const ArrowIcon = () => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    aria-hidden="true"
    className="size-3.5 transition-transform duration-[350ms] ease-out-soft group-hover/cta:translate-x-[3px] motion-reduce:transition-none motion-reduce:group-hover/cta:translate-x-0"
  >
    <path d="M3 8h10M9 4l4 4-4 4" />
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-2.5">
    <path d="M2.5 6.3 5 8.6 9.6 3.6" />
  </svg>
);

const DashIcon = () => (
  <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true" className="size-2.5">
    <path d="M3.5 6h5" />
  </svg>
);

const SparkIcon = () => (
  <svg
    viewBox="0 0 12 12"
    fill="currentColor"
    aria-hidden="true"
    className="size-[11px] transition-transform duration-[600ms] ease-out-soft group-hover/tier:rotate-[72deg] motion-reduce:transition-none motion-reduce:group-hover/tier:rotate-0"
  >
    <path d="M6 .8 7.3 4.7 11.2 6 7.3 7.3 6 11.2 4.7 7.3.8 6l3.9-1.3z" />
  </svg>
);

const EASE = "cubic-bezier(.3,.8,.25,1)";

/**
 * Plans side by side with a monthly / yearly switch and one highlighted plan.
 * Prices swap with a short rise when the billing period changes.
 */
export function PricingComparison({
  tiers,
  eyebrow,
  title,
  subtitle,
  footnote,
  currency: currencyProp = "USD",
  locale = "en-US",
  featured: featuredProp,
  billing: billingProp,
  defaultBilling = "monthly",
  onBillingChange,
  onPlanSelect,
  labels,
  className,
}: PricingComparisonProps) {
  const L: PricingLabels = { ...DEFAULT_PRICING_LABELS, ...labels };
  const currency = currencyProp.toUpperCase();
  const [inner, setInner] = useState<BillingPeriod>(defaultBilling);
  const billing: BillingPeriod = billingProp ?? inner;

  // animate the prices only after the period has changed once
  const [seen, setSeen] = useState(billing);
  const [animated, setAnimated] = useState(false);
  if (seen !== billing) {
    setSeen(billing);
    setAnimated(true);
  }

  const toggleRef = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState<{ w: number; x: number } | null>(null);
  const [ready, setReady] = useState(false);

  const place = useCallback(() => {
    const b = toggleRef.current?.querySelector<HTMLButtonElement>('[aria-pressed="true"]');
    if (!b || !b.offsetWidth) return;
    setThumb({ w: b.offsetWidth, x: b.offsetLeft });
  }, []);

  useEffect(() => {
    place();
  }, [billing, place, L.monthly, L.yearly]);

  useEffect(() => {
    const el = toggleRef.current;
    if (!el) return;
    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(place);
      ro.observe(el);
    }
    document.fonts?.ready.then(place);
    let r2 = 0;
    const r1 = requestAnimationFrame(() => {
      r2 = requestAnimationFrame(() => setReady(true));
    });
    return () => {
      ro?.disconnect();
      cancelAnimationFrame(r1);
      cancelAnimationFrame(r2);
    };
  }, [place]);

  const choose = (b: BillingPeriod) => {
    if (b === billing) return;
    if (billingProp == null) setInner(b);
    onBillingChange?.(b);
  };

  const fmtParts = (v: number) => moneyParts(v, currency, locale);
  const money = (v: number) => fmtParts(v).map((p) => p.value).join("");

  const featured = featuredProp ?? tiers.find((t) => t.featured)?.id;

  // biggest yearly saving across plans, rounded down so it never overstates
  const pcts = tiers
    .map(prices)
    .filter((p) => p.m != null && p.m > 0 && p.y != null && p.y < p.m)
    .map((p) => Math.floor((1 - (p.y as number) / (p.m as number)) * 100));
  const topPct = pcts.length ? Math.max(...pcts) : 0;
  const saveText = topPct > 0 ? fill(pcts.every((x) => x === topPct) ? L.saveBadge : L.saveBadgeUpTo, { pct: topPct }) : "";

  return (
    <div className={cx("@container block w-full max-w-[980px] font-(family-name:--pcc-sans) text-(--pcc-ink)", className)}>
      <div className="relative rounded-[22px] border border-(--pcc-line) bg-(--pcc-card) px-[30px] pt-[30px] pb-6 shadow-[0_1px_0_var(--pcc-highlight)_inset,0_30px_60px_-44px_var(--pcc-shadow),0_2px_6px_-4px_var(--pcc-shadow)] @max-[760px]:rounded-[20px] @max-[760px]:px-5 @max-[760px]:pt-6 @max-[760px]:pb-5 @max-[520px]:px-3.5 @max-[520px]:pt-5 @max-[520px]:pb-4">
        {/* header: title + billing switch */}
        <header className="flex flex-wrap items-end justify-between gap-x-7 gap-y-[18px] @max-[520px]:gap-[18px]">
          {(eyebrow || title || subtitle) && (
            <div className="grid max-w-[46ch] gap-2">
              {eyebrow && (
                <span className="font-(family-name:--pcc-mono) text-[11px] leading-none font-medium tracking-[0.1em] text-(--pcc-accent) uppercase">{eyebrow}</span>
              )}
              {title && (
                <h2 className="m-0 font-(family-name:--pcc-serif) text-[clamp(26px,4.2cqi,36px)] leading-[1.08] font-medium tracking-[-0.015em] text-balance">{title}</h2>
              )}
              {subtitle && <p className="m-0 text-[14.5px] leading-[1.55] text-(--pcc-muted)">{subtitle}</p>}
            </div>
          )}
          <div
            ref={toggleRef}
            role="group"
            aria-label={L.toggle}
            className="relative inline-flex flex-none rounded-full border border-(--pcc-line) bg-(--pcc-tint) p-1 @max-[520px]:w-full"
          >
            <span
              aria-hidden="true"
              className="absolute top-1 bottom-1 left-0 rounded-full bg-(--pcc-raise) shadow-[0_1px_2px_var(--pcc-shadow),0_0_0_1px_var(--pcc-line)] motion-reduce:transition-none!"
              style={{
                width: thumb?.w ?? 0,
                transform: `translateX(${thumb?.x ?? 0}px)`,
                transition: ready ? `transform .45s ${EASE}, width .45s ${EASE}` : "none",
              }}
            />
            {(["monthly", "yearly"] as const).map((b) => (
              <button
                key={b}
                type="button"
                aria-pressed={billing === b}
                onClick={() => choose(b)}
                className={cx(
                  "relative inline-flex cursor-pointer appearance-none items-center justify-center gap-2 rounded-full border-0 bg-transparent px-4 py-[9px] font-(family-name:--pcc-sans) text-[13px] leading-none font-semibold text-(--pcc-muted) transition-colors duration-250 hover:text-(--pcc-ink) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--pcc-accent) aria-pressed:text-(--pcc-ink) @max-[520px]:flex-1",
                  // before the thumb is measured, show the pressed state on the button itself
                  !thumb && "aria-pressed:bg-(--pcc-raise)"
                )}
              >
                <span>{b === "monthly" ? L.monthly : L.yearly}</span>
                {b === "yearly" && saveText && (
                  <span
                    className={cx(
                      "rounded-full px-[7px] py-1 font-(family-name:--pcc-mono) text-[10px] leading-none font-semibold tracking-[0.06em] uppercase transition-colors duration-300 motion-reduce:transition-none",
                      billing === "yearly" ? "bg-(--pcc-accent) text-(--pcc-accent-ink)" : "bg-(--pcc-accent-soft) text-(--pcc-accent)"
                    )}
                  >
                    {saveText}
                  </span>
                )}
              </button>
            ))}
          </div>
        </header>

        {/* tiers */}
        <div
          style={{ "--n": Math.max(tiers.length, 1) } as CSSProperties}
          className="mt-[34px] grid grid-cols-[repeat(var(--n),minmax(0,1fr))] py-4 @max-[760px]:mt-6 @max-[760px]:grid-cols-1 @max-[760px]:gap-3 @max-[760px]:py-0"
        >
          {tiers.map((t, i) => {
            const id = t.id || `plan-${i + 1}`;
            const isFeatured = id === featured;
            const { m, y } = prices(t);
            const v = billing === "yearly" ? (y ?? m) : (m ?? y);
            const saved = billing === "yearly" && y != null && m != null ? (m - y) * 12 : 0;
            const c = t.cta ?? {};
            const select = () =>
              onPlanSelect?.({ id, name: t.name || "", billing, price: billing === "yearly" ? (y ?? m) : (m ?? y), currency });
            const ctaClass = cx(
              "group/cta mt-5 box-border flex min-h-[46px] w-full cursor-pointer appearance-none items-center justify-center gap-2 rounded-xl border px-[18px] font-(family-name:--pcc-sans) text-sm leading-none font-semibold no-underline transition-[background-color,color,border-color,transform] duration-250 focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-(--pcc-accent) active:scale-[.985] motion-reduce:transition-none motion-reduce:active:scale-100",
              isFeatured
                ? "border-(--pcc-accent) bg-(--pcc-accent) text-(--pcc-accent-ink) shadow-[0_12px_22px_-14px_var(--pcc-accent)] hover:border-(--pcc-accent-deep) hover:bg-(--pcc-accent-deep)"
                : "border-(--pcc-line) bg-(--pcc-card) text-(--pcc-ink) hover:border-(--pcc-ink) hover:bg-(--pcc-ink) hover:text-(--pcc-card)"
            );
            const ctaBody = (
              <>
                <span>{c.label || "Choose plan"}</span>
                <ArrowIcon />
              </>
            );
            const animKey = animated ? billing : "init";

            return (
              <article
                key={id}
                className={cx(
                  "group/tier relative row-span-6 grid grid-rows-subgrid content-start px-6 pt-[22px] pb-6 transition-transform duration-[450ms] ease-out-soft *:relative hover:-translate-y-[3px] motion-reduce:transition-none motion-reduce:hover:translate-y-0",
                  "before:pointer-events-none before:absolute before:rounded-2xl before:transition-[opacity,box-shadow] before:duration-300 before:content-[''] motion-reduce:before:transition-none",
                  "@max-[760px]:row-auto @max-[760px]:grid-rows-none @max-[760px]:rounded-2xl @max-[760px]:border @max-[760px]:border-(--pcc-line) @max-[760px]:p-[22px] @max-[760px]:hover:-translate-y-0.5 @max-[760px]:before:-inset-px",
                  "@min-[520px]:@max-[760px]:grid-cols-2 @max-[520px]:px-[18px] @max-[520px]:py-5",
                  i > 0 && "border-l border-(--pcc-line)",
                  isFeatured
                    ? "z-[1] before:-inset-x-px before:-inset-y-4 before:border-[1.5px] before:border-(--pcc-accent) before:bg-(--pcc-raise) before:opacity-100 before:shadow-[0_0_0_5px_var(--pcc-accent-soft),0_28px_50px_-34px_var(--pcc-shadow)] hover:before:shadow-[0_0_0_5px_var(--pcc-accent-soft),0_38px_64px_-36px_var(--pcc-shadow)]"
                    : "before:-inset-x-px before:inset-y-0 before:bg-(--pcc-tint) before:opacity-0 hover:before:opacity-100"
                )}
              >
                <div className="contents *:relative @min-[520px]:@max-[760px]:col-start-1 @min-[520px]:@max-[760px]:grid @min-[520px]:@max-[760px]:content-start @min-[520px]:@max-[760px]:pr-6">
                  <header className="flex min-h-7 flex-wrap items-center justify-between gap-x-2.5 gap-y-2">
                    <h3 className="m-0 font-(family-name:--pcc-serif) text-[23px] leading-[1.15] font-medium tracking-[-0.01em]">{t.name || `Plan ${i + 1}`}</h3>
                    {isFeatured && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-(--pcc-accent) py-1.5 pr-2.5 pl-2 font-(family-name:--pcc-mono) text-[10.5px] leading-none font-semibold tracking-[0.08em] text-(--pcc-accent-ink) uppercase">
                        <SparkIcon />
                        {t.badge || L.badge}
                      </span>
                    )}
                  </header>
                  <p className="mt-2 mb-0 max-w-[34ch] text-sm empty:hidden leading-normal text-(--pcc-muted)">{t.description || ""}</p>
                  <div className="mt-[22px] flex flex-wrap items-baseline gap-1.5">
                    <span
                      key={`a-${animKey}`}
                      style={animated ? { animationDelay: `${i * 45}ms` } : undefined}
                      className={cx(
                        "inline-flex items-baseline font-(family-name:--pcc-serif) text-[clamp(40px,5.6cqi,52px)] leading-none font-medium tracking-[-0.03em] [font-variant-numeric:lining-nums_tabular-nums]",
                        animated && "animate-[pcc-rise_340ms_cubic-bezier(.2,.7,.2,1)_backwards] motion-reduce:animate-none"
                      )}
                    >
                      {v == null
                        ? t.priceLabel || "Custom"
                        : fmtParts(v).map((p, n) =>
                            p.type === "currency" ? (
                              <span key={n} className="mt-[0.2em] mr-[0.08em] self-start text-[0.46em] tracking-normal text-(--pcc-muted)">
                                {p.value.trim()}
                              </span>
                            ) : (
                              <span key={n}>{p.value}</span>
                            )
                          )}
                    </span>
                    {v != null && <span className="font-(family-name:--pcc-sans) text-[13px] leading-none font-medium text-(--pcc-muted)">{t.per || L.per}</span>}
                  </div>
                  <p
                    key={`b-${animKey}`}
                    style={animated ? { animationDelay: `${i * 45 + 60}ms` } : undefined}
                    className={cx(
                      "mt-2 mb-0 text-[12.5px] leading-[1.4] text-(--pcc-muted) tabular-nums [&_b]:font-semibold [&_b]:text-(--pcc-accent)",
                      animated && "animate-[pcc-fade_340ms_cubic-bezier(.2,.7,.2,1)_backwards] motion-reduce:animate-none"
                    )}
                  >
                    {t.priceNote != null ? (
                      t.priceNote
                    ) : v == null ? null : billing === "yearly" && y != null ? (
                      <>
                        {fill(L.billedYearly, { total: money(y * 12) })}
                        {saved > 0 && (
                          <>
                            {" · "}
                            <b>{fill(L.save, { amount: money(saved) })}</b>
                          </>
                        )}
                      </>
                    ) : (
                      L.billedMonthly
                    )}
                  </p>
                  {c.href ? (
                    <a href={c.href} onClick={select} className={ctaClass}>
                      {ctaBody}
                    </a>
                  ) : (
                    <button type="button" onClick={select} className={ctaClass}>
                      {ctaBody}
                    </button>
                  )}
                </div>

                <div className="mt-6 grid content-start gap-3 border-t border-dashed border-(--pcc-line) pt-5 @min-[520px]:@max-[760px]:col-start-2 @min-[520px]:@max-[760px]:mt-0 @min-[520px]:@max-[760px]:border-t-0 @min-[520px]:@max-[760px]:border-l @min-[520px]:@max-[760px]:pt-1 @min-[520px]:@max-[760px]:pl-6">
                  <p className="m-0 font-(family-name:--pcc-mono) text-[10.5px] leading-none font-medium tracking-[0.09em] text-(--pcc-faint) uppercase">
                    {t.includesLabel || L.includes}
                  </p>
                  <ul className="m-0 grid list-none gap-2.5 p-0">
                    {(t.features ?? []).map((f, n) => {
                      const o: PricingFeatureItem = typeof f === "string" ? { text: f } : f;
                      const on = o.included !== false;
                      return (
                        <li
                          key={n}
                          className={cx("grid grid-cols-[18px_minmax(0,1fr)] items-start gap-2.5 text-sm leading-[1.45]", !on && "text-(--pcc-faint)")}
                        >
                          <span
                            style={{ transitionDelay: `${n * 35}ms` }}
                            className={cx(
                              "mt-px grid size-[18px] place-items-center rounded-full transition-colors duration-250 motion-reduce:transition-none",
                              on
                                ? "bg-(--pcc-accent-soft) text-(--pcc-accent) group-hover/tier:bg-(--pcc-accent) group-hover/tier:text-(--pcc-accent-ink)"
                                : "bg-transparent text-(--pcc-faint) shadow-[inset_0_0_0_1px_var(--pcc-line)]"
                            )}
                          >
                            {on ? <CheckIcon /> : <DashIcon />}
                          </span>
                          <span>
                            {!on && <span className="sr-only">{L.excluded}: </span>}
                            {o.text}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </article>
            );
          })}
        </div>

        {footnote && <p className="mt-3.5 mb-0 text-center text-[12.5px] text-(--pcc-faint)">{footnote}</p>}
        <p className="sr-only" aria-live="polite">
          {animated ? fill(L.announce, { period: (billing === "yearly" ? L.yearly : L.monthly).toLowerCase() }) : ""}
        </p>
      </div>
    </div>
  );
}

export default PricingComparison;
