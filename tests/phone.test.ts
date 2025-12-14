import { describe, it, expect } from 'vitest';
import { normalizePhoneNumber } from '../utils/phone';

describe('normalizePhoneNumber', () => {
  it('should normalize Rwandan phone number with country code', () => {
    const result = normalizePhoneNumber('+250788123456', '250');
    expect(result).toBe('+250788123456');
  });

  it('should normalize phone number without country code', () => {
    const result = normalizePhoneNumber('0788123456', '250');
    expect(result).toBe('+250788123456');
  });

  it('should return null for invalid input', () => {
    const result = normalizePhoneNumber('', '250');
    expect(result).toBeNull();
  });

  it('should handle phone numbers with spaces and dashes', () => {
    const result = normalizePhoneNumber('+250 788-123-456', '250');
    expect(result).toBe('+250788123456');
  });
});
