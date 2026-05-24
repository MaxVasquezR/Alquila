import { useState } from 'react';
import type { DealStatus } from '../deal-status';
import { DEAL_STEPS, dealStepIndex } from '../deal-status';
import './DealBar.css';

interface Props {
  dealStatus: DealStatus;
  agreedPrice?: string;
  isOwner: boolean;
  onConfirmDeal?: (agreedPrice: number) => void;
  onMarkPickedUp?: () => void;
  onCloseDeal?: () => void;
  busy?: boolean;
}

export function DealBar({
  dealStatus,
  agreedPrice,
  isOwner,
  onConfirmDeal,
  onMarkPickedUp,
  onCloseDeal,
  busy,
}: Props) {
  const current = dealStepIndex(dealStatus);
  const [priceInput, setPriceInput] = useState('');

  return (
    <div className="deal-bar card">
      <div className="deal-steps">
        {DEAL_STEPS.map((step, i) => (
          <div
            key={step.key}
            className={`deal-step ${i <= current ? 'done' : ''} ${i === current ? 'active' : ''}`}
          >
            <span className="deal-dot" />
            <span className="deal-label">{step.label}</span>
          </div>
        ))}
      </div>

      {agreedPrice && <p className="deal-price">Acordado: S/ {agreedPrice}</p>}

      {isOwner && dealStatus === 'INTERESTED' && onConfirmDeal && (
        <div className="deal-confirm-row">
          <input
            className="input deal-price-input"
            type="number"
            min="1"
            step="0.5"
            placeholder="Precio acordado (S/)"
            value={priceInput}
            onChange={(e) => setPriceInput(e.target.value)}
          />
          <button
            type="button"
            className="btn btn-express"
            onClick={() => {
              const n = parseFloat(priceInput);
              if (n > 0) onConfirmDeal(n);
            }}
            disabled={busy || !priceInput || parseFloat(priceInput) <= 0}
          >
            {busy ? '...' : '✓ Acordado + ubicación'}
          </button>
        </div>
      )}

      {isOwner && dealStatus === 'AGREED' && onMarkPickedUp && (
        <button type="button" className="btn btn-primary" onClick={onMarkPickedUp} disabled={busy}>
          Marcar recogido
        </button>
      )}

      {isOwner && dealStatus === 'PICKED_UP' && onCloseDeal && (
        <button type="button" className="btn btn-ghost" onClick={onCloseDeal} disabled={busy}>
          Cerrar trato
        </button>
      )}

      {dealStatus === 'CLOSED' && <p className="deal-closed">Trato completado</p>}
    </div>
  );
}
