import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api';
import { useAuth } from '../auth';

interface RepeatClient {
  tenantId: string;
  displayName: string;
  productId: string;
  productTitle: string;
  lastClosedAt: string;
  threadId: string;
}

export function RepeatClients() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [clients, setClients] = useState<RepeatClient[]>([]);
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/entrar');
      return;
    }
    api<{ data: RepeatClient[] }>('/chat/repeat-clients').then((r) => setClients(r.data));
  }, [user, navigate]);

  async function contactAgain(c: RepeatClient) {
    setLoading(c.tenantId);
    try {
      const res = await api<{ thread: { id: string } }>('/chat/repeat-contact', {
        method: 'POST',
        body: JSON.stringify({
          tenantId: c.tenantId,
          productId: c.productId,
        }),
      });
      navigate(`/chat/${res.thread.id}`);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Error');
    } finally {
      setLoading(null);
    }
  }

  if (!user) return null;

  return (
    <div className="container" style={{ maxWidth: 520 }}>
      <h1 style={{ fontSize: '1.35rem', fontWeight: 700 }}>Clientes recurrentes</h1>
      <p style={{ color: 'var(--muted)', fontSize: '0.9rem', margin: '0.5rem 0 1rem' }}>
        Tratos cerrados — contáctalos de nuevo en 1 tap.
      </p>

      {clients.length === 0 && (
        <p className="empty card">Aún no tienes tratos cerrados. ¡Cierra tu primer alquiler!</p>
      )}

      <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {clients.map((c) => (
          <li key={c.tenantId} className="card">
            <strong>{c.displayName}</strong>
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>{c.productTitle}</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 4 }}>
              Último: {new Date(c.lastClosedAt).toLocaleDateString('es-PE')}
            </p>
            <button
              type="button"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: 10 }}
              disabled={loading === c.tenantId}
              onClick={() => contactAgain(c)}
            >
              {loading === c.tenantId ? 'Abriendo...' : 'Contactar de nuevo'}
            </button>
          </li>
        ))}
      </ul>

      <Link to="/mensajes" className="btn btn-ghost" style={{ width: '100%', marginTop: 16 }}>
        Ver todos los chats
      </Link>
    </div>
  );
}
