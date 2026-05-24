import { getCategoryColor, getProductIcon, isUserPhoto } from '../lib/productArt';
import './ProductArt.css';

interface Props {
  title: string;
  category: string;
  imageUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ProductArt({ title, category, imageUrl, size = 'md', className = '' }: Props) {
  const icon = getProductIcon(title, category);
  const bg = getCategoryColor(category);

  if (isUserPhoto(imageUrl)) {
    return (
      <div className={`product-art product-art-${size} ${className}`}>
        <img src={imageUrl!} alt={title} className="product-art-photo" />
      </div>
    );
  }

  return (
    <div
      className={`product-art product-art-${size} product-art-draw ${className}`}
      style={{ background: bg }}
      aria-hidden
    >
      <span className="product-art-icon">{icon}</span>
      <span className="product-art-label">{title.split(' ').slice(0, 2).join(' ')}</span>
    </div>
  );
}
