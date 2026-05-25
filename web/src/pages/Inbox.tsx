import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { dealLabel, type DealStatus } from '../deal-status';

interface ThreadItem {
  id: string;
  productId: string;
  productTitle?: string;
  otherName: string;
  lastMessage: string;
  lastAt: string;
  dealStatus: DealStatus;
  isOwner: boolean;
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

  const grouped = useMemo(() => {
    const buildGroups = (items: ThreadItem[]) => {
      const groups = new Map<
        string,
        { productId: string; productTitle?: string; chats: ThreadItem[]; lastAt: string }
      >();

      for (const item of items) {
        const current = groups.get(item.productId);
        if (!current) {
          groups.set(item.productId, {
            productId: item.productId,
            productTitle: item.productTitle,
            chats: [item],
            lastAt: item.lastAt,
          });
          continue;
        }
        current.chats.push(item);
        if (new Date(item.lastAt).getTime() > new Date(current.lastAt).getTime()) {
          current.lastAt = item.lastAt;
        }
      }

      return Array.from(groups.values())
        .map((group) => ({
          ...group,
          chats: [...group.chats].sort(
            (a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime(),
          ),
        }))
        .sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());
    };

    return {
      published: buildGroups(threads.filter((thread) => thread.isOwner)),
      rented: buildGroups(threads.filter((thread) => !thread.isOwner)),
    };
  }, [threads]);

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
      {threads.length > 0 &&
        [
          { key: 'published', title: 'Publicados con sus chats', data: grouped.published },
          { key: 'rented', title: 'Alquilados con sus chats', data: grouped.rented },
        ].map((section) => (
          <section key={section.key} style={{ marginTop: '1rem' }}>
            <div className="section-header" style={{ marginBottom: '0.5rem' }}>
              <h2 className="section-title" style={{ fontSize: '1.05rem' }}>{section.title}</h2>
              <span className="section-count">{section.data.length}</span>
            </div>
            {section.data.length === 0 ? (
              <p className="empty card">
                {section.key === 'published'
                  ? 'Aquí verás los chats de tus publicaciones.'
                  : 'Aquí verás lo que estás alquilando.'}
              </p>
            ) : (
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {section.data.map((group) => (
                  <li key={`${section.key}-${group.productId}`} className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                      <div>
                        <strong>{group.productTitle ?? 'Producto'}</strong>
                        <p className="thread-preview" style={{ marginTop: 4 }}>
                          {group.chats.length} chat{group.chats.length === 1 ? '' : 's'} · Último movimiento{' '}
                          {new Date(group.lastAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                      {group.chats.map((t) => (
                        <li key={t.id}>
                          <Link to={`/chat/${t.id}`} className="card" style={{ display: 'block', background: 'var(--surface2)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                              <strong>{t.otherName}</strong>
                              <span className="badge">{dealLabel(t.dealStatus)}</span>
                            </div>
                            <p style={{ fontSize: '0.9rem', marginTop: 4 }}>{t.lastMessage}</p>
                            <p className="thread-preview" style={{ marginTop: 4 }}>
                              {new Date(t.lastAt).toLocaleString()}
                            </p>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
    </div>
  );
}
