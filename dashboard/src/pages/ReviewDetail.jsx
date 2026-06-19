import { useParams, Link } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch';
import ScoreRing from '../components/ScoreRing';
import ScoreDelta from '../components/ScoreDelta';
import IssueCard from '../components/IssueCard';
import { theme, severityColors } from '../utils/theme';

const personaMap = {
  senior_engineer: { icon: '👨‍💻', label: 'Senior Engineer' },
  security_engineer: { icon: '🔒', label: 'Security Engineer' },
  performance_engineer: { icon: '⚡', label: 'Performance Engineer' },
  startup_cto: { icon: '🚀', label: 'Startup CTO' },
};

const severityOrder = ['CRITICAL', 'WARNING', 'INFO'];

export default function ReviewDetail() {
  const { id } = useParams();
  const { data: review, loading, error } = useFetch(`/api/reviews/${id}`);

  if (loading) {
    return (
      <div className="fade-in">
        <div className="skeleton" style={{ height: 40, width: 400, marginBottom: 24 }} />
        <div className="skeleton" style={{ height: 160, marginBottom: 24 }} />
        <div className="skeleton" style={{ height: 120, marginBottom: 12 }} />
        <div className="skeleton" style={{ height: 120, marginBottom: 12 }} />
        <div className="skeleton" style={{ height: 120 }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-state fade-in">
        <span style={{ fontSize: 48 }}>⚠️</span>
        <p>Failed to load review</p>
        <p style={{ color: theme.textSecondary }}>{error}</p>
        <Link to="/" className="btn" style={{ marginTop: 12 }}>← Back to Home</Link>
      </div>
    );
  }

  if (!review) return null;

  const persona = personaMap[review.persona] || personaMap.senior_engineer;
  const issues = review.issues || [];
  const positives = review.positives || review.highlights || [];
  const summary = review.summary || '';
  const testAnalysis = review.testingAnalysis || review.testing || null;

  const groupedIssues = {};
  for (const sev of severityOrder) {
    const filtered = issues.filter((i) => (i.severity || '').toUpperCase() === sev);
    if (filtered.length > 0) groupedIssues[sev] = filtered;
  }

  return (
    <div className="fade-in">
      {/* Back nav */}
      <Link
        to={review.repoId ? `/repo/${review.repoId}` : '/'}
        style={{ color: theme.textSecondary, fontSize: 13, display: 'inline-block', marginBottom: 16 }}
      >
        ← Back to repository
      </Link>

      {/* Header */}
      <div
        className="card-static"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 24,
          marginBottom: 24,
          padding: 28,
        }}
      >
        <ScoreRing score={review.score ?? 0} size={110} strokeWidth={7} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: theme.textPrimary, marginBottom: 8, lineHeight: 1.3 }}>
            {review.prTitle || review.title || 'PR Review'}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: theme.textSecondary }}>
              by <span style={{ color: theme.textPrimary, fontWeight: 500 }}>{review.author || 'unknown'}</span>
            </span>
            <span
              className="badge"
              style={{
                background: 'rgba(163, 113, 247, 0.12)',
                color: '#A371F7',
                borderColor: 'rgba(163, 113, 247, 0.3)',
              }}
            >
              {persona.icon} {persona.label}
            </span>
            {review.prNumber && (
              <span style={{ fontSize: 13, color: theme.textSecondary, fontFamily: "'JetBrains Mono', monospace" }}>
                #{review.prNumber}
              </span>
            )}
            {review.riskAssessment && (
              <span className="badge" style={{
                background: review.riskAssessment.level === 'HIGH' ? 'rgba(248, 113, 113, 0.12)' : review.riskAssessment.level === 'MEDIUM' ? 'rgba(250, 204, 21, 0.12)' : 'rgba(74, 222, 128, 0.12)',
                color: review.riskAssessment.level === 'HIGH' ? '#f87171' : review.riskAssessment.level === 'MEDIUM' ? '#facc15' : '#4ade80',
                borderColor: review.riskAssessment.level === 'HIGH' ? 'rgba(248, 113, 113, 0.3)' : review.riskAssessment.level === 'MEDIUM' ? 'rgba(250, 204, 21, 0.3)' : 'rgba(74, 222, 128, 0.3)'
              }}>
                Risk: {review.riskAssessment.level}
              </span>
            )}
          </div>
          <ScoreDelta delta={review.scoreDelta} previousScore={review.previousScore} />
          
          <div style={{ marginTop: 16 }}>
            <button 
              className="btn btn-sm" 
              style={{ background: '#3b82f6', color: 'white', border: 'none' }}
              onClick={async (e) => {
                const btn = e.currentTarget;
                btn.disabled = true;
                btn.innerText = 'Applying Fixes...';
                try {
                  const res = await fetch(`${import.meta.env.VITE_API_URL}/api/autofix/${review.id}/apply`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                  });
                  const data = await res.json();
                  if (res.ok) {
                    btn.innerText = `Auto-Fix PR #${data.prNumber} Created!`;
                    btn.style.background = '#10b981';
                  } else {
                    btn.innerText = `Failed: ${data.error}`;
                    btn.style.background = '#ef4444';
                  }
                } catch (err) {
                  btn.innerText = 'Error';
                }
              }}
            >
              Apply Deterministic Auto-Fixes
            </button>
          </div>
        </div>

        {/* Issue summary chips */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
          {severityOrder.map((sev) => {
            const count = (groupedIssues[sev] || []).length;
            if (count === 0) return null;
            return (
              <div
                key={sev}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 13,
                  color: severityColors[sev],
                }}
              >
                <span style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: severityColors[sev],
                  flexShrink: 0,
                }} />
                {count} {sev.toLowerCase()}
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      {summary && (
        <div className="card-static mb-24" style={{ padding: 24 }}>
          <h2 className="section-title">📄 Summary</h2>
          <p style={{ color: theme.textSecondary, fontSize: 14, lineHeight: 1.75 }}>{summary}</p>
        </div>
      )}

      {/* Positives */}
      {positives.length > 0 && (
        <div className="card-static mb-24" style={{ padding: 24 }}>
          <h2 className="section-title">✅ Positives</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {positives.map((p, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  padding: '10px 14px',
                  background: 'rgba(46, 160, 67, 0.06)',
                  border: '1px solid rgba(46, 160, 67, 0.15)',
                  borderRadius: 8,
                  fontSize: 14,
                  color: theme.textPrimary,
                  lineHeight: 1.5,
                }}
              >
                <span style={{ color: theme.success, fontSize: 16, flexShrink: 0, marginTop: 1 }}>✓</span>
                {typeof p === 'string' ? p : p.description || p.message}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Issues grouped by severity */}
      {severityOrder.map((sev) => {
        const group = groupedIssues[sev];
        if (!group) return null;
        return (
          <div key={sev} className="mb-24">
            <h2
              className="section-title"
              style={{ color: severityColors[sev] }}
            >
              {sev === 'CRITICAL' ? '🔴' : sev === 'WARNING' ? '🟡' : '🔵'}{' '}
              {sev} Issues ({group.length})
            </h2>
            <div className="stagger">
              {group.map((issue, i) => (
                <IssueCard key={issue._id || issue.id || i} issue={issue} />
              ))}
            </div>
          </div>
        );
      })}

      {/* Testing Analysis */}
      {testAnalysis && (
        <div className="card-static mb-24" style={{ padding: 24 }}>
          <h2 className="section-title">🧪 Testing Analysis</h2>
          {testAnalysis.hasSufficientTests !== undefined && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{
                fontSize: 13,
                fontWeight: 600,
                color: testAnalysis.hasSufficientTests ? theme.success : theme.warning,
              }}>
                {testAnalysis.hasSufficientTests ? '✅ Sufficient test coverage' : '⚠️ Insufficient test coverage'}
              </span>
            </div>
          )}
          {testAnalysis.suggestions && testAnalysis.suggestions.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {testAnalysis.suggestions.map((s, i) => (
                <div
                  key={i}
                  style={{
                    padding: '8px 12px',
                    background: 'rgba(163, 113, 247, 0.06)',
                    border: '1px solid rgba(163, 113, 247, 0.15)',
                    borderRadius: 6,
                    fontSize: 13,
                    color: theme.textSecondary,
                    lineHeight: 1.5,
                  }}
                >
                  {typeof s === 'string' ? s : s.description || s.message}
                </div>
              ))}
            </div>
          )}
          {typeof testAnalysis === 'string' && (
            <p style={{ color: theme.textSecondary, fontSize: 14, lineHeight: 1.7 }}>{testAnalysis}</p>
          )}
        </div>
      )}

      {issues.length === 0 && positives.length === 0 && !summary && (
        <div className="empty-state">
          <span className="empty-state-icon">🎉</span>
          <p style={{ fontSize: 18, fontWeight: 600 }}>Clean review!</p>
          <p style={{ color: theme.textSecondary }}>No issues found in this PR.</p>
        </div>
      )}
    </div>
  );
}
