import { classifyStandardEarningHead, resolveSpecialAllowance } from '../payrollSalaryHeads';

describe('classifyStandardEarningHead', () => {
  test.each([
    ['Basic', 'basic'],
    ['Basic Pay', 'basic'],
    ['Basic Salary', 'basic'],
    ['HRA', 'hra'],
    ['House Rent Allowance', 'hra'],
    ['House Rent Allowance (HRA)', 'hra'],
    ['Medical Allowance', 'medical'],
    ['Transport / Conveyance', 'conveyance'],
  ])('classifies %s as %s', (name, expectedCategory) => {
    expect(classifyStandardEarningHead(name)).toBe(expectedCategory);
  });

  test('leaves other earning heads as special allowances', () => {
    expect(classifyStandardEarningHead('Special Allowance')).toBeNull();
  });
});

describe('resolveSpecialAllowance', () => {
  test('recovers a missing saved allowance from the applicable salary revision', () => {
    expect(resolveSpecialAllowance(0, 32860)).toBe(32860);
  });

  test('preserves saved payroll allowance when it is already present', () => {
    expect(resolveSpecialAllowance(12000, 32860)).toBe(12000);
  });

  test('does not add a configured allowance when there is no saved amount', () => {
    expect(resolveSpecialAllowance(0, 0)).toBe(0);
  });
});
