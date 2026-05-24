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
            <span className="hero-badge">⚡ Mercado express Lima</span>
            <h1>
              Alquila hoy.
              <br />
              Recoge en minutos.
            </h1>
            <p>Herramientas, fiestas, construcción — sin delivery, acuerdas en chat.</p>
            <div className="hero-stats">
              <div>
                <strong>{products.length || '15+'}</strong>
                <span>equipos cerca</span>
              </div>
              <div>
                <strong>500m</strong>
                <span>ubicación difusa</span>
              </div>
              <div>
                <strong>2 min</strong>
                <span>para contactar</span>
              </div>
            </div>
          </div>
          <div className="hero-market-visual">
            <ExpressRush />
            <div className="hero-float-card">
              <span>🔥 Disponible hoy</span>
              <strong>Andamio 2m · S/55</strong>
              <small>Los Olivos</small>
            </div>
          </div>
        </div>
      </section>

      {!user && (
        <div className="container demo-banner">
          <div className="demo-banner-inner">
            <span>🎯 Modo demo</span>
            <p>
              <strong>dueno.demo@alquila.pe</strong> o <strong>cliente.demo@alquila.pe</strong>
              {' · pass: '}
              <strong>demo12345</strong>
            </p>
            <Link to="/entrar" className="btn btn-sm btn-primary">
              Probar ahora
            </Link>
          </div>
        </div>
      )}

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

      <p className="container trust-line">🔒 Dirección exacta solo si el dueño acepta en chat</p>

      <section className="container products-section">
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
    </div>
  );
}
