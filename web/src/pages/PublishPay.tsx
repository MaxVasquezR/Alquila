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
        if (res.freeListing) navigate(`/producto/${productId}`);
        else setPayment(res);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Error'));
  }, [user, productId, navigate]);

  async function confirmPaid() {
    if (!payment?.paymentId) return;
    setBusy(true);
    try {
      await api(`/account/listing/${payment.paymentId}/confirm`, { method: 'POST' });
      toast('¡Pago confirmado! Producto visible en el mercado');
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
        <h1>Pagar publicación</h1>
        <p>Escanea con Yape o Plin — tu producto se activa al instante.</p>
      </div>

      {error && <p className="error-msg">{error}</p>}
      {!payment && !error && <p className="empty">Generando QR...</p>}

      {payment && (
        <div className="qr-pay card">
          <p className="qr-pay-amount">S/ {Number(payment.amountPen).toFixed(2)}</p>
          <div className="qr-placeholder">
            <span className="qr-icon">📱</span>
            <p>QR Yape / Plin</p>
            <small>Demo — producción: QR dinámico Culqi/MP</small>
          </div>
          <p className="qr-timer">⏱ Válido {payment.expiresInMinutes ?? 15} min</p>
          <button type="button" className="btn btn-express" onClick={confirmPaid} disabled={busy}>
            {busy ? 'Confirmando...' : 'YA PAGUÉ — ACTIVAR'}
          </button>
        </div>
      )}

      <Link to="/mis-productos" className="back-link" style={{ marginTop: '1rem', display: 'block' }}>
        ← Mis equipos
      </Link>
    </div>
  );
}
