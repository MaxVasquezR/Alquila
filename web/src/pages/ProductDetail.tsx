import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { api, ApiError } from '../api';
import { useAuth } from '../auth';
import { useToast } from '../components/Toast';
import { ProductArt } from '../components/ProductArt';
import { categoryLabel } from '../data/categories';
import type { Product } from '../types';
import './Commerce.css';

export function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<'view' | 'express'>('view');
  const [moveInDate, setMoveInDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    api<Product>(`/products/${id}`, { auth: false })
      .then(setProduct)
      .catch(() => setError('No encontrado'))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleExpress(e: FormEvent) {
    e.preventDefault();
    if (!user) {
      navigate('/entrar', { state: { from: `/producto/${id}` } });
      return;
    }
    if (!id) return;
    setBusy(true);
    setError('');
    try {
      const { thread } = await api<{ thread: { id: string } }>('/chat/threads', {
        method: 'POST',
        body: JSON.stringify({ productId: id }),
      });
      await api(`/chat/threads/${thread.id}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          type: 'QUESTIONNAIRE_ANSWER',
          content: 'cuestionario',
          questionnaire: { moveInDate, hasVerifiedDni: user.kycVerified ?? false },
        }),
      });
      toast('¡Chat abierto! Negocia y recoge hoy');
      navigate(`/chat/${thread.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="container product-detail-page">
        <div className="skeleton-card detail-hero-skeleton" />
      </div>
    );
  }

  if (!product) {
    return <p className="error-msg container">{error || 'No encontrado'}</p>;
  }

  const isOwner = user?.id === product.owner.id;

  return (
    <div className="container product-detail-page">
      <Link to="/" className="back-link">
        ← Mercado
      </Link>

      <div className="product-detail-layout">
        <div className="detail-hero-wrap">
          <ProductArt
            title={product.title}
            category={product.category}
            imageUrl={product.imageUrl}
            size="lg"
          />
        </div>

        <article className="card detail-card">
        <div className="detail-badges">
          {product.availableToday && <span className="badge badge-today">⚡ Disponible hoy</span>}
          {product.owner.kycVerified && <span className="badge badge-verified">Dueño verificado</span>}
          <span className="badge badge-cat">{categoryLabel(product.category)}</span>
        </div>

        <h1 className="detail-title">{product.title}</h1>
        <p className="detail-price">
          S/ {product.pricePerDay} <span>/ día</span>
        </p>
        <p className="detail-location">
          📍 {product.district} · {product.locationLabel}
        </p>
        <p className="detail-desc">{product.description}</p>

        <div className="detail-owner">
          <span>👤</span>
          <span>
            <strong>{product.owner.displayName}</strong>
            {product.owner.membershipTier === 'PREMIUM' && (
              <span className="badge badge-premium" style={{ marginLeft: 6 }}>
                Premium
              </span>
            )}
          </span>
        </div>

        {!isOwner && step === 'view' && (
          <button
            type="button"
            className="btn btn-express"
            style={{ marginTop: 20 }}
            onClick={() => {
              if (!user) navigate('/entrar', { state: { from: `/producto/${id}` } });
              else setStep('express');
            }}
          >
            LO QUIERO — Express
          </button>
        )}

        {!isOwner && step === 'express' && (
          <form onSubmit={handleExpress} style={{ marginTop: 16 }}>
            <p className="express-form-title">2 preguntas y abres chat:</p>
            <div className="field">
              <label className="label">¿Para qué fecha?</label>
              <input
                className="input"
                type="date"
                value={moveInDate}
                onChange={(e) => setMoveInDate(e.target.value)}
                required
              />
            </div>
            {user?.kycVerified ? (
              <p className="verify-note" style={{ marginBottom: 16 }}>
                <span className="badge badge-verified">✓ Cuenta verificada</span>
              </p>
            ) : (
              <p className="verify-note" style={{ marginBottom: 16, fontSize: '0.85rem', color: 'var(--muted)' }}>
                Verifica tu cuenta en{' '}
                <Link to="/verificar" style={{ color: 'var(--accent)' }}>2 minutos</Link> para mayor confianza.
              </p>
            )}
            {error && <p className="error-msg">{error}</p>}
            <button type="submit" className="btn btn-express" disabled={busy}>
              {busy ? 'Enviando...' : 'Enviar y abrir chat'}
            </button>
          </form>
        )}
        </article>
      </div>
    </div>
  );
}
