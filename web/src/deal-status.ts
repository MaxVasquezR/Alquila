export type DealStatus =
  | 'INTERESTED'
  | 'AGREED'
  | 'HANDOFF_PENDING'
  | 'PICKED_UP'
  | 'RETURN_PENDING'
  | 'CLOSED';

export const DEAL_STEPS: { key: DealStatus; label: string }[] = [
  { key: 'INTERESTED', label: 'Interesado' },
  { key: 'AGREED', label: 'Acordado' },
  { key: 'HANDOFF_PENDING', label: 'Entrega' },
  { key: 'PICKED_UP', label: 'Recogido' },
  { key: 'RETURN_PENDING', label: 'Recepción' },
  { key: 'CLOSED', label: 'Cerrado' },
];

export function dealLabel(status: DealStatus): string {
  return DEAL_STEPS.find((s) => s.key === status)?.label ?? status;
}

export function dealStepIndex(status: DealStatus): number {
  return DEAL_STEPS.findIndex((s) => s.key === status);
}
