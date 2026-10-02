export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

/** Parse "YYYY-MM-DD" as a UTC date. */
export function parseISODate(s?: string | null): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s ?? "");
  return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null;
}

export const dayLabel = (d: Date) => `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;

export const trimZeros = (s: string) => s.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");

export function formatMoney(value: number, currency = "USD", digits = 0): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(value);
  } catch {
    return `${currency.toUpperCase()} ${value.toFixed(digits)}`;
  }
}

export const formatNumber = (n: number) => n.toLocaleString("en-US");

/** Join class names, skipping falsy values. */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
