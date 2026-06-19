const personas = [
  { key: 'senior_engineer', icon: '👨‍💻', label: 'Senior Engineer' },
  { key: 'security_engineer', icon: '🔒', label: 'Security' },
  { key: 'performance_engineer', icon: '⚡', label: 'Performance' },
  { key: 'startup_cto', icon: '🚀', label: 'Startup CTO' },
];

export default function PersonaSelector({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {personas.map((p) => {
        const isActive = value === p.key;
        return (
          <button
            key={p.key}
            onClick={() => onChange(p.key)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: 20,
              border: `1px solid ${isActive ? '#58A6FF' : '#30363D'}`,
              background: isActive
                ? 'linear-gradient(135deg, rgba(88, 166, 255, 0.15), rgba(163, 113, 247, 0.15))'
                : 'rgba(22, 27, 34, 0.6)',
              color: isActive ? '#C9D1D9' : '#8B949E',
              fontSize: 13,
              fontWeight: isActive ? 600 : 400,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontFamily: "'Inter', sans-serif",
              outline: 'none',
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.borderColor = 'rgba(88, 166, 255, 0.4)';
                e.currentTarget.style.color = '#C9D1D9';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.borderColor = '#30363D';
                e.currentTarget.style.color = '#8B949E';
              }
            }}
          >
            <span>{p.icon}</span>
            {p.label}
          </button>
        );
      })}
    </div>
  );
}
