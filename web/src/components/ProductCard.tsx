import { Link } from 'react-router-dom';
import { categoryLabel } from '../data/categories';
import { ProductArt } from './ProductArt';
import type { Product } from '../types';
import './ProductCard.css';

export function ProductCard({ product }: { product: Product }) {
  return (
    <Link to={`/producto/${product.id}`} className="product-card">
      <div className="product-card-img">
        <ProductArt title={product.title} category={product.category} imageUrl={product.imageUrl} />
        {product.availableToday && (
          <span className="badge badge-today product-today">⚡ Hoy</span>
        )}
        {product.owner.kycVerified && (
          <span className="badge badge-verified product-verified">✓</span>
        )}
        <span className="badge badge-cat product-cat">{categoryLabel(product.category)}</span>
      </div>
      <div className="product-card-body">
        <div className="product-card-top">
          <span className="product-price">
            S/ {product.pricePerDay}
            <small>/día</small>
          </span>
          {product.isFeatured && <span className="badge badge-premium">Top</span>}
        </div>
        <h3>{product.title}</h3>
        <p className="product-meta">📍 {product.district}</p>
        {product.owner.dealsClosedCount != null && product.owner.dealsClosedCount > 0 && (
          <p className="product-deals">{product.owner.dealsClosedCount} tratos cerrados</p>
        )}
        <p className="product-location">{product.locationLabel}</p>
        <p className="product-pickup">⚡ Express · Recoges hoy</p>
      </div>
    </Link>
  );
}
