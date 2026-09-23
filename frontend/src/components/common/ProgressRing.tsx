import React from 'react';

interface ProgressRingProps {
  percent: number;
  size?: number;
  stroke?: number;
  color?: string;
  trackColor?: string;
  label?: React.ReactNode;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  percent,
  size = 96,
  stroke = 10,
  color = 'var(--brand)',
  trackColor = 'rgba(30,34,51,0.08)',
  label,
}) => {
  const clamped = Math.max(0, Math.min(100, percent));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={trackColor} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped / 100)}
          style={{ stroke: color, transition: 'stroke-dashoffset 600ms ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-center">
        {label ?? <span className="text-lg font-bold text-[#1E2233]">{Math.round(clamped)}%</span>}
      </div>
    </div>
  );
};
