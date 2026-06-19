import { theme, categoryColors, severityColors } from '../utils/theme';

export default function InsightCard({ insight }) {
  const totalIssues = insight.count ?? insight.issueCount ?? 0;
  const severities = insight.severityBreakdown || {};
  const samples = insight.sampleDescriptions || insight.samples || [];

  return (
    <div className="card fade-in" style={{ padding: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <h4 style={{ fontSize: 15, fontWeight: 600, color: theme.textPrimary, marginBottom: 4 }}>
            {insight.cluster || insight.name || 'Issue Cluster'}
          </h4>
          {insight.keywords && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {(Array.isArray(insight.keywords) ? insight.keywords : [insight.keywords]).map((kw, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: 10,
                    padding: '2px 8px',
                    borderRadius: 4,
                    background: 'rgba(88, 166, 255, 0.1)',
                    color: theme.accent,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  {kw}
                </span>
              ))}
            </div>
          )}
        </div>
        <span
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: theme.accent,
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          {totalIssues}
        </span>
      </div>

      {/* Severity breakdown mini-bars */}
      {Object.keys(severities).length > 0 && (
        <div style={{ display: 'flex', gap: 3, height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 14 }}>
          {Object.entries(severities).map(([sev, count]) => (
            <div
              key={sev}
              style={{
                flex: count,
                background: severityColors[sev.toUpperCase()] || theme.textSecondary,
                borderRadius: 3,
                transition: 'flex 0.3s ease',
              }}
              title={`${sev}: ${count}`}
            />
          ))}
        </div>
      )}

      {/* Sample descriptions */}
      {samples.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {samples.slice(0, 3).map((desc, i) => (
            <div
              key={i}
              style={{
                fontSize: 12,
                color: theme.textSecondary,
                lineHeight: 1.5,
                padding: '6px 10px',
                background: 'rgba(22, 27, 34, 0.6)',
                borderRadius: 6,
                borderLeft: `2px solid ${theme.border}`,
              }}
            >
              {desc}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
