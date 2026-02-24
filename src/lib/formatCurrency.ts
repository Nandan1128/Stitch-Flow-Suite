/**
 * Formats a number as a currency amount with exactly 2 decimal places.
 * Example: 1500  → "1,500.00"
 *          10.5  → "10.50"
 */
export function formatCurrency(value: number | string | null | undefined): string {
  const num = Number(value ?? 0);
  return isNaN(num) ? "0.00" : num.toFixed(2);
}
