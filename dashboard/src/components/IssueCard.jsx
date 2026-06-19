import SeverityBadge from './SeverityBadge';
import FixSnippet from './FixSnippet';
import { categoryColors } from '../utils/theme';

export default function IssueCard({ issue }) {
  const category = (issue.category || '').toUpperCase();
  const catColor = categoryColors[category] || '#8B949E';

  return (
    <div
      className="card fade-in"
      style={{ padding: 20, marginBottom: 12 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <SeverityBadge severity={issue.severity} />
        <span
          className="badge"
          style={{
            background: `${catColor}18`,
            color: catColor,
            borderColor: `${catColor}40`,
          }}
        >
          {category}
        </span>
      </div>

      {(issue.file || issue.filePath) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 10,
            fontSize: 13,
            fontFamily: "'JetBrains Mono', monospace",
            color: '#8B949E',
          }}
        >
          <span>📄</span>
          <span style={{ color: '#58A6FF' }}>{issue.file || issue.filePath}</span>
          {issue.line && (
            <span style={{
              background: 'rgba(88, 166, 255, 0.1)',
              padding: '1px 8px',
              borderRadius: 4,
              fontSize: 11,
            }}>
              L{issue.line}
            </span>
          )}
        </div>
      )}

      <p style={{ color: '#C9D1D9', fontSize: 14, lineHeight: 1.65, marginBottom: 10 }}>
        {issue.description || issue.message}
      </p>

      {issue.suggestion && (
        <div
          style={{
            background: 'rgba(88, 166, 255, 0.06)',
            border: '1px solid rgba(88, 166, 255, 0.15)',
            borderRadius: 8,
            padding: '10px 14px',
            fontSize: 13,
            color: '#58A6FF',
            marginBottom: 10,
          }}
        >
          <span style={{ fontWeight: 600 }}>💡 Suggestion: </span>
          {issue.suggestion}
        </div>
      )}

      {issue.fixSnippet && (
        <FixSnippet code={issue.fixSnippet} language={issue.language || 'javascript'} />
      )}
    </div>
  );
}
