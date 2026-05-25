import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth';
import { useNotifications } from '../useNotifications';
import './Layout.css';

const MOBILE_NAV = [
  { path: '/', label: 'Mercado', icon: '🏪' },
  { path: '/demandas', label: 'Buscan', icon: '📣' },
  { path: '/mensajes', label: 'Chats', icon: '💬' },
] as const;

const DESKTOP_NAV = [
  { path: '/', label: 'Mercado' },
  { path: '/demandas', label: 'Buscan en tu zona' },
  { path: '/mensajes', label: 'Chats' },
  { path: '/mis-productos', label: 'Mis equipos' },
] as const;

const FOOTER_LINKS = [
  { path: '/como-funciona', label: 'Cómo funciona' },
  { path: '/seguridad', label: 'Seguridad' },
  { path: '/privacidad', label: 'Privacidad' },
  { path: '/terminos', label: 'Términos' },
  { path: '/ayuda', label: 'Ayuda' },
] as const;

function isActive(path: string, current: string) {
  if (path === '/') return current === '/';
  return current === path || current.startsWith(`${path}/`);
}

export function Layout() {
  const { user, logout } = useAuth();
  const { count } = useNotifications();
  const loc = useLocation();

  const bottomNavClass = (path: string) =>
    `bottom-nav-item${isActive(path, loc.pathname) ? ' active' : ''}`;

  const desktopNavClass = (path: string) =>
    `desktop-nav-link${isActive(path, loc.pathname) ? ' active' : ''}`;

  const firstName = user?.displayName?.split(' ')[0] ?? '';
  const needsVerify = user && (!user.phoneVerified || !user.kycVerified);
  const accountPath = user ? '/cuenta' : '/registro';
  const accountLabel = user ? 'Cuenta' : 'Entrar';

  return (
    <div className="layout">
      {needsVerify && (
        <Link to="/verificar" className="verify-banner">
          <span className="verify-banner-short">⚠ Verifica en 2 min</span>
          <span className="verify-banner-full">⚠ Verifica tu cuenta en 2 min para publicar y ganar</span>
        </Link>
      )}

      <header className="header">
        <div className="container header-inner">
          <Link to="/" className="logo">
            <span className="logo-icon">⚡</span>
            <span className="logo-text">Alquila</span>
          </Link>

          <nav className="desktop-nav" aria-label="Principal">
            {DESKTOP_NAV.map((item) => (
              <Link key={item.path} to={item.path} className={desktopNavClass(item.path)}>
                {item.label}
              </Link>
            ))}
            {user ? (
              <Link to="/cuenta" className={desktopNavClass('/cuenta')}>
                Cuenta
              </Link>
            ) : (
              <Link to="/registro" className={desktopNavClass('/registro')}>
                Regístrate
              </Link>
            )}
          </nav>

          {user && (
            <Link to="/cuenta" className="header-greeting">
              <span className="greeting-hi">Hola,</span>
              <span className="greeting-name">
                {firstName}
                {user.kycVerified && <span className="verified-dot"> ✓</span>}
              </span>
            </Link>
          )}

          <div className="header-actions">
            {user ? (
              <>
                <Link to="/publicar" className="btn btn-primary btn-sm header-offer-btn">
                  + Ofrecer
                </Link>
                <Link to="/notificaciones" className="notif-btn" aria-label="Notificaciones">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                  {count > 0 && <span className="notif-badge">{count > 9 ? '9+' : count}</span>}
                </Link>
                <button type="button" className="btn btn-ghost btn-sm header-logout" onClick={logout}>
                  <span className="header-logout-text">Salir</span>
                  <span className="header-logout-icon" aria-hidden>⎋</span>
                </button>
              </>
            ) : (
              <>
                <Link to="/registro" className="btn btn-ghost btn-sm header-register-btn">
                  Regístrate
                </Link>
                <Link to="/entrar" className="btn btn-primary btn-sm">
                  Entrar
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="main">
        <Outlet />
      </main>

      <footer className="footer-shell">
        <div className="container footer-inner">
          <div className="footer-brand">
            <strong>Alquila</strong>
            <p>Marketplace express P2P en Lima con privacidad, verificación y acuerdos dentro del chat.</p>
          </div>
          <div className="footer-links">
            {FOOTER_LINKS.map((item) => (
              <Link key={item.path} to={item.path}>
                {item.label}
              </Link>
            ))}
            <a href="mailto:soporte@alquila.pe">soporte@alquila.pe</a>
          </div>
        </div>
      </footer>

      <nav className="bottom-nav" aria-label="Móvil">
        {MOBILE_NAV.slice(0, 2).map((item) => (
          <Link key={item.path} to={item.path} className={bottomNavClass(item.path)}>
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
        <Link to="/publicar" className="bottom-nav-fab" aria-label="Ofrecer producto">
          <span className="fab-plus">+</span>
        </Link>
        {MOBILE_NAV.slice(2).map((item) => (
          <Link key={item.path} to={item.path} className={bottomNavClass(item.path)}>
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
        <Link to={accountPath} className={bottomNavClass(accountPath)}>
          <span className="nav-icon">👤</span>
          <span>{accountLabel}</span>
        </Link>
      </nav>

      <div className="pickup-banner">
        <span className="pickup-banner-short">⚡ Super rápido · Pickup hoy</span>
        <span className="pickup-banner-full"><span>⚡ Super rápido</span> · Publica, acelera y recoge hoy en minutos</span>
      </div>
    </div>
  );
}
