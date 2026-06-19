import { useParams, Link } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch';
import ScoreRing from '../components/ScoreRing';
import TrendChart from '../components/TrendChart';
import PRSummaryCard from '../components/PRSummaryCard';
import { theme } from '../utils/theme';

function MetricCard({ icon, value, label, color }) {
  return (
    <div className="metric-card" data-color={color}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <div>
          <div className="metric-value" style={{ color: theme.textPrimary }}>{value}</div>
          <div className="metric-label">{label}</div>
        </div>
      </div>
    </div>
  );
}

export default function RepoDetail() {
  const { id } = useParams();
  const { data: repo, loading, error } = useFetch(`/api/repos/${id}`);
  const { data: reviewsData } = useFetch(`/api/reviews?repoId=${id}&limit=10`);

  const reviews = Array.isArray(reviewsData) ? reviewsData : reviewsData?.reviews || [];
  const trendData = repo?.scoreHistory || repo?.trend || [];

  if (loading) {
    return (
      <div className="fade-in">
        <div className="skeleton" style={{ height: 40, width: 300, marginBottom: 24 }} />
        <div className="grid-4 mb-24">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton" style={{ height: 90 }} />
          ))}
        </div>
        <div className="skeleton" style={{ height: 280, marginBottom: 24 }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-state fade-in">
        <span style={{ fontSize: 48 }}>⚠️</span>
        <p>Failed to load repository</p>
        <p style={{ color: theme.textSecondary }}>{error}</p>
        <Link to="/" className="btn" style={{ marginTop: 12 }}>← Back to Home</Link>
      </div>
    );
  }

  const latestScore = repo?.latestScore ?? repo?.avgScore ?? reviews[0]?.score ?? 0;
  const totalReviews = repo?.reviewCount ?? repo?.totalReviews ?? reviews.length;
  const avgScore = repo?.avgScore ?? repo?.averageScore ?? 0;
  const criticalIssues = repo?.criticalIssues ?? repo?.totalCritical ?? 0;
  const testCoverage = repo?.testCoverageRate ?? repo?.testingRate ?? '—';

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 32 }}>
        <Link to="/" style={{ color: theme.textSecondary, fontSize: 14 }}>← Repos</Link>
        <div style={{ height: 20, width: 1, background: theme.border }} />
        <div>
          <h1 className="page-title" style={{ marginBottom: 4 }}>
            {repo?.name || repo?.repoName || 'Repository'}
          </h1>
          <p style={{ color: theme.textSecondary, fontSize: 13 }}>
            {repo?.owner || repo?.repoOwner || ''}
          </p>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <ScoreRing score={latestScore} size={90} strokeWidth={6} />
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid-4 mb-24 stagger">
        <MetricCard icon="📊" value={totalReviews} label="Total Reviews" color="accent" />
        <MetricCard icon="⭐" value={avgScore} label="Avg Score" color="success" />
        <MetricCard icon="🔴" value={criticalIssues} label="Critical Issues" color="critical" />
        <MetricCard icon="🧪" value={typeof testCoverage === 'number' ? `${testCoverage}%` : testCoverage} label="Test Coverage" color="testing" />
      </div>

      {/* Trend chart */}
      <div className="mb-24">
        <TrendChart data={trendData} title="📈 Score Trend" />
      </div>

      {/* Cost Analytics */}
      <div className="mb-24" style={{ padding: 24, background: 'rgba(20, 25, 40, 0.6)', borderRadius: 12, border: `1px solid ${theme.border}` }}>
        <h2 className="section-title" style={{ marginBottom: 16 }}>Review Cost Analytics</h2>
        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
          <div>
            <div style={{ color: theme.textSecondary, fontSize: 13, marginBottom: 4 }}>Reviews Performed</div>
            <div style={{ fontSize: 28, fontWeight: 'bold', color: theme.textPrimary }}>{totalReviews}</div>
          </div>
          <div>
            <div style={{ color: theme.textSecondary, fontSize: 13, marginBottom: 4 }}>Issues Found</div>
            <div style={{ fontSize: 28, fontWeight: 'bold', color: theme.textPrimary }}>
              {reviews.reduce((acc, r) => acc + (r.issues ? r.issues.length : 0), 0) || criticalIssues * 2}
            </div>
          </div>
          <div>
            <div style={{ color: theme.textSecondary, fontSize: 13, marginBottom: 4 }}>Estimated Dev Time Saved</div>
            <div style={{ fontSize: 28, fontWeight: 'bold', color: theme.success }}>
              {(((reviews.reduce((acc, r) => acc + (r.issues ? r.issues.length : 0), 0) || criticalIssues * 2) * 0.1) || 0).toFixed(1)} Hours
            </div>
            <div style={{ fontSize: 11, color: theme.textSecondary, marginTop: 4 }}>*Deterministic calculation based on issues found</div>
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="flex-between mb-20">
        <h2 className="section-title" style={{ marginBottom: 0 }}>Recent Reviews</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link to={`/analytics/${id}`} className="btn btn-sm">📊 Analytics</Link>
          <Link to={`/insights/${id}`} className="btn btn-sm">💡 Insights</Link>
          <Link to={`/release-notes/${id}`} className="btn btn-sm">📋 Release Notes</Link>
          <Link to={`/tech-debt/${repo?.owner || repo?.repoOwner}/${repo?.name || repo?.repoName}`} className="btn btn-sm" style={{ background: 'rgba(248, 113, 113, 0.1)', color: '#f87171', border: '1px solid rgba(248, 113, 113, 0.3)' }}>🛡️ Tech Debt</Link>
          <Link to={`/benchmark/${repo?.owner || repo?.repoOwner}/${repo?.name || repo?.repoName}`} className="btn btn-sm" style={{ background: 'rgba(96, 165, 250, 0.1)', color: '#60a5fa', border: '1px solid rgba(96, 165, 250, 0.3)' }}>📈 Benchmark</Link>
          <Link to="/leaderboard" className="btn btn-sm">🏆 Leaderboard</Link>
        </div>
      </div>

      {/* Reviews list */}
      <div className="flex-col gap-12 stagger">
        {reviews.length > 0 ? (
          reviews.map((review) => (
            <PRSummaryCard key={review._id || review.id} review={review} />
          ))
        ) : (
          <div className="empty-state" style={{ padding: 40 }}>
            <span style={{ fontSize: 36 }}>📝</span>
            <p style={{ color: theme.textSecondary }}>No reviews yet for this repository</p>
          </div>
        )}
      </div>
    </div>
  );
}
