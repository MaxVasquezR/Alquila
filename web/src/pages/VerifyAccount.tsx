import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api';
import { useAuth } from '../auth';
import { useToast } from '../components/Toast';
import './Commerce.css';

export function VerifyAccount() {
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState<'phone' | 'kyc'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [dni, setDni] = useState('');
  const [legalName, setLegalName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [devCode, setDevCode] = useState<string>();

  useEffect(() => {
    if (!user) {
      navigate('/entrar');
      return;
    }
    if (user.phoneVerified && !user.kycVerified) setStep('kyc');
    if (user.kycVerified) navigate('/cuenta');
  }, [user, navigate]);

  async function sendOtp(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await api<{ devCode?: string }>('/auth/otp/send', {
        method: 'POST',
        body: JSON.stringify({ phone }),
      });
      if (res.devCode) setDevCode(res.devCode);
      toast('Código enviado a tu celular');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/auth/otp/verify', {
        method: 'POST',
        body: JSON.stringify({ phone, code }),
      });
      await refreshUser();
      toast('Celular verificado');
      setStep('kyc');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  async function startKyc() {
    setBusy(true);
    try {
      await api('/kyc/session', { method: 'POST' });
      toast('Sesión KYC iniciada');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  async function completeKyc(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/kyc/complete', {
        method: 'POST',
        body: JSON.stringify({ dni, legalName }),
      });
      await refreshUser();
      toast('¡Cuenta verificada!');
      navigate('/cuenta');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  if (!user) return null;

  return (
    <div className="container page-narrow">
      <div className="page-header">
        <h1>Verificar cuenta</h1>
        <p>Cuentas reales y verificadas. Tus datos legales nunca se muestran en pantalla.</p>
      </div>

      <div className="verify-steps card">
        <div className={`verify-step${user.phoneVerified ? ' done' : step === 'phone' ? ' active' : ''}`}>
          1. Celular {user.phoneVerified && '✓'}
        </div>
        <div className={`verify-step${user.kycVerified ? ' done' : step === 'kyc' ? ' active' : ''}`}>
          2. DNI + identidad {user.kycVerified && '✓'}
        </div>
      </div>

      {step === 'phone' && !user.phoneVerified && (
        <form className="card" onSubmit={code ? verifyOtp : sendOtp}>
          {error && <p className="error-msg">{error}</p>}
          <div className="field">
            <label className="label">Celular (9 dígitos)</label>
            <input
              className="input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="999888777"
              required
            />
          </div>
          {devCode && (
            <p className="demo-hint">
              Modo demo — código: <strong>{devCode}</strong>
            </p>
          )}
          {code !== '' || devCode ? (
            <div className="field">
              <label className="label">Código SMS</label>
              <input
                className="input"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                maxLength={6}
                required
              />
            </div>
          ) : null}
          <button type="submit" className="btn btn-express" disabled={busy}>
            {busy ? '...' : code ? 'Verificar celular' : 'Enviar código'}
          </button>
          {!code && (
            <button
              type="button"
              className="btn btn-ghost"
              style={{ marginTop: 8, width: '100%' }}
              onClick={() => setCode(' ')}
            >
              Ya tengo código
            </button>
          )}
        </form>
      )}

      {step === 'kyc' && user.phoneVerified && !user.kycVerified && (
        <form className="card" onSubmit={completeKyc}>
          {error && <p className="error-msg">{error}</p>}
          <p style={{ fontSize: '0.9rem', color: 'var(--muted)', marginBottom: '1rem' }}>
            Simulación proveedor KYC (Didit/Verifik). En producción abrirás cámara + DNI.
          </p>
          <button type="button" className="btn btn-ghost btn-sm" onClick={startKyc} disabled={busy} style={{ marginBottom: '1rem' }}>
            Iniciar sesión KYC
          </button>
          <div className="field">
            <label className="label">DNI (8 dígitos)</label>
            <input className="input" value={dni} onChange={(e) => setDni(e.target.value)} pattern="\d{8}" required />
          </div>
          <div className="field">
            <label className="label">Nombre legal completo (privado)</label>
            <input className="input" value={legalName} onChange={(e) => setLegalName(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-express" disabled={busy}>
            {busy ? 'Verificando...' : 'VERIFICAR IDENTIDAD'}
          </button>
        </form>
      )}

      <p style={{ marginTop: '1rem', textAlign: 'center' }}>
        <Link to="/cuenta" style={{ color: 'var(--accent)' }}>Ver mi cuenta</Link>
      </p>
    </div>
  );
}

