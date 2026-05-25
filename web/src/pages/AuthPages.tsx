import { FormEvent, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth';
import { ApiError } from '../api';

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from ?? '/';

  return (
    <div className="container" style={{ maxWidth: 400 }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '1.25rem' }}>Entrar</h1>
      <LoginForm
        onSuccess={() => navigate(from)}
        login={login}
      />
      <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'var(--muted)' }}>
        ¿No tienes cuenta? <Link to="/registro" style={{ color: 'var(--accent)' }}>Regístrate</Link>
      </p>
    </div>
  );
}

function LoginForm({
  login,
  onSuccess,
}: {
  login: (email: string, password: string) => Promise<void>;
  onSuccess: () => void;
}) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handle(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    setError('');
    try {
      await login(fd.get('email') as string, fd.get('password') as string);
      onSuccess();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="card" onSubmit={handle}>
      {error && <p className="error-msg">{error}</p>}
      <div className="field">
        <label className="label">Email</label>
        <input className="input" name="email" type="email" required />
      </div>
      <div className="field">
        <label className="label">Contraseña</label>
        <input className="input" name="password" type="password" required minLength={8} />
      </div>
      <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
        {loading ? 'Entrando...' : 'Entrar'}
      </button>
    </form>
  );
}

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handle(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    setError('');
    try {
      await register({
        email: fd.get('email') as string,
        password: fd.get('password') as string,
        displayName: fd.get('displayName') as string,
        phone: fd.get('phone') as string,
        acceptTerms: true,
      });
      navigate('/verificar');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container" style={{ maxWidth: 400 }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '1.25rem' }}>Crear cuenta</h1>
      <form className="card" onSubmit={handle}>
        {error && <p className="error-msg">{error}</p>}
        <div className="field">
          <label className="label">Nombre (público)</label>
          <input className="input" name="displayName" required minLength={2} placeholder="Sin apellidos" />
        </div>
        <div className="field">
          <label className="label">Email</label>
          <input className="input" name="email" type="email" required />
        </div>
        <div className="field">
          <label className="label">Celular (privado, requerido)</label>
          <input className="input" name="phone" type="tel" required pattern="9[0-9]{8}" placeholder="999888777" />
        </div>
        <div className="field">
          <label className="label">Contraseña</label>
          <input className="input" name="password" type="password" required minLength={8} />
        </div>
        <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '1rem' }}>
          <input type="checkbox" required />
          <span>
            Acepto los <Link to="/terminos" style={{ color: 'var(--accent)' }}>términos</Link> y la{' '}
            <Link to="/privacidad" style={{ color: 'var(--accent)' }}>política de privacidad</Link>.
          </span>
        </label>
        <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
          {loading ? 'Creando...' : 'Registrarse'}
        </button>
      </form>
      <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'var(--muted)' }}>
        ¿Ya tienes cuenta? <Link to="/entrar" style={{ color: 'var(--accent)' }}>Entrar</Link>
      </p>
    </div>
  );
}
