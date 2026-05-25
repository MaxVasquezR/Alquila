import { FormEvent, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../api';
import { useAuth } from '../auth';
import { useToast } from '../components/Toast';
import './Commerce.css';

export function VerifyAccount() {
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const showTestingHint = import.meta.env.DEV;
  const [step, setStep] = useState<'email' | 'phone' | 'kyc'>('email');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [dni, setDni] = useState('');
  const [legalName, setLegalName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [devCode, setDevCode] = useState<string>();
  const [emailPreviewUrl, setEmailPreviewUrl] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/entrar');
      return;
    }
    if (!user.emailVerified) {
      setStep('email');
      return;
    }
    if (!user.phoneVerified) {
      setStep('phone');
      return;
    }
    if (!user.kycVerified) {
      setStep('kyc');
      return;
    }
    const from = (location.state as { from?: string } | null)?.from;
    navigate(from ?? '/cuenta');
  }, [user, navigate, location.state]);

  useEffect(() => {
    const emailToken = params.get('emailToken');
    if (!user || !emailToken || user.emailVerified) return;

    async function verifyEmailFromLink() {
      setBusy(true);
      setError('');
      try {
        await api('/auth/email/verify', {
          method: 'POST',
          body: JSON.stringify({ token: emailToken }),
          auth: false,
        });
        await refreshUser();
        toast('Correo verificado');
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Error');
      } finally {
        setBusy(false);
      }
    }

    verifyEmailFromLink();
  }, [params, refreshUser, toast, user]);

  async function sendEmailVerification() {
    setBusy(true);
    setError('');
    try {
      const res = await api<{ previewUrl?: string; emailVerified?: boolean }>('/auth/email/send', {
        method: 'POST',
      });
      if (showTestingHint && res.previewUrl) setEmailPreviewUrl(res.previewUrl);
      toast(res.emailVerified ? 'Tu correo ya estaba verificado' : 'Correo de verificación enviado');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  async function sendOtp(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await api<{ devCode?: string }>('/auth/otp/send', {
        method: 'POST',
        body: JSON.stringify({ phone }),
      });
      if (showTestingHint && res.devCode) setDevCode(res.devCode);
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
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from ?? '/cuenta');
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
        <div className={`verify-step${user.emailVerified ? ' done' : step === 'email' ? ' active' : ''}`}>
          1. Correo {user.emailVerified && '✓'}
        </div>
        <div className={`verify-step${user.phoneVerified ? ' done' : step === 'phone' ? ' active' : ''}`}>
          2. Celular {user.phoneVerified && '✓'}
        </div>
        <div className={`verify-step${user.kycVerified ? ' done' : step === 'kyc' ? ' active' : ''}`}>
          3. DNI + identidad {user.kycVerified && '✓'}
        </div>
      </div>

      {step === 'email' && !user.emailVerified && (
        <div className="card">
          {error && <p className="error-msg">{error}</p>}
          <p style={{ fontSize: '0.9rem', color: 'var(--muted)', marginBottom: '1rem' }}>
            Verifica tu correo para activar el beneficio de tu primera publicación dentro del primer mes.
          </p>
          <button type="button" className="btn btn-express" disabled={busy} onClick={sendEmailVerification}>
            {busy ? 'Enviando...' : 'Enviar correo de verificación'}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ marginTop: 8, width: '100%' }}
            onClick={async () => {
              await refreshUser();
            }}
            disabled={busy}
          >
            Ya verifiqué mi correo
          </button>
          {showTestingHint && emailPreviewUrl && (
            <p className="demo-hint">
              Entorno local: abre <a href={emailPreviewUrl} target="_blank" rel="noreferrer"><strong>este enlace</strong></a>
            </p>
          )}
        </div>
      )}

      {step === 'phone' && user.emailVerified && !user.phoneVerified && (
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
          {showTestingHint && devCode && (
            <p className="demo-hint">
              Entorno local: código temporal <strong>{devCode}</strong>
            </p>
          )}
          {code !== '' || (showTestingHint && devCode) ? (
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

      {step === 'kyc' && user.emailVerified && user.phoneVerified && !user.kycVerified && (
        <form className="card" onSubmit={completeKyc}>
          {error && <p className="error-msg">{error}</p>}
          <p style={{ fontSize: '0.9rem', color: 'var(--muted)', marginBottom: '1rem' }}>
            Validamos tu identidad antes de dejarte publicar para reducir fraude y cuentas falsas.
          </p>
          <button type="button" className="btn btn-ghost btn-sm" onClick={startKyc} disabled={busy} style={{ marginBottom: '1rem' }}>
            Iniciar validación
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

