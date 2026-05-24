export type DealStatus =
  | 'INTERESTED'
  | 'AGREED'
  | 'PICKED_UP'
  | 'CLOSED';

export const DEAL_STEPS: { key: DealStatus; label: string }[] = [
  { key: 'INTERESTED', label: 'Interesado' },
  { key: 'AGREED', label: 'Acordado' },
  { key: 'PICKED_UP', label: 'Recogido' },
  { key: 'CLOSED', label: 'Cerrado' },
];

export function dealLabel(status: DealStatus): string {
  return DEAL_STEPS.find((s) => s.key === status)?.label ?? status;
}

export function dealStepIndex(status: DealStatus): number {
  return DEAL_STEPS.findIndex((s) => s.key === status);
}
