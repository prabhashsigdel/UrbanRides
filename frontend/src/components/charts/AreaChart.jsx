import { useId, useRef, useState } from "react";
import { useElementWidth } from "../../hooks/useElementWidth";
import { EASE_OUT, gsap, prefersReducedMotion, useGSAP } from "../../lib/motion";
import { compactNumber, niceMax, ticks, tooltipLeft } from "./chartUtils";
import "./charts.css";

const HEIGHT = 240;
const PAD = { top: 16, right: 16, bottom: 28, left: 40 };

/** Smooth path through the points (monotone-ish cubic, so it never overshoots below zero much). */
function smoothPath(points) {
  if (points.length < 2) return points.length ? `M${points[0][0]},${points[0][1]}` : "";
  let d = `M${points[0][0]},${points[0][1]}`;
  for (let i = 1; i < points.length; i += 1) {
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    const mid = (x1 - x0) / 2;
    d += `C${x0 + mid},${y0} ${x1 - mid},${y1} ${x1},${y1}`;
  }
  return d;
}

/**
 * One-series line with a soft area, a crosshair and a tooltip that follows the nearest point.
 * data: [{ key, label, value, tooltip }].
 */
export default function AreaChart({ data, formatValue = String, emptyText }) {
  const [wrapRef, width] = useElementWidth();
  const svgRef = useRef(null);
  const gradientId = useId();
  const [active, setActive] = useState(null);

  const max = niceMax(Math.max(0, ...data.map((d) => d.value)));
  const plotW = Math.max(width - PAD.left - PAD.right, 0);
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const step = data.length > 1 ? plotW / (data.length - 1) : 0;
  const x = (i) => PAD.left + step * i;
  const y = (v) => PAD.top + plotH - (v / max) * plotH;
  const points = data.map((d, i) => [x(i), y(d.value)]);
  const line = smoothPath(points);
  const baseline = PAD.top + plotH;
  const area = points.length ? `${line}L${x(data.length - 1)},${baseline}L${x(0)},${baseline}Z` : "";
  const last = data.length - 1;
  const isEmpty = data.every((d) => d.value === 0);

  useGSAP(
    () => {
      if (!width || prefersReducedMotion()) return;
      const path = svgRef.current?.querySelector(".chart-line");
      if (!path) return;
      const length = path.getTotalLength();
      gsap.fromTo(path, { strokeDasharray: length, strokeDashoffset: length }, { strokeDashoffset: 0, duration: 1.2, ease: "power2.out", clearProps: "strokeDasharray,strokeDashoffset" });
      gsap.from(".chart-area", { opacity: 0, duration: 1, delay: 0.3, ease: EASE_OUT });
      gsap.from(".chart-last", { scale: 0, transformOrigin: "center", duration: 0.5, delay: 1, ease: EASE_OUT });
    },
    { dependencies: [width > 0], scope: svgRef },
  );

  const handleMove = (event) => {
    if (!step) return;
    const bounds = svgRef.current.getBoundingClientRect();
    const index = Math.round((event.clientX - bounds.left - PAD.left) / step);
    setActive(Math.min(Math.max(index, 0), last));
  };

  const current = active === null ? null : data[active];

  return (
    <div className="chart" ref={wrapRef}>
      {width > 0 && (
        <svg
          ref={svgRef}
          width={width}
          height={HEIGHT}
          role="img"
          aria-label={data.map((d) => `${d.tooltip}: ${formatValue(d.value)}`).join(", ")}
          onMouseMove={handleMove}
          onMouseLeave={() => setActive(null)}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" className="chart-area-stop" stopOpacity="0.22" />
              <stop offset="100%" className="chart-area-stop" stopOpacity="0" />
            </linearGradient>
          </defs>
          {ticks(max).map((t) => (
            <g key={t} className="chart-grid">
              <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} />
              <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end">{compactNumber(t)}</text>
            </g>
          ))}
          {data.map((d, i) => (
            <text key={d.key} className="chart-axis" x={x(i)} y={HEIGHT - 8} textAnchor={i === 0 ? "start" : i === last ? "end" : "middle"}>
              {d.label}
            </text>
          ))}
          <path className="chart-area" d={area} fill={`url(#${gradientId})`} />
          <path className="chart-line" d={line} />
          {current && <line className="chart-crosshair" x1={x(active)} x2={x(active)} y1={PAD.top} y2={baseline} />}
          {points.length > 0 && active === null && <circle className="chart-dot chart-last" cx={points[last][0]} cy={points[last][1]} r="5" />}
          {current && <circle className="chart-dot" cx={points[active][0]} cy={points[active][1]} r="5" />}
        </svg>
      )}
      {isEmpty && emptyText && <p className="chart-empty">{emptyText}</p>}
      {current && (
        <div className="chart-tooltip" style={{ left: tooltipLeft(x(active), width), top: Math.max(y(current.value) - 72, 0) }} role="status">
          <span>{current.tooltip}</span>
          <strong className="tabular">{formatValue(current.value)}</strong>
        </div>
      )}
    </div>
  );
}
