import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { LIMA_DISTRICTS } from '../lima-districts';
import './Commerce.css';

interface RentalRequestItem {
  id: string;
  title: string;
  district: string;
  category: string;
  neededBy: string;
  tenantName?: string;
}

export function RentalRequestsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [district, setDistrict] = useState('');
  const [items, setItems] = useState<RentalRequestItem[]>([]);

  useEffect(() => {
    if (!user) {
      navigate('/entrar');
      return;
    }
    const q = district ? `?district=${encodeURIComponent(district)}` : '';
    api<{ data: RentalRequestItem[] }>(`/rental-requests${q}`).then((r) => setItems(r.data));
  }, [user, district, navigate]);

  if (!user) return null;

  return (
    <div className="container page-narrow">
      <div className="page-header">
        <h1>Buscan en tu zona</h1>
        <p>Clientes verificados buscando equipos — contacta rápido.</p>
      </div>

      <select className="select" value={district} onChange={(e) => setDistrict(e.target.value)} style={{ marginBottom: '1rem' }}>
        <option value="">Todos los distritos</option>
        {LIMA_DISTRICTS.map((d) => (
          <option key={d} value={d}>{d}</option>
        ))}
      </select>

      {items.length === 0 && (
        <p className="empty card">Nadie busca en esta zona ahora. Publica tu stock.</p>
      )}

      <ul className="thread-list">
        {items.map((item) => (
          <li key={item.id} className="card thread-item">
            <div className="thread-item-top">
              <strong>{item.title}</strong>
              <span className="badge badge-today">Express</span>
            </div>
            <p className="thread-preview">{item.district} · {item.category}</p>
            <p className="thread-preview">Para: {new Date(item.neededBy).toLocaleDateString()}</p>
            <Link to="/publicar" className="btn btn-primary btn-sm" style={{ marginTop: 8 }}>
              Tengo eso — Publicar
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
