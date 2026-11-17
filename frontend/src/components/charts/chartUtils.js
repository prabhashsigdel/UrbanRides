/** A round axis maximum at or above `value`, with `steps` evenly spaced gridlines. */
export function niceMax(value, steps = 3) {
  if (!value || value <= 0) return steps;
  const rough = value / steps;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= rough);
  return step * steps;
}

/** Tick values from 0 to max, inclusive. */
export const ticks = (max, steps = 3) => Array.from({ length: steps + 1 }, (_, i) => (max / steps) * i);

/** Short axis labels in the local style ("12K", "1.5L" for a lakh). Full values go in the tooltip. */
const compact = new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 });
export const compactNumber = (value) => compact.format(value);

/** Keeps a tooltip inside the chart: centred on x, clamped to the edges. */
export function tooltipLeft(x, width, tooltipWidth = 150) {
  return Math.min(Math.max(x - tooltipWidth / 2, 0), Math.max(width - tooltipWidth, 0));
}
