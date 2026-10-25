/** Splits a metric string such as "116-page PRD" into its leading figure and the words that explain it. */
export function splitMetric(metric: string): { readonly figure: string; readonly caption: string } | null {
  const m = /^(~?[\d,]+(?:\+|%)?)(.*)$/.exec(metric);
  if (!m) return null;
  const caption = (m[2] ?? '').replace(/^[-\s]+/, '');
  return caption ? { figure: m[1] ?? '', caption } : null;
}
