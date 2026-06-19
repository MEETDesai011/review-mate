import { useEffect, useRef } from 'react';
import { theme } from '../utils/theme';

export default function ScoreRing({ score = 0, size = 120, strokeWidth = 8 }) {
  const circleRef = useRef(null);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const getColor = (s) => {
    if (s >= 90) return theme.success;
    if (s >= 70) return theme.warning;
    return theme.critical;
  };

  const color = getColor(score);

  useEffect(() => {
    const circle = circleRef.current;
    if (!circle) return;
    circle.style.strokeDashoffset = circumference;
    requestAnimationFrame(() => {
      circle.style.transition = 'stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)';
      circle.style.strokeDashoffset = offset;
    });
  }, [score, circumference, offset]);

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#30363D"
          strokeWidth={strokeWidth}
        />
        <circle
          ref={circleRef}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ filter: `drop-shadow(0 0 6px ${color}40)` }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontSize: size * 0.28,
            fontWeight: 700,
            color,
            lineHeight: 1,
            letterSpacing: '-1px',
          }}
        >
          {score}
        </div>
        <div
          style={{
            fontSize: size * 0.1,
            color: '#8B949E',
            fontWeight: 500,
            marginTop: 2,
          }}
        >
          / 100
        </div>
      </div>
    </div>
  );
}
