import { theme } from '../utils/theme';

export default function ScoreDelta({ delta, previousScore }) {
  if (delta === null || delta === undefined) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <span style={{ color: theme.textSecondary, fontSize: 14 }}>📝 First review</span>
      </div>
    );
  }

  let icon, color, label;

  if (delta > 0) {
    icon = '↑';
    color = theme.success;
    label = `+${delta}`;
  } else if (delta < 0) {
    icon = '↓';
    color = theme.critical;
    label = `${delta}`;
  } else {
    icon = '→';
    color = theme.textSecondary;
    label = 'No change';
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <span style={{ color, fontSize: 15, fontWeight: 600 }}>
        {icon} {label}
      </span>
      {previousScore !== null && previousScore !== undefined && (
        <span style={{ color: theme.textSecondary, fontSize: 11 }}>
          prev: {previousScore}
        </span>
      )}
    </div>
  );
}
