import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api';
import { useAuth } from '../auth';
import { CategorySelect } from '../components/CategorySelect';
import { ProductArt } from '../components/ProductArt';
import { useToast } from '../components/Toast';
import { LIMA_DISTRICTS } from '../lima-districts';
import type { Product } from '../types';
import './Commerce.css';

export function Publish() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState('construccion');
  const [title, setTitle] = useState('');
  const [district, setDistrict] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');

  useEffect(() => {
    if (!user) navigate('/entrar');
    else if (!user.canPublish && !user.kycVerified) navigate('/verificar');
  }, [user, navigate]);

  if (!user) return null;

  async function handle(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user?.canPublish) {
      navigate('/verificar');
      return;
    }
    const fd = new FormData(e.currentTarget);
    const titleStr = String(fd.get('title') ?? '').trim();
    const districtVal = district || String(fd.get('district') ?? '');
    const pricePerDay = Number(fd.get('pricePerDay'));
    const cat = category || (fd.get('category') as string);
    const customPhoto = (fd.get('imageUrl') as string)?.trim();

    if (titleStr.length < 3) {
      setError('Título: debe tener al menos 3 caracteres (ej: Andamio 2m)');
      return;
    }
    if (!districtVal) {
      setError('Distrito: elige un distrito de Lima');
      return;
    }
    if (!Number.isFinite(pricePerDay) || pricePerDay <= 0) {
      setError('Precio: ingresa un monto mayor a 0');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const product = await api<Product & { paymentRequired?: boolean }>('/products/express', {
        method: 'POST',
        body: JSON.stringify({
          title: titleStr,
          category: cat,
          pricePerDay,
          district: districtVal,
          imageUrl: customPhoto || undefined,
          availableToday: fd.get('availableToday') === 'on',
        }),
      });
      if (product.paymentRequired) {
        toast('Producto creado — completa el pago');
        navigate(`/publicar/pago?productId=${product.id}`);
      } else {
        toast('¡Publicado! Ya aparece en el mercado');
        navigate(`/producto/${product.id}`);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container publish-page">
      <div className="page-header">
        <h1>Ofrecer equipo</h1>
        <p>1ra publicación gratis · siguientes S/ 3 con Yape/Plin</p>
      </div>

      {!user.canPublish && (
        <Link to="/verificar" className="btn btn-express publish-verify-cta">
          Verificar cuenta primero
        </Link>
      )}

      <div className="publish-layout">
        <div className="publish-preview card">
          <ProductArt title={title || 'Tu producto'} category={category} imageUrl={photoUrl || undefined} size="lg" />
        </div>

        <form className="card publish-form" onSubmit={handle}>
        {error && <p className="error-msg">{error}</p>}
        <div className="field">
          <label className="label">Qué ofreces</label>
          <input className="input" name="title" required minLength={3} placeholder="Andamio 2m..." value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="field">
          <label className="label">Precio S/ por día</label>
          <input className="input" name="pricePerDay" type="number" min="1" required placeholder="45" />
        </div>
        <div className="field">
          <label className="label">Distrito</label>
          <select className="select" name="district" required value={district} onChange={(e) => setDistrict(e.target.value)}>
            <option value="">Elegir distrito</option>
            {LIMA_DISTRICTS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="label">Categoría</label>
          <CategorySelect name="category" value={category} onChange={setCategory} required />
        </div>
        <div className="field">
          <label className="label">Foto real (opcional — URL)</label>
          <input className="input" name="imageUrl" type="text" placeholder="https://tu-foto.jpg (opcional)" value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} />
        </div>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16 }}>
          <input type="checkbox" name="availableToday" defaultChecked />
          <span style={{ fontWeight: 700 }}>⚡ Disponible hoy</span>
        </label>
        <button type="submit" className="btn btn-express" disabled={loading || !user.canPublish}>
          {loading ? 'Publicando...' : 'PUBLICAR Y GANAR'}
        </button>
        </form>
      </div>
    </div>
  );
}


