export function formatZAR(value: number): string {
  const abs = Math.abs(value);
  const formatted = abs.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return value < 0 ? `R -${formatted}` : `R ${formatted}`;
}
