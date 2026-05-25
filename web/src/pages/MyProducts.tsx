import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api';
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

  async function loadProducts() {
    const res = await api<{ data: Product[] }>('/products/me');
    setProducts(
      [...res.data].sort(
        (a, b) =>
          new Date(b.publishedAt ?? b.createdAt ?? 0).getTime() -
          new Date(a.publishedAt ?? a.createdAt ?? 0).getTime(),
      ),
    );
  }

  useEffect(() => {
    if (!user) {
      navigate('/entrar');
      return;
    }
    loadProducts().finally(() => setLoading(false));
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

  async function deleteProduct(productId: string) {
    const confirmed = window.confirm(
      'Al eliminar esta publicación ya no habrá vuelta atrás. Para volver al mercado tendrás que republicar y pagar otra vez.',
    );
    if (!confirmed) return;
    try {
      await api(`/products/${productId}`, { method: 'DELETE' });
      toast('Publicación eliminada sin vuelta atrás.');
      await loadProducts();
    } catch (e: unknown) {
      toast(e instanceof ApiError ? e.message : 'Error', 'error');
    }
  }

  async function republishProduct(productId: string) {
    try {
      const product = await api<Product>(`/products/${productId}/republish`, {
        method: 'POST',
      });
      toast('Se creó una nueva publicación. Falta activar el pago.');
      navigate(`/publicar/pago?productId=${product.id}&mode=listing`);
    } catch (e: unknown) {
      toast(e instanceof ApiError ? e.message : 'Error', 'error');
    }
  }

  if (!user) return null;

  const sections = [
    {
      key: 'ACTIVE',
      title: 'Activas',
      items: products.filter((product) => product.status === 'ACTIVE'),
    },
    {
      key: 'PENDING_PAYMENT',
      title: 'Pendientes de pago',
      items: products.filter((product) => product.status === 'PENDING_PAYMENT'),
    },
    {
      key: 'RENTED',
      title: 'Alquiladas ahora',
      items: products.filter((product) => product.status === 'RENTED'),
    },
    {
      key: 'history',
      title: 'Vencidas',
      items: products.filter((product) =>
        ['EXPIRED', 'INACTIVE', 'ARCHIVED'].includes(product.status),
      ),
    },
  ];

  const pendingCount = sections.find((section) => section.key === 'PENDING_PAYMENT')?.items.length ?? 0;
  const rentedCount = sections.find((section) => section.key === 'RENTED')?.items.length ?? 0;

  return (
    <div className="container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1>Mis equipos</h1>
          <p>Ordena tu operación comercial, cobra mejor y no pierdas chats calientes.</p>
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
      {(pendingCount > 0 || rentedCount > 0) && (
        <div className="publish-trust-box" style={{ marginBottom: '1rem' }}>
          <strong>Alertas de operación</strong>
          <ul className="trust-list">
            {pendingCount > 0 && <li>Tienes {pendingCount} publicación{pendingCount === 1 ? '' : 'es'} esperando pago.</li>}
            {rentedCount > 0 && <li>Tienes {rentedCount} equipo{rentedCount === 1 ? '' : 's'} con trato en curso.</li>}
            <li>Puedes publicar muchos productos al día si tu cuenta está validada y activas cada publicación.</li>
          </ul>
        </div>
      )}
      {loading && <p className="empty">Cargando...</p>}
      {!loading && products.length === 0 && (
        <div className="empty-state card">
          <div className="empty-state-icon">📦</div>
          <h3>Aún no ofreces nada</h3>
          <p>Publica tu primer equipo y empieza a ganar hoy.</p>
          <Link to="/publicar" className="btn btn-express">+ Ofrecer equipo</Link>
        </div>
      )}
      {!loading &&
        sections.map((section) => (
          <section key={section.key} style={{ marginTop: '1rem' }}>
            <div className="section-header" style={{ marginBottom: '0.5rem' }}>
              <h2 className="section-title" style={{ fontSize: '1.05rem' }}>{section.title}</h2>
              <span className="section-count">{section.items.length}</span>
            </div>
            {section.items.length === 0 ? (
              <p className="empty card">Sin publicaciones en esta sección.</p>
            ) : (
              <ul className="thread-list">
                {section.items.map((p) => (
                  <li key={p.id} className="card stock-item">
                    <div className="stock-thumb">
                      <ProductArt
                        title={p.title}
                        category={p.category}
                        imageUrl={p.coverImageUrl ?? p.imageUrl}
                        imageUrls={p.imageUrls}
                        size="sm"
                      />
                    </div>
                    <div className="stock-item-info">
                      <strong>{p.title}</strong>
                      <p>{p.district} · S/ {p.pricePerDay}/día</p>
                      <p className="thread-preview" style={{ marginTop: 4 }}>
                        Estado: {p.status === 'ACTIVE'
                          ? 'Activa'
                          : p.status === 'PENDING_PAYMENT'
                            ? 'Pendiente de pago'
                            : p.status === 'RENTED'
                              ? 'Alquilada'
                              : p.status === 'DELETED'
                                ? 'Eliminada'
                                : p.status}
                        {p.status === 'ACTIVE' && ' · Ya no editable'}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {p.status === 'ACTIVE' && (
                        <>
                          <Link to={`/publicar/pago?productId=${p.id}&mode=promo`} className="btn btn-express btn-sm">
                            Super Promo
                          </Link>
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => deleteProduct(p.id)}>
                            Eliminar
                          </button>
                        </>
                      )}
                      {p.status === 'PENDING_PAYMENT' && (
                        <>
                          <Link to={`/publicar/pago?productId=${p.id}&mode=listing`} className="btn btn-express btn-sm">
                            Pagar y activar
                          </Link>
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => deleteProduct(p.id)}>
                            Eliminar
                          </button>
                        </>
                      )}
                      {['EXPIRED', 'INACTIVE', 'ARCHIVED'].includes(p.status) && (
                        <>
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => deleteProduct(p.id)}>
                            Eliminar
                          </button>
                          <button type="button" className="btn btn-express btn-sm" onClick={() => republishProduct(p.id)}>
                            Republicar
                          </button>
                        </>
                      )}
                      <Link to={`/producto/${p.id}`} className="btn btn-ghost btn-sm">Ver</Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
    </div>
  );
}
