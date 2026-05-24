import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { ProductArt } from '../components/ProductArt';
import { useToast } from '../components/Toast';
import type { Product } from '../types';
import './Commerce.css';

export function MyProducts() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/entrar');
      return;
    }
    api<{ data: Product[] }>('/products/me')
      .then((res) => setProducts(res.data))
      .finally(() => setLoading(false));
  }, [user, navigate]);

  async function upgrade() {
    try {
      await api('/checkout/membership', {
        method: 'POST',
        body: JSON.stringify({ plan: 'PREMIUM_19', paymentToken: 'simulated' }),
      });
      toast('¡Premium activado por 30 días!');
      window.location.reload();
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : 'Error', 'error');
    }
  }

  if (!user) return null;

  return (
    <div className="container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1>Mis equipos</h1>
          <p>Ofrece lo que tienes · Alquila lo que necesitas</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {user.membershipTier !== 'PREMIUM' && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={upgrade}>
              Premium S/ 19.90
            </button>
          )}
          <Link to="/publicar" className="btn btn-primary btn-sm">+ Ofrecer</Link>
        </div>
      </div>
      {loading && <p className="empty">Cargando...</p>}
      {!loading && products.length === 0 && (
        <div className="empty-state card">
          <div className="empty-state-icon">📦</div>
          <h3>Aún no ofreces nada</h3>
          <p>Publica tu primer equipo y empieza a ganar hoy.</p>
          <Link to="/publicar" className="btn btn-express">+ Ofrecer equipo</Link>
        </div>
      )}
      <ul className="thread-list">
        {products.map((p) => (
          <li key={p.id} className="card stock-item">
            <div className="stock-thumb">
              <ProductArt title={p.title} category={p.category} imageUrl={p.imageUrl} size="sm" />
            </div>
            <div className="stock-item-info">
              <strong>{p.title}</strong>
              <p>{p.district} · S/ {p.pricePerDay}/día</p>
            </div>
            <Link to={`/producto/${p.id}`} className="btn btn-ghost btn-sm">Ver</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
