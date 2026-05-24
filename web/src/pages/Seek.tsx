import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api';
import { useAuth } from '../auth';
import { LIMA_DISTRICTS } from '../lima-districts';

export function Seek() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handle(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) {
      navigate('/entrar');
      return;
    }
    const fd = new FormData(e.currentTarget);
    const neededBy = fd.get('neededBy') as string;
    setLoading(true);
    setError('');
    try {
      await api('/rental-requests', {
        method: 'POST',
        body: JSON.stringify({
          title: fd.get('title'),
          description: fd.get('description') || fd.get('title'),
          category: fd.get('category'),
          district: fd.get('district'),
          neededBy: new Date(neededBy).toISOString(),
        }),
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="container card" style={{ maxWidth: 400, textAlign: 'center' }}>
        <p style={{ fontSize: '2rem' }}>✓</p>
        <h2 style={{ fontWeight: 700 }}>¡Solicitud enviada!</h2>
        <p style={{ color: 'var(--muted)', marginTop: 8 }}>
          Los dueños de tu zona recibirán notificación al instante.
        </p>
      </div>
    );
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDate = tomorrow.toISOString().slice(0, 10);

  return (
    <div className="container" style={{ maxWidth: 440 }}>
      <h1 style={{ fontSize: '1.35rem', fontWeight: 700 }}>Busco algo</h1>
      <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
        Express — dueños en tu distrito te contactan.
      </p>
      <form className="card" onSubmit={handle}>
        {error && <p className="error-msg">{error}</p>}
        <div className="field">
          <label className="label">Qué necesitas</label>
          <input className="input" name="title" required placeholder="Andamio en Los Olivos" />
        </div>
        <div className="field">
          <label className="label">Distrito</label>
          <select className="select" name="district" required>
            <option value="">Elegir</option>
            {LIMA_DISTRICTS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="label">Categoría</label>
          <input className="input" name="category" required placeholder="construccion" />
        </div>
        <div className="field">
          <label className="label">Para cuándo</label>
          <input className="input" name="neededBy" type="date" defaultValue={defaultDate} required />
        </div>
        <button type="submit" className="btn btn-express" disabled={loading}>
          {loading ? 'Enviando...' : 'AVISAR A DUEÑOS'}
        </button>
      </form>
    </div>
  );
}
