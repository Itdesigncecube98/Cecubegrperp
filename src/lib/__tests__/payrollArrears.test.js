import { calculateSalaryRevisionArrears } from '../payrollArrears';

const component = (description, headType, amount) => ({
  amount,
  salaryHead: {
    description,
    headType: { name: headType },
  },
});

const revision = (id, effectiveFrom, createdAt, components) => ({
  id,
  effectiveFrom,
  createdAt: new Date(createdAt),
  components,
});

function createTransaction(revisions, payrollFields = {}) {
  return {
    salaryRevision: {
      findMany: jest.fn().mockResolvedValue(revisions),
    },
    payrollRecord: {
      findMany: jest.fn().mockResolvedValue([{
        basicPay: 30000,
        ...payrollFields,
        hra: 0,
        medical: 0,
        conveyance: 0,
        specialAllow: 0,
        workingDays: 31,
        payCycle: {
          startDate: '2026-03-01',
          endDate: '2026-03-31',
        },
      }]),
    },
  };
}

describe('calculateSalaryRevisionArrears employer contributions', () => {
  test('calculates PF and ESIC arrears separately and ignores LWF', async () => {
    const tx = createTransaction([
      revision('latest', '2026-03-16', '2026-03-16', [
        component('Basic', 'Earning', 30000),
        component('Employer PF', 'CTC', 2000),
        component('Employer ESIC', 'CTC', 975),
        component('Employer LWF', 'CTC', 100),
      ]),
      revision('previous', '2026-01-01', '2026-01-01', [
        component('Basic', 'Earning', 30000),
        component('Employer PF', 'CTC', 1800),
        component('Employer ESIC', 'CTC', 900),
        component('Employer LWF', 'CTC', 50),
      ]),
    ]);

    const result = await calculateSalaryRevisionArrears(tx, 'employee-1');

    expect(result.status).toBe('calculated');
    expect(result.amount).toBe(0);
    expect(result.breakdown).toMatchObject({
      'Employer PF Arrears': 103.23,
      'Employer ESIC Arrears': 38.71,
    });
    expect(result.breakdown).not.toHaveProperty('Employer LWF Arrears');
  });

  test('keeps employee PF deduction arrears separate from employer contributions', async () => {
    const tx = createTransaction([
      revision('latest', '2026-03-16', '2026-03-16', [
        component('Basic', 'Earning', 30000),
        component('Employee PF', 'Deduction', 2000),
      ]),
      revision('previous', '2026-01-01', '2026-01-01', [
        component('Basic', 'Earning', 30000),
        component('Employee PF', 'Deduction', 1800),
      ]),
    ], { pfEmployee: 1800 });

    const result = await calculateSalaryRevisionArrears(tx, 'employee-1');

    expect(result.status).toBe('calculated');
    expect(result.breakdown['Employee PF Arrears']).toBe(103.23);
    expect(result.breakdown).not.toHaveProperty('Employer PF Arrears');
  });

  test('tracks employee PF arrears as a deduction, not gross salary', async () => {
    const tx = createTransaction([
      revision('latest', '2026-03-01', '2026-03-01', [
        component('Basic', 'Earning', 30000),
        component('Employee PF', 'Deduction', 2360),
      ]),
      revision('previous', '2026-01-01', '2026-01-01', [
        component('Basic', 'Earning', 30000),
        component('Employee PF', 'Deduction', 1800),
      ]),
    ], { pfEmployee: 1800 });

    const result = await calculateSalaryRevisionArrears(tx, 'employee-1');

    expect(result.status).toBe('calculated');
    expect(result.amount).toBe(0);
    expect(result.breakdown['Employee PF Arrears']).toBe(560);
  });

  test('recognizes explicitly named Employee PF components in salary revisions', async () => {
    const tx = createTransaction([
      revision('latest', '2026-03-01', '2026-03-01', [
        component('Basic', 'Earning', 30000),
        component('Employee PF', 'Other', 2360),
      ]),
      revision('previous', '2026-01-01', '2026-01-01', [
        component('Basic', 'Earning', 30000),
        component('Employee PF', 'Other', 1800),
      ]),
    ], { pfEmployee: 1800 });

    const result = await calculateSalaryRevisionArrears(tx, 'employee-1');

    expect(result.status).toBe('calculated');
    expect(result.amount).toBe(0);
    expect(result.breakdown['Employee PF Arrears']).toBe(560);
  });
});
