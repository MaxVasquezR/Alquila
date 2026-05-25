import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../api';
import { useAuth } from '../auth';
import { useToast } from '../components/Toast';
import type { ListingPaymentResult } from '../types';
import './Commerce.css';

export function PublishPay() {
  const [params] = useSearchParams();
  const productId = params.get('productId') ?? '';
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [payment, setPayment] = useState<ListingPaymentResult | null>(null);
  const [promoPayment, setPromoPayment] = useState<ListingPaymentResult | null>(null);
  const [listingActive, setListingActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/entrar');
      return;
    }
    if (!productId) {
      navigate('/publicar');
      return;
    }
    api<ListingPaymentResult>('/account/listing', {
      method: 'POST',
      body: JSON.stringify({ productId }),
    })
      .then((res) => {
        if (res.freeListing) setListingActive(true);
        else setPayment(res);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Error'));
  }, [user, productId, navigate]);

  async function confirmPaid() {
    if (!payment?.paymentId) return;
    setBusy(true);
    try {
      await api<ListingPaymentResult>(`/account/listing/${payment.paymentId}/confirm`, {
        method: 'POST',
      });
      setListingActive(true);
      setPayment(null);
      toast('¡Pago confirmado! Ahora puedes activar Super Promo');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  async function createPromoCheckout() {
    setBusy(true);
    setError('');
    try {
      const res = await api<ListingPaymentResult>('/ads/checkout', {
        method: 'POST',
        body: JSON.stringify({ productId, plan: 'SUPER_PROMO_7' }),
      });
      setPromoPayment(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  async function confirmPromoPaid() {
    if (!promoPayment?.paymentId) return;
    setBusy(true);
    try {
      await api<ListingPaymentResult>(`/ads/checkout/${promoPayment.paymentId}/confirm`, {
        method: 'POST',
      });
      toast('Super Promo activa. Tu publicación gana visibilidad extra');
      navigate(`/producto/${productId}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container page-narrow">
      <div className="page-header">
        <h1>Activar publicación</h1>
        <p>Pasa de borrador a visible y luego impulsa con Super Promo.</p>
      </div>

      {error && <p className="error-msg">{error}</p>}
      {!payment && !listingActive && !error && <p className="empty">Generando QR...</p>}

      {payment && (
        <div className="qr-pay card">
          <p className="badge badge-premium" style={{ alignSelf: 'flex-start' }}>Estándar 30 días</p>
          <p className="qr-pay-amount">S/ {Number(payment.amountPen).toFixed(2)}</p>
          <div className="qr-placeholder">
            <span className="qr-icon">📱</span>
            <p>QR Yape / Plin</p>
            <small>Usa el QR o el método indicado para activar tu publicación.</small>
          </div>
          <p className="qr-timer">⏱ Válido {payment.expiresInMinutes ?? 15} min</p>
          <p className="thread-preview" style={{ marginBottom: 12 }}>
            La publicación queda en revisión de pago hasta que confirmes el abono.
          </p>
          <button type="button" className="btn btn-express" onClick={confirmPaid} disabled={busy}>
            {busy ? 'Confirmando...' : 'YA PAGUÉ — ACTIVAR'}
          </button>
        </div>
      )}

      {listingActive && (
        <div className="card" style={{ display: 'grid', gap: '1rem' }}>
          <div>
            <span className="badge badge-verified">Publicación activa</span>
            <h2 style={{ marginTop: 12 }}>Tu publicación ya está visible</h2>
            <p style={{ color: 'var(--muted)' }}>
              Ahora puedes dejarla estándar o darle más alcance con `Super Promo` por 7 días.
            </p>
          </div>

          {!promoPayment ? (
            <div className="detail-trust-grid">
              <article className="detail-trust-card">
                <strong>Estándar</strong>
                <ul className="trust-list">
                  <li>Visible en el mercado normal.</li>
                  <li>Duración estándar de 30 días.</li>
                  <li>Sin boost adicional.</li>
                </ul>
              </article>
              <article className="detail-trust-card">
                <strong>Super Promo · S/ 14</strong>
                <ul className="trust-list">
                  <li>Badge premium y visibilidad extra.</li>
                  <li>Prioridad para aparecer primero.</li>
                  <li>Impulso comercial por 7 días.</li>
                </ul>
              </article>
            </div>
          ) : (
            <div className="qr-pay">
              <p className="badge badge-premium" style={{ alignSelf: 'flex-start' }}>Super Promo 7 días</p>
              <p className="qr-pay-amount">S/ {Number(promoPayment.amountPen).toFixed(2)}</p>
              <div className="qr-placeholder">
                <span className="qr-icon">🚀</span>
                <p>QR Yape / Plin</p>
                <small>Activa el boost de visibilidad comercial.</small>
              </div>
              <button type="button" className="btn btn-express" onClick={confirmPromoPaid} disabled={busy}>
                {busy ? 'Confirmando...' : 'YA PAGUÉ — ACTIVAR SUPER PROMO'}
              </button>
            </div>
          )}

          {!promoPayment && (
            <button type="button" className="btn btn-express" onClick={createPromoCheckout} disabled={busy}>
              {busy ? 'Preparando...' : 'QUIERO SUPER PROMO'}
            </button>
          )}

          <Link to={`/producto/${productId}`} className="btn btn-ghost">
            Seguir con publicación estándar
          </Link>
        </div>
      )}

      <Link to="/mis-productos" className="back-link" style={{ marginTop: '1rem', display: 'block' }}>
        ← Mis equipos
      </Link>
    </div>
  );
}
