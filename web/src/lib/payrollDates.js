export function parsePayrollDate(value) {
  if (!value) return null;
  const text = String(value).trim();
  const isoDateMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDateMatch) {
    const [, year, month, day] = isoDateMatch;
    const parsed = new Date(Number(year), Number(month) - 1, Number(day));
    if (parsed.getFullYear() === Number(year) && parsed.getMonth() === Number(month) - 1 && parsed.getDate() === Number(day)) {
      return parsed;
    }
    return null;
  }

  const dayFirstMatch = text.match(/^(\d{1,2})[-/ ]([A-Za-z]{3,}|\d{1,2})[-/ ](\d{4})$/);
  if (dayFirstMatch) {
    const [, day, monthPart, year] = dayFirstMatch;
    const month = /^\d+$/.test(monthPart)
      ? Number(monthPart) - 1
      : new Date(`${monthPart.slice(0, 3)} 1, 2000`).getMonth();
    if (month >= 0 && month <= 11) {
      const parsed = new Date(Number(year), month, Number(day));
      if (parsed.getFullYear() === Number(year) && parsed.getMonth() === month && parsed.getDate() === Number(day)) {
        return parsed;
      }
    }
    return null;
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function findApplicableSalaryRevision(revisions, cycleEndDate) {
  const cycleEnd = parsePayrollDate(cycleEndDate);
  if (!cycleEnd) return null;

  return revisions
    .filter(revision => {
      const effectiveFrom = parsePayrollDate(revision.effectiveFrom);
      return effectiveFrom && effectiveFrom <= cycleEnd;
    })
    .sort((a, b) => {
      const dateA = parsePayrollDate(a.effectiveFrom).getTime();
      const dateB = parsePayrollDate(b.effectiveFrom).getTime();
      return dateB - dateA || b.createdAt.getTime() - a.createdAt.getTime();
    })[0] || null;
}
