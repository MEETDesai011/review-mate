import { NavLink, useLocation } from 'react-router-dom';

const navItems = [
  { to: '/', icon: '🏠', label: 'Home' },
  { to: '/leaderboard', icon: '🏆', label: 'Leaderboard' },
];

const sidebarStyles = {
  sidebar: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: 260,
    height: '100vh',
    background: 'rgba(22, 27, 34, 0.95)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    borderRight: '1px solid #30363D',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 100,
    overflow: 'hidden',
  },
  logo: {
    padding: '28px 24px 24px',
    borderBottom: '1px solid #30363D',
  },
  logoTitle: {
    fontSize: 22,
    fontWeight: 700,
    background: 'linear-gradient(135deg, #58A6FF, #A371F7)',
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    letterSpacing: '-0.5px',
    lineHeight: 1,
  },
  logoSub: {
    fontSize: 11,
    color: '#8B949E',
    marginTop: 4,
    fontWeight: 500,
    letterSpacing: '1.5px',
    textTransform: 'uppercase',
  },
  nav: {
    flex: 1,
    padding: '16px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    overflowY: 'auto',
  },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 16px',
    borderRadius: 8,
    color: '#8B949E',
    fontSize: 14,
    fontWeight: 500,
    textDecoration: 'none',
    transition: 'all 0.2s ease',
    borderLeft: '3px solid transparent',
    position: 'relative',
  },
  navLinkActive: {
    color: '#C9D1D9',
    background: 'rgba(88, 166, 255, 0.08)',
    borderLeftColor: '#58A6FF',
  },
  navIcon: {
    fontSize: 18,
    width: 24,
    textAlign: 'center',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: '#484F58',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    padding: '16px 16px 6px',
  },
  footer: {
    padding: '16px 20px',
    borderTop: '1px solid #30363D',
  },
  githubLink: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    color: '#8B949E',
    fontSize: 13,
    textDecoration: 'none',
    padding: '8px 12px',
    borderRadius: 8,
    transition: 'all 0.2s ease',
  },
  versionBadge: {
    fontSize: 10,
    color: '#484F58',
    marginTop: 8,
    textAlign: 'center',
    fontFamily: "'JetBrains Mono', monospace",
  },
};

export default function Sidebar() {
  const location = useLocation();

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <aside style={sidebarStyles.sidebar}>
      <div style={sidebarStyles.logo}>
        <div style={sidebarStyles.logoTitle}>🔍 ReviewMate</div>
        <div style={sidebarStyles.logoSub}>AI Code Review</div>
      </div>

      <nav style={sidebarStyles.nav}>
        <div style={sidebarStyles.sectionLabel}>Navigation</div>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            style={{
              ...sidebarStyles.navLink,
              ...(isActive(item.to) ? sidebarStyles.navLinkActive : {}),
            }}
            onMouseEnter={(e) => {
              if (!isActive(item.to)) {
                e.currentTarget.style.background = 'rgba(88, 166, 255, 0.04)';
                e.currentTarget.style.color = '#C9D1D9';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive(item.to)) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#8B949E';
              }
            }}
          >
            <span style={sidebarStyles.navIcon}>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}

        <div style={sidebarStyles.sectionLabel}>Repository</div>
        {[
          { to: '/analytics', icon: '📊', label: 'Analytics' },
          { to: '/insights', icon: '💡', label: 'Insights' },
          { to: '/release-notes', icon: '📋', label: 'Release Notes' },
        ].map((item) => (
          <NavLink
            key={item.to}
            to={`${item.to}/default`}
            style={{
              ...sidebarStyles.navLink,
              ...(location.pathname.startsWith(item.to) ? sidebarStyles.navLinkActive : {}),
            }}
            onMouseEnter={(e) => {
              if (!location.pathname.startsWith(item.to)) {
                e.currentTarget.style.background = 'rgba(88, 166, 255, 0.04)';
                e.currentTarget.style.color = '#C9D1D9';
              }
            }}
            onMouseLeave={(e) => {
              if (!location.pathname.startsWith(item.to)) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#8B949E';
              }
            }}
          >
            <span style={sidebarStyles.navIcon}>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div style={sidebarStyles.footer}>
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          style={sidebarStyles.githubLink}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#C9D1D9';
            e.currentTarget.style.background = 'rgba(88, 166, 255, 0.04)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#8B949E';
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
          </svg>
          GitHub
        </a>
        <div style={sidebarStyles.versionBadge}>v1.0.0</div>
      </div>
    </aside>
  );
}
