import { describe, expect, it } from 'vitest';

import { getPasswordStrength } from './strength';

describe('getPasswordStrength', () => {
  it('returns 0 for weak short password', () => {
    expect(getPasswordStrength('abc')).toBe(0);
  });

  it('returns 2 for minimum compliant password with uppercase', () => {
    expect(getPasswordStrength('Abcdefgh')).toBe(2);
  });

  it('returns 4 for strong password with all conditions', () => {
    expect(getPasswordStrength('Abcd1234!')).toBe(4);
  });
});
