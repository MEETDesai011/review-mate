import { severityColors } from '../utils/theme';

const severityIcons = {
  CRITICAL: '🔴',
  WARNING: '🟡',
  INFO: '🔵',
};

export default function SeverityBadge({ severity }) {
  const sev = (severity || '').toUpperCase();
  const color = severityColors[sev] || '#8B949E';
  const icon = severityIcons[sev] || '⚪';

  return (
    <span
      className="badge"
      style={{
        background: `${color}18`,
        color,
        borderColor: `${color}40`,
      }}
    >
      {icon} {sev}
    </span>
  );
}
