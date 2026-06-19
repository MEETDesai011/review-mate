import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: 'rgba(22, 27, 34, 0.95)',
        backdropFilter: 'blur(12px)',
        border: '1px solid #30363D',
        borderRadius: 8,
        padding: '10px 14px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
      }}
    >
      <div style={{ color: '#8B949E', fontSize: 12, marginBottom: 2 }}>{label}</div>
      <div style={{ color: '#58A6FF', fontSize: 20, fontWeight: 700 }}>
        {payload[0].value}
      </div>
    </div>
  );
}

export default function TrendChart({ data = [], title }) {
  if (!data.length) {
    return (
      <div className="card-static" style={{ textAlign: 'center', padding: 40, color: '#8B949E' }}>
        No trend data available
      </div>
    );
  }

  return (
    <div className="card-static" style={{ padding: '20px 20px 12px' }}>
      {title && (
        <div style={{ fontSize: 15, fontWeight: 600, color: '#C9D1D9', marginBottom: 16 }}>
          {title}
        </div>
      )}
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#58A6FF" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#58A6FF" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#484F58', fontSize: 11 }}
          />
          <YAxis
            domain={[0, 100]}
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#484F58', fontSize: 11 }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#30363D' }} />
          <Area
            type="monotone"
            dataKey="score"
            stroke="#58A6FF"
            strokeWidth={2.5}
            fill="url(#scoreGradient)"
            dot={false}
            activeDot={{
              r: 5,
              stroke: '#58A6FF',
              strokeWidth: 2,
              fill: '#0D1117',
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
