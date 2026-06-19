import { useState } from 'react';
import { useFetch } from '../hooks/useFetch';
import { theme } from '../utils/theme';
import LeaderboardRow from '../components/LeaderboardRow';

const TIME_RANGES = [
  { label: '7 Days', value: '7d' },
  { label: '30 Days', value: '30d' },
  { label: 'All Time', value: 'all' },
];

const COLUMNS = [
  { key: 'bestQuality', title: '🏆 Best Quality', subtitle: 'Highest avg score', metric: 'avgScore' },
  { key: 'mostImproved', title: '📈 Most Improved', subtitle: 'Biggest score gains', metric: 'improvement' },
  { key: 'mostSecurityConscious', title: '🔒 Most Security Conscious', subtitle: 'Fewest security issues', metric: 'securityScore' },
];

export default function Leaderboard() {
  const [timeRange, setTimeRange] = useState('30d');
  const [repoId, setRepoId] = useState('');

  const { data: repos } = useFetch('/api/repos');
  const repoList = Array.isArray(repos) ? repos : repos?.repos || [];

  const activeRepoId = repoId || repoList[0]?.id || repoList[0]?._id || '';
  const { data, loading, error } = useFetch(
    activeRepoId ? `/api/leaderboard?repoId=${activeRepoId}&timeRange=${timeRange}` : null
  );

  return (
    <div className="fade-in">
      <div className="flex-between mb-24" style={{ flexWrap: 'wrap', gap: 16 }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Leaderboard</h1>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Repo selector */}
          {repoList.length > 0 && (
            <select
              value={activeRepoId}
              onChange={(e) => setRepoId(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                border: `1px solid ${theme.border}`,
                background: theme.surface,
                color: theme.textPrimary,
                fontFamily: "'Inter', sans-serif",
                fontSize: 13,
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              {repoList.map((r) => (
                <option key={r.id || r._id} value={r.id || r._id}>
                  {r.owner}/{r.name || r.repoName}
                </option>
              ))}
            </select>
          )}

          {/* Time range pills */}
          <div
            style={{
              display: 'flex',
              borderRadius: 8,
              overflow: 'hidden',
              border: `1px solid ${theme.border}`,
            }}
          >
            {TIME_RANGES.map((tr) => (
              <button
                key={tr.value}
                onClick={() => setTimeRange(tr.value)}
                style={{
                  padding: '8px 16px',
                  fontSize: 13,
                  fontWeight: 500,
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  background: timeRange === tr.value
                    ? 'linear-gradient(135deg, #58A6FF, #A371F7)'
                    : theme.surface,
                  color: timeRange === tr.value ? 'white' : theme.textSecondary,
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                {tr.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading && (
        <div className="grid-3 stagger">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 400, borderRadius: 12 }} />
          ))}
        </div>
      )}

      {error && (
        <div className="error-state">
          <span style={{ fontSize: 48 }}>⚠️</span>
          <p style={{ fontSize: 16, fontWeight: 500 }}>Failed to load leaderboard</p>
          <p style={{ color: theme.textSecondary, fontSize: 13 }}>{error}</p>
        </div>
      )}

      {!loading && !error && !activeRepoId && (
        <div className="empty-state">
          <span className="empty-state-icon">🏆</span>
          <p style={{ fontSize: 18, fontWeight: 600 }}>No repository selected</p>
          <p style={{ color: theme.textSecondary }}>Select a repository to view the leaderboard.</p>
        </div>
      )}

      {!loading && !error && data && (
        <div className="grid-3 stagger">
          {COLUMNS.map((col) => {
            const entries = data[col.key] || [];
            return (
              <div key={col.key} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {/* Column header */}
                <div
                  style={{
                    padding: '20px 20px 16px',
                    borderBottom: `1px solid ${theme.border}`,
                    background: 'rgba(88, 166, 255, 0.03)',
                  }}
                >
                  <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{col.title}</h3>
                  <p style={{ fontSize: 12, color: theme.textSecondary }}>{col.subtitle}</p>
                </div>

                {/* Entries */}
                <div style={{ padding: '8px 12px' }}>
                  {entries.length === 0 ? (
                    <p
                      style={{
                        color: theme.textSecondary,
                        textAlign: 'center',
                        padding: '40px 20px',
                        fontSize: 13,
                      }}
                    >
                      Not enough data yet.
                      <br />
                      <span style={{ fontSize: 11 }}>
                        Requires {col.key === 'mostSecurityConscious' ? '2' : '3'}+ PRs per author.
                      </span>
                    </p>
                  ) : (
                    entries.map((entry, i) => (
                      <LeaderboardRow
                        key={entry.author || i}
                        entry={entry}
                        rank={i + 1}
                        category={col.metric}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
