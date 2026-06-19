import { useParams } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch';
import { theme, severityColors, categoryColors } from '../utils/theme';
import TrendChart from '../components/TrendChart';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: theme.surface,
        border: `1px solid ${theme.border}`,
        borderRadius: 8,
        padding: '10px 14px',
        fontSize: 13,
      }}
    >
      <p style={{ color: theme.textPrimary, fontWeight: 600, marginBottom: 4 }}>
        {label || payload[0]?.name}
      </p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || theme.accent }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

const SEVERITY_COLORS = [severityColors.CRITICAL, severityColors.WARNING, severityColors.INFO];
const CATEGORY_ENTRIES = Object.entries(categoryColors);

export default function Analytics() {
  const { repoId } = useParams();
  const { data, loading, error } = useFetch(`/api/analytics/${repoId}`);

  if (loading) {
    return (
      <div className="fade-in">
        <h1 className="page-title">Analytics</h1>
        <div className="grid-2 stagger">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton" style={{ height: 200, borderRadius: 12 }} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fade-in">
        <h1 className="page-title">Analytics</h1>
        <div className="error-state">
          <span style={{ fontSize: 48 }}>⚠️</span>
          <p style={{ fontSize: 16, fontWeight: 500 }}>Failed to load analytics</p>
          <p style={{ color: theme.textSecondary, fontSize: 13 }}>{error}</p>
        </div>
      </div>
    );
  }

  const scoreHistory = data?.scoreHistory || [];
  const sevDist = data?.severityDistribution || [];
  const catDist = data?.categoryDistribution || [];
  const totalReviews = data?.totalReviews || 0;
  const avgScore = data?.avgScore ?? 0;
  const recentTrend = data?.recentTrend ?? 0;

  const sevData = Array.isArray(sevDist)
    ? sevDist
    : Object.entries(sevDist).map(([name, value]) => ({ name, value: Number(value) }));

  const catData = Array.isArray(catDist)
    ? catDist
    : Object.entries(catDist).map(([name, value]) => ({ name, value: Number(value) }));

  return (
    <div className="fade-in">
      <h1 className="page-title">Analytics</h1>

      {/* Summary cards */}
      <div className="grid-4 stagger" style={{ marginBottom: 32 }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
            Total Reviews
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, color: theme.accent, fontFamily: "'JetBrains Mono', monospace" }}>
            {totalReviews}
          </div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
            Average Score
          </div>
          <div
            style={{
              fontSize: 32,
              fontWeight: 700,
              fontFamily: "'JetBrains Mono', monospace",
              color: avgScore >= 90 ? theme.success : avgScore >= 70 ? theme.warning : theme.critical,
            }}
          >
            {typeof avgScore === 'number' ? avgScore.toFixed(1) : avgScore}
          </div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
            Recent Trend
          </div>
          <div
            style={{
              fontSize: 32,
              fontWeight: 700,
              fontFamily: "'JetBrains Mono', monospace",
              color: recentTrend > 0 ? theme.success : recentTrend < 0 ? theme.critical : theme.textSecondary,
            }}
          >
            {recentTrend > 0 ? `↑ +${recentTrend}` : recentTrend < 0 ? `↓ ${recentTrend}` : '→ 0'}
          </div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
            Issues Found
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, color: theme.textPrimary, fontFamily: "'JetBrains Mono', monospace" }}>
            {sevData.reduce((sum, s) => sum + (s.value || 0), 0)}
          </div>
        </div>
      </div>

      {/* Score history trend */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Score Trend</h3>
        {scoreHistory.length > 0 ? (
          <TrendChart data={scoreHistory} title="" />
        ) : (
          <p style={{ color: theme.textSecondary, textAlign: 'center', padding: 40 }}>
            Not enough data for trend chart
          </p>
        )}
      </div>

      {/* Charts row */}
      <div className="grid-2" style={{ marginBottom: 24 }}>
        {/* Severity Pie */}
        <div className="card">
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Severity Distribution</h3>
          {sevData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={sevData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {sevData.map((entry, i) => (
                    <Cell
                      key={entry.name}
                      fill={severityColors[entry.name?.toUpperCase()] || SEVERITY_COLORS[i % SEVERITY_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ color: theme.textSecondary, textAlign: 'center', padding: 40 }}>No data</p>
          )}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 8 }}>
            {sevData.map((entry, i) => (
              <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: severityColors[entry.name?.toUpperCase()] || SEVERITY_COLORS[i % 3],
                  }}
                />
                <span style={{ color: theme.textSecondary }}>{entry.name}: {entry.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Category Bar */}
        <div className="card">
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Category Breakdown</h3>
          {catData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={catData} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" stroke={theme.textSecondary} tick={{ fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke={theme.textSecondary}
                  tick={{ fontSize: 11, fill: theme.textSecondary }}
                  width={100}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(88, 166, 255, 0.05)' }} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={28}>
                  {catData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={categoryColors[entry.name?.toUpperCase()] || theme.accent}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ color: theme.textSecondary, textAlign: 'center', padding: 40 }}>No data</p>
          )}
        </div>
      </div>
    </div>
  );
}
