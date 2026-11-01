import { calculateLeaveDays, getLeaveCategory, supportsHalfDayLeave } from '../leavePolicy';

describe('getLeaveCategory', () => {
  test.each([
    ['Casual', 'CL'],
    ['Casual Leave', 'CL'],
    ['CL', 'CL'],
    ['Paid leave', 'EL'],
    ['Earned Leave', 'EL'],
    ['COFF', 'COFF'],
    ['Compensatory Off', 'COFF'],
    ['Unpaid leave', 'LWP'],
    ['Leave Without Pay', 'LWP'],
    ['LWP', 'LWP'],
  ])('normalizes %s to %s', (value, expected) => {
    expect(getLeaveCategory(value)).toBe(expected);
  });
});

describe('supportsHalfDayLeave', () => {
  test.each(['Casual', 'Paid leave', 'COFF', 'Unpaid leave'])('allows half-day %s', (type) => {
    expect(supportsHalfDayLeave(type)).toBe(true);
  });

  test('does not allow half days for other leave types', () => {
    expect(supportsHalfDayLeave('Maternity Leave')).toBe(false);
  });
});

describe('calculateLeaveDays', () => {
  test('charges half a day for a one-day half-day request', () => {
    expect(calculateLeaveDays('2026-01-31', '2026-01-31', true)).toBe(0.5);
  });

  test('subtracts the half day from a multi-day request total', () => {
    expect(calculateLeaveDays('2026-01-30', '2026-01-31', true)).toBe(1.5);
  });

  test('rejects invalid and reversed date ranges', () => {
    expect(calculateLeaveDays('not-a-date', '2026-01-31')).toBeNull();
    expect(calculateLeaveDays('2026-02-01', '2026-01-31')).toBeNull();
  });
});
