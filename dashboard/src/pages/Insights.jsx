import { useParams } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch';
import { theme, categoryColors } from '../utils/theme';
import InsightCard from '../components/InsightCard';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

const CATEGORY_COLOR_MAP = {
  SECURITY: '#F85149',
  PERFORMANCE: '#F0883E',
  STYLE: '#8B949E',
  BUG: '#F85149',
  TESTING: '#A371F7',
};

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
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
      <p style={{ color: theme.textPrimary, fontWeight: 600 }}>{entry.name}</p>
      <p style={{ color: entry.payload.fill || theme.accent }}>
        {entry.value} issues ({entry.payload.percentage}%)
      </p>
    </div>
  );
};

export default function Insights() {
  const { repoId } = useParams();
  const { data, loading, error } = useFetch(`/api/insights/${repoId}`);

  if (loading) {
    return (
      <div className="fade-in">
        <h1 className="page-title">Insights</h1>
        <div className="grid-2 stagger">
          <div className="skeleton" style={{ height: 400, borderRadius: 12 }} />
          <div className="skeleton" style={{ height: 400, borderRadius: 12 }} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fade-in">
        <h1 className="page-title">Insights</h1>
        <div className="error-state">
          <span style={{ fontSize: 48 }}>⚠️</span>
          <p style={{ fontSize: 16, fontWeight: 500 }}>Failed to load insights</p>
          <p style={{ color: theme.textSecondary, fontSize: 13 }}>{error}</p>
        </div>
      </div>
    );
  }

  const topIssues = data?.topIssues || [];
  const categoryBreakdown = data?.categoryBreakdown || [];

  const chartData = categoryBreakdown.map((c) => ({
    name: c.category,
    value: c.count,
    percentage: c.percentage ?? Math.round((c.count / Math.max(categoryBreakdown.reduce((s, x) => s + x.count, 0), 1)) * 100),
    fill: CATEGORY_COLOR_MAP[c.category?.toUpperCase()] || theme.accent,
  }));

  return (
    <div className="fade-in">
      <h1 className="page-title">Insights</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24, alignItems: 'start' }}>
        {/* Left: ranked issue clusters */}
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: theme.textPrimary }}>
            💡 Recurring Issues
          </h3>
          {topIssues.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 48 }}>
              <span style={{ fontSize: 40, display: 'block', marginBottom: 12 }}>🔍</span>
              <p style={{ color: theme.textSecondary }}>
                Not enough review data to identify recurring patterns yet.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }} className="stagger">
              {topIssues.map((insight, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: `linear-gradient(135deg, ${theme.accent}, ${theme.testing})`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      fontWeight: 700,
                      color: 'white',
                      flexShrink: 0,
                      marginTop: 10,
                    }}
                  >
                    {i + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <InsightCard insight={insight} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: category donut */}
        <div className="card" style={{ position: 'sticky', top: 32 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: theme.textPrimary }}>
            Category Breakdown
          </h3>
          {chartData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={105}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                    animationBegin={0}
                    animationDuration={800}
                  >
                    {chartData.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
                {chartData.map((entry) => (
                  <div
                    key={entry.name}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: 13,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 3,
                          background: entry.fill,
                        }}
                      />
                      <span style={{ color: theme.textSecondary }}>{entry.name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
                        {entry.value}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          color: theme.textSecondary,
                          background: 'rgba(88, 166, 255, 0.08)',
                          padding: '2px 6px',
                          borderRadius: 4,
                        }}
                      >
                        {entry.percentage}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p style={{ color: theme.textSecondary, textAlign: 'center', padding: 40 }}>No data</p>
          )}
        </div>
      </div>
    </div>
  );
}
