import { FormEvent, useEffect, useMemo, useState } from 'react';
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
  const [description, setDescription] = useState('');
  const [pickupReference, setPickupReference] = useState('');
  const [images, setImages] = useState<File[]>([]);

  const imagePreviewUrls = useMemo(
    () => images.map((file) => URL.createObjectURL(file)),
    [images],
  );

  useEffect(() => {
    if (!user) navigate('/entrar');
    else if (!user.canPublish) navigate('/verificar');
  }, [user, navigate]);

  useEffect(() => () => {
    imagePreviewUrls.forEach((url) => URL.revokeObjectURL(url));
  }, [imagePreviewUrls]);

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
    const descriptionStr = String(fd.get('description') ?? '').trim();
    const locationReference = String(fd.get('locationReference') ?? '').trim();

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
    if (descriptionStr.length < 12) {
      setError('Descripción: agrega al menos 12 caracteres para generar confianza');
      return;
    }
    if (images.length === 0) {
      setError('Sube al menos 1 imagen real de tu equipo');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const payload = new FormData();
      payload.append('title', titleStr);
      payload.append('category', cat);
      payload.append('pricePerDay', String(pricePerDay));
      payload.append('district', districtVal);
      payload.append('description', descriptionStr);
      payload.append('availableToday', String(fd.get('availableToday') === 'on'));
      if (locationReference) payload.append('locationReference', locationReference);
      images.forEach((image) => payload.append('images', image));

      const product = await api<Product & { paymentRequired?: boolean }>('/products/express', {
        method: 'POST',
        body: payload,
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
        <p>1 publicación gratis en tu primer mes verificado · luego S/ 4 · Super Promo S/ 14</p>
      </div>

      {!user.canPublish && (
        <Link to="/verificar" className="btn btn-express publish-verify-cta">
          Verificar cuenta primero
        </Link>
      )}

      <div className="publish-layout">
        <div className="publish-preview card">
          <ProductArt
            title={title || 'Tu producto'}
            category={category}
            imageUrl={imagePreviewUrls[0]}
            imageUrls={imagePreviewUrls}
            size="lg"
          />
          {imagePreviewUrls.length > 0 && (
            <div className="publish-preview-strip">
              {imagePreviewUrls.map((url, index) => (
                <img key={url} src={url} alt={`Vista previa ${index + 1}`} className="publish-preview-thumb" />
              ))}
            </div>
          )}
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
            <label className="label">Descripción útil</label>
            <textarea
              className="textarea"
              name="description"
              required
              minLength={12}
              placeholder="Estado del equipo, para qué sirve, qué incluye y cualquier regla importante."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>
          <div className="field">
            <label className="label">Punto de recojo (opcional)</label>
            <input
              className="input"
              name="locationReference"
              placeholder="Ej: cerca a Plaza Norte"
              value={pickupReference}
              onChange={(e) => setPickupReference(e.target.value)}
            />
          </div>
          <div className="field">
            <label className="label">Imágenes reales (hasta 3)</label>
            <input
              className="input"
              name="images"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              onChange={(e) => {
                const nextImages = Array.from(e.target.files ?? []);
                if (nextImages.length > 3) {
                  setError('Solo puedes subir hasta 3 imágenes');
                } else {
                  setError('');
                }
                setImages(nextImages.slice(0, 3));
              }}
            />
            <p className="thread-preview" style={{ marginTop: 8 }}>
              Sube fotos desde tu móvil o laptop. Una vez publicada, la galería ya no se podrá editar.
            </p>
          </div>
          <div className="publish-trust-box">
            <strong>Checklist para convertir mejor</strong>
            <ul className="trust-list">
              <li>Describe el estado real del equipo y qué incluye.</li>
              <li>Usa hasta 3 fotos claras y evita títulos genéricos.</li>
              <li>Publica solo si puedes responder y coordinar rápido por chat.</li>
              <li>Cuando tu aviso salga en vivo, quedará bloqueado para edición.</li>
            </ul>
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


