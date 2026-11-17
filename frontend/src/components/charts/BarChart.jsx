import { useRef, useState } from "react";
import { useElementWidth } from "../../hooks/useElementWidth";
import { EASE_OUT, gsap, prefersReducedMotion, useGSAP } from "../../lib/motion";
import { compactNumber, niceMax, ticks, tooltipLeft } from "./chartUtils";
import "./charts.css";

const HEIGHT = 220;
const PAD = { top: 12, right: 4, bottom: 28, left: 32 };
const RADIUS = 4;

/** Bar with rounded top corners and a square foot on the baseline. */
function barPath(x, y, w, h) {
  if (h <= 0) return "";
  const r = Math.min(RADIUS, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

/**
 * One-series bar chart with a per-bar hover tooltip.
 * data: [{ key, label, value, tooltip }]; label is the x-axis text, tooltip the hover heading.
 */
export default function BarChart({ data, formatValue = String, emptyText }) {
  const [wrapRef, width] = useElementWidth();
  const svgRef = useRef(null);
  const [active, setActive] = useState(null);

  const max = niceMax(Math.max(0, ...data.map((d) => d.value)));
  const plotW = Math.max(width - PAD.left - PAD.right, 0);
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const band = data.length ? plotW / data.length : 0;
  const barW = Math.max(Math.min(band * 0.56, 28), 2);
  const y = (v) => PAD.top + plotH - (v / max) * plotH;
  const labelEvery = band < 34 ? 2 : 1;
  const isEmpty = data.every((d) => d.value === 0);

  useGSAP(
    () => {
      if (!width || prefersReducedMotion()) return;
      gsap.from(".chart-bar", { scaleY: 0, transformOrigin: "50% 100%", duration: 0.9, ease: EASE_OUT, stagger: 0.025 });
    },
    { dependencies: [width > 0], scope: svgRef },
  );

  const current = active === null ? null : data[active];
  const currentX = active === null ? 0 : PAD.left + band * active + band / 2;

  return (
    <div className="chart" ref={wrapRef} onMouseLeave={() => setActive(null)}>
      {width > 0 && (
        <svg ref={svgRef} width={width} height={HEIGHT} role="img" aria-label={data.map((d) => `${d.tooltip}: ${formatValue(d.value)}`).join(", ")}>
          {ticks(max).map((t) => (
            <g key={t} className="chart-grid">
              <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} />
              <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end">{compactNumber(t)}</text>
            </g>
          ))}
          {data.map((d, i) => {
            const x = PAD.left + band * i + (band - barW) / 2;
            return (
              <g key={d.key}>
                <path className="chart-bar" data-dim={active !== null && active !== i} d={barPath(x, y(d.value), barW, PAD.top + plotH - y(d.value))} />
                {i % labelEvery === (data.length - 1) % labelEvery && (
                  <text className="chart-axis" x={x + barW / 2} y={HEIGHT - 8} textAnchor="middle">{d.label}</text>
                )}
                <rect className="chart-hit" x={PAD.left + band * i} y={PAD.top} width={band} height={plotH} onMouseEnter={() => setActive(i)} />
              </g>
            );
          })}
        </svg>
      )}
      {isEmpty && emptyText && <p className="chart-empty">{emptyText}</p>}
      {current && (
        <div className="chart-tooltip" style={{ left: tooltipLeft(currentX, width), top: Math.max(y(current.value) - 64, 0) }} role="status">
          <span>{current.tooltip}</span>
          <strong className="tabular">{formatValue(current.value)}</strong>
        </div>
      )}
    </div>
  );
}
