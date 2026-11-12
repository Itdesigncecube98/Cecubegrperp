import { getEmployeeWeekoffDays, isEmployeeWeekoff } from '../attendanceCalendar';

const monToSatWorking = [
  { day: 'Monday', isWorking: true },
  { day: 'Tuesday', isWorking: true },
  { day: 'Wednesday', isWorking: true },
  { day: 'Thursday', isWorking: true },
  { day: 'Friday', isWorking: true },
  { day: 'Saturday', isWorking: true },
  { day: 'Sunday', isWorking: false },
];

describe('attendance weekly-off calendar', () => {
  test('uses WorkWeek rather than stale all-employee week-off templates', () => {
    expect(getEmployeeWeekoffDays(monToSatWorking)).toEqual(['Sunday']);
  });

  test('treats a working weekday as working even if a template lists it as off', () => {
    expect(isEmployeeWeekoff('2026-11-10', monToSatWorking)).toBe(false);
  });

  test('keeps Sunday as the weekly off day', () => {
    expect(isEmployeeWeekoff('2026-11-08', monToSatWorking)).toBe(true);
  });

  test('defaults to Sunday off when no WorkWeek configuration exists', () => {
    expect(getEmployeeWeekoffDays()).toEqual(['Sunday']);
  });
});
