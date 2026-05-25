import { useState } from 'react';
import type { DealStatus } from '../deal-status';
import { DEAL_STEPS, dealStepIndex } from '../deal-status';
import './DealBar.css';

interface Props {
  dealStatus: DealStatus;
  agreedPrice?: string;
  isOwner: boolean;
  onConfirmDeal?: (agreedPrice: number) => void;
  onStartHandoff?: () => void;
  onStartReturn?: () => void;
  busy?: boolean;
}

export function DealBar({
  dealStatus,
  agreedPrice,
  isOwner,
  onConfirmDeal,
  onStartHandoff,
  onStartReturn,
  busy,
}: Props) {
  const current = dealStepIndex(dealStatus);
  const [priceInput, setPriceInput] = useState('');
  const nextStepLabel =
    dealStatus === 'INTERESTED'
      ? isOwner
        ? 'Si aceptas, fija el precio final para liberar el siguiente paso.'
        : 'Espera la confirmación del dueño y deja todo por escrito.'
      : dealStatus === 'AGREED'
        ? 'El trato ya fue acordado. Inicia la entrega con 4 fotos claras.'
        : dealStatus === 'HANDOFF_PENDING'
          ? 'Sube 4 fotos claras del equipo antes de marcarlo como recogido.'
        : dealStatus === 'PICKED_UP'
          ? 'El equipo ya salió. Al recibirlo de vuelta, abre la recepción con 4 fotos.'
          : dealStatus === 'RETURN_PENDING'
            ? 'Sube 4 fotos claras de la recepción para cerrar el trato.'
          : 'Historial cerrado.';

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
      <p className="deal-next-step">{nextStepLabel}</p>

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

      {isOwner && dealStatus === 'AGREED' && onStartHandoff && (
        <button type="button" className="btn btn-primary" onClick={onStartHandoff} disabled={busy}>
          Iniciar entrega
        </button>
      )}

      {isOwner && dealStatus === 'PICKED_UP' && onStartReturn && (
        <button type="button" className="btn btn-ghost" onClick={onStartReturn} disabled={busy}>
          Iniciar recepción
        </button>
      )}

      {dealStatus === 'CLOSED' && <p className="deal-closed">Trato completado</p>}
    </div>
  );
}
