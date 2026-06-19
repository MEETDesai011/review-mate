import { theme } from '../utils/theme';

const medals = ['🥇', '🥈', '🥉'];

export default function LeaderboardRow({ entry, rank, category }) {
  const maxValue = 100;
  const value = entry.value ?? entry.avgScore ?? entry.improvement ?? entry.securityScore ?? 0;
  const barWidth = Math.min((value / maxValue) * 100, 100);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '12px 16px',
        borderRadius: 10,
        position: 'relative',
        overflow: 'hidden',
        background: rank <= 3 ? 'rgba(88, 166, 255, 0.04)' : 'transparent',
        borderBottom: '1px solid rgba(48, 54, 61, 0.5)',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(88, 166, 255, 0.06)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = rank <= 3 ? 'rgba(88, 166, 255, 0.04)' : 'transparent'; }}
    >
      {/* Background bar */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: `${barWidth}%`,
          background: `linear-gradient(90deg, rgba(88, 166, 255, 0.06), transparent)`,
          transition: 'width 0.6s ease',
        }}
      />

      {/* Rank */}
      <div
        style={{
          width: 32,
          textAlign: 'center',
          fontSize: rank <= 3 ? 20 : 14,
          fontWeight: 700,
          color: rank <= 3 ? undefined : theme.textSecondary,
          position: 'relative',
          zIndex: 1,
        }}
      >
        {rank <= 3 ? medals[rank - 1] : `#${rank}`}
      </div>

      {/* Avatar placeholder */}
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${theme.accent}, ${theme.testing})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 14,
          fontWeight: 700,
          color: 'white',
          flexShrink: 0,
          position: 'relative',
          zIndex: 1,
        }}
      >
        {(entry.author || entry.name || '?')[0].toUpperCase()}
      </div>

      {/* Name & PR count */}
      <div style={{ flex: 1, minWidth: 0, position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: theme.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {entry.author || entry.name || 'Unknown'}
        </div>
        <div style={{ fontSize: 11, color: theme.textSecondary }}>
          {entry.prCount ?? entry.reviewCount ?? 0} PRs
        </div>
      </div>

      {/* Value */}
      <div
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: value >= 90 ? theme.success : value >= 70 ? theme.warning : theme.critical,
          fontFamily: "'JetBrains Mono', monospace",
          position: 'relative',
          zIndex: 1,
        }}
      >
        {typeof value === 'number' ? (category === 'improvement' && value > 0 ? `+${value}` : value) : value}
      </div>
    </div>
  );
}
