import './ExpressRush.css';

const HERO_ICONS = ['🏗️', '🔧', '🎉', '🏠', '⚽', '📦', '🛒', '🔩'];

export function ExpressRush() {
  return (
    <div className="express-rush" aria-hidden>
      <div className="rush-bg-icons">
        {HERO_ICONS.map((icon, i) => (
          <span key={icon} className="rush-bg-icon" style={{ ['--i' as string]: i }}>
            {icon}
          </span>
        ))}
      </div>

      <div className="speed-lines">
        <span /><span /><span /><span /><span />
      </div>

      <div className="rush-lane">
        <div className="rush-scooter">
          <span className="rush-rider">🛵</span>
          <span className="rush-box">📦</span>
        </div>
      </div>

      <div className="rush-trail">⚡ EXPRESS</div>

      <div className="rush-stats">
        <span>Recoges hoy</span>
        <strong>En minutos</strong>
      </div>
    </div>
  );
}
