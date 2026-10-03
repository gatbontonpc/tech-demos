import type { TierName } from "../types";
import type { DisplaySchool } from "../state/selectors";

const TIERS: { id: TierName; label: string; start: number; end: number }[] = [
  { id: "reach", label: "Reach", start: 0, end: 25 },
  { id: "stretch", label: "Stretch", start: 25, end: 45 },
  { id: "target", label: "Target", start: 45, end: 70 },
  { id: "fit", label: "Strong fit", start: 70, end: 100 },
];

export function ZoneStrip({ schools }: { schools: DisplaySchool[] }) {
  const width = 760;
  const labelW = 168;
  const rowH = 28;
  const top = 28;
  const height = top + schools.length * rowH + 28;
  const right = width - 12;
  const scale = (value: number) => labelW + ((right - labelW) * value) / 100;

  return (
    <div className="zone">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Portfolio zones. Each school is a range, not a point.">
        <defs>
          <pattern id="p-reach" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" fill="var(--tier-reach-bg)" />
            <line x1="0" y1="0" x2="0" y2="6" stroke="var(--tier-reach)" strokeWidth="2" />
          </pattern>
          <pattern id="p-stretch" width="6" height="6" patternUnits="userSpaceOnUse">
            <rect width="6" height="6" fill="var(--tier-stretch-bg)" />
            <circle cx="3" cy="3" r="1.2" fill="var(--tier-stretch)" />
          </pattern>
          <pattern id="p-target" width="6" height="6" patternUnits="userSpaceOnUse">
            <rect width="6" height="6" fill="var(--tier-target-bg)" />
            <line x1="0" y1="3" x2="6" y2="3" stroke="var(--tier-target)" strokeWidth="1.2" />
          </pattern>
          <pattern id="p-fit" width="6" height="6" patternUnits="userSpaceOnUse">
            <rect width="6" height="6" fill="var(--tier-fit-bg)" />
          </pattern>
        </defs>
        {TIERS.map((tier) => {
          const x = scale(tier.start);
          const w = scale(tier.end) - x;
          return (
            <g key={tier.id}>
              <rect x={x} y={top - 8} width={w} height={schools.length * rowH + 10} fill={`url(#p-${tier.id})`} />
              <text x={x + w / 2} y={14} textAnchor="middle" className="zone-label" fill={`var(--tier-${tier.id}-ink)`}>
                {tier.label}
              </text>
            </g>
          );
        })}
        {schools.map((school, index) => {
          const y = top + index * rowH + rowH / 2;
          const x1 = scale(school.range[0]);
          const x2 = scale(school.range[1]);
          return (
            <g key={school.id}>
              <text x={labelW - 8} y={y + 4} textAnchor="end" className="zone-name">
                {school.name.replace(" University", "").replace(" Institute", "").replace(" Polytechnic", "").replace(" College", "")}
              </text>
              <rect
                x={x1}
                y={y - 6}
                width={Math.max(8, x2 - x1)}
                height="12"
                rx="6"
                fill="var(--c-surface)"
                stroke={`var(--tier-${school.tier}-ink)`}
                strokeWidth="2"
              />
            </g>
          );
        })}
        <text x={labelW} y={height - 8} className="zone-caption">
          less often, for profiles like this
        </text>
        <text x={right} y={height - 8} textAnchor="end" className="zone-caption">
          more often, for profiles like this
        </text>
      </svg>
    </div>
  );
}
