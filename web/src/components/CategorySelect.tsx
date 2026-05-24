import { CATEGORIES } from '../data/categories';
import './CategorySelect.css';

interface Props {
  name: string;
  value?: string;
  onChange?: (id: string) => void;
  required?: boolean;
}

export function CategorySelect({ name, value, onChange, required }: Props) {
  return (
    <div className="category-select">
      <input type="hidden" name={name} value={value ?? ''} required={required} />
      <div className="category-grid">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            className={`category-option${value === cat.id ? ' selected' : ''}`}
            onClick={() => onChange?.(cat.id)}
            style={{ background: cat.color }}
          >
            <span className="category-option-icon-lg">{cat.icon}</span>
            <span className="category-option-name">{cat.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
