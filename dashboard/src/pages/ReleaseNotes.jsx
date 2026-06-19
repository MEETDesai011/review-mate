import { useParams } from 'react-router-dom';
import { useState } from 'react';
import { useFetch } from '../hooks/useFetch';
import { theme } from '../utils/theme';

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function parseContent(content) {
  if (!content) return { added: [], improved: [], fixed: [] };
  if (typeof content === 'string') {
    try {
      return JSON.parse(content);
    } catch {
      return { added: [content], improved: [], fixed: [] };
    }
  }
  return content;
}

function toMarkdown(title, date, parsed) {
  let md = `## ${title}\n_${formatDate(date)}_\n\n`;
  if (parsed.added?.length) {
    md += `### ✨ Added\n${parsed.added.map((a) => `- ${a}`).join('\n')}\n\n`;
  }
  if (parsed.improved?.length) {
    md += `### 🔧 Improved\n${parsed.improved.map((a) => `- ${a}`).join('\n')}\n\n`;
  }
  if (parsed.fixed?.length) {
    md += `### 🐛 Fixed\n${parsed.fixed.map((a) => `- ${a}`).join('\n')}\n\n`;
  }
  return md;
}

function CopyButton({ text, label }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      className="btn"
      onClick={handleCopy}
      style={{
        fontSize: 12,
        padding: '5px 12px',
        background: copied ? 'rgba(46, 160, 67, 0.15)' : undefined,
        borderColor: copied ? theme.success : undefined,
        color: copied ? theme.success : undefined,
      }}
    >
      {copied ? '✓ Copied' : label}
    </button>
  );
}

function ReleaseNoteEntry({ note }) {
  const parsed = parseContent(note.content);
  const sections = [
    { key: 'added', icon: '✨', label: 'Added', color: theme.success },
    { key: 'improved', icon: '🔧', label: 'Improved', color: theme.accent },
    { key: 'fixed', icon: '🐛', label: 'Fixed', color: theme.warning },
  ];

  const mdText = toMarkdown(note.title, note.mergedAt || note.createdAt, parsed);
  const jsonText = JSON.stringify(parsed, null, 2);

  return (
    <div className="card fade-in" style={{ position: 'relative', padding: 0, overflow: 'hidden' }}>
      {/* Timeline dot */}
      <div
        style={{
          position: 'absolute',
          left: -6,
          top: 28,
          width: 12,
          height: 12,
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${theme.accent}, ${theme.testing})`,
          border: `2px solid ${theme.bg}`,
          zIndex: 2,
        }}
      />

      <div style={{ padding: '20px 24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: theme.textPrimary, marginBottom: 4 }}>
              {note.title}
            </h3>
            <div style={{ display: 'flex', gap: 12, fontSize: 12, color: theme.textSecondary }}>
              <span>PR #{note.prNumber}</span>
              <span>by {note.author}</span>
              <span>{formatDate(note.mergedAt || note.createdAt)}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <CopyButton text={mdText} label="📋 Copy Markdown" />
            <CopyButton text={jsonText} label="{ } Copy JSON" />
          </div>
        </div>

        {/* Content sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {sections.map(({ key, icon, label, color }) => {
            const items = parsed[key] || [];
            if (items.length === 0) return null;
            return (
              <div key={key}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    color,
                    marginBottom: 8,
                  }}
                >
                  <span>{icon}</span> {label}
                </div>
                <ul
                  style={{
                    listStyle: 'none',
                    padding: 0,
                    margin: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  {items.map((item, i) => (
                    <li
                      key={i}
                      style={{
                        fontSize: 13,
                        color: theme.textPrimary,
                        padding: '8px 12px',
                        background: 'rgba(22, 27, 34, 0.5)',
                        borderRadius: 8,
                        borderLeft: `3px solid ${color}`,
                        lineHeight: 1.5,
                      }}
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function ReleaseNotes() {
  const { repoId } = useParams();
  const { data, loading, error } = useFetch(`/api/releasenotes/${repoId}`);

  const notes = Array.isArray(data) ? data : data?.releaseNotes || [];

  if (loading) {
    return (
      <div className="fade-in">
        <h1 className="page-title">Release Notes</h1>
        <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 180, borderRadius: 12 }} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fade-in">
        <h1 className="page-title">Release Notes</h1>
        <div className="error-state">
          <span style={{ fontSize: 48 }}>⚠️</span>
          <p style={{ fontSize: 16, fontWeight: 500 }}>Failed to load release notes</p>
          <p style={{ color: theme.textSecondary, fontSize: 13 }}>{error}</p>
        </div>
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="fade-in">
        <h1 className="page-title">Release Notes</h1>
        <div className="empty-state">
          <span className="empty-state-icon">📋</span>
          <p style={{ fontSize: 18, fontWeight: 600, color: theme.textPrimary }}>No release notes yet</p>
          <p style={{ color: theme.textSecondary, maxWidth: 400 }}>
            Release notes are generated automatically when PRs are merged with ReviewMate enabled.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="flex-between mb-24">
        <h1 className="page-title" style={{ marginBottom: 0 }}>Release Notes</h1>
        <span style={{ color: theme.textSecondary, fontSize: 13 }}>
          {notes.length} {notes.length === 1 ? 'release' : 'releases'}
        </span>
      </div>

      {/* Timeline */}
      <div
        style={{
          position: 'relative',
          paddingLeft: 24,
        }}
      >
        {/* Timeline line */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 2,
            background: `linear-gradient(180deg, ${theme.accent}, ${theme.testing}, transparent)`,
            borderRadius: 1,
          }}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }} className="stagger">
          {notes.map((note, i) => (
            <ReleaseNoteEntry key={note.id || i} note={note} />
          ))}
        </div>
      </div>
    </div>
  );
}
