import { useNavigate } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch';
import ScoreRing from '../components/ScoreRing';
import { theme } from '../utils/theme';

export default function Home() {
  const { data, loading, error } = useFetch('/api/repos');
  const navigate = useNavigate();
  const repos = Array.isArray(data) ? data : data?.repos || [];

  if (loading) {
    return (
      <div className="fade-in">
        <h1 className="page-title">Repositories</h1>
        <div className="grid-3 stagger">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="skeleton fade-in" style={{ height: 200, borderRadius: 12 }} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fade-in">
        <h1 className="page-title">Repositories</h1>
        <div className="error-state">
          <span style={{ fontSize: 48 }}>⚠️</span>
          <p style={{ fontSize: 16, fontWeight: 500 }}>Failed to load repositories</p>
          <p style={{ color: theme.textSecondary, fontSize: 13 }}>{error}</p>
        </div>
      </div>
    );
  }

  if (!repos.length) {
    return (
      <div className="fade-in">
        <h1 className="page-title">Repositories</h1>
        <div className="empty-state">
          <span className="empty-state-icon">📂</span>
          <p style={{ fontSize: 18, fontWeight: 600, color: theme.textPrimary }}>No repositories yet</p>
          <p style={{ color: theme.textSecondary, maxWidth: 400 }}>
            Connect a GitHub repository and submit your first PR for AI-powered code review.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="flex-between mb-24">
        <h1 className="page-title" style={{ marginBottom: 0 }}>Repositories</h1>
        <span style={{ color: theme.textSecondary, fontSize: 13 }}>
          {repos.length} {repos.length === 1 ? 'repository' : 'repositories'}
        </span>
      </div>

      <div className="grid-3 stagger">
        {repos.map((repo) => {
          const lastDate = repo.lastReviewedAt
            ? new Date(repo.lastReviewedAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })
            : 'Never';

          return (
            <div
              key={repo._id || repo.id || repo.name}
              className="card clickable fade-in"
              onClick={() => navigate(`/repo/${repo._id || repo.id}`)}
              style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
            >
              {/* Repo header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 18 }}>📦</span>
                    <h3
                      style={{
                        fontSize: 16,
                        fontWeight: 600,
                        color: theme.textPrimary,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {repo.name || repo.repoName}
                    </h3>
                  </div>
                  <p
                    style={{
                      fontSize: 12,
                      color: theme.textSecondary,
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    {repo.owner || repo.repoOwner || 'owner'}
                  </p>
                </div>
              </div>

              {/* Score ring + stats */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <ScoreRing score={repo.avgScore ?? repo.averageScore ?? 0} size={80} strokeWidth={6} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: theme.textPrimary }}>
                      {repo.reviewCount ?? repo.totalReviews ?? 0}
                    </div>
                    <div style={{ fontSize: 11, color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Reviews
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: theme.textSecondary }}>
                      Last: {lastDate}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer action hint */}
              <div
                style={{
                  fontSize: 12,
                  color: theme.accent,
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  marginTop: 'auto',
                }}
              >
                View details →
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
