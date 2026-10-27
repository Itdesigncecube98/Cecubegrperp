import { findApplicableSalaryRevision, parsePayrollDate } from '../payrollDates';

describe('parsePayrollDate', () => {
  test.each([
    ['01-Sep-2026', new Date(2026, 8, 1)],
    ['28-Feb-2026', new Date(2026, 1, 28)],
    ['2026-09-01', new Date(2026, 8, 1)],
  ])('parses %s', (value, expected) => {
    expect(parsePayrollDate(value)).toEqual(expected);
  });
});

describe('findApplicableSalaryRevision', () => {
  const revisions = [
    { id: 'february', effectiveFrom: '01-Feb-2026', createdAt: new Date('2026-02-01') },
    { id: 'september', effectiveFrom: '01-Sep-2026', createdAt: new Date('2026-09-01') },
  ];

  test('does not select a future day-first revision', () => {
    expect(findApplicableSalaryRevision(revisions, '28-Feb-2026')?.id).toBe('february');
  });

  test('selects the latest revision effective by cycle end', () => {
    expect(findApplicableSalaryRevision(revisions, '30-Sep-2026')?.id).toBe('september');
  });

  test('returns null if no revision is effective for the cycle', () => {
    expect(findApplicableSalaryRevision(revisions, '31-Jan-2026')).toBeNull();
  });
});
