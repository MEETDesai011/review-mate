import { useNavigate } from 'react-router-dom';
import ScoreRing from './ScoreRing';
import ScoreDelta from './ScoreDelta';
import SeverityBadge from './SeverityBadge';
import { theme } from '../utils/theme';

const personaMap = {
  senior_engineer: { icon: '👨‍💻', label: 'Senior Engineer' },
  security_engineer: { icon: '🔒', label: 'Security Engineer' },
  performance_engineer: { icon: '⚡', label: 'Performance Engineer' },
  startup_cto: { icon: '🚀', label: 'Startup CTO' },
};

export default function PRSummaryCard({ review }) {
  const navigate = useNavigate();

  const persona = personaMap[review.persona] || personaMap.senior_engineer;
  const issueCounts = review.issueCounts || {};
  const dateStr = review.createdAt
    ? new Date(review.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  return (
    <div
      className="card clickable fade-in"
      onClick={() => navigate(`/review/${review._id || review.id}`)}
      style={{ display: 'flex', gap: 20, alignItems: 'center' }}
    >
      <ScoreRing score={review.score ?? 0} size={72} strokeWidth={5} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
          <h3
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: theme.textPrimary,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: 400,
            }}
          >
            {review.prTitle || review.title || 'Untitled PR'}
          </h3>
          <span
            className="badge"
            style={{
              background: 'rgba(163, 113, 247, 0.12)',
              color: '#A371F7',
              borderColor: 'rgba(163, 113, 247, 0.3)',
              fontSize: 10,
            }}
          >
            {persona.icon} {persona.label}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, color: theme.textSecondary }}>
          <span>by {review.author || 'unknown'}</span>
          <span>•</span>
          <span>{dateStr}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          {issueCounts.CRITICAL > 0 && (
            <span style={{ fontSize: 12, color: theme.critical }}>
              🔴 {issueCounts.CRITICAL} critical
            </span>
          )}
          {issueCounts.WARNING > 0 && (
            <span style={{ fontSize: 12, color: theme.warning }}>
              🟡 {issueCounts.WARNING} warnings
            </span>
          )}
          {issueCounts.INFO > 0 && (
            <span style={{ fontSize: 12, color: theme.info }}>
              🔵 {issueCounts.INFO} info
            </span>
          )}
        </div>
      </div>

      <div style={{ flexShrink: 0 }}>
        <ScoreDelta delta={review.scoreDelta} previousScore={review.previousScore} />
      </div>
    </div>
  );
}
