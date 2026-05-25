import './ExpressRush.css';

const HERO_ICONS = ['🏗️', '🔧', '🎉', '🏠', '⚽', '🛒', '🔩', '💨'];

export function ExpressRush() {
  return (
    <div className="express-rush" aria-hidden>
      <div className="rush-bg-glow" />

      <div className="rush-bg-icons">
        {HERO_ICONS.map((icon, i) => (
          <span key={icon} className="rush-bg-icon" style={{ ['--i' as string]: i }}>
            {icon}
          </span>
        ))}
      </div>

      <div className="rush-city">
        {Array.from({ length: 6 }).map((_, i) => (
          <span key={i} className="rush-building" style={{ ['--i' as string]: i }} />
        ))}
      </div>

      <div className="speed-lines">
        <span /><span /><span /><span /><span />
      </div>

      <div className="rush-lane">
        <div className="rush-scooter">
          <span className="rush-flare" />
          <div className="rush-delivery">
            <span className="rush-backpack">
              <span className="rush-backpack-mark">⚡</span>
            </span>
            <span className="rush-rider-head" />
            <span className="rush-rider-body" />
            <span className="rush-handlebar" />
            <span className="rush-seat" />
            <span className="rush-frame" />
            <span className="rush-deck" />
            <span className="rush-wheel rush-wheel-back" />
            <span className="rush-wheel rush-wheel-front" />
          </div>
        </div>
      </div>

      <div className="rush-trail">
        <span>TOP VISIBILIDAD</span>
        <strong>SUPER PROMO</strong>
      </div>

      <div className="rush-stats">
        <span>Impulso comercial en Lima</span>
        <strong>Publica. Destaca. Cierra.</strong>
      </div>

      <div className="rush-burst">⚡ Activa hoy</div>
    </div>
  );
}
