import { Link } from 'react-router-dom';
import { useNotifications } from '../useNotifications';

export function NotificationsPage() {
  const { items, markAllRead } = useNotifications();

  function linkFor(n: { linkType?: string; linkId?: string }) {
    if (n.linkType === 'chat' && n.linkId) return `/chat/${n.linkId}`;
    return '/';
  }

  return (
    <div className="container" style={{ maxWidth: 520 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h1 style={{ fontSize: '1.35rem', fontWeight: 700 }}>Notificaciones</h1>
        {items.some((n) => !n.read) && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={markAllRead}>
            Marcar leídas
          </button>
        )}
      </div>
      {items.length === 0 && <p className="empty card">Sin notificaciones</p>}
      <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((n) => (
          <li key={n.id}>
            <Link
              to={linkFor(n)}
              className="card"
              style={{
                display: 'block',
                borderLeft: n.read ? undefined : '3px solid var(--accent)',
              }}
            >
              <strong>{n.title}</strong>
              <p style={{ fontSize: '0.9rem', marginTop: 4 }}>{n.body}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 4 }}>
                {new Date(n.createdAt).toLocaleString('es-PE')}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
