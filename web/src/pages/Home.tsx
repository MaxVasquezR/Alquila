import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { ProductCard } from '../components/ProductCard';
import { ExpressRush } from '../components/ExpressRush';
import { CATEGORIES, categoryColor } from '../data/categories';
import { LIMA_DISTRICTS } from '../lima-districts';
import type { Product } from '../types';
import './Home.css';

export function Home() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [district, setDistrict] = useState('');
  const [category, setCategory] = useState('');
  const [todayOnly, setTodayOnly] = useState(true);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (district) params.set('district', district);
    if (category) params.set('category', category);
    if (todayOnly) params.set('availableToday', 'true');
    const q = params.toString() ? `?${params}` : '';

    api<{ data: Product[] }>(`/products${q}`, { auth: false })
      .then((res) => setProducts(res.data))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [district, category, todayOnly]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.district.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q),
    );
  }, [products, search]);

  return (
    <div className="home">
      <section className="hero-market">
        <div className="container-wide hero-market-inner">
          <div className="hero-market-copy">
            <span className="hero-badge">⚡ Publica hoy · Destaca hoy · Cierra más rápido</span>
            <h1>
              Publica hoy.
              <br />
              Destaca.
              <br />
              Cierra hoy.
            </h1>
            <p>
              Alquila está hecha para convertir más: publicación estándar para entrar al mercado y
              `Super Promo` para subir al frente, captar más vistas y cerrar alquileres antes.
            </p>
            <div className="hero-speed-line">Visibilidad comercial, trato express y activación en minutos.</div>
            <div className="hero-actions">
              <Link to={user ? '/publicar' : '/registro'} className="btn btn-express hero-primary-cta">
                {user ? 'Publicar y destacar' : 'Crea tu cuenta'}
              </Link>
              <a href="#productos" className="btn btn-ghost hero-secondary-cta">
                Ver equipos disponibles
              </a>
            </div>
            <div className="hero-proof">
              <span>1 publicación gratis en tu primer mes</span>
              <span>Super Promo 7 días</span>
              <span>Trato express</span>
            </div>
            <div className="hero-stats">
              <div>
                <strong>{products.length || '15+'}</strong>
                <span>equipos listos</span>
              </div>
              <div>
                <strong>Top visibilidad</strong>
                <span>sube al frente con promo</span>
              </div>
              <div>
                <strong>30 días</strong>
                <span>publicación estándar</span>
              </div>
            </div>
          </div>
          <div className="hero-market-visual">
            <ExpressRush />
            <div className="hero-float-card">
              <span>🚀 Super Promo activa</span>
              <strong>Top home · Andamio 2m · S/55</strong>
              <small>Los Olivos · más visibilidad, más cierre</small>
            </div>
          </div>
        </div>
      </section>

      <section className="container-wide trust-strip">
        <article className="trust-pill card">
          <strong>Beneficio real controlado</strong>
          <p>La publicación gratis solo aplica con correo, celular y KYC verificados.</p>
        </article>
        <article className="trust-pill card">
          <strong>Super Promo para vender más</strong>
          <p>Impulsa tu aviso por 7 días para ganar visibilidad en la parte alta.</p>
        </article>
        <article className="trust-pill card">
          <strong>Privacidad protegida</strong>
          <p>La dirección exacta no aparece en listados públicos y el trato queda dentro del chat.</p>
        </article>
      </section>

      <section className="container quick-flow">
        <div className="section-header quick-flow-header">
          <div>
            <h2 className="section-title">Cómo se mueve el trato</h2>
            <p className="section-subtitle">Hecho para cerrar alquileres rápidos sin sacrificar confianza.</p>
          </div>
          <Link to="/como-funciona" className="quick-flow-link">
            Ver flujo completo
          </Link>
        </div>
        <div className="quick-flow-grid">
          <article className="card quick-flow-card">
            <span>1</span>
            <strong>Publica con 3 imágenes</strong>
            <p>Sube fotos reales desde tu móvil para dar más confianza desde el primer vistazo.</p>
          </article>
          <article className="card quick-flow-card">
            <span>2</span>
            <strong>Activa estándar o gratis</strong>
            <p>Si estás dentro de tu primer mes y validado, arrancas con tu primera publicación gratis.</p>
          </article>
          <article className="card quick-flow-card">
            <span>3</span>
            <strong>Impulsa con Super Promo</strong>
            <p>Destaca tu publicación por 7 días para aparecer arriba y mover más chats.</p>
          </article>
        </div>
      </section>

      <div className="container home-search-wrap">
        <div className="home-search">
          <span className="search-icon">🔍</span>
          <input
            className="home-search-input"
            placeholder="Buscar andamio, taladro, carpa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <section className="container categories-section">
        <h2 className="section-title">Categorías</h2>
        <div className="category-chips">
          <button
            type="button"
            className={`cat-chip${!category ? ' active' : ''}`}
            onClick={() => setCategory('')}
          >
            <span className="cat-chip-all">✨</span>
            <span>Todo</span>
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`cat-chip${category === cat.id ? ' active' : ''}`}
              onClick={() => setCategory(category === cat.id ? '' : cat.id)}
              style={{ background: categoryColor(cat.id) }}
            >
              <span className="cat-chip-icon">{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="container filters">
        <select
          className="select"
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
        >
          <option value="">📍 Todos los distritos</option>
          {LIMA_DISTRICTS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <label className="filter-today">
          <input
            type="checkbox"
            checked={todayOnly}
            onChange={(e) => setTodayOnly(e.target.checked)}
          />
          Solo hoy
        </label>
      </div>

      <p className="container trust-line">🔒 Dirección exacta y datos sensibles solo dentro del flujo de trato.</p>

      <section id="productos" className="container products-section">
        <div className="section-header">
          <h2 className="section-title">
            {category ? CATEGORIES.find((c) => c.id === category)?.label : 'Cerca de ti'}
          </h2>
          {!loading && <span className="section-count">{filtered.length} resultados</span>}
        </div>

        {loading && (
          <div className="skeleton-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton-card" />
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="empty-state card">
            <img
              src=""
              alt=""
              className="empty-state-img"
              style={{ display: 'none' }}
            />
            <div className="empty-state-icon">📦</div>
            <h3>Nada aquí todavía</h3>
            <p>Sé el primero en publicar en esta zona o categoría.</p>
            <Link to="/publicar" className="btn btn-express">
              + Publicar y ganar
            </Link>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="product-grid">
            {filtered.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>

      <section className="container trust-summary">
        <div className="section-header">
          <div>
            <h2 className="section-title">Confianza visible para cerrar más rápido</h2>
            <p className="section-subtitle">
              Lo comercial funciona mejor cuando el usuario siente reglas claras, verificación y soporte.
            </p>
          </div>
        </div>
        <div className="trust-summary-grid">
          <article className="card trust-summary-card">
            <strong>Publicaciones verificadas</strong>
            <p>Para ofrecer productos pedimos cuenta validada antes de abrir el mercado.</p>
          </article>
          <article className="card trust-summary-card">
            <strong>Acuerdo por etapas</strong>
            <p>Precio, recogida y cierre del trato se registran en chat para bajar malentendidos.</p>
          </article>
          <article className="card trust-summary-card">
            <strong>Soporte y reglas</strong>
            <p>Privacidad, seguridad, reportes y ayuda visibles desde cualquier dispositivo.</p>
          </article>
        </div>
      </section>
    </div>
  );
}
