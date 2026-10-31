export function isHrEmployee(employee) {
  const department = String(employee.department || '').trim().toLowerCase();
  const role = String(employee.role || '').trim().toLowerCase();
  const designation = String(employee.designation || '').trim().toLowerCase();
  return [department, role, designation].some(value =>
    /\bhr\b/.test(value) || /\bhuman resources?\b/.test(value)
  );
}
