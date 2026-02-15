/**
 * Safely parse a price value, returning 0 for invalid inputs
 * Handles: undefined, null, empty strings, non-numeric values
 */
export const safeParsePrice = (value: any): number => {
  if (value === undefined || value === null || value === '') {
    return 0;
  }
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
};
