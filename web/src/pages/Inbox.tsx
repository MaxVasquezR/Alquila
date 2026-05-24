import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { dealLabel, type DealStatus } from '../deal-status';

interface ThreadItem {
  id: string;
  productTitle?: string;
  otherName: string;
  lastMessage: string;
  lastAt: string;
  dealStatus: DealStatus;
}

export function Inbox() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [threads, setThreads] = useState<ThreadItem[]>([]);

  useEffect(() => {
    if (!user) {
      navigate('/entrar');
      return;
    }
    api<{ data: ThreadItem[] }>('/chat/threads').then((r) => setThreads(r.data));
  }, [user, navigate]);

  if (!user) return null;

  return (
    <div className="container" style={{ maxWidth: 520 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 style={{ fontSize: '1.35rem', fontWeight: 700 }}>Chats</h1>
        <Link to="/clientes" className="btn btn-ghost btn-sm">Recurrentes</Link>
      </div>
      {threads.length === 0 && (
        <p className="empty card">Sin conversaciones. Explora productos o publica el tuyo.</p>
      )}
      <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {threads.map((t) => (
          <li key={t.id}>
            <Link to={`/chat/${t.id}`} className="card" style={{ display: 'block' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <strong>{t.productTitle ?? 'Producto'}</strong>
                <span className="badge">{dealLabel(t.dealStatus)}</span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>{t.otherName}</p>
              <p style={{ fontSize: '0.9rem', marginTop: 4 }}>{t.lastMessage}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
