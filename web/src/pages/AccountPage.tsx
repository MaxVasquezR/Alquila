import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import type { AccountSummary } from '../types';
import './Commerce.css';

type Tab = 'resumen' | 'pagos' | 'tratos' | 'publicaciones';

export function AccountPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('resumen');
  const [summary, setSummary] = useState<AccountSummary | null>(null);
  const [payments, setPayments] = useState<{ listing: unknown[]; membership: unknown[] } | null>(null);
  const [deals, setDeals] = useState<unknown[]>([]);
  const [products, setProducts] = useState<unknown[]>([]);

  useEffect(() => {
    if (!user) {
      navigate('/entrar');
      return;
    }
    api<AccountSummary>('/account/summary').then(setSummary);
  }, [user, navigate]);

  useEffect(() => {
    if (!user) return;
    if (tab === 'pagos') {
      api<{ listing: unknown[]; membership: unknown[] }>('/account/payments').then(setPayments);
    }
    if (tab === 'tratos') api<{ data: unknown[] }>('/account/deals').then((r) => setDeals(r.data));
    if (tab === 'publicaciones') api<{ data: unknown[] }>('/account/products').then((r) => setProducts(r.data));
  }, [tab, user]);

  if (!user || !summary) return <p className="empty container">Cargando...</p>;

  return (
    <div className="container page-narrow">
      <div className="account-header card">
        <div className="account-avatar">{summary.avatarUrl ? <img src={summary.avatarUrl} alt="" /> : '👤'}</div>
        <div>
          <h1>{summary.displayName}</h1>
          <p className="account-email">{summary.email}</p>
          <div className="detail-badges" style={{ marginTop: 8 }}>
            {summary.kycVerified && <span className="badge badge-verified">✓ Verificado</span>}
            {!summary.phoneVerified && <span className="badge badge-today">Celular pendiente</span>}
            {!summary.kycVerified && summary.phoneVerified && (
              <span className="badge badge-today">KYC pendiente</span>
            )}
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: 8 }}>
            {summary.stats.dealsClosed} tratos cerrados · {summary.stats.products} publicaciones
          </p>
        </div>
      </div>

      {!summary.kycVerified || !summary.phoneVerified ? (
        <Link to="/verificar" className="btn btn-express" style={{ marginBottom: '1rem' }}>
          Completar verificación
        </Link>
      ) : null}

      <div className="account-tabs">
        {(['resumen', 'pagos', 'tratos', 'publicaciones'] as Tab[]).map((t) => (
          <button key={t} type="button" className={`account-tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'resumen' && (
        <div className="card">
          <p><strong>Membresía:</strong> {summary.membershipTier}</p>
          {summary.kycVerifiedAt && (
            <p><strong>Verificado desde:</strong> {new Date(summary.kycVerifiedAt).toLocaleDateString()}</p>
          )}
          <p style={{ marginTop: 12, fontSize: '0.85rem', color: 'var(--muted)' }}>
            Tus datos legales y DNI nunca se muestran a otros usuarios.
          </p>
          <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 12 }} onClick={logout}>
            Cerrar sesión
          </button>
        </div>
      )}

      {tab === 'pagos' && payments && (
        <div className="card">
          <h3 style={{ marginBottom: 8 }}>Publicaciones</h3>
          {payments.listing.length === 0 && <p className="empty">Sin pagos de publicación</p>}
          <ul className="thread-list">
            {(payments.listing as { id: string; amountPen: string; status: string; createdAt: string }[]).map((p) => (
              <li key={p.id} className="thread-item card">
                <strong>S/ {p.amountPen}</strong> — {p.status}
                <p className="thread-preview">{new Date(p.createdAt).toLocaleString()}</p>
              </li>
            ))}
          </ul>
          <h3 style={{ margin: '1rem 0 8px' }}>Membresía</h3>
          {(payments.membership as { id: string; plan: string; amountPen: string; status: string }[]).map((p) => (
            <div key={p.id} className="card" style={{ marginBottom: 8 }}>
              {p.plan} — S/ {p.amountPen} — {p.status}
            </div>
          ))}
        </div>
      )}

      {tab === 'tratos' && (
        <ul className="thread-list">
          {deals.length === 0 && <li className="empty card">Sin tratos cerrados aún</li>}
          {(deals as { id: string; productTitle?: string; role: string; otherName: string; agreedPrice?: string; closedAt?: string }[]).map((d) => (
            <li key={d.id} className="card thread-item">
              <strong>{d.productTitle}</strong>
              <p className="thread-preview">{d.role === 'OWNER' ? 'Como dueño' : 'Como cliente'} · {d.otherName}</p>
              {d.agreedPrice && <p>S/ {d.agreedPrice}</p>}
            </li>
          ))}
        </ul>
      )}

      {tab === 'publicaciones' && (
        <ul className="thread-list">
          {products.length === 0 && <li className="empty card">Sin publicaciones</li>}
          {(products as { id: string; title: string; status: string; pricePerDay: string; district: string }[]).map((p) => (
            <li key={p.id} className="card stock-item">
              <div className="stock-item-info">
                <strong>{p.title}</strong>
                <p>{p.district} · S/ {p.pricePerDay}/día · {p.status}</p>
              </div>
              <Link to={`/producto/${p.id}`} className="btn btn-ghost btn-sm">Ver</Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}


